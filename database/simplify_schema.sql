-- Simplified Schema: Remove project dependency from time tracking
-- Run this in Supabase SQL Editor

-- Make project_id optional in time_entries (for backwards compatibility)
ALTER TABLE public.time_entries 
ALTER COLUMN project_id DROP NOT NULL;

-- Add client_id directly to time_entries if it doesn't exist
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- Update existing entries to copy client_id from projects
UPDATE public.time_entries te
SET client_id = p.client_id
FROM public.projects p
WHERE te.project_id = p.id
  AND te.client_id IS NULL;

-- Make client_id required going forward (after migration)
-- ALTER TABLE public.time_entries 
-- ALTER COLUMN client_id SET NOT NULL;

-- Add default_hourly_rate to consultants for easier time entry
ALTER TABLE public.consultants
ADD COLUMN IF NOT EXISTS default_hourly_rate NUMERIC(10,2);

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'time_entries'
  AND column_name IN ('project_id', 'client_id', 'consultant_id')
ORDER BY ordinal_position;
