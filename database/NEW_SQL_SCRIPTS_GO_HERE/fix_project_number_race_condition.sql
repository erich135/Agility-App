-- ============================================================================
-- FIX PROJECT NUMBER RACE CONDITION
-- ============================================================================
-- This script fixes the race condition in the project_number generation
-- by using a sequence instead of calculating MAX() which can fail under
-- concurrent inserts, causing 409 conflict errors.
-- ============================================================================

BEGIN;

-- Create a sequence for project numbers (one per year)
-- We'll create a function to get or create the sequence for each year
CREATE OR REPLACE FUNCTION get_project_sequence(year_val VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    seq_name VARCHAR;
    next_val INTEGER;
BEGIN
    seq_name := 'project_number_seq_' || year_val;
    
    -- Check if sequence exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relkind = 'S' AND relname = seq_name
    ) THEN
        -- Create sequence starting from current max + 1
        EXECUTE format(
            'CREATE SEQUENCE %I START WITH 1',
            seq_name
        );
        
        -- Set the sequence to start after any existing numbers for this year
        EXECUTE format(
            'SELECT COALESCE(MAX(CAST(SUBSTRING(project_number FROM ''PRJ-%s-(\d+)'') AS INTEGER)), 0) + 1 FROM projects WHERE project_number LIKE ''PRJ-%s-%%''',
            year_val, year_val
        ) INTO next_val;
        
        IF next_val > 1 THEN
            EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, next_val);
        END IF;
    END IF;
    
    -- Get next value from sequence
    EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
    
    RETURN next_val;
END;
$$ LANGUAGE plpgsql;

-- Replace the project number generation function
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_num INTEGER;
    new_number VARCHAR(50);
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
    number_exists BOOLEAN;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Try up to max_attempts times to generate a unique number
    LOOP
        attempt := attempt + 1;
        
        -- Get next sequence number for this year using the sequence
        seq_num := get_project_sequence(year_part);
        
        -- Format the project number
        new_number := 'PRJ-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
        
        -- Check if this number already exists
        SELECT EXISTS(
            SELECT 1 FROM public.projects WHERE project_number = new_number
        ) INTO number_exists;
        
        -- If unique, use it
        IF NOT number_exists THEN
            NEW.project_number := new_number;
            RETURN NEW;
        END IF;
        
        -- If we've tried too many times, raise an error
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique project number after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, no need to recreate it
-- It will automatically use the updated function

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Test the new function by inserting a few test projects concurrently
-- (Run this in a separate transaction after the above changes are committed)
-- ============================================================================

/*
BEGIN;

-- Get a test client
DO $$
DECLARE
    test_client_id UUID;
    test_job_type_id UUID;
    i INTEGER;
BEGIN
    -- Get first client
    SELECT id INTO test_client_id FROM public.clients LIMIT 1;
    
    -- Get first job type
    SELECT id INTO test_job_type_id FROM public.job_types LIMIT 1;
    
    -- Insert 5 test projects rapidly
    FOR i IN 1..5 LOOP
        INSERT INTO public.projects (
            client_id,
            name,
            description,
            job_type_id,
            status
        ) VALUES (
            test_client_id,
            'Test Project ' || i,
            'Testing concurrent project number generation',
            test_job_type_id,
            'active'
        );
        
        RAISE NOTICE 'Created test project %', i;
    END LOOP;
    
    -- Display the created projects
    RAISE NOTICE 'Created projects:';
    FOR i IN (
        SELECT project_number, name 
        FROM public.projects 
        WHERE name LIKE 'Test Project %' 
        ORDER BY created_at DESC 
        LIMIT 5
    ) LOOP
        RAISE NOTICE 'Project: % - %', i.project_number, i.name;
    END LOOP;
    
    -- Clean up test projects
    DELETE FROM public.projects WHERE name LIKE 'Test Project %';
    RAISE NOTICE 'Test projects cleaned up';
END $$;

COMMIT;
*/
