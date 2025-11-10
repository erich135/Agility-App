-- Customer Management Database Setup
-- Run these commands in your Supabase SQL Editor

-- 1. Add new columns to existing clients table for customer management
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS company_income_tax_ref text,
ADD COLUMN IF NOT EXISTS company_vat_number text,
ADD COLUMN IF NOT EXISTS company_paye_number text,
ADD COLUMN IF NOT EXISTS public_officer_name text,
ADD COLUMN IF NOT EXISTS public_officer_id text,
ADD COLUMN IF NOT EXISTS company_address text,
ADD COLUMN IF NOT EXISTS company_telephone text,
ADD COLUMN IF NOT EXISTS company_email text,
ADD COLUMN IF NOT EXISTS contact_person_name text,
ADD COLUMN IF NOT EXISTS contact_person_tel text,
ADD COLUMN IF NOT EXISTS contact_person_email text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';

-- 2. Create directors table
CREATE TABLE IF NOT EXISTS public.directors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    director_order integer NOT NULL,
    director_name text NOT NULL,
    id_number text,
    contact_telephone text,
    contact_email text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    document_type text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    mime_type text,
    uploaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create RLS policies
ALTER TABLE public.directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage all records (adjust as needed)
CREATE POLICY "Allow authenticated users to view directors" ON public.directors
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert directors" ON public.directors
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update directors" ON public.directors
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete directors" ON public.directors
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view documents" ON public.documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert documents" ON public.documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update documents" ON public.documents
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete documents" ON public.documents
    FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_directors_client_id ON public.directors(client_id);
CREATE INDEX IF NOT EXISTS idx_directors_order ON public.directors(client_id, director_order);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);

-- Setup complete!
-- Next: Create storage bucket 'client-documents' in Supabase Storage dashboard