-- Fix RLS Policies for Projects and Time Entries
-- This script ensures that authenticated users can UPDATE project statuses and time entries.
-- Essential for "Mark Ready to Bill" and "Create Invoice" features.

-- 1. Projects Table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop all restrictive policies to avoid conflicts
DROP POLICY IF EXISTS "Projects viewable by authenticated users" ON projects;
DROP POLICY IF EXISTS "Projects manageable by authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON projects;

-- Create one permissive policy for all operations
CREATE POLICY "Enable all access for authenticated users" ON projects
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');


-- 2. Time Entries Table
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Drop all restrictive policies
DROP POLICY IF EXISTS "Time entries viewable by authenticated users" ON time_entries;
DROP POLICY IF EXISTS "Time entries viewable by own consultant" ON time_entries;
DROP POLICY IF EXISTS "Time entries manageable by own consultant" ON time_entries;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON time_entries;

-- Create one permissive policy
CREATE POLICY "Enable all access for authenticated users" ON time_entries
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 3. Clients Table (Just in case they need to edit clients too)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON clients;
CREATE POLICY "Enable all access for authenticated users" ON clients
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
