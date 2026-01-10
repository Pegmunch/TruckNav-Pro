import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './maplibre-overrides.css';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Crosshair, Layers, Box, Compass, MapPin, AlertTriangle, AlertCircle, Map } from "lucide-react";
import { type Route, type VehicleProfile, type TrafficIncident } from "@shared/schema";
import { cn } from "@/lib/utils";
import SpeedDisplay from "@/components/map/speed-display";
import { getIncidentIcon } from "@shared/incident-icons";
import { useMapLibreErrorReporting } from "@/hooks/use-map-engine";
import { useGPS } from "@/contexts/gps-context";
import { StaticRouteOverlay } from "@/components/map/static-route-overlay";

export interface MapLibreMapRef {
  getMap: () => maplibregl.Map | null;
  getBearing: () => number;
  resetBearing: () => void;
  getMapValidity: () => boolean;
  toggle3DMode: () => void;
  is3DMode: () => boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleMapView: () => void;
  getMapViewMode: () => 'roads' | 'satellite';
  flyByRoute: (routeCoordinates: Array<{lat: number; lng: number}>, options?: {
    speedMultiplier?: number;
    onComplete?: () => void;
    onCancel?: () => void;
  }) => void;
  cancelFlyBy: () => void;
  isFlyByActive: () => boolean;
  zoomToUserLocation: (options?: {
    forceStreetMode?: boolean;
    zoom?: number;
    pitch?: number;
    bearing?: number;
    duration?: number;
    fallbackCoordinates?: { lat: number; lng: number };
    onSuccess?: (location: { 
      lat: number; 
      lng: number;
      accuracy?: number;
      accuracyLevel?: 'excellent' | 'good' | 'acceptable';
      timestamp?: number;
    }) => void;
    onError?: (error: GeolocationPositionError | Error, usedFallback: boolean) => void;
    onRetry?: (attemptNumber: number, maxAttempts: number) => void;
  }) => void;
}

interface MapLibreMapProps {
  currentRoute: Route | null;
  selectedProfile: VehicleProfile | null;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  showTraffic?: boolean;
  showIncidents?: boolean;
  hideControls?: boolean;
  hideCompass?: boolean;
  isNavigating?: boolean;
  showUserMarker?: boolean;
  useStaticRoute?: boolean;
  onToggleTraffic?: () => void;
  onViewIncidents?: () => void;
  restrictionViolations?: Array<{
    restriction: {
      id: string;
      type: string;
      coordinates?: { lat: number; lng: number };
      location: string;
      severity: string;
    };
    bypassable: boolean;
  }>;
}

interface MapPreferences {
  mapViewMode: 'roads' | 'satellite';
  zoomLevel: number;
  center?: [number, number]; // Made optional - no default coordinates
}

const defaultPreferences: MapPreferences = {
  mapViewMode: 'roads',
  zoomLevel: 10,
  // NO DEFAULT CENTER - wait for GPS instead
};

const loadMapPreferences = (): MapPreferences => {
  try {
    const stored = localStorage.getItem('trucknav_maplibre_preferences');
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load MapLibre preferences:', error);
  }
  return defaultPreferences;
};

const saveMapPreferences = (prefs: MapPreferences): void => {
  try {
    localStorage.setItem('trucknav_maplibre_preferences', JSON.stringify(prefs));
  } catch (error) {
    console.warn('Failed to save MapLibre preferences:', error);
  }
};

// Format time ago helper
const formatTimeAgo = (timestamp: string | Date): string => {
  const now = new Date();
  const reported = new Date(timestamp);
  const diffMs = now.getTime() - reported.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return reported.toLocaleDateString();
};

// Get severity color for restriction markers
const getSeverityColor = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case 'absolute':
    case 'high':
      return '#ef4444'; // red
    case 'medium':
      return '#f97316'; // orange
    case 'low':
      return '#eab308'; // yellow
    default:
      return '#6b7280'; // gray
  }
};

