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
import { useRouteTrafficOverlay, type TrafficSegment } from "@/hooks/use-route-traffic-overlay";
import { useRouteIncidents, type RouteIncident } from "@/hooks/use-route-incidents";
import { TrafficStatusIndicator, TrafficLegend, type TrafficStatus } from "@/components/navigation/traffic-status-indicator";

/**
 * BULLETPROOF COORDINATE VALIDATION
 * Prevents "coordinates must contain numbers" errors that crash MapLibre
 */
const isValidCoord = (val: unknown): val is number => 
  typeof val === 'number' && !isNaN(val) && isFinite(val);

const isValidLatLng = (coord: { lat?: unknown; lng?: unknown } | null | undefined): coord is { lat: number; lng: number } =>
  coord !== null && coord !== undefined && isValidCoord(coord.lat) && isValidCoord(coord.lng);

const isValidLngLatArray = (coord: unknown[] | null | undefined): coord is [number, number] =>
  Array.isArray(coord) && coord.length >= 2 && isValidCoord(coord[0]) && isValidCoord(coord[1]);

const filterValidRouteCoords = (routePath: Array<{ lat?: unknown; lng?: unknown }> | null | undefined): [number, number][] => {
  if (!routePath || !Array.isArray(routePath)) return [];
  return routePath
    .filter(isValidLatLng)
    .map(coord => [coord.lng, coord.lat] as [number, number]);
};

const safeExtendBounds = (bounds: maplibregl.LngLatBounds, coords: [number, number][]): boolean => {
  let extended = false;
  for (const coord of coords) {
    if (isValidLngLatArray(coord)) {
      try {
        bounds.extend(coord);
        extended = true;
      } catch (e) {
        console.warn('[BOUNDS] Failed to extend with coord:', coord, e);
      }
    }
  }
  return extended;
};

export interface MapLibreMapRef {
  getMap: () => maplibregl.Map | null;
  getBearing: () => number;
  resetBearing: () => void;
  getMapValidity: () => boolean;
  toggle3DMode: () => void;
  is3DMode: () => boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  staggeredZoomIn: (multiplier?: number) => void;
  staggeredZoomOut: (multiplier?: number) => void;
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
  showTraffic = true,
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
  const initialNavViewSetupRef = useRef(false); // Track if initial 3D nav view has been set up
  const userPreferredZoomRef = useRef(16.5); // User's preferred zoom level (respects manual zoom changes)
  const zoomAnimationInProgressRef = useRef(false); // Prevents GPS tracking from overriding zoom during button animations
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
  
