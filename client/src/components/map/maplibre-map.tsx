import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Crosshair, Layers, Box, Compass } from "lucide-react";
import { type Route, type VehicleProfile, type TrafficIncident } from "@shared/schema";
import { cn } from "@/lib/utils";
import SpeedDisplay from "@/components/map/speed-display";
import { getIncidentIcon } from "@shared/incident-icons";

export interface MapLibreMapRef {
  getMap: () => maplibregl.Map | null;
  getBearing: () => number;
  resetBearing: () => void;
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
    duration?: number;
    fallbackCoordinates?: { lat: number; lng: number };
    onSuccess?: (location: { lat: number; lng: number }) => void;
    onError?: (error: GeolocationPositionError | Error, usedFallback: boolean) => void;
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
  const gpsWatchIdRef = useRef<number | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number, bearing?: number} | null>(null);
  
  useImperativeHandle(ref, () => ({
    getMap: () => map.current,
    getBearing: () => bearing,
    resetBearing: () => {
      if (map.current) {
        map.current.easeTo({ bearing: 0, pitch: 0, duration: 500 });
      }
    },
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
    zoomToUserLocation: (options = {}) => {
      const {
        forceStreetMode = true,
        zoom = 17.5,
        pitch = 45,
        duration = 2000,
        fallbackCoordinates,
        onSuccess,
        onError
      } = options;

      // Safety check: Map must be loaded and ready
      if (!map.current || !isLoaded) {
        console.error('[GPS-ZOOM] Map not ready for GPS zoom');
        if (onError) {
          onError(new Error('Map not ready') as any, false);
        }
        return;
      }

      const mapInstance = map.current;

      // Force street/roads mode if requested (better visibility for navigation)
      if (forceStreetMode && preferences.mapViewMode !== 'roads') {
        const newPrefs = { ...preferences, mapViewMode: 'roads' as const };
        setPreferences(newPrefs);
        saveMapPreferences(newPrefs);
      }

      // Helper: Zoom to coordinates with flyTo animation
      const performZoom = (lat: number, lng: number, bearing: number = 0) => {
        try {
          mapInstance.flyTo({
            center: [lng, lat],
            zoom: zoom,
            pitch: pitch,
            bearing: bearing,
            duration: duration,
            essential: true // Animation won't be interrupted by user
          });
        } catch (err) {
          console.error('[GPS-ZOOM] Error during flyTo animation:', err);
        }
      };

      // Check if geolocation is supported
      if (!('geolocation' in navigator)) {
        console.warn('[GPS-ZOOM] Geolocation not supported by browser');
        
        // Use fallback if provided
        if (fallbackCoordinates) {
          console.log('[GPS-ZOOM] Using fallback coordinates:', fallbackCoordinates);
          performZoom(fallbackCoordinates.lat, fallbackCoordinates.lng);
          if (onSuccess) {
            onSuccess(fallbackCoordinates);
          }
        } else if (onError) {
          onError(new Error('Geolocation not supported') as any, false);
        }
        return;
      }

      // Attempt GPS acquisition with retry on timeout
      let retryAttempt = 0;
      const maxRetries = 1; // One retry for timeout cases

      const attemptGPSAcquisition = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // SUCCESS: GPS lock acquired
            const { latitude, longitude, heading, accuracy } = position.coords;
            const userBearing = heading !== null ? heading : 0;

            console.log(`[GPS-ZOOM] ✓ GPS lock acquired (accuracy: ${accuracy.toFixed(1)}m, bearing: ${userBearing.toFixed(0)}°)`);

            // Zoom to user's exact position
            performZoom(latitude, longitude, userBearing);

            // Success callback
            if (onSuccess) {
              onSuccess({ lat: latitude, lng: longitude });
            }
          },
          (error) => {
            // ERROR: GPS acquisition failed
            console.warn(`[GPS-ZOOM] GPS error (code ${error.code}): ${error.message}`);

            // Handle specific error cases
            if (error.code === GeolocationPositionError.TIMEOUT && retryAttempt < maxRetries) {
              // TIMEOUT: Retry once
              retryAttempt++;
              console.log(`[GPS-ZOOM] Retrying GPS acquisition (attempt ${retryAttempt + 1}/${maxRetries + 1})...`);
              setTimeout(attemptGPSAcquisition, 500); // Small delay before retry
              return;
            }

            // Use fallback coordinates if GPS completely failed
            if (fallbackCoordinates) {
              console.log('[GPS-ZOOM] GPS unavailable, using fallback coordinates:', fallbackCoordinates);
              performZoom(fallbackCoordinates.lat, fallbackCoordinates.lng);
              
              if (onError) {
                // Notify with error but indicate fallback was used
                onError(error, true);
              }
            } else {
              // No fallback available - just report error
              if (onError) {
                onError(error, false);
              }
            }
          },
          {
            enableHighAccuracy: true, // Use GPS, not WiFi/cell tower
            timeout: 8000, // 8 seconds (generous for cold start)
            maximumAge: 0 // Always get fresh position
          }
        );
      };

      // Start GPS acquisition
      attemptGPSAcquisition();
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
        maxPitch: 60,
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
      });

    } catch (error) {
      console.error('Failed to initialize MapLibre GL:', error);
      console.log('💡 Falling back to Leaflet - refresh and set localStorage.setItem("trucknav_map_engine", "leaflet")');
      // Notify parent component about the failure
      if (onMapClick) {
        console.warn('MapLibre initialization failed - please use Leaflet instead');
      }
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
        if (map.current.getSource('route')) {
          map.current.removeSource('route');
        }
      } catch (error) {
        console.warn('Failed to remove route layers:', error);
      }
      return;
    }

    const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);

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

      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#2563eb',
          'line-width': 6,
          'line-opacity': 0.8
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

    const bounds = new maplibregl.LngLatBounds();
    routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
    map.current.fitBounds(bounds, { padding: 50, duration: 1000 });

  }, [currentRoute, isLoaded]);

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

  // GPS tracking and user position marker during navigation
  useEffect(() => {
    if (!map.current || !isLoaded || !isNavigating) {
      // Clean up GPS watch and marker when not navigating
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      setUserLocation(null);
      return;
    }

    const mapInstance = map.current;

    // Start GPS tracking
    if ('geolocation' in navigator && gpsWatchIdRef.current === null) {
      gpsWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, heading } = position.coords;
          const newLocation = {
            lat: latitude,
            lng: longitude,
            bearing: heading !== null ? heading : undefined
          };
          setUserLocation(newLocation);

          // Create or update user position marker
          if (!userMarkerRef.current) {
            // Create premium blue arrow marker for user position
            const el = document.createElement('div');
            el.className = 'user-position-marker';
            el.innerHTML = `
              <div style="
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
                border: 4px solid white;
                border-radius: 50%;
                box-shadow: 0 4px 16px rgba(59, 130, 246, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                animation: pulse-glow 2s ease-in-out infinite;
              ">
                <div style="
                  width: 0;
                  height: 0;
                  border-left: 6px solid transparent;
                  border-right: 6px solid transparent;
                  border-bottom: 12px solid white;
                  transform: translateY(-2px);
                  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
                "></div>
              </div>
              <style>
                @keyframes pulse-glow {
                  0%, 100% { 
                    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
                  }
                  50% { 
                    box-shadow: 0 4px 24px rgba(59, 130, 246, 0.8), 0 2px 12px rgba(0, 0, 0, 0.4);
                  }
                }
              </style>
            `;

            userMarkerRef.current = new maplibregl.Marker({
              element: el,
              rotation: newLocation.bearing || 0,
              rotationAlignment: 'map'
            })
              .setLngLat([newLocation.lng, newLocation.lat])
              .addTo(mapInstance);
          } else {
            // Update existing marker
            userMarkerRef.current.setLngLat([newLocation.lng, newLocation.lat]);
            if (newLocation.bearing !== undefined) {
              userMarkerRef.current.setRotation(newLocation.bearing);
            }
          }

          // Center map on user location during navigation
          mapInstance.easeTo({
            center: [newLocation.lng, newLocation.lat],
            zoom: 16,
            bearing: newLocation.bearing || 0,
            duration: 500
          });
        },
        (error) => {
          console.warn('GPS tracking error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }

    // Cleanup
    return () => {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [isNavigating, isLoaded]);

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
    
    const newMode = !is3DMode;
    setIs3DMode(newMode);
    
    // Smoothly transition between 2D (pitch 0) and 3D (pitch 60)
    map.current.easeTo({
      pitch: newMode ? 60 : 0,
      duration: 800
    });
  };

  const handleCompassClick = () => {
    if (!map.current) return;
    map.current.easeTo({ bearing: 0, pitch: 0, duration: 500 });
  };

  return (
    <div className={cn("relative w-full h-full", className)} data-testid="maplibre-container">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {!hideControls && (
        <>
          {/* Map Controls - Right Side Stack for Mobile */}
          <div className={cn(
            "absolute right-3 flex flex-col gap-2 z-[80] mobile-safe-top",
            isNavigating ? "top-14" : "bottom-40"
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

          {/* Speed Display - positioned above Start Navigation button */}
          <div className="absolute bottom-56 left-1/2 transform -translate-x-1/2 z-[160]">
            <SpeedDisplay 
              className="shadow-2xl"
            />
          </div>

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
        </>
      )}
    </div>
  );
});

export { MapLibreMap };
export default MapLibreMap;
