import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Crosshair, Layers, Box, Compass, MapPin } from "lucide-react";
import { type Route, type VehicleProfile, type TrafficIncident } from "@shared/schema";
import { cn } from "@/lib/utils";
import SpeedDisplay from "@/components/map/speed-display";
import { getIncidentIcon } from "@shared/incident-icons";
import { useMapLibreErrorReporting } from "@/hooks/use-map-engine";
import { useGPS } from "@/contexts/gps-context";

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
}

interface MapPreferences {
  mapViewMode: 'roads' | 'satellite';
  zoomLevel: number;
  center: [number, number];
}

const defaultPreferences: MapPreferences = {
  mapViewMode: 'roads',
  zoomLevel: 10,
  center: [-1.5, 52.5],
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

const MapLibreMap = forwardRef<MapLibreMapRef, MapLibreMapProps>(function MapLibreMap({
  currentRoute,
  selectedProfile,
  onMapClick,
  className,
  showTraffic = false,
  showIncidents = false,
  hideControls = false,
  hideCompass = false,
  isNavigating = false
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
  const { reportError } = useMapLibreErrorReporting();
  const resetBearingFailureCountRef = useRef(0);
  const MAX_RESET_BEARING_FAILURES = 3;
  const [isMapLibreValid, setIsMapLibreValid] = useState(true);
  const previousNavigationStateRef = useRef(isNavigating);
  const previousPitchRef = useRef(0);
  const previousBearingRef = useRef(0);
  
  const gps = useGPS();
  const gpsPosition = gps?.position ?? null;
  const gpsStatus = gps?.status ?? 'acquiring';
  const isGPSReady = gpsStatus === 'ready' && !gps?.isUsingCached;
  
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
        zoom = 17.5,
        pitch = 45,
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

      // Zoom helper
      const performZoom = (lat: number, lng: number, bearing: number = 0) => {
        try {
          mapInstance.flyTo({
            center: [lng, lat],
            zoom,
            pitch,
            bearing,
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
      const newPrefs: MapPreferences = { ...preferences, mapViewMode: newMode };
      setPreferences(newPrefs);
      saveMapPreferences(newPrefs);
    },
    getMapViewMode: () => preferences.mapViewMode
  }), [bearing, is3DMode, preferences.mapViewMode]);
  
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

  // Enhanced 3D Navigation Mode: Auto-activate when navigation starts, smooth exit when it ends
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const wasNavigating = previousNavigationStateRef.current;
    const isNowNavigating = isNavigating;

    // Navigation started - activate 3D mode and save previous state
    if (!wasNavigating && isNowNavigating) {
      console.log('[NAV-3D] Navigation started - activating enhanced 3D mode (67° pitch)');
      previousPitchRef.current = map.current.getPitch();
      previousBearingRef.current = map.current.getBearing();
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
      
      if (hideControls || hideCompass) {
        if (navigationControlRef.current) {
          map.current.removeControl(navigationControlRef.current);
          navigationControlRef.current = null;
        }
      } else {
        if (!navigationControlRef.current) {
          navigationControlRef.current = new maplibregl.NavigationControl({
            visualizePitch: true,
            showCompass: true,
            showZoom: false
          });
          map.current.addControl(navigationControlRef.current, 'top-right');
          
          // Reposition the navigation control container above compass button
          setTimeout(() => {
            const navControl = mapContainer.current?.querySelector('.maplibregl-ctrl-top-right');
            if (navControl) {
              (navControl as HTMLElement).style.top = 'auto';
              (navControl as HTMLElement).style.bottom = '320px';
              (navControl as HTMLElement).style.right = '16px';
            }
          }, 100);
        }
      }
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
    
    try {
      if (viewMode === 'roads') {
        mapInstance.setLayoutProperty('roads-2d-layer', 'visibility', is3D ? 'none' : 'visible');
        mapInstance.setLayoutProperty('roads-3d-layer', 'visibility', is3D ? 'visible' : 'none');
        mapInstance.setLayoutProperty('satellite-2d-layer', 'visibility', 'none');
        mapInstance.setLayoutProperty('satellite-3d-layer', 'visibility', 'none');
      } else {
        mapInstance.setLayoutProperty('roads-2d-layer', 'visibility', 'none');
        mapInstance.setLayoutProperty('roads-3d-layer', 'visibility', 'none');
        mapInstance.setLayoutProperty('satellite-2d-layer', 'visibility', is3D ? 'none' : 'visible');
        mapInstance.setLayoutProperty('satellite-3d-layer', 'visibility', is3D ? 'visible' : 'none');
      }
    } catch (error) {
      console.warn('Failed to update layer visibility:', error);
    }
  }, []);

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
          'roads-2d': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 19,
            attribution: '© OpenStreetMap contributors'
          },
          'roads-3d': {
            type: 'raster',
            tiles: ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'],
            tileSize: 256,
            maxzoom: 20,
            attribution: '© Google Maps with 3D Buildings'
          },
          'satellite-2d': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 19,
            attribution: '© Esri, DigitalGlobe, GeoEye'
          },
          'satellite-3d': {
            type: 'raster',
            tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
            tileSize: 256,
            maxzoom: 20,
            attribution: '© Google Satellite with 3D Terrain'
          }
        },
        layers: [
          {
            id: 'roads-2d-layer',
            type: 'raster',
            source: 'roads-2d',
            minzoom: 0,
            maxzoom: 22,
            layout: {
              visibility: preferences.mapViewMode === 'roads' ? 'visible' : 'none'
            }
          },
          {
            id: 'roads-3d-layer',
            type: 'raster',
            source: 'roads-3d',
            minzoom: 0,
            maxzoom: 22,
            layout: {
              visibility: 'none'
            }
          },
          {
            id: 'satellite-2d-layer',
            type: 'raster',
            source: 'satellite-2d',
            minzoom: 0,
            maxzoom: 22,
            layout: {
              visibility: preferences.mapViewMode === 'satellite' ? 'visible' : 'none'
            }
          },
          {
            id: 'satellite-3d-layer',
            type: 'raster',
            source: 'satellite-3d',
            minzoom: 0,
            maxzoom: 22,
            layout: {
              visibility: 'none'
            }
          }
        ]
        },
        center: preferences.center,
        zoom: preferences.zoomLevel,
        pitch: 0,
        bearing: 0,
        minZoom: 3,
        maxZoom: 19,
        minPitch: 0,
        maxPitch: 67,
        attributionControl: false,
        refreshExpiredTiles: false,
        fadeDuration: 100,
        maxTileCacheSize: 500
      });

      if (!hideControls && !hideCompass) {
        navigationControlRef.current = new maplibregl.NavigationControl({
          visualizePitch: true,
          showCompass: true,
          showZoom: false
        });
        map.current.addControl(navigationControlRef.current, 'top-right');
        
        // Reposition the navigation control container above compass button
        setTimeout(() => {
          const navControl = mapContainer.current?.querySelector('.maplibregl-ctrl-top-right');
          if (navControl) {
            (navControl as HTMLElement).style.top = 'auto';
            (navControl as HTMLElement).style.bottom = '320px';
            (navControl as HTMLElement).style.right = '16px';
          }
        }, 100);
      }

      if (onMapClick) {
        map.current.on('click', (e) => {
          onMapClick(e.lngLat.lat, e.lngLat.lng);
        });
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
        setIsLoaded(true);
        console.log('✅ MapLibre GL loaded with persistent tile sources');
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
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !isLoaded) return;
    updateLayerVisibility(map.current, preferences.mapViewMode, currentZoom);
  }, [preferences.mapViewMode, isLoaded, updateLayerVisibility, currentZoom]);

  useEffect(() => {
    if (!map.current || !isLoaded) return;
    if (!map.current.isStyleLoaded()) return;

    // Remove route visualization if currentRoute is null
    if (!currentRoute?.routePath) {
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
      } catch (error) {
        console.warn('Failed to remove route layers:', error);
      }
      return;
    }

    let routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);

    // During navigation, show only remaining route from current GPS position
    if (isNavigating && gpsPosition) {
      const currentPoint = [gpsPosition.longitude, gpsPosition.latitude];
      const routeLine = { type: 'LineString' as const, coordinates: routeCoordinates };
      
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
    }

    if (!map.current.getSource('route')) {
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        }
      });

      // Add route outline for better visibility
      map.current.addLayer({
        id: 'route-outline',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#1e3a8a',
          'line-width': 14,
          'line-opacity': 0.4
        }
      });

      // Main route line with improved visibility
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
          'line-width': 10,
          'line-opacity': 0.95
        }
      });
    } else {
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

    // Only auto-fit bounds when not navigating (during planning)
    if (!isNavigating) {
      const bounds = new maplibregl.LngLatBounds();
      routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
      map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
    }

  }, [currentRoute, isLoaded, isNavigating, gpsPosition]);

  // Traffic-aware route coloring
  useEffect(() => {
    if (!map.current || !isLoaded || !currentRoute?.routePath) return;
    if (!map.current.isStyleLoaded()) return;

    const mapInstance = map.current;
    const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);

    // Wait for traffic layer to be available before querying
    const trafficLayerId = 'traffic-flow-layer';
    
    if (!isTrafficLayerReady) {
      // If traffic layer is not ready, remove traffic route overlay if it exists
      if (mapInstance.getLayer('route-traffic-overlay')) {
        mapInstance.removeLayer('route-traffic-overlay');
      }
      if (mapInstance.getSource('route-traffic')) {
        mapInstance.removeSource('route-traffic');
      }
      return;
    }

    // Sample traffic data along the route
    const sampleTrafficAlongRoute = () => {
      const trafficSegments: Array<{
        coordinates: number[][];
        color: string;
        width: number;
      }> = [];

      // Sample every 10 points or at least 20 samples along the route
      const sampleInterval = Math.max(1, Math.floor(routeCoordinates.length / Math.max(20, routeCoordinates.length / 10)));
      
      for (let i = 0; i < routeCoordinates.length - 1; i += sampleInterval) {
        const start = routeCoordinates[i];
        const end = routeCoordinates[Math.min(i + sampleInterval, routeCoordinates.length - 1)];
        
        // Query traffic features at the midpoint
        const midLng = (start[0] + end[0]) / 2;
        const midLat = (start[1] + end[1]) / 2;
        const point = mapInstance.project([midLng, midLat]);
        
        let speedRatio = 1.0; // Default: free flow
        let color = '#2563eb'; // Blue: free flow/normal
        let width = 6;

        try {
          const features = mapInstance.queryRenderedFeatures(point, {
            layers: [trafficLayerId]
          });

          if (features && features.length > 0) {
            const trafficData = features[0].properties;
            if (trafficData && typeof trafficData.speed_ratio === 'number') {
              speedRatio = trafficData.speed_ratio;
              
              // Apply traffic-based coloring
              if (speedRatio < 0.3) {
                color = '#DC2626'; // Red: heavy traffic
                width = 8; // Thicker for emphasis
              } else if (speedRatio < 0.6) {
                color = '#F59E0B'; // Orange: moderate traffic
                width = 7;
              } else if (speedRatio < 0.8) {
                color = '#FDE047'; // Yellow: light traffic
                width = 6;
              }
              // else: keep default blue for free flow
            }
          }
        } catch (error) {
          // If query fails, keep default color
          console.debug('Traffic query failed for segment, using default color');
        }

        // Create segment coordinates
        const segmentCoords = routeCoordinates.slice(i, Math.min(i + sampleInterval + 1, routeCoordinates.length));
        
        trafficSegments.push({
          coordinates: segmentCoords,
          color,
          width
        });
      }

      // Create GeoJSON feature collection with colored segments
      const features = trafficSegments.map(segment => ({
        type: 'Feature' as const,
        properties: {
          color: segment.color,
          width: segment.width
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: segment.coordinates
        }
      }));

      const trafficRouteData = {
        type: 'FeatureCollection' as const,
        features
      };

      // Add or update traffic-aware route overlay
      if (!mapInstance.getSource('route-traffic')) {
        mapInstance.addSource('route-traffic', {
          type: 'geojson',
          data: trafficRouteData
        });

        mapInstance.addLayer({
          id: 'route-traffic-overlay',
          type: 'line',
          source: 'route-traffic',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'width'],
            'line-opacity': 0.9
          }
        });
      } else {
        const source = mapInstance.getSource('route-traffic') as maplibregl.GeoJSONSource;
        if (source && source.setData) {
          source.setData(trafficRouteData);
        }
      }
    };

    // Initial sampling
    sampleTrafficAlongRoute();

    // Re-sample when map moves/zooms (traffic tiles might load)
    const handleMapMove = () => {
      if (mapInstance.isStyleLoaded()) {
        sampleTrafficAlongRoute();
      }
    };

    mapInstance.on('moveend', handleMapMove);

    // Auto-refresh traffic route coloring every 2 minutes
    const refreshInterval = setInterval(() => {
      if (mapInstance.isStyleLoaded()) {
        sampleTrafficAlongRoute();
      }
    }, 2 * 60 * 1000);

    return () => {
      mapInstance.off('moveend', handleMapMove);
      clearInterval(refreshInterval);
    };
  }, [currentRoute, isLoaded, isTrafficLayerReady]);

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
          visibility: 'visible'
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
            10, 2,  // 2px at zoom 10
            18, 8   // 8px at zoom 18
          ],
          'line-opacity': 0.8
        }
      });
      // Mark layer as ready after adding
      setIsTrafficLayerReady(true);
    } else {
      // Update visibility if layer exists
      map.current.setLayoutProperty(trafficLayerId, 'visibility', 'visible');
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
  }, [isLoaded, showTraffic]);

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

  // GPS tracking and user position marker (using centralized GPS hook)
  // CRITICAL: GPS marker must ALWAYS be visible on any map scenario
  useEffect(() => {
    console.log('[GPS-MARKER] Effect triggered - map:', !!map.current, 'isLoaded:', isLoaded, 'status:', gpsStatus, 'hasPosition:', !!gpsPosition);
    
    if (!map.current || !isLoaded) {
      console.log('[GPS-MARKER] Skipping - map or isLoaded not ready');
      return;
    }

    const mapInstance = map.current;
    
    // CRITICAL: Only show GPS marker when we have actual fresh GPS, not cached
    const hasGPS = isGPSReady && !!gpsPosition;
    
    // Show orange marker when GPS is acquiring or unavailable
    if (!hasGPS) {
      console.log('[GPS-MARKER] GPS not ready - status:', gpsStatus, '- showing orange unavailable marker');
      
      // Show orange GPS-unavailable marker at last known position or default
      const lastKnown = getLastKnownPosition();
      if (lastKnown || !userMarkerRef.current) {
        const fallbackLat = lastKnown?.lat ?? 51.5074;
        const fallbackLng = lastKnown?.lng ?? -0.1278;
        
        if (!userMarkerRef.current) {
          // Create orange unavailable GPS marker
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
            anchor: 'center'
          })
            .setLngLat([fallbackLng, fallbackLat])
            .addTo(mapInstance);
        }
        return;
      }
      
      if (userMarkerRef.current && !lastKnown) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }
    
    const latitude = gpsPosition.latitude;
    const longitude = gpsPosition.longitude;
    const smoothedHeading = gpsPosition?.smoothedHeading ?? null;
    const accuracy = gpsPosition?.accuracy ?? null;
    
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
      
      // Create premium vehicle marker with excellence-grade design
      const el = document.createElement('div');
      el.className = 'user-position-marker';
      el.innerHTML = `
        <div style="
          position: relative;
          width: ${markerSize}px;
          height: ${markerSize}px;
        ">
          <!-- Outer glow effect -->
          <div style="
            position: absolute;
            inset: -12px;
            border-radius: 50%;
            background: radial-gradient(circle, ${accuracyGlow} 0%, transparent 70%);
            animation: glow-pulse 3s ease-in-out infinite;
          "></div>
          
          <!-- Accuracy ring with gradient -->
          <div style="
            position: absolute;
            inset: -6px;
            border-radius: 50%;
            border: 3px solid ${accuracyColor};
            opacity: 0.6;
            animation: accuracy-pulse 2s ease-in-out infinite;
            box-shadow: 0 0 20px ${accuracyGlow};
          "></div>
          
          <!-- Secondary pulse ring -->
          <div style="
            position: absolute;
            inset: -2px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.3);
            animation: secondary-pulse 2.5s ease-in-out infinite 0.3s;
          "></div>
          
          <!-- Main marker with premium gradient and thicker borders -->
          <div style="
            width: ${markerSize}px;
            height: ${markerSize}px;
            background: ${markerBg};
            border: ${borderWidth}px solid white;
            border-radius: 50%;
            box-shadow: 
              0 0 0 3px ${accuracyGlow},
              0 12px 36px ${accuracyGlow}, 
              0 6px 20px rgba(0, 0, 0, 0.8),
              inset 0 3px 6px rgba(255, 255, 255, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            animation: marker-pulse 2.8s ease-in-out infinite;
            z-index: 1000;
          ">
            ${vehicleIcon}
            ${hasGPS ? directionChevron : ''}
          </div>
        </div>
        <style>
          @keyframes marker-pulse {
            0%, 100% { 
              transform: scale(1);
            }
            50% { 
              transform: scale(1.06);
            }
          }
          @keyframes accuracy-pulse {
            0%, 100% { 
              transform: scale(1);
              opacity: 0.6;
            }
            50% { 
              transform: scale(1.12);
              opacity: 0.9;
            }
          }
          @keyframes secondary-pulse {
            0%, 100% { 
              transform: scale(1);
              opacity: 0.3;
            }
            50% { 
              transform: scale(1.08);
              opacity: 0.6;
            }
          }
          @keyframes glow-pulse {
            0%, 100% { 
              opacity: 0.4;
              transform: scale(1);
            }
            50% { 
              opacity: 0.7;
              transform: scale(1.15);
            }
          }
        </style>
      `;

      userMarkerRef.current = new maplibregl.Marker({
        element: el,
        rotation: bearing,
        rotationAlignment: 'map',
        anchor: 'center'
      })
        .setLngLat([longitude, latitude])
        .addTo(mapInstance);
      
      // CRITICAL: Force marker to appear above all other elements
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        if (el.parentElement) {
          el.parentElement.style.zIndex = '9999';
          el.parentElement.style.pointerEvents = 'none';
          console.log('[GPS-MARKER] Z-index applied to parent element');
        } else {
          console.warn('[GPS-MARKER] Parent element not found for z-index');
        }
      }, 0);
      
      console.log('[GPS-MARKER] ✅ New marker added to map at:', [longitude, latitude]);
    } else {
      // Update existing marker position and rotation
      userMarkerRef.current.setLngLat([longitude, latitude]);
      userMarkerRef.current.setRotation(bearing);
      console.log('[GPS-MARKER] ✅ Marker updated at:', [longitude, latitude]);
    }

    // Cleanup
    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [gpsPosition, gpsStatus, isGPSReady, isLoaded, selectedProfile]); // Include GPS status for proper marker updates
  
  // HEADING-UP NAVIGATION MODE: Continuous map rotation based on GPS heading
  // Separate effect for continuous rotation during navigation
  useEffect(() => {
    if (!map.current || !isLoaded || !isNavigating || !gpsPosition) {
      console.log('[HEADING-UP] Not ready or not navigating');
      return;
    }
    
    const mapInstance = map.current;
    let animationFrame: number | null = null;
    let lastUpdateTime = Date.now();
    let lastBearing = 0;
    
    // Continuous rotation function
    const updateHeadingUp = () => {
      if (!gpsPosition) {
        animationFrame = requestAnimationFrame(updateHeadingUp);
        return;
      }
      
      const now = Date.now();
      const deltaTime = now - lastUpdateTime;
      
      // Update at 30 FPS (every ~33ms) for smoother performance
      if (deltaTime > 33) {
        const latitude = gpsPosition.latitude;
        const longitude = gpsPosition.longitude;
        const bearing = gpsPosition.smoothedHeading ?? gpsPosition.heading ?? lastBearing;
        
        // Store last bearing for fallback
        if (bearing !== 0) {
          lastBearing = bearing;
        }
        
        // Get current map state
        const currentBearing = mapInstance.getBearing();
        const currentCenter = mapInstance.getCenter();
        const centerDelta = Math.sqrt(
          Math.pow(longitude - currentCenter.lng, 2) + 
          Math.pow(latitude - currentCenter.lat, 2)
        );
        
        // Calculate bearing delta with circular interpolation
        let bearingDelta = bearing - currentBearing;
        while (bearingDelta > 180) bearingDelta -= 360;
        while (bearingDelta < -180) bearingDelta += 360;
        
        // Update compass bearing display
        setBearing(bearing);
        
        // Only update if significant change or continuous movement
        // Reduced threshold for smoother rotation
        if (Math.abs(bearingDelta) > 0.3 || centerDelta > 0.000005) {
          mapInstance.easeTo({
            center: [longitude, latitude],
            zoom: 18.5, // Optimal street-level zoom for navigation
            pitch: 67, // Professional 3D perspective
            bearing: bearing, // Rotate map so heading points up (route always points north)
            padding: { 
              top: 280, // Increased space for HUD elements and centering marker above speedometer
              bottom: 120, // Space for speedometer at bottom
              left: 0, 
              right: 0 
            },
            duration: 250, // Faster for more responsive feel
            easing: (t) => t * (2 - t), // Smooth ease-out for better feel
            essential: true
          });
          
          // Debug logging with rate limiting
          if (deltaTime > 1000) { // Log every second max
            console.log('[HEADING-UP] Map rotation - Bearing:', bearing.toFixed(1), 
                       '°, GPS:', latitude.toFixed(6), longitude.toFixed(6));
          }
        }
        
        lastUpdateTime = now;
      }
      
      // Continue animation loop
      animationFrame = requestAnimationFrame(updateHeadingUp);
    };
    
    // Start continuous rotation
    console.log('[HEADING-UP] ✓ Starting continuous rotation for navigation mode');
    console.log('[HEADING-UP] GPS heading will rotate map so route always points upward');
    updateHeadingUp();
    
    // Cleanup animation frame on unmount
    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        console.log('[HEADING-UP] ✓ Stopped continuous rotation');
      }
    };
  }, [isNavigating, isLoaded, gpsPosition]);

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
          // Fallback: center on route or default position
          if (currentRoute?.routePath) {
            const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);
            const bounds = new maplibregl.LngLatBounds();
            routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
            map.current?.fitBounds(bounds, { padding: 50, duration: 1000 });
          } else {
            map.current?.flyTo({ center: preferences.center, zoom: 12, duration: 1000 });
          }
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
      );
    } else {
      // Geolocation not available, fallback to route or default
      if (currentRoute?.routePath) {
        const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);
        const bounds = new maplibregl.LngLatBounds();
        routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
        map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
      } else {
        map.current.flyTo({ center: preferences.center, zoom: 12, duration: 1000 });
      }
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
      console.log('[3D-TOGGLE] 3D mode is auto-managed during navigation (67° pitch, heading-up rotation)');
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

  return (
    <div className={cn("relative w-full h-full", className)} data-testid="maplibre-container">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {!hideControls && (
        <>
          {/* Map Controls - Right Side Stack for Mobile - PERMANENT: Always visible during navigation */}
          <div className={cn(
            "absolute right-3 flex flex-col gap-3 pointer-events-auto safe-area-top",
            isNavigating ? "top-[100px] z-[500]" : "bottom-64 z-[450]"
          )}>
            <Button
              size="icon"
              onClick={toggleMapView}
              className="h-11 w-11 shadow-xl bg-white/95 hover:bg-white text-gray-800 border-2 border-slate-300 backdrop-blur-sm active:scale-95"
              data-testid="button-toggle-view"
              aria-label="Toggle map view"
            >
              <Layers className="h-5 w-5" />
            </Button>
            {!hideCompass && (
              <Button
                size="icon"
                onClick={handleCompassClick}
                className="h-11 w-11 shadow-xl bg-white/95 hover:bg-white text-gray-800 border-2 border-slate-300 transition-all duration-200 backdrop-blur-sm active:scale-95"
                data-testid="button-compass-reset"
                aria-label="Reset bearing to North"
              >
                <Compass 
                  className="h-5 w-5 transition-transform duration-300" 
                  style={{ transform: `rotate(${bearing}deg)` }}
                />
              </Button>
            )}
            <Button
              size="icon"
              onClick={handleRecenter}
              className="h-11 w-11 shadow-xl bg-white/95 hover:bg-white text-gray-800 border-2 border-slate-300 backdrop-blur-sm active:scale-95"
              data-testid="button-recenter"
              aria-label="Recenter map"
            >
              <Crosshair className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              onClick={handleZoomIn}
              className="h-11 w-11 shadow-xl bg-white/95 hover:bg-white text-gray-800 border-2 border-slate-300 backdrop-blur-sm active:scale-95"
              data-testid="button-zoom-in"
              aria-label="Zoom in"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              onClick={handleZoomOut}
              className="h-11 w-11 shadow-xl bg-white/95 hover:bg-white text-gray-800 border-2 border-slate-300 backdrop-blur-sm active:scale-95"
              data-testid="button-zoom-out"
              aria-label="Zoom out"
            >
              <Minus className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              onClick={toggle3DMode}
              className={cn(
                "h-11 w-11 shadow-xl transition-all duration-200 border-2 backdrop-blur-sm active:scale-95",
                is3DMode 
                  ? "bg-blue-500 text-white hover:bg-blue-600 border-blue-600" 
                  : "bg-white/95 hover:bg-white text-gray-800 border-slate-300"
              )}
              data-testid="button-toggle-3d"
              aria-label={is3DMode ? "Switch to 2D view" : "Switch to 3D view"}
            >
              <Box className="h-5 w-5" />
            </Button>
          </div>

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
        </>
      )}
      
      {/* GPS Status Indicator */}
      {(gpsStatus === 'acquiring' || gpsStatus === 'unavailable' || gpsStatus === 'error') && (
        <div 
          className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
          data-testid="gps-status-indicator"
        >
          <div className={cn(
            "px-4 py-2 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2",
            gpsStatus === 'acquiring' && "bg-orange-500/90 text-white",
            gpsStatus === 'unavailable' && "bg-red-500/90 text-white",
            gpsStatus === 'error' && "bg-red-600/90 text-white"
          )}>
            {gpsStatus === 'acquiring' && (
              <>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-medium">Acquiring GPS...</span>
              </>
            )}
            {gpsStatus === 'unavailable' && (
              <>
                <Crosshair className="w-4 h-4" />
                <span className="text-sm font-medium">GPS unavailable</span>
              </>
            )}
            {gpsStatus === 'error' && (
              <>
                <Crosshair className="w-4 h-4" />
                <span className="text-sm font-medium">GPS error</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Cached Position Confirmation */}
      {gps?.cachedPosition && !gps?.position && gps?.cachedPosition.ageInMinutes <= 5 && (
        <div 
          className="absolute top-32 left-1/2 transform -translate-x-1/2 z-50"
          data-testid="cached-position-prompt"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Use last known location?
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  From {gps.cachedPosition.ageDisplay}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => gps.useCachedPosition(true)}
                    size="sm"
                    variant="default"
                    className="text-xs"
                    data-testid="button-use-cached"
                  >
                    Use cached
                  </Button>
                  <Button
                    onClick={() => gps.useCachedPosition(false)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    data-testid="button-wait-gps"
                  >
                    Wait for GPS
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export { MapLibreMap };
export default MapLibreMap;
