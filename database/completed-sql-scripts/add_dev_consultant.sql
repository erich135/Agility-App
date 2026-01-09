-- Add a default consultant for development/testing
-- Run this in Supabase SQL Editor

-- Insert a default consultant
INSERT INTO public.consultants (full_name, email, phone, designation, hourly_rate, is_active, role)
VALUES ('Dev User', 'dev@agility.com', '0123456789', 'Senior Accountant', 500.00, true, 'consultant')
ON CONFLICT (email) DO NOTHING;

-- Verify
SELECT id, full_name, email, is_active FROM consultants;
