import React, { useState, useEffect } from 'react';
import supabase from '../lib/SupabaseClient';

const CATEGORY_OPTIONS = [
  { value: 'cipc', label: 'CIPC' },
  { value: 'sars', label: 'SARS' },
  { value: 'trusts', label: 'Trusts' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'general', label: 'General' },
];

export default function JobTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', job_type: '', category: 'general',
    default_priority: 'medium', estimated_days: '', is_active: true,
  });

  // Checklist editing
  const [checklistItems, setChecklistItems] = useState({});
  const [newItemText, setNewItemText] = useState('');

  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { fetchTemplates(); }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from('job_templates')
        .select('*, job_template_checklist(*)')
        .order('sort_order')
        .order('name');
      if (fetchErr) throw fetchErr;

      setTemplates(data || []);
      const map = {};
      (data || []).forEach(t => {
        map[t.id] = (t.job_template_checklist || []).sort((a, b) => a.sort_order - b.sort_order);
      });
      setChecklistItems(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============== TEMPLATE CRUD ==============

  const openAddForm = () => {
    setFormData({ name: '', description: '', job_type: '', category: 'general', default_priority: 'medium', estimated_days: '', is_active: true });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (tmpl) => {
    setFormData({
      name: tmpl.name || '', description: tmpl.description || '',
      job_type: tmpl.job_type || '', category: tmpl.category || 'general',
      default_priority: tmpl.default_priority || 'medium',
      estimated_days: tmpl.estimated_days || '',
      is_active: tmpl.is_active !== false,
    });
    setEditingId(tmpl.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { setError('Template name is required'); return; }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        job_type: formData.job_type.trim() || formData.category,
        category: formData.category,
        default_priority: formData.default_priority,
        estimated_days: formData.estimated_days ? parseInt(formData.estimated_days) : null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: upErr } = await supabase.from('job_templates').update(payload).eq('id', editingId);
        if (upErr) throw upErr;
        showSuccess('Template updated');
      } else {
        const existing = templates.length;
        payload.sort_order = existing;
        const { error: insErr } = await supabase.from('job_templates').insert([payload]);
        if (insErr) throw insErr;
        showSuccess('Template created');
      }

      setShowForm(false);
      setEditingId(null);
      await fetchTemplates();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (tmpl) => {
    if (!window.confirm(`Delete template "${tmpl.name}"? This won't affect existing jobs.`)) return;
    try {
      const { error: delErr } = await supabase.from('job_templates').delete().eq('id', tmpl.id);
      if (delErr) throw delErr;
      showSuccess('Template deleted');
      await fetchTemplates();
    } catch (err) { setError(err.message); }
  };

  const handleToggleActive = async (tmpl) => {
    try {
      await supabase.from('job_templates').update({ is_active: !tmpl.is_active }).eq('id', tmpl.id);
      await fetchTemplates();
    } catch (err) { setError(err.message); }
  };

  // ============== CHECKLIST CRUD ==============

  const addChecklistItem = async (templateId) => {
    if (!newItemText.trim()) return;
    try {
      const existing = checklistItems[templateId] || [];
      const { error: insErr } = await supabase.from('job_template_checklist').insert([{
        template_id: templateId,
        title: newItemText.trim(),
        sort_order: existing.length,
        is_required: true,
      }]);
      if (insErr) throw insErr;
      setNewItemText('');
      await fetchTemplates();
    } catch (err) { setError(err.message); }
  };

  const deleteChecklistItem = async (item) => {
    try {
      await supabase.from('job_template_checklist').delete().eq('id', item.id);
      await fetchTemplates();
    } catch (err) { setError(err.message); }
  };

  // ============== RENDER ==============

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Templates</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage reusable templates with pre-defined checklists for common job types
              </p>
            </div>
            <button onClick={openAddForm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Template
            </button>
          </div>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-800">{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}

        {/* Template List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-16 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create templates to quickly set up jobs with predefined checklists.</p>
            <button onClick={openAddForm} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Create Template</button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(tmpl => {
              const isExpanded = expandedId === tmpl.id;
              const items = checklistItems[tmpl.id] || [];
              const catLabel = CATEGORY_OPTIONS.find(c => c.value === tmpl.category)?.label || tmpl.category;

              return (
                <div key={tmpl.id} className={`bg-white rounded-lg shadow-sm border ${tmpl.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'}`}>
                  {/* Template Header */}
                  <div className="px-5 py-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : tmpl.id)}>
                    <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{tmpl.name}</h3>
                        {!tmpl.is_active && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                      </div>
                      {tmpl.description && <p className="text-xs text-gray-500 mt-0.5">{tmpl.description}</p>}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{catLabel}</span>
                    <span className="text-xs text-gray-400">{items.length} step{items.length !== 1 ? 's' : ''}</span>
                    {tmpl.estimated_days && <span className="text-xs text-gray-400">~{tmpl.estimated_days}d</span>}
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEditForm(tmpl)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleToggleActive(tmpl)} className={`p-1.5 rounded ${tmpl.is_active ? 'text-gray-400 hover:text-yellow-600' : 'text-gray-400 hover:text-green-600'}`}
                        title={tmpl.is_active ? 'Deactivate' : 'Activate'}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tmpl.is_active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(tmpl)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded: Checklist Editor */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-3">
                        Checklist Steps ({items.length})
                      </h4>

                      {items.length > 0 ? (
                        <div className="space-y-1 mb-3">
                          {items.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                              <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{idx + 1}.</span>
                              <span className="flex-1 text-sm text-gray-800">{item.title}</span>
                              {item.is_required && <span className="text-xs text-red-400">Required</span>}
                              <button onClick={() => deleteChecklistItem(item)}
                                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic mb-3">No checklist steps yet. Add steps below.</p>
                      )}

                      <div className="flex gap-2">
                        <input type="text" value={newItemText}
                          onChange={e => setNewItemText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addChecklistItem(tmpl.id); }}
                          placeholder="Add a checklist step..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                        <button onClick={() => addChecklistItem(tmpl.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Edit Template' : 'New Template'}
                </h2>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                  <input type="text" value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. CIPC Annual Return" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select value={formData.category}
                      onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Type Code</label>
                    <input type="text" value={formData.job_type}
                      onChange={e => setFormData(p => ({ ...p, job_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g. cipc_annual_return" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Priority</label>
                    <select value={formData.default_priority}
                      onChange={e => setFormData(p => ({ ...p, default_priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Est. Days</label>
                    <input type="number" value={formData.estimated_days}
                      onChange={e => setFormData(p => ({ ...p, estimated_days: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      min="1" placeholder="e.g. 14" />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                <button onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
