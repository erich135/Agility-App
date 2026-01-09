-- Fix time_entries schema to support direct client billing without projects
-- and ensure job_type_id exists

BEGIN;

-- 1. Add client_id if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'client_id') THEN
        ALTER TABLE public.time_entries ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Add job_type_id if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'job_type_id') THEN
        ALTER TABLE public.time_entries ADD COLUMN job_type_id UUID REFERENCES public.job_types(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Make project_id nullable since we can now log time directly to a client
ALTER TABLE public.time_entries ALTER COLUMN project_id DROP NOT NULL;

-- 4. Enable RLS on time_entries just in case (and ensure policies exist)
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- 5. Backfill client_id from existing projects for consistency
UPDATE public.time_entries te
SET client_id = p.client_id
FROM public.projects p
WHERE te.project_id = p.id
AND te.client_id IS NULL;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_client_id ON public.time_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_job_type_id ON public.time_entries(job_type_id);

COMMIT;
