import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Plus, Search, X, Calendar } from 'lucide-react';
import supabase from '../lib/SupabaseClient';

export default function TimesheetSimple() {
  const [clients, setClients] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    duration_hours: '',
    hourly_rate: '',
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    loadClients();
    getCurrentUser();
    
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
    
    // Timer interval
    const interval = setInterval(() => {
      if (activeTimer) {
        const start = new Date(activeTimer.start_time);
        const now = new Date();
        setElapsedTime(Math.floor((now - start) / 1000));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeTimer]);

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadTimeEntries();
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    // Filter entries by customer search
    if (customerFilter.trim() === '') {
      setFilteredEntries(timeEntries);
    } else {
      const filtered = timeEntries.filter(entry =>
        entry.clients?.client_name?.toLowerCase().includes(customerFilter.toLowerCase())
      );
      setFilteredEntries(filtered);
    }
  }, [customerFilter, timeEntries]);

  const getCurrentUser = async () => {
    const { data } = await supabase
      .from('consultants')
      .select('*')
      .limit(1)
      .single();
    setCurrentUser(data);
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'Active')
      .order('client_name');
    setClients(data || []);
  };

  const loadTimeEntries = async () => {
    const { data } = await supabase
      .from('time_entries')
      .select(`
        *,
        clients(id, client_name),
        consultants(first_name, last_name)
      `)
      .gte('entry_date', dateFrom)
      .lte('entry_date', dateTo)
      .order('entry_date', { ascending: false });
    
    setTimeEntries(data || []);
    setFilteredEntries(data || []);
    
    // Check for active timer
    const active = data?.find(entry => entry.timer_active);
    if (active) {
      setActiveTimer(active);
    }
  };

  const filteredClients = clients.filter(client =>
    client.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setFormData({
      description: '',
      duration_hours: '',
      hourly_rate: currentUser?.default_hourly_rate || '',
    });
  };

  const startTimer = async () => {
    if (!selectedClient || !formData.description) {
      alert('Please select a client and enter a description');
      return;
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        client_id: selectedClient.id,
        consultant_id: currentUser?.id,
        entry_date: new Date().toISOString().split('T')[0],
        description: formData.description,
        hourly_rate: formData.hourly_rate || null,
        start_time: new Date().toISOString(),
        timer_active: true,
        duration_hours: 0,
        status: 'draft',
        is_billable: true,
      })
      .select()
      .single();

    if (!error) {
      setActiveTimer(data);
      setShowModal(false);
      loadTimeEntries();
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;

    const start = new Date(activeTimer.start_time);
    const end = new Date();
    const hours = ((end - start) / (1000 * 60 * 60)).toFixed(2);

    await supabase
      .from('time_entries')
      .update({
        end_time: end.toISOString(),
        duration_hours: hours,
        timer_active: false,
      })
      .eq('id', activeTimer.id);

    setActiveTimer(null);
    setElapsedTime(0);
    loadTimeEntries();
  };

  const saveManualEntry = async () => {
    if (!selectedClient || !formData.description || !formData.duration_hours) {
      alert('Please fill in all required fields');
      return;
    }

    await supabase
      .from('time_entries')
      .insert({
        client_id: selectedClient.id,
        consultant_id: currentUser?.id,
        entry_date: new Date().toISOString().split('T')[0],
        description: formData.description,
        duration_hours: parseFloat(formData.duration_hours),
        hourly_rate: formData.hourly_rate || null,
        timer_active: false,
        status: 'draft',
        is_billable: true,
        entry_method: 'manual',
      });

    setShowModal(false);
    setSelectedClient(null);
    loadTimeEntries();
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStats = () => {
    const totalHours = filteredEntries.reduce((sum, entry) => sum + parseFloat(entry.duration_hours || 0), 0);
    const billedHours = filteredEntries
      .filter(e => e.invoice_number)
      .reduce((sum, entry) => sum + parseFloat(entry.duration_hours || 0), 0);
    const unbilledHours = totalHours - billedHours;
    return { totalHours, billedHours, unbilledHours };
  };

  const stats = getStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">⏱️ Time Tracking</h1>
        <p className="text-gray-600">Log your time to clients</p>
      </div>

      {/* Active Timer Card */}
      {activeTimer && (
        <div className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90 mb-1">Timer Running</div>
              <div className="text-2xl font-bold">{formatTime(elapsedTime)}</div>
              <div className="text-sm mt-2 opacity-90">
                Client: {activeTimer.clients?.client_name || 'Unknown'}
              </div>
              <div className="text-sm opacity-90">
                Task: {activeTimer.description}
              </div>
            </div>
            <button
              onClick={stopTimer}
              className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 flex items-center gap-2"
            >
              <Square size={20} fill="currentColor" />
              Stop Timer
            </button>
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date From
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date To
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Customer
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Type to filter..."
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setShowModal(true)}
              disabled={!!activeTimer}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Log Time
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-semibold mb-1">Total Hours</div>
          <div className="text-2xl font-bold text-blue-900">{stats.totalHours.toFixed(1)}h</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-semibold mb-1">Hours Billed</div>
          <div className="text-2xl font-bold text-green-900">{stats.billedHours.toFixed(1)}h</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-orange-600 font-semibold mb-1">Hours Unbilled</div>
          <div className="text-2xl font-bold text-orange-900">{stats.unbilledHours.toFixed(1)}h</div>
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Consultant
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Clock size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No time entries found for this date range</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.entry_date).toLocaleDateString('en-ZA')}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {entry.clients?.client_name || 'Unknown Client'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {entry.description || 'No description'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {entry.consultants?.first_name} {entry.consultants?.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right">
                      {entry.timer_active ? (
                        <span className="text-green-600">Running...</span>
                      ) : (
                        <span className="text-blue-600">{parseFloat(entry.duration_hours || 0).toFixed(2)}h</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {entry.invoice_number ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Billed
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                          Unbilled
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedClient ? 'Log Time Entry' : 'Select Client'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedClient(null);
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {!selectedClient ? (
                <>
                  {/* Client Search */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Client List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <div className="font-semibold text-gray-900">{client.client_name}</div>
                        {client.registration_number && (
                          <div className="text-sm text-gray-500 mt-1">
                            Reg: {client.registration_number}
                          </div>
                        )}
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No clients found
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Selected Client Info */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-600 font-semibold mb-1">Selected Client</div>
                    <div className="text-lg font-bold text-gray-900">{selectedClient.client_name}</div>
                    <button
                      onClick={() => setSelectedClient(null)}
                      className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                    >
                      Change Client
                    </button>
                  </div>

                  {/* Time Entry Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Task Description *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="What did you work on?"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Hours (Manual Entry)
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          value={formData.duration_hours}
                          onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Hourly Rate (Optional)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.hourly_rate}
                          onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={startTimer}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <Play size={20} fill="currentColor" />
                        Start Timer
                      </button>
                      <button
                        onClick={saveManualEntry}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
                      >
                        Save Manual Entry
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
