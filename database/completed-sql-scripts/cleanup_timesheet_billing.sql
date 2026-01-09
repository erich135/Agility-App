-- COMPLETE CLEANUP: Remove all timesheet and billing data
-- WARNING: This will permanently delete all time tracking and billing data!
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Delete all data from related tables
-- ============================================

-- Delete all time entries
TRUNCATE TABLE public.time_entries CASCADE;

-- Delete all billing info
TRUNCATE TABLE public.billing_info CASCADE;

-- Delete all billing reminders  
TRUNCATE TABLE public.billing_reminders CASCADE;

-- Delete all projects (if only used for timesheet)
TRUNCATE TABLE public.projects CASCADE;

-- ============================================
-- STEP 2: Drop timesheet/billing specific tables
-- ============================================

-- Drop billing reminders table
DROP TABLE IF EXISTS public.billing_reminders CASCADE;

-- Drop billing info table  
DROP TABLE IF EXISTS public.billing_info CASCADE;

-- Drop time entries table
DROP TABLE IF EXISTS public.time_entries CASCADE;

-- Drop projects table (if you want to remove projects entirely)
DROP TABLE IF EXISTS public.projects CASCADE;

-- Drop job types if only used for timesheet
-- DROP TABLE IF EXISTS public.job_types CASCADE;

-- ============================================
-- STEP 3: Clean up any orphaned columns
-- ============================================

-- If consultants table has timesheet-specific columns, remove them
ALTER TABLE public.consultants 
DROP COLUMN IF EXISTS default_hourly_rate;

-- ============================================
-- VERIFICATION
-- ============================================

-- List remaining tables to verify cleanup
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
