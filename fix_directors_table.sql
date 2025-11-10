-- Fix Directors Table - Run this in Supabase SQL Editor

-- 1. Drop the existing directors table (if it exists)
DROP TABLE IF EXISTS public.directors CASCADE;

-- 2. Recreate directors table with correct columns
CREATE TABLE public.directors (
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

-- 3. Enable RLS
ALTER TABLE public.directors ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
CREATE POLICY "Allow authenticated users to view directors" ON public.directors
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert directors" ON public.directors
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update directors" ON public.directors
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete directors" ON public.directors
    FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Create indexes
CREATE INDEX idx_directors_client_id ON public.directors(client_id);
CREATE INDEX idx_directors_order ON public.directors(client_id, director_order);

-- Done! Now directors should work properly.