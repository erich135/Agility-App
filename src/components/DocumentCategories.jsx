import React, { useState, useEffect } from 'react';
import supabase from '../lib/SupabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  FolderPlus,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronDown,
  Save,
  X,
  Plus,
  GripVertical
} from 'lucide-react';

export default function DocumentCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingUnderParent, setAddingUnderParent] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: '📁', description: '', parent_id: null });
  const [editData, setEditData] = useState({ name: '', icon: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
      
      // Auto-expand all parent categories on first load
      const parentIds = new Set((data || []).filter(c => !c.parent_id).map(c => c.id));
      setExpandedIds(parentIds);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build tree structure
  const getTree = () => {
    const parents = categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    return parents.map(parent => ({
      ...parent,
      children: categories
        .filter(c => c.parent_id === parent.id)
        .sort((a, b) => a.sort_order - b.sort_order)
    }));
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);
      const parentId = addingUnderParent || formData.parent_id;
      
      // Get max sort_order for siblings
      const siblings = categories.filter(c => 
        parentId ? c.parent_id === parentId : !c.parent_id
      );
      const maxSort = siblings.length > 0 ? Math.max(...siblings.map(s => s.sort_order || 0)) : 0;

      const { error } = await supabase
        .from('document_categories')
        .insert([{
          name: formData.name.trim(),
          icon: formData.icon || '📁',
          description: formData.description.trim() || null,
          parent_id: parentId || null,
          sort_order: maxSort + 1,
          is_active: true
        }]);

      if (error) throw error;

      setFormData({ name: '', icon: '📁', description: '', parent_id: null });
      setShowAddForm(false);
      setAddingUnderParent(null);
      await fetchCategories();
    } catch (err) {
      console.error('Error adding category:', err);
      alert('Failed to add category: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditData({ name: cat.name, icon: cat.icon || '📁', description: cat.description || '' });
  };

  const handleUpdate = async (id) => {
    if (!editData.name.trim()) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('document_categories')
        .update({
          name: editData.name.trim(),
          icon: editData.icon || '📁',
          description: editData.description.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      await fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Failed to update category: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    const children = categories.filter(c => c.parent_id === cat.id);
    const message = children.length > 0
      ? `"${cat.name}" has ${children.length} sub-categor${children.length === 1 ? 'y' : 'ies'}. Deleting this will remove the parent link from sub-categories. Continue?`
      : `Are you sure you want to delete "${cat.name}"?`;

    if (!window.confirm(message)) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('document_categories')
        .delete()
        .eq('id', cat.id);

      if (error) throw error;
      await fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      const { error } = await supabase
        .from('document_categories')
        .update({ is_active: !cat.is_active, updated_at: new Date().toISOString() })
        .eq('id', cat.id);

      if (error) throw error;
      await fetchCategories();
    } catch (err) {
      console.error('Error toggling category:', err);
    }
  };

  const startAddSubCategory = (parentId) => {
    setAddingUnderParent(parentId);
    setFormData({ name: '', icon: '📁', description: '', parent_id: parentId });
    setShowAddForm(true);
    setExpandedIds(prev => new Set([...prev, parentId]));
  };

  const commonIcons = ['📁', '🆔', '🏛️', '📊', '🏦', '💰', '🏧', '📄', '📜', '📅', '👥', '🔄', '📋', '📝', '📑', '✅', '💳', '👷', '✉️', '🧾', '✍️', '📎', '👤', '🏠', '🛂', '💵'];

  // Render a single category row
  const renderCategory = (cat, isChild = false) => {
    const isEditing = editingId === cat.id;
    const children = categories.filter(c => c.parent_id === cat.id);
    const isExpanded = expandedIds.has(cat.id);
    const isParent = !cat.parent_id;

    return (
      <div key={cat.id}>
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
          isChild ? 'pl-12 bg-gray-50/50' : ''
        } ${!cat.is_active ? 'opacity-50' : ''}`}>
          
          {/* Expand/collapse for parents */}
          <div className="w-5 flex-shrink-0">
            {isParent && children.length > 0 && (
              <button onClick={() => toggleExpand(cat.id)} className="text-gray-400 hover:text-gray-600">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>

          {isEditing ? (
            // Edit mode
            <div className="flex-1 flex items-center gap-2">
              <select
                value={editData.icon}
                onChange={(e) => setEditData(prev => ({ ...prev, icon: e.target.value }))}
                className="w-14 px-1 py-1.5 border border-gray-300 rounded text-lg"
              >
                {commonIcons.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoFocus
              />
              <input
                type="text"
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optional)"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                onClick={() => handleUpdate(cat.id)}
                disabled={saving}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Save"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            // Display mode
            <>
              <span className="text-xl flex-shrink-0">{cat.icon || '📁'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isParent ? 'text-gray-900' : 'text-gray-700'}`}>
                    {cat.name}
                  </span>
                  {!cat.is_active && (
                    <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Inactive</span>
                  )}
                  {isParent && (
                    <span className="text-xs text-gray-400">
                      {children.length} sub-categor{children.length === 1 ? 'y' : 'ies'}
                    </span>
                  )}
                </div>
                {cat.description && (
                  <p className="text-xs text-gray-500 truncate">{cat.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isParent && (
                  <button
                    onClick={() => startAddSubCategory(cat.id)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Add sub-category"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleToggleActive(cat)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    cat.is_active 
                      ? 'text-green-600 hover:bg-green-50' 
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={cat.is_active ? 'Deactivate' : 'Activate'}
                >
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    cat.is_active ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}>
                    {cat.is_active && (
                      <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => startEdit(cat)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Children */}
        {isParent && isExpanded && children.map(child => renderCategory(child, true))}
      </div>
    );
  };

  const tree = getTree();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Document Categories</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage categories and sub-categories for organising client documents. Documents can be tagged with multiple categories.
          </p>
        </div>

        {/* Add New Category */}
        <div className="mb-6">
          {!showAddForm ? (
            <button
              onClick={() => {
                setShowAddForm(true);
                setAddingUnderParent(null);
                setFormData({ name: '', icon: '📁', description: '', parent_id: null });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <FolderPlus className="w-4 h-4" />
              Add Category
            </button>
          ) : (
            <form onSubmit={handleAdd} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {addingUnderParent 
                  ? `Add sub-category under "${categories.find(c => c.id === addingUnderParent)?.name || ''}"` 
                  : 'Add new top-level category'}
              </h3>
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-16 px-1 py-2 border border-gray-300 rounded-lg text-lg"
                  >
                    {commonIcons.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Tax Returns"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    autoFocus
                  />
                </div>
                {!addingUnderParent && (
                  <div className="w-48">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Parent (optional)</label>
                    <select
                      value={formData.parent_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value || null }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Top-level category</option>
                      {categories.filter(c => !c.parent_id).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {saving ? 'Saving...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setAddingUnderParent(null); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              All Categories ({categories.filter(c => !c.parent_id).length} top-level, {categories.filter(c => c.parent_id).length} sub-categories)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setExpandedIds(new Set(categories.filter(c => !c.parent_id).map(c => c.id)))}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setExpandedIds(new Set())}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Collapse All
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading categories...</p>
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-12">
              <FolderPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No categories yet. Add your first one above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tree.map(cat => renderCategory(cat))}
            </div>
          )}
        </div>

        {/* Help text */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-800 mb-1">How categories work</h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• <strong>Top-level categories</strong> group related document types (e.g., CIPC, SARS, Identity Documents)</li>
            <li>• <strong>Sub-categories</strong> provide more specific classification within a group</li>
            <li>• Documents can be tagged with <strong>multiple categories</strong> — e.g., a director's ID can be tagged under Identity Documents, CIPC, and SARS</li>
            <li>• <strong>Deactivated</strong> categories won't appear when tagging documents but existing tags are preserved</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
