-- Add missing invoice tracking columns to time_entries table
-- Run this in Supabase SQL Editor

ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- Disable RLS for development (you can re-enable with proper policies later)
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_types DISABLE ROW LEVEL SECURITY;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'time_entries'
  AND column_name IN ('invoice_number', 'invoice_date', 'timer_active')
ORDER BY column_name;
