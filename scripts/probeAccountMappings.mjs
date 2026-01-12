import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: clients, error: cErr } = await supabase
  .from('clients')
  .select('id, client_name')
  .limit(1);

console.log('clients:', clients);
console.log('clients error:', cErr);

if (!clients?.length) process.exit(0);

const client_id = clients[0].id;
const payload = {
  client_id,
  account_number: 'TEST-ACC',
  line_item_code: 'current_assets',
  line_item_name: 'current_assets',
  statement_type: 'STATEMENT_OF_FINANCIAL_POSITION',
  is_manual: true,
  confidence: 1.0,
};

const { data: ins, error: iErr } = await supabase
  .from('account_mappings')
  .insert(payload)
  .select()
  .single();

console.log('insert:', ins);
console.log('insert error:', iErr);

const { data: sel, error: sErr } = await supabase
  .from('account_mappings')
  .select('*')
  .eq('client_id', client_id)
  .limit(3);

console.log('select:', sel);
console.log('select error:', sErr);

if (ins?.id) {
  const { error: dErr } = await supabase.from('account_mappings').delete().eq('id', ins.id);
  console.log('cleanup error:', dErr);
}
