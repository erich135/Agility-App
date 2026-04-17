-- ============================================================
-- Push Subscriptions Table for Web Push Notifications
-- ============================================================
-- NOTE: References public.users (custom auth), NOT auth.users

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Disable RLS - API uses service_role key which bypasses RLS anyway
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
