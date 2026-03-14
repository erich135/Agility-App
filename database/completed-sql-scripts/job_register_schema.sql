-- ============================================
-- Job Register & Checklist System
-- ============================================
-- Phase 3: Comprehensive job tracking with checklists,
-- templates, recurring jobs, and filing pack links.
-- Tracks all work: CIPC filings, SARS returns, Trust
-- admin, Payroll, and custom jobs.

-- 1. Job Register - main jobs table
CREATE TABLE IF NOT EXISTS job_register (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Job details
  title VARCHAR(300) NOT NULL,
  description TEXT,
  job_type VARCHAR(100) NOT NULL,
  -- e.g. cipc_annual_return, cipc_bo_filing, cipc_director_change,
  -- sars_tax_return, sars_provisional, sars_vat, sars_emp201,
  -- trust_filing, payroll_monthly, financial_statements, general
  
  -- Categorisation
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  -- Values: cipc, sars, trusts, payroll, accounting, advisory, general
  
  -- Period tracking
  tax_year VARCHAR(10),        -- e.g. '2025', '2024/2025'
  period VARCHAR(50),          -- e.g. 'March 2025', 'Q1 2025', 'FY2025'
  
  -- Status workflow
  status VARCHAR(30) NOT NULL DEFAULT 'not_started',
  -- not_started, in_progress, waiting_client, waiting_sars, 
  -- under_review, completed, cancelled
  
  priority VARCHAR(10) NOT NULL DEFAULT 'medium',
  -- low, medium, high, urgent
  
  -- Dates
  date_created DATE DEFAULT CURRENT_DATE,
  date_due DATE,
  date_started DATE,
  date_completed DATE,
  
  -- Assignment
  assigned_to UUID,            -- user id of consultant
  assigned_to_name VARCHAR(200),
  
  -- Recurring job support
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(20),  -- monthly, quarterly, annually
  recurrence_source_id UUID REFERENCES job_register(id) ON DELETE SET NULL,
  
  -- Template used to create this job
  template_id UUID,
  
  -- Financial
  quoted_amount DECIMAL(10,2),
  invoiced_amount DECIMAL(10,2),
  is_invoiced BOOLEAN DEFAULT false,
  
  -- Notes & metadata
  notes TEXT,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_register_client ON job_register(client_id);
CREATE INDEX IF NOT EXISTS idx_job_register_status ON job_register(status);
CREATE INDEX IF NOT EXISTS idx_job_register_category ON job_register(category);
CREATE INDEX IF NOT EXISTS idx_job_register_assigned ON job_register(assigned_to);
CREATE INDEX IF NOT EXISTS idx_job_register_due ON job_register(date_due);
CREATE INDEX IF NOT EXISTS idx_job_register_recurring ON job_register(is_recurring) WHERE is_recurring = true;

-- 2. Job Checklist Items
CREATE TABLE IF NOT EXISTS job_checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES job_register(id) ON DELETE CASCADE,
  
  title VARCHAR(300) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  completed_by_name VARCHAR(200),
  
  is_required BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_checklist_job ON job_checklist_items(job_id);

-- 3. Job Templates (admin-managed)
CREATE TABLE IF NOT EXISTS job_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  job_type VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  
  default_priority VARCHAR(10) DEFAULT 'medium',
  estimated_days INTEGER,       -- typical days to complete
  
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Template Checklist Items (copied to job on creation)
CREATE TABLE IF NOT EXISTS job_template_checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES job_templates(id) ON DELETE CASCADE,
  
  title VARCHAR(300) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_checklist_template ON job_template_checklist(template_id);

-- 5. Job Document Links (filing pack)
CREATE TABLE IF NOT EXISTS job_document_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES job_register(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  link_type VARCHAR(50) DEFAULT 'supporting',
  -- supporting, output, mandate, correspondence
  
  notes TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  linked_by UUID,
  
  UNIQUE(job_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_job_doc_links_job ON job_document_links(job_id);
CREATE INDEX IF NOT EXISTS idx_job_doc_links_document ON job_document_links(document_id);

-- 6. Job Activity Log (audit trail)
CREATE TABLE IF NOT EXISTS job_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES job_register(id) ON DELETE CASCADE,
  
  action VARCHAR(100) NOT NULL,
  -- created, status_changed, assigned, checklist_completed,
  -- note_added, document_linked, completed, reopened
  
  details TEXT,
  old_value TEXT,
  new_value TEXT,
  
  performed_by UUID,
  performed_by_name VARCHAR(200),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_activity_job ON job_activity_log(job_id);

-- 7. Disable RLS for development
ALTER TABLE job_register DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklist_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_template_checklist DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_document_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_activity_log DISABLE ROW LEVEL SECURITY;

-- 8. Seed default job templates with checklists
-- CIPC Annual Return
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('CIPC Annual Return', 'File annual return with CIPC', 'cipc_annual_return', 'cipc', 'high', 14, 1);

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Verify company registration details on CIPC', 1),
  ('Check if AR is due / overdue', 2),
  ('Confirm registered address is current', 3),
  ('Verify director details are up to date', 4),
  ('Log in to CIPC e-Services', 5),
  ('File Annual Return online', 6),
  ('Make payment to CIPC', 7),
  ('Download filed AR confirmation', 8),
  ('Save confirmation to client documents', 9),
  ('Update last filed date in system', 10),
  ('Notify client of completion', 11)
) AS item(title, sort_order)
WHERE t.name = 'CIPC Annual Return'
ON CONFLICT DO NOTHING;

-- CIPC Beneficial Ownership Filing
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('CIPC BO Filing', 'File Beneficial Ownership declaration with CIPC', 'cipc_bo_filing', 'cipc', 'high', 14, 2);

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain ID copies of all beneficial owners', 1),
  ('Obtain proof of address for all BOs', 2),
  ('Determine ownership percentages', 3),
  ('Prepare BO-1 declaration form', 4),
  ('Get signatures from all directors', 5),
  ('File BO declaration on CIPC', 6),
  ('Download confirmation', 7),
  ('Save all documents to client file', 8),
  ('Update BO filing date in system', 9)
) AS item(title, sort_order)
WHERE t.name = 'CIPC BO Filing'
ON CONFLICT DO NOTHING;

-- Director Change
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Director Change (CoR39)', 'Register director appointment or resignation', 'cipc_director_change', 'cipc', 'high', 7, 3);

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain board resolution for director change', 1),
  ('Get new director ID copy and proof of address', 2),
  ('Prepare CoR39 form', 3),
  ('Get required signatures', 4),
  ('File CoR39 on CIPC e-Services', 5),
  ('Download updated CK/CoR showing new directors', 6),
  ('Update Person Register in system', 7),
  ('Notify client of completion', 8)
) AS item(title, sort_order)
WHERE t.name = 'Director Change (CoR39)'
ON CONFLICT DO NOTHING;

