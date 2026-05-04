import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  sendTestNotification,
  getPushPermissionState,
  ensurePushSubscription
} from '../services/pushNotifications';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export default function NotificationBell() {
  const { user, isAdmin } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [permState, setPermState] = useState('default');
  const [testSent, setTestSent] = useState(false);
  const [error, setError] = useState(null);
  const [checkRunning, setCheckRunning] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  async function checkSubscription() {
    setLoading(true);
    try {
      const state = getPushPermissionState();
      setPermState(state);
      if (state === 'granted') {
        const isSub = await isSubscribedToPush();
        if (!isSub && user?.id && VAPID_PUBLIC_KEY) {
          // Auto-resubscribe (e.g. after SW update in installed PWA)
          const restored = await ensurePushSubscription(VAPID_PUBLIC_KEY, user.id);
          setSubscribed(!!restored);
        } else {
          setSubscribed(isSub);
        }
      }
    } catch (err) {
      console.error('Check subscription error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    setError(null);
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush(user?.id);
        setSubscribed(false);
      } else {
        if (!VAPID_PUBLIC_KEY) {
          setError('VAPID key not configured. Set VITE_VAPID_PUBLIC_KEY in environment.');
          return;
        }
        const { saveSubscription } = await import('../services/pushNotifications');
        const sub = await subscribeToPush(VAPID_PUBLIC_KEY);
        if (sub) {
          await saveSubscription(sub, user.id);
          setSubscribed(true);
          setPermState('granted');
        } else {
          setPermState(getPushPermissionState());
        }
      }
    } catch (err) {
      console.error('Toggle subscription error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTestPush() {
    setError(null);
    try {
      await sendTestNotification(user.id);
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRunCheck() {
    setError(null);
    setCheckResult(null);
    setCheckRunning(true);
    try {
      const res = await fetch('/api/cron-deadline-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: user.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setCheckResult(json);
      setTimeout(() => setCheckResult(null), 8000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckRunning(false);
    }
  }

  const isSupported = 'PushManager' in window && 'serviceWorker' in navigator;
  const isDenied = permState === 'denied';
  const isAuthenticated = !!user;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`relative p-2 rounded-lg transition-colors ${
          subscribed
            ? 'text-blue-600 hover:bg-blue-50'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        title="Push Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {subscribed && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
        )}
      </button>

      {/* Panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Push Notifications</h3>

            {!isAuthenticated ? (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                Please sign in to enable notifications.
              </div>
            ) : !isSupported ? (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                Your browser doesn't support push notifications. Try Chrome or Edge.
              </div>
            ) : isDenied ? (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                Notifications are blocked. Please enable them in your browser settings for this site.
              </div>
            ) : (
              <>
                {/* Status */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {subscribed ? 'Notifications enabled' : 'Notifications disabled'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {subscribed
                        ? 'You\'ll receive deadline reminders'
                        : 'Enable to get deadline alerts'}
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={handleToggle}
                    disabled={loading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      subscribed ? 'bg-blue-600' : 'bg-gray-300'
                    } ${loading ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        subscribed ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* What you'll get */}
                {subscribed && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">You'll receive:</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>🚨</span> Overdue job alerts
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>⚠️</span> Due today reminders
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>⏰</span> Due tomorrow heads-up
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>📋</span> 3-day deadline warnings
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Button */}
                {subscribed && (
                  <button
                    onClick={handleTestPush}
                    disabled={testSent}
                    className="w-full py-2 px-3 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {testSent ? '✓ Test notification sent!' : '🔔 Send test notification'}
                  </button>
                )}

                {/* Admin: Manual deadline check trigger */}
                {subscribed && isAdmin() && (
                  <div className="mt-2">
                    <button
                      onClick={handleRunCheck}
                      disabled={checkRunning}
                      className="w-full py-2 px-3 text-sm font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      {checkRunning ? '⏳ Running check...' : '🔍 Run deadline check now'}
                    </button>
                    {checkResult && (
                      <p className="mt-1.5 text-xs text-gray-600 bg-gray-50 rounded p-2">
                        ✓ {checkResult.jobsChecked ?? 0} jobs checked — {checkResult.overdue ?? 0} overdue, {checkResult.dueToday ?? 0} due today, {checkResult.notificationsSent ?? 0} notifications sent
                      </p>
                    )}
                  </div>
                )}

                {/* Install hint */}
                {subscribed && (
                  <p className="mt-3 text-xs text-gray-400 text-center">
                    Tip: Install this app from your browser menu for the best experience on Android &amp; desktop.
                  </p>
                )}
              </>
            )}

            {error && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
