-- ============================================
-- Document Categories & Tagging System
-- ============================================
-- Supports hierarchical categories (parent/child)
-- and many-to-many tagging of documents to categories

-- 1. Document Categories table (admin-managed)
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  icon VARCHAR(10) DEFAULT '📁',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for parent lookups (hierarchy navigation)
CREATE INDEX IF NOT EXISTS idx_document_categories_parent ON document_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_active ON document_categories(is_active);

-- 2. Junction table: many-to-many document <-> category tags
CREATE TABLE IF NOT EXISTS document_category_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES document_categories(id) ON DELETE CASCADE,
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  tagged_by UUID,
  UNIQUE(document_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_cat_tags_document ON document_category_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_cat_tags_category ON document_category_tags(category_id);

-- 3. Seed default categories
INSERT INTO document_categories (name, parent_id, icon, description, sort_order) VALUES
  ('Identity Documents', NULL, '🆔', 'ID documents for directors, members, trustees', 1),
  ('CIPC', NULL, '🏛️', 'Companies and Intellectual Property Commission documents', 2),
  ('SARS', NULL, '📊', 'South African Revenue Service documents', 3),
  ('Trusts', NULL, '🏦', 'Trust administration documents', 4),
  ('Payroll', NULL, '💰', 'Payroll and employment documents', 5),
  ('Banking', NULL, '🏧', 'Banking and financial documents', 6),
  ('General', NULL, '📄', 'General correspondence and other documents', 7)
ON CONFLICT DO NOTHING;

-- 4. Seed sub-categories
-- Identity Documents sub-categories
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Directors / Members IDs', '👤', 'ID documents for company directors and members', 1),
  ('Proof of Address', '🏠', 'Proof of residential address documents', 2),
  ('Passport Copies', '🛂', 'Passport copies for directors and members', 3)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Identity Documents' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- CIPC sub-categories
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Registration Documents', '📜', 'CoR14.3, CoR15.3 and other registration docs', 1),
  ('Annual Returns', '📅', 'CIPC Annual Return filings', 2),
  ('Beneficial Ownership', '👥', 'BO-1 forms, BO registers, disclosure docs', 3),
  ('Director Changes', '🔄', 'CoR39 and related director change documents', 4),
  ('Share Certificates & Registers', '📋', 'Share certificates, share registers', 5)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'CIPC' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- SARS sub-categories
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Tax Returns', '📝', 'ITR12, IT14 and other tax return submissions', 1),
  ('Assessments', '📑', 'Tax assessments from SARS', 2),
  ('Tax Clearance', '✅', 'Tax Compliance Certificates (TCC)', 3),
  ('IRP5s & IT3s', '📄', 'Employee tax certificates and investment certificates', 4),
  ('VAT', '💳', 'VAT201 returns and VAT related documents', 5),
  ('EMP201 / EMP501', '👷', 'Monthly and annual employer reconciliation', 6)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'SARS' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Trusts sub-categories
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Trust Deed', '📜', 'Original and amended trust deeds', 1),
  ('Letters of Authority', '✉️', 'Master of the High Court letters of authority', 2),
  ('Resolutions', '📋', 'Trust resolutions', 3),
  ('Master''s Office Correspondence', '🏛️', 'Letters and filings with the Master', 4)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Trusts' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Payroll sub-categories
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Employment Contracts', '📝', 'Employment agreements and contracts', 1),
  ('Payslips', '💵', 'Monthly payslip records', 2),
  ('UIF Declarations', '📋', 'UIF registration and declarations', 3),
  ('SDL Returns', '📊', 'Skills Development Levy returns', 4)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Payroll' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- Banking sub-categories
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Bank Statements', '📊', 'Monthly bank account statements', 1),
  ('Confirmations', '✅', 'Bank confirmation letters', 2),
  ('Account Applications', '📝', 'New account application documents', 3)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'Banking' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- General sub-categories
INSERT INTO document_categories (name, parent_id, icon, description, sort_order)
SELECT sub.name, p.id, sub.icon, sub.description, sub.sort_order
FROM document_categories p
CROSS JOIN (VALUES
  ('Correspondence', '✉️', 'General letters and correspondence', 1),
  ('Invoices', '🧾', 'Client invoices and billing documents', 2),
  ('Mandates', '✍️', 'Signed mandates and authorisation documents', 3),
  ('Other', '📎', 'Uncategorised documents', 4)
) AS sub(name, icon, description, sort_order)
WHERE p.name = 'General' AND p.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 5. Disable RLS for development (matching existing pattern)
ALTER TABLE document_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_category_tags DISABLE ROW LEVEL SECURITY;