-- SARS Income Tax Return
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Income Tax Return (ITR14)', 'Company income tax return filing', 'sars_tax_return', 'sars', 'high', 21, 4);

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Request trial balance / financial statements from client', 1),
  ('Reconcile bank statements', 2),
  ('Prepare tax computation', 3),
  ('Check for provisional tax credits', 4),
  ('Complete ITR14 on eFiling', 5),
  ('Review before submission', 6),
  ('Submit ITR14 on SARS eFiling', 7),
  ('Download acknowledgement of receipt', 8),
  ('Check assessment when issued', 9),
  ('Advise client of result / payment due', 10),
  ('Save all documents to client file', 11)
) AS item(title, sort_order)
WHERE t.name = 'Income Tax Return (ITR14)'
ON CONFLICT DO NOTHING;

-- VAT Return
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('VAT Return (VAT201)', 'Monthly/bi-monthly VAT submission', 'sars_vat', 'sars', 'high', 5, 5);

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain invoices and receipts for the period', 1),
  ('Reconcile VAT input and output', 2),
  ('Complete VAT201 return', 3),
  ('Review totals against bank and books', 4),
  ('Submit on SARS eFiling', 5),
  ('Download submission confirmation', 6),
  ('Advise client of payment / refund due', 7),
  ('Save to client documents', 8)
) AS item(title, sort_order)
WHERE t.name = 'VAT Return (VAT201)'
ON CONFLICT DO NOTHING;

-- EMP201 Monthly
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('EMP201 Monthly Submission', 'Monthly employer declaration', 'sars_emp201', 'sars', 'medium', 3, 6);

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Run payroll for the month', 1),
  ('Calculate PAYE, UIF, SDL amounts', 2),
  ('Complete EMP201 on eFiling', 3),
  ('Submit EMP201', 4),
  ('Make payment to SARS', 5),
  ('Save confirmation to client file', 6)
) AS item(title, sort_order)
WHERE t.name = 'EMP201 Monthly Submission'
ON CONFLICT DO NOTHING;

-- Payroll Processing
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Monthly Payroll', 'Process monthly payroll', 'payroll_monthly', 'payroll', 'high', 3, 7);

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain any salary changes / new employees from client', 1),
  ('Check for leave taken and overtime', 2),
  ('Process payroll calculations', 3),
  ('Generate payslips', 4),
  ('Send payslips to client for approval', 5),
  ('Process bank payments file', 6),
  ('File EMP201 for the month', 7),
  ('Save payroll reports to client file', 8)
) AS item(title, sort_order)
WHERE t.name = 'Monthly Payroll'
ON CONFLICT DO NOTHING;

-- Financial Statements
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Annual Financial Statements', 'Prepare annual financial statements', 'financial_statements', 'accounting', 'high', 30, 8);

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain year-end trial balance', 1),
  ('Reconcile all bank accounts', 2),
  ('Reconcile debtors and creditors', 3),
  ('Review fixed assets register', 4),
  ('Calculate depreciation', 5),
  ('Process year-end journals', 6),
  ('Prepare income statement', 7),
  ('Prepare balance sheet', 8),
  ('Prepare notes to AFS', 9),
  ('Director approval and sign-off', 10),
  ('File with CIPC if required', 11),
  ('Save to client documents', 12)
) AS item(title, sort_order)
WHERE t.name = 'Annual Financial Statements'
ON CONFLICT DO NOTHING;
