-- Focus Sessions & Interrupt Inbox tables
-- Run this in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS and DO blocks throughout

-- ============================================================
-- 1. focus_sessions – tracks each focus block
-- ============================================================
CREATE TABLE IF NOT EXISTS focus_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_description  TEXT NOT NULL,
  next_action       TEXT,
  duration_minutes  INTEGER NOT NULL DEFAULT 45,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at           TIMESTAMPTZ NOT NULL,
  completed_at      TIMESTAMPTZ,
  client_name       TEXT,
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  job_id            UUID REFERENCES job_register(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'parked', 'abandoned')),
  interruptions_count INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Add job_id if table already existed without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'focus_sessions' AND column_name = 'job_id'
  ) THEN
    ALTER TABLE focus_sessions
      ADD COLUMN job_id UUID REFERENCES job_register(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for quick lookups of active sessions
CREATE INDEX IF NOT EXISTS idx_focus_sessions_status ON focus_sessions(status);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started ON focus_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_job ON focus_sessions(job_id);

-- ============================================================
-- 2. interrupt_inbox – captured interruptions
-- ============================================================
CREATE TABLE IF NOT EXISTS interrupt_inbox (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source          TEXT NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('email', 'phone', 'thought', 'person', 'other', 'manual')),
  client_name     TEXT,
  subject         TEXT NOT NULL,
  urgency         TEXT NOT NULL DEFAULT 'today'
                  CHECK (urgency IN ('now', 'today', 'this_week', 'someday')),
  next_action     TEXT,
  focus_session_id UUID REFERENCES focus_sessions(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'resolved', 'deferred', 'converted')),
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  defer_until     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Update status check constraint to include 'converted' if table existed before
DO $$
BEGIN
  ALTER TABLE interrupt_inbox DROP CONSTRAINT IF EXISTS interrupt_inbox_status_check;
  ALTER TABLE interrupt_inbox ADD CONSTRAINT interrupt_inbox_status_check
    CHECK (status IN ('pending', 'resolved', 'deferred', 'converted'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_interrupt_inbox_status ON interrupt_inbox(status);
CREATE INDEX IF NOT EXISTS idx_interrupt_inbox_urgency ON interrupt_inbox(urgency);
CREATE INDEX IF NOT EXISTS idx_interrupt_inbox_captured ON interrupt_inbox(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_interrupt_inbox_session ON interrupt_inbox(focus_session_id);

-- ============================================================
-- 3. RLS policies (safe to re-run)
-- ============================================================
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interrupt_inbox ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'focus_sessions_all') THEN
    CREATE POLICY "focus_sessions_all" ON focus_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'interrupt_inbox_all') THEN
    CREATE POLICY "interrupt_inbox_all" ON interrupt_inbox FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
