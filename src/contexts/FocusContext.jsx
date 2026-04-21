import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import supabase from '../lib/SupabaseClient';
import { useAuth } from './AuthContext';

const FocusContext = createContext(null);

export const useFocus = () => {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus must be used within a FocusProvider');
  return ctx;
};

// WIP limit: max tasks in "now" slot
const WIP_LIMIT_NOW = 1;
const WIP_LIMIT_NEXT = 2;

export const FocusProvider = ({ children }) => {
  const { user } = useAuth();
  // Focus session state
  const [focusSession, setFocusSession] = useState(null); // { id, task_description, next_action, duration_minutes, started_at, ends_at, client_name, client_id }
  const [focusMode, setFocusMode] = useState('idle'); // idle | focus | review | email-window
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [interrupts, setInterrupts] = useState([]);
  const [interruptCount, setInterruptCount] = useState(0);

  // Email window schedule (default windows)
  const [emailWindows] = useState(['08:30', '11:00', '14:00', '16:30']);
  const [emailWindowOpen, setEmailWindowOpen] = useState(false);

  // WIP slots
  const [nowTask, setNowTask] = useState(null);
  const [nextTasks, setNextTasks] = useState([]);

  // Parked sessions
  const [parkedSessions, setParkedSessions] = useState([]);

  // Callback for focus ending notifications
  const onFocusEndingRef = useRef(null);
  const onFocusEndedRef = useRef(null);
  const countdownRef = useRef(null);

  // ---------- Focus Session ----------

  const startFocusSession = useCallback(async ({ taskDescription, nextAction, durationMinutes, clientName, clientId, jobId }) => {
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    // Persist to DB
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({
        task_description: taskDescription,
        next_action: nextAction,
        duration_minutes: durationMinutes,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        client_name: clientName || null,
        client_id: clientId || null,
        job_id: jobId || null,
        status: 'active',
        interruptions_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    const session = {
      id: data.id,
      task_description: taskDescription,
      next_action: nextAction,
      duration_minutes: durationMinutes,
      started_at: now,
      ends_at: endsAt,
      client_name: clientName,
      client_id: clientId,
      job_id: jobId
    };

    setFocusSession(session);
    setFocusMode('focus');
    setSecondsLeft(durationMinutes * 60);
    setInterruptCount(0);

    // Set as "now" task
    setNowTask({
      description: taskDescription,
      nextAction: nextAction,
      clientName: clientName,
      focusSessionId: data.id
    });

    return session;
  }, []);

  const extendFocusSession = useCallback(async (extraMinutes = 10) => {
    if (!focusSession?.id) return;

    const newEndsAt = new Date(focusSession.ends_at.getTime() + extraMinutes * 60 * 1000);

    await supabase
      .from('focus_sessions')
      .update({
        ends_at: newEndsAt.toISOString(),
        duration_minutes: focusSession.duration_minutes + extraMinutes
      })
      .eq('id', focusSession.id);

    setFocusSession(prev => ({
      ...prev,
      ends_at: newEndsAt,
      duration_minutes: prev.duration_minutes + extraMinutes
    }));
    setSecondsLeft(prev => prev + extraMinutes * 60);
  }, [focusSession]);

  const completeFocusSession = useCallback(async () => {
    if (!focusSession?.id) return;

    await supabase
      .from('focus_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        interruptions_count: interruptCount
      })
      .eq('id', focusSession.id);

    // Count pending interrupts and nudge the user if any are waiting
    const pending = interrupts.filter(i => i.status === 'pending' || i.status === 'deferred');
    if (pending.length > 0 && user?.id) {
      try {
        await fetch('/api/push-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            title: `✅ Focus session done — ${pending.length} item${pending.length > 1 ? 's' : ''} in your inbox`,
            body: pending.length === 1
              ? `Don't forget: ${pending[0].subject}`
              : `Time to triage: ${pending.map(i => i.subject).slice(0, 3).join(', ')}${pending.length > 3 ? '...' : ''}`,
            url: '/focus',
            tag: 'session-complete-nudge',
            requireInteraction: false
          })
        });
      } catch {
        // Non-fatal — session is still marked complete
      }
    }

    setFocusSession(null);
    setFocusMode('idle');
    setSecondsLeft(0);
    setNowTask(null);
  }, [focusSession, interruptCount, interrupts, user]);

  const parkFocusSession = useCallback(async () => {
    if (!focusSession?.id) return;

    await supabase
      .from('focus_sessions')
      .update({
        status: 'parked',
        completed_at: new Date().toISOString(),
        interruptions_count: interruptCount
      })
      .eq('id', focusSession.id);

    setFocusSession(null);
    setFocusMode('idle');
    setSecondsLeft(0);
    setNowTask(null);
  }, [focusSession, interruptCount]);

  // ---------- Interruptions ----------

  const captureInterrupt = useCallback(async ({ source, clientName, subject, urgency, nextAction }) => {
    const { data, error } = await supabase
      .from('interrupt_inbox')
      .insert({
        source: source || 'manual',
        client_name: clientName || null,
        subject,
        urgency: urgency || 'today',
        next_action: nextAction || null,
        focus_session_id: focusSession?.id || null,
        user_id: user?.id || null,
        status: 'pending',
        captured_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    setInterrupts(prev => [data, ...prev]);
    setInterruptCount(prev => prev + 1);

    // Update session interrupt count
    if (focusSession?.id) {
      await supabase
        .from('focus_sessions')
        .update({ interruptions_count: interruptCount + 1 })
        .eq('id', focusSession.id);
    }

    return data;
  }, [focusSession, interruptCount]);

  const resolveInterrupt = useCallback(async (interruptId) => {
    await supabase
      .from('interrupt_inbox')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', interruptId);

    setInterrupts(prev => prev.map(i => i.id === interruptId ? { ...i, status: 'resolved' } : i));
  }, []);

  const deferInterrupt = useCallback(async (interruptId, deferUntil) => {
    await supabase
      .from('interrupt_inbox')
      .update({ status: 'deferred', defer_until: deferUntil })
      .eq('id', interruptId);

    setInterrupts(prev => prev.map(i => i.id === interruptId ? { ...i, status: 'deferred', defer_until: deferUntil } : i));
  }, []);

  const loadPendingInterrupts = useCallback(async () => {
    const { data, error } = await supabase
      .from('interrupt_inbox')
      .select('*')
      .in('status', ['pending', 'deferred'])
      .order('captured_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setInterrupts(data);
    }
  }, []);

  const convertInterruptToJob = useCallback(async (interruptId) => {
    const item = interrupts.find(i => i.id === interruptId);
    if (!item) throw new Error('Interruption not found');

    // Create a new job in job_register
    const { data: job, error: jobError } = await supabase
      .from('job_register')
      .insert({
        title: item.subject,
        description: item.next_action ? `Next action: ${item.next_action}` : null,
        status: 'not_started',
        priority: item.urgency === 'now' ? 'urgent' : item.urgency === 'today' ? 'high' : item.urgency === 'this_week' ? 'medium' : 'low',
        category: 'general'
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Mark interrupt as converted
    await supabase
      .from('interrupt_inbox')
      .update({ status: 'converted', resolved_at: new Date().toISOString() })
      .eq('id', interruptId);

    setInterrupts(prev => prev.map(i => i.id === interruptId ? { ...i, status: 'converted' } : i));

    return job;
  }, [interrupts]);

  // ---------- Parked Sessions ----------

  const loadParkedSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('status', 'parked')
      .order('completed_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setParkedSessions(data);
    }
  }, []);

  const resumeParkedSession = useCallback(async (sessionId) => {
    const session = parkedSessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Parked session not found');
    if (focusSession) throw new Error('Finish or park your current focus session first.');

    const now = new Date();
    const durationMinutes = session.duration_minutes;
    const endsAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    await supabase
      .from('focus_sessions')
      .update({
        status: 'active',
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        completed_at: null
      })
      .eq('id', sessionId);

    const resumed = {
      id: session.id,
      task_description: session.task_description,
      next_action: session.next_action,
      duration_minutes: durationMinutes,
      started_at: now,
      ends_at: endsAt,
      client_name: session.client_name,
      client_id: session.client_id,
      job_id: session.job_id
    };

    setFocusSession(resumed);
    setFocusMode('focus');
    setSecondsLeft(durationMinutes * 60);
    setInterruptCount(session.interruptions_count || 0);
    setParkedSessions(prev => prev.filter(s => s.id !== sessionId));
    setNowTask({
      description: session.task_description,
      nextAction: session.next_action,
      clientName: session.client_name,
      focusSessionId: session.id
    });

    return resumed;
  }, [parkedSessions, focusSession]);

  const abandonParkedSession = useCallback(async (sessionId) => {
    await supabase
      .from('focus_sessions')
      .update({ status: 'abandoned' })
      .eq('id', sessionId);

    setParkedSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  // ---------- WIP Management ----------

  const promoteToNow = useCallback((task) => {
    if (nowTask && focusSession) {
      throw new Error('Finish or park your current focus task before starting a new one.');
    }
    setNowTask(task);
    setNextTasks(prev => prev.filter(t => t.id !== task.id));
  }, [nowTask, focusSession]);

  const addToNext = useCallback((task) => {
    if (nextTasks.length >= WIP_LIMIT_NEXT) {
      throw new Error(`Next queue is full (max ${WIP_LIMIT_NEXT}). Finish something first.`);
    }
    setNextTasks(prev => [...prev, task]);
  }, [nextTasks]);

  const clearNow = useCallback(() => {
    setNowTask(null);
  }, []);

  // ---------- Email Window Check ----------

  useEffect(() => {
    const checkEmailWindow = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Check if we're within 15 minutes of any email window
      const isNearWindow = emailWindows.some(window => {
        const [wh, wm] = window.split(':').map(Number);
        const windowMinutes = wh * 60 + wm;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        return currentMinutes >= windowMinutes && currentMinutes < windowMinutes + 15;
      });

      setEmailWindowOpen(isNearWindow);
    };

    checkEmailWindow();
    const id = setInterval(checkEmailWindow, 60 * 1000);
    return () => clearInterval(id);
  }, [emailWindows]);

  // ---------- Countdown Timer ----------

  useEffect(() => {
    if (focusMode !== 'focus' || !focusSession) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    countdownRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1;

        // 5-minute warning
        if (next === 300 && onFocusEndingRef.current) {
          onFocusEndingRef.current({
            minutesLeft: 5,
            taskDescription: focusSession.task_description
          });
        }

        // Time's up
        if (next <= 0) {
          if (onFocusEndedRef.current) {
            onFocusEndedRef.current({
              taskDescription: focusSession.task_description,
              interruptCount
            });
          }
          clearInterval(countdownRef.current);
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [focusMode, focusSession, interruptCount]);

  // Load pending interrupts on mount
  useEffect(() => {
    loadPendingInterrupts();
  }, [loadPendingInterrupts]);

  // Load parked sessions on mount
  useEffect(() => {
    loadParkedSessions();
  }, [loadParkedSessions]);

  const value = useMemo(
    () => ({
      // Focus session
      focusSession,
      focusMode,
      secondsLeft,
      startFocusSession,
      extendFocusSession,
      completeFocusSession,
      parkFocusSession,

      // Interrupts
      interrupts,
      interruptCount,
      captureInterrupt,
      resolveInterrupt,
      deferInterrupt,
      convertInterruptToJob,
      loadPendingInterrupts,

      // WIP
      nowTask,
      nextTasks,
      promoteToNow,
      addToNext,
      clearNow,
      WIP_LIMIT_NOW,
      WIP_LIMIT_NEXT,

      // Parked sessions
      parkedSessions,
      loadParkedSessions,
      resumeParkedSession,
      abandonParkedSession,

      // Email windows
      emailWindows,
      emailWindowOpen,

      // Callbacks for notifications
      onFocusEndingRef,
      onFocusEndedRef
    }),
    [focusSession, focusMode, secondsLeft, interrupts, interruptCount,
     nowTask, nextTasks, emailWindowOpen, emailWindows, parkedSessions,
     startFocusSession, extendFocusSession, completeFocusSession, parkFocusSession,
     captureInterrupt, resolveInterrupt, deferInterrupt, convertInterruptToJob, loadPendingInterrupts,
     loadParkedSessions, resumeParkedSession, abandonParkedSession,
     promoteToNow, addToNext, clearNow]
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
};

export default FocusContext;
