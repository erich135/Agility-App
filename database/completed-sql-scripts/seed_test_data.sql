-- ============================================
-- SEED TEST DATA FOR AGILITY APP
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- CLEANUP SCRIPT (Run this to remove ONLY the test data)
-- Copy and run this section separately when you want to delete test data
-- ============================================
/*
-- DELETE TEST DATA ONLY (keeps your existing records)
DELETE FROM time_entries WHERE id::text LIKE 'b000000%';
DELETE FROM projects WHERE id::text LIKE 'a000000%';
DELETE FROM clients WHERE id::text LIKE 'd000000%';
DELETE FROM consultants WHERE id::text LIKE 'c000000%';
*/
-- ============================================

-- ============================================
-- CONSULTANTS (Staff members)
-- ============================================
INSERT INTO consultants (id, user_id, full_name, email, phone, designation, hourly_rate, default_hourly_rate, is_active, can_approve_timesheets, role)
VALUES 
  ('c0000001-0000-0000-0000-000000000001', NULL, 'Erich Oberholzer', 'erich@lmwfinance.co.za', '+27 82 123 4567', 'Director', 850.00, 850.00, true, true, 'admin'),
  ('c0000002-0000-0000-0000-000000000002', NULL, 'Sarah van der Merwe', 'sarah@lmwfinance.co.za', '+27 83 234 5678', 'Senior Accountant', 650.00, 650.00, true, true, 'consultant'),
  ('c0000003-0000-0000-0000-000000000003', NULL, 'John Naidoo', 'john@lmwfinance.co.za', '+27 84 345 6789', 'Tax Consultant', 600.00, 600.00, true, false, 'consultant'),
  ('c0000004-0000-0000-0000-000000000004', NULL, 'Michelle Botha', 'michelle@lmwfinance.co.za', '+27 85 456 7890', 'Junior Accountant', 400.00, 400.00, true, false, 'consultant'),
  ('c0000005-0000-0000-0000-000000000005', NULL, 'Thabo Molefe', 'thabo@lmwfinance.co.za', '+27 86 567 8901', 'Bookkeeper', 350.00, 350.00, true, false, 'consultant')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CLIENTS (South African businesses)
