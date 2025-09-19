import { memo, useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Plus, 
  Minus, 
  Crosshair, 
  MapPin, 
  AlertTriangle,
  ParkingMeter,
  Fuel,
  Navigation,
  Activity,
  Eye,
  EyeOff,
  Route as RouteIcon,
  Clock,
  Maximize,
  Minimize,
  Menu,
  Shield,
  X,
  Layers
} from "lucide-react";
import { type Route, type VehicleProfile, type Restriction, type Facility, type AlternativeRoute, type TrafficIncident } from "@shared/schema";
import { useCurrentTrafficConditions, useTrafficIncidents } from "@/hooks/use-traffic";
import NextManeuverGuidance from "@/components/route/next-maneuver-guidance";
import { useCountryMap } from "@/hooks/use-country-preferences";
import { cn } from "@/lib/utils";
import LegalDisclaimerDialog from "@/components/legal/legal-disclaimer-dialog";
import { useLegalConsent } from "@/hooks/use-legal-consent";

interface InteractiveMapProps {
  currentRoute: Route | null;
  selectedProfile: VehicleProfile | null;
  alternativeRoutes?: AlternativeRoute[];
  previewRoute?: AlternativeRoute | null;
  showTrafficLayer?: boolean;
  showIncidents?: boolean;
  onOpenLaneSelection?: () => void;
  onIncidentClick?: (incident: TrafficIncident) => void;
  onToggleTrafficLayer?: () => void;
  onToggleIncidents?: () => void;
  // Enhanced automotive fullscreen functionality
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  // Auto-expansion functionality
  autoExpanded?: boolean;
  onCollapseMap?: () => void;
  // Sidebar interaction functionality
  onHideSidebar?: () => void;
}

// Memoized for mobile performance - only re-renders when route or profile changes
// Map preferences storage keys (now extended with country-specific providers)
const MAP_PREFERENCES_KEY = 'trucknav_map_preferences';

interface MapPreferences {
  mapViewMode: 'roads' | 'satellite';
  showTrafficLayer: boolean;
  showIncidents: boolean;
  showTruckRoutes: boolean;
  zoomLevel: number;
  // Extended with country-specific provider info
  provider?: string;
  tiles?: string;
  attribution?: string;
}

const defaultMapPreferences: MapPreferences = {
  mapViewMode: 'roads',
  showTrafficLayer: true,
  showIncidents: true,
  showTruckRoutes: true,
  zoomLevel: 10,
  provider: 'openstreetmap',
  tiles: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors'
};

