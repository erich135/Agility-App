-- Create simple time_entries table for fresh start
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES public.consultants(id),
  
  -- Time details
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  
  -- Billing details
  hourly_rate NUMERIC(10,2),
  amount NUMERIC(10,2) GENERATED ALWAYS AS (hours * COALESCE(hourly_rate, 0)) STORED,
  
  -- Invoice tracking
  invoice_number VARCHAR(100),
  invoice_date DATE,
  is_invoiced BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_time_entries_client ON public.time_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON public.time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice ON public.time_entries(is_invoiced);

-- Disable RLS for development
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;

-- Create update trigger
CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_time_entries_updated_at();

-- Verify table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'time_entries'
ORDER BY ordinal_position;
