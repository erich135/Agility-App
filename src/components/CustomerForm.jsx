import React, { useState, useEffect } from 'react';
import supabase from '../lib/SupabaseClient';
import ActivityLogger from '../lib/ActivityLogger';
import { useAuth } from '../App';

const CustomerForm = ({ customerId, onClose, onSave }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    // Basic company info (existing fields)
    client_name: '',
    registration_number: '',
    
    // New customer management fields bte Erich's ass 
    company_income_tax_number: '',
    company_vat_number: '',
    company_paye_number: '',
    company_public_officer_name: '',
    public_officer_id_number: '',
    company_address: '',
    company_telephone: '',
    company_email: '',
    contact_person_name: '',
    contact_person_telephone: '',
    contact_person_email: '',
    status: 'Active'
  });

  // Director data (up to 5 directors)
  const [directors, setDirectors] = useState([
    { director_order: 1, director_name: '', id_number: '', contact_telephone: '', contact_email: '' },
    { director_order: 2, director_name: '', id_number: '', contact_telephone: '', contact_email: '' },
    { director_order: 3, director_name: '', id_number: '', contact_telephone: '', contact_email: '' },
    { director_order: 4, director_name: '', id_number: '', contact_telephone: '', contact_email: '' },
    { director_order: 5, director_name: '', id_number: '', contact_telephone: '', contact_email: '' }
  ]);

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState({
    registration_certificate: null,
    tax_certificate: null,
    vat_certificate: null,
    paye_certificate: null,
    public_officer_id: null
  });
  
  // File input refs
  const fileInputRefs = {
    registration_certificate: React.useRef(null),
    tax_certificate: React.useRef(null),
    vat_certificate: React.useRef(null),
    paye_certificate: React.useRef(null),
    public_officer_id: React.useRef(null)
  };

  const isEditing = !!customerId;

  // Load existing customer data if editing
  useEffect(() => {
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      
      // Load customer data
      const { data: customerData, error: customerError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;

      if (customerData) {
        setFormData({
          client_name: customerData.client_name || '',
          registration_number: customerData.registration_number || '',
          company_income_tax_number: customerData.company_income_tax_number || '',
          company_vat_number: customerData.company_vat_number || '',
          company_paye_number: customerData.company_paye_number || '',
          company_public_officer_name: customerData.company_public_officer_name || '',
          public_officer_id_number: customerData.public_officer_id_number || '',
          company_address: customerData.company_address || '',
          company_telephone: customerData.company_telephone || '',
          company_email: customerData.company_email || '',
          contact_person_name: customerData.contact_person_name || '',
          contact_person_telephone: customerData.contact_person_telephone || '',
          contact_person_email: customerData.contact_person_email || '',
          status: customerData.status || 'Active'
        });
      }

      // Load directors data
      const { data: directorsData, error: directorsError } = await supabase
        .from('directors')
        .select('*')
        .eq('client_id', customerId)
        .order('director_order');

      if (directorsError && directorsError.code !== 'PGRST116') { // Ignore "no rows returned" error
        console.error('Error loading directors:', directorsError);
      }

      if (directorsData) {
        const updatedDirectors = [...directors];
        directorsData.forEach(director => {
          const index = director.director_order - 1;
          if (index >= 0 && index < 5) {
            updatedDirectors[index] = {
              director_order: director.director_order,
              director_name: director.director_name || '',
              id_number: director.id_number || '',
              contact_telephone: director.contact_telephone || '',
              contact_email: director.contact_email || ''
            };
          }
        });
        setDirectors(updatedDirectors);
      }

    } catch (err) {
      console.error('Error loading customer data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDirectorChange = (index, field, value) => {
    setDirectors(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  // File upload handlers
  const handleFileUpload = (documentType) => {
    fileInputRefs[documentType].current?.click();
  };

  const handleFileChange = async (documentType, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Check file type (images and PDFs only)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only images (JPEG, PNG, GIF) and PDF files are allowed');
      return;
    }

    try {
      setUploadedFiles(prev => ({
        ...prev,
        [documentType]: {
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          uploading: true
        }
      }));

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.client_name || 'customer'}_${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `${customerId || 'new'}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Save document metadata to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          client_id: customerId || 'new',
          document_type: documentType,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: 'current_user' // You might want to get this from auth context
        }]);

      if (dbError) {
        throw dbError;
      }

      setUploadedFiles(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          uploading: false,
          uploaded: true,
          uploadedAt: new Date().toISOString(),
          filePath: uploadData.path
        }
      }));

      console.log(`✅ ${documentType} uploaded successfully:`, file.name);
      
    } catch (error) {
      console.error('File upload error:', error);
      setUploadedFiles(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          uploading: false,
          error: 'Upload failed'
        }
      }));
    }

    // Clear the input
    event.target.value = '';
  };

  const removeFile = (documentType) => {
    setUploadedFiles(prev => ({
      ...prev,
      [documentType]: null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_name.trim()) {
      setError('Company name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare customer data - convert empty strings to null for optional fields
      const customerPayload = {
        client_name: formData.client_name.trim(),
        registration_number: formData.registration_number.trim() || null,
        company_income_tax_number: formData.company_income_tax_number.trim() || null,
        company_vat_number: formData.company_vat_number.trim() || null,
        company_paye_number: formData.company_paye_number.trim() || null,
        company_public_officer_name: formData.company_public_officer_name.trim() || null,
        public_officer_id_number: formData.public_officer_id_number.trim() || null,
        company_address: formData.company_address.trim() || null,
        company_telephone: formData.company_telephone.trim() || null,
        company_email: formData.company_email.trim() || null,
        contact_person_name: formData.contact_person_name.trim() || null,
        contact_person_telephone: formData.contact_person_telephone.trim() || null,
        contact_person_email: formData.contact_person_email.trim() || null,
        status: formData.status,
        updated_at: new Date().toISOString()
      };

      let customerId_final = customerId;

      if (isEditing) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('clients')
          .update(customerPayload)
          .eq('id', customerId);
        
        if (updateError) throw updateError;

        // Log customer update
        if (user) {
          await ActivityLogger.logCustomerUpdate(
            user.id,
            user.full_name || user.email,
            customerId,
            formData.client_name,
            {
              registration_number: formData.registration_number,
              updated_fields: Object.keys(customerPayload).filter(key => key !== 'updated_at'),
              update_timestamp: new Date().toISOString()
            }
          );
        }
      } else {
        // Create new customer
        customerPayload.created_at = new Date().toISOString();
        
        const { data: newCustomer, error: insertError } = await supabase
          .from('clients')
          .insert([customerPayload])
          .select()
          .single();
        
        if (insertError) throw insertError;
        customerId_final = newCustomer.id;

        // Log customer creation
        if (user) {
          await ActivityLogger.logCustomerCreate(
            user.id,
            user.full_name || user.email,
            customerId_final,
            formData.client_name,
            {
              registration_number: formData.registration_number,
              company_email: formData.company_email,
              company_telephone: formData.company_telephone,
              status: formData.status,
              created_timestamp: new Date().toISOString()
            }
          );
        }
      }

      // Handle directors data
      if (isEditing) {
        // Delete existing directors
        await supabase
          .from('directors')
          .delete()
          .eq('client_id', customerId);
      }

      // Insert directors with data
      const directorsToInsert = directors
        .filter(director => director.director_name.trim() || director.id_number.trim())
        .map(director => ({
          client_id: customerId_final,
          director_order: director.director_order,
          director_name: director.director_name.trim() || null,
          id_number: director.id_number.trim() || null,
          contact_telephone: director.contact_telephone.trim() || null,
          contact_email: director.contact_email.trim() || null
        }));

      if (directorsToInsert.length > 0) {
        const { error: directorsError } = await supabase
          .from('directors')
          .insert(directorsToInsert);
        
        if (directorsError) throw directorsError;
      }

      // Call success callback
      if (onSave) onSave();
      onClose();

    } catch (err) {
      console.error('Error saving customer:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span>Loading customer data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Customer' : 'Add New Customer'}
            </h2>
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

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="overflow-y-auto px-6 py-4 pb-8 space-y-6" style={{maxHeight: 'calc(90vh - 200px)'}}>
            
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.046 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Basic Company Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => handleInputChange('client_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter company name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Registration Number *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.registration_number}
                      onChange={(e) => handleInputChange('registration_number', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., 2023/123456/07"
                    />
                    <button
                      type="button"
                      onClick={() => handleFileUpload('registration_certificate')}
                      className={`px-3 py-2 text-sm border rounded-lg transition-colors flex items-center ${
                        uploadedFiles.registration_certificate?.uploaded 
                          ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                          : uploadedFiles.registration_certificate?.uploading
                          ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                          : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                      }`}
                      title="Upload Registration Certificate"
                    >
                      {uploadedFiles.registration_certificate?.uploading ? '⏳' : 
                       uploadedFiles.registration_certificate?.uploaded ? '✅' : '📄'}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRefs.registration_certificate}
                      onChange={(e) => handleFileChange('registration_certificate', e)}
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Income Tax Reference Number *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.company_income_tax_number}
                      onChange={(e) => handleInputChange('company_income_tax_number', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter tax reference number"
                    />
                    <button
                      type="button"
                      onClick={() => handleFileUpload('tax_certificate')}
                      className={`px-3 py-2 text-sm border rounded-lg transition-colors flex items-center ${
                        uploadedFiles.tax_certificate?.uploaded 
                          ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                          : uploadedFiles.tax_certificate?.uploading
                          ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                          : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                      }`}
                      title="Upload Tax Certificate"
                    >
                      {uploadedFiles.tax_certificate?.uploading ? '⏳' : 
                       uploadedFiles.tax_certificate?.uploaded ? '✅' : '🏛️'}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRefs.tax_certificate}
                      onChange={(e) => handleFileChange('tax_certificate', e)}
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT Number *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.company_vat_number}
                      onChange={(e) => handleInputChange('company_vat_number', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter VAT number"
                    />
                    <button
                      type="button"
                      onClick={() => handleFileUpload('vat_certificate')}
                      className={`px-3 py-2 text-sm border rounded-lg transition-colors flex items-center ${
                        uploadedFiles.vat_certificate?.uploaded 
                          ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                          : uploadedFiles.vat_certificate?.uploading
                          ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                          : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                      }`}
                      title="Upload VAT Certificate"
                    >
                      {uploadedFiles.vat_certificate?.uploading ? '⏳' : 
                       uploadedFiles.vat_certificate?.uploaded ? '✅' : '💰'}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRefs.vat_certificate}
                      onChange={(e) => handleFileChange('vat_certificate', e)}
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAYE Number *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.company_paye_number}
                      onChange={(e) => handleInputChange('company_paye_number', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter PAYE number"
                    />
                    <button
                      type="button"
                      onClick={() => handleFileUpload('paye_certificate')}
                      className={`px-3 py-2 text-sm border rounded-lg transition-colors flex items-center ${
                        uploadedFiles.paye_certificate?.uploaded 
                          ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                          : uploadedFiles.paye_certificate?.uploading
                          ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                          : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                      }`}
                      title="Upload PAYE Certificate"
                    >
                      {uploadedFiles.paye_certificate?.uploading ? '⏳' : 
                       uploadedFiles.paye_certificate?.uploaded ? '✅' : '💼'}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRefs.paye_certificate}
                      onChange={(e) => handleFileChange('paye_certificate', e)}
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Public Officer Information */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Public Officer with SARS</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Public Officer Name
                  </label>
                  <input
                    type="text"
                    value={formData.company_public_officer_name}
                    onChange={(e) => handleInputChange('company_public_officer_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter public officer name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Public Officer ID Number *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.public_officer_id_number}
                      onChange={(e) => handleInputChange('public_officer_id_number', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter ID number"
                    />
                    <button
                      type="button"
                      onClick={() => handleFileUpload('public_officer_id')}
                      className={`px-3 py-2 text-sm border rounded-lg transition-colors flex items-center ${
                        uploadedFiles.public_officer_id?.uploaded 
                          ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                          : uploadedFiles.public_officer_id?.uploading
                          ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                          : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                      }`}
                      title="Upload Public Officer ID"
                    >
                      {uploadedFiles.public_officer_id?.uploading ? '⏳' : 
                       uploadedFiles.public_officer_id?.uploaded ? '✅' : '🆔'}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRefs.public_officer_id}
                      onChange={(e) => handleFileChange('public_officer_id', e)}
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Company Contact Information */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Company Contact Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Address
                  </label>
                  <textarea
                    rows={3}
                    value={formData.company_address}
                    onChange={(e) => handleInputChange('company_address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter complete company address"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Telephone
                    </label>
                    <input
                      type="tel"
                      value={formData.company_telephone}
                      onChange={(e) => handleInputChange('company_telephone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter telephone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Email
                    </label>
                    <input
                      type="email"
                      value={formData.company_email}
                      onChange={(e) => handleInputChange('company_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Person Information */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Contact Person</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person_name}
                    onChange={(e) => handleInputChange('contact_person_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter contact person name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person Telephone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_person_telephone}
                    onChange={(e) => handleInputChange('contact_person_telephone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter telephone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_person_email}
                    onChange={(e) => handleInputChange('contact_person_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            </div>

            {/* Directors Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Directors Information (Up to 5)</h3>
              <div className="space-y-4">
                {directors.map((director, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Director {index + 1}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <input
                          type="text"
                          value={director.director_name}
                          onChange={(e) => handleDirectorChange(index, 'director_name', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Director name"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={director.id_number}
                          onChange={(e) => handleDirectorChange(index, 'id_number', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="ID number"
                        />
                      </div>
                      <div>
                        <input
                          type="tel"
                          value={director.contact_telephone}
                          onChange={(e) => handleDirectorChange(index, 'contact_telephone', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Telephone"
                        />
                      </div>
                      <div>
                        <input
                          type="email"
                          value={director.contact_email}
                          onChange={(e) => handleDirectorChange(index, 'contact_email', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Email"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Uploaded Files Summary */}
          {Object.values(uploadedFiles).some(file => file) && (
            <div className="px-6 py-4 mb-4 border-t border-gray-200 bg-blue-50">
              <h4 className="text-sm font-medium text-gray-900 mb-3">📎 Uploaded Documents</h4>
              <div className="space-y-3">
                {Object.entries(uploadedFiles).map(([type, file]) => {
                  if (!file) return null;
                  
                  const labels = {
                    registration_certificate: 'Registration Certificate',
                    tax_certificate: 'Tax Certificate',
                    vat_certificate: 'VAT Certificate',
                    paye_certificate: 'PAYE Certificate',
                    public_officer_id: 'Public Officer ID'
                  };
                  
                  return (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className={file.uploaded ? 'text-green-600' : 'text-yellow-600'}>
                          {file.uploading ? '⏳' : file.uploaded ? '✅' : '📄'}
                        </span>
                        <span className="text-gray-700">{labels[type]}</span>
                        <span className="text-gray-500">({file.name})</span>
                      </div>
                      {file.uploaded && (
                        <button
                          type="button"
                          onClick={() => removeFile(type)}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.client_name.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {saving ? 'Saving...' : (isEditing ? 'Update Customer' : 'Create Customer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerForm;