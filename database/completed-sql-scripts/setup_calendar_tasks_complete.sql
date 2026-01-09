-- ============================================
-- COMPLETE CALENDAR & TASK MANAGEMENT SETUP
-- Compatible with existing 'users' table
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT 'general', -- general, document_renewal, filing_deadline, appointment, follow_up
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    due_date TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_to UUID[], -- Array of user IDs
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- ============================================
-- 2. CREATE CALENDAR EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL DEFAULT 'meeting', -- meeting, appointment, deadline, reminder
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    attendees UUID[], -- Array of user IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON public.calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON public.calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client_id ON public.calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);

-- ============================================
-- 3. CREATE TASK ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'assignee', -- assignee, reviewer, collaborator
    assigned_by UUID REFERENCES public.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- pending, accepted, declined
    UNIQUE(task_id, user_id)
);

-- Create indexes for task_assignments
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);

-- ============================================
-- 4. CREATE EVENT ATTENDEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'attendee', -- organizer, attendee, optional
    invited_by UUID REFERENCES public.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    response_status TEXT DEFAULT 'pending', -- pending, accepted, declined, tentative
    response_at TIMESTAMPTZ,
    UNIQUE(event_id, user_id)
);

-- Create indexes for event_attendees
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees(user_id);

-- ============================================
-- 5. CREATE DOCUMENT DEADLINES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.document_deadlines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- vat_return, income_tax, annual_return, etc.
    deadline_date DATE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending', -- pending, completed, overdue
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for document_deadlines
CREATE INDEX IF NOT EXISTS idx_document_deadlines_deadline_date ON public.document_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_document_deadlines_status ON public.document_deadlines(status);
CREATE INDEX IF NOT EXISTS idx_document_deadlines_client_id ON public.document_deadlines(client_id);

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_deadlines ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CREATE RLS POLICIES (Allow all for now)
-- ============================================

-- Tasks policies
DROP POLICY IF EXISTS "Allow all operations on tasks" ON public.tasks;
CREATE POLICY "Allow all operations on tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- Calendar events policies
DROP POLICY IF EXISTS "Allow all operations on calendar_events" ON public.calendar_events;
CREATE POLICY "Allow all operations on calendar_events" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);

-- Task assignments policies
DROP POLICY IF EXISTS "Allow all operations on task_assignments" ON public.task_assignments;
CREATE POLICY "Allow all operations on task_assignments" ON public.task_assignments FOR ALL USING (true) WITH CHECK (true);

-- Event attendees policies
DROP POLICY IF EXISTS "Allow all operations on event_attendees" ON public.event_attendees;
CREATE POLICY "Allow all operations on event_attendees" ON public.event_attendees FOR ALL USING (true) WITH CHECK (true);

-- Document deadlines policies
DROP POLICY IF EXISTS "Allow all operations on document_deadlines" ON public.document_deadlines;
CREATE POLICY "Allow all operations on document_deadlines" ON public.document_deadlines FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO anon;
GRANT ALL ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO anon;
GRANT ALL ON public.task_assignments TO authenticated;
GRANT ALL ON public.task_assignments TO anon;
GRANT ALL ON public.event_attendees TO authenticated;
GRANT ALL ON public.event_attendees TO anon;
GRANT ALL ON public.document_deadlines TO authenticated;
GRANT ALL ON public.document_deadlines TO anon;

-- ============================================
-- 9. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_deadlines_updated_at ON public.document_deadlines;
CREATE TRIGGER update_document_deadlines_updated_at
    BEFORE UPDATE ON public.document_deadlines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. INSERT SAMPLE DATA (Optional - for testing)
-- ============================================

-- Sample tasks (using mock user IDs - replace with actual user IDs from your users table)
INSERT INTO public.tasks (title, description, task_type, priority, status, due_date, start_time, end_time) VALUES
    ('Review Client Documents', 'Review annual financial statements for ABC Corp', 'general', 'high', 'pending', '2025-11-15 17:00:00+00', '2025-11-15 09:00:00+00', '2025-11-15 11:00:00+00'),
    ('File VAT Returns', 'Submit VAT returns for Q3 2025', 'filing_deadline', 'urgent', 'in_progress', '2025-11-12 17:00:00+00', '2025-11-12 14:00:00+00', '2025-11-12 16:00:00+00'),
    ('Client Follow-up', 'Follow up with new client about missing documents', 'follow_up', 'medium', 'pending', '2025-11-13 12:00:00+00', '2025-11-13 10:00:00+00', '2025-11-13 11:00:00+00')
ON CONFLICT DO NOTHING;

-- Sample calendar events
INSERT INTO public.calendar_events (title, description, event_type, start_time, end_time, location) VALUES
    ('Client Consultation', 'Meeting with ABC Corp regarding tax planning', 'appointment', '2025-11-11 09:00:00+00', '2025-11-11 10:00:00+00', 'Conference Room A'),
    ('Team Planning Meeting', 'Weekly team sync and project updates', 'meeting', '2025-11-12 14:00:00+00', '2025-11-12 15:00:00+00', 'Main Office'),
    ('VAT Filing Deadline', 'Last day to submit VAT returns', 'deadline', '2025-11-15 17:00:00+00', '2025-11-15 17:00:00+00', 'Online'),
    ('Client Follow-up Call', 'Check on document submission status', 'reminder', '2025-11-13 10:30:00+00', '2025-11-13 11:00:00+00', 'Phone'),
    ('New Client Onboarding', 'Welcome meeting for DEF Corp', 'appointment', '2025-11-14 11:00:00+00', '2025-11-14 12:00:00+00', 'Conference Room B')
ON CONFLICT DO NOTHING;

-- Sample document deadlines
INSERT INTO public.document_deadlines (document_type, deadline_date, description, status, priority) VALUES
    ('vat_return', '2025-11-17', 'VAT Return Filing Due', 'pending', 'high'),
    ('income_tax', '2025-11-30', 'Provisional Tax Payment', 'pending', 'medium'),
    ('annual_return', '2025-12-15', 'Annual Financial Statements', 'pending', 'high')
ON CONFLICT DO NOTHING;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- You can now:
-- 1. View tasks: SELECT * FROM public.tasks;
-- 2. View events: SELECT * FROM public.calendar_events;
-- 3. View deadlines: SELECT * FROM public.document_deadlines;
-- ============================================
