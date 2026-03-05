// TruckNav Pro Service Worker v3.6.1
// Patent-protected technology by Bespoke Marketing.Ai Ltd
//
// DUAL-TIER CACHING STRATEGY:
// TIER 1 - ALWAYS FRESH: App code (HTML/JS/CSS), version files → Network-first, cached backup only if offline
// TIER 2 - STRONG CACHE: Map tiles, route data, navigation APIs, images → Cache-first for offline navigation backup

const CACHE_VERSION = '3.6.1';
const APP_CACHE = `trucknav-app-v${CACHE_VERSION}`;
const MAP_CACHE = 'trucknav-maps-v1';
const API_CACHE = 'trucknav-api-v1';

let DEV_MODE_NO_CACHE = false;

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'DEV_MODE') {
    DEV_MODE_NO_CACHE = event.data.enabled;
    console.log('[SW] Dev mode caching:', DEV_MODE_NO_CACHE ? 'DISABLED' : 'ENABLED');
    event.ports[0]?.postMessage({ success: true, devMode: DEV_MODE_NO_CACHE });
  }
  if (event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received');
    self.skipWaiting();
  }
  if (event.data.type === 'FORCE_CLEAR') {
    console.log('[SW] FORCE_CLEAR received - wiping all caches');
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => self.clients.claim());
  }
});

const MAX_MAP_ENTRIES = 1000;
const MAX_API_ENTRIES = 200;
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;

const ESSENTIAL_FILES = [
  '/offline.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

const MAP_PATTERNS = [
  /^https:\/\/.*\.tile\.openstreetmap\.org/,
  /^https:\/\/.*\.tile\.thunderforest\.com/,
  /^https:\/\/api\.mapbox\.com/,
  /^https:\/\/.*\.googleapis\.com\/maps/,
  /^https:\/\/server\.arcgisonline\.com/,
  /^https:\/\/.*\.arcgis\.com/
];

const NAVIGATION_API_PATTERNS = [
  '/api/vehicle-profiles',
  '/api/facilities',
  '/api/restrictions',
  '/api/routes',
  '/api/journeys',
  '/api/traffic-incidents',
  '/api/postcodes',
  '/api/entertainment/stations',
  '/api/entertainment/settings'
];

let errorCount = 0;
let lastErrorTime = 0;

function trackError(error) {
  const now = Date.now();
  if (now - lastErrorTime > 60000) errorCount = 0;
  errorCount++;
  lastErrorTime = now;
  if (errorCount >= 5) {
    console.warn('[SW] Too many errors - clearing app cache only (keeping navigation data)');
    caches.delete(APP_CACHE).then(() => { errorCount = 0; });
  }
}

const DB_NAME = 'TruckNavOfflineDB';
const DB_VERSION = 2;
const STORES = {
  OFFLINE_REQUESTS: 'offlineRequests',
  CACHED_DATA: 'cachedData',
  USER_PREFERENCES: 'userPreferences',
  ROUTE_CACHE: 'routeCache',
  NAVIGATION_STATE: 'navigationState',
  MOBILE_NETWORK_LOGS: 'mobileNetworkLogs'
};

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORES.OFFLINE_REQUESTS)) {
        const s = db.createObjectStore(STORES.OFFLINE_REQUESTS, { keyPath: 'id', autoIncrement: true });
        s.createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) db.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORES.USER_PREFERENCES)) db.createObjectStore(STORES.USER_PREFERENCES, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORES.ROUTE_CACHE)) {
        const r = db.createObjectStore(STORES.ROUTE_CACHE, { keyPath: 'id' });
        r.createIndex('timestamp', 'timestamp');
        r.createIndex('active', 'active');
      }
      if (!db.objectStoreNames.contains(STORES.NAVIGATION_STATE)) db.createObjectStore(STORES.NAVIGATION_STATE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORES.MOBILE_NETWORK_LOGS)) {
        const n = db.createObjectStore(STORES.MOBILE_NETWORK_LOGS, { keyPath: 'id', autoIncrement: true });
        n.createIndex('timestamp', 'timestamp');
        n.createIndex('quality', 'quality');
      }
    };
  });
}

