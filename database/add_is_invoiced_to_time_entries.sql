-- Add is_invoiced column to time_entries table
-- This column is used by CustomerManagement.jsx to track invoice status

BEGIN;

-- 1. Add is_invoiced column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'is_invoiced') THEN
        ALTER TABLE public.time_entries ADD COLUMN is_invoiced BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Backfill is_invoiced based on invoice_number presence (if applicable)
UPDATE public.time_entries 
SET is_invoiced = true 
WHERE invoice_number IS NOT NULL AND is_invoiced IS FALSE;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_is_invoiced ON public.time_entries(is_invoiced);

COMMIT;
