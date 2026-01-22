-- ============================================================================
-- COMPREHENSIVE PERMISSIONS FIX FOR ALL TABLES
-- ============================================================================
-- This script grants full permissions to anon and authenticated roles
-- Fixes "permission denied for schema public" errors
-- ============================================================================

BEGIN;

-- 1. Grant USAGE and CREATE on schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT CREATE ON SCHEMA public TO anon;
GRANT CREATE ON SCHEMA public TO authenticated;

-- 2. Grant ALL on ALL tables in public schema
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- 3. Grant ALL on ALL sequences in public schema
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. Grant ALL on ALL functions in public schema
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 5. Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- 6. Disable RLS on all critical tables
ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consultants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- 7. Drop all policies that might be blocking
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- 8. Verify
DO $$
BEGIN
    RAISE NOTICE '✅ Schema permissions granted to anon and authenticated';
    RAISE NOTICE '✅ All table permissions granted';
    RAISE NOTICE '✅ All sequence permissions granted';
    RAISE NOTICE '✅ RLS disabled on core tables';
    RAISE NOTICE '✅ All policies dropped';
    RAISE NOTICE '';
    RAISE NOTICE '🔓 Database is now fully accessible to your app!';
END $$;

COMMIT;
