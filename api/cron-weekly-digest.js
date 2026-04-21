// API: Weekly inbox digest — pushed every Monday at 07:00
// Summarises all pending interruptions so nothing gets forgotten over the weekend
// GET /api/cron-weekly-digest

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

async function sendPush(subscriptions, title, body, url, tag) {
  const payload = JSON.stringify({ title, body, url, tag, requireInteraction: false });
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

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Pull all pending/deferred interrupts
    const { data: items, error } = await supabase
      .from('interrupt_inbox')
      .select('*')
      .in('status', ['pending', 'deferred'])
      .order('captured_at', { ascending: true });

    if (error) throw error;

    if (!items?.length) {
      return res.status(200).json({ success: true, message: 'Inbox is clear — nothing to report' });
    }

    // Group by urgency for the digest body
    const groups = {
      now: items.filter(i => i.urgency === 'now'),
      today: items.filter(i => i.urgency === 'today'),
      this_week: items.filter(i => i.urgency === 'this_week'),
      someday: items.filter(i => i.urgency === 'someday'),
      deferred: items.filter(i => i.status === 'deferred')
    };

    const lines = [];
    if (groups.now.length)       lines.push(`🚨 Now (${groups.now.length}): ${groups.now.map(i => i.subject).join(', ')}`);
    if (groups.today.length)     lines.push(`⏰ Today (${groups.today.length}): ${groups.today.map(i => i.subject).join(', ')}`);
    if (groups.this_week.length) lines.push(`📋 This week (${groups.this_week.length}): ${groups.this_week.map(i => i.subject).join(', ')}`);
    if (groups.someday.length)   lines.push(`💭 Someday (${groups.someday.length}): ${groups.someday.map(i => i.subject).join(', ')}`);
    if (groups.deferred.length)  lines.push(`💤 Snoozed (${groups.deferred.length}): ${groups.deferred.map(i => i.subject).join(', ')}`);

    const title = `📬 Weekly review — ${items.length} item${items.length > 1 ? 's' : ''} in your inbox`;
    const body = lines.join('\n');

    // Also check upcoming job deadlines this week for context
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: jobs } = await supabase
      .from('job_register')
      .select('job_title, due_date, client_name')
      .or('status.neq.completed,status.neq.cancelled')
      .not('due_date', 'is', null)
      .lte('due_date', nextWeek.toISOString().split('T')[0])
      .order('due_date')
      .limit(5);

    const bodyWithJobs = jobs?.length
      ? body + `\n\n📅 Jobs due this week: ${jobs.map(j => `${j.job_title} (${j.client_name || '?'})`).join(', ')}`
      : body;

    // Get all push subscriptions
    const { data: allSubs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) throw subError;

    if (!allSubs?.length) {
      return res.status(200).json({ success: true, message: 'No push subscriptions' });
    }

    await sendPush(allSubs, title, bodyWithJobs, '/focus', 'weekly-digest');

    return res.status(200).json({ success: true, itemCount: items.length, pushed: allSubs.length });
  } catch (err) {
    console.error('cron-weekly-digest error:', err);
    return res.status(500).json({ error: err.message });
  }
}
