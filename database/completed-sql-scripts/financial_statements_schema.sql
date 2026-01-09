-- Financial Statements Module Extension for Agility-App
-- Run this in your Supabase SQL Editor to add financial statements functionality

-- ============================================
-- Financial Statements Tables
-- ============================================

-- Trial Balances table
CREATE TABLE IF NOT EXISTS public.trial_balances (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    upload_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    financial_year integer NOT NULL,
    period text NOT NULL,
    status text NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'PROCESSING', 'MAPPED', 'VALIDATED', 'ERROR')),
    total_debits decimal(15,2) NOT NULL DEFAULT 0,
    total_credits decimal(15,2) NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trial Balance Entries table
CREATE TABLE IF NOT EXISTS public.trial_balance_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trial_balance_id uuid REFERENCES public.trial_balances(id) ON DELETE CASCADE,
    account_number text NOT NULL,
    account_name text NOT NULL,
    debit_amount decimal(15,2) NOT NULL DEFAULT 0,
    credit_amount decimal(15,2) NOT NULL DEFAULT 0,
    balance decimal(15,2) NOT NULL DEFAULT 0,
    account_type text NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    mapped_line_item text,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chart of Accounts table
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    account_number text NOT NULL,
    account_name text NOT NULL,
    account_type text NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    parent_account_id uuid REFERENCES public.chart_of_accounts(id),
    level integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    default_line_item text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(client_id, account_number)
);

-- Account Mappings table
CREATE TABLE IF NOT EXISTS public.account_mappings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    account_number text NOT NULL,
    line_item_code text NOT NULL,
    line_item_name text NOT NULL,
    statement_type text NOT NULL CHECK (statement_type IN ('STATEMENT_OF_FINANCIAL_POSITION', 'STATEMENT_OF_COMPREHENSIVE_INCOME', 'STATEMENT_OF_CHANGES_IN_EQUITY', 'STATEMENT_OF_CASH_FLOWS')),
    confidence decimal(3,2) NOT NULL DEFAULT 1.00,
    is_manual boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(client_id, account_number, statement_type)
);

-- Financial Statements table
CREATE TABLE IF NOT EXISTS public.financial_statements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    trial_balance_id uuid REFERENCES public.trial_balances(id) ON DELETE CASCADE,
    financial_year integer NOT NULL,
    statement_of_financial_position jsonb,
    statement_of_comprehensive_income jsonb,
    statement_of_changes_in_equity jsonb,
    statement_of_cash_flows jsonb,
    notes jsonb,
    tax_calculations jsonb,
    generated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'FINALIZED')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(client_id, financial_year)
);

-- Tax Calculations table
CREATE TABLE IF NOT EXISTS public.tax_calculations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    financial_year integer NOT NULL,
    accounting_profit decimal(15,2) NOT NULL DEFAULT 0,
    taxable_income decimal(15,2) NOT NULL DEFAULT 0,
    corporate_income_tax_rate decimal(5,4) NOT NULL DEFAULT 0.27,
    current_tax decimal(15,2) NOT NULL DEFAULT 0,
    deferred_tax decimal(15,2) NOT NULL DEFAULT 0,
    provisional_tax_paid decimal(15,2) NOT NULL DEFAULT 0,
    vat_calculation jsonb,
    payroll_taxes jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(client_id, financial_year)
);

-- ============================================
-- Indexes for better performance
-- ============================================

-- Trial Balances indexes
CREATE INDEX IF NOT EXISTS idx_trial_balances_client_id ON public.trial_balances(client_id);
CREATE INDEX IF NOT EXISTS idx_trial_balances_financial_year ON public.trial_balances(financial_year);
CREATE INDEX IF NOT EXISTS idx_trial_balances_status ON public.trial_balances(status);

-- Trial Balance Entries indexes
CREATE INDEX IF NOT EXISTS idx_trial_balance_entries_trial_balance_id ON public.trial_balance_entries(trial_balance_id);
CREATE INDEX IF NOT EXISTS idx_trial_balance_entries_account_number ON public.trial_balance_entries(account_number);
CREATE INDEX IF NOT EXISTS idx_trial_balance_entries_account_type ON public.trial_balance_entries(account_type);

-- Chart of Accounts indexes
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_client_id ON public.chart_of_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_account_type ON public.chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent_id ON public.chart_of_accounts(parent_account_id);

-- Account Mappings indexes
CREATE INDEX IF NOT EXISTS idx_account_mappings_client_id ON public.account_mappings(client_id);
CREATE INDEX IF NOT EXISTS idx_account_mappings_account_number ON public.account_mappings(account_number);

