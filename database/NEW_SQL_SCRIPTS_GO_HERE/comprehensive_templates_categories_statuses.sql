-- ============================================================
-- COMPREHENSIVE: Job Templates, Doc Categories & Job Statuses
-- For South African Accounting / Auditing Practice
-- ============================================================
-- This script adds all missing job templates (with checklists),
-- document categories, and seeds job statuses.
-- Safe to re-run: uses ON CONFLICT DO NOTHING / IF NOT EXISTS.
-- ============================================================


-- ************************************************************
-- PART 1: SEED JOB STATUSES (if table exists)
-- ************************************************************
-- The StatusManager UI can override these, but we need sensible defaults.

INSERT INTO job_statuses (id, key, label, color_bg, color_dot, board_header_color, board_bg_color, is_active, is_closed, sort_order)
VALUES
  (gen_random_uuid(), 'not_started',         'Not Started',              'bg-gray-100 text-gray-700 border-gray-200',    'bg-gray-400',   'bg-gray-500',   'bg-gray-50',   true, false, 1),
  (gen_random_uuid(), 'in_progress',         'In Progress',              'bg-blue-100 text-blue-700 border-blue-200',    'bg-blue-500',   'bg-blue-500',   'bg-blue-50',   true, false, 2),
  (gen_random_uuid(), 'waiting_client',      'Waiting on Client',        'bg-yellow-100 text-yellow-700 border-yellow-200', 'bg-yellow-500', 'bg-yellow-500', 'bg-yellow-50', true, false, 3),
  (gen_random_uuid(), 'waiting_sars',        'Waiting on SARS',          'bg-orange-100 text-orange-700 border-orange-200', 'bg-orange-500', 'bg-orange-500', 'bg-orange-50', true, false, 4),
  (gen_random_uuid(), 'waiting_cipc',        'Waiting on CIPC',          'bg-amber-100 text-amber-700 border-amber-200',   'bg-amber-500',  'bg-amber-500',  'bg-amber-50',  true, false, 5),
  (gen_random_uuid(), 'waiting_dol',         'Waiting on Dept of Labour','bg-lime-100 text-lime-700 border-lime-200',     'bg-lime-500',   'bg-lime-600',   'bg-lime-50',   true, false, 6),
  (gen_random_uuid(), 'waiting_masters',     'Waiting on Master''s Office','bg-rose-100 text-rose-700 border-rose-200',   'bg-rose-500',   'bg-rose-500',   'bg-rose-50',   true, false, 7),
  (gen_random_uuid(), 'waiting_bank',        'Waiting on Bank',          'bg-cyan-100 text-cyan-700 border-cyan-200',     'bg-cyan-500',   'bg-cyan-500',   'bg-cyan-50',   true, false, 8),
  (gen_random_uuid(), 'waiting_third_party', 'Waiting on Third Party',   'bg-stone-100 text-stone-700 border-stone-200', 'bg-stone-500',  'bg-stone-500',  'bg-stone-50',  true, false, 9),
  (gen_random_uuid(), 'submitted',           'Submitted / Filed',        'bg-sky-100 text-sky-700 border-sky-200',       'bg-sky-500',    'bg-sky-500',    'bg-sky-50',    true, false, 10),
  (gen_random_uuid(), 'ready_for_review',    'Ready for Review',         'bg-violet-100 text-violet-700 border-violet-200','bg-violet-500','bg-violet-500', 'bg-violet-50', true, false, 11),
  (gen_random_uuid(), 'under_review',        'Under Review',             'bg-purple-100 text-purple-700 border-purple-200','bg-purple-500','bg-purple-500', 'bg-purple-50', true, false, 12),
  (gen_random_uuid(), 'on_hold',             'On Hold',                  'bg-zinc-100 text-zinc-700 border-zinc-200',     'bg-zinc-400',   'bg-zinc-500',   'bg-zinc-50',   true, false, 13),
  (gen_random_uuid(), 'completed',           'Completed',                'bg-green-100 text-green-700 border-green-200',  'bg-green-500',  'bg-green-500',  'bg-green-50',  true, true,  14),
  (gen_random_uuid(), 'cancelled',           'Cancelled',                'bg-red-100 text-red-700 border-red-200',        'bg-red-400',    'bg-red-500',    'bg-red-50',    true, true,  15)
ON CONFLICT DO NOTHING;


-- ************************************************************
-- PART 2: NEW JOB TEMPLATES + CHECKLISTS
-- ************************************************************
-- Existing templates (8): CIPC Annual Return, CIPC BO Filing, Director Change,
--   Income Tax Return (ITR14), VAT Return, EMP201, Monthly Payroll, Annual Financial Statements
-- Below we add ~30+ new templates covering Labour, Trusts, Secretarial, B-BBEE, Banking, etc.

-- ============================================================
-- CIPC TEMPLATES (additional)
-- ============================================================

-- New Company Registration
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('New Company Registration', 'Register a new company (CoR14.1) with CIPC', 'cipc_new_registration', 'cipc', 'high', 14, 10)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain ID copies and proof of address for all directors', 1),
  ('Choose company name and check availability on CIPC', 2),
  ('Determine share structure and classes', 3),
  ('Prepare CoR14.1 application', 4),
  ('Prepare Memorandum of Incorporation (MOI)', 5),
  ('Submit application on CIPC e-Services', 6),
  ('Make payment to CIPC', 7),
  ('Monitor application status', 8),
  ('Download CoR14.3 (Certificate of Incorporation)', 9),
  ('Register for tax at SARS (IT, PAYE, VAT if applicable)', 10),
  ('Save all documents to client file', 11),
  ('Notify client and provide registration pack', 12)
) AS item(title, sort_order)
WHERE t.name = 'New Company Registration'
ON CONFLICT DO NOTHING;

