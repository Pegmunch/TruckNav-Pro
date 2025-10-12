/**
 * GPS Context Provider for TruckNav Pro
 * 
 * SINGLETON PATTERN: Single navigator.geolocation.watchPosition for entire app
 * Eliminates duplicate GPS watchers and reduces battery drain
 * 
 * Features:
 * - Single watchPosition call owned by the provider
 * - All components subscribe to shared GPS state via useGPS() hook
 * - Implements Exponential Moving Average (EMA) for smooth heading/bearing (alpha=0.25)
 * - Proper cleanup on unmount
 * - Error handling with state tracking
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  speed: number | null;
  heading: number | null;
  smoothedHeading: number | null;
  timestamp: number;
}

export interface GPSError {
  code: number;
  message: string;
}

export type GPSErrorType = 'PERMISSION_DENIED' | 'TIMEOUT' | 'UNAVAILABLE' | 'NOT_SUPPORTED' | null;

export interface GPSContextValue {
  position: GPSPosition | null;
  error: GPSError | null;
  isTracking: boolean;
  errorType: GPSErrorType;
  errorMessage: string | null;
  canRetry: boolean;
  retryGPS: () => void;
}

interface GPSProviderProps {
  children: ReactNode;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  headingSmoothingAlpha?: number;
  enableHeadingSmoothing?: boolean;
}

const GPSContext = createContext<GPSContextValue | null>(null);

// Cache key for localStorage
const GPS_CACHE_KEY = 'trucknav_gps_last_known_position';

/**
 * Save GPS position to localStorage for use as fallback
 */
const saveGPSToCache = (position: GPSPosition): void => {
  try {
    localStorage.setItem(GPS_CACHE_KEY, JSON.stringify(position));
    console.log('[GPS-CACHE] Saved position to localStorage:', {
      lat: position.latitude,
      lng: position.longitude,
      timestamp: new Date(position.timestamp).toISOString()
    });
  } catch (e) {
    console.warn('[GPS-CACHE] Failed to save to localStorage:', e);
  }
};

/**
 * Load cached GPS position from localStorage
 */
const loadGPSFromCache = (): GPSPosition | null => {
  try {
    const cached = localStorage.getItem(GPS_CACHE_KEY);
    if (cached) {
      const position = JSON.parse(cached) as GPSPosition;
      const age = Date.now() - position.timestamp;
      
      // Only use cache if less than 24 hours old
      if (age < 24 * 60 * 60 * 1000) {
        console.log('[GPS-CACHE] Loaded cached position:', {
          lat: position.latitude,
          lng: position.longitude,
          age: Math.round(age / 1000) + 's old'
        });
        return position;
      } else {
        console.log('[GPS-CACHE] Cached position too old, discarding');
        localStorage.removeItem(GPS_CACHE_KEY);
      }
    }
  } catch (e) {
    console.warn('[GPS-CACHE] Failed to load from localStorage:', e);
  }
  return null;
};

/**
 * Normalize angle to 0-360 range
 */
const normalizeAngle = (angle: number): number => {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
};

/**
 * Calculate shortest angular distance between two headings
 * Handles circular nature of angles (e.g., 350° to 10° should be +20°, not -340°)
 */
const angleDifference = (target: number, current: number): number => {
  const diff = normalizeAngle(target - current);
  return diff > 180 ? diff - 360 : diff;
};

/**
 * Exponential Moving Average for heading smoothing
 * Handles circular angle interpolation (0°/360° boundary)
 */
const smoothHeading = (currentHeading: number, previousHeading: number, alpha: number): number => {
  const diff = angleDifference(currentHeading, previousHeading);
  const smoothed = previousHeading + alpha * diff;
  return normalizeAngle(smoothed);
};

/**
 * Classify GPS error code into user-friendly error type
 */
