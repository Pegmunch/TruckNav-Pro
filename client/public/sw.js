// TruckNav Pro Service Worker - Fixed Version
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clear ALL old caches immediately
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    
    // Force all clients to reload
    const clients = await self.clients.matchAll();
    clients.forEach(client => client.navigate(client.url));
    
    return self.clients.claim();
  })());
});

// Always fetch from network first, never use cache
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => {
    return new Response('Offline');
  }));
});
