-- ============================================
-- Row Level Security (RLS) for Agility App
-- Assumptions:
--  - Supabase Auth is used; JWT contains 'email'
--  - public.users holds business users with 'email' and 'role'
--  - public.consultants has 'email' and optional 'user_id' -> users.id
-- ============================================

-- Helper: get current user id from auth
CREATE OR REPLACE FUNCTION public.fn_current_user_id()
RETURNS uuid
LANGUAGE sql STABLE AS $$
  select auth.uid();
$$;

-- Helper: is admin? (check user role in public.users by auth.uid)
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS boolean
LANGUAGE sql STABLE AS $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  );
$$;

-- Helper: current consultant id (by auth.uid -> user_id -> consultant)
CREATE OR REPLACE FUNCTION public.fn_current_consultant_id()
RETURNS uuid
LANGUAGE sql STABLE AS $$
  select c.id
  from public.consultants c
  where c.user_id = auth.uid()
  limit 1;
$$;

-- RLS Disabled for Agility App
-- We enforce access via application-level granular permissions.
-- Disable RLS on core tables and remove policies if they exist.

-- Disable RLS on tables
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies safely
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS clients_admin_all ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS clients_consultant_select ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS time_entries_admin_all ON public.time_entries';
  EXECUTE 'DROP POLICY IF EXISTS time_entries_consultant_select ON public.time_entries';
  EXECUTE 'DROP POLICY IF EXISTS time_entries_consultant_insert ON public.time_entries';
  EXECUTE 'DROP POLICY IF EXISTS time_entries_consultant_update ON public.time_entries';
  EXECUTE 'DROP POLICY IF EXISTS time_entries_consultant_delete ON public.time_entries';
END $$;

-- ================= Clients ==================
-- Admins: full access
-- Policies removed (managed by app permissions)

-- ================= Time Entries =============
-- Admins: full
-- Policies removed (managed by app permissions)
