import { useEffect, useRef, useState, memo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from "@/components/ui/button";
import { Plus, Minus, Crosshair, Layers } from "lucide-react";
import { type Route, type VehicleProfile } from "@shared/schema";
import { cn } from "@/lib/utils";
import SpeedDisplay from "@/components/map/speed-display";

interface MapLibreMapProps {
  currentRoute: Route | null;
  selectedProfile: VehicleProfile | null;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
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

const MapLibreMap = memo(function MapLibreMap({
  currentRoute,
  selectedProfile,
  onMapClick,
  className
}: MapLibreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [preferences, setPreferences] = useState<MapPreferences>(loadMapPreferences);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(preferences.zoomLevel);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preferencesRef = useRef(preferences);
  const currentZoomRef = useRef(currentZoom);
  
  // Keep refs in sync with state
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);
  
  useEffect(() => {
    currentZoomRef.current = currentZoom;
  }, [currentZoom]);

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
    if (!mapContainer.current || map.current) return;

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

      map.current.addControl(new maplibregl.NavigationControl({
        visualizePitch: true,
        showCompass: true,
        showZoom: false
      }), 'top-right');

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
    if (!map.current || !isLoaded || !currentRoute?.routePath) return;

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
    console.log('🎯 Recenter button clicked');
    if (!map.current) {
      console.warn('Map not initialized');
      return;
    }
    
    // Get current GPS location and center map there
    if ('geolocation' in navigator) {
      console.log('📍 Requesting current GPS location...');
      
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ GPS request timed out after 3 seconds - using fallback');
        // Timeout fallback
        if (currentRoute?.routePath) {
          console.log('Fallback: centering on route');
          const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);
          const bounds = new maplibregl.LngLatBounds();
          routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
          map.current?.fitBounds(bounds, { padding: 50, duration: 1000 });
        } else {
          console.log('Fallback: centering on default position');
          map.current?.flyTo({ center: preferences.center, zoom: preferences.zoomLevel, duration: 1000 });
        }
      }, 3000);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const { latitude, longitude } = position.coords;
          console.log(`✅ Got location: ${latitude}, ${longitude}`);
          map.current?.flyTo({ 
            center: [longitude, latitude], 
            zoom: 16, 
            duration: 1000 
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          console.warn('❌ Could not get current location:', error.message, error.code);
          // Fallback: center on route or default position
          if (currentRoute?.routePath) {
            console.log('Fallback: centering on route');
            const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);
            const bounds = new maplibregl.LngLatBounds();
            routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
            map.current?.fitBounds(bounds, { padding: 50, duration: 1000 });
          } else {
            console.log('Fallback: centering on default position');
            map.current?.flyTo({ center: preferences.center, zoom: preferences.zoomLevel, duration: 1000 });
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      console.warn('Geolocation not available in this browser');
      // Geolocation not available, fallback to route or default
      if (currentRoute?.routePath) {
        const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);
        const bounds = new maplibregl.LngLatBounds();
        routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
        map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
      } else {
        map.current.flyTo({ center: preferences.center, zoom: preferences.zoomLevel, duration: 1000 });
      }
    }
  };

  const toggleMapView = () => {
    const newMode: 'roads' | 'satellite' = preferences.mapViewMode === 'roads' ? 'satellite' : 'roads';
    const newPrefs: MapPreferences = { ...preferences, mapViewMode: newMode };
    setPreferences(newPrefs);
    saveMapPreferences(newPrefs);
  };

  return (
    <div className={cn("relative w-full h-full", className)} data-testid="maplibre-container">
      <div ref={mapContainer} className="absolute inset-0" />
      
      <div className="absolute bottom-24 right-4 flex flex-col gap-2 z-10">
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomIn}
          className="h-10 w-10 shadow-lg bg-white hover:bg-white/90"
          data-testid="button-zoom-in"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomOut}
          className="h-10 w-10 shadow-lg bg-white hover:bg-white/90"
          data-testid="button-zoom-out"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleRecenter}
          className="h-10 w-10 shadow-lg bg-white hover:bg-white/90"
          data-testid="button-recenter"
          aria-label="Recenter map"
        >
          <Crosshair className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={toggleMapView}
          className="h-10 w-10 shadow-lg bg-white hover:bg-white/90"
          data-testid="button-toggle-view"
          aria-label="Toggle map view"
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>

      {/* Speed Display - positioned above MapLibre legal text at bottom */}
      <div className="absolute bottom-14 left-[48%] transform -translate-x-1/2 z-[1150]">
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
        {currentZoom >= 17 && (
          <>
            <span className="text-muted-foreground mx-1">•</span>
            <span className="text-green-600 font-semibold">3D</span>
          </>
        )}
      </div>
    </div>
  );
});

export { MapLibreMap };
export default MapLibreMap;
