-- ============================================================================
-- ADD CONSULTANT RECORD FOR EXISTING USER
-- ============================================================================
-- This script creates a consultant record for an existing user
-- Run this in your Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Add consultant record for user with email erich@lmwfinance.co.za
INSERT INTO public.consultants (
    user_id,
    full_name,
    email,
    phone,
    designation,
    hourly_rate,
    default_hourly_rate,
    is_active,
    can_approve_timesheets,
    role,
    created_at,
    updated_at
)
SELECT 
    u.id,
    u.full_name,
    u.email,
    COALESCE(u.phone, ''),
    'Consultant',
    850.00,
    850.00,
    true,
    CASE WHEN u.role = 'admin' THEN true ELSE false END,
    u.role,
    NOW(),
    NOW()
FROM public.users u
WHERE u.email = 'erich@lmwfinance.co.za'
AND NOT EXISTS (
    SELECT 1 FROM public.consultants c 
    WHERE c.user_id = u.id OR c.email = u.email
);

-- Verify the insert
DO $$
DECLARE
    v_consultant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_consultant_count 
    FROM public.consultants 
    WHERE email = 'erich@lmwfinance.co.za';
    
    IF v_consultant_count > 0 THEN
        RAISE NOTICE 'Successfully created consultant record for erich@lmwfinance.co.za';
    ELSE
        RAISE NOTICE 'No consultant record created - user may already have a consultant record or user does not exist';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ALTERNATIVE: Add consultant for ALL users with consultant/admin role
-- ============================================================================
-- Uncomment below if you want to create consultant records for all users
-- who have role 'consultant' or 'admin' but don't have consultant records yet
-- ============================================================================

/*
BEGIN;

INSERT INTO public.consultants (
    user_id,
    full_name,
    email,
    phone,
    designation,
    hourly_rate,
    default_hourly_rate,
    is_active,
    can_approve_timesheets,
    role,
    created_at,
    updated_at
)
SELECT 
    u.id,
    u.full_name,
    u.email,
    COALESCE(u.phone, ''),
    CASE 
        WHEN u.role = 'admin' THEN 'Senior Consultant'
        ELSE 'Consultant'
    END,
    850.00,
    850.00,
    u.is_active,
    CASE WHEN u.role = 'admin' THEN true ELSE false END,
    u.role,
    NOW(),
    NOW()
FROM public.users u
WHERE u.role IN ('consultant', 'admin')
AND NOT EXISTS (
    SELECT 1 FROM public.consultants c 
    WHERE c.user_id = u.id OR c.email = u.email
);

-- Verify the inserts
DO $$
DECLARE
    v_created_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_created_count 
    FROM public.consultants c
    INNER JOIN public.users u ON c.user_id = u.id
    WHERE c.created_at > NOW() - INTERVAL '1 minute';
    
    RAISE NOTICE 'Created % consultant record(s)', v_created_count;
END $$;

COMMIT;
*/
