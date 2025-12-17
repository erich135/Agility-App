// ============================================
// TEST SETUP - Initialize Supabase for testing
// ============================================
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration for tests
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env file');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test data IDs for easy reference
export const TEST_IDS = {
  consultants: {
    erich: 'c0000001-0000-0000-0000-000000000001',
    sarah: 'c0000002-0000-0000-0000-000000000002',
    john: 'c0000003-0000-0000-0000-000000000003',
    michelle: 'c0000004-0000-0000-0000-000000000004',
    thabo: 'c0000005-0000-0000-0000-000000000005',
    all: [
      'c0000001-0000-0000-0000-000000000001',
      'c0000002-0000-0000-0000-000000000002', 
      'c0000003-0000-0000-0000-000000000003',
      'c0000004-0000-0000-0000-000000000004',
      'c0000005-0000-0000-0000-000000000005',
    ]
  },
  clients: {
    sunriseLogistics: 'd0000001-0000-0000-0000-000000000001',
    greenGardens: 'd0000002-0000-0000-0000-000000000002',
    techStart: 'd0000003-0000-0000-0000-000000000003',
    all: Array.from({length: 12}, (_, i) => `d000000${i+1 < 10 ? (i+1) : i+1}-0000-0000-0000-00000000000${i+1 < 10 ? (i+1) : i+1}`.replace(/0{4}(\d{2})$/, m => `0000000000${m.slice(-2)}`)).map((_, i) => 
      `d000000${String(i+1).padStart(1, '0')}-0000-0000-0000-00000000000${String(i+1).padStart(1, '0')}`
    )
  },
  projects: {
    activeBookkeeping: 'a0000001-0000-0000-0000-000000000001',
    activeVat: 'a0000002-0000-0000-0000-000000000002',
    readyToBill: 'a0000008-0000-0000-0000-000000000008',
    onHold: 'a0000011-0000-0000-0000-000000000011',
    invoiced: 'a0000012-0000-0000-0000-000000000012',
    all: Array.from({length: 16}, (_, i) => 
      `a000000${String(i+1).padStart(1, '0')}-0000-0000-0000-00000000000${String(i+1).padStart(1, '0')}`
    )
  },
  timeEntries: {
    first: 'b0000001-0000-0000-0000-000000000001',
    second: 'b0000002-0000-0000-0000-000000000002',
    all: Array.from({length: 18}, (_, i) => 
      `b000000${String(i+1).padStart(1, '0')}-0000-0000-0000-00000000000${String(i+1).padStart(1, '0')}`
    )
  }
};

// Helper to filter test data by ID range
export function testIdFilter(query, table) {
  const ranges = {
    consultants: { min: 'c0000001-0000-0000-0000-000000000001', max: 'c0000005-0000-0000-0000-000000000005' },
    clients: { min: 'd0000001-0000-0000-0000-000000000001', max: 'd0000012-0000-0000-0000-000000000012' },
    projects: { min: 'a0000001-0000-0000-0000-000000000001', max: 'a0000016-0000-0000-0000-000000000016' },
    time_entries: { min: 'b0000001-0000-0000-0000-000000000001', max: 'b0000018-0000-0000-0000-000000000018' },
  };
  const range = ranges[table];
  if (range) {
    return query.gte('id', range.min).lte('id', range.max);
  }
  return query;
}

// Helper to check if test data exists
export async function verifyTestDataExists() {
  const { data: consultants, error } = await supabase
    .from('consultants')
    .select('id')
    .eq('id', TEST_IDS.consultants.erich);

  if (error || !consultants || consultants.length === 0) {
    throw new Error('Test data not found! Please run seed_test_data.sql first.');
  }
  
  return true;
}
