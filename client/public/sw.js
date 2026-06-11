// ============================================================
// SHALA ERP - SERVICE WORKER (sw.js)
// Handles background push notifications — even when app is closed
// ============================================================

const CACHE_NAME = 'shala-erp-cache-v2';
const APP_URL = self.location.origin;

// ──────────────────────────────────────────────────────────
// INSTALL — skip waiting so new SW activates immediately
// ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  self.skipWaiting();
});

// ──────────────────────────────────────────────────────────
// ACTIVATE — claim all open clients right away
// ──────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker Activated.');
  event.waitUntil(clients.claim());
});

// ──────────────────────────────────────────────────────────
// FETCH — pass-through (required for PWA installability)
// ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => new Response('Offline — Shala ERP'))
  );
});

// ──────────────────────────────────────────────────────────
// PUSH EVENT — fires when server sends a push notification
// This works even when the browser tab is closed!
// ──────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  // Default payload in case server sends no data
  let payload = {
    title: 'Shala ERP',
    body: 'You have a new notification.',
    icon: '/logo.png',
    badge: '/logo.png',
    url: '/',
    tag: 'shala-erp-notification',
  };

  // Parse the push payload from server
  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data };
    } catch (e) {
      // If not JSON, use as plain text body
      payload.body = event.data.text();
    }
  }

  // Build the notification options object
  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    tag: payload.tag || 'shala-erp-notification',    // Prevents duplicate stacking
    renotify: true,                                    // Vibrate again even if same tag
    requireInteraction: false,                         // Auto-dismiss after a while
    silent: false,                                     // Allow sound
    vibrate: [200, 100, 200],                          // Vibration pattern (mobile)
    data: {
      url: payload.url || '/',                         // URL to open on click
      timestamp: Date.now(),
    },
    // Action buttons shown below the notification (like WhatsApp "Reply" / "Mark Read")
    actions: payload.actions || [
      { action: 'view',    title: '👁️ View',    icon: '/logo.png' },
      { action: 'dismiss', title: '✕ Dismiss',  icon: '/logo.png' },
    ],
  };

  // Show the OS-level notification — this is what appears in the notification tray
  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// ──────────────────────────────────────────────────────────
// NOTIFICATION CLICK — handle user tapping the notification
// ──────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  // Close the notification banner
  event.notification.close();

  // If user clicked "Dismiss" action button, just close — do nothing
  if (event.action === 'dismiss') return;

  // URL to navigate to — from data or default to app root
  const targetUrl = event.notification.data?.url || APP_URL;
  const fullUrl = targetUrl.startsWith('http') ? targetUrl : `${APP_URL}${targetUrl}`;

  // Try to focus an existing tab, or open a new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if any open tab matches our URL
      const existingTab = windowClients.find((client) =>
        client.url.startsWith(APP_URL)
      );

      if (existingTab) {
        // Focus existing tab and navigate it to the correct page
        existingTab.focus();
        existingTab.navigate(fullUrl);
      } else {
        // No open tab — open a fresh window
        clients.openWindow(fullUrl);
      }
    })
  );
});

// ──────────────────────────────────────────────────────────
// NOTIFICATION CLOSE — analytics / tracking (optional)
// Fires when user swipes the notification away without clicking
// ──────────────────────────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed by user:', event.notification.tag);
  // You can post a message back to the main thread for analytics
});
