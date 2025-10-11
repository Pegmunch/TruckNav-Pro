// TruckNav Pro Service Worker
// Patent-protected technology by Bespoke Marketing.Ai Ltd

// Force cache update by incrementing version (fixes PWA multi-version issue)
const CACHE_VERSION = '3.1.0';
const CACHE_NAME = `trucknav-pro-v${CACHE_VERSION}`;
const STATIC_CACHE = `trucknav-static-v${CACHE_VERSION}`;
const API_CACHE = `trucknav-api-v${CACHE_VERSION}`;
const MAP_CACHE = `trucknav-maps-v${CACHE_VERSION}`;

// Essential files to cache for offline functionality
const ESSENTIAL_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// API endpoints to cache for offline functionality
const OFFLINE_API_PATTERNS = [
  '/api/vehicle-profiles',
  '/api/facilities',
  '/api/restrictions',
  '/api/entertainment/stations',
  '/api/entertainment/settings',
  '/api/journeys',
  '/api/routes',
  '/api/traffic-incidents',
  '/api/postcodes'
];

// Map and tile patterns for offline maps
const MAP_PATTERNS = [
  /^https:\/\/.*\.tile\.openstreetmap\.org/,
  /^https:\/\/.*\.tile\.thunderforest\.com/,
  /^https:\/\/api\.mapbox\.com/,
  /^https:\/\/.*\.googleapis\.com\/maps/,
  /^https:\/\/server\.arcgisonline\.com/,
  /^https:\/\/.*\.arcgis\.com/
];

// Mobile network detection and quality assessment
function detectNetworkQuality() {
  if (!navigator.connection) {
    return { type: 'unknown', quality: 'unknown', effective: '4g' };
  }
  
  const connection = navigator.connection;
  const effective = connection.effectiveType || '4g';
  const downlink = connection.downlink || 10;
  
  let quality = 'good';
  if (effective === 'slow-2g' || downlink < 0.5) {
    quality = 'poor';
  } else if (effective === '2g' || downlink < 1.5) {
    quality = 'slow';
  } else if (effective === '3g' || downlink < 5) {
    quality = 'medium';
  }
  
  return {
    type: connection.type || 'unknown',
    quality,
    effective,
    downlink,
    rtt: connection.rtt || 0
  };
}

// Enhanced caching for mobile networks
function getMobileCacheStrategy(request) {
  const networkQuality = detectNetworkQuality();
  const url = new URL(request.url);
  
  // For poor network conditions, prioritize cache more heavily
  if (networkQuality.quality === 'poor') {
    if (url.pathname.startsWith('/api/')) {
      return 'cache-first-mobile';
    }
    return 'cache-first';
  }
  
  // For medium quality, use balanced approach
  if (networkQuality.quality === 'medium') {
    if (MAP_PATTERNS.some(pattern => pattern.test(request.url))) {
      return 'cache-first-maps';
    }
    return 'network-first-mobile';
  }
  
  // Good network - normal strategies
  return getCachingStrategy(request);
}

// IndexedDB setup for offline data storage
const DB_NAME = 'TruckNavOfflineDB';
const DB_VERSION = 2; // Incremented for new mobile features
const STORES = {
  OFFLINE_REQUESTS: 'offlineRequests',
  CACHED_DATA: 'cachedData',
  USER_PREFERENCES: 'userPreferences',
  ROUTE_CACHE: 'routeCache',
  NAVIGATION_STATE: 'navigationState',
  MOBILE_NETWORK_LOGS: 'mobileNetworkLogs'
};

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for failed requests to retry later
      if (!db.objectStoreNames.contains(STORES.OFFLINE_REQUESTS)) {
        const offlineStore = db.createObjectStore(STORES.OFFLINE_REQUESTS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        offlineStore.createIndex('timestamp', 'timestamp');
      }
      
      // Store for cached application data
      if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
        db.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
      }
      
      // Store for user preferences and settings
      if (!db.objectStoreNames.contains(STORES.USER_PREFERENCES)) {
        db.createObjectStore(STORES.USER_PREFERENCES, { keyPath: 'key' });
      }
      
      // New mobile-specific stores
      if (!db.objectStoreNames.contains(STORES.ROUTE_CACHE)) {
        const routeStore = db.createObjectStore(STORES.ROUTE_CACHE, { keyPath: 'id' });
        routeStore.createIndex('timestamp', 'timestamp');
        routeStore.createIndex('active', 'active');
      }
      
      if (!db.objectStoreNames.contains(STORES.NAVIGATION_STATE)) {
        db.createObjectStore(STORES.NAVIGATION_STATE, { keyPath: 'key' });
      }
      
      if (!db.objectStoreNames.contains(STORES.MOBILE_NETWORK_LOGS)) {
        const networkStore = db.createObjectStore(STORES.MOBILE_NETWORK_LOGS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        networkStore.createIndex('timestamp', 'timestamp');
        networkStore.createIndex('quality', 'quality');
      }
    };
  });
}

