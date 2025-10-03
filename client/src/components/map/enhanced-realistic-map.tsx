import { memo, useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, useMap, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Minus, 
  Navigation,
  Layers,
  Satellite,
  Map as MapIcon,
  Eye,
  EyeOff,
  Crosshair,
  MapPin,
  Route as RouteIcon,
  AlertTriangle,
  Car,
  Construction,
  Shield,
  TrafficCone,
  X
} from "lucide-react";
import { type Route, type VehicleProfile, type TrafficIncident } from "@shared/schema";
import { cn } from "@/lib/utils";
import LaneGuidancePopup from "@/components/navigation/lane-guidance-popup";
import { getIncidentIcon } from "@shared/incident-icons";

interface EnhancedRealisticMapProps {
  currentRoute: Route | null;
  selectedProfile: VehicleProfile | null;
  alternativeRoutes?: any[];
  previewRoute?: any;
  showTrafficLayer?: boolean;
  showIncidents?: boolean;
  isNavigating?: boolean;
  currentLocation?: { lat: number; lng: number };
  onMapClick?: (lat: number, lng: number) => void;
  isMapExpanded?: boolean;
  sidebarState?: 'closed' | 'open' | 'collapsed';
}

// Professional map tile providers for realistic navigation
const mapProviders = {
  openstreetmap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
    maxZoom: 18
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap (CC-BY-SA)',
    maxZoom: 17
  },
  cartodb_dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 19
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

