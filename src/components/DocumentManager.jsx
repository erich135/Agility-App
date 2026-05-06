import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/SupabaseClient';
import ActivityLogger from '../lib/ActivityLogger';
import SmartDocumentUpload from './SmartDocumentUpload';
import { useAuth } from '../contexts/AuthContext';

const DocumentManager = ({ customerId: propCustomerId, customerName: propCustomerName, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const bulkInputRef = useRef(null);
  const folderInputRef = useRef(null);
  
  // Customer selection state (for standalone mode)
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(propCustomerId || '');
  const [selectedCustomerName, setSelectedCustomerName] = useState(propCustomerName || '');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  const isStandaloneMode = !propCustomerId;
  const customerId = propCustomerId || selectedCustomerId;
  const customerName = propCustomerName || selectedCustomerName;

  // Categories for tagging
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [documentTags, setDocumentTags] = useState({});

  // Filter & search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [viewMode, setViewMode] = useState('list');

  // Rename state
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Tag editing
  const [taggingDocId, setTaggingDocId] = useState(null);

  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';

  // ============== FETCH DATA ==============

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchDocumentTags = async (docIds) => {
    if (!docIds || docIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('document_category_tags')
        .select('document_id, category_id')
        .in('document_id', docIds);
      if (error) throw error;
      const tagMap = {};
      (data || []).forEach(t => {
        if (!tagMap[t.document_id]) tagMap[t.document_id] = [];
        tagMap[t.document_id].push(t.category_id);
      });
      setDocumentTags(tagMap);
    } catch (err) {
      console.error('Error fetching document tags:', err);
    }
  };

  useEffect(() => {
    if (isStandaloneMode) fetchCustomers();
    fetchCategories();
  }, [isStandaloneMode]);

  useEffect(() => {
    if (customerId) {
      fetchDocuments();
      if (user && customerName) {
        ActivityLogger.logCustomerAccess(
          user.id, user.full_name || user.email, customerId, customerName,
          { action_type: 'document_management', accessed_timestamp: new Date().toISOString() }
        );
      }
    } else {
      setDocuments([]);
      setDocumentTags({});
      setLoading(false);
    }
  }, [customerId]);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_name')
        .order('client_name', { ascending: true });
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCustomerSelect = (e) => {
    const id = e.target.value;
    setSelectedCustomerId(id);
    const customer = customers.find(c => c.id === id);
    setSelectedCustomerName(customer?.client_name || '');
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', customerId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
      if (data && data.length > 0) {
        await fetchDocumentTags(data.map(d => d.id));
      } else {
        setDocumentTags({});
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============== UPLOAD ==============

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const uploadSingleFile = async (file) => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`${file.name} exceeds 10MB limit`);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${customerId}/documents/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data: dbData, error: dbError } = await supabase
      .from('documents')
      .insert([{
        client_id: customerId,
        document_type: 'uncategorised',
        document_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user?.id || null
      }])
      .select()
      .single();
    if (dbError) throw dbError;

    if (user) {
      await ActivityLogger.logDocumentUpload(
        user.id, user.full_name || user.email, uploadData.path, file.name,
        'bulk_upload', customerId,
        { customer_name: customerName, file_size: file.size, mime_type: file.type }
      );
    }

    return dbData;
  };

  const handleBulkUpload = async (files) => {
    if (!files || files.length === 0 || !customerId) return;

    const fileArray = Array.from(files);
    setUploading(true);
    setError(null);
    setUploadProgress({ current: 0, total: fileArray.length, fileName: '' });

    let successCount = 0;
    const errors = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress({ current: i + 1, total: fileArray.length, fileName: file.name });
      try {
        await uploadSingleFile(file);
        successCount++;
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    setUploading(false);
    setUploadProgress({ current: 0, total: 0, fileName: '' });
    await fetchDocuments();

    if (errors.length > 0) {
      setError(`${successCount} uploaded, ${errors.length} failed:\n${errors.join('\n')}`);
    } else {
      showSuccess(`${successCount} document${successCount !== 1 ? 's' : ''} uploaded successfully!`);
    }
  };

  // Drag & drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!customerId) return;

    // Handle dropped items - check for folder contents via DataTransferItem
    const items = e.dataTransfer.items;
    if (items) {
      const filePromises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry?.();
        if (item) {
          filePromises.push(getAllFilesFromEntry(item));
        }
      }
      if (filePromises.length > 0) {
        Promise.all(filePromises).then(results => {
          const allFiles = results.flat();
          if (allFiles.length > 0) handleBulkUpload(allFiles);
        });
        return;
      }
    }

    // Fallback to regular file list
    const files = e.dataTransfer.files;
    if (files.length > 0) handleBulkUpload(files);
  }, [customerId]);

  // Recursively read files from dropped folder entries
  const getAllFilesFromEntry = (entry) => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file(file => resolve([file]), () => resolve([]));
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const allEntries = [];
        const readBatch = () => {
          reader.readEntries(entries => {
            if (entries.length === 0) {
              Promise.all(allEntries.map(e => getAllFilesFromEntry(e)))
                .then(results => resolve(results.flat()));
            } else {
              allEntries.push(...entries);
              readBatch();
            }
          }, () => resolve([]));
        };
        readBatch();
      } else {
        resolve([]);
      }
    });
  };

  // ============== DOCUMENT ACTIONS ==============

  const handleDownload = async (doc) => {
    try {
      const { data, error } = await supabase.storage.from('client-documents').download(doc.file_path);
      if (error) throw error;

      if (user) {
        await ActivityLogger.logDocumentDownload(
          user.id, user.full_name || user.email, doc.id, doc.document_name || doc.file_name,
          customerId, { customer_name: customerName, document_type: doc.document_type }
        );
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.document_name || doc.file_name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading:', err);
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleView = async (doc) => {
    try {
      const { data, error } = await supabase.storage.from('client-documents').download(doc.file_path);
      if (error) throw error;

      if (user) {
        await ActivityLogger.logDocumentView(
          user.id, user.full_name || user.email, doc.id, doc.document_name || doc.file_name,
          customerId, { customer_name: customerName, document_type: doc.document_type }
        );
      }

      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Error viewing:', err);
      alert(`View failed: ${err.message}`);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.document_name || doc.file_name}"? This cannot be undone.`)) return;
    try {
      await supabase.storage.from('client-documents').remove([doc.file_path]);
      await supabase.from('documents').delete().eq('id', doc.id);

      if (user) {
        await ActivityLogger.logDocumentDelete(
          user.id, user.full_name || user.email, doc.id, doc.document_name || doc.file_name,
          customerId, { customer_name: customerName }
        );
      }

      await fetchDocuments();
      showSuccess('Document deleted');
    } catch (err) {
      console.error('Error deleting:', err);
      alert(`Delete failed: ${err.message}`);
    }
  };

  // ============== RENAME ==============

  const startRename = (doc) => {
    setRenamingId(doc.id);
    setRenameValue(doc.document_name || doc.file_name || '');
  };

  const handleRename = async (docId) => {
    if (!renameValue.trim()) return;
    try {
      const { error } = await supabase
        .from('documents')
        .update({ document_name: renameValue.trim() })
        .eq('id', docId);
      if (error) throw error;
      setRenamingId(null);
      await fetchDocuments();
      showSuccess('Document renamed');
    } catch (err) {
      console.error('Error renaming:', err);
      alert(`Rename failed: ${err.message}`);
    }
  };

  // ============== TAGGING ==============

  const getCategoryTree = () => {
    const parents = categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    return parents.map(p => ({
      ...p,
      children: categories.filter(c => c.parent_id === p.id).sort((a, b) => a.sort_order - b.sort_order)
    }));
  };

  const toggleTag = async (docId, catId) => {
    const currentTags = documentTags[docId] || [];
    const hasTag = currentTags.includes(catId);

    try {
      if (hasTag) {
        const { error } = await supabase
          .from('document_category_tags')
          .delete()
          .eq('document_id', docId)
          .eq('category_id', catId);
        if (error) throw error;
        setDocumentTags(prev => ({
          ...prev,
          [docId]: currentTags.filter(id => id !== catId)
        }));
      } else {
        const { error } = await supabase
          .from('document_category_tags')
          .insert([{ document_id: docId, category_id: catId, tagged_by: user?.id }]);
        if (error) throw error;
        setDocumentTags(prev => ({
          ...prev,
          [docId]: [...currentTags, catId]
        }));
      }
    } catch (err) {
      console.error('Error toggling tag:', err);
    }
  };

  // ============== FILTERING ==============

  const getFilteredDocuments = () => {
    let filtered = documents;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        (d.document_name || '').toLowerCase().includes(term) ||
        (d.file_name || '').toLowerCase().includes(term) ||
        (d.description || '').toLowerCase().includes(term) ||
        (d.document_type || '').toLowerCase().includes(term)
      );
    }

    if (filterCategoryId) {
      const docsWithTag = Object.entries(documentTags)
        .filter(([, tags]) => tags.includes(filterCategoryId))
        .map(([docId]) => docId);
      filtered = filtered.filter(d => docsWithTag.includes(d.id));
    }

    return filtered;
  };

  // ============== HELPERS ==============

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getDocIcon = (doc) => {
    if (doc.mime_type?.includes('pdf')) return '\u{1F4D5}';
    if (doc.mime_type?.includes('image')) return '\u{1F5BC}';
    if (doc.mime_type?.includes('word') || doc.mime_type?.includes('document')) return '\u{1F4D8}';
    if (doc.mime_type?.includes('sheet') || doc.mime_type?.includes('excel')) return '\u{1F4D7}';
    return '\u{1F4C4}';
  };

  const getTagNames = (docId) => {
    const tags = documentTags[docId] || [];
    return tags.map(tagId => categories.find(c => c.id === tagId)).filter(Boolean);
  };

  const filteredDocs = getFilteredDocuments();
  const categoryTree = getCategoryTree();

  // ============== RENDER ==============

  return (
    <div className={`${onClose ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4' : 'min-h-screen bg-gray-100 p-6'}`}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${onClose ? 'max-w-6xl h-[85vh]' : 'max-w-7xl'} flex flex-col`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Document Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                {customerId ? `${customerName || 'Customer'} - Upload, categorise and manage documents` : 'Select a customer to manage documents'}
              </p>
            </div>
            {onClose && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Customer Selector */}
          {isStandaloneMode && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer</label>
              <select
                value={selectedCustomerId}
                onChange={handleCustomerSelect}
                className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                disabled={loadingCustomers}
              >
                <option value="">-- Select a customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.client_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Success/Error banners */}
        {successMsg && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-800">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="ml-auto text-green-400 hover:text-green-600 text-lg leading-none">&times;</button>
          </div>
        )}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm text-red-700 whitespace-pre-line">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ minHeight: 0 }}>
          {/* No customer selected */}
          {isStandaloneMode && !customerId && (
            <div className="text-center py-16">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Customer Selected</h3>
              <p className="text-gray-600">Please select a customer above to view and manage their documents.</p>
            </div>
          )}

          {customerId && (
            <>
              {/* Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all mb-6 ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50 scale-[1.01]' 
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {/* Hidden file inputs */}
                <input
                  ref={bulkInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept={ALLOWED_EXTENSIONS}
                  onChange={(e) => {
                    handleBulkUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  className="hidden"
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={(e) => {
                    handleBulkUpload(e.target.files);
                    e.target.value = '';
                  }}
                />

                {uploading ? (
                  <div>
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-sm font-medium text-gray-700">
                      Uploading {uploadProgress.current} of {uploadProgress.total}...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{uploadProgress.fileName}</p>
                    <div className="w-64 mx-auto mt-3 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all" 
                        style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Drag & drop files or folders here
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); bulkInputRef.current?.click(); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Browse Files
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Upload Folder
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      PDF, JPG, PNG, DOC, XLS (max 10MB each)
                    </p>
                  </div>
                )}
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <select
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">All Categories</option>
                  {categoryTree.map(parent => (
                    <React.Fragment key={parent.id}>
                      <option value={parent.id}>{parent.icon} {parent.name}</option>
                      {parent.children.map(child => (
                        <option key={child.id} value={child.id}>&nbsp;&nbsp;&rarr; {child.icon} {child.name}</option>
                      ))}
                    </React.Fragment>
                  ))}
                </select>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    Grid
                  </button>
                </div>
                <span className="text-xs text-gray-500">
                  {filteredDocs.length} of {documents.length} document{documents.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Documents */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading documents...</p>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-16 w-16 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {documents.length === 0 
                      ? 'Drag and drop files or a folder above to get started' 
                      : 'Try changing your search or filter'}
                  </p>
                </div>
              ) : viewMode === 'list' ? (
                /* LIST VIEW */
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                        <th className="px-4 py-3 text-left">Document</th>
                        <th className="px-4 py-3 text-left">Categories</th>
                        <th className="px-4 py-3 text-left">Size</th>
                        <th className="px-4 py-3 text-left">Uploaded</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredDocs.map(doc => {
                        const tags = getTagNames(doc.id);
                        const isRenaming = renamingId === doc.id;
                        const isTagging = taggingDocId === doc.id;

                        return (
                          <React.Fragment key={doc.id}>
                            <tr className="hover:bg-gray-50 transition-colors">
                              {/* Document name */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-xl flex-shrink-0">{getDocIcon(doc)}</span>
                                  <div className="min-w-0 flex-1">
                                    {isRenaming ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={renameValue}
                                          onChange={(e) => setRenameValue(e.target.value)}
                                          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(doc.id); if (e.key === 'Escape') setRenamingId(null); }}
                                          className="flex-1 px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                          autoFocus
                                        />
                                        <button onClick={() => handleRename(doc.id)} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                                        <button onClick={() => setRenamingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                                      </div>
                                    ) : (
                                      <>
                                        <p 
                                          className="text-sm font-medium text-blue-600 truncate cursor-pointer hover:underline"
                                          onClick={() => handleView(doc)}
                                        >
                                          {doc.document_name || doc.file_name}
                                        </p>
                                        {doc.description && <p className="text-xs text-gray-500 truncate">{doc.description}</p>}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Tags */}
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {tags.length > 0 ? tags.map(tag => (
                                    <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                                      {tag.icon} {tag.name}
                                    </span>
                                  )) : (
                                    <span className="text-xs text-gray-400 italic">No categories</span>
                                  )}
                                </div>
                              </td>

                              {/* Size */}
                              <td className="px-4 py-3 text-xs text-gray-500">{formatFileSize(doc.file_size)}</td>

                              {/* Date */}
                              <td className="px-4 py-3 text-xs text-gray-500">
                                {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-ZA') : '-'}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => setTaggingDocId(isTagging ? null : doc.id)} title="Categorise"
                                    className={`p-1.5 rounded transition-colors text-sm ${isTagging ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                  </button>
                                  <button onClick={() => startRename(doc)} title="Rename"
                                    className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  <button onClick={() => handleView(doc)} title="View"
                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                  </button>
                                  <button onClick={() => handleDownload(doc)} title="Download"
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  </button>
                                  <button onClick={() => handleDelete(doc)} title="Delete"
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Tag selection row */}
                            {isTagging && (
                              <tr>
                                <td colSpan={5} className="px-4 py-3 bg-blue-50 border-l-4 border-blue-400">
                                  <div className="flex items-start gap-3">
                                    <span className="text-xs font-medium text-blue-800 mt-1 flex-shrink-0">Assign categories:</span>
                                    <div className="flex flex-wrap gap-2">
                                      {categoryTree.map(parent => (
                                        <div key={parent.id} className="space-y-1">
                                          <button
                                            onClick={() => toggleTag(doc.id, parent.id)}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                              (documentTags[doc.id] || []).includes(parent.id)
                                                ? 'bg-blue-600 text-white' 
                                                : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                                            }`}
                                          >
                                            {parent.icon} {parent.name}
                                          </button>
                                          {parent.children.length > 0 && (
                                            <div className="flex flex-wrap gap-1 ml-2">
                                              {parent.children.map(child => (
                                                <button
                                                  key={child.id}
                                                  onClick={() => toggleTag(doc.id, child.id)}
                                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${
                                                    (documentTags[doc.id] || []).includes(child.id)
                                                      ? 'bg-blue-500 text-white' 
                                                      : 'bg-gray-100 text-gray-600 hover:bg-blue-100'
                                                  }`}
                                                >
                                                  {child.icon} {child.name}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => setTaggingDocId(null)}
                                      className="ml-auto text-xs text-blue-600 hover:text-blue-800 flex-shrink-0"
                                    >
                                      Done
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* GRID VIEW */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredDocs.map(doc => {
                    const tags = getTagNames(doc.id);
                    return (
                      <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow group">
                        <div className="text-center mb-3">
                          <span className="text-4xl">{getDocIcon(doc)}</span>
                        </div>
                        <p 
                          className="text-sm font-medium text-blue-600 truncate text-center mb-1 cursor-pointer hover:underline"
                          onClick={() => handleView(doc)}
                        >
                          {doc.document_name || doc.file_name}
                        </p>
                        <p className="text-xs text-gray-500 text-center mb-2">{formatFileSize(doc.file_size)}</p>
                        
                        {tags.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 mb-2">
                            {tags.slice(0, 3).map(tag => (
                              <span key={tag.id} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                                {tag.icon}
                              </span>
                            ))}
                            {tags.length > 3 && (
                              <span className="text-xs text-gray-400">+{tags.length - 3}</span>
                            )}
                          </div>
                        )}

                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setTaggingDocId(taggingDocId === doc.id ? null : doc.id)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Categorise">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                          </button>
                          <button onClick={() => startRename(doc)} className="p-1 text-yellow-500 hover:bg-yellow-50 rounded" title="Rename">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleView(doc)} className="p-1 text-green-500 hover:bg-green-50 rounded" title="View">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => handleDownload(doc)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Download">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(doc)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>

                        {/* Inline tag selector for grid */}
                        {taggingDocId === doc.id && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="flex flex-wrap gap-1">
                              {categories.map(cat => (
                                <button
                                  key={cat.id}
                                  onClick={() => toggleTag(doc.id, cat.id)}
                                  className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                                    (documentTags[doc.id] || []).includes(cat.id)
                                      ? 'bg-blue-600 text-white' 
                                      : 'bg-white text-gray-600 border border-gray-200'
                                  }`}
                                >
                                  {cat.icon} {cat.name}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setTaggingDocId(null)} className="text-xs text-blue-600 mt-1 block">Done</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              PDF, JPG, PNG, DOC, XLS (max 10MB) &middot; Drag & drop files or folders to bulk upload
            </div>
            <div className="flex items-center gap-2">
              {onClose ? (
                <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                  Close
                </button>
              ) : (
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Back
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;