-- Close Corporation Conversion
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('CC to Company Conversion', 'Convert Close Corporation to Private Company', 'cipc_cc_conversion', 'cipc', 'medium', 21, 11)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain CK1/CK2 and founding statement', 1),
  ('Obtain member ID copies and proof of address', 2),
  ('Prepare MOI for new company', 3),
  ('Prepare CoR15.1A conversion application', 4),
  ('Obtain member resolutions for conversion', 5),
  ('Submit on CIPC e-Services', 6),
  ('Pay conversion fee', 7),
  ('Monitor status and respond to queries', 8),
  ('Download new CoR14.3 / CoR15.3', 9),
  ('Update SARS records with new entity type', 10),
  ('Notify client with new registration documents', 11)
) AS item(title, sort_order)
WHERE t.name = 'CC to Company Conversion'
ON CONFLICT DO NOTHING;

-- Registered Address Change
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Registered Address Change', 'Change company registered address at CIPC (CoR21)', 'cipc_address_change', 'cipc', 'low', 7, 12)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain new address details and proof', 1),
  ('Prepare CoR21 form', 2),
  ('Obtain director resolution approving change', 3),
  ('Submit on CIPC e-Services', 4),
  ('Download updated company profile', 5),
  ('Notify SARS of address change', 6),
  ('Update client records in system', 7)
) AS item(title, sort_order)
WHERE t.name = 'Registered Address Change'
ON CONFLICT DO NOTHING;

-- Company Deregistration
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Company Deregistration', 'Deregister dormant or unused company at CIPC', 'cipc_deregistration', 'cipc', 'low', 30, 13)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Confirm company has no outstanding liabilities', 1),
  ('Obtain SARS tax clearance or deregistration', 2),
  ('Obtain director resolution to deregister', 3),
  ('File final annual return if outstanding', 4),
  ('Submit CoR40.1 application on CIPC', 5),
  ('Monitor deregistration process', 6),
  ('Obtain confirmation of deregistration', 7),
  ('Close all related SARS registrations', 8),
  ('Notify client of completion', 9)
) AS item(title, sort_order)
WHERE t.name = 'Company Deregistration'
ON CONFLICT DO NOTHING;

-- MOI Amendment
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('MOI Amendment', 'Amend Memorandum of Incorporation', 'cipc_moi_amendment', 'cipc', 'medium', 14, 14)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Review current MOI and identify required changes', 1),
  ('Draft amended MOI clauses', 2),
  ('Obtain special resolution from shareholders (75%)', 3),
  ('Prepare CoR15.2 form', 4),
  ('Submit amended MOI to CIPC', 5),
  ('Pay filing fee', 6),
  ('Download acceptance confirmation', 7),
  ('Distribute updated MOI to directors and shareholders', 8)
) AS item(title, sort_order)
WHERE t.name = 'MOI Amendment'
ON CONFLICT DO NOTHING;

-- Share Transfer
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Share Transfer / Issue', 'Process share transfer or new share issue', 'cipc_share_transfer', 'cipc', 'medium', 10, 15)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Review MOI for share transfer/issue provisions', 1),
  ('Obtain board resolution approving transfer/issue', 2),
  ('Prepare share transfer form / subscription agreement', 3),
  ('Calculate and process Securities Transfer Tax (STT) if applicable', 4),
  ('Update share register', 5),
  ('Issue new share certificates', 6),
  ('File CoR24 / CoR25 with CIPC if required', 7),
  ('Update Beneficial Ownership register', 8),
  ('Save all documents to client file', 9)
) AS item(title, sort_order)
WHERE t.name = 'Share Transfer / Issue'
ON CONFLICT DO NOTHING;


-- ============================================================
-- SARS TEMPLATES (additional)
-- ============================================================

-- Income Tax Return - Individual
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Income Tax Return (ITR12)', 'Individual income tax return filing', 'sars_itr12', 'sars', 'high', 14, 20)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain IRP5/IT3(a) certificates', 1),
  ('Obtain medical aid tax certificate', 2),
  ('Obtain retirement annuity certificate', 3),
  ('Gather other income info (rental, interest, capital gains)', 4),
  ('Check for travel allowance / home office deductions', 5),
  ('Complete ITR12 on eFiling', 6),
  ('Review before submission', 7),
  ('Submit ITR12 on SARS eFiling', 8),
  ('Download acknowledgement of receipt', 9),
  ('Check assessment when issued (ITA34)', 10),
  ('Advise client of result / refund / payment due', 11)
) AS item(title, sort_order)
WHERE t.name = 'Income Tax Return (ITR12)'
ON CONFLICT DO NOTHING;

-- Provisional Tax
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Provisional Tax (IRP6)', 'Submit provisional tax estimate', 'sars_provisional', 'sars', 'high', 7, 21)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain management accounts / estimated income for period', 1),
  ('Calculate estimated taxable income', 2),
  ('Calculate provisional tax payment due', 3),
  ('Complete IRP6 on SARS eFiling', 4),
  ('Submit IRP6', 5),
  ('Advise client of payment amount and due date', 6),
  ('Confirm payment made to SARS', 7),
  ('Save confirmation to client file', 8)
) AS item(title, sort_order)
WHERE t.name = 'Provisional Tax (IRP6)'
ON CONFLICT DO NOTHING;

