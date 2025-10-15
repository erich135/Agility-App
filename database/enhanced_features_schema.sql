-- Enhanced Features Schema for Agility App
-- This includes all tables needed for new features

-- ============================================
-- 1. BILLING & REVENUE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS billing_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_type VARCHAR(50) NOT NULL, -- 'annual_return' or 'beneficial_ownership'
  filing_year INTEGER NOT NULL,
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'ZAR',
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'waived'
  invoice_number VARCHAR(100),
  invoice_date DATE,
  due_date DATE,
  paid_date DATE,
  payment_method VARCHAR(50), -- 'cash', 'eft', 'card', 'other'
  payment_reference VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_billing_client ON billing_info(client_id);
CREATE INDEX idx_billing_status ON billing_info(status);
CREATE INDEX idx_billing_due_date ON billing_info(due_date);

-- ============================================
-- 2. NOTIFICATION SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'sms', 'email', 'whatsapp', 'in_app'
  trigger_event VARCHAR(100) NOT NULL, -- 'filing_due', 'overdue', 'document_uploaded', etc.
  subject VARCHAR(500), -- for email
  body_template TEXT NOT NULL, -- with placeholders like {{client_name}}, {{due_date}}
  days_before INTEGER, -- for reminder notifications
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES directors(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type VARCHAR(50) NOT NULL, -- 'client', 'director', 'admin'
  recipient_id UUID NOT NULL, -- client_id or director_id
  recipient_contact VARCHAR(200), -- email or phone
  notification_type VARCHAR(50) NOT NULL, -- 'sms', 'email', 'whatsapp', 'in_app'
  subject VARCHAR(500),
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'read'
  related_entity_type VARCHAR(50), -- 'client', 'document', 'task'
  related_entity_id UUID,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB, -- additional data like SMS provider response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- client or director
  user_type VARCHAR(50) NOT NULL, -- 'client' or 'director'
  sms_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,
  in_app_enabled BOOLEAN DEFAULT true,
  reminder_days INTEGER[] DEFAULT ARRAY[60, 30, 14, 7, 1], -- days before due date
  quiet_hours_start TIME, -- e.g., '22:00'
  quiet_hours_end TIME, -- e.g., '08:00'
  timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, user_type)
);

-- ============================================
-- 3. DOCUMENT GENERATION & TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  template_type VARCHAR(100) NOT NULL, -- 'ar_form', 'bo_form', 'letter', 'certificate', 'invoice'
  file_format VARCHAR(50) DEFAULT 'pdf', -- 'pdf', 'docx', 'html'
  template_content TEXT, -- HTML or template markup
  placeholders JSONB, -- list of available placeholders
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES directors(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES document_templates(id),
  client_id UUID REFERENCES clients(id),
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(500),
  file_path VARCHAR(1000),
  file_url TEXT,
  file_size INTEGER,
  generated_data JSONB, -- data used to generate the document
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'final', 'sent', 'signed'
  signature_request_id VARCHAR(200), -- for e-signature integration
  signed_at TIMESTAMP WITH TIME ZONE,
  generated_by UUID REFERENCES directors(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generated_docs_client ON generated_documents(client_id);
CREATE INDEX idx_generated_docs_status ON generated_documents(status);

-- ============================================
-- 4. WORKFLOW & TASK MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  workflow_type VARCHAR(100) NOT NULL, -- 'filing', 'document_approval', 'onboarding'
  steps JSONB NOT NULL, -- array of workflow steps with conditions
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES directors(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  task_type VARCHAR(100) NOT NULL, -- 'filing', 'document_review', 'client_contact', 'payment_follow_up'
  priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status VARCHAR(50) DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'completed', 'cancelled'
  client_id UUID REFERENCES clients(id),
  assigned_to UUID REFERENCES directors(id),
  assigned_by UUID REFERENCES directors(id),
  workflow_id UUID REFERENCES workflows(id),
  related_entity_type VARCHAR(50), -- 'filing', 'document', 'client'
  related_entity_id UUID,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(5, 2),
  actual_hours DECIMAL(5, 2),
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_client ON tasks(client_id);

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES directors(id),
  comment TEXT NOT NULL,
  attachments JSONB, -- array of file URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);

-- ============================================
-- 5. CLIENT PORTAL
-- ============================================

CREATE TABLE IF NOT EXISTS client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(500), -- hashed password
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  reset_token VARCHAR(500),
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  email_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email)
);