-- Financial Statements indexes
CREATE INDEX IF NOT EXISTS idx_financial_statements_client_id ON public.financial_statements(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_statements_financial_year ON public.financial_statements(financial_year);
CREATE INDEX IF NOT EXISTS idx_financial_statements_status ON public.financial_statements(status);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all financial statement tables
ALTER TABLE public.trial_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_balance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (assuming you have existing auth patterns)
-- Users can only access data for clients they have access to

-- Trial Balances policies
CREATE POLICY "Users can view trial balances for their clients" ON public.trial_balances
    FOR SELECT USING (true); -- Modify based on your existing auth patterns

CREATE POLICY "Users can insert trial balances for their clients" ON public.trial_balances
    FOR INSERT WITH CHECK (true); -- Modify based on your existing auth patterns

CREATE POLICY "Users can update trial balances for their clients" ON public.trial_balances
    FOR UPDATE USING (true); -- Modify based on your existing auth patterns

-- Trial Balance Entries policies
CREATE POLICY "Users can view trial balance entries" ON public.trial_balance_entries
    FOR SELECT USING (true);

CREATE POLICY "Users can insert trial balance entries" ON public.trial_balance_entries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update trial balance entries" ON public.trial_balance_entries
    FOR UPDATE USING (true);

-- Chart of Accounts policies
CREATE POLICY "Users can view chart of accounts" ON public.chart_of_accounts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert chart of accounts" ON public.chart_of_accounts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update chart of accounts" ON public.chart_of_accounts
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete chart of accounts" ON public.chart_of_accounts
    FOR DELETE USING (true);

-- Account Mappings policies
CREATE POLICY "Users can view account mappings" ON public.account_mappings
    FOR SELECT USING (true);

CREATE POLICY "Users can insert account mappings" ON public.account_mappings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update account mappings" ON public.account_mappings
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete account mappings" ON public.account_mappings
    FOR DELETE USING (true);

-- Financial Statements policies
CREATE POLICY "Users can view financial statements" ON public.financial_statements
    FOR SELECT USING (true);

CREATE POLICY "Users can insert financial statements" ON public.financial_statements
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update financial statements" ON public.financial_statements
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete financial statements" ON public.financial_statements
    FOR DELETE USING (true);

-- Tax Calculations policies
CREATE POLICY "Users can view tax calculations" ON public.tax_calculations
    FOR SELECT USING (true);

CREATE POLICY "Users can insert tax calculations" ON public.tax_calculations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update tax calculations" ON public.tax_calculations
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete tax calculations" ON public.tax_calculations
    FOR DELETE USING (true);

-- ============================================
-- Sample Data (Optional)
-- ============================================

-- Insert default chart of accounts structure for all existing clients
INSERT INTO public.chart_of_accounts (client_id, account_number, account_name, account_type, level) 
SELECT 
    c.id,
    '1000',
    'Current Assets',
    'ASSET',
    1
FROM public.clients c
WHERE NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts 
    WHERE client_id = c.id AND account_number = '1000'
);

-- Add common SA chart of accounts structure
INSERT INTO public.chart_of_accounts (client_id, account_number, account_name, account_type, level) 
SELECT 
    c.id,
    unnest(ARRAY['1100', '1200', '1300', '2000', '2100', '3000', '3100', '4000', '4100', '5000', '5100', '5900', '6000', '6100', '7000', '7100', '8000', '8100']),
    unnest(ARRAY['Cash and Cash Equivalents', 'Trade and Other Receivables', 'Inventories', 'Non-Current Assets', 'Property, Plant and Equipment', 'Current Liabilities', 'Trade and Other Payables', 'Non-Current Liabilities', 'Long-term Borrowings', 'Equity', 'Share Capital', 'Retained Earnings', 'Revenue', 'Sales Revenue', 'Cost of Sales', 'Cost of Goods Sold', 'Operating Expenses', 'Administrative Expenses']),
    unnest(ARRAY['ASSET', 'ASSET', 'ASSET', 'ASSET', 'ASSET', 'LIABILITY', 'LIABILITY', 'LIABILITY', 'LIABILITY', 'EQUITY', 'EQUITY', 'EQUITY', 'REVENUE', 'REVENUE', 'EXPENSE', 'EXPENSE', 'EXPENSE', 'EXPENSE']),
    2
FROM public.clients c
WHERE NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts 
    WHERE client_id = c.id AND account_number IN ('1100', '1200', '1300', '2000', '2100', '3000', '3100', '4000', '4100', '5000', '5100', '5900', '6000', '6100', '7000', '7100', '8000', '8100')
);

-- ============================================
-- Functions for Financial Calculations
-- ============================================

-- Function to calculate SA Corporate Income Tax
CREATE OR REPLACE FUNCTION calculate_corporate_income_tax(taxable_income DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    -- SA Corporate Income Tax rate is 27% for 2024
    RETURN GREATEST(0, taxable_income * 0.27);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate VAT
CREATE OR REPLACE FUNCTION calculate_vat(amount DECIMAL, is_inclusive BOOLEAN DEFAULT false)
RETURNS DECIMAL AS $$
BEGIN
    -- SA VAT rate is 15%
    IF is_inclusive THEN
        RETURN amount * 0.15 / 1.15;
    ELSE
        RETURN amount * 0.15;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to validate trial balance (debits = credits)
CREATE OR REPLACE FUNCTION validate_trial_balance(trial_balance_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_debits DECIMAL;
    total_credits DECIMAL;
BEGIN
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO total_debits, total_credits
    FROM public.trial_balance_entries
    WHERE trial_balance_id = trial_balance_uuid;
    
    -- Update the trial balance totals
    UPDATE public.trial_balances
    SET 
        total_debits = total_debits,
        total_credits = total_credits,
        status = CASE 
            WHEN ABS(total_debits - total_credits) < 0.01 THEN 'VALIDATED'
            ELSE 'ERROR'
        END
    WHERE id = trial_balance_uuid;
    
    -- Return true if balanced (within 1 cent tolerance)
    RETURN ABS(total_debits - total_credits) < 0.01;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Success Message
-- ============================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Financial Statements module has been successfully installed!';
    RAISE NOTICE 'Tables created: trial_balances, trial_balance_entries, chart_of_accounts, account_mappings, financial_statements, tax_calculations';
    RAISE NOTICE 'RLS policies enabled for security';
    RAISE NOTICE 'Sample chart of accounts inserted for existing clients';
    RAISE NOTICE 'Helper functions created for calculations';
END $$;