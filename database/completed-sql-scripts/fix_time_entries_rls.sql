-- Fix RLS policies for time_entries
-- When RLS was enabled, no policies were added, causing the table to appear empty to the frontend.

BEGIN;

-- 1. Enable RLS (ensure it's on)
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- 2. Create permissive policy for authenticated users (or all users if specific auth not needed yet)
-- Check if policy exists first to avoid errors, or just drop and recreate
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.time_entries;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.time_entries;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.time_entries;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.time_entries;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.time_entries;

CREATE POLICY "Enable all access for authenticated users"
ON public.time_entries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. In case the user is using the 'anon' key for now (dev mode), lets allow that too temporarily
-- (Optional: remove this in production)
CREATE POLICY "Enable all access for anon users"
ON public.time_entries
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

COMMIT;
