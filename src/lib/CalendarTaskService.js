import supabase from './SupabaseClient';
import ActivityLogger from './ActivityLogger';

/**
 * Calendar & Task Management Service
 * Handles tasks, calendar events, document deadlines, and multi-user assignments
 */
class CalendarTaskService {

  // ========== USER MANAGEMENT ==========
  
  /**
   * Get all available users for assignment
   */
  static async getAllUsers() {
    try {
      const { data, error} = await supabase
        .from('users')
        .select('id, email, full_name, phone, role')
        .order('full_name');

      if (error) throw error;
      
      // Map the users table fields to match expected format
      return data.map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        department: null, // users table doesn't have department
        avatar_url: null,
        is_active: true
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      // Return mock users for development
      return [
        {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'john.doe@example.com',
          full_name: 'John Doe',
          department: 'Accounting',
          role: 'Senior Accountant',
          avatar_url: null
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          email: 'jane.smith@example.com',
          full_name: 'Jane Smith',
          department: 'Administration',
          role: 'Office Manager',
          avatar_url: null
        },
        {
          id: '00000000-0000-0000-0000-000000000003',
          email: 'mike.wilson@example.com',
          full_name: 'Mike Wilson',
          department: 'Compliance',
          role: 'Compliance Officer',
          avatar_url: null
        }
      ];
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone, role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      // Map to expected format
      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        role: data.role,
        department: null,
        avatar_url: null,
        is_active: true
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  // ========== TASK MANAGEMENT ==========
  
  /**
   * Create a new task with multiple assignees
   */
  static async createTask({
    title,
    description = '',
    assignedTo = null, // Primary assignee (for backward compatibility)
    assignees = [], // Array of user IDs for multiple assignees
    clientId = null,
    taskType = 'general',
    priority = 'medium',
    dueDate = null,
    metadata = {},
    createdBy
  }) {
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo,
        client_id: clientId,
        task_type: taskType,
        priority,
        due_date: dueDate,
        metadata,
        created_by: createdBy,
        status: 'pending'
      };

      const { data: task, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;

      // Add multiple assignees if provided
      if (assignees && assignees.length > 0) {
        await this.addTaskAssignees(task.id, assignees, createdBy);
      }

      // Log task creation
      if (createdBy) {
        await ActivityLogger.log({
          userId: createdBy,
          userName: 'User',
          action: 'task_create',
          entityType: 'task',
          entityId: task.id,
          entityName: title,
          details: { task_type: taskType, priority, due_date: dueDate }
        });
      }

      return { success: true, task: task };
    } catch (error) {
      console.error('Error creating task:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add multiple assignees to a task
   */
  static async addTaskAssignees(taskId, userIds, assignedBy = null, role = 'assignee') {
    try {
      const { error } = await supabase.rpc('add_task_assignees', {
        p_task_id: taskId,
        p_user_ids: userIds,
        p_assigned_by: assignedBy,
        p_role: role
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error adding task assignees:', error);
      // Fallback to manual insertion for development
      const assignments = userIds.map(userId => ({
        task_id: taskId,
        user_id: userId,
        role: role,
        assigned_by: assignedBy
      }));

      const { error: insertError } = await supabase
        .from('task_assignments')
        .upsert(assignments);

      if (insertError) {
        return { success: false, error: insertError.message };
      }
      return { success: true };
    }
  }

  /**
   * Get task assignees
   */
  static async getTaskAssignees(taskId) {
    try {
      const { data, error } = await supabase
        .from('task_assignments_with_users')
        .select('*')
        .eq('task_id', taskId)
        .order('assigned_at');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching task assignees:', error);
      return [];
    }
  }

  /**
   * Remove assignee from task
   */
  static async removeTaskAssignee(taskId, userId) {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error removing task assignee:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get tasks with filtering options
   */
  static async getTasks({
    assignedTo = null,
    clientId = null,
    status = null,
    taskType = null,
    dueDateFrom = null,
    dueDateTo = null,
    limit = 50,
    offset = 0
  } = {}) {
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:assigned_to(id, full_name, email),
          created_user:created_by(id, full_name, email),
          client:client_id(id, client_name, registration_number)
        `)
        .order('created_at', { ascending: false });

      if (assignedTo) query = query.eq('assigned_to', assignedTo);
      if (clientId) query = query.eq('client_id', clientId);
      if (status) query = query.eq('status', status);
      if (taskType) query = query.eq('task_type', taskType);
      if (dueDateFrom) query = query.gte('due_date', dueDateFrom);
      if (dueDateTo) query = query.lte('due_date', dueDateTo);

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        tasks: data || [],
        totalCount: count,
        hasMore: (data?.length || 0) === limit
      };
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return { success: false, error: error.message, tasks: [] };
    }
  }

  /**
   * Update task status and details
   */
  static async updateTask(taskId, updates, userId = null) {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      if (updates.status === 'completed' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // Log task update
      if (userId) {
        await ActivityLogger.log({
          userId,
          userName: 'User',
          action: 'task_update',
          entityType: 'task',
          entityId: taskId,
          entityName: data.title,
          details: updates
        });
      }

      return { success: true, task: data };
    } catch (error) {
      console.error('Error updating task:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update task status specifically
   */
  static async updateTaskStatus(taskId, status, userId = null) {
    try {
      const updates = { 
        status,
        updated_at: new Date().toISOString()
      };

      // Add completion timestamp if marking as completed
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // Log status update
      if (userId) {
        await ActivityLogger.log({
          userId,
          userName: 'User',
          action: 'task_status_update',
          entityType: 'task',
          entityId: taskId,
          entityName: data.title,
          details: { old_status: data.status, new_status: status }
        });
      }

      return { success: true, task: data };
    } catch (error) {
      console.error('Error updating task status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(taskId, userId = null) {
    try {
      const { data: task } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', taskId)
        .single();

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Log task deletion
      if (userId && task) {
        await ActivityLogger.log({
          userId,
          userName: 'User',
          action: 'task_delete',
          entityType: 'task',
          entityId: taskId,
          entityName: task.title,
          details: {}
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting task:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== CALENDAR EVENTS ==========

  /**
   * Create a calendar event with multiple attendees
   */
  static async createCalendarEvent({
    title,
    description = '',
    eventType = 'meeting',
    startTime,
    endTime,
    location = '',
    clientId = null,
    attendees = [], // Array of user IDs for the new attendee system
    isAllDay = false,
    recurrenceRule = null,
    metadata = {},
    createdBy
  }) {
    try {
      const eventData = {
        title: title.trim(),
        description: description.trim(),
        event_type: eventType,
        start_time: startTime,
        end_time: endTime,
        location: location.trim(),
        client_id: clientId,
        attendees: JSON.stringify(attendees), // Keep for backward compatibility
        is_all_day: isAllDay,
        recurrence_rule: recurrenceRule,
        metadata,
        created_by: createdBy
      };

      const { data: event, error } = await supabase
        .from('calendar_events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      // Add attendees to the new event_attendees table
      if (attendees && attendees.length > 0) {
        await this.addEventAttendees(event.id, attendees, createdBy);
      }

      // Log event creation
      if (createdBy) {
        await ActivityLogger.log({
          userId: createdBy,
          userName: 'User',
          action: 'calendar_event_create',
          entityType: 'calendar_event',
          entityId: event.id,
          entityName: title,
          details: { event_type: eventType, start_time: startTime }
        });
      }

      return { success: true, event: event };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add multiple attendees to an event
   */
  static async addEventAttendees(eventId, userIds, invitedBy = null, role = 'attendee') {
    try {
      const { error } = await supabase.rpc('add_event_attendees', {
        p_event_id: eventId,
        p_user_ids: userIds,
        p_invited_by: invitedBy,
        p_role: role
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error adding event attendees:', error);
      // Fallback to manual insertion for development
      const attendees = userIds.map(userId => ({
        event_id: eventId,
        user_id: userId,
        role: role,
        invited_by: invitedBy
      }));

      const { error: insertError } = await supabase
        .from('event_attendees')
        .upsert(attendees);

      if (insertError) {
        return { success: false, error: insertError.message };
      }
      return { success: true };
    }
  }

  /**
   * Get event attendees
   */
  static async getEventAttendees(eventId) {
    try {
      const { data, error } = await supabase
        .from('event_attendees_with_users')
        .select('*')
        .eq('event_id', eventId)
        .order('invited_at');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching event attendees:', error);
      return [];
    }
  }

  /**
   * Update attendee response status
   */
  static async updateAttendeeResponse(eventId, userId, status) {
    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({ 
          response_status: status, 
          response_at: new Date().toISOString() 
        })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating attendee response:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a calendar event
   */
  static async deleteCalendarEvent(eventId, userId = null) {
    try {
      const { data: event } = await supabase
        .from('calendar_events')
        .select('title')
        .eq('id', eventId)
        .single();

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // Log event deletion
      if (userId && event) {
        await ActivityLogger.log({
          userId,
          userName: 'User',
          action: 'calendar_event_delete',
          entityType: 'calendar_event',
          entityId: eventId,
          entityName: event.title
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get calendar events for a date range
   */
  static async getCalendarEvents({
    startDate,
    endDate,
    clientId = null,
    eventType = null,
    createdBy = null
  } = {}) {
    try {
      let query = supabase
        .from('calendar_events')
        .select(`
          *,
          created_user:created_by(id, full_name, email),
          client:client_id(id, client_name, registration_number)
        `)
        .order('start_time', { ascending: true });

      if (startDate) query = query.gte('start_time', startDate);
      if (endDate) query = query.lte('end_time', endDate);
      if (clientId) query = query.eq('client_id', clientId);
      if (eventType) query = query.eq('event_type', eventType);
      if (createdBy) query = query.eq('created_by', createdBy);

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, events: data || [] };
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return { success: false, error: error.message, events: [] };
    }
  }

  // ========== DOCUMENT DEADLINES ==========

  /**
   * Create a document deadline
   */
  static async createDocumentDeadline({
    clientId,
    documentType,
    deadlineDate,
    description = '',
    priority = 'medium',
    notes = '',
    createdBy
  }) {
    try {
      const deadlineData = {
        client_id: clientId,
        document_type: documentType,
        deadline_date: deadlineDate,
        description: description.trim(),
        priority,
        notes: notes.trim(),
        created_by: createdBy,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('document_deadlines')
        .insert([deadlineData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, deadline: data };
    } catch (error) {
      console.error('Error creating document deadline:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get upcoming document deadlines
   */
  static async getDocumentDeadlines({
    clientId = null,
    status = null,
    daysAhead = 30,
    documentType = null
  } = {}) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      let query = supabase
        .from('document_deadlines')
        .select(`
          *,
          client:client_id(id, client_name, registration_number),
          created_user:created_by(id, full_name, email)
        `)
        .lte('deadline_date', futureDate.toISOString().split('T')[0])
        .order('deadline_date', { ascending: true });

      if (clientId) query = query.eq('client_id', clientId);
      if (status) query = query.eq('status', status);
      if (documentType) query = query.eq('document_type', documentType);

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, deadlines: data || [] };
    } catch (error) {
      console.error('Error fetching document deadlines:', error);
      return { success: false, error: error.message, deadlines: [] };
    }
  }

  /**
   * Mark document deadline as completed
   */
  static async completeDocumentDeadline(deadlineId, userId = null) {
    try {
      const { data, error } = await supabase
        .from('document_deadlines')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', deadlineId)
        .select()
        .single();

      if (error) throw error;

      // Log deadline completion
      if (userId) {
        await ActivityLogger.log({
          userId,
          userName: 'User',
          action: 'deadline_complete',
          entityType: 'document_deadline',
          entityId: deadlineId,
          entityName: data.description,
          details: { document_type: data.document_type }
        });
      }

      return { success: true, deadline: data };
    } catch (error) {
      console.error('Error completing document deadline:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== DASHBOARD STATISTICS ==========

  /**
   * Get dashboard statistics for tasks and deadlines
   */
  static async getDashboardStats(userId = null) {
    try {
      // Get task statistics
      const { data: taskStats } = await supabase
        .from('tasks')
        .select('status, priority, due_date')
        .gte('due_date', new Date().toISOString());

      // Get deadline statistics
      const { data: deadlineStats } = await supabase
        .from('document_deadlines')
        .select('status, priority, deadline_date')
        .gte('deadline_date', new Date().toISOString().split('T')[0]);

      // Get today's events
      const today = new Date().toISOString().split('T')[0];
      const { data: todayEvents } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`);

      const stats = {
        tasks: {
          total: taskStats?.length || 0,
          pending: taskStats?.filter(t => t.status === 'pending').length || 0,
          inProgress: taskStats?.filter(t => t.status === 'in_progress').length || 0,
          overdue: taskStats?.filter(t => 
            t.status !== 'completed' && 
            new Date(t.due_date) < new Date()
          ).length || 0
        },
        deadlines: {
          total: deadlineStats?.length || 0,
          pending: deadlineStats?.filter(d => d.status === 'pending').length || 0,
          thisWeek: deadlineStats?.filter(d => {
            const deadlineDate = new Date(d.deadline_date);
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            return deadlineDate <= nextWeek && d.status === 'pending';
          }).length || 0
        },
        calendar: {
          todayEvents: todayEvents?.length || 0
        }
      };

      return { success: true, stats };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return { success: false, error: error.message, stats: {} };
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get task priorities with colors
   */
  static getTaskPriorityConfig() {
    return {
      urgent: { label: 'Urgent', color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-800' },
      high: { label: 'High', color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-800' },
      medium: { label: 'Medium', color: 'yellow', bgColor: 'bg-yellow-50', textColor: 'text-yellow-800' },
      low: { label: 'Low', color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-800' }
    };
  }

  /**
   * Get task status configuration
   */
  static getTaskStatusConfig() {
    return {
      pending: { label: 'Pending', color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-800' },
      in_progress: { label: 'In Progress', color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-800' },
      completed: { label: 'Completed', color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-800' },
      cancelled: { label: 'Cancelled', color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-800' }
    };
  }

  /**
   * Format date for display
   */
  static formatDate(date, includeTime = false) {
    if (!date) return '';
    
    const d = new Date(date);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };

    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }

    return d.toLocaleDateString('en-US', options);
  }

  /**
   * Check if date is overdue
   */
  static isOverdue(date) {
    if (!date) return false;
    return new Date(date) < new Date();
  }
}

export default CalendarTaskService;