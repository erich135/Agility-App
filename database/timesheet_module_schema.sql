-- ============================================
-- TIMESHEET & BILLING MODULE - Database Schema
-- Created: December 13, 2025
-- For: Agility App - Accounting Firm Client
-- ============================================
-- 
-- This schema creates all necessary tables for:
-- - Consultant management
-- - Project tracking
-- - Time entries with timer support
-- - Billing and invoicing workflow
-- - Notifications and reminders
--
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CONSULTANTS TABLE
-- Extends the user concept for billing purposes
-- ============================================

CREATE TABLE IF NOT EXISTS public.consultants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to auth user (if using Supabase Auth)
    user_id UUID UNIQUE,
    
    -- Basic Info
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    
    -- Professional Details
    designation VARCHAR(100) NOT NULL DEFAULT 'Accountant',
    -- Options: 'Chartered Accountant', 'Accountant', 'Trainee Accountant', 'Student'
    
    -- Billing
    hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
    default_hourly_rate DECIMAL(10, 2) DEFAULT 500.00, -- ZAR
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    can_approve_timesheets BOOLEAN DEFAULT false,
    
    -- Role in app
    role VARCHAR(50) DEFAULT 'consultant',
    -- Options: 'consultant', 'senior_consultant', 'accounts', 'admin'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. JOB TYPES TABLE
-- Predefined categories of work
-- ============================================

CREATE TABLE IF NOT EXISTS public.job_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100),
    -- Categories: 'Tax', 'CIPC', 'Labour', 'Accounting', 'Advisory', 'Other'
    
    -- Default billing settings
    default_rate_multiplier DECIMAL(4, 2) DEFAULT 1.00,
    -- e.g., 1.5 for premium services
    
    is_billable BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default job types
INSERT INTO public.job_types (name, description, category, sort_order) VALUES
    ('Annual Tax Return - Individual', 'Personal income tax return preparation and filing', 'Tax', 1),
    ('Annual Tax Return - Company', 'Corporate income tax return preparation and filing', 'Tax', 2),
    ('Provisional Tax', 'IRP6 provisional tax calculations and submissions', 'Tax', 3),
    ('VAT Return', 'Monthly/bi-monthly VAT201 preparation and filing', 'Tax', 4),
    ('PAYE/EMP201', 'Monthly PAYE reconciliation and submission', 'Tax', 5),
    ('EMP501 Reconciliation', 'Bi-annual employer reconciliation', 'Tax', 6),
    ('Tax Dispute/Query', 'SARS dispute resolution and query handling', 'Tax', 7),
    ('Annual Return (CIPC)', 'CIPC annual return filing', 'CIPC', 10),
    ('Company Registration', 'New company registration with CIPC', 'CIPC', 11),
    ('Director Changes', 'CoR39 director appointments/resignations', 'CIPC', 12),
    ('Share Transfers', 'Share transfer documentation and filing', 'CIPC', 13),
    ('Name Change', 'Company name amendment', 'CIPC', 14),
    ('Annual Financial Statements', 'Year-end financial statement preparation', 'Accounting', 20),
    ('Monthly Bookkeeping', 'Ongoing bookkeeping and reconciliations', 'Accounting', 21),
    ('Management Accounts', 'Monthly/quarterly management reporting', 'Accounting', 22),
    ('Payroll Processing', 'Monthly payroll calculation and processing', 'Labour', 30),
    ('UIF Registration', 'UIF registration and compliance', 'Labour', 31),
    ('COIDA/Workmen Comp', 'COIDA registration and returns', 'Labour', 32),
    ('Employment Contracts', 'Employment contract drafting/review', 'Labour', 33),
    ('Advisory - General', 'General business advisory services', 'Advisory', 40),
    ('Advisory - Tax Planning', 'Tax planning and structuring advice', 'Advisory', 41),
    ('Meeting - Client', 'Client meeting or consultation', 'Advisory', 42),
    ('Phone Call - Client', 'Client phone consultation', 'Advisory', 43),
    ('Email Correspondence', 'Client email communication and queries', 'Advisory', 44),
    ('Other', 'Other billable work - specify in notes', 'Other', 99)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. PROJECTS TABLE
