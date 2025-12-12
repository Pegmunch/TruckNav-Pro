import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Truck, X, Menu, MapPin, Settings, Search, Camera, Navigation, Navigation2, Car, AlertCircle, Compass, Box, Plus, Minus, Layers, Loader2, Crosshair, Hourglass, Map } from "lucide-react";
import { usePWAEnvironment } from "@/contexts/pwa-environment";
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
import { useNavigationSession } from "@/hooks/use-navigation-session";
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
import { NavigationHeader } from "@/components/navigation/navigation-header";
import { IncidentReportDialog } from "@/components/incidents/incident-report-dialog";
import { IncidentFeed } from "@/components/incidents/incident-feed";
import IncidentFeedPopup from "@/components/incidents/incident-feed-popup";
import SpeedDisplay from "@/components/map/speed-display";
import SpeedometerHUD from "@/components/navigation/speedometer-hud";
import { GPSProvider, useGPS } from "@/contexts/gps-context";
import { useManualLocation } from "@/hooks/use-manual-location";
import { reverseGeocode, formatCoordinatesAsAddress } from "@/lib/reverse-geocode";
import { geocodeUKPostcode } from "@/lib/uk-postcode-geocoding";
import { looksLikePostcode, detectPostcodeCountry } from "@/lib/postcode-utils";
import { robustGeocode } from "@/lib/robust-geocoding";
import { useMeasurement } from "@/components/measurement/measurement-provider";

import { NavigationControlsStack } from "@/components/navigation/navigation-controls-stack";
import { NavigationLayout } from "@/components/navigation/navigation-layout";
import { LeftActionStack } from "@/components/navigation/left-action-stack";
import { BottomInstrumentationBar } from "@/components/navigation/bottom-instrumentation-bar";
import { navigationVoice } from "@/lib/navigation-voice";
import { DesktopHeader } from "@/components/navigation/desktop-header";
import RestrictionsWarningPanel from "@/components/navigation/restrictions-warning-panel";

// Removed duplicate NavigationControlsStack - now imported from component

// NavigationControlsStack has been moved to its own component file
// Import is at the top of this file

// Extended Route type with API-only fields for route calculation responses
type RouteWithViolations = Route & {
  violations?: Array<{
    restriction: {
      id: string;
      type: string;
      limit: number;
      location: string;
      description?: string;
      roadName?: string;
      severity: string;
      coordinates?: { lat: number; lng: number };
    };
    severity: string;
    bypassable: boolean;
  }>;
  isRouteAllowed?: boolean;
};