// Custom truck icon for current position
const createTruckIcon = (isNavigating: boolean) => {
  const size = isNavigating ? 40 : 30;
  const color = isNavigating ? '#3B82F6' : '#6B7280';
  
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px; 
        height: ${size}px; 
        background: ${color}; 
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          color: white;
          font-size: ${size * 0.5}px;
          transform: rotate(45deg);
          font-weight: bold;
        ">🚛</div>
      </div>
    `,
    className: 'custom-truck-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
};

// Create incident icon based on incident type
const createIncidentIcon = (incident: TrafficIncident) => {
  const getIncidentIconAndColor = (type: string) => {
    // Import the icon library
    const { getIncidentIcon } = require('@shared/incident-icons');
    const config = getIncidentIcon(type);
    
    return { 
      icon: config.emoji, 
      color: config.color, 
      bgColor: config.bgColor 
    };
  };

  const { icon, color, bgColor } = getIncidentIconAndColor(incident.type);
  const size = incident.severity === 'high' ? 32 : incident.severity === 'medium' ? 28 : 24;

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px; 
        height: ${size}px; 
        background: ${bgColor}; 
        border: 2px solid ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        font-size: ${size * 0.6}px;
        position: relative;
      ">
        ${icon}
        ${incident.severity === 'high' ? '<div style="position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; background: #DC2626; border-radius: 50%;"></div>' : ''}
      </div>
    `,
    className: 'custom-incident-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

// Enhanced route styling for professional appearance
const getRouteStyle = (routeType: 'main' | 'alternative' | 'preview' = 'main') => {
  const styles = {
    main: {
      color: '#3B82F6',
      weight: 6,
      opacity: 0.9,
      dashArray: undefined
    },
    alternative: {
      color: '#10B981',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 5'
    },
    preview: {
      color: '#F59E0B',
      weight: 5,
      opacity: 0.8,
      dashArray: '5, 5'
    }
  };
  
  return styles[routeType];
};

const EnhancedRealisticMap = memo(function EnhancedRealisticMap({
  currentRoute,
  selectedProfile,
  alternativeRoutes = [],
  previewRoute,
  showTrafficLayer = false,
  showIncidents = false,
  isNavigating = false,
  currentLocation,
  onMapClick,
  isMapExpanded,
  sidebarState
}: EnhancedRealisticMapProps) {
  const [mapProvider, setMapProvider] = useState<keyof typeof mapProviders>('openstreetmap');
  const [zoomLevel, setZoomLevel] = useState(12);
  const [showControls, setShowControls] = useState(true);
  // Use UK center as neutral default (no hardcoded Luton!) - will be overridden by route/GPS
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.5, -1.5]);
  const mapRef = useRef<L.Map | null>(null);

  // Fetch traffic incidents with 2-minute refresh
  const { data: incidents = [] } = useQuery<TrafficIncident[]>({
    queryKey: ['/api/traffic-incidents'],
    refetchInterval: 120000, // Refresh every 2 minutes
    enabled: showIncidents, // Only fetch when incidents should be shown
  });

  // Auto-follow mode for navigation with proper screen-space offset
  useEffect(() => {
    if (isNavigating && currentLocation && mapRef.current) {
      const map = mapRef.current;
      
      try {
        // Ensure map is fully initialized before making positioning calls
        // Add extra checks for container and initialization state
        const container = map.getContainer && map.getContainer();
        if (map && container && container.offsetWidth > 0 && container.offsetHeight > 0 && 
            map.setView && map.getZoom && map.getSize && map.panBy) {
          
          // Additional safety check for map size
          let containerSize;
          try {
            containerSize = map.getSize();
            if (!containerSize || containerSize.x <= 0 || containerSize.y <= 0) {
              console.warn('Invalid map size, skipping positioning');
              return;
            }
          } catch (sizeError) {
            console.warn('Failed to get map size:', sizeError);
            return;
          }
          
          // Set center first without offset
          map.setView([currentLocation.lat, currentLocation.lng], map.getZoom(), {
            animate: false
          });
          
          // Then apply screen-space offset to move truck to lower portion
          // This works in all directions and zoom levels
          const offsetY = containerSize.y * 0.3; // Move view up by 30% of screen height
          map.panBy([0, -offsetY], {
            animate: true,
            duration: 1.0
          });
        } else {
          console.warn('Map not ready for positioning - container or methods unavailable');
        }
      } catch (error) {
        console.warn('Auto-follow navigation positioning failed:', error);
      }
    }
  }, [currentLocation, isNavigating]);

  // Invalidate map size when layout changes (sidebar/map expand/provider switch) to prevent visual glitches
  useEffect(() => {
    if (mapRef.current) {
      // Multiple invalidation attempts to handle different timing scenarios
      const invalidateMap = () => {
        try {
          if (!mapRef.current) return;
          
          const map = mapRef.current;
          const container = map.getContainer && map.getContainer();
          
          // Enhanced container and map state validation
          if (map && container && container.offsetWidth > 0 && container.offsetHeight > 0 && 
              typeof map.invalidateSize === 'function') {
            
            map.invalidateSize();
            
            // Re-center on route if available and not navigating
            if (!isNavigating && currentRoute?.routePath && currentRoute.routePath.length > 0 && 
                typeof map.fitBounds === 'function') {
              try {
                const bounds = L.latLngBounds(
                  currentRoute.routePath.map(coord => [coord.lat, coord.lng])
                );
                map.fitBounds(bounds, { padding: [50, 50] });
              } catch (boundsError) {
                console.warn('Failed to fit route bounds:', boundsError);
              }
            }
          } else {
            console.warn('Map not ready for invalidation - container or state invalid');
          }
        } catch (error) {
          console.warn('Map invalidation failed:', error);
        }
      };

      // Immediate invalidation
      requestAnimationFrame(() => {
        invalidateMap();
        // Second attempt after CSS transitions
        setTimeout(invalidateMap, 250);
      });
    }
  }, [mapProvider, isMapExpanded, sidebarState, isNavigating, currentRoute]);

  // Center map on route when route changes (only during planning, not navigation)
  useEffect(() => {
    if (!isNavigating && currentRoute?.routePath && currentRoute.routePath.length > 0 && mapRef.current) {
      try {
        const map = mapRef.current;
        const container = map.getContainer && map.getContainer();
        
        if (map && container && container.offsetWidth > 0 && container.offsetHeight > 0 && 
            typeof map.fitBounds === 'function') {
          const bounds = L.latLngBounds(
            currentRoute.routePath.map(coord => [coord.lat, coord.lng])
          );
          map.fitBounds(bounds, { padding: [50, 50] });
        } else {
          console.warn('Map not ready for route centering - container or state invalid');
        }
      } catch (error) {
        console.warn('Route centering failed:', error);
      }
    }
  }, [currentRoute, isNavigating]);

  // REMOVED DUPLICATE GPS WATCHER - Use GPS singleton provider via currentLocation prop instead
  // This component receives currentLocation from parent, no need for duplicate watchPosition

  const handleMapCreated = useCallback(() => {
    // This will be called when the map is ready
    // mapRef.current will be set by the ref prop
  }, []);

  const currentProvider = mapProviders[mapProvider];
  // Use real GPS location (currentLocation prop) or route start, never hardcoded coordinates
  const displayLocation = currentLocation || 
    (currentRoute?.startCoordinates ? { lat: currentRoute.startCoordinates.lat, lng: currentRoute.startCoordinates.lng } : null) ||
    { lat: mapCenter[0], lng: mapCenter[1] };

  return (
    <div className="relative h-full w-full bg-transparent">
      {/* Enhanced Map Controls */}
      <div className="absolute top-16 right-4 z-[40] space-y-2">
        {/* Map Style Selector */}
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700/50 overflow-hidden">
          <div className="grid grid-cols-2 gap-0">
            <Button
              variant={mapProvider === 'openstreetmap' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMapProvider('openstreetmap')}
              className="rounded-none border-r border-gray-700/50 text-white hover:bg-gray-700/80"
              data-testid="button-map-road"
            >
              <MapIcon className="w-4 h-4" />
            </Button>
            <Button
              variant={mapProvider === 'satellite' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMapProvider('satellite')}
              className="rounded-none text-white hover:bg-gray-700/80"
              data-testid="button-map-satellite"
            >
              <Satellite className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700/50 overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mapRef.current?.zoomIn()}
            className="rounded-none border-b border-gray-700/50 text-white hover:bg-gray-700/80"
            data-testid="button-zoom-in"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mapRef.current?.zoomOut()}
            className="rounded-none text-white hover:bg-gray-700/80"
            data-testid="button-zoom-out"
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>

        {/* Center on Location */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (displayLocation && mapRef.current) {
              mapRef.current.setView([displayLocation.lat, displayLocation.lng], 16);
            }
          }}
          className="bg-gray-800/90 backdrop-blur-sm text-white hover:bg-gray-700/80 border border-gray-700/50"
          data-testid="button-center-location"
        >
          <Crosshair className="w-4 h-4" />
        </Button>
      </div>

      {/* Route Information Badge */}
      {currentRoute && (
        <div className="absolute bottom-4 left-4 z-[60]">
          <Badge 
            variant="secondary" 
            className="bg-transparent backdrop-blur-sm text-white border-gray-700/50 px-4 py-2 text-sm"
          >
            <RouteIcon className="w-4 h-4 mr-2" />
            {(currentRoute.distance || 0).toFixed(1)} miles • {currentRoute.duration}min
            {isNavigating && (
              <span className="ml-2 text-green-400">● ACTIVE</span>
            )}
          </Badge>
        </div>
      )}

      {/* Enhanced Leaflet Map */}
      <MapContainer
        center={mapCenter}
        zoom={zoomLevel}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        eventHandlers={{
          click: (e) => {
            if (onMapClick) {
              onMapClick(e.latlng.lat, e.latlng.lng);
            }
          }
        }}
        ref={(map) => {
          if (map && map.getContainer && map.getContainer()) {
            mapRef.current = map;
            
            // Safely set options only if map is properly initialized
            try {
              map.options.zoomAnimation = true;
              map.options.markerZoomAnimation = true;
              
              // Only call invalidateSize if the map is fully ready
              setTimeout(() => {
                if (map && map.invalidateSize && typeof map.invalidateSize === 'function') {
                  try {
                    map.invalidateSize();
                  } catch (error) {
                    console.warn('Map invalidateSize failed:', error);
                  }
                }
              }, 100); // Increased timeout to ensure map is fully rendered
            } catch (error) {
              console.warn('Map initialization failed:', error);
            }
          }
        }}
        className="leaflet-container-enhanced"
      >
        {/* Professional Tile Layer */}
        <TileLayer
          url={currentProvider.url}
          attribution={currentProvider.attribution}
          maxZoom={currentProvider.maxZoom}
          className="map-tiles-enhanced"
        />

        {/* Current Location Marker */}
        {displayLocation && (
          <Marker
            position={[displayLocation.lat, displayLocation.lng]}
            icon={createTruckIcon(isNavigating)}
          >
            <Popup closeOnClick={true} autoClose={true}>
              <div className="text-center">
                <div className="font-semibold">Current Location</div>
                <div className="text-sm text-gray-600">
                  {displayLocation.lat.toFixed(4)}, {displayLocation.lng.toFixed(4)}
                </div>
                {isNavigating && (
                  <Badge variant="default" className="mt-1">Navigation Active</Badge>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Traffic Incidents */}
        {showIncidents && incidents.map((incident) => {
          const iconConfig = getIncidentIcon(incident.type);
          return (
            <Marker
              key={incident.id}
              position={[incident.coordinates.lat, incident.coordinates.lng]}
              icon={createIncidentIcon(incident)}
              data-testid={`incident-marker-${incident.id}`}
            >
              <Popup maxWidth={300}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge 
                      variant={incident.severity === 'high' ? 'destructive' : incident.severity === 'medium' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {(incident.severity || 'low').toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {iconConfig.label}
                    </Badge>
                  </div>
                  
                  <div className="font-semibold text-sm">{incident.title || iconConfig.label}</div>
                  
                  {incident.description && (
                    <div className="text-xs text-gray-600">{incident.description}</div>
                  )}
                  
                  {incident.roadName && (
                    <div className="text-xs text-gray-600">
                      <MapPin className="inline-block w-3 h-3 mr-1" />
                      {incident.roadName}
                    </div>
                  )}
                  
                  {incident.estimatedClearTime && (
                    <div className="text-xs text-blue-600">
                      Estimated clearance: {new Date(incident.estimatedClearTime).toLocaleString()}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 border-t pt-1">
                    Reported {formatTimeAgo(incident.reportedAt || new Date())}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Enhanced Route Display */}
        {currentRoute?.routePath && currentRoute.routePath.length > 0 && (
          <Polyline
            positions={currentRoute.routePath.map(coord => [coord.lat, coord.lng])}
            pathOptions={getRouteStyle('main')}
          />
        )}

        {/* Alternative Routes */}
        {alternativeRoutes.map((route, index) => (
          route.routePath && route.routePath.length > 0 && (
            <Polyline
              key={`alt-${index}`}
              positions={route.routePath.map((coord: any) => [coord.lat, coord.lng])}
              pathOptions={getRouteStyle('alternative')}
            />
          )
        ))}

        {/* Preview Route */}
        {previewRoute?.routePath && previewRoute.routePath.length > 0 && (
          <Polyline
            positions={previewRoute.routePath.map((coord: any) => [coord.lat, coord.lng])}
            pathOptions={getRouteStyle('preview')}
          />
        )}
      </MapContainer>

      {/* Lane Guidance Popup */}
      <LaneGuidancePopup 
        currentRoute={currentRoute}
        isNavigating={isNavigating}
      />

      {/* Professional Map Styling */}
      <style>{`
        .leaflet-container-enhanced {
          filter: contrast(1.1) brightness(1.05);
          border-radius: 12px;
          overflow: hidden;
        }
        
        .map-tiles-enhanced {
          filter: ${mapProvider === 'satellite' ? 'none' : 'hue-rotate(10deg) saturate(1.1)'};
        }
        
        .custom-truck-marker {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        
        .leaflet-popup-content-wrapper {
          background: rgba(17, 24, 39, 0.95);
          color: white;
          border-radius: 8px;
          border: 1px solid rgba(75, 85, 99, 0.5);
          backdrop-filter: blur(8px);
        }
        
        .leaflet-popup-tip {
          background: rgba(17, 24, 39, 0.95);
          border: 1px solid rgba(75, 85, 99, 0.5);
        }
      `}</style>
    </div>
  );
});

export default EnhancedRealisticMap;