-- ============================================
-- Row Level Security (RLS) for Agility App
-- Assumptions:
--  - Supabase Auth is used; JWT contains 'email'
--  - public.users holds business users with 'email' and 'role'
--  - public.consultants has 'email' and optional 'user_id' -> users.id
-- ============================================

-- Helper: current email from JWT
CREATE OR REPLACE FUNCTION public.fn_current_email()
RETURNS text
LANGUAGE sql STABLE AS $$
  select lower(coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json->>'email',
    ''
  ));
$$;

-- Helper: is admin?
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS boolean
LANGUAGE sql STABLE AS $$
  select exists (
    select 1 from public.users u
    where lower(u.email) = public.fn_current_email()
      and u.role = 'admin'
  );
$$;

-- Helper: current consultant id (by email)
CREATE OR REPLACE FUNCTION public.fn_current_consultant_id()
RETURNS uuid
LANGUAGE sql STABLE AS $$
  select c.id
  from public.consultants c
  where lower(c.email) = public.fn_current_email()
  limit 1;
$$;

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- ================= Clients ==================
-- Admins: full access
DROP POLICY IF EXISTS clients_admin_all ON public.clients;
CREATE POLICY clients_admin_all ON public.clients
  FOR ALL
  USING (public.fn_is_admin())
  WITH CHECK (public.fn_is_admin());

-- Consultants: read only assigned
DROP POLICY IF EXISTS clients_consultant_select ON public.clients;
CREATE POLICY clients_consultant_select ON public.clients
  FOR SELECT
  USING (
    public.fn_is_admin() OR
    assigned_consultant_id = public.fn_current_consultant_id()
  );

-- ================= Projects =================
-- Admins: full
DROP POLICY IF EXISTS projects_admin_all ON public.projects;
CREATE POLICY projects_admin_all ON public.projects
  FOR ALL
  USING (public.fn_is_admin())
  WITH CHECK (public.fn_is_admin());

-- Consultants: select projects where they are assigned or project's client is assigned to them
DROP POLICY IF EXISTS projects_consultant_select ON public.projects;
CREATE POLICY projects_consultant_select ON public.projects
  FOR SELECT
  USING (
    public.fn_is_admin() OR
    assigned_consultant_id = public.fn_current_consultant_id() OR
    client_id IN (
      select id from public.clients where assigned_consultant_id = public.fn_current_consultant_id()
    )
  );

-- ================= Time Entries =============
-- Admins: full
DROP POLICY IF EXISTS time_entries_admin_all ON public.time_entries;
CREATE POLICY time_entries_admin_all ON public.time_entries
  FOR ALL
  USING (public.fn_is_admin())
  WITH CHECK (public.fn_is_admin());

-- Consultants: select only their entries or entries for their assigned clients
DROP POLICY IF EXISTS time_entries_consultant_select ON public.time_entries;
CREATE POLICY time_entries_consultant_select ON public.time_entries
  FOR SELECT
  USING (
    public.fn_is_admin() OR
    consultant_id = public.fn_current_consultant_id() OR
    client_id IN (
      select id from public.clients where assigned_consultant_id = public.fn_current_consultant_id()
    )
  );

-- Consultants: insert only for clients assigned to them and with their own consultant_id
DROP POLICY IF EXISTS time_entries_consultant_insert ON public.time_entries;
CREATE POLICY time_entries_consultant_insert ON public.time_entries
  FOR INSERT
  WITH CHECK (
    public.fn_is_admin() OR (
      consultant_id = public.fn_current_consultant_id() AND
      client_id IN (
        select id from public.clients where assigned_consultant_id = public.fn_current_consultant_id()
      )
    )
  );

-- Consultants: update/delete own unbilled entries for assigned clients
DROP POLICY IF EXISTS time_entries_consultant_update ON public.time_entries;
CREATE POLICY time_entries_consultant_update ON public.time_entries
  FOR UPDATE
  USING (
    public.fn_is_admin() OR (
      consultant_id = public.fn_current_consultant_id() AND
      client_id IN (
        select id from public.clients where assigned_consultant_id = public.fn_current_consultant_id()
      )
    )
  )
  WITH CHECK (
    public.fn_is_admin() OR (
      consultant_id = public.fn_current_consultant_id() AND
      client_id IN (
        select id from public.clients where assigned_consultant_id = public.fn_current_consultant_id()
      )
    )
  );

DROP POLICY IF EXISTS time_entries_consultant_delete ON public.time_entries;
CREATE POLICY time_entries_consultant_delete ON public.time_entries
  FOR DELETE
  USING (
    public.fn_is_admin() OR (
      consultant_id = public.fn_current_consultant_id() AND
      client_id IN (
        select id from public.clients where assigned_consultant_id = public.fn_current_consultant_id()
      )
    )
  );