const classifyGPSError = (code: number): GPSErrorType => {
  switch (code) {
    case GeolocationPositionError.PERMISSION_DENIED:
      return 'PERMISSION_DENIED';
    case GeolocationPositionError.TIMEOUT:
      return 'TIMEOUT';
    case GeolocationPositionError.POSITION_UNAVAILABLE:
      return 'UNAVAILABLE';
    case 0:
      return 'NOT_SUPPORTED';
    default:
      return 'UNAVAILABLE';
  }
};

/**
 * Get user-friendly error message for GPS error type
 */
const getGPSErrorMessage = (errorType: GPSErrorType): string => {
  switch (errorType) {
    case 'PERMISSION_DENIED':
      return 'GPS access denied. Please enable location services in your browser settings.';
    case 'TIMEOUT':
      return 'GPS signal lost. Make sure you\'re not in a building or tunnel.';
    case 'UNAVAILABLE':
      return 'GPS temporarily unavailable. Please check your device settings.';
    case 'NOT_SUPPORTED':
      return 'GPS is not supported by this browser.';
    default:
      return 'GPS is not available.';
  }
};

/**
 * Check if GPS error is retryable
 */
const canRetryGPSError = (errorType: GPSErrorType): boolean => {
  return errorType === 'TIMEOUT' || errorType === 'UNAVAILABLE';
};

/**
 * GPS Provider Component
 * 
 * Wraps your app/page to provide GPS data to all child components
 * 
 * Usage:
 * ```tsx
 * <GPSProvider>
 *   <YourApp />
 * </GPSProvider>
 * ```
 */
