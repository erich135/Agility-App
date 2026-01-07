import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../lib/SupabaseClient';
import CustomerForm from './CustomerForm';
import DocumentManager from './DocumentManager';
import ActivityLogger from '../lib/ActivityLogger';
import { useAuth } from '../contexts/AuthContext';

const CustomerManagement = () => {
  const { user, isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [documentsCustomer, setDocumentsCustomer] = useState(null);
  
  // Time logging state
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeLogCustomer, setTimeLogCustomer] = useState(null);
  const [consultants, setConsultants] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [myConsultantId, setMyConsultantId] = useState(null);
  const [timeEntry, setTimeEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    description: '',
    hourlyRate: '500',
    consultantId: '',
    jobTypeId: ''
  });
  
  // Time history state
  const [expandedTimeHistory, setExpandedTimeHistory] = useState(new Set());
  const [customerTimeEntries, setCustomerTimeEntries] = useState({});
  const [editingEntry, setEditingEntry] = useState(null);
  const [reassigningCustomerId, setReassigningCustomerId] = useState(null);
  const [reassignSelection, setReassignSelection] = useState('');

  // Fetch customers from Supabase
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Fetch customers with document counts
      let query = supabase
        .from('clients')
        .select(`
          id,
          client_name,
          registration_number,
          registration_date,
          created_at,
          last_cipc_filed,
          last_bo_filed,
          assigned_consultant_id
        `)
        .order('client_name', { ascending: true });

      if (user?.role === 'consultant' && myConsultantId) {
        console.log('🔐 Consultant filter applied. myConsultantId:', myConsultantId);
        query = query.eq('assigned_consultant_id', myConsultantId);
      } else if (user?.role === 'consultant' && !myConsultantId) {
        console.log('⚠️  Consultant role but myConsultantId not set yet');
      }

      const { data: customersData, error: customersError } = await query;

      if (customersError) throw customersError;
      
      console.log(`📦 Fetched ${customersData?.length || 0} customers`);

      // Get document counts for each customer
      const { data: documentCounts, error: docError } = await supabase
        .from('documents')
        .select('client_id')
        .in('client_id', (customersData || []).map(c => c.id));

      // Don't throw error if documents table doesn't exist yet
      if (docError && !docError.message.includes('does not exist')) {
        console.warn('Documents table not ready:', docError);
      }

      // Add document counts to customers
      const customersWithDocs = (customersData || []).map(customer => ({
        ...customer,
        documentCount: documentCounts ? documentCounts.filter(d => d.client_id === customer.id).length : 0
      }));

      setCustomers(customersWithDocs);
      setError(null);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.message);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    loadConsultantsAndJobTypes();
  }, []);

  useEffect(() => {
    const resolveConsultant = async () => {
      if (user?.role === 'consultant') {
        console.log('👤 Consultant role detected. User ID:', user.id, 'Email:', user.email);
        const { data, error } = await supabase
          .from('consultants')
          .select('id, user_id, email')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .limit(1)
          .single();
        console.log('🔍 Consultant lookup result:', data, 'Error:', error);
        setMyConsultantId(data?.id || null);
        console.log('📌 myConsultantId set to:', data?.id || null);
      }
    };
    resolveConsultant().finally(() => fetchCustomers());
  }, [user]);

  const loadConsultantsAndJobTypes = async () => {
    // Load consultants
    const { data: consultantsData } = await supabase
      .from('consultants')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');
    
    console.log('Loaded consultants:', consultantsData);
    setConsultants(consultantsData || []);

    // Load job types
    const { data: jobTypesData } = await supabase
      .from('job_types')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    console.log('Loaded job types:', jobTypesData);
    setJobTypes(jobTypesData || []);
  };

  const loadTimeEntriesForCustomer = async (customerId) => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
          .select('*')
        .eq('client_id', customerId)
        .order('entry_date', { ascending: false });
      
      if (error) {
        console.error('❌ Error loading time entries:', error);
      } else {
        console.log(`✅ Loaded ${data?.length || 0} time entries for client ${customerId}:`, data);
      }
    
      setCustomerTimeEntries(prev => ({
        ...prev,
        [customerId]: data || []
      }));
    } catch (err) {
      console.error('❌ Exception loading time entries:', err);
    }
  };

  const toggleTimeHistory = (customerId) => {
    const newExpanded = new Set(expandedTimeHistory);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
      loadTimeEntriesForCustomer(customerId);
    }
    setExpandedTimeHistory(newExpanded);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.registration_number?.includes(searchTerm)
  );

  const handleAddCustomer = () => {
    setEditingCustomerId(null);
    setShowForm(true);
  };

  const handleEditCustomer = (customerId) => {
    setEditingCustomerId(customerId);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCustomerId(null);
  };

  const handleSaveCustomer = () => {
    fetchCustomers(); // Refresh the list
  };

  const handleLogTime = (customer) => {
    // Safeguard: consultants can only log time for assigned customers
    if (user?.role === 'consultant' && myConsultantId) {
      if (customer.assigned_consultant_id && customer.assigned_consultant_id !== myConsultantId) {
        alert('You are not assigned to this customer. Please contact an admin.');
        return;
      }
      if (!customer.assigned_consultant_id) {
        alert('This customer has no assigned consultant yet.');
        return;
      }
    }
    setTimeLogCustomer(customer);
    
    // Get default consultant (current user or first consultant)
    const defaultConsultant = (user?.role === 'consultant' && myConsultantId)
      ? consultants.find(c => c.id === myConsultantId)
      : consultants[0];
    
    setTimeEntry({
      date: new Date().toISOString().split('T')[0],
      hours: '',
      description: '',
      hourlyRate: '500',
      consultantId: defaultConsultant?.id || '',
      jobTypeId: jobTypes[0]?.id || ''
    });
    setShowTimeModal(true);
  };

  const handleSaveTimeEntry = async () => {
    if (!timeEntry.hours || !timeEntry.description) {
      alert('Please enter hours and description');
      return;
    }

    if (!timeEntry.consultantId) {
      alert('Please select a consultant');
      return;
    }

    try {
      if (editingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('time_entries')
          .update({
            consultant_id: timeEntry.consultantId,
            job_type_id: timeEntry.jobTypeId || null,
            entry_date: timeEntry.date,
            hours: parseFloat(timeEntry.hours),
            description: timeEntry.description,
            hourly_rate: timeEntry.hourlyRate ? parseFloat(timeEntry.hourlyRate) : null,
          })
          .eq('id', editingEntry.id);

        if (error) throw error;
        alert(`✅ Time entry updated`);
      } else {
        // Create new entry
        const { error } = await supabase
          .from('time_entries')
          .insert({
            client_id: timeLogCustomer.id,
            consultant_id: timeEntry.consultantId,
            job_type_id: timeEntry.jobTypeId || null,
            entry_date: timeEntry.date,
            hours: parseFloat(timeEntry.hours),
            description: timeEntry.description,
            hourly_rate: timeEntry.hourlyRate ? parseFloat(timeEntry.hourlyRate) : null,
            is_invoiced: false
          });

        if (error) throw error;
        alert(`✅ Time logged: ${timeEntry.hours}h for ${timeLogCustomer.client_name}`);
      }

      setShowTimeModal(false);
      setEditingEntry(null);
      if (expandedTimeHistory.has(timeLogCustomer.id)) {
        loadTimeEntriesForCustomer(timeLogCustomer.id);
      }
      fetchCustomers();
    } catch (err) {
      console.error('Error saving time entry:', err);
      alert('❌ Error: ' + err.message);
    }
  };

  const handleEditTimeEntry = (entry, customer) => {
    setTimeLogCustomer(customer);
    setEditingEntry(entry);
    setTimeEntry({
      date: entry.entry_date,
      hours: entry.hours.toString(),
      description: entry.description || '',
      hourlyRate: entry.hourly_rate?.toString() || '500',
      consultantId: entry.consultant_id || '',
      jobTypeId: entry.job_type_id || ''
    });
    setShowTimeModal(true);
  };

  const handleDeleteTimeEntry = async (entryId, customerId) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      alert('✅ Time entry deleted');
      loadTimeEntriesForCustomer(customerId);
      fetchCustomers();
    } catch (err) {
      alert('❌ Error deleting entry: ' + err.message);
    }
  };

  const handleViewDocuments = async (customer) => {
    // Log customer access
    if (user) {
      await ActivityLogger.logCustomerAccess(
        user.id,
        user.full_name || user.email,
        customer.id,
        customer.client_name,
        {
          action_type: 'view_customer_details',
          accessed_timestamp: new Date().toISOString(),
          registration_number: customer.registration_number
        }
      );
    }
    
    setDocumentsCustomer(customer);
    setShowDocuments(true);
  };

  const handleCloseDocuments = () => {
    setShowDocuments(false);
    setDocumentsCustomer(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
            </div>
            <button 
              onClick={handleAddCustomer}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Customer
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Customers
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Search by company name or registration number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-end">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              All Customers ({filteredCustomers.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Loading customers...</h3>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.046 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Error loading customers</h3>
              <p className="mt-2 text-gray-600">{error}</p>
              <button 
                onClick={fetchCustomers}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No customers found</h3>
              <p className="mt-2 text-gray-600">
                {searchTerm ? 'No customers match your search criteria.' : 'Get started by adding customer information.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {customer.client_name?.charAt(0) || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {customer.client_name || 'Unnamed Client'}
                          </h3>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>Reg: {customer.registration_number || 'Not provided'}</p>
                            {customer.registration_date && <p>Registered: {new Date(customer.registration_date).toLocaleDateString()}</p>}
                            {customer.last_cipc_filed && <p>Last CIPC: {new Date(customer.last_cipc_filed).toLocaleDateString()}</p>}
                            <p className="text-xs">
                              📄 {customer.documentCount || 0} document{customer.documentCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        CIPC Client
                      </span>
                      {customer.assigned_consultant_id && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-800" title="Assigned Consultant">
                          {(() => {
                            const c = consultants.find(x => x.id === customer.assigned_consultant_id);
                            return c ? `Assigned: ${c.full_name}` : 'Assigned';
                          })()}
                        </span>
                      )}
                      {isAdmin && isAdmin() && (
                        reassigningCustomerId === customer.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={reassignSelection}
                              onChange={(e) => setReassignSelection(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              <option value="">Unassigned</option>
                              {consultants.map(c => (
                                <option key={c.id} value={c.id}>{c.full_name}</option>
                              ))}
                            </select>
                            <button
                              onClick={async () => {
                                try {
                                  await supabase
                                    .from('clients')
                                    .update({ assigned_consultant_id: reassignSelection || null })
                                    .eq('id', customer.id);
                                  setReassigningCustomerId(null);
                                  setReassignSelection('');
                                  fetchCustomers();
                                } catch (e) {
                                  alert('Failed to reassign consultant');
                                }
                              }}
                              className="text-green-600 hover:text-green-800 text-xs font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setReassigningCustomerId(null); setReassignSelection(''); }}
                              className="text-gray-500 hover:text-gray-700 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setReassigningCustomerId(customer.id); setReassignSelection(customer.assigned_consultant_id || ''); }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                            title="Reassign consultant"
                          >
                            Reassign
                          </button>
                        )
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button 
                          onClick={() => handleLogTime(customer)}
                          className="text-green-600 hover:text-green-800 transition-colors font-medium text-sm px-3 py-1 rounded hover:bg-green-50 flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Log Time
                        </button>
                        <button 
                          onClick={() => handleEditCustomer(customer.id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors font-medium text-sm px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Edit Details
                        </button>
                        <button 
                          onClick={() => handleViewDocuments(customer)}
                          className="text-purple-600 hover:text-purple-800 transition-colors font-medium text-sm px-2 py-1 rounded hover:bg-purple-50 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Documents
                        </button>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Time Entries History */}
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <button
                      onClick={() => toggleTimeHistory(customer.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {expandedTimeHistory.has(customer.id) ? 'Hide' : 'View'} Time Entries
                      {customerTimeEntries[customer.id] && ` (${customerTimeEntries[customer.id].length})`}
                    </button>

                    {expandedTimeHistory.has(customer.id) && (
                      <div className="mt-4">
                        {!customerTimeEntries[customer.id] || customerTimeEntries[customer.id].length === 0 ? (
                          <p className="text-gray-500 text-sm">No time entries yet</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Date</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Consultant</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Job Type</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Hours</th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Amount</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Status</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {customerTimeEntries[customer.id].map((entry) => (
                                  <tr key={entry.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-3 whitespace-nowrap">
                                      {new Date(entry.entry_date).toLocaleDateString('en-ZA')}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                      {entry.consultants?.full_name}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                      {entry.job_types?.name || '-'}
                                    </td>
                                    <td className="px-3 py-3 text-gray-700">
                                      {entry.description}
                                    </td>
                                    <td className="px-3 py-3 text-right font-semibold">
                                      {parseFloat(entry.hours).toFixed(2)}h
                                    </td>
                                    <td className="px-3 py-3 text-right font-semibold text-green-600">
                                      R{(parseFloat(entry.hours) * parseFloat(entry.hourly_rate || 0)).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                      {entry.is_invoiced ? (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                          Invoiced
                                        </span>
                                      ) : (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                          Unbilled
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                      {!entry.is_invoiced && (
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            onClick={() => handleEditTimeEntry(entry, customer)}
                                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                            title="Edit"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteTimeEntry(entry.id, customer.id)}
                                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                                            title="Delete"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-50 font-semibold">
                                <tr>
                                  <td colSpan="4" className="px-3 py-2 text-right">Total:</td>
                                  <td className="px-3 py-2 text-right">
                                    {customerTimeEntries[customer.id].reduce((sum, e) => sum + parseFloat(e.hours || 0), 0).toFixed(2)}h
                                  </td>
                                  <td className="px-3 py-2 text-right text-green-600">
                                    R{customerTimeEntries[customer.id].reduce((sum, e) => 
                                      sum + (parseFloat(e.hours || 0) * parseFloat(e.hourly_rate || 0)), 0
                                    ).toFixed(2)}
                                  </td>
                                  <td colSpan="2"></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.status === 'Active' || !c.status).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.046 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Incomplete Profiles</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => 
                    !c.company_vat_number || !c.company_telephone || !c.company_email
                  ).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.reduce((total, c) => total + (c.documentCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customerId={editingCustomerId}
          onClose={handleCloseForm}
          onSave={handleSaveCustomer}
        />
      )}

      {/* Document Manager Modal */}
      {showDocuments && documentsCustomer && (
        <DocumentManager
          customerId={documentsCustomer.id}
          customerName={documentsCustomer.client_name}
          onClose={handleCloseDocuments}
        />
      )}

      {/* Time Logging Modal */}
      {showTimeModal && timeLogCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Log Time</h2>
              <p className="text-sm text-gray-600 mt-1">
                Customer: <span className="font-semibold">{timeLogCustomer.client_name}</span>
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={timeEntry.date}
                  onChange={(e) => setTimeEntry({ ...timeEntry, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Consultant *
                  </label>
                  <select
                    value={timeEntry.consultantId}
                    onChange={(e) => setTimeEntry({ ...timeEntry, consultantId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    {consultants.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Type
                  </label>
                  <select
                    value={timeEntry.jobTypeId}
                    onChange={(e) => {
                      const selectedJobType = jobTypes.find(jt => jt.id === e.target.value);
                      setTimeEntry({ 
                        ...timeEntry, 
                        jobTypeId: e.target.value,
                        hourlyRate: selectedJobType?.default_rate || timeEntry.hourlyRate
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    {jobTypes.map(jt => (
                      <option key={jt.id} value={jt.id}>
                        {jt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hours *
                </label>
                <input
                  type="number"
                  step="0.25"
                  placeholder="e.g., 2.5"
                  value={timeEntry.hours}
                  onChange={(e) => setTimeEntry({ ...timeEntry, hours: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  rows={8}
                  placeholder="Detailed description of work performed (visible on unbilled time report)"
                  value={timeEntry.description}
                  onChange={(e) => setTimeEntry({ ...timeEntry, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hourly Rate (R)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="500.00"
                  value={timeEntry.hourlyRate}
                  onChange={(e) => setTimeEntry({ ...timeEntry, hourlyRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {timeEntry.hours && timeEntry.hourlyRate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-blue-600 font-semibold">Total Amount</div>
                  <div className="text-2xl font-bold text-blue-900">
                    R {(parseFloat(timeEntry.hours || 0) * parseFloat(timeEntry.hourlyRate || 0)).toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowTimeModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTimeEntry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Save Time Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;