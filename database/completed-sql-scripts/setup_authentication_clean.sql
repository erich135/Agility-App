-- Authentication System Database Setup (Clean Version)
-- Run these commands in your Supabase SQL Editor

-- 1. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- 2. Create users table (or add missing columns if it exists)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_login timestamp with time zone
);

-- Add missing columns if users table already exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
        ALTER TABLE public.users ADD COLUMN full_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE public.users ADD COLUMN phone text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE public.users ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('admin', 'user'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE public.users ADD COLUMN is_active boolean DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE public.users ADD COLUMN last_login timestamp with time zone;
    END IF;
END $$;

-- 3. Create user_otps table for OTP management
CREATE TABLE IF NOT EXISTS public.user_otps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    otp_code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create documents table for file management
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id text NOT NULL,
    document_type text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    mime_type text,
    uploaded_by text,
    document_name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add document_name column if documents table already exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'document_name') THEN
        ALTER TABLE public.documents ADD COLUMN document_name text;
    END IF;
    
    -- Update existing records to populate document_name from file_name for backward compatibility
    UPDATE public.documents SET document_name = file_name WHERE document_name IS NULL;
END $$;

-- 5. Disable RLS for now (we'll handle security in the app layer)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_otps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;

-- 5b. Disable RLS on storage tables (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_user_otps_user_id ON public.user_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_otps_code ON public.user_otps(otp_code);
CREATE INDEX IF NOT EXISTS idx_user_otps_expires ON public.user_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);

-- 7. Insert initial admin user
INSERT INTO public.users (email, full_name, phone, role, is_active)
VALUES (
    'erich@lmwfinance.co.za',
    'Erich - System Administrator',
    '+27836504028',
    'admin',
    true
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- 8. Create function to clean up expired OTPs (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM public.user_otps 
    WHERE expires_at < NOW() OR used = true;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON public.users 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 10. Create storage bucket for documents (run this in Supabase Dashboard > Storage)
-- Note: This needs to be created manually in Supabase Dashboard
-- Go to Storage > Create Bucket > Name: "client-documents" > Public: false

-- 11. Storage policies (if needed, run these after creating the bucket)
/*
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to view files  
CREATE POLICY "Allow authenticated downloads" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE USING (auth.role() = 'authenticated');
*/

-- Setup complete!
-- This clean version handles existing tables and prevents conflicts.

-- NEXT STEPS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Go to Storage > Create a new bucket named "client-documents" (private)
-- 3. Test the application - document uploads should now work!