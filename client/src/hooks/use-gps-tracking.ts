/**
 * Centralized GPS Tracking Hook for TruckNav Pro
 * 
 * Single source of truth for GPS data across the application.
 * Eliminates duplicate geolocation watchers for better battery life.
 * Implements Exponential Moving Average (EMA) for smooth heading/bearing transitions.
 * 
 * Features:
 * - Single navigator.geolocation.watchPosition call
 * - Heading smoothing using EMA (alpha = 0.25)
 * - Circular angle interpolation for heading (handles 0°/360° wrap)
 * - Proper cleanup on unmount
 * - Error handling with state tracking
 */

import { useState, useEffect, useRef } from 'react';

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

interface UseGPSTrackingOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  headingSmoothingAlpha?: number; // EMA smoothing factor (0-1), default 0.25
  enableHeadingSmoothing?: boolean;
}

interface UseGPSTrackingResult {
  position: GPSPosition | null;
  error: GPSError | null;
  isTracking: boolean;
}

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
 * Centralized GPS tracking hook
 * 
 * Usage:
 * ```tsx
 * const { position, error, isTracking } = useGPSTracking({
 *   enableHighAccuracy: true,
 *   headingSmoothingAlpha: 0.25
 * });
 * ```
 */
export const useGPSTracking = (options: UseGPSTrackingOptions = {}): UseGPSTrackingResult => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 1000,
    headingSmoothingAlpha = 0.25, // 0.25 = smooth transitions, 1.0 = no smoothing
    enableHeadingSmoothing = true
  } = options;

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

    // Start GPS tracking
    const startTracking = () => {
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
            console.debug(`[GPS] Error (code ${geoError.code}): ${geoError.message}`);
          }
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
        }
      );
    };

    startTracking();

    // Cleanup: Stop GPS tracking when component unmounts
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      smoothedHeadingRef.current = null;
    };
  }, [enableHighAccuracy, timeout, maximumAge, headingSmoothingAlpha, enableHeadingSmoothing]);

  return {
    position,
    error,
    isTracking
  };
};
