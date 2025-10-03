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

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';

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

export interface GPSContextValue {
  position: GPSPosition | null;
  error: GPSError | null;
  isTracking: boolean;
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
  timeout = 5000,
  maximumAge = 0,
  headingSmoothingAlpha = 0.25,
  enableHeadingSmoothing = true
}: GPSProviderProps) {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<GPSError | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);

  useEffect(() => {
    // Check geolocation support
    if (!('geolocation' in navigator)) {
      setError({
        code: 0,
        message: 'Geolocation not supported by this browser'
      });
      return;
    }

    console.log('[GPS-PROVIDER] Starting SINGLE GPS watcher for entire app');

    // Start GPS tracking
    setIsTracking(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (geoPosition) => {
        const { coords, timestamp } = geoPosition;
        const rawHeading = coords.heading;

        // Apply heading smoothing if enabled and heading is available
        let smoothed: number | null = null;
        if (enableHeadingSmoothing && rawHeading !== null) {
          if (smoothedHeadingRef.current === null) {
            // First reading: initialize smoothed heading
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
        setPosition({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          altitudeAccuracy: coords.altitudeAccuracy,
          speed: coords.speed,
          heading: rawHeading,
          smoothedHeading: smoothed,
          timestamp
        });

        // Clear any previous errors
        setError(null);
      },
      (geoError) => {
        // Handle GPS errors
        setError({
          code: geoError.code,
          message: geoError.message
        });

        // Log errors for debugging (but don't spam on permission denied)
        if (geoError.code !== GeolocationPositionError.PERMISSION_DENIED) {
          console.debug(`[GPS-PROVIDER] Error (code ${geoError.code}): ${geoError.message}`);
        }
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );

    // Cleanup: Stop GPS tracking when provider unmounts
    return () => {
      if (watchIdRef.current !== null) {
        console.log('[GPS-PROVIDER] Stopping GPS watcher');
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      smoothedHeadingRef.current = null;
    };
  }, [enableHighAccuracy, timeout, maximumAge, headingSmoothingAlpha, enableHeadingSmoothing]);

  const value: GPSContextValue = {
    position,
    error,
    isTracking
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
