import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFocus } from '../contexts/FocusContext';
import { useTimer } from '../contexts/TimerContext';
import { useToast } from './Toast';
import supabase from '../lib/SupabaseClient';
import {
  Target,
  Clock,
  Pause,
  Play,
  Square,
  Plus,
  Zap,
  Mail,
  MailOpen,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Timer,
  Inbox,
  ChevronDown,
  ChevronUp,
  X,
  Briefcase,
  RotateCcw,
  Trash2
} from 'lucide-react';
import InterruptInbox from './InterruptInbox';

const formatCountdown = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const DURATION_OPTIONS = [
  { value: 25, label: '25 min', description: 'Short sprint' },
  { value: 45, label: '45 min', description: 'Standard block' },
  { value: 60, label: '60 min', description: 'Deep work' },
  { value: 90, label: '90 min', description: 'Extended focus' },
];

const URGENCY_OPTIONS = [
  { value: 'now', label: 'Right now', color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'today', label: 'Today', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'this_week', label: 'This week', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'someday', label: 'Someday', color: 'text-gray-600 bg-gray-50 border-gray-200' },
];

export default function FocusSession() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    focusSession, focusMode, secondsLeft,
    startFocusSession, extendFocusSession, completeFocusSession, parkFocusSession,
    interrupts, interruptCount, captureInterrupt,
    nowTask, nextTasks,
    emailWindows, emailWindowOpen,
    onFocusEndingRef, onFocusEndedRef,
    parkedSessions, resumeParkedSession, abandonParkedSession
  } = useFocus();

  const { activeTimer, timerReminderCallbackRef } = useTimer();
  const toast = useToast();

  // Start form state
  const [showStartForm, setShowStartForm] = useState(false);
  const [formTask, setFormTask] = useState('');
  const [formNextAction, setFormNextAction] = useState('');
  const [formDuration, setFormDuration] = useState(45);
  const [formClient, setFormClient] = useState('');
  const [starting, setStarting] = useState(false);

  // Quick capture state
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [captureSubject, setCaptureSubject] = useState('');
  const [captureClient, setCaptureClient] = useState('');
  const [captureUrgency, setCaptureUrgency] = useState('today');
  const [captureNextAction, setCaptureNextAction] = useState('');
  const [captureSource, setCaptureSource] = useState('email');
  const [capturing, setCapturing] = useState(false);

  // Show interrupt inbox
  const [showInbox, setShowInbox] = useState(false);

  // Focus ending prompt
  const [showEndPrompt, setShowEndPrompt] = useState(false);

  // Job picker state
  const [activeJobs, setActiveJobs] = useState([]);
  const [formJobId, setFormJobId] = useState('');

  // Load active jobs for picker
  useEffect(() => {
    const loadJobs = async () => {
      const { data } = await supabase
        .from('job_register')
        .select('id, title, client_id, clients(client_name)')
        .not('status', 'in', '("completed","cancelled")')
        .order('date_due', { ascending: true, nullsFirst: false });
      setActiveJobs(data || []);
    };
    loadJobs();
  }, []);

  // Pre-fill from URL params (when coming from Job Register "Focus on this")
  useEffect(() => {
    const jobId = searchParams.get('jobId');
    if (jobId && activeJobs.length > 0) {
      const job = activeJobs.find(j => j.id === jobId);
      if (job) {
        setFormJobId(jobId);
        setFormTask(job.title || '');
        setFormClient(job.clients?.client_name || '');
        setShowStartForm(true);
      }
      // Clear params so refresh doesn't re-trigger
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, activeJobs, setSearchParams]);

  // Register toast-based timer reminder
  useEffect(() => {
    if (timerReminderCallbackRef) {
      timerReminderCallbackRef.current = ({ clientName, stopTimer }) => {
        toast.warning(`Timer still running for ${clientName}`, {
          title: 'Timer Check',
          duration: 0,
          action: {
            label: 'Stop Timer',
            onClick: () => {
              stopTimer().catch(e => console.error(e));
            }
          }
        });
      };
    }
    return () => {
      if (timerReminderCallbackRef) {
        timerReminderCallbackRef.current = null;
      }
    };
  }, [timerReminderCallbackRef, toast]);

  // Register focus ending / ended callbacks
  useEffect(() => {
    onFocusEndingRef.current = ({ minutesLeft, taskDescription }) => {
      toast.warning(`${minutesLeft} minutes left on: ${taskDescription}`, {
        title: 'Focus Block Ending',
        duration: 10000
      });
    };

    onFocusEndedRef.current = ({ taskDescription, interruptCount: ic }) => {
      setShowEndPrompt(true);
      toast.info(`Focus block complete. ${ic} interruption${ic !== 1 ? 's' : ''} captured.`, {
        title: 'Time\'s Up!',
        duration: 0
      });
    };

    return () => {
      onFocusEndingRef.current = null;
      onFocusEndedRef.current = null;
    };
  }, [onFocusEndingRef, onFocusEndedRef, toast]);

  // Derived: currently selected job
  const selectedJob = formJobId ? activeJobs.find(j => j.id === formJobId) : null;

  const handleJobSelect = (jobId) => {
    setFormJobId(jobId);
    if (jobId) {
      const job = activeJobs.find(j => j.id === jobId);
      if (job) {
        setFormTask(job.title || '');
        setFormClient(job.clients?.client_name || '');
      }
    }
  };

  const handleStartFocus = async () => {
    if (!formTask.trim() || !formNextAction.trim()) {
      toast.error('Both task description and next physical action are required.');
      return;
    }
    setStarting(true);
    try {
      await startFocusSession({
        taskDescription: formTask.trim(),
        nextAction: formNextAction.trim(),
        durationMinutes: formDuration,
        clientName: formClient.trim() || null,
        clientId: selectedJob?.client_id || null,
        jobId: formJobId || null
      });
      setShowStartForm(false);
      setFormTask('');
      setFormNextAction('');
      setFormClient('');
      setFormJobId('');
      toast.success('Focus session started. Stay on this one task.');
    } catch (e) {
      toast.error(e.message || 'Failed to start focus session');
    } finally {
      setStarting(false);
    }
  };

  const handleQuickCapture = async () => {
    if (!captureSubject.trim()) {
      toast.error('Subject is required.');
      return;
    }
    setCapturing(true);
    try {
      await captureInterrupt({
        source: captureSource,
        clientName: captureClient.trim() || null,
        subject: captureSubject.trim(),
        urgency: captureUrgency,
        nextAction: captureNextAction.trim() || null
      });
      setCaptureSubject('');
      setCaptureClient('');
      setCaptureNextAction('');
      setCaptureUrgency('today');
      setCaptureSource('email');
      setShowQuickCapture(false);
      toast.success('Interruption captured. Back to focus.');
    } catch (e) {
      toast.error(e.message || 'Failed to capture interruption');
    } finally {
      setCapturing(false);
    }
  };

  // Progress percentage
  const progressPercent = focusSession
    ? Math.max(0, Math.min(100, ((focusSession.duration_minutes * 60 - secondsLeft) / (focusSession.duration_minutes * 60)) * 100))
    : 0;

  // Next email window
  const getNextEmailWindow = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    for (const w of emailWindows) {
      const [wh, wm] = w.split(':').map(Number);
      const windowMinutes = wh * 60 + wm;
      if (windowMinutes > currentMinutes) return w;
    }
    return emailWindows[0] + ' (tomorrow)';
  };

  const pendingInterrupts = interrupts.filter(i => i.status === 'pending');

  return (
    <div className="space-y-6 animate-page-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-7 h-7 text-blue-600" />
            Focus Mode
          </h1>
          <p className="text-gray-600 mt-1">One task at a time. Capture interruptions, don't act on them.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Email window indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            emailWindowOpen
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-gray-50 text-gray-600 border border-gray-200'
          }`}>
            {emailWindowOpen ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            {emailWindowOpen ? 'Email window open' : `Email at ${getNextEmailWindow()}`}
          </div>

          {/* Interrupt Inbox button */}
          <button
            onClick={() => setShowInbox(!showInbox)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Inbox className="w-4 h-4" />
            Inbox
            {pendingInterrupts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pendingInterrupts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Focus Session */}
      {focusSession && focusMode === 'focus' && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-lg overflow-hidden">
          {/* Progress bar */}
          <div className="h-2 bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between">
              {/* Task info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    <Zap className="w-3 h-3" />
                    FOCUSING
                  </span>
                  {focusSession.client_name && (
                    <span className="text-xs text-gray-500">
                      {focusSession.client_name}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-2">
                  {focusSession.task_description}
                </h2>
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <ArrowRight className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Next action:</span>
                  <span>{focusSession.next_action}</span>
                </div>
              </div>

              {/* Countdown */}
              <div className="text-right ml-6">
                <div className={`text-4xl font-extrabold tabular-nums ${
                  secondsLeft <= 300 ? 'text-red-600' : secondsLeft <= 600 ? 'text-orange-500' : 'text-blue-600'
                }`}>
                  {formatCountdown(secondsLeft)}
                </div>
                <p className="text-xs text-gray-500 mt-1">remaining</p>
              </div>
            </div>

            {/* Session stats & actions */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  {interruptCount} interruption{interruptCount !== 1 ? 's' : ''} captured
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Quick Capture — the most important button */}
                <button
                  onClick={() => setShowQuickCapture(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Capture Interruption
                </button>

                <button
                  onClick={extendFocusSession}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  +10 min
                </button>

                <button
                  onClick={parkFocusSession}
                  className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  Park
                </button>

                <button
                  onClick={completeFocusSession}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End prompt modal - when focus block expires */}
      {showEndPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Timer className="w-5 h-5 text-blue-600" />
              Focus Block Complete
            </h3>
            <p className="text-gray-600 mt-2 text-sm">
              You captured {interruptCount} interruption{interruptCount !== 1 ? 's' : ''}. What now?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowEndPrompt(false);
                  completeFocusSession();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Task Complete — Well done
              </button>
              <button
                onClick={() => {
                  setShowEndPrompt(false);
                  extendFocusSession(10);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
              >
                <Plus className="w-4 h-4" />
                Extend 10 more minutes
              </button>
              <button
                onClick={() => {
                  setShowEndPrompt(false);
                  parkFocusSession();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium"
              >
                <Pause className="w-4 h-4" />
                Park — come back later
              </button>
              {pendingInterrupts.length > 0 && (
                <button
                  onClick={() => {
                    setShowEndPrompt(false);
                    completeFocusSession();
                    setShowInbox(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium"
                >
                  <Inbox className="w-4 h-4" />
                  Done — Process {pendingInterrupts.length} interruption{pendingInterrupts.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No active session — idle state */}
      {!focusSession && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Start Focus Card */}
          <div className="lg:col-span-2">
            {!showStartForm ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Ready to focus?</h2>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  Pick one task, define the next physical action, set a time block. 
                  Everything else goes to the Interrupt Inbox.
                </p>
                <button
                  onClick={() => setShowStartForm(true)}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Start Focus Block
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  New Focus Block
                </h2>

                <div className="space-y-4">
                  {/* Pick a job (optional) */}
                  {activeJobs.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Briefcase className="w-4 h-4 inline mr-1 -mt-0.5" />
                        Link to a job (optional)
                      </label>
                      <select
                        value={formJobId}
                        onChange={(e) => handleJobSelect(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="">— No job / freeform task —</option>
                        {activeJobs.map(job => (
                          <option key={job.id} value={job.id}>
                            {job.title}{job.clients?.client_name ? ` (${job.clients.client_name})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Selecting a job pre-fills the task and client below.</p>
                    </div>
                  )}

                  {/* Task */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      What is the one task?
                    </label>
                    <input
                      type="text"
                      value={formTask}
                      onChange={(e) => setFormTask(e.target.value)}
                      placeholder="e.g. Process ABC Ltd VAT201 return"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  </div>

                  {/* Next physical action */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      What is the next physical action?
                    </label>
                    <input
                      type="text"
                      value={formNextAction}
                      onChange={(e) => setFormNextAction(e.target.value)}
                      placeholder="e.g. Open client file and check turnover figure"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Be specific. Not "Do VAT" but "Open client file on desktop".</p>
                  </div>

                  {/* Client (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client (optional)
                    </label>
                    <input
                      type="text"
                      value={formClient}
                      onChange={(e) => setFormClient(e.target.value)}
                      placeholder="e.g. ABC Holdings (Pty) Ltd"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      How long is this block?
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {DURATION_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setFormDuration(opt.value)}
                          className={`px-3 py-3 rounded-lg border-2 text-center transition-all ${
                            formDuration === opt.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-lg font-bold">{opt.label}</div>
                          <div className="text-xs">{opt.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleStartFocus}
                      disabled={starting}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      {starting ? 'Starting...' : 'Start Focus'}
                    </button>
                    <button
                      onClick={() => setShowStartForm(false)}
                      className="px-4 py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar: quick capture + stats */}
          <div className="space-y-4">
            {/* Parked Sessions */}
            {parkedSessions.length > 0 && (
              <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-5">
                <h3 className="font-semibold text-yellow-800 flex items-center gap-2 mb-3">
                  <Pause className="w-4 h-4" />
                  Parked ({parkedSessions.length})
                </h3>
                <div className="space-y-2">
                  {parkedSessions.map(s => (
                    <div key={s.id} className="bg-white rounded-lg border border-yellow-200 p-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.task_description}</p>
                      {s.client_name && (
                        <p className="text-xs text-gray-500 mt-0.5">{s.client_name}</p>
                      )}
                      {s.next_action && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-green-500" />
                          {s.next_action}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={async () => {
                            try {
                              await resumeParkedSession(s.id);
                              toast.success('Focus session resumed');
                            } catch (e) {
                              toast.error(e.message || 'Failed to resume');
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Resume
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await abandonParkedSession(s.id);
                              toast.info('Session abandoned');
                            } catch (e) {
                              toast.error(e.message || 'Failed to abandon');
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded text-xs transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Capture Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-orange-500" />
                Quick Capture
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Got an interruption? Capture it here instead of acting on it.
              </p>
              <button
                onClick={() => setShowQuickCapture(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Capture Interruption
              </button>
            </div>

            {/* Email Schedule */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-blue-500" />
                Email Windows
              </h3>
              <div className="space-y-2">
                {emailWindows.map((w, i) => {
                  const now = new Date();
                  const [wh, wm] = w.split(':').map(Number);
                  const windowMinutes = wh * 60 + wm;
                  const currentMinutes = now.getHours() * 60 + now.getMinutes();
                  const isPast = currentMinutes > windowMinutes + 15;
                  const isNow = currentMinutes >= windowMinutes && currentMinutes < windowMinutes + 15;

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                        isNow
                          ? 'bg-green-50 text-green-700 font-medium'
                          : isPast
                          ? 'text-gray-400 line-through'
                          : 'text-gray-600'
                      }`}
                    >
                      {isNow ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                      {w}
                      {isNow && <span className="ml-auto text-xs bg-green-200 px-2 py-0.5 rounded-full">NOW</span>}
                    </div>
                  );
                })}
              </div>
              {!emailWindowOpen && (
                <p className="text-xs text-gray-400 mt-3">
                  Use "Capture Interruption" for email thoughts outside these windows.
                </p>
              )}
            </div>

            {/* Pending Interrupts Summary */}
            {pendingInterrupts.length > 0 && (
              <div className="bg-orange-50 rounded-2xl border border-orange-200 p-5">
                <h3 className="font-semibold text-orange-800 flex items-center gap-2 mb-2">
                  <Inbox className="w-4 h-4" />
                  {pendingInterrupts.length} pending interruption{pendingInterrupts.length !== 1 ? 's' : ''}
                </h3>
                <button
                  onClick={() => setShowInbox(true)}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                >
                  Review inbox <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Capture Modal */}
      {showQuickCapture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                Capture Interruption
              </h3>
              <button onClick={() => setShowQuickCapture(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <div className="flex gap-2">
                  {['email', 'phone', 'thought', 'person', 'other'].map(s => (
                    <button
                      key={s}
                      onClick={() => setCaptureSource(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm capitalize border transition-colors ${
                        captureSource === s
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What is it about?</label>
                <input
                  type="text"
                  value={captureSubject}
                  onChange={(e) => setCaptureSubject(e.target.value)}
                  placeholder="e.g. Client re VAT201 query"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  autoFocus
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client (optional)</label>
                <input
                  type="text"
                  value={captureClient}
                  onChange={(e) => setCaptureClient(e.target.value)}
                  placeholder="e.g. ABC Holdings"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Next action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next action (optional)</label>
                <input
                  type="text"
                  value={captureNextAction}
                  onChange={(e) => setCaptureNextAction(e.target.value)}
                  placeholder="e.g. Reply asking for invoice batch"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <div className="grid grid-cols-4 gap-2">
                  {URGENCY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCaptureUrgency(opt.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        captureUrgency === opt.value
                          ? opt.color + ' border-2'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">Captured → back to focus within seconds</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQuickCapture(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickCapture}
                  disabled={capturing}
                  className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
                >
                  {capturing ? 'Saving...' : 'Capture & Return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interrupt Inbox Panel */}
      {showInbox && (
        <InterruptInbox onClose={() => setShowInbox(false)} />
      )}
    </div>
  );
}
