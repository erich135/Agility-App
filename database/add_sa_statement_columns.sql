-- Add missing columns to financial_statements table for SA format
ALTER TABLE public.financial_statements 
ADD COLUMN IF NOT EXISTS statement_of_changes_in_equity JSONB,
ADD COLUMN IF NOT EXISTS statement_of_cash_flows JSONB;

-- Add a comment to confirm the update
COMMENT ON COLUMN public.financial_statements.statement_of_changes_in_equity IS 'Statement of Changes in Equity (SOCE) - SA Format';
COMMENT ON COLUMN public.financial_statements.statement_of_cash_flows IS 'Statement of Cash Flows (SCF) - SA Format';