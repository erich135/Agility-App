-- ============================================================================
-- FIX: Project creation fails with project_number generator permissions
-- ============================================================================
-- Symptom:
--   Creating a project fails with:
--     code=42501 message="permission denied for schema public"
--
-- Root cause:
--   The trigger `trigger_generate_project_number` calls the trigger function
--   `generate_project_number()`. The race-condition-safe implementation may
--   CREATE/ALTER yearly sequences (e.g. project_number_seq_2026). When the
--   INSERT is executed as a low-privilege role, the trigger function can fail
--   while creating/altering those sequences.
--
-- Fix approach:
--   Make the helper functions SECURITY DEFINER so they run with the function
--   owner's privileges (typically `postgres` when run in Supabase SQL Editor),
--   avoiding the need to GRANT CREATE ON SCHEMA public to `anon`.
--
-- Safe to re-run.

BEGIN;

-- Ensure schema usage so functions resolve cleanly
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure sequence usage for anon/authenticated (for nextval/currval)
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- SECURITY DEFINER: get or create the yearly sequence, then return next value
CREATE OR REPLACE FUNCTION public.get_project_sequence(year_val VARCHAR)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    seq_name VARCHAR;
    next_val INTEGER;
BEGIN
    -- Guard: only allow 4-digit years (prevents unexpected SQL formatting)
    IF year_val IS NULL OR year_val !~ '^\d{4}$' THEN
        RAISE EXCEPTION 'Invalid year_val: % (expected YYYY)', year_val;
    END IF;

    seq_name := 'project_number_seq_' || year_val;

    -- Check if sequence exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relkind = 'S' AND relname = seq_name
    ) THEN
        -- Create sequence starting from 1
        EXECUTE format('CREATE SEQUENCE %I START WITH 1', seq_name);

        -- If there are existing projects for this year, fast-forward sequence
        EXECUTE format(
            'SELECT COALESCE(MAX(CAST(SUBSTRING(project_number FROM ''PRJ-%s-(\\d+)'') AS INTEGER)), 0) + 1 '
            'FROM public.projects WHERE project_number LIKE ''PRJ-%s-%%''',
            year_val, year_val
        ) INTO next_val;

        IF next_val > 1 THEN
            EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, next_val);
        END IF;
    END IF;

    EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
    RETURN next_val;
END;
$$;

-- SECURITY DEFINER: generate a unique project number using the yearly sequence
CREATE OR REPLACE FUNCTION public.generate_project_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    year_part VARCHAR(4);
    seq_num INTEGER;
    new_number VARCHAR(50);
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
    number_exists BOOLEAN;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

    LOOP
        attempt := attempt + 1;

        seq_num := public.get_project_sequence(year_part);
        new_number := 'PRJ-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');

        SELECT EXISTS(
            SELECT 1 FROM public.projects WHERE project_number = new_number
        ) INTO number_exists;

        IF NOT number_exists THEN
            NEW.project_number := new_number;
            RETURN NEW;
        END IF;

        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique project number after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$;

-- Ensure anon/authenticated can call the functions if needed (safe even if triggers don't require it)
GRANT EXECUTE ON FUNCTION public.get_project_sequence(VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION public.get_project_sequence(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_project_number() TO anon;
GRANT EXECUTE ON FUNCTION public.generate_project_number() TO authenticated;

COMMIT;

-- Optional verification:
-- select to_regclass('public.project_number_seq_' || to_char(current_date,'YYYY')) as seq;
