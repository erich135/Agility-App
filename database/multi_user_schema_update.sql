-- Multi-User Support Update for Calendar & Task Management
-- Add this after running the main calendar_task_schema_fixed.sql

-- Create task_assignments table for many-to-many relationship between tasks and users
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'assignee', -- assignee, reviewer, collaborator
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- pending, accepted, declined
    UNIQUE(task_id, user_id)
);

-- Create event_attendees table for many-to-many relationship between events and users
CREATE TABLE IF NOT EXISTS public.event_attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'attendee', -- organizer, attendee, optional
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    response_status TEXT DEFAULT 'pending', -- pending, accepted, declined, tentative
    response_at TIMESTAMPTZ,
    UNIQUE(event_id, user_id)
);

-- Create user_profiles table to store additional user info for display
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    department TEXT,
    role TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Enable RLS on new tables
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_assignments
CREATE POLICY "Users can view task assignments" ON public.task_assignments FOR SELECT USING (true);
CREATE POLICY "Users can create task assignments" ON public.task_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update task assignments" ON public.task_assignments FOR UPDATE USING (true);
CREATE POLICY "Users can delete task assignments" ON public.task_assignments FOR DELETE USING (true);

-- RLS Policies for event_attendees
CREATE POLICY "Users can view event attendees" ON public.event_attendees FOR SELECT USING (true);
CREATE POLICY "Users can create event attendees" ON public.event_attendees FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update event attendees" ON public.event_attendees FOR UPDATE USING (true);
CREATE POLICY "Users can delete event attendees" ON public.event_attendees FOR DELETE USING (true);

-- RLS Policies for user_profiles
CREATE POLICY "Users can view profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- Grant permissions
GRANT ALL ON public.task_assignments TO authenticated;
GRANT ALL ON public.event_attendees TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;

-- Function to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert sample users for testing (these would normally be created through auth)
INSERT INTO public.user_profiles (id, email, full_name, department, role) VALUES
    ('00000000-0000-0000-0000-000000000001', 'john.doe@example.com', 'John Doe', 'Accounting', 'Senior Accountant'),
    ('00000000-0000-0000-0000-000000000002', 'jane.smith@example.com', 'Jane Smith', 'Administration', 'Office Manager'),
    ('00000000-0000-0000-0000-000000000003', 'mike.wilson@example.com', 'Mike Wilson', 'Compliance', 'Compliance Officer')
ON CONFLICT (id) DO NOTHING;

-- Create view for easy task assignment queries with user details
CREATE OR REPLACE VIEW public.task_assignments_with_users AS
SELECT 
    ta.*,
    up.full_name,
    up.email,
    up.department,
    up.avatar_url,
    t.title as task_title,
    t.due_date as task_due_date,
    t.priority as task_priority,
    t.status as task_status
FROM public.task_assignments ta
JOIN public.user_profiles up ON ta.user_id = up.id
JOIN public.tasks t ON ta.task_id = t.id;

-- Create view for easy event attendee queries with user details
CREATE OR REPLACE VIEW public.event_attendees_with_users AS
SELECT 
    ea.*,
    up.full_name,
    up.email,
    up.department,
    up.avatar_url,
    ce.title as event_title,
    ce.start_time,
    ce.end_time,
    ce.event_type
FROM public.event_attendees ea
JOIN public.user_profiles up ON ea.user_id = up.id
JOIN public.calendar_events ce ON ea.event_id = ce.id;

-- Function to add multiple users to a task
CREATE OR REPLACE FUNCTION public.add_task_assignees(
    p_task_id UUID,
    p_user_ids UUID[],
    p_assigned_by UUID DEFAULT auth.uid(),
    p_role TEXT DEFAULT 'assignee'
)
RETURNS VOID AS $$
DECLARE
    user_id UUID;
BEGIN
    FOREACH user_id IN ARRAY p_user_ids
    LOOP
        INSERT INTO public.task_assignments (task_id, user_id, role, assigned_by)
        VALUES (p_task_id, user_id, p_role, p_assigned_by)
        ON CONFLICT (task_id, user_id) 
        DO UPDATE SET role = p_role, assigned_by = p_assigned_by, assigned_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to add multiple attendees to an event
CREATE OR REPLACE FUNCTION public.add_event_attendees(
    p_event_id UUID,
    p_user_ids UUID[],
    p_invited_by UUID DEFAULT auth.uid(),
    p_role TEXT DEFAULT 'attendee'
)
RETURNS VOID AS $$
DECLARE
    user_id UUID;
BEGIN
    FOREACH user_id IN ARRAY p_user_ids
    LOOP
        INSERT INTO public.event_attendees (event_id, user_id, role, invited_by)
        VALUES (p_event_id, user_id, p_role, p_invited_by)
        ON CONFLICT (event_id, user_id) 
        DO UPDATE SET role = p_role, invited_by = p_invited_by, invited_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.add_task_assignees TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_event_attendees TO authenticated;