-- EMP501 Bi-Annual Reconciliation
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('EMP501 Reconciliation', 'Bi-annual employer reconciliation (interim and year-end)', 'sars_emp501', 'sars', 'high', 10, 22)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Reconcile all EMP201 submissions for the period', 1),
  ('Verify PAYE, UIF and SDL totals match payroll', 2),
  ('Generate IRP5/IT3(a) certificates for all employees', 3),
  ('Review and validate all certificates', 4),
  ('Upload EMP501 on SARS eFiling', 5),
  ('Submit reconciliation', 6),
  ('Address any errors flagged by SARS', 7),
  ('Download final confirmation', 8),
  ('Distribute IRP5 certificates to employees', 9),
  ('Save all to client file', 10)
) AS item(title, sort_order)
WHERE t.name = 'EMP501 Reconciliation'
ON CONFLICT DO NOTHING;

-- Tax Clearance Certificate
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Tax Clearance Certificate (TCC)', 'Apply for Tax Compliance Certificate', 'sars_tcc', 'sars', 'medium', 7, 23)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Verify all tax returns are up to date', 1),
  ('Verify no outstanding SARS debt', 2),
  ('Log into SARS eFiling', 3),
  ('Submit TCC application', 4),
  ('Monitor application status', 5),
  ('Download Tax Compliance PIN / certificate', 6),
  ('Send TCC to client', 7)
) AS item(title, sort_order)
WHERE t.name = 'Tax Clearance Certificate (TCC)'
ON CONFLICT DO NOTHING;

-- SARS Dispute / Objection
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('SARS Dispute / Objection', 'Lodge objection or dispute against SARS assessment', 'sars_dispute', 'sars', 'urgent', 14, 24)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Review assessment and identify grounds for objection', 1),
  ('Gather supporting documentation', 2),
  ('Draft grounds of objection', 3),
  ('Submit NOO (Notice of Objection) on eFiling within 30 days', 4),
  ('Monitor objection status', 5),
  ('Respond to any SARS queries / requests for info', 6),
  ('Review outcome of objection', 7),
  ('Advise client - escalate to appeal if needed', 8),
  ('Save all documents to client file', 9)
) AS item(title, sort_order)
WHERE t.name = 'SARS Dispute / Objection'
ON CONFLICT DO NOTHING;

-- SARS Audit Response
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('SARS Audit Response', 'Respond to SARS verification or audit', 'sars_audit', 'sars', 'urgent', 21, 25)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Review SARS audit letter and information requested', 1),
  ('Gather all requested documents from client', 2),
  ('Prepare cover letter with explanations', 3),
  ('Submit response on eFiling or via SARS channels', 4),
  ('Monitor for follow-up requests', 5),
  ('Attend SARS meeting if required', 6),
  ('Review revised assessment if issued', 7),
  ('Advise client on outcome and any further action', 8),
  ('Save all correspondence to client file', 9)
) AS item(title, sort_order)
WHERE t.name = 'SARS Audit Response'
ON CONFLICT DO NOTHING;

-- Dividends Tax Return
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Dividends Tax Return (DTR)', 'Submit dividends tax return to SARS', 'sars_dividends_tax', 'sars', 'medium', 5, 26)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Confirm dividend declared and date of payment', 1),
  ('Calculate dividends tax at 20% (or reduced rate if DTA)', 2),
  ('Check for exempt shareholders (DTR02)', 3),
  ('Complete DTR01/DTR02 on eFiling', 4),
  ('Submit and make payment within required period', 5),
  ('Download confirmation', 6),
  ('Save to client file', 7)
) AS item(title, sort_order)
WHERE t.name = 'Dividends Tax Return (DTR)'
ON CONFLICT DO NOTHING;

-- SARS New Registration
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('SARS New Registration', 'Register new entity for tax (IT, PAYE, VAT, etc.)', 'sars_new_registration', 'sars', 'high', 10, 27)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain CIPC registration documents', 1),
  ('Obtain director/member ID copies and proof of address', 2),
  ('Determine which tax types to register (IT, PAYE, UIF, SDL, VAT)', 3),
  ('Complete registration on SARS eFiling or at branch', 4),
  ('Submit supporting documents', 5),
  ('Activate eFiling profile for new entity', 6),
  ('Confirm registration numbers received', 7),
  ('Set up recurring filing reminders', 8),
  ('Notify client with registration details', 9)
) AS item(title, sort_order)
WHERE t.name = 'SARS New Registration'
ON CONFLICT DO NOTHING;

-- Transfer Duty
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Transfer Duty', 'Submit transfer duty declaration to SARS', 'sars_transfer_duty', 'sars', 'high', 14, 28)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain sale agreement / transaction details', 1),
  ('Calculate transfer duty payable', 2),
  ('Complete TD declaration on eFiling', 3),
  ('Submit declaration', 4),
  ('Make payment to SARS', 5),
  ('Download transfer duty receipt', 6),
  ('Provide receipt to conveyancers', 7),
  ('Save to client file', 8)
) AS item(title, sort_order)
WHERE t.name = 'Transfer Duty'
ON CONFLICT DO NOTHING;


-- ============================================================
-- TRUST TEMPLATES
-- ============================================================

-- Trust Registration
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Trust Registration', 'Register new trust with Master of the High Court', 'trust_registration', 'trusts', 'high', 30, 30)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Draft trust deed', 1),
  ('Obtain ID copies for founder, trustees and beneficiaries', 2),
  ('Obtain proof of address for all trustees', 3),
  ('Prepare J401 application form', 4),
  ('Submit trust deed and J401 to Master''s Office', 5),
  ('Pay Master''s Office fees', 6),
  ('Monitor and follow up with Master''s Office', 7),
  ('Obtain Letters of Authority', 8),
  ('Register trust for tax at SARS (ITR12T)', 9),
  ('Open trust bank account', 10),
  ('Save all documents to client file', 11),
  ('Notify client with trust registration details', 12)
) AS item(title, sort_order)
WHERE t.name = 'Trust Registration'
ON CONFLICT DO NOTHING;

