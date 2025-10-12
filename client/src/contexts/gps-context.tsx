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

export type GPSAccuracyLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor';
export type GPSConfidenceLevel = 'high' | 'medium' | 'low' | 'very-low';

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
  // New fields for confidence scoring
  confidenceScore: number; // 0-100
  confidenceLevel: GPSConfidenceLevel;
  accuracyLevel: GPSAccuracyLevel;
  isStale: boolean;
  isStuck: boolean;
  isOutOfBounds: boolean;
}

export interface GPSError {
  code: number;
  message: string;
}

export type GPSErrorType = 'PERMISSION_DENIED' | 'TIMEOUT' | 'UNAVAILABLE' | 'NOT_SUPPORTED' | null;

export type GPSStatus = 'acquiring' | 'ready' | 'unavailable' | 'error' | 'initializing';

export interface CachedPosition {
  position: GPSPosition;
  ageInMinutes: number;
  ageDisplay: string;
}

export interface GPSValidationWarning {
  type: 'accuracy' | 'stale' | 'stuck' | 'bounds';
  message: string;
  severity: 'warning' | 'error';
}

export interface GPSContextValue {
  position: GPSPosition | null;
  error: GPSError | null;
  isTracking: boolean;
  errorType: GPSErrorType;
  errorMessage: string | null;
  canRetry: boolean;
  retryGPS: () => void;
  status: GPSStatus;
  cachedPosition: CachedPosition | null;
  useCachedPosition: (useCache: boolean) => void;
  isUsingCached: boolean;
  clearGPSCache: () => void;
  // New fields for validation
  validationWarnings: GPSValidationWarning[];
  lastGoodPosition: GPSPosition | null;
  timeSinceLastUpdate: number | null; // seconds
  shouldPreventAutoCenter: boolean;
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

// Constants for GPS validation
const GPS_ACCURACY_THRESHOLDS = {
  EXCELLENT: 20,    // < 20m
  GOOD: 50,         // < 50m
  FAIR: 100,        // < 100m
  POOR: 250,        // < 250m
  REJECT: 500       // > 500m reject
};

const GPS_CONFIDENCE_WEIGHTS = {
  ACCURACY: 0.4,
  FRESHNESS: 0.3,
  MOVEMENT: 0.15,
  BOUNDS: 0.15
};

const UK_EUROPE_BOUNDS = {
  minLat: 35.0,   // Southern Europe (Gibraltar/Cyprus)
  maxLat: 71.0,   // Northern Europe (Norway)
  minLng: -11.0,  // Western Europe (Ireland)
  maxLng: 40.0    // Eastern Europe (Turkey)
};

const STALE_THRESHOLD_MS = 60000;  // 1 minute
const STUCK_THRESHOLD_MS = 120000; // 2 minutes
const NO_UPDATE_WARNING_MS = 30000; // 30 seconds

/**
 * Determine GPS accuracy level based on accuracy value
 */
const getAccuracyLevel = (accuracy: number): GPSAccuracyLevel => {
  if (accuracy <= GPS_ACCURACY_THRESHOLDS.EXCELLENT) return 'excellent';
  if (accuracy <= GPS_ACCURACY_THRESHOLDS.GOOD) return 'good';
  if (accuracy <= GPS_ACCURACY_THRESHOLDS.FAIR) return 'fair';
  if (accuracy <= GPS_ACCURACY_THRESHOLDS.POOR) return 'poor';
  return 'very-poor';
};

/**
 * Check if coordinates are within reasonable bounds (UK/Europe)
 */
const isWithinBounds = (lat: number, lng: number): boolean => {
  return lat >= UK_EUROPE_BOUNDS.minLat && 
         lat <= UK_EUROPE_BOUNDS.maxLat && 
         lng >= UK_EUROPE_BOUNDS.minLng && 
         lng <= UK_EUROPE_BOUNDS.maxLng;
};

/**
 * Calculate distance between two GPS positions (Haversine formula)
 */
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Detect if GPS is stuck (no movement despite time passing)
 */
const isGPSStuck = (
  currentPos: { lat: number; lng: number; timestamp: number },
  previousPos: { lat: number; lng: number; timestamp: number } | null,
  minDistanceThreshold: number = 5 // meters
): boolean => {
  if (!previousPos) return false;
  
  const timeDiff = currentPos.timestamp - previousPos.timestamp;
  if (timeDiff < STUCK_THRESHOLD_MS) return false;
  
  const distance = calculateDistance(
    currentPos.lat, currentPos.lng,
    previousPos.lat, previousPos.lng
  );
  
  // If less than 5 meters movement in 2+ minutes, likely stuck
  return distance < minDistanceThreshold;
};

/**
 * Calculate GPS confidence score (0-100)
 */
const calculateConfidenceScore = (
  accuracy: number,
  timestamp: number,
  isInBounds: boolean,
  isStuck: boolean
): number => {
  let score = 0;
  
  // Accuracy component (0-40 points)
  if (accuracy <= GPS_ACCURACY_THRESHOLDS.EXCELLENT) {
    score += 40;
  } else if (accuracy <= GPS_ACCURACY_THRESHOLDS.GOOD) {
    score += 35;
  } else if (accuracy <= GPS_ACCURACY_THRESHOLDS.FAIR) {
    score += 25;
  } else if (accuracy <= GPS_ACCURACY_THRESHOLDS.POOR) {
    score += 15;
  } else if (accuracy <= GPS_ACCURACY_THRESHOLDS.REJECT) {
    score += 5;
  } else {
    score += 0;
  }
  
  // Freshness component (0-30 points)
  const age = Date.now() - timestamp;
  if (age < 5000) {
    score += 30;
  } else if (age < 15000) {
    score += 25;
  } else if (age < 30000) {
    score += 20;
  } else if (age < 60000) {
    score += 10;
  } else {
    score += 0;
  }
  
  // Movement component (0-15 points)
  if (!isStuck) {
    score += 15;
  }
  
  // Bounds component (0-15 points)
  if (isInBounds) {
    score += 15;
  }
  
  return Math.min(100, Math.max(0, score));
};

/**
 * Get confidence level from score
 */
const getConfidenceLevel = (score: number): GPSConfidenceLevel => {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 25) return 'low';
  return 'very-low';
};

