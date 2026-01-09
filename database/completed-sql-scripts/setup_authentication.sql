-- Authentication System Database Setup
-- Run these commands in your Supabase SQL Editor

-- 1. Create users table
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

-- 2. Create user_otps table for OTP management
CREATE TABLE IF NOT EXISTS public.user_otps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    otp_code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_otps ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for users table
-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Allow admins to view all users (will need to be adjusted based on your auth setup)
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Allow admins to insert new users
CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Allow admins to update users
CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- 5. Create RLS policies for user_otps table
-- Allow reading OTPs for verification (public access for login)
CREATE POLICY "Allow OTP verification" ON public.user_otps
    FOR SELECT USING (true);

-- Allow inserting OTPs (public access for login)
CREATE POLICY "Allow OTP creation" ON public.user_otps
    FOR INSERT WITH CHECK (true);

-- Allow updating OTPs (to mark as used)
CREATE POLICY "Allow OTP updates" ON public.user_otps
    FOR UPDATE USING (true);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_user_otps_user_id ON public.user_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_otps_code ON public.user_otps(otp_code);
CREATE INDEX IF NOT EXISTS idx_user_otps_expires ON public.user_otps(expires_at);

-- 7. Insert initial admin user (update with your details)
INSERT INTO public.users (email, full_name, phone, role, is_active)
VALUES (
    'erich@lmwfinance.co.za',  -- Your email
    'Erich - System Administrator',
    '+27836504028',       -- Your phone number
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

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

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Setup complete!
-- Don't forget to update the admin user details with your actual email and phone number!