// Store failed request for background sync (with security filtering)
async function storeOfflineRequest(request, body = null) {
  try {
    // Skip CSRF endpoints and sensitive requests
    if (request.url.includes('csrf-token') || request.url.includes('auth')) {
      console.log('[SW] Skipping sensitive endpoint for offline storage:', request.url);
      return;
    }
    
    const db = await initDB();
    const transaction = db.transaction([STORES.OFFLINE_REQUESTS], 'readwrite');
    const store = transaction.objectStore(STORES.OFFLINE_REQUESTS);
    
    // Filter out sensitive headers for security
    const safeHeaders = {};
    const unsafeHeaders = ['authorization', 'cookie', 'x-csrf-token'];
    
    for (const [key, value] of request.headers.entries()) {
      if (!unsafeHeaders.includes(key.toLowerCase())) {
        safeHeaders[key] = value;
      }
    }
    
    const requestData = {
      id: Date.now() + Math.random(),
      url: request.url,
      method: request.method,
      headers: safeHeaders,
      body: body,
      timestamp: Date.now()
    };
    
    await store.add(requestData);
    console.log('[SW] Stored offline request:', request.url);
    
    // Broadcast updated queue count
    broadcastQueueCount();
  } catch (error) {
    console.error('[SW] Failed to store offline request:', error);
  }
}

// Install event - cache essential files and initialize DB
self.addEventListener('install', (event) => {
  console.log('[SW] Installing TruckNav Pro Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache essential files
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(ESSENTIAL_FILES);
      }),
      // Initialize IndexedDB
      initDB(),
      // Force immediate activation to fix multi-version issue
      self.skipWaiting()
    ]).then(() => {
      console.log('[SW] Installation complete - Essential files cached and DB initialized');
    }).catch((error) => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating TruckNav Pro Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const validCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE, MAP_CACHE];
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCaches.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated and caches cleaned');
        return self.clients.claim();
      })
  );
});

// Determine caching strategy based on request type
function getCachingStrategy(request) {
  const url = new URL(request.url);
  
  // Static assets - Cache First strategy
  if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$/)) {
    return 'cache-first';
  }
  
  // Map tiles - Cache First with long TTL
  if (MAP_PATTERNS.some(pattern => pattern.test(request.url))) {
    return 'cache-first-maps';
  }
  
  // API endpoints - Network First with cache fallback
  if (url.pathname.startsWith('/api/')) {
    return 'network-first';
  }
  
  // HTML/Navigation - Network First with cache fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    return 'network-first';
  }
  
  // Default to cache first for other assets
  return 'cache-first';
}

// Cache management with TTL and size limits
async function manageCacheSize(cacheName, maxEntries = 100, maxAge = 24 * 60 * 60 * 1000) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  
  // Remove expired entries
  const now = Date.now();
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const dateHeader = response.headers.get('date');
      const cacheDate = dateHeader ? new Date(dateHeader).getTime() : now;
      if (now - cacheDate > maxAge) {
        await cache.delete(request);
        console.log('[SW] Removed expired cache entry:', request.url);
      }
    }
  }
  
  // Remove oldest entries if over limit
  const remainingRequests = await cache.keys();
  if (remainingRequests.length > maxEntries) {
    const toDelete = remainingRequests.slice(0, remainingRequests.length - maxEntries);
    for (const request of toDelete) {
      await cache.delete(request);
      console.log('[SW] Removed old cache entry (LRU):', request.url);
    }
  }
}

// Cache First Strategy with cache management
async function cacheFirstStrategy(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Serve from cache, update cache in background
    fetch(request).then(async response => {
      if (response.ok) {
        await cache.put(request, response.clone());
        
        // Manage cache size for map tiles
        if (cacheName === MAP_CACHE) {
          await manageCacheSize(MAP_CACHE, 500, 7 * 24 * 60 * 60 * 1000); // 500 entries, 7 days
        }
      }
    }).catch(() => {}); // Ignore network errors
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      
      // Manage cache size for map tiles
      if (cacheName === MAP_CACHE) {
        await manageCacheSize(MAP_CACHE, 500, 7 * 24 * 60 * 60 * 1000); // 500 entries, 7 days
      }
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for cache-first request:', request.url);
    throw error;
  }
}

// Network First Strategy - good for dynamic content and APIs
async function networkFirstStrategy(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses for offline use
      if (request.method === 'GET') {
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For API requests, return offline response
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          message: 'You are offline. Some features may not work.',
          offline: true,
          cached: false
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // For navigation requests, return offline page
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
      // Fallback to cached index.html
      const cachedIndex = await cache.match('/index.html') || await cache.match('/');
      if (cachedIndex) {
        return cachedIndex;
      }
    }
    
    throw error;
  }
}

