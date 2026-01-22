-- ============================================================================
-- AGILITY APP - REMOVE DEMO SEED DATA
-- ============================================================================
-- This script removes all demo/seed data while preserving existing customer data
-- Created: January 8, 2026
-- WARNING: This will delete all demo data. Run with caution!
-- ============================================================================

BEGIN;

-- ============================================================================
-- SAFETY CHECK
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Starting removal of demo seed data...';
  RAISE NOTICE 'This will remove all data created by seed_data.sql';
  RAISE NOTICE 'Existing client data will be preserved';
END $$;

-- ============================================================================
-- 1. DELETE ACTIVITY LOGS (Demo entries only)
-- ============================================================================

DELETE FROM public.activity_logs
WHERE user_id IN (
  '660e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440003',
  '660e8400-e29b-41d4-a716-446655440004',
  '660e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted activity logs'; END $$;

-- ============================================================================
-- 2. DELETE USER PERMISSIONS (Demo users only)
-- ============================================================================

DELETE FROM public.user_permissions
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted user permissions'; END $$;

-- ============================================================================
-- 3. DELETE PERMISSIONS (Demo permissions only)
-- ============================================================================

DELETE FROM public.permissions
WHERE key IN (
  'clients.view',
  'clients.create',
  'clients.edit',
  'clients.delete',
  'timesheets.view',
  'timesheets.create',
  'timesheets.approve',
  'documents.view',
  'documents.upload',
  'reports.view',
  'reports.export'
);

DO $$ BEGIN RAISE NOTICE 'Deleted permissions'; END $$;

-- ============================================================================
-- 4. DELETE NOTIFICATIONS (Demo notifications only)
-- ============================================================================

DELETE FROM public.notifications
WHERE recipient_type = 'consultant' 
AND recipient_id IN (
  '660e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440003',
  '660e8400-e29b-41d4-a716-446655440004',
  '660e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted notifications'; END $$;

-- ============================================================================
-- 5. DELETE DOCUMENTS (Demo documents only - by uploaded_by)
-- ============================================================================

DELETE FROM public.documents
WHERE uploaded_by IN ('John Smith', 'Sarah Jones', 'Mike Brown', 'Lisa Wilson', 'David Taylor');

DO $$ BEGIN RAISE NOTICE 'Deleted documents'; END $$;

-- ============================================================================
-- 6. DELETE DOCUMENT DEADLINES (Demo deadlines - by created_by)
-- ============================================================================

DELETE FROM public.document_deadlines
WHERE created_by IN (
  '660e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440003',
  '660e8400-e29b-41d4-a716-446655440004',
  '660e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted document deadlines'; END $$;

-- ============================================================================
-- 7. DELETE FILING HISTORY (Demo records - created recently)
-- ============================================================================

-- Delete filing history created in the last hour (i.e., by the seed script)
DELETE FROM public.filing_history
WHERE created_at > NOW() - INTERVAL '1 hour';

DO $$ BEGIN RAISE NOTICE 'Deleted filing history'; END $$;

-- ============================================================================
-- 8. DELETE EVENT ATTENDEES
-- ============================================================================

DELETE FROM public.event_attendees
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted event attendees'; END $$;

-- ============================================================================
-- 9. DELETE CALENDAR EVENTS
-- ============================================================================

DELETE FROM public.calendar_events
WHERE created_by IN (
  '660e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440003',
  '660e8400-e29b-41d4-a716-446655440004',
  '660e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted calendar events'; END $$;

-- ============================================================================
-- 10. DELETE TASK ASSIGNMENTS
-- ============================================================================

DELETE FROM public.task_assignments
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted task assignments'; END $$;

-- ============================================================================
-- 11. DELETE TASKS
-- ============================================================================

DELETE FROM public.tasks
WHERE created_by IN (
  '660e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440003',
  '660e8400-e29b-41d4-a716-446655440004',
  '660e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted tasks'; END $$;

-- ============================================================================
-- 12. DELETE FINANCIAL STATEMENTS
-- ============================================================================

-- Delete financial statements created in the last hour
DELETE FROM public.financial_statements
WHERE created_at > NOW() - INTERVAL '1 hour';

DO $$ BEGIN RAISE NOTICE 'Deleted financial statements'; END $$;

-- ============================================================================
-- 13. DELETE TRIAL BALANCE ENTRIES
-- ============================================================================

-- Delete entries for trial balances created in the last hour
DELETE FROM public.trial_balance_entries
WHERE trial_balance_id IN (
  SELECT id FROM public.trial_balances
  WHERE created_at > NOW() - INTERVAL '1 hour'
);

DO $$ BEGIN RAISE NOTICE 'Deleted trial balance entries'; END $$;

-- ============================================================================
-- 14. DELETE TRIAL BALANCES
-- ============================================================================

DELETE FROM public.trial_balances
WHERE created_at > NOW() - INTERVAL '1 hour';

DO $$ BEGIN RAISE NOTICE 'Deleted trial balances'; END $$;

-- ============================================================================
-- 15. DELETE ACCOUNT MAPPINGS
-- ============================================================================

-- Delete account mappings created in the last hour
DELETE FROM public.account_mappings
WHERE created_at > NOW() - INTERVAL '1 hour';

DO $$ BEGIN RAISE NOTICE 'Deleted account mappings'; END $$;

-- ============================================================================
-- 16. DELETE CHART OF ACCOUNTS
-- ============================================================================

-- Delete chart of accounts created in the last hour
DELETE FROM public.chart_of_accounts
WHERE created_at > NOW() - INTERVAL '1 hour';

DO $$ BEGIN RAISE NOTICE 'Deleted chart of accounts'; END $$;

-- ============================================================================
-- 17. DELETE ALL TIME ENTRIES
-- ============================================================================

-- Delete all time entries (user will create new ones)
TRUNCATE TABLE public.time_entries CASCADE;

DO $$ BEGIN RAISE NOTICE 'Deleted all time entries'; END $$;

-- ============================================================================
-- 18. DELETE ALL PROJECTS
-- ============================================================================

-- Delete all projects (user will create new ones)
TRUNCATE TABLE public.projects CASCADE;

DO $$ BEGIN RAISE NOTICE 'Deleted all projects'; END $$;

-- ============================================================================
-- 19. DELETE ALL BILLING DATA
-- ============================================================================

-- Delete all billing reminders (user will create new ones)
TRUNCATE TABLE public.billing_reminders CASCADE;

DO $$ BEGIN RAISE NOTICE 'Deleted all billing data'; END $$;

-- ============================================================================
-- 20. DELETE TIMESHEET NOTIFICATIONS
-- ============================================================================

DELETE FROM public.timesheet_notifications
WHERE recipient_id IN (
  '660e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440003',
  '660e8400-e29b-41d4-a716-446655440004',
  '660e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted timesheet notifications'; END $$;

-- ============================================================================
-- 21. DELETE CONSULTANT CLIENT RATES
-- ============================================================================

DELETE FROM public.consultant_client_rates
WHERE consultant_id IN (
  '660e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440003',
  '660e8400-e29b-41d4-a716-446655440004',
  '660e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted consultant client rates'; END $$;

-- ============================================================================
-- 22. DELETE DIRECTORS (Demo directors only - created recently)
-- ============================================================================

-- Delete directors created in the last hour
DELETE FROM public.directors
WHERE created_at > NOW() - INTERVAL '1 hour';

DO $$ BEGIN RAISE NOTICE 'Deleted directors'; END $$;

-- ============================================================================
-- 23. DELETE JOB TYPES
-- ============================================================================

DELETE FROM public.job_types
WHERE name IN (
  'Annual Financial Statements',
  'Tax Return Preparation',
  'VAT Returns',
  'Payroll Processing',
  'Bookkeeping',
  'CIPC Filing',
  'Tax Planning',
  'Consultation',
  'Internal Meeting',
  'Client Review'
);

DO $$ BEGIN RAISE NOTICE 'Deleted job types'; END $$;

-- ============================================================================
-- 24. DELETE CONSULTANTS
-- ============================================================================

-- Delete demo consultants by their specific IDs
DELETE FROM public.consultants
WHERE id IN (
  '660e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440003',
  '660e8400-e29b-41d4-a716-446655440004',
  '660e8400-e29b-41d4-a716-446655440005'
);

-- Also delete consultants created in the last hour (from recent seed runs)
-- This catches consultants that may have been created with different IDs
DELETE FROM public.consultants
WHERE created_at > NOW() - INTERVAL '1 hour'
AND id NOT IN (
  SELECT id FROM public.consultants
  WHERE email LIKE '%@lmwfinance.co.za' -- Preserve actual company consultants
);

DO $$ BEGIN RAISE NOTICE 'Deleted consultants'; END $$;

-- ============================================================================
-- 25. DELETE MESSAGES (if any between demo users)
-- ============================================================================

DELETE FROM public.messages
WHERE sender_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
)
OR receiver_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted messages'; END $$;

-- ============================================================================
-- 26. DELETE NOTIFICATION PREFERENCES (Demo users only)
-- ============================================================================

DELETE FROM public.notification_preferences
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted notification preferences'; END $$;

-- ============================================================================
-- 27. DELETE USER OTPS (Demo users only)
-- ============================================================================

DELETE FROM public.user_otps
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

DO $$ BEGIN RAISE NOTICE 'Deleted user OTPs'; END $$;

-- ============================================================================
-- 28. DELETE USERS (Demo users only)
-- ============================================================================

DELETE FROM public.users
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
)
OR email = 'dev@test.com';

DO $$ BEGIN RAISE NOTICE 'Deleted users'; END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_client_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_client_count FROM public.clients;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Demo seed data removal complete!';
  RAISE NOTICE 'Existing client count: %', v_client_count;
  RAISE NOTICE '============================================';
END $$;

COMMIT;

-- ============================================================================
-- CLEANUP COMPLETE
-- ============================================================================
-- All demo/seed data has been removed.
-- Existing client data has been preserved.
-- You can now re-run seed_data.sql if needed.
-- ============================================================================
