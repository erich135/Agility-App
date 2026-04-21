// API: Cron endpoint — remind users about pending/deferred interruptions
// Runs every hour via Vercel Cron
// GET /api/cron-interrupt-reminders

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

async function broadcastPush(subscriptions, title, body, url, tag, interruptId = null) {
  const payload = JSON.stringify({
    title,
    body,
    url: url || '/focus',
    tag: tag || 'interrupt-reminder',
    requireInteraction: true,
    interruptId  // null for multi-item pushes; set for single-item so SW snooze works
  });

  const stale = [];

  for (const sub of subscriptions) {
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

// Send to a specific user's subscriptions; fall back to allSubs if no user_id
function subsForUser(allSubs, userId) {
  if (!userId) return allSubs;
  const personal = allSubs.filter(s => s.user_id === userId);
  return personal.length ? personal : allSubs; // fallback keeps older data working
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();

    // Get all active push subscriptions
    const { data: allSubs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) throw subError;
    if (!allSubs?.length) {
      return res.status(200).json({ success: true, message: 'No push subscriptions' });
    }

    let pushCount = 0;

    // ── 1. Deferred interrupts whose snooze time has elapsed ──────────────
    const { data: deferredDue, error: deferError } = await supabase
      .from('interrupt_inbox')
      .select('*')
      .eq('status', 'deferred')
      .not('defer_until', 'is', null)
      .lte('defer_until', now.toISOString());

    if (deferError) throw deferError;

    if (deferredDue?.length) {
      // Re-activate them so the app shows them as pending again
      const ids = deferredDue.map(i => i.id);
      await supabase
        .from('interrupt_inbox')
        .update({ status: 'pending', defer_until: null })
        .in('id', ids);

      // Group into a single push per user where possible, otherwise broadcast
      const byUser = {};
      for (const item of deferredDue) {
        const key = item.user_id || '__broadcast__';
        (byUser[key] = byUser[key] || []).push(item);
      }

      for (const [userId, items] of Object.entries(byUser)) {
        const subs = subsForUser(allSubs, userId === '__broadcast__' ? null : userId);
        const title = items.length === 1
          ? `⏰ Snooze ended: ${items[0].subject}`
          : `⏰ ${items.length} snoozed items need action`;
        const body = items.length === 1
          ? (items[0].next_action || 'Tap to review')
          : items.map(i => `• ${i.subject}`).join('\n');
        await broadcastPush(subs, title, body, '/focus', 'snooze-expired',
          items.length === 1 ? items[0].id : null);
      }
      pushCount += deferredDue.length;
    }

    // ── 2. "Now" urgency items still pending after 1 hour ─────────────────
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const { data: staleNow, error: staleError } = await supabase
      .from('interrupt_inbox')
      .select('*')
      .eq('status', 'pending')
      .eq('urgency', 'now')
      .lte('captured_at', oneHourAgo);

    if (staleError) throw staleError;

    if (staleNow?.length) {
      // Send per-user where possible
      const byUser = {};
      for (const item of staleNow) {
        const key = item.user_id || '__broadcast__';
        (byUser[key] = byUser[key] || []).push(item);
      }

      for (const [userId, items] of Object.entries(byUser)) {
        const subs = subsForUser(allSubs, userId === '__broadcast__' ? null : userId);
        const title = items.length === 1
          ? `🚨 Still unactioned: ${items[0].subject}`
          : `🚨 ${items.length} urgent items still unactioned`;
        const body = items.length === 1
          ? 'This was captured over an hour ago and is still pending.'
          : items.map(i => `• ${i.subject}`).join('\n');
        await broadcastPush(subs, title, body, '/focus', 'urgent-stale',
          items.length === 1 ? items[0].id : null);
      }
      pushCount += staleNow.length;
    }

    // ── 3. "Today" urgency items still pending at end of day (after 16:00) ─
    const hour = now.getHours();
    if (hour >= 16) {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const { data: todayStale, error: todayError } = await supabase
        .from('interrupt_inbox')
        .select('*')
        .eq('status', 'pending')
        .eq('urgency', 'today')
        .gte('captured_at', startOfDay.toISOString());

      if (todayError) throw todayError;

      if (todayStale?.length) {
        // Group by user
        const byUser = {};
        for (const item of todayStale) {
          const key = item.user_id || '__broadcast__';
          (byUser[key] = byUser[key] || []).push(item);
        }

        for (const [userId, items] of Object.entries(byUser)) {
          const subs = subsForUser(allSubs, userId === '__broadcast__' ? null : userId);
          const title = `📋 End of day: ${items.length} item${items.length > 1 ? 's' : ''} still pending`;
          const body = items.map(i => `• ${i.subject}`).join('\n');
          await broadcastPush(subs, title, body, '/focus', 'eod-reminder');
        }
        pushCount += todayStale.length;
      }
    }

    return res.status(200).json({
      success: true,
      snoozesExpired: deferredDue?.length || 0,
      urgentStale: staleNow?.length || 0,
      pushCount
    });
  } catch (err) {
    console.error('cron-interrupt-reminders error:', err);
    return res.status(500).json({ error: err.message });
  }
}
