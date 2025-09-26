import { memo, useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, useMap, Polyline, Marker, Popup } from 'react-leaflet';
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
  Camera,
  Route as RouteIcon,
  Clock,
  Maximize,
  Minimize,
  Menu,
  Shield,
  X,
  Layers,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { type Route, type VehicleProfile, type Restriction, type Facility, type AlternativeRoute, type TrafficIncident } from "@shared/schema";
import { useCurrentTrafficConditions, useTrafficIncidents } from "@/hooks/use-traffic";
import NextManeuverGuidance from "@/components/route/next-maneuver-guidance";
import { useCountryMap } from "@/hooks/use-country-preferences";
import { cn } from "@/lib/utils";
import LegalDisclaimerDialog from "@/components/legal/legal-disclaimer-dialog";
import { useLegalConsent } from "@/hooks/use-legal-consent";
import SpeedDisplay from "@/components/map/speed-display";
import StreetView from "@/components/map/street-view";

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
  showStreetView: boolean;
  streetViewMode: 'preview' | 'navigation' | 'off';
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
  showStreetView: false,
  streetViewMode: 'off',
  zoomLevel: 10,
  provider: 'openstreetmap',
  tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors'
};

// Load map preferences from localStorage
function loadMapPreferences(): MapPreferences {
  try {
    const stored = localStorage.getItem(MAP_PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Sanitize legacy 'street-view' mapViewMode values
      if (parsed.mapViewMode === 'street-view') {
        parsed.mapViewMode = 'roads';
      }
      // Ensure streetViewMode is valid
      if (!['preview', 'navigation', 'off'].includes(parsed.streetViewMode)) {
        parsed.streetViewMode = 'off';
      }
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
  const [vehiclePosition, setVehiclePosition] = useState<[number, number] | null>(null);
  // Speed tracking state for live speed limit data
  const [currentSpeedLimit, setCurrentSpeedLimit] = useState<number | null>(113); // Test value - displays as 70 mph
  
  // Street View state management
  const [streetViewPosition, setStreetViewPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [streetViewHeading, setStreetViewHeading] = useState(0);
  const [isStreetViewFullscreen, setIsStreetViewFullscreen] = useState(false);
  
  // Navigation mode state for auto-activation
  const [currentManeuver, setCurrentManeuver] = useState<any>(null);
  const [distanceToNextTurn, setDistanceToNextTurn] = useState<number>(1000); // meters
  const [isNavigating, setIsNavigating] = useState(false);
  
  
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
  
  // Initialize street view position when component mounts or location changes
  useEffect(() => {
    if (preferences.showStreetView && !streetViewPosition && mapRef.current) {
      const center = mapRef.current.getCenter();
      setStreetViewPosition({ lat: center.lat, lng: center.lng });
    }
  }, [preferences.showStreetView, streetViewPosition]);

  // Smart auto-activation logic for navigation mode
  useEffect(() => {
    if (!isNavigating || !currentRoute) {
      return;
    }

    // Simulate navigation progress and distance calculation
    // In a real app, this would come from GPS and route progress tracking
    const mockNavigationData = {
      currentInstruction: "At the roundabout, take the 2nd exit onto M1",
      direction: 'straight' as const,
      distance: distanceToNextTurn,
      targetHeading: 45
    };

    setCurrentManeuver(mockNavigationData);

    // Auto-activate navigation mode when approaching decision points
    const shouldActivateNavigationMode = 
      distanceToNextTurn <= 500 && // Within 500m of next turn
      preferences.streetViewMode !== 'off' && // Street view not disabled
      (mockNavigationData.direction === 'left' || 
       mockNavigationData.direction === 'right' || 
       mockNavigationData.direction === 'uturn'); // Important maneuvers only

    if (shouldActivateNavigationMode && preferences.streetViewMode !== 'navigation') {
      const newPreferences = { ...preferences, streetViewMode: 'navigation' as const, showStreetView: true };
      setPreferences(newPreferences);
      saveMapPreferences(newPreferences);
    }

    // Simulate distance decreasing over time (for demo purposes)
    const timer = setInterval(() => {
      setDistanceToNextTurn(prev => Math.max(0, prev - 10));
    }, 1000);

    return () => clearInterval(timer);
  }, [isNavigating, currentRoute, distanceToNextTurn, preferences.streetViewMode]);

  // Sync with actual navigation state from route data
  useEffect(() => {
    // This would typically come from useWindowSync or navigation state management
    setIsNavigating(!!currentRoute && preferences.streetViewMode !== 'off');
  }, [currentRoute, preferences.streetViewMode]);
  
  // Auto-hide functionality state
  const [controlsVisible, setControlsVisible] = useState(true); // Start visible so buttons are immediately available
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // Track if user has interacted to prevent premature auto-hide
  const [panelHover, setPanelHover] = useState(false);
  const manualHiddenRef = useRef(false);
  const autoHideTimerRef = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Hook component to capture map reference and fix size issues
  function MapEventHandler() {
    const map = useMap();
    
    useEffect(() => {
      mapRef.current = map;
      console.log('Map reference captured:', map);
      
      if (map) {
        // Force map to recalculate size immediately and after render
        setTimeout(() => {
          map.invalidateSize();
          console.log('Map size invalidated on mount');
        }, 0);
        
        setTimeout(() => {
          map.invalidateSize();  
          console.log('Map size invalidated after delay');
        }, 300);
        
        // Additional invalidation after 1 second to catch slow layouts
        setTimeout(() => {
          map.invalidateSize();
          console.log('Map size invalidated - final attempt');
        }, 1000);
      }
    }, [map]);
    
    return null;
  }

  // Add effect to invalidate size when visibility props change
  useEffect(() => {
    if (mapRef.current) {
      console.log('Layout changed, invalidating map size');
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [isFullscreen, autoExpanded, controlsVisible]);
  
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
    setHasUserInteracted(true);
    resetAutoHideTimer();
    
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Current location:', { latitude, longitude });
        
        // Center the map on current location
        if (mapRef.current) {
          const currentZoom = mapRef.current.getZoom() ?? 13;
          mapRef.current.setView([latitude, longitude], Math.max(currentZoom, 13), { animate: true });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Smooth vehicle position tracking with throttled updates
  const updateVehiclePosition = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    
    const newPosition: [number, number] = [lat, lng];
    setVehiclePosition(newPosition);
    
    // Single smooth pan to new position during navigation
    if (currentRoute) {
      mapRef.current.flyTo(newPosition, mapRef.current.getZoom(), {
        animate: true,
        duration: 0.8,
        easeLinearity: 0.2
      });
    }
  }, [currentRoute]);
  
  // GPS position tracking with speed limit detection
  useEffect(() => {
    if (currentRoute && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateVehiclePosition(latitude, longitude);
          
          // Mock speed limit detection based on location
          // In production, this would query a speed limit API or road database
          const mockSpeedLimit = getMockSpeedLimit(latitude, longitude);
          setCurrentSpeedLimit(mockSpeedLimit);
        },
        (error) => console.warn('GPS tracking error:', error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [currentRoute, updateVehiclePosition]);
  
  // Mock speed limit detection (replace with real API in production)
  const getMockSpeedLimit = (lat: number, lng: number): number => {
    // Basic speed limit logic based on location patterns
    // Urban areas: 50 km/h, highways: 120 km/h, rural: 80 km/h
    const urbanCenter = Math.abs(lat - 51.5074) < 0.01 && Math.abs(lng + 0.1278) < 0.01; // London center
    const highway = Math.abs(lat - 51.5) < 0.1 && Math.abs(lng + 0.5) < 0.1; // Highway area
    
    if (urbanCenter) return 50; // Urban speed limit
    if (highway) return 120; // Highway speed limit  
    return 80; // Rural/default speed limit
  };
  
  
  // Auto-hide functionality with improved timing - scoped to panel only
  const resetAutoHideTimer = useCallback(() => {
    // Only auto-show if not manually hidden
    if (!manualHiddenRef.current) {
      setControlsVisible(true);
    }
    setIsUserInteracting(true);
    
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    
    // Only auto-hide if user has already interacted at least once
    if (hasUserInteracted) {
      autoHideTimerRef.current = window.setTimeout(() => {
        if (!panelHover) {
          setControlsVisible(false);
          setIsUserInteracting(false);
        } else {
          // Reschedule if still hovering
          resetAutoHideTimer();
        }
      }, AUTO_HIDE_DELAY);
    }
  }, [panelHover, hasUserInteracted]);

  // Handle legal disclaimer toggle
  const handleToggleLegalDisclaimer = useCallback(() => {
    console.log('Legal disclaimer button clicked! Current state:', isLegalDisclaimerOpen);
    setIsLegalDisclaimerOpen(!isLegalDisclaimerOpen);
    resetAutoHideTimer();
    console.log('Legal disclaimer will open:', !isLegalDisclaimerOpen);
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
    setHasUserInteracted(true);
    resetAutoHideTimer();
  };

  const handleZoomOut = () => {
    const newZoomLevel = Math.max(zoomLevel - 1, 1);
    setZoomLevel(newZoomLevel);
    const newPreferences = { ...preferences, zoomLevel: newZoomLevel };
    setPreferences(newPreferences);
    saveMapPreferences(newPreferences);
    setHasUserInteracted(true);
    resetAutoHideTimer();
  };

  const handleMapViewModeChange = (mode: 'roads' | 'satellite') => {
    console.log('🔄 Switching map view mode from', preferences.mapViewMode, 'to', mode);
    const newPreferences = { ...preferences, mapViewMode: mode, showStreetView: false };
    setPreferences(newPreferences);
    saveMapPreferences(newPreferences);
    setHasUserInteracted(true);
    resetAutoHideTimer();
    console.log('✅ New preferences set:', newPreferences);
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

  const handleToggleStreetView = () => {
    const newShowStreetView = !preferences.showStreetView;
    // Keep mapViewMode independent - don't change it when toggling street view
    const newPreferences = { 
      ...preferences, 
      showStreetView: newShowStreetView,
      // When toggling on, start in preview mode unless navigating
      streetViewMode: newShowStreetView ? (isNavigating ? 'navigation' : 'preview') : 'off'
    };
    setPreferences(newPreferences);
    saveMapPreferences(newPreferences);
    
    // Set street view position to current map center if enabling
    if (newShowStreetView && mapRef.current) {
      const center = mapRef.current.getCenter();
      setStreetViewPosition({ lat: center.lat, lng: center.lng });
    }
    
    // Mark that user has interacted
    setHasUserInteracted(true);
    resetAutoHideTimer();
  };

  // Handle street view mode changes
  const handleStreetViewModeChange = (mode: 'preview' | 'navigation' | 'off') => {
    const newPreferences = { 
      ...preferences, 
      streetViewMode: mode,
      showStreetView: mode !== 'off'
    };
    setPreferences(newPreferences);
    saveMapPreferences(newPreferences);
    setHasUserInteracted(true);
    resetAutoHideTimer();
  };

  // Handle street view position synchronization
  const handleStreetViewLocationChange = useCallback((location: { lat: number; lng: number }) => {
    setStreetViewPosition(location);
    if (mapRef.current) {
      mapRef.current.panTo([location.lat, location.lng]);
    }
  }, []);

  const handleStreetViewHeadingChange = useCallback((heading: number) => {
    setStreetViewHeading(heading);
  }, []);

  const handleStreetViewFullscreenToggle = () => {
    setIsStreetViewFullscreen(!isStreetViewFullscreen);
    resetAutoHideTimer();
  };

  // Update street view position when map center changes
  const updateStreetViewFromMap = useCallback(() => {
    if (preferences.showStreetView && mapRef.current) {
      const center = mapRef.current.getCenter();
      setStreetViewPosition({ lat: center.lat, lng: center.lng });
    }
  }, [preferences.showStreetView]);

  const handleFacilityDetails = (facility: any) => {
    if (!facility) return;
    
    // Create detailed facility information dialog
    const amenitiesList = Array.isArray(facility.amenities) 
      ? facility.amenities.join(', ') 
      : 'Services available';
    
    const facilityInfo = [
      `📍 **${facility.name}**`,
      `📍 ${facility.address || 'Location information'}`,
      facility.rating ? `⭐ Rating: ${facility.rating}/5` : '',
      facility.phone ? `📞 ${facility.phone}` : '',
      facility.hours ? `🕒 ${facility.hours}` : '',
      `🛠️ Amenities: ${amenitiesList}`,
      facility.distance ? `📏 Distance: ${facility.distance} miles` : ''
    ].filter(Boolean).join('\n');

    // Show alert with facility details
    alert(facilityInfo);
  };

  // Map directional movement functions (Leaflet API)
  const handleMoveUp = () => {
    console.log('🔝 UP button clicked! Map ref available:', !!mapRef.current);
    if (!mapRef.current) {
      console.error('❌ Map reference not available for UP movement');
      return;
    }
    const center = mapRef.current.getCenter();
    console.log('📍 Current center:', center);
    const newCenter = L.latLng(center.lat + 0.01, center.lng);
    console.log('📍 Moving to:', newCenter);
    mapRef.current.panTo(newCenter);
    resetAutoHideTimer();
  };

  const handleMoveDown = () => {
    console.log('🔽 DOWN button clicked! Map ref available:', !!mapRef.current);
    if (!mapRef.current) {
      console.error('❌ Map reference not available for DOWN movement');
      return;
    }
    const center = mapRef.current.getCenter();
    const newCenter = L.latLng(center.lat - 0.01, center.lng);
    mapRef.current.panTo(newCenter);
    resetAutoHideTimer();
  };

  const handleMoveLeft = () => {
    console.log('⬅️ LEFT button clicked! Map ref available:', !!mapRef.current);
    if (!mapRef.current) {
      console.error('❌ Map reference not available for LEFT movement');
      return;
    }
    const center = mapRef.current.getCenter();
    const newCenter = L.latLng(center.lat, center.lng - 0.01);
    mapRef.current.panTo(newCenter);
    resetAutoHideTimer();
  };

  const handleMoveRight = () => {
    console.log('➡️ RIGHT button clicked! Map ref available:', !!mapRef.current);
    if (!mapRef.current) {
      console.error('❌ Map reference not available for RIGHT movement');
      return;
    }
    const center = mapRef.current.getCenter();
    const newCenter = L.latLng(center.lat, center.lng + 0.01);
    mapRef.current.panTo(newCenter);
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
        console.log('React Leaflet map will be initialized in JSX');
        // React Leaflet initialization is now handled in JSX below
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

  // Handle zoom level changes for Leaflet
  useEffect(() => {
    if (!mapRef.current || mapRef.current.getZoom() === zoomLevel) return;
    
    mapRef.current.setZoom(zoomLevel);
  }, [zoomLevel]);

  return (
    <div 
      ref={mapContainerRef}
      className={cn(
        "flex-1 relative map-container transition-opacity duration-500 ease-out z-0",
        (isFullscreen || autoExpanded) && "fixed inset-0 z-50 bg-background", // Enhanced automotive fullscreen
        autoExpanded && "automotive-map-expanded", // Additional class for auto-expansion styling
        preferences.mapViewMode === 'satellite' && "satellite-view", // Satellite view styling
        preferences.showStreetView && "opacity-50", // Dim map when street view is active
        "cursor-pointer" // Indicate interactive map
      )}
      onClick={handleMapClick}
      onTouchStart={handleMapTouchStart}
      onTouchEnd={handleMapTouchEnd}
      data-testid="map-container"
      style={{ height: '100%', width: '100%', minHeight: '400px' }}
    >
      {/* React Leaflet Map */}
      <MapContainer 
        center={[52.5, -1.5]} 
        zoom={zoomLevel} 
        style={{ height: '100%', width: '100%' }}
        className="absolute inset-0 z-0"
        data-testid="leaflet-map"
      >
        <TileLayer
          key={preferences.mapViewMode} // Stable key per view mode
          url={(() => {
            const url = preferences.mapViewMode === 'satellite' 
              ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' // Esri World Imagery - properly licensed  
              : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'; // Esri Street Map
            console.log('🗺️ TileLayer URL for', preferences.mapViewMode, 'mode:', url);
            return url;
          })()}
          attribution={preferences.mapViewMode === 'satellite'
            ? '© Esri, © OpenStreetMap contributors'
            : '© Esri, © OpenStreetMap contributors'
          }
        />
        
        {/* CRITICAL FIX: Route Visualization - Display current route as polyline */}
        {currentRoute && currentRoute.routePath && currentRoute.routePath.length > 0 && (
          <>
            {/* Main route polyline */}
            <Polyline
              positions={currentRoute.routePath.map((coord: { lat: number; lng: number }) => [coord.lat, coord.lng])}
              color="#2563eb"
              weight={6}
              opacity={0.8}
              smoothFactor={1}
              data-testid="route-polyline"
            />
            
            {/* Start marker */}
            {currentRoute.startCoordinates && (
              <Marker 
                position={[currentRoute.startCoordinates.lat, currentRoute.startCoordinates.lng]}
                data-testid="route-start-marker"
              >
                <Popup>
                  <div className="text-sm font-medium">
                    Start: {currentRoute.startLocation}
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* End marker */}
            {currentRoute.endCoordinates && (
              <Marker 
                position={[currentRoute.endCoordinates.lat, currentRoute.endCoordinates.lng]}
                data-testid="route-end-marker"
              >
                <Popup>
                  <div className="text-sm font-medium">
                    End: {currentRoute.endLocation}
                  </div>
                </Popup>
              </Marker>
            )}
          </>
        )}
        
        {/* Vehicle position marker during navigation */}
        {vehiclePosition && currentRoute && (
          <Marker 
            position={vehiclePosition}
            data-testid="vehicle-position-marker"
          >
            <Popup>
              <div className="text-sm font-medium">Current Position</div>
            </Popup>
          </Marker>
        )}
        
        <MapEventHandler />
      </MapContainer>
      
      {/* Street View Preview Panel */}
      {preferences.showStreetView && streetViewPosition && !isStreetViewFullscreen && (
        <div 
          className={cn(
            "absolute z-[500] transition-all duration-300 ease-in-out",
            "bg-background border border-border rounded-lg shadow-lg overflow-hidden",
            // Responsive sizing based on mode
            preferences.streetViewMode === 'navigation' && isNavigating ? [
              // Navigation mode - larger display for better visibility during driving
              "top-4 right-4 bottom-32", // Larger vertical space, avoiding bottom controls
              "w-[40%] max-w-lg min-w-[320px]", // 40% width on desktop, constrained
              "md:w-[40%] sm:w-[50%] mobile:w-[95%]", // Responsive width adjustments
              "mobile:h-[50vh] mobile:top-4 mobile:right-2 mobile:left-2 mobile:bottom-auto" // Mobile: 50% height, nearly full width
            ] : [
              // Preview mode - smaller, traditional positioning
              "bottom-48 right-4",
              "w-64 h-36 md:w-80 md:h-48 lg:w-96 lg:h-52"
            ]
          )}
          data-testid="container-street-view-preview"
        >
          {/* Street View Component in Preview Mode */}
          <StreetView
            lat={streetViewPosition.lat}
            lng={streetViewPosition.lng}
            heading={streetViewHeading}
            onLocationChange={handleStreetViewLocationChange}
            onHeadingChange={handleStreetViewHeadingChange}
            isVisible={preferences.showStreetView}
            isFullscreen={false}
            onToggleFullscreen={handleStreetViewFullscreenToggle}
            className="h-full w-full cursor-pointer"
            onClick={handleStreetViewFullscreenToggle}
            mode={preferences.streetViewMode}
            isNavigating={isNavigating}
            currentRoute={currentRoute}
            nextManeuver={currentManeuver}
            onModeChange={handleStreetViewModeChange}
          />
          
          {/* Preview Panel Controls */}
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            {/* Expand Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleStreetViewFullscreenToggle();
              }}
              className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90"
              data-testid="button-expand-street-view-preview"
              title="Expand to fullscreen"
            >
              <Maximize className="w-3 h-3" />
            </Button>
            
            {/* Close Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStreetView();
              }}
              className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90"
              data-testid="button-close-street-view-preview"
              title="Close street view"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          {/* Preview Label */}
          <div className="absolute bottom-2 left-2 z-10">
            <Badge 
              variant="secondary" 
              className="text-xs bg-background/80 backdrop-blur-sm"
            >
              <Camera className="w-3 h-3 mr-1" />
              Street View
            </Badge>
          </div>
        </div>
      )}

      {/* Street View Fullscreen Overlay */}
      {isStreetViewFullscreen && streetViewPosition && (
        <div className="absolute inset-0 z-[1000] bg-background">
          {/* Street View Component in Fullscreen Mode */}
          <StreetView
            lat={streetViewPosition.lat}
            lng={streetViewPosition.lng}
            heading={streetViewHeading}
            onLocationChange={handleStreetViewLocationChange}
            onHeadingChange={handleStreetViewHeadingChange}
            isVisible={true}
            isFullscreen={true}
            onToggleFullscreen={handleStreetViewFullscreenToggle}
            className="h-full w-full"
            mode={preferences.streetViewMode}
            isNavigating={isNavigating}
            currentRoute={currentRoute}
            nextManeuver={currentManeuver}
            onModeChange={handleStreetViewModeChange}
          />
          
          {/* Fullscreen Close Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleStreetViewFullscreenToggle}
            className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90"
            data-testid="button-exit-street-view-fullscreen"
          >
            <Minimize className="w-4 h-4 mr-2" />
            Exit Fullscreen
          </Button>
          
          {/* Map Location Sync Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={updateStreetViewFromMap}
            className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90"
            data-testid="button-sync-map-location-fullscreen"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Sync Location
          </Button>
        </div>
      )}
      
      {/* Compact Layer Controls - Positioned away from toggle button */}
      {controlsVisible && (
        <div 
          className={cn(
            "absolute z-[1000] transition-all duration-300 ease-in-out",
            // Positioned at top-center, away from toggle button
            "top-16 left-1/2 transform -translate-x-1/2",
            // Compact horizontal layout to fit constrained space
            "flex items-center gap-1 h-8 px-2 bg-card/95 backdrop-blur rounded-full shadow-lg border",
            // Visible state animation
            "opacity-100 translate-y-0"
          )} 
          data-testid="map-controls-cluster"
          onMouseEnter={() => setPanelHover(true)}
          onMouseLeave={() => {
            setPanelHover(false);
            resetAutoHideTimer(); // Start fresh timer on hover end
          }}
          onPointerEnter={() => setPanelHover(true)}
          onPointerLeave={() => {
            setPanelHover(false);
            resetAutoHideTimer(); // Start fresh timer on hover end
          }}
        >
          {/* Roads */}
          <Button 
            variant={preferences.mapViewMode === 'roads' ? "default" : "ghost"}
            size="sm" 
            className="h-6 px-2 text-xs rounded-full"
            onClick={() => handleMapViewModeChange('roads')}
            data-testid="button-layer-roads"
          >
            Roads
          </Button>
          
          {/* Satellite */}
          <Button 
            variant={preferences.mapViewMode === 'satellite' ? "default" : "ghost"}
            size="sm" 
            className="h-6 px-2 text-xs rounded-full"
            onClick={() => handleMapViewModeChange('satellite')}
            data-testid="button-layer-satellite"
          >
            Sat
          </Button>
          
          {/* Truck Routes */}
          <Button 
            variant={preferences.showTruckRoutes ? "default" : "ghost"}
            size="sm" 
            className="h-6 px-2 text-xs rounded-full"
            onClick={handleToggleTruckRoutes}
            data-testid="button-layer-truck"
          >
            Truck
          </Button>
          
          {/* Traffic */}
          <Button 
            variant={preferences.showTrafficLayer ? "default" : "ghost"}
            size="sm" 
            className="h-6 px-2 text-xs rounded-full"
            onClick={handleToggleTrafficLayer}
            data-testid="button-layer-traffic"
          >
            Traffic
          </Button>
          
          {/* Incidents */}
          <Button 
            variant={preferences.showIncidents ? "default" : "ghost"}
            size="sm" 
            className="h-6 px-2 text-xs rounded-full"
            onClick={handleToggleIncidents}
            data-testid="button-layer-incidents"
          >
            Incidents
          </Button>
          
          {/* Street View */}
          <Button 
            variant={preferences.showStreetView ? "default" : "ghost"}
            size="sm" 
            className="h-6 px-2 text-xs rounded-full"
            onClick={handleToggleStreetView}
            data-testid="button-street-view"
            disabled={!import.meta.env.VITE_GOOGLE_STREET_VIEW_API_KEY}
            title={!import.meta.env.VITE_GOOGLE_STREET_VIEW_API_KEY ? "Street View requires API key configuration" : "Toggle street view"}
          >
            <Camera className="w-3 h-3 mr-1" />
            Street
          </Button>
      </div>
      )}



      {/* 4-Direction Movement Control - Fixed Event Handling */}
      <div className={cn(
        "absolute right-4 bottom-32 z-[1100]", // Control panel z-index
        "bg-card shadow-xl rounded-2xl border border-border overflow-hidden",
        "flex flex-col transition-all duration-300 pointer-events-auto",
        "opacity-100 translate-x-0",
        "w-16 h-28" // Fixed size for perfect oval shape
      )}>
        {/* Up Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-full rounded-none hover:bg-primary/10 transition-colors border-b border-border/50 touch-manipulation cursor-pointer flex items-center justify-center pointer-events-auto"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMoveUp();
          }}
          data-testid="button-move-up"
        >
          <ChevronUp className="w-5 h-5 pointer-events-none" />
        </Button>
        
        {/* Left and Right Arrows - Side by Side with Equal Split */}
        <div className="flex border-b border-border/50 h-14">
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-8 rounded-none hover:bg-primary/10 transition-colors border-r border-border/50 touch-manipulation cursor-pointer flex items-center justify-center pointer-events-auto"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleMoveLeft();
            }}
            data-testid="button-move-left"
          >
            <ChevronLeft className="w-4 h-4 pointer-events-none" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-8 rounded-none hover:bg-primary/10 transition-colors touch-manipulation cursor-pointer flex items-center justify-center pointer-events-auto"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleMoveRight();
            }}
            data-testid="button-move-right"
          >
            <ChevronRight className="w-4 h-4 pointer-events-none" />
          </Button>
        </div>
        
        {/* Down Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-full rounded-none hover:bg-primary/10 transition-colors touch-manipulation cursor-pointer flex items-center justify-center pointer-events-auto"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMoveDown();
          }}
          data-testid="button-move-down"
        >
          <ChevronDown className="w-5 h-5 pointer-events-none" />
        </Button>
      </div>
      
      {/* Auto-expansion indicator */}
      {autoExpanded && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary/90 text-primary-foreground px-4 py-2 rounded-full shadow-lg z-30">
          <span className="scalable-control-text font-medium">Map Expanded - Tap minimize to return</span>
        </div>
      )}
      
      {/* Toggle Controls Button - Always visible for easy access */}
      <Button
        variant={controlsVisible ? "default" : "outline"}
        size="icon"
        className={cn(
          "absolute bottom-28 left-1 bg-card shadow-lg z-30 transition-all duration-300 hover:scale-105",
          "min-h-[clamp(40px,10vw,48px)] min-w-[clamp(40px,10vw,48px)]",
          "touch-manipulation cursor-pointer pointer-events-auto",
          controlsVisible ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-card border-2 border-primary/20 hover:border-primary"
        )}
        onClick={() => {
          const newVisible = !controlsVisible;
          setControlsVisible(newVisible);
          manualHiddenRef.current = !newVisible; // Track manual hide state
          if (newVisible) {
            // Clear manual hidden when user explicitly shows
            manualHiddenRef.current = false;
            resetAutoHideTimer();
          }
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const newVisible = !controlsVisible;
          setControlsVisible(newVisible);
          manualHiddenRef.current = !newVisible;
          if (newVisible) {
            manualHiddenRef.current = false;
            resetAutoHideTimer();
          }
        }}
        data-testid="button-toggle-layer-controls"
        title={controlsVisible ? "Hide layer controls" : "Show layer controls"}
      >
        <Layers className="scalable-control-icon" />
      </Button>
      
      {/* Enhanced Status Bar with Auto-Hide */}
      <div className={cn(
        "absolute bottom-4 left-4 bg-card border border-border rounded px-3 py-2 shadow-lg z-[1200] transition-all duration-300",
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
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 right-4 z-[1050]">
          <NextManeuverGuidance
            currentRoute={currentRoute}
            onOpenLaneSelection={onOpenLaneSelection}
          />
        </div>
      )}

      {/* Floating Legal Disclaimer Button - Top Right Corner */}
      <div className={cn(
        "absolute z-[80] transition-all duration-300 ease-in-out pointer-events-auto",
        "top-4 right-4", // Positioned at top right corner
        "opacity-100 translate-y-0"
      )}
      onPointerDown={(e) => { e.stopPropagation(); }}>
        <Card className="overflow-hidden shadow-2xl">
          <Button
            onClick={handleToggleLegalDisclaimer}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleLegalDisclaimer();
            }}
            size="icon"
            className={cn(
              "automotive-button floating-action-button",
              "min-h-[clamp(48px,14vw,60px)] min-w-[clamp(48px,14vw,60px)]",
              "bg-white hover:bg-gray-50 text-gray-900",
              "border-2 border-red-600 hover:border-red-700",
              "shadow-xl hover:shadow-2xl transition-all duration-300 ease-out",
              "touch-manipulation cursor-pointer pointer-events-auto",
              // Visual indicator for new users who haven't accepted terms yet
              !hasAcceptedTerms && "ring-2 ring-red-400 ring-opacity-75"
            )}
            data-testid="button-legal-disclaimer"
            aria-label={isLegalDisclaimerOpen ? "Close legal disclaimer" : "Open legal disclaimer"}
          >
            <div className="relative">
              <Shield className={cn(
                "scalable-control-icon text-red-600",
                isLegalDisclaimerOpen && "rotate-45"
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
      
      {/* Speed Display - positioned at bottom center, moved left and up, below legal dialog z-index */}
      <div className="absolute bottom-[120px] left-1/2 transform -translate-x-1/2 -translate-x-20 z-[1150]">
        <SpeedDisplay 
          speedLimit={currentSpeedLimit || undefined}
          className="shadow-2xl"
        />
      </div>

      {/* Bottom Info Bar - Fixed height to prevent map covering */}
      <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-[1300]">
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
              <Button 
                size="sm" 
                data-testid="button-facility-details"
                onClick={() => handleFacilityDetails(facilities[0])}
              >
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
