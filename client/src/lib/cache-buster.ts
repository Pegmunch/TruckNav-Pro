// Cache Buster - Forces PWA update when version changes
const STORAGE_KEY = 'trucknav_app_version';
const VERSION_CHECK_INTERVAL = 30000; // Check every 30 seconds for faster updates

export async function checkAppVersion(): Promise<void> {
  try {
    // CRITICAL: Always check version regardless of legal terms to ensure fresh code is served
    // This prevents stale PWA cache from being served on first load
    
    // Fetch the current version from server with aggressive no-cache headers
    const response = await fetch('/app-version.json?t=' + Date.now(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (!response.ok) {
      console.warn('[CACHE-BUSTER] Could not fetch version file');
      return;
    }
    
    const versionData = await response.json();
    const storedVersion = localStorage.getItem(STORAGE_KEY);
    
    console.log('[CACHE-BUSTER] Version check:', {
      current: storedVersion,
      server: versionData.version,
      forceRefresh: versionData.forceRefresh
    });
    
    // Only clear cache if versions actually mismatch (not on every forceRefresh flag)
    if (storedVersion !== versionData.version) {
      console.log('[CACHE-BUSTER] Version mismatch detected - Old:', storedVersion, 'New:', versionData.version, 'clearing cache...');
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('[CACHE-BUSTER] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }
      
      // Clear local storage except for critical user data AND the version key itself
      const preserveKeys = ['trucknav_session', 'trucknav_user_id', 'trucknav_legal_consent', 'trucknav_legal_accepted', 'pwa-install-dismissed', STORAGE_KEY];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !preserveKeys.some(pk => key.includes(pk))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear session storage
      sessionStorage.clear();
      
      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          console.log('[CACHE-BUSTER] Unregistering service worker:', registration.scope);
          await registration.unregister();
        }
      }
      
      // Store the new version
      localStorage.setItem(STORAGE_KEY, versionData.version);
      
      // Force reload the page
      console.log('[CACHE-BUSTER] Forcing page reload...');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  } catch (error) {
    console.error('[CACHE-BUSTER] Error checking version:', error);
  }
}

// Start periodic version checks
export function startVersionMonitoring(): void {
  // Check immediately
  checkAppVersion();
  
  // Check periodically
  setInterval(checkAppVersion, VERSION_CHECK_INTERVAL);
  
  // Also check on visibility change (when app comes to foreground)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkAppVersion();
    }
  });
}

// Manual cache clear function for troubleshooting
export async function forceClearAllCaches(): Promise<void> {
  console.log('[CACHE-BUSTER] Force clearing all caches...');
  
  // Clear all browser caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        console.log('[CACHE-BUSTER] Deleting cache:', cacheName);
        return caches.delete(cacheName);
      })
    );
  }
  
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Unregister service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
  
  // Reload
  window.location.reload();
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).forceClearAllCaches = forceClearAllCaches;
}