-- Trust Annual Tax Return
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Trust Tax Return (ITR12T)', 'Annual trust income tax return', 'trust_itr12t', 'trusts', 'high', 21, 31)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain trust financial records for the year', 1),
  ('Determine income distribution to beneficiaries', 2),
  ('Prepare trust financial statements', 3),
  ('Calculate taxable income (trust vs beneficiary)', 4),
  ('Complete ITR12T on eFiling', 5),
  ('Review before submission', 6),
  ('Submit ITR12T', 7),
  ('Download acknowledgement', 8),
  ('Check assessment when issued', 9),
  ('Advise trustees of result and any payment due', 10)
) AS item(title, sort_order)
WHERE t.name = 'Trust Tax Return (ITR12T)'
ON CONFLICT DO NOTHING;

-- Trust Amendment
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Trust Amendment', 'Amend trust deed or change trustees', 'trust_amendment', 'trusts', 'medium', 21, 32)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Review trust deed for amendment provisions', 1),
  ('Draft deed of amendment / trustee resolution', 2),
  ('Obtain new trustee ID and proof of address (if applicable)', 3),
  ('Prepare J401 amendment form', 4),
  ('Submit amendment to Master''s Office', 5),
  ('Follow up with Master''s Office', 6),
  ('Obtain updated Letters of Authority', 7),
  ('Update bank signatories if needed', 8),
  ('Save all documents to client file', 9)
) AS item(title, sort_order)
WHERE t.name = 'Trust Amendment'
ON CONFLICT DO NOTHING;


-- ============================================================
-- LABOUR TEMPLATES (NEW CATEGORY)
-- ============================================================

-- UIF Registration
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('UIF Registration', 'Register employer for UIF with Department of Labour', 'labour_uif_registration', 'labour', 'high', 10, 40)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain company registration documents (CoR14.3)', 1),
  ('Obtain director ID copies', 2),
  ('Complete UI-8 employer registration form', 3),
  ('Submit registration to Department of Labour', 4),
  ('Obtain UIF reference number', 5),
  ('Register on uFiling portal', 6),
  ('Set up monthly UIF declaration schedule', 7),
  ('Notify client with UIF registration details', 8)
) AS item(title, sort_order)
WHERE t.name = 'UIF Registration'
ON CONFLICT DO NOTHING;

-- UIF Monthly Declaration (uFiling)
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('UIF Monthly Declaration (uFiling)', 'Monthly UIF declaration via uFiling portal', 'labour_uif_monthly', 'labour', 'high', 3, 41)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain payroll summary for the month', 1),
  ('Log in to uFiling portal', 2),
  ('Capture employee details and earnings', 3),
  ('Verify UIF contributions (1% employee + 1% employer)', 4),
  ('Submit UI-19 declaration', 5),
  ('Make UIF payment', 6),
  ('Download proof of submission and payment', 7),
  ('Save to client file', 8)
) AS item(title, sort_order)
WHERE t.name = 'UIF Monthly Declaration (uFiling)'
ON CONFLICT DO NOTHING;

-- Return of Earnings (COIDA)
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Return of Earnings (COIDA)', 'Annual Return of Earnings to Compensation Fund (W.As.8)', 'labour_roe_coida', 'labour', 'high', 14, 42)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain annual payroll totals and employee count', 1),
  ('Determine applicable COIDA class and assessment rate', 2),
  ('Complete W.As.8 Return of Earnings form', 3),
  ('Submit return online or to Compensation Commissioner', 4),
  ('Calculate assessment amount due', 5),
  ('Make payment to Compensation Fund', 6),
  ('Download Letter of Good Standing', 7),
  ('Save all documents to client file', 8),
  ('Notify client of completion and assessment amount', 9)
) AS item(title, sort_order)
WHERE t.name = 'Return of Earnings (COIDA)'
ON CONFLICT DO NOTHING;

-- Workmen's Compensation Registration
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Workmen''s Compensation Registration', 'Register employer with Compensation Fund (COIDA)', 'labour_wc_registration', 'labour', 'high', 14, 43)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain company registration documents', 1),
  ('Obtain director ID copies', 2),
  ('Determine industry classification and COIDA class', 3),
  ('Complete W.As.2 registration form', 4),
  ('Submit registration to Compensation Commissioner', 5),
  ('Obtain COIDA registration number', 6),
  ('Make initial assessment payment', 7),
  ('Obtain Letter of Good Standing', 8),
  ('Set up annual Return of Earnings reminder', 9),
  ('Notify client with registration details', 10)
) AS item(title, sort_order)
WHERE t.name = 'Workmen''s Compensation Registration'
ON CONFLICT DO NOTHING;

-- Workmen's Compensation Claim
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Workmen''s Compensation Claim', 'Submit COIDA claim for workplace injury', 'labour_wc_claim', 'labour', 'urgent', 14, 44)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain incident report and medical report (W.Cl.2)', 1),
  ('Complete employer''s report of accident (W.Cl.1)', 2),
  ('Submit claim to Compensation Commissioner within 7 days', 3),
  ('Submit W.Cl.4 (First Medical Report) from doctor', 4),
  ('Follow up on claim status', 5),
  ('Submit progress/final medical reports as received', 6),
  ('Track payment of compensation if approved', 7),
  ('Save all documents to client file', 8)
) AS item(title, sort_order)
WHERE t.name = 'Workmen''s Compensation Claim'
ON CONFLICT DO NOTHING;

