// API: Save or remove push subscription
// POST /api/push-subscribe — save subscription
// DELETE /api/push-subscribe — remove subscription

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { userId, subscription, userAgent } = req.body;

      if (!userId || !subscription?.endpoint) {
        return res.status(400).json({ error: 'Missing userId or subscription' });
      }

      // Upsert: update if same endpoint exists, insert otherwise
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
          user_agent: userAgent || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'endpoint'
        });

      if (error) throw error;

      return res.status(200).json({ success: true });

    } else if (req.method === 'DELETE') {
      const { userId, endpoint } = req.body;

      if (!userId || !endpoint) {
        return res.status(400).json({ error: 'Missing userId or endpoint' });
      }

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
  } catch (err) {
    console.error('push-subscribe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
