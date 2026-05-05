// API: Unified push notifications handler
// Routes via ?action=subscribe | send | snooze
//
// POST   /api/push?action=subscribe   – save subscription
// DELETE /api/push?action=subscribe   – remove subscription
// POST   /api/push?action=send        – send push to a user's devices
// POST   /api/push?action=snooze      – snooze an interrupt from the OS notification

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    // ── SUBSCRIBE / UNSUBSCRIBE ──────────────────────────────────────────────
    if (action === 'subscribe') {
      if (req.method === 'POST') {
        const { userId, subscription, userAgent } = req.body;
        if (!userId || !subscription?.endpoint)
          return res.status(400).json({ error: 'Missing userId or subscription' });

        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys?.p256dh,
            auth: subscription.keys?.auth,
            user_agent: userAgent || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'endpoint' });

        if (error) throw error;
        return res.status(200).json({ success: true });

      } else if (req.method === 'DELETE') {
        const { userId, endpoint } = req.body;
        if (!userId || !endpoint)
          return res.status(400).json({ error: 'Missing userId or endpoint' });

        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', endpoint);

        if (error) throw error;
        return res.status(200).json({ success: true });

      } else {
        return res.status(405).json({ error: 'Method not allowed' });
      }
    }

    // ── SEND ─────────────────────────────────────────────────────────────────
    if (action === 'send') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      const { userId, title, body, url, tag, actions, requireInteraction } = req.body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (!subscriptions?.length)
        return res.status(200).json({ success: true, sent: 0, message: 'No subscriptions found' });

      const payload = JSON.stringify({
        title: title || 'LMW Reminder',
        body: body || 'You have a notification',
        url: url || '/',
        tag: tag || 'lmw-notification',
        actions: actions || [],
        requireInteraction: requireInteraction || false
      });

      let sent = 0, failed = 0;
      const staleEndpoints = [];

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          sent++;
        } catch (pushErr) {
          failed++;
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410)
            staleEndpoints.push(sub.endpoint);
        }
      }

      if (staleEndpoints.length)
        await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints);

      return res.status(200).json({ success: true, sent, failed, cleaned: staleEndpoints.length });
    }

    // ── SNOOZE ───────────────────────────────────────────────────────────────
    if (action === 'snooze') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      const { interruptId, minutes = 30 } = req.body || {};
      if (!interruptId) return res.status(400).json({ error: 'Missing interruptId' });

      const deferUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('interrupt_inbox')
        .update({ status: 'deferred', defer_until: deferUntil })
        .eq('id', interruptId);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, deferUntil });
    }

    return res.status(400).json({ error: 'Missing or invalid action. Use ?action=subscribe|send|snooze' });

  } catch (err) {
    console.error('push handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
