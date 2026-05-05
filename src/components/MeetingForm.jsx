import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Briefcase, Users, Bell } from 'lucide-react';
import supabase from '../lib/SupabaseClient';

const REMINDER_OPTIONS = [
  { key: '1week',  label: '1 week before',    daily: true  },
  { key: '3days',  label: '3 days before',    daily: true  },
  { key: '1day',   label: '1 day before',     daily: true  },
  { key: '4hours', label: '4 hours before',   daily: false },
  { key: '1hour',  label: '1 hour before',    daily: false },
  { key: '30min',  label: '30 minutes before',daily: false },
];

const EMPTY_FORM = {
  title: '',
  meeting_date: '',
  location: '',
  notes: '',
  client_id: '',
  job_id: '',
  reminders: [],
};

export default function MeetingForm({ meeting, onSave, onClose, currentUserId }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Populate form when editing an existing meeting
  useEffect(() => {
    if (meeting) {
      // Convert stored UTC timestamp to local datetime-local input value
      const localDt = meeting.meeting_date
        ? new Date(meeting.meeting_date).toLocaleString('sv-SE', { timeZoneName: undefined }).slice(0, 16)
        : '';
      setForm({
        title:        meeting.title || '',
        meeting_date: localDt,
        location:     meeting.location || '',
        notes:        meeting.notes || '',
        client_id:    meeting.client_id || '',
        job_id:       meeting.job_id || '',
        reminders:    meeting.reminders || [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [meeting]);

  // Load client and job lists
  useEffect(() => {
    async function loadOptions() {
      const [{ data: c }, { data: j }] = await Promise.all([
        supabase.from('clients').select('id, client_name').order('client_name'),
        supabase.from('job_register').select('id, title, status, clients(client_name)').not('status', 'in', '(completed,cancelled)').order('title'),
      ]);
      setClients(c || []);
      setJobs(j || []);
    }
    loadOptions();
  }, []);

  const toggleReminder = (key) => {
    setForm(prev => ({
      ...prev,
      reminders: prev.reminders.includes(key)
        ? prev.reminders.filter(r => r !== key)
        : [...prev.reminders, key],
    }));
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.meeting_date)  { setError('Date and time are required.'); return; }

    setSaving(true);
    try {
      const payload = {
        title:        form.title.trim(),
        meeting_date: new Date(form.meeting_date).toISOString(),
        location:     form.location.trim() || null,
        notes:        form.notes.trim() || null,
        client_id:    form.client_id || null,
        job_id:       form.job_id || null,
        reminders:    form.reminders,
        updated_at:   new Date().toISOString(),
      };

      let result;
      if (meeting?.id) {
        // Reset reminders_sent only for offsets that were re-added (if meeting time changed)
        const timeChanged = meeting.meeting_date !== payload.meeting_date;
        if (timeChanged) payload.reminders_sent = [];

        const { data, error: upErr } = await supabase
          .from('meetings').update(payload).eq('id', meeting.id).select().single();
        if (upErr) throw upErr;
        result = data;
      } else {
        payload.created_by = currentUserId;
        payload.reminders_sent = [];
        const { data, error: insErr } = await supabase
          .from('meetings').insert(payload).select().single();
        if (insErr) throw insErr;
        result = data;
      }

      onSave(result);
    } catch (err) {
      setError(err.message || 'Failed to save meeting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            {meeting?.id ? 'Edit Meeting' : 'New Meeting'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="e.g. SARS Visit — Annual Tax"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date &amp; Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.meeting_date}
              onChange={e => handleChange('meeting_date', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-3.5 h-3.5" /> Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={e => handleChange('location', e.target.value)}
              placeholder="e.g. SARS Doringpoort"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Client */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
              <Users className="w-3.5 h-3.5" /> Client
            </label>
            <select
              value={form.client_id}
              onChange={e => handleChange('client_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— No client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.client_name}</option>
              ))}
            </select>
          </div>

          {/* Job */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="w-3.5 h-3.5" /> Linked Job
            </label>
            <select
              value={form.job_id}
              onChange={e => handleChange('job_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— No job —</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.title}{j.clients?.client_name ? ` — ${j.clients.client_name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Reminders */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <Bell className="w-3.5 h-3.5" /> Remind me
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REMINDER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleReminder(opt.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
                    form.reminders.includes(opt.key)
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                    form.reminders.includes(opt.key)
                      ? 'bg-white border-white'
                      : 'border-gray-300'
                  }`}>
                    {form.reminders.includes(opt.key) && (
                      <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Daily reminders (week/days/day) fire at 6am. Hourly reminders fire at the top of each hour.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : meeting?.id ? 'Save Changes' : 'Create Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
