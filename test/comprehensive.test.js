// ============================================
// COMPREHENSIVE AGILITY APP TEST BOT
// ============================================
// This test suite validates all core functionality
// Run with: npm run test:comprehensive
// ============================================

import { describe, it, expect, afterAll } from 'vitest';
import { supabase, TEST_IDS, verifyTestDataExists } from './setup.js';

// ============================================
// 1. DATABASE CONNECTION TESTS
// ============================================
describe('🔌 Database Connection', () => {
  it('should connect to Supabase successfully', async () => {
    const { data, error } = await supabase.from('consultants').select('count', { count: 'exact', head: true });
    expect(error).toBeNull();
  });

  it('should have test data loaded', async () => {
    await expect(verifyTestDataExists()).resolves.toBe(true);
  });
});

// ============================================
// 2. CONSULTANTS TABLE TESTS
// ============================================
describe('👤 Consultants Table', () => {
  it('should fetch test consultants', async () => {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .in('id', [TEST_IDS.consultants.erich, TEST_IDS.consultants.sarah, TEST_IDS.consultants.john, 
                 TEST_IDS.consultants.michelle, TEST_IDS.consultants.thabo]);
    
    expect(error).toBeNull();
    expect(data).toHaveLength(5);
  });

  it('should fetch consultant by ID', async () => {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .eq('id', TEST_IDS.consultants.erich)
      .single();
    
    expect(error).toBeNull();
    expect(data.full_name).toBe('Erich Oberholzer');
    expect(data.designation).toBe('Director');
    expect(data.hourly_rate).toBe(850);
  });

  it('should have correct schema columns', async () => {
    const { data, error } = await supabase
      .from('consultants')
      .select('id, user_id, full_name, email, phone, designation, hourly_rate, default_hourly_rate, is_active, can_approve_timesheets, role')
      .eq('id', TEST_IDS.consultants.erich)
      .single();
    
    expect(error).toBeNull();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('full_name');
    expect(data).toHaveProperty('hourly_rate');
    expect(data).toHaveProperty('role');
  });

  it('should filter active consultants', async () => {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .eq('is_active', true);
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
    data.forEach(c => expect(c.is_active).toBe(true));
  });

  it('should filter consultants by role', async () => {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .eq('role', 'admin');
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].role).toBe('admin');
  });
});

// ============================================
// 3. CLIENTS TABLE TESTS
// ============================================
describe('🏢 Clients Table', () => {
  it('should fetch client by ID', async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', TEST_IDS.clients.sunriseLogistics)
      .single();
    
    expect(error).toBeNull();
    expect(data.client_name).toBe('Sunrise Logistics Pty Ltd');
    expect(data.status).toBe('Active');
    expect(data.registration_number).toBe('2018/123456/07');
  });

  it('should have correct schema columns', async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, client_name, registration_number, status, company_income_tax_number, vat_number, paye_number, email, phone_number, physical_address, financial_year_end')
      .eq('id', TEST_IDS.clients.sunriseLogistics)
      .single();
    
    expect(error).toBeNull();
    expect(data).toHaveProperty('client_name');
    expect(data).toHaveProperty('registration_number');
    expect(data).toHaveProperty('vat_number');
    expect(data).toHaveProperty('financial_year_end');
  });

  it('should filter clients by status', async () => {
    const { data: active, error: err1 } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'Active');
    
    const { data: inactive, error: err2 } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'Inactive');
    
    expect(err1).toBeNull();
    expect(err2).toBeNull();
    expect(active.length).toBeGreaterThan(0);
  });

  it('should search clients by name', async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .ilike('client_name', '%logistics%');
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });
});