// Load map preferences from localStorage
function loadMapPreferences(): MapPreferences {
  try {
    const stored = localStorage.getItem(MAP_PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultMapPreferences, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load map preferences:', error);
  }
  return defaultMapPreferences;
}

// Save map preferences to localStorage
function saveMapPreferences(preferences: MapPreferences): void {
  try {
    localStorage.setItem(MAP_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save map preferences:', error);
  }
}

const InteractiveMap = memo(function InteractiveMap({ 
  currentRoute, 
  selectedProfile, 
  alternativeRoutes = [],
  previewRoute = null,
  showTrafficLayer = true,
  showIncidents = true,
  onOpenLaneSelection,
  onIncidentClick,
  onToggleTrafficLayer,
  onToggleIncidents,
  isFullscreen = false,
  onToggleFullscreen,
  autoExpanded = false,
  onCollapseMap,
  onHideSidebar
}: InteractiveMapProps) {
  // Use country-based map provider
  const { mapProvider, getMapConfig, country } = useCountryMap();
  
  // Legal disclaimer dialog state
  const [isLegalDisclaimerOpen, setIsLegalDisclaimerOpen] = useState(false);
  const { hasAcceptedTerms } = useLegalConsent();
  
  // Load preferences on mount and merge with country-specific provider
  const [preferences, setPreferences] = useState<MapPreferences>(() => {
    const stored = loadMapPreferences();
    return {
      ...stored,
      provider: mapProvider.provider,
      tiles: mapProvider.tiles,
      attribution: mapProvider.attribution
    };
  });
  const [zoomLevel, setZoomLevel] = useState(preferences.zoomLevel);
  
  // Update preferences when country changes
  useEffect(() => {
    const updatedPreferences = {
      ...preferences,
      provider: mapProvider.provider,
      tiles: mapProvider.tiles,
      attribution: mapProvider.attribution
    };
    setPreferences(updatedPreferences);
    saveMapPreferences(updatedPreferences);
  }, [mapProvider.provider, mapProvider.tiles, mapProvider.attribution]);
  
  // Auto-hide functionality state
  const [controlsVisible, setControlsVisible] = useState(false); // Start hidden to prevent blocking map view
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const autoHideTimerRef = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Touch tap detection state
  const touchStartRef = useRef<{
    x: number;
    y: number;
    timestamp: number;
    touchCount: number;
  } | null>(null);
  
  const AUTO_HIDE_DELAY = 3000; // 3 seconds
  
  // Get restrictions for the current view
  const { data: restrictions = [] } = useQuery<Restriction[]>({
    queryKey: ["/api/restrictions?north=54&south=50&east=2&west=-6"],
    enabled: !!selectedProfile,
  });

  // Get facilities for the current view
  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ["/api/facilities?lat=52.5&lng=-1.5&radius=50"],
  });

  // Get traffic conditions for current route - using preferences as single source of truth
  const { data: trafficConditions = [] } = useCurrentTrafficConditions(
    currentRoute?.id || null,
    preferences.showTrafficLayer && !!currentRoute
  );

  // Get traffic incidents in the current map bounds - using preferences as single source of truth
  const { data: trafficIncidents = [] } = useTrafficIncidents(
    { north: 54, south: 50, east: 2, west: -6 },
    preferences.showIncidents
  );


  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Current location:", position.coords.latitude, position.coords.longitude);
          // In a real implementation, this would center the map on the user's location
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
    resetAutoHideTimer();
  };

  // Auto-hide functionality with improved timing
  const resetAutoHideTimer = useCallback(() => {
    setControlsVisible(true);
    setIsUserInteracting(true);
    
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    
    autoHideTimerRef.current = window.setTimeout(() => {
      if (!document.querySelector('button:hover, [role="button"]:hover')) {
        setControlsVisible(false);
        setIsUserInteracting(false);
      }
    }, AUTO_HIDE_DELAY);
  }, []);

  // Handle legal disclaimer toggle
  const handleToggleLegalDisclaimer = useCallback(() => {
    setIsLegalDisclaimerOpen(!isLegalDisclaimerOpen);
    resetAutoHideTimer();
  }, [isLegalDisclaimerOpen, resetAutoHideTimer]);

  // Handle map click (desktop mouse clicks)
  const handleMapClick = useCallback((event: React.MouseEvent) => {
    // Don't prevent default on button clicks to allow proper interaction
    const target = event.target as HTMLElement;
    if (target.closest('button, [role="button"]')) {
      return;
    }
    
    event.preventDefault();
    resetAutoHideTimer();
    
    // Only hide sidebar when user actually clicks the map
    if (onHideSidebar) {
      onHideSidebar();
    }
  }, [resetAutoHideTimer, onHideSidebar]);
  
  // Handle touch start - record initial touch position and time
  const handleMapTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (touch) {
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
        touchCount: event.touches.length
      };
    }
    resetAutoHideTimer();
  }, [resetAutoHideTimer]);
  
  // Handle touch end - implement true tap detection
  const handleMapTouchEnd = useCallback((event: React.TouchEvent) => {
    // Don't prevent default on button touches to allow proper interaction
    const target = event.target as HTMLElement;
    if (target.closest('button, [role="button"]')) {
      resetAutoHideTimer();
      return;
    }
    
    event.preventDefault();
    resetAutoHideTimer();
    
    const touchStart = touchStartRef.current;
    if (!touchStart || !onHideSidebar) {
      return;
    }
    
    // Get the touch that ended
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    
    // Calculate movement distance and duration
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - touchStart.timestamp;
    
    // Only hide sidebar for genuine taps:
    // - Single touch (not multi-touch gestures like pinch-zoom)
    // - Small movement (<10px) 
    // - Short duration (<300ms)
    const isTap = touchStart.touchCount === 1 && 
                  distance < 10 && 
                  duration < 300;
    
    if (isTap) {
      onHideSidebar();
    }
    
    // Clear touch start data
    touchStartRef.current = null;
  }, [resetAutoHideTimer, onHideSidebar]);
  
  // Handle map movement/interaction to show controls only (no sidebar hiding)
  const handleMapMovement = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    // Don't preventDefault on wheel events to allow normal scrolling
    if (event.type !== 'wheel') {
      event.preventDefault();
    }
    resetAutoHideTimer();
    // Only show controls, don't hide sidebar on movement
  }, [resetAutoHideTimer]);

  // Enhanced handlers with preference persistence and auto-hide reset
  const handleZoomIn = () => {
    const newZoomLevel = Math.min(zoomLevel + 1, 18);
    setZoomLevel(newZoomLevel);
    const newPreferences = { ...preferences, zoomLevel: newZoomLevel };
    setPreferences(newPreferences);
    saveMapPreferences(newPreferences);
    resetAutoHideTimer();
  };

  const handleZoomOut = () => {
    const newZoomLevel = Math.max(zoomLevel - 1, 1);
    setZoomLevel(newZoomLevel);
    const newPreferences = { ...preferences, zoomLevel: newZoomLevel };
    setPreferences(newPreferences);
    saveMapPreferences(newPreferences);
    resetAutoHideTimer();
  };

  const handleMapViewModeChange = (mode: 'roads' | 'satellite') => {
    const newPreferences = { ...preferences, mapViewMode: mode };
    setPreferences(newPreferences);
    saveMapPreferences(newPreferences);
    resetAutoHideTimer();
  };

  const handleToggleTrafficLayer = () => {
    const newShowTraffic = !preferences.showTrafficLayer;
    const newPreferences = { ...preferences, showTrafficLayer: newShowTraffic };
    setPreferences(newPreferences);
    saveMapPreferences(newPreferences);
    onToggleTrafficLayer?.();
    resetAutoHideTimer();
  };

  const handleToggleIncidents = () => {
    const newShowIncidents = !preferences.showIncidents;
    const newPreferences = { ...preferences, showIncidents: newShowIncidents };
    setPreferences(newPreferences);
    saveMapPreferences(newPreferences);
    onToggleIncidents?.();
    resetAutoHideTimer();
  };

  const handleToggleTruckRoutes = () => {
    const newShowTruckRoutes = !preferences.showTruckRoutes;
    const newPreferences = { ...preferences, showTruckRoutes: newShowTruckRoutes };
    setPreferences(newPreferences);
    saveMapPreferences(newPreferences);
    resetAutoHideTimer();
  };

  const handleFullscreenToggle = () => {
    if (autoExpanded && onCollapseMap) {
      onCollapseMap();
    } else if (onToggleFullscreen) {
      onToggleFullscreen();
    }
    resetAutoHideTimer();
  };

  // Initialize auto-hide timer on mount and add event listeners
  useEffect(() => {
    resetAutoHideTimer();
    
    // Add event listeners for voice-to-manual interface
    const handleMapZoom = (event: CustomEvent) => {
      const { direction } = event.detail;
      if (direction === 'in') {
        handleZoomIn();
      } else if (direction === 'out') {
        handleZoomOut();
      }
    };

    const handleMapCenter = (event: CustomEvent) => {
      handleCurrentLocation();
    };

    const handleMapTraffic = (event: CustomEvent) => {
      const { show } = event.detail;
      if (show !== undefined) {
        const newPreferences = { ...preferences, showTrafficLayer: show };
        setPreferences(newPreferences);
        saveMapPreferences(newPreferences);
        onToggleTrafficLayer?.();
      } else {
        handleToggleTrafficLayer();
      }
      resetAutoHideTimer();
    };

    const handleMapFullscreen = (event: CustomEvent) => {
      handleFullscreenToggle();
    };

    // Register event listeners
    window.addEventListener('map:zoom', handleMapZoom as EventListener);
    window.addEventListener('map:center', handleMapCenter as EventListener);
    window.addEventListener('map:traffic', handleMapTraffic as EventListener);
    window.addEventListener('map:fullscreen', handleMapFullscreen as EventListener);
    
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
      // Cleanup event listeners
      window.removeEventListener('map:zoom', handleMapZoom as EventListener);
      window.removeEventListener('map:center', handleMapCenter as EventListener);
      window.removeEventListener('map:traffic', handleMapTraffic as EventListener);
      window.removeEventListener('map:fullscreen', handleMapFullscreen as EventListener);
    };
  }, [resetAutoHideTimer, preferences, handleZoomIn, handleZoomOut, handleCurrentLocation, handleToggleTrafficLayer, handleFullscreenToggle, onToggleTrafficLayer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, []);

  // Map initialization and style management
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Add a small delay to ensure the container is properly rendered
    const initMap = () => {
      const container = mapContainerRef.current;
      if (!container) return;

      // Verify container dimensions
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn('Map container has no dimensions, retrying...');
        setTimeout(initMap, 100);
        return;
      }

      console.log('Initializing map with container dimensions:', rect);

      // Try using a simple well-known style URL first
      const getMapStyle = (viewMode: 'roads' | 'satellite') => {
        // Use simple OpenStreetMap style URLs that are known to work
        return viewMode === 'satellite' 
          ? 'https://demotiles.maplibre.org/style.json'
          : 'https://demotiles.maplibre.org/style.json';
      };

      try {
        console.log('Initializing React Leaflet map');
        // React Leaflet initialization is handled in JSX component

      } catch (error) {
        console.error('Failed to initialize map:');
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
        console.error('Leaflet available:', !!L);
        console.error('Container:', container);
      }
    };

    // Start initialization
    setTimeout(initMap, 100);

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle map view mode changes
  useEffect(() => {
    if (!mapRef.current) return;

    const getMapStyle = (viewMode: 'roads' | 'satellite') => {
      const roadStyle = {
        version: 8 as const,
        sources: {
          'osm': {
            type: 'raster' as const,
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster' as const,
            source: 'osm'
          }
        ]
      };

      const satelliteStyle = {
        version: 8 as const,
        sources: {
          'satellite': {
            type: 'raster' as const,
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '© Esri, © OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster' as const,
            source: 'satellite'
          }
        ]
      };

      return viewMode === 'satellite' ? satelliteStyle : roadStyle;
    };

    try {
      mapRef.current.setStyle(getMapStyle(preferences.mapViewMode));
      console.log(`Map style changed to: ${preferences.mapViewMode}`);
    } catch (error) {
      console.error('Failed to change map style:', error);
    }
  }, [preferences.mapViewMode]);

  // Handle zoom level changes
  useEffect(() => {
    if (!mapRef.current || mapRef.current.getZoom() === zoomLevel) return;
    
    mapRef.current.setZoom(zoomLevel);
  }, [zoomLevel]);

  return (
    <div 
      ref={mapContainerRef}
      className={cn(
        "flex-1 relative map-container",
        (isFullscreen || autoExpanded) && "fixed inset-0 z-50 bg-white", // Enhanced automotive fullscreen
        autoExpanded && "automotive-map-expanded", // Additional class for auto-expansion styling
        preferences.mapViewMode === 'satellite' && "satellite-view", // Satellite view styling
        "cursor-pointer" // Indicate interactive map
      )}
      onClick={handleMapClick}
      onTouchStart={handleMapTouchStart}
      onTouchEnd={handleMapTouchEnd}
      onPointerMove={handleMapMovement}
      onWheel={handleMapMovement}
      data-testid="map-container"
    >
      {/* Satellite View Background */}
      {preferences.mapViewMode === 'satellite' && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-800 via-green-700 to-green-900 opacity-90">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0iIzY2Nzc2NyIgZmlsbC1vcGFjaXR5PSIwLjMiLz4KPC9zdmc+')] opacity-30"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"></div>
        </div>
      )}
      
      {/* Scalable Map Controls Cluster - Mobile-Optimized Positioning */}
      {controlsVisible && (
        <div className={cn(
          "absolute z-20 space-y-2 transition-all duration-300 ease-in-out",
          // Positioned above map task bar as requested
          "bottom-32 right-4 sm:bottom-28 sm:right-4 md:top-16 md:right-4 md:bottom-auto",
          // Visible state animation
          "opacity-100 translate-y-0",
          // Smaller panel as requested
          "max-w-[160px]"
        )} data-testid="map-controls-cluster">
        {/* Enhanced Automotive Fullscreen/Expansion Toggle - Mobile First */}
        {(onToggleFullscreen || onCollapseMap) && (
          <Card className="overflow-hidden shadow-lg">
            <Button 
              variant="outline" 
              size="icon" 
              className={cn(
                "automotive-button scalable-control-button",
                "min-h-[clamp(44px,12vw,56px)] min-w-[clamp(44px,12vw,56px)]"
              )}
              data-testid="button-fullscreen-toggle"
              onClick={handleFullscreenToggle}
            >
              {(isFullscreen || autoExpanded) ? 
                <Minimize className="scalable-control-icon" /> : 
                <Maximize className="scalable-control-icon" />
              }
            </Button>
          </Card>
        )}
        
        {/* Scalable Zoom Controls */}
        <Card className="overflow-hidden shadow-lg">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "rounded-none border-b automotive-button scalable-control-button",
              "min-h-[clamp(44px,12vw,56px)] min-w-[clamp(44px,12vw,56px)]"
            )}
            data-testid="button-zoom-in"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 18}
          >
            <Plus className="scalable-control-icon" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "rounded-none automotive-button scalable-control-button",
              "min-h-[clamp(44px,12vw,56px)] min-w-[clamp(44px,12vw,56px)]"
            )}
            data-testid="button-zoom-out"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
          >
            <Minus className="scalable-control-icon" />
          </Button>
        </Card>
        
        {/* Enhanced Layer Controls with Persistent Preferences */}
        <Card className="p-2 space-y-1 shadow-lg max-w-[180px] relative">
          {/* Close button for layer controls */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute -top-1 -right-1 h-6 w-6 p-0 rounded-full bg-background border hover:bg-accent"
            onClick={() => setControlsVisible(false)}
            data-testid="button-close-layer-controls"
          >
            <X className="h-3 w-3" />
          </Button>
          <Button 
            variant={preferences.mapViewMode === 'roads' ? "default" : "ghost"}
            size="sm" 
            className={cn(
              "w-full justify-start scalable-control-button",
              "min-h-[clamp(36px,10vw,44px)]"
            )}
            onClick={() => handleMapViewModeChange('roads')}
            data-testid="button-layer-roads"
          >
            <MapPin className="scalable-control-icon-sm mr-2 text-primary" />
            <span className="scalable-control-text">Roads</span>
          </Button>
          <Button 
            variant={preferences.mapViewMode === 'satellite' ? "default" : "ghost"}
            size="sm" 
            className={cn(
              "w-full justify-start scalable-control-button",
              "min-h-[clamp(36px,10vw,44px)]"
            )}
            onClick={() => handleMapViewModeChange('satellite')}
            data-testid="button-layer-satellite"
          >
            <div className={cn(
              "scalable-control-icon-sm mr-2 rounded",
              preferences.mapViewMode === 'satellite' ? "bg-green-600" : "bg-muted"
            )}></div>
            <span className="scalable-control-text">Satellite</span>
          </Button>
          <Button 
            variant={preferences.showTruckRoutes ? "default" : "ghost"}
            size="sm" 
            className={cn(
              "w-full justify-start scalable-control-button",
              "min-h-[clamp(36px,10vw,44px)]",
              preferences.showTruckRoutes && "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
            )}
            onClick={handleToggleTruckRoutes}
            data-testid="button-layer-truck"
          >
            <Navigation className="scalable-control-icon-sm mr-2" />
            <span className="scalable-control-text">Truck Routes</span>
          </Button>
          <Button 
            variant={preferences.showTrafficLayer ? "default" : "ghost"} 
            size="sm" 
            className={cn(
              "w-full justify-start scalable-control-button",
              "min-h-[clamp(36px,10vw,44px)]",
              preferences.showTrafficLayer && "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
            )}
            onClick={handleToggleTrafficLayer}
            data-testid="button-layer-traffic"
          >
            <Activity className="scalable-control-icon-sm mr-2" />
            <span className="scalable-control-text">Traffic</span>
            {trafficConditions.length > 0 && (
              <Badge variant="outline" className="ml-auto scalable-badge">
                {trafficConditions.length}
              </Badge>
            )}
          </Button>
          <Button 
            variant={preferences.showIncidents ? "default" : "ghost"} 
            size="sm" 
            className={cn(
              "w-full justify-start scalable-control-button",
              "min-h-[clamp(36px,10vw,44px)]",
              preferences.showIncidents && "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
            )}
            onClick={handleToggleIncidents}
            data-testid="button-layer-incidents"
          >
            <AlertTriangle className="scalable-control-icon-sm mr-2" />
            <span className="scalable-control-text">Incidents</span>
            {trafficIncidents.length > 0 && (
              <Badge variant="outline" className="ml-auto scalable-badge">
                {trafficIncidents.length}
              </Badge>
            )}
          </Button>
        </Card>
      </div>
      )}

      {/* Scalable Current Location Button - Positioned for Thumb Reach */}
      <Button 
        variant="outline" 
        size="icon" 
        className={cn(
          "absolute bg-card shadow-lg automotive-button scalable-control-button transition-all duration-300",
          "bottom-32 left-4 sm:bottom-28 md:bottom-20 lg:bottom-16", // Mobile-first positioning
          "min-h-[clamp(44px,12vw,56px)] min-w-[clamp(44px,12vw,56px)]",
          controlsVisible ? "opacity-100 translate-y-0" : "opacity-70 translate-y-1"
        )}
        data-testid="button-current-location"
        onClick={handleCurrentLocation}
      >
        <Crosshair className="scalable-control-icon" />
      </Button>
      
      {/* Auto-expansion indicator */}
      {autoExpanded && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary/90 text-primary-foreground px-4 py-2 rounded-full shadow-lg z-30">
          <span className="scalable-control-text font-medium">Map Expanded - Tap minimize to return</span>
        </div>
      )}
      
      {/* Controls Visibility Hint */}
      {!controlsVisible && !isUserInteracting && (
        <div className="absolute top-16 left-4 bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg text-sm shadow-lg z-15 transition-opacity duration-500 pointer-events-none">
          <span className="scalable-control-text">↑ Tap layers button to show controls</span>
        </div>
      )}
      
      {/* Toggle Controls Button - Always visible for easy access */}
      <Button
        variant={controlsVisible ? "default" : "outline"}
        size="icon"
        className={cn(
          "absolute top-4 left-4 bg-card shadow-lg z-20 transition-all duration-300 hover:scale-105",
          "min-h-[clamp(40px,10vw,48px)] min-w-[clamp(40px,10vw,48px)]",
          controlsVisible ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-card border-2 border-primary/20 hover:border-primary"
        )}
        onClick={() => setControlsVisible(!controlsVisible)}
        data-testid="button-toggle-layer-controls"
        title={controlsVisible ? "Hide layer controls" : "Show layer controls"}
      >
        <Layers className="scalable-control-icon" />
      </Button>
      
      {/* Enhanced Status Bar with Auto-Hide */}
      <div className={cn(
        "absolute bottom-4 left-4 bg-card border border-border rounded px-3 py-2 shadow-lg z-10 transition-all duration-300",
        controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}>
        <div className="flex items-center space-x-3">
          <span className="scalable-control-text-xs">Zoom: {zoomLevel}</span>
          {autoExpanded && (
            <>
              <span className="text-muted-foreground scalable-control-text-xs">•</span>
              <span className="text-accent font-medium scalable-control-text-xs">Auto-Expanded</span>
            </>
          )}
          {currentRoute && (
            <>
              <span className="text-muted-foreground scalable-control-text-xs">•</span>
              <span className="text-primary font-medium scalable-control-text-xs">Route Active</span>
            </>
          )}
          <span className="text-muted-foreground scalable-control-text-xs">•</span>
          <span className="scalable-control-text-xs">{preferences.mapViewMode}</span>
        </div>
      </div>

      {/* Mock Map Elements */}
      {currentRoute && (
        <>
          {/* Main Route Line with Traffic Colors */}
          <div 
            className={cn("route-line", showTrafficLayer && trafficConditions.length > 0 && "traffic-overlay")} 
            style={{ 
              top: '35%', 
              left: '20%', 
              width: '60%', 
              transform: 'rotate(15deg)' 
            }}
            data-testid="route-line"
          >
            {/* Traffic Segments */}
            {showTrafficLayer && trafficConditions.slice(0, 3).map((condition, index) => (
              <div
                key={condition.segmentId}
                className={cn("traffic-segment absolute", {
                  'bg-green-500': condition.flowLevel === 'free',
                  'bg-green-400': condition.flowLevel === 'light',
                  'bg-yellow-500': condition.flowLevel === 'moderate',
                  'bg-orange-500': condition.flowLevel === 'heavy',
                  'bg-red-500': condition.flowLevel === 'standstill',
                })}
                style={{
                  left: `${index * 33}%`,
                  width: '33%',
                  height: '100%',
                  opacity: 0.7,
                }}
                title={`${condition.roadName}: ${condition.flowLevel} traffic`}
              />
            ))}
          </div>

          {/* Alternative Route Previews */}
          {alternativeRoutes.slice(0, 2).map((altRoute, index) => (
            <div
              key={altRoute.id}
              className={cn(
                "alternative-route-line",
                previewRoute?.id === altRoute.id ? "preview-active" : ""
              )}
              style={{
                top: `${40 + index * 3}%`,
                left: '18%',
                width: '65%',
                transform: `rotate(${20 + index * 5}deg)`,
                opacity: previewRoute?.id === altRoute.id ? 1 : 0.6,
              }}
              data-testid={`alternative-route-${index}`}
            >
              <div className="text-xs absolute -top-6 left-0 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded whitespace-nowrap">
                Alternative {index + 1}: Save {Math.max(0, (currentRoute.duration || 0) - altRoute.duration)} min
              </div>
            </div>
          ))}
          
          {/* Starting Point */}
          <div className="absolute" style={{ top: '30%', left: '15%' }} data-testid="marker-start">
            <div className="w-6 h-6 bg-accent border-4 border-white rounded-full shadow-lg"></div>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg">
              {currentRoute.startLocation.split(' ')[0]}
            </div>
          </div>

          {/* Destination Point */}
          <div className="absolute" style={{ top: '45%', left: '75%' }} data-testid="marker-destination">
            <div className="w-6 h-6 bg-destructive border-4 border-white rounded-full shadow-lg"></div>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg">
              {currentRoute.endLocation.split(' ')[0]}
            </div>
          </div>
        </>
      )}

      {/* Traffic Incident Markers */}
      {showIncidents && trafficIncidents.slice(0, 3).map((incident: TrafficIncident, index: number) => (
        <div 
          key={incident.id}
          className="absolute cursor-pointer hover:scale-110 transition-transform" 
          style={{ 
            top: `${35 + index * 4}%`, 
            left: `${25 + index * 20}%` 
          }}
          onClick={() => onIncidentClick?.(incident)}
          data-testid={`incident-marker-${incident.id}`}
        >
          <div className={cn(
            "w-5 h-5 border-2 border-white rounded-full shadow-lg flex items-center justify-center",
            {
              'bg-red-600': incident.severity === 'critical',
              'bg-red-500': incident.severity === 'high',
              'bg-orange-500': incident.severity === 'medium',
              'bg-yellow-500': incident.severity === 'low',
            }
          )}>
            <AlertTriangle className="w-3 h-3 text-white" />
          </div>
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg min-w-max">
            <AlertTriangle className="w-3 h-3 mr-1 inline text-amber-500" />
            {incident.title}
            <div className="text-xs text-muted-foreground">
              {incident.severity} • {incident.type.replace('_', ' ')}
            </div>
          </div>
        </div>
      ))}

      {/* Traffic Congestion Zones */}
      {showTrafficLayer && trafficConditions.some(c => c.flowLevel === 'heavy' || c.flowLevel === 'standstill') && (
        <div className="absolute" style={{ top: '32%', left: '40%' }}>
          <div className="w-8 h-8 bg-red-500/20 border-2 border-red-500 rounded-full animate-pulse">
            <div className="w-full h-full bg-red-500/30 rounded-full flex items-center justify-center">
              <Clock className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white rounded px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg">
            Heavy Traffic Zone
          </div>
        </div>
      )}

      {/* Restriction Markers */}
      {restrictions.slice(0, 2).map((restriction: Restriction, index: number) => (
        <div 
          key={restriction.id}
          className="absolute restriction-marker" 
          style={{ 
            top: `${32 + index * 5}%`, 
            left: `${30 + index * 15}%` 
          }}
          data-testid={`marker-restriction-${restriction.id}`}
        >
          <div className="w-5 h-5 bg-destructive border-2 border-white rounded-full shadow-lg"></div>
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground rounded px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg">
            <AlertTriangle className="w-3 h-3 mr-1 inline" />
            {restriction.description}
          </div>
        </div>
      ))}

      {/* Truck Stop Markers */}
      {facilities.slice(0, 2).map((facility: Facility, index: number) => (
        <div 
          key={facility.id}
          className="absolute" 
          style={{ 
            top: `${38 + index * 7}%`, 
            left: `${45 + index * 10}%` 
          }}
          data-testid={`marker-facility-${facility.id}`}
        >
          <div className="w-8 h-8 bg-primary border-3 border-white rounded-lg shadow-lg flex items-center justify-center">
            {facility.type === 'truck_stop' ? (
              <Fuel className="w-4 h-4 text-white" />
            ) : (
              <ParkingMeter className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg">
            <ParkingMeter className="w-3 h-3 mr-1 text-primary inline" />
            {facility.name.split(' ')[0]}
          </div>
        </div>
      ))}

      {/* Next Maneuver Guidance Overlay */}
      {currentRoute && (
        <div className="absolute top-4 left-4 right-4 z-20">
          <NextManeuverGuidance
            currentRoute={currentRoute}
            onOpenLaneSelection={onOpenLaneSelection}
          />
        </div>
      )}

      {/* Floating Legal Disclaimer Button - Bottom Right Corner */}
      <div className={cn(
        "absolute z-30 transition-all duration-300 ease-in-out",
        "bottom-20 right-4", // Position above bottom info bar with proper spacing
        controlsVisible ? "opacity-100 translate-y-0" : "opacity-70 translate-y-1"
      )}>
        <Card className="overflow-hidden shadow-2xl">
          <Button
            onClick={handleToggleLegalDisclaimer}
            size="icon"
            className={cn(
              "automotive-button floating-action-button",
              "min-h-[clamp(48px,14vw,60px)] min-w-[clamp(48px,14vw,60px)]",
              "bg-card hover:bg-accent border-2 border-border hover:border-primary/50",
              "shadow-xl hover:shadow-2xl transition-all duration-300 ease-out",
              "bg-card hover:bg-accent",
              // Visual indicator for new users who haven't accepted terms yet
              !hasAcceptedTerms && "ring-2 ring-red-400 ring-opacity-75 animate-pulse"
            )}
            data-testid="button-legal-disclaimer"
            aria-label={isLegalDisclaimerOpen ? "Close legal disclaimer" : "Open legal disclaimer"}
          >
            <div className="relative">
              <Shield className={cn(
                "scalable-control-icon",
                hasAcceptedTerms ? "text-primary" : "text-red-600",
                isLegalDisclaimerOpen && "rotate-45 text-accent-foreground"
              )} />
              {/* Alert indicator for users who haven't accepted terms */}
              {!hasAcceptedTerms && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-white animate-pulse"></div>
              )}
            </div>
          </Button>
        </Card>
      </div>
      
      {/* Legal Disclaimer Dialog */}
      <LegalDisclaimerDialog
        open={isLegalDisclaimerOpen}
        onOpenChange={setIsLegalDisclaimerOpen}
      />

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Map Provider Info */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">
                {country.flag} {preferences.provider || 'OSM'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
              <span className="text-sm text-muted-foreground">Start</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-sm text-muted-foreground">Safe Route</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
              <span className="text-sm text-muted-foreground">Restrictions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-secondary rounded-full"></div>
              <span className="text-sm text-muted-foreground">Facilities</span>
            </div>
          </div>
          
          {facilities && facilities.length > 0 && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground" data-testid="text-next-facility">
                  Next: {facilities[0]?.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  12 miles • {Array.isArray(facilities[0]?.amenities) ? 
                    (facilities[0].amenities as string[]).slice(0, 2).join(' & ') : 
                    'Services'} available
                </div>
              </div>
              <Button size="sm" data-testid="button-facility-details">
                Details
              </Button>
            </div>
          )}
        </div>
        
        {/* Map Attribution - Dynamic based on provider */}
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            {preferences.attribution || mapProvider.attribution}
          </div>
        </div>
      </div>
    </div>
  );
});

export default InteractiveMap;
