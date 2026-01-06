-- Create job_types table and enhance time_entries
-- Run this in Supabase SQL Editor IMMEDIATELY

-- 1. Create job_types table
CREATE TABLE IF NOT EXISTS public.job_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_rate NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS
ALTER TABLE public.job_types DISABLE ROW LEVEL SECURITY;

-- 2. Add default job types
INSERT INTO public.job_types (name, description, default_rate) VALUES
  ('Consultation', 'General consultation and advice', 500.00),
  ('Tax Return', 'Individual or company tax returns', 750.00),
  ('CIPC Filing', 'Annual returns and company registration', 600.00),
  ('Bookkeeping', 'Monthly bookkeeping services', 450.00),
  ('Audit Support', 'Audit preparation and support', 800.00),
  ('Payroll', 'Monthly payroll processing', 400.00),
  ('Financial Statements', 'Preparation of financial statements', 700.00),
  ('Other', 'Other services', 500.00)
ON CONFLICT DO NOTHING;

-- 3. Add job_type_id to time_entries
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS job_type_id UUID REFERENCES public.job_types(id);

-- 4. Verify
SELECT * FROM job_types ORDER BY name;
SELECT column_name FROM information_schema.columns WHERE table_name = 'time_entries';