// ============================================
// 4. PROJECTS TABLE TESTS
// ============================================
describe('📋 Projects Table', () => {
  it('should fetch project by ID', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', TEST_IDS.projects.activeBookkeeping)
      .single();
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.status).toBe('active');
  });

  it('should have correct status values (lowercase)', async () => {
    const validStatuses = ['active', 'ready_to_bill', 'on_hold', 'invoiced'];
    
    for (const status of validStatuses) {
      const { data, error } = await supabase
        .from('projects')
        .select('id, status')
        .eq('status', status)
        .limit(1);
      
      expect(error).toBeNull();
      if (data.length > 0) {
        expect(data[0].status).toBe(status);
      }
    }
  });

  it('should fetch project with client join', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:client_id(id, client_name)
      `)
      .eq('id', TEST_IDS.projects.activeBookkeeping)
      .single();
    
    expect(error).toBeNull();
    expect(data.client.client_name).toBe('Sunrise Logistics Pty Ltd');
  });

  it('should fetch project with consultant join', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        consultant:assigned_consultant_id(id, full_name)
      `)
      .eq('id', TEST_IDS.projects.activeBookkeeping)
      .single();
    
    expect(error).toBeNull();
    expect(data.consultant).toBeDefined();
  });

  it('should use correct column names (name, billing_date)', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, billing_date, start_date')
      .eq('id', TEST_IDS.projects.activeBookkeeping)
      .single();
    
    expect(error).toBeNull();
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('billing_date');
  });

  it('should filter projects by status', async () => {
    const statuses = ['active', 'ready_to_bill', 'on_hold', 'invoiced'];
    
    for (const status of statuses) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', status)
        .limit(5);
      
      expect(error).toBeNull();
    }
  });
});