async function storeOfflineRequest(request, body = null) {
  try {
    if (request.url.includes('csrf-token') || request.url.includes('auth')) return;
    const db = await initDB();
    const tx = db.transaction([STORES.OFFLINE_REQUESTS], 'readwrite');
    const store = tx.objectStore(STORES.OFFLINE_REQUESTS);
    const safeHeaders = {};
    for (const [key, value] of request.headers.entries()) {
      if (!['authorization', 'cookie', 'x-csrf-token'].includes(key.toLowerCase())) safeHeaders[key] = value;
    }
    await store.add({ id: Date.now() + Math.random(), url: request.url, method: request.method, headers: safeHeaders, body, timestamp: Date.now() });
    broadcastQueueCount();
  } catch (e) { /* ignore */ }
}

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const toDelete = keys.slice(0, keys.length - maxEntries);
      await Promise.all(toDelete.map(k => cache.delete(k)));
      console.log(`[SW] Trimmed ${toDelete.length} old entries from ${cacheName}`);
    }
  } catch (e) { /* ignore */ }
}

// ========================================
// INSTALL: Clear OLD app code caches, KEEP navigation/map data
// ========================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.map(name => {
          // Delete old versioned APP caches (they contain stale JS/CSS)
          if (name.startsWith('trucknav-app-') && name !== APP_CACHE) {
            console.log('[SW] Deleting old app cache:', name);
            return caches.delete(name);
          }
          // Delete old versioned caches from previous cache scheme
          if (name.startsWith('trucknav-pro-v') || name.startsWith('trucknav-static-v')) {
            console.log('[SW] Deleting legacy cache:', name);
            return caches.delete(name);
          }
          // KEEP: MAP_CACHE, API_CACHE (persistent navigation data)
          return Promise.resolve();
        })
      );
    }).then(() => {
      return caches.open(APP_CACHE).then(cache => cache.addAll(ESSENTIAL_FILES));
    }).then(() => initDB())
    .then(() => {
      console.log('[SW] Installed - old app code cleared, navigation data preserved');
      return self.skipWaiting();
    }).catch(err => console.error('[SW] Install failed:', err))
  );
});

// ========================================
// ACTIVATE: Claim clients immediately so new code takes effect
// ========================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(names => {
      const keepCaches = [APP_CACHE, MAP_CACHE, API_CACHE];
      return Promise.all(
        names.map(name => {
          if (!keepCaches.includes(name)) {
            console.log('[SW] Cleaning up cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activated - serving fresh code, navigation cache intact');
      return self.clients.claim();
    })
  );
});

