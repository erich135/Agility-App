import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/SupabaseClient';
import { 
  TimeEntryService, 
  ProjectService, 
  JobTypeService,
  ConsultantService 
} from '../services/TimesheetService';

// ============================================
// TIMER WIDGET COMPONENT
// Floating timer that shows current running time
// ============================================
const TimerWidget = ({ activeTimer, onStop, elapsedTime }) => {
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeTimer) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-2xl p-4 z-50 min-w-[280px] animate-pulse-slow">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs opacity-80 mb-1">Timer Running</div>
          <div className="text-3xl font-mono font-bold">{formatTime(elapsedTime)}</div>
          <div className="text-sm mt-1 opacity-90 truncate max-w-[180px]">
            {activeTimer.project?.name || 'Project'}
          </div>
        </div>
        <button
          onClick={onStop}
          className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-all hover:scale-110"
          title="Stop Timer"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ============================================
// QUICK TIME ENTRY FORM
// For logging time without full form
// ============================================
const QuickTimeEntry = ({ clients, projects, onProjectSelect, selectedClient, onClientChange, onSubmit }) => {
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalHours = (parseFloat(hours || 0) + parseFloat(minutes || 0) / 60).toFixed(2);
    onSubmit({
      project_id: selectedProject,
      duration_hours: parseFloat(totalHours),
      description,
      entry_date: new Date().toISOString().split('T')[0]
    });
    setHours('');
    setMinutes('');
    setDescription('');
    setSelectedProject('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Quick Time Entry
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Client Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <select
            value={selectedClient}
            onChange={(e) => onClientChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.client_name}</option>
            ))}
          </select>
        </div>

        {/* Project Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={!selectedClient}
          >
            <option value="">Select project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.project_number} - {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Time Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Hrs"
              min="0"
              max="24"
              className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Min"
              min="0"
              max="59"
              className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Log Time
          </button>
        </div>
      </div>
    </form>
  );
};

// ============================================
// TIME ENTRIES TABLE
// Shows recent time entries
// ============================================
const TimeEntriesTable = ({ entries, onEdit, onDelete }) => {
  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getMethodBadge = (method) => {
    const badges = {
      timer: { bg: 'bg-green-100', text: 'text-green-800', label: 'Timer' },
      manual: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Manual' },
      adjusted: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Adjusted' }
    };
    const badge = badges[method] || badges.manual;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Submitted' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      invoiced: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Invoiced' }
    };
    const badge = badges[status] || badges.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-500">No time entries yet</h3>
        <p className="text-gray-400 mt-1">Start tracking your time using the form above</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Recent Time Entries</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client / Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(entry.entry_date).toLocaleDateString('en-ZA', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {entry.project?.client?.client_name || 'Unknown Client'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.project?.project_number} - {entry.project?.name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {entry.description || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{formatDuration(entry.duration_hours)}</div>
                  <div className="text-xs text-gray-500">{entry.duration_hours.toFixed(2)} hrs</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getMethodBadge(entry.entry_method)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(entry.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onEdit(entry)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// START TIMER MODAL
// Modal to start a new timer
// ============================================
const StartTimerModal = ({ isOpen, onClose, clients, onStart }) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      loadProjects(selectedClient);
    } else {
      setProjects([]);
    }
  }, [selectedClient]);

  const loadProjects = async (clientId) => {
    const { data } = await ProjectService.getActiveByClient(clientId);
    setProjects(data || []);
  };

  const handleStart = async () => {
    if (!selectedProject) return;
    setLoading(true);
    await onStart(selectedProject, description);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <svg className="w-6 h-6 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Timer
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.client_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              disabled={!selectedClient}
            >
              <option value="">Select project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_number} - {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!selectedProject || loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Start Timer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ADD PROJECT MODAL
// Modal to create a new project
// ============================================
const AddProjectModal = ({ isOpen, onClose, clients, jobTypes, onSave }) => {
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    description: '',
    job_type_id: '',
    billing_date: '',
    estimated_hours: '',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id || !formData.name) {
      setError('Client and Project Name are required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const projectData = {
      ...formData,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      job_type_id: formData.job_type_id || null,
      billing_date: formData.billing_date || null
    };
    
    const success = await onSave(projectData);
    setLoading(false);
    
    if (success) {
      setFormData({
        client_id: '',
        name: '',
        description: '',
        job_type_id: '',
        billing_date: '',
        estimated_hours: '',
        priority: 'normal'
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Project
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.client_name}</option>
              ))}
            </select>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Annual Tax Return 2025"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Job Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
            <select
              name="job_type_id"
              value={formData.job_type_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select job type...</option>
              {jobTypes.map(jt => (
                <option key={jt.id} value={jt.id}>{jt.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the work..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Billing Date & Estimated Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Date</label>
              <input
                type="date"
                name="billing_date"
                value={formData.billing_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
              <input
                type="number"
                name="estimated_hours"
                value={formData.estimated_hours}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="0.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// MAIN TIMESHEET COMPONENT
// ============================================
const Timesheet = () => {
  const { user } = useAuth();
  
  // State
  const [consultant, setConsultant] = useState(null);
  const [clients, setClients] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientProjects, setClientProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Timer interval ref
  const timerInterval = useRef(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  // Load projects when client changes
  useEffect(() => {
    if (selectedClient) {
      loadClientProjects(selectedClient);
    } else {
      setClientProjects([]);
    }
  }, [selectedClient]);

  // Timer tick effect
  useEffect(() => {
    if (activeTimer) {
      const startTime = new Date(activeTimer.start_time).getTime();
      
      timerInterval.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      // Set initial elapsed time
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      setElapsedTime(0);
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [activeTimer]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, client_name')
        .eq('status', 'Active')
        .order('client_name');
      
      setClients(clientsData || []);

      // Load job types
      const { data: jobTypesData } = await JobTypeService.getAll();
      setJobTypes(jobTypesData || []);

      // For now, use user info as consultant (we'll link this properly later)
      // In production, this would come from the consultants table
      const mockConsultant = {
        id: user?.id || 'demo-consultant',
        full_name: user?.full_name || user?.email || 'Demo Consultant',
        email: user?.email || 'demo@example.com'
      };
      setConsultant(mockConsultant);

      // Check for active timer
      if (mockConsultant.id) {
        const { data: timerData } = await TimeEntryService.getActiveTimer(mockConsultant.id);
        if (timerData) {
          setActiveTimer(timerData);
        }
      }

      // Load recent time entries
      await loadTimeEntries();

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadClientProjects = async (clientId) => {
    const { data } = await ProjectService.getActiveByClient(clientId);
    setClientProjects(data || []);
  };

  const loadTimeEntries = async () => {
    // For demo, load last 30 days of entries
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data } = await TimeEntryService.getAll({
      date_from: thirtyDaysAgo.toISOString().split('T')[0]
    });
    
    setTimeEntries(data || []);
  };

  const handleStartTimer = async (projectId, description) => {
    if (!consultant) return;
    
    const { data, error } = await TimeEntryService.startTimer(
      projectId, 
      consultant.id, 
      description
    );
    
    if (error) {
      setError('Failed to start timer');
      return;
    }
    
    // Reload to get full project info
    const { data: timerData } = await TimeEntryService.getActiveTimer(consultant.id);
    setActiveTimer(timerData);
    showSuccess('Timer started!');
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    
    const { error } = await TimeEntryService.stopTimer(activeTimer.id);
    
    if (error) {
      setError('Failed to stop timer');
      return;
    }
    
    setActiveTimer(null);
    await loadTimeEntries();
    showSuccess('Timer stopped and time entry saved!');
  };

  const handleQuickEntry = async (entry) => {
    if (!consultant) return;
    
    const { error } = await TimeEntryService.create({
      ...entry,
      consultant_id: consultant.id,
      is_billable: true,
      status: 'draft'
    });
    
    if (error) {
      setError('Failed to save time entry');
      return;
    }
    
    await loadTimeEntries();
    showSuccess('Time entry saved!');
  };

  const handleDeleteEntry = async (id) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;
    
    const { error } = await TimeEntryService.delete(id);
    
    if (error) {
      setError('Failed to delete time entry');
      return;
    }
    
    await loadTimeEntries();
    showSuccess('Time entry deleted');
  };

  const handleEditEntry = (entry) => {
    // TODO: Open edit modal
    console.log('Edit entry:', entry);
  };

  const handleCreateProject = async (projectData) => {
    // Don't pass created_by if using mock dev user (not a valid UUID)
    const dataToSave = { ...projectData };
    // Only add created_by if it's a valid UUID (not our mock dev-user-001)
    if (consultant?.id && consultant.id !== 'dev-user-001' && consultant.id.includes('-')) {
      dataToSave.created_by = consultant.id;
    }
    
    const { data, error } = await ProjectService.create(dataToSave);
    
    if (error) {
      setError('Failed to create project: ' + error.message);
      return false;
    }
    
    showSuccess('Project created successfully!');
    // Reload projects if a client is selected
    if (selectedClient) {
      loadClientProjects(selectedClient);
    }
    return true;
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timesheet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-4 hover:text-red-100">×</button>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Timesheet</h1>
            <p className="text-gray-500 mt-1">
              Track your billable hours • {new Date().toLocaleDateString('en-ZA', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          {/* Start Timer Button */}
          <div className="flex space-x-3 mt-4 md:mt-0">
            <button
              onClick={() => setShowProjectModal(true)}
              className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center border border-gray-200"
            >
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Project
            </button>
            {!activeTimer && (
              <button
                onClick={() => setShowTimerModal(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center"
              >
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Start Timer
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {timeEntries
                    .filter(e => e.entry_date === new Date().toISOString().split('T')[0])
                    .reduce((sum, e) => sum + e.duration_hours, 0)
                    .toFixed(1)}h
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {timeEntries
                    .filter(e => {
                      const entryDate = new Date(e.entry_date);
                      const today = new Date();
                      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
                      return entryDate >= startOfWeek;
                    })
                    .reduce((sum, e) => sum + e.duration_hours, 0)
                    .toFixed(1)}h
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {timeEntries
                    .filter(e => {
                      const entryDate = new Date(e.entry_date);
                      const today = new Date();
                      return entryDate.getMonth() === today.getMonth() && 
                             entryDate.getFullYear() === today.getFullYear();
                    })
                    .reduce((sum, e) => sum + e.duration_hours, 0)
                    .toFixed(1)}h
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Entries</p>
                <p className="text-2xl font-bold text-gray-900">{timeEntries.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Time Entry */}
        <QuickTimeEntry
          clients={clients}
          projects={clientProjects}
          selectedClient={selectedClient}
          onClientChange={setSelectedClient}
          onSubmit={handleQuickEntry}
        />

        {/* Time Entries Table */}
        <TimeEntriesTable
          entries={timeEntries}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
        />
      </div>

      {/* Timer Widget */}
      <TimerWidget
        activeTimer={activeTimer}
        onStop={handleStopTimer}
        elapsedTime={elapsedTime}
      />

      {/* Start Timer Modal */}
      <StartTimerModal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
        clients={clients}
        onStart={handleStartTimer}
      />

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        clients={clients}
        jobTypes={jobTypes}
        onSave={handleCreateProject}
      />

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.9;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Timesheet;
