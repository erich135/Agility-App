// API: Cron endpoint — process scheduled notifications
// Runs every hour via Vercel Cron
// GET /api/cron-process-notifications

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import webpush from 'web-push';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || 'erich@lmwfinance.co.za'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 465),
    secure: String(process.env.EMAIL_SECURE || 'true').toLowerCase() === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
}

async function sendPushToUser(userId, title, body, url = '/') {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (!subs?.length) return;

  const payload = JSON.stringify({ title, body, url, tag: 'scheduled-notification', requireInteraction: false });
  const stale = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) stale.push(sub.endpoint);
    }
  }

  if (stale.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', stale);
  }
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();

    const { data: pending, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(100);

    if (error) throw error;

    if (!pending?.length) {
      return res.status(200).json({ success: true, processed: 0, message: 'No scheduled notifications due' });
    }

    let sent = 0;
    let failed = 0;

    for (const notification of pending) {
      try {
        switch (notification.notification_type) {
          case 'email':
          case 'sms':      // SMS is routed via email
          case 'whatsapp': { // WhatsApp is routed via email
            const transporter = createTransporter();
            await transporter.sendMail({
              from: `"${process.env.EMAIL_FROM_NAME || 'LMW Financial Solutions'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
              to: notification.recipient_contact,
              subject: notification.subject || 'Reminder from LMW',
              text: notification.message,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">
                       <p>${notification.message.replace(/\n/g, '<br>')}</p>
                       <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
                       <p style="font-size:12px;color:#999">LMW Financial Solutions — automated reminder</p>
                     </div>`
            });

            await supabase.from('notifications').update({
              status: 'sent',
              sent_at: new Date().toISOString()
            }).eq('id', notification.id);

            sent++;
            break;
          }

          case 'in_app': {
            // Mark as delivered — it's already stored in the DB for the NotificationCenter to pick up.
            // Also fire a push notification if we have a user_id match.
            await supabase.from('notifications').update({
              status: 'delivered',
              delivered_at: new Date().toISOString()
            }).eq('id', notification.id);

            // Try to push to the recipient (director) if their id is stored as recipient_id
            if (notification.recipient_id) {
              await sendPushToUser(
                notification.recipient_id,
                notification.subject || 'LMW Notification',
                notification.message,
                '/notifications'
              );
            }

            sent++;
            break;
          }

          default:
            console.warn('Unknown notification type:', notification.notification_type);
            await supabase.from('notifications').update({
              status: 'failed',
              error_message: `Unknown type: ${notification.notification_type}`
            }).eq('id', notification.id);
            failed++;
        }
      } catch (err) {
        console.error(`Failed to process notification ${notification.id}:`, err.message);
        await supabase.from('notifications').update({
          status: 'failed',
          error_message: err.message
        }).eq('id', notification.id);
        failed++;
      }
    }

    return res.status(200).json({ success: true, processed: pending.length, sent, failed });
  } catch (err) {
    console.error('cron-process-notifications error:', err);
    return res.status(500).json({ error: err.message });
  }
}
