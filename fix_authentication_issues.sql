-- Fix Authentication Issues - Complete Setup
-- Run this in your Supabase SQL Editor

-- 1. Drop existing tables if they have issues (comment out if you want to keep data)
-- DROP TABLE IF EXISTS public.user_otps CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Create users table with all required columns
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

-- 3. Create user_otps table for OTP management
CREATE TABLE IF NOT EXISTS public.user_otps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    otp_code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Disable RLS for simplified access (we handle security in app)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_otps DISABLE ROW LEVEL SECURITY;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_user_otps_user_id ON public.user_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_otps_code ON public.user_otps(otp_code);
CREATE INDEX IF NOT EXISTS idx_user_otps_expires ON public.user_otps(expires_at);

-- 6. Insert your admin user (UPDATE THIS WITH YOUR ACTUAL INFO)
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
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 7. Add a test user for development
INSERT INTO public.users (email, full_name, phone, role, is_active)
VALUES (
    'test@agility.co.za',
    'Test User',
    '+27123456789',
    'user',
    true
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 8. Create function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM public.user_otps 
    WHERE expires_at < NOW() OR used = true;
END;
$$ LANGUAGE plpgsql;

-- 9. Verify setup
SELECT 'Users Table' as table_name, count(*) as record_count FROM public.users
UNION ALL
SELECT 'User OTPs Table' as table_name, count(*) as record_count FROM public.user_otps;

-- 10. Show all users
SELECT id, email, full_name, phone, role, is_active, created_at 
FROM public.users 
ORDER BY created_at;