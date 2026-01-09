-- Calendar & Task Management Database Schema
-- Run this in your Supabase SQL Editor

-- Create tasks table for task management
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.users(id),
    created_by UUID REFERENCES public.users(id),
    client_id UUID, -- References clients table
    task_type TEXT NOT NULL DEFAULT 'general', -- general, document_renewal, filing_deadline, appointment, follow_up
    priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}', -- Additional task-specific data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calendar_events table for appointments and meetings
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL DEFAULT 'meeting', -- meeting, appointment, deadline, reminder
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    client_id UUID, -- References clients table
    created_by UUID REFERENCES public.users(id),
    attendees JSONB DEFAULT '[]', -- Array of user IDs
    is_all_day BOOLEAN DEFAULT false,
    recurrence_rule TEXT, -- RRULE for recurring events
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document_deadlines table for tracking compliance deadlines
CREATE TABLE IF NOT EXISTS public.document_deadlines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL, -- References clients table
    document_type TEXT NOT NULL, -- vat_return, cipc_filing, tax_return, etc.
    deadline_date DATE NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, overdue
    priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    reminder_sent BOOLEAN DEFAULT false,
    completed_date DATE,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client_id ON public.calendar_events(client_id);

CREATE INDEX IF NOT EXISTS idx_document_deadlines_client_id ON public.document_deadlines(client_id);
CREATE INDEX IF NOT EXISTS idx_document_deadlines_deadline_date ON public.document_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_document_deadlines_status ON public.document_deadlines(status);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_deadlines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view all tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Users can insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Users can delete tasks" ON public.tasks FOR DELETE USING (true);

-- RLS Policies for calendar_events
CREATE POLICY "Users can view all calendar events" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Users can insert calendar events" ON public.calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update calendar events" ON public.calendar_events FOR UPDATE USING (true);
CREATE POLICY "Users can delete calendar events" ON public.calendar_events FOR DELETE USING (true);

-- RLS Policies for document_deadlines
CREATE POLICY "Users can view all document deadlines" ON public.document_deadlines FOR SELECT USING (true);
CREATE POLICY "Users can insert document deadlines" ON public.document_deadlines FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update document deadlines" ON public.document_deadlines FOR UPDATE USING (true);
CREATE POLICY "Users can delete document deadlines" ON public.document_deadlines FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.calendar_events TO authenticated;
GRANT ALL ON public.document_deadlines TO authenticated;

-- Add automatic deadline creation triggers for common compliance deadlines
CREATE OR REPLACE FUNCTION create_automatic_deadlines()
RETURNS TRIGGER AS $$
BEGIN
    -- Create VAT return deadline (every 2 months)
    IF NEW.company_vat_number IS NOT NULL AND NEW.company_vat_number != '' THEN
        INSERT INTO public.document_deadlines (
            client_id, 
            document_type, 
            deadline_date, 
            description, 
            priority,
            created_by
        ) VALUES (
            NEW.id,
            'vat_return',
            CURRENT_DATE + INTERVAL '2 months',
            'VAT Return Filing Due',
            'high',
            (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)
        ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- Create CIPC Annual Return deadline (12 months from registration)
    IF NEW.registration_date IS NOT NULL THEN
        INSERT INTO public.document_deadlines (
            client_id,
            document_type,
            deadline_date,
            description,
            priority,
            created_by
        ) VALUES (
            NEW.id,
            'cipc_annual_return',
            NEW.registration_date + INTERVAL '12 months',
            'CIPC Annual Return Filing Due',
            'high',
            (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)
        ) ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic deadline creation
DROP TRIGGER IF EXISTS trigger_create_automatic_deadlines ON public.clients;
CREATE TRIGGER trigger_create_automatic_deadlines
    AFTER INSERT ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION create_automatic_deadlines();

-- Create sample data for testing
INSERT INTO public.tasks (
    title,
    description,
    task_type,
    priority,
    due_date,
    created_by
) VALUES (
    'Review Client Onboarding Process',
    'Review and update the client onboarding workflow for better efficiency',
    'general',
    'medium',
    CURRENT_DATE + INTERVAL '3 days',
    (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)
) ON CONFLICT DO NOTHING;

INSERT INTO public.calendar_events (
    title,
    description,
    event_type,
    start_time,
    end_time,
    created_by
) VALUES (
    'Team Planning Meeting',
    'Weekly team meeting to discuss client priorities and upcoming deadlines',
    'meeting',
    CURRENT_DATE + INTERVAL '1 day' + TIME '09:00:00',
    CURRENT_DATE + INTERVAL '1 day' + TIME '10:00:00',
    (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Verify tables created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM (
    VALUES ('tasks'), ('calendar_events'), ('document_deadlines')
) t(table_name);