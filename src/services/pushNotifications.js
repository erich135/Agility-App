// Push Notification Service
// Handles: SW registration, push subscription, and sending to backend

import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY_STORAGE = 'agility_vapid_public_key';

/**
 * Register the service worker and return the registration
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('SW registered:', registration.scope);
    return registration;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

/**
 * Check if push notifications are supported and permission is granted
 */
export function getPushPermissionState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
}

/**
 * Request push notification permission and subscribe
 * Returns the subscription object or null
 */
export async function subscribeToPush(vapidPublicKey) {
  if (!('PushManager' in window)) {
    console.warn('Push API not supported');
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('Push permission denied');
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  // Check for existing subscription
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
  }

  return subscription;
}

/**
 * Save push subscription to Supabase via API endpoint
 */
export async function saveSubscription(subscription) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to save subscription');
  }

  return response.json();
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();

    // Remove from backend
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetch('/api/push-subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          endpoint: subscription.endpoint
        })
      });
    }
  }

  return true;
}

/**
 * Check if currently subscribed to push
 */
export async function isSubscribedToPush() {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Send a test push notification via the API
 */
export async function sendTestNotification() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch('/api/push-send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      title: '🔔 Agility Test',
      body: 'Push notifications are working! You\'ll receive deadline reminders here.',
      url: '/',
      tag: 'test-notification'
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to send test notification');
  }

  return response.json();
}

/**
 * Convert a URL-safe base64 string to a Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
