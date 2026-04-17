import React, { useMemo } from 'react';

// Fallback status config if DB hasn't loaded
const FALLBACK_STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
};

const CATEGORY_CONFIG = {
  cipc: { label: 'CIPC', color: 'bg-blue-50 text-blue-700' },
  sars: { label: 'SARS', color: 'bg-green-50 text-green-700' },
  trusts: { label: 'Trusts', color: 'bg-purple-50 text-purple-700' },
  payroll: { label: 'Payroll', color: 'bg-yellow-50 text-yellow-700' },
  accounting: { label: 'Accounting', color: 'bg-indigo-50 text-indigo-700' },
  advisory: { label: 'Advisory', color: 'bg-teal-50 text-teal-700' },
  general: { label: 'General', color: 'bg-gray-50 text-gray-700' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-gray-500', border: 'border-l-gray-300' },
  medium: { label: 'Medium', color: 'text-blue-500', border: 'border-l-blue-400' },
  high: { label: 'High', color: 'text-orange-500', border: 'border-l-orange-400' },
  urgent: { label: 'Urgent', color: 'text-red-600', border: 'border-l-red-500' },
};

// Each status gets its own kanban column — built dynamically from DB
const FALLBACK_COLUMNS = [
  { id: 'not_started', title: 'Not Started', statuses: ['not_started'], headerColor: 'bg-gray-500', bgColor: 'bg-gray-50' },
  { id: 'in_progress', title: 'In Progress', statuses: ['in_progress'], headerColor: 'bg-blue-500', bgColor: 'bg-blue-50' },
  { id: 'completed',   title: 'Completed',   statuses: ['completed'],   headerColor: 'bg-green-500', bgColor: 'bg-green-50' },
];

export default function JobKanbanBoard({
  jobs,
  customers,
  checklistItems,
  jobStatuses = [],
  statusConfig,
  onQuickStatus,
  onEdit,
  onExpand,
  expandedJobId,
  getDueStatus,
}) {
  // Build columns dynamically from DB statuses
  const columns = useMemo(() => {
    if (!jobStatuses || jobStatuses.length === 0) return FALLBACK_COLUMNS;
    return jobStatuses.map(s => ({
      id: s.key,
      title: s.label,
      statuses: [s.key],
      headerColor: s.board_header_color || 'bg-gray-500',
      bgColor: s.board_bg_color || 'bg-gray-50',
    }));
  }, [jobStatuses]);

  const STATUS_CONFIG = statusConfig || FALLBACK_STATUS_CONFIG;

  // Build set of closed status keys
  const closedKeys = useMemo(() => {
    if (!jobStatuses || jobStatuses.length === 0) return new Set(['completed', 'cancelled']);
    return new Set(jobStatuses.filter(s => s.is_closed).map(s => s.key));
  }, [jobStatuses]);

  const getCustomerName = (clientId) =>
    customers.find((c) => c.id === clientId)?.client_name || '';

  const getChecklistProgress = (jobId) => {
    const items = checklistItems[jobId] || [];
    if (items.length === 0) return null;
    const done = items.filter((i) => i.is_completed).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  };

  return (
    <div className="overflow-x-auto pb-4 -mx-2 px-2" style={{ scrollbarColor: '#c4c4c4 transparent' }}>
      <div className="flex gap-4" style={{ minWidth: `${columns.length * 280}px` }}>
      {columns.map((col) => {
        const columnJobs = jobs.filter((j) => col.statuses.includes(j.status));

        return (
          <div key={col.id} className={`rounded-lg border border-gray-200 ${col.bgColor} flex flex-col min-h-[400px] w-[280px] flex-shrink-0`}>
            {/* Column Header */}
            <div className={`${col.headerColor} text-white px-4 py-3 rounded-t-lg flex items-center justify-between`}>
              <h3 className="font-semibold text-sm">{col.title}</h3>
              <span className="bg-white bg-opacity-30 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {columnJobs.length}
              </span>
            </div>

            {/* Column Body */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-340px)]">
              {columnJobs.length === 0 ? (
                <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-400">No jobs</p>
                </div>
              ) : (
                columnJobs.map((job) => {
                  const progress = getChecklistProgress(job.id);
                  const dueInfo = job.status !== 'completed' ? getDueStatus(job.date_due) : null;
                  const customerName = getCustomerName(job.client_id);
                  const catCfg = CATEGORY_CONFIG[job.category] || CATEGORY_CONFIG.general;
                  const prioCfg = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.medium;
                  const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.not_started;
                  const isExpanded = expandedJobId === job.id;

                  return (
                    <div
                      key={job.id}
                      className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${prioCfg.border} hover:shadow-md transition-shadow cursor-pointer ${
                        job.status === 'cancelled' ? 'opacity-50' : ''
                      } ${isExpanded ? 'ring-2 ring-blue-400' : ''}`}
                      onClick={() => onExpand(isExpanded ? null : job.id)}
                    >
                      {/* Card Top */}
                      <div className="p-3">
                        {/* Title & Period */}
                        <p className="text-sm font-medium text-gray-900 leading-snug">{job.title}</p>
                        {job.period && (
                          <p className="text-xs text-gray-400 mt-0.5">{job.period}</p>
                        )}

                        {/* Customer */}
                        <p className="text-xs text-gray-500 mt-1.5 truncate">{customerName}</p>

                        {/* Badges row: category + priority */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${catCfg.color}`}>
                            {catCfg.label}
                          </span>
                          <span className={`text-[10px] font-semibold ${prioCfg.color}`}>
                            {prioCfg.label}
                          </span>
                        </div>

                        {/* Due Date */}
                        {job.date_due && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs text-gray-500">
                              {new Date(job.date_due).toLocaleDateString('en-ZA')}
                            </span>
                            {dueInfo && (
                              <span className={`text-xs ${dueInfo.class}`}>{dueInfo.label}</span>
                            )}
                          </div>
                        )}

                        {/* Status Remarks */}
                        {job.status_remarks && (
                          <div className="mt-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 leading-snug">
                            💬 {job.status_remarks}
                          </div>
                        )}

                        {/* Progress bar */}
                        {progress && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  progress.pct === 100 ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${progress.pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium">
                              {progress.done}/{progress.total}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer - Quick Actions */}
                      <div
                        className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!closedKeys.has(job.status) ? (
                          <select
                            value={job.status}
                            onChange={(e) => onQuickStatus(job, e.target.value)}
                            className="text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white max-w-[130px]"
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${statusCfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
                            {statusCfg.label}
                          </span>
                        )}
                        <button
                          onClick={() => onEdit(job)}
                          title="Edit"
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
