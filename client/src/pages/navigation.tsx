import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Truck, X, Menu, MapPin, Settings, Search, Camera, Navigation, Navigation2, Car, AlertCircle, Compass, Box, Plus, Minus, Layers, Loader2, Crosshair, Hourglass } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from 'react-i18next';
import InteractiveMap from "@/components/map/interactive-map";
import MapLibreMap, { type MapLibreMapRef } from "@/components/map/maplibre-map";
import EnhancedRealisticMap from "@/components/map/enhanced-realistic-map";
import { useMapEngine } from "@/hooks/use-map-engine";
import ProfessionalNavHUD from "@/components/navigation/professional-nav-hud";
import NavigationSidebar from "@/components/navigation/navigation-sidebar";
import AlternativeRoutesPanel from "@/components/traffic/alternative-routes-panel";
import { ARNavigation } from "@/components/navigation/ar-navigation";
import { type VehicleProfile, type Route, type Journey, type AlternativeRoute } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useWindowSync } from "@/hooks/use-window-sync";
import { isMapWindowOpen, focusMapWindow } from "@/lib/window-manager";
import { useToast } from "@/hooks/use-toast";
import { useLiveNotifications } from "@/hooks/use-live-notifications";
import { MobileNotificationStack } from "@/components/notifications/mobile-notification-cards";
import { DNDControls } from "@/components/notifications/dnd-controls";
import { useTrafficState } from "@/hooks/use-traffic";
import { useLegalConsent } from "@/hooks/use-legal-consent";
import { useActiveVehicleProfile } from "@/hooks/use-active-vehicle-profile";
import LegalDisclaimerPopup from "@/components/legal/legal-disclaimer-popup";
import MapLegalOwnership from "@/components/legal/map-legal-ownership";
import SettingsModal from "@/components/settings/settings-modal";
import LaneGuidancePopup from "@/components/navigation/lane-guidance-popup";
import { overlayInspector } from "@/lib/overlay-inspector";
import { useAndroidBackHandlerWithPriority } from "@/hooks/use-android-back-handler";
import { MapShell } from "@/components/map/map-shell";
import { MobileFAB } from "@/components/navigation/mobile-fab";
import { CompactTripStrip } from "@/components/navigation/compact-trip-strip";
import { SimplifiedRouteDrawer } from "@/components/navigation/simplified-route-drawer";
import TurnIndicator from "@/components/navigation/turn-indicator";
import { IncidentReportDialog } from "@/components/incidents/incident-report-dialog";
import { IncidentFeed } from "@/components/incidents/incident-feed";
import IncidentFeedPopup from "@/components/incidents/incident-feed-popup";
import SpeedDisplay from "@/components/map/speed-display";
import SpeedometerHUD from "@/components/navigation/speedometer-hud";
import { GPSProvider, useGPS } from "@/contexts/gps-context";
import { reverseGeocode, formatCoordinatesAsAddress } from "@/lib/reverse-geocode";
import { geocodeUKPostcode } from "@/lib/uk-postcode-geocoding";
import { looksLikePostcode, detectPostcodeCountry } from "@/lib/postcode-utils";
import { useMeasurement } from "@/components/measurement/measurement-provider";

