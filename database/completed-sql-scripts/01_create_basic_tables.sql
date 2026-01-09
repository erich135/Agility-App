-- Step 1: Create Basic Tables First
-- Run this FIRST in your Supabase SQL Editor

-- ============================================
-- 1. Create clients table (the main table)
-- ============================================

CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name text NOT NULL,
    registration_number text UNIQUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 2. Create documents table
-- ============================================

CREATE TABLE IF NOT EXISTS public.documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    document_name text NOT NULL,
    file_name text,
    file_path text NOT NULL,
    file_size bigint,
    mime_type text,
    document_type text,
    uploaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 3. Enable Row Level Security
-- ============================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create basic policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.documents;

-- Create permissive policies for authenticated users
CREATE POLICY "Enable all access for authenticated users" 
ON public.clients FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" 
ON public.documents FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ============================================
-- 5. Insert test data
-- ============================================

-- Insert a test client if it doesn't exist
INSERT INTO public.clients (id, client_name, registration_number)
SELECT 
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    'Agile2T Investments',
    '1997/011667/07'
WHERE NOT EXISTS (
    SELECT 1 FROM public.clients WHERE registration_number = '1997/011667/07'
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Basic tables created successfully!';
  RAISE NOTICE '✅ RLS policies configured.';
  RAISE NOTICE '✅ Test data inserted.';
  RAISE NOTICE '🔄 Now run the column migration script next.';
END $$;