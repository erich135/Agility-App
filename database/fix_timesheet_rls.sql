-- Fix RLS policies for timesheet tables to allow access

-- Disable RLS temporarily for development (you can re-enable later)
ALTER TABLE IF EXISTS public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consultants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_types DISABLE ROW LEVEL SECURITY;

-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('time_entries', 'projects', 'consultants', 'clients', 'job_types')
ORDER BY table_name;

-- Check if timer_active column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'time_entries'
AND column_name = 'timer_active';

-- If timer_active doesn't exist, add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries' 
        AND column_name = 'timer_active'
    ) THEN
        ALTER TABLE public.time_entries 
        ADD COLUMN timer_active BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Verify invoice tracking columns exist in time_entries
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries' 
        AND column_name = 'invoice_number'
    ) THEN
        ALTER TABLE public.time_entries 
        ADD COLUMN invoice_number VARCHAR(100),
        ADD COLUMN invoice_date DATE;
    END IF;
END $$;
