import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Truck, X, Menu, MapPin, Settings, Search, Camera, Navigation, Navigation2, Car, AlertCircle, Compass, Box, Plus, Minus, Layers, Loader2, Crosshair, Hourglass, Map } from "lucide-react";
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
import LegalDisclaimerSimple from "@/components/legal/legal-disclaimer-simple";
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
import ComprehensiveMobileMenu from "@/components/navigation/comprehensive-mobile-menu";
import { IncidentReportDialog } from "@/components/incidents/incident-report-dialog";
import { IncidentFeed } from "@/components/incidents/incident-feed";
import IncidentFeedPopup from "@/components/incidents/incident-feed-popup";
import SpeedDisplay from "@/components/map/speed-display";
import SpeedometerHUD from "@/components/navigation/speedometer-hud";
import { GPSProvider, useGPS } from "@/contexts/gps-context";
import { reverseGeocode, formatCoordinatesAsAddress } from "@/lib/reverse-geocode";
import { geocodeUKPostcode } from "@/lib/uk-postcode-geocoding";
import { looksLikePostcode, detectPostcodeCountry } from "@/lib/postcode-utils";
import { robustGeocode } from "@/lib/robust-geocoding";
import { useMeasurement } from "@/components/measurement/measurement-provider";

import { NavigationControlsStack } from "@/components/navigation/navigation-controls-stack";

// Removed duplicate NavigationControlsStack - now imported from component

