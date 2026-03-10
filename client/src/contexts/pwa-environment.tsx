import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isIOSDevice } from '@/lib/pwa-registration';

interface PWAEnvironment {
  isStandalone: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  isReady: boolean;
  isIOSDevice: boolean;
}

const PWAEnvironmentContext = createContext<PWAEnvironment | undefined>(undefined);

interface PWAEnvironmentProviderProps {
  children: ReactNode;
}

/**
 * PWA Environment Provider
 * Provides reactive PWA detection state to all components
 * Ensures consistent standalone mode detection across the application
 */
export function PWAEnvironmentProvider({ children }: PWAEnvironmentProviderProps) {
  const [environment, setEnvironment] = useState<PWAEnvironment>({
    isStandalone: false,
    platform: 'unknown',
    isReady: false,
    isIOSDevice: false,
  });

  useEffect(() => {
    const detectPWAEnvironment = () => {
      // Detect standalone mode
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      // Detect iOS
      const iOS = isIOSDevice();

      // Detect platform
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isAndroid = /android/i.test(userAgent);

      let platform: 'ios' | 'android' | 'desktop' | 'unknown' = 'unknown';
      if (iOS) {
        platform = 'ios';
      } else if (isAndroid) {
        platform = 'android';
      } else if (!isMobile) {
        platform = 'desktop';
      }

      console.log('[PWA Environment] Detected:', {
        isStandalone: isStandaloneMode,
        platform,
        isIOSDevice: iOS,
      });

      setEnvironment({
        isStandalone: isStandaloneMode,
        platform,
        isReady: true,
        isIOSDevice: iOS,
      });
    };

    // Initial detection
    detectPWAEnvironment();

    // Listen for display-mode changes
    const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      console.log('[PWA Environment] Display mode changed:', e.matches);
      detectPWAEnvironment();
    };

    // Modern browsers
    if (standaloneMediaQuery.addEventListener) {
      standaloneMediaQuery.addEventListener('change', handleDisplayModeChange);
    } else {
      // Legacy Safari
      (standaloneMediaQuery as any).addListener(handleDisplayModeChange);
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA Environment] App installed event');
      detectPWAEnvironment();
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Listen for visibility change (for iOS standalone detection)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        detectPWAEnvironment();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (standaloneMediaQuery.removeEventListener) {
        standaloneMediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else {
        (standaloneMediaQuery as any).removeListener(handleDisplayModeChange);
      }
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <PWAEnvironmentContext.Provider value={environment}>
      {children}
    </PWAEnvironmentContext.Provider>
  );
}

/**
 * Hook to access PWA environment state
 * Provides reactive standalone mode detection and platform information
 */
export function usePWAEnvironment(): PWAEnvironment {
  const context = useContext(PWAEnvironmentContext);
  if (context === undefined) {
    throw new Error('usePWAEnvironment must be used within PWAEnvironmentProvider');
  }
  return context;
}