-- ============================================
INSERT INTO clients (id, client_name, registration_number, registration_date, status, company_income_tax_number, vat_number, paye_number, email, phone_number, physical_address, contact_person_name, contact_person_email, contact_person_telephone, financial_year_end, notes)
VALUES
  -- Active Clients
  ('d0000001-0000-0000-0000-000000000001', 'Sunrise Logistics Pty Ltd', '2018/123456/07', '2018-03-15', 'Active', '9123456789', '4123456789', '7123456789', 'admin@sunriselogistics.co.za', '+27 11 123 4567', '123 Main Road, Sandton, 2196', 'Peter Mokoena', 'peter@sunriselogistics.co.za', '+27 82 111 2222', '2025-02-28', 'Large transport company, monthly bookkeeping'),
  ('d0000002-0000-0000-0000-000000000002', 'Green Gardens Landscaping CC', '2015/789012/23', '2015-07-22', 'Active', '9234567890', '4234567890', NULL, 'info@greengardens.co.za', '+27 21 234 5678', '45 Flora Street, Cape Town, 8001', 'Linda Jacobs', 'linda@greengardens.co.za', '+27 83 222 3333', '2025-02-28', 'Seasonal business, quarterly VAT'),
  ('d0000003-0000-0000-0000-000000000003', 'TechStart Solutions Pty Ltd', '2020/345678/07', '2020-01-10', 'Active', '9345678901', '4345678901', '7345678901', 'accounts@techstart.co.za', '+27 12 345 6789', '78 Innovation Hub, Pretoria, 0181', 'David Chen', 'david@techstart.co.za', '+27 84 333 4444', '2025-02-28', 'IT startup, R&D tax incentives applicable'),
  ('d0000004-0000-0000-0000-000000000004', 'Mama Joy Catering', '2019/567890/07', '2019-09-05', 'Active', '9456789012', NULL, '7456789012', 'joy@mamajoy.co.za', '+27 31 456 7890', '12 Kitchen Lane, Durban, 4001', 'Joy Dlamini', 'joy@mamajoy.co.za', '+27 85 444 5555', '2025-02-28', 'Below VAT threshold, PAYE monthly'),
  ('d0000005-0000-0000-0000-000000000005', 'Precision Engineering Works Pty Ltd', '2012/901234/07', '2012-04-18', 'Active', '9567890123', '4567890123', '7567890123', 'finance@precisioneng.co.za', '+27 11 567 8901', '234 Industrial Park, Boksburg, 1459', 'Andre Venter', 'andre@precisioneng.co.za', '+27 86 555 6666', '2025-06-30', 'Manufacturing, provisional tax, June year-end'),
  ('d0000006-0000-0000-0000-000000000006', 'Coastal Properties Trust', '2016/234567/07', '2016-11-30', 'Active', '9678901234', '4678901234', NULL, 'trust@coastalprops.co.za', '+27 21 678 9012', '567 Beach Road, Camps Bay, 8005', 'Helen Erasmus', 'helen@coastalprops.co.za', '+27 82 666 7777', '2025-02-28', 'Property trust, rental income'),
  ('d0000007-0000-0000-0000-000000000007', 'Bright Minds Academy NPC', '2017/345678/08', '2017-05-12', 'Active', '9789012345', NULL, '7789012345', 'admin@brightminds.org.za', '+27 11 789 0123', '89 Education Street, Roodepoort, 1724', 'Nomsa Sithole', 'nomsa@brightminds.org.za', '+27 83 777 8888', '2025-02-28', 'Non-profit school, exempt from income tax'),
  ('d0000008-0000-0000-0000-000000000008', 'Safari Tours & Travel Pty Ltd', '2014/456789/07', '2014-08-25', 'Active', '9890123456', '4890123456', '7890123456', 'bookings@safaritours.co.za', '+27 13 890 1234', '1 Kruger Gate, Nelspruit, 1200', 'Mike Thompson', 'mike@safaritours.co.za', '+27 84 888 9999', '2025-02-28', 'Tourism, foreign currency transactions'),
  ('d0000009-0000-0000-0000-000000000009', 'Urban Fitness Studio', '2021/567890/07', '2021-02-14', 'Active', '9901234567', NULL, '7901234567', 'hello@urbanfitness.co.za', '+27 11 901 2345', '45 Gym Complex, Sandton, 2196', 'Lisa van Wyk', 'lisa@urbanfitness.co.za', '+27 85 999 0000', '2025-02-28', 'New client, building up records'),
  ('d0000010-0000-0000-0000-000000000010', 'Heritage Wines Estate Pty Ltd', '2008/678901/07', '2008-06-01', 'Active', '9012345678', '4012345678', '7012345678', 'accounts@heritagewines.co.za', '+27 21 012 3456', '100 Wine Route, Stellenbosch, 7600', 'Jan du Plessis', 'jan@heritagewines.co.za', '+27 82 000 1111', '2025-02-28', 'Wine farm, export documentation required'),
  -- A few inactive clients
  ('d0000011-0000-0000-0000-000000000011', 'Old Town Bakery (Closed)', '2010/111222/07', '2010-03-10', 'Inactive', '9111222333', NULL, NULL, 'closed@oldtown.co.za', '+27 11 111 2222', '1 Bread Street, JHB, 2000', 'Former Owner', NULL, NULL, '2025-02-28', 'Business closed 2023'),
  ('d0000012-0000-0000-0000-000000000012', 'Quick Print Services', '2019/333444/07', '2019-07-15', 'Inactive', '9333444555', NULL, NULL, 'info@quickprint.co.za', '+27 11 333 4444', '5 Print Ave, JHB, 2000', 'Sam Print', NULL, NULL, '2025-02-28', 'Moved to different accountant')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PROJECTS (Mix of statuses)