export function GPSProvider({
  children,
  enableHighAccuracy = true,
  timeout = 10000, // Increased to 10s for better accuracy
  maximumAge = 0, // Always get fresh GPS data
  headingSmoothingAlpha = 0.25,
  enableHeadingSmoothing = true
}: GPSProviderProps) {
  // Initialize with cached position if available
  const [position, setPosition] = useState<GPSPosition | null>(() => {
    const cached = loadGPSFromCache();
    if (cached) {
      console.log('[GPS-PROVIDER] Initialized with cached position');
    }
    return cached;
  });
  const [error, setError] = useState<GPSError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [errorType, setErrorType] = useState<GPSErrorType>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);
  const lastHeadingUpdateRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startGPSTracking = useCallback(() => {
    // Check geolocation support
    if (!('geolocation' in navigator)) {
      const errType = 'NOT_SUPPORTED';
      setError({
        code: 0,
        message: 'Geolocation not supported by this browser'
      });
      setErrorType(errType);
      setErrorMessage(getGPSErrorMessage(errType));
      return;
    }

    console.log('[GPS-PROVIDER] Starting SINGLE GPS watcher for entire app');

    // Clear any previous errors
    setError(null);
    setErrorType(null);
    setErrorMessage(null);
    
    // Start GPS tracking
    setIsTracking(true);

    // Use watchPosition for continuous GPS updates with high accuracy
    // Request initial position first to trigger permission if needed
    navigator.geolocation.getCurrentPosition(
      (initialPos) => {
        console.log('[GPS-PROVIDER] ✅ Initial position acquired:', {
          lat: initialPos.coords.latitude,
          lng: initialPos.coords.longitude,
          accuracy: initialPos.coords.accuracy
        });
      },
      (error) => {
        console.log('[GPS-PROVIDER] ⚠️ Initial position failed:', error.message);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (geoPosition) => {
        console.log('[GPS-PROVIDER] ✅ Position received:', {
          lat: geoPosition.coords.latitude,
          lng: geoPosition.coords.longitude,
          accuracy: geoPosition.coords.accuracy,
          altitude: geoPosition.coords.altitude,
          speed: geoPosition.coords.speed
        });
        
        // Log accuracy level for debugging
        if (geoPosition.coords.accuracy > 100) {
          console.log('[GPS-PROVIDER] ⚠️ Low accuracy:', geoPosition.coords.accuracy, 'meters');
        }
        
        const { coords, timestamp } = geoPosition;
        const rawHeading = coords.heading;

        // Apply heading smoothing if enabled and heading is available
        let smoothed: number | null = null;
        if (enableHeadingSmoothing && rawHeading !== null) {
          const now = Date.now();
          const timeDelta = now - lastHeadingUpdateRef.current;
          lastHeadingUpdateRef.current = now;

          if (smoothedHeadingRef.current === null) {
            // First reading: initialize smoothed heading
            smoothedHeadingRef.current = rawHeading;
            smoothed = rawHeading;
          } else if (timeDelta > 2000) {
            // Skip smoothing if too much time passed (>2 seconds) - reset to current heading
            smoothedHeadingRef.current = rawHeading;
            smoothed = rawHeading;
          } else {
            // Apply EMA smoothing with circular interpolation
            smoothedHeadingRef.current = smoothHeading(
              rawHeading,
              smoothedHeadingRef.current,
              headingSmoothingAlpha
            );
            smoothed = smoothedHeadingRef.current;
          }
        } else if (rawHeading !== null) {
          // Heading available but smoothing disabled
          smoothed = rawHeading;
        }

        // Update position state
        const newPosition: GPSPosition = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          altitudeAccuracy: coords.altitudeAccuracy,
          speed: coords.speed,
          heading: rawHeading,
          smoothedHeading: smoothed,
          timestamp
        };
        
        setPosition(newPosition);
        
        // Save to localStorage for future use
        saveGPSToCache(newPosition);

        // Clear any previous errors
        setError(null);
        setErrorType(null);
        setErrorMessage(null);
      },
      (geoError) => {
        console.error('[GPS-PROVIDER] ❌ Error callback triggered:', {
          code: geoError.code,
          message: geoError.message,
          PERMISSION_DENIED: GeolocationPositionError.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: GeolocationPositionError.POSITION_UNAVAILABLE,
          TIMEOUT: GeolocationPositionError.TIMEOUT
        });
        
        // Classify and handle GPS errors
        const errType = classifyGPSError(geoError.code);
        const errMessage = getGPSErrorMessage(errType);
        
        setError({
          code: geoError.code,
          message: geoError.message
        });
        setErrorType(errType);
        setErrorMessage(errMessage);

        // Log errors for debugging
        console.warn(`[GPS-PROVIDER] GPS Error: ${errMessage} (code: ${geoError.code})`);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
  }, [enableHighAccuracy, timeout, maximumAge, headingSmoothingAlpha, enableHeadingSmoothing]);

  const stopGPSTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      console.log('[GPS-PROVIDER] Stopping GPS watcher');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (retryTimeoutRef.current !== null) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setIsTracking(false);
    smoothedHeadingRef.current = null;
  }, []);

  const retryGPS = useCallback(() => {
    console.log('[GPS-PROVIDER] Retrying GPS connection...');
    stopGPSTracking();
    
    // Small delay before retry to avoid immediate re-error
    retryTimeoutRef.current = setTimeout(() => {
      startGPSTracking();
    }, 500);
  }, [stopGPSTracking, startGPSTracking]);

  useEffect(() => {
    startGPSTracking();

    // Cleanup: Stop GPS tracking when provider unmounts
    return () => {
      stopGPSTracking();
    };
  }, [startGPSTracking, stopGPSTracking]);

  const value: GPSContextValue = {
    position,
    error,
    isTracking,
    errorType,
    errorMessage,
    canRetry: errorType ? canRetryGPSError(errorType) : false,
    retryGPS
  };

  return (
    <GPSContext.Provider value={value}>
      {children}
    </GPSContext.Provider>
  );
}

/**
 * Hook to access GPS data from any component
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const gps = useGPS();
 *   
 *   if (!gps) {
 *     return <div>GPS not available</div>;
 *   }
 *   
 *   return (
 *     <div>
 *       Speed: {gps.position?.speed ?? 0} m/s
 *       Heading: {gps.position?.smoothedHeading ?? 0}°
 *     </div>
 *   );
 * }
 * ```
 */
export function useGPS(): GPSContextValue | null {
  const context = useContext(GPSContext);
  
  if (context === null) {
    console.warn('[GPS] useGPS() called outside of GPSProvider. Wrap your app with <GPSProvider>');
  }
  
  return context;
}