/**
 * Generate validation warnings based on GPS state
 */
const generateValidationWarnings = (
  accuracy: number,
  timestamp: number,
  isStuck: boolean,
  isOutOfBounds: boolean
): GPSValidationWarning[] => {
  const warnings: GPSValidationWarning[] = [];
  const age = Date.now() - timestamp;
  
  if (accuracy > GPS_ACCURACY_THRESHOLDS.REJECT) {
    warnings.push({
      type: 'accuracy',
      message: `GPS accuracy too low (${Math.round(accuracy)}m). Please move to an open area.`,
      severity: 'error'
    });
  } else if (accuracy > GPS_ACCURACY_THRESHOLDS.FAIR) {
    warnings.push({
      type: 'accuracy',
      message: `GPS accuracy is poor (${Math.round(accuracy)}m)`,
      severity: 'warning'
    });
  }
  
  if (age > STALE_THRESHOLD_MS) {
    warnings.push({
      type: 'stale',
      message: 'GPS data is stale. Check your signal.',
      severity: 'error'
    });
  } else if (age > NO_UPDATE_WARNING_MS) {
    warnings.push({
      type: 'stale',
      message: 'GPS signal weak - no recent updates',
      severity: 'warning'
    });
  }
  
  if (isStuck) {
    warnings.push({
      type: 'stuck',
      message: 'GPS appears stuck. Try restarting location services.',
      severity: 'warning'
    });
  }
  
  if (isOutOfBounds) {
    warnings.push({
      type: 'bounds',
      message: 'GPS coordinates appear incorrect for your region.',
      severity: 'error'
    });
  }
  
  return warnings;
};

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
 * Returns null if no valid cache exists or if cache is too old
 */
