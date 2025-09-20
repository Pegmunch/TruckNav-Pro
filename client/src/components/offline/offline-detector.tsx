import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi, CloudOff } from 'lucide-react';

interface OfflineDetectorProps {
  children: React.ReactNode;
  showPersistentIndicator?: boolean;
  className?: string;
}

/**
 * Offline Detection Component
 * Monitors network connectivity and displays appropriate indicators
 * Provides context for offline-first functionality
 */
export function OfflineDetector({ 
  children, 
  showPersistentIndicator = true,
  className = ""
}: OfflineDetectorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(!navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('');

  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineDetector] Back online');
      setIsOnline(true);
      setShowOfflineBanner(false);
      
      // Trigger service worker sync when back online
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          // Type assertion for sync support
          const syncRegistration = registration as any;
          if (syncRegistration.sync) {
            return syncRegistration.sync.register('offline-requests');
          }
        }).catch(error => {
          console.log('[OfflineDetector] Background sync registration failed:', error);
        });
      }
    };

    const handleOffline = () => {
      console.log('[OfflineDetector] Gone offline');
      setIsOnline(false);
      setShowOfflineBanner(true);
    };

    // Network connection change detection
    const handleConnectionChange = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || '');
        console.log('[OfflineDetector] Connection type:', connection.effectiveType);
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Network Information API (if supported)
    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      connection?.addEventListener('change', handleConnectionChange);
      
      // Get initial connection type
      handleConnectionChange();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        connection?.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return (
    <div className={`offline-detector ${className}`} data-testid="offline-detector">
      {/* Offline Banner */}
      {showOfflineBanner && (
        <Alert 
          className="fixed top-0 left-0 right-0 z-50 bg-destructive/90 text-destructive-foreground border-destructive/20 backdrop-blur-sm"
          data-testid="offline-banner"
        >
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>
              You're currently offline. TruckNav Pro will continue working with cached data.
            </span>
            <button 
              onClick={() => setShowOfflineBanner(false)}
              className="ml-4 text-destructive-foreground/80 hover:text-destructive-foreground"
              data-testid="button-dismiss-offline"
              aria-label="Dismiss offline notice"
            >
              ✕
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Persistent Connection Indicator */}
      {showPersistentIndicator && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-40" data-testid="connection-indicator">
          <Badge 
            variant={isOnline ? "secondary" : "destructive"}
            className="flex items-center gap-1 px-2 py-1 text-xs"
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>Online</span>
                {connectionType && (
                  <span className="text-xs opacity-75">({connectionType})</span>
                )}
              </>
            ) : (
              <>
                <CloudOff className="h-3 w-3" />
                <span>Offline</span>
              </>
            )}
          </Badge>
        </div>
      )}

      {/* Main Content */}
      {children}
    </div>
  );
}

/**
 * Hook for accessing offline status in components
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
  };
}

/**
 * Component for showing offline-specific messages
 */
export function OfflineMessage({ 
  message = "This feature requires an internet connection",
  className = "",
  showIcon = true 
}: { 
  message?: string;
  className?: string;
  showIcon?: boolean;
}) {
  const { isOffline } = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <Alert className={`bg-muted ${className}`} data-testid="offline-message">
      {showIcon && <WifiOff className="h-4 w-4" />}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}