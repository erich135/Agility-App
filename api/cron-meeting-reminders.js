// API: Cron endpoint — daily meeting reminders (1 week / 3 days / 1 day before)
// Called daily by Vercel Cron at 6am SAST (4am UTC)
// GET /api/cron-meeting-reminders

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

// Daily reminder windows:
// Each entry: reminder key, hours ahead of meeting, ±half-window hours for matching
const DAILY_REMINDERS = [
  { key: '1week', hoursAhead: 7 * 24, halfWindow: 12 }, // 168h ± 12h
  { key: '3days', hoursAhead: 3 * 24, halfWindow: 12 }, //  72h ± 12h
  { key: '1day',  hoursAhead: 1 * 24, halfWindow: 12 }, //  24h ± 12h
];

const LABEL = {
  '1week': 'in 1 week',
  '3days': 'in 3 days',
  '1day':  'tomorrow',
};

async function sendPush(subs, payload) {
  const stale = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
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
  // Verify: Vercel CRON_SECRET (GET) or admin userId (POST manual trigger)
  const authHeader = req.headers.authorization;
  const isValidCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isValidCron) {
    if (req.method !== 'POST') return res.status(401).json({ error: 'Unauthorized' });
    const { adminUserId } = req.body || {};
    if (!adminUserId) return res.status(401).json({ error: 'Unauthorized' });
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', adminUserId).single();
    if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const now = new Date();

    // Get all push subscriptions
    const { data: allSubs, error: subError } = await supabase
      .from('push_subscriptions').select('*');
    if (subError) throw subError;
    if (!allSubs?.length) {
      return res.status(200).json({ success: true, message: 'No push subscriptions' });
    }

    // Fetch meetings in the next 8 days (covers all daily windows + buffer)
    const windowEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select('id, title, meeting_date, location, reminders, reminders_sent, clients(client_name)')
      .gt('meeting_date', now.toISOString())
      .lte('meeting_date', windowEnd.toISOString())
      .order('meeting_date');
    if (error) throw error;

    if (!meetings?.length) {
      return res.status(200).json({ success: true, sent: 0, message: 'No upcoming meetings in window' });
    }

    let totalSent = 0;

    for (const meeting of meetings) {
      const meetingTime = new Date(meeting.meeting_date);
      const diffHours = (meetingTime - now) / (1000 * 60 * 60);
      const reminders = meeting.reminders || [];
      const sentList = meeting.reminders_sent || [];

      const toSend = [];

      for (const { key, hoursAhead, halfWindow } of DAILY_REMINDERS) {
        if (!reminders.includes(key)) continue;
        if (sentList.includes(key)) continue;
        if (diffHours >= hoursAhead - halfWindow && diffHours <= hoursAhead + halfWindow) {
          toSend.push(key);
        }
      }

      if (!toSend.length) continue;

      // Format display strings
      const dateStr = meetingTime.toLocaleDateString('en-ZA', {
        weekday: 'short', day: 'numeric', month: 'short',
      });
      const timeStr = meetingTime.toLocaleTimeString('en-ZA', {
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
      const clientName = meeting.clients?.client_name || null;
      const locationPart = meeting.location ? ` · ${meeting.location}` : '';
      const clientPart = clientName ? ` · ${clientName}` : '';

      // Send one notification per matching reminder offset
      for (const key of toSend) {
        const payload = {
          title: `📅 Meeting ${LABEL[key]}`,
          body: `${meeting.title}\n${dateStr} at ${timeStr}${locationPart}${clientPart}`,
          url: '/meetings',
          tag: `meeting-${meeting.id}-${key}`,
          requireInteraction: false,
        };
        await sendPush(allSubs, payload);
        totalSent++;
      }

      // Mark reminders as sent
      await supabase
        .from('meetings')
        .update({ reminders_sent: [...sentList, ...toSend] })
        .eq('id', meeting.id);
    }

    return res.status(200).json({ success: true, sent: totalSent });
  } catch (err) {
    console.error('cron-meeting-reminders error:', err);
    return res.status(500).json({ error: err.message });
  }
}
