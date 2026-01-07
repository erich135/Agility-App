import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, FolderOpen, AlertCircle } from 'lucide-react';
import supabase from '../lib/SupabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function MyCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consultantId, setConsultantId] = useState(null);

  useEffect(() => {
    resolveConsultantAndLoadCustomers();
  }, [user]);

  const resolveConsultantAndLoadCustomers = async () => {
    setLoading(true);
    try {
      // Resolve consultant ID from user
      const { data: consultant } = await supabase
        .from('consultants')
        .select('id')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .limit(1)
        .single();

      if (!consultant) {
        console.warn('No consultant record found for user');
        setLoading(false);
        return;
      }

      setConsultantId(consultant.id);

      // Load assigned customers
      const { data: customersData, error } = await supabase
        .from('clients')
        .select('id, client_name, registration_number, created_at')
        .eq('assigned_consultant_id', consultant.id)
        .order('client_name');

      if (!error) {
        setCustomers(customersData || []);
      }
    } catch (err) {
      console.error('Error loading my customers:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!consultantId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600" />
          <div>
            <h3 className="font-semibold text-yellow-800">No Consultant Profile</h3>
            <p className="text-sm text-yellow-700">
              Your account is not linked to a consultant profile. Contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-600" />
          My Customers
        </h1>
        <p className="text-gray-600 mt-1">Customers assigned to you</p>
      </div>

      {/* Customers Grid */}
      {customers.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No customers assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">{customer.client_name}</h3>
                {customer.registration_number && (
                  <p className="text-sm text-gray-500">Reg: {customer.registration_number}</p>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Link
                  to={`/customers?customer=${customer.id}&logTime=true`}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Log Time
                </Link>
                <Link
                  to={`/documents?customer=${customer.id}`}
                  className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  Docs
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