CREATE TABLE IF NOT EXISTS client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  sender_type VARCHAR(50) NOT NULL, -- 'client' or 'director'
  sender_id UUID NOT NULL,
  subject VARCHAR(500),
  message TEXT NOT NULL,
  attachments JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  parent_message_id UUID REFERENCES client_messages(id), -- for threading
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_messages_client ON client_messages(client_id);
CREATE INDEX idx_client_messages_unread ON client_messages(client_id, is_read);

-- ============================================
-- 6. COMPLIANCE INTELLIGENCE
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  risk_score INTEGER DEFAULT 0, -- 0-100
  risk_level VARCHAR(50) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  factors JSONB, -- reasons for score (late filings, missing docs, etc.)
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id)
);

CREATE TABLE IF NOT EXISTS filing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_type VARCHAR(50) NOT NULL,
  filing_year INTEGER NOT NULL,
  due_date DATE NOT NULL,
  filed_date DATE,
  days_late INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_filing_history_client ON filing_history(client_id);

CREATE TABLE IF NOT EXISTS public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  name VARCHAR(200) NOT NULL,
  country VARCHAR(3) DEFAULT 'ZAR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(holiday_date, country)
);

-- ============================================
-- 7. DOCUMENT MANAGEMENT ENHANCEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_name VARCHAR(500),
  file_path VARCHAR(1000),
  file_url TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES directors(id),
  change_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_document_versions_doc ON document_versions(document_id);

CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES document_categories(id),
  icon VARCHAR(100),
  color VARCHAR(50),
  retention_days INTEGER, -- how long to keep documents
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);

-- Add category to existing documents table (migration)
-- ALTER TABLE documents ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES document_categories(id);
-- ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
-- ALTER TABLE documents ADD COLUMN IF NOT EXISTS retention_date DATE;

-- ============================================
-- 8. COLLABORATION & AUDIT TRAIL
-- ============================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- 'client', 'document', 'task', 'filing'
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES directors(id),
  comment TEXT NOT NULL,
  attachments JSONB,
  is_internal BOOLEAN DEFAULT false, -- internal notes vs client-visible
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES directors(id),
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'view', 'export'
  entity_type VARCHAR(50) NOT NULL, -- 'client', 'document', 'filing', etc.
  entity_id UUID,
  entity_name VARCHAR(500),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_trail(user_id);
CREATE INDEX idx_audit_created ON audit_trail(created_at);

-- ============================================
-- 9. INTEGRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  integration_type VARCHAR(100) NOT NULL, -- 'accounting', 'calendar', 'email', 'storage'
  provider VARCHAR(100), -- 'xero', 'quickbooks', 'google', 'outlook'
  is_active BOOLEAN DEFAULT false,
  credentials JSONB, -- encrypted API keys, tokens
  settings JSONB,
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id),
  sync_type VARCHAR(100),
  status VARCHAR(50), -- 'success', 'error', 'partial'
  records_processed INTEGER,
  error_details TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 10. DASHBOARD & ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES directors(id),
  widget_type VARCHAR(100) NOT NULL, -- 'compliance_overview', 'upcoming_deadlines', 'revenue', etc.
  position INTEGER,
  size VARCHAR(50) DEFAULT 'medium', -- 'small', 'medium', 'large'
  settings JSONB,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_billing_info_updated_at BEFORE UPDATE ON billing_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_risk_scores_updated_at BEFORE UPDATE ON compliance_risk_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default document categories
