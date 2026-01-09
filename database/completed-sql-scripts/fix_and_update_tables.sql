-- ============================================
-- FIX AND UPDATE EXISTING TABLES
-- This script adds missing columns and creates missing tables
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. UPDATE TASKS TABLE - ADD MISSING COLUMNS
-- ============================================
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- ============================================
-- 2. ENSURE CALENDAR_EVENTS TABLE EXISTS WITH CORRECT STRUCTURE
-- ============================================
-- First, try to create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL DEFAULT 'meeting',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    attendees UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- If table exists, add any missing columns
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS attendees UUID[],
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 3. CREATE TASK ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'assignee',
    assigned_by UUID REFERENCES public.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    UNIQUE(task_id, user_id)
);

-- ============================================
-- 4. CREATE EVENT ATTENDEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'attendee',
    invited_by UUID REFERENCES public.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    response_status TEXT DEFAULT 'pending',
    response_at TIMESTAMPTZ,
    UNIQUE(event_id, user_id)
);

-- ============================================
-- 5. CREATE DOCUMENT DEADLINES TABLE IF NOT EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.document_deadlines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    deadline_date DATE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. CREATE ALL NECESSARY INDEXES
-- ============================================

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_start_time ON public.tasks(start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_end_time ON public.tasks(end_time);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- Calendar events indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON public.calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON public.calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client_id ON public.calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);

-- Task assignments indexes
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);

-- Event attendees indexes
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees(user_id);

-- Document deadlines indexes
CREATE INDEX IF NOT EXISTS idx_document_deadlines_deadline_date ON public.document_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_document_deadlines_status ON public.document_deadlines(status);
CREATE INDEX IF NOT EXISTS idx_document_deadlines_client_id ON public.document_deadlines(client_id);

-- ============================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_deadlines ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. CREATE/UPDATE RLS POLICIES (Allow all for now)
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
-- 9. GRANT PERMISSIONS
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
-- 10. CREATE HELPER FUNCTIONS
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
-- 11. INSERT SAMPLE DATA (only if tables are empty)
-- ============================================

-- Sample tasks
INSERT INTO public.tasks (title, description, task_type, priority, status, due_date, start_time, end_time) 
SELECT * FROM (VALUES
    ('Review Client Documents', 'Review annual financial statements for ABC Corp', 'general', 'high', 'pending', '2025-11-15 17:00:00+00'::timestamptz, '2025-11-15 09:00:00+00'::timestamptz, '2025-11-15 11:00:00+00'::timestamptz),
    ('File VAT Returns', 'Submit VAT returns for Q3 2025', 'filing_deadline', 'urgent', 'in_progress', '2025-11-12 17:00:00+00'::timestamptz, '2025-11-12 14:00:00+00'::timestamptz, '2025-11-12 16:00:00+00'::timestamptz),
    ('Client Follow-up', 'Follow up with new client about missing documents', 'follow_up', 'medium', 'pending', '2025-11-13 12:00:00+00'::timestamptz, '2025-11-13 10:00:00+00'::timestamptz, '2025-11-13 11:00:00+00'::timestamptz)
) AS v(title, description, task_type, priority, status, due_date, start_time, end_time)
WHERE NOT EXISTS (SELECT 1 FROM public.tasks LIMIT 1);

-- Sample calendar events
INSERT INTO public.calendar_events (title, description, event_type, start_time, end_time, location) 
SELECT * FROM (VALUES
    ('Client Consultation', 'Meeting with ABC Corp regarding tax planning', 'appointment', '2025-11-11 09:00:00+00'::timestamptz, '2025-11-11 10:00:00+00'::timestamptz, 'Conference Room A'),
    ('Team Planning Meeting', 'Weekly team sync and project updates', 'meeting', '2025-11-12 14:00:00+00'::timestamptz, '2025-11-12 15:00:00+00'::timestamptz, 'Main Office'),
    ('VAT Filing Deadline', 'Last day to submit VAT returns', 'deadline', '2025-11-15 17:00:00+00'::timestamptz, '2025-11-15 17:00:00+00'::timestamptz, 'Online'),
    ('Client Follow-up Call', 'Check on document submission status', 'reminder', '2025-11-13 10:30:00+00'::timestamptz, '2025-11-13 11:00:00+00'::timestamptz, 'Phone'),
    ('New Client Onboarding', 'Welcome meeting for DEF Corp', 'appointment', '2025-11-14 11:00:00+00'::timestamptz, '2025-11-14 12:00:00+00'::timestamptz, 'Conference Room B')
) AS v(title, description, event_type, start_time, end_time, location)
WHERE NOT EXISTS (SELECT 1 FROM public.calendar_events LIMIT 1);

-- Sample document deadlines
INSERT INTO public.document_deadlines (document_type, deadline_date, description, status, priority) 
SELECT * FROM (VALUES
    ('vat_return', '2025-11-17'::date, 'VAT Return Filing Due', 'pending', 'high'),
    ('income_tax', '2025-11-30'::date, 'Provisional Tax Payment', 'pending', 'medium'),
    ('annual_return', '2025-12-15'::date, 'Annual Financial Statements', 'pending', 'high')
) AS v(document_type, deadline_date, description, status, priority)
WHERE NOT EXISTS (SELECT 1 FROM public.document_deadlines LIMIT 1);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- You can now:
-- 1. View tasks: SELECT * FROM public.tasks;
-- 2. View events: SELECT * FROM public.calendar_events;
-- 3. View deadlines: SELECT * FROM public.document_deadlines;
-- 4. Check if start_time was added: SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks';
-- ============================================
