// ============================================================
// usePushNotifications.js
// React hook — manages the full Web Push lifecycle:
//   register SW → get VAPID key → subscribe → save to server
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Converts a URL-safe base64 VAPID public key to a Uint8Array
// (required by PushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Get the JWT token from localStorage (same pattern as apiService.js)
function getAuthToken() {
  try {
    const session = JSON.parse(localStorage.getItem('mockSession') || '{}');
    return session.token || null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────
export const usePushNotifications = () => {
  // 'unsupported' | 'default' | 'loading' | 'subscribed' | 'denied' | 'error'
  const [status, setStatus] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);

  // ── Check support & current state on mount ───────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    // Check if already subscribed in this browser
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) {
          setSubscription(sub);
          setStatus('subscribed');
        }
      })
      .catch(() => {});
  }, []);

  // ── Register service worker ──────────────────────────────
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;

    // If already registered, just return the existing registration
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[Push] Service Worker registered:', registration.scope);
    return registration;
  }, []);

  // ── Fetch VAPID public key from server ───────────────────
  const fetchVapidKey = useCallback(async () => {
    const res = await fetch(`${API_URL}/push/vapid-public-key`);
    if (!res.ok) throw new Error('Could not fetch VAPID key from server.');
    const { publicKey } = await res.json();
    return publicKey;
  }, []);

  // ── Save subscription to backend ─────────────────────────
  const saveSubscriptionToServer = useCallback(async (sub) => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated. Please log in first.');

    const subJSON = sub.toJSON();
    const res = await fetch(`${API_URL}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subJSON.endpoint,
        keys: { p256dh: subJSON.keys.p256dh, auth: subJSON.keys.auth },
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'Failed to save subscription to server.');
    }
  }, []);

  // ── Remove subscription from backend ────────────────────
  const removeSubscriptionFromServer = useCallback(async (endpoint) => {
    const token = getAuthToken();
    if (!token) return;

    await fetch(`${API_URL}/push/unsubscribe`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {}); // Fail silently — user is unsubscribing anyway
  }, []);

  // ── Main: subscribe flow ─────────────────────────────────
  const subscribe = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);

      // 1. Check browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }

      // 2. Request notification permission from the browser
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      // 3. Register (or get existing) service worker
      const registration = await registerServiceWorker();
      if (!registration) throw new Error('Service Worker registration failed.');

      // 4. Get VAPID public key from server
      const vapidPublicKey = await fetchVapidKey();

      // 5. Subscribe browser to push using VAPID key
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,                           // Required — must show notification when push received
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 6. Send subscription to backend to save in database
      await saveSubscriptionToServer(sub);

      setSubscription(sub);
      setStatus('subscribed');
      console.log('[Push] Successfully subscribed!');
    } catch (err) {
      console.error('[Push] Subscription error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setStatus('error');
    }
  }, [registerServiceWorker, fetchVapidKey, saveSubscriptionToServer]);

  // ── Unsubscribe flow ─────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    try {
      setStatus('loading');
      if (subscription) {
        await removeSubscriptionFromServer(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscription(null);
      setStatus('default');
      console.log('[Push] Unsubscribed successfully.');
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
      setError(err.message);
      setStatus('error');
    }
  }, [subscription, removeSubscriptionFromServer]);

  // ── Test: show a local notification immediately (no server needed) ──
  const triggerTestNotification = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('📢 Shala ERP — Test Notification', {
        body: 'This is a live test! Push notifications are working correctly on this device.',
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'shala-test',
        vibrate: [200, 100, 200],
        actions: [
          { action: 'view',    title: '👁️ View' },
          { action: 'dismiss', title: '✕ Dismiss' },
        ],
        data: { url: '/' },
      });
    } catch (err) {
      console.error('[Push] Test notification failed:', err);
    }
  }, []);

  return {
    status,        // 'unsupported' | 'default' | 'loading' | 'subscribed' | 'denied' | 'error'
    subscription,
    error,
    subscribe,
    unsubscribe,
    triggerTestNotification,
  };
};
