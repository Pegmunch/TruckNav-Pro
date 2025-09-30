import { useEffect, useRef, useState, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from "@/components/ui/button";
import { Plus, Minus, Crosshair, Layers } from "lucide-react";
import { type Route, type VehicleProfile } from "@shared/schema";
import { cn } from "@/lib/utils";

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
  center: [-1.5, 52.5], // [lng, lat] for MapLibre
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

  // Get tile URL based on preferences
  const getTileUrl = (viewMode: 'roads' | 'satellite', zoom: number) => {
    // Use 3D tiles at zoom 17+
    if (zoom >= 17) {
      if (viewMode === 'roads') {
        return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      } else {
        return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      }
    }
    
    // Standard tiles for lower zoom
    return viewMode === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const tileUrl = getTileUrl(preferences.mapViewMode, preferences.zoomLevel);

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            attribution: preferences.mapViewMode === 'satellite'
              ? '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics'
              : '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      },
      center: preferences.center,
      zoom: preferences.zoomLevel,
      minZoom: 3,
      maxZoom: 19,
      attributionControl: false
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl({
      visualizePitch: true,
      showCompass: true,
      showZoom: false
    }), 'top-right');

    // Handle click events
    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });
    }

    // Save preferences on move/zoom with functional update to avoid closure issues
    map.current.on('moveend', () => {
      if (map.current) {
        const center = map.current.getCenter();
        const zoom = Math.round(map.current.getZoom());
        setCurrentZoom(zoom);
        setPreferences(prevPrefs => {
          const newPrefs: MapPreferences = {
            ...prevPrefs,
            center: [center.lng, center.lat] as [number, number],
            zoomLevel: zoom
          };
          saveMapPreferences(newPrefs);
          return newPrefs;
        });
      }
    });

    map.current.on('load', () => {
      setIsLoaded(true);
      console.log('✅ MapLibre GL loaded successfully');
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update tiles when view mode or zoom threshold changes
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const tileUrl = getTileUrl(preferences.mapViewMode, currentZoom);
    const attribution = currentZoom >= 17
      ? (preferences.mapViewMode === 'satellite' ? '© Google Satellite with 3D Terrain' : '© Google Maps with 3D Buildings')
      : (preferences.mapViewMode === 'satellite' ? '© Esri, DigitalGlobe' : '© OpenStreetMap contributors');

    // Rebuild the entire style to properly update tiles
    map.current.setStyle({
      version: 8,
      sources: {
        'raster-tiles': {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          attribution
        }
      },
      layers: [
        {
          id: 'simple-tiles',
          type: 'raster',
          source: 'raster-tiles',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    });

    // Re-add route after style reload
    map.current.once('styledata', () => {
      if (currentRoute?.routePath && map.current) {
        const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);
        
        map.current!.addSource('route', {
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

        map.current!.addLayer({
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
      }
    });
  }, [preferences.mapViewMode, currentZoom >= 17, isLoaded]);

  // Render route on map
  useEffect(() => {
    if (!map.current || !isLoaded || !currentRoute?.routePath) return;

    const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);

    // Add route source if it doesn't exist
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
      // Update existing route
      const source = map.current.getSource('route') as maplibregl.GeoJSONSource;
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates
        }
      });
    }

    // Fit bounds to route
    const bounds = new maplibregl.LngLatBounds();
    routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
    map.current.fitBounds(bounds, { padding: 50, duration: 1000 });

  }, [currentRoute, isLoaded]);

  // Handle zoom controls
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
    if (map.current && currentRoute?.routePath) {
      const routeCoordinates = currentRoute.routePath.map(coord => [coord.lng, coord.lat]);
      const bounds = new maplibregl.LngLatBounds();
      routeCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
      map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
    } else if (map.current) {
      map.current.flyTo({ center: preferences.center, zoom: preferences.zoomLevel, duration: 1000 });
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
      
      {/* Custom Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomIn}
          className="h-10 w-10 shadow-lg"
          data-testid="button-zoom-in"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomOut}
          className="h-10 w-10 shadow-lg"
          data-testid="button-zoom-out"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleRecenter}
          className="h-10 w-10 shadow-lg"
          data-testid="button-recenter"
          aria-label="Recenter map"
        >
          <Crosshair className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={toggleMapView}
          className="h-10 w-10 shadow-lg"
          data-testid="button-toggle-view"
          aria-label="Toggle map view"
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>

      {/* Map info badge */}
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
