// API: Handle snooze action triggered from an OS push notification
// Called by the Service Worker notificationclick handler when the user
// taps "Snooze 30 min" directly on the OS notification banner.
// POST /api/push-snooze  { interruptId, minutes }

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
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
