// TruckNav Pro Service Worker - Enhanced Stability Version
// Patent-protected technology by Bespoke Marketing.Ai Ltd

// Force cache update by incrementing version (fixes PWA multi-version issue)
const CACHE_VERSION = '3.2.0';
const CACHE_NAME = `trucknav-pro-v${CACHE_VERSION}`;
const STATIC_CACHE = `trucknav-static-v${CACHE_VERSION}`;
const API_CACHE = `trucknav-api-v${CACHE_VERSION}`;
const MAP_CACHE = `trucknav-maps-v${CACHE_VERSION}`;

// Cache size limits to prevent memory overflow (in bytes)
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB total
const MAX_STATIC_CACHE = 30 * 1024 * 1024; // 30MB for static assets
const MAX_API_CACHE = 20 * 1024 * 1024; // 20MB for API responses  
const MAX_MAP_CACHE = 50 * 1024 * 1024; // 50MB for map tiles
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Error recovery tracking
let errorCount = 0;
let lastErrorTime = 0;
const ERROR_THRESHOLD = 5;
const ERROR_TIME_WINDOW = 60000; // 1 minute

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

// Track and handle errors with circuit breaker pattern
function trackError(error) {
  const now = Date.now();
  
  // Reset counter if outside time window
  if (now - lastErrorTime > ERROR_TIME_WINDOW) {
    errorCount = 0;
  }
  
  errorCount++;
  lastErrorTime = now;
  
  console.error('[SW] Error tracked:', error, `Count: ${errorCount}`);
  
  // If too many errors, trigger recovery
  if (errorCount >= ERROR_THRESHOLD) {
    console.warn('[SW] Error threshold exceeded, initiating recovery...');
    initiateErrorRecovery();
  }
}

// Recovery mechanism for excessive errors
async function initiateErrorRecovery() {
  try {
    console.log('[SW] Starting error recovery process...');
    
    // Clear problematic caches
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
      name.includes('trucknav') && !name.includes(CACHE_VERSION)
    );
    
    for (const cacheName of oldCaches) {
      await caches.delete(cacheName);
      console.log('[SW] Deleted old cache:', cacheName);
    }
    
    // Reduce cache sizes if needed
    await trimCacheSize(STATIC_CACHE, MAX_STATIC_CACHE);
    await trimCacheSize(API_CACHE, MAX_API_CACHE);
    await trimCacheSize(MAP_CACHE, MAX_MAP_CACHE);
    
    // Reset error counter
    errorCount = 0;
    
    console.log('[SW] Error recovery completed');
  } catch (recoveryError) {
    console.error('[SW] Error recovery failed:', recoveryError);
  }
}

// Calculate cache size
async function getCacheSize(cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    let totalSize = 0;
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error(`[SW] Failed to calculate cache size for ${cacheName}:`, error);
    return 0;
  }
}

// Trim cache to specified size limit
async function trimCacheSize(cacheName, maxSize) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const cacheEntries = [];
    
    // Get all cache entries with their sizes and timestamps
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        const dateHeader = response.headers.get('date');
        cacheEntries.push({
          request,
          size: blob.size,
          timestamp: dateHeader ? new Date(dateHeader).getTime() : 0
        });
      }
    }
    
    // Sort by timestamp (oldest first)
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate total size and remove oldest entries if needed
    let totalSize = cacheEntries.reduce((sum, entry) => sum + entry.size, 0);
    let removed = 0;
    
    while (totalSize > maxSize && cacheEntries.length > 0) {
      const entry = cacheEntries.shift();
      if (entry) {
        await cache.delete(entry.request);
        totalSize -= entry.size;
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`[SW] Trimmed ${removed} items from ${cacheName} to stay under ${maxSize} bytes`);
    }
  } catch (error) {
    console.error(`[SW] Failed to trim cache ${cacheName}:`, error);
    trackError(error);
  }
}

// Remove expired cache entries
async function removeExpiredEntries(cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const now = Date.now();
    let removed = 0;
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          const cacheTime = new Date(dateHeader).getTime();
          if (now - cacheTime > MAX_CACHE_AGE) {
            await cache.delete(request);
            removed++;
          }
        }
      }
    }
    
    if (removed > 0) {
      console.log(`[SW] Removed ${removed} expired entries from ${cacheName}`);
    }
  } catch (error) {
    console.error(`[SW] Failed to remove expired entries from ${cacheName}:`, error);
    trackError(error);
  }
}

