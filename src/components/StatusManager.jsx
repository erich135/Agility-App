import React, { useState, useEffect } from 'react';
import supabase from '../lib/SupabaseClient';
import { useAuth } from '../contexts/AuthContext';

const TAILWIND_COLORS = [
  { name: 'Gray',   bg: 'bg-gray-100 text-gray-700 border-gray-200',     dot: 'bg-gray-400',   header: 'bg-gray-500',   board: 'bg-gray-50' },
  { name: 'Blue',   bg: 'bg-blue-100 text-blue-700 border-blue-200',     dot: 'bg-blue-500',   header: 'bg-blue-500',   board: 'bg-blue-50' },
  { name: 'Yellow', bg: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', header: 'bg-yellow-500', board: 'bg-yellow-50' },
  { name: 'Orange', bg: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500', header: 'bg-orange-500', board: 'bg-orange-50' },
  { name: 'Purple', bg: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500', header: 'bg-purple-500', board: 'bg-purple-50' },
  { name: 'Green',  bg: 'bg-green-100 text-green-700 border-green-200',   dot: 'bg-green-500',  header: 'bg-green-500',  board: 'bg-green-50' },
  { name: 'Red',    bg: 'bg-red-100 text-red-700 border-red-200',         dot: 'bg-red-400',    header: 'bg-red-500',    board: 'bg-red-50' },
  { name: 'Teal',   bg: 'bg-teal-100 text-teal-700 border-teal-200',     dot: 'bg-teal-500',   header: 'bg-teal-500',   board: 'bg-teal-50' },
  { name: 'Indigo', bg: 'bg-indigo-100 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', header: 'bg-indigo-500', board: 'bg-indigo-50' },
  { name: 'Pink',   bg: 'bg-pink-100 text-pink-700 border-pink-200',     dot: 'bg-pink-500',   header: 'bg-pink-500',   board: 'bg-pink-50' },
  { name: 'Cyan',   bg: 'bg-cyan-100 text-cyan-700 border-cyan-200',     dot: 'bg-cyan-500',   header: 'bg-cyan-500',   board: 'bg-cyan-50' },
];

const EMPTY_FORM = {
  key: '', label: '', color_bg: TAILWIND_COLORS[0].bg, color_dot: TAILWIND_COLORS[0].dot,
  board_header_color: TAILWIND_COLORS[0].header, board_bg_color: TAILWIND_COLORS[0].board,
  is_active: true, is_closed: false,
};

export default function StatusManager() {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => { fetchStatuses(); }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('job_statuses')
        .select('*')
        .order('sort_order', { ascending: true });
      if (fetchErr) throw fetchErr;
      setStatuses(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    const maxSort = statuses.reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
    setFormData({ ...EMPTY_FORM, sort_order: maxSort + 10 });
    setEditingId(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (status) => {
    setFormData({
      key: status.key,
      label: status.label,
      color_bg: status.color_bg,
      color_dot: status.color_dot,
      board_header_color: status.board_header_color,
      board_bg_color: status.board_bg_color,
      is_active: status.is_active,
      is_closed: status.is_closed,
      sort_order: status.sort_order,
    });
    setEditingId(status.id);
    setShowForm(true);
    setError(null);
  };

  const handleColorSelect = (colorOption) => {
    setFormData(prev => ({
      ...prev,
      color_bg: colorOption.bg,
      color_dot: colorOption.dot,
      board_header_color: colorOption.header,
      board_bg_color: colorOption.board,
    }));
  };

  const handleSave = async () => {
    if (!formData.label.trim()) { setError('Label is required'); return; }

    // Auto-generate key from label if adding new
    const key = editingId
      ? formData.key
      : formData.key.trim() || formData.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');

    if (!key) { setError('Key is required'); return; }

    try {
      setSaving(true);
      setError(null);

      const record = {
        key,
        label: formData.label.trim(),
        color_bg: formData.color_bg,
        color_dot: formData.color_dot,
        board_header_color: formData.board_header_color,
        board_bg_color: formData.board_bg_color,
        is_active: formData.is_active,
        is_closed: formData.is_closed,
        sort_order: formData.sort_order ?? 0,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: updateErr } = await supabase
          .from('job_statuses')
          .update(record)
          .eq('id', editingId);
        if (updateErr) throw updateErr;
        showSuccess(`Status "${record.label}" updated`);
      } else {
        const { error: insertErr } = await supabase
          .from('job_statuses')
          .insert([record]);
        if (insertErr) throw insertErr;
        showSuccess(`Status "${record.label}" created`);
      }

      setShowForm(false);
      setEditingId(null);
      fetchStatuses();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (status) => {
    if (!window.confirm(`Delete status "${status.label}"?\n\nJobs currently using this status will keep their status value, but it won't appear in dropdowns.`)) return;
    try {
      const { error: delErr } = await supabase.from('job_statuses').delete().eq('id', status.id);
      if (delErr) throw delErr;
      showSuccess(`Status "${status.label}" deleted`);
      fetchStatuses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReorder = async (id, direction) => {
    const idx = statuses.findIndex(s => s.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= statuses.length) return;

    const a = statuses[idx];
    const b = statuses[swapIdx];

    try {
      await Promise.all([
        supabase.from('job_statuses').update({ sort_order: b.sort_order }).eq('id', a.id),
        supabase.from('job_statuses').update({ sort_order: a.sort_order }).eq('id', b.id),
      ]);
      fetchStatuses();
    } catch (err) {
      setError(err.message);
    }
  };

  const selectedColor = TAILWIND_COLORS.find(c => c.bg === formData.color_bg);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Statuses</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage the workflow statuses available in the Job Register and Kanban board
              </p>
            </div>
            <button onClick={openAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 self-start">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Status
            </button>
          </div>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-800">{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}

        {/* Status List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading statuses...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <div className="col-span-1">Order</div>
              <div className="col-span-2">Key</div>
              <div className="col-span-3">Label &amp; Preview</div>
              <div className="col-span-2">Board Column</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-1">Active</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {statuses.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-400">
                <p className="text-sm">No statuses configured. Click "Add Status" to create one.</p>
              </div>
            ) : (
              statuses.map((s, idx) => (
                <div key={s.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center hover:bg-gray-50">
                  {/* Order arrows */}
                  <div className="col-span-1 flex items-center gap-1">
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleReorder(s.id, 'up')}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleReorder(s.id, 'down')}
                        disabled={idx === statuses.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">{s.sort_order}</span>
                  </div>

                  {/* Key */}
                  <div className="col-span-2">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{s.key}</code>
                  </div>

                  {/* Label & Preview */}
                  <div className="col-span-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${s.color_bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.color_dot}`}></span>
                      {s.label}
                    </span>
                  </div>

                  {/* Board Column Preview */}
                  <div className="col-span-2">
                    <div className={`${s.board_header_color} text-white text-[10px] font-medium px-2 py-1 rounded inline-block`}>
                      {s.label}
                    </div>
                  </div>

                  {/* Type */}
                  <div className="col-span-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${s.is_closed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {s.is_closed ? 'Closed' : 'Open'}
                    </span>
                  </div>

                  {/* Active */}
                  <div className="col-span-1">
                    {s.is_active ? (
                      <span className="text-green-500 text-xs font-medium">Active</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Inactive</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex justify-end gap-1">
                    <button onClick={() => openEdit(s)} title="Edit"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(s)} title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ADD/EDIT MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Edit Status' : 'Add Status'}
                </h2>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-5">
                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                  <input type="text" value={formData.label}
                    onChange={e => setFormData(p => ({ ...p, label: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Waiting on Client" />
                </div>

                {/* Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key {editingId ? '(read-only)' : '(auto-generated from label, or type your own)'}
                  </label>
                  <input type="text" value={formData.key || formData.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '')}
                    onChange={e => setFormData(p => ({ ...p, key: e.target.value }))}
                    disabled={!!editingId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                    placeholder="e.g. waiting_client" />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {TAILWIND_COLORS.map(c => (
                      <button
                        key={c.name}
                        onClick={() => handleColorSelect(c)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-colors text-xs ${
                          selectedColor?.name === c.name
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${c.dot}`}></span>
                        <span className="text-gray-700">{c.name}</span>
                      </button>
                    ))}
                  </div>
                  {/* Preview */}
                  <div className="mt-3 flex items-center gap-4">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Badge preview:</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${formData.color_bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${formData.color_dot}`}></span>
                        {formData.label || 'Status'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Board column:</span>
                      <div className={`${formData.board_header_color} text-white text-xs font-medium px-3 py-1.5 rounded`}>
                        {formData.label || 'Status'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input type="number" value={formData.sort_order ?? ''}
                    onChange={e => setFormData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10" />
                  <p className="text-xs text-gray-400 mt-1">Lower numbers appear first (left on the board)</p>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_active}
                      onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_closed}
                      onChange={e => setFormData(p => ({ ...p, is_closed: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Closed status</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 -mt-3">
                  "Closed" statuses (e.g. Completed, Cancelled) are excluded from the "Active Jobs" filter.
                </p>
              </div>

              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? 'Update Status' : 'Create Status'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