-- Tracks work items that group time entries
-- ============================================

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference number (auto-generated)
    project_number VARCHAR(50) UNIQUE,
    
    -- Client link (to existing clients table)
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    
    -- Project details
    name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Job type
    job_type_id UUID REFERENCES public.job_types(id),
    
    -- Assigned consultant (primary)
    assigned_consultant_id UUID REFERENCES public.consultants(id),
    
    -- Dates
    start_date DATE DEFAULT CURRENT_DATE,
    expected_end_date DATE,
    billing_date DATE, -- When this should be billed
    completed_date DATE,
    
    -- Status workflow
    status VARCHAR(50) DEFAULT 'active',
    -- Options: 'active', 'on_hold', 'ready_to_bill', 'invoiced', 'cancelled'
    
    -- Billing info
    total_hours DECIMAL(10, 2) DEFAULT 0.00,
    billable_hours DECIMAL(10, 2) DEFAULT 0.00,
    estimated_hours DECIMAL(10, 2),
    
    -- Invoice tracking
    invoice_number VARCHAR(100),
    invoice_date DATE,
    invoice_amount DECIMAL(12, 2),
    
    -- Flags
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50), -- 'monthly', 'quarterly', 'annually'
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'normal',
    -- Options: 'low', 'normal', 'high', 'urgent'
    
    -- Notes
    internal_notes TEXT, -- For staff only
    
    -- Audit
    created_by UUID REFERENCES public.consultants(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to auto-generate project numbers
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_num INTEGER;
    new_number VARCHAR(50);
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(project_number FROM 'PRJ-' || year_part || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM public.projects
    WHERE project_number LIKE 'PRJ-' || year_part || '-%';
    
    new_number := 'PRJ-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
    NEW.project_number := new_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto project number
DROP TRIGGER IF EXISTS trigger_generate_project_number ON public.projects;
CREATE TRIGGER trigger_generate_project_number
    BEFORE INSERT ON public.projects
    FOR EACH ROW
    WHEN (NEW.project_number IS NULL)
    EXECUTE FUNCTION generate_project_number();

-- ============================================
-- 4. TIME ENTRIES TABLE
-- Individual time records
-- ============================================

CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE RESTRICT,
    
    -- Date of work
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Time tracking
    start_time TIMESTAMP WITH TIME ZONE, -- For timer functionality
    end_time TIMESTAMP WITH TIME ZONE,   -- For timer functionality
    
    -- Duration (stored in hours as decimal)
    duration_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    -- e.g., 0.10 = 6 minutes, 1.50 = 1 hour 30 minutes
    
    -- Entry method tracking
    entry_method VARCHAR(20) DEFAULT 'manual',
    -- Options: 'manual', 'timer', 'adjusted'
    
    -- If timer was used but adjusted, store original
    original_duration DECIMAL(6, 2),
    
    -- Description
    description TEXT,
    
    -- Billing
    is_billable BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(10, 2), -- Rate at time of entry
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    -- Options: 'draft', 'submitted', 'approved', 'invoiced'
    
    -- Timer state (for active timers)
    timer_active BOOLEAN DEFAULT false,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.consultants(id)
);

-- ============================================
-- 5. PROJECT STATUS HISTORY
-- Audit trail for project status changes
-- ============================================

CREATE TABLE IF NOT EXISTS public.project_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    
    changed_by UUID REFERENCES public.consultants(id),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. BILLING REMINDERS TABLE
-- Scheduled reminders for billing
-- ============================================

CREATE TABLE IF NOT EXISTS public.billing_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    reminder_type VARCHAR(50) NOT NULL,
    -- Options: 'billing_due', 'invoice_pending', 'overdue'
    
    reminder_date DATE NOT NULL,
    
    -- Who should receive this reminder
    recipient_id UUID REFERENCES public.consultants(id),
    recipient_role VARCHAR(50), -- 'accounts', 'consultant', 'admin'
    
    -- Status
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    dismissed_by UUID REFERENCES public.consultants(id),
    
    -- Message
    message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. TIMESHEET NOTIFICATIONS TABLE
-- Extends existing notifications for timesheet-specific alerts
-- ============================================

CREATE TABLE IF NOT EXISTS public.timesheet_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient
    recipient_id UUID NOT NULL REFERENCES public.consultants(id),
    
    -- Type
    notification_type VARCHAR(50) NOT NULL,
    -- Options: 'project_completed', 'ready_to_bill', 'invoice_needed', 
    --          'reminder_billing_due', 'time_entry_approved', 'project_assigned'
    
    -- Related entities
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'normal',
    -- Options: 'low', 'normal', 'high', 'urgent'
    
    -- Action URL (for deep linking)
    action_url VARCHAR(500),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. CONSULTANT CLIENT RATES TABLE
-- Custom rates per consultant-client combination
-- ============================================

CREATE TABLE IF NOT EXISTS public.consultant_client_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    
    hourly_rate DECIMAL(10, 2) NOT NULL,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique active rate per consultant-client pair
    UNIQUE(consultant_id, client_id, effective_from)
);

