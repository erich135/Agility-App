-- ============================================
-- CREATE DEV CONSULTANT
-- Run this to create a test consultant for development
-- ============================================

-- Insert a dev consultant that matches our mock user
INSERT INTO public.consultants (
    id,
    full_name,
    email,
    designation,
    hourly_rate,
    default_hourly_rate,
    is_active,
    can_approve_timesheets,
    role
) VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,  -- Fixed UUID for dev
    'Development User',
    'dev@agility.co.za',
    'Accountant',
    500.00,
    500.00,
    true,
    true,
    'admin'
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    is_active = true;

-- Verify the consultant was created
SELECT id, full_name, email, role FROM public.consultants WHERE email = 'dev@agility.co.za';

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DEV CONSULTANT CREATED';
    RAISE NOTICE 'ID: a0000000-0000-0000-0000-000000000001';
    RAISE NOTICE 'Email: dev@agility.co.za';
    RAISE NOTICE '============================================';
END $$;
