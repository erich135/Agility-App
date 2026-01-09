-- ============================================================================
-- FIX TIME ENTRIES FOREIGN KEY RELATIONSHIPS
-- ============================================================================
-- This script ensures foreign key relationships are properly established
-- for the Supabase PostgREST API to work correctly
-- ============================================================================

BEGIN;

-- Drop existing foreign key if it exists (in case of naming issues)
ALTER TABLE IF EXISTS public.time_entries 
  DROP CONSTRAINT IF EXISTS time_entries_project_id_fkey;

ALTER TABLE IF EXISTS public.time_entries 
  DROP CONSTRAINT IF EXISTS time_entries_consultant_id_fkey;

-- Add foreign keys with proper naming
ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES public.projects(id) 
  ON DELETE RESTRICT;

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_consultant_id_fkey 
  FOREIGN KEY (consultant_id) 
  REFERENCES public.consultants(id) 
  ON DELETE RESTRICT;

-- Ensure client_id foreign key exists on projects table
ALTER TABLE IF EXISTS public.projects 
  DROP CONSTRAINT IF EXISTS projects_client_id_fkey;

ALTER TABLE IF EXISTS public.projects 
  DROP CONSTRAINT IF EXISTS projects_job_type_id_fkey;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES public.clients(id) 
  ON DELETE RESTRICT;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_job_type_id_fkey 
  FOREIGN KEY (job_type_id) 
  REFERENCES public.job_types(id) 
  ON DELETE RESTRICT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_consultant_id ON public.time_entries(consultant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_date ON public.time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_job_type_id ON public.projects(job_type_id);

-- Refresh the Supabase schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check foreign keys
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('time_entries', 'projects')
ORDER BY tc.table_name, kcu.column_name;
