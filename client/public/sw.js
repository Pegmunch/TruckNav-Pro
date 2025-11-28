// TruckNav Pro Service Worker - Minimal Version
// Disabled aggressive caching to prevent stale content

const CACHE_VERSION = 'v1-disabled-cache';

// Only cache essential offline page, not the app
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.matchAll().then(clients => {
    clients.forEach(client => client.navigate(client.url));
  }));
});

// Network-first strategy: Always try network, fall back to offline.html
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For HTML pages, always use network-first
  if (event.request.destination === '' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response('Offline - please check your connection', { status: 503 }))
    );
    return;
  }

  // For everything else, use network
  event.respondWith(fetch(event.request).catch(() => {
    return new Response('Offline', { status: 503 });
  }));
});