// Inner component that uses GPS context
function NavigationPageContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { mapEngine, toggleMapEngine, isMapLibre } = useMapEngine();
  
  // Get GPS data from singleton provider
  const gpsData = useGPS();
  
  // Get user measurement preference (mi/km)
  const { system: measurementSystem } = useMeasurement();
  
  // Use centralized vehicle profile management
  const { activeProfile, activeProfileId, isLoading: profileLoading, setActiveProfile } = useActiveVehicleProfile();
  const [selectedProfile, setSelectedProfile] = useState<VehicleProfile | null>(activeProfile);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [fromCoordinates, setFromCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [toCoordinates, setToCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [routePreference, setRoutePreference] = useState<'fastest' | 'eco' | 'avoid_tolls'>('fastest');
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLaneGuidance, setShowLaneGuidance] = useState(false);
  
  // Unified sidebar state management - single source of truth
  const [sidebarState, setSidebarState] = useState<'closed' | 'open' | 'collapsed'>(
    isMobile ? 'closed' : 'open'
  );
  
  // Computed states for backward compatibility
  const isSidebarOpen = sidebarState !== 'closed';
  const isSidebarCollapsed = sidebarState === 'collapsed';
  // Fixed: Only open mobile drawer when sidebarState is explicitly 'open'
  const isMobileDrawerOpen = isMobile && sidebarState === 'open';
  
  
  // Map expansion state
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  
  // Removed legacy isDrawerOpen - now using sidebarState as single source of truth
  
  // Alternative routes panel state
  const [isAlternativeRoutesOpen, setIsAlternativeRoutesOpen] = useState(false);
  const [previewRoute, setPreviewRoute] = useState<AlternativeRoute | null>(null);
  const [selectedAlternativeRouteId, setSelectedAlternativeRouteId] = useState<string | null>(null);
  const [isApplyingRoute, setIsApplyingRoute] = useState(false);
  
  
  
  // Window sync for cross-window communication
  const windowSync = useWindowSync();
  
  // Legal consent state - for automatic popup display
  const { hasAcceptedTerms, isLoading: isConsentLoading } = useLegalConsent();
  
  // AR Navigation state
  const [isARMode, setIsARMode] = useState(false);
  const [arSupported, setARSupported] = useState(false);
  
  // Settings modal state - moved from NavigationSidebar to prevent closure with sidebar/drawer
  const [showVehicleSettings, setShowVehicleSettings] = useState(false);
  
  // Current road name from GPS position (for speedometer display)
  const [currentRoadName, setCurrentRoadName] = useState<string | null>(null);
  
  // Enhanced road info state
  const [roadInfo, setRoadInfo] = useState<{
    confidence: 'high' | 'medium' | 'low' | 'none';
    roadRef: string | null;
    junction: { name: string | null; ref: string | null; exitTo: string | null } | null;
    destination: string | null;
  } | null>(null);
  
  // Traffic and Incidents toggle state for mobile
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  
  // Incident reporting dialog state
  const [showIncidentReportDialog, setShowIncidentReportDialog] = useState(false);
  
  // Incident feed drawer state
  const [showIncidentFeed, setShowIncidentFeed] = useState(false);
  const [hasInteractedWithIncidentFeed, setHasInteractedWithIncidentFeed] = useState(false);
  
  // Professional navigation state
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentSpeedLimit, setCurrentSpeedLimit] = useState<number | null>(null);
  
  // Destination reached state
  const [showDestinationReached, setShowDestinationReached] = useState(false);
  const hasShownDestinationDialogRef = useRef(false);
  
  // Turn-by-turn navigation state
  const [nextTurn, setNextTurn] = useState<{
    direction: 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left';
    distance: number; // in meters
    roadName?: string;
  } | null>(null);
  
  // Get real GPS location from singleton GPS provider (no more duplicate watchers!)
  const currentGPSLocation = gpsData?.position ? {
    lat: gpsData.position.latitude,
    lng: gpsData.position.longitude
  } : undefined;
  
  const [professionalVoiceEnabled, setProfessionalVoiceEnabled] = useState(true);
  const [isFullscreenNav, setIsFullscreenNav] = useState(false);
  
  // Mobile navigation mode state - clean 3-mode workflow
  type MobileNavMode = 'plan' | 'preview' | 'navigate';
  const [mobileNavMode, setMobileNavMode] = useState<MobileNavMode>('plan');
  
  // Mode transition debouncing to prevent race conditions
  const modeTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setMobileNavModeDebounced = useCallback((newMode: MobileNavMode) => {
    // Clear any pending transition
    if (modeTransitionTimeoutRef.current) {
      clearTimeout(modeTransitionTimeoutRef.current);
    }

    // Prevent rapid mode changes (50ms debounce)
    modeTransitionTimeoutRef.current = setTimeout(() => {
      setMobileNavMode(newMode);
      console.log(`[NAV-MODE] Transition to ${newMode} mode completed`);
    }, 50);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modeTransitionTimeoutRef.current) {
        clearTimeout(modeTransitionTimeoutRef.current);
      }
    };
  }, []);
  
  // Map reference for compass and 3D tilt control
  const mapRef = useRef<MapLibreMapRef>(null);
  const [mapBearing, setMapBearing] = useState(0);
  const [map3DMode, setMap3DMode] = useState(false);
  const [mapViewMode, setMapViewMode] = useState<'roads' | 'satellite'>('roads');
  
  // GPS loading state for visual feedback during auto-zoom
  const [gpsLoadingState, setGpsLoadingState] = useState<{
    isLoading: boolean;
    attempt: number;
    maxAttempts: number;
    accuracyLevel?: string;
  } | null>(null);
  
  // Cache warning state for user awareness
  const [cacheWarningShown, setCacheWarningShown] = useState(false);
  
  // Enhanced auto-zoom state tracking with retry logic and user preference support
  // To disable auto-zoom: localStorage.setItem('trucknav_auto_zoom_enabled', 'false')
  // To re-enable: localStorage.setItem('trucknav_auto_zoom_enabled', 'true') or localStorage.removeItem('trucknav_auto_zoom_enabled')
  const autoZoomState = useRef<{
    attempted: boolean;
    succeeded: boolean;
    attempts: number;
    lastAttemptTime: number | null;
  }>({
    attempted: false,
    succeeded: false,
    attempts: 0,
    lastAttemptTime: null,
  });

  // Centralized UI error recovery helper - ensures consistent state after failures
  const recoverUIOnError = () => {
    // NEVER auto-reset sidebar based on screen size - preserve user choice
    // Only ensure it's not completely closed
    if (sidebarState === 'closed') {
      setSidebarState('collapsed');
    }
    setIsMapExpanded(false);         // Collapse any expanded map to prevent overlay conflicts
    setIsAlternativeRoutesOpen(false); // Close alternative routes panel
    setPreviewRoute(null);           // Clear alternative route preview
    setIsApplyingRoute(false);       // Reset route application state
    // Reset navigation flags to safe defaults
    setIsFullscreenNav(false);       // Exit fullscreen nav mode
    setIsARMode(false);              // Exit AR mode
    // Mobile drawer now follows sidebarState automatically
  };

  // Initialize sidebar state ONCE on mount - never auto-reset based on screen size
  useEffect(() => {
    // Load user preference from localStorage, or use sensible defaults
    const savedSidebarState = localStorage.getItem('navigationSidebarState');
    if (savedSidebarState && ['open', 'collapsed'].includes(savedSidebarState)) {
      setSidebarState(savedSidebarState as 'open' | 'collapsed');
    } else {
      // Initial default based on screen size, but never override user choice again
      setSidebarState(isMobile ? 'collapsed' : 'open');
    }
  }, []); // Remove isMobile dependency to prevent auto-reset

  
  // Check AR support on component mount (no auto-location to keep boxes empty)
  useEffect(() => {
    const checkARSupport = async () => {
      try {
        const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        const hasOrientation = 'DeviceOrientationEvent' in window;
        const hasCamera = await navigator.mediaDevices.enumerateDevices()
          .then(devices => devices.some(device => device.kind === 'videoinput'))
          .catch(() => false);
        
        setARSupported(hasMediaDevices && hasOrientation && hasCamera);
      } catch (error) {
        console.warn('AR support check failed:', error);
        setARSupported(false);
      }
    };
    
    checkARSupport();
  }, []);
  
  // Fetch enhanced speed limit and road info when GPS position changes
  useEffect(() => {
    if (!gpsData?.position) {
      setCurrentSpeedLimit(null);
      setRoadInfo(null);
      return;
    }
    
    const { latitude, longitude } = gpsData.position;
    
    // Debounce road info requests (only fetch every 5 seconds)
    const fetchRoadInfo = async () => {
      try {
        const response = await fetch(`/api/speed-limit?lat=${latitude}&lng=${longitude}`);
        if (response.ok) {
          const data = await response.json();
          
          // Update speed limit
          if (data.speedLimit) {
            setCurrentSpeedLimit(data.speedLimit);
          } else {
            setCurrentSpeedLimit(null);
          }
          
          // Update enhanced road info
          setRoadInfo({
            confidence: data.confidence || 'none',
            roadRef: data.roadRef,
            junction: data.junction,
            destination: data.destination
          });
          
          console.log(`[ROAD-INFO] ${data.speedLimit || 'No'} km/h (${data.confidence}) on ${data.roadRef || data.roadName || 'road'}${data.junction?.ref ? ` - Junction ${data.junction.ref}` : ''}`);
        }
      } catch (error) {
        console.warn('[ROAD-INFO] Lookup failed:', error);
      }
    };
    
    // Fetch immediately, then set up interval
    fetchRoadInfo();
    const intervalId = setInterval(fetchRoadInfo, 5000); // Update every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [gpsData?.position?.latitude, gpsData?.position?.longitude]);
  
  // Calculate next turn from route and GPS position
  useEffect(() => {
    if (!isNavigating || !currentRoute || !gpsData?.position) {
      setNextTurn(null);
      return;
    }

    // Helper: Calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const toRadians = (deg: number) => deg * (Math.PI / 180);
      const R = 6371000; // Earth's radius in meters
      
      const dLat = toRadians(lat2 - lat1);
      const dLng = toRadians(lng2 - lng1);
      
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      
      return R * c; // Distance in meters
    };

    const { latitude, longitude } = gpsData.position;

    // Try to get next turn from laneGuidance first
    if (currentRoute.laneGuidance && currentRoute.laneGuidance.length > 0) {
      // Find the next upcoming maneuver based on GPS position
      for (const segment of currentRoute.laneGuidance) {
        // Calculate distance to this maneuver (convert miles to meters)
        const distanceToManeuver = segment.distance * 1609.34;
        
        // If this maneuver is ahead (within reasonable navigation distance)
        if (distanceToManeuver > 10 && distanceToManeuver < 10000) { // 10m to 10km
          // Map maneuver type to turn direction
          let direction: 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left' = 'straight';
          
          switch (segment.maneuverType) {
            case 'turn-left':
              direction = 'left';
              break;
            case 'turn-right':
              direction = 'right';
              break;
            case 'straight':
            case 'merge':
              direction = 'straight';
              break;
            default:
              direction = 'straight';
          }
          
          setNextTurn({
            direction,
            distance: distanceToManeuver,
            roadName: segment.roadName
          });
          return;
        }
      }
    }

    // Fallback: Calculate next turn from route waypoints
    if (currentRoute.routePath && currentRoute.routePath.length > 1) {
      let closestWaypointIndex = -1;
      let minDistance = Infinity;

      // Find closest waypoint ahead
      currentRoute.routePath.forEach((waypoint, index) => {
        const distance = calculateDistance(latitude, longitude, waypoint.lat, waypoint.lng);
        if (distance < minDistance && distance > 10) { // Must be ahead (>10m)
          minDistance = distance;
          closestWaypointIndex = index;
        }
      });

      // If we found a waypoint ahead, calculate turn direction
      if (closestWaypointIndex >= 0 && closestWaypointIndex < currentRoute.routePath.length - 1) {
        const currentWaypoint = currentRoute.routePath[closestWaypointIndex];
        const nextWaypoint = currentRoute.routePath[closestWaypointIndex + 1];
        
        // Calculate bearing change to determine turn direction
        const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
          const toRadians = (deg: number) => deg * (Math.PI / 180);
          const toDegrees = (rad: number) => rad * (180 / Math.PI);
          
          const dLng = toRadians(lng2 - lng1);
          const y = Math.sin(dLng) * Math.cos(toRadians(lat2));
          const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
                    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLng);
          
          return toDegrees(Math.atan2(y, x));
        };

        const currentBearing = calculateBearing(latitude, longitude, currentWaypoint.lat, currentWaypoint.lng);
        const nextBearing = calculateBearing(currentWaypoint.lat, currentWaypoint.lng, nextWaypoint.lat, nextWaypoint.lng);
        
        let turnAngle = nextBearing - currentBearing;
        // Normalize to [-180, 180]
        while (turnAngle > 180) turnAngle -= 360;
        while (turnAngle < -180) turnAngle += 360;

        let direction: 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left' = 'straight';
        
        if (Math.abs(turnAngle) < 15) {
          direction = 'straight';
        } else if (turnAngle < -60) {
          direction = 'sharp_left';
        } else if (turnAngle < -15) {
          direction = 'slight_left';
        } else if (turnAngle > 60) {
          direction = 'sharp_right';
        } else if (turnAngle > 15) {
          direction = 'slight_right';
        }

        setNextTurn({
          direction,
          distance: minDistance,
          roadName: undefined // No road name from waypoints
        });
      }
    }
  }, [isNavigating, currentRoute, gpsData?.position]);
  
  // Detect when destination is reached
  useEffect(() => {
    // Only check during active navigation
    if (!isNavigating || !currentRoute || !gpsData?.position || hasShownDestinationDialogRef.current) {
      return;
    }
    
    // Get destination coordinates (last point in route)
    const destination = currentRoute.routePath?.[currentRoute.routePath.length - 1];
    if (!destination) return;
    
    const { latitude, longitude } = gpsData.position;
    
    // Calculate distance to destination using Haversine formula
    const toRadians = (deg: number) => deg * (Math.PI / 180);
    const R = 6371000; // Earth's radius in meters
    
    const lat1 = toRadians(latitude);
    const lat2 = toRadians(destination.lat);
    const deltaLat = toRadians(destination.lat - latitude);
    const deltaLng = toRadians(destination.lng - longitude);
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters
    
    // If within 50 meters of destination, show dialog
    if (distance <= 50) {
      console.log(`[DESTINATION] Reached! Distance: ${distance.toFixed(1)}m`);
      setShowDestinationReached(true);
      hasShownDestinationDialogRef.current = true;
    }
  }, [isNavigating, currentRoute, gpsData?.position]);
  
  // Enhanced auto-zoom to GPS location with user preferences, map readiness polling, and retry logic
  useEffect(() => {
    // 1. CHECK USER PREFERENCE - respect user's auto-zoom setting
    const autoZoomEnabled = localStorage.getItem('trucknav_auto_zoom_enabled');
    if (autoZoomEnabled === 'false') {
      console.log('[AUTO-ZOOM] Disabled by user preference (trucknav_auto_zoom_enabled=false)');
      return;
    }
    
    // 2. CHECK IF ALREADY SUCCEEDED - prevent duplicate zoom operations
    if (autoZoomState.current.succeeded) {
      return;
    }
    
    // 3. CHECK MAX ATTEMPTS - prevent infinite retries (max 2 attempts)
    const MAX_ATTEMPTS = 2;
    if (autoZoomState.current.attempts >= MAX_ATTEMPTS) {
      console.warn(`[AUTO-ZOOM] Max attempts (${MAX_ATTEMPTS}) reached, giving up`);
      return;
    }
    
    // 4. CHECK GPS AVAILABILITY - need GPS position to zoom
    if (!gpsData?.position) {
      return; // Wait for GPS lock
    }
    
    // 5. CHECK MAP REFERENCE - map component must be mounted
    if (!mapRef.current) {
      return; // Wait for map to mount
    }
    
    // 6. SKIP IF NAVIGATING - navigation has its own zoom logic
    if (isNavigating) {
      return;
    }
    
    // 7. SKIP IF ROUTE PLANNED - don't interfere with route planning
    if (currentRoute) {
      return;
    }
    
    // 8. THROTTLE RETRY ATTEMPTS - prevent rapid retry loops
    const now = Date.now();
    if (autoZoomState.current.lastAttemptTime) {
      const timeSinceLastAttempt = now - autoZoomState.current.lastAttemptTime;
      const MIN_RETRY_INTERVAL = 2000; // 2 seconds between attempts
      if (timeSinceLastAttempt < MIN_RETRY_INTERVAL) {
        return;
      }
    }
    
    // All pre-flight checks passed - attempt auto-zoom
    const attemptNumber = autoZoomState.current.attempts + 1;
    console.log(`[AUTO-ZOOM] Starting attempt ${attemptNumber}/${MAX_ATTEMPTS}`);
    
    // Update attempt tracking
    autoZoomState.current.attempted = true;
    autoZoomState.current.attempts = attemptNumber;
    autoZoomState.current.lastAttemptTime = now;
    
    // 9. MAP READINESS POLLING - wait for map to be fully loaded
    const waitForMapReady = async (maxAttempts = 10, interval = 200): Promise<boolean> => {
      for (let i = 0; i < maxAttempts; i++) {
        // Check if map instance exists and style is loaded
        const mapInstance = mapRef.current?.getMap();
        if (mapInstance && mapInstance.isStyleLoaded()) {
          console.log(`[AUTO-ZOOM] Map ready after ${i + 1} polls (${(i + 1) * interval}ms)`);
          return true;
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      
      console.warn(`[AUTO-ZOOM] Map readiness timeout after ${maxAttempts * interval}ms`);
      return false;
    };
    
    // 10. PERFORM AUTO-ZOOM WITH RETRY SUPPORT
    const performAutoZoom = async () => {
      try {
        // Wait for map to be ready
        const isMapReady = await waitForMapReady(10, 200); // 10 attempts x 200ms = 2 seconds max
        
        if (!isMapReady) {
          console.warn('[AUTO-ZOOM] Map not ready, will retry on next GPS update');
          return;
        }
        
        // Map is ready - perform zoom
        console.log('[AUTO-ZOOM] GPS lock detected, zooming to user location...');
        
        // Show loading indicator
        setGpsLoadingState({
          isLoading: true,
          attempt: 1,
          maxAttempts: 4
        });
        
        mapRef.current?.zoomToUserLocation({
          forceStreetMode: false,  // Respect user's map view preference
          zoom: 17.5,              // Street-level zoom for good context
          pitch: 45,               // 3D tilt for better spatial awareness
          duration: 2000,          // Smooth 2-second animation
          onSuccess: (location) => {
            // SUCCESS - mark as completed
            autoZoomState.current.succeeded = true;
            
            // Clear loading state
            setGpsLoadingState(null);
            
            // Check if this is a cached position (no accuracy or old timestamp)
            const isCachedPosition = !location.accuracy || (location.timestamp && (Date.now() - location.timestamp) > 60000);
            
            if (isCachedPosition && !cacheWarningShown) {
              // REMOVED TOAST: No popups per user request
              setCacheWarningShown(true);
            } else if (!isCachedPosition) {
              setCacheWarningShown(false); // Reset when live GPS works
              
              const accuracyText = location.accuracyLevel === 'excellent' ? '📍 Excellent accuracy' :
                                  location.accuracyLevel === 'good' ? '📍 Good accuracy' :
                                  '📍 Position locked';
              
              // REMOVED TOAST: No popups per user request
            }
            
            console.log(`[AUTO-ZOOM] ✅ SUCCESS - Centered at ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} (attempt ${attemptNumber}/${MAX_ATTEMPTS})`);
          },
          onError: (error, usedFallback) => {
            // Clear loading state
            setGpsLoadingState(null);
            
            // ERROR - handle different error types with user-friendly messages
            if ('code' in error) {
              const gpsError = error as GeolocationPositionError;
              if (gpsError.code === GeolocationPositionError.PERMISSION_DENIED) {
                console.warn('[AUTO-ZOOM] ❌ GPS permission denied - auto-zoom disabled');
                // Permanent failure - stop retrying
                autoZoomState.current.attempts = MAX_ATTEMPTS;
                
                // REMOVED TOAST: No popups per user request
              } else if (gpsError.code === GeolocationPositionError.TIMEOUT) {
                console.warn(`[AUTO-ZOOM] ⚠️ GPS timeout (attempt ${attemptNumber}/${MAX_ATTEMPTS})`);
                
                if (usedFallback) {
                  // REMOVED TOAST: No popups per user request
                }
              } else {
                console.warn(`[AUTO-ZOOM] ⚠️ GPS error code ${gpsError.code} (attempt ${attemptNumber}/${MAX_ATTEMPTS})`);
                
                if (usedFallback) {
                  // REMOVED TOAST: No popups per user request
                }
              }
            } else {
              console.warn(`[AUTO-ZOOM] ⚠️ Error: ${error.message} (attempt ${attemptNumber}/${MAX_ATTEMPTS})`);
            }
            
            // If this was the last attempt, show optional user feedback
            if (attemptNumber >= MAX_ATTEMPTS && !usedFallback) {
              console.error('[AUTO-ZOOM] ❌ Failed after all retry attempts');
            }
          },
          onRetry: (currentAttempt, maxAttempts) => {
            // Update loading state with retry info
            setGpsLoadingState({
              isLoading: true,
              attempt: currentAttempt,
              maxAttempts: maxAttempts
            });
            
            console.log(`[AUTO-ZOOM] 🔄 Retry ${currentAttempt}/${maxAttempts}`);
          }
        });
      } catch (error) {
        console.error('[AUTO-ZOOM] Unexpected error during auto-zoom:', error);
      }
    };
    
    // Execute auto-zoom
    performAutoZoom();
    
  }, [gpsData?.position, isNavigating, currentRoute]); // Re-run when GPS becomes available or state changes
  
  // Auto-update mobile navigation mode based on state
  // IMPORTANT: Only auto-switch when appropriate, don't interrupt user interactions
  useEffect(() => {
    if (!isMobile) return; // Only applies to mobile
    
    if (isNavigating) {
      // Always switch to navigate mode when navigation starts
      setMobileNavModeDebounced('navigate');
    } else if (!currentRoute && mobileNavMode !== 'plan') {
      // Only switch to plan mode if no route AND not already in plan mode
      setMobileNavModeDebounced('plan');
    }
    // REMOVED: Auto-switch to preview when route exists - this was interrupting user input
    // The route calculation onSuccess handler will explicitly set preview mode when needed
  }, [isMobile, isNavigating, currentRoute, setMobileNavModeDebounced, mobileNavMode]);
  
  // Forcefully close sidebar/drawer when navigation starts - CRITICAL for UI consistency
  useEffect(() => {
    if (isNavigating) {
      setSidebarState('collapsed');
    }
  }, [isNavigating]);
  
  // Force 3D navigation view when navigation starts with GPS lock
  const hasInitialized3DRef = useRef(false);
  
  useEffect(() => {
    if (isNavigating && gpsData?.position && !hasInitialized3DRef.current && mapRef.current) {
      hasInitialized3DRef.current = true;

      // Get bearing from GPS (use smoothedHeading for smoother rotation, fallback to heading)
      const gpsBearing = gpsData.position.smoothedHeading ?? gpsData.position.heading ?? 0;

      // Force 3D perspective with GPS-aligned bearing
      mapRef.current.zoomToUserLocation({
        pitch: 67,
        zoom: 18.5,
        bearing: gpsBearing,
        duration: 1500,
        onSuccess: (location) => {
          setMap3DMode(true);
        },
        onError: (error) => {
          // Still set 3D mode flag even if zoom fails
          setMap3DMode(true);
        }
      });

      // Set 3D mode flag immediately
      setMap3DMode(true);
    }
    
    if (!isNavigating) {
      hasInitialized3DRef.current = false;
    }
  }, [isNavigating, gpsData?.position]);
  
  // Automated visibility check for speedometer during navigation
  useEffect(() => {
    if (mobileNavMode !== 'navigate') return;

    const checkSpeedometerVisibility = () => {
      const speedometer = document.querySelector('[data-testid="speed-display-navigate"]');
      if (!speedometer) {
        console.error('[NAV-MODE] CRITICAL: Speedometer not found in navigate mode!');
        // Attempt recovery by forcing re-render
        setMobileNavModeDebounced('navigate');
      } else {
        console.log('[NAV-MODE] ✓ Speedometer visibility confirmed');
      }
    };

    // Check every 3 seconds during navigation
    const interval = setInterval(checkSpeedometerVisibility, 3000);

    return () => clearInterval(interval);
  }, [mobileNavMode, setMobileNavModeDebounced]);
  
  // Real-time bearing rotation during navigation
  useEffect(() => {
    const updateBearing = () => {
      if (mapRef.current && isNavigating && gpsData?.position?.smoothedHeading !== null && gpsData?.position?.smoothedHeading !== undefined) {
        try {
          const mapInstance = mapRef.current.getMap();
          if (!mapInstance) return;

          const currentBearing = mapRef.current.getBearing();
          const targetBearing = gpsData.position.smoothedHeading;
          
          // Only update if significant change (>5 degrees) to prevent jitter
          let delta = targetBearing - currentBearing;
          
          // Normalize delta to [-180, 180] for shortest rotation path
          while (delta > 180) delta -= 360;
          while (delta < -180) delta += 360;
          
          const normalizedDelta = Math.abs(delta);
          
          if (normalizedDelta > 5) {
            mapInstance.easeTo({
              bearing: targetBearing,
              duration: 500,
              easing: (t) => t * (2 - t)
            });
          }
          
          setMapBearing(targetBearing);
        } catch (err) {
          console.error('[NAV] Bearing update failed:', err);
        }
      } else if (mapRef.current) {
        // When not navigating, just track the current bearing for compass display
        const bearing = mapRef.current.getBearing();
        setMapBearing(bearing);
      }
    };

    const interval = setInterval(updateBearing, 500);
    
    return () => clearInterval(interval);
  }, [isNavigating, gpsData?.position?.smoothedHeading]);
  
  // Extract current road name from GPS position for speedometer display
  useEffect(() => {
    // Only get road name during active navigation
    if (!isNavigating || !gpsData?.position) {
      setCurrentRoadName(null);
      return;
    }
    
    const { latitude, longitude } = gpsData.position;
    let isCancelled = false;
    
    // Debounce road name updates (every 5 seconds to avoid API spam)
    const updateRoadName = async () => {
      try {
        const result = await reverseGeocode(latitude, longitude, 3000);
        
        if (isCancelled) return;
        
        if (result.success && result.fullData?.properties) {
          const props = result.fullData.properties;
          
          // Extract road name in priority order:
          // 1. Motorway/Highway reference (M25, A1, I-95, etc.)
          // 2. Street name
          // 3. Name of location
          let roadName: string | null = null;
          
          // Check for motorway/highway reference in road name
          if (props.street) {
            // UK Motorways (M1, M25, etc.) and A-roads (A1, A40, etc.)
            const ukMotorwayMatch = props.street.match(/\b(M\d+|A\d+M?)\b/);
            // US Interstates (I-95, I-5, etc.) and Highways (US-1, Route 66, etc.)
            const usHighwayMatch = props.street.match(/\b(I-\d+|US-\d+|Route\s+\d+)\b/i);
            // European routes (E40, E75, etc.)
            const euroRouteMatch = props.street.match(/\bE\d+\b/);
            
            if (ukMotorwayMatch) {
              roadName = ukMotorwayMatch[0];
            } else if (usHighwayMatch) {
              roadName = usHighwayMatch[0].toUpperCase();
            } else if (euroRouteMatch) {
              roadName = euroRouteMatch[0];
            } else {
              roadName = props.street;
            }
          } else if (props.name) {
            roadName = props.name;
          }
          
          setCurrentRoadName(roadName);
        } else {
          setCurrentRoadName(null);
        }
      } catch (error) {
        console.error('[ROAD-NAME] Failed to get road name:', error);
        setCurrentRoadName(null);
      }
    };
    
    // Initial update
    updateRoadName();
    
    // Update every 5 seconds during navigation
    const interval = setInterval(updateRoadName, 5000);
    
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isNavigating, gpsData?.position?.latitude, gpsData?.position?.longitude]);
  
  // Handle AR mode toggle
  const handleToggleAR = useCallback(() => {
    
    if (!arSupported) {
      // REMOVED TOAST: No popups per user request
      return;
    }
    
    if (!isNavigating) {
      // REMOVED TOAST: No popups per user request
      return;
    }
    
    setIsARMode(!isARMode);
    
    if (!isARMode) {
      // REMOVED TOAST: No popups per user request
    } else {
      // REMOVED TOAST: No popups per user request
    }
  }, [arSupported, isNavigating, isARMode, toast]);

  // Live notifications system with mobile enhancements - with error handling
  const liveNotifications = useLiveNotifications({
    currentRoute,
    selectedProfile,
    isNavigating,
    enabled: true, // Always enabled for live updates
  });
  
  // Safely destructure with fallbacks to prevent crashes
  const {
    triggerLiveNotification = () => console.warn('triggerLiveNotification not available'),
    isActive: notificationsActive = false,
    activeNotifications = [],
    dismissNotification = () => console.warn('dismissNotification not available'),
    dndState = { enabled: false, allowCritical: true, allowSafety: true, autoEnableOnNavigation: true },
    updateDndState = () => console.warn('updateDndState not available'),
    voiceEnabled = false,
    setVoiceEnabled = () => console.warn('setVoiceEnabled not available'),
    queueLength = 0,
    getNotificationIcon = () => null,
  } = liveNotifications || {};

  // Get traffic state for current route - including alternative routes
  const {
    alternatives = [],
    shouldReroute,
    bestAlternative,
    timeSavingsAvailable,
    rerouteReason,
    isLoadingAlternatives,
  } = useTrafficState(currentRoute?.id || null, activeProfile);

  // Get vehicle profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery<VehicleProfile[]>({
    queryKey: ["/api/vehicle-profiles"],
  });

  // Get current active journey
  const { data: currentJourney, refetch: refetchCurrentJourney } = useQuery<Journey | null>({
    queryKey: ["/api/journeys", "active"],
    queryFn: async () => {
      // Check URL parameter first for journey ID
      const urlParams = new URLSearchParams(window.location.search);
      const urlJourneyId = urlParams.get('journey');
      
      if (urlJourneyId) {
        // Load journey from URL parameter
        const response = await apiRequest("GET", `/api/journeys/${urlJourneyId}`);
        const journey = await response.json();
        
        // CRITICAL: Only load active/planned journeys, clear completed ones
        if (journey && (journey.status === 'active' || journey.status === 'planned')) {
          // Store in localStorage for future use
          localStorage.setItem('activeJourneyId', journey.id);
          return journey;
        } else {
          // Clear completed/cancelled journey from URL
          console.log('[JOURNEY-CLEAR] Clearing completed journey from URL:', urlJourneyId);
          const url = new URL(window.location.href);
          url.searchParams.delete('journey');
          window.history.replaceState({}, '', url.pathname);
          localStorage.removeItem('activeJourneyId');
          return null;
        }
      }
      
      // Check if we have an active journey in localStorage
      const storedJourneyId = localStorage.getItem('activeJourneyId');
      if (storedJourneyId) {
        const response = await apiRequest("GET", `/api/journeys/${storedJourneyId}`);
        const journey = await response.json();
        if (journey.status === 'active' || journey.status === 'planned') {
          return journey;
        } else {
          // Clean up completed/cancelled journey from localStorage
          localStorage.removeItem('activeJourneyId');
        }
      }
      return null;
    },
    enabled: true,
    refetchInterval: isNavigating ? 5000 : false, // Refetch every 5 seconds during navigation
  });

  // Sync selectedProfile with activeProfile from centralized hook
  useEffect(() => {
    if (activeProfile) {
      setSelectedProfile(activeProfile);
    }
  }, [activeProfile]);

  // Sync active journey with current journey from query
  useEffect(() => {
    if (currentJourney) {
      // CRITICAL: Only load active or planned journeys - ignore completed ones
      if (currentJourney.status === 'completed' || currentJourney.status === 'cancelled') {
        console.log('[JOURNEY-LOAD] Ignoring completed/cancelled journey - clearing persistence');
        localStorage.removeItem('activeJourneyId');
        
        // Clear URL parameter
        const url = new URL(window.location.href);
        if (url.searchParams.has('journey')) {
          url.searchParams.delete('journey');
          window.history.replaceState({}, '', url.pathname);
        }
        
        // CRITICAL: Clear the route from the map!
        setCurrentRoute(null);
        setActiveJourney(null);
        setFromLocation('');
        setToLocation('');
        setFromCoordinates(null);
        setToCoordinates(null);
        return;
      }
      
      setActiveJourney(currentJourney);
      
      // CRITICAL FIX: Load the route data from the journey's routeId
      if (currentJourney.routeId) {
        console.log('[JOURNEY-LOAD] Journey has routeId, fetching route:', currentJourney.routeId);
        // Fetch the route using the routeId
        fetch(`/api/routes/${currentJourney.routeId}`)
          .then(res => res.json())
          .then(route => {
            console.log('[JOURNEY-LOAD] Loading route from journey:', route);
            setCurrentRoute(route);
            
            // CRITICAL FIX: Populate location fields from route data
            if (route.startLocation) {
              setFromLocation(route.startLocation);
              if (route.startCoordinates) {
                setFromCoordinates(route.startCoordinates);
              }
            }
            if (route.endLocation) {
              setToLocation(route.endLocation);
              if (route.endCoordinates) {
                setToCoordinates(route.endCoordinates);
              }
            }
          })
          .catch(err => {
            console.error('[JOURNEY-LOAD] Failed to fetch route:', err);
          });
      }
      
      // Note: Don't automatically start navigation even if status is 'active'
      // User should manually click "Start Navigation" to begin
    } else {
      // No journey - ensure clean state
      console.log('[JOURNEY-LOAD] No journey - ensuring clean state');
      setCurrentRoute(null);
      setActiveJourney(null);
    }
  }, [currentJourney]);

  // Handle page refresh - restore navigation state
  useEffect(() => {
    const storedJourneyId = localStorage.getItem('activeJourneyId');
    if (storedJourneyId && !activeJourney) {
      refetchCurrentJourney();
    }
  }, []);

  // Android hardware back button handling for professional truck navigation
  useAndroidBackHandlerWithPriority(() => {
    // Handle different UI states with priority order
    
    // Highest priority: Close critical modals/popups
    if (showVehicleSettings) {
      setShowVehicleSettings(false);
      console.log('🔙 Android back: Closed vehicle settings');
      return true;
    }
    
    // High priority: Close incident feed popup
    if (showIncidentFeed) {
      setShowIncidentFeed(false);
      setHasInteractedWithIncidentFeed(false);
      console.log('🔙 Android back: Closed incident feed');
      return true;
    }
    
    // High priority: Exit special navigation modes
    if (isARMode) {
      setIsARMode(false);
      // REMOVED TOAST: No popups per user request
      console.log('🔙 Android back: Exited AR mode');
      return true;
    }
    
    if (isFullscreenNav) {
      setIsFullscreenNav(false);
      console.log('🔙 Android back: Exited fullscreen navigation');
      return true;
    }
    
    // Medium priority: Close panels and overlays
    if (isAlternativeRoutesOpen) {
      setIsAlternativeRoutesOpen(false);
      setPreviewRoute(null);
      console.log('🔙 Android back: Closed alternative routes panel');
      return true;
    }
    
    if (isMapExpanded) {
      setIsMapExpanded(false);
      console.log('🔙 Android back: Collapsed expanded map');
      return true;
    }
    
    // Lower priority: Sidebar management for mobile
    if (isMobile && sidebarState === 'open') {
      setSidebarState('collapsed');
      console.log('🔙 Android back: Closed mobile sidebar');
      return true;
    }
    
    // Professional truck navigation: Don't exit app during navigation
    if (isNavigating) {
      // REMOVED TOAST: No popups per user request
      console.log('🔙 Android back: Prevented exit during navigation');
      return true;
    }
    
    // Allow normal back behavior when no special state is active
    console.log('🔙 Android back: Allowing normal navigation');
    return false;
  }, 100, true); // High priority handler

  // Journey mutations
  const activateJourneyMutation = useMutation({
    mutationFn: async ({ journeyId, idempotencyKey }: { journeyId: number; idempotencyKey: string }) => {
      const response = await apiRequest("PATCH", `/api/journeys/${journeyId}/activate`, {}, { idempotencyKey });
      return response.json();
    },
    onSuccess: (journey) => {
      setActiveJourney(journey);
      setIsNavigating(true);
      localStorage.setItem('activeJourneyId', journey.id.toString());
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      refetchCurrentJourney();
    },
    onError: (error) => {
      console.error('Failed to activate journey:', error);
      // Reset navigation state on error
      setIsNavigating(false);
      // Reset any pending state flags on error
      // Comprehensive UI recovery to prevent state corruption
      recoverUIOnError();
      // Show user-friendly error message with RED styling
      // REMOVED TOAST: No popups per user request
    },
  });

  const startJourneyMutation = useMutation({
    mutationFn: async ({ routeId, idempotencyKey }: { routeId: string; idempotencyKey: string }) => {
      const response = await apiRequest("POST", "/api/journeys/start", { routeId }, { idempotencyKey });
      return response.json();
    },
    onSuccess: (journey) => {
      // Journey starts as 'planned', will be activated by the navigation flow
    },
    onError: (error) => {
      console.error('Failed to start journey:', error);
      // Comprehensive UI recovery on journey creation failure
      recoverUIOnError();
      // Show user-friendly error message
      // REMOVED TOAST: No popups per user request
    },
  });

  const completeJourneyMutation = useMutation({
    mutationFn: async (journeyId: number) => {
      const response = await apiRequest("PATCH", `/api/journeys/${journeyId}/complete`, {});
      return response.json();
    },
    onSuccess: (journey) => {
      setActiveJourney(null);
      setIsNavigating(false);
      setCurrentRoute(null);
      setMobileNavModeDebounced('plan');
      localStorage.removeItem('activeJourneyId');
      // Invalidate all journey-related queries to keep UI consistent
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys", "last"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys", "active"] });
      refetchCurrentJourney();
    },
    onError: (error) => {
      console.error('Failed to complete journey:', error);
      // Comprehensive UI recovery on journey completion failure
      recoverUIOnError();
      // Show user-friendly error message
      // REMOVED TOAST: No popups per user request
    },
  });

  // Route calculation mutation
  const calculateRouteMutation = useMutation({
    mutationFn: async (routeData: { 
      startLocation: string; 
      endLocation: string; 
      startCoordinates?: { lat: number; lng: number } | null;
      endCoordinates?: { lat: number; lng: number } | null;
      vehicleProfileId?: string; 
      routePreference?: string 
    }) => {
      const response = await apiRequest("POST", "/api/routes/calculate", routeData);
      const result = await response.json();
      return result;
    },
    onSuccess: (route) => {
      // Trigger live notification for new route
      if (route && route !== currentRoute) {
        triggerLiveNotification('route_change');
      }
      
      // Reset destination reached state for new journey
      hasShownDestinationDialogRef.current = false;
      setShowDestinationReached(false);
      
      setCurrentRoute(route);
      // Update window sync with new route
      windowSync.updateRoute(route);
      
      // Ensure toLocation is set when route is calculated
      if (route && route.endLocation && !toLocation) {
        setToLocation(route.endLocation);
      }
      
      // If route calculation includes a plannedJourney (from route calculation), set it as active
      if (route.plannedJourney) {
        setActiveJourney(route.plannedJourney);
        localStorage.setItem('activeJourneyId', route.plannedJourney.id.toString());
        windowSync.updateJourney(route.plannedJourney, false);
      }
      
      // Skip route preview - directly expand map for better route visibility
      const handleMapExpansion = () => {
        if (isMapWindowOpen()) {
          // Focus the map window and let it handle auto-expansion
          focusMapWindow();
          if (import.meta.env.DEV) {
            console.log('Route calculated: focusing map window for auto-expansion');
          }
        } else {
          if (isMobile) {
            // On mobile, only collapse sidebar if it's currently open to make room for map
            // But respect if user explicitly wants it open
            if (sidebarState === 'open') {
              setSidebarState('collapsed');
              localStorage.setItem('navigationSidebarState', 'collapsed');
            }
          } else {
            // Auto-expand map for better route visibility
            setIsMapExpanded(true);
          }
        }
      };

      // Small delay to allow route state to update
      setTimeout(handleMapExpansion, 200);
      
      // DISABLED: Toast notifications removed per user request
      // Toast pop-ups were interfering with input fields on mobile

      // DISABLED: Auto-transition to navigation mode - User must manually click "Start Navigation"
      // Show preview mode only, let user manually start navigation
      console.log('[AUTO-NAV] Route calculated - showing preview mode only');
      console.log('[AUTO-NAV] isMobile:', isMobile);
      console.log('[AUTO-NAV] route exists:', !!route);
      console.log('[AUTO-NAV] coordinates length:', route?.coordinates?.length || 0);
      
      if (isMobile && route && route.coordinates && route.coordinates.length > 0) {
        console.log('[AUTO-NAV] Setting preview mode - user must click Start Navigation');
        
        // Show preview mode - user must manually click "Start Navigation" button
        setMobileNavMode('preview');
        
        // Close route planning panel if open
        setSidebarState('collapsed');
      } else {
        console.log('[AUTO-NAV] Conditions NOT met - staying in plan mode');
      }
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error('Failed to calculate route:', error);
      }
      // Clear any existing route on error
      setCurrentRoute(null);
      // Comprehensive UI recovery on route calculation failure
      recoverUIOnError();
      // DISABLED: Toast notifications removed per user request
      // Errors will be handled silently or shown in the UI instead
    },
  });

  // Validate UUID format
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const handlePlanRoute = async (routePreference?: 'fastest' | 'eco' | 'avoid_tolls', startLoc?: string, endLoc?: string) => {
    console.log('[PLAN-ROUTE] Starting route planning...');
    console.log('[PLAN-ROUTE] Active Profile ID:', activeProfileId);
    console.log('[PLAN-ROUTE] From Location:', fromLocation);
    console.log('[PLAN-ROUTE] To Location:', toLocation);
    console.log('[PLAN-ROUTE] From Coordinates:', fromCoordinates);
    console.log('[PLAN-ROUTE] To Coordinates:', toCoordinates);
    
    // Guard against duplicate requests while calculating
    if (calculateRouteMutation.isPending) {
      console.log('[PLAN-ROUTE] Already calculating route - skipping duplicate request');
      return;
    }
    
    // Ensure we have a valid vehicle profile ID before planning route
    if (!activeProfileId || activeProfileId.trim().length === 0) {
      console.error('[PLAN-ROUTE] ERROR: No vehicle profile selected! Please select a vehicle profile first.');
      // REMOVED TOAST: No popups per user request
      return;
    }

    // Check for required locations
    const finalStartLoc = startLoc || fromLocation;
    const finalEndLoc = endLoc || toLocation;
    
    if (!finalStartLoc || !finalEndLoc) {
      console.error('[PLAN-ROUTE] ERROR: Missing locations - From:', finalStartLoc, 'To:', finalEndLoc);
      // REMOVED TOAST: No popups per user request
      return;
    }

    // Geocode missing coordinates before sending to backend
    let finalStartCoords = fromCoordinates;
    let finalEndCoords = toCoordinates;

    // Try to geocode start location if coordinates are missing
    if (!finalStartCoords && finalStartLoc) {
      console.log('[GEOCODE] Attempting to geocode start location:', finalStartLoc);
      
      if (looksLikePostcode(finalStartLoc) && detectPostcodeCountry(finalStartLoc) === 'UK') {
        const result = await geocodeUKPostcode(finalStartLoc);
        if (result) {
          console.log('[GEOCODE] Start location geocoded successfully:', result.coordinates);
          finalStartCoords = result.coordinates;
          setFromCoordinates(result.coordinates); // Update state for future use
        } else {
          // REMOVED TOAST: No popups per user request
          return;
        }
      } else {
        // REMOVED TOAST: No popups per user request
        return;
      }
    }

    // Try to geocode end location if coordinates are missing
    if (!finalEndCoords && finalEndLoc) {
      console.log('[GEOCODE] Attempting to geocode end location:', finalEndLoc);
      
      if (looksLikePostcode(finalEndLoc) && detectPostcodeCountry(finalEndLoc) === 'UK') {
        const result = await geocodeUKPostcode(finalEndLoc);
        if (result) {
          console.log('[GEOCODE] End location geocoded successfully:', result.coordinates);
          finalEndCoords = result.coordinates;
          setToCoordinates(result.coordinates); // Update state for future use
        } else {
          // REMOVED TOAST: No popups per user request
          return;
        }
      } else {
        // REMOVED TOAST: No popups per user request
        return;
      }
    }

    const routeData = {
      startLocation: finalStartLoc,
      endLocation: finalEndLoc,
      startCoordinates: finalStartCoords,
      endCoordinates: finalEndCoords,
      vehicleProfileId: activeProfileId,
      routePreference: routePreference || 'fastest',
    };

    calculateRouteMutation.mutate(routeData);
  };

  // Alternative routes preview handlers
  const handlePreviewRoute = (route: AlternativeRoute) => {
    setPreviewRoute(route);
    // REMOVED TOAST: No popups per user request
  };

  const handleSelectRoute = async (route: AlternativeRoute) => {
    setSelectedAlternativeRouteId(route.id);
    setIsApplyingRoute(true);
    
    try {
      // Ensure we have a valid vehicle profile before applying alternative route
      if (!activeProfile?.id) {
        // REMOVED TOAST: No popups per user request
        return;
      }

      // Apply the alternative route
      // Ensure we have a valid vehicle profile ID
      if (!activeProfileId || activeProfileId.trim().length === 0) {
        // REMOVED TOAST: No popups per user request
        return;
      }

      const response = await apiRequest("POST", `/api/routes/apply-alternative`, {
        routeId: currentRoute?.id,
        alternativeRouteId: route.id,
        vehicleProfileId: activeProfileId,
      });
      
      const newRoute = await response.json();
      setCurrentRoute(newRoute);
      
      // Clear preview and close panel
      setPreviewRoute(null);
      setIsAlternativeRoutesOpen(false);
      
      // Trigger live notification for route change
      triggerLiveNotification('route_change');
      
      // REMOVED TOAST: No popups per user request
      
      // Update window sync
      windowSync.updateRoute(newRoute);
      
    } catch (error) {
      console.error('Failed to apply alternative route:', error);
      // Comprehensive UI recovery on alternative route application failure
      recoverUIOnError();
      // REMOVED TOAST: No popups per user request
    } finally {
      setIsApplyingRoute(false);
      setSelectedAlternativeRouteId(null);
    }
  };

  const handleCloseAlternatives = () => {
    setIsAlternativeRoutesOpen(false);
    setPreviewRoute(null);
    setSelectedAlternativeRouteId(null);
  };


  // Helper function for map expansion after preview
  const handleMapExpansionAfterPreview = () => {
    if (isMapWindowOpen()) {
      // Focus the map window and let it handle auto-expansion
      focusMapWindow();
      if (import.meta.env.DEV) {
        console.log('Route preview completed: focusing map window for auto-expansion');
      }
    } else {
      if (isMobile) {
        // On mobile, only collapse sidebar if it's currently open to make room for map
        // But respect if user explicitly wants it open
        if (sidebarState === 'open') {
          setSidebarState('collapsed');
          localStorage.setItem('navigationSidebarState', 'collapsed');
        }
      } else {
        // Auto-expand map for route preview
        setIsMapExpanded(true);
      }
    }
  };

  // Clear current route when locations change to ensure fresh planning
  useEffect(() => {
    if (currentRoute && (fromLocation || toLocation)) {
      setCurrentRoute(null);
    }
  }, [fromLocation, toLocation]);

  // Auto-plan route when both locations are set (with 3-second debounce)
  // Also triggers when coordinates change (e.g., from AddressAutocomplete)
  useEffect(() => {
    // Clear any existing timeout
    const timeoutId = setTimeout(() => {
      // Trigger route calculation when:
      // 1. Both location texts are filled (min 5 chars for complete postcodes), OR
      // 2. Both coordinates are set (from autocomplete/GPS)
      const hasLocationText = fromLocation && fromLocation.length >= 5 && toLocation && toLocation.length >= 5;
      const hasCoordinates = fromCoordinates && toCoordinates;
      
      if ((hasLocationText || hasCoordinates) && !currentRoute && !calculateRouteMutation.isPending && activeProfileId) {
        handlePlanRoute(routePreference);
      }
    }, 3000); // 3-second delay

    // Cleanup: clear timeout if user continues typing
    return () => clearTimeout(timeoutId);
  }, [fromLocation, toLocation, fromCoordinates, toCoordinates, routePreference, activeProfileId, currentRoute, calculateRouteMutation.isPending]);

  // Effect to automatically show alternative routes when they become available
  useEffect(() => {
    if (alternatives.length > 0 && shouldReroute && timeSavingsAvailable && timeSavingsAvailable > 5) {
      // Auto-open alternatives panel if significant time savings are available
      setIsAlternativeRoutesOpen(true);
      
      // Trigger notification about available alternatives
      triggerLiveNotification('route_change');
      
      // REMOVED TOAST: No popups per user request
    }
  }, [alternatives.length, shouldReroute, timeSavingsAvailable, triggerLiveNotification]);

  // Auto-expand map when route is calculated
  useEffect(() => {
    if (currentRoute && !isMapWindowOpen()) {
      if (!isMapExpanded) {
        const timer = setTimeout(() => {
          setIsMapExpanded(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentRoute, isMapExpanded, isMobile]);




  // Handle map click to close overlays
  const handleMapClick = () => {
    // Close incident feed if user has interacted with it
    if (hasInteractedWithIncidentFeed && showIncidentFeed) {
      setShowIncidentFeed(false);
    }
  };

  // Handle cancel route - stop navigation
  const handleCancelRoute = () => {
    // DEACTIVATE OVERLAY KILL-SWITCH: Restore normal overlay behavior
    document.body.classList.remove('navigation-active');
    document.documentElement.classList.remove('overlay-safe-mode');
    
    // CRITICAL: Clear all route persistence - fresh start page
    localStorage.removeItem('activeJourneyId');
    
    // Clear URL parameter
    const url = new URL(window.location.href);
    if (url.searchParams.has('journey')) {
      url.searchParams.delete('journey');
      window.history.replaceState({}, '', url.pathname);
    }
    
    // Reset destination reached state for next journey
    hasShownDestinationDialogRef.current = false;
    setShowDestinationReached(false);
    
    // Clear all route state
    setCurrentRoute(null);
    setPreviewRoute(null);
    setActiveJourney(null);
    setIsNavigating(false);
    setMobileNavModeDebounced('plan');
    
    if (activeJourney?.id && (activeJourney.status === 'active' || activeJourney.status === 'planned')) {
      completeJourneyMutation.mutate(activeJourney.id);
    }
    
    console.log('[ROUTE-CANCEL] ✅ Route cancelled - fresh start page restored');
  };

  // Handle use current location with reverse geocoding
  const handleUseCurrentLocation = async () => {
    // Check if GPS permission is denied
    if (gpsData?.errorType === 'PERMISSION_DENIED') {
      console.error('[GPS-BUTTON] ⛔ LOCATION PERMISSION BLOCKED!');
      console.error('[GPS-BUTTON] To enable GPS:');
      console.error('[GPS-BUTTON] 1. Click the padlock icon in your browser address bar');
      console.error('[GPS-BUTTON] 2. Find "Location" in the permissions');
      console.error('[GPS-BUTTON] 3. Change it from "Block" to "Allow"');
      console.error('[GPS-BUTTON] 4. Refresh the page');
      alert('Location permission is BLOCKED!\n\n' +
            'To enable GPS:\n' +
            '1. Click the padlock icon in your browser address bar\n' +
            '2. Find "Location" in the permissions\n' +
            '3. Change it from "Block" to "Allow"\n' +
            '4. Refresh the page');
      return;
    }
    
    if (!gpsData || !gpsData.position) {
      console.log('[GPS-BUTTON] No GPS position available');
      // Silently return - GPS will activate when available
      return;
    }

    const { latitude, longitude } = gpsData.position;

    try {
      // Attempt reverse geocoding with 5 second timeout
      const result = await reverseGeocode(latitude, longitude, 5000);

      if (result.success) {
        // Success: Set the reverse geocoded address AND coordinates
        setFromLocation(result.address);
        setFromCoordinates({ lat: latitude, lng: longitude });
        // REMOVED TOAST: No popups per user request
      } else {
        // Fallback: Use coordinates as string if reverse geocoding fails
        const coordsString = formatCoordinatesAsAddress(latitude, longitude);
        setFromLocation(coordsString);
        setFromCoordinates({ lat: latitude, lng: longitude });
        // REMOVED TOAST: No popups per user request
      }
    } catch (error) {
      // Error handling: Fallback to coordinates
      const coordsString = formatCoordinatesAsAddress(latitude, longitude);
      setFromLocation(coordsString);
      setFromCoordinates({ lat: latitude, lng: longitude });
      // REMOVED TOAST: No popups per user request
    }
  };

  // Generate secure idempotency keys (no session ID leakage)
  const generateIdempotencyKey = (action: string, params?: string) => {
    // Use crypto.randomUUID() for secure, opaque idempotency keys
    return crypto.randomUUID();
  };

  // Mode validation guard to prevent invalid navigation transitions
  const canStartNavigation = useCallback(() => {
    if (isMobile && mobileNavMode !== 'preview' && mobileNavMode !== 'plan') {
      console.warn('[NAV-MODE] Cannot start navigation - invalid mode:', mobileNavMode);
      return false;
    }
    if (!currentRoute && (!fromLocation || !toLocation)) {
      console.warn('[NAV-MODE] Cannot start navigation - missing route and locations');
      return false;
    }
    if (!selectedProfile) {
      console.warn('[NAV-MODE] Cannot start navigation - missing vehicle profile');
      return false;
    }
    return true;
  }, [isMobile, mobileNavMode, currentRoute, fromLocation, toLocation, selectedProfile]);

  // Production-grade robust navigation flow
  const handleStartNavigation = async () => {
    console.log('[NAV-START-DEBUG] Start Navigation clicked!');
    console.log('[NAV-START-DEBUG] currentRoute:', currentRoute);
    console.log('[NAV-START-DEBUG] fromLocation:', fromLocation);
    console.log('[NAV-START-DEBUG] toLocation:', toLocation);
    console.log('[NAV-START-DEBUG] selectedProfile:', selectedProfile);
    console.log('[NAV-START-DEBUG] mobileNavMode:', mobileNavMode);
    console.log('[NAV-START-DEBUG] canStartNavigation():', canStartNavigation());
    
    // Clear any pending debounced mode transitions
    if (modeTransitionTimeoutRef.current) {
      clearTimeout(modeTransitionTimeoutRef.current);
    }
    
    // Mode transition guard for mobile - check BEFORE setting navigate mode
    if (isMobile && !canStartNavigation()) {
      console.log('[NAV-START-DEBUG] canStartNavigation() returned FALSE - blocking navigation');
      // REMOVED TOAST: No popups per user request
      return;
    }
    
    console.log('[NAV-START-DEBUG] Validation passed, proceeding with navigation start');
    
    // Additional comprehensive validation before starting
    if (!fromLocation || !toLocation) {
      // REMOVED TOAST: No popups per user request
      return;
    }

    if (!selectedProfile) {
      // REMOVED TOAST: No popups per user request
      return;
    }

    if (startJourneyMutation.isPending || activateJourneyMutation.isPending) {
      return; // Prevent double-clicks/race conditions
    }

    try {
      
      // Set navigation active state for CSS styling
      document.body.classList.add('navigation-active');
      document.documentElement.classList.add('overlay-safe-mode');
      
      // Close all known overlay components using proper state management
      setIsAlternativeRoutesOpen(false);
      
      // Prepare navigation interface - collapse sidebar for maximum map visibility during navigation
      setSidebarState('collapsed');

      // Generate idempotency key for this navigation start
      const idempotencyKey = generateIdempotencyKey('start');
      
      // Ensure we have a route (calculate if needed, use returned value not state)
      const route = currentRoute ?? await calculateRouteMutation.mutateAsync({
        startLocation: fromLocation,
        endLocation: toLocation,
        vehicleProfileId: selectedProfile?.id?.toString(),
        routePreference: 'fastest'
      });
      
      if (!route?.id) {
        throw new Error('Route calculation failed');
      }

      // Single linear navigation flow with proper mutation sequence
      let journeyId: number;
      if (activeJourney?.status === 'planned') {
        journeyId = activeJourney.id;
      } else {
        const newJourney = await startJourneyMutation.mutateAsync({ 
          routeId: route.id, 
          idempotencyKey 
        });
        journeyId = newJourney.id;
      }
      
      await activateJourneyMutation.mutateAsync({ 
        journeyId, 
        idempotencyKey 
      });
      
      // Set navigate mode AFTER successful activation
      setMobileNavMode('navigate');
      
      // Update navigation state after successful activation
      console.log('[NAV-MODE-DEBUG] Setting isNavigating=true after successful activation');
      setIsNavigating(true);
      console.log('[NAV-MODE-DEBUG] isNavigating set to true');
      
      if (route.id) {
        localStorage.setItem('activeRouteId', route.id.toString());
      }

      // Automatically enable street view in navigation mode when navigation starts
      const streetViewActivationEvent = new CustomEvent('activate_street_view_navigation', {
        detail: { route: route, profile: selectedProfile }
      });
      window.dispatchEvent(streetViewActivationEvent);

      // Auto-zoom to GPS position with robust fallback
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // GPS available - zoom to exact position (nearly maximum zoom for street view)
            const gpsPosition = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              zoom: 19.5,
              pitch: 60,
              bearing: position.coords.heading || 0
            };
            
            // Switch to roads mode and fly to GPS position
            const autoZoomEvent = new CustomEvent('auto_zoom_gps', {
              detail: { 
                position: gpsPosition,
                mapStyle: 'roads'
              }
            });
            window.dispatchEvent(autoZoomEvent);
          },
          (error) => {
            // GPS failed - fallback to route start with user notification
            console.warn('GPS unavailable, using route start:', error.message);
            
            if (route.startCoordinates) {
              const fallbackPosition = {
                lat: route.startCoordinates.lat,
                lng: route.startCoordinates.lng,
                zoom: 19.5,
                pitch: 60,
                bearing: 0
              };
              
              const autoZoomEvent = new CustomEvent('auto_zoom_gps', {
                detail: { 
                  position: fallbackPosition,
                  mapStyle: 'roads'
                }
              });
              window.dispatchEvent(autoZoomEvent);
              
              // REMOVED TOAST: No popups per user request
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      } else {
        // Geolocation not supported - use route start
        if (route.startCoordinates) {
          const fallbackPosition = {
            lat: route.startCoordinates.lat,
            lng: route.startCoordinates.lng,
            zoom: 19.5,
            pitch: 60,
            bearing: 0
          };
          
          const autoZoomEvent = new CustomEvent('auto_zoom_gps', {
            detail: { 
              position: fallbackPosition,
              mapStyle: 'roads'
            }
          });
          window.dispatchEvent(autoZoomEvent);
        }
      }

      setTimeout(() => {
        setIsMapExpanded(true);
      }, 300);

      // Dispatch navigation started event for notification system
      const navigationStartedEvent = new CustomEvent('navigation:started', {
        detail: { route: currentRoute, profile: selectedProfile }
      });
      window.dispatchEvent(navigationStartedEvent);

      // Hide toast in mobile view - user requested no popups
      if (window.innerWidth >= 768) {
        // REMOVED TOAST: No popups per user request
      }

    } catch (error) {
      console.error('Navigation start failed:', error);
      recoverUIOnError();
      
      // REMOVED TOAST: No popups per user request
    }
  };

  const handleStopNavigation = () => {
    if (activeJourney && (activeJourney.status === 'active' || activeJourney.status === 'planned')) {
      completeJourneyMutation.mutate(activeJourney.id);
    }
    
    // CRITICAL: Clear all route persistence - fresh start page
    localStorage.removeItem('activeJourneyId');
    
    // Clear URL parameter
    const url = new URL(window.location.href);
    if (url.searchParams.has('journey')) {
      url.searchParams.delete('journey');
      window.history.replaceState({}, '', url.pathname);
    }
    
    // Comprehensive state reset - completely cancel navigation
    setCurrentRoute(null);
    setPreviewRoute(null);
    setActiveJourney(null);
    setIsNavigating(false);
    setMobileNavModeDebounced('plan');
    
    // Reset destination reached state for next journey
    hasShownDestinationDialogRef.current = false;
    setShowDestinationReached(false);
    
    // Clear location inputs to allow fresh route planning
    setFromLocation('');
    setToLocation('');
    setFromCoordinates(null);
    setToCoordinates(null);
    
    // Clear alternative routes state
    setIsAlternativeRoutesOpen(false);
    setSelectedAlternativeRouteId(null);
    setIsApplyingRoute(false);
    
    // Reset map and UI states
    setIsMapExpanded(false);
    setShowLaneGuidance(false);
    setIsARMode(false);
    setIsFullscreenNav(false);
    
    // Dispatch navigation stopped event for notification system
    const navigationStoppedEvent = new CustomEvent('navigation:stopped', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(navigationStoppedEvent);
    
    console.log('[ROUTE-CANCEL] ✅ Route cancelled - fresh start page restored');
  };

  const handleOpenLaneSelection = () => {
    if (currentRoute) {
      setLocation(`/lane-selection/${currentRoute.id}`);
    } else {
      // Navigate to lane selection with demo route if no current route
      setLocation("/lane-selection");
    }
  };

  // Map expansion toggle functionality
  const handleToggleMapExpansion = () => {
    setIsMapExpanded(!isMapExpanded);
    // When collapsing map, ensure sidebar is visible
    if (isMapExpanded && !isSidebarOpen) {
      setSidebarState('open');
    }
  };

  // Fixed sidebar toggle functionality - NEVER allow 'closed' state to keep sidebar accessible
  const handleSidebarToggle = () => {
    // Compute the next state first - NEVER set to 'closed' to maintain accessibility
    const nextState = isSidebarCollapsed ? 'open' : 'collapsed';  // Only toggle between open and collapsed
    
    // Apply the state change
    setSidebarState(nextState);
    
    // Persist user preference
    localStorage.setItem('navigationSidebarState', nextState);
    
    // Apply side effects based on the NEXT state (not previous)
    if (nextState === 'open' && isMapExpanded) {
      setIsMapExpanded(false);
    }
  };

  // Keep this for compatibility with existing AR toggle functionality
  const handleSidebarCollapseToggle = () => {
    const nextState = isSidebarCollapsed ? 'open' : 'collapsed';
    setSidebarState(nextState);
    // Persist user preference
    localStorage.setItem('navigationSidebarState', nextState);
  };



  // Handle facility selection from search sidebar
  const handleSelectFacility = (facility: any) => {
    // Navigate to selected facility
    setToLocation(facility.address || facility.name);
    // Hide toast in mobile view - user requested no popups
    if (window.innerWidth >= 768) {
      // REMOVED TOAST: No popups per user request
    }
  };

  // Handle navigation to location - for left sidebar
  const handleNavigateToLocation = (location: string) => {
    setToLocation(location);
    // Hide toast in mobile view - user requested no popups
    if (window.innerWidth >= 768) {
      // REMOVED TOAST: No popups per user request
    }
  };

  // Get current coordinates for search - use actual GPS position
  const currentCoordinates = gpsData?.position 
    ? { lat: gpsData.position.latitude, lng: gpsData.position.longitude }
    : null;
  
  // Log GPS usage for debugging
  useEffect(() => {
    if (currentCoordinates) {
      console.log('[NAVIGATION] Using GPS coordinates:', currentCoordinates);
    } else {
      console.log('[NAVIGATION] No GPS coordinates available - waiting for GPS signal');
    }
  }, [currentCoordinates?.lat, currentCoordinates?.lng]);
  
  // Generate AR direction data from current route
  const getARDirectionData = () => {
    if (!currentRoute || !isNavigating) return undefined;
    
    // Mock turn-by-turn data - in real implementation, this would come from route service
    return {
      instruction: "Continue straight on A40",
      distance: "1.2 km",
      turnDirection: "straight" as const
    };
  };
  
  // Generate AR route data
  const getARRouteData = () => {
    if (!currentRoute) return undefined;
    
    return {
      totalDistance: currentRoute.distance ? String(currentRoute.distance) : "15.6 km",
      estimatedTime: currentRoute.duration ? String(currentRoute.duration) : "18 min", 
      nextTurn: "Right turn in 800m"
    };
  };

  // Don't block the entire interface for profile loading - show interface with loading states instead

  // Block app access until legal terms are accepted - MANDATORY LEGAL DISCLAIMER
  if (isConsentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAcceptedTerms) {
    return <LegalDisclaimerPopup />;
  }

  return (
    <div className="min-h-[100svh] flex flex-col" style={{background: "transparent"}}>
      {/* Mobile-First Layout - Clean 3-Mode Workflow */}
      {isMobile ? (
        <div className="mobile-layout">
          
          {/* AR Mode (Full Replacement) */}
          {isARMode ? (
            <ARNavigation
              isActive={isARMode}
              onToggleAR={handleToggleAR}
              currentDirection={getARDirectionData()}
              route={getARRouteData()}
            />
          ) : (
            <>
              {/* MAP - ALWAYS RENDERED - Base Layer (z-0) */}
              <div className="absolute inset-0 z-0">
                <MapShell className="h-full w-full">
                  {isMapLibre ? (
                    <MapLibreMap
                      ref={mapRef}
                      currentRoute={currentRoute}
                      selectedProfile={selectedProfile || activeProfile}
                      showTraffic={showTrafficLayer}
                      showIncidents={showIncidents}
                      hideControls={false}
                      hideCompass={false}
                      onMapClick={handleMapClick}
                      isNavigating={isNavigating}
                    />
                  ) : (
                    <InteractiveMap
                      currentRoute={currentRoute}
                      selectedProfile={selectedProfile || activeProfile}
                      alternativeRoutes={alternatives}
                      previewRoute={previewRoute}
                      showTrafficLayer={showTrafficLayer}
                      showIncidents={showIncidents}
                    />
                  )}
                </MapShell>
              </div>
              
              {/* GPS Permission Button removed - moved to route planning panel */}
              {/* GPS Loading Indicator - Production-Grade Visual Feedback */}
              {gpsLoadingState?.isLoading && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[150] pointer-events-none" data-testid="gps-loading-indicator">
                  <Card className="px-4 py-2 shadow-lg border-blue-500/50 bg-white/95 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <Crosshair className="h-5 w-5 text-blue-500 animate-pulse" />
                      <div className="text-sm">
                        <div className="font-medium text-blue-700">Acquiring GPS Signal</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            Attempt {gpsLoadingState.attempt}/{gpsLoadingState.maxAttempts}
                          </Badge>
                          {gpsLoadingState.attempt > 1 && (
                            <Hourglass className="h-3 w-3 animate-spin text-amber-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
              

              {/* PLAN MODE OVERLAYS (z-10+) - Always rendered but hidden during navigation */}
              {mobileNavMode === 'plan' && (
                <div className={cn(
                  "transition-opacity duration-200",
                  isNavigating && "opacity-0 pointer-events-none"
                )}>
                  {/* Header - Thinner Overlay on top */}
                  <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between pb-1 px-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">TruckNav Pro</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowVehicleSettings(true)}
                      className="h-8 w-8"
                      data-testid="button-settings"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>


                  {/* BOTTOM STACK CONTAINER - Responsive Flex Layout */}
                  <div 
                    className="fixed left-0 right-0 flex flex-col-reverse items-center gap-3 pointer-events-none"
                    style={{ 
                      bottom: 'var(--safe-area-bottom, 0px)',
                      paddingBottom: '0px'
                    }}
                  >
                    {/* Legal Ownership - Bottom layer (z-[5]) */}
                    <div className="w-full z-[5] pointer-events-auto">
                      <MapLegalOwnership compact={true} className="sm:hidden" />
                    </div>

                    {/* Professional Oval Speedometer HUD - Above legal (z-[160]) */}
                    <div className="z-[160] pointer-events-auto" data-testid="speedometer-hud-plan">
                      <SpeedometerHUD 
                        className="shadow-2xl" 
                        speedLimit={currentSpeedLimit || undefined}
                        roadInfo={roadInfo}
                        isNavigating={false}
                      />
                    </div>
                  </div>

                  {/* Plan Route FAB - Opens route planner (Bottom Right) */}
                  <Button
                    onClick={() => setSidebarState('open')}
                    size="lg"
                    className="fixed z-[200] h-14 w-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 backdrop-blur-sm pointer-events-auto"
                    style={{
                      bottom: 'calc(24px + var(--safe-area-bottom))',
                      right: 'calc(24px + var(--safe-area-right))'
                    }}
                    data-testid="button-plan-route-fab"
                    aria-label="Open route planner"
                  >
                    <Menu className="w-6 h-6" />
                  </Button>
                </div>
              )}

              {/* PREVIEW MODE OVERLAYS (z-10+) - Always rendered but hidden during navigation */}
              {mobileNavMode === 'preview' && currentRoute && (
                <div className={cn(
                  "transition-opacity duration-200",
                  isNavigating && "opacity-0 pointer-events-none"
                )}>
                  {/* Header - Thinner Overlay on top */}
                  <div className="absolute top-0 left-0 right-0 z-[100] flex items-center justify-between pb-1 px-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">TruckNav Pro</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowVehicleSettings(true)}
                      className="h-8 w-8"
                      data-testid="button-settings-preview"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* BOTTOM STACK CONTAINER - Responsive Flex Layout */}
                  <div 
                    className="fixed left-0 right-0 flex flex-col-reverse items-center gap-4 pointer-events-none"
                    style={{ 
                      bottom: 'var(--safe-area-bottom, 0px)',
                      paddingBottom: '0px'
                    }}
                  >
                    {/* Legal Ownership - Bottom layer (z-[5]) */}
                    <div className="w-full z-[5] pointer-events-auto">
                      <MapLegalOwnership compact={true} className="sm:hidden" />
                    </div>

                    {/* Professional Oval Speedometer HUD - Above legal (z-[160]) */}
                    <div className="z-[160] pointer-events-auto" data-testid="speedometer-hud-preview">
                      <SpeedometerHUD 
                        className="shadow-2xl" 
                        speedLimit={currentSpeedLimit || undefined}
                        roadInfo={roadInfo}
                        isNavigating={false}
                      />
                    </div>
                  </div>

                  {/* Start Navigation Button - Bottom Center (Preview Mode) */}
                  <Button
                    onClick={() => {
                      // Call the proper navigation start handler to set up 3D camera and bearing rotation
                      handleStartNavigation();
                    }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[201] pointer-events-auto
                             bg-green-600 hover:bg-green-700 text-white font-bold
                             h-14 px-8 text-lg rounded-full shadow-2xl
                             animate-pulse border-4 border-white"
                    data-testid="button-start-navigation-preview"
                  >
                    <Navigation className="w-6 h-6 mr-2" />
                    Start Navigation
                  </Button>

                  {/* MobileFAB - Bottom Right (separate fixed position) */}
                  <MobileFAB
                    mode="preview"
                    onSettingsClick={() => setShowVehicleSettings(true)}
                    onClearRoute={() => {
                      setCurrentRoute(null);
                      setMobileNavModeDebounced('plan');
                    }}
                    onMenuClick={() => setIsAlternativeRoutesOpen(!isAlternativeRoutesOpen)}
                    onReportIncident={() => setShowIncidentReportDialog(true)}
                    onViewIncidents={() => setShowIncidentFeed(true)}
                    className="fixed z-[200] pointer-events-auto"
                    style={{
                      bottom: 'calc(24px + var(--safe-area-bottom))',
                      right: 'calc(24px + var(--safe-area-right))'
                    }}
                  />
                </div>
              )}

              {/* NAVIGATE MODE OVERLAYS (z-10+) */}
              {mobileNavMode === 'navigate' && (
                <>
                  {/* Simplified Navigation HUD - Minimal Info Bar */}
                  {currentRoute && (
                    <div className="absolute top-0 left-0 right-0 z-[95] bg-black/80 backdrop-blur-sm text-white shadow-lg" style={{ paddingTop: 'var(--safe-area-top)' }} data-testid="navigation-hud">
                      <div className="px-4 py-2 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          Arrive: {new Date(Date.now() + (currentRoute.duration || 0) * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} • {(currentRoute.distance || 0).toFixed(1)} mi
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Turn Indicator - Large bubble at top center */}
                  {nextTurn && (
                    <TurnIndicator
                      direction={nextTurn.direction}
                      distance={nextTurn.distance}
                      unit={measurementSystem === 'imperial' ? 'mi' : 'km'}
                      roadName={nextTurn.roadName}
                    />
                  )}

                  {/* GPS Loading Indicator */}
                  {gpsLoadingState?.isLoading && (
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[150] pointer-events-none">
                      <Card className="px-4 py-3 shadow-xl border-blue-500/50 bg-white/95 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Crosshair className="h-6 w-6 text-blue-500 animate-pulse" />
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                          </div>
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">Acquiring GPS Signal</div>
                            <div className="text-xs text-gray-600">
                              Attempt {gpsLoadingState.attempt}/{gpsLoadingState.maxAttempts}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}


                  {/* Map Control Buttons - Right Side Stack (z-[120]+) - All buttons clickable */}
                  <div 
                    className="absolute z-[120] flex flex-col gap-3 pointer-events-auto" 
                    style={{ 
                      top: 'calc(4.5rem + var(--safe-area-top))',
                      right: 'calc(1rem + var(--safe-area-right))'
                    }}
                  >
                    <Button
                      size="icon"
                      onClick={() => mapRef.current?.resetBearing()}
                      className="h-11 w-11 rounded-xl shadow-2xl bg-white/95 backdrop-blur-md hover:bg-white hover:scale-105 text-gray-800 border border-white/50 pointer-events-auto transition-all duration-200 active:scale-95"
                      data-testid="button-compass-reset-navigate"
                      aria-label="Reset bearing to North"
                    >
                      <Compass 
                        className="h-5 w-5 transition-transform duration-300" 
                        style={{ transform: `rotate(${mapBearing}deg)` }}
                      />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => {
                        if (mapRef.current) {
                          mapRef.current.zoomToUserLocation({
                            zoom: 17.5,
                            pitch: 45,
                            duration: 1500
                          });
                        }
                      }}
                      className="h-11 w-11 rounded-xl shadow-2xl bg-white/95 backdrop-blur-md hover:bg-white hover:scale-105 text-gray-800 border border-white/50 pointer-events-auto transition-all duration-200 active:scale-95"
                      data-testid="button-recenter-navigate"
                      aria-label="Recenter on current location"
                    >
                      <Crosshair className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => mapRef.current?.zoomIn()}
                      className="h-11 w-11 rounded-xl shadow-2xl bg-white/95 backdrop-blur-md hover:bg-white hover:scale-105 text-gray-800 border border-white/50 pointer-events-auto transition-all duration-200 active:scale-95"
                      data-testid="button-zoom-in-navigate"
                      aria-label="Zoom in"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => mapRef.current?.zoomOut()}
                      className="h-11 w-11 rounded-xl shadow-2xl bg-white/95 backdrop-blur-md hover:bg-white hover:scale-105 text-gray-800 border border-white/50 pointer-events-auto transition-all duration-200 active:scale-95"
                      data-testid="button-zoom-out-navigate"
                      aria-label="Zoom out"
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => {
                        mapRef.current?.toggle3DMode();
                        setMap3DMode(!map3DMode);
                      }}
                      className={cn(
                        "h-11 w-11 rounded-xl shadow-2xl pointer-events-auto transition-all duration-200 border active:scale-95",
                        map3DMode 
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:scale-105 border-blue-400/50"
                          : "bg-white/95 backdrop-blur-md hover:bg-white hover:scale-105 text-gray-800 border-white/50"
                      )}
                      data-testid="button-tilt-map-navigate"
                      aria-label={map3DMode ? "Switch to flat view" : "Switch to tilted view"}
                    >
                      <Box className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => setShowTrafficLayer(!showTrafficLayer)}
                      className={cn(
                        "h-11 w-11 rounded-xl shadow-2xl pointer-events-auto transition-all duration-200 border active:scale-95",
                        showTrafficLayer 
                          ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 hover:scale-105 border-orange-400/50"
                          : "bg-white/95 backdrop-blur-md hover:bg-white hover:scale-105 text-gray-800 border-white/50"
                      )}
                      data-testid="button-traffic-toggle-navigate"
                      aria-label={showTrafficLayer ? "Hide traffic layer" : "Show traffic layer"}
                    >
                      <Layers className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Professional Oval Speedometer HUD - Fixed position above Stop button (moved up) */}
                  <div 
                    className="fixed left-1/2 -translate-x-1/2 z-[180] pointer-events-auto"
                    style={{
                      bottom: 'calc(160px + var(--safe-area-bottom, 0px))' // Moved up to 160px for better visibility
                    }}
                    data-testid="speedometer-hud-navigate"
                  >
                    <SpeedometerHUD 
                      className="shadow-2xl" 
                      speedLimit={currentSpeedLimit || undefined}
                      roadInfo={roadInfo}
                      isNavigating={true}
                    />
                  </div>

                  {/* Stop Navigation Button - Fixed position at bottom-left side (smaller) */}
                  <Button
                    onClick={handleStopNavigation}
                    variant="destructive"
                    className={cn(
                      "fixed z-[170] h-9 px-4 text-xs font-medium rounded-lg shadow-xl pointer-events-auto bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border border-red-400/50 transition-all duration-200 hover:scale-105 active:scale-95",
                      completeJourneyMutation.isPending && "opacity-50 cursor-not-allowed"
                    )}
                    style={{
                      bottom: 'calc(16px + var(--safe-area-bottom, 0px))',
                      left: 'calc(16px + var(--safe-area-left, 0px))'
                    }}
                    data-testid="button-stop-navigation"
                  >
                    {completeJourneyMutation.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        <span>Stopping...</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3 mr-1" />
                        <span>Stop</span>
                      </>
                    )}
                  </Button>

                  {/* Legal Ownership - Bottom of screen */}
                  <div className="fixed bottom-0 left-0 right-0 w-full z-[5] pointer-events-auto">
                    <MapLegalOwnership compact={true} className="sm:hidden" />
                  </div>

                  {/* MobileFAB - Bottom Right (separate fixed position) */}
                  <MobileFAB
                    mode="navigate"
                    onSettingsClick={() => setShowVehicleSettings(true)}
                    onClearRoute={handleStopNavigation}
                    onLayersClick={() => setShowTrafficLayer(!showTrafficLayer)}
                    onReportIncident={() => setShowIncidentReportDialog(true)}
                    onViewIncidents={() => setShowIncidentFeed(true)}
                    className="fixed z-[200] pointer-events-auto"
                    style={{
                      bottom: 'calc(24px + var(--safe-area-bottom))',
                      right: 'calc(24px + var(--safe-area-right))'
                    }}
                  />
                </>
              )}
            </>
          )}

          {/* Full-Screen Route Planning Panel - Mobile Only - NEVER show during active navigation */}
          {isMobileDrawerOpen && !isNavigating && (
            <>
              {/* Backdrop - tap anywhere to close */}
              <div 
                className="fixed inset-0 z-40 bg-black/20"
                onClick={() => setSidebarState('collapsed')}
                data-testid="panel-backdrop"
              />
              
              {/* Panel */}
              <div className="fixed inset-0 z-50 bg-white flex flex-col">
                {/* Header with close button */}
                <div className="flex items-center justify-between p-4 border-b" style={{ paddingTop: 'calc(16px + var(--safe-area-top))' }}>
                  <h2 className="text-xl font-semibold">Plan Route</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarState('collapsed')}
                    className="h-10 w-10"
                    data-testid="button-close-panel"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </div>
                
                {/* Panel content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <SimplifiedRouteDrawer
                    fromLocation={fromLocation}
                    toLocation={toLocation}
                    fromCoordinates={fromCoordinates}
                    toCoordinates={toCoordinates}
                    onFromLocationChange={setFromLocation}
                    onToLocationChange={setToLocation}
                    onFromCoordinatesChange={setFromCoordinates}
                    onToCoordinatesChange={setToCoordinates}
                    routePreference={routePreference}
                    onRoutePreferenceChange={setRoutePreference}
                    onUseCurrentLocation={handleUseCurrentLocation}
                    onPlanRoute={() => handlePlanRoute()}
                    activeProfileId={activeProfileId}
                  />
                </div>
              </div>
            </>
          )}

        </div>
      ) : (
        /* Desktop Layout - Keep existing sidebar layout with features sidebar */
        <div className={cn(
          "flex h-screen overflow-hidden",
          "automotive-layout desktop-sidebar"
        )}>
          
          {/* Desktop Hamburger Menu - Only visible on desktop when sidebar closed and NOT navigating */}
          {!isSidebarOpen && !isNavigating && (
            <Button
              variant="default"
              size="icon"
              onClick={() => setSidebarState('open')}
              className="fixed top-4 left-4 z-50 hamburger-menu-button automotive-touch-target bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 shadow-lg"
              data-testid="button-menu-desktop"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          
          {/* Desktop Navigation Sidebar */}
          <NavigationSidebar
            // Route planning props
            fromLocation={fromLocation}
            toLocation={toLocation}
            onFromLocationChange={setFromLocation}
            onToLocationChange={setToLocation}
            onFromCoordinatesChange={setFromCoordinates}
            onToCoordinatesChange={setToCoordinates}
            onPlanRoute={handlePlanRoute}
            onStartNavigation={handleStartNavigation}
            onStopNavigation={handleStopNavigation}
            currentRoute={currentRoute}
            isCalculating={calculateRouteMutation.isPending}
            
            // Vehicle profile props
            selectedProfile={selectedProfile}
            onProfileSelect={(profile) => {
              setSelectedProfile(profile);
              queryClient.invalidateQueries({ queryKey: ["/api/vehicle-profiles"] });
            }}
            isNavigating={isNavigating}
            isStartingJourney={startJourneyMutation.isPending || activateJourneyMutation.isPending}
            isCompletingJourney={completeJourneyMutation.isPending}
            
            // Sidebar state
            isOpen={isSidebarOpen}
            onToggle={handleSidebarToggle}
            isCollapsed={isSidebarCollapsed}
            onCollapseToggle={handleSidebarCollapseToggle}
            
            // Search panel integration - not needed since left sidebar contains search
            isSearchPanelOpen={false}
            onToggleSearchPanel={() => {}}
            
            // Settings modal props
            showVehicleSettings={showVehicleSettings}
            onShowVehicleSettings={setShowVehicleSettings}
            
            // Search functionality props
            coordinates={currentCoordinates}
            onSelectFacility={handleSelectFacility}
            onNavigateToLocation={handleNavigateToLocation}
            
            // AR Navigation props
            onToggleAR={arSupported && isNavigating ? handleToggleAR : undefined}
            isARMode={isARMode}
            arSupported={arSupported}
            
            // Lane guidance props
            onShowLaneGuidance={() => setShowLaneGuidance(true)}
          />

          {/* Desktop Map Area with Responsive Design */}
          <div className="relative flex-1 min-h-0 professional-nav-interface">

            {/* AR Navigation - Desktop */}
            {isARMode && (
              <ARNavigation
                isActive={isARMode}
                onToggleAR={handleToggleAR}
                currentDirection={getARDirectionData()}
                route={getARRouteData()}
              />
            )}

            {/* Enhanced Professional Map - Desktop with MapShell */}
            {!isARMode && (
              <>
                <MapShell 
                  className="hidden sm:block desktop-sidebar"
                  onSizeChange={(dimensions) => {
                    console.log('📐 Desktop map resized:', dimensions);
                    // Store map instance for invalidation
                    setTimeout(() => {
                      const mapContainer = document.querySelector('.leaflet-container');
                      if (mapContainer && (mapContainer as any)._leaflet_map) {
                        (window as any).mapInstance = (mapContainer as any)._leaflet_map;
                      }
                    }, 100);
                  }}
                >
                  {isMapLibre ? (
                    <MapLibreMap
                      ref={mapRef}
                      currentRoute={currentRoute}
                      selectedProfile={selectedProfile || activeProfile}
                      showTraffic={showTrafficLayer}
                      showIncidents={showIncidents}
                      hideControls={false}
                      hideCompass={false}
                      onMapClick={handleMapClick}
                      isNavigating={isNavigating}
                    />
                  ) : (
                    <EnhancedRealisticMap
                      currentRoute={currentRoute}
                      selectedProfile={selectedProfile || activeProfile}
                      alternativeRoutes={alternatives}
                      previewRoute={previewRoute}
                      showTrafficLayer={showTrafficLayer}
                      showIncidents={showIncidents}
                      isNavigating={isNavigating}
                      currentLocation={currentGPSLocation}
                      onMapClick={handleMapClick}
                      isMapExpanded={isMapExpanded}
                      sidebarState={sidebarState}
                    />
                  )}
                </MapShell>
                
                {/* GPS Loading Indicator - Desktop */}
                {gpsLoadingState?.isLoading && (
                  <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[150] pointer-events-none" data-testid="gps-loading-indicator-desktop">
                    <Card className="px-4 py-2 shadow-lg border-blue-500/50 bg-white/95 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <Crosshair className="h-5 w-5 text-blue-500 animate-pulse" />
                        <div className="text-sm">
                          <div className="font-medium text-blue-700">Acquiring GPS Signal</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              Attempt {gpsLoadingState.attempt}/{gpsLoadingState.maxAttempts}
                            </Badge>
                            {gpsLoadingState.attempt > 1 && (
                              <Hourglass className="h-3 w-3 animate-spin text-amber-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
                
                {/* Legal Ownership Section - Desktop */}
                <MapLegalOwnership compact={true} className="hidden sm:block" />
              </>
            )}
          </div>

        </div>
      )}

      {/* REMOVED: Professional Navigation HUD - Duplicate speedometer functionality
          Now using only SpeedometerHUD for a single, consistent speedometer display */}

      {/* Removed unused Navigation Status Drawer that was creating grey overlay */}

      {/* Mobile Notification Stack - Overlay for all layouts with error boundary */}
      {Array.isArray(activeNotifications) && activeNotifications.length > 0 ? (
        <MobileNotificationStack
          notifications={activeNotifications}
          onDismiss={dismissNotification}
          getIcon={getNotificationIcon}
          dndEnabled={dndState?.enabled || false}
          isNavigating={isNavigating}
          hasNavigationGuidance={isNavigating && currentRoute !== null}
        />
      ) : null}

      {/* Alternative Routes Panel - Hidden during navigation */}
      <AlternativeRoutesPanel
        isOpen={isAlternativeRoutesOpen && !isNavigating}
        alternatives={alternatives}
        currentRoute={currentRoute}
        vehicleProfile={selectedProfile}
        onClose={handleCloseAlternatives}
        onSelectRoute={handleSelectRoute}
        onPreviewRoute={handlePreviewRoute}
        isApplying={isApplyingRoute}
        selectedRouteId={selectedAlternativeRouteId || undefined}
      />

      
      {/* Settings Modal - rendered at page level to persist independently of sidebar state */}
      <SettingsModal
        open={showVehicleSettings}
        onOpenChange={setShowVehicleSettings}
        onCloseSidebar={isSidebarOpen ? () => setSidebarState('collapsed') : undefined}
      />


      {/* Lane Guidance Popup - Can be triggered manually or during navigation */}
      <LaneGuidancePopup
        currentRoute={currentRoute}
        isNavigating={isNavigating}
        forceVisible={showLaneGuidance}
      />

      {/* Incident Report Dialog */}
      <IncidentReportDialog
        open={showIncidentReportDialog}
        onOpenChange={setShowIncidentReportDialog}
        currentLocation={currentGPSLocation}
      />

      {/* Incident Feed Popup - Shows nearby incidents */}
      <IncidentFeedPopup
        currentLocation={currentGPSLocation}
        showIncidents={showIncidentFeed && showIncidents}
        onClose={() => {
          setShowIncidentFeed(false);
          setHasInteractedWithIncidentFeed(false);
        }}
        onInteraction={() => {
          setHasInteractedWithIncidentFeed(true);
        }}
      />

      {/* Destination Reached Dialog */}
      <AlertDialog open={showDestinationReached} onOpenChange={setShowDestinationReached}>
        <AlertDialogContent className="max-w-md" data-testid="dialog-destination-reached">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
              <Navigation className="w-6 h-6 text-green-600" />
              Destination Reached!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-lg pt-2">
              You have arrived at your destination. Safe driving!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogAction
              onClick={() => {
                // CRITICAL: Clear all route persistence - fresh start page
                localStorage.removeItem('activeJourneyId');
                
                // Clear URL parameter
                const url = new URL(window.location.href);
                if (url.searchParams.has('journey')) {
                  url.searchParams.delete('journey');
                  window.history.replaceState({}, '', url.pathname);
                }
                
                // Clear route and return to plan mode
                setCurrentRoute(null);
                setIsNavigating(false);
                setMobileNavModeDebounced('plan');
                hasShownDestinationDialogRef.current = false;
                setShowDestinationReached(false);
                
                console.log('[ROUTE-COMPLETE] ✅ Route completed - fresh start page restored');
              }}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-plan-new-journey"
            >
              Plan New Journey
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

// Main NavigationPage wrapper with GPS Provider
export default function NavigationPage() {
  return (
    <GPSProvider
      enableHighAccuracy={true}
      timeout={5000}
      maximumAge={0}
      headingSmoothingAlpha={0.25}
      enableHeadingSmoothing={true}
    >
      <NavigationPageContent />
    </GPSProvider>
  );
}
