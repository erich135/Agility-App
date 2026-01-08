-- ============================================================================
-- CHECK AND CREATE TIMESHEET TABLES
-- ============================================================================
-- This script checks which timesheet tables exist and creates missing ones
-- Run this before fix_time_entries_fk.sql
-- ============================================================================

-- Check if tables exist
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Checking timesheet tables...';
  RAISE NOTICE '============================================';
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'consultants') THEN
    RAISE NOTICE 'consultants table: MISSING';
  ELSE
    RAISE NOTICE 'consultants table: EXISTS';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_types') THEN
    RAISE NOTICE 'job_types table: MISSING';
  ELSE
    RAISE NOTICE 'job_types table: EXISTS';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
    RAISE NOTICE 'projects table: MISSING';
  ELSE
    RAISE NOTICE 'projects table: EXISTS';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'time_entries') THEN
    RAISE NOTICE 'time_entries table: MISSING';
  ELSE
    RAISE NOTICE 'time_entries table: EXISTS';
  END IF;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'If any tables are MISSING, run timesheet_module_schema.sql first';
  RAISE NOTICE '============================================';
END $$;
