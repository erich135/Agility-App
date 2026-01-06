import { useState, useEffect } from 'react';
import { Clock, Play, Square, Plus, Filter, Search, X } from 'lucide-react';
import supabase from '../lib/SupabaseClient';

export default function TimesheetSimple() {
  const [clients, setClients] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    duration_hours: '',
    hourly_rate: '',
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    loadClients();
    loadTodayEntries();
    getCurrentUser();
    
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

  const loadTodayEntries = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('time_entries')
      .select(`
        *,
        clients!inner(client_name)
      `)
      .eq('entry_date', today)
      .order('created_at', { ascending: false });
    
    setTimeEntries(data || []);
    
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
      loadTodayEntries();
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
    loadTodayEntries();
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
    loadTodayEntries();
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTodayTotal = () => {
    return timeEntries.reduce((sum, entry) => sum + parseFloat(entry.duration_hours || 0), 0).toFixed(2);
  };

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
                Client: {clients.find(c => c.id === activeTimer.client_id)?.client_name}
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

      {/* Quick Actions */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setShowModal(true)}
          disabled={!!activeTimer}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus size={20} />
          Log Time
        </button>
      </div>

      {/* Today's Entries */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Today's Entries</h2>
          <div className="text-sm text-gray-600 mt-1">
            Total: <span className="font-bold text-blue-600">{getTodayTotal()}h</span>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {timeEntries.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Clock size={48} className="mx-auto mb-3 opacity-30" />
              <p>No time entries for today</p>
            </div>
          ) : (
            timeEntries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {entry.clients?.client_name || 'Unknown Client'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{entry.description}</div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {entry.start_time && (
                        <span>
                          {new Date(entry.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {entry.end_time && ` - ${new Date(entry.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      )}
                      <span className={entry.timer_active ? 'text-green-600 font-semibold' : ''}>
                        {entry.timer_active ? 'Running' : entry.entry_method === 'timer' ? 'Timer' : 'Manual'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {parseFloat(entry.duration_hours).toFixed(2)}h
                    </div>
                    {entry.hourly_rate && (
                      <div className="text-sm text-gray-500">
                        R{parseFloat(entry.hourly_rate).toFixed(2)}/h
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
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
