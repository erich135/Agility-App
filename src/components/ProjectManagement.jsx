import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit2, Trash2, Clock, DollarSign, User, Calendar, ChevronDown, ChevronUp, Eye, Filter, Search } from 'lucide-react';
import { ProjectService, ClientService, JobTypeService, TimeEntryService } from '../services/TimesheetService';
import { useToast } from './Toast';
import supabase from '../lib/SupabaseClient';
import AnimatedCounter, { AnimatedPercentage } from './animations/AnimatedCounter';
import { SkeletonCard, SkeletonStats, PageLoader } from './animations/Skeletons';

export default function ProjectManagement() {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProject, setExpandedProject] = useState(null);
  const [projectTimeEntries, setProjectTimeEntries] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    job_type_id: '',
    status: 'active',
    billing_date: '',
    internal_notes: '',
    assigned_consultant_id: '',
    estimated_hours: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectsRes, clientsRes, jobTypesRes, consultantsRes] = await Promise.all([
        ProjectService.getAll(),
        ClientService.getAll(),
        JobTypeService.getAll(),
        supabase.from('consultants').select('id, full_name, designation').eq('is_active', true).order('full_name')
      ]);

      if (projectsRes.error) {
        toast.error('Failed to load projects: ' + projectsRes.error.message);
      } else {
        setProjects(projectsRes.data || []);
      }
      
      if (!clientsRes.error) setClients(clientsRes.data || []);
      if (!jobTypesRes.error) setJobTypes(jobTypesRes.data || []);
      if (!consultantsRes.error) setConsultants(consultantsRes.data || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectTimeEntries = async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          consultant:consultants(full_name)
        `)
        .eq('project_id', projectId)
        .order('entry_date', { ascending: false });
      
      if (!error) {
        setProjectTimeEntries(prev => ({ ...prev, [projectId]: data || [] }));
      }
    } catch (err) {
      console.error('Error loading time entries:', err);
    }
  };

  const handleExpandProject = async (projectId) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
    } else {
      setExpandedProject(projectId);
      if (!projectTimeEntries[projectId]) {
        await loadProjectTimeEntries(projectId);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_id) {
      toast.warning('Please select a customer to continue');
      return;
    }
    
    if (!formData.name.trim()) {
      toast.warning('Please enter a project name');
      return;
    }

    const data = {
      client_id: formData.client_id,
      name: formData.name,
      job_type_id: formData.job_type_id || null,
      status: formData.status,
      billing_date: formData.billing_date || null,
      internal_notes: formData.internal_notes || null,
      assigned_consultant_id: formData.assigned_consultant_id || null,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null
    };

    try {
      let result;
      if (editingId) {
        result = await ProjectService.update(editingId, data);
        if (!result.error) {
          setProjects(projects.map(p => p.id === editingId ? { ...p, ...result.data } : p));
          toast.success('Project updated successfully');
        }
      } else {
        result = await ProjectService.create(data);
        if (!result.error) {
          setProjects([result.data, ...projects]);
          toast.success('Project created successfully');
        }
      }

      if (result.error) {
        toast.error('Error saving project: ' + result.error.message);
        return;
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (error) {
      toast.error('Error saving project: ' + error.message);
    }
  };

  const handleEdit = (project) => {
    setFormData({
      client_id: project.client_id,
      name: project.name,
      job_type_id: project.job_type_id || '',
      status: project.status || 'active',
      billing_date: project.billing_date || '',
      internal_notes: project.internal_notes || '',
      assigned_consultant_id: project.assigned_consultant_id || '',
      estimated_hours: project.estimated_hours || ''
    });
    setEditingId(project.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

    const result = await ProjectService.delete(id);
    if (!result.error) {
      setProjects(projects.filter(p => p.id !== id));
      toast.success('Project deleted successfully');
    } else {
      toast.error('Failed to delete project: ' + (result.error.message || 'Unknown error'));
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      name: '',
      job_type_id: '',
      status: 'active',
      billing_date: '',
      internal_notes: '',
      assigned_consultant_id: '',
      estimated_hours: ''
    });
    setEditingId(null);
  };

  const getFilteredProjects = () => {
    let filtered = projects;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(search) ||
        p.project_number?.toLowerCase().includes(search) ||
        clients.find(c => c.id === p.client_id)?.client_name?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  };

  const statusColors = {
    'active': 'bg-blue-100 text-blue-800 border-blue-200',
    'on_hold': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'ready_to_bill': 'bg-orange-100 text-orange-800 border-orange-200',
    'invoiced': 'bg-purple-100 text-purple-800 border-purple-200',
    'completed': 'bg-green-100 text-green-800 border-green-200',
    'cancelled': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0);
  };

  const calculateProjectStats = (project) => {
    const entries = projectTimeEntries[project.id] || [];
    const totalHours = project.total_hours || entries.reduce((sum, e) => sum + (e.duration_hours || 0), 0);
    const billableHours = project.billable_hours || entries.filter(e => e.is_billable).reduce((sum, e) => sum + (e.duration_hours || 0), 0);
    const estimatedHours = project.estimated_hours || 0;
    const progress = estimatedHours > 0 ? Math.min((totalHours / estimatedHours) * 100, 100) : 0;
    
    return { totalHours, billableHours, estimatedHours, progress };
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-page-in">
        {/* Skeleton Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="skeleton h-8 w-48 mb-2"></div>
            <div className="skeleton h-4 w-64"></div>
          </div>
          <div className="skeleton h-10 w-32 rounded-lg"></div>
        </div>
        {/* Skeleton Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonStats key={i} />)}
        </div>
        {/* Skeleton Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const filteredProjects = getFilteredProjects();
  const projectStats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    onHold: projects.filter(p => p.status === 'on_hold').length,
    readyToBill: projects.filter(p => p.status === 'ready_to_bill').length
  };

  return (
    <div className="space-y-6 animate-page-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-card-enter">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-blue-600 animate-float" />
            Project Management
          </h1>
          <p className="text-gray-600 mt-1">Create and manage client projects</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm btn-animated hover-lift"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 stats-card animate-card-enter stagger-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={projectStats.total} duration={800} />
              </p>
              <p className="text-sm text-gray-500">Total Projects</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 stats-card animate-card-enter stagger-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={projectStats.active} duration={900} />
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 stats-card animate-card-enter stagger-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={projectStats.onHold} duration={1000} />
              </p>
              <p className="text-sm text-gray-500">On Hold</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 stats-card animate-card-enter stagger-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={projectStats.readyToBill} duration={1100} />
              </p>
              <p className="text-sm text-gray-500">Ready to Bill</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-card-enter stagger-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="ready_to_bill">Ready to Bill</option>
              <option value="invoiced">Invoiced</option>
              <option value="completed">Completed</option>
            </select>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Display */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100 animate-card-enter">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-float" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first project'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 btn-animated hover-lift"
            >
              Create Project
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => {
            const stats = calculateProjectStats(project);
            const client = clients.find(c => c.id === project.client_id);
            const jobType = jobTypes.find(j => j.id === project.job_type_id);
            const consultant = consultants.find(c => c.id === project.assigned_consultant_id);
            
            return (
              <div 
                key={project.id} 
                className={`bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden hover-lift card-shine animate-card-enter stagger-${Math.min(index + 1, 8)}`}
              >
                {/* Card Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-blue-600 mb-1">{project.project_number}</p>
                      <h3 className="text-lg font-semibold text-gray-900 truncate" title={project.name}>
                        {project.name}
                      </h3>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[project.status] || 'bg-gray-100'}`}>
                      {project.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {client?.client_name || 'No client'}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  {/* Progress Bar */}
                  {stats.estimatedHours > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{stats.totalHours.toFixed(1)}h / {stats.estimatedHours}h</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full animate-progress ${stats.progress > 100 ? 'bg-red-500' : stats.progress > 75 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(stats.progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Hours</p>
                        <p className="text-sm font-medium">{stats.totalHours.toFixed(1)}h</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Billable</p>
                        <p className="text-sm font-medium">{stats.billableHours.toFixed(1)}h</p>
                      </div>
                    </div>
                    {consultant && (
                      <div className="flex items-center gap-2 col-span-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Assigned to</p>
                          <p className="text-sm font-medium truncate">{consultant.full_name}</p>
                        </div>
                      </div>
                    )}
                    {jobType && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Job Type</p>
                          <p className="text-sm font-medium truncate">{jobType.name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => handleExpandProject(project.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition btn-animated icon-bounce"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(project)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition btn-animated icon-bounce"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition btn-animated icon-bounce"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-card-enter">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProjects.map(project => {
                const stats = calculateProjectStats(project);
                const client = clients.find(c => c.id === project.client_id);
                const consultant = consultants.find(c => c.id === project.assigned_consultant_id);
                
                return (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-xs text-blue-600 font-medium">{project.project_number}</p>
                        <p className="font-medium text-gray-900">{project.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{client?.client_name || '-'}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status] || 'bg-gray-100'}`}>
                        {project.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{stats.totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-4 text-gray-600">{consultant?.full_name || '-'}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(project)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(project.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Project Detail Modal */}
      {expandedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-modal-backdrop">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-modal-content">
            {(() => {
              const project = projects.find(p => p.id === expandedProject);
              if (!project) return null;
              
              const stats = calculateProjectStats(project);
              const client = clients.find(c => c.id === project.client_id);
              const jobType = jobTypes.find(j => j.id === project.job_type_id);
              const consultant = consultants.find(c => c.id === project.assigned_consultant_id);
              const entries = projectTimeEntries[project.id] || [];
              
              return (
                <>
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">{project.project_number}</p>
                        <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
                        <p className="text-gray-600 mt-1">{client?.client_name}</p>
                      </div>
                      <button onClick={() => setExpandedProject(null)} className="text-gray-400 hover:text-gray-600 btn-animated">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600">Total Hours</p>
                        <p className="text-2xl font-bold text-blue-900">{stats.totalHours.toFixed(1)}h</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600">Billable Hours</p>
                        <p className="text-2xl font-bold text-green-900">{stats.billableHours.toFixed(1)}h</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-purple-600">Estimated</p>
                        <p className="text-2xl font-bold text-purple-900">{stats.estimatedHours || '-'}h</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-orange-600">Progress</p>
                        <p className="text-2xl font-bold text-orange-900">{stats.estimatedHours ? `${Math.round(stats.progress)}%` : '-'}</p>
                      </div>
                    </div>

                    {/* Project Details */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-900">Project Details</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded ${statusColors[project.status]}`}>{project.status?.replace('_', ' ')}</span></p>
                          <p><span className="text-gray-500">Job Type:</span> {jobType?.name || '-'}</p>
                          <p><span className="text-gray-500">Assigned To:</span> {consultant?.full_name || 'Unassigned'}</p>
                          <p><span className="text-gray-500">Billing Date:</span> {project.billing_date ? new Date(project.billing_date).toLocaleDateString() : '-'}</p>
                          <p><span className="text-gray-500">Created:</span> {new Date(project.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {project.internal_notes && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{project.internal_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Time Entries */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Recent Time Entries</h3>
                      {entries.length === 0 ? (
                        <p className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded-lg">No time entries recorded yet</p>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Consultant</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Hours</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {entries.slice(0, 10).map(entry => (
                                <tr key={entry.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2">{new Date(entry.entry_date).toLocaleDateString()}</td>
                                  <td className="px-4 py-2">{entry.consultant?.full_name || '-'}</td>
                                  <td className="px-4 py-2 truncate max-w-xs">{entry.description || '-'}</td>
                                  <td className="px-4 py-2 text-right font-medium">{entry.duration_hours?.toFixed(2)}h</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-modal-backdrop">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modal-slide-up">
            <h2 className="text-2xl font-bold mb-6">
              {editingId ? 'Edit Project' : 'New Project'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.client_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Annual Tax Return 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
                  <select
                    value={formData.job_type_id}
                    onChange={(e) => setFormData({...formData, job_type_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select job type</option>
                    {jobTypes.map(jt => (
                      <option key={jt.id} value={jt.id}>{jt.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="ready_to_bill">Ready to Bill</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Consultant</label>
                  <select
                    value={formData.assigned_consultant_id}
                    onChange={(e) => setFormData({...formData, assigned_consultant_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {consultants.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name} ({c.designation})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Billing Date</label>
                  <input
                    type="date"
                    value={formData.billing_date}
                    onChange={(e) => setFormData({...formData, billing_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes</label>
                <textarea
                  value={formData.internal_notes}
                  onChange={(e) => setFormData({...formData, internal_notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Add any internal notes about this project..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 btn-animated"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 btn-animated hover-lift"
                >
                  {editingId ? 'Update' : 'Create'} Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
