-- ============================================================
-- Meetings Table
-- ============================================================
-- Stores scheduled meetings with configurable pre-meeting reminders.
-- Reminders fire via:
--   cron-meeting-reminders.js  (daily at 6am  — 1week / 3days / 1day)
--   cron-meeting-hourly.js     (hourly         — 4hours / 1hour / 30min)
-- NOTE: References public.users (custom auth), clients, job_register

CREATE TABLE IF NOT EXISTS meetings (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT        NOT NULL,
  meeting_date    TIMESTAMPTZ NOT NULL,              -- Full date + time of meeting
  location        TEXT,                              -- e.g. "SARS Doringpoort"
  notes           TEXT,
  job_id          UUID        REFERENCES job_register(id) ON DELETE SET NULL,
  client_id       UUID        REFERENCES clients(id)      ON DELETE SET NULL,
  created_by      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  -- Which reminder offsets the user wants:
  -- Valid values: "1week" | "3days" | "1day" | "4hours" | "1hour" | "30min"
  reminders       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Tracks which offsets have already fired (prevents duplicate push notifications)
  reminders_sent  JSONB       NOT NULL DEFAULT '[]'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by   ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_client_id    ON meetings(client_id);
CREATE INDEX IF NOT EXISTS idx_meetings_job_id       ON meetings(job_id);

-- API uses service_role key
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
