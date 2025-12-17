-- ============================================
-- USER MANAGEMENT & AUTHENTICATION SYSTEM
-- Migration for existing database
-- ============================================

-- Step 1: Add new columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID;

-- Make full_name nullable (we use first_name/last_name now)
ALTER TABLE users ALTER COLUMN full_name DROP NOT NULL;

-- Update role column to have proper check constraint (if needed)
-- First drop existing constraint if any
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'consultant', 'accounts', 'user'));

-- Populate first_name and last_name from full_name if they exist
UPDATE users 
SET first_name = split_part(COALESCE(full_name, email), ' ', 1),
    last_name = COALESCE(NULLIF(split_part(COALESCE(full_name, ''), ' ', 2), ''), 'User')
WHERE first_name IS NULL;

-- Make first_name and last_name NOT NULL after populating
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token);

-- Step 2: Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  UNIQUE(user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_key ON user_permissions(permission_key);

-- Step 3: Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Insert default permissions
INSERT INTO permissions (key, name, description, category) VALUES
-- Core Modules
('access_dashboard', 'Access Dashboard', 'View analytics dashboard', 'core'),
('access_customers', 'Manage Customers', 'Create and manage customers', 'core'),
('access_cipc', 'Manage CIPC', 'Handle CIPC filings', 'core'),
('access_calendar', 'Access Calendar', 'View and manage calendar', 'core'),
('access_documents', 'Manage Documents', 'Upload and manage documents', 'core'),

-- Timesheet Module
('access_timesheet', 'Log Time', 'Enter time with timer or manual entry', 'timesheet'),
('access_my_timesheets', 'View My Timesheets', 'View and edit own time entries', 'timesheet'),
('access_all_timesheets', 'View All Timesheets', 'View all consultants time entries', 'timesheet'),
('access_projects', 'Manage Projects', 'Create and manage projects', 'timesheet'),

-- Billing Module
('access_billing_dashboard', 'Billing Dashboard', 'View billing dashboard', 'billing'),
('access_billing_reports', 'Billing Reports', 'View detailed billing reports and analytics', 'billing'),
('create_invoices', 'Create Invoices', 'Mark projects as invoiced', 'billing'),

-- Financial Statements
('access_financial_statements', 'Financial Statements', 'Generate financial statements', 'financial'),

-- Admin
('manage_users', 'Manage Users', 'Invite and manage users', 'admin'),
('manage_permissions', 'Manage Permissions', 'Assign user permissions', 'admin'),
('system_settings', 'System Settings', 'Access system settings', 'admin')
ON CONFLICT (key) DO NOTHING;

-- Step 5: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Disable RLS for development (easier testing)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;

-- Step 7: Grant all permissions to existing admin users
INSERT INTO user_permissions (user_id, permission_key, granted_by)
SELECT u.id, p.key, u.id
FROM users u
CROSS JOIN permissions p
WHERE u.role = 'admin'
ON CONFLICT (user_id, permission_key) DO NOTHING;

-- Step 8: Function to grant default permissions based on role
CREATE OR REPLACE FUNCTION grant_default_permissions_by_role(p_user_id UUID, p_user_role TEXT)
RETURNS VOID AS $$
BEGIN
    -- Consultants get timesheet access
    IF p_user_role = 'consultant' THEN
        INSERT INTO user_permissions (user_id, permission_key, granted_by)
        SELECT p_user_id, key, p_user_id
        FROM permissions
        WHERE category IN ('core', 'timesheet')
        ON CONFLICT (user_id, permission_key) DO NOTHING;
    END IF;
    
    -- Accounts get billing access
    IF p_user_role = 'accounts' THEN
        INSERT INTO user_permissions (user_id, permission_key, granted_by)
        SELECT p_user_id, key, p_user_id
        FROM permissions
        WHERE category IN ('core', 'billing')
        ON CONFLICT (user_id, permission_key) DO NOTHING;
    END IF;
    
    -- Admins get everything
    IF p_user_role = 'admin' THEN
        INSERT INTO user_permissions (user_id, permission_key, granted_by)
        SELECT p_user_id, key, p_user_id
        FROM permissions
        ON CONFLICT (user_id, permission_key) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done! Run this in Supabase SQL Editor
SELECT 'User management schema migration complete!' as status;