  // HEALTH & SAFETY: Persistent navigation route cache - NEVER cleared during navigation
  // This ensures the blue route line is ALWAYS visible during navigation including reroutes
  const persistentNavRouteRef = useRef<{lat: number; lng: number}[] | null>(null);
  const wasNavigatingRef = useRef(false);
  
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
        duration: 400
      });
    },
    is3DMode: () => is3DMode,
    zoomIn: () => {
      if (map.current) {
        const currentZoom = map.current.getZoom();
        const newZoom = Math.min(Math.floor(currentZoom) + 2, 20);
        console.log(`[ZOOM-IN] Current: ${currentZoom.toFixed(1)}, Target: ${newZoom}`);
        userPreferredZoomRef.current = newZoom;
        zoomAnimationInProgressRef.current = true;
        map.current.easeTo({ zoom: newZoom, duration: 200 });
        setTimeout(() => { zoomAnimationInProgressRef.current = false; }, 250);
      }
    },
    zoomOut: () => {
      if (map.current) {
        const currentZoom = map.current.getZoom();
        const newZoom = Math.max(Math.ceil(currentZoom) - 2, 1);
        console.log(`[ZOOM-OUT] Current: ${currentZoom.toFixed(1)}, Target: ${newZoom}`);
        userPreferredZoomRef.current = newZoom;
        zoomAnimationInProgressRef.current = true;
        map.current.easeTo({ zoom: newZoom, duration: 200 });
        setTimeout(() => { zoomAnimationInProgressRef.current = false; }, 250);
      }
    },
    staggeredZoomIn: handleStaggeredZoomIn,
    staggeredZoomOut: handleStaggeredZoomOut,
    zoomToUserLocation: (options) => {
      const {
        forceStreetMode = true,
        zoom = 16.5, // TomTom GO style street-level navigation zoom
        pitch = 60, // TomTom GO style steep 3D tilt
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

      // Zoom helper - uses TomTom GO style padding (55% top, 80 bottom)
      const performZoom = (lat: number, lng: number, bearing: number = 0) => {
        try {
          const containerHeight = mapInstance.getContainer().clientHeight || 800;
          mapInstance.flyTo({
            center: [lng, lat],
            zoom,
            pitch,
            bearing,
            padding: {
              top: Math.round(containerHeight * 0.55), // TomTom GO style - vehicle at lower 45%
              bottom: 80, // Space for speedometer
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
      
      // Validate all coordinates before starting fly-by
      const validCoords = routeCoordinates.filter(isValidLatLng);
      if (!map.current || !isLoaded || validCoords.length < 2) {
        console.warn('[FLY-BY] Cannot start - map not ready or invalid route (valid coords:', validCoords.length, ')');
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
      const coords = validCoords.map(c => [c.lng, c.lat] as [number, number]);
      
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
  
  // Route-specific traffic overlay (Layer 2)
  // FIXED: Show traffic overlay when there's a route (preview or navigation mode)
  // This allows users to see traffic conditions on their planned route before starting navigation
  const hasValidRoute = !!currentRoute?.routePath && currentRoute.routePath.length > 0;
  const trafficOverlayEnabled = showTraffic && hasValidRoute;
  
  // Debug: Only log when conditions change significantly
  if (trafficOverlayEnabled) {
    console.log('[TRAFFIC-OVERLAY] ✅ Traffic overlay ENABLED', {
      showTraffic,
      isNavigating,
      routePathLength: currentRoute?.routePath?.length || 0
    });
  }
  
  const routeTrafficData = useRouteTrafficOverlay(
    currentRoute?.routePath,
    trafficOverlayEnabled,
    2 * 60 * 1000 // 2 minute refresh
  );
  
  // Route-specific incidents (Layer 3)
  // FIXED: Show incidents when there's a route (preview or navigation mode)
  const routeIncidentsData = useRouteIncidents(
    currentRoute?.routePath,
    showIncidents && hasValidRoute,
    2 * 60 * 1000 // 2 minute refresh
  );
  
  // Ref for route traffic overlay layer markers
  const routeTrafficMarkersRef = useRef<maplibregl.Marker[]>([]);
  const routeIncidentMarkersRef = useRef<maplibregl.Marker[]>([]);
  
  // Keep refs in sync with state
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);
  
  useEffect(() => {
    currentZoomRef.current = currentZoom;
  }, [currentZoom]);

  // Effect to update map rotation and position in navigation mode
  // NOTE: This is a secondary GPS update effect - the primary GPS heading rotation effect handles continuous updates
  // This effect is kept for backwards compatibility but uses consistent 60° pitch settings
  useEffect(() => {
    if (!map.current || !isNavigating || !gpsPosition || !isLoaded) return;

    // Skip this effect - let the GPS heading rotation effect handle continuous updates
    // This prevents conflicting camera animations
    return;
  }, [isNavigating, gpsPosition, isLoaded]);

  // Enhanced 3D Navigation Mode: Auto-activate when navigation starts, smooth exit when it ends
  // NOTE: The actual 3D view setup is handled by the GPS heading rotation effect's setupInitialNavigationView()
  // This effect only handles 3D mode state and exit transitions
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const wasNavigating = previousNavigationStateRef.current;
    const isNowNavigating = isNavigating;

    // Navigation started - store previous state and set 3D mode flag
    // NOTE: Actual camera setup is done by GPS heading rotation effect's setupInitialNavigationView()
    if (!wasNavigating && isNowNavigating) {
      console.log('[NAV-3D] Navigation started - 3D mode enabled (60° pitch, zoom 16.5)');
      previousPitchRef.current = map.current.getPitch();
      previousBearingRef.current = map.current.getBearing();
      setIs3DMode(true);
      // Don't set camera here - let GPS heading rotation effect handle it for consistency
    }
    
    // Navigation ended - smooth transition back to previous state
    if (wasNavigating && !isNowNavigating) {
      console.log('[NAV-3D] Navigation ended - transitioning to normal view');
      
      map.current.easeTo({
        pitch: previousPitchRef.current,
        bearing: 0,
        zoom: Math.min(map.current.getZoom(), 16),
        padding: { top: 0, bottom: 0, left: 0, right: 0 }, // Reset padding
        duration: 1000,
        easing: (t) => t * (2 - t)
      });
      
      // Reset 3D mode state to match previous pitch
      const was3D = previousPitchRef.current > 30;
      setIs3DMode(was3D);
      
      // CRITICAL: Force map resize after navigation ends to fix container sizing
      setTimeout(() => {
        if (map.current) {
          try {
            map.current.resize();
            console.log('[NAV-3D] Map resized after navigation ended');
          } catch (e) {
            console.warn('[NAV-3D] Map resize failed:', e);
          }
        }
      }, 100);
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
      
      // SATELLITE FIX: Double-check route layers are on top after a delay
      // This handles the case where labels overlay was just added and route needs to be above it
      setTimeout(() => {
        try {
          if (mapInstance.getLayer('route-outline')) {
            mapInstance.moveLayer('route-outline');
          }
          if (mapInstance.getLayer('route-line')) {
            mapInstance.moveLayer('route-line');
          }
          // TRAFFIC FIX: Ensure route traffic overlay is on top in ALL view modes
          if (mapInstance.getLayer('route-traffic-overlay-layer')) {
            mapInstance.moveLayer('route-traffic-overlay-layer');
          }
          console.log('[ROUTE-LAYERS] Delayed move - ensured route layers are on top of satellite/labels');
        } catch (e) {
          // Layers might not exist
        }
      }, 200);
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
              map.current.zoomOut({ duration: 150 });
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

        // Add satellite sources for map view toggle with optimized caching
        if (!mapInstance.getSource('satellite-2d')) {
          mapInstance.addSource('satellite-2d', {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '&copy; Esri'
          });
        }

        if (!mapInstance.getSource('satellite-3d')) {
          mapInstance.addSource('satellite-3d', {
            type: 'raster',
            tiles: [
              'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
              'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
              'https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
              'https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
            ],
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

        // Add 3D buildings vector source using free Protomaps tiles
        if (!mapInstance.getSource('protomaps-buildings')) {
          mapInstance.addSource('protomaps-buildings', {
            type: 'vector',
            tiles: [
              'https://api.protomaps.com/tiles/v3/{z}/{x}/{y}.mvt?key=1003762824b9687f'
            ],
            minzoom: 0,
            maxzoom: 15
          });
        }

        // Add 3D buildings fill-extrusion layer (initially hidden, shown in 3D mode)
        if (!mapInstance.getLayer('3d-buildings')) {
          mapInstance.addLayer({
            id: '3d-buildings',
            source: 'protomaps-buildings',
            'source-layer': 'buildings',
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'height'], 10],
                0, '#f0f0f0',
                20, '#e0e0e0',
                50, '#d0d0d0',
                100, '#c0c0c0',
                200, '#b0b0b0'
              ],
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14, 0,
                15, ['coalesce', ['get', 'height'], 10]
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14, 0,
                15, ['coalesce', ['get', 'min_height'], 0]
              ],
              'fill-extrusion-opacity': 0.7
            },
            layout: {
              visibility: 'none'
            }
          });
          console.log('[3D-BUILDINGS] Added 3D buildings layer with Protomaps source');
          
          // Add click handler for interactive 3D buildings
          mapInstance.on('click', '3d-buildings', (e) => {
            if (!e.features || e.features.length === 0) return;
            
            const feature = e.features[0];
            const properties = feature.properties || {};
            
            // Extract building information
            const height = properties.height || properties.render_height || 10;
            const name = properties.name || properties.building_name || null;
            const buildingType = properties.building || properties.type || 'Building';
            const levels = properties.levels || properties.building_levels || Math.round(height / 3);
            const address = properties.addr_street || properties['addr:street'] || null;
            const houseNumber = properties.addr_housenumber || properties['addr:housenumber'] || null;
            
            // Format building type nicely
            const formatBuildingType = (type: string) => {
              const typeMap: Record<string, string> = {
                'yes': 'Building',
                'residential': 'Residential',
                'commercial': 'Commercial',
                'industrial': 'Industrial',
                'retail': 'Retail',
                'office': 'Office Building',
                'apartments': 'Apartments',
                'house': 'House',
                'warehouse': 'Warehouse',
                'garage': 'Garage',
                'hospital': 'Hospital',
                'school': 'School',
                'church': 'Church',
                'hotel': 'Hotel',
                'parking': 'Parking Structure',
              };
              return typeMap[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
            };
            
            // Build popup content
            let popupContent = '<div class="building-popup" style="font-family: system-ui, sans-serif; padding: 4px 0;">';
            
            if (name) {
              popupContent += `<div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${name}</div>`;
            }
            
            popupContent += `<div style="font-size: 13px; color: #666;">${formatBuildingType(buildingType)}</div>`;
            
            if (address) {
              const fullAddress = houseNumber ? `${houseNumber} ${address}` : address;
              popupContent += `<div style="font-size: 12px; color: #888; margin-top: 2px;">${fullAddress}</div>`;
            }
            
            popupContent += '<div style="display: flex; gap: 12px; margin-top: 6px; font-size: 12px;">';
            popupContent += `<span style="color: #555;"><strong>${Math.round(height)}m</strong> tall</span>`;
            popupContent += `<span style="color: #555;"><strong>${levels}</strong> floors</span>`;
            popupContent += '</div>';
            popupContent += '</div>';
            
            // Create and show popup
            new maplibregl.Popup({
              closeButton: true,
              closeOnClick: true,
              maxWidth: '220px',
              offset: [0, -10]
            })
              .setLngLat(e.lngLat)
              .setHTML(popupContent)
              .addTo(mapInstance);
            
            console.log('[3D-BUILDINGS] Building clicked:', { name, buildingType, height, levels });
          });
          
          // Change cursor on hover over 3D buildings
          mapInstance.on('mouseenter', '3d-buildings', () => {
            mapInstance.getCanvas().style.cursor = 'pointer';
          });
          
          mapInstance.on('mouseleave', '3d-buildings', () => {
            mapInstance.getCanvas().style.cursor = '';
          });
          
          console.log('[3D-BUILDINGS] Interactive click handlers added');
        }

        setIsLoaded(true);
        console.log('✅ MapLibre GL loaded - satellite sources, labels overlay, and 3D buildings added');
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
    // HEALTH & SAFETY: Use persistent navigation cache as fallback
    if (!cachedRouteGeoJsonRef.current) {
      if (persistentNavRouteRef.current && persistentNavRouteRef.current.length >= 2) {
        console.log('[ROUTE-ENSURE] No GeoJSON cache - rebuilding from persistent navigation cache');
        const validCoords = persistentNavRouteRef.current
          .filter(coord => coord && 
            typeof coord.lng === 'number' && !isNaN(coord.lng) && isFinite(coord.lng) &&
            typeof coord.lat === 'number' && !isNaN(coord.lat) && isFinite(coord.lat))
          .map(coord => [coord.lng, coord.lat]);
        
        if (validCoords.length >= 2) {
          cachedRouteGeoJsonRef.current = {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: validCoords
            }
          };
        } else {
          console.log('[ROUTE-ENSURE] Persistent cache has insufficient valid coordinates');
          return false;
        }
      } else {
        console.log('[ROUTE-ENSURE] No cached route data to restore');
        return false;
      }
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
        // TRAFFIC FIX: Always move traffic overlay above route line
        if (map.current.getLayer('route-traffic-overlay-layer')) {
          map.current.moveLayer('route-traffic-overlay-layer');
        }
      } catch (e) {
        // Layers might not exist yet
      }
      return true;
    }
    
    console.log('[ROUTE-ENSURE] Rebuilding route from cache after style change');
    
    try {
      // CRITICAL FIX: Validate cached coordinates before rebuilding
      const cachedData = cachedRouteGeoJsonRef.current;
      if (cachedData?.geometry?.coordinates) {
        const validCoords = cachedData.geometry.coordinates.filter(
          (coord: number[]) => Array.isArray(coord) && 
            coord.length >= 2 &&
            typeof coord[0] === 'number' && !isNaN(coord[0]) && isFinite(coord[0]) &&
            typeof coord[1] === 'number' && !isNaN(coord[1]) && isFinite(coord[1])
        );
        
        if (validCoords.length < 2) {
          console.warn('[ROUTE-ENSURE] Cached route has insufficient valid coordinates:', validCoords.length);
          cachedRouteGeoJsonRef.current = null;
          return false;
        }
        
        // Update cache with validated coordinates
        cachedData.geometry.coordinates = validCoords;
      }
      
      // Recreate source from cached GeoJSON
      map.current.addSource('route', {
        type: 'geojson',
        data: cachedData
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
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 6,
            12, 16,
            16, 24,
            20, 32
          ],
          'line-opacity': 1.0
        }
      });

      // Add TomTom blue route line on top
      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#0067FF',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 4,
            12, 12,
            16, 18,
            20, 24
          ],
          'line-opacity': 0.95
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
    if (!map.current) return;
    
    // HEALTH & SAFETY: Use persistent cache if currentRoute is temporarily unavailable during navigation
    let sourceCoords = currentRoute?.routePath;
    if (!sourceCoords || sourceCoords.length < 2) {
      if (isNavigating && persistentNavRouteRef.current && persistentNavRouteRef.current.length >= 2) {
        console.log('[ROUTE-RENDER] Using persistent navigation cache -', persistentNavRouteRef.current.length, 'coordinates');
        sourceCoords = persistentNavRouteRef.current;
      } else {
        console.log('[ROUTE-RENDER] No route data available');
        return;
      }
    }
    
    console.log('[ROUTE-RENDER] Drawing route with', sourceCoords.length, 'coordinates');
    
    // CRITICAL FIX: Validate all coordinates are valid numbers before passing to MapLibre
    // This prevents "coordinates must contain numbers" errors during navigation
    let routeCoordinates = sourceCoords
      .filter(coord => {
        // Ensure coord exists and has valid numeric lat/lng
        if (!coord) return false;
        const hasValidLng = typeof coord.lng === 'number' && !isNaN(coord.lng) && isFinite(coord.lng);
        const hasValidLat = typeof coord.lat === 'number' && !isNaN(coord.lat) && isFinite(coord.lat);
        return hasValidLng && hasValidLat;
      })
      .map(coord => [coord.lng, coord.lat]);
    
    // Ensure we have at least 2 valid coordinates to form a line
    if (routeCoordinates.length < 2) {
      console.warn('[ROUTE-RENDER] Insufficient valid coordinates:', routeCoordinates.length, '- need at least 2');
      return;
    }

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
      console.log('[ROUTE-RENDER] ✅ Adding NEW route source and layer - TomTom Blue #0067FF, width 8px');
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
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 6,
            12, 16,
            16, 24,
            20, 32
          ],
          'line-opacity': 1.0
        }
      });

      // Add TomTom blue route line on top
      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#0067FF',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 4,
            12, 12,
            16, 18,
            20, 24
          ],
          'line-opacity': 0.95
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
      // TRAFFIC FIX: Always move traffic overlay above route line
      if (map.current.getLayer('route-traffic-overlay-layer')) {
        map.current.moveLayer('route-traffic-overlay-layer');
      }
      console.log('[ROUTE-RENDER] ✅ Route layers moved to top for visibility');
    } catch (e) {
      // Layer might already be on top or not exist yet
    }

    // Add destination flag marker at the end of the route (ONLY in preview mode, hide during navigation)
    // During active navigation, the flag clutters the view - driver knows destination
    if (map.current && map.current.isStyleLoaded()) {
      try {
        const layers = map.current.getStyle().layers;
        layers.forEach((layer: any) => {
          if (layer.id.includes('road') || layer.id.includes('tunnel') || layer.id.includes('bridge')) {
            if (layer.type === 'line') {
              // Ensure road lines are not black in road mode (fix for black line issue)
              if (preferences.mapViewMode === 'roads') {
                map.current?.setPaintProperty(layer.id, 'line-color', '#ffffff');
              }
            }
          }
        });
      } catch (e) {
        console.warn('[MAP-ROADS] Style cleanup failed:', e);
      }
    }

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
    if (!isNavigating && routeCoordinates.length >= 2) {
      const bounds = new maplibregl.LngLatBounds();
      if (safeExtendBounds(bounds, routeCoordinates as [number, number][])) {
        map.current.fitBounds(bounds, { padding: 50, duration: 400 });
      }
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

    console.log('[ROUTE-RENDER] Route manager - currentRoute:', !!currentRoute, 'isNavigating:', isNavigating, 'styleLoaded:', mapInstance.isStyleLoaded());

    // HEALTH & SAFETY: Cache route coordinates when available for navigation
    // This ensures we NEVER lose the route during reroutes or state transitions
    if (currentRoute?.routePath && currentRoute.routePath.length >= 2) {
      persistentNavRouteRef.current = [...currentRoute.routePath];
      console.log('[ROUTE-RENDER] ✅ Cached', currentRoute.routePath.length, 'coordinates for persistent navigation');
    }
    
    // Track navigation state transitions
    wasNavigatingRef.current = isNavigating;

    // HEALTH & SAFETY: Check if routePath is missing OR has less than 2 points (covers empty arrays during reroute transitions)
    const hasValidRoutePath = currentRoute?.routePath && currentRoute.routePath.length >= 2;
    
    // Remove route visualization if no valid route - BUT NEVER DURING NAVIGATION
    if (!hasValidRoutePath) {
      // CRITICAL SAFETY CHECK: During navigation, NEVER remove the route
      // Use persistent cache instead to maintain visibility
      if (isNavigating && persistentNavRouteRef.current && persistentNavRouteRef.current.length >= 2) {
        console.log('[ROUTE-RENDER] ⚠️ Route data missing/empty during navigation - using persistent cache with', persistentNavRouteRef.current.length, 'coords');
        // Force re-render using cached data - ensures blue line stays visible
        if (mapInstance.isStyleLoaded()) {
          const hasRouteLayer = mapInstance.getLayer('route-line');
          if (!hasRouteLayer) {
            ensureRouteLayers();
          }
          // CRITICAL: Always force render from cache to ensure line is visible
          renderRouteLayers();
        }
        // DO NOT return - allow the styledata listener to be set up
      } else {
        // Not navigating - safe to remove route
        console.log('[ROUTE-RENDER] No route data - removing route layers and clearing cache');
        cachedRouteGeoJsonRef.current = null;
        persistentNavRouteRef.current = null; // Only clear when NOT navigating
        if (mapInstance.isStyleLoaded()) {
          removeRouteLayers();
        }
        return;
      }
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
              // TRAFFIC FIX: Always move traffic overlay above route line
              if (mapInstance.getLayer('route-traffic-overlay-layer')) {
                mapInstance.moveLayer('route-traffic-overlay-layer');
              }
            } catch (e) {
              // Layers might not exist, rebuild them
              ensureRouteLayers();
            }
          }
          
          // CRITICAL: Always re-render to apply latest GPS-based route shortening during navigation
          // This ensures the visible line matches the current route segment
          // HEALTH & SAFETY: Use persistent cache if currentRoute is temporarily null
          if (currentRoute?.routePath || (isNavigating && persistentNavRouteRef.current)) {
            console.log('[ROUTE-STYLE] Re-rendering route with latest data after style change');
            renderRouteLayers();
          }
        }
      }, 75); // Fast delay - style should be ready quickly
    };

    mapInstance.on('styledata', handleStyleChange);

    // Cleanup: Remove continuous listener on unmount or deps change
    return () => {
      mapInstance.off('styledata', handleStyleChange);
    };
  }, [currentRoute, isNavigating, isLoaded, removeRouteLayers, renderRouteLayers, ensureRouteLayers]);

  // CRITICAL: Restore route layers when navigation state changes
  // This ensures the blue polyline stays visible when switching to/from navigation mode
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    if (!map.current.isStyleLoaded()) return;
    
    // HEALTH & SAFETY: Get route coordinates from current route OR persistent cache
    const routeCoords = currentRoute?.routePath || persistentNavRouteRef.current;
    const hasRouteData = routeCoords && routeCoords.length >= 2;
    
    // When navigation starts, ensure route layers exist AND re-render the route
    if (isNavigating && hasRouteData) {
      console.log('[ROUTE-NAV-STATE] Navigation started - ensuring blue route line is visible');
      console.log('[ROUTE-NAV-STATE] Route has', routeCoords!.length, 'coordinates (from', currentRoute?.routePath ? 'currentRoute' : 'persistentCache', ')');
      
      // BULLETPROOF ROUTE RENDERING: Fast multiple attempts for quick rendering
      const renderAttempts = [0, 50, 100, 200, 400];
      
      renderAttempts.forEach((delay, index) => {
        setTimeout(() => {
          if (!map.current || !map.current.isStyleLoaded()) return;
          
          const hasRouteLayer = map.current.getLayer('route-line');
          const hasRouteSource = map.current.getSource('route');
          
          // If route layer doesn't exist or source is missing, force render
          if (!hasRouteLayer || !hasRouteSource) {
            console.log(`[ROUTE-NAV-STATE] Attempt ${index + 1}/${renderAttempts.length}: Route layers missing - forcing render`);
            ensureRouteLayers();
            renderRouteLayers();
          } else if (index === 0) {
            // First attempt: always render to ensure data is fresh
            console.log('[ROUTE-NAV-STATE] Force rendering route layers after navigation start');
            renderRouteLayers();
          }
          
          // Move route layers to top to ensure visibility
          try {
            if (map.current.getLayer('route-outline')) {
              map.current.moveLayer('route-outline');
            }
            if (map.current.getLayer('route-line')) {
              map.current.moveLayer('route-line');
            }
            if (index === 0) {
              console.log('[ROUTE-NAV-STATE] ✅ Route layers moved to top');
            }
          } catch (e) {
            // Layers might already be on top
          }
        }, delay);
      });
    }
  }, [isNavigating, isLoaded, currentRoute, ensureRouteLayers, renderRouteLayers]);

  // CRITICAL: Track route changes (alternative routes, reroutes) and force re-render
  // This ensures the blue line updates when user selects a different route
  const previousRouteIdRef = useRef<string | number | null>(null);
  const previousRoutePathLengthRef = useRef<number>(0);
  
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    if (!currentRoute?.routePath) {
      // HEALTH & SAFETY: During navigation, keep previous route ID to detect reroute completion
      if (!isNavigating) {
        previousRouteIdRef.current = null;
        previousRoutePathLengthRef.current = 0;
      }
      return;
    }
    
    // HEALTH & SAFETY: Immediately cache new route for persistent navigation
    if (currentRoute.routePath.length >= 2) {
      persistentNavRouteRef.current = [...currentRoute.routePath];
      console.log('[ROUTE-CHANGE] ✅ Updated persistent navigation cache with', currentRoute.routePath.length, 'coordinates');
    }
    
    const currentRouteId = currentRoute.id || null;
    const currentPathLength = currentRoute.routePath.length;
    
    // Detect route change: different ID or significantly different path length
    const isRouteChanged = (
      previousRouteIdRef.current !== currentRouteId ||
      Math.abs(previousRoutePathLengthRef.current - currentPathLength) > 10
    );
    
    if (isRouteChanged && map.current.isStyleLoaded()) {
      console.log('[ROUTE-CHANGE] Route changed detected - updating route seamlessly');
      console.log(`[ROUTE-CHANGE] Previous ID: ${previousRouteIdRef.current}, New ID: ${currentRouteId}`);
      console.log(`[ROUTE-CHANGE] Previous length: ${previousRoutePathLengthRef.current}, New length: ${currentPathLength}`);
      
      // Update refs immediately
      previousRouteIdRef.current = currentRouteId;
      previousRoutePathLengthRef.current = currentPathLength;
      
      // Clear cached data to force fresh render
      cachedRouteGeoJsonRef.current = null;
      
      // CRITICAL FIX: Update route data seamlessly without removing layers (prevents flickering)
      // Try to update the source data directly first, only remove/re-add if source doesn't exist
      const updateRouteData = () => {
        if (!map.current || !map.current.isStyleLoaded() || !currentRoute?.routePath) return;
        
        // Validate coordinates
        const validCoords = currentRoute.routePath
          .filter(coord => coord && 
            typeof coord.lng === 'number' && !isNaN(coord.lng) && isFinite(coord.lng) &&
            typeof coord.lat === 'number' && !isNaN(coord.lat) && isFinite(coord.lat))
          .map(coord => [coord.lng, coord.lat]);
        
        if (validCoords.length < 2) {
          console.warn('[ROUTE-CHANGE] Insufficient valid coordinates');
          return;
        }
        
        const geoJsonData = {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: validCoords
          }
        };
        
        const routeSource = map.current.getSource('route') as maplibregl.GeoJSONSource;
        
        if (routeSource) {
          // Source exists - just update the data (no flicker!)
          console.log('[ROUTE-CHANGE] Updating existing route source data');
          routeSource.setData(geoJsonData);
          cachedRouteGeoJsonRef.current = geoJsonData;
          
          // Ensure layers are on top
          try {
            if (map.current.getLayer('route-outline')) {
              map.current.moveLayer('route-outline');
            }
            if (map.current.getLayer('route-line')) {
              map.current.moveLayer('route-line');
            }
            // TRAFFIC FIX: Always move traffic overlay above route line
            if (map.current.getLayer('route-traffic-overlay-layer')) {
              map.current.moveLayer('route-traffic-overlay-layer');
            }
          } catch (e) {
            // Ignore
          }
        } else {
          // Source doesn't exist - use full render
          console.log('[ROUTE-CHANGE] No existing source - full render');
          renderRouteLayers();
        }
      };
      
      // Immediate update
      updateRouteData();
      
      // Backup render attempt after short delay
      setTimeout(() => {
        if (map.current && map.current.isStyleLoaded()) {
          updateRouteData();
        }
      }, 100);
    } else if (!isRouteChanged) {
      // Same route - just update refs
      previousRouteIdRef.current = currentRouteId;
      previousRoutePathLengthRef.current = currentPathLength;
    }
  }, [currentRoute, isLoaded, removeRouteLayers, renderRouteLayers]);

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
            ['==', ['typeof', ['get', 'speed_ratio']], 'number'],
            [
              'case',
              ['<', ['get', 'speed_ratio'], 0.3], '#DC2626', // Red: heavy traffic/congestion
              ['<', ['get', 'speed_ratio'], 0.6], '#F59E0B', // Orange: moderate traffic
              ['<', ['get', 'speed_ratio'], 0.8], '#FDE047', // Yellow: light traffic
              '#22C55E' // Green: free flow
            ],
            '#22C55E' // Default to green if speed_ratio is missing/invalid
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 3,  // 3px at zoom 10
            18, 10   // 10px at zoom 18
          ],
          'line-opacity': 0.85,
          'line-blur': 0.5
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

  // LAYER 2: Route Traffic Overlay - Colored segments on top of blue route line
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    if (!map.current.isStyleLoaded()) return;
    
    const mapInstance = map.current;
    const trafficSourceId = 'route-traffic-overlay-source';
    const trafficLayerId = 'route-traffic-overlay-layer';
    
    // If no traffic data, remove traffic overlay
    // FIXED: No longer requires isNavigating - show traffic during route preview too
    if (!routeTrafficData.segments || routeTrafficData.segments.length === 0) {
      if (mapInstance.getLayer(trafficLayerId)) {
        mapInstance.removeLayer(trafficLayerId);
      }
      if (mapInstance.getSource(trafficSourceId)) {
        mapInstance.removeSource(trafficSourceId);
      }
      return;
    }
    
    // Build GeoJSON features for each traffic segment
    // Filter out 'unknown' segments - they should be transparent to show blue route underneath
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = routeTrafficData.segments
      .filter((segment) => segment.flowLevel !== 'unknown') // Skip unknown - let blue route show through
      .map((segment, index) => ({
        type: 'Feature' as const,
        properties: {
          segmentIndex: index,
          speedRatio: segment.speedRatio,
          flowLevel: segment.flowLevel,
          color: segment.color,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: segment.coordinates,
        },
      }));
    
    const geojsonData: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features,
    };
    
    // Add or update source
    if (mapInstance.getSource(trafficSourceId)) {
      (mapInstance.getSource(trafficSourceId) as maplibregl.GeoJSONSource).setData(geojsonData);
    } else {
      mapInstance.addSource(trafficSourceId, {
        type: 'geojson',
        data: geojsonData,
      });
    }
    
    // Add layer if it doesn't exist
    if (!mapInstance.getLayer(trafficLayerId)) {
      mapInstance.addLayer({
        id: trafficLayerId,
        type: 'line',
        source: trafficSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 6,
            12, 14,
            16, 20,
            20, 28
          ],
          'line-opacity': 0.85,
        },
      });
      
      // Move route traffic overlay above the blue route line
      if (mapInstance.getLayer('route-line')) {
        mapInstance.moveLayer(trafficLayerId);
      }
    }
    
    console.log(`[ROUTE-TRAFFIC-OVERLAY] ✅ Rendered ${features.length} traffic segments on route`);
  }, [isLoaded, routeTrafficData.segments, routeTrafficData.lastUpdated]);

  // LAYER 3: Route Incident Markers - Icons along the route line
  useEffect(() => {
    if (!map.current || !isLoaded) {
      routeIncidentMarkersRef.current.forEach(marker => marker.remove());
      routeIncidentMarkersRef.current = [];
      return;
    }
    if (!map.current.isStyleLoaded()) return;
    
    const mapInstance = map.current;
    
    // Clean up existing route incident markers
    routeIncidentMarkersRef.current.forEach(marker => marker.remove());
    routeIncidentMarkersRef.current = [];
    
    // If no route incidents, skip (FIXED: no longer requires isNavigating)
    if (!routeIncidentsData.incidents || routeIncidentsData.incidents.length === 0) {
      return;
    }
    
    // Create markers for each route incident
    routeIncidentsData.incidents.forEach((incident: RouteIncident) => {
      const iconConfig = getIncidentIcon(incident.type);
      const size = incident.severity === 'critical' ? 36 : incident.severity === 'high' ? 32 : incident.severity === 'medium' ? 28 : 24;
      
      // Create HTML element for marker
      const el = document.createElement('div');
      el.className = 'route-incident-marker';
      el.setAttribute('data-testid', `route-incident-marker-${incident.id}`);
      el.style.cursor = 'pointer';
      el.style.zIndex = '1000';
      el.innerHTML = `
        <div style="
          width: ${size}px; 
          height: ${size}px; 
          background: ${iconConfig.bgColor}; 
          border: 3px solid ${iconConfig.color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 8px rgba(0,0,0,0.4);
          font-size: ${size * 0.55}px;
          position: relative;
          animation: pulse-incident 2s infinite;
        ">
          ${iconConfig.emoji}
          ${incident.severity === 'critical' || incident.severity === 'high' ? `<div style="position: absolute; top: -4px; right: -4px; width: 10px; height: 10px; background: #DC2626; border-radius: 50%; border: 2px solid white;"></div>` : ''}
        </div>
      `;
      
      // Create popup content
      const severityBadgeColor = 
        incident.severity === 'critical' ? '#7F1D1D' :
        incident.severity === 'high' ? '#DC2626' : 
        incident.severity === 'medium' ? '#F59E0B' : 
        '#64748B';
      
      const sourceLabel = incident.source === 'tomtom' ? '🛰️ Verified' : '👥 Reported';
      
      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
            <span style="
              background: ${severityBadgeColor}; 
              color: white; 
              padding: 2px 8px; 
              border-radius: 4px; 
              font-size: 11px;
              font-weight: 600;
            ">
              ${incident.severity.toUpperCase()}
            </span>
            <span style="
              background: ${incident.source === 'tomtom' ? '#0284C7' : '#7C3AED'}; 
              color: white; 
              padding: 2px 8px; 
              border-radius: 4px; 
              font-size: 11px;
            ">
              ${sourceLabel}
            </span>
          </div>
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
            ${iconConfig.label}
          </div>
          ${incident.description ? `<div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">${incident.description}</div>` : ''}
          ${incident.roadName ? `<div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">📍 ${incident.roadName}</div>` : ''}
          ${incident.delay ? `<div style="font-size: 12px; color: #DC2626; margin-bottom: 4px;">⏱️ ${Math.round(incident.delay / 60)} min delay</div>` : ''}
          <div style="font-size: 11px; color: #9CA3AF; margin-top: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB;">
            Reported ${formatTimeAgo(incident.reportedAt)}
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
      
      routeIncidentMarkersRef.current.push(marker);
    });
    
    console.log(`[ROUTE-INCIDENTS] ✅ Rendered ${routeIncidentsData.incidents.length} incident markers along route`);
  }, [isLoaded, isNavigating, routeIncidentsData.incidents, routeIncidentsData.lastUpdated]);

  // Render incident markers (general - when not navigating)
  useEffect(() => {
    if (!map.current || !isLoaded || !showIncidents) {
      incidentMarkersRef.current.forEach(marker => marker.remove());
      incidentMarkersRef.current = [];
      return;
    }
    if (!map.current.isStyleLoaded()) return;
    
    // During navigation, always use route-specific incidents (Layer 3) - suppress general markers
    if (isNavigating) {
      incidentMarkersRef.current.forEach(marker => marker.remove());
      incidentMarkersRef.current = [];
      return;
    }

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
    
    // INITIAL 3D NAVIGATION VIEW: Set up TomTom GO style immediately when navigation starts
    // This ensures tilted view activates even before GPS updates arrive
    const setupInitialNavigationView = () => {
      if (!currentRoute?.routePath || currentRoute.routePath.length < 2) {
        console.log('[3D-NAV] No route path available for initial view');
        return;
      }
      
      const path = currentRoute.routePath;
      const startPoint = path[0];
      const secondPoint = path[1];
      
      // Calculate initial bearing from route direction
      const dLon = (secondPoint.lng - startPoint.lng) * Math.PI / 180;
      const y = Math.sin(dLon) * Math.cos(secondPoint.lat * Math.PI / 180);
      const x = Math.cos(startPoint.lat * Math.PI / 180) * Math.sin(secondPoint.lat * Math.PI / 180) -
                Math.sin(startPoint.lat * Math.PI / 180) * Math.cos(secondPoint.lat * Math.PI / 180) * Math.cos(dLon);
      const initialBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      
      // Use GPS position if available, otherwise use route start
      const centerLat = gpsPosition?.latitude ?? startPoint.lat;
      const centerLng = gpsPosition?.longitude ?? startPoint.lng;
      const useBearing = gpsPosition?.heading ?? initialBearing;
      
      const containerHeight = mapInstance.getContainer().clientHeight || 800;
      
      // BULLETPROOF: Validate coordinates before calling easeTo
      if (!isValidCoord(centerLat) || !isValidCoord(centerLng) || !isValidCoord(useBearing)) {
        console.warn('[3D-NAV] Invalid coordinates for initial view - skipping:', { centerLat, centerLng, useBearing });
        return;
      }
      
      console.log('[3D-NAV] ==========================================');
      console.log('[3D-NAV] 🚀 INITIAL 3D NAVIGATION VIEW ACTIVATED');
      console.log(`[3D-NAV] Center: ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`);
      console.log(`[3D-NAV] Initial bearing: ${useBearing.toFixed(1)}°`);
      console.log(`[3D-NAV] Pitch: 60° (TomTom GO style)`);
      console.log(`[3D-NAV] Top padding: ${Math.round(containerHeight * 0.55)}px`);
      console.log('[3D-NAV] ==========================================');
      
      // Reset user's preferred zoom to default when navigation starts
      userPreferredZoomRef.current = 16.5;
      
      // Apply TomTom GO style 3D navigation view
      try {
        mapInstance.easeTo({
          center: [centerLng, centerLat],
          zoom: userPreferredZoomRef.current, // Street-level zoom for navigation
          pitch: 60, // TomTom GO style steep 3D tilt
          bearing: useBearing, // Heading-up rotation
          padding: {
            top: Math.round(containerHeight * 0.55), // Push vehicle to lower 45% of screen
            bottom: 80, // Space for speedometer
            left: 0,
            right: 0
          },
          duration: 1200,
          easing: (t) => 1 - Math.pow(1 - t, 3), // Ease-out cubic
          essential: true
        });
      } catch (e) {
        console.warn('[3D-NAV] easeTo failed:', e);
      }
      
      lastBearing = useBearing;
      initialNavViewSetupRef.current = true; // Mark as set up
    };
    
    // Run initial setup ONCE per navigation session
    if (!initialNavViewSetupRef.current) {
      setupInitialNavigationView();
    }
    
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
            // BULLETPROOF: Validate coordinates before calling easeTo
            if (!isValidCoord(latitude) || !isValidCoord(longitude) || !isValidCoord(bearing)) {
              console.warn('[GPS-HEADING] Invalid coordinates - skipping easeTo:', { latitude, longitude, bearing });
              return;
            }
            
            // TomTom GO style navigation view:
            // - Vehicle marker at bottom 45% of screen (centered above speedometer)
            // - Route line extends straight up toward horizon
            // - Steep 60° 3D perspective for immersive driving feel
            const containerHeight = mapInstance.getContainer().clientHeight || 800;
            
            try {
              const easeToOptions: maplibregl.EaseToOptions = {
                center: [longitude, latitude],
                pitch: 60, // TomTom GO style steep 3D tilt
                bearing: bearing, // CRITICAL: Rotate map so GPS heading points up (route appears vertical)
                padding: { 
                  // CRITICAL: Large top padding pushes vehicle marker to bottom of screen
                  // This makes the route line extend upward from the speedometer area
                  top: Math.round(containerHeight * 0.55), // Push vehicle to lower 45% of screen
                  bottom: 80, // Space for speedometer
                  left: 0, 
                  right: 0 
                },
                duration: 200, // Short duration for responsive feel
                easing: (t) => t, // Linear easing prevents acceleration artifacts during rotation
                essential: true // Ensure animation isn't interrupted by user gestures
              };
              
              // Only set zoom if no button-triggered zoom animation is in progress
              if (!zoomAnimationInProgressRef.current) {
                easeToOptions.zoom = userPreferredZoomRef.current;
              }
              
              mapInstance.easeTo(easeToOptions);
            } catch (e) {
              console.warn('[GPS-HEADING] easeTo failed:', e);
            }
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
    
    // Cleanup animation frame on unmount or when navigation stops
    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        console.log('[GPS-HEADING] ✓ GPS heading rotation stopped');
      }
      // Reset initial view flag when navigation ends so next session sets it up fresh
      initialNavViewSetupRef.current = false;
    };
  }, [isNavigating, isLoaded, gpsPosition, currentRoute]);

  // Listen for auto-zoom to GPS position event
  useEffect(() => {
    const handleAutoZoom = (event: CustomEvent) => {
      if (!map.current) return;

      const { position } = event.detail;

      // Fly to GPS position with street-level view - validate coordinates first
      if (!isValidCoord(position.lng) || !isValidCoord(position.lat)) {
        console.warn('[AUTO-ZOOM] Invalid GPS position - skipping flyTo:', position);
        return;
      }
      
      try {
        map.current.flyTo({
          center: [position.lng, position.lat],
          zoom: position.zoom || 17.5,
          pitch: position.pitch || 45,
          bearing: position.bearing || 0,
          duration: 2000,
          essential: true
        });
      } catch (e) {
        console.warn('[AUTO-ZOOM] flyTo failed:', e);
      }
    };

    window.addEventListener('auto_zoom_gps', handleAutoZoom as EventListener);
    
    return () => {
      window.removeEventListener('auto_zoom_gps', handleAutoZoom as EventListener);
    };
  }, []);

  const handleZoomIn = () => {
    if (map.current) {
      const currentZoom = map.current.getZoom();
      map.current.easeTo({ zoom: Math.min(currentZoom + 4, 20), duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (map.current) {
      const currentZoom = map.current.getZoom();
      map.current.easeTo({ zoom: Math.max(currentZoom - 4, 1), duration: 300 });
    }
  };
  
  // Staggered zoom for navigation mode - x2 zoom levels per press with smooth animation
  // Each press = 2 zoom levels, max 5 presses = 10 levels total
  const staggeredZoomInProgressRef = useRef<boolean>(false);
  
  const handleStaggeredZoomIn = useCallback(() => {
    if (!map.current || staggeredZoomInProgressRef.current) return;
    staggeredZoomInProgressRef.current = true;
    zoomAnimationInProgressRef.current = true;
    
    const totalLevels = 2; // x2 zoom per press
    const stepDelay = 80; // ms between each step
    const maxZoom = 20;
    let currentStep = 0;
    
    console.log(`[STAGGERED-ZOOM-IN] Starting x2 staggered zoom animation`);
    
    const animateStep = () => {
      if (!map.current || currentStep >= totalLevels) {
        // Sync the refs so GPS tracking loop uses the new zoom level
        if (map.current) {
          const finalZoom = map.current.getZoom();
          userPreferredZoomRef.current = finalZoom;
          currentZoomRef.current = finalZoom;
          console.log(`[STAGGERED-ZOOM-IN] Synced userPreferredZoomRef to ${finalZoom}`);
        }
        staggeredZoomInProgressRef.current = false;
        setTimeout(() => { zoomAnimationInProgressRef.current = false; }, 250);
        console.log(`[STAGGERED-ZOOM-IN] Complete at step ${currentStep}`);
        return;
      }
      
      const currentZoom = map.current.getZoom();
      if (currentZoom >= maxZoom) {
        // Sync the refs so GPS tracking loop uses the new zoom level
        userPreferredZoomRef.current = maxZoom;
        currentZoomRef.current = maxZoom;
        console.log(`[STAGGERED-ZOOM-IN] Synced userPreferredZoomRef to ${maxZoom} (max)`);
        staggeredZoomInProgressRef.current = false;
        setTimeout(() => { zoomAnimationInProgressRef.current = false; }, 250);
        console.log(`[STAGGERED-ZOOM-IN] Hit max zoom (${maxZoom})`);
        return;
      }
      
      map.current.easeTo({ zoom: Math.min(currentZoom + 1, maxZoom), duration: 70 });
      currentStep++;
      setTimeout(animateStep, stepDelay);
    };
    
    animateStep();
  }, []);
  
  const handleStaggeredZoomOut = useCallback(() => {
    if (!map.current || staggeredZoomInProgressRef.current) return;
    staggeredZoomInProgressRef.current = true;
    zoomAnimationInProgressRef.current = true;
    
    const totalLevels = 2; // x2 zoom per press
    const stepDelay = 80; // ms between each step
    const minZoom = 1;
    let currentStep = 0;
    
    console.log(`[STAGGERED-ZOOM-OUT] Starting x2 staggered zoom animation`);
    
    const animateStep = () => {
      if (!map.current || currentStep >= totalLevels) {
        // Sync the refs so GPS tracking loop uses the new zoom level
        if (map.current) {
          const finalZoom = map.current.getZoom();
          userPreferredZoomRef.current = finalZoom;
          currentZoomRef.current = finalZoom;
          console.log(`[STAGGERED-ZOOM-OUT] Synced userPreferredZoomRef to ${finalZoom}`);
        }
        staggeredZoomInProgressRef.current = false;
        setTimeout(() => { zoomAnimationInProgressRef.current = false; }, 250);
        console.log(`[STAGGERED-ZOOM-OUT] Complete at step ${currentStep}`);
        return;
      }
      
      const currentZoom = map.current.getZoom();
      if (currentZoom <= minZoom) {
        // Sync the refs so GPS tracking loop uses the new zoom level
        userPreferredZoomRef.current = minZoom;
        currentZoomRef.current = minZoom;
        console.log(`[STAGGERED-ZOOM-OUT] Synced userPreferredZoomRef to ${minZoom} (min)`);
        staggeredZoomInProgressRef.current = false;
        setTimeout(() => { zoomAnimationInProgressRef.current = false; }, 250);
        console.log(`[STAGGERED-ZOOM-OUT] Hit min zoom (${minZoom})`);
        return;
      }
      
      map.current.easeTo({ zoom: Math.max(currentZoom - 1, minZoom), duration: 70 });
      currentStep++;
      setTimeout(animateStep, stepDelay);
    };
    
    animateStep();
  }, []);

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
            const routeCoordinates = filterValidRouteCoords(currentRoute.routePath);
            if (routeCoordinates.length >= 2) {
              const bounds = new maplibregl.LngLatBounds();
              if (safeExtendBounds(bounds, routeCoordinates)) {
                map.current?.fitBounds(bounds, { padding: 50, duration: 400 });
              }
            }
          }
          // Don't use any hardcoded default position - just stay where we are
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
      );
    } else {
      // Geolocation not available, fallback to route only
      if (currentRoute?.routePath) {
        const routeCoordinates = filterValidRouteCoords(currentRoute.routePath);
        if (routeCoordinates.length >= 2) {
          const bounds = new maplibregl.LngLatBounds();
          if (safeExtendBounds(bounds, routeCoordinates)) {
            map.current.fitBounds(bounds, { padding: 50, duration: 400 });
          }
        }
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

  // Toggle 3D buildings visibility based on is3DMode state
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    if (!map.current.isStyleLoaded()) return;
    
    const mapInstance = map.current;
    const buildingLayerId = '3d-buildings';
    
    // Only show 3D buildings when in 3D mode AND at zoom level 14+
    const currentZoom = mapInstance.getZoom();
    const shouldShow = is3DMode && currentZoom >= 14;
    
    if (mapInstance.getLayer(buildingLayerId)) {
      mapInstance.setLayoutProperty(
        buildingLayerId, 
        'visibility', 
        shouldShow ? 'visible' : 'none'
      );
      console.log(`[3D-BUILDINGS] Visibility set to: ${shouldShow ? 'visible' : 'none'} (3D mode: ${is3DMode}, zoom: ${currentZoom.toFixed(1)})`);
    }
  }, [is3DMode, isLoaded, currentZoom]);

  const handleCompassClick = () => {
    if (!map.current) return;
    map.current.easeTo({ bearing: 0, pitch: 0, duration: 500 });
  };

  // CRITICAL FIX: Keep native route layers ALWAYS visible during navigation
  // The StaticRouteOverlay is an enhancement, not a replacement - route visibility must be bulletproof
  // Previously hiding native layers when useStaticRoute=true caused route to disappear if overlay failed
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    const mapInstance = map.current;
    
    const setRouteVisibility = () => {
      if (!mapInstance.isStyleLoaded()) return;
      
      // SAFETY: During navigation (isNavigating=true), ALWAYS keep route visible
      // Only hide native layers if NOT navigating AND useStaticRoute is true (preview mode optimization)
      const visibility = (isNavigating || !useStaticRoute) ? 'visible' : 'none';
      
      // All possible route layer IDs
      const routeLayerIds = [
        'route-line',
        'route-outline',
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
        // Silently handle visibility toggle errors - layers may not exist yet
      }
    };
    
    setRouteVisibility();
    mapInstance.on('styledata', setRouteVisibility);
    mapInstance.on('load', setRouteVisibility);
    
    return () => {
      mapInstance.off('styledata', setRouteVisibility);
      mapInstance.off('load', setRouteVisibility);
    };
  }, [useStaticRoute, isLoaded, isNavigating]);

  // Prepare route coordinates for static overlay - with validation (keeping lat/lng object format)
  // CRITICAL: Use persistent cache during navigation to prevent route disappearing
  const routeSourceForOverlay = currentRoute?.routePath || (isNavigating ? persistentNavRouteRef.current : null);
  const routeCoordinatesForOverlay = routeSourceForOverlay 
    ? routeSourceForOverlay.filter(coord => 
        coord && 
        typeof coord.lat === 'number' && !isNaN(coord.lat) && isFinite(coord.lat) &&
        typeof coord.lng === 'number' && !isNaN(coord.lng) && isFinite(coord.lng)
      ) as Array<{ lat: number; lng: number }>
    : [];

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
      
      {/* Traffic Status Indicator - Shows when route has traffic data */}
      {showTraffic && hasValidRoute && (
        <div 
          className="absolute top-4 right-4 z-40 pointer-events-auto"
          data-testid="traffic-status-indicator"
        >
          <TrafficStatusIndicator
            status={
              routeTrafficData.isLoading ? 'loading' :
              routeTrafficData.error ? 'error' :
              routeTrafficData.segments.length > 0 ? 'available' : 'unavailable'
            }
            segmentCount={routeTrafficData.segments.length}
            unknownSegmentCount={routeTrafficData.segments.filter(s => s.flowLevel === 'unknown').length}
            lastUpdated={routeTrafficData.lastUpdated}
            compact={false}
          />
        </div>
      )}
      
      {/* Traffic Legend - Shows when traffic overlay is active with data */}
      {showTraffic && hasValidRoute && routeTrafficData.segments.length > 0 && (
        <div 
          className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto"
          data-testid="traffic-legend"
        >
          <TrafficLegend />
        </div>
      )}
      </div>
    </div>
  );
}));

export { MapLibreMap };
export default MapLibreMap;