// Enhanced fetch with retry logic
async function fetchWithRetry(request, retries = 3, timeout = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(request.clone(), {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok || response.status === 304) {
        return response;
      }
      
      // For server errors, don't retry
      if (response.status >= 500 && i < retries - 1) {
        console.log(`[SW] Server error ${response.status}, retrying... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      console.log(`[SW] Fetch failed, retrying... (${i + 1}/${retries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Determine caching strategy based on request
function getCachingStrategy(request) {
  const url = new URL(request.url);
  
  // Skip caching for sensitive endpoints
  if (url.pathname.includes('csrf-token') || 
      url.pathname.includes('auth') || 
      url.pathname.includes('login') ||
      url.pathname.includes('session')) {
    return 'network-only';
  }
  
  // API calls - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    return 'network-first';
  }
  
  // Map tiles - cache first for performance
  if (MAP_PATTERNS.some(pattern => pattern.test(request.url))) {
    return 'cache-first';
  }
  
  // Static assets - cache first
  if (request.url.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/)) {
    return 'cache-first';
  }
  
  // HTML pages - network first for freshness
  if (request.headers.get('accept')?.includes('text/html')) {
    return 'network-first';
  }
  
  // Default strategy
  return 'network-first';
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

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing TruckNav Pro Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache essential files with error handling
      caches.open(STATIC_CACHE).then((cache) => {
        return Promise.all(
          ESSENTIAL_FILES.map(url => 
            cache.add(url).catch(error => {
              console.error(`[SW] Failed to cache ${url}:`, error);
              trackError(error);
            })
          )
        );
      }),
      // Force immediate activation
      self.skipWaiting()
    ]).then(() => {
      console.log('[SW] Installation complete');
    }).catch((error) => {
      console.error('[SW] Installation failed:', error);
      trackError(error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating TruckNav Pro Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.includes('trucknav') && 
                !cacheName.includes(CACHE_VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activation complete');
      // Perform initial cache maintenance
      removeExpiredEntries(STATIC_CACHE);
      removeExpiredEntries(API_CACHE);
      removeExpiredEntries(MAP_CACHE);
    }).catch((error) => {
      console.error('[SW] Activation failed:', error);
      trackError(error);
    })
  );
});

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  const strategy = getMobileCacheStrategy(event.request);
  
  event.respondWith(
    (async () => {
      try {
        switch (strategy) {
          case 'cache-first':
            return await cacheFirst(event.request);
          
          case 'network-first':
          case 'network-first-mobile':
            return await networkFirst(event.request);
          
          case 'cache-first-mobile':
          case 'cache-first-maps':
            return await cacheFirstWithTimeout(event.request, 3000);
          
          case 'network-only':
            return await fetchWithRetry(event.request);
          
          default:
            return await networkFirst(event.request);
        }
      } catch (error) {
        console.error('[SW] Fetch error:', error);
        trackError(error);
        
        // Try to return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(STATIC_CACHE);
          const offlineResponse = await cache.match('/offline.html');
          if (offlineResponse) {
            return offlineResponse;
          }
        }
        
        // Return a basic error response
        return new Response('Network error occurred', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      }
    })()
  );
});

// Cache-first strategy
async function cacheFirst(request) {
  const cache = await caches.open(determineCacheName(request));
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetchWithRetry(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {}); // Ignore background update errors
    
    return cachedResponse;
  }
  
  const networkResponse = await fetchWithRetry(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetchWithRetry(request, 2, 5000);
    
    if (networkResponse.ok) {
      const cache = await caches.open(determineCacheName(request));
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(determineCacheName(request));
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache (network failed):', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache-first with timeout (for maps)
async function cacheFirstWithTimeout(request, timeout) {
  const cache = await caches.open(determineCacheName(request));
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Try to update cache with timeout
    Promise.race([
      fetchWithRetry(request, 1, timeout),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ]).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {}); // Ignore background update errors
    
    return cachedResponse;
  }
  
  const networkResponse = await fetchWithRetry(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// Determine which cache to use based on request type
function determineCacheName(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    return API_CACHE;
  }
  
  if (MAP_PATTERNS.some(pattern => pattern.test(request.url))) {
    return MAP_CACHE;
  }
  
  return STATIC_CACHE;
}

// Periodic maintenance (every hour)
setInterval(() => {
  console.log('[SW] Running periodic cache maintenance...');
  
  // Trim cache sizes
  trimCacheSize(STATIC_CACHE, MAX_STATIC_CACHE);
  trimCacheSize(API_CACHE, MAX_API_CACHE);
  trimCacheSize(MAP_CACHE, MAX_MAP_CACHE);
  
  // Remove expired entries
  removeExpiredEntries(STATIC_CACHE);
  removeExpiredEntries(API_CACHE);
  removeExpiredEntries(MAP_CACHE);
}, 60 * 60 * 1000); // Every hour

console.log('[SW] TruckNav Pro Service Worker loaded v' + CACHE_VERSION);