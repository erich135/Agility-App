// API: Cron endpoint — auto-create CIPC Annual Return + BO Filing jobs
// Runs on the 1st of every month via Vercel Cron
// GET /api/cron-cipc-jobs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default async function handler(req, res) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-based
    const currentYear = now.getFullYear();
    const period = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    const todayStr = now.toISOString().split('T')[0];

    // Due date = last day of the current month
    const dueDate = new Date(currentYear, currentMonth + 1, 0);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    console.log(`[CIPC Cron] Running for ${period}, due month index: ${currentMonth}`);

    // Fetch all active clients whose registration_date month = current month
    const { data: allClients, error: clientErr } = await supabase
      .from('clients')
      .select('id, client_name, registration_date, status')
      .not('registration_date', 'is', null);

    if (clientErr) throw clientErr;

    // Filter to clients whose registration month matches current month
    const dueClients = (allClients || []).filter(c => {
      if (c.status && c.status.toLowerCase() === 'inactive') return false;
      const regDate = new Date(c.registration_date);
      return regDate.getMonth() === currentMonth;
    });

    console.log(`[CIPC Cron] Found ${dueClients.length} clients due in ${MONTH_NAMES[currentMonth]}`);

    if (dueClients.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No clients due in ${MONTH_NAMES[currentMonth]}`,
        created: 0,
        skipped: 0,
      });
    }

    // Fetch templates
    const { data: templates, error: tmplErr } = await supabase
      .from('job_templates')
      .select('*, job_template_checklist(*)')
      .in('job_type', ['cipc_annual_return', 'cipc_bo_filing'])
      .eq('is_active', true);

    if (tmplErr) throw tmplErr;

    const arTemplate = templates?.find(t => t.job_type === 'cipc_annual_return') || null;
    const boTemplate = templates?.find(t => t.job_type === 'cipc_bo_filing') || null;

    // Fetch existing jobs for this period to avoid duplicates (batch query)
    const clientIds = dueClients.map(c => c.id);
    const { data: existingJobs, error: existErr } = await supabase
      .from('job_register')
      .select('id, client_id, job_type, period')
      .in('client_id', clientIds)
      .in('job_type', ['cipc_annual_return', 'cipc_bo_filing'])
      .eq('period', period);

    if (existErr) throw existErr;

    // Build a set of "clientId:jobType" for fast lookup
    const existingSet = new Set(
      (existingJobs || []).map(j => `${j.client_id}:${j.job_type}`)
    );

    let totalCreated = 0;
    let totalSkipped = 0;
    const errors = [];

    const jobDefs = [
      { type: 'cipc_annual_return', titlePrefix: 'CIPC Annual Return', template: arTemplate },
      { type: 'cipc_bo_filing', titlePrefix: 'CIPC Beneficial Ownership Filing', template: boTemplate },
    ];

    for (const client of dueClients) {
      for (const def of jobDefs) {
        const key = `${client.id}:${def.type}`;
        if (existingSet.has(key)) {
          totalSkipped++;
          continue;
        }

        const payload = {
          client_id: client.id,
          title: `${def.titlePrefix} – ${client.client_name}`,
          description: def.template?.description || null,
          job_type: def.type,
          category: 'cipc',
          tax_year: String(currentYear),
          period,
          status: 'not_started',
          priority: def.template?.default_priority || 'high',
          date_due: dueDateStr,
          date_created: todayStr,
          is_recurring: true,
          recurrence_pattern: 'annually',
          template_id: def.template?.id || null,
          created_by: null,
          notes: `Auto-created by system for ${period} CIPC cycle`,
          updated_at: now.toISOString(),
        };

        const { data: newJob, error: insErr } = await supabase
          .from('job_register')
          .insert([payload])
          .select()
          .single();

        if (insErr) {
          errors.push(`${client.client_name} - ${def.type}: ${insErr.message}`);
          continue;
        }

        // Copy checklist items from template
        const tmplItems = def.template?.job_template_checklist || [];
        if (tmplItems.length > 0 && newJob) {
          const items = tmplItems.map(ti => ({
            job_id: newJob.id,
            title: ti.title,
            description: ti.description || null,
            sort_order: ti.sort_order,
            is_required: ti.is_required,
          }));
          await supabase.from('job_checklist_items').insert(items);
        }

        // Log activity
        if (newJob) {
          await supabase.from('job_activity_log').insert([{
            job_id: newJob.id,
            action: 'created',
            details: `Job auto-created by CIPC cron for ${period} cycle`,
            performed_by: null,
            performed_by_name: 'System (CIPC Cron)',
          }]);
        }

        totalCreated++;
      }
    }

    console.log(`[CIPC Cron] Done: ${totalCreated} created, ${totalSkipped} skipped, ${errors.length} errors`);

    return res.status(200).json({
      success: true,
      month: MONTH_NAMES[currentMonth],
      year: currentYear,
      clientsDue: dueClients.length,
      created: totalCreated,
      skipped: totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[CIPC Cron] Fatal error:', err);
    return res.status(500).json({ error: err.message });
  }
}
