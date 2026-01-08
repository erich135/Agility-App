-- ============================================================================
-- DROP TIMESHEET TABLES (Run this BEFORE timesheet_module_schema.sql)
-- ============================================================================
-- This script removes all timesheet-related tables so they can be recreated
-- WARNING: This will delete all timesheet data!
-- ============================================================================

BEGIN;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.consultant_client_rates CASCADE;
DROP TABLE IF EXISTS public.timesheet_notifications CASCADE;
DROP TABLE IF EXISTS public.billing_reminders CASCADE;
DROP TABLE IF EXISTS public.project_status_history CASCADE;
DROP TABLE IF EXISTS public.time_entries CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.job_types CASCADE;
DROP TABLE IF EXISTS public.consultants CASCADE;

-- Drop views
DROP VIEW IF EXISTS public.v_active_timers CASCADE;
DROP VIEW IF EXISTS public.v_upcoming_reminders CASCADE;
DROP VIEW IF EXISTS public.v_projects_ready_to_bill CASCADE;
DROP VIEW IF EXISTS public.v_monthly_billable_hours CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS log_project_status_change() CASCADE;
DROP FUNCTION IF EXISTS create_billing_reminders() CASCADE;
DROP FUNCTION IF EXISTS update_project_hours() CASCADE;
DROP FUNCTION IF EXISTS generate_project_number() CASCADE;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Timesheet tables dropped successfully';
  RAISE NOTICE 'Now run timesheet_module_schema.sql';
  RAISE NOTICE '============================================';
END $$;