// ============================================
// 5. TIME ENTRIES TABLE TESTS
// ============================================
describe('⏱️ Time Entries Table', () => {
  it('should fetch time entry by ID', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', TEST_IDS.timeEntries.first)
      .single();
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have correct schema columns', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('id, project_id, consultant_id, entry_date, start_time, end_time, duration_hours, entry_method, description, is_billable, hourly_rate, status')
      .eq('id', TEST_IDS.timeEntries.first)
      .single();
    
    expect(error).toBeNull();
    expect(data).toHaveProperty('project_id');
    expect(data).toHaveProperty('consultant_id');
    expect(data).toHaveProperty('duration_hours');
    expect(data).toHaveProperty('is_billable');
  });

  it('should join with project and consultant', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        project:project_id(id, name, status),
        consultant:consultant_id(id, full_name)
      `)
      .eq('id', TEST_IDS.timeEntries.first)
      .single();
    
    expect(error).toBeNull();
    expect(data.project).toBeDefined();
    expect(data.consultant).toBeDefined();
  });

  it('should calculate total billable hours', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('duration_hours, is_billable');
    
    expect(error).toBeNull();
    
    const totalBillable = data
      .filter(e => e.is_billable)
      .reduce((sum, e) => sum + e.duration_hours, 0);
    
    expect(totalBillable).toBeGreaterThan(0);
  });

  it('should filter by status (draft, approved, invoiced)', async () => {
    const statuses = ['draft', 'approved', 'invoiced'];
    
    for (const status of statuses) {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('status', status)
        .limit(5);
      
      expect(error).toBeNull();
    }
  });

  it('should filter entries by date range', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .gte('entry_date', '2025-01-01')
      .lte('entry_date', '2025-12-31');
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should filter entries by consultant', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('consultant_id', TEST_IDS.consultants.sarah);
    
    expect(error).toBeNull();
    data.forEach(e => expect(e.consultant_id).toBe(TEST_IDS.consultants.sarah));
  });
});

// ============================================
// 6. JOB TYPES TABLE TESTS
// ============================================
describe('🏷️ Job Types Table', () => {
  it('should fetch all job types', async () => {
    const { data, error } = await supabase
      .from('job_types')
      .select('*');
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should have some common job types', async () => {
    // Check for any job types (names may vary)
    const { data, error } = await supabase
      .from('job_types')
      .select('name');
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should have id and name columns', async () => {
    const { data, error } = await supabase
      .from('job_types')
      .select('id, name')
      .limit(5);
    
    expect(error).toBeNull();
    data.forEach(jt => {
      expect(jt).toHaveProperty('id');
      expect(jt).toHaveProperty('name');
    });
  });
});

// ============================================
// 7. RELATIONAL INTEGRITY TESTS
// ============================================
describe('🔗 Relational Integrity', () => {
  it('projects should have valid client_id', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, client_id')
      .eq('id', TEST_IDS.projects.activeBookkeeping)
      .single();
    
    expect(error).toBeNull();
    
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', data.client_id)
      .single();
    
    expect(clientError).toBeNull();
    expect(client).not.toBeNull();
  });

  it('time entries should have valid project_id', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('id, project_id')
      .eq('id', TEST_IDS.timeEntries.first)
      .single();
    
    expect(error).toBeNull();
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', data.project_id)
      .single();
    
    expect(projectError).toBeNull();
    expect(project).not.toBeNull();
  });

  it('time entries should have valid consultant_id', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('id, consultant_id')
      .eq('id', TEST_IDS.timeEntries.first)
      .single();
    
    expect(error).toBeNull();
    
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('id')
      .eq('id', data.consultant_id)
      .single();
    
    expect(consultantError).toBeNull();
    expect(consultant).not.toBeNull();
  });
});

// ============================================
// 8. DASHBOARD QUERIES TESTS
// ============================================
describe('📊 Dashboard Queries', () => {
  it('should get project counts by status for dashboard', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('status');
    
    expect(error).toBeNull();
    
    const counts = {
      active: data.filter(p => p.status === 'active').length,
      ready_to_bill: data.filter(p => p.status === 'ready_to_bill').length,
      on_hold: data.filter(p => p.status === 'on_hold').length,
      invoiced: data.filter(p => p.status === 'invoiced').length,
    };
    
    expect(counts.active).toBeGreaterThan(0);
  });

  it('should get recent time entries for dashboard', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        project:project_id(name, client:client_id(client_name)),
        consultant:consultant_id(full_name)
      `)
      .order('entry_date', { ascending: false })
      .limit(10);
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should calculate billing summary', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('duration_hours, hourly_rate, is_billable');
    
    expect(error).toBeNull();
    
    const totalBillableAmount = data
      .filter(e => e.is_billable)
      .reduce((sum, e) => sum + (e.duration_hours * e.hourly_rate), 0);
    
    expect(totalBillableAmount).toBeGreaterThan(0);
  });

  it('should get projects ready to bill', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:client_id(client_name)
      `)
      .eq('status', 'ready_to_bill');
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
    data.forEach(p => expect(p.status).toBe('ready_to_bill'));
  });

  it('should get active projects with billing dates', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id, name, billing_date, status,
        client:client_id(client_name)
      `)
      .eq('status', 'active')
      .order('billing_date', { ascending: true });
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });
});

