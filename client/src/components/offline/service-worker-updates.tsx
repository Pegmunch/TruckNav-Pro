import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, X } from 'lucide-react';

interface ServiceWorkerUpdateProps {
  className?: string;
}

/**
 * Service Worker Update Notification Component
 * Handles service worker lifecycle events and update notifications
 * Provides user-friendly update prompts and background sync indicators
 */
export function ServiceWorkerUpdates({ className = "" }: ServiceWorkerUpdateProps) {
  const [showUpdateAvailable, setShowUpdateAvailable] = useState(false);
  const [showUpdateReady, setShowUpdateReady] = useState(false);
  const [showOfflineReady, setShowOfflineReady] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [backgroundSyncActive, setBackgroundSyncActive] = useState(false);
  const [waitingServiceWorker, setWaitingServiceWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let updateCheckInterval: ReturnType<typeof setInterval> | null = null;
    let syncCheckInterval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    // Handle service worker registration updates
    // NOTE: Do NOT auto-reload on controllerchange - this causes issues during onboarding
    // where the reload races with localStorage writes (legal consent acceptance)
    const handleControllerChange = () => {
      if (!isMounted) return;
      console.log('[SW Updates] New service worker is controlling the page');
      // Let the user know an update was applied, but don't force reload
      // The new SW will take effect on next natural page load
      setShowOfflineReady(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Monitor service worker registration
    navigator.serviceWorker.ready.then(registration => {
      if (!isMounted) return;

      // Check for updates every 30 seconds
      updateCheckInterval = setInterval(() => {
        registration.update();
      }, 30000);

      // Handle update found
      const handleUpdateFound = () => {
        if (!isMounted) return;
        const newWorker = registration.installing;
        if (!newWorker) return;

        console.log('[SW Updates] New service worker installing');
        setShowUpdateAvailable(true);

        const handleStateChange = () => {
          if (!isMounted) return;
          switch (newWorker.state) {
            case 'installed':
              if (navigator.serviceWorker.controller) {
                // New worker installed but old one still controlling
                console.log('[SW Updates] New service worker installed, waiting to take control');
                setWaitingServiceWorker(newWorker);
                setShowUpdateReady(true);
                setShowUpdateAvailable(false);
              } else {
                // First time installation
                console.log('[SW Updates] App is ready for offline use');
                setShowOfflineReady(true);
              }
              break;
            case 'redundant':
              console.log('[SW Updates] Service worker became redundant');
              break;
          }
        };

        newWorker.addEventListener('statechange', handleStateChange);
      };

      registration.addEventListener('updatefound', handleUpdateFound);
    });

    // Monitor background sync status (mock implementation)
    const checkBackgroundSync = () => {
      if (!isMounted) return;
      // In a real implementation, this would check for pending requests
      const hasPendingRequests = localStorage.getItem('offline-requests');
      setBackgroundSyncActive(!!hasPendingRequests);
    };

    syncCheckInterval = setInterval(checkBackgroundSync, 5000);
    checkBackgroundSync();

    // Cleanup function - MUST be at top level of useEffect, not inside promises
    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      if (updateCheckInterval) clearInterval(updateCheckInterval);
      if (syncCheckInterval) clearInterval(syncCheckInterval);
    };
  }, []);

  const handleUpdateClick = () => {
    if (waitingServiceWorker) {
      setIsUpdating(true);
      console.log('[SW Updates] Triggering service worker update');
      
      // Tell the waiting service worker to skip waiting
      waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
      
      setTimeout(() => {
        setIsUpdating(false);
        setShowUpdateReady(false);
      }, 1000);
    }
  };

  const dismissNotification = (type: string) => {
    switch (type) {
      case 'update-available':
        setShowUpdateAvailable(false);
        break;
      case 'update-ready':
        setShowUpdateReady(false);
        break;
      case 'offline-ready':
        setShowOfflineReady(false);
        break;
    }
  };

  return (
    <div className={`service-worker-updates ${className}`} data-testid="sw-updates">
      {/* Update Available Notification */}
      {showUpdateAvailable && (
        <Alert 
          className="fixed bottom-4 right-4 max-w-sm z-50 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800"
          data-testid="alert-update-available"
        >
          <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            Update Available
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            <div className="flex items-center justify-between mt-2">
              <span>A new version is downloading...</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification('update-available')}
                className="ml-2 h-6 w-6 p-0"
                data-testid="button-dismiss-update-available"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Update Ready Notification */}
      {showUpdateReady && (
        <Alert 
          className="fixed bottom-4 right-4 max-w-sm z-50 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800"
          data-testid="alert-update-ready"
        >
          <RefreshCw className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Update Ready
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            <p className="mb-2">New version ready to install!</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdateClick}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-install-update"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Install Now'
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification('update-ready')}
                data-testid="button-dismiss-update-ready"
              >
                Later
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Offline Ready Notification */}
      {showOfflineReady && (
        <Alert 
          className="fixed bottom-4 right-4 max-w-sm z-50 border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800"
          data-testid="alert-offline-ready"
        >
          <Download className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <AlertTitle className="text-purple-800 dark:text-purple-200">
            App Ready for Offline Use
          </AlertTitle>
          <AlertDescription className="text-purple-700 dark:text-purple-300">
            <div className="flex items-center justify-between mt-2">
              <span>TruckNav Pro is now available offline!</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification('offline-ready')}
                className="ml-2 h-6 w-6 p-0"
                data-testid="button-dismiss-offline-ready"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Background Sync Indicator */}
      {backgroundSyncActive && (
        <div 
          className="fixed bottom-20 right-4 z-40"
          data-testid="background-sync-indicator"
        >
          <Badge 
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1 text-xs animate-pulse"
          >
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Syncing...</span>
          </Badge>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for checking if service worker updates are available
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(registration => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
            setWaitingWorker(newWorker);
          }
        });
      });
    });
  }, []);

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
    }
  };

  return {
    updateAvailable,
    applyUpdate
  };
}