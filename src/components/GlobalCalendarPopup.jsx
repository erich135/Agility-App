import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, CalendarClock, Briefcase, MapPin, Users, Clock, FileText, Tag, AlertCircle } from 'lucide-react';
import supabase from '../lib/SupabaseClient';

// ─── Colour coding ───────────────────────────────────────────────────────────
// Meetings: blue dots / pills
// Job deadlines: red (overdue), orange (today/tomorrow), yellow (≤7 days), green (>7 days)

function getJobUrgencyColor(dateDue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateDue);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return { dot: 'bg-red-500',    pill: 'bg-red-100 text-red-700',    label: 'Overdue' };
  if (diffDays === 0)return { dot: 'bg-orange-500',  pill: 'bg-orange-100 text-orange-700', label: 'Due today' };
  if (diffDays === 1)return { dot: 'bg-orange-400',  pill: 'bg-orange-50 text-orange-600',  label: 'Due tomorrow' };
  if (diffDays <= 7) return { dot: 'bg-yellow-500',  pill: 'bg-yellow-100 text-yellow-700', label: `Due in ${diffDays}d` };
  return               { dot: 'bg-green-500',   pill: 'bg-green-100 text-green-700',   label: `Due ${diffDays}d` };
}

function sameDay(a, b) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Detail popup (shown when user clicks a meeting or job card/pill) ─────────

