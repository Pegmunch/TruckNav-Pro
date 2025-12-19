/**
 * PWA Service Worker Registration
 * TruckNav Pro - Patent-protected by Bespoke Marketing.Ai Ltd
 * 
 * Handles service worker registration, updates, and lifecycle management
 * with iOS-specific enhancements for optimal PWA experience
 */

import { useEffect, useState } from 'react';

/**
 * Toggle service worker caching for development
 * Call this in browser console: toggleSWDevMode(true) or toggleSWDevMode(false)
 */
export function toggleSWDevMode(enabled: boolean) {
  if (!navigator.serviceWorker.controller) {
    console.log('[PWA] No service worker active yet');
    return;
  }
  
  navigator.serviceWorker.controller.postMessage({
    type: 'DEV_MODE',
    enabled
  });
  
  console.log(`[PWA] Service worker caching ${enabled ? 'DISABLED (dev mode)' : 'ENABLED (production mode)'}`);
  console.log('[PWA] TIP: Run toggleSWDevMode(true) to disable caching during development');
  console.log('[PWA] TIP: Run toggleSWDevMode(false) to re-enable caching');
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).toggleSWDevMode = toggleSWDevMode;
}

export interface ServiceWorkerUpdate {
  type: 'update-available' | 'update-ready' | 'offline-ready' | 'error';
  message: string;
  registration?: ServiceWorkerRegistration;
  worker?: ServiceWorker;
}

export type ServiceWorkerUpdateCallback = (update: ServiceWorkerUpdate) => void;

/**
 * Register the service worker with update handling
 * @param onUpdate Callback for service worker updates
 * @returns Service worker registration or null
 */
export async function registerServiceWorker(
  onUpdate?: ServiceWorkerUpdateCallback
): Promise<ServiceWorkerRegistration | null> {
  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Workers not supported in this browser');
    return null;
  }

  try {
    // CRITICAL: Use dynamic versioned URL to force iOS PWA to download new service worker
    // iOS caches sw.js URL and won't refetch unless URL changes
    // Use timestamp to ensure every reload checks for updates
    const SW_VERSION = `${Math.floor(Date.now() / 60000)}`; // Changes every minute
    
    // Register the service worker with version query string
    const registration = await navigator.serviceWorker.register(`/sw.js?v=${SW_VERSION}`, {
      scope: '/',
      updateViaCache: 'none' // Always check for updates
    });

    console.log('[PWA] Service Worker registered successfully');

    // Check for updates on registration
    await registration.update();

    // Set up update detection
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      console.log('[PWA] New service worker installing');
      
      onUpdate?.({
        type: 'update-available',
        message: 'A new version is downloading...',
        registration,
        worker: newWorker
      });

      newWorker.addEventListener('statechange', () => {
        switch (newWorker.state) {
          case 'installed':
            if (navigator.serviceWorker.controller) {
              // New worker installed but old one still controlling
              console.log('[PWA] New version ready to install');
              onUpdate?.({
                type: 'update-ready',
                message: 'Update ready! Tap to install.',
                registration,
                worker: newWorker
              });
            } else {
              // First time installation
              console.log('[PWA] App cached for offline use');
              onUpdate?.({
                type: 'offline-ready',
                message: 'TruckNav Pro is ready for offline use!',
                registration
              });
            }
            break;
          
          case 'redundant':
            console.log('[PWA] Service worker became redundant');
            break;
        }
      });
    });

    // Handle controller change (new service worker activated)
    // NOTE: Do NOT auto-reload on controllerchange - this causes issues during onboarding
    // where the reload races with localStorage writes (legal consent acceptance)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] New service worker activated - update will take effect on next load');
      // Don't force reload - this prevents race conditions with localStorage writes
    });

    // Check for updates periodically (every 30 seconds)
    setInterval(() => {
      registration.update();
    }, 30000);

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    onUpdate?.({
      type: 'error',
      message: 'Failed to register service worker'
    });
    return null;
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const results = await Promise.all(
      registrations.map(registration => registration.unregister())
    );
    
    console.log('[PWA] Service Workers unregistered:', results.length);
    return results.every(result => result);
  } catch (error) {
    console.error('[PWA] Failed to unregister service workers:', error);
    return false;
  }
}

/**
 * Skip waiting and activate new service worker immediately
 */
export function skipWaitingAndActivate(worker: ServiceWorker): void {
  worker.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * React hook for service worker registration and update management
 */
export function useServiceWorker(autoRegister = true) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoRegister) return;

    const handleUpdate = (update: ServiceWorkerUpdate) => {
      switch (update.type) {
        case 'update-available':
          setUpdateAvailable(true);
          break;
        
        case 'update-ready':
          setUpdateReady(true);
          setUpdateAvailable(false);
          if (update.worker) {
            setWaitingWorker(update.worker);
          }
          break;
        
        case 'offline-ready':
          setOfflineReady(true);
          setTimeout(() => setOfflineReady(false), 5000);
          break;
        
        case 'error':
          setError(update.message);
          break;
      }
    };

    registerServiceWorker(handleUpdate).then(reg => {
      setRegistration(reg);
    });
  }, [autoRegister]);

  const applyUpdate = () => {
    if (waitingWorker) {
      skipWaitingAndActivate(waitingWorker);
      setUpdateReady(false);
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
    setUpdateReady(false);
  };

  return {
    registration,
    updateAvailable,
    updateReady,
    offlineReady,
    error,
    applyUpdate,
    dismissUpdate
  };
}

/**
 * Check if running as PWA (standalone mode)
 */
export function isRunningAsPWA(): boolean {
  // Check various standalone indicators
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;
  const isAndroidApp = document.referrer.includes('android-app://');
  
  return isStandalone || isIOSStandalone || isAndroidApp;
}

/**
 * Detect iOS device
 */
export function isIOSDevice(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

/**
 * Get iOS version
 */
export function getIOSVersion(): number | null {
  const match = navigator.userAgent.match(/OS (\d+)_/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Check if iOS and can install PWA
 */
export function canInstallIOSPWA(): boolean {
  return isIOSDevice() && !isRunningAsPWA();
}
