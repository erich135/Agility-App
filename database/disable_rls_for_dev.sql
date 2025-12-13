-- ============================================
-- DISABLE RLS FOR DEVELOPMENT
-- Run this to allow unauthenticated access during development
-- IMPORTANT: Re-enable RLS before going to production!
-- ============================================

-- Option 1: Disable RLS entirely (simplest for dev)
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_client_rates DISABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'RLS DISABLED FOR DEVELOPMENT';
    RAISE NOTICE 'Remember to re-enable before production!';
    RAISE NOTICE '============================================';
END $$;
