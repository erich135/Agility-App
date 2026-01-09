-- ============================================
-- ADD MISSING INVOICE COLUMNS TO TIME ENTRIES
-- Run this if you get "Bad Request" errors when invoicing time entries
-- ============================================

DO $$
BEGIN
    -- 1. Add invoice_number to time_entries
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'invoice_number') THEN
        ALTER TABLE public.time_entries ADD COLUMN invoice_number VARCHAR(100);
        RAISE NOTICE 'Added invoice_number column to time_entries';
    ELSE
        RAISE NOTICE 'invoice_number column already exists';
    END IF;

    -- 2. Add invoice_date to time_entries
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'invoice_date') THEN
        ALTER TABLE public.time_entries ADD COLUMN invoice_date DATE;
        RAISE NOTICE 'Added invoice_date column to time_entries';
    ELSE
         RAISE NOTICE 'invoice_date column already exists';
    END IF;
END $$;
