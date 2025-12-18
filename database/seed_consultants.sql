-- ============================================
-- SEED DATA: CONSULTANTS
-- Run this in Supabase SQL Editor to add test consultants
-- ============================================

-- First, let's get the user IDs from the users table if they exist
-- Then insert consultants

-- Insert consultants with realistic South African accounting firm roles
INSERT INTO public.consultants (
    id,
    user_id,
    full_name,
    email,
    phone,
    designation,
    hourly_rate,
    default_hourly_rate,
    is_active,
    can_approve_timesheets,
    role
) VALUES
    -- Senior Partners / Directors
    (
        'c0000001-0000-0000-0000-000000000001',
        NULL,
        'Erich Oberholzer',
        'erich@lmwfinance.co.za',
        '+27 82 555 0001',
        'Chartered Accountant',
        950.00,
        950.00,
        true,
        true,
        'admin'
    ),
    (
        'c0000002-0000-0000-0000-000000000002',
        NULL,
        'Sarah van der Merwe',
        'sarah@lmwfinance.co.za',
        '+27 83 555 0002',
        'Chartered Accountant',
        900.00,
        900.00,
        true,
        true,
        'senior_consultant'
    ),
    
    -- Senior Consultants
    (
        'c0000003-0000-0000-0000-000000000003',
        NULL,
        'Johan Pretorius',
        'johan@lmwfinance.co.za',
        '+27 84 555 0003',
        'Accountant',
        650.00,
        650.00,
        true,
        true,
        'senior_consultant'
    ),
    (
        'c0000004-0000-0000-0000-000000000004',
        NULL,
        'Thandi Nkosi',
        'thandi@lmwfinance.co.za',
        '+27 76 555 0004',
        'Accountant',
        600.00,
        600.00,
        true,
        false,
        'consultant'
    ),
    
    -- Consultants
    (
        'c0000005-0000-0000-0000-000000000005',
        NULL,
        'Michael Botha',
        'michael@lmwfinance.co.za',
        '+27 72 555 0005',
        'Accountant',
        550.00,
        550.00,
        true,
        false,
        'consultant'
    ),
    (
        'c0000006-0000-0000-0000-000000000006',
        NULL,
        'Lerato Molefe',
        'lerato@lmwfinance.co.za',
        '+27 79 555 0006',
        'Accountant',
        500.00,
        500.00,
        true,
        false,
        'consultant'
    ),
    
    -- Trainee Accountants
    (
        'c0000007-0000-0000-0000-000000000007',
        NULL,
        'David Jacobs',
        'david@lmwfinance.co.za',
        '+27 81 555 0007',
        'Trainee Accountant',
        350.00,
        350.00,
        true,
        false,
        'consultant'
    ),
    (
        'c0000008-0000-0000-0000-000000000008',
        NULL,
        'Nomvula Dlamini',
        'nomvula@lmwfinance.co.za',
        '+27 60 555 0008',
        'Trainee Accountant',
        350.00,
        350.00,
        true,
        false,
        'consultant'
    ),
    
    -- Students / Interns
    (
        'c0000009-0000-0000-0000-000000000009',
        NULL,
        'Pieter du Plessis',
        'pieter@lmwfinance.co.za',
        '+27 71 555 0009',
        'Student',
        250.00,
        250.00,
        true,
        false,
        'consultant'
    ),
    (
        'c0000010-0000-0000-0000-000000000010',
        NULL,
        'Ayanda Zulu',
        'ayanda@lmwfinance.co.za',
        '+27 63 555 0010',
        'Student',
        250.00,
        250.00,
        true,
        false,
        'consultant'
    )
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    designation = EXCLUDED.designation,
    hourly_rate = EXCLUDED.hourly_rate,
    default_hourly_rate = EXCLUDED.default_hourly_rate,
    is_active = EXCLUDED.is_active,
    can_approve_timesheets = EXCLUDED.can_approve_timesheets,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Link Erich's consultant record to his auth user (if exists)
UPDATE public.consultants 
SET user_id = (SELECT id FROM auth.users WHERE email = 'erich@lmwfinance.co.za' LIMIT 1)
WHERE email = 'erich@lmwfinance.co.za'
AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'erich@lmwfinance.co.za');

-- ============================================
-- VERIFY: Check inserted consultants
-- ============================================
-- SELECT id, full_name, designation, hourly_rate, role, is_active 
-- FROM public.consultants 
-- ORDER BY role, full_name;

-- ============================================
-- Now update projects to assign consultants
-- ============================================
UPDATE public.projects 
SET assigned_consultant_id = 'c0000001-0000-0000-0000-000000000001'
WHERE assigned_consultant_id IS NULL
AND id IN (SELECT id FROM public.projects ORDER BY created_at LIMIT 5);

UPDATE public.projects 
SET assigned_consultant_id = 'c0000003-0000-0000-0000-000000000003'
WHERE assigned_consultant_id IS NULL
AND id IN (SELECT id FROM public.projects ORDER BY created_at OFFSET 5 LIMIT 5);

UPDATE public.projects 
SET assigned_consultant_id = 'c0000004-0000-0000-0000-000000000004'
WHERE assigned_consultant_id IS NULL
AND id IN (SELECT id FROM public.projects ORDER BY created_at OFFSET 10 LIMIT 5);

UPDATE public.projects 
SET assigned_consultant_id = 'c0000005-0000-0000-0000-000000000005'
WHERE assigned_consultant_id IS NULL;

-- ============================================
-- Disable RLS on consultants for development
-- ============================================
ALTER TABLE public.consultants DISABLE ROW LEVEL SECURITY;

-- Or create a permissive policy
DROP POLICY IF EXISTS "Allow all access to consultants" ON public.consultants;
CREATE POLICY "Allow all access to consultants" ON public.consultants
    FOR ALL
    USING (true)
    WITH CHECK (true);

SELECT 'Consultants seed data inserted successfully!' as status;
