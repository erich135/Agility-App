import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/SupabaseClient';
import JSZip from 'jszip';
import JobKanbanBoard from './JobKanbanBoard';
import { generateProgressReportPDF } from '../services/jobProgressPDF';

const FALLBACK_STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  waiting_client: { label: 'Waiting on Client', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  waiting_sars: { label: 'Waiting on SARS', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  under_review: { label: 'Under Review', color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-400' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-gray-500', icon: '!' },
  medium: { label: 'Medium', color: 'text-blue-500', icon: '!!' },
  high: { label: 'High', color: 'text-orange-500', icon: '!!!' },
  urgent: { label: 'Urgent', color: 'text-red-600', icon: '!!!!' },
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

const EMPTY_JOB = {
  title: '', description: '', job_type: '', category: 'general',
  tax_year: '', period: '', status: 'not_started', priority: 'medium',
  date_due: '', assigned_to: '', assigned_to_name: '',
  is_recurring: false, recurrence_pattern: '', template_id: '',
  quoted_amount: '', notes: '',
};

// Smart suggestions: map job types to recommended document category names
const JOB_DOC_SUGGESTIONS = {
  cipc_bo_filing: [
    'Directors/Members IDs', 'Proof of Address', 'Beneficial Ownership (BO-1)',
    'Share Certificates & Registers', 'Registration Documents', 'Mandates',
  ],
  cipc_annual_return: [
    'Registration Documents', 'Annual Returns', 'Directors/Members IDs',
  ],
  cipc_director_change: [
    'Directors/Members IDs', 'Proof of Address', 'Director Changes (CoR39)',
    'Registration Documents', 'Resolutions',
  ],
  sars_tax_return: [
    'Tax Returns (ITR12/IT14)', 'Assessments', 'IRP5s & IT3s', 'Bank Statements',
  ],
  sars_vat: [
    'VAT201', 'Tax Clearance (TCC)', 'Bank Statements', 'Invoices',
  ],
  trust_filing: [
    'Trust Deed', 'Letters of Authority', 'Resolutions',
    "Master's Office Correspondence", 'Directors/Members IDs',
  ],
};

const LINK_TYPE_CONFIG = {
  supporting: { label: 'Supporting', color: 'bg-blue-100 text-blue-700', icon: '📎' },
  output: { label: 'Output', color: 'bg-green-100 text-green-700', icon: '📤' },
  mandate: { label: 'Mandate', color: 'bg-amber-100 text-amber-700', icon: '📋' },
  correspondence: { label: 'Correspondence', color: 'bg-purple-100 text-purple-700', icon: '✉️' },
};

export default function JobRegister() {
  const { user } = useAuth();

  // Data
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [checklistItems, setChecklistItems] = useState({});
  const [jobStatuses, setJobStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_due');
  const [sortDir, setSortDir] = useState('asc');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_JOB });
  const [formCustomerId, setFormCustomerId] = useState('');
  const [saving, setSaving] = useState(false);

  // Expanded job / checklist
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Document linking
  const [jobDocuments, setJobDocuments] = useState({}); // { jobId: [{ ...link, document }] }
  const [clientDocuments, setClientDocuments] = useState([]); // docs for the expanded job's client
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [docPickerSearch, setDocPickerSearch] = useState('');
  const [docLinkType, setDocLinkType] = useState('supporting');
  const [downloadingPack, setDownloadingPack] = useState(false);
  const [docCategories, setDocCategories] = useState([]); // all categories for suggestions

  // Messages
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  // View mode
  const [viewMode, setViewMode] = useState('table'); // table, board

  useEffect(() => {
    fetchInitialData();
  }, []);

  // When a job is expanded, fetch its linked documents and the client's available documents
  useEffect(() => {
    if (expandedJobId) {
      fetchJobDocuments(expandedJobId);
      const job = jobs.find(j => j.id === expandedJobId);
      if (job?.client_id) fetchClientDocuments(job.client_id);
    } else {
      setShowDocPicker(false);
      setDocPickerSearch('');
    }
  }, [expandedJobId, jobs]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // ============== DATA ==============

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchCustomers(), fetchTemplates(), fetchJobs(), fetchDocCategories(), fetchJobStatuses()]);
    setLoading(false);
  };

  const fetchDocCategories = async () => {
    try {
      const { data } = await supabase.from('document_categories').select('*').eq('is_active', true);
      setDocCategories(data || []);
    } catch (err) { console.error('Failed to fetch doc categories:', err); }
  };

  const fetchJobStatuses = async () => {
    try {
      const { data } = await supabase
        .from('job_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      setJobStatuses(data || []);
    } catch (err) { console.error('Failed to fetch job statuses:', err); }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase.from('clients').select('id, client_name').order('client_name');
      setCustomers(data || []);
    } catch (err) { console.error(err); }
  };

  const fetchTemplates = async () => {
    try {
      const { data } = await supabase
        .from('job_templates')
        .select('*, job_template_checklist(*)')
        .eq('is_active', true)
        .order('sort_order');
      setTemplates(data || []);
    } catch (err) { console.error(err); }
  };

  const fetchJobs = async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('job_register')
        .select('*')
        .order('created_at', { ascending: false });
      if (fetchErr) throw fetchErr;
      setJobs(data || []);

      // Fetch all checklist items
      if (data && data.length > 0) {
        const jobIds = data.map(j => j.id);
        const { data: items } = await supabase
          .from('job_checklist_items')
          .select('*')
          .in('job_id', jobIds)
          .order('sort_order');
        const map = {};
        (items || []).forEach(item => {
          if (!map[item.job_id]) map[item.job_id] = [];
          map[item.job_id].push(item);
        });
        setChecklistItems(map);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Build dynamic status config from DB (with fallback)
  const STATUS_CONFIG = useMemo(() => {
    if (jobStatuses.length === 0) return FALLBACK_STATUS_CONFIG;
    const cfg = {};
    jobStatuses.forEach(s => {
      cfg[s.key] = { label: s.label, color: s.color_bg, dot: s.color_dot };
    });
    return cfg;
  }, [jobStatuses]);

  // Set of closed status keys for "active" filter
  const closedStatusKeys = useMemo(() => {
    if (jobStatuses.length === 0) return new Set(['completed', 'cancelled']);
    return new Set(jobStatuses.filter(s => s.is_closed).map(s => s.key));
  }, [jobStatuses]);

  // ============== FILTERING & SORTING ==============

  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    if (filterStatus === 'active') {
      filtered = filtered.filter(j => !closedStatusKeys.has(j.status));
    } else if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(j => j.status === filterStatus);
    }

    if (filterCustomer) filtered = filtered.filter(j => j.client_id === filterCustomer);
    if (filterCategory) filtered = filtered.filter(j => j.category === filterCategory);
    if (filterPriority) filtered = filtered.filter(j => j.priority === filterPriority);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(j =>
        j.title.toLowerCase().includes(term) ||
        (j.description || '').toLowerCase().includes(term) ||
        (j.job_type || '').toLowerCase().includes(term) ||
        (j.assigned_to_name || '').toLowerCase().includes(term) ||
        (j.period || '').toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (sortBy === 'date_due') {
        va = va || '9999-12-31';
        vb = vb || '9999-12-31';
      }
      if (sortBy === 'priority') {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        va = order[va] ?? 2;
        vb = order[vb] ?? 2;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [jobs, filterStatus, filterCustomer, filterCategory, filterPriority, searchTerm, sortBy, sortDir, closedStatusKeys]);

  // Customer name lookup
  const getCustomerName = (clientId) => customers.find(c => c.id === clientId)?.client_name || '';

  // ============== JOB FORM ==============

  const openAddForm = () => {
    setFormData({ ...EMPTY_JOB });
    setFormCustomerId('');
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (job) => {
    setFormData({
      title: job.title || '', description: job.description || '',
      job_type: job.job_type || '', category: job.category || 'general',
      tax_year: job.tax_year || '', period: job.period || '',
      status: job.status || 'not_started', priority: job.priority || 'medium',
      date_due: job.date_due || '',
      assigned_to: job.assigned_to || '', assigned_to_name: job.assigned_to_name || '',
      is_recurring: job.is_recurring || false,
      recurrence_pattern: job.recurrence_pattern || '',
      template_id: job.template_id || '',
      quoted_amount: job.quoted_amount || '', notes: job.notes || '',
    });
    setFormCustomerId(job.client_id);
    setEditingId(job.id);
    setShowForm(true);
  };

  const handleTemplateSelect = (templateId) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return;
    setFormData(prev => ({
      ...prev,
      template_id: templateId,
      title: tmpl.name,
      description: tmpl.description || '',
      job_type: tmpl.job_type,
      category: tmpl.category,
      priority: tmpl.default_priority || 'medium',
    }));
  };

  const handleSave = async () => {
    if (!formCustomerId) { setError('Please select a customer'); return; }
    if (!formData.title.trim()) { setError('Job title is required'); return; }
    if (!formData.category) { setError('Category is required'); return; }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        client_id: formCustomerId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        job_type: formData.job_type || formData.category,
        category: formData.category,
        tax_year: formData.tax_year.trim() || null,
        period: formData.period.trim() || null,
        status: formData.status,
        priority: formData.priority,
        date_due: formData.date_due || null,
        assigned_to_name: formData.assigned_to_name.trim() || null,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
        template_id: formData.template_id || null,
        quoted_amount: formData.quoted_amount ? parseFloat(formData.quoted_amount) : null,
        notes: formData.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: upErr } = await supabase.from('job_register').update(payload).eq('id', editingId);
        if (upErr) throw upErr;

        // Log status change
        const oldJob = jobs.find(j => j.id === editingId);
        if (oldJob && oldJob.status !== payload.status) {
          await logActivity(editingId, 'status_changed', `Status changed`, oldJob.status, payload.status);
        }

        showSuccess('Job updated');
      } else {
        payload.created_by = user?.id || null;
        payload.date_created = new Date().toISOString().split('T')[0];
        if (payload.status === 'in_progress') payload.date_started = payload.date_created;

        const { data: newJob, error: insErr } = await supabase
          .from('job_register')
          .insert([payload])
          .select()
          .single();
        if (insErr) throw insErr;

        // If template selected, copy checklist items
        if (formData.template_id) {
          const tmpl = templates.find(t => t.id === formData.template_id);
          const tmplItems = tmpl?.job_template_checklist || [];
          if (tmplItems.length > 0) {
            const items = tmplItems.map(ti => ({
              job_id: newJob.id,
              title: ti.title,
              description: ti.description || null,
              sort_order: ti.sort_order,
              is_required: ti.is_required,
            }));
            await supabase.from('job_checklist_items').insert(items);
          }
        }

        await logActivity(newJob.id, 'created', `Job created: ${payload.title}`);
        showSuccess('Job created');
      }

      setShowForm(false);
      setEditingId(null);
      await fetchJobs();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async (job) => {
    if (!window.confirm(`Delete job "${job.title}"? This cannot be undone.`)) return;
    try {
      const { error: delErr } = await supabase.from('job_register').delete().eq('id', job.id);
      if (delErr) throw delErr;
      showSuccess('Job deleted');
      await fetchJobs();
    } catch (err) { setError(err.message); }
  };

  const handleQuickStatus = async (job, newStatus) => {
    try {
      const updates = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'in_progress' && !job.date_started) {
        updates.date_started = new Date().toISOString().split('T')[0];
      }
      if (newStatus === 'completed') {
        updates.date_completed = new Date().toISOString().split('T')[0];
      }
      if (newStatus !== 'completed') {
        updates.date_completed = null;
      }

      const { error: upErr } = await supabase.from('job_register').update(updates).eq('id', job.id);
      if (upErr) throw upErr;
      await logActivity(job.id, 'status_changed', 'Status changed', job.status, newStatus);
      await fetchJobs();
    } catch (err) { setError(err.message); }
  };

  // ============== CHECKLIST ==============

  const toggleChecklistItem = async (item) => {
    try {
      const updates = {
        is_completed: !item.is_completed,
        completed_at: !item.is_completed ? new Date().toISOString() : null,
        completed_by: !item.is_completed ? user?.id : null,
        completed_by_name: !item.is_completed ? (user?.full_name || user?.email) : null,
      };
      const { error: upErr } = await supabase.from('job_checklist_items').update(updates).eq('id', item.id);
      if (upErr) throw upErr;

      setChecklistItems(prev => {
        const updated = { ...prev };
        updated[item.job_id] = (updated[item.job_id] || []).map(ci =>
          ci.id === item.id ? { ...ci, ...updates } : ci
        );
        return updated;
      });

      if (!item.is_completed) {
        await logActivity(item.job_id, 'checklist_completed', `Checked: ${item.title}`);
      }
    } catch (err) { setError(err.message); }
  };

  const addChecklistItem = async (jobId) => {
    if (!newChecklistItem.trim()) return;
    try {
      const existing = checklistItems[jobId] || [];
      const { data, error: insErr } = await supabase
        .from('job_checklist_items')
        .insert([{
          job_id: jobId,
          title: newChecklistItem.trim(),
          sort_order: existing.length,
          is_required: false,
        }])
        .select()
        .single();
      if (insErr) throw insErr;

      setChecklistItems(prev => ({
        ...prev,
        [jobId]: [...(prev[jobId] || []), data],
      }));
      setNewChecklistItem('');
    } catch (err) { setError(err.message); }
  };

  const deleteChecklistItem = async (item) => {
    try {
      await supabase.from('job_checklist_items').delete().eq('id', item.id);
      setChecklistItems(prev => ({
        ...prev,
        [item.job_id]: (prev[item.job_id] || []).filter(ci => ci.id !== item.id),
      }));
    } catch (err) { setError(err.message); }
  };

  // ============== DOCUMENT LINKING ==============

  const fetchJobDocuments = async (jobId) => {
    try {
      const { data: links } = await supabase
        .from('job_document_links')
        .select('*, documents(*)')
        .eq('job_id', jobId)
        .order('linked_at', { ascending: false });

      // Also fetch category tags for each linked document
      const docIds = (links || []).map(l => l.document_id).filter(Boolean);
      let tagMap = {};
      if (docIds.length > 0) {
        const { data: tags } = await supabase
          .from('document_category_tags')
          .select('document_id, category_id, document_categories(name, icon)')
          .in('document_id', docIds);
        (tags || []).forEach(t => {
          if (!tagMap[t.document_id]) tagMap[t.document_id] = [];
          tagMap[t.document_id].push(t.document_categories);
        });
      }

      const enriched = (links || []).map(l => ({
        ...l,
        document: l.documents,
        docCategories: tagMap[l.document_id] || [],
      }));

      setJobDocuments(prev => ({ ...prev, [jobId]: enriched }));
    } catch (err) { console.error('Failed to fetch job documents:', err); }
  };

  const fetchClientDocuments = async (clientId) => {
    try {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId)
        .order('uploaded_at', { ascending: false });

      // Fetch tags for all client documents
      const docIds = (data || []).map(d => d.id);
      let tagMap = {};
      if (docIds.length > 0) {
        const { data: tags } = await supabase
          .from('document_category_tags')
          .select('document_id, category_id, document_categories(name, icon)')
          .in('document_id', docIds);
        (tags || []).forEach(t => {
          if (!tagMap[t.document_id]) tagMap[t.document_id] = [];
          tagMap[t.document_id].push(t.document_categories);
        });
      }

      setClientDocuments((data || []).map(d => ({ ...d, docCategories: tagMap[d.id] || [] })));
    } catch (err) { console.error('Failed to fetch client documents:', err); }
  };

  const linkDocument = async (jobId, documentId, linkType = 'supporting') => {
    try {
      const { error: insErr } = await supabase.from('job_document_links').insert([{
        job_id: jobId,
        document_id: documentId,
        link_type: linkType,
        linked_by: user?.id || null,
      }]);
      if (insErr) {
        if (insErr.code === '23505') { setError('Document already linked to this job'); return; }
        throw insErr;
      }
      await logActivity(jobId, 'document_linked', 'Document linked to job');
      await fetchJobDocuments(jobId);
      showSuccess('Document linked');
    } catch (err) { setError(err.message); }
  };

  const unlinkDocument = async (jobId, linkId) => {
    try {
      const { error: delErr } = await supabase.from('job_document_links').delete().eq('id', linkId);
      if (delErr) throw delErr;
      await logActivity(jobId, 'document_unlinked', 'Document removed from job');
      await fetchJobDocuments(jobId);
    } catch (err) { setError(err.message); }
  };

  const downloadJobPack = async (job) => {
    const docs = jobDocuments[job.id] || [];
    if (docs.length === 0) { setError('No documents linked to this job'); return; }

    try {
      setDownloadingPack(true);
      const zip = new JSZip();
      const customerName = getCustomerName(job.client_id);
      let downloadErrors = [];

      for (const link of docs) {
        const doc = link.document;
        if (!doc?.file_path) continue;
        try {
          const { data: blob, error: dlErr } = await supabase.storage
            .from('client-documents')
            .download(doc.file_path);
          if (dlErr) throw dlErr;

          // Use a subfolder based on link type
          const folder = LINK_TYPE_CONFIG[link.link_type]?.label || 'Documents';
          const fileName = doc.document_name || doc.file_name || 'document';
          zip.file(`${folder}/${fileName}`, blob);
        } catch (err) {
          console.error(`Failed to download ${doc.document_name}:`, err);
          downloadErrors.push(doc.document_name || doc.file_name);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const safeName = `${job.title} - ${customerName}`.replace(/[^a-zA-Z0-9 \-_]/g, '').trim();
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      await logActivity(job.id, 'job_pack_downloaded', `Downloaded job pack (${docs.length} files)`);

      if (downloadErrors.length > 0) {
        showSuccess(`Pack downloaded (${downloadErrors.length} file(s) could not be included)`);
      } else {
        showSuccess(`Job pack downloaded — ${docs.length} file(s)`);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to create job pack: ' + err.message);
    } finally {
      setDownloadingPack(false);
    }
  };

  // Get suggested categories for a job type
  const getSuggestedCategories = (jobType) => {
    return JOB_DOC_SUGGESTIONS[jobType] || [];
  };

  // Check which suggested categories have documents linked
  const getSuggestionStatus = (jobId, jobType) => {
    const suggestions = getSuggestedCategories(jobType);
    if (suggestions.length === 0) return [];
    const linkedDocs = jobDocuments[jobId] || [];
    const linkedCatNames = new Set();
    linkedDocs.forEach(link => {
      (link.docCategories || []).forEach(cat => linkedCatNames.add(cat.name));
    });
    return suggestions.map(catName => ({
      name: catName,
      satisfied: linkedCatNames.has(catName),
    }));
  };

  // ============== ACTIVITY LOG ==============

  const logActivity = async (jobId, action, details, oldValue, newValue) => {
    try {
      await supabase.from('job_activity_log').insert([{
        job_id: jobId,
        action,
        details,
        old_value: oldValue || null,
        new_value: newValue || null,
        performed_by: user?.id || null,
        performed_by_name: user?.full_name || user?.email || null,
      }]);
    } catch (err) { console.error('Failed to log activity:', err); }
  };

  // ============== HELPERS ==============

  const getChecklistProgress = (jobId) => {
    const items = checklistItems[jobId] || [];
    if (items.length === 0) return null;
    const done = items.filter(i => i.is_completed).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  };

  const getDueStatus = (dateDue) => {
    if (!dateDue) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(dateDue); due.setHours(0,0,0,0);
    const diff = Math.ceil((due - today) / 86400000);
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, class: 'text-red-600 font-semibold' };
    if (diff === 0) return { label: 'Due today', class: 'text-red-600 font-semibold' };
    if (diff <= 3) return { label: `${diff}d left`, class: 'text-orange-500 font-medium' };
    if (diff <= 7) return { label: `${diff}d left`, class: 'text-yellow-600' };
    return { label: `${diff}d left`, class: 'text-gray-500' };
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  // Stats
  const stats = useMemo(() => {
    const activeJobs = jobs.filter(j => !closedStatusKeys.has(j.status));
    const overdue = activeJobs.filter(j => {
      if (!j.date_due) return false;
      return new Date(j.date_due) < new Date(new Date().toDateString());
    });
    return {
      total: jobs.length,
      active: activeJobs.length,
      overdue: overdue.length,
      completed: jobs.filter(j => closedStatusKeys.has(j.status)).length,
      byCategory: Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => ({
        key, ...cfg,
        count: activeJobs.filter(j => j.category === key).length,
      })).filter(c => c.count > 0),
    };
  }, [jobs, closedStatusKeys]);

  // ============== RENDER ==============

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Register</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track CIPC filings, SARS returns, payroll, trust admin & all client work
              </p>
            </div>
            <div className="flex items-center gap-2 self-start">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Table view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'board'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Board view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </button>
              </div>
              <button onClick={openAddForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Job
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            <StatBadge label="Active" value={stats.active} color="text-blue-600 bg-blue-50" />
            <StatBadge label="Overdue" value={stats.overdue} color={stats.overdue > 0 ? 'text-red-600 bg-red-50 animate-pulse' : 'text-gray-500 bg-gray-50'} />
            <StatBadge label="Completed" value={stats.completed} color="text-green-600 bg-green-50" />
            <div className="border-l border-gray-200 mx-1"></div>
            {stats.byCategory.map(c => (
              <span key={c.key} className={`text-xs px-2 py-1 rounded-full ${c.color}`}>
                {c.label}: {c.count}
              </span>
            ))}
          </div>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-800">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="ml-auto text-green-400 hover:text-green-600">&times;</button>
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[180px]">
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search jobs..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[160px]">
              <option value="">All Customers</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="active">Active Jobs</option>
              <option value="all">All Jobs</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="text-xs text-gray-500">{filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Job List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading jobs...</p>
          </div>
        ) : viewMode === 'board' ? (
          <JobKanbanBoard
            jobs={filteredJobs}
            customers={customers}
            checklistItems={checklistItems}
            jobStatuses={jobStatuses}
            statusConfig={STATUS_CONFIG}
            onQuickStatus={handleQuickStatus}
            onEdit={openEditForm}
            onExpand={setExpandedJobId}
            expandedJobId={expandedJobId}
            getDueStatus={getDueStatus}
          />
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-16 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {jobs.length === 0 ? 'No jobs yet' : 'No matching jobs'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {jobs.length === 0 ? 'Create your first job to start tracking work.' : 'Try adjusting your filters.'}
            </p>
            {jobs.length === 0 && (
              <button onClick={openAddForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                Create First Job
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <div className="col-span-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort('title')}>
                Job {sortBy === 'title' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
              </div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-1">Category</div>
              <div className="col-span-1 cursor-pointer hover:text-gray-700" onClick={() => handleSort('priority')}>
                Priority {sortBy === 'priority' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
              </div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1 cursor-pointer hover:text-gray-700" onClick={() => handleSort('date_due')}>
                Due {sortBy === 'date_due' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
              </div>
              <div className="col-span-1">Progress</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Job Rows */}
            {filteredJobs.map(job => {
              const isExpanded = expandedJobId === job.id;
              const progress = getChecklistProgress(job.id);
              const dueInfo = job.status !== 'completed' ? getDueStatus(job.date_due) : null;
              const customerName = getCustomerName(job.client_id);
              const catCfg = CATEGORY_CONFIG[job.category] || CATEGORY_CONFIG.general;
              const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.not_started;
              const prioCfg = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.medium;
              const items = checklistItems[job.id] || [];

              return (
                <div key={job.id} className={`border-b border-gray-100 last:border-b-0 ${job.status === 'completed' ? 'opacity-60' : ''}`}>
                  {/* Main Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer items-center"
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}>
                    {/* Job Title */}
                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                      <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                        {job.period && <p className="text-xs text-gray-400">{job.period}</p>}
                      </div>
                    </div>
                    {/* Customer */}
                    <div className="col-span-2 text-sm text-gray-600 truncate">{customerName}</div>
                    {/* Category */}
                    <div className="col-span-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${catCfg.color}`}>{catCfg.label}</span>
                    </div>
                    {/* Priority */}
                    <div className="col-span-1">
                      <span className={`text-xs font-semibold ${prioCfg.color}`}>{prioCfg.label}</span>
                    </div>
                    {/* Status */}
                    <div className="col-span-1">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
                        {statusCfg.label}
                      </span>
                    </div>
                    {/* Due */}
                    <div className="col-span-1">
                      {job.date_due && (
                        <div>
                          <p className="text-xs text-gray-600">{new Date(job.date_due).toLocaleDateString('en-ZA')}</p>
                          {dueInfo && <p className={`text-xs ${dueInfo.class}`}>{dueInfo.label}</p>}
                        </div>
                      )}
                    </div>
                    {/* Progress */}
                    <div className="col-span-1">
                      {progress && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[60px]">
                            <div className={`h-1.5 rounded-full transition-all ${progress.pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                              style={{ width: `${progress.pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{progress.done}/{progress.total}</span>
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="col-span-2 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      {job.status !== 'completed' && job.status !== 'cancelled' && (
                        <select
                          value={job.status}
                          onChange={e => handleQuickStatus(job, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white"
                        >
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      )}
                      <button onClick={() => openEditForm(job)} title="Edit"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteJob(job)} title="Delete"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        {/* Column 1: Job Details */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Details</h4>
                          {job.description && <DetailRow label="Description" value={job.description} />}
                          <DetailRow label="Job Type" value={job.job_type} />
                          {job.tax_year && <DetailRow label="Tax Year" value={job.tax_year} />}
                          {job.period && <DetailRow label="Period" value={job.period} />}
                          {job.assigned_to_name && <DetailRow label="Assigned To" value={job.assigned_to_name} />}
                          {job.is_recurring && <DetailRow label="Recurring" value={job.recurrence_pattern || 'Yes'} />}
                          {job.quoted_amount && <DetailRow label="Quoted" value={`R ${parseFloat(job.quoted_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} />}
                          {job.notes && <DetailRow label="Notes" value={job.notes} />}
                          <DetailRow label="Created" value={job.date_created ? new Date(job.date_created).toLocaleDateString('en-ZA') : '-'} />
                          {job.date_started && <DetailRow label="Started" value={new Date(job.date_started).toLocaleDateString('en-ZA')} />}
                          {job.date_completed && <DetailRow label="Completed" value={new Date(job.date_completed).toLocaleDateString('en-ZA')} />}
                        </div>

                        {/* Column 2: Checklist */}
                        <div className="md:col-span-2 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Checklist {progress && `(${progress.done}/${progress.total})`}
                            </h4>
                            {progress && (
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div className={`h-2 rounded-full transition-all ${progress.pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progress.pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-500">{progress.pct}%</span>
                              </div>
                            )}
                          </div>

                          {items.length > 0 ? (
                            <div className="space-y-1">
                              {items.map(item => (
                                <div key={item.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${item.is_completed ? 'bg-green-50' : 'bg-white border border-gray-200'}`}>
                                  <button onClick={() => toggleChecklistItem(item)}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                      item.is_completed
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : 'border-gray-300 hover:border-blue-400'
                                    }`}>
                                    {item.is_completed && (
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                  <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                    {item.title}
                                    {item.is_required && !item.is_completed && <span className="text-red-400 ml-1">*</span>}
                                  </span>
                                  {item.is_completed && item.completed_by_name && (
                                    <span className="text-xs text-gray-400">{item.completed_by_name}</span>
                                  )}
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
                            <p className="text-xs text-gray-400 italic">No checklist items. Add one below or use a template when creating jobs.</p>
                          )}

                          {/* Add checklist item */}
                          <div className="flex gap-2 mt-2">
                            <input type="text" value={newChecklistItem}
                              onChange={e => setNewChecklistItem(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addChecklistItem(job.id); }}
                              placeholder="Add a checklist item..."
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                            <button onClick={() => addChecklistItem(job.id)}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                              Add
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Export Progress Report */}
                      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2">
                        <button
                          onClick={() => generateProgressReportPDF({
                            job,
                            customerName,
                            checklistItems: items,
                            statusConfig: STATUS_CONFIG,
                            categoryConfig: CATEGORY_CONFIG,
                          })}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Export Progress Report (PDF)
                        </button>
                      </div>

                      {/* ============ DOCUMENTS SECTION ============ */}
                      {(() => {
                        const linkedDocs = jobDocuments[job.id] || [];
                        const suggestions = getSuggestionStatus(job.id, job.job_type);
                        const alreadyLinkedIds = new Set(linkedDocs.map(l => l.document_id));
                        const availableDocs = clientDocuments.filter(d => !alreadyLinkedIds.has(d.id));
                        const filteredPickerDocs = docPickerSearch.trim()
                          ? availableDocs.filter(d =>
                              (d.document_name || '').toLowerCase().includes(docPickerSearch.toLowerCase()) ||
                              (d.file_name || '').toLowerCase().includes(docPickerSearch.toLowerCase()) ||
                              (d.docCategories || []).some(c => c.name.toLowerCase().includes(docPickerSearch.toLowerCase()))
                            )
                          : availableDocs;

                        return (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  Job Documents ({linkedDocs.length})
                                </h4>
                              </div>
                              <div className="flex items-center gap-2">
                                {linkedDocs.length > 0 && (
                                  <button
                                    onClick={() => downloadJobPack(job)}
                                    disabled={downloadingPack}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                                  >
                                    {downloadingPack ? (
                                      <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> Creating Pack...</>
                                    ) : (
                                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Download Job Pack</>
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => { setShowDocPicker(!showDocPicker); setDocPickerSearch(''); }}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  {showDocPicker ? 'Close' : 'Link Documents'}
                                </button>
                              </div>
                            </div>

                            {/* Smart Suggestions Banner */}
                            {suggestions.length > 0 && (
                              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs font-medium text-amber-800 mb-2">📋 Recommended documents for {job.job_type?.replace(/_/g, ' ')}:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {suggestions.map(s => (
                                    <span key={s.name} className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                      s.satisfied
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-white text-amber-700 border border-amber-300'
                                    }`}>
                                      {s.satisfied ? '✓' : '○'} {s.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Linked Documents List */}
                            {linkedDocs.length > 0 ? (
                              <div className="space-y-1.5 mb-3">
                                {linkedDocs.map(link => {
                                  const doc = link.document;
                                  if (!doc) return null;
                                  const ltCfg = LINK_TYPE_CONFIG[link.link_type] || LINK_TYPE_CONFIG.supporting;
                                  const sizeStr = doc.file_size
                                    ? doc.file_size > 1048576
                                      ? `${(doc.file_size / 1048576).toFixed(1)} MB`
                                      : `${(doc.file_size / 1024).toFixed(1)} KB`
                                    : '';
                                  return (
                                    <div key={link.id} className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-200 transition-colors group">
                                      <span className="text-lg flex-shrink-0">{ltCfg.icon}</span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 truncate font-medium">{doc.document_name || doc.file_name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${ltCfg.color}`}>{ltCfg.label}</span>
                                          {(link.docCategories || []).slice(0, 3).map(cat => (
                                            <span key={cat.name} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                              {cat.icon} {cat.name}
                                            </span>
                                          ))}
                                          {sizeStr && <span className="text-[10px] text-gray-400">{sizeStr}</span>}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => unlinkDocument(job.id, link.id)}
                                        title="Remove from job"
                                        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic mb-3">
                                No documents linked. Click "Link Documents" to attach client files to this job.
                              </p>
                            )}

                            {/* Document Picker */}
                            {showDocPicker && (
                              <div className="border border-blue-200 rounded-lg bg-blue-50 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <input
                                    type="text"
                                    value={docPickerSearch}
                                    onChange={e => setDocPickerSearch(e.target.value)}
                                    placeholder="Search client documents..."
                                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                  />
                                  <select
                                    value={docLinkType}
                                    onChange={e => setDocLinkType(e.target.value)}
                                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                  >
                                    {Object.entries(LINK_TYPE_CONFIG).map(([k, v]) => (
                                      <option key={k} value={k}>{v.icon} {v.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                  {filteredPickerDocs.length > 0 ? (
                                    filteredPickerDocs.map(doc => {
                                      const sizeStr = doc.file_size
                                        ? doc.file_size > 1048576
                                          ? `${(doc.file_size / 1048576).toFixed(1)} MB`
                                          : `${(doc.file_size / 1024).toFixed(1)} KB`
                                        : '';
                                      return (
                                        <div key={doc.id}
                                          className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-100 hover:border-blue-300 cursor-pointer transition-colors"
                                          onClick={() => linkDocument(job.id, doc.id, docLinkType)}
                                        >
                                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                          </svg>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-800 truncate">{doc.document_name || doc.file_name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              {(doc.docCategories || []).slice(0, 3).map(cat => (
                                                <span key={cat.name} className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">
                                                  {cat.icon} {cat.name}
                                                </span>
                                              ))}
                                              {sizeStr && <span className="text-[10px] text-gray-400">{sizeStr}</span>}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="text-xs text-gray-500 text-center py-3">
                                      {clientDocuments.length === 0
                                        ? 'No documents uploaded for this client yet.'
                                        : availableDocs.length === 0
                                          ? 'All client documents are already linked to this job.'
                                          : 'No documents match your search.'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* BOARD VIEW - JOB DETAIL MODAL */}
        {viewMode === 'board' && expandedJobId && (() => {
          const job = filteredJobs.find(j => j.id === expandedJobId);
          if (!job) return null;
          const customerName = getCustomerName(job.client_id);
          const items = checklistItems[job.id] || [];
          const progress = getChecklistProgress(job.id);
          const dueInfo = job.status !== 'completed' ? getDueStatus(job.date_due) : null;
          const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.not_started || { label: job.status, color: '', dot: '' };
          const catCfg = CATEGORY_CONFIG[job.category] || CATEGORY_CONFIG.general;

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setExpandedJobId(null)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">{customerName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${catCfg.color}`}>{catCfg.label}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
                        {statusCfg.label}
                      </span>
                      {dueInfo && (
                        <span className={`text-xs ${dueInfo.class}`}>{dueInfo.label}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => openEditForm(job)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => setExpandedJobId(null)} className="text-gray-400 hover:text-gray-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1: Job Details */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Details</h4>
                      {job.description && <DetailRow label="Description" value={job.description} />}
                      <DetailRow label="Job Type" value={job.job_type} />
                      {job.tax_year && <DetailRow label="Tax Year" value={job.tax_year} />}
                      {job.period && <DetailRow label="Period" value={job.period} />}
                      {job.date_due && <DetailRow label="Due Date" value={new Date(job.date_due).toLocaleDateString('en-ZA')} />}
                      {job.assigned_to_name && <DetailRow label="Assigned To" value={job.assigned_to_name} />}
                      {job.is_recurring && <DetailRow label="Recurring" value={job.recurrence_pattern || 'Yes'} />}
                      {job.quoted_amount && <DetailRow label="Quoted" value={`R ${parseFloat(job.quoted_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} />}
                      {job.notes && <DetailRow label="Notes" value={job.notes} />}
                      <DetailRow label="Created" value={job.date_created ? new Date(job.date_created).toLocaleDateString('en-ZA') : '-'} />
                      {job.date_started && <DetailRow label="Started" value={new Date(job.date_started).toLocaleDateString('en-ZA')} />}
                      {job.date_completed && <DetailRow label="Completed" value={new Date(job.date_completed).toLocaleDateString('en-ZA')} />}
                    </div>

                    {/* Column 2: Checklist */}
                    <div className="md:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Checklist {progress && `(${progress.done}/${progress.total})`}
                        </h4>
                        {progress && (
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all ${progress.pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${progress.pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{progress.pct}%</span>
                          </div>
                        )}
                      </div>

                      {items.length > 0 ? (
                        <div className="space-y-1">
                          {items.map(item => (
                            <div key={item.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${item.is_completed ? 'bg-green-50' : 'bg-white border border-gray-200'}`}>
                              <button onClick={() => toggleChecklistItem(item)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  item.is_completed
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-gray-300 hover:border-blue-400'
                                }`}>
                                {item.is_completed && (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {item.title}
                                {item.is_required && !item.is_completed && <span className="text-red-400 ml-1">*</span>}
                              </span>
                              {item.is_completed && item.completed_by_name && (
                                <span className="text-xs text-gray-400">{item.completed_by_name}</span>
                              )}
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
                        <p className="text-xs text-gray-400 italic">No checklist items. Add one below or use a template when creating jobs.</p>
                      )}

                      {/* Add checklist item */}
                      <div className="flex gap-2 mt-2">
                        <input type="text" value={newChecklistItem}
                          onChange={e => setNewChecklistItem(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addChecklistItem(job.id); }}
                          placeholder="Add a checklist item..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                        <button onClick={() => addChecklistItem(job.id)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Export Progress Report + Quick Status */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3">
                    <button
                      onClick={() => generateProgressReportPDF({
                        job,
                        customerName,
                        checklistItems: items,
                        statusConfig: STATUS_CONFIG,
                        categoryConfig: CATEGORY_CONFIG,
                      })}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Progress Report (PDF)
                    </button>
                    {!closedStatusKeys.has(job.status) && (
                      <select
                        value={job.status}
                        onChange={e => handleQuickStatus(job, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ADD/EDIT MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Edit Job' : 'Create New Job'}
                </h2>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-5">
                {/* Template Quick-Select */}
                {!editingId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-blue-800 mb-2">Quick Start from Template</label>
                    <select
                      value={formData.template_id}
                      onChange={e => handleTemplateSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select a template (optional) --</option>
                      {Object.entries(CATEGORY_CONFIG).map(([catKey, catCfg]) => {
                        const catTemplates = templates.filter(t => t.category === catKey);
                        if (catTemplates.length === 0) return null;
                        return (
                          <optgroup key={catKey} label={catCfg.label}>
                            {catTemplates.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} {t.estimated_days ? `(~${t.estimated_days}d)` : ''}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                    <p className="text-xs text-blue-600 mt-1">Templates auto-fill job details and pre-load a checklist</p>
                  </div>
                )}

                {/* Customer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <select value={formCustomerId} onChange={e => setFormCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                  </select>
                </div>

                {/* Title & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                    <input type="text" value={formData.title}
                      onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. CIPC Annual Return 2025" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select value={formData.category}
                      onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                      {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the work..." />
                </div>

                {/* Period, Tax Year, Due Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Year</label>
                    <input type="text" value={formData.tax_year}
                      onChange={e => setFormData(p => ({ ...p, tax_year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 2025 or 2024/2025" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                    <input type="text" value={formData.period}
                      onChange={e => setFormData(p => ({ ...p, period: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. March 2025, Q1 2025" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input type="date" value={formData.date_due}
                      onChange={e => setFormData(p => ({ ...p, date_due: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                {/* Priority, Status, Assigned */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select value={formData.priority}
                      onChange={e => setFormData(p => ({ ...p, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                      {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={formData.status}
                      onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <input type="text" value={formData.assigned_to_name}
                      onChange={e => setFormData(p => ({ ...p, assigned_to_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Consultant name" />
                  </div>
                </div>

                {/* Recurring */}
                <div className="flex items-start gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_recurring}
                      onChange={e => setFormData(p => ({ ...p, is_recurring: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Recurring job</span>
                  </label>
                  {formData.is_recurring && (
                    <select value={formData.recurrence_pattern}
                      onChange={e => setFormData(p => ({ ...p, recurrence_pattern: e.target.value }))}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="">Select frequency</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  )}
                </div>

                {/* Quoted Amount & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quoted Amount (R)</label>
                    <input type="number" value={formData.quoted_amount}
                      onChange={e => setFormData(p => ({ ...p, quoted_amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input type="text" value={formData.notes}
                      onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional notes" />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2">
                  {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  {editingId ? 'Update Job' : 'Create Job'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============== SUB-COMPONENTS ==============

function StatBadge({ label, value, color }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${color}`}>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <span className="text-xs text-gray-400">{label}</span>
      <p className="text-sm text-gray-800 whitespace-pre-line">{value}</p>
    </div>
  );
}
