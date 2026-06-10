const CACHE_NAME = 'shala-erp-cache-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Call respondWith to satisfy Chrome PWA installability requirements
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response("Offline mode - Shala ERP");
    })
  );
});
