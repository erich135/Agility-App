import React, { useState, useEffect } from 'react';
import { Users, Check, X } from 'lucide-react';
import supabase from '../lib/SupabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function BulkAssignCustomers() {
  const { user, hasPermission } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [targetConsultant, setTargetConsultant] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('all'); // all | assigned | unassigned

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersRes, consultantsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, client_name, registration_number, assigned_consultant_id')
          .order('client_name'),
        supabase
          .from('consultants')
          .select('id, full_name')
          .eq('is_active', true)
          .order('full_name')
      ]);

      setCustomers(customersRes.data || []);
      setConsultants(consultantsRes.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCustomer = (customerId) => {
    const newSet = new Set(selectedCustomers);
    if (newSet.has(customerId)) {
      newSet.delete(customerId);
    } else {
      newSet.add(customerId);
    }
    setSelectedCustomers(newSet);
  };

  const handleSelectAll = () => {
    const filtered = getFilteredCustomers();
    const allIds = new Set(filtered.map(c => c.id));
    setSelectedCustomers(allIds);
  };

  const handleClearSelection = () => {
    setSelectedCustomers(new Set());
  };

  const handleBulkAssign = async () => {
    if (!targetConsultant || selectedCustomers.size === 0) {
      alert('Please select customers and a consultant');
      return;
    }

    const confirmMsg = `Assign ${selectedCustomers.size} customer(s) to ${
      consultants.find(c => c.id === targetConsultant)?.full_name
    }?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const updates = Array.from(selectedCustomers).map(id => ({
        id,
        assigned_consultant_id: targetConsultant
      }));

      for (const update of updates) {
        await supabase.from('clients').update({ assigned_consultant_id: update.assigned_consultant_id }).eq('id', update.id);
      }

      alert(`Successfully assigned ${selectedCustomers.size} customer(s)`);
      setSelectedCustomers(new Set());
      setTargetConsultant('');
      loadData();
    } catch (err) {
      console.error('Error bulk assigning:', err);
      alert('Failed to assign customers');
    }
  };

  const getFilteredCustomers = () => {
    let filtered = customers;

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.registration_number?.includes(searchTerm)
      );
    }

    if (filterAssigned === 'assigned') {
      filtered = filtered.filter(c => c.assigned_consultant_id);
    } else if (filterAssigned === 'unassigned') {
      filtered = filtered.filter(c => !c.assigned_consultant_id);
    }

    return filtered;
  };

  const filteredCustomers = getFilteredCustomers();

  if (!hasPermission('customers_bulk_assign')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-800">Access Denied</h3>
        <p className="text-sm text-red-700">You don't have permission to bulk assign customers.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-600" />
          Bulk Assign Customers
        </h1>
        <p className="text-gray-600 mt-1">Assign multiple customers to a consultant</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg"
          />

          <select
            value={filterAssigned}
            onChange={(e) => setFilterAssigned(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Customers</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>

          <button
            onClick={handleSelectAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Select All ({filteredCustomers.length})
          </button>

          <button
            onClick={handleClearSelection}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={targetConsultant}
            onChange={(e) => setTargetConsultant(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select consultant...</option>
            {consultants.map(c => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>

          <button
            onClick={handleBulkAssign}
            disabled={selectedCustomers.size === 0 || !targetConsultant}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Assign {selectedCustomers.size > 0 && `(${selectedCustomers.size})`}
          </button>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={(e) => e.target.checked ? handleSelectAll() : handleClearSelection()}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Registration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Current Consultant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => {
                  const consultant = consultants.find(c => c.id === customer.assigned_consultant_id);
                  return (
                    <tr
                      key={customer.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedCustomers.has(customer.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleToggleCustomer(customer.id)}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.has(customer.id)}
                          onChange={() => {}}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.client_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{customer.registration_number || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {consultant ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {consultant.full_name}
                          </span>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