-- Rand Mutual Assurance (RMA) Return of Earnings
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('RMA Return of Earnings', 'Annual Return of Earnings to Rand Mutual Assurance', 'labour_rma_roe', 'labour', 'high', 14, 45)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Confirm client is registered with RMA (mining/construction)', 1),
  ('Obtain annual payroll totals and employee details', 2),
  ('Log in to RMA Online portal', 3),
  ('Complete Return of Earnings submission', 4),
  ('Verify assessment rate and amount due', 5),
  ('Submit return', 6),
  ('Make payment to RMA', 7),
  ('Download Letter of Good Standing', 8),
  ('Save to client file', 9)
) AS item(title, sort_order)
WHERE t.name = 'RMA Return of Earnings'
ON CONFLICT DO NOTHING;

-- Employment Equity Report
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Employment Equity Report (EEA2/EEA4)', 'Annual Employment Equity reporting to DoL', 'labour_ee_report', 'labour', 'medium', 14, 46)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Verify if employer meets EE threshold (50+ employees or turnover)', 1),
  ('Obtain employee demographic data', 2),
  ('Prepare EEA2 (Employment Equity Report)', 3),
  ('Prepare EEA4 (Income Differentials Statement)', 4),
  ('Submit on Department of Labour online portal', 5),
  ('Download proof of submission', 6),
  ('Review EE Plan compliance', 7),
  ('Save to client file', 8)
) AS item(title, sort_order)
WHERE t.name = 'Employment Equity Report (EEA2/EEA4)'
ON CONFLICT DO NOTHING;

-- Workplace Skills Plan (WSP) & ATR
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Workplace Skills Plan (WSP/ATR)', 'Annual WSP and Annual Training Report submission', 'labour_wsp_atr', 'labour', 'medium', 14, 47)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Identify applicable SETA for the employer', 1),
  ('Obtain training records for the past year (ATR)', 2),
  ('Prepare Workplace Skills Plan for coming year', 3),
  ('Compile Annual Training Report', 4),
  ('Submit WSP/ATR to SETA by 30 April', 5),
  ('Download confirmation of submission', 6),
  ('Follow up on discretionary grant if applicable', 7),
  ('Save to client file', 8)
) AS item(title, sort_order)
WHERE t.name = 'Workplace Skills Plan (WSP/ATR)'
ON CONFLICT DO NOTHING;

-- CCMA Matter
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('CCMA Matter', 'Handle CCMA referral / conciliation / arbitration', 'labour_ccma', 'labour', 'urgent', 30, 48)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Review CCMA referral notice and grounds', 1),
  ('Gather employment records and documentation', 2),
  ('Prepare employer response / statement of case', 3),
  ('Attend conciliation hearing', 4),
  ('If unresolved, prepare for arbitration', 5),
  ('Attend arbitration hearing', 6),
  ('Review and advise on CCMA award', 7),
  ('Implement outcome or advise on review/appeal', 8),
  ('Save all correspondence and documents', 9)
) AS item(title, sort_order)
WHERE t.name = 'CCMA Matter'
ON CONFLICT DO NOTHING;


-- ============================================================
-- PAYROLL TEMPLATES (additional)
-- ============================================================

-- New Employee Registration (SARS)
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('New Employee Registration', 'Register new employee on payroll and SARS', 'payroll_new_employee', 'payroll', 'medium', 3, 50)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain employment contract', 1),
  ('Obtain employee ID copy and tax number', 2),
  ('Obtain banking details for salary payment', 3),
  ('Register employee on payroll system', 4),
  ('Verify tax directive if applicable (IRP3(a))', 5),
  ('Register on UIF (uFiling) if first employee', 6),
  ('Set up on SARS eFiling EMP201', 7),
  ('Notify client of completion', 8)
) AS item(title, sort_order)
WHERE t.name = 'New Employee Registration'
ON CONFLICT DO NOTHING;

-- Employee Termination / Tax Directive
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Employee Termination', 'Process employee termination and final payroll', 'payroll_termination', 'payroll', 'high', 5, 51)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Verify termination date and type (resignation/dismissal/retrenchment)', 1),
  ('Calculate final salary, leave pay, notice pay', 2),
  ('Apply for tax directive if lump sum payout (IRP3(a))', 3),
  ('Process final payroll run', 4),
  ('Generate final IRP5 certificate', 5),
  ('Update UIF records (uFiling)', 6),
  ('Issue UI-19 (UIF certificate) to employee', 7),
  ('Provide employee with IRP5 and payslips', 8),
  ('Save to client file', 9)
) AS item(title, sort_order)
WHERE t.name = 'Employee Termination'
ON CONFLICT DO NOTHING;

-- Payroll Tax Year-End
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Payroll Tax Year-End', 'Annual payroll tax year-end processing and EMP501', 'payroll_year_end', 'payroll', 'high', 14, 52)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Reconcile all EMP201 submissions for the tax year', 1),
  ('Verify payroll totals match SARS submissions', 2),
  ('Generate IRP5/IT3(a) certificates for all employees', 3),
  ('Review all certificates for accuracy', 4),
  ('Submit EMP501 annual reconciliation on eFiling', 5),
  ('Address any validation errors', 6),
  ('Download final EMP501 confirmation', 7),
  ('Distribute IRP5 certificates to employees', 8),
  ('Reconcile UIF annual totals', 9),
  ('Save all to client file', 10)
) AS item(title, sort_order)
WHERE t.name = 'Payroll Tax Year-End'
ON CONFLICT DO NOTHING;


-- ============================================================
-- ACCOUNTING TEMPLATES (additional)
-- ============================================================

-- Monthly Management Accounts
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Monthly Management Accounts', 'Prepare monthly management accounts', 'accounting_management', 'accounting', 'medium', 7, 60)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain bank statements for the month', 1),
  ('Process all transactions and reconcile bank', 2),
  ('Review debtors and creditors', 3),
  ('Process month-end journals', 4),
  ('Prepare income statement and balance sheet', 5),
  ('Compare to budget / prior period', 6),
  ('Prepare management commentary', 7),
  ('Send to client for review', 8)
) AS item(title, sort_order)
WHERE t.name = 'Monthly Management Accounts'
ON CONFLICT DO NOTHING;

