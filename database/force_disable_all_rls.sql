-- ============================================
-- FORCE DISABLE RLS ON ALL TABLES
-- Run this to completely bypass Row Level Security permissions
-- ============================================

-- Core Tables
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_types DISABLE ROW LEVEL SECURITY;

-- History & Logs
ALTER TABLE public.project_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;

-- Financials
ALTER TABLE public.consultant_client_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_mappings DISABLE ROW LEVEL SECURITY;

-- Calendar & Tasks
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_deadlines DISABLE ROW LEVEL SECURITY;

-- Users & Permissions
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions DISABLE ROW LEVEL SECURITY;

-- AI & Extras (If they exist)
ALTER TABLE IF EXISTS public.ai_conversations DISABLE ROW LEVEL SECURITY;

-- Grant all privileges to service_role and authenticated/anon just in case
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

DO $$
BEGIN
    RAISE NOTICE 'RLS has been forcefully disabled on all known tables.';
END $$;
