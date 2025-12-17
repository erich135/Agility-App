-- ============================================
-- USER MANAGEMENT & AUTHENTICATION SYSTEM
-- ============================================

-- Enhanced users table with invitation system
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password_hash TEXT, -- NULL until they set their password
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'consultant', 'accounts', 'user')),
  is_active BOOLEAN DEFAULT true,
  invitation_token TEXT UNIQUE,
  invitation_sent_at TIMESTAMPTZ,
  password_set_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User permissions table for granular access control
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  UNIQUE(user_id, permission_key)
);

-- Available permissions list
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'core', 'timesheet', 'billing', 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default permissions
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_key ON user_permissions(permission_key);

-- Create updated_at trigger
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

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Users: Admins see all, users see themselves
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can insert users" ON users;
CREATE POLICY "Admins can insert users" ON users
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can update users" ON users;
CREATE POLICY "Admins can update users" ON users
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Permissions are readable by all authenticated users
DROP POLICY IF EXISTS "Anyone can view permissions" ON permissions;
CREATE POLICY "Anyone can view permissions" ON permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- User permissions: users see their own, admins see all
DROP POLICY IF EXISTS "Users can view their permissions" ON user_permissions;
CREATE POLICY "Users can view their permissions" ON user_permissions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can manage permissions" ON user_permissions;
CREATE POLICY "Admins can manage permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_id UUID, permission_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_permissions up
        WHERE up.user_id = user_id 
        AND up.permission_key = permission_key 
        AND up.enabled = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant default permissions based on role
CREATE OR REPLACE FUNCTION grant_default_permissions_by_role(user_id UUID, user_role TEXT)
RETURNS VOID AS $$
BEGIN
    -- Consultants get timesheet access
    IF user_role = 'consultant' THEN
        INSERT INTO user_permissions (user_id, permission_key, granted_by)
        SELECT user_id, key, user_id
        FROM permissions
        WHERE category IN ('core', 'timesheet')
        ON CONFLICT (user_id, permission_key) DO NOTHING;
    END IF;
    
    -- Accounts get billing access
    IF user_role = 'accounts' THEN
        INSERT INTO user_permissions (user_id, permission_key, granted_by)
        SELECT user_id, key, user_id
        FROM permissions
        WHERE category IN ('core', 'billing')
        ON CONFLICT (user_id, permission_key) DO NOTHING;
    END IF;
    
    -- Admins get everything
    IF user_role = 'admin' THEN
        INSERT INTO user_permissions (user_id, permission_key, granted_by)
        SELECT user_id, key, user_id
        FROM permissions
        ON CONFLICT (user_id, permission_key) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