-- Monthly Bookkeeping
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Monthly Bookkeeping', 'Process monthly bookkeeping and bank reconciliation', 'accounting_bookkeeping', 'accounting', 'medium', 5, 61)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Obtain source documents (invoices, receipts, bank statements)', 1),
  ('Capture all income and expense transactions', 2),
  ('Reconcile bank account(s)', 3),
  ('Reconcile petty cash if applicable', 4),
  ('Review and correct any discrepancies', 5),
  ('Generate trial balance', 6),
  ('Save backup and reports to client file', 7)
) AS item(title, sort_order)
WHERE t.name = 'Monthly Bookkeeping'
ON CONFLICT DO NOTHING;

-- Independent Review
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Independent Review (ISRE 2400)', 'Perform independent review of financial statements', 'accounting_independent_review', 'accounting', 'high', 21, 62)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Issue engagement letter', 1),
  ('Obtain trial balance and financial statements', 2),
  ('Perform analytical procedures', 3),
  ('Make enquiries of management', 4),
  ('Review accounting policies', 5),
  ('Review subsequent events', 6),
  ('Obtain management representations', 7),
  ('Draft independent review report', 8),
  ('Partner review and sign-off', 9),
  ('Issue final review report', 10),
  ('Save all working papers to client file', 11)
) AS item(title, sort_order)
WHERE t.name = 'Independent Review (ISRE 2400)'
ON CONFLICT DO NOTHING;

-- Audit Preparation
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Audit Preparation Pack', 'Prepare audit file and supporting schedules', 'accounting_audit_prep', 'accounting', 'high', 14, 63)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Prepare final trial balance', 1),
  ('Reconcile all bank accounts', 2),
  ('Prepare debtors and creditors aged analysis', 3),
  ('Prepare fixed asset register and depreciation schedule', 4),
  ('Reconcile loan accounts', 5),
  ('Prepare tax computation', 6),
  ('Compile supporting schedules for all balance sheet items', 7),
  ('Gather confirmations (bank, debtors, creditors)', 8),
  ('Prepare management representation letter', 9),
  ('Package audit file for auditors', 10)
) AS item(title, sort_order)
WHERE t.name = 'Audit Preparation Pack'
ON CONFLICT DO NOTHING;


-- ============================================================
-- ADVISORY TEMPLATES
-- ============================================================

-- Tax Planning Consultation
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Tax Planning Consultation', 'Tax planning and advisory session', 'advisory_tax_planning', 'advisory', 'medium', 7, 70)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Review client''s current tax position', 1),
  ('Identify tax planning opportunities', 2),
  ('Research applicable legislation and rulings', 3),
  ('Prepare tax planning memo / recommendations', 4),
  ('Meet with client to discuss options', 5),
  ('Implement agreed actions', 6),
  ('Document advice given', 7)
) AS item(title, sort_order)
WHERE t.name = 'Tax Planning Consultation'
ON CONFLICT DO NOTHING;

-- Business Restructuring
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Business Restructuring', 'Advise on business restructuring / reorganisation', 'advisory_restructuring', 'advisory', 'medium', 30, 71)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Understand client''s objectives and current structure', 1),
  ('Analyse tax implications of proposed restructure', 2),
  ('Review Companies Act and other regulatory requirements', 3),
  ('Prepare restructuring proposal', 4),
  ('Present to client and obtain approval', 5),
  ('Implement CIPC changes (if applicable)', 6),
  ('Implement SARS changes (if applicable)', 7),
  ('Update all registrations and records', 8),
  ('Document the restructuring', 9)
) AS item(title, sort_order)
WHERE t.name = 'Business Restructuring'
ON CONFLICT DO NOTHING;


-- ============================================================
-- B-BBEE TEMPLATES (NEW CATEGORY)
-- ============================================================

-- B-BBEE Sworn Affidavit (EME)
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('B-BBEE Sworn Affidavit (EME)', 'Prepare B-BBEE sworn affidavit for Exempted Micro Enterprise', 'bbbee_eme_affidavit', 'bbbee', 'medium', 5, 80)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Verify turnover is below R10 million (EME threshold)', 1),
  ('Determine ownership percentage (black ownership)', 2),
  ('Determine B-BBEE level based on ownership', 3),
  ('Prepare sworn affidavit using prescribed format', 4),
  ('Have affidavit signed by directors', 5),
  ('Commission affidavit before Commissioner of Oaths', 6),
  ('Provide certified copy to client', 7),
  ('Save to client file', 8)
) AS item(title, sort_order)
WHERE t.name = 'B-BBEE Sworn Affidavit (EME)'
ON CONFLICT DO NOTHING;

-- B-BBEE Verification (QSE / Generic)
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('B-BBEE Verification', 'B-BBEE verification for QSE or Generic enterprise', 'bbbee_verification', 'bbbee', 'medium', 30, 81)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Determine entity size (QSE vs Generic)', 1),
  ('Gather ownership and management information', 2),
  ('Compile skills development records', 3),
  ('Compile enterprise and supplier development records', 4),
  ('Compile socio-economic development records', 5),
  ('Prepare B-BBEE file for verification agency', 6),
  ('Liaise with SANAS-accredited verification agency', 7),
  ('Respond to verification queries', 8),
  ('Obtain B-BBEE certificate', 9),
  ('Save certificate and supporting docs to client file', 10)
) AS item(title, sort_order)
WHERE t.name = 'B-BBEE Verification'
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECRETARIAL TEMPLATES (NEW CATEGORY)
-- ============================================================

