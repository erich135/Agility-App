-- ============================================================================
-- AGILITY APP - DEMO SEED DATA
-- ============================================================================
-- This script populates the database with realistic demo data for customer presentations
-- Created: January 8, 2026
-- IMPORTANT: This uses existing customers - do NOT seed new customers
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CONSULTANTS & USERS
-- ============================================================================

-- Insert demo users
INSERT INTO public.users (id, email, full_name, first_name, last_name, phone, role, is_active, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'john.smith@agility.co.za', 'John Smith', 'John', 'Smith', '+27821234567', 'admin', true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'sarah.jones@agility.co.za', 'Sarah Jones', 'Sarah', 'Jones', '+27821234568', 'consultant', true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'mike.brown@agility.co.za', 'Mike Brown', 'Mike', 'Brown', '+27821234569', 'consultant', true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'lisa.wilson@agility.co.za', 'Lisa Wilson', 'Lisa', 'Wilson', '+27821234570', 'consultant', true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440005'::uuid, 'david.taylor@agility.co.za', 'David Taylor', 'David', 'Taylor', '+27821234571', 'admin', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert consultants
INSERT INTO public.consultants (id, user_id, full_name, email, phone, designation, hourly_rate, is_active, can_approve_timesheets, role, created_at, updated_at)
VALUES 
  ('660e8400-e29b-41d4-a716-446655440001'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'John Smith', 'john.smith@agility.co.za', '+27821234567', 'Senior Accountant', 1500.00, true, true, 'admin', NOW(), NOW()),
  ('660e8400-e29b-41d4-a716-446655440002'::uuid, '550e8400-e29b-41d4-a716-446655440002'::uuid, 'Sarah Jones', 'sarah.jones@agility.co.za', '+27821234568', 'Tax Specialist', 1200.00, true, true, 'consultant', NOW(), NOW()),
  ('660e8400-e29b-41d4-a716-446655440003'::uuid, '550e8400-e29b-41d4-a716-446655440003'::uuid, 'Mike Brown', 'mike.brown@agility.co.za', '+27821234569', 'Accountant', 950.00, true, false, 'consultant', NOW(), NOW()),
  ('660e8400-e29b-41d4-a716-446655440004'::uuid, '550e8400-e29b-41d4-a716-446655440004'::uuid, 'Lisa Wilson', 'lisa.wilson@agility.co.za', '+27821234570', 'Junior Accountant', 750.00, true, false, 'consultant', NOW(), NOW()),
  ('660e8400-e29b-41d4-a716-446655440005'::uuid, '550e8400-e29b-41d4-a716-446655440005'::uuid, 'David Taylor', 'david.taylor@agility.co.za', '+27821234571', 'Practice Manager', 1800.00, true, true, 'admin', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. JOB TYPES
-- ============================================================================

-- Upsert job types by unique name and capture their IDs for later use
CREATE TEMP TABLE temp_job_types AS
WITH upserted AS (
  INSERT INTO public.job_types (name, description, category, default_rate_multiplier, is_billable, is_active, sort_order, created_at)
  VALUES 
    ('Annual Financial Statements', 'Preparation of annual financial statements', 'Accounting', 1.00, true, true, 1, NOW()),
    ('Tax Return Preparation', 'Corporate income tax return preparation', 'Tax', 1.00, true, true, 2, NOW()),
    ('VAT Returns', 'VAT return preparation and submission', 'Tax', 0.80, true, true, 3, NOW()),
    ('Payroll Processing', 'Monthly payroll processing and submissions', 'Payroll', 0.90, true, true, 4, NOW()),
    ('Bookkeeping', 'General bookkeeping services', 'Accounting', 0.75, true, true, 5, NOW()),
    ('CIPC Filing', 'CIPC annual return filing', 'Compliance', 0.85, true, true, 6, NOW()),
    ('Tax Planning', 'Tax planning and advisory', 'Tax', 1.20, true, true, 7, NOW()),
    ('Consultation', 'General business consultation', 'Advisory', 1.10, true, true, 8, NOW()),
    ('Internal Meeting', 'Internal team meetings and training', 'Admin', 0.00, false, true, 9, NOW()),
    ('Client Review', 'Client file review and quality control', 'Quality', 1.00, true, true, 10, NOW())
  ON CONFLICT (name) DO UPDATE
    SET description = EXCLUDED.description,
        category = EXCLUDED.category,
        default_rate_multiplier = EXCLUDED.default_rate_multiplier,
        is_billable = EXCLUDED.is_billable,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order
  RETURNING id, name
)
SELECT id, name FROM upserted;

-- ============================================================================
-- 3. GET FIRST TWO EXISTING CLIENT IDS (we'll use these for demo data)
-- ============================================================================

-- Store client IDs in temp table for reference
CREATE TEMP TABLE temp_demo_clients AS
SELECT id, client_name, created_at
FROM public.clients 
WHERE status = 'Active'
ORDER BY created_at 
LIMIT 3;

-- Verify we have clients
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM temp_demo_clients) < 2 THEN
    RAISE EXCEPTION 'Not enough existing clients found. Please ensure there are at least 2 active clients in the database.';
  END IF;
END $$;

-- ============================================================================
-- 4. DIRECTORS (for existing clients)
-- ============================================================================

-- Get first client ID
DO $$
DECLARE
  v_client_1 uuid;
  v_client_2 uuid;
  v_client_3 uuid;
BEGIN
  SELECT id INTO v_client_1 FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  SELECT id INTO v_client_2 FROM temp_demo_clients ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO v_client_3 FROM temp_demo_clients ORDER BY created_at OFFSET 2 LIMIT 1;
  
  -- Directors for Client 1
  INSERT INTO public.directors (client_id, director_order, director_name, id_number, contact_telephone, contact_email, created_at, updated_at)
  VALUES 
    (v_client_1, 1, 'Robert Anderson', '7805125678089', '+27823456789', 'robert.anderson@email.com', NOW(), NOW()),
    (v_client_1, 2, 'Patricia Wilson', '8209156789012', '+27823456790', 'patricia.wilson@email.com', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  -- Directors for Client 2
  IF v_client_2 IS NOT NULL THEN
    INSERT INTO public.directors (client_id, director_order, director_name, id_number, contact_telephone, contact_email, created_at, updated_at)
    VALUES 
      (v_client_2, 1, 'Michael Thompson', '7512085432109', '+27823456791', 'michael.thompson@email.com', NOW(), NOW()),
      (v_client_2, 2, 'Jennifer Davis', '8307124567890', '+27823456792', 'jennifer.davis@email.com', NOW(), NOW()),
      (v_client_2, 3, 'Christopher Moore', '7908176543210', '+27823456793', 'christopher.moore@email.com', NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Directors for Client 3
  IF v_client_3 IS NOT NULL THEN
    INSERT INTO public.directors (client_id, director_order, director_name, id_number, contact_telephone, contact_email, created_at, updated_at)
    VALUES 
      (v_client_3, 1, 'Elizabeth Martin', '8106097654321', '+27823456794', 'elizabeth.martin@email.com', NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- 5. CONSULTANT CLIENT RATES
-- ============================================================================

-- Assign consultants to clients with custom rates
DO $$
DECLARE
  v_client_1 uuid;
  v_client_2 uuid;
BEGIN
  SELECT id INTO v_client_1 FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  SELECT id INTO v_client_2 FROM temp_demo_clients ORDER BY created_at OFFSET 1 LIMIT 1;
  
  INSERT INTO public.consultant_client_rates (consultant_id, client_id, hourly_rate, effective_from, notes, created_at)
  VALUES 
    -- John Smith rates
    ('660e8400-e29b-41d4-a716-446655440001'::uuid, v_client_1, 1500.00, '2024-01-01', 'Standard senior accountant rate', NOW()),
    ('660e8400-e29b-41d4-a716-446655440001'::uuid, v_client_2, 1600.00, '2024-01-01', 'Premium rate for complex client', NOW()),
    -- Sarah Jones rates
    ('660e8400-e29b-41d4-a716-446655440002'::uuid, v_client_1, 1200.00, '2024-01-01', 'Tax specialist rate', NOW()),
    ('660e8400-e29b-41d4-a716-446655440002'::uuid, v_client_2, 1250.00, '2024-01-01', 'Tax specialist rate', NOW()),
    -- Mike Brown rates
    ('660e8400-e29b-41d4-a716-446655440003'::uuid, v_client_1, 950.00, '2024-01-01', 'Standard accountant rate', NOW()),
    -- Lisa Wilson rates
    ('660e8400-e29b-41d4-a716-446655440004'::uuid, v_client_1, 750.00, '2024-06-01', 'Junior accountant rate', NOW())
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 6. PROJECTS
-- ============================================================================

-- Create demo projects for clients
DO $$
DECLARE
  v_client_1 uuid;
  v_client_2 uuid;
  v_client_3 uuid;
  v_project_1 uuid;
  v_project_2 uuid;
  v_project_3 uuid;
  v_project_4 uuid;
  v_project_5 uuid;
BEGIN
  SELECT id INTO v_client_1 FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  SELECT id INTO v_client_2 FROM temp_demo_clients ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO v_client_3 FROM temp_demo_clients ORDER BY created_at OFFSET 2 LIMIT 1;
  
  v_project_1 := '770e8400-e29b-41d4-a716-446655440001'::uuid;
  v_project_2 := '770e8400-e29b-41d4-a716-446655440002'::uuid;
  v_project_3 := '770e8400-e29b-41d4-a716-446655440003'::uuid;
  v_project_4 := '770e8400-e29b-41d4-a716-446655440004'::uuid;
  v_project_5 := '770e8400-e29b-41d4-a716-446655440005'::uuid;
  
  INSERT INTO public.projects (id, client_id, name, description, job_type_id, assigned_consultant_id, status, start_date, expected_end_date, created_at, updated_at)
  VALUES 
    (v_project_1, v_client_1, '2024 Year-End Financial Statements', 'Preparation of annual financial statements for year ending Feb 2024', (SELECT id FROM temp_job_types WHERE name = 'Annual Financial Statements'), '660e8400-e29b-41d4-a716-446655440001'::uuid, 'active', '2025-11-01', '2026-01-31', NOW(), NOW()),
    (v_project_2, v_client_1, 'Monthly Bookkeeping Services', 'Ongoing monthly bookkeeping and reconciliation services', (SELECT id FROM temp_job_types WHERE name = 'Bookkeeping'), '660e8400-e29b-41d4-a716-446655440003'::uuid, 'active', '2025-11-01', NULL, NOW(), NOW()),
    (v_project_3, v_client_2, '2024 Annual Financial Statements', 'Complete AFS package for year ending Dec 2024', (SELECT id FROM temp_job_types WHERE name = 'Annual Financial Statements'), '660e8400-e29b-41d4-a716-446655440001'::uuid, 'active', '2025-11-01', '2026-02-28', NOW(), NOW()),
    (v_project_4, v_client_2, 'Tax Services 2024/2025', 'Tax planning and return preparation', (SELECT id FROM temp_job_types WHERE name = 'Tax Planning'), '660e8400-e29b-41d4-a716-446655440002'::uuid, 'active', '2025-11-01', '2026-03-31', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  -- Project for client 3 if exists
  IF v_client_3 IS NOT NULL THEN
    INSERT INTO public.projects (id, client_id, name, description, job_type_id, assigned_consultant_id, status, start_date, expected_end_date, completed_date, created_at, updated_at)
    VALUES 
      (v_project_5, v_client_3, '2024 Compliance Services', 'Tax returns and statutory filings', (SELECT id FROM temp_job_types WHERE name = 'Tax Return Preparation'), '660e8400-e29b-41d4-a716-446655440001'::uuid, 'invoiced', '2025-10-01', '2025-10-31', '2025-10-31', NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- 7. TIME ENTRIES
-- ============================================================================

-- Create realistic time entries for the last 3 months
DO $$
DECLARE
  v_project_1 uuid := '770e8400-e29b-41d4-a716-446655440001'::uuid;
  v_project_2 uuid := '770e8400-e29b-41d4-a716-446655440002'::uuid;
  v_project_3 uuid := '770e8400-e29b-41d4-a716-446655440003'::uuid;
  v_project_4 uuid := '770e8400-e29b-41d4-a716-446655440004'::uuid;
  v_project_5 uuid := '770e8400-e29b-41d4-a716-446655440005'::uuid;
BEGIN
  INSERT INTO public.time_entries (project_id, consultant_id, entry_date, duration_hours, description, hourly_rate, is_billable, status, created_at, updated_at)
  VALUES 
    -- November 2025
    (v_project_1, '660e8400-e29b-41d4-a716-446655440001'::uuid, '2025-11-05', 4.50, 'Review of financial statements for year end', 1500.00, true, 'approved', NOW(), NOW()),
    (v_project_2, '660e8400-e29b-41d4-a716-446655440003'::uuid, '2025-11-06', 6.00, 'Bookkeeping - processing November transactions', 950.00, true, 'approved', NOW(), NOW()),
    (v_project_1, '660e8400-e29b-41d4-a716-446655440002'::uuid, '2025-11-12', 3.50, 'VAT return preparation and review', 1200.00, true, 'approved', NOW(), NOW()),
    (v_project_3, '660e8400-e29b-41d4-a716-446655440001'::uuid, '2025-11-08', 5.00, 'Annual financial statements preparation', 1600.00, true, 'approved', NOW(), NOW()),
    (v_project_4, '660e8400-e29b-41d4-a716-446655440002'::uuid, '2025-11-15', 4.00, 'Tax planning consultation', 1250.00, true, 'approved', NOW(), NOW()),
    
    -- December 2025
    (v_project_1, '660e8400-e29b-41d4-a716-446655440001'::uuid, '2025-12-03', 5.50, 'Year-end adjustments and review', 1500.00, true, 'approved', NOW(), NOW()),
    (v_project_2, '660e8400-e29b-41d4-a716-446655440004'::uuid, '2025-12-04', 7.00, 'Monthly bookkeeping and reconciliations', 750.00, true, 'approved', NOW(), NOW()),
    (v_project_1, '660e8400-e29b-41d4-a716-446655440002'::uuid, '2025-12-10', 2.50, 'Payroll processing December', 1200.00, true, 'approved', NOW(), NOW()),
    (v_project_3, '660e8400-e29b-41d4-a716-446655440001'::uuid, '2025-12-05', 6.00, 'Financial statements finalization', 1600.00, true, 'approved', NOW(), NOW()),
    (v_project_2, '660e8400-e29b-41d4-a716-446655440003'::uuid, '2025-12-12', 4.50, 'Bookkeeping and general ledger review', 950.00, true, 'approved', NOW(), NOW()),
    (v_project_4, '660e8400-e29b-41d4-a716-446655440002'::uuid, '2025-12-18', 5.50, 'Income tax return preparation', 1250.00, true, 'approved', NOW(), NOW()),
    
    -- January 2026
    (v_project_1, '660e8400-e29b-41d4-a716-446655440001'::uuid, '2026-01-02', 3.00, 'Client consultation - new year planning', 1500.00, true, 'pending', NOW(), NOW()),
    (v_project_2, '660e8400-e29b-41d4-a716-446655440003'::uuid, '2026-01-03', 5.50, 'January bookkeeping and bank reconciliations', 950.00, true, 'pending', NOW(), NOW()),
    (v_project_2, '660e8400-e29b-41d4-a716-446655440004'::uuid, '2026-01-06', 4.00, 'Accounts payable and receivable processing', 750.00, true, 'pending', NOW(), NOW()),
    (v_project_3, '660e8400-e29b-41d4-a716-446655440001'::uuid, '2026-01-07', 4.50, 'CIPC annual return preparation', 1600.00, true, 'pending', NOW(), NOW()),
    (v_project_4, '660e8400-e29b-41d4-a716-446655440002'::uuid, '2026-01-08', 3.50, 'VAT201 preparation and filing', 1250.00, true, 'pending', NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- Add some invoiced time entries from previous months (if project 5 exists)
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = v_project_5) THEN
    INSERT INTO public.time_entries (project_id, consultant_id, entry_date, duration_hours, description, hourly_rate, is_billable, status, created_at, updated_at)
    VALUES 
      (v_project_5, '660e8400-e29b-41d4-a716-446655440001'::uuid, '2025-10-15', 8.00, 'Annual financial statements - October', 1500.00, true, 'approved', NOW(), NOW()),
      (v_project_5, '660e8400-e29b-41d4-a716-446655440002'::uuid, '2025-10-20', 5.00, 'Tax return preparation', 1200.00, true, 'approved', NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- 8. CHART OF ACCOUNTS
-- ============================================================================

DO $$
DECLARE
  v_client_1 uuid;
  v_coa_assets uuid;
  v_coa_liabilities uuid;
  v_coa_equity uuid;
  v_coa_income uuid;
  v_coa_expenses uuid;
BEGIN
  SELECT id INTO v_client_1 FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  
  -- Main account categories
  v_coa_assets := gen_random_uuid();
  v_coa_liabilities := gen_random_uuid();
  v_coa_equity := gen_random_uuid();
  v_coa_income := gen_random_uuid();
  v_coa_expenses := gen_random_uuid();
  
  INSERT INTO public.chart_of_accounts (id, client_id, account_number, account_name, account_type, parent_account_id, level, is_active, default_line_item, created_at, updated_at)
  VALUES 
    -- Level 1: Main Categories
    (v_coa_assets, v_client_1, '1000', 'ASSETS', 'ASSET', NULL, 1, true, 'Total Assets', NOW(), NOW()),
    (v_coa_liabilities, v_client_1, '2000', 'LIABILITIES', 'LIABILITY', NULL, 1, true, 'Total Liabilities', NOW(), NOW()),
    (v_coa_equity, v_client_1, '3000', 'EQUITY', 'EQUITY', NULL, 1, true, 'Total Equity', NOW(), NOW()),
    (v_coa_income, v_client_1, '4000', 'INCOME', 'REVENUE', NULL, 1, true, 'Total Income', NOW(), NOW()),
    (v_coa_expenses, v_client_1, '5000', 'EXPENSES', 'EXPENSE', NULL, 1, true, 'Total Expenses', NOW(), NOW()),
    
    -- Level 2: Assets
    (gen_random_uuid(), v_client_1, '1100', 'Current Assets', 'ASSET', v_coa_assets, 2, true, 'Current Assets', NOW(), NOW()),
    (gen_random_uuid(), v_client_1, '1200', 'Non-Current Assets', 'ASSET', v_coa_assets, 2, true, 'Non-Current Assets', NOW(), NOW()),
    
    -- Level 2: Liabilities
    (gen_random_uuid(), v_client_1, '2100', 'Current Liabilities', 'LIABILITY', v_coa_liabilities, 2, true, 'Current Liabilities', NOW(), NOW()),
    (gen_random_uuid(), v_client_1, '2200', 'Non-Current Liabilities', 'LIABILITY', v_coa_liabilities, 2, true, 'Non-Current Liabilities', NOW(), NOW()),
    
    -- Level 2: Equity
    (gen_random_uuid(), v_client_1, '3100', 'Share Capital', 'EQUITY', v_coa_equity, 2, true, 'Share Capital', NOW(), NOW()),
    (gen_random_uuid(), v_client_1, '3200', 'Retained Earnings', 'EQUITY', v_coa_equity, 2, true, 'Retained Earnings', NOW(), NOW()),
    
    -- Level 2: Income
    (gen_random_uuid(), v_client_1, '4100', 'Revenue', 'REVENUE', v_coa_income, 2, true, 'Revenue', NOW(), NOW()),
    (gen_random_uuid(), v_client_1, '4200', 'Other Income', 'REVENUE', v_coa_income, 2, true, 'Other Income', NOW(), NOW()),
    
    -- Level 2: Expenses
    (gen_random_uuid(), v_client_1, '5100', 'Operating Expenses', 'EXPENSE', v_coa_expenses, 2, true, 'Operating Expenses', NOW(), NOW()),
    (gen_random_uuid(), v_client_1, '5200', 'Administrative Expenses', 'EXPENSE', v_coa_expenses, 2, true, 'Administrative Expenses', NOW(), NOW())
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 9. TRIAL BALANCES & ENTRIES
-- ============================================================================

DO $$
DECLARE
  v_client_1 uuid;
  v_tb_id uuid;
BEGIN
  SELECT id INTO v_client_1 FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  v_tb_id := gen_random_uuid();
  
  -- Create trial balance
  INSERT INTO public.trial_balances (id, client_id, file_name, upload_date, financial_year, period, status, total_debits, total_credits, created_at, updated_at)
  VALUES 
    (v_tb_id, v_client_1, 'Trial_Balance_2024_YearEnd.xlsx', NOW() - INTERVAL '2 months', 2024, 'Year End', 'MAPPED', 5450000.00, 5450000.00, NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  -- Create trial balance entries
  INSERT INTO public.trial_balance_entries (trial_balance_id, account_number, account_name, debit_amount, credit_amount, balance, account_type, mapped_line_item, created_at, updated_at)
  VALUES 
    (v_tb_id, '1100', 'Bank - Current Account', 450000.00, 0, 450000.00, 'ASSET', 'Cash and Cash Equivalents', NOW(), NOW()),
    (v_tb_id, '1110', 'Accounts Receivable', 850000.00, 0, 850000.00, 'ASSET', 'Trade Receivables', NOW(), NOW()),
    (v_tb_id, '1120', 'Inventory', 320000.00, 0, 320000.00, 'ASSET', 'Inventories', NOW(), NOW()),
    (v_tb_id, '1200', 'Property, Plant & Equipment', 1500000.00, 0, 1500000.00, 'ASSET', 'Property, Plant and Equipment', NOW(), NOW()),
    (v_tb_id, '1210', 'Accumulated Depreciation', 0, 450000.00, -450000.00, 'ASSET', 'Accumulated Depreciation', NOW(), NOW()),
    (v_tb_id, '2100', 'Accounts Payable', 0, 520000.00, -520000.00, 'LIABILITY', 'Trade Payables', NOW(), NOW()),
    (v_tb_id, '2110', 'VAT Payable', 0, 180000.00, -180000.00, 'LIABILITY', 'Tax Payable', NOW(), NOW()),
    (v_tb_id, '2200', 'Long-term Loan', 0, 800000.00, -800000.00, 'LIABILITY', 'Borrowings', NOW(), NOW()),
    (v_tb_id, '3100', 'Share Capital', 0, 1000000.00, -1000000.00, 'EQUITY', 'Share Capital', NOW(), NOW()),
    (v_tb_id, '3200', 'Retained Earnings', 0, 1500000.00, -1500000.00, 'EQUITY', 'Retained Earnings', NOW(), NOW()),
    (v_tb_id, '4100', 'Sales Revenue', 0, 3500000.00, -3500000.00, 'REVENUE', 'Revenue', NOW(), NOW()),
    (v_tb_id, '5100', 'Cost of Sales', 2100000.00, 0, 2100000.00, 'EXPENSE', 'Cost of Sales', NOW(), NOW()),
    (v_tb_id, '5200', 'Salaries and Wages', 1200000.00, 0, 1200000.00, 'EXPENSE', 'Employee Benefits', NOW(), NOW()),
    (v_tb_id, '5210', 'Rent Expense', 250000.00, 0, 250000.00, 'EXPENSE', 'Operating Lease Expenses', NOW(), NOW()),
    (v_tb_id, '5220', 'Utilities', 80000.00, 0, 80000.00, 'EXPENSE', 'Other Expenses', NOW(), NOW()),
    (v_tb_id, '5230', 'Professional Fees', 150000.00, 0, 150000.00, 'EXPENSE', 'Professional Fees', NOW(), NOW()),
    (v_tb_id, '5240', 'Depreciation', 100000.00, 0, 100000.00, 'EXPENSE', 'Depreciation', NOW(), NOW())
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 10. TASKS & ASSIGNMENTS
-- ============================================================================

DO $$
DECLARE
  v_client_1 uuid;
  v_client_2 uuid;
  v_task_1 uuid;
  v_task_2 uuid;
  v_task_3 uuid;
  v_task_4 uuid;
  v_task_5 uuid;
BEGIN
  SELECT id INTO v_client_1 FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  SELECT id INTO v_client_2 FROM temp_demo_clients ORDER BY created_at OFFSET 1 LIMIT 1;
  
  v_task_1 := gen_random_uuid();
  v_task_2 := gen_random_uuid();
  v_task_3 := gen_random_uuid();
  v_task_4 := gen_random_uuid();
  v_task_5 := gen_random_uuid();
  
  -- Create tasks
  INSERT INTO public.tasks (id, title, description, assigned_to, created_by, client_id, task_type, priority, status, due_date, start_time, end_time, metadata, created_at, updated_at)
  VALUES 
    (v_task_1, 'Complete 2024 Financial Statements', 'Finalize and review the annual financial statements for 2024', '660e8400-e29b-41d4-a716-446655440001'::uuid, '660e8400-e29b-41d4-a716-446655440005'::uuid, v_client_1, 'accounting', 'high', 'in_progress', NOW() + INTERVAL '10 days', NOW(), NOW() + INTERVAL '10 days', '{"estimated_hours": 20, "year": 2024}', NOW(), NOW()),
    (v_task_2, 'Submit CIPC Annual Return', 'Prepare and submit the CIPC annual return', '660e8400-e29b-41d4-a716-446655440002'::uuid, '660e8400-e29b-41d4-a716-446655440005'::uuid, v_client_1, 'compliance', 'high', 'pending', NOW() + INTERVAL '15 days', NOW() + INTERVAL '5 days', NOW() + INTERVAL '15 days', '{"filing_year": 2024}', NOW(), NOW()),
    (v_task_3, 'VAT Return - January 2026', 'Prepare and submit VAT return for January period', '660e8400-e29b-41d4-a716-446655440003'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, v_client_1, 'tax', 'medium', 'pending', NOW() + INTERVAL '20 days', NOW() + INTERVAL '10 days', NOW() + INTERVAL '20 days', '{"period": "2026-01"}', NOW(), NOW()),
    (v_task_4, 'Tax Planning Consultation', 'Meet with client to discuss 2026 tax planning strategies', '660e8400-e29b-41d4-a716-446655440002'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, v_client_2, 'consultation', 'medium', 'pending', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '2 hours', '{"meeting_type": "in_person"}', NOW(), NOW()),
    (v_task_5, 'Reconcile Bank Accounts - December', 'Reconcile all bank accounts for December 2025', '660e8400-e29b-41d4-a716-446655440004'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, v_client_2, 'accounting', 'low', 'completed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days', '{"accounts": 3}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;
  
  -- Create task assignments
  INSERT INTO public.task_assignments (task_id, user_id, role, assigned_by, assigned_at, status)
  VALUES 
    (v_task_1, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'assignee', '550e8400-e29b-41d4-a716-446655440005'::uuid, NOW(), 'in_progress'),
    (v_task_2, '550e8400-e29b-41d4-a716-446655440002'::uuid, 'assignee', '550e8400-e29b-41d4-a716-446655440005'::uuid, NOW(), 'pending'),
    (v_task_3, '550e8400-e29b-41d4-a716-446655440003'::uuid, 'assignee', '550e8400-e29b-41d4-a716-446655440001'::uuid, NOW(), 'pending'),
    (v_task_4, '550e8400-e29b-41d4-a716-446655440002'::uuid, 'assignee', '550e8400-e29b-41d4-a716-446655440001'::uuid, NOW(), 'pending'),
    (v_task_5, '550e8400-e29b-41d4-a716-446655440004'::uuid, 'assignee', '550e8400-e29b-41d4-a716-446655440003'::uuid, NOW() - INTERVAL '5 days', 'completed')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 11. CALENDAR EVENTS
-- ============================================================================

DO $$
DECLARE
  v_client_1 uuid;
  v_client_2 uuid;
  v_event_1 uuid;
  v_event_2 uuid;
  v_event_3 uuid;
BEGIN
  SELECT id INTO v_client_1 FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  SELECT id INTO v_client_2 FROM temp_demo_clients ORDER BY created_at OFFSET 1 LIMIT 1;
  
  v_event_1 := gen_random_uuid();
  v_event_2 := gen_random_uuid();
  v_event_3 := gen_random_uuid();
  
  INSERT INTO public.calendar_events (id, title, description, event_type, start_time, end_time, location, client_id, created_by, attendees, is_all_day, metadata, created_at, updated_at)
  VALUES 
    (v_event_1, 'Year-End Review Meeting', 'Review 2024 financial results and discuss year-end adjustments', 'meeting', NOW() + INTERVAL '3 days' + INTERVAL '10 hours', NOW() + INTERVAL '3 days' + INTERVAL '12 hours', 'Client Office', v_client_1, '660e8400-e29b-41d4-a716-446655440001'::uuid, '["660e8400-e29b-41d4-a716-446655440001", "660e8400-e29b-41d4-a716-446655440003"]'::jsonb, false, '{"agenda": ["Financial results", "Tax implications", "2026 planning"]}', NOW(), NOW()),
    (v_event_2, 'Tax Planning Strategy Session', 'Discuss tax optimization strategies for 2026', 'meeting', NOW() + INTERVAL '7 days' + INTERVAL '14 hours', NOW() + INTERVAL '7 days' + INTERVAL '16 hours', 'Video Conference', v_client_2, '660e8400-e29b-41d4-a716-446655440002'::uuid, '["660e8400-e29b-41d4-a716-446655440002", "660e8400-e29b-41d4-a716-446655440001"]'::jsonb, false, '{"platform": "MS Teams", "meeting_link": "https://teams.microsoft.com/..."}', NOW(), NOW()),
    (v_event_3, 'Monthly Bookkeeping Review', 'Review December bookkeeping and reconciliations', 'meeting', NOW() + INTERVAL '2 days' + INTERVAL '9 hours', NOW() + INTERVAL '2 days' + INTERVAL '10 hours', 'Office', v_client_1, '660e8400-e29b-41d4-a716-446655440003'::uuid, '["660e8400-e29b-41d4-a716-446655440003", "660e8400-e29b-41d4-a716-446655440004"]'::jsonb, false, '{"review_type": "internal"}', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  -- Create event attendees
  INSERT INTO public.event_attendees (event_id, user_id, role, invited_by, invited_at, response_status)
  VALUES 
    (v_event_1, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'organizer', '550e8400-e29b-41d4-a716-446655440001'::uuid, NOW(), 'accepted'),
    (v_event_1, '550e8400-e29b-41d4-a716-446655440003'::uuid, 'attendee', '550e8400-e29b-41d4-a716-446655440001'::uuid, NOW(), 'accepted'),
    (v_event_2, '550e8400-e29b-41d4-a716-446655440002'::uuid, 'organizer', '550e8400-e29b-41d4-a716-446655440002'::uuid, NOW(), 'accepted'),
    (v_event_2, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'attendee', '550e8400-e29b-41d4-a716-446655440002'::uuid, NOW(), 'pending'),
    (v_event_3, '550e8400-e29b-41d4-a716-446655440003'::uuid, 'organizer', '550e8400-e29b-41d4-a716-446655440003'::uuid, NOW(), 'accepted'),
    (v_event_3, '550e8400-e29b-41d4-a716-446655440004'::uuid, 'attendee', '550e8400-e29b-41d4-a716-446655440003'::uuid, NOW(), 'accepted')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 12. FILING HISTORY
-- ============================================================================

DO $$
DECLARE
  v_client_1 uuid;
  v_client_2 uuid;
BEGIN
  SELECT id INTO v_client_1 FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  SELECT id INTO v_client_2 FROM temp_demo_clients ORDER BY created_at OFFSET 1 LIMIT 1;
  
  INSERT INTO public.filing_history (client_id, filing_type, filing_year, due_date, filed_date, days_late, status, notes, created_at, updated_at)
  VALUES 
    -- Client 1 - Good compliance record
    (v_client_1, 'Income Tax', 2023, '2024-01-31', '2024-01-25', 0, 'filed', 'Filed on time', NOW(), NOW()),
    (v_client_1, 'VAT', 2024, '2024-11-25', '2024-11-20', 0, 'filed', 'November VAT return filed', NOW(), NOW()),
    (v_client_1, 'CIPC Annual Return', 2023, '2024-05-15', '2024-05-10', 0, 'filed', 'Annual return filed successfully', NOW(), NOW()),
    (v_client_1, 'VAT', 2024, '2024-12-25', '2024-12-23', 0, 'filed', 'December VAT return filed', NOW(), NOW()),
    (v_client_1, 'Income Tax', 2024, '2025-01-31', NULL, 0, 'pending', 'Awaiting finalization of financial statements', NOW(), NOW()),
    
    -- Client 2 - Mix of on-time and late filings
    (v_client_2, 'Income Tax', 2023, '2024-01-31', '2024-02-15', 15, 'filed', 'Filed late - penalty applied', NOW(), NOW()),
    (v_client_2, 'VAT', 2024, '2024-10-25', '2024-10-24', 0, 'filed', 'October VAT return filed', NOW(), NOW()),
    (v_client_2, 'CIPC Annual Return', 2023, '2024-06-20', '2024-06-18', 0, 'filed', 'Annual return filed on time', NOW(), NOW()),
    (v_client_2, 'VAT', 2024, '2024-11-25', '2024-11-28', 3, 'filed', 'Filed slightly late', NOW(), NOW()),
    (v_client_2, 'VAT', 2024, '2024-12-25', NULL, 0, 'pending', 'In preparation', NOW(), NOW())
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 13. DOCUMENT DEADLINES
-- ============================================================================

DO $$
DECLARE
  v_client_1 uuid;
  v_client_2 uuid;
BEGIN
  SELECT id INTO v_client_1 FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  SELECT id INTO v_client_2 FROM temp_demo_clients ORDER BY created_at OFFSET 1 LIMIT 1;
  
  INSERT INTO public.document_deadlines (client_id, document_type, deadline_date, description, status, priority, reminder_sent, created_by, notes, created_at, updated_at)
  VALUES 
    (v_client_1, 'Financial Statements', NOW() + INTERVAL '30 days', '2024 Annual Financial Statements', 'in_progress', 'high', false, '660e8400-e29b-41d4-a716-446655440005'::uuid, 'Year-end is February 28, 2024', NOW(), NOW()),
    (v_client_1, 'Tax Return', NOW() + INTERVAL '60 days', '2024 Corporate Income Tax Return (IT14)', 'pending', 'high', false, '660e8400-e29b-41d4-a716-446655440005'::uuid, 'Due within 12 months of year-end', NOW(), NOW()),
    (v_client_1, 'CIPC Annual Return', NOW() + INTERVAL '120 days', '2025 CIPC Annual Return', 'pending', 'medium', false, '660e8400-e29b-41d4-a716-446655440005'::uuid, 'Annual filing requirement', NOW(), NOW()),
    (v_client_2, 'Financial Statements', NOW() + INTERVAL '45 days', '2024 Annual Financial Statements', 'pending', 'high', false, '660e8400-e29b-41d4-a716-446655440005'::uuid, 'Year-end is December 31, 2024', NOW(), NOW()),
    (v_client_2, 'Tax Return', NOW() + INTERVAL '90 days', '2024 Corporate Income Tax Return (IT14)', 'pending', 'high', false, '660e8400-e29b-41d4-a716-446655440005'::uuid, 'Provisional tax also required', NOW(), NOW()),
    (v_client_2, 'VAT Return', NOW() + INTERVAL '20 days', 'January 2026 VAT Return', 'pending', 'medium', false, '660e8400-e29b-41d4-a716-446655440002'::uuid, 'Monthly VAT vendor', NOW(), NOW())
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 14. DOCUMENTS
-- ============================================================================

DO $$
DECLARE
  v_client_1 uuid;
  v_client_2 uuid;
BEGIN
  SELECT id INTO v_client_1 FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  SELECT id INTO v_client_2 FROM temp_demo_clients ORDER BY created_at OFFSET 1 LIMIT 1;
  
  INSERT INTO public.documents (client_id, document_type, file_name, file_path, file_size, mime_type, document_name, description, uploaded_by, uploaded_at, updated_at)
  VALUES 
    (v_client_1, 'Financial Statements', 'AFS_2023.pdf', '/documents/client1/AFS_2023.pdf', 2456789, 'application/pdf', '2023 Annual Financial Statements', 'Audited financial statements for 2023', 'John Smith', NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months'),
    (v_client_1, 'Tax Return', 'IT14_2023.pdf', '/documents/client1/IT14_2023.pdf', 876543, 'application/pdf', '2023 Income Tax Return', 'Corporate tax return for 2023', 'Sarah Jones', NOW() - INTERVAL '5 months', NOW() - INTERVAL '5 months'),
    (v_client_1, 'Trial Balance', 'TB_Dec2024.xlsx', '/documents/client1/TB_Dec2024.xlsx', 145678, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'December 2024 Trial Balance', 'Year-end trial balance', 'Mike Brown', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
    (v_client_1, 'CIPC', 'CIPC_AR_2024.pdf', '/documents/client1/CIPC_AR_2024.pdf', 567890, 'application/pdf', '2024 CIPC Annual Return', 'Annual return filed with CIPC', 'Sarah Jones', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
    (v_client_2, 'Financial Statements', 'AFS_2023.pdf', '/documents/client2/AFS_2023.pdf', 3456789, 'application/pdf', '2023 Annual Financial Statements', 'Complete AFS package', 'John Smith', NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months'),
    (v_client_2, 'Bank Statement', 'Bank_Statement_Dec2024.pdf', '/documents/client2/Bank_Statement_Dec2024.pdf', 234567, 'application/pdf', 'December 2024 Bank Statement', 'FNB business account statement', 'Lisa Wilson', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
    (v_client_2, 'VAT Return', 'VAT201_Nov2024.pdf', '/documents/client2/VAT201_Nov2024.pdf', 123456, 'application/pdf', 'November 2024 VAT Return', 'VAT201 return and proof of payment', 'Sarah Jones', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 15. NOTIFICATIONS
-- ============================================================================

DO $$
DECLARE
  v_client_1 uuid;
  v_client_2 uuid;
BEGIN
  SELECT id INTO v_client_1 FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  SELECT id INTO v_client_2 FROM temp_demo_clients ORDER BY created_at OFFSET 1 LIMIT 1;
  
  INSERT INTO public.notifications (recipient_type, recipient_id, recipient_contact, notification_type, subject, message, status, related_entity_type, related_entity_id, scheduled_for, sent_at, delivered_at, metadata, created_at)
  VALUES 
    ('consultant', '660e8400-e29b-41d4-a716-446655440001'::uuid, 'john.smith@agility.co.za', 'task_assigned', 'New Task Assigned', 'You have been assigned a new high priority task: Complete 2024 Financial Statements', 'delivered', 'task', NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', '{"priority": "high", "task_type": "accounting"}', NOW() - INTERVAL '2 days'),
    ('consultant', '660e8400-e29b-41d4-a716-446655440002'::uuid, 'sarah.jones@agility.co.za', 'deadline_reminder', 'Upcoming Deadline', 'Reminder: CIPC Annual Return due in 15 days for client ' || (SELECT client_name FROM temp_demo_clients WHERE id = v_client_1), 'delivered', 'deadline', NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', '{"days_until_due": 15}', NOW() - INTERVAL '1 day'),
    ('consultant', '660e8400-e29b-41d4-a716-446655440003'::uuid, 'mike.brown@agility.co.za', 'timesheet_reminder', 'Timesheet Submission Reminder', 'Please remember to submit your timesheet for this week', 'sent', 'timesheet', NULL, NOW(), NOW(), NULL, '{"week_ending": "2026-01-10"}', NOW()),
    ('consultant', '660e8400-e29b-41d4-a716-446655440004'::uuid, 'lisa.wilson@agility.co.za', 'task_completed', 'Task Completed', 'Your task "Reconcile Bank Accounts - December" has been marked as completed', 'delivered', 'task', NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', '{"task_status": "completed"}', NOW() - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 16. ACTIVITY LOGS
-- ============================================================================

DO $$
DECLARE
  v_client_1 uuid;
  v_client_1_name text;
BEGIN
  SELECT id, client_name INTO v_client_1, v_client_1_name FROM temp_demo_clients ORDER BY created_at LIMIT 1;
  
  INSERT INTO public.activity_logs (user_id, user_name, action, entity_type, entity_id, entity_name, details, ip_address, user_agent, timestamp, created_at)
  VALUES 
    ('660e8400-e29b-41d4-a716-446655440001'::uuid, 'John Smith', 'CREATE', 'time_entry', NULL, 'Time Entry for ' || v_client_1_name, '{"hours": 4.5, "amount": 6750, "description": "Review of financial statements"}', '102.165.23.45', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('660e8400-e29b-41d4-a716-446655440002'::uuid, 'Sarah Jones', 'UPDATE', 'task', NULL, 'Complete 2024 Financial Statements', '{"status_change": "pending to in_progress"}', '102.165.23.46', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    ('660e8400-e29b-41d4-a716-446655440003'::uuid, 'Mike Brown', 'CREATE', 'document', NULL, 'Trial Balance Upload', '{"file_name": "TB_Dec2024.xlsx", "size": 145678}', '102.165.23.47', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    ('660e8400-e29b-41d4-a716-446655440001'::uuid, 'John Smith', 'CREATE', 'calendar_event', NULL, 'Year-End Review Meeting', '{"event_type": "meeting", "attendees": 2}', '102.165.23.45', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    ('660e8400-e29b-41d4-a716-446655440005'::uuid, 'David Taylor', 'UPDATE', 'client', v_client_1::text, v_client_1_name, '{"field_updated": "assigned_consultant", "new_value": "John Smith"}', '102.165.23.48', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
    ('660e8400-e29b-41d4-a716-446655440004'::uuid, 'Lisa Wilson', 'CREATE', 'time_entry', NULL, 'Time Entry for ' || v_client_1_name, '{"hours": 7.0, "amount": 5250, "description": "Monthly bookkeeping"}', '102.165.23.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 17. PERMISSIONS (Optional - if you want to show permission management)
-- ============================================================================

INSERT INTO public.permissions (key, name, description, category, created_at)
VALUES 
  ('clients.view', 'View Clients', 'Permission to view client information', 'Clients', NOW()),
  ('clients.create', 'Create Clients', 'Permission to create new clients', 'Clients', NOW()),
  ('clients.edit', 'Edit Clients', 'Permission to edit client information', 'Clients', NOW()),
  ('clients.delete', 'Delete Clients', 'Permission to delete clients', 'Clients', NOW()),
  ('timesheets.view', 'View Timesheets', 'Permission to view timesheet entries', 'Timesheets', NOW()),
  ('timesheets.create', 'Create Timesheets', 'Permission to create timesheet entries', 'Timesheets', NOW()),
  ('timesheets.approve', 'Approve Timesheets', 'Permission to approve timesheet entries', 'Timesheets', NOW()),
  ('documents.view', 'View Documents', 'Permission to view documents', 'Documents', NOW()),
  ('documents.upload', 'Upload Documents', 'Permission to upload documents', 'Documents', NOW()),
  ('reports.view', 'View Reports', 'Permission to view reports', 'Reports', NOW()),
  ('reports.export', 'Export Reports', 'Permission to export reports', 'Reports', NOW())
ON CONFLICT (key) DO NOTHING;

-- Assign permissions to demo users
INSERT INTO public.user_permissions (user_id, permission_key, enabled, granted_at, granted_by)
VALUES 
  -- Admin gets all permissions
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'clients.view', true, NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'clients.create', true, NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'clients.edit', true, NOW(), NULL),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'timesheets.approve', true, NOW(), NULL),
  -- Consultants get limited permissions
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'clients.view', true, NOW(), '550e8400-e29b-41d4-a716-446655440001'::uuid),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'timesheets.view', true, NOW(), '550e8400-e29b-41d4-a716-446655440001'::uuid),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'timesheets.create', true, NOW(), '550e8400-e29b-41d4-a716-446655440001'::uuid),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'clients.view', true, NOW(), '550e8400-e29b-41d4-a716-446655440001'::uuid),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'timesheets.view', true, NOW(), '550e8400-e29b-41d4-a716-446655440001'::uuid),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'timesheets.create', true, NOW(), '550e8400-e29b-41d4-a716-446655440001'::uuid)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CLEANUP
-- ============================================================================

DROP TABLE IF EXISTS temp_demo_clients;
DROP TABLE IF EXISTS temp_job_types;

COMMIT;

-- ============================================================================
-- SEED DATA COMPLETE
-- ============================================================================
-- Summary of seeded data:
-- - 5 Consultants/Users
-- - 10 Job Types
-- - Directors for existing clients
-- - Consultant-Client rate assignments
-- - 5 Projects for existing clients
-- - 18 Time entries across 3 months
-- - Chart of Accounts (main categories)
-- - 1 Trial Balance with 17 entries
-- - 5 Tasks with assignments
-- - 3 Calendar events with attendees
-- - 10 Filing history records
-- - 6 Document deadline records
-- - 7 Document records
-- - 4 Notifications
-- - 6 Activity log entries
-- - 11 Permissions with user assignments
-- ============================================================================