// Inner component that uses GPS context
function NavigationPageContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { isStandalone } = usePWAEnvironment();
  const { mapEngine, toggleMapEngine, isMapLibre } = useMapEngine();
  
  // Get GPS data from singleton provider
  const gpsData = useGPS();
  
  // Manual location dialog hook
  const { 
    showManualLocationDialog, 
    setShowManualLocationDialog, 
    manualLocationAddress, 
    setManualLocationAddress, 
    isSubmitting, 
    handleManualLocationSubmit 
  } = useManualLocation();
  
  // Get user measurement preference (mi/km)
  const { system: measurementSystem } = useMeasurement();
  
  // Use centralized vehicle profile management
  const { activeProfile, activeProfileId, isLoading: profileLoading, setActiveProfile } = useActiveVehicleProfile();
  const [selectedProfile, setSelectedProfile] = useState<VehicleProfile | null>(activeProfile);
  const [currentRoute, setCurrentRoute] = useState<RouteWithViolations | null>(null);
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [fromCoordinates, setFromCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [toCoordinates, setToCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [routePreference, setRoutePreference] = useState<'fastest' | 'eco' | 'avoid_tolls'>('fastest');
  const [showLaneGuidance, setShowLaneGuidance] = useState(false);
  
  // CRITICAL: Single source of truth for navigation state - prevents race conditions
  const navSession = useNavigationSession();
  const { state: navState, journeyId, shouldShowHUD, canStart } = navSession;
  
  // LOCAL NAVIGATION UI STATE - Independent of server session state
  // This fixes PWA session issues where UI disappears when session changes
  const [isLocalNavActive, setIsLocalNavActive] = useState(() => {
    // Initialize from localStorage to survive page reloads
    return localStorage.getItem('navigation_ui_active') === 'true';
  });
  
  // Backwards compatibility: Derive isNavigating from LOCAL state (not server)
  const isNavigating = isLocalNavActive;
  
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
  
  // Route cancellation guard to prevent race condition
  const isCancellingRouteRef = useRef(false);
  
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
  
  // CRITICAL: Derive mobileNavMode correctly from all relevant state
  // plan = no route, preview = route exists but not navigating, navigate = active navigation
  // FIXED: isLocalNavActive alone is not enough - must also have a valid route to be in navigate mode
  const mobileNavMode: MobileNavMode = isLocalNavActive && currentRoute !== null
    ? 'navigate' 
    : currentRoute !== null
      ? 'preview'
      : 'plan';
  
  // CRITICAL FIX: Navigation UI should show in preview AND navigate modes (not plan)
  // This ensures buttons and ETA header render whenever a route is calculated
  const isNavUIActive = shouldShowHUD || mobileNavMode !== 'plan';
  
  // CRITICAL FIX: Only show GPS truck marker during ACTIVE navigation
  // Hide in plan and preview modes across all platforms for consistency
  const showUserMarker = useMemo(() => {
    // Only show the marker when actively navigating (navigate mode)
    // This ensures consistency between mobile browser and PWA modes
    return mobileNavMode === 'navigate';
  }, [mobileNavMode]);
  
  // Debug logging whenever mode changes
  useEffect(() => {
    console.log('[NAV-MODE-STATE] mobileNavMode changed to:', mobileNavMode);
    console.log('[NAV-MODE-STATE] isNavigating:', isNavigating);
  }, [mobileNavMode, isNavigating]);
  
  // CRITICAL FIX: Auto-reset isLocalNavActive when no route exists
  // This ensures stale localStorage doesn't keep the app in navigate mode
  // DELAYED: Wait for route data to settle before resetting to avoid clearing on initial mount
  const [routeDataSettled, setRouteDataSettled] = useState(false);
  
  useEffect(() => {
    // Give the route data time to load from server/localStorage before checking
    const timer = setTimeout(() => {
      setRouteDataSettled(true);
    }, 2000); // 2 second delay to allow route data to rehydrate
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    // Only reset if route data has settled AND there's no route AND local nav is active
    if (routeDataSettled && currentRoute === null && isLocalNavActive) {
      console.log('[NAV-STATE] Auto-resetting isLocalNavActive - no route exists after data settled');
      setIsLocalNavActive(false);
      localStorage.removeItem('navigation_ui_active');
      localStorage.removeItem('navigation_mode');
    }
  }, [currentRoute, isLocalNavActive, routeDataSettled]);
  
  // Mode transition debouncing to prevent race conditions
  // REMOVED: Debounced setter was causing race conditions
  // Now using direct setMobileNavMode for immediate UI updates

  // Cleanup removed - no longer using debounced transitions
  
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
  
  // Announce turn-by-turn navigation with voice
  useEffect(() => {
    if (!isNavigating || !nextTurn || !professionalVoiceEnabled) {
      return;
    }
    
    // Get the measurement unit (mi or km)
    const unit = measurementSystem === 'imperial' ? 'mi' : 'km';
    
    // Announce the turn based on distance
    navigationVoice.announceTurn(
      nextTurn.direction,
      nextTurn.distance, // Already in meters
      nextTurn.roadName,
      unit
    );
  }, [nextTurn, isNavigating, professionalVoiceEnabled, measurementSystem]);
  
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
      // Announce arrival with voice
      if (professionalVoiceEnabled) {
        navigationVoice.announceArrival();
      }
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
          zoom: 14.5,              // Wider view for better route context
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
  
  // SIMPLIFIED: Guard to ensure navigate mode is active during navigation
  // Only enforces navigate mode when navigation is active, no other automatic transitions
  useEffect(() => {
    // Silently enforce navigate mode without logging
  }, [isMobile, isNavigating, mobileNavMode]);
  
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

      // Get map instance and start 3D heading-up navigation immediately
      const mapInstance = mapRef.current.getMap();
      if (mapInstance && mapInstance.isStyleLoaded()) {
        console.log('[NAV-ZOOM] Starting 3D heading-up navigation...');
        
        // Start directly in 3D navigation mode with heading-up orientation
        mapInstance.flyTo({
          center: [targetLng, targetLat],
          zoom: 17,    // Close zoom for navigation
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
        
        // Activate 3D mode immediately
        setMap3DMode(true);
        
        console.log('[NAV-ZOOM] ✅ 3D heading-up navigation active - route vertical and centered')
      } else {
        console.warn('[NAV-ZOOM] ⚠️ Map not ready - retrying in 500ms');
        
        // Retry with 3D navigation mode
        setTimeout(() => {
          if (mapRef.current) {
            const retryMap = mapRef.current.getMap();
            if (retryMap) {
              retryMap.flyTo({
                center: [targetLng, targetLat],
                zoom: 17,
                pitch: 67,
                bearing: initialBearing,
                padding: { top: 280, bottom: 120, left: 0, right: 0 },
                duration: 1500,
                essential: true
              });
              setMap3DMode(true);
              console.log('[NAV-ZOOM] ✅ 3D navigation active (retry succeeded)');
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
      const speedometer = document.querySelector('[data-testid="speedometer-hud"]');
      if (!speedometer) {
        console.error('[NAV-MODE] CRITICAL: Speedometer not found in navigate mode!');
      } else {
        console.log('[NAV-MODE] ✓ Speedometer visibility confirmed');
      }
    };

    // Check every 3 seconds during navigation
    const interval = setInterval(checkSpeedometerVisibility, 3000);

    return () => clearInterval(interval);
  }, [mobileNavMode]);
  
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
  const { data: currentJourney, refetch: refetchCurrentJourney, isFetching: isJourneyFetching } = useQuery<Journey | null>({
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

  // SIMPLIFIED: Sync route data with current journey
  // Navigation state is now automatically derived by useNavigationSession hook
  useEffect(() => {
    // GUARD: If route is being cancelled, don't re-fetch it
    if (isCancellingRouteRef.current) {
      console.log('[JOURNEY-LOAD] ⏸️ Route cancellation in progress - skipping route fetch');
      return;
    }
    
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
        setFromLocation('');
        setToLocation('');
        setFromCoordinates(null);
        setToCoordinates(null);
        return;
      }
      
      // Load the route data from the journey's routeId
      if (currentJourney.routeId) {
        console.log('[JOURNEY-LOAD] Journey has routeId, fetching route:', currentJourney.routeId);
        fetch(`/api/routes/${currentJourney.routeId}`)
          .then(res => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json();
          })
          .then(route => {
            // Double-check guard before setting route (in case cancellation happened during fetch)
            if (isCancellingRouteRef.current) {
              console.log('[JOURNEY-LOAD] ⏸️ Route cancelled during fetch - discarding fetched route');
              return;
            }
            
            console.log('[JOURNEY-LOAD] ✅ Successfully loaded route from journey');
            setCurrentRoute(route);
            
            // Populate location fields from route data
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
          });
      }
      
      // NOTE: Navigation state is automatically derived from journey status by useNavigationSession
      // No need to manually set isNavigating or mobileNavMode
      console.log('[JOURNEY-LOAD] Navigation state auto-derived from navSession:', {
        journeyStatus: currentJourney.status,
        navState,
        shouldShowHUD
      });
    } else {
      // No journey - clear route data
      console.log('[JOURNEY-LOAD] No journey - clearing route data');
      setCurrentRoute(null);
      // NOTE: Navigation state is automatically derived by useNavigationSession
    }
  }, [currentJourney, navState, shouldShowHUD]);

  // Handle page refresh - restore journey if it exists
  // NOTE: Navigation state is automatically derived by useNavigationSession hook
  useEffect(() => {
    const storedJourneyId = localStorage.getItem('activeJourneyId');
    
    if (storedJourneyId) {
      // Journey exists in localStorage - refetch it
      // The navSession hook will automatically derive the correct navigation state
      console.log('[INIT] Refetching journey from localStorage:', storedJourneyId);
      refetchCurrentJourney();
    } else {
      // Clean up any stale localStorage flags
      console.log('[INIT] No stored journey - cleaning up localStorage');
      localStorage.removeItem('navigation_mode');
      localStorage.removeItem('navigation_timestamp');
      localStorage.removeItem('activeRouteId');
    }
  }, []);
  
  // PWA/Mobile lifecycle management - clean up localStorage properly
  // NOTE: Navigation state is automatically derived by useNavigationSession hook
  useEffect(() => {
    const clearNavigationState = () => {
      console.log('[LIFECYCLE] App suspending/closing - clearing localStorage');
      localStorage.removeItem('navigation_mode');
      localStorage.removeItem('navigation_timestamp');
      localStorage.removeItem('activeJourneyId');
      localStorage.removeItem('activeRouteId');
      // NOTE: No need to set state - navSession will auto-derive when journey is cleared
    };
    
    // Handle page hide (mobile browser minimized or PWA closed)
    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page is being cached, clear navigation state
        clearNavigationState();
      }
    };
    
    // Handle visibility change (tab switching, minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Only clear if navigation is active and app is being hidden for extended time
        const navMode = localStorage.getItem('navigation_mode');
        if (navMode === 'navigate') {
          // Update timestamp to track when app was hidden
          localStorage.setItem('navigation_timestamp', Date.now().toString());
        }
      }
    };
    
    // Handle freeze event (modern lifecycle API)
    const handleFreeze = () => {
      clearNavigationState();
    };
    
    // Handle beforeunload (page closing)
    const handleBeforeUnload = () => {
      // Only clear if in navigation mode
      const navMode = localStorage.getItem('navigation_mode');
      if (navMode === 'navigate') {
        clearNavigationState();
      }
    };
    
    // Register all lifecycle listeners
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('freeze', handleFreeze);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('freeze', handleFreeze);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
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
    mutationKey: ['activateJourney'], // CRITICAL: For useNavigationSession to track 'starting' state
    mutationFn: async ({ journeyId, idempotencyKey }: { journeyId: number; idempotencyKey: string }) => {
      const response = await apiRequest("PATCH", `/api/journeys/${journeyId}/activate`, {}, { idempotencyKey });
      return response.json();
    },
    onSuccess: (journey) => {
      localStorage.setItem('activeJourneyId', journey.id.toString());
      // CRITICAL: Invalidate the exact query key that navSession uses
      queryClient.invalidateQueries({ queryKey: ["/api/journeys/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      refetchCurrentJourney();
    },
    onError: (error) => {
      console.error('Failed to activate journey:', error);
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
    mutationKey: ['completeJourney'], // CRITICAL: For useNavigationSession to track 'completing' state
    mutationFn: async (journeyId: number) => {
      const response = await apiRequest("PATCH", `/api/journeys/${journeyId}/complete`, {});
      return response.json();
    },
    onSuccess: (journey) => {
      setCurrentRoute(null);
      localStorage.removeItem('activeJourneyId');
      // CRITICAL: Invalidate the exact query key that navSession uses
      queryClient.invalidateQueries({ queryKey: ["/api/journeys/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys", "last"] });
      refetchCurrentJourney();
      
      // Reset cancellation guard after journey is completed
      isCancellingRouteRef.current = false;
      console.log('[JOURNEY-COMPLETE] ✅ Route cancellation guard reset');
    },
    onError: (error) => {
      console.error('Failed to complete journey:', error);
      // Comprehensive UI recovery on journey completion failure
      recoverUIOnError();
      // Show user-friendly error message
      // REMOVED TOAST: No popups per user request
      
      // Reset cancellation guard even on error
      isCancellingRouteRef.current = false;
      console.log('[JOURNEY-COMPLETE] ⚠️ Route cancellation guard reset (error path)');
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
      performance.mark('route-calc-start');
      console.log('[PERF] 🚀 Route calculation START - from:', routeData.startLocation, 'to:', routeData.endLocation);
      
      const response = await apiRequest("POST", "/api/routes/calculate", routeData);
      const result = await response.json();
      
      performance.mark('route-calc-api-end');
      performance.measure('route-calc-api', 'route-calc-start', 'route-calc-api-end');
      const apiMeasure = performance.getEntriesByName('route-calc-api')[0];
      console.log(`[PERF] ✅ Route API response: ${apiMeasure.duration.toFixed(0)}ms`);
      
      return result;
    },
    onSuccess: (route) => {
      performance.mark('route-calc-state-update-start');
      
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
      
      // If route calculation includes a plannedJourney (from route calculation), update sync
      // NOTE: We don't persist to localStorage here - only persist when user actually starts navigation
      // This prevents preview routes from reappearing on app reload
      if (route.plannedJourney) {
        // Removed: localStorage.setItem('activeJourneyId', route.plannedJourney.id.toString());
        // Only startNavigationMutation (line ~1417) persists to localStorage
        windowSync.updateJourney(route.plannedJourney, false);
      }
      
      // Skip route preview - directly expand map for better route visibility
      const handleMapExpansion = () => {
        performance.mark('map-expansion-start');
        
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
        
        performance.mark('map-expansion-end');
        performance.measure('map-expansion', 'map-expansion-start', 'map-expansion-end');
        const mapMeasure = performance.getEntriesByName('map-expansion')[0];
        console.log(`[PERF] 📍 Map expansion completed: ${mapMeasure.duration.toFixed(0)}ms`);
      };

      // Small delay to allow route state to update
      setTimeout(handleMapExpansion, 200);
      
      // DISABLED: Toast notifications removed per user request
      // Toast pop-ups were interfering with input fields on mobile

      // AUTO-TRANSITION: 10-second preview, then auto-start navigation
      // Show preview mode for 10 seconds, then automatically transition to navigation view
      performance.mark('preview-mode-start');
      console.log('[PERF] 📺 Preview mode START');
      console.log('[AUTO-NAV] Route calculated - showing 10-second preview before auto-start');
      console.log('[AUTO-NAV] isMobile:', isMobile);
      console.log('[AUTO-NAV] route exists:', !!route);
      console.log('[AUTO-NAV] routePath length:', route?.routePath?.length || 0);
      
      if (isMobile && route && route.routePath && route.routePath.length > 0 && !isNavigating) {
        console.log('[AUTO-NAV] Starting 10-second preview countdown...');
        
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
        
        // AUTO-START NAVIGATION: 10-second countdown timer
        console.log('[AUTO-NAV] ⏲️ Setting 10-second auto-start timer...');
        setTimeout(() => {
          performance.mark('preview-mode-end');
          performance.measure('preview-mode-duration', 'preview-mode-start', 'preview-mode-end');
          const previewMeasure = performance.getEntriesByName('preview-mode-duration')[0];
          console.log(`[PERF] ⏱️ Preview mode duration: ${previewMeasure.duration.toFixed(0)}ms`);
          
          // Only auto-start if still in preview mode (user hasn't manually started)
          if (!isNavigating && currentRoute) {
            console.log('[AUTO-NAV] ⏰ 10 seconds elapsed - auto-starting navigation!');
            handleStartNavigation();
          } else {
            console.log('[AUTO-NAV] ⏸️ Auto-start cancelled - navigation already active or route cleared');
          }
        }, 10000); // 10 seconds = 10000ms
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
    // CRITICAL: Set cancellation guard to prevent race condition where
    // currentJourney still exists and triggers route re-fetch before completion
    isCancellingRouteRef.current = true;
    console.log('[ROUTE-CANCEL] 🛡️ Route cancellation guard activated');
    
    // CRITICAL FIX: Immediately clear navigation UI state to return to preview mode
    // This ensures the hamburger button reappears immediately
    setIsLocalNavActive(false);
    setShowComprehensiveMenu(false);
    localStorage.removeItem('navigation_ui_active');
    localStorage.removeItem('navigation_mode');
    localStorage.removeItem('navigation_timestamp');
    console.log('[ROUTE-CANCEL] ✅ Navigation UI state cleared - returning to preview mode');
    
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
    
    if (currentJourney?.id && (currentJourney.status === 'active' || currentJourney.status === 'planned')) {
      completeJourneyMutation.mutate(currentJourney.id);
    } else {
      // No journey to complete - reset guard immediately
      isCancellingRouteRef.current = false;
      console.log('[ROUTE-CANCEL] ℹ️ No journey to complete - guard reset immediately');
    }
    
    console.log('[ROUTE-CANCEL] ✅ Route cancelled - returned to preview mode');
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

  // Centralized route acquisition helper - ensures route exists before navigation
  const ensureRouteReady = useCallback(async (): Promise<Route | null> => {
    // If route already exists, return it immediately
    if (currentRoute?.id) {
      console.log('[ROUTE-READY] ✅ Route already exists:', currentRoute.id);
      return currentRoute;
    }
    
    // Validate locations before calculating
    if (!fromLocation || !toLocation) {
      console.error('[ROUTE-READY] ❌ Missing locations - cannot calculate route');
      return null;
    }
    
    if (!selectedProfile) {
      console.error('[ROUTE-READY] ❌ Missing vehicle profile - cannot calculate route');
      return null;
    }
    
    console.log('[ROUTE-READY] Calculating route atomically...');
    
    try {
      // Geocode locations
      let finalStartCoords = fromCoordinates;
      let finalEndCoords = toCoordinates;
      
      const startResult = await robustGeocode(fromLocation, fromCoordinates);
      finalStartCoords = startResult.coordinates;
      setFromCoordinates(finalStartCoords);
      
      const endResult = await robustGeocode(toLocation, toCoordinates);
      finalEndCoords = endResult.coordinates;
      setToCoordinates(finalEndCoords);
      
      // Calculate route
      const route = await calculateRouteMutation.mutateAsync({
        startLocation: fromLocation,
        endLocation: toLocation,
        startCoordinates: finalStartCoords,
        endCoordinates: finalEndCoords,
        vehicleProfileId: selectedProfile?.id?.toString(),
        routePreference: 'fastest'
      });
      
      console.log('[ROUTE-READY] ✅ Route calculated:', route?.id);
      return route;
    } catch (error) {
      console.error('[ROUTE-READY] ❌ Route calculation failed:', error);
      return null;
    }
  }, [currentRoute, fromLocation, toLocation, fromCoordinates, toCoordinates, selectedProfile, robustGeocode, calculateRouteMutation]);

  // Mode validation guard to prevent invalid navigation transitions
  const canStartNavigation = useCallback(() => {
    if (isMobile && mobileNavMode !== 'preview' && mobileNavMode !== 'navigate') {
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
    performance.mark('nav-activation-start');
    console.log('========================================');
    console.log('[PERF] 🎬 NAVIGATION ACTIVATION START');
    console.log('[NAV-ACTIVATION] 🚀 START NAVIGATION CLICKED');
    console.log('========================================');
    console.log('[NAV-ACTIVATION] currentRoute:', currentRoute);
    console.log('[NAV-ACTIVATION] fromLocation:', fromLocation);
    console.log('[NAV-ACTIVATION] toLocation:', toLocation);
    console.log('[NAV-ACTIVATION] selectedProfile:', selectedProfile);
    console.log('[NAV-ACTIVATION] mobileNavMode (current):', mobileNavMode);
    console.log('[NAV-ACTIVATION] isNavigating (current):', isNavigating);
    console.log('[NAV-ACTIVATION] canStartNavigation():', canStartNavigation());
    
    // Mode transitions are now immediate - no cleanup needed
    
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
      performance.mark('route-ready-check-start');
      console.log('[NAV-ACTIVATION] Step 1: Ensure route exists');
      // Use centralized route acquisition to ensure route exists atomically
      const route = await ensureRouteReady();
      performance.mark('route-ready-check-end');
      performance.measure('route-ready-check', 'route-ready-check-start', 'route-ready-check-end');
      const routeReadyMeasure = performance.getEntriesByName('route-ready-check')[0];
      console.log(`[PERF] 🔍 Route ready check: ${routeReadyMeasure.duration.toFixed(0)}ms`);
      
      if (!route?.id) {
        console.error('[NAV-ACTIVATION] ❌ Route acquisition failed - cannot start navigation');
        // Removed toast - user will see button remains clickable for retry
        return;
      }
      
      // CRITICAL: Persist route to state so component receives valid route
      setCurrentRoute(route);
      console.log('[NAV-ACTIVATION] ✅ Route ready and persisted to state, proceeding with journey activation');

      // NOTE: Navigation state will be automatically derived by navSession hook
      // after journey is created/activated - no need to manually set states
      
      // Force zoom to navigation level regardless of GPS status
      if (mapRef.current && (fromCoordinates || toCoordinates)) {
        const zoomTarget = fromCoordinates || toCoordinates;
        if (zoomTarget) {
          console.log('[NAV-ACTIVATION] 🎯 Forcing navigation zoom to:', zoomTarget);
          // Use zoomToUserLocation with fallback coordinates for consistent API
          mapRef.current.zoomToUserLocation({
            zoom: 14.5, // Wider view for better route overview
            pitch: isMapLibre ? 45 : 0, // Tilt for 3D effect if MapLibre
            bearing: 0,
            duration: 1500,
            fallbackCoordinates: { lat: zoomTarget.lat, lng: zoomTarget.lng },
            forceStreetMode: true
          });
        }
      }
      
      console.log('[NAV-ACTIVATION] Step 2: Set navigation active state for CSS styling');
      // Set navigation active state for CSS styling
      document.body.classList.add('navigation-active');
      document.documentElement.classList.add('overlay-safe-mode');
      
      console.log('[NAV-ACTIVATION] Step 3: Close overlays and prepare UI');
      // Close all known overlay components using proper state management
      setIsAlternativeRoutesOpen(false);
      setShowComprehensiveMenu(false); // CRITICAL: Close menu to allow NavigationLayout to render
      
      // Prepare navigation interface - collapse sidebar for maximum map visibility during navigation
      setSidebarState('collapsed');

      // Generate idempotency key for this navigation start
      const idempotencyKey = generateIdempotencyKey('start');
      
      performance.mark('journey-creation-start');
      console.log('[NAV-ACTIVATION] Step 4: Start journey');

      // Single linear navigation flow with proper mutation sequence
      let journeyId: number;
      if (currentJourney?.status === 'planned') {
        journeyId = currentJourney.id;
      } else {
        const newJourney = await startJourneyMutation.mutateAsync({ 
          routeId: route.id, 
          idempotencyKey 
        });
        journeyId = newJourney.id;
      }
      
      // CRITICAL FIX: Capture the activated journey response and store in state
      const activatedJourney = await activateJourneyMutation.mutateAsync({ 
        journeyId, 
        idempotencyKey 
      });
      
      performance.mark('journey-creation-end');
      performance.measure('journey-creation', 'journey-creation-start', 'journey-creation-end');
      const journeyMeasure = performance.getEntriesByName('journey-creation')[0];
      console.log(`[PERF] ⚡ Journey creation & activation: ${journeyMeasure.duration.toFixed(0)}ms`);
      
      console.log('[NAV-ACTIVATION] Step 4: ✅ Journey activated successfully');
      console.log('[NAV-ACTIVATION] Activated journey:', activatedJourney);
      
      // Store journey ID in localStorage for persistence across page refreshes
      localStorage.setItem('activeJourneyId', activatedJourney.id.toString());
      console.log('[NAV-ACTIVATION] ✅ Journey ID stored in localStorage');
      
      // CRITICAL FIX: Set local navigation UI state to persist across session changes
      // This ensures UI stays visible even if server session changes in PWA mode
      setIsLocalNavActive(true);
      localStorage.setItem('navigation_ui_active', 'true');
      console.log('[NAV-ACTIVATION] ✅ Local navigation UI state activated - UI will persist');
      
      // SAFETY GUARD: Force re-render after a microtask to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 0));
      console.log('[NAV-ACTIVATION] State update flushed to ensure UI renders');
      
      performance.mark('nav-activation-end');
      performance.measure('nav-activation-total', 'nav-activation-start', 'nav-activation-end');
      const totalMeasure = performance.getEntriesByName('nav-activation-total')[0];
      console.log(`[PERF] ⏱️ TOTAL Navigation activation time: ${totalMeasure.duration.toFixed(0)}ms`);
      
      // Log all performance marks for this session
      console.log('[PERF] 📊 Performance Summary:');
      const allMeasures = performance.getEntriesByType('measure').filter(m => m.name.includes('route') || m.name.includes('preview') || m.name.includes('journey') || m.name.includes('nav-activation'));
      allMeasures.forEach(measure => {
        console.log(`  - ${measure.name}: ${measure.duration.toFixed(0)}ms`);
      });
      
      // NOTE: Navigation state will automatically be derived by navSession hook
      // from the journey query refetch - no need to manually set states
      
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
    // CRITICAL: Set cancellation guard to prevent race condition where
    // currentJourney still exists and triggers route re-fetch before completion
    isCancellingRouteRef.current = true;
    console.log('[NAV-STOP] 🛡️ Route cancellation guard activated');
    
    // CRITICAL FIX: Immediately clear navigation UI state to return to preview mode
    // This ensures the hamburger button reappears immediately
    setIsLocalNavActive(false);
    setShowComprehensiveMenu(false);
    localStorage.removeItem('navigation_ui_active');
    localStorage.removeItem('navigation_mode');
    localStorage.removeItem('navigation_timestamp');
    localStorage.removeItem('activeRouteId');
    localStorage.removeItem('activeJourneyId');
    console.log('[NAV-STOP] ✅ Navigation UI state cleared - returning to preview mode');
    
    if (currentJourney && (currentJourney.status === 'active' || currentJourney.status === 'planned')) {
      completeJourneyMutation.mutate(currentJourney.id);
    } else {
      // No journey to complete - reset guard immediately
      isCancellingRouteRef.current = false;
      console.log('[NAV-STOP] ℹ️ No journey to complete - guard reset immediately');
    }
    
    // Clear URL parameter
    const url = new URL(window.location.href);
    if (url.searchParams.has('journey')) {
      url.searchParams.delete('journey');
      window.history.replaceState({}, '', url.pathname);
    }
    
    // Comprehensive state reset - completely cancel navigation
    setCurrentRoute(null);
    setPreviewRoute(null);
    
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
      {/* Desktop-Only Navigation Header */}
      <DesktopHeader />

      {/* Mobile-First Layout - Clean 3-Mode Workflow */}
      {(isMobile || isStandalone) ? (
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
                    hideControls={isStandalone || mobileNavMode === 'preview'}
                    hideCompass={isStandalone || mobileNavMode === 'preview'}
                    onMapClick={handleMapClick}
                    isNavigating={isNavigating}
                    showUserMarker={showUserMarker}
                    restrictionViolations={currentRoute?.violations || []}
                  />
                </MapShell>
              </div>
              
              {/* GPS Permission Button removed - moved to route planning panel */}
              {/* GPS Loading Indicator - HIDDEN IN PWA STANDALONE MODE */}
              {gpsLoadingState?.isLoading && !isStandalone && (
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
              
              {/* GPS Fallback - Discreet Transparent Chip */}
              {mobileNavMode === 'preview' && 
               gpsData && 
               (gpsData.status === 'unavailable' || gpsData.status === 'error' || gpsData.errorType === 'PERMISSION_DENIED') && 
               !gpsData.manualLocation && (
                <div 
                  className="absolute top-20 left-1/2 -translate-x-1/2 z-[160] pointer-events-auto cursor-pointer"
                  onClick={() => setShowManualLocationDialog(true)}
                  data-testid="gps-fallback-chip"
                >
                  <div className="flex items-center gap-2 border border-amber-500/60 bg-white/70 hover:bg-white/80 text-amber-700 px-2.5 py-1.5 rounded-full backdrop-blur-md transition-all hover:border-amber-600">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-xs font-medium whitespace-nowrap">Set location</span>
                  </div>
                </div>
              )}
              
              {/* Manual Location Active - Compact Chip */}
              {mobileNavMode === 'preview' && 
               gpsData?.manualLocation && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[160] pointer-events-auto" data-testid="manual-location-indicator">
                  <div className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-full shadow-lg">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium truncate max-w-[180px]">
                      {gpsData.manualLocation.address}
                    </span>
                    <button
                      onClick={() => gpsData.clearManualLocation()}
                      className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                      data-testid="button-clear-manual-location"
                      aria-label="Clear manual location"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Blue Hamburger FAB - PLAN MODE - Opens menu (Bottom Right, aligned with nav controls) */}
              {mobileNavMode === 'plan' && (
                <Button
                  onClick={() => setShowComprehensiveMenu(true)}
                  size="sm"
                  className="fixed z-[200] h-9 w-9 rounded-xl shadow-lg bg-blue-600 hover:bg-blue-700 backdrop-blur-sm pointer-events-auto"
                  style={{
                    bottom: 'calc(16px + var(--safe-area-bottom))',
                    right: '16px'
                  }}
                  data-testid="button-open-menu-plan"
                  aria-label="Open menu"
                >
                  <Menu className="w-4 h-4" />
                </Button>
              )}

              {/* PREVIEW MODE OVERLAYS (z-10+) - Visible only in preview mode */}
              {mobileNavMode === 'preview' && (
                <>
                  {/* Clean Header with Title and Settings */}
                  <div className="absolute top-0 left-0 right-0 z-[100] flex items-center justify-between py-3 px-4 bg-white/95 backdrop-blur-sm" 
                       style={{ paddingTop: 'calc(12px + var(--safe-area-top))' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-900">TruckNav Pro</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowVehicleSettings(true)}
                      className="h-11 w-11 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-md"
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

                  {/* Restriction Warnings Panel - Mobile Preview Mode */}
                  {currentRoute?.violations && currentRoute.violations.length > 0 && selectedProfile && (
                    <RestrictionsWarningPanel
                      violations={currentRoute.violations}
                      vehicleProfile={{
                        ...selectedProfile,
                        weight: selectedProfile.weight ?? 0,
                        length: selectedProfile.length ?? 0
                      }}
                      isRouteAllowed={currentRoute.isRouteAllowed ?? true}
                    />
                  )}

                  {/* Blue Hamburger FAB - Opens route planning input (Bottom Right, aligned with nav controls) */}
                  <Button
                    onClick={() => setShowComprehensiveMenu(true)}
                    size="sm"
                    className="fixed z-[200] h-9 w-9 rounded-xl shadow-lg bg-blue-600 hover:bg-blue-700 backdrop-blur-sm pointer-events-auto"
                    style={{
                      bottom: 'calc(16px + var(--safe-area-bottom))',
                      right: '16px'
                    }}
                    data-testid="button-open-input-preview"
                    aria-label="Open route planning"
                  >
                    <Menu className="w-4 h-4" />
                  </Button>
                </>
              )}

              {/* NAVIGATE MODE WITH NAVIGATION LAYOUT - Mobile Navigation UI */}
              {/* Only show navigation UI when menu is CLOSED to prevent z-index overlap */}
              {isNavUIActive && !showComprehensiveMenu && (
                <NavigationLayout
                  isNavigating={isNavigating}
                  isNavUIActive={isNavUIActive}
                  mapContent={
                    <>
                      {/* Map is already rendered in base layer, add overlays here */}
                      
                      {/* Turn Indicator - Large bubble at top center */}
                      {nextTurn && (
                        <TurnIndicator
                          direction={nextTurn.direction}
                          distance={nextTurn.distance}
                          unit={measurementSystem === 'imperial' ? 'mi' : 'km'}
                          roadName={nextTurn.roadName}
                        />
                      )}
                      
                      {/* GPS Loading Indicator - HIDDEN IN PWA MODE */}
                      {gpsLoadingState?.isLoading && !isStandalone && (
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
                    </>
                  }
                  topStrip={
                    <CompactTripStrip
                      eta={currentRoute?.duration || 0}
                      distanceRemaining={currentRoute?.distance || 0}
                      nextManeuver={nextTurn?.roadName || 'Continue'}
                      nextDistance={nextTurn?.distance ? nextTurn.distance / 1609.34 : 0}
                    />
                  }
                  leftStack={
                    <LeftActionStack
                      onCancel={handleStopNavigation}
                      onReportIncident={() => setShowIncidentReportDialog(true)}
                      onOpenMenu={() => setShowComprehensiveMenu(true)}
                      isNavigating={isNavUIActive}
                    />
                  }
                  rightStack={
                    <NavigationControlsStack
                      mapRef={mapRef}
                      mapBearing={mapBearing}
                      map3DMode={map3DMode}
                      onToggle3D={() => {
                        console.log('[BTN-5-3D] ✅ 3D Mode toggle clicked - Current:', map3DMode, '→ New:', !map3DMode);
                        mapRef.current?.toggle3DMode();
                        setMap3DMode(!map3DMode);
                      }}
                      showTrafficLayer={showTrafficLayer}
                      onToggleTraffic={() => {
                        console.log('[BTN-6-TRAFFIC] ✅ Traffic toggle clicked - Current:', showTrafficLayer, '→ New:', !showTrafficLayer);
                        setShowTrafficLayer(!showTrafficLayer);
                      }}
                      mapViewMode={mapViewMode}
                      onToggleMapView={() => {
                        const newMode = mapViewMode === 'roads' ? 'satellite' : 'roads';
                        console.log('[BTN-7-SATELLITE] ✅ Satellite toggle clicked - Current:', mapViewMode, '→ New:', newMode);
                        setMapViewMode(newMode);
                        mapRef.current?.toggleMapView();
                      }}
                      onViewIncidents={() => {
                        console.log('[BTN-8-INCIDENTS] ✅ View Incidents button clicked - Opening incident feed');
                        setShowIncidentFeed(true);
                      }}
                    />
                  }
                  bottomBar={
                    <SpeedometerHUD
                      currentSpeed={gpsData?.position?.speed || 0} // Speed in m/s (component converts internally)
                      speedLimit={currentSpeedLimit || undefined}
                      isNavigating={isNavUIActive}
                    />
                  }
                />
              )}

              {/* Legal Ownership - Bottom of screen */}
              <div className="fixed bottom-0 left-0 right-0 w-full z-[5] pointer-events-auto">
                <MapLegalOwnership compact={true} className="sm:hidden" />
              </div>
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
                    hideControls={isStandalone || mobileNavMode === 'preview'}
                    hideCompass={isStandalone || mobileNavMode === 'preview'}
                    onMapClick={handleMapClick}
                    isNavigating={isNavigating}
                    showUserMarker={showUserMarker}
                    restrictionViolations={currentRoute?.violations || []}
                  />
                </MapShell>
                
                {/* GPS Loading Indicator - Desktop - HIDDEN IN PWA MODE */}
                {gpsLoadingState?.isLoading && !isStandalone && (
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

                {/* Restriction Warnings Panel - Desktop Preview Mode */}
                {!isNavigating && currentRoute?.violations && currentRoute.violations.length > 0 && selectedProfile && (
                  <RestrictionsWarningPanel
                    violations={currentRoute.violations}
                    vehicleProfile={{
                      ...selectedProfile,
                      weight: selectedProfile.weight ?? 0,
                      length: selectedProfile.length ?? 0
                    }}
                    isRouteAllowed={currentRoute.isRouteAllowed ?? true}
                  />
                )}
                
                {/* NAVIGATE MODE OVERLAYS - Mobile & Desktop */}
                {isNavUIActive && (
                  <>
                    {/* 1. Navigation Header - White banner with TruckNav Pro + green gear */}
                    <NavigationHeader 
                      onSettingsClick={() => setShowComprehensiveMenu(true)}
                    />
                    
                    {/* 2. Compact Trip Strip - Shows ETA, Distance, Next Maneuver - Below header */}
                    {currentRoute && (
                      <div 
                        className="absolute left-0 right-0 z-[1700]"
                        style={{ top: 'calc(56px + var(--safe-area-top, 0px))' }}
                      >
                        <CompactTripStrip
                          eta={currentRoute.duration || 0}
                          distanceRemaining={currentRoute.distance || 0}
                          nextManeuver={nextTurn?.roadName || 'Continue'}
                          nextDistance={nextTurn?.distance ? nextTurn.distance / 1609.34 : 0}
                        />
                      </div>
                    )}
                    
                    {/* 3. Turn Indicator - 365 FT notification - Below CompactTripStrip */}
                    {nextTurn && (
                      <div 
                        className="fixed left-0 right-0 z-[190]"
                        style={{ top: 'calc(112px + var(--safe-area-top, 0px))' }}
                      >
                        <TurnIndicator
                          direction={nextTurn.direction}
                          distance={nextTurn.distance}
                          unit={measurementSystem === 'imperial' ? 'mi' : 'km'}
                          roadName={nextTurn.roadName}
                          className="!relative !left-1/2 !-translate-x-1/2"
                        />
                      </div>
                    )}

                    {/* Professional Oval Speedometer HUD - Fixed position next to cancel button */}
                    <div 
                      className="fixed left-1/2 -translate-x-1/2 z-[180] pointer-events-auto"
                      style={{
                        bottom: 'calc(0px + var(--safe-area-bottom, 0px))'
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

                    {/* Legal Ownership - Bottom of screen during navigation */}
                    <MapLegalOwnership compact={true} className="!z-[200]" />
                  </>
                )}
                
                {/* Legal Ownership Section - Desktop (when NOT navigating) */}
                {!isNavUIActive && (
                  <MapLegalOwnership compact={true} className="hidden sm:block" />
                )}
              </>
            )}
          </div>

        </div>
      )}

      {/* REMOVED: Professional Navigation HUD - Duplicate speedometer functionality
          Now using only SpeedometerHUD for a single, consistent speedometer display */}

      {/* Removed unused Navigation Status Drawer that was creating grey overlay */}

      {/* Mobile Notification Stack - DISABLED per user request */}
      {/* Notifications were showing route optimization alerts that user doesn't want */}
      {false && Array.isArray(activeNotifications) && activeNotifications.length > 0 ? (
        <MobileNotificationStack
          notifications={activeNotifications}
          onDismiss={dismissNotification}
          getIcon={getNotificationIcon}
          dndEnabled={dndState?.enabled || false}
          isNavigating={isNavUIActive}
          hasNavigationGuidance={isNavUIActive && currentRoute !== null}
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
                
                // Clear route and return to preview mode
                setCurrentRoute(null);
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

      {/* Manual Location Dialog */}
      <Dialog open={showManualLocationDialog} onOpenChange={setShowManualLocationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Set Manual Location
            </DialogTitle>
            <DialogDescription>
              Enter an address or postcode to set your location manually when GPS is unavailable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manual-address">Address or Postcode</Label>
              <Input
                id="manual-address"
                value={manualLocationAddress}
                onChange={(e) => setManualLocationAddress(e.target.value)}
                placeholder="e.g., SW1A 1AA or 10 Downing Street, London"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSubmitting) {
                    handleManualLocationSubmit();
                  }
                }}
                disabled={isSubmitting}
                data-testid="input-manual-address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowManualLocationDialog(false)}
              disabled={isSubmitting}
              data-testid="button-cancel-manual-location"
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualLocationSubmit}
              disabled={isSubmitting || !manualLocationAddress.trim()}
              data-testid="button-submit-manual-location"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Location...
                </>
              ) : (
                'Set Location'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
