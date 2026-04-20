// API: Send push notification to a user's subscribed devices
// POST /api/push-send

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure VAPID
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || 'erich@lmwfinance.co.za'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, title, body, url, tag, actions, requireInteraction } = req.body;

    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // Get all subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    if (!subscriptions?.length) {
      return res.status(200).json({ success: true, sent: 0, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title: title || 'LMW Reminder',
      body: body || 'You have a notification',
      url: url || '/',
      tag: tag || 'lmw-notification',
      actions: actions || [],
      requireInteraction: requireInteraction || false
    });

    let sent = 0;
    let failed = 0;
    const staleEndpoints = [];

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (pushErr) {
        console.error(`Push failed for ${sub.endpoint}:`, pushErr.statusCode);
        failed++;

        // 404 or 410 means subscription expired — clean up
        if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    }

    // Remove stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', staleEndpoints);
    }

    return res.status(200).json({ success: true, sent, failed, cleaned: staleEndpoints.length });

  } catch (err) {
    console.error('push-send error:', err);
    return res.status(500).json({ error: err.message });
  }
}
