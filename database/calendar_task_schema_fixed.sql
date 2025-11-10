-- Calendar & Task Management Database Schema - FIXED VERSION
-- Run this in your Supabase SQL Editor

-- First, ensure we have the auth.users reference (Supabase auth users)
-- Create tasks table for task management
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id), -- Using auth.users instead of public.users
    created_by UUID REFERENCES auth.users(id),   -- Using auth.users instead of public.users
    client_id UUID, -- References clients table (if exists)
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
    client_id UUID, -- References clients table (if exists)
    created_by UUID REFERENCES auth.users(id), -- Using auth.users instead of public.users
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
    client_id UUID, -- References clients table (if exists)
    document_type TEXT NOT NULL, -- vat_return, cipc_filing, tax_return, etc.
    deadline_date DATE NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, overdue
    priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    reminder_sent BOOLEAN DEFAULT false,
    completed_date DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id), -- Using auth.users instead of public.users
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
DROP POLICY IF EXISTS "Users can view all tasks" ON public.tasks;
CREATE POLICY "Users can view all tasks" ON public.tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
CREATE POLICY "Users can insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
CREATE POLICY "Users can update tasks" ON public.tasks FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;
CREATE POLICY "Users can delete tasks" ON public.tasks FOR DELETE USING (true);

-- RLS Policies for calendar_events
DROP POLICY IF EXISTS "Users can view all calendar events" ON public.calendar_events;
CREATE POLICY "Users can view all calendar events" ON public.calendar_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert calendar events" ON public.calendar_events;
CREATE POLICY "Users can insert calendar events" ON public.calendar_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update calendar events" ON public.calendar_events;
CREATE POLICY "Users can update calendar events" ON public.calendar_events FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Users can delete calendar events" ON public.calendar_events;
CREATE POLICY "Users can delete calendar events" ON public.calendar_events FOR DELETE USING (true);

-- RLS Policies for document_deadlines
DROP POLICY IF EXISTS "Users can view all document deadlines" ON public.document_deadlines;
CREATE POLICY "Users can view all document deadlines" ON public.document_deadlines FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert document deadlines" ON public.document_deadlines;
CREATE POLICY "Users can insert document deadlines" ON public.document_deadlines FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update document deadlines" ON public.document_deadlines;
CREATE POLICY "Users can update document deadlines" ON public.document_deadlines FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Users can delete document deadlines" ON public.document_deadlines;
CREATE POLICY "Users can delete document deadlines" ON public.document_deadlines FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.calendar_events TO authenticated;
GRANT ALL ON public.document_deadlines TO authenticated;

-- Create sample data for testing (simplified version)
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
    auth.uid() -- Use current user ID
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
    auth.uid() -- Use current user ID
) ON CONFLICT DO NOTHING;

-- Verify tables created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM (
    VALUES ('tasks'), ('calendar_events'), ('document_deadlines')
) t(table_name);