// NavigationControlsStack has been moved to its own component file
// Import is at the top of this file

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
  
  // Comprehensive mobile menu state
  const [showComprehensiveMenu, setShowComprehensiveMenu] = useState(false);
  
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
  const [mobileNavMode, setMobileNavMode] = useState<MobileNavMode>('preview');
  
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
    } else if (!currentRoute && showComprehensiveMenu) {
      // Only switch to plan mode if menu is open and actively planning
      setMobileNavModeDebounced('plan');
    } else if (!currentRoute && !showComprehensiveMenu) {
      // Default to preview mode when no route and menu is closed
      setMobileNavModeDebounced('preview');
    }
    // REMOVED: Auto-switch to preview when route exists - this was interrupting user input
    // The route calculation onSuccess handler will explicitly set preview mode when needed
  }, [isMobile, isNavigating, currentRoute, setMobileNavModeDebounced, mobileNavMode, showComprehensiveMenu]);
  
  // Forcefully close sidebar/drawer when navigation starts - CRITICAL for UI consistency
  useEffect(() => {
    if (isNavigating) {
      setSidebarState('collapsed');
    }
  }, [isNavigating]);
  
  // Force 3D navigation view when navigation starts - WITH OR WITHOUT GPS
  const hasInitialized3DRef = useRef(false);
  
  useEffect(() => {
    if (isNavigating && !hasInitialized3DRef.current && mapRef.current && currentRoute) {
      hasInitialized3DRef.current = true;

      console.log('[NAV-ZOOM] ========================================');
      console.log('[NAV-ZOOM] 🚀 Initializing navigation auto-zoom');
      console.log('[NAV-ZOOM] Has GPS:', !!gpsData?.position);
      console.log('[NAV-ZOOM] Has Route:', !!currentRoute);
      console.log('[NAV-ZOOM] ========================================');

      // Calculate bearing from route path (first two waypoints)
      let initialBearing = 0;
      let targetLat: number;
      let targetLng: number;

      if (currentRoute.routePath && currentRoute.routePath.length >= 2) {
        const start = currentRoute.routePath[0];
        const end = currentRoute.routePath[1];
        
        // Calculate bearing between two points using Haversine formula
        const lon1 = start.lng * Math.PI / 180;
        const lon2 = end.lng * Math.PI / 180;
        const lat1 = start.lat * Math.PI / 180;
        const lat2 = end.lat * Math.PI / 180;
        
        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        initialBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        
        // Use route start as target
        targetLat = start.lat;
        targetLng = start.lng;
        
        console.log('[NAV-ZOOM] Using route bearing:', initialBearing.toFixed(1), '°');
        console.log('[NAV-ZOOM] Centering on route start:', targetLat.toFixed(5), ',', targetLng.toFixed(5));
      } else {
        console.error('[NAV-ZOOM] ❌ Route has no path - using GPS or manual position');
        
        // Fallback to GPS or manual location
        if (gpsData?.position) {
          targetLat = gpsData.position.latitude;
          targetLng = gpsData.position.longitude;
          initialBearing = gpsData.position.smoothedHeading ?? gpsData.position.heading ?? 0;
        } else if (gpsData?.manualLocation) {
          targetLat = gpsData.manualLocation.latitude;
          targetLng = gpsData.manualLocation.longitude;
        } else {
          console.error('[NAV-ZOOM] ❌ No position available - cannot zoom');
          return;
        }
      }

      // Get map instance and fly to position with heading-up view
      const mapInstance = mapRef.current.getMap();
      if (mapInstance && mapInstance.isStyleLoaded()) {
        console.log('[NAV-ZOOM] Flying to navigation start position...');
        
        mapInstance.flyTo({
          center: [targetLng, targetLat],
          zoom: 18.5,  // Optimal street-level zoom
          pitch: 67,   // Professional 3D perspective
          bearing: initialBearing, // Route pointing upward (heading-up)
          padding: { 
            top: 280,    // Space for HUD
            bottom: 120, // Space for speedometer
            left: 0, 
            right: 0 
          },
          duration: 1500,
          essential: true
        });
        
        // Set 3D mode flag immediately
        setMap3DMode(true);
        
        console.log('[NAV-ZOOM] ✅ Auto-zoom complete - heading-up navigation active');
      } else {
        console.warn('[NAV-ZOOM] ⚠️ Map not ready - retrying in 500ms');
        
        // Retry after brief delay if map not ready
        setTimeout(() => {
          if (mapRef.current) {
            const retryMap = mapRef.current.getMap();
            if (retryMap) {
              retryMap.flyTo({
                center: [targetLng, targetLat],
                zoom: 18.5,
                pitch: 67,
                bearing: initialBearing,
                padding: { top: 280, bottom: 120, left: 0, right: 0 },
                duration: 1500,
                essential: true
              });
              setMap3DMode(true);
              console.log('[NAV-ZOOM] ✅ Auto-zoom complete (retry succeeded)');
            }
          }
        }, 500);
      }
    }
    
    if (!isNavigating) {
      hasInitialized3DRef.current = false;
    }
  }, [isNavigating, currentRoute, gpsData?.position, gpsData?.manualLocation]);
  
  // Automated visibility check for speedometer during navigation
  useEffect(() => {
    if (mobileNavMode !== 'navigate') return;

    const checkSpeedometerVisibility = () => {
      const speedometer = document.querySelector('[data-testid="speedometer-hud-navigate"]');
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
  
  // Real-time bearing rotation during navigation - BULLETPROOF with route fallback
  useEffect(() => {
    const updateBearing = () => {
      if (!mapRef.current || !isNavigating) {
        // When not navigating, just track the current bearing for compass display
        if (mapRef.current) {
          const bearing = mapRef.current.getBearing();
          setMapBearing(bearing);
        }
        return;
      }

      try {
        const mapInstance = mapRef.current.getMap();
        if (!mapInstance) return;

        let targetBearing: number | null = null;

        // Priority 1: Use GPS heading if available
        if (gpsData?.position?.smoothedHeading !== null && gpsData?.position?.smoothedHeading !== undefined) {
          targetBearing = gpsData.position.smoothedHeading;
          console.log('[NAV-BEARING] Using GPS heading:', targetBearing);
        }
        // Priority 2: Calculate bearing from route direction (works without GPS!)
        else if (currentRoute && currentRoute.routePath && currentRoute.routePath.length >= 2) {
          const path = currentRoute.routePath;
          // Use first two points to determine route direction
          const start = path[0];
          const end = path[1];
          
          // Calculate bearing between two points
          const lon1 = start.lng * Math.PI / 180;
          const lon2 = end.lng * Math.PI / 180;
          const lat1 = start.lat * Math.PI / 180;
          const lat2 = end.lat * Math.PI / 180;
          
          const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
          const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
          
          targetBearing = bearing;
          console.log('[NAV-BEARING] Using route bearing (no GPS):', targetBearing);
        }

        if (targetBearing !== null) {
          const currentBearing = mapRef.current.getBearing();
          
          // Only update if significant change (>5 degrees) to prevent jitter
          let delta = targetBearing - currentBearing;
          
          // Normalize delta to [-180, 180] for shortest rotation path
          while (delta > 180) delta -= 360;
          while (delta < -180) delta += 360;
          
          const normalizedDelta = Math.abs(delta);
          
          if (normalizedDelta > 5) {
            mapInstance.easeTo({
              bearing: targetBearing,
              duration: 800,
              easing: (t) => t * (2 - t)
            });
          }
          
          setMapBearing(targetBearing);
        }
      } catch (err) {
        console.error('[NAV] Bearing update failed:', err);
      }
    };

    const interval = setInterval(updateBearing, 500);
    
    return () => clearInterval(interval);
  }, [isNavigating, gpsData?.position?.smoothedHeading, currentRoute]);
  
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
        
        // CRITICAL: Only restore ACTIVE navigation, not preview routes
        // Preview routes are 'planned' and should NOT persist across sessions
        if (journey && journey.status === 'active') {
          // Store in localStorage for future use
          localStorage.setItem('activeJourneyId', journey.id);
          return journey;
        } else {
          // Clear non-active journey from URL
          console.log('[JOURNEY-CLEAR] Clearing non-active journey from URL:', urlJourneyId, 'status:', journey?.status);
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
        // CRITICAL: Only restore ACTIVE navigation, not 'planned' preview routes
        if (journey.status === 'active') {
          return journey;
        } else {
          // Clean up non-active journey from localStorage
          console.log('[JOURNEY-CLEAR] Clearing non-active journey from storage:', storedJourneyId, 'status:', journey?.status);
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
        // Fetch the route using the routeId with proper error handling
        fetch(`/api/routes/${currentJourney.routeId}`)
          .then(res => {
            console.log('[JOURNEY-LOAD] Route fetch response:', res.status, res.statusText);
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json();
          })
          .then(route => {
            console.log('[JOURNEY-LOAD] ✅ Successfully loaded route from journey:', route);
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
            console.error('[JOURNEY-LOAD] ❌ Failed to fetch route:', err.message || err);
            console.error('[JOURNEY-LOAD] Route ID:', currentJourney.routeId);
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
      // NOTE: We don't persist to localStorage here - only persist when user actually starts navigation
      // This prevents preview routes from reappearing on app reload
      if (route.plannedJourney) {
        setActiveJourney(route.plannedJourney);
        // Removed: localStorage.setItem('activeJourneyId', route.plannedJourney.id.toString());
        // Only startNavigationMutation (line ~1417) persists to localStorage
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
      console.log('[AUTO-NAV] routePath length:', route?.routePath?.length || 0);
      
      if (isMobile && route && route.routePath && route.routePath.length > 0) {
        console.log('[AUTO-NAV] Setting preview mode - user must click Start Navigation');
        
        // Show preview mode - user must manually click "Start Navigation" button
        setMobileNavMode('preview');
        
        // Close route planning panel if open
        setSidebarState('collapsed');
        
        // Auto-zoom to show the calculated route with current location
        setTimeout(() => {
          // Priority: GPS position → Manual location → Route bounds
          if (gpsData?.position) {
            console.log('[ROUTE-PREVIEW] ✅ Zooming to current GPS position');
            const previewPosition = {
              lat: gpsData.position.latitude,
              lng: gpsData.position.longitude,
              zoom: 14,  // Medium zoom to show route context
              pitch: 0,  // Top-down view for route overview
              bearing: 0
            };
            
            const autoZoomEvent = new CustomEvent('auto_zoom_gps', {
              detail: { 
                position: previewPosition,
                mapStyle: 'roads'
              }
            });
            window.dispatchEvent(autoZoomEvent);
          } else if (gpsData?.manualLocation) {
            console.log('[ROUTE-PREVIEW] 📍 Zooming to manual location');
            const previewPosition = {
              lat: gpsData.manualLocation.latitude,
              lng: gpsData.manualLocation.longitude,
              zoom: 14,
              pitch: 0,
              bearing: 0
            };
            
            const autoZoomEvent = new CustomEvent('auto_zoom_gps', {
              detail: { 
                position: previewPosition,
                mapStyle: 'roads'
              }
            });
            window.dispatchEvent(autoZoomEvent);
          } else if (route.startCoordinates) {
            console.log('[ROUTE-PREVIEW] 🗺️ Zooming to route start');
            const previewPosition = {
              lat: route.startCoordinates.lat,
              lng: route.startCoordinates.lng,
              zoom: 14,
              pitch: 0,
              bearing: 0
            };
            
            const autoZoomEvent = new CustomEvent('auto_zoom_gps', {
              detail: { 
                position: previewPosition,
                mapStyle: 'roads'
              }
            });
            window.dispatchEvent(autoZoomEvent);
          }
        }, 500); // Small delay to let route render first
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

    // Geocode missing coordinates using robust multi-fallback approach
    let finalStartCoords = fromCoordinates;
    let finalEndCoords = toCoordinates;

    try {
      // Geocode start location if coordinates are missing
      if (!finalStartCoords && finalStartLoc) {
        console.log('[PLAN-ROUTE] Geocoding start location with robust geocoding...');
        const startResult = await robustGeocode(finalStartLoc, fromCoordinates);
        finalStartCoords = startResult.coordinates;
        setFromCoordinates(finalStartCoords);
        console.log('[PLAN-ROUTE] ✅ Start location geocoded:', finalStartCoords, `(source: ${startResult.source})`);
      }

      // Geocode end location if coordinates are missing
      if (!finalEndCoords && finalEndLoc) {
        console.log('[PLAN-ROUTE] Geocoding end location with robust geocoding...');
        const endResult = await robustGeocode(finalEndLoc, toCoordinates);
        finalEndCoords = endResult.coordinates;
        setToCoordinates(finalEndCoords);
        console.log('[PLAN-ROUTE] ✅ End location geocoded:', finalEndCoords, `(source: ${endResult.source})`);
      }
    } catch (error) {
      console.error('[PLAN-ROUTE] Geocoding failed:', error);
      // REMOVED TOAST: Error will be displayed in UI
      return;
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
    console.log('========================================');
    console.log('[NAV-ACTIVATION] 🚀 START NAVIGATION CLICKED');
    console.log('========================================');
    console.log('[NAV-ACTIVATION] currentRoute:', currentRoute);
    console.log('[NAV-ACTIVATION] fromLocation:', fromLocation);
    console.log('[NAV-ACTIVATION] toLocation:', toLocation);
    console.log('[NAV-ACTIVATION] selectedProfile:', selectedProfile);
    console.log('[NAV-ACTIVATION] mobileNavMode (current):', mobileNavMode);
    console.log('[NAV-ACTIVATION] isNavigating (current):', isNavigating);
    console.log('[NAV-ACTIVATION] canStartNavigation():', canStartNavigation());
    
    // Clear any pending debounced mode transitions
    if (modeTransitionTimeoutRef.current) {
      clearTimeout(modeTransitionTimeoutRef.current);
    }
    
    // Mode transition guard for mobile - check BEFORE setting navigate mode
    if (isMobile && !canStartNavigation()) {
      console.error('[NAV-ACTIVATION] ❌ canStartNavigation() returned FALSE - blocking navigation');
      // REMOVED TOAST: No popups per user request
      return;
    }
    
    console.log('[NAV-ACTIVATION] ✅ Validation passed, proceeding with navigation start');
    
    // Additional comprehensive validation before starting
    if (!fromLocation || !toLocation) {
      console.error('[NAV-ACTIVATION] ❌ Missing location data');
      // REMOVED TOAST: No popups per user request
      return;
    }

    if (!selectedProfile) {
      console.error('[NAV-ACTIVATION] ❌ Missing vehicle profile');
      // REMOVED TOAST: No popups per user request
      return;
    }

    if (startJourneyMutation.isPending || activateJourneyMutation.isPending) {
      console.warn('[NAV-ACTIVATION] ⏳ Navigation already starting, preventing duplicate');
      return; // Prevent double-clicks/race conditions
    }

    try {
      console.log('[NAV-ACTIVATION] Step 1: Set navigation active state for CSS styling');
      // Set navigation active state for CSS styling
      document.body.classList.add('navigation-active');
      document.documentElement.classList.add('overlay-safe-mode');
      
      console.log('[NAV-ACTIVATION] Step 2: Close overlays and prepare UI');
      // Close all known overlay components using proper state management
      setIsAlternativeRoutesOpen(false);
      
      // Prepare navigation interface - collapse sidebar for maximum map visibility during navigation
      setSidebarState('collapsed');

      // Generate idempotency key for this navigation start
      const idempotencyKey = generateIdempotencyKey('start');
      
      console.log('[NAV-ACTIVATION] Step 3: Ensure route exists');
      // Ensure we have a route (calculate if needed, use returned value not state)
      let route = currentRoute;
      
      if (!route) {
        console.log('[NAV-START] No route exists - calculating route with bulletproof geocoding...');
        
        // Use bulletproof geocoding that handles ALL address formats
        let finalStartCoords = fromCoordinates;
        let finalEndCoords = toCoordinates;
        
        // Geocode start location using robust multi-fallback approach
        if (!fromLocation) {
          throw new Error('Start location is required');
        }
        
        console.log('[NAV-START] Geocoding start location...');
        const startResult = await robustGeocode(fromLocation, fromCoordinates);
        finalStartCoords = startResult.coordinates;
        setFromCoordinates(finalStartCoords);
        console.log('[NAV-START] ✅ Start location geocoded:', finalStartCoords, `(source: ${startResult.source})`);
        
        // Geocode end location using robust multi-fallback approach
        if (!toLocation) {
          throw new Error('End location is required');
        }
        
        console.log('[NAV-START] Geocoding end location...');
        const endResult = await robustGeocode(toLocation, toCoordinates);
        finalEndCoords = endResult.coordinates;
        setToCoordinates(finalEndCoords);
        console.log('[NAV-START] ✅ End location geocoded:', finalEndCoords, `(source: ${endResult.source})`);
        
        // Now calculate route with guaranteed coordinates
        console.log('[NAV-START] Calculating route with coordinates:', {
          start: finalStartCoords,
          end: finalEndCoords
        });
        
        route = await calculateRouteMutation.mutateAsync({
          startLocation: fromLocation,
          endLocation: toLocation,
          startCoordinates: finalStartCoords,
          endCoordinates: finalEndCoords,
          vehicleProfileId: selectedProfile?.id?.toString(),
          routePreference: 'fastest'
        });
        
        console.log('[NAV-START] ✅ Route calculation complete:', route);
      }
      
      if (!route?.id) {
        throw new Error('Route calculation failed - no route ID returned');
      }
      
      console.log('[NAV-START] ✅ Route ready, proceeding to start journey');

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
      
      console.log('[NAV-ACTIVATION] Step 4: ✅ Journey activated successfully');
      
      // CRITICAL: Set navigation states FIRST (before any events)
      // React state updates are async, so set them early
      console.log('========================================');
      console.log('[NAV-ACTIVATION] 🎯 SETTING NAVIGATION STATES');
      console.log('[NAV-ACTIVATION] Setting mobileNavMode = navigate');
      console.log('[NAV-ACTIVATION] Setting isNavigating = true');
      console.log('========================================');
      
      setMobileNavMode('navigate');
      setIsNavigating(true);
      
      // Store route ID for persistence
      if (route.id) {
        localStorage.setItem('activeRouteId', route.id.toString());
      }

      console.log('[NAV-ACTIVATION] Step 5: Dispatch secondary events');
      
      // Automatically enable street view in navigation mode when navigation starts
      const streetViewActivationEvent = new CustomEvent('activate_street_view_navigation', {
        detail: { route: route, profile: selectedProfile }
      });
      window.dispatchEvent(streetViewActivationEvent);

      // Expand map after brief delay for smoother transition
      setTimeout(() => {
        setIsMapExpanded(true);
      }, 300);

      // Dispatch navigation started event for notification system
      const navigationStartedEvent = new CustomEvent('navigation:started', {
        detail: { route: route, profile: selectedProfile }
      });
      window.dispatchEvent(navigationStartedEvent);
      
      console.log('========================================');
      console.log('[NAV-ACTIVATION] ✅ Navigation activation complete!');
      console.log('[NAV-ACTIVATION] States set - waiting for useEffect to trigger auto-zoom');
      console.log('========================================');

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

  // Get current coordinates for search - use GPS position, manual location, or fromCoordinates
  const currentCoordinates = gpsData?.position 
    ? { lat: gpsData.position.latitude, lng: gpsData.position.longitude }
    : gpsData?.manualLocation
    ? { lat: gpsData.manualLocation.latitude, lng: gpsData.manualLocation.longitude }
    : fromCoordinates;
  
  // Log GPS usage for debugging
  useEffect(() => {
    if (currentCoordinates) {
      const source = gpsData?.position ? 'GPS' : gpsData?.manualLocation ? 'manual location' : 'fromCoordinates';
      console.log(`[NAVIGATION] Using ${source} coordinates:`, currentCoordinates);
    } else {
      console.log('[NAVIGATION] No coordinates available - waiting for GPS signal or manual location');
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
    return <LegalDisclaimerSimple />;
  }

  return (
    <div className="min-h-[100svh] flex flex-col" style={{background: "transparent"}}>
      {/* Mobile-First Layout - Clean 3-Mode Workflow */}
      {isMobile ? (
        <>
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
                  <MapLibreMap
                    ref={mapRef}
                    currentRoute={currentRoute}
                    selectedProfile={selectedProfile || activeProfile}
                    showTraffic={showTrafficLayer}
                    showIncidents={showIncidents}
                    hideControls={mobileNavMode === 'preview' || mobileNavMode === 'navigate'}
                    hideCompass={mobileNavMode === 'preview' || mobileNavMode === 'navigate'}
                    onMapClick={handleMapClick}
                    isNavigating={isNavigating}
                  />
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
                  {/* Header - Thicker for better accessibility */}
                  <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between py-3 px-4 border-b-2 border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">TruckNav Pro</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowVehicleSettings(true)}
                      className="h-10 w-10 bg-green-600 hover:bg-green-700 text-white rounded-full"
                      data-testid="button-settings"
                    >
                      <Settings className="w-5 h-5" />
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
                  </div>

                  {/* Plan Route FAB - Opens comprehensive menu on mobile (Bottom Right) */}
                  <Button
                    onClick={() => setShowComprehensiveMenu(true)}
                    size="lg"
                    className="fixed z-[200] h-14 w-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 backdrop-blur-sm pointer-events-auto"
                    style={{
                      bottom: 'calc(24px + var(--safe-area-bottom))',
                      right: 'calc(24px + var(--safe-area-right))'
                    }}
                    data-testid="button-plan-route-fab"
                    aria-label="Open menu"
                  >
                    <Menu className="w-6 h-6" />
                  </Button>
                </div>
              )}

              {/* PREVIEW MODE OVERLAYS (z-10+) - Always rendered but hidden during navigation */}
              {mobileNavMode === 'preview' && (
                <div className={cn(
                  "transition-opacity duration-200",
                  isNavigating && "opacity-0 pointer-events-none"
                )}>
                  {/* Header - Thicker for better accessibility */}
                  <div className="absolute top-0 left-0 right-0 z-[100] flex items-center justify-between py-3 px-4 border-b-2 border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">TruckNav Pro</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowVehicleSettings(true)}
                      className="h-10 w-10 bg-green-600 hover:bg-green-700 text-white rounded-full"
                      data-testid="button-settings-preview"
                    >
                      <Settings className="w-5 h-5" />
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
                  </div>

                  {/* Blue Hamburger FAB - Opens route planning input (Bottom Right) */}
                  <Button
                    onClick={() => setShowComprehensiveMenu(true)}
                    size="lg"
                    className="fixed z-[200] h-14 w-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 backdrop-blur-sm pointer-events-auto"
                    style={{
                      bottom: 'calc(24px + var(--safe-area-bottom))',
                      right: 'calc(24px + var(--safe-area-right))'
                    }}
                    data-testid="button-open-input-preview"
                    aria-label="Open route planning"
                  >
                    <Menu className="w-6 h-6" />
                  </Button>
                </div>
              )}

              {/* NAVIGATE MODE OVERLAYS (z-10+) - BULLETPROOF: Always show during isNavigating */}
              {(mobileNavMode === 'navigate' || isNavigating) && (
                <>
                  {/* Compact Trip Strip - Shows ETA, Distance, Next Maneuver - MOBILE */}
                  {currentRoute && (
                    <div className="fixed top-0 left-0 right-0 z-[1700]" style={{ paddingTop: 'var(--safe-area-top, 0px)' }}>
                      <CompactTripStrip
                        eta={currentRoute.duration || 0}
                        distanceRemaining={currentRoute.distance || 0}
                        nextManeuver={nextTurn?.roadName || 'Continue'}
                        nextDistance={nextTurn?.distance ? nextTurn.distance / 1609.34 : 0}
                      />
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


                  {/* Navigation Controls moved outside MapShell - see bottom of mobile layout */}

                  {/* Professional Oval Speedometer HUD - THINNER/Smaller Footer */}
                  <div 
                    className="fixed left-1/2 -translate-x-1/2 z-[180] pointer-events-auto scale-90"
                    style={{
                      bottom: 'calc(16px + var(--safe-area-bottom, 0px))' // Positioned next to cancel button, thinner
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

                  {/* Cancel Route Button - Square X button at bottom-left */}
                  <Button
                    onClick={handleStopNavigation}
                    size="icon"
                    variant="destructive"
                    className={cn(
                      "fixed z-[170] h-14 w-14 shadow-2xl pointer-events-auto bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-2 border-white/30 transition-all duration-200 hover:scale-105 active:scale-95",
                      completeJourneyMutation.isPending && "opacity-50 cursor-not-allowed"
                    )}
                    style={{
                      bottom: 'calc(20px + var(--safe-area-bottom, 0px))',
                      left: 'calc(20px + var(--safe-area-left, 0px))'
                    }}
                    data-testid="button-cancel-route"
                    aria-label="Cancel route and return to start"
                  >
                    {completeJourneyMutation.isPending ? (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    ) : (
                      <X className="w-7 h-7" />
                    )}
                  </Button>

                  {/* Legal Ownership - Bottom of screen */}
                  <div className="fixed bottom-0 left-0 right-0 w-full z-[5] pointer-events-auto">
                    <MapLegalOwnership compact={true} className="sm:hidden" />
                  </div>

                  {/* MobileFAB - Bottom Right (separate fixed position) - BULLETPROOF: Hamburger menu always visible */}
                  <MobileFAB
                    mode="navigate"
                    onSettingsClick={() => setShowVehicleSettings(true)}
                    onClearRoute={handleStopNavigation}
                    onMenuClick={() => setShowComprehensiveMenu(true)}
                    onLayersClick={() => setShowTrafficLayer(!showTrafficLayer)}
                    onReportIncident={() => setShowIncidentReportDialog(true)}
                    onViewIncidents={() => setShowIncidentFeed(true)}
                    onCompassClick={() => mapRef.current?.resetBearing()}
                    bearing={mapBearing}
                    className="fixed z-[200] pointer-events-auto"
                    style={{
                      bottom: 'calc(100px + var(--safe-area-bottom))',
                      right: 'calc(24px + var(--safe-area-right))'
                    }}
                    data-testid="mobile-fab-navigate"
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

        {/* NAVIGATION CONTROLS - ONLY IN NAVIGATION MODE - CRITICAL FOR PWA */}
        {isNavigating && (
          <NavigationControlsStack
            mapRef={mapRef}
            mapBearing={mapBearing}
            map3DMode={map3DMode}
            onToggle3D={() => {
              mapRef.current?.toggle3DMode();
              setMap3DMode(!map3DMode);
            }}
            showTrafficLayer={showTrafficLayer}
            onToggleTraffic={() => setShowTrafficLayer(!showTrafficLayer)}
            mapViewMode={mapViewMode}
            onToggleMapView={() => {
              const newMode = mapViewMode === 'roads' ? 'satellite' : 'roads';
              setMapViewMode(newMode);
              mapRef.current?.toggleMapView();
            }}
            onViewIncidents={() => setShowIncidentFeed(true)}
            mode="navigate"
          />
        )}
        
        </>
      ) : (
        /* Desktop Layout - Keep existing sidebar layout with features sidebar */
        <div className={cn(
          "flex h-screen overflow-hidden",
          "automotive-layout desktop-sidebar"
        )}>
          
          {/* Desktop Hamburger Menu - Hidden during navigation mode */}
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
            coordinates={currentCoordinates ?? undefined}
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
                  <MapLibreMap
                    ref={mapRef}
                    currentRoute={currentRoute}
                    selectedProfile={selectedProfile || activeProfile}
                    showTraffic={showTrafficLayer}
                    showIncidents={showIncidents}
                    hideControls={mobileNavMode === 'preview' || mobileNavMode === 'navigate'}
                    hideCompass={mobileNavMode === 'preview' || mobileNavMode === 'navigate'}
                    onMapClick={handleMapClick}
                    isNavigating={isNavigating}
                  />
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
                
                {/* NAVIGATE MODE OVERLAYS - Desktop */}
                {isNavigating && (
                  <>
                    {/* Compact Trip Strip - Shows ETA, Distance, Next Maneuver - DESKTOP */}
                    {currentRoute && (
                      <div className="absolute left-0 right-0 z-[95]" style={{ top: 'var(--safe-area-top, 0px)' }}>
                        <CompactTripStrip
                          eta={currentRoute.duration || 0}
                          distanceRemaining={currentRoute.distance || 0}
                          nextManeuver={nextTurn?.roadName || 'Continue'}
                          nextDistance={nextTurn?.distance ? nextTurn.distance / 1609.34 : 0}
                        />
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

                    {/* Map Control Buttons - Right Side Stack (z-[500]+) */}
                    <div 
                      className="fixed z-[500] flex flex-col gap-3 pointer-events-auto" 
                      style={{ 
                        top: 'calc(7rem + var(--safe-area-top))',
                        right: 'calc(1rem + var(--safe-area-right))'
                      }}
                      data-testid="navigation-controls-right"
                    >
                      {/* 1. Compass Dial Button - Fancy compass with red/blue needle at TOP */}
                      <Button
                        size="icon"
                        onClick={() => mapRef.current?.resetBearing()}
                        className="h-11 w-11 rounded-xl shadow-2xl bg-white/95 backdrop-blur-md hover:bg-white hover:scale-105 text-gray-800 border border-white/50 pointer-events-auto transition-all duration-200 active:scale-95"
                        data-testid="button-compass-dial-navigate"
                        aria-label="Reset compass to North"
                      >
                        <svg 
                          width="24" 
                          height="24" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                          className="transition-transform duration-300"
                          style={{ transform: `rotate(${mapBearing}deg)` }}
                        >
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                          <path 
                            d="M 12 2 L 14 12 L 12 10 L 10 12 Z" 
                            fill="#EF4444" 
                            stroke="#DC2626" 
                            strokeWidth="0.5"
                          />
                          <path 
                            d="M 12 22 L 14 12 L 12 14 L 10 12 Z" 
                            fill="#3B82F6" 
                            stroke="#2563EB" 
                            strokeWidth="0.5"
                          />
                          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                        </svg>
                      </Button>
                      
                      {/* 2. Recenter Button */}
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
                      {/* 3. Zoom In Button */}
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
                      <Button
                        size="icon"
                        onClick={() => {
                          const newMode = mapViewMode === 'roads' ? 'satellite' : 'roads';
                          setMapViewMode(newMode);
                          mapRef.current?.toggleMapView();
                        }}
                        className={cn(
                          "h-11 w-11 rounded-xl shadow-2xl pointer-events-auto transition-all duration-200 border active:scale-95",
                          mapViewMode === 'satellite'
                            ? "bg-gradient-to-br from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:scale-105 border-green-400/50"
                            : "bg-white/95 backdrop-blur-md hover:bg-white hover:scale-105 text-gray-800 border-white/50"
                        )}
                        data-testid="button-map-view-toggle-navigate"
                        aria-label={mapViewMode === 'roads' ? "Switch to satellite view" : "Switch to road view"}
                      >
                        <Map className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Professional Oval Speedometer HUD - Fixed position next to cancel button */}
                    <div 
                      className="fixed left-1/2 -translate-x-1/2 z-[180] pointer-events-auto"
                      style={{
                        bottom: 'calc(20px + var(--safe-area-bottom, 0px))'
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

                    {/* Cancel Route Button - Square X button at bottom-left */}
                    <Button
                      onClick={handleStopNavigation}
                      size="icon"
                      variant="destructive"
                      className={cn(
                        "fixed z-[170] h-14 w-14 shadow-2xl pointer-events-auto bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-2 border-white/30 transition-all duration-200 hover:scale-105 active:scale-95",
                        completeJourneyMutation.isPending && "opacity-50 cursor-not-allowed"
                      )}
                      style={{
                        bottom: 'calc(20px + var(--safe-area-bottom, 0px))',
                        left: 'calc(20px + var(--safe-area-left, 0px))'
                      }}
                      data-testid="button-cancel-route"
                      aria-label="Cancel route and return to start"
                    >
                      {completeJourneyMutation.isPending ? (
                        <Loader2 className="w-7 h-7 animate-spin" />
                      ) : (
                        <X className="w-7 h-7" />
                      )}
                    </Button>
                  </>
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

      {/* Comprehensive Mobile Menu */}
      <ComprehensiveMobileMenu
        open={showComprehensiveMenu}
        onOpenChange={setShowComprehensiveMenu}
        onFromLocationChange={setFromLocation}
        onToLocationChange={setToLocation}
        onPlanRoute={handlePlanRoute}
        onStartNavigation={handleStartNavigation}
        onStopNavigation={handleStopNavigation}
        currentRoute={currentRoute}
        isCalculating={calculateRouteMutation.isPending}
        isNavigating={isNavigating}
        selectedProfile={selectedProfile}
        onProfileSelect={(profile) => {
          setSelectedProfile(profile);
          queryClient.invalidateQueries({ queryKey: ["/api/vehicle-profiles"] });
        }}
        coordinates={currentGPSLocation}
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
