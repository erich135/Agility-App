-- Complete Database Setup Script
-- Run this ONCE in your Supabase SQL Editor to set up everything

-- ============================================
-- 1. Create basic tables if they don't exist
-- ============================================

-- Create clients table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name text NOT NULL,
    registration_number text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    document_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    mime_type text,
    document_type text,
    uploaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 2. Add Missing Columns to clients table
-- ============================================

-- Add all missing columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS company_income_tax_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_income_tax_ref text,
ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_vat_number text,
ADD COLUMN IF NOT EXISTS paye_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_paye_number text,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_email text,
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_telephone text,
ADD COLUMN IF NOT EXISTS physical_address TEXT,
ADD COLUMN IF NOT EXISTS company_address text,
ADD COLUMN IF NOT EXISTS postal_address TEXT,
ADD COLUMN IF NOT EXISTS directors TEXT,
ADD COLUMN IF NOT EXISTS shareholders TEXT,
ADD COLUMN IF NOT EXISTS financial_year_end DATE,
ADD COLUMN IF NOT EXISTS share_capital DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS number_of_shares INTEGER,
ADD COLUMN IF NOT EXISTS company_public_officer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS public_officer_name text,
ADD COLUMN IF NOT EXISTS public_officer_id_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS public_officer_id text,
ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_person_telephone VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_person_tel text,
ADD COLUMN IF NOT EXISTS contact_person_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- 3. Create Enhanced Features Tables
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

-- Tasks table
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

-- Billing info table
CREATE TABLE IF NOT EXISTS billing_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_type VARCHAR(50) NOT NULL,
  filing_year INTEGER NOT NULL,
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'ZAR',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Filing history table
CREATE TABLE IF NOT EXISTS filing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_type VARCHAR(50) NOT NULL,
  filing_year INTEGER NOT NULL,
  due_date DATE NOT NULL,
  filed_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Directors table
CREATE TABLE IF NOT EXISTS public.directors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    director_order integer NOT NULL,
    director_name text NOT NULL,
    id_number text,
    contact_telephone text,
    contact_email text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 4. Enable Row Level Security (RLS)
-- ============================================

-- Enable RLS on tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE directors ENABLE ROW LEVEL SECURITY;

-- Create basic policies (adjust based on your auth setup)
-- Allow authenticated users to access their data
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
CREATE POLICY "Authenticated users can view clients"
  ON clients FOR ALL
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view documents" ON documents;
CREATE POLICY "Authenticated users can view documents"
  ON documents FOR ALL
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view notifications" ON notifications;
CREATE POLICY "Authenticated users can view notifications"
  ON notifications FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================
-- 5. Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(client_name);
CREATE INDEX IF NOT EXISTS idx_clients_reg_number ON clients(registration_number);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_directors_client ON directors(client_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database setup completed successfully!';
  RAISE NOTICE 'All tables and columns have been created.';
  RAISE NOTICE 'You can now use the CIPC management app.';
END $$;