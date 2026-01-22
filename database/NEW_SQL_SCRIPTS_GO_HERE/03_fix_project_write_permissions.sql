-- ============================================================================
-- FIX: Allow anon/authenticated to write to public.projects
-- ============================================================================
-- Symptom:
--   "permission denied for schema public" when creating a project from the app.
--
-- Notes:
-- - The app currently uses the Supabase anon key in the browser (no Supabase Auth),
--   so the database role is typically `anon`.
-- - This script is intentionally scoped to the `projects` table (and schema usage).
-- - If you *want* Row Level Security (RLS), remove the DISABLE RLS statement and
--   instead create appropriate RLS policies.
--
-- Run in Supabase SQL Editor.

BEGIN;

-- Schema usage is required for any access to objects in public
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Allow CRUD on the projects table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO authenticated;

-- If projects uses identity/serial sequences, anon/authenticated may need sequence usage.
-- This is broader than table-only, but still safer than granting ALL on ALL tables.
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- App does not use Supabase Auth/RLS today; disable RLS for this table to avoid policy blocks.
ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;

COMMIT;
