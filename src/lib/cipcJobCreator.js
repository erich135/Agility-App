// src/lib/cipcJobCreator.js
// Shared utility for creating CIPC Annual Return + BO Filing jobs
// Used by both the CIPC Management UI button and the cron auto-creator

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Create CIPC Annual Return and BO Filing jobs for a client.
 * Skips creation if matching jobs already exist for the same period.
 *
 * @param {object} supabase - Supabase client instance
 * @param {object} client - Client row (must have id, client_name, registration_date)
 * @param {object} [options]
 * @param {string} [options.createdBy] - User ID who triggered creation (null for cron)
 * @param {string} [options.createdByName] - Display name (null for cron)
 * @returns {{ created: string[], skipped: string[], errors: string[] }}
 */
export async function createCIPCJobs(supabase, client, options = {}) {
  const result = { created: [], skipped: [], errors: [] };
  const { createdBy = null, createdByName = null } = options;

  if (!client.registration_date) {
    result.errors.push('No registration date — cannot determine due month');
    return result;
  }

  const regDate = new Date(client.registration_date);
  const dueMonthIndex = regDate.getMonth(); // 0-based
  const now = new Date();
  const currentYear = now.getFullYear();

  // The period for the current cycle (e.g. "April 2026")
  const period = `${MONTH_NAMES[dueMonthIndex]} ${currentYear}`;

  // Due date = last day of the due month
  const dueDate = new Date(currentYear, dueMonthIndex + 1, 0); // day 0 of next month = last day
  const dueDateStr = dueDate.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  // Fetch templates for CIPC Annual Return and BO Filing
  const { data: templates, error: tmplErr } = await supabase
    .from('job_templates')
    .select('*, job_template_checklist(*)')
    .in('job_type', ['cipc_annual_return', 'cipc_bo_filing'])
    .eq('is_active', true);

  if (tmplErr) {
    result.errors.push(`Failed to fetch templates: ${tmplErr.message}`);
    return result;
  }

  const arTemplate = templates?.find(t => t.job_type === 'cipc_annual_return') || null;
  const boTemplate = templates?.find(t => t.job_type === 'cipc_bo_filing') || null;

  // Check for existing jobs for this client + period to avoid duplicates
  const { data: existing, error: existErr } = await supabase
    .from('job_register')
    .select('id, job_type, period')
    .eq('client_id', client.id)
    .in('job_type', ['cipc_annual_return', 'cipc_bo_filing'])
    .eq('period', period);

  if (existErr) {
    result.errors.push(`Failed to check existing jobs: ${existErr.message}`);
    return result;
  }

  const existingTypes = new Set((existing || []).map(j => j.job_type));

  // Define the two jobs to create
  const jobDefs = [
    {
      type: 'cipc_annual_return',
      title: `CIPC Annual Return – ${client.client_name}`,
      template: arTemplate,
    },
    {
      type: 'cipc_bo_filing',
      title: `CIPC Beneficial Ownership Filing – ${client.client_name}`,
      template: boTemplate,
    },
  ];

  for (const def of jobDefs) {
    if (existingTypes.has(def.type)) {
      result.skipped.push(def.type);
      continue;
    }

    const payload = {
      client_id: client.id,
      title: def.title,
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
      created_by: createdBy,
      notes: `Auto-created for ${MONTH_NAMES[dueMonthIndex]} ${currentYear} CIPC cycle`,
      updated_at: new Date().toISOString(),
    };

    const { data: newJob, error: insErr } = await supabase
      .from('job_register')
      .insert([payload])
      .select()
      .single();

    if (insErr) {
      result.errors.push(`Failed to create ${def.type}: ${insErr.message}`);
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
        details: `Job auto-created for CIPC ${MONTH_NAMES[dueMonthIndex]} ${currentYear} cycle`,
        performed_by: createdBy,
        performed_by_name: createdByName || 'System (CIPC Auto)',
      }]);
    }

    result.created.push(def.type);
  }

  return result;
}