// ========================================
// FETCH HANDLER - Two-tier strategy
// ========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Dev mode: bypass everything
  if (DEV_MODE_NO_CACHE) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // ──────────────────────────────────────
  // TIER 1: ALWAYS FRESH - App code & pages
  // Network-first: get latest code, fall back to cache only when offline
  // ──────────────────────────────────────

  // HTML pages - ALWAYS from network (ensures you see latest app version)
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request).then(response => {
        // Cache a copy for offline backup
        if (response.ok) {
          const clone = response.clone();
          caches.open(APP_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(async () => {
        // Offline: serve cached version
        const cached = await caches.match(request);
        if (cached) return cached;
        const offline = await caches.match('/offline.html');
        if (offline) return offline;
        return new Response('<html><body><h1>Offline</h1><p>Navigation data is still available.</p></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html' } });
      })
    );
    return;
  }

  // Version & SW files - ALWAYS from network, never cached
  if (url.pathname === '/app-version.json' || url.pathname === '/sw.js') {
    event.respondWith(fetch(request));
    return;
  }

  // JS & CSS bundles - Network-first (fresh code, cached backup for offline)
  if (url.pathname.match(/\.(js|css|mjs)(\?.*)?$/) && url.origin === location.origin) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(APP_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error('Offline and no cached JS/CSS');
      })
    );
    return;
  }

  // Non-GET requests (POST/PUT/DELETE) - always network, queue if offline
  if (request.method !== 'GET') {
    event.respondWith(
      fetch(request).catch(async () => {
        const body = request.body ? await request.clone().text() : null;
        await storeOfflineRequest(request, body);
        return new Response(JSON.stringify({ message: 'Queued for when online', offline: true, queued: true }),
          { status: 202, headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  // ──────────────────────────────────────
  // TIER 2: STRONG CACHE - Navigation & map data
  // Cache-first: instant loading, background refresh
  // ──────────────────────────────────────

  // Map tiles - Cache-first with background refresh (strong offline support)
  const isMapTile = MAP_PATTERNS.some(pattern => pattern.test(request.url));
  if (isMapTile) {
    event.respondWith(
      caches.open(MAP_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) {
          // Serve from cache instantly, update in background
          fetch(request).then(response => {
            if (response.ok) cache.put(request, response);
          }).catch(() => {});
          return cached;
        }
        // Not cached yet - fetch and store
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
            trimCache(MAP_CACHE, MAX_MAP_ENTRIES);
          }
          return response;
        } catch (e) {
          return new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // Navigation API data - Cache-first for offline backup, refresh in background
  const isNavAPI = NAVIGATION_API_PATTERNS.some(pattern => url.pathname.startsWith(pattern));
  if (url.pathname.startsWith('/api/') && isNavAPI) {
    event.respondWith(
      caches.open(API_CACHE).then(async cache => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
            trimCache(API_CACHE, MAX_API_ENTRIES);
          }
          return response;
        }).catch(err => {
          if (cached) return cached;
          return new Response(JSON.stringify({ message: 'Offline', offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } });
        });

        // If cached, return immediately (stale-while-revalidate)
        if (cached) {
          fetchPromise.catch(() => {}); // background refresh
          return cached;
        }
        // No cache - must wait for network
        return fetchPromise;
      })
    );
    return;
  }

  // Other API calls (CSRF, auth, etc.) - always network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ message: 'Offline', offline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  // Images & fonts - Cache-first (they rarely change)
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|webp)(\?.*)?$/)) {
    event.respondWith(
      caches.open(APP_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch (e) {
          return new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // Locales/translation files - Network-first with cache backup
  if (url.pathname.startsWith('/locales/')) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(APP_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // External requests not matching above - pass through
  if (url.origin !== location.origin) return;

  // Everything else from our origin - network-first with app cache backup
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(APP_CACHE).then(cache => cache.put(request, clone));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});

// ========================================
// BACKGROUND SYNC
// ========================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'trucknav-sync') {
    event.waitUntil(syncOfflineRequests());
  }
});

async function syncOfflineRequests() {
  try {
    const db = await initDB();
    const tx = db.transaction([STORES.OFFLINE_REQUESTS], 'readwrite');
    const store = tx.objectStore(STORES.OFFLINE_REQUESTS);
    const requests = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    for (const data of requests) {
      try {
        await fetch(data.url, { method: data.method, headers: data.headers, body: data.body });
        const dtx = db.transaction([STORES.OFFLINE_REQUESTS], 'readwrite');
        dtx.objectStore(STORES.OFFLINE_REQUESTS).delete(data.id);
      } catch (e) { /* retry later */ }
    }
    broadcastQueueCount();
  } catch (e) { console.error('[SW] Sync failed:', e); }
}

async function broadcastQueueCount() {
  try {
    const db = await initDB();
    const tx = db.transaction([STORES.OFFLINE_REQUESTS], 'readonly');
    const store = tx.objectStore(STORES.OFFLINE_REQUESTS);
    const count = await new Promise(resolve => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
    const clients = await self.clients.matchAll();
    clients.forEach(client => client.postMessage({ type: 'QUEUE_COUNT', count }));
  } catch (e) { /* ignore */ }
}

// Periodic cleanup
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'trucknav-cache-cleanup') {
    event.waitUntil(Promise.all([
      trimCache(MAP_CACHE, MAX_MAP_ENTRIES),
      trimCache(API_CACHE, MAX_API_ENTRIES)
    ]));
  }
});

console.log(`[SW] TruckNav Pro v${CACHE_VERSION} loaded - Dual-tier caching: fresh code + strong navigation backup`);
