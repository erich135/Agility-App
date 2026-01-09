-- Seed granular permissions for Agility App

-- Create permissions table (safe)
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'core',
  created_at timestamptz DEFAULT now()
);

-- Create user_permissions table (safe)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id uuid NOT NULL,
  permission_key text NOT NULL,
  granted_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, permission_key)
);

-- Core navigation
INSERT INTO public.permissions (key, name, description, category) VALUES
  ('access_dashboard','Dashboard','Access to main dashboard','core'),
  ('access_customers','Customers','View & manage customers','core'),
  ('access_cipc','CIPC','Access CIPC management','core'),
  ('access_calendar','Calendar','Access calendar and tasks','core'),
  ('access_documents','Documents','Access and manage documents','core'),
  ('access_billing_dashboard','Billing','Access billing dashboard','billing'),
  ('access_billing_reports','Billing Reports','View billing reports','billing'),
  ('access_financial_statements','Financial Statements','Access financial statements','financial'),
  ('manage_users','User Management','Invite and manage users','admin'),
  ('manage_permissions','Manage Permissions','Grant or revoke granular permissions','admin'),
  ('system_settings','System Settings','Access system configuration','admin')
ON CONFLICT (key) DO NOTHING;

-- Granular customer permissions
INSERT INTO public.permissions (key, name, description, category) VALUES
  ('customers_view_my','My Customers','View customers assigned to me','customers'),
  ('customers_create','Create Customers','Create new customers','customers'),
  ('customers_edit','Edit Customers','Edit existing customers','customers'),
  ('customers_delete','Delete Customers','Delete customers','customers'),
  ('customers_bulk_assign','Bulk Assign Customers','Bulk assign customers to consultants','customers')
ON CONFLICT (key) DO NOTHING;

-- Time logging permissions
INSERT INTO public.permissions (key, name, description, category) VALUES
  ('log_time','Log Time','Create time entries for customers','timesheet'),
  ('view_time_entries','View Time Entries','View time entries history','timesheet')
ON CONFLICT (key) DO NOTHING;

-- Documents permissions (beyond navigation)
INSERT INTO public.permissions (key, name, description, category) VALUES
  ('documents_view','View Documents','View documents for customers','documents'),
  ('documents_manage','Manage Documents','Upload, edit, and delete documents','documents')
ON CONFLICT (key) DO NOTHING;

-- Example role templates (optional usage in app)
-- Admin template can be all permissions; Consultant minimal set
