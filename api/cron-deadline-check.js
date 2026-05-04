// API: Cron endpoint — check job deadlines and send push reminders
// Called daily by Vercel Cron
// GET /api/cron-deadline-check

import { createClient } from '@supabase/supabase-js';
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

export default async function handler(req, res) {
  // Verify auth: either Vercel CRON_SECRET (GET) or admin userId in POST body (manual trigger)
  const authHeader = req.headers.authorization;
  const isValidCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isValidCron) {
    // Allow admin users to trigger manually by sending their userId
    if (req.method !== 'POST') return res.status(401).json({ error: 'Unauthorized' });

    const { adminUserId } = req.body || {};
    if (!adminUserId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
  }

  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate reminder windows
    const in1Day = new Date(today);
    in1Day.setDate(in1Day.getDate() + 1);
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    // Get closed status keys from DB (so custom statuses marked as closed are also excluded)
    const { data: closedStatusRows } = await supabase
      .from('job_statuses')
      .select('key')
      .eq('is_closed', true);
    const closedKeys = closedStatusRows?.map(s => s.key) || ['completed', 'cancelled'];

    // Fetch open jobs with upcoming or overdue deadlines
    // Exclude all closed-status jobs (completed, cancelled, and any custom closed statuses)
    const { data: jobs, error: jobError } = await supabase
      .from('job_register')
      .select('id, title, client_id, date_due, assigned_to, status, category')
      .not('status', 'in', `(${closedKeys.join(',')})`)
      .not('date_due', 'is', null)
      .lte('date_due', in7Days.toISOString().split('T')[0])
      .order('date_due');

    if (jobError) throw jobError;

    if (!jobs?.length) {
      return res.status(200).json({ success: true, notifications: 0, message: 'No upcoming deadlines' });
    }

    // Group notifications by urgency
    const notifications = [];

    for (const job of jobs) {
      const dueDate = new Date(job.date_due);
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      let urgency, emoji;
      if (diffDays < 0) {
        urgency = 'OVERDUE';
        emoji = '🚨';
      } else if (diffDays === 0) {
        urgency = 'DUE TODAY';
        emoji = '⚠️';
      } else if (diffDays === 1) {
        urgency = 'DUE TOMORROW';
        emoji = '⏰';
      } else if (diffDays <= 3) {
        urgency = `DUE IN ${diffDays} DAYS`;
        emoji = '📋';
      } else {
        urgency = `DUE IN ${diffDays} DAYS`;
        emoji = '📅';
      }

      notifications.push({
        job,
        urgency,
        emoji,
        diffDays,
        userId: job.assigned_to
      });
    }

    // Get all push subscriptions (for all users with subscriptions)
    const { data: allSubs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) throw subError;

    if (!allSubs?.length) {
      return res.status(200).json({ success: true, notifications: notifications.length, sent: 0, message: 'No push subscriptions' });
    }

    // Group subscriptions by user
    const subsByUser = {};
    for (const sub of allSubs) {
      if (!subsByUser[sub.user_id]) subsByUser[sub.user_id] = [];
      subsByUser[sub.user_id].push(sub);
    }

    let totalSent = 0;
    const staleEndpoints = [];

    // Build summary notifications per user
    // For now, send to ALL subscribed users (small practice, single user)
    const userIds = Object.keys(subsByUser);

    for (const userId of userIds) {
      const userSubs = subsByUser[userId];

      // Group overdue and today items for urgent notification
      const overdue = notifications.filter(n => n.diffDays < 0);
      const dueToday = notifications.filter(n => n.diffDays === 0);
      const dueSoon = notifications.filter(n => n.diffDays > 0 && n.diffDays <= 3);
      const dueThisWeek = notifications.filter(n => n.diffDays > 3);

      // Send overdue/today as urgent
      if (overdue.length > 0 || dueToday.length > 0) {
        const urgentItems = [...overdue, ...dueToday];
        const body = urgentItems.length === 1
          ? `${urgentItems[0].emoji} ${urgentItems[0].urgency}: ${urgentItems[0].job.title}`
          : `${urgentItems.length} jobs need attention:\n` +
            urgentItems.slice(0, 5).map(n => `${n.emoji} ${n.job.title}`).join('\n') +
            (urgentItems.length > 5 ? `\n...and ${urgentItems.length - 5} more` : '');

        const payload = JSON.stringify({
          title: '🚨 LMW — Urgent Deadlines',
          body,
          url: '/jobs',
          tag: 'deadline-urgent',
          requireInteraction: true
        });

        for (const sub of userSubs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            totalSent++;
          } catch (pushErr) {
            if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
              staleEndpoints.push(sub.endpoint);
            }
          }
        }
      }

      // Send upcoming as informational (only if there are items and no urgent)
      if (dueSoon.length > 0 && overdue.length === 0 && dueToday.length === 0) {
        const body = dueSoon.length === 1
          ? `${dueSoon[0].emoji} ${dueSoon[0].urgency}: ${dueSoon[0].job.title}`
          : `${dueSoon.length} jobs due in the next 3 days`;

        const payload = JSON.stringify({
          title: '📋 LMW — Upcoming Deadlines',
          body,
          url: '/jobs',
          tag: 'deadline-upcoming'
        });

        for (const sub of userSubs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            totalSent++;
          } catch (pushErr) {
            if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
              staleEndpoints.push(sub.endpoint);
            }
          }
        }
      }
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', staleEndpoints);
    }

    // Log the cron run
    console.log(`Deadline check: ${notifications.length} jobs, ${totalSent} notifications sent, ${staleEndpoints.length} cleaned`);

    return res.status(200).json({
      success: true,
      jobsChecked: jobs.length,
      overdue: notifications.filter(n => n.diffDays < 0).length,
      dueToday: notifications.filter(n => n.diffDays === 0).length,
      dueSoon: notifications.filter(n => n.diffDays > 0 && n.diffDays <= 3).length,
      notificationsSent: totalSent,
      staleCleaned: staleEndpoints.length
    });

  } catch (err) {
    console.error('cron-deadline-check error:', err);
    return res.status(500).json({ error: err.message });
  }
}
