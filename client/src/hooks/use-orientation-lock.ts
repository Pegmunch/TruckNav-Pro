import { useState, useEffect, useCallback, useRef } from 'react';

interface OrientationLockOptions {
  enabled?: boolean;
  preferredOrientation?: 'landscape' | 'portrait' | 'landscape-primary' | 'landscape-secondary' | 'portrait-primary' | 'portrait-secondary';
  onOrientationChange?: (orientation: string) => void;
}

/**
 * Custom hook for managing screen orientation lock on tablets and mobile devices
 * Specifically designed for professional truck navigation where landscape mode is preferred
 */
export function useOrientationLock(options: OrientationLockOptions = {}) {
  const {
    enabled = false,
    preferredOrientation = 'landscape',
    onOrientationChange
  } = options;

  const [currentOrientation, setCurrentOrientation] = useState<string>('portrait');
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const callbackRef = useRef(onOrientationChange);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onOrientationChange;
  }, [onOrientationChange]);

  // Check orientation lock support
  useEffect(() => {
    const hasScreenOrientation = !!(screen?.orientation);
    const hasLockMethod = hasScreenOrientation && typeof (screen.orientation as any).lock === 'function';
    const supported = hasLockMethod;
    setIsSupported(supported);
    
    if (!supported) {
      console.log('📱 Screen orientation lock not supported on this device');
    } else {
      console.log('📱 Screen orientation lock supported');
    }
  }, []);

  // Get current orientation
  const getCurrentOrientation = useCallback(() => {
    if (screen?.orientation?.type) {
      return screen.orientation.type;
    }
    
    // Fallback for older browsers
    const orientation = window.orientation;
    if (orientation === 0 || orientation === 180) {
      return 'portrait';
    } else if (orientation === 90 || orientation === -90) {
      return 'landscape';
    }
    
    // CSS media query fallback
    if (window.matchMedia('(orientation: landscape)').matches) {
      return 'landscape';
    }
    
    return 'portrait';
  }, []);

  // Handle orientation changes
  const handleOrientationChange = useCallback(() => {
    const orientation = getCurrentOrientation();
    setCurrentOrientation(orientation);
    
    if (callbackRef.current) {
      callbackRef.current(orientation);
    }
    
    console.log('📱 Orientation changed to:', orientation);
  }, [getCurrentOrientation]);

  // Listen for orientation changes
  useEffect(() => {
    const initialOrientation = getCurrentOrientation();
    setCurrentOrientation(initialOrientation);
    
    // Modern browsers
    if (screen?.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }
    
    // Legacy browsers
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // CSS media query listener
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const mediaListener = () => handleOrientationChange();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', mediaListener);
    } else {
      // Legacy support
      mediaQuery.addListener(mediaListener);
    }
    
    return () => {
      if (screen?.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
      
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', mediaListener);
      } else {
        // Legacy support
        mediaQuery.removeListener(mediaListener);
      }
    };
  }, [getCurrentOrientation, handleOrientationChange]);

  // Lock orientation
  const lockOrientation = useCallback(async (orientation: 'landscape' | 'portrait' | 'landscape-primary' | 'landscape-secondary' | 'portrait-primary' | 'portrait-secondary' = preferredOrientation) => {
    if (!isSupported) {
      setLockError('Orientation lock not supported on this device');
      return false;
    }

    try {
      await (screen.orientation as any).lock(orientation);
      setIsLocked(true);
      setLockError(null);
      console.log('📱 Orientation locked to:', orientation);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to lock orientation';
      setLockError(errorMessage);
      setIsLocked(false);
      console.warn('📱 Failed to lock orientation:', errorMessage);
      return false;
    }
  }, [isSupported, preferredOrientation]);

  // Unlock orientation
  const unlockOrientation = useCallback(async () => {
    if (!isSupported) {
      return false;
    }

    try {
      await (screen.orientation as any).unlock();
      setIsLocked(false);
      setLockError(null);
      console.log('📱 Orientation unlocked');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unlock orientation';
      setLockError(errorMessage);
      console.warn('📱 Failed to unlock orientation:', errorMessage);
      return false;
    }
  }, [isSupported]);

  // Auto-lock when enabled
  useEffect(() => {
    if (enabled && isSupported && !isLocked) {
      lockOrientation(preferredOrientation);
    } else if (!enabled && isLocked) {
      unlockOrientation();
    }
  }, [enabled, isSupported, isLocked, preferredOrientation, lockOrientation, unlockOrientation]);

  // Auto-unlock on component unmount
  useEffect(() => {
    return () => {
      if (isLocked) {
        unlockOrientation();
      }
    };
  }, [isLocked, unlockOrientation]);

  // Check if device is a tablet
  const isTablet = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isTabletUA = /ipad|android(?!.*mobile)|tablet|playbook|silk/i.test(userAgent);
    
    // Also check screen size
    const screenSize = Math.min(screen.width, screen.height);
    const isTabletSize = screenSize >= 768; // Typical tablet minimum width
    
    return isTabletUA || isTabletSize;
  }, []);

  // Get orientation lock preferences
  const getPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem('orientationLockPreferences');
      return stored ? JSON.parse(stored) : {
        enableForNavigation: true,
        enableForMaps: true,
        preferredOrientation: 'landscape',
        onlyOnTablets: true
      };
    } catch {
      return {
        enableForNavigation: true,
        enableForMaps: true,
        preferredOrientation: 'landscape',
        onlyOnTablets: true
      };
    }
  }, []);

  // Save orientation lock preferences
  const savePreferences = useCallback((preferences: any) => {
    try {
      localStorage.setItem('orientationLockPreferences', JSON.stringify(preferences));
      console.log('📱 Orientation preferences saved:', preferences);
    } catch (error) {
      console.warn('📱 Failed to save orientation preferences:', error);
    }
  }, []);

  return {
    currentOrientation,
    isLocked,
    isSupported,
    lockError,
    isTablet: isTablet(),
    lockOrientation,
    unlockOrientation,
    getPreferences,
    savePreferences,
    
    // Utility functions
    isLandscape: currentOrientation.includes('landscape'),
    isPortrait: currentOrientation.includes('portrait'),
    
    // Professional navigation helpers
    enableNavigationLock: () => lockOrientation('landscape'),
    enableMapLock: () => lockOrientation('landscape'),
    disableLock: unlockOrientation
  };
}