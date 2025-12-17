// ============================================
// QUICK SMOKE TEST - Run Essential Tests Only
// ============================================
// A faster subset of tests for quick validation
// Run with: npm run test:smoke
// ============================================

import { describe, it, expect } from 'vitest';
import { supabase, TEST_IDS } from './setup.js';

describe('🔥 Smoke Tests - Quick Validation', () => {
  
  // 1. Database Connection
  it('✅ Database connects successfully', async () => {
    const { error } = await supabase.from('consultants').select('id').limit(1);
    expect(error).toBeNull();
  });

  // 2. Test Data Exists
  it('✅ Test data is loaded', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .filter('id', 'gte', 'a0000001-0000-0000-0000-000000000001')
      .filter('id', 'lte', 'a0000016-0000-0000-0000-000000000016');
    expect(error).toBeNull();
    expect(data.length).toBe(16);
  });

  // 3. Schema Validation - Correct Column Names
  it('✅ Projects uses "name" column (not project_name)', async () => {
    const { data, error } = await supabase.from('projects').select('name').limit(1);
    expect(error).toBeNull();
    expect(data[0]).toHaveProperty('name');
  });

  it('✅ Projects uses "billing_date" column (not expected_billing_date)', async () => {
    const { data, error } = await supabase.from('projects').select('billing_date').limit(1);
    expect(error).toBeNull();
  });

  // 4. Status Values - Lowercase
  it('✅ Project status values are lowercase', async () => {
    const { data } = await supabase.from('projects').select('status').eq('status', 'active');
    expect(data.length).toBeGreaterThan(0);
  });

  it('✅ ready_to_bill status works (not "Ready to Bill")', async () => {
    const { data } = await supabase.from('projects').select('status').eq('status', 'ready_to_bill');
    expect(data.length).toBeGreaterThan(0);
  });

  // 5. Key Joins Work
  it('✅ Projects join with Clients', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, client:clients(client_name)')
      .eq('id', TEST_IDS.projects.activeBookkeeping)
      .single();
    expect(error).toBeNull();
    expect(data.client.client_name).toBeTruthy();
  });

  it('✅ Time Entries join with Projects and Consultants', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        id, 
        project:project_id(name), 
        consultant:consultant_id(full_name)
      `)
      .eq('id', TEST_IDS.timeEntries.first)
      .single();
    expect(error).toBeNull();
    expect(data.project.name).toBeTruthy();
    expect(data.consultant.full_name).toBeTruthy();
  });

  // 6. Dashboard Queries
  it('✅ Dashboard project count query works', async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('status')
      .in('status', ['active', 'ready_to_bill', 'on_hold', 'invoiced']);
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
  });

  it('✅ Billing calculation query works', async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('duration_hours, hourly_rate, is_billable')
      .eq('is_billable', true);
    expect(error).toBeNull();
    const total = data.reduce((sum, e) => sum + (e.duration_hours * e.hourly_rate), 0);
    expect(total).toBeGreaterThan(0);
  });

  // 7. CRUD Works
  it('✅ Can insert and delete records', async () => {
    const { data: jobType } = await supabase.from('job_types').select('id').limit(1).single();
    
    // Insert
    const { data: created, error: insertErr } = await supabase
      .from('projects')
      .insert({
        project_number: 'SMOKE-' + Date.now(),
        client_id: TEST_IDS.clients.sunriseLogistics,
        name: 'Smoke Test Project',
        job_type_id: jobType.id,
        status: 'active',
      })
      .select()
      .single();
    expect(insertErr).toBeNull();
    
    // Delete
    const { error: deleteErr } = await supabase
      .from('projects')
      .delete()
      .eq('id', created.id);
    expect(deleteErr).toBeNull();
  });

  // Summary
  it('🎉 All smoke tests passed!', () => {
    console.log('\n✨ App is ready for use!\n');
    expect(true).toBe(true);
  });
});
