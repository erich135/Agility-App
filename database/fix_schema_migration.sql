-- Database Migration Script to Fix Missing Columns and Schema Issues
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. Add Missing Columns to clients table
-- ============================================

-- Add company_income_tax_number if it doesn't exist
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS company_income_tax_number VARCHAR(50);

-- Add other potentially missing columns
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS paye_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS physical_address TEXT,
ADD COLUMN IF NOT EXISTS postal_address TEXT,
ADD COLUMN IF NOT EXISTS directors TEXT,
ADD COLUMN IF NOT EXISTS shareholders TEXT,
ADD COLUMN IF NOT EXISTS financial_year_end DATE,
ADD COLUMN IF NOT EXISTS share_capital DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS number_of_shares INTEGER,
ADD COLUMN IF NOT EXISTS company_public_officer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS public_officer_id_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_person_telephone VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_person_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- 2. Create Enhanced Features Tables (if not exists)
-- ============================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type VARCHAR(50) NOT NULL,
  recipient_id UUID NOT NULL,
  recipient_contact VARCHAR(200),
  notification_type VARCHAR(50) NOT NULL,
  subject VARCHAR(500),
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  sms_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,
  in_app_enabled BOOLEAN DEFAULT true,
  reminder_days INTEGER[] DEFAULT ARRAY[60, 30, 14, 7, 1],
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, user_type)
);

-- Tasks table (simplified version)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  task_type VARCHAR(100) NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'todo',
  client_id UUID REFERENCES clients(id),
  assigned_to UUID,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Billing info table
CREATE TABLE IF NOT EXISTS billing_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_type VARCHAR(50) NOT NULL,
  filing_year INTEGER NOT NULL,
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'ZAR',
  status VARCHAR(50) DEFAULT 'pending',
  invoice_number VARCHAR(100),
  invoice_date DATE,
  due_date DATE,
  paid_date DATE,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_client ON billing_info(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_info(status);

-- Filing history table
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

CREATE INDEX IF NOT EXISTS idx_filing_history_client ON filing_history(client_id);

-- ============================================
-- 3. Create or Update Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(client_name);
CREATE INDEX IF NOT EXISTS idx_clients_reg_number ON clients(registration_number);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);

-- ============================================
-- 4. Update RLS Policies (if needed)
-- ============================================

-- Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can view billing" ON billing_info;
DROP POLICY IF EXISTS "Authenticated users can view filing history" ON filing_history;

-- Create basic policies (adjust based on your auth setup)
-- Allow authenticated users to read their own notifications
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert notifications
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Similar policies for other tables
CREATE POLICY "Authenticated users can view tasks"
  ON tasks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage tasks"
  ON tasks FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view billing"
  ON billing_info FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view filing history"
  ON filing_history FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- 5. Verify Tables Exist
-- ============================================

-- This query will show all your tables
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database migration completed successfully!';
  RAISE NOTICE 'All missing columns and tables have been added.';
END $$;
