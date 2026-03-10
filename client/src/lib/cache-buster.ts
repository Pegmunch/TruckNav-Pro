// Cache Buster - Smart version detection
// DUAL-TIER: Only clears APP CODE caches on version change
// Navigation/map data is preserved for offline backup
const STORAGE_KEY = 'trucknav_app_version';
const VERSION_CHECK_INTERVAL = 60 * 1000;
let isOnboarding = false;

export function pauseCacheBusterDuringOnboarding(isPaused: boolean): void {
  isOnboarding = isPaused;
}

export async function checkAppVersion(): Promise<void> {
  if (isOnboarding) return;

  try {
    const response = await fetch('/app-version.json?t=' + Date.now(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (!response.ok) return;

    const versionData = await response.json();
    const storedVersion = localStorage.getItem(STORAGE_KEY);

    console.log('[CACHE-BUSTER] Version check:', {
      current: storedVersion,
      server: versionData.version,
      forceRefresh: versionData.forceRefresh
    });

    if (storedVersion === null) {
      console.log('[CACHE-BUSTER] First load - storing version:', versionData.version);
      localStorage.setItem(STORAGE_KEY, versionData.version);
      return;
    }

    if (storedVersion !== versionData.version) {
      console.log('[CACHE-BUSTER] New version detected:', storedVersion, '→', versionData.version);

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const navCachesToKeep = ['trucknav-maps-v1', 'trucknav-api-v1'];

        await Promise.all(
          cacheNames.map(cacheName => {
            const isNavCache = navCachesToKeep.includes(cacheName);
            if (isNavCache) {
              console.log('[CACHE-BUSTER] Keeping navigation cache:', cacheName);
              return Promise.resolve();
            }
            console.log('[CACHE-BUSTER] Clearing app cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }

      const preserveKeys = [
        'trucknav_session', 'trucknav_user_id',
        'trucknav_legal_consent', 'trucknav_legal_accepted',
        'pwa-install-dismissed', 'trucknav_country',
        'trucknav_language', 'measurement-system',
        'measurement-region', 'trucknav_cookie_status',
        'navigation_recentDestinations', 'navigation_recentOrigins',
        'trucknav_recent_locations', 'trucknav_cached_route',
        'trucknav_voice_settings', 'trucknav_font_preferences',
        'trucknav_map_preferences', 'trucknav_maplibre_preferences',
        'trucknav_country_preferences', 'trucknav_onboarding',
        'vehicleType', 'activeVehicleProfileId', 'isCarProfileMode',
        'trucknav_gps_mode', 'trucknav_map_engine',
        STORAGE_KEY
      ];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !preserveKeys.some(pk => key.includes(pk))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      sessionStorage.clear();

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          console.log('[CACHE-BUSTER] Updating service worker');
          await registration.update();
        }
      }

      localStorage.setItem(STORAGE_KEY, versionData.version);

      console.log('[CACHE-BUSTER] App code refreshed, navigation data preserved. Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  } catch (error) {
    console.error('[CACHE-BUSTER] Error checking version:', error);
  }
}

export function startVersionMonitoring(): void {
  checkAppVersion();
  setInterval(checkAppVersion, VERSION_CHECK_INTERVAL);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !isOnboarding) {
      checkAppVersion();
    }
  });
}

export async function forceClearAllCaches(): Promise<void> {
  console.log('[CACHE-BUSTER] Force clearing ALL caches including navigation...');
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
  }
  localStorage.clear();
  sessionStorage.clear();
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
  window.location.reload();
}

if (typeof window !== 'undefined') {
  (window as any).forceClearAllCaches = forceClearAllCaches;
}
