import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/SupabaseClient';
import MeetingForm from './MeetingForm';
import {
  Calendar,
  Plus,
  MapPin,
  Users,
  Briefcase,
  Bell,
  Clock,
  Trash2,
  Pencil,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-ZA', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
    year:    'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
    hour12:  false,
  });
}

function formatDateOnly(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTimeOnly(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-ZA', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function getMeetingStatus(isoString) {
  const now = new Date();
  const mt  = new Date(isoString);
  const diffH = (mt - now) / (1000 * 60 * 60);

  if (diffH < 0)   return 'past';
  if (diffH < 2)   return 'imminent';  // within 2 hours
  if (diffH < 24)  return 'today';
  if (diffH < 72)  return 'soon';      // within 3 days
  return 'upcoming';
}

const STATUS_STYLES = {
  past:     'border-l-4 border-gray-300 bg-gray-50',
  imminent: 'border-l-4 border-red-500   bg-red-50',
  today:    'border-l-4 border-orange-400 bg-orange-50',
  soon:     'border-l-4 border-yellow-400 bg-yellow-50',
  upcoming: 'border-l-4 border-blue-400  bg-white',
};

const STATUS_BADGE = {
  past:     'bg-gray-100 text-gray-500',
  imminent: 'bg-red-100  text-red-700',
  today:    'bg-orange-100 text-orange-700',
  soon:     'bg-yellow-100 text-yellow-700',
  upcoming: 'bg-blue-100 text-blue-700',
};

const STATUS_LABEL = {
  past:     'Past',
  imminent: 'Now / Soon',
  today:    'Today',
  soon:     'This Week',
  upcoming: 'Upcoming',
};

const REMINDER_LABELS = {
  '1week': '1 wk',
  '3days': '3 days',
  '1day':  '1 day',
  '4hours':'4 hrs',
  '1hour': '1 hr',
  '30min': '30 min',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const { user } = useAuth();

  const [meetings,    setMeetings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);   // null = new
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus,setFilterStatus]= useState('all'); // all | upcoming | today | past
  const [toast,       setToast]       = useState('');

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        id, title, meeting_date, location, notes,
        reminders, reminders_sent,
        client_id, job_id,
        clients(client_name),
        job_register(title)
      `)
      .order('meeting_date', { ascending: true });

    if (!error) setMeetings(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const now = new Date();
  const todayEnd  = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const weekEnd   = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);

  const stats = {
    total:    meetings.filter(m => new Date(m.meeting_date) >= now).length,
    today:    meetings.filter(m => {
                const d = new Date(m.meeting_date);
                return d >= now && d <= todayEnd;
              }).length,
    thisWeek: meetings.filter(m => {
                const d = new Date(m.meeting_date);
                return d > todayEnd && d <= weekEnd;
              }).length,
    past:     meetings.filter(m => new Date(m.meeting_date) < now).length,
  };

  // ── Filtering ───────────────────────────────────────────────────────────────

  const filtered = meetings.filter(m => {
    const q = searchQuery.toLowerCase();
    if (q) {
      const haystack = [
        m.title,
        m.location,
        m.clients?.client_name,
        m.job_register?.title,
        m.notes,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    const status = getMeetingStatus(m.meeting_date);
    if (filterStatus === 'upcoming') return status !== 'past';
    if (filterStatus === 'today')    return status === 'today' || status === 'imminent';
    if (filterStatus === 'past')     return status === 'past';
    return true; // 'all'
  });

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleSave = (saved) => {
    setMeetings(prev => {
      const idx = prev.findIndex(m => m.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...saved };
        return next.sort((a, b) => new Date(a.meeting_date) - new Date(b.meeting_date));
      }
      return [...prev, saved].sort((a, b) => new Date(a.meeting_date) - new Date(b.meeting_date));
    });
    setShowForm(false);
    setEditMeeting(null);
    showToast(saved.id ? 'Meeting updated.' : 'Meeting created.');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('meetings').delete().eq('id', deleteTarget.id);
    if (!error) {
      setMeetings(prev => prev.filter(m => m.id !== deleteTarget.id));
      showToast('Meeting deleted.');
    }
    setDeleteTarget(null);
  };

  const openNew = () => {
    setEditMeeting(null);
    setShowForm(true);
  };

  const openEdit = (meeting) => {
    setEditMeeting(meeting);
    setShowForm(true);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-blue-600" />
            Meetings
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and track client meetings with push reminders</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Meeting
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Upcoming',  value: stats.total,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Today',     value: stats.today,    color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'This Week', value: stats.thisWeek, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Past',      value: stats.past,     color: 'text-gray-500',   bg: 'bg-gray-100'  },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search meetings, clients, locations…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'upcoming', 'today', 'past'].map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors capitalize ${
                filterStatus === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Meeting List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No meetings found</p>
          <p className="text-sm text-gray-400 mt-1">
            {searchQuery ? 'Try a different search term.' : 'Click "New Meeting" to schedule one.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(meeting => {
            const status = getMeetingStatus(meeting.meeting_date);
            const reminders = meeting.reminders || [];
            const sent = meeting.reminders_sent || [];

            return (
              <div
                key={meeting.id}
                className={`rounded-xl p-5 shadow-sm ${STATUS_STYLES[status]} transition-all`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: meeting info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                      {reminders.length > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Bell className="w-3 h-3" />
                          {reminders.map(r => (
                            <span
                              key={r}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                sent.includes(r)
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                              title={sent.includes(r) ? 'Reminder sent' : 'Reminder pending'}
                            >
                              {REMINDER_LABELS[r]}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 text-base truncate">{meeting.title}</h3>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatDateOnly(meeting.meeting_date)} &nbsp;·&nbsp;{formatTimeOnly(meeting.meeting_date)}
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {meeting.location}
                        </span>
                      )}
                      {meeting.clients?.client_name && (
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {meeting.clients.client_name}
                        </span>
                      )}
                      {meeting.job_register?.title && (
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                          {meeting.job_register.title}
                        </span>
                      )}
                    </div>

                    {meeting.notes && (
                      <p className="mt-2 text-sm text-gray-500 line-clamp-2">{meeting.notes}</p>
                    )}
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(meeting)}
                      className="p-2 rounded-lg hover:bg-white/70 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(meeting)}
                      className="p-2 rounded-lg hover:bg-white/70 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Meeting Form Modal */}
      {showForm && (
        <MeetingForm
          meeting={editMeeting}
          currentUserId={user?.id}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditMeeting(null); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Meeting?</h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">{deleteTarget.title}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {formatDateTime(deleteTarget.meeting_date)}<br />
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
