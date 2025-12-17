import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit2, Trash2, CheckCircle, Clock } from 'lucide-react';
import { ProjectService, ClientService, JobTypeService } from '../services/TimesheetService';

export default function ProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    client_id: '',
    project_name: '',
    job_type_id: '',
    status: 'Active',
    expected_billing_date: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectsRes, clientsRes, jobTypesRes] = await Promise.all([
        ProjectService.getAll(),
        ClientService.getAll(),
        JobTypeService.getAll()
      ]);

      if (!projectsRes.error) setProjects(projectsRes.data || []);
      if (!clientsRes.error) setClients(clientsRes.data || []);
      if (!jobTypesRes.error) setJobTypes(jobTypesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      client_id: parseInt(formData.client_id),
      job_type_id: parseInt(formData.job_type_id)
    };

    try {
      let result;
      if (editingId) {
        result = await ProjectService.update(editingId, data);
        if (!result.error) {
          setProjects(projects.map(p => p.id === editingId ? result.data : p));
        }
      } else {
        result = await ProjectService.create(data);
        if (!result.error) {
          setProjects([...projects, result.data]);
        }
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (error) {
      alert('Error saving project: ' + error.message);
    }
  };

  const handleEdit = (project) => {
    setFormData({
      client_id: project.client_id.toString(),
      project_name: project.project_name,
      job_type_id: project.job_type_id.toString(),
      status: project.status,
      expected_billing_date: project.expected_billing_date || '',
      notes: project.notes || ''
    });
    setEditingId(project.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;

    const result = await ProjectService.delete(id);
    if (!result.error) {
      setProjects(projects.filter(p => p.id !== id));
    } else {
      alert('Failed to delete project');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      project_name: '',
      job_type_id: '',
      status: 'Active',
      expected_billing_date: '',
      notes: ''
    });
    setEditingId(null);
  };

  const getFilteredProjects = () => {
    if (filterStatus === 'all') return projects;
    return projects.filter(p => p.status === filterStatus);
  };

  const statusColors = {
    'Active': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-green-100 text-green-800',
    'Invoiced': 'bg-purple-100 text-purple-800'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredProjects = getFilteredProjects();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-blue-600" />
            Project Management
          </h1>
          <p className="text-gray-600 mt-1">Create and manage client projects</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Edit Project' : 'New Project'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client *
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select a client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.client_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.project_name}
                    onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g., Annual Tax Return 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Type *
                  </label>
                  <select
                    value={formData.job_type_id}
                    onChange={(e) => setFormData({...formData, job_type_id: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select job type</option>
                    {jobTypes.map(jt => (
                      <option key={jt.id} value={jt.id}>
                        {jt.job_type_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Invoiced">Invoiced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Billing Date
                  </label>
                  <input
                    type="date"
                    value={formData.expected_billing_date}
                    onChange={(e) => setFormData({...formData, expected_billing_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  rows="3"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Create'} Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All Projects</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Invoiced">Invoiced</option>
        </select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No projects found</p>
          </div>
        ) : (
          filteredProjects.map(project => (
            <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">
                  {project.project_name}
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[project.status] || 'bg-gray-100'}`}>
                  {project.status}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Client:</span> {clients.find(c => c.id === project.client_id)?.client_name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Type:</span> {jobTypes.find(j => j.id === project.job_type_id)?.job_type_name}
                </p>
                {project.expected_billing_date && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Billing Date:</span> {new Date(project.expected_billing_date).toLocaleDateString()}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Total Hours:</span> {project.total_hours?.toFixed(2) || '0.00'}h
                </p>
              </div>

              {project.notes && (
                <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded">
                  {project.notes}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(project)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