-- ============================================
INSERT INTO projects (id, project_number, client_id, name, description, job_type_id, assigned_consultant_id, start_date, billing_date, status, total_hours, billable_hours, estimated_hours, priority, internal_notes)
VALUES
  -- Active projects
  ('a0000001-0000-0000-0000-000000000001', 'PRJ-2025-1001', 'd0000001-0000-0000-0000-000000000001', 'Monthly Bookkeeping - December 2025', 'Monthly bookkeeping and reconciliations', (SELECT id FROM job_types WHERE name = 'Bookkeeping' LIMIT 1), 'c0000004-0000-0000-0000-000000000004', '2025-12-01', '2026-01-07', 'active', 0, 0, 8, 'normal', NULL),
  ('a0000002-0000-0000-0000-000000000002', 'PRJ-2025-1002', 'd0000001-0000-0000-0000-000000000001', 'VAT Return - Nov 2025', 'VAT201 submission for November', (SELECT id FROM job_types WHERE name = 'VAT Return' LIMIT 1), 'c0000003-0000-0000-0000-000000000003', '2025-12-01', '2025-12-25', 'active', 0, 0, 3, 'high', 'Due 25th'),
  ('a0000003-0000-0000-0000-000000000003', 'PRJ-2025-1003', 'd0000002-0000-0000-0000-000000000002', 'Quarterly VAT - Q3 2025', 'VAT return for Jul-Sep quarter', (SELECT id FROM job_types WHERE name = 'VAT Return' LIMIT 1), 'c0000003-0000-0000-0000-000000000003', '2025-10-01', '2025-12-20', 'active', 2.5, 2.5, 4, 'normal', NULL),
  ('a0000004-0000-0000-0000-000000000004', 'PRJ-2025-1004', 'd0000003-0000-0000-0000-000000000003', 'Annual Financial Statements 2025', 'Full AFS preparation', (SELECT id FROM job_types WHERE name = 'Financial Statements' LIMIT 1), 'c0000002-0000-0000-0000-000000000002', '2025-11-15', '2026-02-28', 'active', 5, 5, 20, 'normal', 'First year AFS for this client'),
  ('a0000005-0000-0000-0000-000000000005', 'PRJ-2025-1005', 'd0000003-0000-0000-0000-000000000003', 'R&D Tax Incentive Application', 'Section 11D application', (SELECT id FROM job_types WHERE name = 'Tax Advisory' LIMIT 1), 'c0000001-0000-0000-0000-000000000001', '2025-12-01', '2026-03-31', 'active', 3, 3, 15, 'high', 'Complex - director involvement'),
  ('a0000006-0000-0000-0000-000000000006', 'PRJ-2025-1006', 'd0000004-0000-0000-0000-000000000004', 'PAYE Returns - Dec 2025', 'EMP201 and EMP501', (SELECT id FROM job_types WHERE name = 'Payroll' LIMIT 1), 'c0000005-0000-0000-0000-000000000005', '2025-12-01', '2026-01-07', 'active', 0, 0, 2, 'normal', NULL),
  ('a0000007-0000-0000-0000-000000000007', 'PRJ-2025-1007', 'd0000005-0000-0000-0000-000000000005', 'Provisional Tax - Dec 2025', 'IRP6 second period', (SELECT id FROM job_types WHERE name = 'Tax Return' LIMIT 1), 'c0000003-0000-0000-0000-000000000003', '2025-12-01', '2025-12-31', 'active', 1, 1, 4, 'high', 'Large payment expected'),
  
  -- Ready to bill projects
  ('a0000008-0000-0000-0000-000000000008', 'PRJ-2025-1008', 'd0000006-0000-0000-0000-000000000006', 'Trust Tax Return 2025', 'IT12TR for 2025 tax year', (SELECT id FROM job_types WHERE name = 'Tax Return' LIMIT 1), 'c0000002-0000-0000-0000-000000000002', '2025-10-01', '2025-12-15', 'ready_to_bill', 6.5, 6.5, 6, 'normal', 'Complete, awaiting billing'),
  ('a0000009-0000-0000-0000-000000000009', 'PRJ-2025-1009', 'd0000007-0000-0000-0000-000000000007', 'NPO Annual Return', 'Annual compliance filing', (SELECT id FROM job_types WHERE name = 'Secretarial Services' LIMIT 1), 'c0000004-0000-0000-0000-000000000004', '2025-11-01', '2025-12-10', 'ready_to_bill', 3, 3, 3, 'normal', 'Done, ready to invoice'),
  ('a0000010-0000-0000-0000-000000000010', 'PRJ-2025-1010', 'd0000008-0000-0000-0000-000000000008', 'Monthly Bookkeeping - November 2025', 'Monthly bookkeeping', (SELECT id FROM job_types WHERE name = 'Bookkeeping' LIMIT 1), 'c0000004-0000-0000-0000-000000000004', '2025-11-01', '2025-12-07', 'ready_to_bill', 10, 10, 10, 'normal', NULL),
  
  -- On hold
  ('a0000011-0000-0000-0000-000000000011', 'PRJ-2025-1011', 'd0000009-0000-0000-0000-000000000009', 'Business Registration Review', 'Review company structure', (SELECT id FROM job_types WHERE name = 'Tax Advisory' LIMIT 1), 'c0000001-0000-0000-0000-000000000001', '2025-11-15', '2026-01-31', 'on_hold', 1, 1, 5, 'low', 'Client requested pause - holiday'),
  
  -- Invoiced (completed)
  ('a0000012-0000-0000-0000-000000000012', 'PRJ-2025-1012', 'd0000010-0000-0000-0000-000000000010', 'Export Documentation - Oct 2025', 'Wine export certificates', (SELECT id FROM job_types WHERE name = 'Secretarial Services' LIMIT 1), 'c0000004-0000-0000-0000-000000000004', '2025-10-01', '2025-10-31', 'invoiced', 4, 4, 4, 'normal', NULL),
  ('a0000013-0000-0000-0000-000000000013', 'PRJ-2025-1013', 'd0000001-0000-0000-0000-000000000001', 'Monthly Bookkeeping - October 2025', 'Monthly bookkeeping', (SELECT id FROM job_types WHERE name = 'Bookkeeping' LIMIT 1), 'c0000004-0000-0000-0000-000000000004', '2025-10-01', '2025-11-07', 'invoiced', 8, 8, 8, 'normal', NULL),
  ('a0000014-0000-0000-0000-000000000014', 'PRJ-2025-1014', 'd0000001-0000-0000-0000-000000000001', 'Monthly Bookkeeping - November 2025', 'Monthly bookkeeping', (SELECT id FROM job_types WHERE name = 'Bookkeeping' LIMIT 1), 'c0000004-0000-0000-0000-000000000004', '2025-11-01', '2025-12-07', 'invoiced', 7.5, 7.5, 8, 'normal', NULL),
  ('a0000015-0000-0000-0000-000000000015', 'PRJ-2025-1015', 'd0000002-0000-0000-0000-000000000002', 'Annual Tax Return 2024', 'ITR14 for 2024 year', (SELECT id FROM job_types WHERE name = 'Tax Return' LIMIT 1), 'c0000003-0000-0000-0000-000000000003', '2025-08-01', '2025-11-15', 'invoiced', 5, 5, 5, 'normal', NULL),
  ('a0000016-0000-0000-0000-000000000016', 'PRJ-2025-1016', 'd0000005-0000-0000-0000-000000000005', 'Interim Audit Preparation', 'Support for interim audit', (SELECT id FROM job_types WHERE name = 'Accounting' LIMIT 1), 'c0000002-0000-0000-0000-000000000002', '2025-09-01', '2025-10-31', 'invoiced', 12, 12, 15, 'high', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TIME ENTRIES (Realistic work patterns)
-- ============================================
INSERT INTO time_entries (id, project_id, consultant_id, entry_date, start_time, end_time, duration_hours, entry_method, description, is_billable, hourly_rate, status)
VALUES
  -- Entries for active projects (recent)
  ('b0000001-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000003', 'c0000003-0000-0000-0000-000000000003', '2025-12-15', '2025-12-15 09:00:00', '2025-12-15 11:30:00', 2.5, 'timer', 'VAT reconciliation and return preparation', true, 600.00, 'draft'),
  ('b0000002-0000-0000-0000-000000000002', 'a0000004-0000-0000-0000-000000000004', 'c0000002-0000-0000-0000-000000000002', '2025-12-14', '2025-12-14 08:30:00', '2025-12-14 12:30:00', 4.0, 'timer', 'Trial balance review and adjustments', true, 650.00, 'draft'),
  ('b0000003-0000-0000-0000-000000000003', 'a0000004-0000-0000-0000-000000000004', 'c0000002-0000-0000-0000-000000000002', '2025-12-16', '2025-12-16 13:00:00', '2025-12-16 14:00:00', 1.0, 'manual', 'Client meeting - AFS discussion', true, 650.00, 'draft'),
  ('b0000004-0000-0000-0000-000000000004', 'a0000005-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000001', '2025-12-13', '2025-12-13 14:00:00', '2025-12-13 17:00:00', 3.0, 'timer', 'R&D documentation review', true, 850.00, 'draft'),
  ('b0000005-0000-0000-0000-000000000005', 'a0000007-0000-0000-0000-000000000007', 'c0000003-0000-0000-0000-000000000003', '2025-12-16', '2025-12-16 09:00:00', '2025-12-16 10:00:00', 1.0, 'manual', 'Provisional tax calculation', true, 600.00, 'draft'),
  
  -- Entries for ready_to_bill projects
  ('b0000006-0000-0000-0000-000000000006', 'a0000008-0000-0000-0000-000000000008', 'c0000002-0000-0000-0000-000000000002', '2025-12-01', '2025-12-01 08:00:00', '2025-12-01 12:00:00', 4.0, 'timer', 'Trust return preparation', true, 650.00, 'approved'),
  ('b0000007-0000-0000-0000-000000000007', 'a0000008-0000-0000-0000-000000000008', 'c0000002-0000-0000-0000-000000000002', '2025-12-02', '2025-12-02 09:00:00', '2025-12-02 11:30:00', 2.5, 'timer', 'Trust return review and submission', true, 650.00, 'approved'),
  ('b0000008-0000-0000-0000-000000000008', 'a0000009-0000-0000-0000-000000000009', 'c0000004-0000-0000-0000-000000000004', '2025-12-05', '2025-12-05 10:00:00', '2025-12-05 13:00:00', 3.0, 'timer', 'NPO compliance documents', true, 400.00, 'approved'),
  ('b0000009-0000-0000-0000-000000000009', 'a0000010-0000-0000-0000-000000000010', 'c0000004-0000-0000-0000-000000000004', '2025-12-03', '2025-12-03 08:00:00', '2025-12-03 13:00:00', 5.0, 'timer', 'Bank reconciliations', true, 400.00, 'approved'),
  ('b0000010-0000-0000-0000-000000000010', 'a0000010-0000-0000-0000-000000000010', 'c0000004-0000-0000-0000-000000000004', '2025-12-04', '2025-12-04 08:00:00', '2025-12-04 13:00:00', 5.0, 'timer', 'Creditors and debtors reconciliation', true, 400.00, 'approved'),
  
  -- Entries for on_hold project
  ('b0000011-0000-0000-0000-000000000011', 'a0000011-0000-0000-0000-000000000011', 'c0000001-0000-0000-0000-000000000001', '2025-11-20', '2025-11-20 14:00:00', '2025-11-20 15:00:00', 1.0, 'manual', 'Initial consultation', true, 850.00, 'approved'),
  
  -- Entries for invoiced projects
  ('b0000012-0000-0000-0000-000000000012', 'a0000012-0000-0000-0000-000000000012', 'c0000004-0000-0000-0000-000000000004', '2025-10-15', '2025-10-15 09:00:00', '2025-10-15 13:00:00', 4.0, 'timer', 'Export documentation preparation', true, 400.00, 'invoiced'),
  ('b0000013-0000-0000-0000-000000000013', 'a0000013-0000-0000-0000-000000000013', 'c0000004-0000-0000-0000-000000000004', '2025-10-10', '2025-10-10 08:00:00', '2025-10-10 16:00:00', 8.0, 'timer', 'Full month bookkeeping', true, 400.00, 'invoiced'),
  ('b0000014-0000-0000-0000-000000000014', 'a0000014-0000-0000-0000-000000000014', 'c0000004-0000-0000-0000-000000000004', '2025-11-12', '2025-11-12 08:00:00', '2025-11-12 15:30:00', 7.5, 'timer', 'November bookkeeping', true, 400.00, 'invoiced'),
  ('b0000015-0000-0000-0000-000000000015', 'a0000015-0000-0000-0000-000000000015', 'c0000003-0000-0000-0000-000000000003', '2025-10-20', '2025-10-20 09:00:00', '2025-10-20 14:00:00', 5.0, 'timer', 'Tax return preparation and submission', true, 600.00, 'invoiced'),
  ('b0000016-0000-0000-0000-000000000016', 'a0000016-0000-0000-0000-000000000016', 'c0000002-0000-0000-0000-000000000002', '2025-09-15', '2025-09-15 08:00:00', '2025-09-15 14:00:00', 6.0, 'timer', 'Interim audit file preparation', true, 650.00, 'invoiced'),
  ('b0000017-0000-0000-0000-000000000017', 'a0000016-0000-0000-0000-000000000016', 'c0000002-0000-0000-0000-000000000002', '2025-09-20', '2025-09-20 09:00:00', '2025-09-20 15:00:00', 6.0, 'timer', 'Audit query responses', true, 650.00, 'invoiced'),
  
  -- Some non-billable entries (internal)
  ('b0000018-0000-0000-0000-000000000018', 'a0000004-0000-0000-0000-000000000004', 'c0000002-0000-0000-0000-000000000002', '2025-12-10', '2025-12-10 08:00:00', '2025-12-10 09:00:00', 1.0, 'manual', 'Internal training on new client', false, 0, 'draft')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- UPDATE PROJECT TOTALS (Sync hours)
-- ============================================
UPDATE projects p
SET 
  total_hours = COALESCE((
    SELECT SUM(duration_hours) 
    FROM time_entries te 
    WHERE te.project_id = p.id
  ), 0),
  billable_hours = COALESCE((
    SELECT SUM(duration_hours) 
    FROM time_entries te 
    WHERE te.project_id = p.id AND te.is_billable = true
  ), 0);

-- ============================================
-- Set invoice details for invoiced projects
-- ============================================
UPDATE projects SET 
  invoice_number = 'INV-2025-001',
  invoice_date = '2025-11-05',
  invoice_amount = 1600.00
WHERE id = 'a0000012-0000-0000-0000-000000000012';

UPDATE projects SET 
  invoice_number = 'INV-2025-002',
  invoice_date = '2025-11-10',
  invoice_amount = 3200.00
WHERE id = 'a0000013-0000-0000-0000-000000000013';

UPDATE projects SET 
  invoice_number = 'INV-2025-003',
  invoice_date = '2025-12-10',
  invoice_amount = 3000.00
WHERE id = 'a0000014-0000-0000-0000-000000000014';

UPDATE projects SET 
  invoice_number = 'INV-2025-004',
  invoice_date = '2025-11-20',
  invoice_amount = 3000.00
WHERE id = 'a0000015-0000-0000-0000-000000000015';

UPDATE projects SET 
  invoice_number = 'INV-2025-005',
  invoice_date = '2025-11-01',
  invoice_amount = 7800.00
WHERE id = 'a0000016-0000-0000-0000-000000000016';

-- ============================================
-- VERIFY DATA
-- ============================================
SELECT 'Consultants' as table_name, COUNT(*) as count FROM consultants
UNION ALL
SELECT 'Clients', COUNT(*) FROM clients
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects
UNION ALL
SELECT 'Time Entries', COUNT(*) FROM time_entries
UNION ALL
SELECT 'Job Types', COUNT(*) FROM job_types;

-- Show project distribution by status
SELECT status, COUNT(*) as count 
FROM projects 
GROUP BY status 
ORDER BY count DESC;
