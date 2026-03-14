import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/SupabaseClient';

const ROLE_OPTIONS = [
  { value: 'director', label: 'Director', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'member', label: 'Member', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'trustee', label: 'Trustee', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'shareholder', label: 'Shareholder', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'public_officer', label: 'Public Officer', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'authorised_representative', label: 'Authorised Rep', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'beneficial_owner', label: 'Beneficial Owner', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'secretary', label: 'Secretary', color: 'bg-teal-100 text-teal-800 border-teal-200' },
];

const EMPTY_FORM = {
  full_name: '',
  id_number: '',
  passport_number: '',
  date_of_birth: '',
  nationality: 'South African',
  email: '',
  phone: '',
  residential_address: '',
  postal_address: '',
  roles: [],
  appointment_date: '',
  resignation_date: '',
  is_active: true,
  share_percentage: '',
  number_of_shares: '',
  notes: '',
};

export default function PersonRegister() {
  const { user } = useAuth();
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Customer selection
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // Signatures
  const [signatures, setSignatures] = useState({});
  const [uploadingSig, setUploadingSig] = useState(null);
  const sigInputRef = useRef(null);
  const [sigPersonId, setSigPersonId] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('active');

  // Expanded person details
  const [expandedId, setExpandedId] = useState(null);

  // Success/Error
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchPersons();
    } else {
      setPersons([]);
      setSignatures({});
      setLoading(false);
    }
  }, [selectedCustomerId]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // ============== DATA FETCHING ==============

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_name')
        .order('client_name');
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchPersons = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('client_persons')
        .select('*')
        .eq('client_id', selectedCustomerId)
        .order('full_name');
      if (fetchError) throw fetchError;
      setPersons(data || []);

      // Fetch signatures for all persons
      if (data && data.length > 0) {
        const personIds = data.map(p => p.id);
        const { data: sigData } = await supabase
          .from('person_signatures')
          .select('*')
          .in('person_id', personIds)
          .eq('is_active', true)
          .order('uploaded_at', { ascending: false });
        
        const sigMap = {};
        (sigData || []).forEach(s => {
          if (!sigMap[s.person_id]) sigMap[s.person_id] = [];
          sigMap[s.person_id].push(s);
        });
        setSignatures(sigMap);
      } else {
        setSignatures({});
      }
    } catch (err) {
      console.error('Error fetching persons:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============== CUSTOMER SELECT ==============

  const handleCustomerSelect = (e) => {
    const id = e.target.value;
    setSelectedCustomerId(id);
    const customer = customers.find(c => c.id === id);
    setSelectedCustomerName(customer?.client_name || '');
    setShowForm(false);
    setEditingId(null);
    setExpandedId(null);
  };

  // ============== FORM HANDLING ==============

  const openAddForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (person) => {
    setFormData({
      full_name: person.full_name || '',
      id_number: person.id_number || '',
      passport_number: person.passport_number || '',
      date_of_birth: person.date_of_birth || '',
      nationality: person.nationality || 'South African',
      email: person.email || '',
      phone: person.phone || '',
      residential_address: person.residential_address || '',
      postal_address: person.postal_address || '',
      roles: person.roles || [],
      appointment_date: person.appointment_date || '',
      resignation_date: person.resignation_date || '',
      is_active: person.is_active !== false,
      share_percentage: person.share_percentage || '',
      number_of_shares: person.number_of_shares || '',
      notes: person.notes || '',
    });
    setEditingId(person.id);
    setShowForm(true);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleRole = (role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return;
    }
    if (formData.roles.length === 0) {
      setError('Please select at least one role');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        client_id: selectedCustomerId,
        full_name: formData.full_name.trim(),
        id_number: formData.id_number.trim() || null,
        passport_number: formData.passport_number.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        nationality: formData.nationality.trim() || 'South African',
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        residential_address: formData.residential_address.trim() || null,
        postal_address: formData.postal_address.trim() || null,
        roles: formData.roles,
        appointment_date: formData.appointment_date || null,
        resignation_date: formData.resignation_date || null,
        is_active: formData.is_active,
        share_percentage: formData.share_percentage ? parseFloat(formData.share_percentage) : null,
        number_of_shares: formData.number_of_shares ? parseInt(formData.number_of_shares) : null,
        notes: formData.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: updateErr } = await supabase
          .from('client_persons')
          .update(payload)
          .eq('id', editingId);
        if (updateErr) throw updateErr;
        showSuccess('Person updated successfully');
      } else {
        const { error: insertErr } = await supabase
          .from('client_persons')
          .insert([payload]);
        if (insertErr) throw insertErr;
        showSuccess('Person added successfully');
      }

      setShowForm(false);
      setEditingId(null);
      await fetchPersons();
    } catch (err) {
      console.error('Error saving person:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (person) => {
    if (!window.confirm(`Delete "${person.full_name}"? This will also remove their signatures. This cannot be undone.`)) return;
    try {
      // Delete signatures from storage first
      const personSigs = signatures[person.id] || [];
      if (personSigs.length > 0) {
        const paths = personSigs.map(s => s.file_path);
        await supabase.storage.from('client-documents').remove(paths);
      }

      const { error: delErr } = await supabase
        .from('client_persons')
        .delete()
        .eq('id', person.id);
      if (delErr) throw delErr;

      showSuccess('Person deleted');
      await fetchPersons();
    } catch (err) {
      console.error('Error deleting person:', err);
      setError(err.message);
    }
  };

  const handleToggleActive = async (person) => {
    try {
      const { error: updateErr } = await supabase
        .from('client_persons')
        .update({ 
          is_active: !person.is_active, 
          resignation_date: !person.is_active ? null : new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', person.id);
      if (updateErr) throw updateErr;
      showSuccess(person.is_active ? 'Person marked as resigned' : 'Person reactivated');
      await fetchPersons();
    } catch (err) {
      setError(err.message);
    }
  };

  // ============== SIGNATURE HANDLING ==============

  const handleSignatureUpload = async (file, personId) => {
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Signatures must be PNG, JPG or WebP images');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Signature image must be under 2MB');
      return;
    }

    try {
      setUploadingSig(personId);
      const ext = file.name.split('.').pop();
      const filePath = `${selectedCustomerId}/signatures/${personId}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);
      if (upErr) throw upErr;

      // Check if this is the first signature (make it default)
      const existingSigs = signatures[personId] || [];
      const isFirst = existingSigs.length === 0;

      const { error: dbErr } = await supabase
        .from('person_signatures')
        .insert([{
          person_id: personId,
          file_path: filePath,
          signature_type: 'full',
          original_filename: file.name,
          file_size: file.size,
          is_default: isFirst,
          uploaded_by: user?.id || null,
        }]);
      if (dbErr) throw dbErr;

      showSuccess('Signature uploaded');
      await fetchPersons();
    } catch (err) {
      console.error('Error uploading signature:', err);
      setError(err.message);
    } finally {
      setUploadingSig(null);
      setSigPersonId(null);
    }
  };

  const handleDeleteSignature = async (sig) => {
    if (!window.confirm('Delete this signature?')) return;
    try {
      await supabase.storage.from('client-documents').remove([sig.file_path]);
      await supabase.from('person_signatures').delete().eq('id', sig.id);
      showSuccess('Signature deleted');
      await fetchPersons();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetDefaultSignature = async (sig) => {
    try {
      // Unset all defaults for this person
      await supabase
        .from('person_signatures')
        .update({ is_default: false })
        .eq('person_id', sig.person_id);
      // Set new default
      await supabase
        .from('person_signatures')
        .update({ is_default: true })
        .eq('id', sig.id);
      showSuccess('Default signature updated');
      await fetchPersons();
    } catch (err) {
      setError(err.message);
    }
  };

  const getSignatureUrl = async (filePath) => {
    const { data } = await supabase.storage.from('client-documents').download(filePath);
    if (data) return URL.createObjectURL(data);
    return null;
  };

  // ============== FILTERING ==============

  const getFilteredPersons = () => {
    let filtered = persons;

    if (filterActive === 'active') filtered = filtered.filter(p => p.is_active);
    else if (filterActive === 'resigned') filtered = filtered.filter(p => !p.is_active);

    if (filterRole) {
      filtered = filtered.filter(p => (p.roles || []).includes(filterRole));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.full_name.toLowerCase().includes(term) ||
        (p.id_number || '').toLowerCase().includes(term) ||
        (p.email || '').toLowerCase().includes(term) ||
        (p.phone || '').toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const getRoleLabel = (role) => ROLE_OPTIONS.find(r => r.value === role);
  const filteredPersons = getFilteredPersons();

  // Count by role
  const roleCounts = {};
  persons.filter(p => p.is_active).forEach(p => {
    (p.roles || []).forEach(r => { roleCounts[r] = (roleCounts[r] || 0) + 1; });
  });

  // ============== RENDER ==============

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Person Register</h1>
              <p className="text-sm text-gray-600 mt-1">
                Directors, members, trustees, shareholders & beneficial owners
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedCustomerId}
                onChange={handleCustomerSelect}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[250px]"
              >
                <option value="">-- Select Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.client_name}</option>
                ))}
              </select>
              {selectedCustomerId && (
                <button
                  onClick={openAddForm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Person
                </button>
              )}
            </div>
          </div>

          {/* Role summary chips */}
          {selectedCustomerId && persons.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500 self-center mr-1">Roles:</span>
              {ROLE_OPTIONS.map(role => {
                const count = roleCounts[role.value] || 0;
                if (count === 0) return null;
                return (
                  <span key={role.value} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${role.color}`}>
                    {role.label}: {count}
                  </span>
                );
              })}
              <span className="text-xs text-gray-400 self-center ml-2">
                {persons.filter(p => p.is_active).length} active, {persons.filter(p => !p.is_active).length} resigned
              </span>
            </div>
          )}
        </div>

        {/* Success/Error banners */}
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

        {/* No customer selected */}
        {!selectedCustomerId && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-16 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Customer</h3>
            <p className="text-gray-500">Choose a customer above to view and manage their people register.</p>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Edit Person' : 'Add New Person'}
                </h2>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-5">
                {/* Roles */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roles *</label>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map(role => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => toggleRole(role.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          formData.roles.includes(role.value)
                            ? role.color + ' ring-2 ring-offset-1 ring-blue-400'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Personal Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input type="text" value={formData.full_name}
                      onChange={e => handleFormChange('full_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. John Smith" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SA ID Number</label>
                    <input type="text" value={formData.id_number}
                      onChange={e => handleFormChange('id_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="13 digit ID number" maxLength={13} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
                    <input type="text" value={formData.passport_number}
                      onChange={e => handleFormChange('passport_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="For foreign nationals" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" value={formData.date_of_birth}
                      onChange={e => handleFormChange('date_of_birth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                    <input type="text" value={formData.nationality}
                      onChange={e => handleFormChange('nationality', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={formData.is_active ? 'active' : 'resigned'}
                      onChange={e => handleFormChange('is_active', e.target.value === 'active')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="active">Active</option>
                      <option value="resigned">Resigned / Removed</option>
                    </select>
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={formData.email}
                      onChange={e => handleFormChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={formData.phone}
                      onChange={e => handleFormChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Residential Address</label>
                    <textarea value={formData.residential_address}
                      onChange={e => handleFormChange('residential_address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Address</label>
                    <textarea value={formData.postal_address}
                      onChange={e => handleFormChange('postal_address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>

                {/* Appointment Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
                    <input type="date" value={formData.appointment_date}
                      onChange={e => handleFormChange('appointment_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resignation Date</label>
                    <input type="date" value={formData.resignation_date}
                      onChange={e => handleFormChange('resignation_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>

                {/* Shareholding (shown when shareholder role selected) */}
                {formData.roles.includes('shareholder') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div>
                      <label className="block text-sm font-medium text-yellow-800 mb-1">Share Percentage (%)</label>
                      <input type="number" value={formData.share_percentage}
                        onChange={e => handleFormChange('share_percentage', e.target.value)}
                        min="0" max="100" step="0.01"
                        className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-yellow-800 mb-1">Number of Shares</label>
                      <input type="number" value={formData.number_of_shares}
                        onChange={e => handleFormChange('number_of_shares', e.target.value)}
                        min="0"
                        className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500" />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={formData.notes}
                    onChange={e => handleFormChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any additional notes..." />
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
                  {editingId ? 'Update Person' : 'Add Person'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar & Person List */}
        {selectedCustomerId && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by name, ID, email or phone..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">All Roles</option>
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="active">Active Only</option>
                  <option value="resigned">Resigned Only</option>
                  <option value="all">All</option>
                </select>
                <span className="text-xs text-gray-500">
                  {filteredPersons.length} of {persons.length} person{persons.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Person Cards */}
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading persons...</p>
              </div>
            ) : filteredPersons.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-16 text-center">
                <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {persons.length === 0 ? 'No people registered yet' : 'No matching results'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {persons.length === 0 ? 'Add directors, members, trustees and other key people for this customer.' : 'Try adjusting your filters.'}
                </p>
                {persons.length === 0 && (
                  <button onClick={openAddForm}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                    Add First Person
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPersons.map(person => {
                  const isExpanded = expandedId === person.id;
                  const personSigs = signatures[person.id] || [];
                  const defaultSig = personSigs.find(s => s.is_default);

                  return (
                    <div key={person.id} className={`bg-white rounded-lg shadow-sm border transition-all ${person.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50 opacity-75'}`}>
                      {/* Summary Row */}
                      <div className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : person.id)}>
                        {/* Avatar / Initials */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${person.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                          {person.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>

                        {/* Name & details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">{person.full_name}</h3>
                            {!person.is_active && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Resigned</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {person.id_number && <span className="text-xs text-gray-500">ID: {person.id_number}</span>}
                            {person.email && <span className="text-xs text-gray-500">{person.email}</span>}
                            {person.phone && <span className="text-xs text-gray-500">{person.phone}</span>}
                          </div>
                        </div>

                        {/* Role badges */}
                        <div className="flex flex-wrap gap-1 flex-shrink-0">
                          {(person.roles || []).map(role => {
                            const roleInfo = getRoleLabel(role);
                            return roleInfo ? (
                              <span key={role} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${roleInfo.color}`}>
                                {roleInfo.label}
                              </span>
                            ) : null;
                          })}
                        </div>

                        {/* Signature indicator */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {personSigs.length > 0 && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200" title={`${personSigs.length} signature(s) on file`}>
                              <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              {personSigs.length}
                            </span>
                          )}

                          {/* Expand chevron */}
                          <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                            {/* Column 1: Personal Details */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Personal Details</h4>
                              {person.id_number && <DetailRow label="SA ID" value={person.id_number} />}
                              {person.passport_number && <DetailRow label="Passport" value={person.passport_number} />}
                              {person.date_of_birth && <DetailRow label="Date of Birth" value={new Date(person.date_of_birth).toLocaleDateString('en-ZA')} />}
                              {person.nationality && <DetailRow label="Nationality" value={person.nationality} />}
                              {person.email && <DetailRow label="Email" value={person.email} />}
                              {person.phone && <DetailRow label="Phone" value={person.phone} />}
                            </div>

                            {/* Column 2: Addresses & Dates */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address & Dates</h4>
                              {person.residential_address && <DetailRow label="Residential" value={person.residential_address} />}
                              {person.postal_address && <DetailRow label="Postal" value={person.postal_address} />}
                              {person.appointment_date && <DetailRow label="Appointed" value={new Date(person.appointment_date).toLocaleDateString('en-ZA')} />}
                              {person.resignation_date && <DetailRow label="Resigned" value={new Date(person.resignation_date).toLocaleDateString('en-ZA')} />}
                              {(person.share_percentage || person.number_of_shares) && (
                                <>
                                  {person.share_percentage && <DetailRow label="Shares %" value={`${person.share_percentage}%`} />}
                                  {person.number_of_shares && <DetailRow label="No. of Shares" value={person.number_of_shares.toLocaleString()} />}
                                </>
                              )}
                              {person.notes && <DetailRow label="Notes" value={person.notes} />}
                            </div>

                            {/* Column 3: Signatures */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Signature Vault</h4>
                              {personSigs.length > 0 ? (
                                <div className="space-y-2">
                                  {personSigs.map(sig => (
                                    <SignatureCard key={sig.id} sig={sig}
                                      onDelete={() => handleDeleteSignature(sig)}
                                      onSetDefault={() => handleSetDefaultSignature(sig)}
                                      getUrl={getSignatureUrl}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic">No signatures uploaded</p>
                              )}
                              {/* Upload signature */}
                              <input
                                ref={sigPersonId === person.id ? sigInputRef : null}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleSignatureUpload(e.target.files[0], person.id);
                                  e.target.value = '';
                                }}
                              />
                              <button
                                onClick={() => {
                                  setSigPersonId(person.id);
                                  // Need to use a timeout to ensure the ref is assigned
                                  setTimeout(() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/png,image/jpeg,image/webp';
                                    input.onchange = (e) => {
                                      if (e.target.files?.[0]) handleSignatureUpload(e.target.files[0], person.id);
                                    };
                                    input.click();
                                  }, 0);
                                }}
                                disabled={uploadingSig === person.id}
                                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                              >
                                {uploadingSig === person.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Upload Signature
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
                            <button onClick={() => openEditForm(person)}
                              className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button onClick={() => handleToggleActive(person)}
                              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${person.is_active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={person.is_active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                              </svg>
                              {person.is_active ? 'Mark Resigned' : 'Reactivate'}
                            </button>
                            <button onClick={() => handleDelete(person)}
                              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 ml-auto">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
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
    </div>
  );
}

// ============== SUB-COMPONENTS ==============

function DetailRow({ label, value }) {
  return (
    <div>
      <span className="text-xs text-gray-400">{label}</span>
      <p className="text-sm text-gray-800 whitespace-pre-line">{value}</p>
    </div>
  );
}

function SignatureCard({ sig, onDelete, onSetDefault, getUrl }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loadingImg, setLoadingImg] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingImg(true);
    getUrl(sig.file_path).then(url => {
      if (!cancelled) {
        setImgUrl(url);
        setLoadingImg(false);
      }
    }).catch(() => { if (!cancelled) setLoadingImg(false); });
    return () => { cancelled = true; };
  }, [sig.file_path]);

  return (
    <div className={`border rounded-lg p-2 ${sig.is_default ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2">
        {/* Signature preview */}
        <div className="w-20 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)', backgroundSize: '12px 12px' }}>
          {loadingImg ? (
            <div className="animate-pulse bg-gray-200 w-full h-full"></div>
          ) : imgUrl ? (
            <img src={imgUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">N/A</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {sig.is_default && (
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">Default</span>
            )}
            <span className="text-xs text-gray-500 capitalize">{sig.signature_type}</span>
          </div>
          <p className="text-xs text-gray-400 truncate">{sig.original_filename}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!sig.is_default && (
            <button onClick={onSetDefault} title="Set as default"
              className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
          <button onClick={onDelete} title="Delete signature"
            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
