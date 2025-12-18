-- ============================================
-- VERIFY SYSTEM SETUP FOR TESTING
-- Run this to check all tables and data are ready
-- ============================================

-- 1. Check Consultants Table
SELECT '=== CONSULTANTS ===' as section;
SELECT COUNT(*) as total_consultants FROM public.consultants;
SELECT id, full_name, designation, role, is_active FROM public.consultants ORDER BY role, full_name;

-- 2. Check Job Types Table
SELECT '=== JOB TYPES ===' as section;
SELECT COUNT(*) as total_job_types FROM public.job_types WHERE is_active = true;
SELECT id, name, category FROM public.job_types WHERE is_active = true ORDER BY sort_order LIMIT 10;

-- 3. Check Clients Table
SELECT '=== CLIENTS ===' as section;
SELECT COUNT(*) as total_clients FROM public.clients;
SELECT id, client_name FROM public.clients ORDER BY client_name LIMIT 10;

-- 4. Check Projects Table
SELECT '=== PROJECTS ===' as section;
SELECT COUNT(*) as total_projects FROM public.projects;
SELECT 
    p.id, 
    p.project_number, 
    p.name, 
    p.status,
    c.client_name,
    cons.full_name as assigned_to
FROM public.projects p
LEFT JOIN public.clients c ON p.client_id = c.id
LEFT JOIN public.consultants cons ON p.assigned_consultant_id = cons.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 5. Check Time Entries Table
SELECT '=== TIME ENTRIES ===' as section;
SELECT COUNT(*) as total_time_entries FROM public.time_entries;

-- 6. Check RLS Status
SELECT '=== RLS STATUS ===' as section;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('consultants', 'projects', 'time_entries', 'job_types', 'clients')
ORDER BY tablename;

-- 7. Check for Missing Foreign Keys / Orphaned Records
SELECT '=== DATA INTEGRITY ===' as section;

-- Projects without valid client
SELECT 'Projects with invalid client_id:' as check_type, COUNT(*) as count
FROM public.projects p
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id);

-- Projects without valid job_type (if set)
SELECT 'Projects with invalid job_type_id:' as check_type, COUNT(*) as count
FROM public.projects p
WHERE p.job_type_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM public.job_types jt WHERE jt.id = p.job_type_id);

-- 8. Summary
SELECT '=== SETUP SUMMARY ===' as section;
SELECT 
    (SELECT COUNT(*) FROM public.consultants WHERE is_active = true) as active_consultants,
    (SELECT COUNT(*) FROM public.job_types WHERE is_active = true) as active_job_types,
    (SELECT COUNT(*) FROM public.clients) as total_clients,
    (SELECT COUNT(*) FROM public.projects) as total_projects,
    (SELECT COUNT(*) FROM public.projects WHERE status = 'active') as active_projects;
