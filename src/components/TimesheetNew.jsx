import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock, Plus, Trash2, Edit2, Save, X, Pause } from 'lucide-react';
import supabase from '../lib/SupabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function TimesheetNew() {
  const { user } = useAuth();
  const [consultant, setConsultant] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientProjects, setClientProjects] = useState([]);
  const [todayEntries, setTodayEntries] = useState([]);
  const [weekStats, setWeekStats] = useState({});
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState(null);
  
  // Quick entry form
  const [selectedProject, setSelectedProject] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');

  const timerInterval = useRef(null);

  useEffect(() => {
    loadInitialData();
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadClientProjects();
    } else {
      setClientProjects([]);
      setSelectedProject('');
    }
  }, [selectedClient]);

  useEffect(() => {
    if (activeTimer && !timerPaused) {
      const startTime = new Date(activeTimer.start_time).getTime();
      timerInterval.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimerSeconds(elapsed);
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [activeTimer, timerPaused]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Get consultant
      let consultantData = null;
      if (user?.email) {
        const { data: consultantResult } = await supabase
          .from('consultants')
          .select('*')
          .eq('email', user.email)
          .single();
        
        consultantData = consultantResult || {
          id: user?.id || 'demo-consultant',
          full_name: user?.full_name || user?.email || 'Demo User',
          email: user?.email
        };
      }
      setConsultant(consultantData);

      // Get clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, client_name')
        .order('client_name');
      setClients(clientsData || []);

      // Load today's entries and week stats
      await loadTodayEntries(consultantData?.id);
      await loadWeekStats(consultantData?.id);
      
      // Check for active timer
      await checkActiveTimer(consultantData?.id);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, project_number, name')
      .eq('client_id', selectedClient)
      .in('status', ['active', 'on_hold', 'ready_to_bill', 'invoiced'])
      .order('name');
    setClientProjects(data || []);
  };

  const loadTodayEntries = async (consultantId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('time_entries')
      .select(`
        *,
        projects (
          id,
          name,
          project_number,
          clients (
            id,
            client_name
          )
        ),
        consultants (
          id,
          full_name
        )
      `)
      .eq('consultant_id', consultantId)
      .eq('entry_date', today)
      .order('created_at', { ascending: false });
    
    setTodayEntries(data || []);
  };

  const loadWeekStats = async (consultantId) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    const stats = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('time_entries')
        .select('duration_hours')
        .eq('consultant_id', consultantId)
        .eq('entry_date', dateStr);
      
      const total = (data || []).reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);
      stats[dateStr] = total;
    }
    
    setWeekStats(stats);
  };

  const checkActiveTimer = async (consultantId) => {
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('consultant_id', consultantId)
      .eq('timer_active', true)
      .single();
    
    if (data) {
      setActiveTimer(data);
      setTimerPaused(data.is_paused || false);
    }
  };

  const handleStartTimer = async () => {
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        project_id: selectedProject,
        consultant_id: consultant.id,
        entry_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toISOString(),
        duration_hours: 0,
        entry_method: 'timer',
        timer_active: true,
        description: description || '',
        status: 'draft'
      })
      .select()
      .single();

    if (!error && data) {
      setActiveTimer(data);
      setDescription('');
      await loadTodayEntries(consultant.id);
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;

    const elapsed = timerSeconds / 3600; // Convert to hours
    
    const { error } = await supabase
      .from('time_entries')
      .update({
        end_time: new Date().toISOString(),
        duration_hours: parseFloat(elapsed.toFixed(2)),
        timer_active: false
      })
      .eq('id', activeTimer.id);

    if (!error) {
      setActiveTimer(null);
      setTimerSeconds(0);
      setTimerPaused(false);
      await loadTodayEntries(consultant.id);
      await loadWeekStats(consultant.id);
    }
  };

  const handlePauseTimer = async () => {
    if (!activeTimer) return;

    const { error } = await supabase
      .from('time_entries')
      .update({
        is_paused: true,
        paused_at: new Date().toISOString()
      })
      .eq('id', activeTimer.id);

    if (!error) {
      setTimerPaused(true);
    }
  };

  const handleResumeTimer = async () => {
    if (!activeTimer) return;

    const { error } = await supabase
      .from('time_entries')
      .update({
        is_paused: false,
        resumed_at: new Date().toISOString()
      })
      .eq('id', activeTimer.id);

    if (!error) {
      setTimerPaused(false);
    }
  };

  const handleQuickEntry = async (e) => {
    e.preventDefault();
    if (!selectedProject || (!hours && !minutes)) {
      alert('Please select a project and enter time');
      return;
    }

    const totalHours = (parseFloat(hours || 0) + parseFloat(minutes || 0) / 60).toFixed(2);
    
    const { error } = await supabase
      .from('time_entries')
      .insert({
        project_id: selectedProject,
        consultant_id: consultant.id,
        entry_date: new Date().toISOString().split('T')[0],
        duration_hours: parseFloat(totalHours),
        description: description || '',
        entry_method: 'manual',
        status: 'draft'
      });

    if (!error) {
      setHours('');
      setMinutes('');
      setDescription('');
      setSelectedProject('');
      await loadTodayEntries(consultant.id);
      await loadWeekStats(consultant.id);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Delete this time entry?')) return;
    
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId);

    if (!error) {
      await loadTodayEntries(consultant.id);
      await loadWeekStats(consultant.id);
    }
  };

  const handleUpdateEntry = async (entryId, updates) => {
    const { error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', entryId);

    if (!error) {
      setEditingEntry(null);
      await loadTodayEntries(consultant.id);
      await loadWeekStats(consultant.id);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getWeekDays = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const weekDays = getWeekDays();
  const today = new Date().toISOString().split('T')[0];
  const todayTotal = todayEntries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);
  const weekTotal = Object.values(weekStats).reduce((sum, hours) => sum + hours, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Tracking</h1>
          <p className="text-gray-600 mt-1">
            Track your billable hours • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        {activeTimer && (
          <div className={`${timerPaused ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'} border rounded-lg px-6 py-3`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 ${timerPaused ? 'bg-yellow-500' : 'bg-red-500'} rounded-full ${!timerPaused ? 'animate-pulse' : ''}`}></div>
                <span className={`text-sm font-medium ${timerPaused ? 'text-yellow-900' : 'text-red-900'}`}>
                  {timerPaused ? 'Timer Paused' : 'Timer Running'}
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-blue-600">
                {formatTime(timerSeconds)}
              </div>
              <div className="flex gap-2">
                {!timerPaused ? (
                  <button
                    onClick={handlePauseTimer}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={handleResumeTimer}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Resume
                  </button>
                )}
                <button
                  onClick={handleStopTimer}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Week Stats */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, idx) => {
          const dateStr = date.toISOString().split('T')[0];
          const hours = weekStats[dateStr] || 0;
          const isToday = dateStr === today;
          
          return (
            <div
              key={idx}
              className={`rounded-lg p-4 text-center ${
                isToday 
                  ? 'bg-blue-100 border-2 border-blue-500' 
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className={`text-xs font-medium uppercase ${isToday ? 'text-blue-900' : 'text-gray-600'}`}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-2xl font-bold mt-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {hours.toFixed(1)}h
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Entry Form */}
      <form onSubmit={handleQuickEntry} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Quick Time Entry
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.client_name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={!selectedClient}
            >
              <option value="">Select project...</option>
              {clientProjects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_number} - {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              min="0"
              max="24"
              step="0.1"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minutes</label>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              min="0"
              max="59"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              disabled={activeTimer}
            >
              Log Time
            </button>
            <button
              type="button"
              onClick={handleStartTimer}
              disabled={!selectedProject || activeTimer}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
            </button>
          </div>
        </div>
      </form>

      {/* Today's Entries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Today's Time Entries
          </h3>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Today</p>
            <p className="text-2xl font-bold text-blue-600">{todayTotal.toFixed(2)}h</p>
          </div>
        </div>

        {todayEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No time entries yet</p>
            <p className="text-sm mt-2">Start tracking your time using the form above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayEntries.map((entry) => (
              <div
                key={entry.id}
                className={`border rounded-lg p-4 ${
                  entry.timer_active ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                {editingEntry === entry.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        defaultValue={entry.duration_hours}
                        step="0.1"
                        className="px-3 py-2 border border-gray-300 rounded"
                        onBlur={(e) => {
                          if (e.target.value !== entry.duration_hours.toString()) {
                            handleUpdateEntry(entry.id, { duration_hours: parseFloat(e.target.value) });
                          }
                        }}
                      />
                      <input
                        type="text"
                        defaultValue={entry.description || ''}
                        className="px-3 py-2 border border-gray-300 rounded"
                        onBlur={(e) => {
                          if (e.target.value !== entry.description) {
                            handleUpdateEntry(entry.id, { description: e.target.value });
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={() => setEditingEntry(null)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Done editing
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {entry.projects?.clients?.client_name}
                        </h4>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600">
                          {entry.projects?.name}
                        </span>
                        {entry.timer_active && (
                          <span className={`px-2 py-0.5 ${entry.is_paused ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} text-xs rounded-full font-medium`}>
                            {entry.is_paused ? 'Paused' : 'Running'}
                          </span>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-600">
                          {entry.duration_hours?.toFixed(2)}h
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.entry_method === 'timer' ? 'Timer' : 'Manual'}
                        </p>
                      </div>
                      
                      {!entry.timer_active && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingEntry(entry.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