-- Annual General Meeting
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Annual General Meeting (AGM)', 'Prepare and hold Annual General Meeting', 'secretarial_agm', 'secretarial', 'medium', 21, 85)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Prepare AGM notice to shareholders (15 business days)', 1),
  ('Prepare agenda', 2),
  ('Prepare financial statements for presentation', 3),
  ('Prepare director''s report', 4),
  ('Prepare proposed resolutions', 5),
  ('Distribute AGM pack to shareholders', 6),
  ('Hold AGM (in person or electronic)', 7),
  ('Record minutes of meeting', 8),
  ('File resolutions with CIPC if required', 9),
  ('Distribute signed minutes', 10)
) AS item(title, sort_order)
WHERE t.name = 'Annual General Meeting (AGM)'
ON CONFLICT DO NOTHING;

-- Board Resolution
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Board / Shareholder Resolution', 'Draft and execute board or shareholder resolution', 'secretarial_resolution', 'secretarial', 'medium', 5, 86)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Determine type of resolution (ordinary/special)', 1),
  ('Draft resolution', 2),
  ('Circulate to directors/shareholders for review', 3),
  ('Obtain signatures (or hold meeting and vote)', 4),
  ('File with CIPC if special resolution (CoR26)', 5),
  ('Update statutory records', 6),
  ('Save signed resolution to client file', 7)
) AS item(title, sort_order)
WHERE t.name = 'Board / Shareholder Resolution'
ON CONFLICT DO NOTHING;


-- ============================================================
-- BANKING TEMPLATES (NEW CATEGORY)
-- ============================================================

-- Bank Confirmation Letter
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Bank Confirmation Letter', 'Prepare confirmation letter for bank requirements', 'banking_confirmation', 'banking', 'medium', 5, 90)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Confirm what information bank requires', 1),
  ('Prepare financial information / letter', 2),
  ('Review for accuracy', 3),
  ('Get partner/director sign-off', 4),
  ('Issue letter to client / bank', 5),
  ('Save copy to client file', 6)
) AS item(title, sort_order)
WHERE t.name = 'Bank Confirmation Letter'
ON CONFLICT DO NOTHING;

-- New Bank Account Application
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('New Bank Account Application', 'Assist with opening new bank account', 'banking_new_account', 'banking', 'medium', 10, 91)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Gather FICA documents (IDs, proof of address, company docs)', 1),
  ('Prepare company resolution for bank account opening', 2),
  ('Complete bank application forms', 3),
  ('Submit application to bank', 4),
  ('Follow up on account opening', 5),
  ('Confirm account details received', 6),
  ('Set up internet banking if required', 7),
  ('Save details to client file', 8)
) AS item(title, sort_order)
WHERE t.name = 'New Bank Account Application'
ON CONFLICT DO NOTHING;


-- ============================================================
-- GENERAL TEMPLATES
-- ============================================================

-- Client Onboarding
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Client Onboarding', 'New client onboarding and setup', 'general_onboarding', 'general', 'high', 7, 95)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Collect FICA/KYC documents (IDs, proof of address)', 1),
  ('Issue engagement letter / mandate', 2),
  ('Obtain signed mandate', 3),
  ('Collect company registration documents', 4),
  ('Obtain SARS eFiling access or power of attorney', 5),
  ('Obtain CIPC access credentials if needed', 6),
  ('Set up client in practice management system', 7),
  ('Identify all recurring jobs/deadlines', 8),
  ('Create job register entries for all services', 9),
  ('Welcome pack / introduction email to client', 10)
) AS item(title, sort_order)
WHERE t.name = 'Client Onboarding'
ON CONFLICT DO NOTHING;

-- Ad-hoc Query
INSERT INTO job_templates (name, description, job_type, category, default_priority, estimated_days, sort_order)
VALUES ('Ad-hoc Query', 'Handle ad-hoc client query or request', 'general_adhoc', 'general', 'low', 3, 96)
ON CONFLICT DO NOTHING;

INSERT INTO job_template_checklist (template_id, title, sort_order, is_required)
SELECT t.id, item.title, item.sort_order, true
FROM job_templates t
CROSS JOIN (VALUES
  ('Record client query details', 1),
  ('Research / prepare response', 2),
  ('Respond to client', 3),
  ('Record time spent', 4),
  ('Save correspondence to client file', 5)
) AS item(title, sort_order)
WHERE t.name = 'Ad-hoc Query'
ON CONFLICT DO NOTHING;


-- ************************************************************
-- PART 3: NEW DOCUMENT CATEGORIES (additions to existing)
-- ************************************************************

-- 3A. New top-level parent categories
INSERT INTO document_categories (name, parent_id, icon, description, sort_order) VALUES
  ('Labour', NULL, '👷', 'Department of Labour, UIF, COIDA and related documents', 8),
  ('Accounting', NULL, '📒', 'Financial statements, management accounts, working papers', 9),
  ('B-BBEE', NULL, '🤝', 'Broad-Based Black Economic Empowerment documents', 10),
  ('Secretarial', NULL, '📋', 'Company secretarial, resolutions, minutes', 11),
  ('Insurance', NULL, '🛡️', 'Business and professional insurance documents', 12)
ON CONFLICT DO NOTHING;

