import React, { useEffect, useMemo, useState } from 'react';
import { Square, Clock } from 'lucide-react';
import { useTimer } from '../contexts/TimerContext';

const formatElapsed = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
};

export default function GlobalTimerCard() {
  const { activeTimer, stopTimer } = useTimer();
  const [elapsed, setElapsed] = useState(0);

  const startTime = useMemo(() => {
    if (!activeTimer?.start_time) return null;
    const d = new Date(activeTimer.start_time);
    return Number.isFinite(d.getTime()) ? d : null;
  }, [activeTimer?.start_time]);

  useEffect(() => {
    if (!startTime) return;

    const tick = () => {
      const now = new Date();
      setElapsed(Math.floor((now - startTime) / 1000));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  if (!activeTimer) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="overdue-pulse bg-red-600 border-2 border-red-700 shadow-lg rounded-2xl w-[320px]">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-white tracking-wide uppercase">Timer Running</div>
                <div className="text-xs text-white/90">
                  {activeTimer.clients?.client_name || 'Client'}
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                try {
                  await stopTimer();
                } catch (e) {
                  console.error(e);
                  alert('Failed to stop timer');
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-red-700 text-sm font-extrabold hover:bg-red-50 border-2 border-white"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          </div>

          <div className="mt-3 text-2xl font-extrabold text-white tabular-nums">
            {formatElapsed(elapsed)}
          </div>
        </div>
      </div>
    </div>
  );
}
