import React, { useState, useRef, useEffect } from 'react';
import { useFocus } from '../contexts/FocusContext';
import { useToast } from './Toast';
import {
  Inbox,
  CheckCircle,
  Clock,
  AlarmClock,
  X,
  Mail,
  Phone,
  Brain,
  User,
  MoreHorizontal,
  ArrowRight,
  Briefcase,
  ChevronDown
} from 'lucide-react';

const SOURCE_ICONS = {
  email: Mail,
  phone: Phone,
  thought: Brain,
  person: User,
  other: MoreHorizontal
};

const URGENCY_BADGES = {
  now: { label: 'Now', className: 'bg-red-100 text-red-700 border-red-200' },
  today: { label: 'Today', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  this_week: { label: 'This week', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  someday: { label: 'Someday', className: 'bg-gray-100 text-gray-600 border-gray-200' }
};

// Snooze options — label, how to compute the target date
const SNOOZE_OPTIONS = [
  { label: '15 minutes',      minutes: 15 },
  { label: '30 minutes',      minutes: 30 },
  { label: '1 hour',          minutes: 60 },
  { label: '2 hours',         minutes: 120 },
  { label: 'Tomorrow 09:00',  tomorrow: true },
  { label: 'Next Monday 09:00', nextMonday: true }
];

function snoozeUntil(option) {
  const d = new Date();
  if (option.minutes) {
    return new Date(d.getTime() + option.minutes * 60 * 1000);
  }
  if (option.tomorrow) {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  if (option.nextMonday) {
    const day = d.getDay(); // 0=Sun, 1=Mon...
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + daysUntilMonday);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  return d;
}

function SnoozeDropdown({ itemId, onSnooze, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden"
    >
      <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Snooze for…</p>
      {SNOOZE_OPTIONS.map(opt => (
        <button
          key={opt.label}
          onClick={() => onSnooze(itemId, opt)}
          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Age indicator: colour based on how long item has been sitting
function ageIndicator(capturedAt, status) {
  if (status === 'deferred') return null; // snoozed items show the alarm time instead
  if (!capturedAt) return null;
  const ageMinutes = (Date.now() - new Date(capturedAt).getTime()) / 60000;
  if (ageMinutes < 60)   return { color: 'bg-green-400',  title: 'Less than 1 hour old' };
  if (ageMinutes < 240)  return { color: 'bg-orange-400', title: `${Math.floor(ageMinutes / 60)}h old` };
  return                        { color: 'bg-red-500',    title: `${Math.floor(ageMinutes / 60)}h old — needs action!` };
}

export default function InterruptInbox({ onClose }) {
  const { interrupts, resolveInterrupt, deferInterrupt, convertInterruptToJob, loadPendingInterrupts } = useFocus();
  const toast = useToast();
  const [filter, setFilter] = useState('pending'); // pending | all | resolved
  const [snoozeOpenId, setSnoozeOpenId] = useState(null);

  const filtered = interrupts.filter(i => {
    if (filter === 'pending') return i.status === 'pending' || i.status === 'deferred';
    if (filter === 'resolved') return i.status === 'resolved' || i.status === 'converted';
    return true;
  });

  const handleResolve = async (id) => {
    try {
      await resolveInterrupt(id);
      toast.success('Interruption resolved');
    } catch (e) {
      toast.error('Failed to resolve');
    }
  };

  const handleSnooze = async (id, option) => {
    setSnoozeOpenId(null);
    const until = snoozeUntil(option);
    try {
      await deferInterrupt(id, until.toISOString());
      toast.info(`Snoozed — reminds you at ${until.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })} (${option.label})`);
    } catch (e) {
      toast.error('Failed to snooze');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) + ' ' +
           d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  };

  const pendingCount = interrupts.filter(i => i.status === 'pending').length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Inbox className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Interrupt Inbox</h3>
            <p className="text-sm text-gray-500">{pendingCount} pending</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[
              { key: 'pending', label: 'Pending' },
              { key: 'resolved', label: 'Resolved' },
              { key: 'all', label: 'All' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {filter === 'pending' ? 'No pending interruptions' : 'No items'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {filter === 'pending' ? 'Use "Capture Interruption" to add items here' : ''}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((item) => {
              const SourceIcon = SOURCE_ICONS[item.source] || MoreHorizontal;
              const urgency = URGENCY_BADGES[item.urgency] || URGENCY_BADGES.today;
              const isResolved = item.status === 'resolved' || item.status === 'converted';

              return (
                <div
                  key={item.id}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                    isResolved ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative ${
                      isResolved ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {isResolved ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <SourceIcon className="w-4 h-4 text-gray-500" />
                      )}
                      {/* Age indicator dot */}
                      {(() => {
                        const dot = !isResolved ? ageIndicator(item.captured_at, item.status) : null;
                        return dot ? (
                          <span
                            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${dot.color}`}
                            title={dot.title}
                          />
                        ) : null;
                      })()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${isResolved ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {item.subject}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${urgency.className}`}>
                          {urgency.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {item.client_name && (
                          <span>{item.client_name}</span>
                        )}
                        <span>{formatTime(item.captured_at)}</span>
                        <span className="capitalize">{item.source}</span>
                      </div>

                      {item.next_action && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                          <ArrowRight className="w-3 h-3 text-green-500" />
                          {item.next_action}
                        </div>
                      )}
                      {item.status === 'deferred' && item.defer_until && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-blue-500">
                          <AlarmClock className="w-3 h-3" />
                          Reminds at {formatTime(item.defer_until)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {!isResolved && (
                      <div className="relative flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={async () => {
                            try {
                              await convertInterruptToJob(item.id);
                              toast.success('Created job in Job Register');
                            } catch (e) {
                              toast.error(e.message || 'Failed to convert');
                            }
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Convert to Job"
                        >
                          <Briefcase className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResolve(item.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          title="Mark resolved"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        {/* Snooze button + dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setSnoozeOpenId(snoozeOpenId === item.id ? null : item.id)}
                            className={`flex items-center gap-0.5 p-2 rounded-lg transition-colors ${
                              snoozeOpenId === item.id
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title="Snooze"
                          >
                            <AlarmClock className="w-4 h-4" />
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {snoozeOpenId === item.id && (
                            <SnoozeDropdown
                              itemId={item.id}
                              onSnooze={handleSnooze}
                              onClose={() => setSnoozeOpenId(null)}
                            />
                          )}
                        </div>
                      </div>
                    )}
                    {item.status === 'converted' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 text-xs font-medium rounded-full">
                        <Briefcase className="w-3 h-3" /> Job created
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