const MapLibreMap = memo(forwardRef<MapLibreMapRef, MapLibreMapProps>(function MapLibreMap({
  currentRoute,
  selectedProfile,
  onMapClick,
  className,
  showTraffic = false,
  showIncidents = false,
  hideControls = false,
  hideCompass = false,
  isNavigating = false,
  showUserMarker = false,
  useStaticRoute = false,
  onToggleTraffic,
  onViewIncidents,
  restrictionViolations
}, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [preferences, setPreferences] = useState<MapPreferences>(loadMapPreferences);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(preferences.zoomLevel);
  const [is3DMode, setIs3DMode] = useState(false);
  const [isTrafficLayerReady, setIsTrafficLayerReady] = useState(false);
  const [bearing, setBearing] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preferencesRef = useRef(preferences);
  const currentZoomRef = useRef(currentZoom);
  const incidentMarkersRef = useRef<maplibregl.Marker[]>([]);
  const navigationControlRef = useRef<maplibregl.NavigationControl | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const screenArrowheadRef = useRef<HTMLDivElement | null>(null);
  const destinationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const restrictionMarkersRef = useRef<maplibregl.Marker[]>([]);
  const restrictionViolationsRef = useRef(restrictionViolations);
  const isNavigatingRef = useRef(isNavigating);
  const { reportError } = useMapLibreErrorReporting();
  const resetBearingFailureCountRef = useRef(0);
  const MAX_RESET_BEARING_FAILURES = 3;
  const [isMapLibreValid, setIsMapLibreValid] = useState(true);
  const previousNavigationStateRef = useRef(isNavigating);
  const previousPitchRef = useRef(0);
  const previousBearingRef = useRef(0);
  const touchEndHandlerRef = useRef<((e: TouchEvent) => void) | null>(null);
  const touchContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingStyleListenerRef = useRef<(() => void) | null>(null);
  
  // Fly-by animation state
  const [isFlyByActive, setIsFlyByActive] = useState(false);
  const flyByAnimationRef = useRef<number | null>(null);
  const flyByCancelledRef = useRef(false);
  const flyByCallbacksRef = useRef<{ onComplete?: () => void; onCancel?: () => void }>({});
  
  // CRITICAL: Cached route GeoJSON for rebuilding after style changes
  // This ensures the route persists across map view toggles (roads ⇄ satellite)
  const cachedRouteGeoJsonRef = useRef<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  
  const gps = useGPS();
  const gpsPosition = gps?.position ?? null;
  const gpsStatus = gps?.status ?? 'acquiring';
  const isGPSReady = gpsStatus === 'ready' && !gps?.isUsingCached;
  const isManualLocation = gpsStatus === 'manual' || gps?.isUsingManualLocation;
  
  // Fallback timeout to hide loading spinner after 10 seconds (for PWA)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isLoaded) {
        console.warn('[MAP] Loading overlay timeout - forcing completion after 10s');
        setIsLoaded(true);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [isLoaded]);
  
  // CRITICAL: Delete MapLibre's transparent button color rule from its stylesheet
  // This is the ONLY reliable fix - MapLibre's CSS keeps re-inserting after overrides
  useEffect(() => {
    const removeMapLibreButtonRule = () => {
      try {
        for (let i = 0; i < document.styleSheets.length; i++) {
          const sheet = document.styleSheets[i];
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            
            for (let j = rules.length - 1; j >= 0; j--) {
              const rule = rules[j];
              if (rule instanceof CSSStyleRule) {
                const text = rule.cssText;
                // Find and delete the MapLibre button color rule that makes icons invisible
                if (text.includes('.maplibregl-map button') && 
                    text.includes('color') && 
                    text.includes('rgba(0')) {
                  sheet.deleteRule(j);
                  console.log('[MAP] ✅ Deleted MapLibre transparent button rule');
                }
              }
            }
          } catch (e) {
            // Cross-origin stylesheets will throw - ignore
          }
        }
      } catch (e) {
        console.warn('[MAP] Could not modify stylesheets:', e);
      }
    };

    // Run immediately
    removeMapLibreButtonRule();
    
    // Also run after a short delay to catch late-loading stylesheets
    const timeout = setTimeout(removeMapLibreButtonRule, 500);
    
    // Inject our override as backup
    const styleId = 'tnp-maplibre-control-override';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        button.tnp-control,
        .maplibregl-map button.tnp-control {
          color: #1f2937 !important;
        }
        button.tnp-control svg,
        button.tnp-control svg *,
        .maplibregl-map button.tnp-control svg,
        .maplibregl-map button.tnp-control svg * {
          color: #1f2937 !important;
          stroke: #1f2937 !important;
          fill: none !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    return () => clearTimeout(timeout);
  }, []);
  
  // Circuit Breaker Pattern for GPS reliability
  const circuitBreakerRef = useRef({
    failures: 0,
    lastFailureTime: 0,
    isOpen: false,
    resetTimeout: null as NodeJS.Timeout | null
  });

  const lastKnownPositionRef = useRef<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);

  const lastSuccessfulPositionRef = useRef<{
    lat: number;
    lng: number;
    timestamp: number;
  } | null>(null);

  // Helper functions
  const checkCircuitBreaker = () => {
    const now = Date.now();
    const cb = circuitBreakerRef.current;
    
    // Auto-reset after 10-second cooldown
    if (cb.isOpen && (now - cb.lastFailureTime) > 10000) {
      cb.isOpen = false;
      cb.failures = 0;
      console.log('[GPS-ZOOM] Circuit breaker reset');
      return true;
    }
    
    // Open circuit after 3 failures within 30 seconds
    if (cb.failures >= 3 && (now - cb.lastFailureTime) < 30000) {
      cb.isOpen = true;
      return false;
    }
    
    return true;
  };

  const recordGPSFailure = () => {
    const cb = circuitBreakerRef.current;
    cb.failures++;
    cb.lastFailureTime = Date.now();
  };

  const recordGPSSuccess = () => {
    circuitBreakerRef.current.failures = 0;
    circuitBreakerRef.current.isOpen = false;
  };

  const cachePosition = (lat: number, lng: number, accuracy: number) => {
    lastKnownPositionRef.current = { lat, lng, accuracy, timestamp: Date.now() };
    try {
      sessionStorage.setItem('trucknav_last_gps', JSON.stringify({ lat, lng, accuracy, timestamp: Date.now() }));
    } catch (e) {
      console.warn('[GPS-ZOOM] Failed to cache position');
    }
  };

  const getLastKnownPosition = () => {
    const now = Date.now();
    
    if (lastKnownPositionRef.current) {
      const age = now - lastKnownPositionRef.current.timestamp;
      const isExpired = age >= 300000; // 5 minutes
      
      console.log(`[GPS-ZOOM] Cache check - Age: ${Math.round(age/1000)}s, Expired: ${isExpired}`);
      
      if (!isExpired) {
        console.log('[GPS-ZOOM] Using in-memory cached position');
        return lastKnownPositionRef.current;
      } else {
        console.warn('[GPS-ZOOM] In-memory cache EXPIRED, checking sessionStorage');
      }
    }
    
    try {
      const cached = sessionStorage.getItem('trucknav_last_gps');
      if (cached) {
        const pos = JSON.parse(cached);
        const age = now - pos.timestamp;
        const isExpired = age >= 300000;
        
        console.log(`[GPS-ZOOM] SessionStorage check - Age: ${Math.round(age/1000)}s, Expired: ${isExpired}`);
        
        if (!isExpired) {
          console.log('[GPS-ZOOM] Using sessionStorage cached position');
          return pos;
        } else {
          console.warn('[GPS-ZOOM] SessionStorage cache EXPIRED - no valid cache available');
        }
      }
    } catch (e) {
      console.error('[GPS-ZOOM] Cache read error:', e);
    }
    
    console.warn('[GPS-ZOOM] NO CACHED POSITION AVAILABLE');
    return null;
  };

  const safeBearingUpdate = useCallback((mapInstance: maplibregl.Map, bearing: number) => {
    try {
      if (!mapInstance || !mapInstance.isStyleLoaded()) {
        console.warn('[MAP] Cannot update bearing - map not ready');
        return false;
      }

      // Check WebGL context before animation
      const canvas = mapInstance.getCanvas();
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl && gl.isContextLost()) {
        console.error('[MAP] WebGL context lost - skipping bearing update');
        return false;
      }

      const currentBearing = mapInstance.getBearing();
      
      // Calculate shortest rotation path
      let delta = bearing - currentBearing;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      
      const targetBearing = currentBearing + delta;

      // Use moveend event to verify animation completed
      const onMoveEnd = () => {
        mapInstance.off('moveend', onMoveEnd);
        console.log('[MAP] Bearing update completed:', mapInstance.getBearing());
      };
      mapInstance.once('moveend', onMoveEnd);

      mapInstance.easeTo({
        bearing: targetBearing,
        duration: 300,
        easing: (t) => t * (2 - t)
      });

      return true;
    } catch (err) {
      console.error('[MAP] Bearing update error:', err);
      return false;
    }
  }, []);

  const resetBearingWithWatchdog = useCallback(() => {
    try {
      if (!map.current || !isLoaded) {
        resetBearingFailureCountRef.current++;
        console.warn(`[MAP] Reset bearing failed - map not ready (${resetBearingFailureCountRef.current}/${MAX_RESET_BEARING_FAILURES})`);
        
        if (resetBearingFailureCountRef.current >= MAX_RESET_BEARING_FAILURES) {
          console.error('[MAP] Reset bearing watchdog triggered - too many failures');
          if (map.current) {
            try {
              map.current.resize();
            } catch (e) {
              console.error('[MAP] Map resize failed during recovery');
            }
          }
        }
        return;
      }

      const success = safeBearingUpdate(map.current, 0);
      
      if (success) {
        resetBearingFailureCountRef.current = 0;
      } else {
        resetBearingFailureCountRef.current++;
        if (resetBearingFailureCountRef.current >= MAX_RESET_BEARING_FAILURES) {
          console.error('[MAP] Reset bearing watchdog triggered');
        }
      }
    } catch (err) {
      resetBearingFailureCountRef.current++;
      console.error('[MAP] Reset bearing exception:', err);
    }
  }, [safeBearingUpdate, isLoaded]);
  
  useImperativeHandle(ref, () => ({
    getMap: () => map.current,
    getBearing: () => bearing,
    resetBearing: () => resetBearingWithWatchdog(),
    getMapValidity: () => isMapLibreValid,
    toggle3DMode: () => {
      if (!map.current) return;
      const newMode = !is3DMode;
      setIs3DMode(newMode);
      map.current.easeTo({
        pitch: newMode ? 60 : 0,
        duration: 800
      });
    },
    is3DMode: () => is3DMode,
    zoomIn: () => {
      if (map.current) {
        map.current.zoomIn({ duration: 300 });
      }
    },
    zoomOut: () => {
      if (map.current) {
        map.current.zoomOut({ duration: 300 });
      }
    },
    zoomToUserLocation: (options) => {
      const {
        forceStreetMode = true,
        zoom = 15.5, // TomTom GO style - zoomed out to show more route
        pitch = 55, // Moderate 3D tilt for good route visibility
        bearing: optionsBearing,
        duration = 2000,
        fallbackCoordinates,
        onSuccess,
        onError,
        onRetry
      } = options || {};

      // Safety checks
      if (!map.current || !isLoaded) {
        console.error('[GPS-ZOOM] Map not ready');
        onError?.(new Error('Map not ready') as any, false);
        return;
      }

      const mapInstance = map.current;

      // Force street mode if requested
      if (forceStreetMode && preferences.mapViewMode !== 'roads') {
        const newPrefs = { ...preferences, mapViewMode: 'roads' as const };
        setPreferences(newPrefs);
        saveMapPreferences(newPrefs);
      }

      // Zoom helper - uses TomTom GO style padding (60% top, 60 bottom)
      const performZoom = (lat: number, lng: number, bearing: number = 0) => {
        try {
          const containerHeight = mapInstance.getContainer().clientHeight || 800;
          mapInstance.flyTo({
            center: [lng, lat],
            zoom,
            pitch,
            bearing,
            padding: {
              top: Math.round(containerHeight * 0.60), // TomTom GO style
              bottom: 60,
              left: 0,
              right: 0
            },
            duration,
            essential: true
          });
        } catch (err) {
          console.error('[GPS-ZOOM] Zoom error:', err);
        }
      };

      // Check circuit breaker
      if (!checkCircuitBreaker()) {
        console.warn('[GPS-ZOOM] Circuit breaker OPEN - using fallback');
        
        const cached = getLastKnownPosition();
        if (cached) {
          performZoom(cached.lat, cached.lng, optionsBearing ?? 0);
          onSuccess?.({ lat: cached.lat, lng: cached.lng, accuracy: cached.accuracy, accuracyLevel: cached.accuracy <= 50 ? 'excellent' : cached.accuracy <= 100 ? 'good' : 'acceptable' });
        } else if (fallbackCoordinates) {
          performZoom(fallbackCoordinates.lat, fallbackCoordinates.lng, optionsBearing ?? 0);
          onSuccess?.(fallbackCoordinates);
        } else {
          onError?.(new Error('GPS unavailable') as any, false);
        }
        return;
      }

      // Exponential backoff retry
      const retryDelays = [0, 1000, 2000, 4000];
      let attemptNum = 0;

      const attemptGPS = () => {
        if (attemptNum >= retryDelays.length) {
          recordGPSFailure();
          
          const cached = getLastKnownPosition();
          if (cached) {
            performZoom(cached.lat, cached.lng, optionsBearing ?? 0);
            onError?.(new Error('GPS timeout') as any, true);
          } else if (fallbackCoordinates) {
            performZoom(fallbackCoordinates.lat, fallbackCoordinates.lng, optionsBearing ?? 0);
            onError?.(new Error('GPS timeout') as any, true);
          } else {
            onError?.(new Error('GPS timeout') as any, false);
          }
          return;
        }

        const delay = retryDelays[attemptNum];
        const currentAttempt = attemptNum + 1;
        attemptNum++;

        setTimeout(() => {
          onRetry?.(currentAttempt, retryDelays.length);
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude, accuracy, heading } = position.coords;
              
              // Check if coordinates are stale (same as last reading)
              const isSameAsLast = lastSuccessfulPositionRef.current &&
                Math.abs(lastSuccessfulPositionRef.current.lat - latitude) < 0.00001 &&
                Math.abs(lastSuccessfulPositionRef.current.lng - longitude) < 0.00001;
              
              if (isSameAsLast) {
                console.warn('[GPS-ZOOM] Stale coordinates detected - incrementing failure count');
                circuitBreakerRef.current.failures++;
                // Don't record full success, let circuit breaker logic apply
              } else {
                recordGPSSuccess();
                lastSuccessfulPositionRef.current = { lat: latitude, lng: longitude, timestamp: Date.now() };
              }
              
              cachePosition(latitude, longitude, accuracy);
              
              const accuracyLevel = accuracy <= 50 ? 'excellent' : accuracy <= 100 ? 'good' : 'acceptable';
              
              performZoom(latitude, longitude, optionsBearing ?? heading ?? 0);
              onSuccess?.({ lat: latitude, lng: longitude, accuracy, accuracyLevel, timestamp: Date.now() });
            },
            (error) => {
              console.warn(`[GPS-ZOOM] Attempt ${currentAttempt} failed:`, error.message);
              attemptGPS();
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            }
          );
        }, delay);
      };

      attemptGPS();
    },
    toggleMapView: () => {
      const newMode: 'roads' | 'satellite' = preferences.mapViewMode === 'roads' ? 'satellite' : 'roads';
      console.log('[MAP-VIEW-TOGGLE] Switching view mode:', preferences.mapViewMode, '→', newMode);
      const newPrefs: MapPreferences = { ...preferences, mapViewMode: newMode };
      setPreferences(newPrefs);
      saveMapPreferences(newPrefs);
    },
    getMapViewMode: () => preferences.mapViewMode,
    flyByRoute: (routeCoordinates, options = {}) => {
      const { speedMultiplier = 10, onComplete, onCancel } = options;
      
      if (!map.current || !isLoaded || routeCoordinates.length < 2) {
        console.warn('[FLY-BY] Cannot start - map not ready or invalid route');
        return;
      }
      
      // Cancel any existing fly-by
      if (flyByAnimationRef.current) {
        cancelAnimationFrame(flyByAnimationRef.current);
        flyByAnimationRef.current = null;
      }
      
      flyByCancelledRef.current = false;
      flyByCallbacksRef.current = { onComplete, onCancel };
      setIsFlyByActive(true);
      
      console.log('[FLY-BY] Starting route fly-by animation at', speedMultiplier, 'x speed');
      
      const mapInstance = map.current;
      const coords = routeCoordinates.map(c => [c.lng, c.lat] as [number, number]);
      
      // Calculate total route distance in kilometers for timing
      let totalDistanceKm = 0;
      for (let i = 1; i < coords.length; i++) {
        // Haversine distance calculation
        const lat1 = coords[i-1][1] * Math.PI / 180;
        const lat2 = coords[i][1] * Math.PI / 180;
        const dLat = (coords[i][1] - coords[i-1][1]) * Math.PI / 180;
        const dLng = (coords[i][0] - coords[i-1][0]) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        totalDistanceKm += 6371 * c; // Earth radius in km
      }
      
      // Duration based on real distance at 10x speed
      // At 100 km/h normal speed, 10x = 1000 km/h = 16.67 km/min
      // So 1 km takes ~60ms at 10x speed, minimum 3s, max 60s
      const msPerKm = 60 / speedMultiplier; // ms per km at desired speed
      const calculatedDuration = totalDistanceKm * msPerKm * 1000;
      const totalDuration = Math.max(3000, Math.min(60000, calculatedDuration));
      
      console.log(`[FLY-BY] Route distance: ${totalDistanceKm.toFixed(1)} km, duration: ${(totalDuration/1000).toFixed(1)}s`);
      
      // Sample route at regular intervals (every ~100 points for smooth animation)
      const sampleCount = Math.min(coords.length, 150);
      const sampleStep = Math.max(1, Math.floor(coords.length / sampleCount));
      const sampledCoords: [number, number][] = [];
      for (let i = 0; i < coords.length; i += sampleStep) {
        sampledCoords.push(coords[i]);
      }
      // Always include the last point
      if (sampledCoords[sampledCoords.length - 1] !== coords[coords.length - 1]) {
        sampledCoords.push(coords[coords.length - 1]);
      }
      
      const startTime = performance.now();
      let currentIndex = 0;
      
      // Calculate bearing between two points
      const calculateBearing = (from: [number, number], to: [number, number]): number => {
        const dLng = (to[0] - from[0]) * Math.PI / 180;
        const lat1 = from[1] * Math.PI / 180;
        const lat2 = to[1] * Math.PI / 180;
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
      };
      
      const animate = () => {
        if (flyByCancelledRef.current) {
          console.log('[FLY-BY] Animation cancelled');
          setIsFlyByActive(false);
          flyByCallbacksRef.current.onCancel?.();
          return;
        }
        
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        
        // Calculate current position along sampled route
        const floatIndex = progress * (sampledCoords.length - 1);
        const idx = Math.floor(floatIndex);
        const fraction = floatIndex - idx;
        
        if (idx >= sampledCoords.length - 1) {
          // Animation complete
          const lastCoord = sampledCoords[sampledCoords.length - 1];
          mapInstance.jumpTo({
            center: lastCoord,
            zoom: 14,
            pitch: 45,
            bearing: 0
          });
          console.log('[FLY-BY] Animation complete');
          setIsFlyByActive(false);
          flyByAnimationRef.current = null;
          flyByCallbacksRef.current.onComplete?.();
          return;
        }
        
        // Interpolate position
        const from = sampledCoords[idx];
        const to = sampledCoords[idx + 1];
        const lng = from[0] + (to[0] - from[0]) * fraction;
        const lat = from[1] + (to[1] - from[1]) * fraction;
        
        // Calculate bearing to next point
        const bearing = calculateBearing(from, to);
        
        // Smooth zoom: start at 12, go to 15 at midpoint, back to 12 at end
        const zoomCurve = 12 + 3 * Math.sin(progress * Math.PI);
        
        // Smooth pitch: 30 at start, 60 at midpoint, 30 at end
        const pitchCurve = 30 + 30 * Math.sin(progress * Math.PI);
        
        mapInstance.jumpTo({
          center: [lng, lat],
          zoom: zoomCurve,
          pitch: pitchCurve,
          bearing: bearing
        });
        
        flyByAnimationRef.current = requestAnimationFrame(animate);
      };
      
      // Start animation with initial view
      const firstCoord = sampledCoords[0];
      const secondCoord = sampledCoords[1];
      const initialBearing = calculateBearing(firstCoord, secondCoord);
      
      mapInstance.jumpTo({
        center: firstCoord,
        zoom: 12,
        pitch: 30,
        bearing: initialBearing
      });
      
      // Start animation loop
      flyByAnimationRef.current = requestAnimationFrame(animate);
    },
    cancelFlyBy: () => {
      if (flyByAnimationRef.current) {
        flyByCancelledRef.current = true;
        cancelAnimationFrame(flyByAnimationRef.current);
        flyByAnimationRef.current = null;
        setIsFlyByActive(false);
        console.log('[FLY-BY] Cancelled by user');
        // Invoke callback so consumers can react
        flyByCallbacksRef.current.onCancel?.();
      }
    },
    isFlyByActive: () => isFlyByActive
  }), [bearing, is3DMode, preferences.mapViewMode, isLoaded, isFlyByActive]);
  
  // Fetch traffic incidents with 2-minute refresh
  const { data: incidents = [] } = useQuery<TrafficIncident[]>({
    queryKey: ['/api/traffic-incidents'],
    refetchInterval: 120000, // 2 minutes
    enabled: showIncidents,
  });
  
  // Keep refs in sync with state
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);
  
  useEffect(() => {
    currentZoomRef.current = currentZoom;
  }, [currentZoom]);

  // Effect to update map rotation and position in navigation mode
  useEffect(() => {
    if (!map.current || !isNavigating || !gpsPosition || !isLoaded) return;

    const { latitude, longitude, heading } = gpsPosition;
    const containerHeight = map.current.getContainer().clientHeight || 800;

    map.current.easeTo({
      center: [longitude, latitude],
      bearing: heading || 0,
      pitch: 55, // Moderate 3D tilt for good route visibility (TomTom GO style)
      zoom: 15.5, // Zoomed out to show more route ahead
      padding: {
        top: Math.round(containerHeight * 0.60),
        bottom: 60,
        left: 0,
        right: 0
      },
      duration: 1000,
      easing: (t) => t
    });
  }, [isNavigating, gpsPosition, isLoaded]);

  // Enhanced 3D Navigation Mode: Auto-activate when navigation starts, smooth exit when it ends
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const wasNavigating = previousNavigationStateRef.current;
    const isNowNavigating = isNavigating;

    // Navigation started - activate 3D mode and set optimal view angle/zoom
    if (!wasNavigating && isNowNavigating) {
      console.log('[NAV-3D] Navigation started - setting TomTom GO style 3D view (55° pitch, zoom 15.5)');
      previousPitchRef.current = map.current.getPitch();
      previousBearingRef.current = map.current.getBearing();
      
      // Target the TomTom GO navigation style: moderate pitch, zoomed out, bottom-centered vehicle
      const containerHeight = map.current.getContainer().clientHeight || 800;
      map.current.easeTo({
        pitch: 55, // Moderate 3D tilt for good route visibility
        zoom: 15.5, // Zoomed out to show more route ahead
        padding: {
          top: Math.round(containerHeight * 0.60),
          bottom: 60,
          left: 0,
          right: 0
        },
        duration: 2000,
        easing: (t) => t * (2 - t)
      });
      
      setIs3DMode(true);
    }
    
    // Navigation ended - smooth transition back to previous state
    if (wasNavigating && !isNowNavigating) {
      console.log('[NAV-3D] Navigation ended - transitioning to normal view');
      
      map.current.easeTo({
        pitch: previousPitchRef.current,
        bearing: 0,
        zoom: Math.min(map.current.getZoom(), 16),
        duration: 1000,
        easing: (t) => t * (2 - t)
      });
      
      // Reset 3D mode state to match previous pitch
      const was3D = previousPitchRef.current > 30;
      setIs3DMode(was3D);
    }

    previousNavigationStateRef.current = isNavigating;
  }, [isNavigating, isLoaded]);

  useEffect(() => {
    if (!map.current) return;

    const checkMapValidity = () => {
      if (!map.current) {
        setIsMapLibreValid(false);
        return;
      }

      const canvas = map.current.getCanvas();
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (gl && gl.isContextLost()) {
        console.error('[MAP] WebGL context lost detected');
        setIsMapLibreValid(false);
        
        setTimeout(() => {
          if (map.current) {
            try {
              map.current.resize();
              setIsMapLibreValid(true);
              console.log('[MAP] WebGL context recovered');
            } catch (e) {
              console.error('[MAP] WebGL recovery failed - consider Leaflet fallback');
            }
          }
        }, 1000);
      }
    };

    const interval = setInterval(checkMapValidity, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!map.current || !isLoaded) return;
    
    const handleRotate = () => {
      setBearing(map.current?.getBearing() || 0);
    };
    
    map.current.on('rotate', handleRotate);
    
    return () => {
      map.current?.off('rotate', handleRotate);
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const handleContextLost = (event: any) => {
      event.preventDefault();
      console.error('[MAP] WebGL context lost');
      
      setTimeout(() => {
        if (map.current) {
          try {
            map.current.resize();
            console.log('[MAP] WebGL context restore attempted');
          } catch (err) {
            console.error('[MAP] WebGL restore failed:', err);
          }
        }
      }, 1000);
    };

    const handleContextRestored = () => {
      console.log('[MAP] WebGL context restored');
    };

    const canvas = map.current.getCanvas();
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!map.current || !isLoaded) return;
    
    const handleControls = () => {
      if (!map.current) return;
      
      // Always remove existing control first to avoid duplicates
      if (navigationControlRef.current) {
        try {
          map.current.removeControl(navigationControlRef.current);
        } catch (e) {
          // Control may not be on map, ignore
        }
        navigationControlRef.current = null;
      }
      
      // DO NOT ADD MapLibre NavigationControl - using custom white buttons with colored borders instead
      // This prevents duplicate button sets from appearing on the map
    };
    
    if (map.current.isStyleLoaded()) {
      handleControls();
    } else {
      map.current.once('load', handleControls);
    }
    
    return () => {
      if (map.current) {
        map.current.off('load', handleControls);
      }
    };
  }, [hideControls, hideCompass, isLoaded]);

  const updateLayerVisibility = useCallback((mapInstance: maplibregl.Map, viewMode: 'roads' | 'satellite', zoom: number) => {
    if (!mapInstance.isStyleLoaded()) return;

    const is3D = zoom >= 17;
    
    // Helper to safely set layer visibility only if layer exists
    const safeSetVisibility = (layerId: string, visibility: 'visible' | 'none') => {
      if (mapInstance.getLayer(layerId)) {
        mapInstance.setLayoutProperty(layerId, 'visibility', visibility);
      }
    };
    
    // Helper to ensure labels overlay exists and is on top
    const ensureLabelsOverlay = () => {
      // Add source if missing - using dark_only_labels which has white text for satellite imagery
      // CRITICAL: Use tileSize: 512 for @2x tiles to prevent black seam artifacts
      if (!mapInstance.getSource('labels-overlay')) {
        mapInstance.addSource('labels-overlay', {
          type: 'raster',
          tiles: [
            'https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png',
            'https://cartodb-basemaps-b.global.ssl.fastly.net/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png',
            'https://cartodb-basemaps-c.global.ssl.fastly.net/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png'
          ],
          tileSize: 512,
          maxzoom: 20,
          attribution: '© <a href="https://carto.com/">CARTO</a>'
        });
      }
      
      // Add layer if missing (on top of everything)
      if (!mapInstance.getLayer('labels-overlay-layer')) {
        mapInstance.addLayer({
          id: 'labels-overlay-layer',
          type: 'raster',
          source: 'labels-overlay',
          layout: {
            visibility: 'visible'
          }
        });
        console.log('[LABELS] Added labels overlay layer on top');
      } else {
        // Move labels layer to top to ensure visibility over satellite
        try {
          mapInstance.moveLayer('labels-overlay-layer');
          console.log('[LABELS] Moved labels overlay layer to top');
        } catch (e) {
          // Layer might already be on top
        }
      }
    };
    
    // Helper to ensure route layers are on top (above all base layers including labels)
    const ensureRouteLayers = () => {
      try {
        if (mapInstance.getLayer('route-outline')) {
          mapInstance.moveLayer('route-outline');
        }
        if (mapInstance.getLayer('route-line')) {
          mapInstance.moveLayer('route-line');
        }
        console.log('[ROUTE-LAYERS] Moved route layers to top after mode switch');
      } catch (e) {
        // Layers might not exist yet
      }
    };
    
    try {
      if (viewMode === 'roads') {
        safeSetVisibility('roads-2d-layer', is3D ? 'none' : 'visible');
        safeSetVisibility('roads-3d-layer', is3D ? 'visible' : 'none');
        safeSetVisibility('satellite-2d-layer', 'none');
        safeSetVisibility('satellite-3d-layer', 'none');
        // Hide labels overlay in roads mode (OSM tiles already have labels)
        safeSetVisibility('labels-overlay-layer', 'none');
        // Show traffic layer in roads mode if it exists and traffic is enabled
        if (mapInstance.getLayer('traffic-flow-layer') && showTraffic) {
          mapInstance.setLayoutProperty('traffic-flow-layer', 'visibility', 'visible');
        }
      } else {
        // Satellite mode - hide road layers, show satellite and labels overlay
        safeSetVisibility('roads-2d-layer', 'none');
        safeSetVisibility('roads-3d-layer', 'none');
        safeSetVisibility('satellite-2d-layer', is3D ? 'none' : 'visible');
        safeSetVisibility('satellite-3d-layer', is3D ? 'visible' : 'none');
        
        // CRITICAL: Ensure labels overlay exists and is on TOP of satellite imagery
        ensureLabelsOverlay();
        safeSetVisibility('labels-overlay-layer', 'visible');
        
        // CRITICAL: Hide traffic layer in satellite mode - fixes black lines issue
        if (mapInstance.getLayer('traffic-flow-layer')) {
          mapInstance.setLayoutProperty('traffic-flow-layer', 'visibility', 'none');
        }
      }
      
      // CRITICAL: Always ensure route layers are on top after mode switch
      // This prevents the blue navigation line from being hidden behind other layers
      ensureRouteLayers();
    } catch (error) {
      console.warn('Failed to update layer visibility:', error);
    }
  }, [showTraffic]);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Clean up existing map instance if it exists (handles HMR and remounting)
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'roads-2d-layer',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 22,
              layout: { visibility: 'visible' }
            },
            {
              id: 'roads-3d-layer',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 22,
              layout: { visibility: 'none' }
            }
          ]
        } as any,
        center: gpsPosition ? [gpsPosition.longitude, gpsPosition.latitude] : [0, 0],
        zoom: gpsPosition ? preferences.zoomLevel : 2,
        pitch: 0,
        bearing: 0,
        minZoom: 3,
        maxZoom: 19,
        minPitch: 0,
        maxPitch: 67,
        attributionControl: false,
        refreshExpiredTiles: false,
        fadeDuration: 100,
        maxTileCacheSize: 500,
        touchZoomRotate: true,
        dragRotate: !isNavigating
      });

      // NOTE: NavigationControl is added in the useEffect hook below (lines ~660-710)
      // to handle dynamic hideControls/hideCompass changes properly.
      // DO NOT add NavigationControl here to avoid duplicates.

      if (onMapClick) {
        map.current.on('click', (e) => {
          console.log('[MAPLIBRE-CLICK] Map clicked at:', e.lngLat.lat, e.lngLat.lng);
          onMapClick(e.lngLat.lat, e.lngLat.lng);
        });
      }

      // Prevent default double-click zoom to allow custom double-tap toggle
      map.current.on('dblclick', (e) => {
        console.log('[MAPLIBRE-DBLCLICK] Double-click detected - preventing default zoom');
        e.preventDefault();
      });

      // Two-finger double-tap to zoom out gesture detection
      let lastTwoFingerTap = 0;
      const TWO_FINGER_DOUBLE_TAP_DELAY = 300; // ms
      
      const handleTouchEnd = (e: TouchEvent) => {
        // Only trigger on exactly 2 fingers
        if (e.touches.length === 0 && e.changedTouches.length === 2) {
          const now = Date.now();
          const timeSinceLastTap = now - lastTwoFingerTap;
          
          if (timeSinceLastTap < TWO_FINGER_DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
            // Double-tap detected with two fingers - zoom out
            if (map.current) {
              e.preventDefault();
              e.stopPropagation();
              map.current.zoomOut({ duration: 300 });
              console.log('[MAP-GESTURE] ✅ Two-finger double-tap detected - zooming out');
            }
            lastTwoFingerTap = 0; // Reset to prevent triple-tap
          } else {
            // First tap of potential double-tap
            lastTwoFingerTap = now;
          }
        }
      };

      touchEndHandlerRef.current = handleTouchEnd;
      touchContainerRef.current = mapContainer.current;
      
      if (touchContainerRef.current) {
        touchContainerRef.current.addEventListener('touchend', handleTouchEnd, { passive: false });
        console.log('[MAP-GESTURE] ✅ Two-finger double-tap zoom out enabled');
      }

      map.current.on('moveend', () => {
        if (!map.current) return;
        
        const center = map.current.getCenter();
        const zoom = Math.round(map.current.getZoom());
        const prevZoom = currentZoomRef.current;
        const currentPrefs = preferencesRef.current;
        
        setCurrentZoom(zoom);
        
        const zoomThresholdCrossed = (prevZoom < 17 && zoom >= 17) || (prevZoom >= 17 && zoom < 17);
        if (zoomThresholdCrossed) {
          updateLayerVisibility(map.current, currentPrefs.mapViewMode, zoom);
        }

        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(() => {
          setPreferences(prevPrefs => {
            const newPrefs: MapPreferences = {
              ...prevPrefs,
              center: [center.lng, center.lat] as [number, number],
              zoomLevel: zoom
            };
            saveMapPreferences(newPrefs);
            return newPrefs;
          });
        }, 500);
      });

      map.current.once('load', () => {
        const mapInstance = map.current;
        if (!mapInstance) return;

        // Add satellite sources for map view toggle
        if (!mapInstance.getSource('satellite-2d')) {
          mapInstance.addSource('satellite-2d', {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 19
          });
        }

        if (!mapInstance.getSource('satellite-3d')) {
          mapInstance.addSource('satellite-3d', {
            type: 'raster',
            tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
            tileSize: 256,
            maxzoom: 20
          });
        }

        // Add satellite layers (initially hidden)
        if (!mapInstance.getLayer('satellite-2d-layer')) {
          mapInstance.addLayer({
            id: 'satellite-2d-layer',
            type: 'raster',
            source: 'satellite-2d',
            layout: {
              visibility: 'none'
            }
          });
        }

        if (!mapInstance.getLayer('satellite-3d-layer')) {
          mapInstance.addLayer({
            id: 'satellite-3d-layer',
            type: 'raster',
            source: 'satellite-3d',
            layout: {
              visibility: 'none'
            }
          });
        }

        // Add labels overlay source (CartoDB Dark Matter labels-only layer)
        // This provides city names, town names, and road names on top of satellite imagery
        // Using dark_only_labels which has white text perfect for satellite imagery
        // CRITICAL: Use tileSize: 512 for @2x tiles to prevent black seam artifacts
        if (!mapInstance.getSource('labels-overlay')) {
          mapInstance.addSource('labels-overlay', {
            type: 'raster',
            tiles: [
              'https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png',
              'https://cartodb-basemaps-b.global.ssl.fastly.net/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png',
              'https://cartodb-basemaps-c.global.ssl.fastly.net/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png'
            ],
            tileSize: 512,
            maxzoom: 20,
            attribution: '© <a href="https://carto.com/">CARTO</a>'
          });
        }

        // Add labels layer on top of everything (always visible for satellite mode)
        if (!mapInstance.getLayer('labels-overlay-layer')) {
          mapInstance.addLayer({
            id: 'labels-overlay-layer',
            type: 'raster',
            source: 'labels-overlay',
            layout: {
              visibility: 'none' // Initially hidden, shown in satellite mode
            }
          });
        }

        setIsLoaded(true);
        console.log('✅ MapLibre GL loaded - satellite sources and labels overlay added for map view toggle');
      });

      map.current.on('error', (e) => {
        console.error('MapLibre GL error:', e);
        
        // Report critical rendering errors that prevent map from working
        if (e.error && (
          e.error.message?.includes('WebGL') ||
          e.error.message?.includes('context') ||
          e.error.message?.includes('shader') ||
          e.error.message?.includes('extension')
        )) {
          console.error('🗺️ Critical MapLibre error detected, reporting to error handler');
          reportError(`MapLibre rendering error: ${e.error.message}`);
        }
      });

    } catch (error) {
      console.error('Failed to initialize MapLibre GL:', error);
      console.log('💡 Reporting initialization failure to error handler');
      
      // Report the initialization failure to the error handler
      const errorMessage = error instanceof Error ? error.message : String(error);
      reportError(`MapLibre initialization failed: ${errorMessage}`);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Clean up touch event listener
      if (touchContainerRef.current && touchEndHandlerRef.current) {
        touchContainerRef.current.removeEventListener('touchend', touchEndHandlerRef.current);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !isLoaded) return;
    console.log('[MAP-VIEW-UPDATE] Layer visibility updating for mode:', preferences.mapViewMode, 'zoom:', currentZoom);
    updateLayerVisibility(map.current, preferences.mapViewMode, currentZoom);
  }, [preferences.mapViewMode, isLoaded, updateLayerVisibility, currentZoom]);

  // Dynamically control map rotation gestures during navigation
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    
    const mapInstance = map.current;
    
    if (isNavigating) {
      // CRITICAL: Disable manual rotation during navigation - bearing is controlled by GPS heading
      // BUT keep zoom enabled for pinch-to-zoom and zoom buttons
      mapInstance.dragRotate.disable();
      mapInstance.touchZoomRotate.disableRotation(); // Only disables rotation, zoom still works
      
      // Explicitly ensure zoom is enabled (pinch-to-zoom + zoom buttons)
      mapInstance.scrollZoom.enable();
      mapInstance.doubleClickZoom.enable();
      
      console.log('[MAP-GESTURES] ✅ Navigation mode - Rotation disabled (GPS controls bearing), Zoom enabled (pinch + buttons)');
    } else {
      // Enable all gestures when not navigating
      mapInstance.dragRotate.enable();
      mapInstance.touchZoomRotate.enableRotation();
      mapInstance.scrollZoom.enable();
      mapInstance.doubleClickZoom.enable();
      
      console.log('[MAP-GESTURES] ✅ Exploration mode - All gestures enabled (rotation + zoom)');
    }
  }, [isNavigating, isLoaded]);

  // Helper: Remove route layers
  const removeRouteLayers = useCallback(() => {
    if (!map.current) return;
    try {
      if (map.current.getLayer('route-line')) {
        map.current.removeLayer('route-line');
      }
      if (map.current.getLayer('route-outline')) {
        map.current.removeLayer('route-outline');
      }
      if (map.current.getSource('route')) {
        map.current.removeSource('route');
      }
      console.log('[ROUTE-RENDER] ✅ Route layers removed');
    } catch (error) {
      console.warn('[ROUTE-RENDER] Failed to remove route layers:', error);
    }
  }, []);

  // Helper: Ensure route layers exist (create if missing, called by styledata handler)
  const ensureRouteLayers = useCallback(() => {
    if (!map.current || !map.current.isStyleLoaded()) return false;
    
    // Check if we have cached data to restore
    if (!cachedRouteGeoJsonRef.current) {
      console.log('[ROUTE-ENSURE] No cached route data to restore');
      return false;
    }
    
    // If source already exists, just ensure layers are on top
    if (map.current.getSource('route')) {
      try {
        if (map.current.getLayer('route-outline')) {
          map.current.moveLayer('route-outline');
        }
        if (map.current.getLayer('route-line')) {
          map.current.moveLayer('route-line');
        }
      } catch (e) {
        // Layers might not exist yet
      }
      return true;
    }
    
    console.log('[ROUTE-ENSURE] Rebuilding route from cache after style change');
    
    try {
      // Recreate source from cached GeoJSON
      map.current.addSource('route', {
        type: 'geojson',
        data: cachedRouteGeoJsonRef.current
      });

      // Add route outline (white background for visibility)
      map.current.addLayer({
        id: 'route-outline',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 10,
          'line-opacity': 1.0
        }
      });

      // Add blue route line on top
      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 8,
          'line-opacity': 1.0
        }
      });
      
      console.log('[ROUTE-ENSURE] ✅ Route layers rebuilt from cache');
      return true;
    } catch (error) {
      console.error('[ROUTE-ENSURE] Failed to rebuild route:', error);
      return false;
    }
  }, []);

  // Helper: Render route layers
  const renderRouteLayers = useCallback(() => {
    if (!map.current || !currentRoute?.routePath) return;
    
    console.log('[ROUTE-RENDER] Drawing route with', currentRoute.routePath.length, 'coordinates');
    let routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);

    // During navigation, show only remaining route from current GPS position
    // CRITICAL: Only clip route if GPS coordinates are valid (non-zero, non-NaN)
    const hasValidGPS = isNavigating && 
      gpsPosition && 
      typeof gpsPosition.latitude === 'number' && 
      typeof gpsPosition.longitude === 'number' &&
      !isNaN(gpsPosition.latitude) && 
      !isNaN(gpsPosition.longitude) &&
      gpsPosition.latitude !== 0 && 
      gpsPosition.longitude !== 0;
    
    if (hasValidGPS) {
      const currentPoint = [gpsPosition.longitude, gpsPosition.latitude];
      
      try {
        // Find nearest point on route to current GPS position
        let minDistance = Infinity;
        let nearestIndex = 0;
        
        for (let i = 0; i < routeCoordinates.length; i++) {
          const dx = routeCoordinates[i][0] - currentPoint[0];
          const dy = routeCoordinates[i][1] - currentPoint[1];
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = i;
          }
        }
        
        // Show route from nearest point to destination (dynamic shortening)
        if (nearestIndex > 0 && nearestIndex < routeCoordinates.length - 1) {
          routeCoordinates = routeCoordinates.slice(nearestIndex);
          console.log(`[ROUTE-UPDATE] Route shortened - ${nearestIndex} points removed, ${routeCoordinates.length} remaining`);
        }
      } catch (error) {
        console.warn('Failed to calculate remaining route:', error);
      }
    } else if (isNavigating) {
      // GPS unavailable during navigation - show full route without clipping
      console.log('[ROUTE-RENDER] Navigation active but GPS unavailable - showing full route');
    }
    
    // CRITICAL: Cache the GeoJSON for rebuilding after style changes
    const geoJsonData: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates
      }
    };
    cachedRouteGeoJsonRef.current = geoJsonData;

    if (!map.current.getSource('route')) {
      console.log('[ROUTE-RENDER] ✅ Adding NEW route source and layer - Blue #3b82f6, width 8px');
      map.current.addSource('route', {
        type: 'geojson',
        data: geoJsonData
      });

      // Add route outline (white background for visibility)
      map.current.addLayer({
        id: 'route-outline',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 10,
          'line-opacity': 1.0
        }
      });

      // Add blue route line on top
      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 8,
          'line-opacity': 1.0
        }
      });

      console.log('[ROUTE-RENDER] ✅ Route layers added successfully (outline + line)');
    } else {
      console.log('[ROUTE-RENDER] Updating existing route source with', routeCoordinates.length, 'coordinates');
      const source = map.current.getSource('route') as maplibregl.GeoJSONSource;
      if (source && source.setData) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        });
      }
    }
    
    // CRITICAL: Always move route layers to top to ensure visibility over satellite/label layers
    try {
      if (map.current.getLayer('route-outline')) {
        map.current.moveLayer('route-outline');
      }
      if (map.current.getLayer('route-line')) {
        map.current.moveLayer('route-line');
      }
      console.log('[ROUTE-RENDER] ✅ Route layers moved to top for visibility');
    } catch (e) {
      // Layer might already be on top or not exist yet
    }

    // Add destination flag marker at the end of the route (ONLY in preview mode, hide during navigation)
    // During active navigation, the flag clutters the view - driver knows destination
    if (!isNavigating && routeCoordinates.length > 0) {
      const lastCoord = routeCoordinates[routeCoordinates.length - 1];
      // Validate coordinates are not at origin (0,0) which indicates invalid data
      if (lastCoord && lastCoord[0] !== 0 && lastCoord[1] !== 0) {
        if (destinationMarkerRef.current) {
          destinationMarkerRef.current.remove();
        }
        const flagEl = document.createElement('div');
        flagEl.innerHTML = `
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
            <rect x="6" y="2" width="20" height="14" fill="#ef4444" stroke="white" stroke-width="1.5" rx="2"/>
            <path d="M16 16 L16 38 M14 38 L18 38" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        `;
        destinationMarkerRef.current = new maplibregl.Marker({ element: flagEl, anchor: 'bottom' })
          .setLngLat(lastCoord as [number, number])
          .addTo(map.current);
      }
    } else if (destinationMarkerRef.current) {
      // Always remove flag during navigation or when no route
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    // Only auto-fit bounds when not navigating (during planning)
    if (!isNavigating) {
      const bounds = new maplibregl.LngLatBounds();
      routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
      map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
    }
  }, [currentRoute, isNavigating, gpsPosition]);

  // Route layer manager effect - CONTINUOUS style listener to persist route through view mode changes
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const mapInstance = map.current;
    
    // Clear any existing pending listener
    if (pendingStyleListenerRef.current) {
      mapInstance.off('styledata', pendingStyleListenerRef.current);
      pendingStyleListenerRef.current = null;
    }

    console.log('[ROUTE-RENDER] Route manager - currentRoute:', !!currentRoute, 'styleLoaded:', mapInstance.isStyleLoaded());

    // Remove route visualization if currentRoute is null
    if (!currentRoute?.routePath) {
      console.log('[ROUTE-RENDER] No route data - removing route layers and clearing cache');
      cachedRouteGeoJsonRef.current = null; // Clear cache when no route
      if (mapInstance.isStyleLoaded()) {
        removeRouteLayers();
      }
      return;
    }

    // Render route immediately if style is loaded
    if (mapInstance.isStyleLoaded()) {
      renderRouteLayers();
    } else {
      // Style not ready yet - schedule render when it becomes ready
      console.log('[ROUTE-RENDER] Style not loaded yet - will render on styledata event');
    }

    // CRITICAL: Listen CONTINUOUSLY for styledata events to re-render route after view mode changes
    // This ensures the route layer persists when switching roads ⇄ satellite or during zoom
    const handleStyleChange = () => {
      // If no cached data but we have a route, render it now (initial load case)
      if (!cachedRouteGeoJsonRef.current && currentRoute?.routePath) {
        console.log('[ROUTE-STYLE] No cached data but route exists - calling renderRouteLayers');
        setTimeout(() => {
          if (mapInstance.isStyleLoaded()) {
            renderRouteLayers();
          }
        }, 100);
        return;
      }
      
      // Use cached data for rebuilding - don't depend on React state which may be stale
      if (!cachedRouteGeoJsonRef.current) {
        console.log('[ROUTE-STYLE] No cached route data during style change');
        return;
      }
      
      // Small delay to ensure style has fully loaded all layers
      setTimeout(() => {
        if (mapInstance.isStyleLoaded()) {
          const source = mapInstance.getSource('route') as maplibregl.GeoJSONSource;
          
          // If source is missing, rebuild everything from cache
          if (!source) {
            console.log('[ROUTE-STYLE] Route source missing after style change - rebuilding from cache');
            ensureRouteLayers();
          } else if (cachedRouteGeoJsonRef.current) {
            // Source exists - always refresh data from cache and move layers to top
            console.log('[ROUTE-STYLE] Refreshing route data from cache after style change');
            try {
              source.setData(cachedRouteGeoJsonRef.current);
              if (mapInstance.getLayer('route-outline')) {
                mapInstance.moveLayer('route-outline');
              }
              if (mapInstance.getLayer('route-line')) {
                mapInstance.moveLayer('route-line');
              }
            } catch (e) {
              // Layers might not exist, rebuild them
              ensureRouteLayers();
            }
          }
          
          // CRITICAL: Always re-render to apply latest GPS-based route shortening during navigation
          // This ensures the visible line matches the current route segment
          if (currentRoute?.routePath) {
            console.log('[ROUTE-STYLE] Re-rendering route with latest data after style change');
            renderRouteLayers();
          }
        }
      }, 150); // Slightly longer delay to ensure style is fully loaded
    };

    mapInstance.on('styledata', handleStyleChange);

    // Cleanup: Remove continuous listener on unmount or deps change
    return () => {
      mapInstance.off('styledata', handleStyleChange);
    };
  }, [currentRoute, isLoaded, removeRouteLayers, renderRouteLayers, ensureRouteLayers]);

  // Traffic-aware route coloring - DISABLED to preserve cyan route visibility
  // The traffic overlay was masking the professional cyan route (#06b6d4) with black/dark colors
  useEffect(() => {
    if (!map.current || !isLoaded || !currentRoute?.routePath) return;
    if (!map.current.isStyleLoaded()) return;

    const mapInstance = map.current;

    // ALWAYS remove traffic overlay to show beautiful cyan route underneath
    if (mapInstance.getLayer('route-traffic-overlay')) {
      mapInstance.removeLayer('route-traffic-overlay');
    }
    if (mapInstance.getSource('route-traffic')) {
      mapInstance.removeSource('route-traffic');
    }
  }, [currentRoute, isLoaded]);

  // Traffic Flow Layer Implementation with TomTom API
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    if (!map.current.isStyleLoaded()) return;

    const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;
    
    if (!TOMTOM_API_KEY) {
      console.warn('VITE_TOMTOM_API_KEY not found - traffic layer disabled');
      setIsTrafficLayerReady(false);
      return;
    }

    const trafficSourceId = 'traffic-flow-source';
    const trafficLayerId = 'traffic-flow-layer';

    if (!showTraffic) {
      // If traffic is disabled, mark layer as not ready
      setIsTrafficLayerReady(false);
      
      // Update visibility if layer exists
      if (map.current.getLayer(trafficLayerId)) {
        map.current.setLayoutProperty(trafficLayerId, 'visibility', 'none');
      }
      return;
    }

    // Add traffic source if it doesn't exist
    if (!map.current.getSource(trafficSourceId)) {
      map.current.addSource(trafficSourceId, {
        type: 'vector',
        tiles: [
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.pbf?key=${TOMTOM_API_KEY}`
        ],
        minzoom: 0,
        maxzoom: 18
      });
    }

    // Add traffic layer if it doesn't exist
    if (!map.current.getLayer(trafficLayerId)) {
      map.current.addLayer({
        id: trafficLayerId,
        type: 'line',
        source: trafficSourceId,
        'source-layer': 'Traffic flow',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          visibility: preferences.mapViewMode === 'satellite' ? 'none' : 'visible'
        },
        paint: {
          'line-color': [
            'case',
            ['<', ['get', 'speed_ratio'], 0.3], '#DC2626', // Red: heavy traffic/congestion
            ['<', ['get', 'speed_ratio'], 0.6], '#F59E0B', // Orange: moderate traffic
            ['<', ['get', 'speed_ratio'], 0.8], '#FDE047', // Yellow: light traffic
            '#22C55E' // Green: free flow
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 3,  // 3px at zoom 10
            18, 10   // 10px at zoom 18 - wider to cover black road outlines
          ],
          'line-opacity': 0.9,
          'line-blur': 1 // Slight blur to soften edges
        }
      });
      // Mark layer as ready after adding
      setIsTrafficLayerReady(true);
    } else {
      // Update visibility if layer exists - but not in satellite mode
      const visibility = preferences.mapViewMode === 'satellite' ? 'none' : 'visible';
      map.current.setLayoutProperty(trafficLayerId, 'visibility', visibility);
      // Mark layer as ready
      setIsTrafficLayerReady(true);
    }

    // Auto-refresh traffic data every 5 minutes using cache-busting
    const refreshInterval = setInterval(() => {
      if (map.current && map.current.getSource(trafficSourceId)) {
        const source = map.current.getSource(trafficSourceId) as any;
        if (source && source.type === 'vector') {
          source.setTiles([
            `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.pbf?key=${TOMTOM_API_KEY}&t=${Date.now()}`
          ]);
          console.log('🚦 Traffic data refreshed with cache-busting');
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isLoaded, showTraffic, preferences.mapViewMode]);

  // Render incident markers
  useEffect(() => {
    if (!map.current || !isLoaded || !showIncidents) {
      // Clean up existing markers if incidents are disabled
      incidentMarkersRef.current.forEach(marker => marker.remove());
      incidentMarkersRef.current = [];
      return;
    }
    if (!map.current.isStyleLoaded()) return;

    const mapInstance = map.current;

    // Clean up existing markers
    incidentMarkersRef.current.forEach(marker => marker.remove());
    incidentMarkersRef.current = [];

    // Create markers for each incident
    incidents.forEach((incident) => {
      const iconConfig = getIncidentIcon(incident.type);
      const size = incident.severity === 'high' ? 32 : incident.severity === 'medium' ? 28 : 24;

      // Create HTML element for marker
      const el = document.createElement('div');
      el.className = 'incident-marker';
      el.setAttribute('data-testid', `incident-marker-${incident.id}`);
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="
          width: ${size}px; 
          height: ${size}px; 
          background: ${iconConfig.bgColor}; 
          border: 2px solid ${iconConfig.color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          font-size: ${size * 0.6}px;
          position: relative;
        ">
          ${iconConfig.emoji}
          ${incident.severity === 'high' ? '<div style="position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; background: #DC2626; border-radius: 50%;"></div>' : ''}
        </div>
      `;

      // Create popup content
      const severityBadgeColor = 
        incident.severity === 'high' ? '#DC2626' : 
        incident.severity === 'medium' ? '#F59E0B' : 
        '#64748B';

      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
            <span style="
              background: ${severityBadgeColor}; 
              color: white; 
              padding: 2px 8px; 
              border-radius: 4px; 
              font-size: 11px;
              font-weight: 600;
            ">
              ${(incident.severity || 'low').toUpperCase()}
            </span>
            <span style="
              border: 1px solid #E5E7EB; 
              padding: 2px 8px; 
              border-radius: 4px; 
              font-size: 11px;
              color: #6B7280;
            ">
              ${iconConfig.label}
            </span>
          </div>
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
            ${incident.title || iconConfig.label}
          </div>
          ${incident.description ? `<div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">${incident.description}</div>` : ''}
          ${incident.roadName ? `<div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">📍 ${incident.roadName}</div>` : ''}
          <div style="font-size: 11px; color: #9CA3AF; margin-top: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB;">
            Reported ${formatTimeAgo(incident.reportedAt || new Date())}
          </div>
        </div>
      `;

      // Create popup
      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setHTML(popupContent);

      // Create and add marker
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([incident.coordinates.lng, incident.coordinates.lat])
        .setPopup(popup)
        .addTo(mapInstance);

      incidentMarkersRef.current.push(marker);
    });

    // Cleanup on unmount
    return () => {
      incidentMarkersRef.current.forEach(marker => marker.remove());
      incidentMarkersRef.current = [];
    };
  }, [incidents, isLoaded, showIncidents]);

  // Keep refs in sync with props (prevents stale closures)
  // Trigger re-render when violations change
  useEffect(() => {
    restrictionViolationsRef.current = restrictionViolations;
    // Trigger marker re-render if map is ready
    if (map.current && isLoaded) {
      renderRestrictionMarkers();
    }
  }, [restrictionViolations, isLoaded]);

  // Keep navigation state in sync and trigger cleanup when starting navigation
  useEffect(() => {
    isNavigatingRef.current = isNavigating;
    // Clear markers immediately when navigation starts/stops
    if (map.current && isLoaded) {
      renderRestrictionMarkers();
    }
  }, [isNavigating, isLoaded]);

  // Stable callback to render restriction markers
  // Reads from refs to avoid stale closures when styledata fires
  const renderRestrictionMarkers = useCallback(() => {
    // Read fresh values from refs (no stale closures)
    const navigating = isNavigatingRef.current;
    const violations = restrictionViolationsRef.current;
    
    // Skip if map not ready, navigating, or no violations
    if (!map.current?.isStyleLoaded() || navigating || !violations) {
      // Clean up markers if navigating or no violations
      if (navigating || !violations) {
        restrictionMarkersRef.current.forEach(marker => marker.remove());
        restrictionMarkersRef.current = [];
      }
      return;
    }

    const mapInstance = map.current;

    // Clean up existing markers before rendering new ones
    restrictionMarkersRef.current.forEach(marker => marker.remove());
    restrictionMarkersRef.current = [];

    // Count restrictions with and without coordinates
    const withCoordinates = violations.filter(v => v.restriction.coordinates);

    // Create markers for each restriction violation
    violations.forEach((violation) => {
      if (!violation.restriction.coordinates) {
        return;
      }

      const { restriction } = violation;
      const color = getSeverityColor(restriction.severity);

      // Create HTML element for marker with AlertTriangle icon
      const el = document.createElement('div');
      el.className = 'restriction-marker';
      el.setAttribute('data-testid', `restriction-marker-${restriction.id}`);
      el.style.cssText = `
        width: 36px;
        height: 36px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: transform 0.2s;
      `;

      // Add AlertTriangle icon (white color)
      el.innerHTML = `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;

      // Hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.15)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Format restriction type for display
      const formatType = (type: string): string => {
        const typeMap: Record<string, string> = {
          'height': 'Bridge Height',
          'width': 'Road Width',
          'weight': 'Weight Limit',
          'length': 'Length Restriction'
        };
        return typeMap[type.toLowerCase()] || type;
      };

      // Create popup with restriction details
      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: ${color};">
            ${formatType(restriction.type)}
          </div>
          <div style="font-size: 12px; margin-bottom: 4px;">
            <strong>Location:</strong> ${restriction.location}
          </div>
          <div style="font-size: 12px; margin-bottom: 4px;">
            <strong>Severity:</strong> <span style="color: ${color}; font-weight: 600;">${restriction.severity.toUpperCase()}</span>
          </div>
          <div style="font-size: 12px;">
            <strong>Bypassable:</strong> ${violation.bypassable ? 'Yes' : 'No'}
          </div>
          ${!violation.bypassable ? `
            <div style="margin-top: 8px; padding: 6px; background-color: #fee; border-left: 3px solid ${color}; font-size: 11px;">
              ⚠️ This restriction cannot be bypassed
            </div>
          ` : ''}
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setHTML(popupContent);

      // Create and add marker
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([restriction.coordinates!.lng, restriction.coordinates!.lat])
        .setPopup(popup)
        .addTo(mapInstance);

      restrictionMarkersRef.current.push(marker);
    });

    console.log('[RESTRICTION-MARKERS] ✅ Rendered', restrictionMarkersRef.current.length, 'restriction markers');
  }, []); // No dependencies - uses refs to access latest data

  // Effect to manage restriction markers and style change listener
  // FALLBACK STRATEGY: RestrictionsWarningPanel shows violations if markers can't render
  // Callback reads from refs, so no stale closures even if isNavigating/violations change
  useEffect(() => {
    if (!map.current || !isLoaded) {
      console.log('[RESTRICTION-MARKERS] Map not ready, skipping listener setup');
      // Clean up any existing markers
      restrictionMarkersRef.current.forEach(marker => marker.remove());
      restrictionMarkersRef.current = [];
      return;
    }

    const mapInstance = map.current;

    // Render immediately (reads from refs for fresh state)
    renderRestrictionMarkers();

    // Listen for style changes (roads ⇄ satellite/3D) and re-render markers
    // Handler reads from refs, so always uses latest isNavigating/violations
    const handleStyleLoad = () => {
      console.log('[RESTRICTION-MARKERS] Style loaded/changed, re-rendering markers');
      renderRestrictionMarkers();
    };
    
    mapInstance.on('styledata', handleStyleLoad);

    // Cleanup: remove event listener and clear markers
    return () => {
      mapInstance.off('styledata', handleStyleLoad);
      restrictionMarkersRef.current.forEach(marker => marker.remove());
      restrictionMarkersRef.current = [];
    };
  }, [isLoaded, renderRestrictionMarkers]);

  // GPS tracking and user position marker (using centralized GPS hook)
  // CRITICAL: GPS marker must ALWAYS be visible on any map scenario
  useEffect(() => {
    console.log('[GPS-MARKER] Effect triggered - map:', !!map.current, 'isLoaded:', isLoaded, 'status:', gpsStatus, 'hasPosition:', !!gpsPosition, 'showUserMarker:', showUserMarker);
    
    // CRITICAL FIX: Hide GPS marker in PWA navigation mode
    if (!showUserMarker) {
      console.log('[GPS-MARKER] Marker disabled via showUserMarker prop - removing');
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }
    
    if (!map.current || !isLoaded) {
      console.log('[GPS-MARKER] Skipping - map or isLoaded not ready');
      return;
    }

    const mapInstance = map.current;
    
    // CRITICAL: Show marker based on GPS/Manual status
    const hasGPS = isGPSReady && !!gpsPosition;
    const hasManualLocation = isManualLocation && !!gpsPosition;
    const hasPosition = hasGPS || hasManualLocation;
    
    // Show different markers based on status
    if (!hasPosition && gpsStatus !== 'manual') {
      console.log('[GPS-MARKER] No GPS position - checking fallbacks...');
      
      // CRITICAL: In Navigate mode, ALWAYS show marker using fallback position
      // Priority: Cached position → Route start → Map center
      let fallbackLat: number | null = null;
      let fallbackLng: number | null = null;
      let fallbackSource = '';
      
      const lastKnown = getLastKnownPosition();
      if (lastKnown) {
        fallbackLat = lastKnown.lat;
        fallbackLng = lastKnown.lng;
        fallbackSource = 'cached position';
      } else if (isNavigating && currentRoute?.routePath && currentRoute.routePath.length > 0) {
        // In Navigate mode, use route start as fallback
        fallbackLat = currentRoute.routePath[0].lat;
        fallbackLng = currentRoute.routePath[0].lng;
        fallbackSource = 'route start';
      } else if (currentRoute?.startCoordinates) {
        // Use route start coordinates
        fallbackLat = currentRoute.startCoordinates.lat;
        fallbackLng = currentRoute.startCoordinates.lng;
        fallbackSource = 'route origin';
      }
      
      if (fallbackLat !== null && fallbackLng !== null) {
        console.log(`[GPS-MARKER] Using fallback position from ${fallbackSource}:`, { lat: fallbackLat, lng: fallbackLng });
        
        if (!userMarkerRef.current) {
          // Create orange unavailable GPS marker with route bearing if in Navigate mode
          const markerSize = 48;
          const el = document.createElement('div');
          el.className = 'user-position-marker-unavailable';
          el.innerHTML = `
            <div style="
              width: ${markerSize}px;
              height: ${markerSize}px;
              background: linear-gradient(145deg, #ff6600 0%, #ff4400 50%, #ff2200 100%);
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 0 20px rgba(255, 102, 0, 0.8);
              display: flex;
              align-items: center;
              justify-content: center;
              animation: no-gps-pulse 2s ease-in-out infinite;
              z-index: 1000;
            ">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <style>
              @keyframes no-gps-pulse {
                0%, 100% { transform: scale(1); opacity: 0.9; }
                50% { transform: scale(1.1); opacity: 1; }
              }
            </style>
          `;
          
          userMarkerRef.current = new maplibregl.Marker({
            element: el,
            anchor: 'center',
            rotationAlignment: 'map',
            pitchAlignment: 'map'
          })
            .setLngLat([fallbackLng, fallbackLat])
            .addTo(mapInstance);
          
          // Apply z-index to parent for visibility above all UI
          setTimeout(() => {
            if (el.parentElement) {
              el.parentElement.style.zIndex = '9999';
              el.parentElement.style.pointerEvents = 'none';
              console.log('[GPS-MARKER] Z-index 9999 applied to fallback marker');
            }
          }, 0);
          
          console.log('[GPS-MARKER] ✅ Fallback marker created');
        } else {
          // Update existing fallback marker position
          userMarkerRef.current.setLngLat([fallbackLng, fallbackLat]);
          console.log('[GPS-MARKER] ✅ Fallback marker updated');
        }
        return;
      }
      
      // No fallback position available - remove marker
      console.log('[GPS-MARKER] No fallback position available');
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }
    
    const latitude = gpsPosition?.latitude;
    const longitude = gpsPosition?.longitude;
    const smoothedHeading = gpsPosition?.smoothedHeading ?? null;
    const accuracy = gpsPosition?.accuracy ?? null;
    
    // Safety check - if we don't have valid coordinates, return early
    if (latitude === undefined || longitude === undefined) {
      console.warn('[GPS-MARKER] Invalid GPS position - missing coordinates');
      return;
    }
    
    console.log('[GPS-MARKER] Creating/updating marker at:', { lat: latitude, lng: longitude, hasGPS });
    
    // Use smoothed heading for fluid rotation, fallback to raw heading if smoothing disabled
    const bearing = smoothedHeading ?? gpsPosition?.heading ?? 0;

    // Create or update user position marker
    if (!userMarkerRef.current) {
      // LARGER marker size for mobile visibility
      const markerSize = 48; // Increased to 48px for better mobile visibility
      const borderWidth = 3; // Thicker 3px border
      
      // Determine vehicle icon based on selected profile
      let vehicleIcon = '';
      const vehicleType = selectedProfile?.type || 'car';
      
      // SVG vehicle icons for different types
      const iconSize = Math.round(markerSize * 0.5);
      
      if (vehicleType.includes('lorry') || vehicleType.includes('tonne')) {
        // Truck icon
        vehicleIcon = `
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
            <path d="M18 18.5a1.5 1.5 0 0 1-1 1.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5a1.5 1.5 0 0 1 1 1.5m1.5-9l1.96 2.5H17V9.5m-11 9A1.5 1.5 0 0 1 4.5 17A1.5 1.5 0 0 1 6 15.5A1.5 1.5 0 0 1 7.5 17A1.5 1.5 0 0 1 6 18.5M20 8h-3V4H3c-1.11 0-2 .89-2 2v11h2a3 3 0 0 0 3 3a3 3 0 0 0 3-3h6a3 3 0 0 0 3 3a3 3 0 0 0 3-3h2v-5l-3-4Z"/>
          </svg>
        `;
      } else if (vehicleType.includes('caravan')) {
        // Car with caravan icon
        vehicleIcon = `
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
            <path d="M19.5 17c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5s-.67 1.5-1.5 1.5m-12 0c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17m4.5-5V5h7l3 4v7h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V8h10v4h1m-1 0H2v4h2.22c.55-.61 1.33-1 2.28-1c.95 0 1.73.39 2.28 1H11v-4Z"/>
          </svg>
        `;
      } else {
        // Default car icon
        vehicleIcon = `
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5s-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        `;
      }
      
      // GPS accuracy indicator - multi-tier visual feedback
      // CRITICAL: Show gray marker when GPS is not available
      const accuracyLevel = !hasGPS ? 'unavailable' :
                           !accuracy ? 'excellent' : 
                           accuracy < 10 ? 'excellent' : 
                           accuracy < 30 ? 'good' : 
                           accuracy < 100 ? 'fair' : 'poor';
      
      const accuracyColors = {
        unavailable: { ring: '#ff6600', glow: 'rgba(255, 102, 0, 0.8)', markerBg: 'linear-gradient(145deg, #ff6600 0%, #ff4400 50%, #ff2200 100%)' }, // BRIGHTER orange for visibility
        excellent: { ring: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', markerBg: 'linear-gradient(145deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)' },
        good: { ring: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', markerBg: 'linear-gradient(145deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)' },
        fair: { ring: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', markerBg: 'linear-gradient(145deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)' },
        poor: { ring: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', markerBg: 'linear-gradient(145deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)' }
      };
      
      const { ring: accuracyColor, glow: accuracyGlow, markerBg } = accuracyColors[accuracyLevel];
      
      // Directional chevron arrow (always points forward relative to heading)
      const chevronSize = Math.round(markerSize * 0.35);
      const directionChevron = `
        <svg width="${chevronSize}" height="${chevronSize}" viewBox="0 0 24 24" fill="white" style="
          position: absolute;
          top: -${chevronSize * 0.6}px;
          left: 50%;
          transform: translateX(-50%);
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
        ">
          <path d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6 1.41-1.42z" transform="rotate(180 12 12)"/>
        </svg>
      `;
      
      // SCREEN-FIXED ARROWHEAD: Removed per user request
      // Clean up any existing arrowhead
      if (screenArrowheadRef.current) {
        screenArrowheadRef.current.remove();
        screenArrowheadRef.current = null;
      }
    }

    // Cleanup
    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [gpsPosition, gpsStatus, isGPSReady, isLoaded, selectedProfile, showUserMarker]); // Include GPS status and showUserMarker for proper marker updates
  
  // GPS HEADING ROTATION: CRITICAL SAFETY FEATURE
  // Continuously applies GPS heading to map bearing during navigation
  // Makes route line appear vertical (south→north) beneath speedometer
  useEffect(() => {
    if (!map.current || !isLoaded) {
      return;
    }
    
    if (!isNavigating) {
      return;
    }
    
    const mapInstance = map.current;
    let animationFrame: number | null = null;
    let lastUpdateTime = Date.now();
    let lastBearing = 0;
    let routeProgressIndex = 0;
    
    // Helper: Calculate distance between two points (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };
    
    // Helper: Calculate bearing between two points
    const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
      const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
                Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    };
    
    // Helper: Find nearest segment on route
    const findNearestSegment = (currentLat: number, currentLng: number, path: Array<{lat: number, lng: number}>): number => {
      let minDistance = Infinity;
      let nearestIndex = 0;
      
      for (let i = 0; i < path.length - 1; i++) {
        const segmentStart = path[i];
        const segmentEnd = path[i + 1];
        
        const lat1 = segmentStart.lat;
        const lon1 = segmentStart.lng;
        const lat2 = segmentEnd.lat;
        const lon2 = segmentEnd.lng;
        
        // Calculate distance from point to segment using parametric projection
        const dx = lon2 - lon1;
        const dy = lat2 - lat1;
        const segmentLength = Math.sqrt(dx * dx + dy * dy);
        
        if (segmentLength === 0) {
          const distance = calculateDistance(currentLat, currentLng, lat1, lon1);
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = i;
          }
          continue;
        }
        
        // Project point onto line segment (t = 0 to 1)
        const t = Math.max(0, Math.min(1, 
          ((currentLng - lon1) * dx + (currentLat - lat1) * dy) / (segmentLength * segmentLength)
        ));
        
        const projectedLat = lat1 + t * dy;
        const projectedLng = lon1 + t * dx;
        const distance = calculateDistance(currentLat, currentLng, projectedLat, projectedLng);
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }
      
      return nearestIndex;
    };
    
    // Continuous GPS heading rotation - runs at 30 FPS for smooth updates
    const updateGPSHeading = () => {
      const now = Date.now();
      const deltaTime = now - lastUpdateTime;
      
      // Update at 30 FPS (every ~33ms) for smooth rotation with bearing delta check
      if (deltaTime > 33) {
        let bearing = 0;
        let latitude: number | null = null;
        let longitude: number | null = null;
        let shouldUpdate = false;
        
        // PRIORITY 1: Use GPS heading when available (CRITICAL for safety)
        if (gpsPosition?.latitude && gpsPosition?.longitude) {
          latitude = gpsPosition.latitude;
          longitude = gpsPosition.longitude;
          // Use smoothed heading for fluid rotation, fallback to raw heading
          bearing = gpsPosition.smoothedHeading ?? gpsPosition.heading ?? lastBearing;
          shouldUpdate = true;
          
          // Skip update if bearing change is minimal (< 0.5 degrees)
          if (Math.abs(bearing - lastBearing) < 0.5) {
            shouldUpdate = false;
          }
          
          // Track route progress for fallback
          if (currentRoute?.routePath && currentRoute.routePath.length >= 2) {
            routeProgressIndex = findNearestSegment(latitude, longitude, currentRoute.routePath);
          }
        }
        // PRIORITY 2: Fallback to route segment bearing when GPS unavailable
        else if (currentRoute?.routePath && currentRoute.routePath.length >= 2) {
          const path = currentRoute.routePath;
          const currentCenter = mapInstance.getCenter();
          
          routeProgressIndex = findNearestSegment(currentCenter.lat, currentCenter.lng, path);
          const segmentIndex = Math.min(routeProgressIndex, path.length - 2);
          const currentPoint = path[segmentIndex];
          const nextPoint = path[segmentIndex + 1];
          
          bearing = calculateBearing(
            currentPoint.lat, currentPoint.lng,
            nextPoint.lat, nextPoint.lng
          );
          
          latitude = currentPoint.lat;
          longitude = currentPoint.lng;
          shouldUpdate = true;
          
          if (deltaTime > 1000) {
            console.log(`[GPS-HEADING] Fallback - route segment ${segmentIndex}/${path.length-1}, bearing: ${bearing.toFixed(1)}°`);
          }
        }
        
        // Cache bearing for smooth transitions
        if (bearing !== 0) {
          lastBearing = bearing;
        }
        
        if (shouldUpdate && latitude !== null && longitude !== null) {
          const currentBearing = mapInstance.getBearing();
          const currentCenter = mapInstance.getCenter();
          
          // Calculate shortest rotation path (avoid spinning 359° when 1° would work)
          let bearingDelta = bearing - currentBearing;
          while (bearingDelta > 180) bearingDelta -= 360;
          while (bearingDelta < -180) bearingDelta += 360;
          
          // Calculate position change
          const centerDelta = Math.sqrt(
            Math.pow(longitude - currentCenter.lng, 2) + 
            Math.pow(latitude - currentCenter.lat, 2)
          );
          
          // Update compass bearing display
          setBearing(bearing);
          
          // CRITICAL FIX: Always apply rotation during navigation (no threshold check)
          // This ensures continuous smooth rotation even during gradual curves
          // Only skip update if absolutely no change (prevents unnecessary renders)
          if (Math.abs(bearingDelta) > 0.05 || centerDelta > 0.0000001) {
            // TomTom GO style navigation view:
            // - Vehicle marker at bottom 20% of screen
            // - Route line extends straight up toward horizon
            // - Steep 3D perspective for immersive driving feel
            const containerHeight = mapInstance.getContainer().clientHeight || 800;
            
            mapInstance.easeTo({
              center: [longitude, latitude],
              zoom: 15.5, // Zoomed out to show more route ahead (matches TomTom GO overview)
              pitch: 55, // Moderate 3D tilt for good visibility of route ahead
              bearing: bearing, // CRITICAL: Rotate map so GPS heading points up (route appears vertical)
              padding: { 
                // CRITICAL: Large top padding pushes vehicle marker to bottom of screen
                // This makes the route line extend upward from the speedometer area
                // Matching the visual style from TomTom GO reference (IMG_0145)
                top: Math.round(containerHeight * 0.60), // Push center point to lower 40% of screen
                bottom: 60, // Small bottom padding for speedometer
                left: 0, 
                right: 0 
              },
              duration: 200, // Short duration for responsive feel
              easing: (t) => t, // Linear easing prevents acceleration artifacts during rotation
              essential: true // Ensure animation isn't interrupted by user gestures
            });
          }
        }
        
        lastUpdateTime = now;
      }
      
      // Continue animation loop
      animationFrame = requestAnimationFrame(updateGPSHeading);
    };
    
    // Start continuous GPS heading rotation
    console.log('[GPS-HEADING] ==========================================');
    console.log('[GPS-HEADING] ✅ GPS HEADING ROTATION ACTIVE');
    console.log('[GPS-HEADING] Map rotates continuously with GPS heading');
    console.log('[GPS-HEADING] Route line appears vertical (south→north)');
    console.log('[GPS-HEADING] Vehicle marker centered in lower third');
    console.log('[GPS-HEADING] ==========================================');
    updateGPSHeading();
    
    // Cleanup animation frame on unmount
    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        console.log('[GPS-HEADING] ✓ GPS heading rotation stopped');
      }
    };
  }, [isNavigating, isLoaded, gpsPosition, currentRoute]);

  // Listen for auto-zoom to GPS position event
  useEffect(() => {
    const handleAutoZoom = (event: CustomEvent) => {
      if (!map.current) return;

      const { position } = event.detail;

      // Fly to GPS position with street-level view
      map.current.flyTo({
        center: [position.lng, position.lat],
        zoom: position.zoom || 17.5,
        pitch: position.pitch || 45,
        bearing: position.bearing || 0,
        duration: 2000,
        essential: true
      });
    };

    window.addEventListener('auto_zoom_gps', handleAutoZoom as EventListener);
    
    return () => {
      window.removeEventListener('auto_zoom_gps', handleAutoZoom as EventListener);
    };
  }, []);

  const handleZoomIn = () => {
    if (map.current) {
      map.current.zoomIn({ duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (map.current) {
      map.current.zoomOut({ duration: 300 });
    }
  };

  const handleRecenter = () => {
    if (!map.current) return;
    
    // Get current GPS location and center map there
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.current?.flyTo({ 
            center: [longitude, latitude], 
            zoom: 16, 
            duration: 1000 
          });
        },
        () => {
          // Fallback: center on route if available
          if (currentRoute?.routePath) {
            const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);
            const bounds = new maplibregl.LngLatBounds();
            routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
            map.current?.fitBounds(bounds, { padding: 50, duration: 1000 });
          }
          // Don't use any hardcoded default position - just stay where we are
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
      );
    } else {
      // Geolocation not available, fallback to route only
      if (currentRoute?.routePath) {
        const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);
        const bounds = new maplibregl.LngLatBounds();
        routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
        map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
      }
      // Don't use any hardcoded default position - just stay where we are
    }
  };

  const toggleMapView = () => {
    const newMode: 'roads' | 'satellite' = preferences.mapViewMode === 'roads' ? 'satellite' : 'roads';
    const newPrefs: MapPreferences = { ...preferences, mapViewMode: newMode };
    setPreferences(newPrefs);
    saveMapPreferences(newPrefs);
  };

  const toggle3DMode = () => {
    if (!map.current) return;
    
    // During navigation, 3D mode is auto-controlled by GPS heading
    // Still allow toggle, but inform user via state change
    if (isNavigating) {
      console.log('[3D-TOGGLE] 3D mode is auto-managed during navigation (60° pitch, heading-up rotation)');
      // Toggle state for visual feedback, but navigation will override camera
      setIs3DMode(!is3DMode);
      return;
    }
    
    const newMode = !is3DMode;
    setIs3DMode(newMode);
    
    // Smoothly transition between 2D (pitch 0) and 3D (pitch 60)
    map.current.easeTo({
      pitch: newMode ? 60 : 0,
      duration: 800
    });
  };
  
  // AUTO-ENABLE 3D MODE when navigation starts
  useEffect(() => {
    if (isNavigating && !is3DMode) {
      console.log('[3D-AUTO] Automatically enabling 3D mode for navigation');
      setIs3DMode(true);
    } else if (!isNavigating && previousNavigationStateRef.current && is3DMode) {
      console.log('[3D-AUTO] Navigation ended, keeping 3D mode state');
      // Keep 3D mode even after navigation ends - user can manually toggle
    }
    previousNavigationStateRef.current = isNavigating;
  }, [isNavigating, is3DMode]);

  const handleCompassClick = () => {
    if (!map.current) return;
    map.current.easeTo({ bearing: 0, pitch: 0, duration: 500 });
  };

  // Toggle native route layer visibility when using static route overlay
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    const mapInstance = map.current;
    
    const setRouteVisibility = () => {
      if (!mapInstance.isStyleLoaded()) return;
      
      const visibility = useStaticRoute ? 'none' : 'visible';
      
      // All possible route layer IDs to hide/show
      const routeLayerIds = [
        'route-line',
        'route-line-background',
        'route-line-casing',
        'route-line-alt',
        'route-line-alt-casing',
        'route-line-alt-background',
        'route-overlay',
        'route-traffic-overlay'
      ];
      
      try {
        for (const layerId of routeLayerIds) {
          if (mapInstance.getLayer(layerId)) {
            mapInstance.setLayoutProperty(layerId, 'visibility', visibility);
          }
        }
      } catch (err) {
        console.warn('[ROUTE-VIS] Failed to toggle route visibility:', err);
      }
    };
    
    setRouteVisibility();
    mapInstance.on('styledata', setRouteVisibility);
    mapInstance.on('load', setRouteVisibility);
    
    return () => {
      mapInstance.off('styledata', setRouteVisibility);
      mapInstance.off('load', setRouteVisibility);
    };
  }, [useStaticRoute, isLoaded]);

  // Prepare route coordinates for static overlay
  const routeCoordinatesForOverlay = currentRoute?.routePath || [];

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)} data-testid="maplibre-container">
      {/* ISOLATED: MapLibre container - wrapped in its own div to prevent CSS leakage */}
      <div className="absolute inset-0">
        <div 
          ref={mapContainer} 
          className="absolute inset-0" 
          style={{ 
            background: 'transparent',
            border: 'none',
            outline: 'none'
          }}
        />
      </div>
      
      {/* ISOLATED: All overlays outside MapLibre's DOM tree to avoid CSS conflicts */}
      <div className="absolute inset-0 pointer-events-none" data-testid="map-overlays">
        {/* Loading Overlay - prevents map flashing during initialization */}
        <div 
          className={cn(
            "absolute inset-0 z-50 flex items-center justify-center bg-slate-100 dark:bg-slate-900 transition-opacity duration-300",
            isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
          data-testid="map-loading-overlay"
          aria-hidden={isLoaded}
          style={{
            transitionDelay: isLoaded ? '0ms' : 'undefined'
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700" />
              <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading map...</span>
          </div>
        </div>
        
        {/* Static Route Overlay - renders north-up route when map rotates during navigation */}
        <StaticRouteOverlay
          map={map.current}
          routeCoordinates={routeCoordinatesForOverlay}
          isActive={useStaticRoute && routeCoordinatesForOverlay.length > 0}
          routeColor="#3b82f6"
          routeWidth={8}
        />
        
      {/* Debug info - only show in development mode */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs font-medium shadow-lg z-10">
          <span className="text-muted-foreground">MapLibre GL</span>
          <span className="text-muted-foreground mx-1">•</span>
          <span>{preferences.mapViewMode}</span>
          <span className="text-muted-foreground mx-1">•</span>
          <span className="text-muted-foreground">z{currentZoom}</span>
          {is3DMode && (
            <>
              <span className="text-muted-foreground mx-1">•</span>
              <span className="text-blue-600 font-semibold">3D</span>
            </>
          )}
        </div>
      )}
      
      {/* GPS Status Indicator */}
      {(gpsStatus === 'acquiring' || gpsStatus === 'unavailable' || gpsStatus === 'error') && (
        <div 
          className="absolute top-28 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
          data-testid="gps-status-indicator"
        >
          <div className={cn(
            "px-2 py-1 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5",
            gpsStatus === 'acquiring' && "bg-transparent text-foreground border border-orange-500",
            gpsStatus === 'unavailable' && "bg-red-500/90 text-white",
            gpsStatus === 'error' && "bg-red-600/90 text-white"
          )}>
            {gpsStatus === 'acquiring' && (
              <>
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium">Acquiring GPS</span>
              </>
            )}
            {gpsStatus === 'unavailable' && (
              <>
                <Crosshair className="w-3 h-3" />
                <span className="text-xs font-medium">GPS unavailable</span>
              </>
            )}
            {gpsStatus === 'error' && (
              <>
                <Crosshair className="w-3 h-3" />
                <span className="text-xs font-medium">GPS error</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* GPS/Cache selection moved to Settings modal - Online/Offline tab */}
      </div>
    </div>
  );
}));

export { MapLibreMap };
export default MapLibreMap;
