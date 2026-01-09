-- Update Financial Statements Schema to Match SA Format
-- Based on Gauteng Cycling template analysis

-- First, let's add proper South African chart of accounts
-- We need to insert with a valid client_id, using the first available client
DO $$
DECLARE
    first_client_id uuid;
BEGIN
    -- Get the first available client ID
    SELECT id INTO first_client_id FROM public.clients LIMIT 1;
    
    IF first_client_id IS NULL THEN
        RAISE NOTICE 'No clients found. Please create a client first before running this script.';
        RETURN;
    END IF;
    
    -- Insert SA chart of accounts using the correct column names
    INSERT INTO public.chart_of_accounts (client_id, account_number, account_name, account_type, parent_account_id, level, is_active) VALUES
    -- Assets
    (first_client_id, '1000', 'ASSETS', 'ASSET', NULL, 1, true),
    (first_client_id, '1100', 'Current Assets', 'ASSET', (SELECT id FROM public.chart_of_accounts WHERE account_number = '1000' AND client_id = first_client_id), 2, true),
    (first_client_id, '1110', 'Cash and cash equivalents', 'ASSET', (SELECT id FROM public.chart_of_accounts WHERE account_number = '1100' AND client_id = first_client_id), 3, true),
    (first_client_id, '1120', 'Trade and other receivables', 'ASSET', (SELECT id FROM public.chart_of_accounts WHERE account_number = '1100' AND client_id = first_client_id), 3, true),
    (first_client_id, '1130', 'Prepayments', 'ASSET', (SELECT id FROM public.chart_of_accounts WHERE account_number = '1100' AND client_id = first_client_id), 3, true),
    (first_client_id, '1200', 'Non-Current Assets', 'ASSET', (SELECT id FROM public.chart_of_accounts WHERE account_number = '1000' AND client_id = first_client_id), 2, true),
    (first_client_id, '1210', 'Property, plant and equipment', 'ASSET', (SELECT id FROM public.chart_of_accounts WHERE account_number = '1200' AND client_id = first_client_id), 3, true),
    (first_client_id, '1220', 'Intangible assets', 'ASSET', (SELECT id FROM public.chart_of_accounts WHERE account_number = '1200' AND client_id = first_client_id), 3, true),

    -- Equity
    (first_client_id, '5000', 'EQUITY', 'EQUITY', NULL, 1, true),
    (first_client_id, '5100', 'Accumulated surplus/(deficit)', 'EQUITY', (SELECT id FROM public.chart_of_accounts WHERE account_number = '5000' AND client_id = first_client_id), 2, true),
    (first_client_id, '5200', 'Retained Income/(Accumulated Loss)', 'EQUITY', (SELECT id FROM public.chart_of_accounts WHERE account_number = '5000' AND client_id = first_client_id), 2, true),

    -- Liabilities
    (first_client_id, '9000', 'LIABILITIES', 'LIABILITY', NULL, 1, true),
    (first_client_id, '9100', 'Current Liabilities', 'LIABILITY', (SELECT id FROM public.chart_of_accounts WHERE account_number = '9000' AND client_id = first_client_id), 2, true),
    (first_client_id, '9110', 'Trade and other payables', 'LIABILITY', (SELECT id FROM public.chart_of_accounts WHERE account_number = '9100' AND client_id = first_client_id), 3, true),
    (first_client_id, '9120', 'Short-term borrowings', 'LIABILITY', (SELECT id FROM public.chart_of_accounts WHERE account_number = '9100' AND client_id = first_client_id), 3, true),
    (first_client_id, '9200', 'Non-Current Liabilities', 'LIABILITY', (SELECT id FROM public.chart_of_accounts WHERE account_number = '9000' AND client_id = first_client_id), 2, true),
    (first_client_id, '9210', 'Long-term borrowings', 'LIABILITY', (SELECT id FROM public.chart_of_accounts WHERE account_number = '9200' AND client_id = first_client_id), 3, true),

    -- Revenue (South African specific)
    (first_client_id, '4000', 'REVENUE', 'REVENUE', NULL, 1, true),
    (first_client_id, '4100', 'Fee income - recoveries charged to regions', 'REVENUE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '4000' AND client_id = first_client_id), 2, true),
    (first_client_id, '4200', 'Membership fees', 'REVENUE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '4000' AND client_id = first_client_id), 2, true),
    (first_client_id, '4300', 'Event income', 'REVENUE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '4000' AND client_id = first_client_id), 2, true),
    (first_client_id, '4400', 'Interest received', 'REVENUE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '4000' AND client_id = first_client_id), 2, true),

    -- Expenses (SA Format)
    (first_client_id, '3000', 'EXPENSES', 'EXPENSE', NULL, 1, true),
    (first_client_id, '3100', 'Expenses incurred in realising objectives', 'EXPENSE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '3000' AND client_id = first_client_id), 2, true),
    (first_client_id, '3110', 'Fee disbursement - regional expenses', 'EXPENSE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '3100' AND client_id = first_client_id), 3, true),
    (first_client_id, '3200', 'General and administrative expenses', 'EXPENSE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '3000' AND client_id = first_client_id), 2, true),
    (first_client_id, '3210', 'Bank charges', 'EXPENSE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '3200' AND client_id = first_client_id), 3, true),
    (first_client_id, '3220', 'Professional fees', 'EXPENSE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '3200' AND client_id = first_client_id), 3, true),
    (first_client_id, '3230', 'Office expenses', 'EXPENSE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '3200' AND client_id = first_client_id), 3, true),
    (first_client_id, '3300', 'Finance costs', 'EXPENSE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '3000' AND client_id = first_client_id), 2, true),
    (first_client_id, '3400', 'Expenses for which no supporting documents are available', 'EXPENSE', (SELECT id FROM public.chart_of_accounts WHERE account_number = '3000' AND client_id = first_client_id), 2, true)
    
    ON CONFLICT (client_id, account_number) DO NOTHING;
    
    RAISE NOTICE 'SA Chart of Accounts inserted for client: %', first_client_id;
END $$;

-- Create function to generate proper SA format financial statements
CREATE OR REPLACE FUNCTION generate_sa_financial_statements(
    trial_balance_uuid UUID,
    client_uuid UUID,
    financial_year INTEGER
) RETURNS JSON AS $$
DECLARE
    result JSON;
    cash_equivalents DECIMAL := 0;
    trade_receivables DECIMAL := 0;
    current_assets_total DECIMAL := 0;
    ppe DECIMAL := 0;
    non_current_assets_total DECIMAL := 0;
    total_assets DECIMAL := 0;
    
    accumulated_surplus DECIMAL := 0;
    total_equity DECIMAL := 0;
    
    trade_payables DECIMAL := 0;
    current_liabilities_total DECIMAL := 0;
    long_term_borrowings DECIMAL := 0;
    non_current_liabilities_total DECIMAL := 0;
    total_liabilities DECIMAL := 0;
    
    fee_income DECIMAL := 0;
    total_revenue DECIMAL := 0;
    
    operational_expenses DECIMAL := 0;
    admin_expenses DECIMAL := 0;
    finance_costs DECIMAL := 0;
    total_expenses DECIMAL := 0;
    
    surplus_deficit DECIMAL := 0;
BEGIN
    -- Get trial balance data and map to SA format
    SELECT 
        COALESCE(SUM(CASE WHEN tbe.account_name ILIKE '%cash%' OR tbe.account_name ILIKE '%bank%' THEN tbe.debit_amount - tbe.credit_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tbe.account_name ILIKE '%receivable%' OR tbe.account_name ILIKE '%debtor%' THEN tbe.debit_amount - tbe.credit_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tbe.account_name ILIKE '%equipment%' OR tbe.account_name ILIKE '%asset%' THEN tbe.debit_amount - tbe.credit_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tbe.account_name ILIKE '%payable%' OR tbe.account_name ILIKE '%creditor%' THEN tbe.credit_amount - tbe.debit_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tbe.account_name ILIKE '%income%' OR tbe.account_name ILIKE '%revenue%' OR tbe.account_name ILIKE '%fee%' THEN tbe.credit_amount - tbe.debit_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tbe.account_name ILIKE '%expense%' OR tbe.account_name ILIKE '%cost%' THEN tbe.debit_amount - tbe.credit_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tbe.account_name ILIKE '%admin%' THEN tbe.debit_amount - tbe.credit_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tbe.account_name ILIKE '%interest%' OR tbe.account_name ILIKE '%finance%' THEN tbe.debit_amount - tbe.credit_amount ELSE 0 END), 0)
    INTO cash_equivalents, trade_receivables, ppe, trade_payables, fee_income, operational_expenses, admin_expenses, finance_costs
    FROM trial_balance_entries tbe
    WHERE tbe.trial_balance_id = trial_balance_uuid;
    
    -- Calculate totals
    current_assets_total := cash_equivalents + trade_receivables;
    non_current_assets_total := ppe;
    total_assets := current_assets_total + non_current_assets_total;
    
    current_liabilities_total := trade_payables;
    total_liabilities := current_liabilities_total + non_current_liabilities_total;
    
    total_revenue := fee_income;
    total_expenses := operational_expenses + admin_expenses + finance_costs;
    surplus_deficit := total_revenue - total_expenses;
    accumulated_surplus := surplus_deficit; -- Simplified for now
    total_equity := accumulated_surplus;
    
    -- Build SA format JSON
    result := json_build_object(
        'sofp', json_build_object(
            'current_assets', json_build_object(
                'cash_and_cash_equivalents', cash_equivalents,
                'trade_and_other_receivables', trade_receivables,
                'total', current_assets_total
            ),
            'non_current_assets', json_build_object(
                'property_plant_equipment', ppe,
                'total', non_current_assets_total
            ),
            'total_assets', total_assets,
            'equity', json_build_object(
                'accumulated_surplus', accumulated_surplus,
                'total', total_equity
            ),
            'current_liabilities', json_build_object(
                'trade_and_other_payables', trade_payables,
                'total', current_liabilities_total
            ),
            'non_current_liabilities', json_build_object(
                'long_term_borrowings', long_term_borrowings,
                'total', non_current_liabilities_total
            ),
            'total_equity_and_liabilities', total_equity + total_liabilities
        ),
        'soci', json_build_object(
            'revenue', json_build_object(
                'fee_income_recoveries', fee_income,
                'total_revenue', total_revenue
            ),
            'expenses', json_build_object(
                'expenses_realising_objectives', operational_expenses,
                'general_administrative_expenses', admin_expenses,
                'finance_costs', finance_costs,
                'total_expenses', total_expenses
            ),
            'surplus_deficit_for_year', surplus_deficit
        ),
        'soce', json_build_object(
            'opening_balance', 0, -- Would need prior year data
            'surplus_deficit_for_year', surplus_deficit,
            'closing_balance', accumulated_surplus
        ),
        'scf', json_build_object(
            'operating_activities', json_build_object(
                'cash_receipts_from_customers', fee_income,
                'cash_paid_to_suppliers', -operational_expenses,
                'net_cash_from_operating', fee_income - operational_expenses
            ),
            'investing_activities', json_build_object(
                'net_cash_from_investing', 0
            ),
            'financing_activities', json_build_object(
                'net_cash_from_financing', 0
            )
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;