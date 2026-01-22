-- ============================================================================
-- FIX: Project INSERT fails due to trigger side-effects
-- ============================================================================
-- Even if `anon` can INSERT into `public.projects`, triggers may write to other
-- tables (billing reminders, status history) and can fail with permission errors.
--
-- This script grants the minimum required privileges for the trigger functions
-- defined in `timesheet_module_schema.sql`:
--   - create_billing_reminders() -> writes to public.billing_reminders
--   - log_project_status_change() -> writes to public.project_status_history
--
-- If you prefer stricter security, use Supabase Auth + RLS and move writes to
-- server-side endpoints instead of granting to `anon`.
--
-- Run in Supabase SQL Editor.

BEGIN;

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- billing_reminders: trigger does DELETE + INSERT
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_reminders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_reminders TO authenticated;

-- project_status_history: trigger does INSERT
GRANT SELECT, INSERT ON TABLE public.project_status_history TO anon;
GRANT SELECT, INSERT ON TABLE public.project_status_history TO authenticated;

-- Sequences (if these tables use identity/serial columns)
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;
