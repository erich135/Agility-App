import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nhzpfukswjgbchfczhsw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oenBmdWtzd2pnYmNoZmN6aHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDE5NTAsImV4cCI6MjA3MjcxNzk1MH0.tMZ8t0rzGoLVBoRZWkikNuHUTABJQ1SKFfZ9ve9IqnQ'
);

const jobTypes = [
  { name: 'Annual Financial Statements', description: 'Preparation of annual financial statements', category: 'Accounting', sort_order: 20, is_active: true },
  { name: 'Tax Return - Individual', description: 'Personal income tax return', category: 'Tax', sort_order: 1, is_active: true },
  { name: 'Tax Return - Company', description: 'Company income tax return', category: 'Tax', sort_order: 2, is_active: true },
  { name: 'VAT Registration', description: 'VAT registration and setup', category: 'Tax', sort_order: 3, is_active: true },
  { name: 'VAT Return', description: 'Monthly/bi-monthly VAT submission', category: 'Tax', sort_order: 4, is_active: true },
  { name: 'Payroll Services', description: 'Monthly payroll processing', category: 'Labour', sort_order: 30, is_active: true },
  { name: 'CIPC Annual Return', description: 'Annual company return filing', category: 'CIPC', sort_order: 10, is_active: true },
  { name: 'Bookkeeping - Monthly', description: 'Monthly bookkeeping services', category: 'Accounting', sort_order: 21, is_active: true },
  { name: 'Audit Preparation', description: 'Preparation for external audit', category: 'Accounting', sort_order: 22, is_active: true },
  { name: 'Advisory Services', description: 'General financial advisory', category: 'Advisory', sort_order: 40, is_active: true }
];

async function addJobTypes() {
  console.log('Adding job types...');
  
  for (const jobType of jobTypes) {
    const { data, error } = await supabase
      .from('job_types')
      .upsert(jobType, { onConflict: 'name' });
    
    if (error) {
      console.log(`Error adding ${jobType.name}:`, error.message);
    } else {
      console.log(`Added: ${jobType.name}`);
    }
  }
  
  console.log('Done!');
}

addJobTypes();
