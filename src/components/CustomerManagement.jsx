import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../lib/SupabaseClient';
import CustomerForm from './CustomerForm';
import DocumentManager from './DocumentManager';
import ActivityLogger from '../lib/ActivityLogger';
import { useAuth } from '../contexts/AuthContext';

const CustomerManagement = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [documentsCustomer, setDocumentsCustomer] = useState(null);

  // Fetch customers from Supabase
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Fetch customers with document counts
      const { data: customersData, error: customersError } = await supabase
        .from('clients')
        .select(`
          id,
          client_name,
          registration_number,
          registration_date,
          created_at,
          last_cipc_filed,
          last_bo_filed
        `)
        .order('client_name', { ascending: true });

      if (customersError) throw customersError;

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
  }, []);

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
                      <div className="flex flex-col sm:flex-row gap-2">
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
    </div>
  );
};

export default CustomerManagement;