// ============================================
// TIMESHEET SERVICE
// Handles all timesheet-related database operations
// ============================================

import supabase from '../lib/SupabaseClient';

// ============================================
// CONSULTANT OPERATIONS
// ============================================

export const ConsultantService = {
  // Get all active consultants
  async getAll() {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .eq('is_active', true)
      .order('full_name');
    
    return { data, error };
  },

  // Get consultant by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  },

  // Get consultant by user_id (for linking to auth)
  async getByUserId(userId) {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    return { data, error };
  },

  // Create new consultant
  async create(consultant) {
    const { data, error } = await supabase
      .from('consultants')
      .insert(consultant)
      .select()
      .single();
    
    return { data, error };
  },

  // Update consultant
  async update(id, updates) {
    const { data, error } = await supabase
      .from('consultants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }
};

// ============================================
// JOB TYPE OPERATIONS
// ============================================

export const JobTypeService = {
  // Get all active job types
  async getAll() {
    const { data, error } = await supabase
      .from('job_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    return { data, error };
  },

  // Get job types by category
  async getByCategory(category) {
    const { data, error } = await supabase
      .from('job_types')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('sort_order');
    
    return { data, error };
  },

  // Get job type by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('job_types')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  }
};

// ============================================
// CLIENT OPERATIONS
// ============================================

export const ClientService = {
  // Get all clients
  async getAll() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('client_name');
    
    return { data, error };
  },

  // Get client by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  }
};

// ============================================
// PROJECT OPERATIONS
// ============================================

export const ProjectService = {
  // Get all projects with related data
  async getAll(filters = {}) {
    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, client_name),
        job_type:job_types(id, name, category),
        assigned_consultant:consultants(id, full_name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters.assigned_consultant_id) {
      query = query.eq('assigned_consultant_id', filters.assigned_consultant_id);
    }
    if (filters.status_in) {
      query = query.in('status', filters.status_in);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Get projects for a specific client
  async getByClient(clientId) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        job_type:job_types(id, name, category),
        assigned_consultant:consultants(id, full_name)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  // Get active projects for a client (for dropdown)
  async getActiveByClient(clientId) {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_number, name, status')
      .eq('client_id', clientId)
      .in('status', ['active', 'on_hold'])
      .order('name');
    
    return { data, error };
  },

  // Get project by ID with full details
  async getById(id) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, client_name, email, phone_number),
        job_type:job_types(id, name, category),
        assigned_consultant:consultants(id, full_name, email)
      `)
      .eq('id', id)
      .single();
    
    return { data, error };
  },

  // Create new project
  async create(project) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...project,
        start_date: project.start_date || new Date().toISOString().split('T')[0]
      })
      .select(`
        *,
        client:clients(id, client_name),
        job_type:job_types(id, name, category)
      `)
      .single();
    
    return { data, error };
  },

  // Update project
  async update(id, updates) {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        client:clients(id, client_name),
        job_type:job_types(id, name, category)
      `)
      .single();
    
    return { data, error };
  },

  // Mark project as ready to bill
  async markReadyToBill(id, notes = '') {
    const { data, error } = await supabase
      .from('projects')
      .update({ 
        status: 'ready_to_bill',
        completed_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },

  // Mark project as invoiced
  async markInvoiced(id, invoiceNumber, invoiceDate, invoiceAmount) {
    const { data, error } = await supabase
      .from('projects')
      .update({ 
        status: 'invoiced',
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        invoice_amount: invoiceAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },

  // Get projects ready to bill
  async getReadyToBill() {
    const { data, error } = await supabase
      .from('v_projects_ready_to_bill')
      .select('*')
      .order('billing_date', { ascending: true, nullsFirst: false });
    
    return { data, error };
  }
};

// ============================================
// TIME ENTRY OPERATIONS
// ============================================

export const TimeEntryService = {
  // Get time entries with filters
  async getAll(filters = {}) {
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(id, project_number, name, client:clients(id, client_name)),
        consultant:consultants(id, full_name)
      `)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters.consultant_id) {
      query = query.eq('consultant_id', filters.consultant_id);
    }
    if (filters.date_from) {
      query = query.gte('entry_date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('entry_date', filters.date_to);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Get time entries for a project
  async getByProject(projectId) {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        consultant:consultants(id, full_name)
      `)
      .eq('project_id', projectId)
      .order('entry_date', { ascending: false });
    
    return { data, error };
  },

  // Get time entries for a consultant (their timesheet)
  async getByConsultant(consultantId, dateFrom, dateTo) {
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(id, project_number, name, client:clients(id, client_name))
      `)
      .eq('consultant_id', consultantId)
      .order('entry_date', { ascending: false });

    if (dateFrom) {
      query = query.gte('entry_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('entry_date', dateTo);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Get single time entry
  async getById(id) {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(id, project_number, name, client:clients(id, client_name)),
        consultant:consultants(id, full_name)
      `)
      .eq('id', id)
      .single();
    
    return { data, error };
  },

  // Create manual time entry
  async create(entry) {
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        ...entry,
        entry_date: entry.entry_date || new Date().toISOString().split('T')[0],
        entry_method: 'manual'
      })
      .select(`
        *,
        project:projects(id, project_number, name)
      `)
      .single();
    
    return { data, error };
  },

  // Update time entry
  async update(id, updates) {
    // If duration is being changed and it was from timer, mark as adjusted
    const updateData = { 
      ...updates, 
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('time_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },

  // Delete time entry
  async delete(id) {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id);
    
    return { error };
  },

  // Start timer - creates entry with timer_active = true
  async startTimer(projectId, consultantId, description = '') {
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        project_id: projectId,
        consultant_id: consultantId,
        entry_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toISOString(),
        duration_hours: 0,
        entry_method: 'timer',
        timer_active: true,
        description: description,
        status: 'draft'
      })
      .select()
      .single();
    
    return { data, error };
  },

  // Stop timer - calculates duration and marks timer_active = false
  async stopTimer(timeEntryId) {
    // First get the entry to calculate duration
    const { data: entry, error: fetchError } = await supabase
      .from('time_entries')
      .select('start_time')
      .eq('id', timeEntryId)
      .single();

    if (fetchError) return { data: null, error: fetchError };

    const startTime = new Date(entry.start_time);
    const endTime = new Date();
    const durationHours = (endTime - startTime) / (1000 * 60 * 60); // Convert ms to hours

    const { data, error } = await supabase
      .from('time_entries')
      .update({
        end_time: endTime.toISOString(),
        duration_hours: Math.round(durationHours * 100) / 100, // Round to 2 decimal places
        timer_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', timeEntryId)
      .select()
      .single();
    
    return { data, error };
  },

  // Get active timer for a consultant
  async getActiveTimer(consultantId) {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(id, project_number, name, client:clients(id, client_name))
      `)
      .eq('consultant_id', consultantId)
      .eq('timer_active', true)
      .single();
    
    return { data, error };
  },

  // Get all active timers (for admin view)
  async getAllActiveTimers() {
    const { data, error } = await supabase
      .from('v_active_timers')
      .select('*');
    
    return { data, error };
  }
};

// ============================================
// NOTIFICATION OPERATIONS
// ============================================

export const TimesheetNotificationService = {
  // Get notifications for a user
  async getByRecipient(recipientId, unreadOnly = false) {
    let query = supabase
      .from('timesheet_notifications')
      .select(`
        *,
        project:projects(id, project_number, name)
      `)
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Get unread count
  async getUnreadCount(recipientId) {
    const { count, error } = await supabase
      .from('timesheet_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', recipientId)
      .eq('is_read', false);
    
    return { count, error };
  },

  // Mark notification as read
  async markRead(id) {
    const { data, error } = await supabase
      .from('timesheet_notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },

  // Mark all as read for a user
  async markAllRead(recipientId) {
    const { error } = await supabase
      .from('timesheet_notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('recipient_id', recipientId)
      .eq('is_read', false);
    
    return { error };
  },

  // Create notification
  async create(notification) {
    const { data, error } = await supabase
      .from('timesheet_notifications')
      .insert(notification)
      .select()
      .single();
    
    return { data, error };
  }
};

// ============================================
// BILLING REMINDER OPERATIONS
// ============================================

export const BillingReminderService = {
  // Get upcoming reminders
  async getUpcoming(daysAhead = 7) {
    const { data, error } = await supabase
      .from('v_upcoming_reminders')
      .select('*');
    
    return { data, error };
  },

  // Dismiss reminder
  async dismiss(id, dismissedBy) {
    const { data, error } = await supabase
      .from('billing_reminders')
      .update({
        is_dismissed: true,
        dismissed_at: new Date().toISOString(),
        dismissed_by: dismissedBy
      })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },

  // Mark as sent
  async markSent(id) {
    const { data, error } = await supabase
      .from('billing_reminders')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }
};

// ============================================
// REPORTING OPERATIONS
// ============================================

export const ReportingService = {
  // Get monthly billable hours
  async getMonthlyBillableHours(filters = {}) {
    let query = supabase
      .from('v_monthly_billable_hours')
      .select('*')
      .order('month', { ascending: false });

    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters.consultant_id) {
      query = query.eq('consultant_id', filters.consultant_id);
    }
    if (filters.job_category) {
      query = query.eq('job_category', filters.job_category);
    }
    if (filters.month_from) {
      query = query.gte('month', filters.month_from);
    }
    if (filters.month_to) {
      query = query.lte('month', filters.month_to);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Get dashboard stats
  async getDashboardStats(consultantId = null) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Get counts
    let projectQuery = supabase.from('projects').select('status', { count: 'exact' });
    let timeQuery = supabase
      .from('time_entries')
      .select('duration_hours, is_billable, hourly_rate')
      .gte('entry_date', startOfMonth)
      .lte('entry_date', endOfMonth);

    if (consultantId) {
      projectQuery = projectQuery.eq('assigned_consultant_id', consultantId);
      timeQuery = timeQuery.eq('consultant_id', consultantId);
    }

    const [projectsRes, timeRes, activeTimersRes, readyToBillRes] = await Promise.all([
      projectQuery,
      timeQuery,
      supabase.from('time_entries').select('*', { count: 'exact', head: true }).eq('timer_active', true),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'ready_to_bill')
    ]);

    // Calculate stats
    const projects = projectsRes.data || [];
    const timeEntries = timeRes.data || [];

    const stats = {
      total_projects: projects.length,
      active_projects: projects.filter(p => p.status === 'active').length,
      projects_ready_to_bill: readyToBillRes.count || 0,
      overdue_invoices: 0, // TODO: Calculate based on billing_date
      total_hours_this_month: timeEntries.reduce((sum, e) => sum + (e.duration_hours || 0), 0),
      billable_hours_this_month: timeEntries.filter(e => e.is_billable).reduce((sum, e) => sum + (e.duration_hours || 0), 0),
      revenue_this_month: timeEntries.filter(e => e.is_billable).reduce((sum, e) => sum + ((e.duration_hours || 0) * (e.hourly_rate || 500)), 0),
      active_timers: activeTimersRes.count || 0
    };

    return { data: stats, error: null };
  }
};

// Export all services
export default {
  ConsultantService,
  JobTypeService,
  ProjectService,
  TimeEntryService,
  TimesheetNotificationService,
  BillingReminderService,
  ReportingService
};