-- 3B. Sub-categories for Labour
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('UIF Registration & Declarations', '📋', 'UI-8, UI-19 and uFiling documents', 1),
  ('Return of Earnings (COIDA)', '📊', 'W.As.8 Return of Earnings and assessments', 2),
  ('Workmen''s Compensation', '🏥', 'COIDA registration, claims, letters of good standing', 3),
  ('Rand Mutual Assurance (RMA)', '⛏️', 'RMA returns and correspondence', 4),
  ('Employment Equity', '📈', 'EEA2, EEA4 reports and plans', 5),
  ('Workplace Skills Plan (WSP/ATR)', '🎓', 'WSP, ATR and SETA correspondence', 6),
  ('CCMA', '⚖️', 'CCMA referrals, awards and settlements', 7)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Labour' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 3C. Sub-categories for Accounting
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Financial Statements', '📄', 'Annual financial statements (AFS)', 1),
  ('Management Accounts', '📊', 'Monthly/quarterly management accounts', 2),
  ('Trial Balances', '📋', 'Trial balance reports', 3),
  ('Working Papers', '📝', 'Audit/review working papers and schedules', 4),
  ('Audit / Review Reports', '✅', 'Independent review and audit reports', 5),
  ('General Ledger', '📒', 'General ledger printouts and extracts', 6)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Accounting' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 3D. Sub-categories for B-BBEE
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('B-BBEE Certificates', '📜', 'B-BBEE verification certificates', 1),
  ('Sworn Affidavits (EME)', '📝', 'B-BBEE sworn affidavits for EMEs', 2),
  ('Verification Reports', '📊', 'Detailed B-BBEE verification reports', 3),
  ('Ownership & Management', '👥', 'Ownership and management control documents', 4)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'B-BBEE' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 3E. Sub-categories for Secretarial
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Board Resolutions', '📋', 'Board and director resolutions', 1),
  ('Meeting Minutes', '📝', 'AGM and board meeting minutes', 2),
  ('Shareholder Agreements', '🤝', 'Shareholder and member agreements', 3),
  ('MOI / CK Documents', '📜', 'Memorandum of Incorporation and founding statements', 4),
  ('Share Registers', '📊', 'Share register and transfer records', 5)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Secretarial' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 3F. Sub-categories for Insurance
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Professional Indemnity', '🛡️', 'PI insurance policies and renewals', 1),
  ('Business Insurance', '🏢', 'Business insurance policies and schedules', 2),
  ('Claims Documentation', '📋', 'Insurance claim submissions and correspondence', 3)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Insurance' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 3G. Additional sub-categories for EXISTING parents

-- Additional Identity Documents subs
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Marriage Certificates', '💍', 'Marriage certificates and ANC agreements', 4),
  ('Trust Beneficiary IDs', '👤', 'ID copies for trust beneficiaries', 5)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Identity Documents' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Additional CIPC subs
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('MOI / CK Founding Statements', '📜', 'Memorandum of Incorporation and CK documents', 6),
  ('Company Profiles', '🏢', 'CIPC company profile printouts', 7)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'CIPC' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Additional SARS subs
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Provisional Tax (IRP6)', '📅', 'Provisional tax submissions and calculations', 7),
  ('Objections & Appeals', '⚖️', 'SARS dispute, objection and appeal documents', 8),
  ('Tax Directives', '📋', 'Tax directive applications and approvals', 9),
  ('Dividends Tax', '💰', 'DTR01, DTR02 and dividend declarations', 10),
  ('Transfer Duty', '🏠', 'Transfer duty declarations and receipts', 11),
  ('SARS Correspondence', '✉️', 'General SARS letters and audit correspondence', 12)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'SARS' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Additional Trusts subs
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Trust Tax Returns (ITR12T)', '📊', 'Trust income tax returns', 5),
  ('Trust Amendments', '📝', 'Deeds of amendment to trust deeds', 6)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Trusts' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Additional Payroll subs
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('IRP5 Certificates', '📄', 'Employee tax certificates', 5),
  ('EMP501 Reconciliation', '📊', 'Bi-annual employer reconciliation filings', 6),
  ('Leave Records', '📅', 'Employee leave records and balances', 7)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Payroll' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Additional Banking subs
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Loan Agreements', '📝', 'Loan agreements and facility letters', 4),
  ('Signing Mandates', '✍️', 'Bank signing authority mandates', 5)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Banking' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Additional General subs
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Engagement Letters', '✍️', 'Signed engagement letters and mandates', 5),
  ('Proposals & Quotes', '📋', 'Fee proposals and quotations', 6)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'General' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;


-- ************************************************************
-- PART 4: UPDATE JOB_TYPES TABLE (Timesheet billing rates)
-- ************************************************************
-- Add missing job types for billing
-- First ensure the default_rate column exists (may be missing in production)
ALTER TABLE job_types ADD COLUMN IF NOT EXISTS default_rate NUMERIC(10,2);

INSERT INTO job_types (id, name, description, default_rate, is_active)
VALUES
  (gen_random_uuid(), 'Labour / UIF',          'UIF, COIDA, Return of Earnings',    500.00, true),
  (gen_random_uuid(), 'Trust Administration',   'Trust registration and administration', 650.00, true),
  (gen_random_uuid(), 'Secretarial',            'Company secretarial services',      400.00, true),
  (gen_random_uuid(), 'B-BBEE',                 'B-BBEE affidavits and verification', 450.00, true),
  (gen_random_uuid(), 'Tax Advisory',           'Tax planning and advisory',         900.00, true),
  (gen_random_uuid(), 'Banking',                'Bank letters and confirmations',    350.00, true),
  (gen_random_uuid(), 'SARS Dispute',           'Objections, disputes and audit responses', 850.00, true),
  (gen_random_uuid(), 'Company Registration',   'New company registration and CIPC', 600.00, true),
  (gen_random_uuid(), 'Employee Termination',   'Termination processing and tax directives', 500.00, true),
  (gen_random_uuid(), 'Transfer Duty',          'Transfer duty calculations and submissions', 600.00, true)
ON CONFLICT DO NOTHING;