const loadGPSFromCache = (): CachedPosition | null => {
  try {
    const cached = localStorage.getItem(GPS_CACHE_KEY);
    if (cached) {
      const position = JSON.parse(cached) as GPSPosition;
      const age = Date.now() - position.timestamp;
      const ageInMinutes = Math.floor(age / (60 * 1000));
      
      // Only consider cache if less than 30 minutes old
      // User must explicitly confirm to use cache older than 5 minutes
      if (ageInMinutes < 30) {
        const ageDisplay = ageInMinutes === 0 ? 'Less than a minute ago' :
                           ageInMinutes === 1 ? '1 minute ago' :
                           `${ageInMinutes} minutes ago`;
        
        console.log('[GPS-CACHE] Found cached position:', {
          lat: position.latitude,
          lng: position.longitude,
          ageInMinutes,
          ageDisplay
        });
        
        return {
          position,
          ageInMinutes,
          ageDisplay
        };
      } else {
        console.log('[GPS-CACHE] Cached position too old (>30 min), discarding');
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
  // DO NOT automatically use cached position - wait for fresh GPS
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<GPSError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [errorType, setErrorType] = useState<GPSErrorType>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<GPSStatus>('initializing');
  const [cachedPosition, setCachedPosition] = useState<CachedPosition | null>(null);
  const [isUsingCached, setIsUsingCached] = useState(false);
  const [hasFreshPosition, setHasFreshPosition] = useState(false);
  
  // New validation state
  const [validationWarnings, setValidationWarnings] = useState<GPSValidationWarning[]>([]);
  const [lastGoodPosition, setLastGoodPosition] = useState<GPSPosition | null>(null);
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState<number | null>(null);
  const [shouldPreventAutoCenter, setShouldPreventAutoCenter] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);
  const lastHeadingUpdateRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const permissionRecoveryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const acquisitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gpsReceivedRef = useRef<boolean>(false);

  /**
   * Clear all cached GPS data and force fresh acquisition
   */
  const clearGPSCache = useCallback(() => {
    console.log('[GPS-DEBUG] 🧹 Clearing all GPS caches and forcing fresh acquisition');
    
    // Clear localStorage cache
    localStorage.removeItem(GPS_CACHE_KEY);
    
    // Clear any other GPS-related localStorage items
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('gps') || key.includes('GPS') || key.includes('location') || key.includes('position'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      console.log(`[GPS-DEBUG] Removing localStorage key: ${key}`);
      localStorage.removeItem(key);
    });
    
    // Clear state
    setCachedPosition(null);
    setIsUsingCached(false);
    setHasFreshPosition(false);
    
    // Stop current tracking if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Restart GPS tracking with fresh state
    setPosition(null);
    setError(null);
    setErrorType(null);
    setErrorMessage(null);
    setStatus('acquiring');
    
    // Start fresh GPS tracking
    setTimeout(() => startGPSTracking(), 100);
    
    console.log('[GPS-DEBUG] ✅ GPS cache cleared and tracking restarted');
  }, []);

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
      setStatus('error');
      return;
    }

    console.log('[GPS-PROVIDER] Starting SINGLE GPS watcher for entire app');

    // Clear any previous errors and reset state
    setError(null);
    setErrorType(null);
    setErrorMessage(null);
    setValidationWarnings([]);
    setShouldPreventAutoCenter(false);
    
    // Start GPS tracking - set status to acquiring
    setIsTracking(true);
    setStatus('acquiring');
    gpsReceivedRef.current = false;
    
    // Set up a timeout for GPS acquisition
    if (acquisitionTimeoutRef.current) {
      clearTimeout(acquisitionTimeoutRef.current);
    }
    
    acquisitionTimeoutRef.current = setTimeout(() => {
      if (!gpsReceivedRef.current) {
        console.warn('[GPS-PROVIDER] GPS acquisition timeout - no position received within 15 seconds');
        
        // Check if we have a cached position to use
        const cached = loadGPSFromCache();
        if (cached && cached.ageInMinutes <= 60) {
          console.log('[GPS-PROVIDER] Using cached position as fallback:', cached);
          setCachedPosition(cached);
          setPosition(cached.position);
          setIsUsingCached(true);
          setStatus('ready');
          console.log(`[GPS-PROVIDER] Using cached position from ${cached.ageDisplay}`);
        } else {
          setStatus('unavailable');
          setError({
            code: GeolocationPositionError.TIMEOUT,
            message: 'GPS signal not available. Please check location settings.'
          });
          setErrorType('TIMEOUT');
          setErrorMessage('GPS signal not available. Please check location settings.');
        }
      }
    }, 15000); // 15 second timeout

    // Use watchPosition for continuous GPS updates with high accuracy
    // Request initial position first to trigger permission if needed
    console.log('[GPS-PROVIDER] Requesting initial position with options:', {
      enableHighAccuracy,
      timeout,
      maximumAge
    });
    
    navigator.geolocation.getCurrentPosition(
      (initialPos) => {
        console.log('[GPS-PROVIDER] ✅ Initial position acquired:', {
          lat: initialPos.coords.latitude,
          lng: initialPos.coords.longitude,
          accuracy: initialPos.coords.accuracy
        });
        // Process this position immediately
        if (!position) {
          // If we don't have a position yet, process this initial position
          // to get GPS working immediately
          const lat = initialPos.coords.latitude;
          const lng = initialPos.coords.longitude;
          console.log('[GPS-PROVIDER] Setting initial position as current position');
        }
      },
      (error) => {
        console.warn('[GPS-PROVIDER] ⚠️ Initial position failed:', {
          code: error.code,
          message: error.message
        });
        // Don't stop here - watchPosition might still work
      },
      {
        enableHighAccuracy,
        timeout: 5000, // Shorter timeout for initial position
        maximumAge: 0
      }
    );
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (geoPosition) => {
        // Enhanced debugging for GPS issue
        const lat = geoPosition.coords.latitude;
        const lng = geoPosition.coords.longitude;
        const accuracy = geoPosition.coords.accuracy;
        const { coords, timestamp } = geoPosition;
        
        // Perform validation checks
        const isInBounds = isWithinBounds(lat, lng);
        const accuracyLevel = getAccuracyLevel(accuracy);
        const isStale = (Date.now() - timestamp) > STALE_THRESHOLD_MS;
        const isStuck = isGPSStuck(
          { lat, lng, timestamp },
          lastPositionRef.current
        );
        
        // Check if coordinates are out of bounds
        const isOutOfBounds = !isInBounds;
        
        // Calculate confidence score
        const confidenceScore = calculateConfidenceScore(
          accuracy,
          timestamp,
          isInBounds,
          isStuck
        );
        const confidenceLevel = getConfidenceLevel(confidenceScore);
        
        // Generate validation warnings
        const warnings = generateValidationWarnings(
          accuracy,
          timestamp,
          isStuck,
          isOutOfBounds
        );
        setValidationWarnings(warnings);
        
        // Determine if we should prevent auto-center
        const preventAutoCenter = accuracy > GPS_ACCURACY_THRESHOLDS.REJECT ||
                                  confidenceScore < 25 ||
                                  isOutOfBounds ||
                                  isStuck;
        setShouldPreventAutoCenter(preventAutoCenter);
        
        console.log('[GPS-VALIDATION] Position analysis:', {
          lat,
          lng,
          accuracy,
          accuracyLevel,
          confidenceScore,
          confidenceLevel,
          isInBounds,
          isStuck,
          isStale,
          preventAutoCenter,
          warnings: warnings.length,
          timestamp: new Date(timestamp).toISOString()
        });
        
        // Store debug info in window for inspection
        (window as any).__GPS_DEBUG__ = {
          currentPosition: { lat, lng, accuracy },
          validationState: {
            confidenceScore,
            confidenceLevel,
            accuracyLevel,
            isStuck,
            isStale,
            isOutOfBounds,
            preventAutoCenter
          },
          timestamp: Date.now()
        };
        
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

        // Create new position with validation data
        const newPosition: GPSPosition = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          altitudeAccuracy: coords.altitudeAccuracy,
          speed: coords.speed,
          heading: rawHeading,
          smoothedHeading: smoothed,
          timestamp,
          // New validation fields
          confidenceScore,
          confidenceLevel,
          accuracyLevel,
          isStale,
          isStuck,
          isOutOfBounds
        };
        
        // Update last position for movement detection
        lastPositionRef.current = { lat, lng, timestamp };
        lastUpdateTimeRef.current = Date.now();
        
        // Save as last good position if confidence is high enough
        if (confidenceScore >= 50 && !isOutOfBounds) {
          setLastGoodPosition(newPosition);
        }
        
        setPosition(newPosition);
        setHasFreshPosition(true);
        setIsUsingCached(false);
        setStatus('ready');
        gpsReceivedRef.current = true; // Mark that we've received GPS
        
        // Only save to cache if it's a good position
        if (confidenceScore >= 50 && !isOutOfBounds) {
          saveGPSToCache(newPosition);
        }

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
        
        // Set proper status based on error type
        if (errType === 'PERMISSION_DENIED' || errType === 'NOT_SUPPORTED') {
          setStatus('error');
          
          // If permission denied, start monitoring for permission recovery
          if (errType === 'PERMISSION_DENIED' && !permissionRecoveryIntervalRef.current) {
            console.log('[GPS-PROVIDER] Starting permission recovery monitor...');
            
            permissionRecoveryIntervalRef.current = setInterval(() => {
              console.log('[GPS-PROVIDER] Checking for permission recovery...');
              
              // Try to get current position to check if permission is now granted
              navigator.geolocation.getCurrentPosition(
                () => {
                  console.log('[GPS-PROVIDER] ✅ Permission recovered! Restarting GPS tracking...');
                  
                  // Clear the recovery interval
                  if (permissionRecoveryIntervalRef.current) {
                    clearInterval(permissionRecoveryIntervalRef.current);
                    permissionRecoveryIntervalRef.current = null;
                  }
                  
                  // Clear errors and restart tracking
                  setError(null);
                  setErrorType(null);
                  setErrorMessage(null);
                  setStatus('acquiring');
                  
                  // Restart GPS tracking
                  startGPSTracking();
                },
                () => {
                  // Still denied, continue monitoring
                  console.log('[GPS-PROVIDER] Permission still denied, continuing to monitor...');
                },
                { timeout: 1000 } // Quick check
              );
            }, 3000); // Check every 3 seconds
          }
        } else {
          setStatus('unavailable');
        }

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
    if (acquisitionTimeoutRef.current !== null) {
      clearTimeout(acquisitionTimeoutRef.current);
      acquisitionTimeoutRef.current = null;
    }
    if (permissionRecoveryIntervalRef.current !== null) {
      console.log('[GPS-PROVIDER] Stopping permission recovery monitor');
      clearInterval(permissionRecoveryIntervalRef.current);
      permissionRecoveryIntervalRef.current = null;
    }
    setIsTracking(false);
    smoothedHeadingRef.current = null;
  }, []);

  const retryGPS = useCallback(() => {
    console.log('[GPS-PROVIDER] Retrying GPS connection...');
    
    // Clear ALL error states before retrying
    setError(null);
    setErrorType(null);
    setErrorMessage(null);
    setStatus('acquiring');
    
    // Stop current tracking
    stopGPSTracking();
    
    // Small delay before retry to avoid immediate re-error
    retryTimeoutRef.current = setTimeout(() => {
      // Clear errors again just in case
      setError(null);
      setErrorType(null);
      setErrorMessage(null);
      startGPSTracking();
    }, 500);
  }, [stopGPSTracking, startGPSTracking]);
  
  const useCachedPosition = useCallback((useCache: boolean) => {
    if (useCache && cachedPosition) {
      console.log('[GPS-PROVIDER] User accepted cached position from', cachedPosition.ageDisplay);
      setPosition(cachedPosition.position);
      setIsUsingCached(true);
      setStatus('ready');
    } else {
      console.log('[GPS-PROVIDER] User rejected cached position, waiting for fresh GPS');
      setPosition(null);
      setIsUsingCached(false);
      setStatus('acquiring');
    }
  }, [cachedPosition]);

  // Timer to track time since last GPS update
  useEffect(() => {
    const updateTimer = setInterval(() => {
      const now = Date.now();
      const timeSince = lastUpdateTimeRef.current ? 
        Math.floor((now - lastUpdateTimeRef.current) / 1000) : null;
      setTimeSinceLastUpdate(timeSince);
      
      // Check for GPS signal lost (no updates for 30 seconds)
      if (timeSince && timeSince > 30 && status === 'ready') {
        console.warn('[GPS-PROVIDER] GPS signal lost - no updates for', timeSince, 'seconds');
        setStatus('unavailable');
        setValidationWarnings(prev => {
          const hasSignalLostWarning = prev.some(w => w.type === 'stale' && w.severity === 'error');
          if (!hasSignalLostWarning) {
            return [...prev, {
              type: 'stale',
              message: 'GPS signal lost - no updates for over 30 seconds',
              severity: 'error' as const
            }];
          }
          return prev;
        });
      }
    }, 1000);
    
    updateIntervalRef.current = updateTimer;
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [status]);

  useEffect(() => {
    // Load cached position for info (but don't use it automatically)
    const cached = loadGPSFromCache();
    if (cached && cached.ageInMinutes <= 5) {
      // Only offer cached position if it's less than 5 minutes old
      setCachedPosition(cached);
      console.log('[GPS-PROVIDER] Cached position available from', cached.ageDisplay);
    } else if (cached) {
      console.log('[GPS-PROVIDER] Cached position too old (>5 min), not offering to user');
    }
    
    // Start acquiring fresh GPS
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
    retryGPS,
    status,
    cachedPosition,
    useCachedPosition,
    isUsingCached,
    clearGPSCache,
    // New validation fields
    validationWarnings,
    lastGoodPosition,
    timeSinceLastUpdate,
    shouldPreventAutoCenter
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