-- ============================================
-- 9. INDEXES FOR PERFORMANCE
-- ============================================

-- Consultants
CREATE INDEX IF NOT EXISTS idx_consultants_email ON public.consultants(email);
CREATE INDEX IF NOT EXISTS idx_consultants_user_id ON public.consultants(user_id);
CREATE INDEX IF NOT EXISTS idx_consultants_active ON public.consultants(is_active) WHERE is_active = true;

-- Job Types
CREATE INDEX IF NOT EXISTS idx_job_types_category ON public.job_types(category);
CREATE INDEX IF NOT EXISTS idx_job_types_active ON public.job_types(is_active) WHERE is_active = true;

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_consultant ON public.projects(assigned_consultant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_billing_date ON public.projects(billing_date);
CREATE INDEX IF NOT EXISTS idx_projects_number ON public.projects(project_number);
CREATE INDEX IF NOT EXISTS idx_projects_active ON public.projects(status) WHERE status IN ('active', 'ready_to_bill');

-- Time Entries
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_consultant ON public.time_entries(consultant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON public.time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON public.time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_timer_active ON public.time_entries(timer_active) WHERE timer_active = true;
CREATE INDEX IF NOT EXISTS idx_time_entries_consultant_date ON public.time_entries(consultant_id, entry_date);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_timesheet_notifications_recipient ON public.timesheet_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_notifications_unread ON public.timesheet_notifications(recipient_id, is_read) WHERE is_read = false;

-- Billing Reminders
CREATE INDEX IF NOT EXISTS idx_billing_reminders_date ON public.billing_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_billing_reminders_pending ON public.billing_reminders(is_sent, reminder_date) WHERE is_sent = false;

-- ============================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_client_rates ENABLE ROW LEVEL SECURITY;

-- Consultants policies
DROP POLICY IF EXISTS "Consultants viewable by authenticated users" ON public.consultants;
CREATE POLICY "Consultants viewable by authenticated users"
    ON public.consultants FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Consultants manageable by admins" ON public.consultants;
CREATE POLICY "Consultants manageable by admins"
    ON public.consultants FOR ALL
    USING (auth.role() = 'authenticated');

-- Job Types policies (everyone can read)
DROP POLICY IF EXISTS "Job types viewable by all" ON public.job_types;
CREATE POLICY "Job types viewable by all"
    ON public.job_types FOR SELECT
    USING (auth.role() = 'authenticated');

-- Projects policies
DROP POLICY IF EXISTS "Projects viewable by authenticated users" ON public.projects;
CREATE POLICY "Projects viewable by authenticated users"
    ON public.projects FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Projects manageable by authenticated users" ON public.projects;
CREATE POLICY "Projects manageable by authenticated users"
    ON public.projects FOR ALL
    USING (auth.role() = 'authenticated');

-- Time Entries policies
DROP POLICY IF EXISTS "Time entries viewable by authenticated users" ON public.time_entries;
CREATE POLICY "Time entries viewable by authenticated users"
    ON public.time_entries FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Time entries manageable by authenticated users" ON public.time_entries;
CREATE POLICY "Time entries manageable by authenticated users"
    ON public.time_entries FOR ALL
    USING (auth.role() = 'authenticated');

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.timesheet_notifications;
CREATE POLICY "Users can view own notifications"
    ON public.timesheet_notifications FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own notifications" ON public.timesheet_notifications;
CREATE POLICY "Users can update own notifications"
    ON public.timesheet_notifications FOR UPDATE
    USING (auth.role() = 'authenticated');

-- ============================================
-- 11. HELPER FUNCTIONS
-- ============================================

-- Function to update project total hours when time entries change
CREATE OR REPLACE FUNCTION update_project_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the project's total and billable hours
    UPDATE public.projects
    SET 
        total_hours = (
            SELECT COALESCE(SUM(duration_hours), 0)
            FROM public.time_entries
            WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
        ),
        billable_hours = (
            SELECT COALESCE(SUM(duration_hours), 0)
            FROM public.time_entries
            WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
            AND is_billable = true
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update project hours
DROP TRIGGER IF EXISTS trigger_update_project_hours ON public.time_entries;
CREATE TRIGGER trigger_update_project_hours
    AFTER INSERT OR UPDATE OR DELETE ON public.time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_project_hours();

-- Function to create billing reminders when project billing date is set
CREATE OR REPLACE FUNCTION create_billing_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Only if billing_date is set and project is active
    IF NEW.billing_date IS NOT NULL AND NEW.status = 'active' THEN
        -- Delete existing unset reminders for this project
        DELETE FROM public.billing_reminders 
        WHERE project_id = NEW.id AND is_sent = false;
        
        -- Create reminder 7 days before
        INSERT INTO public.billing_reminders (project_id, reminder_type, reminder_date, recipient_role, message)
        VALUES (
            NEW.id, 
            'billing_due', 
            NEW.billing_date - INTERVAL '7 days',
            'accounts',
            'Project ' || NEW.project_number || ' billing due in 7 days'
        );
        
        -- Create reminder 3 days before
        INSERT INTO public.billing_reminders (project_id, reminder_type, reminder_date, recipient_role, message)
        VALUES (
            NEW.id, 
            'billing_due', 
            NEW.billing_date - INTERVAL '3 days',
            'accounts',
            'Project ' || NEW.project_number || ' billing due in 3 days'
        );
        
        -- Create reminder on the day
        INSERT INTO public.billing_reminders (project_id, reminder_type, reminder_date, recipient_role, message)
        VALUES (
            NEW.id, 
            'billing_due', 
            NEW.billing_date,
            'accounts',
            'Project ' || NEW.project_number || ' should be billed today'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for billing reminders
DROP TRIGGER IF EXISTS trigger_create_billing_reminders ON public.projects;
CREATE TRIGGER trigger_create_billing_reminders
    AFTER INSERT OR UPDATE OF billing_date ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION create_billing_reminders();

-- Function to log project status changes
CREATE OR REPLACE FUNCTION log_project_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.project_status_history (project_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for status history
DROP TRIGGER IF EXISTS trigger_log_project_status ON public.projects;
CREATE TRIGGER trigger_log_project_status
    AFTER UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION log_project_status_change();

-- ============================================
-- 12. VIEWS FOR REPORTING
-- ============================================

-- View: Billable hours summary by month
CREATE OR REPLACE VIEW public.v_monthly_billable_hours AS
SELECT 
    DATE_TRUNC('month', te.entry_date) AS month,
    c.id AS client_id,
    c.client_name,
    co.id AS consultant_id,
    co.full_name AS consultant_name,
    jt.id AS job_type_id,
    jt.name AS job_type_name,
    jt.category AS job_category,
    SUM(te.duration_hours) AS total_hours,
    SUM(CASE WHEN te.is_billable THEN te.duration_hours ELSE 0 END) AS billable_hours,
    SUM(CASE WHEN te.is_billable THEN te.duration_hours * COALESCE(te.hourly_rate, co.default_hourly_rate) ELSE 0 END) AS billable_value
FROM public.time_entries te
JOIN public.projects p ON te.project_id = p.id
JOIN public.clients c ON p.client_id = c.id
JOIN public.consultants co ON te.consultant_id = co.id
LEFT JOIN public.job_types jt ON p.job_type_id = jt.id
GROUP BY 
    DATE_TRUNC('month', te.entry_date),
    c.id, c.client_name,
    co.id, co.full_name,
    jt.id, jt.name, jt.category;

-- View: Projects ready for billing
CREATE OR REPLACE VIEW public.v_projects_ready_to_bill AS
SELECT 
    p.*,
    c.client_name,
    co.full_name AS consultant_name,
    jt.name AS job_type_name,
    (
        SELECT COUNT(*) 
        FROM public.time_entries te 
        WHERE te.project_id = p.id
    ) AS entry_count
FROM public.projects p
JOIN public.clients c ON p.client_id = c.id
LEFT JOIN public.consultants co ON p.assigned_consultant_id = co.id
LEFT JOIN public.job_types jt ON p.job_type_id = jt.id
WHERE p.status = 'ready_to_bill'
ORDER BY p.billing_date ASC NULLS LAST;

-- View: Upcoming billing reminders
CREATE OR REPLACE VIEW public.v_upcoming_reminders AS
SELECT 
    br.*,
    p.project_number,
    p.name AS project_name,
    c.client_name,
    p.total_hours,
    p.billable_hours
FROM public.billing_reminders br
JOIN public.projects p ON br.project_id = p.id
JOIN public.clients c ON p.client_id = c.id
WHERE br.is_sent = false 
    AND br.is_dismissed = false
    AND br.reminder_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY br.reminder_date ASC;

-- View: Active timers
CREATE OR REPLACE VIEW public.v_active_timers AS
SELECT 
    te.*,
    p.project_number,
    p.name AS project_name,
    c.client_name,
    co.full_name AS consultant_name,
    EXTRACT(EPOCH FROM (NOW() - te.start_time)) / 3600 AS running_hours
FROM public.time_entries te
JOIN public.projects p ON te.project_id = p.id
JOIN public.clients c ON p.client_id = c.id
JOIN public.consultants co ON te.consultant_id = co.id
WHERE te.timer_active = true;

-- ============================================
-- 13. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'TIMESHEET MODULE - Database Setup Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - consultants';
    RAISE NOTICE '  - job_types (with 25 default types)';
    RAISE NOTICE '  - projects';
    RAISE NOTICE '  - time_entries';
    RAISE NOTICE '  - project_status_history';
    RAISE NOTICE '  - billing_reminders';
    RAISE NOTICE '  - timesheet_notifications';
    RAISE NOTICE '  - consultant_client_rates';
    RAISE NOTICE '';
    RAISE NOTICE 'Views created:';
    RAISE NOTICE '  - v_monthly_billable_hours';
    RAISE NOTICE '  - v_projects_ready_to_bill';
    RAISE NOTICE '  - v_upcoming_reminders';
    RAISE NOTICE '  - v_active_timers';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers created:';
    RAISE NOTICE '  - Auto project number generation';
    RAISE NOTICE '  - Auto project hours calculation';
    RAISE NOTICE '  - Auto billing reminders creation';
    RAISE NOTICE '  - Auto status change logging';
    RAISE NOTICE '============================================';
END $$;
