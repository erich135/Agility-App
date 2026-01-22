-- ============================================================================
-- FIX PROJECTS TABLE PERMISSIONS
-- ============================================================================
-- This script grants necessary permissions to anon and authenticated roles
-- for the projects table. Run this in your Supabase SQL Editor
-- ============================================================================

BEGIN;

-- 1. CRITICAL: Grant USAGE on the schema itself (this is what's missing!)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Grant full permissions on projects table to both anon and authenticated roles
GRANT ALL ON public.projects TO anon;
GRANT ALL ON public.projects TO authenticated;

-- 3. Grant permissions on related tables that might be accessed
GRANT ALL ON public.clients TO anon;
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.job_types TO anon;
GRANT ALL ON public.job_types TO authenticated;
GRANT ALL ON public.consultants TO anon;
GRANT ALL ON public.consultants TO authenticated;

-- 4. Disable RLS on projects (since you mentioned you already did this)
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- 5. Drop all existing policies on projects table to avoid conflicts
DROP POLICY IF EXISTS "Projects viewable by authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Projects manageable by authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Allow all operations on projects" ON public.projects;

-- 6. Verify the setup
DO $$
BEGIN
    RAISE NOTICE 'Permissions granted successfully!';
    RAISE NOTICE 'anon and authenticated roles can now: SELECT, INSERT, UPDATE, DELETE';
    RAISE NOTICE 'RLS is DISABLED on projects table';
END $$;

COMMIT;

-- ============================================================================
-- TEST THE FIX
-- ============================================================================
-- Try creating a test project to verify permissions work
/*
INSERT INTO public.projects (
    client_id,
    name,
    description,
    status,
    start_date
)
SELECT 
    id,
    'Test Project - Delete Me',
    'Testing permissions',
    'active',
    CURRENT_DATE
FROM public.clients
LIMIT 1;

-- Clean up test
DELETE FROM public.projects WHERE name = 'Test Project - Delete Me';
*/
