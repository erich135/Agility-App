-- Activity Logs Database Schema
-- Run this in your Supabase SQL Editor

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT, -- References users.phone (since that's the primary identifier)
    user_name TEXT, -- Store user name for easy display
    action TEXT NOT NULL, -- login, logout, upload, download, view, create, update, delete
    entity_type TEXT NOT NULL, -- user, customer, document, system
    entity_id TEXT, -- ID of the affected entity
    entity_name TEXT, -- Name/title of the entity for display
    details JSONB, -- Additional context data
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admin users can see all logs
CREATE POLICY "Admin users can view all activity logs" ON public.activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.phone = auth.jwt() ->> 'phone' 
            AND users.role = 'admin'
        )
    );

-- Admin users can insert logs
CREATE POLICY "Admin users can insert activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.phone = auth.jwt() ->> 'phone' 
            AND users.role = 'admin'
        )
    );

-- System can insert logs (for service operations)
CREATE POLICY "System can insert activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (true);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT SELECT, INSERT ON public.activity_logs TO anon;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'activity_logs' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Insert a test log entry
INSERT INTO public.activity_logs (
    user_id,
    user_name,
    action,
    entity_type,
    entity_id,
    entity_name,
    details,
    ip_address
) VALUES (
    'system',
    'System Administrator',
    'system_setup',
    'system',
    'activity_logs',
    'Activity Logging System',
    '{"message": "Activity logging system initialized", "version": "1.0"}',
    '127.0.0.1'
);

-- Show the test entry
SELECT * FROM public.activity_logs ORDER BY created_at DESC LIMIT 1;