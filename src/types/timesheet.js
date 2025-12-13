// ============================================
// TIMESHEET MODULE - Constants & Type Definitions
// For JavaScript (non-TypeScript) projects
// ============================================

// ============================================
// CONSTANTS (use these for dropdowns, validation, etc.)
// ============================================

export const CONSULTANT_DESIGNATIONS = [
  'Chartered Accountant',
  'Accountant', 
  'Trainee Accountant',
  'Student'
];

export const CONSULTANT_ROLES = [
  'consultant',
  'senior_consultant', 
  'accounts',
  'admin'
];

export const PROJECT_STATUSES = [
  'active',
  'on_hold',
  'ready_to_bill',
  'invoiced',
  'cancelled'
];

export const PROJECT_PRIORITIES = [
  'low',
  'normal',
  'high',
  'urgent'
];

export const TIME_ENTRY_METHODS = [
  'manual',
  'timer',
  'adjusted'
];

export const TIME_ENTRY_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'invoiced'
];

export const JOB_CATEGORIES = [
  'Tax',
  'CIPC',
  'Labour',
  'Accounting',
  'Advisory',
  'Other'
];

export const NOTIFICATION_TYPES = [
  'project_completed',
  'ready_to_bill',
  'invoice_needed',
  'reminder_billing_due',
  'time_entry_approved',
  'project_assigned'
];

export const REMINDER_TYPES = [
  'billing_due',
  'invoice_pending',
  'overdue'
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format duration from decimal hours to human readable
 * @param {number} hours - Duration in decimal hours (e.g., 1.5)
 * @returns {string} Formatted string (e.g., "1h 30m")
 */
export const formatDuration = (hours) => {
  if (!hours || hours === 0) return '0m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/**
 * Format seconds to HH:MM:SS for timer display
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time (e.g., "01:30:45")
 */
export const formatTimerDisplay = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Convert hours and minutes to decimal hours
 * @param {number} hours - Whole hours
 * @param {number} minutes - Minutes
 * @returns {number} Decimal hours (e.g., 1.5 for 1h 30m)
 */
export const toDecimalHours = (hours, minutes) => {
  return (parseFloat(hours || 0) + parseFloat(minutes || 0) / 60);
};

/**
 * Get status badge color classes
 * @param {string} status - Project or entry status
 * @returns {object} Object with bg and text Tailwind classes
 */
export const getStatusColors = (status) => {
  const colors = {
    // Project statuses
    active: { bg: 'bg-green-100', text: 'text-green-800' },
    on_hold: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    ready_to_bill: { bg: 'bg-blue-100', text: 'text-blue-800' },
    invoiced: { bg: 'bg-purple-100', text: 'text-purple-800' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-800' },
    // Time entry statuses
    draft: { bg: 'bg-gray-100', text: 'text-gray-800' },
    submitted: { bg: 'bg-blue-100', text: 'text-blue-800' },
    approved: { bg: 'bg-green-100', text: 'text-green-800' },
  };
  return colors[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
};

/**
 * Get priority badge color classes
 * @param {string} priority - Priority level
 * @returns {object} Object with bg and text Tailwind classes
 */
export const getPriorityColors = (priority) => {
  const colors = {
    low: { bg: 'bg-gray-100', text: 'text-gray-600' },
    normal: { bg: 'bg-blue-100', text: 'text-blue-600' },
    high: { bg: 'bg-orange-100', text: 'text-orange-600' },
    urgent: { bg: 'bg-red-100', text: 'text-red-600' },
  };
  return colors[priority] || colors.normal;
};

/**
 * Get entry method badge info
 * @param {string} method - Entry method (manual, timer, adjusted)
 * @returns {object} Object with bg, text, and label
 */
export const getEntryMethodBadge = (method) => {
  const badges = {
    timer: { bg: 'bg-green-100', text: 'text-green-800', label: 'Timer' },
    manual: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Manual' },
    adjusted: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Adjusted' }
  };
  return badges[method] || badges.manual;
};

// ============================================
// DEFAULT VALUES FOR FORMS
// ============================================

export const DEFAULT_PROJECT = {
  name: '',
  description: '',
  client_id: '',
  job_type_id: '',
  assigned_consultant_id: '',
  billing_date: '',
  expected_end_date: '',
  estimated_hours: '',
  priority: 'normal',
  internal_notes: ''
};

export const DEFAULT_TIME_ENTRY = {
  project_id: '',
  entry_date: new Date().toISOString().split('T')[0],
  duration_hours: 0,
  description: '',
  is_billable: true
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate a project form
 * @param {object} project - Project data
 * @returns {object} { isValid: boolean, errors: object }
 */
export const validateProject = (project) => {
  const errors = {};
  
  if (!project.name?.trim()) {
    errors.name = 'Project name is required';
  }
  if (!project.client_id) {
    errors.client_id = 'Client is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate a time entry form
 * @param {object} entry - Time entry data
 * @returns {object} { isValid: boolean, errors: object }
 */
export const validateTimeEntry = (entry) => {
  const errors = {};
  
  if (!entry.project_id) {
    errors.project_id = 'Project is required';
  }
  if (!entry.duration_hours || entry.duration_hours <= 0) {
    errors.duration_hours = 'Duration must be greater than 0';
  }
  if (entry.duration_hours > 24) {
    errors.duration_hours = 'Duration cannot exceed 24 hours';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
