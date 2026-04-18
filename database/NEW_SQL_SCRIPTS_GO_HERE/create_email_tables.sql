-- ============================================================
-- Email Integration Tables (Microsoft Graph API)
-- ============================================================
-- Single-user email integration (owner's M365 account)
-- NOTE: References public.users (custom auth), NOT auth.users

-- ============================================================
-- 1. Email Token Storage (single row for owner's MS Graph token)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  email_address TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT email_tokens_user_unique UNIQUE (user_id)
);

-- Disable RLS - API uses service_role key
ALTER TABLE email_tokens DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Job-Email Links (junction table: job_register <-> emails)
-- ============================================================
CREATE TABLE IF NOT EXISTS job_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES job_register(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,              -- Microsoft Graph message ID
  internet_message_id TEXT,              -- RFC 2822 Message-ID header
  conversation_id TEXT,                  -- Graph conversation thread ID
  subject TEXT,
  sender_name TEXT,
  sender_email TEXT,
  received_at TIMESTAMPTZ,
  snippet TEXT,                          -- First ~200 chars of body
  has_attachments BOOLEAN DEFAULT false,
  linked_by UUID REFERENCES public.users(id),
  linked_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,                            -- Optional note when linking
  CONSTRAINT job_emails_unique UNIQUE (job_id, message_id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_job_emails_job_id ON job_emails(job_id);
CREATE INDEX IF NOT EXISTS idx_job_emails_message_id ON job_emails(message_id);
CREATE INDEX IF NOT EXISTS idx_job_emails_sender_email ON job_emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_job_emails_conversation_id ON job_emails(conversation_id);

-- Disable RLS - API uses service_role key
ALTER TABLE job_emails DISABLE ROW LEVEL SECURITY;