// Enhanced Fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle non-GET requests
  if (request.method !== 'GET') {
    // Try to make the request first
    event.respondWith(
      fetch(request).catch(async () => {
        // If network fails, store for background sync
        console.log('[SW] Network failed for non-GET request, queueing for background sync:', request.url);
        
        // Read request body if present
        const body = request.method !== 'GET' && request.body ? await request.clone().text() : null;
        await storeOfflineRequest(request, body);
        
        return new Response(
          JSON.stringify({ 
            message: 'Request queued for when you\'re back online',
            offline: true,
            queued: true
          }),
          {
            status: 202,
            statusText: 'Accepted',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }
  
  // Skip external requests (not same origin) but allow map tiles
  const isExternalMapTile = MAP_PATTERNS.some(pattern => pattern.test(request.url));
  if (url.origin !== location.origin && !isExternalMapTile) {
    return;
  }
  
  // Determine caching strategy
  const strategy = getCachingStrategy(request);
  let cacheName = CACHE_NAME;
  
  // Use specific cache for different content types
  if (strategy === 'cache-first-maps') {
    cacheName = MAP_CACHE;
  } else if (request.url.includes('/api/')) {
    cacheName = API_CACHE;
  } else if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$/)) {
    cacheName = STATIC_CACHE;
  }
  
  // Apply caching strategy
  event.respondWith(
    (async () => {
      try {
        if (strategy === 'cache-first' || strategy === 'cache-first-maps') {
          return await cacheFirstStrategy(request, cacheName);
        } else {
          return await networkFirstStrategy(request, cacheName);
        }
      } catch (error) {
        console.error('[SW] Request failed:', request.url, error);
        
        // Last resort fallbacks
        if (request.mode === 'navigate') {
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;
          const fallback = await caches.match('/index.html') || await caches.match('/');
          if (fallback) return fallback;
        }
        
        // Return a generic offline page
        return new Response(
          '<!DOCTYPE html><html><head><title>Offline - TruckNav Pro</title></head><body><h1>You\'re offline</h1><p>Please check your connection and try again.</p></body></html>',
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html' }
          }
        );
      }
    })()
  );
});

// Process queued offline requests
async function processOfflineRequests() {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORES.OFFLINE_REQUESTS], 'readwrite');
    const store = transaction.objectStore(STORES.OFFLINE_REQUESTS);
    const requests = await store.getAll();
    
    console.log(`[SW] Processing ${requests.length} offline requests`);
    
    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        if (response.ok) {
          // Request succeeded, remove from queue
          await store.delete(requestData.id);
          console.log('[SW] Successfully synced offline request:', requestData.url);
        }
      } catch (error) {
        console.log('[SW] Failed to sync request:', requestData.url, error);
      }
    }
  } catch (error) {
    console.error('[SW] Error processing offline requests:', error);
  }
}

// Enhanced background sync handler
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync' || event.tag === 'offline-requests') {
    event.waitUntil(
      processOfflineRequests().then(() => {
        console.log('[SW] Background sync operations completed');
      }).catch((error) => {
        console.error('[SW] Background sync failed:', error);
      })
    );
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'TruckNav Pro notification',
    icon: '/apple-touch-icon.png',
    badge: '/favicon-32x32.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open TruckNav Pro',
        icon: '/favicon-32x32.png'
      },
      {
        action: 'close',
        title: 'Close notification',
        icon: '/favicon-32x32.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('TruckNav Pro', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle messages from clients (like skip waiting)
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested by client');
    self.skipWaiting();
    // Broadcast update-ready to all clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'UPDATE_READY' });
      });
    });
  }
  
  // Force clear all caches for troubleshooting
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    console.log('[SW] Clearing all caches requested');
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true, message: 'All caches cleared' });
    });
  }
  
  // Handle queue count requests
  if (event.data && event.data.type === 'GET_QUEUE_COUNT') {
    getQueueCount().then(count => {
      event.ports[0].postMessage({ count });
    });
  }
});

// Queue management functions
async function getQueueCount() {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORES.OFFLINE_REQUESTS], 'readonly');
    const store = transaction.objectStore(STORES.OFFLINE_REQUESTS);
    const request = store.count();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Error getting queue count:', error);
    return 0;
  }
}

async function broadcastQueueCount() {
  const count = await getQueueCount();
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'QUEUE_COUNT_UPDATE', count });
  });
}

console.log(`[SW] TruckNav Pro Service Worker v${CACHE_VERSION} loaded - Patent-protected by Bespoke Marketing.Ai Ltd`);