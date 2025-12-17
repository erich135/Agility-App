import React, { useState, useEffect } from 'react';
import { Clock, Edit2, Trash2, Download, Filter, Plus } from 'lucide-react';
import { TimeEntryService, ProjectService, ClientService } from '../services/TimesheetService';

export default function MyTimesheets() {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [filterProject, setFilterProject] = useState('all');
  const [filterDate, setFilterDate] = useState('all'); // all, today, week, month
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load user's time entries
      const entriesResult = await TimeEntryService.getByConsultant(null);
      if (!entriesResult.error) {
        setEntries(entriesResult.data || []);
      }

      // Load projects for filter
      const projectsResult = await ProjectService.getAll();
      if (!projectsResult.error) {
        setProjects(projectsResult.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this time entry?')) return;
    
    const result = await TimeEntryService.delete(id);
    if (!result.error) {
      setEntries(entries.filter(e => e.id !== id));
    } else {
      alert('Failed to delete entry');
    }
  };

  const handleSaveEdit = async () => {
    if (!editData) return;
    
    const result = await TimeEntryService.update(editingId, {
      duration: parseFloat(editData.duration),
      description: editData.description,
      billable: editData.billable
    });

    if (!result.error) {
      setEntries(entries.map(e => e.id === editingId ? result.data : e));
      setEditingId(null);
      setEditData(null);
    } else {
      alert('Failed to save entry');
    }
  };

  const getFilteredEntries = () => {
    let filtered = entries;

    // Filter by project
    if (filterProject !== 'all') {
      filtered = filtered.filter(e => e.project_id === parseInt(filterProject));
    }

    // Filter by date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (filterDate === 'today') {
      filtered = filtered.filter(e => e.entry_date === todayStr);
    } else if (filterDate === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(e => new Date(e.entry_date) >= weekAgo);
    } else if (filterDate === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(e => new Date(e.entry_date) >= monthAgo);
    }

    return filtered;
  };

  const getTotalHours = () => {
    return getFilteredEntries().reduce((sum, e) => sum + (e.duration || 0), 0).toFixed(2);
  };

  const getTotalBillable = () => {
    return getFilteredEntries()
      .filter(e => e.billable)
      .reduce((sum, e) => sum + (e.duration || 0), 0)
      .toFixed(2);
  };

  const filteredEntries = getFilteredEntries();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-8 h-8 text-blue-600" />
              My Timesheets
            </h1>
            <p className="text-gray-600 mt-1">View and manage your time entries</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <p className="text-gray-600 text-sm font-medium">Total Hours</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{getTotalHours()}</p>
            <p className="text-gray-500 text-xs mt-2">All entries in selected period</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <p className="text-gray-600 text-sm font-medium">Billable Hours</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{getTotalBillable()}</p>
            <p className="text-gray-500 text-xs mt-2">Ready for invoicing</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                Filter by Project
              </label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Entries Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredEntries.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No time entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Billable</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.map((entry) => (
                    editingId === entry.id ? (
                      <tr key={entry.id} className="bg-blue-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(entry.entry_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {projects.find(p => p.id === entry.project_id)?.project_name}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            value={editData?.duration || 0}
                            onChange={(e) => setEditData({...editData, duration: e.target.value})}
                            className="w-24 px-2 py-1 border border-gray-300 rounded"
                            step="0.1"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editData?.description || ''}
                            onChange={(e) => setEditData({...editData, description: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={editData?.billable || false}
                            onChange={(e) => setEditData({...editData, billable: e.target.checked})}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={handleSaveEdit}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(entry.entry_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {projects.find(p => p.id === entry.project_id)?.project_name}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">
                          {entry.duration.toFixed(2)}h
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {entry.description}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {entry.billable ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Billable
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                              Non-billable
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => {
                              setEditingId(entry.id);
                              setEditData(entry);
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
