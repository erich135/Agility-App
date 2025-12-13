-- Create Account Mappings Table for Trial Balance to Chart of Accounts Mapping
-- This table stores mappings between trial balance entries and chart of accounts

CREATE TABLE IF NOT EXISTS public.account_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trial_balance_id UUID REFERENCES public.trial_balances(id) ON DELETE CASCADE,
    trial_balance_entry_id UUID REFERENCES public.trial_balance_entries(id) ON DELETE CASCADE,
    chart_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
    statement_line_item TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique mapping per trial balance entry
    UNIQUE(trial_balance_entry_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_account_mappings_trial_balance 
ON public.account_mappings(trial_balance_id);

CREATE INDEX IF NOT EXISTS idx_account_mappings_trial_balance_entry 
ON public.account_mappings(trial_balance_entry_id);

CREATE INDEX IF NOT EXISTS idx_account_mappings_chart_account 
ON public.account_mappings(chart_account_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.account_mappings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access mappings for their own clients
CREATE POLICY "Users can manage their own account mappings" ON public.account_mappings
USING (
    EXISTS (
        SELECT 1 FROM public.trial_balances tb
        WHERE tb.id = account_mappings.trial_balance_id
        AND tb.client_id IN (
            SELECT client_id FROM public.user_clients 
            WHERE user_id = auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.trial_balances tb
        WHERE tb.id = account_mappings.trial_balance_id
        AND tb.client_id IN (
            SELECT client_id FROM public.user_clients 
            WHERE user_id = auth.uid()
        )
    )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_account_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_mappings_updated_at
    BEFORE UPDATE ON public.account_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_account_mappings_updated_at();

COMMENT ON TABLE public.account_mappings IS 'Stores mappings between trial balance entries and chart of accounts for financial statement generation';
COMMENT ON COLUMN public.account_mappings.statement_line_item IS 'The financial statement line item that this mapping relates to (e.g., current_assets, revenue, etc.)';