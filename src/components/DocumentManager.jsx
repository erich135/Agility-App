import React, { useState, useEffect } from 'react';
import supabase from '../lib/SupabaseClient';
import ActivityLogger from '../lib/ActivityLogger';
import SmartDocumentUpload from './SmartDocumentUpload';
import { useAuth } from '../App';

const DocumentManager = ({ customerId, customerName, onClose }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [error, setError] = useState(null);
  
  // Additional documents state
  const [showAdditionalForm, setShowAdditionalForm] = useState(false);
  const [additionalDoc, setAdditionalDoc] = useState({
    file: null,
    description: '',
    documentName: ''
  });

  // Document types with labels and icons
  const documentTypes = [
    { 
      key: 'registration_certificate', 
      label: 'Company Registration Certificate', 
      icon: '📜',
      required: true 
    },
    { 
      key: 'income_tax_certificate', 
      label: 'Income Tax Certificate', 
      icon: '🏛️',
      required: false 
    },
    { 
      key: 'vat_certificate', 
      label: 'VAT Registration Certificate', 
      icon: '💰',
      required: false 
    },
    { 
      key: 'paye_certificate', 
      label: 'PAYE Registration Certificate', 
      icon: '💼',
      required: false 
    },
    { 
      key: 'public_officer_id', 
      label: 'Public Officer ID Document', 
      icon: '🆔',
      required: false 
    },
    { 
      key: 'director_id_1', 
      label: 'Director 1 ID Document', 
      icon: '👤',
      required: false 
    },
    { 
      key: 'director_id_2', 
      label: 'Director 2 ID Document', 
      icon: '👤',
      required: false 
    },
    { 
      key: 'director_id_3', 
      label: 'Director 3 ID Document', 
      icon: '👤',
      required: false 
    },
    { 
      key: 'director_id_4', 
      label: 'Director 4 ID Document', 
      icon: '👤',
      required: false 
    },
    { 
      key: 'director_id_5', 
      label: 'Director 5 ID Document', 
      icon: '👤',
      required: false 
    },
    { 
      key: 'proof_of_address', 
      label: 'Proof of Address', 
      icon: '🏠',
      required: false 
    },
    { 
      key: 'mandate', 
      label: 'Mandate Document', 
      icon: '✍️',
      required: false 
    },
    { 
      key: 'other', 
      label: 'Other Documents', 
      icon: '📄',
      required: false 
    }
  ];

  useEffect(() => {
    fetchDocuments();
    
    // Log customer document access
    if (user && customerId && customerName) {
      ActivityLogger.logCustomerAccess(
        user.id,
        user.full_name || user.email,
        customerId,
        customerName,
        {
          action_type: 'document_management',
          accessed_timestamp: new Date().toISOString()
        }
      );
    }
  }, [customerId, user, customerName]);

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
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file, documentType) => {
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, PNG, and PDF files are allowed');
      return;
    }

    try {
      setUploading(prev => ({ ...prev, [documentType]: true }));
      setError(null);

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${customerId}/${documentType}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save document metadata to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          client_id: customerId,
          document_type: documentType,
          document_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: null // Will be set when user auth is implemented
        }]);

      if (dbError) throw dbError;

      // Log document upload
      if (user) {
        await ActivityLogger.logDocumentUpload(
          user.id,
          user.full_name || user.email,
          uploadData.path, // Use file path as document ID
          file.name,
          documentType,
          customerId,
          {
            customer_name: customerName,
            file_size: file.size,
            mime_type: file.type,
            original_filename: file.name
          }
        );
      }

      // Refresh documents list
      await fetchDocuments();

      // Show success message
      alert('Document uploaded successfully!');

    } catch (err) {
      console.error('Error uploading document:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  // Handle additional document upload with description
  const handleAdditionalDocUpload = async () => {
    if (!additionalDoc.file || !additionalDoc.description.trim() || !additionalDoc.documentName.trim()) {
      alert('Please select a file, enter a document name, and provide a description');
      return;
    }

    // Validate file size (max 10MB)
    if (additionalDoc.file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(additionalDoc.file.type)) {
      alert('Only JPEG, PNG, and PDF files are allowed');
      return;
    }

    try {
      setUploading(prev => ({ ...prev, 'additional': true }));
      setError(null);

      // Create unique filename for additional documents
      const fileExt = additionalDoc.file.name.split('.').pop();
      const fileName = `${customerId}/additional/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, additionalDoc.file);

      if (uploadError) throw uploadError;

      // Save document metadata to database with description
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          client_id: customerId,
          document_type: 'additional',
          document_name: additionalDoc.documentName,
          file_name: additionalDoc.file.name,
          file_path: uploadData.path,
          file_size: additionalDoc.file.size,
          mime_type: additionalDoc.file.type,
          uploaded_by: null, // Will be set when user auth is implemented
          description: additionalDoc.description
        }]);

      if (dbError) throw dbError;

      // Log additional document upload
      if (user) {
        await ActivityLogger.logDocumentUpload(
          user.id,
          user.full_name || user.email,
          uploadData.path, // Use file path as document ID
          additionalDoc.documentName,
          'additional',
          customerId,
          {
            customer_name: customerName,
            description: additionalDoc.description,
            file_size: additionalDoc.file.size,
            mime_type: additionalDoc.file.type,
            original_filename: additionalDoc.file.name
          }
        );
      }

      // Reset form and refresh documents
      setAdditionalDoc({ file: null, description: '', documentName: '' });
      setShowAdditionalForm(false);
      await fetchDocuments();

      alert('Additional document uploaded successfully!');

    } catch (err) {
      console.error('Error uploading additional document:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(prev => ({ ...prev, 'additional': false }));
    }
  };

  const handleDownload = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(doc.file_path);

      if (error) throw error;

      // Log document download
      if (user) {
        await ActivityLogger.logDocumentDownload(
          user.id,
          user.full_name || user.email,
          doc.id,
          doc.document_name || doc.file_name,
          customerId,
          {
            customer_name: customerName,
            document_type: doc.document_type,
            file_size: doc.file_size,
            mime_type: doc.mime_type
          }
        );
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.document_name || doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error downloading document:', err);
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleView = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(doc.file_path);

      if (error) throw error;

      // Log document view
      if (user) {
        await ActivityLogger.logDocumentView(
          user.id,
          user.full_name || user.email,
          doc.id,
          doc.document_name || doc.file_name,
          customerId,
          {
            customer_name: customerName,
            document_type: doc.document_type,
            file_size: doc.file_size,
            mime_type: doc.mime_type
          }
        );
      }

      // Create blob URL and open in new tab
      const url = URL.createObjectURL(data);
      const newWindow = window.open(url, '_blank');
      
      // Clean up the URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      if (!newWindow) {
        alert('Please allow popups to view documents');
      }

    } catch (err) {
      console.error('Error viewing document:', err);
      alert(`View failed: ${err.message}`);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.document_name || doc.file_name}"?`)) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      // Log document deletion
      if (user) {
        await ActivityLogger.logDocumentDelete(
          user.id,
          user.full_name || user.email,
          doc.id,
          doc.document_name || doc.file_name,
          customerId,
          {
            customer_name: customerName,
            document_type: doc.document_type,
            file_size: doc.file_size,
            mime_type: doc.mime_type
          }
        );
      }

      // Refresh documents list
      await fetchDocuments();

      alert('Document deleted successfully');

    } catch (err) {
      console.error('Error deleting document:', err);
      alert(`Delete failed: ${err.message}`);
    }
  };

  const getDocumentsByType = (type) => {
    return documents.filter(doc => doc.document_type === type);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Document Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {customerName} - Upload and manage client documents
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable area */}
        <div 
          className="flex-1 overflow-y-auto px-6 py-4"
          style={{ 
            minHeight: 0,
            maxHeight: 'calc(85vh - 200px)',
            height: 'calc(85vh - 200px)' /* Force fixed height for scrolling */
          }}
        >
          {/* Content wrapper with minimum height for scrolling */}
          <div style={{ minHeight: '800px' }}>
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.046 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Loading documents...</h3>
            </div>
          ) : (
            <div className="space-y-6">
              {documentTypes.map((docType) => {
                const typeDocuments = getDocumentsByType(docType.key);
                const isUploading = uploading[docType.key];

                return (
                  <div key={docType.key} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{docType.icon}</span>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {docType.label}
                            {docType.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {typeDocuments.length} document{typeDocuments.length !== 1 ? 's' : ''} uploaded
                          </p>
                        </div>
                      </div>
                      
                      {/* Upload Button */}
                      <div className="relative">
                        <input
                          type="file"
                          id={`upload-${docType.key}`}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              handleFileUpload(file, docType.key);
                            }
                            e.target.value = ''; // Reset input
                          }}
                          disabled={isUploading}
                        />
                        <label
                          htmlFor={`upload-${docType.key}`}
                          className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${
                            isUploading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isUploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              Upload File
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Documents List */}
                    {typeDocuments.length > 0 ? (
                      <div className="space-y-2">
                        {typeDocuments.map((doc) => (
                          <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    {doc.mime_type?.includes('pdf') ? (
                                      <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                      </svg>
                                    ) : (
                                      <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {doc.document_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {/* View Button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleView(doc); }}
                                  className="text-green-600 hover:text-green-800 transition-colors p-1"
                                  title="View Document"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>

                                {/* Download Button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                                  className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                  title="Download"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                                
                                {/* Delete Button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                                  className="text-red-600 hover:text-red-800 transition-colors p-1"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">No documents uploaded yet</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Smart Upload Section */}
        <div id="smart-upload-section" className="px-6 py-4 border-t-2 border-purple-200 bg-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI Smart Upload</h3>
                <p className="text-sm text-gray-600">Automatic OCR, classification, and duplicate detection</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg">
            <SmartDocumentUpload 
              clientId={customerId}
              onUploadComplete={() => {
                fetchDocuments(); // Refresh documents after upload
              }}
            />
          </div>
        </div>

        {/* Additional Documents Section */}
        <div id="additional-documents-section" className="px-6 py-4 border-t-2 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">+</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Additional Documents</h3>
                <p className="text-sm text-gray-600">Upload custom documents with descriptions</p>
              </div>
            </div>
            <button
              onClick={() => setShowAdditionalForm(!showAdditionalForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
            >
              {showAdditionalForm ? 'Cancel' : '+ Add Document'}
            </button>
          </div>

          {/* Additional Document Upload Form */}
          {showAdditionalForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name *
                  </label>
                  <input
                    type="text"
                    value={additionalDoc.documentName}
                    onChange={(e) => setAdditionalDoc(prev => ({...prev, documentName: e.target.value}))}
                    placeholder="e.g., Business License, Contract, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={additionalDoc.description}
                    onChange={(e) => setAdditionalDoc(prev => ({...prev, description: e.target.value}))}
                    placeholder="Describe this document and its purpose..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select File *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setAdditionalDoc(prev => ({...prev, file: e.target.files[0]}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {additionalDoc.file && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {additionalDoc.file.name} ({(additionalDoc.file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleAdditionalDocUpload}
                    disabled={uploading.additional || !additionalDoc.file || !additionalDoc.description.trim() || !additionalDoc.documentName.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {uploading.additional ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      'Upload Document'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAdditionalForm(false);
                      setAdditionalDoc({file: null, description: '', documentName: ''});
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Display Additional Documents */}
          <div className="space-y-3">
            {documents
              .filter(doc => doc.document_type === 'additional')
              .map((doc) => (
                <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {doc.mime_type?.includes('pdf') ? (
                            <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {doc.document_name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {doc.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {/* View Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleView(doc); }}
                        className="text-green-600 hover:text-green-800 transition-colors p-1"
                        title="View Document"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>

                      {/* Download Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                        title="Download"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                        className="text-red-600 hover:text-red-800 transition-colors p-1"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            
            {documents.filter(doc => doc.document_type === 'additional').length === 0 && !showAdditionalForm && (
              <div className="text-center py-6 text-gray-500">
                <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-sm">No additional documents uploaded yet</p>
                <button
                  onClick={() => setShowAdditionalForm(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1"
                >
                  Add your first document
                </button>
              </div>
            )}
          </div>
        </div>
        </div> {/* Close content wrapper */}

        {/* Footer - Fixed at bottom */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              <p><strong>Supported formats:</strong> PDF, JPG, PNG (max 10MB each)</p>
              <p><strong>Total documents:</strong> {documents.length}</p>
            </div>
            <div className="flex space-x-3 flex-shrink-0">
              <button
                onClick={() => {
                  const smartUploadSection = document.getElementById('smart-upload-section');
                  smartUploadSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                🤖 AI Upload
              </button>
              <button
                onClick={() => {
                  const additionalSection = document.getElementById('additional-documents-section');
                  additionalSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📎 Additional Documents
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;