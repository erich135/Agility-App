// Service Worker for LMW PWA
// Handles: caching for offline support + push notification display

const CACHE_NAME = 'lmw-v1';

// Assets to cache for offline
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/lmw-icon-192.png',
  '/lmw-logo.png',
  '/favicon.svg'
];

// Install: precache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET and API requests
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // SPA: serve cached index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
      )
  );
});

// Push: display notification when received
self.addEventListener('push', (event) => {
  let data = { title: 'LMW Reminder', body: 'You have a notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  // Automatically inject snooze + resolve actions on interrupt-related pushes
  const isInterruptPush = data.interruptId ||
    ['interrupt-reminder', 'snooze-expired', 'urgent-stale', 'eod-reminder'].includes(data.tag);

  const defaultActions = isInterruptPush
    ? [
        { action: 'snooze30', title: '⏰ Snooze 30 min' },
        { action: 'resolve',  title: '✅ Done' }
      ]
    : [];

  const options = {
    body: data.body,
    icon: '/lmw-logo.png',
    badge: '/lmw-logo.png',
    tag: data.tag || 'lmw-notification',
    data: { url: data.url || '/', interruptId: data.interruptId || null },
    actions: data.actions?.length ? data.actions : defaultActions,
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click: handle action buttons or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { url, interruptId } = event.notification.data || {};
  const action = event.action;

  // Snooze 30 min — call the API silently, no window needed
  if (action === 'snooze30' && interruptId) {
    event.waitUntil(
      fetch('/api/push?action=snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interruptId, minutes: 30 })
      }).catch(() => {}) // best-effort, non-fatal
    );
    return;
  }

  // Resolve — mark done via the in-app route
  if (action === 'resolve' && interruptId) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        const target = `/focus?resolveInterrupt=${interruptId}`;
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
    );
    return;
  }

  // Default: open the app at the relevant page
  const target = url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