INSERT INTO document_categories (name, description, retention_days) VALUES
  ('Company Registration', 'Company registration certificates and amendments', 3650),
  ('Annual Returns', 'Annual return submissions', 2190),
  ('Beneficial Ownership', 'Beneficial ownership declarations', 2190),
  ('Financial Statements', 'Company financial statements', 2555),
  ('Tax Documents', 'SARS and tax-related documents', 1825),
  ('Correspondence', 'General correspondence', 730),
  ('ID Documents', 'Identity documents of directors/shareholders', 3650),
  ('Certificates', 'Compliance and other certificates', 1825)
ON CONFLICT (name) DO NOTHING;

-- Insert South African public holidays for 2025-2026
INSERT INTO public_holidays (holiday_date, name, country) VALUES
  ('2025-01-01', 'New Year''s Day', 'ZAR'),
  ('2025-03-21', 'Human Rights Day', 'ZAR'),
  ('2025-04-18', 'Good Friday', 'ZAR'),
  ('2025-04-21', 'Family Day', 'ZAR'),
  ('2025-04-27', 'Freedom Day', 'ZAR'),
  ('2025-05-01', 'Workers'' Day', 'ZAR'),
  ('2025-06-16', 'Youth Day', 'ZAR'),
  ('2025-08-09', 'National Women''s Day', 'ZAR'),
  ('2025-09-24', 'Heritage Day', 'ZAR'),
  ('2025-12-16', 'Day of Reconciliation', 'ZAR'),
  ('2025-12-25', 'Christmas Day', 'ZAR'),
  ('2025-12-26', 'Day of Goodwill', 'ZAR'),
  ('2026-01-01', 'New Year''s Day', 'ZAR'),
  ('2026-03-21', 'Human Rights Day', 'ZAR'),
  ('2026-04-03', 'Good Friday', 'ZAR'),
  ('2026-04-06', 'Family Day', 'ZAR'),
  ('2026-04-27', 'Freedom Day', 'ZAR'),
  ('2026-05-01', 'Workers'' Day', 'ZAR'),
  ('2026-06-16', 'Youth Day', 'ZAR'),
  ('2026-08-09', 'National Women''s Day', 'ZAR'),
  ('2026-09-24', 'Heritage Day', 'ZAR'),
  ('2026-12-16', 'Day of Reconciliation', 'ZAR'),
  ('2026-12-25', 'Christmas Day', 'ZAR'),
  ('2026-12-26', 'Day of Goodwill', 'ZAR')
ON CONFLICT (holiday_date, country) DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_templates (name, type, trigger_event, subject, body_template, days_before) VALUES
  ('AR Due 60 Days', 'email', 'filing_due', 'Annual Return Due in 60 Days', 'Dear {{client_name}},\n\nThis is a reminder that your company''s Annual Return is due on {{due_date}} (60 days from now).\n\nCompany: {{company_name}}\nRegistration: {{registration_number}}\n\nPlease ensure all required documents are submitted on time.\n\nBest regards,\nAgility Team', 60),
  ('AR Due 30 Days', 'sms', 'filing_due', NULL, 'REMINDER: Your Annual Return for {{company_name}} is due in 30 days ({{due_date}}). Contact us if you need assistance.', 30),
  ('AR Due 7 Days', 'email', 'filing_due', 'URGENT: Annual Return Due in 7 Days', 'Dear {{client_name}},\n\nURGENT: Your company''s Annual Return is due in 7 days on {{due_date}}.\n\nPlease contact us immediately if you need assistance.\n\nBest regards,\nAgility Team', 7),
  ('AR Overdue', 'email', 'overdue', 'OVERDUE: Annual Return Past Due Date', 'Dear {{client_name}},\n\nYour company''s Annual Return was due on {{due_date}} and is now OVERDUE.\n\nPlease contact us urgently to avoid penalties.\n\nBest regards,\nAgility Team', 0),
  ('Document Uploaded', 'email', 'document_uploaded', 'Document Uploaded Successfully', 'Dear {{client_name}},\n\nYour document "{{document_name}}" has been uploaded successfully.\n\nThank you for your submission.\n\nBest regards,\nAgility Team', 0)
ON CONFLICT DO NOTHING;