function DetailPopup({ item, type, onClose }) {
  if (!item) return null;

  const isMeeting = type === 'meeting';
  const urg = isMeeting ? null : getJobUrgencyColor(item.date_due);

  const formatDateTime = (iso) =>
    new Date(iso).toLocaleString('en-ZA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-ZA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header stripe */}
        <div className={`px-6 py-4 flex items-start justify-between gap-3 ${isMeeting ? 'bg-blue-600' : 'bg-slate-700'}`}>
          <div className="flex items-center gap-3 min-w-0">
            {isMeeting
              ? <CalendarClock className="w-5 h-5 text-white flex-shrink-0" />
              : <Briefcase      className="w-5 h-5 text-white flex-shrink-0" />
            }
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-0.5">
                {isMeeting ? 'Meeting' : 'Job Deadline'}
              </p>
              <h3 className="text-lg font-bold text-white leading-snug">{item.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Meeting fields */}
          {isMeeting && (
            <>
              <Row icon={<Clock className="w-4 h-4 text-blue-500" />} label="Date & Time">
                {formatDateTime(item.meeting_date)}
              </Row>
              {item.location && (
                <Row icon={<MapPin className="w-4 h-4 text-blue-500" />} label="Location">
                  {item.location}
                </Row>
              )}
              {item.clients?.client_name && (
                <Row icon={<Users className="w-4 h-4 text-blue-500" />} label="Client">
                  {item.clients.client_name}
                </Row>
              )}
              {item.job_register?.title && (
                <Row icon={<Briefcase className="w-4 h-4 text-blue-500" />} label="Linked Job">
                  {item.job_register.title}
                  {item.job_register.clients?.client_name
                    ? ` — ${item.job_register.clients.client_name}`
                    : ''}
                </Row>
              )}
              {item.notes && (
                <Row icon={<FileText className="w-4 h-4 text-blue-500" />} label="Notes">
                  <span className="whitespace-pre-wrap">{item.notes}</span>
                </Row>
              )}
              {item.reminders?.length > 0 && (
                <Row icon={<AlertCircle className="w-4 h-4 text-blue-500" />} label="Reminders">
                  {item.reminders.join(', ')}
                </Row>
              )}
            </>
          )}

          {/* Job deadline fields */}
          {!isMeeting && (
            <>
              <Row icon={<Clock className="w-4 h-4 text-slate-500" />} label="Due Date">
                <span className="font-medium">{formatDate(item.date_due)}</span>
                <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${urg.pill}`}>
                  {urg.label}
                </span>
              </Row>
              {item.clients?.client_name && (
                <Row icon={<Users className="w-4 h-4 text-slate-500" />} label="Client">
                  {item.clients.client_name}
                </Row>
              )}
              {item.status && (
                <Row icon={<Tag className="w-4 h-4 text-slate-500" />} label="Status">
                  <span className="capitalize">{item.status.replace(/_/g, ' ')}</span>
                </Row>
              )}
              {item.category && (
                <Row icon={<Briefcase className="w-4 h-4 text-slate-500" />} label="Category">
                  <span className="capitalize">{item.category}</span>
                </Row>
              )}
              {item.description && (
                <Row icon={<FileText className="w-4 h-4 text-slate-500" />} label="Description">
                  <span className="whitespace-pre-wrap">{item.description}</span>
                </Row>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <div className="text-sm text-gray-800">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GlobalCalendarPopup({ onClose }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings,    setMeetings]    = useState([]);
  const [jobs,        setJobs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [detailItem,  setDetailItem]  = useState(null); // { item, type: 'meeting'|'job' }

  // ── Load data ───────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: m }, { data: j }] = await Promise.all([
      supabase
        .from('meetings')
        .select('id, title, meeting_date, location, notes, reminders, clients(client_name), job_register(title, clients(client_name))')
        .order('meeting_date'),
      supabase
        .from('job_register')
        .select('id, title, date_due, status, category, description, clients(client_name)')
        .not('status', 'in', '(completed,cancelled)')
        .not('date_due', 'is', null)
        .order('date_due'),
    ]);
    setMeetings(m || []);
    setJobs(j || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close on Escape — detail popup first, then calendar
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (detailItem) setDetailItem(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, detailItem]);

  // ── Calendar grid ────────────────────────────────────────────────────────────

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const startCell    = new Date(firstOfMonth);
  startCell.setDate(startCell.getDate() - firstOfMonth.getDay());

  const cells = [];
  const cursor = new Date(startCell);
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const meetingsOnDay = (date) =>
    meetings.filter(m => m.meeting_date && sameDay(new Date(m.meeting_date), date));

  const jobsOnDay = (date) =>
    jobs.filter(j => j.date_due && sameDay(new Date(j.date_due), date));

  const selectedMeetings = selected ? meetingsOnDay(selected) : [];
  const selectedJobs     = selected ? jobsOnDay(selected)     : [];

  const navigateMonth = (dir) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });

  const formatFullDate = (date) =>
    date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const today = new Date();

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <CalendarClock className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Calendar</h2>
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-4 ml-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                Meeting
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
                Job deadline
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Calendar grid (left) ── */}
          <div className="flex-1 p-5 overflow-y-auto min-w-0">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900">
                  {MONTHS[month]} {year}
                </h3>
                <button
                  onClick={() => { setCurrentDate(new Date()); setSelected(new Date()); }}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Today
                </button>
              </div>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
              </div>
            ) : (
              <>
                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 mb-1">
                  {DAYS_SHORT.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Date cells */}
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((date, idx) => {
                    const inMonth  = date.getMonth() === month;
                    const isToday  = sameDay(date, today);
                    const isSel    = selected && sameDay(date, selected);
                    const dayMeets = meetingsOnDay(date);
                    const dayJobs  = jobsOnDay(date);
                    const hasItems = dayMeets.length > 0 || dayJobs.length > 0;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelected(date)}
                        className={`
                          min-h-[70px] p-1.5 rounded-xl cursor-pointer border transition-all
                          ${isSel    ? 'border-blue-400 bg-blue-50 shadow-sm'   : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}
                          ${isToday  ? 'ring-2 ring-blue-500 ring-offset-1'     : ''}
                          ${!inMonth ? 'opacity-30'                             : ''}
                        `}
                      >
                        <div className={`text-sm font-semibold mb-1 ${
                          isToday ? 'text-blue-600' : 'text-gray-800'
                        }`}>
                          {date.getDate()}
                        </div>

                        {/* Dot indicators (max 3 + overflow) */}
                        {hasItems && (
                          <div className="flex flex-wrap gap-0.5">
                            {dayMeets.slice(0, 2).map((_, i) => (
                              <span key={`m${i}`} className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            ))}
                            {dayJobs.slice(0, 2).map((j, i) => {
                              const urg = getJobUrgencyColor(j.date_due);
                              return <span key={`j${i}`} className={`w-2 h-2 rounded-full ${urg.dot} flex-shrink-0`} />;
                            })}
                            {(dayMeets.length + dayJobs.length) > 4 && (
                              <span className="text-[9px] text-gray-400 leading-none">
                                +{dayMeets.length + dayJobs.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Compact event pills on larger screens */}
                        <div className="mt-1 space-y-0.5 hidden lg:block">
                          {dayMeets.slice(0, 1).map(m => (
                            <div
                              key={m.id}
                              onClick={(e) => { e.stopPropagation(); setDetailItem({ item: m, type: 'meeting' }); }}
                              className="text-[10px] bg-blue-100 text-blue-700 rounded px-1 truncate leading-tight py-0.5 cursor-pointer hover:bg-blue-200 transition-colors"
                            >
                              {formatTime(m.meeting_date)} {m.title}
                            </div>
                          ))}
                          {dayJobs.slice(0, 1).map(j => {
                            const urg = getJobUrgencyColor(j.date_due);
                            return (
                              <div
                                key={j.id}
                                onClick={(e) => { e.stopPropagation(); setDetailItem({ item: j, type: 'job' }); }}
                                className={`text-[10px] rounded px-1 truncate leading-tight py-0.5 cursor-pointer hover:opacity-75 transition-opacity ${urg.pill}`}
                              >
                                {j.title}
                              </div>
                            );
                          })}
                          {(dayMeets.length + dayJobs.length) > 2 && (
                            <div className="text-[10px] text-gray-400">
                              +{dayMeets.length + dayJobs.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── Detail panel (right) ── */}
          <div className="w-72 border-l border-gray-100 flex flex-col overflow-hidden bg-gray-50">
            <div className="px-4 py-3 border-b border-gray-100 bg-white">
              <h4 className="text-sm font-semibold text-gray-700">
                {selected ? formatFullDate(selected) : 'Select a date'}
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!selected ? (
                <p className="text-sm text-gray-400 text-center mt-8">Click any date to see its events.</p>
              ) : (selectedMeetings.length === 0 && selectedJobs.length === 0) ? (
                <p className="text-sm text-gray-400 text-center mt-8">Nothing scheduled.</p>
              ) : (
                <>
                  {/* Meetings */}
                  {selectedMeetings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Meetings ({selectedMeetings.length})
                      </p>
                      <div className="space-y-2">
                        {selectedMeetings.map(m => (
                          <div
                            key={m.id}
                            onClick={() => setDetailItem({ item: m, type: 'meeting' })}
                            className="bg-white rounded-xl border border-blue-100 p-3 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                          >
                            <div className="flex items-start gap-2">
                              <CalendarClock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 leading-tight">{m.title}</p>
                                <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(m.meeting_date)}
                                </p>
                                {m.location && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" />
                                    {m.location}
                                  </p>
                                )}
                                {m.clients?.client_name && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <Users className="w-3 h-3" />
                                    {m.clients.client_name}
                                  </p>
                                )}
                                <p className="text-[10px] text-blue-400 mt-1.5">Tap for details →</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Job Deadlines */}
                  {selectedJobs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Job Deadlines ({selectedJobs.length})
                      </p>
                      <div className="space-y-2">
                        {selectedJobs.map(j => {
                          const urg = getJobUrgencyColor(j.date_due);
                          return (
                            <div
                              key={j.id}
                              onClick={() => setDetailItem({ item: j, type: 'job' })}
                              className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
                            >
                              <div className="flex items-start gap-2">
                                <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 leading-tight">{j.title}</p>
                                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 ${urg.pill}`}>
                                    {urg.label}
                                  </span>
                                  {j.clients?.client_name && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                      <Users className="w-3 h-3" />
                                      {j.clients.client_name}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-gray-400 mt-1.5">Tap for details →</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Entry detail popup */}
      {detailItem && (
        <DetailPopup
          item={detailItem.item}
          type={detailItem.type}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}