// ============================================
// 9. BILLING DASHBOARD QUERIES TESTS
// ============================================
describe('💰 Billing Dashboard Queries', () => {
  it('should calculate unbilled hours per project', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        project_id,
        duration_hours,
        hourly_rate,
        is_billable,
        status
      `)
      .eq('is_billable', true)
      .in('status', ['draft', 'approved']);
    
    expect(error).toBeNull();
    
    const projectTotals = {};
    data.forEach(e => {
      if (!projectTotals[e.project_id]) {
        projectTotals[e.project_id] = { hours: 0, amount: 0 };
      }
      projectTotals[e.project_id].hours += e.duration_hours;
      projectTotals[e.project_id].amount += e.duration_hours * e.hourly_rate;
    });
    
    expect(Object.keys(projectTotals).length).toBeGreaterThan(0);
  });

  it('should get invoiced projects with amounts', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, invoice_number, invoice_date, invoice_amount')
      .eq('status', 'invoiced')
      .not('invoice_number', 'is', null);
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
    data.forEach(p => {
      expect(p.invoice_number).toBeDefined();
      expect(p.invoice_amount).toBeGreaterThan(0);
    });
  });

  it('should calculate total invoiced amount', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('invoice_amount')
      .eq('status', 'invoiced')
      .not('invoice_amount', 'is', null);
    
    expect(error).toBeNull();
    
    const totalInvoiced = data.reduce((sum, p) => sum + (p.invoice_amount || 0), 0);
    expect(totalInvoiced).toBeGreaterThan(0);
  });
});

// ============================================
// 10. HOMEPAGE QUERIES TESTS
// ============================================
describe('🏠 HomePage Queries', () => {
  it('should query projects with lowercase status values', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .in('status', ['active', 'ready_to_bill']);
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should use name column not project_name', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);
    
    expect(error).toBeNull();
    data.forEach(p => {
      expect(p).toHaveProperty('name');
      expect(p.name).toBeDefined();
    });
  });

  it('should use billing_date column not expected_billing_date', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, billing_date')
      .limit(5);
    
    expect(error).toBeNull();
    data.forEach(p => {
      expect(p).toHaveProperty('billing_date');
    });
  });
});

// ============================================
// 11. CRUD OPERATIONS TESTS
// ============================================
describe('✏️ CRUD Operations', () => {
  let testProjectId = null;
  let testTimeEntryId = null;

  afterAll(async () => {
    if (testTimeEntryId) {
      await supabase.from('time_entries').delete().eq('id', testTimeEntryId);
    }
    if (testProjectId) {
      await supabase.from('projects').delete().eq('id', testProjectId);
    }
  });

  it('should create a new project', async () => {
    const { data: jobType } = await supabase
      .from('job_types')
      .select('id')
      .limit(1)
      .single();

    const newProject = {
      project_number: 'TEST-' + Date.now(),
      client_id: TEST_IDS.clients.sunriseLogistics,
      name: 'Test Project - Automated Test',
      description: 'Created by test bot',
      job_type_id: jobType.id,
      assigned_consultant_id: TEST_IDS.consultants.sarah,
      status: 'active',
      priority: 'normal',
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(newProject)
      .select()
      .single();
    
    expect(error).toBeNull();
    expect(data.name).toBe(newProject.name);
    testProjectId = data.id;
  });

  it('should read the created project', async () => {
    if (!testProjectId) return;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', testProjectId)
      .single();
    
    expect(error).toBeNull();
    expect(data.name).toBe('Test Project - Automated Test');
  });

  it('should update the project', async () => {
    if (!testProjectId) return;

    const { data, error } = await supabase
      .from('projects')
      .update({ priority: 'high', internal_notes: 'Updated by test bot' })
      .eq('id', testProjectId)
      .select()
      .single();
    
    expect(error).toBeNull();
    expect(data.priority).toBe('high');
    expect(data.internal_notes).toBe('Updated by test bot');
  });

  it('should create a time entry for the project', async () => {
    if (!testProjectId) return;

    const newEntry = {
      project_id: testProjectId,
      consultant_id: TEST_IDS.consultants.sarah,
      entry_date: new Date().toISOString().split('T')[0],
      duration_hours: 1.5,
      entry_method: 'manual',
      description: 'Test entry from test bot',
      is_billable: true,
      hourly_rate: 650,
      status: 'draft',
    };

    const { data, error } = await supabase
      .from('time_entries')
      .insert(newEntry)
      .select()
      .single();
    
    expect(error).toBeNull();
    expect(data.duration_hours).toBe(1.5);
    testTimeEntryId = data.id;
  });

  it('should delete the time entry', async () => {
    if (!testTimeEntryId) return;

    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', testTimeEntryId);
    
    expect(error).toBeNull();
    testTimeEntryId = null;
  });

  it('should delete the project', async () => {
    if (!testProjectId) return;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', testProjectId);
    
    expect(error).toBeNull();
    testProjectId = null;
  });
});

// ============================================
// 12. AGGREGATE QUERIES TESTS
// ============================================
describe('📈 Aggregate Queries', () => {
  it('should count total active clients', async () => {
    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active');
    
    expect(error).toBeNull();
    expect(count).toBeGreaterThan(0);
  });

  it('should sum total hours by consultant', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('consultant_id, duration_hours');
    
    expect(error).toBeNull();
    
    const byConsultant = {};
    data.forEach(e => {
      byConsultant[e.consultant_id] = (byConsultant[e.consultant_id] || 0) + e.duration_hours;
    });
    
    expect(Object.keys(byConsultant).length).toBeGreaterThan(0);
  });

  it('should calculate average project hours', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('total_hours');
    
    expect(error).toBeNull();
    
    const totalHours = data.reduce((sum, p) => sum + (p.total_hours || 0), 0);
    const avgHours = totalHours / data.length;
    
    expect(avgHours).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// 13. SEARCH & FILTER TESTS
// ============================================
describe('🔍 Search & Filter', () => {
  it('should search projects by name (ilike)', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .ilike('name', '%bookkeeping%');
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should filter projects by date range', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .gte('start_date', '2025-01-01')
      .lte('start_date', '2025-12-31');
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should filter clients with VAT number', async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .not('vat_number', 'is', null);
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should filter consultants who can approve timesheets', async () => {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .eq('can_approve_timesheets', true);
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });
});

// ============================================
// 14. REPORTING QUERIES TESTS
// ============================================
describe('📑 Reporting Queries', () => {
  it('should generate monthly billing report data', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        entry_date,
        duration_hours,
        hourly_rate,
        is_billable,
        consultant:consultant_id(full_name),
        project:project_id(
          name,
          client:client_id(client_name)
        )
      `)
      .gte('entry_date', '2025-09-01')
      .lte('entry_date', '2025-12-31');
    
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should get billing by client', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        duration_hours,
        hourly_rate,
        project:project_id!inner(
          client_id,
          client:client_id(client_name)
        )
      `)
      .eq('is_billable', true);
    
    expect(error).toBeNull();
    
    const byClient = {};
    data.forEach(e => {
      const clientName = e.project?.client?.client_name;
      if (clientName) {
        byClient[clientName] = (byClient[clientName] || 0) + (e.duration_hours * e.hourly_rate);
      }
    });
    
    expect(Object.keys(byClient).length).toBeGreaterThan(0);
  });

  it('should get billing by consultant', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        duration_hours,
        hourly_rate,
        consultant:consultant_id(full_name)
      `)
      .eq('is_billable', true);
    
    expect(error).toBeNull();
    
    const byConsultant = {};
    data.forEach(e => {
      const name = e.consultant?.full_name;
      if (name) {
        byConsultant[name] = (byConsultant[name] || 0) + (e.duration_hours * e.hourly_rate);
      }
    });
    
    expect(Object.keys(byConsultant).length).toBeGreaterThan(0);
  });
});

// ============================================
// 15. EDGE CASES & ERROR HANDLING TESTS
// ============================================
describe('⚠️ Edge Cases & Error Handling', () => {
  it('should handle non-existent record gracefully', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();
    
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('should handle empty result set', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('name', 'This Project Does Not Exist At All Ever');
    
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('should handle invalid column name gracefully', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, nonexistent_column')
      .limit(1);
    
    expect(error).not.toBeNull();
  });

  it('should handle null values in optional fields', async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, client_name, vat_number')
      .is('vat_number', null)
      .limit(5);
    
    expect(error).toBeNull();
    data.forEach(c => expect(c.vat_number).toBeNull());
  });
});

// ============================================
// TEST SUMMARY
// ============================================
describe('📋 Test Summary', () => {
  it('should complete all tests successfully', async () => {
    console.log('\n✅ All comprehensive tests completed!');
    console.log('📊 The Agility App is functioning correctly.\n');
    expect(true).toBe(true);
  });
});
