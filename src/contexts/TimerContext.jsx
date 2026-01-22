import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import supabase from '../lib/SupabaseClient';

const TimerContext = createContext(null);

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within a TimerProvider');
  return ctx;
};

export const TimerProvider = ({ children }) => {
  const [consultant, setConsultant] = useState(null);
  const [activeTimer, setActiveTimer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerPaused, setTimerPaused] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);
  const reminderPromptOpenRef = useRef(false);

  const loadConsultant = async () => {
    // DEV MODE: AuthContext uses a stub user id that doesn't match consultants.
    // Keep behavior consistent with TimesheetSimple: use the first consultant row.
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.warn('TimerContext: failed to load consultant:', error);
      setConsultant(null);
      return null;
    }

    setConsultant(data);
    return data;
  };

  const fetchClientName = async (clientId) => {
    if (!clientId) return null;
    const { data, error } = await supabase
      .from('clients')
      .select('id, client_name')
      .eq('id', clientId)
      .single();

    if (error) return null;
    return data;
  };

  const refreshActiveTimer = async () => {
    setLoading(true);
    try {
      const c = consultant || (await loadConsultant());
      if (!c?.id) {
        setActiveTimer(null);
        return null;
      }

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('consultant_id', c.id)
        .eq('timer_active', true)
        .order('start_time', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('TimerContext: failed to load active timer:', error);
        setActiveTimer(null);
        return null;
      }

      const row = (data || [])[0] || null;
      if (!row) {
        setActiveTimer(null);
        return null;
      }

      const client = await fetchClientName(row.client_id);
      const enriched = {
        ...row,
        clients: client ? { id: client.id, client_name: client.client_name } : null,
        consultants: { first_name: c.first_name, last_name: c.last_name }
      };

      setActiveTimer(enriched);
      setTimerPaused(row.is_paused || false);
      return enriched;
    } finally {
      setLoading(false);
    }
  };

  const startTimer = async ({ client, clientId, projectId = null, description, hourlyRate = null }) => {
    if (activeTimer) {
      throw new Error('A timer is already running. Please stop it first.');
    }

    const c = consultant || (await loadConsultant());
    if (!c?.id) throw new Error('No consultant found for timer');

    const resolvedClientId = clientId || client?.id;
    if (!resolvedClientId) throw new Error('Client is required to start a timer');

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        client_id: resolvedClientId,
        project_id: projectId || null,
        consultant_id: c.id,
        entry_date: new Date().toISOString().split('T')[0],
        description,
        hourly_rate: hourlyRate || null,
        start_time: new Date().toISOString(),
        timer_active: true,
        duration_hours: 0,
        status: 'draft',
        is_billable: true
      })
      .select()
      .single();

    if (error) throw error;

    // Enrich immediately for UI (no PostgREST embeds).
    const clientInfo = client?.client_name
      ? { id: resolvedClientId, client_name: client.client_name }
      : await fetchClientName(resolvedClientId);

    const enriched = {
      ...data,
      clients: clientInfo ? { id: clientInfo.id, client_name: clientInfo.client_name } : null,
      consultants: { first_name: c.first_name, last_name: c.last_name }
    };

    setActiveTimer(enriched);
    return enriched;
  };

  const stopTimer = async () => {
    if (!activeTimer?.id || !activeTimer?.start_time) return;

    const start = new Date(activeTimer.start_time);
    const end = new Date();
    const hours = ((end - start) / (1000 * 60 * 60)).toFixed(2);

    const { error } = await supabase
      .from('time_entries')
      .update({
        end_time: end.toISOString(),
        duration_hours: hours,
        timer_active: false
      })
      .eq('id', activeTimer.id);

    if (error) throw error;

    setActiveTimer(null);
    setTimerPaused(false);
    setPausedTime(0);
  };

  const pauseTimer = async () => {
    if (!activeTimer?.id) return;

    const { error } = await supabase
      .from('time_entries')
      .update({
        paused_at: new Date().toISOString(),
        is_paused: true
      })
      .eq('id', activeTimer.id);

    if (error) throw error;

    setTimerPaused(true);
  };

  const resumeTimer = async () => {
    if (!activeTimer?.id) return;

    const { error } = await supabase
      .from('time_entries')
      .update({
        resumed_at: new Date().toISOString(),
        is_paused: false
      })
      .eq('id', activeTimer.id);

    if (error) throw error;

    setTimerPaused(false);
  };

  useEffect(() => {
    // Initial load
    (async () => {
      await loadConsultant();
      await refreshActiveTimer();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Warn on tab close/refresh when a timer is running.
    // Note: browsers show a generic message; custom text is ignored.
    const onBeforeUnload = (e) => {
      if (!activeTimer?.id) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [activeTimer?.id]);

  useEffect(() => {
    // Every 30 minutes while a timer is running, ask if it should keep running.
    if (!activeTimer?.id || !activeTimer?.start_time) return;

    const startMs = new Date(activeTimer.start_time).getTime();
    if (!Number.isFinite(startMs)) return;

    const INTERVAL_MS = 30 * 60 * 1000;

    const ask = async () => {
      if (!activeTimer?.id) return;
      if (reminderPromptOpenRef.current) return;
      reminderPromptOpenRef.current = true;
      try {
        const clientName = activeTimer.clients?.client_name || 'this client';
        const keepRunning = window.confirm(
          `Timer is still running for ${clientName}.\n\nOK = keep running\nCancel = stop timer`
        );

        if (!keepRunning) {
          try {
            await stopTimer();
          } catch (e) {
            console.error(e);
            alert('Failed to stop timer');
          }
        }
      } finally {
        reminderPromptOpenRef.current = false;
      }
    };

    // Align the first prompt to the next 30-minute boundary since start.
    const elapsed = Date.now() - startMs;
    const remaining = INTERVAL_MS - (elapsed % INTERVAL_MS);
    const timeoutId = setTimeout(() => {
      ask();
    }, Math.max(1000, remaining));

    const intervalId = setInterval(() => {
      ask();
    }, INTERVAL_MS);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [activeTimer?.id, activeTimer?.start_time]);

  const value = useMemo(
    () => ({
      consultant,
      activeTimer,
      timerPaused,
      loading,
      refreshActiveTimer,
      startTimer,
      stopTimer,
      pauseTimer,
      resumeTimer
    }),
    [consultant, activeTimer, timerPaused, loading]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export default TimerContext;
