-- Step 2: Add All Missing Columns
-- Run this AFTER running 01_create_basic_tables.sql

-- ============================================
-- 1. Add Missing Columns to clients table
-- ============================================

-- Add all the missing columns that the app expects
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS company_income_tax_number VARCHAR(50),
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
-- 2. Create Enhanced Features Tables
-- ============================================

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
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
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  task_type VARCHAR(100) NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'todo',
  client_id UUID REFERENCES public.clients(id),
  assigned_to UUID,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing info table
CREATE TABLE IF NOT EXISTS public.billing_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
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

-- Filing history table
CREATE TABLE IF NOT EXISTS public.filing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
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

-- ============================================
-- 3. Enable RLS on new tables
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filing_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create policies for new tables
-- ============================================

-- Notifications policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.notifications;
CREATE POLICY "Enable all access for authenticated users" 
ON public.notifications FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Tasks policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tasks;
CREATE POLICY "Enable all access for authenticated users" 
ON public.tasks FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Billing policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.billing_info;
CREATE POLICY "Enable all access for authenticated users" 
ON public.billing_info FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Filing history policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.filing_history;
CREATE POLICY "Enable all access for authenticated users" 
ON public.filing_history FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ============================================
-- 5. Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(client_name);
CREATE INDEX IF NOT EXISTS idx_clients_reg_number ON public.clients(registration_number);
CREATE INDEX IF NOT EXISTS idx_documents_client ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON public.tasks(client_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All columns added to clients table!';
  RAISE NOTICE '✅ Enhanced feature tables created!';
  RAISE NOTICE '✅ RLS policies configured!';
  RAISE NOTICE '✅ Performance indexes created!';
  RAISE NOTICE '🎉 Database setup complete! Your app should work now.';
END $$;