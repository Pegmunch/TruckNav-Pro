import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// NOTE: Drawer imports removed - they were unused and could cause vaul overlay artifacts
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Truck, X, Menu, MapPin, Settings, Search, Camera, Navigation, Navigation2, Car, AlertCircle, Compass, Box, Plus, Minus, Layers, Loader2, Crosshair, Hourglass, Map, Speaker, VolumeX, Clock, Eye, Route as RouteIcon } from "lucide-react";
import { usePWAEnvironment } from "@/contexts/pwa-environment";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDeviceType } from "@/hooks/use-device-type";
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
import { useDestinationHistory } from "@/hooks/use-destination-history";
import { useOriginHistory } from "@/hooks/use-origin-history";
import { useActiveVehicleProfile } from "@/hooks/use-active-vehicle-profile";
import { useNavigationSession } from "@/hooks/use-navigation-session";
import { useAutoReroute } from "@/hooks/use-auto-reroute";
import { useWakeLock } from "@/hooks/use-wake-lock";
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
import MapTurnLaneIndicator from "@/components/navigation/map-turn-lane-indicator";
import ComprehensiveMobileMenu from "@/components/navigation/comprehensive-mobile-menu";
import { NavigationHeader } from "@/components/navigation/navigation-header";
import { QuickSettingsPanel } from "@/components/navigation/quick-settings-panel";
import { IncidentReportDialog } from "@/components/incidents/incident-report-dialog";
import { IncidentFeed } from "@/components/incidents/incident-feed";
import IncidentFeedPopup from "@/components/incidents/incident-feed-popup";
import LiveTrafficPanel from "@/components/traffic/live-traffic-panel";
import { BroadcastNotificationPopup } from "@/components/fleet/broadcast-notification-popup";
import SpeedDisplay from "@/components/map/speed-display";
import SpeedometerHUD from "@/components/navigation/speedometer-hud";
import { GPSProvider, useGPS } from "@/contexts/gps-context";
import { useManualLocation } from "@/hooks/use-manual-location";
import { reverseGeocode, formatCoordinatesAsAddress } from "@/lib/reverse-geocode";
import { geocodeUKPostcode } from "@/lib/uk-postcode-geocoding";
import { looksLikePostcode, detectPostcodeCountry } from "@/lib/postcode-utils";
import { robustGeocode } from "@/lib/robust-geocoding";
import { useMeasurement } from "@/components/measurement/measurement-provider";

import { NavigationLayout } from "@/components/navigation/navigation-layout";
import { LeftActionStack } from "@/components/navigation/left-action-stack";
import { RightActionStack } from "@/components/navigation/right-action-stack";
import { IOSTouchCapture } from "@/components/navigation/ios-touch-capture";
import { BottomInstrumentationBar } from "@/components/navigation/bottom-instrumentation-bar";
import { navigationVoice } from "@/lib/navigation-voice";
import { type IncidentType, type NavigationCommandType } from "@/lib/voice-commands";
import { DesktopHeader } from "@/components/navigation/desktop-header";
import RestrictionsWarningPanel from "@/components/navigation/restrictions-warning-panel";
import { NavigationGuidelineOverlay } from "@/components/navigation/navigation-guideline-overlay";
import { TrafficPredictionPanel } from "@/components/navigation/traffic-prediction-panel";
import { OnboardingProvider, useOnboarding } from "@/components/onboarding/onboarding-provider";
import WeatherWidget from "@/components/weather/weather-widget";
import EntertainmentPanel from "@/components/entertainment/entertainment-panel";
import { FuelPriceComparison } from "@/components/fuel/fuel-price-comparison";
import { DriverFatigueAlert } from "@/components/safety/driver-fatigue-alert";
import VoiceNavigationPanel from "@/components/navigation/voice-navigation-panel";
import { RegionSelector } from "@/components/measurement/region-selector";
import { MeasurementSelector } from "@/components/measurement/measurement-selector";
import LanguageSelector from "@/components/language/language-selector";


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
  const deviceType = useDeviceType();
  const { isStandalone } = usePWAEnvironment();
  const { mapEngine, toggleMapEngine, isMapLibre } = useMapEngine();
  
  // Get GPS data from singleton provider
  const gpsData = useGPS();
  
  // Destination history for storing previous destinations (ordered by travel)
  const { addDestination } = useDestinationHistory();
  const { addOrigin } = useOriginHistory();
  
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
  const { data: allVehicleProfiles = [] } = useQuery<VehicleProfile[]>({
    queryKey: ['/api/vehicle-profiles']
  });
  const [selectedProfile, setSelectedProfile] = useState<VehicleProfile | null>(activeProfile);
  const [currentRoute, setCurrentRoute] = useState<RouteWithViolations | null>(null);
  
  // Vehicle type selection - supports multiple Class 1 trailer heights
  // SAFETY-CRITICAL: Persisted to localStorage to prevent accidental resets
  // Default is ALWAYS 'class1_high' (Class 1 High Trailer) for maximum safety
  type VehicleType = 'car' | 'class1_high' | 'class1_standard';
  const [vehicleType, setVehicleType] = useState<VehicleType>(() => {
    const stored = localStorage.getItem('vehicleType');
    // Migration from old boolean isCarProfileMode
    const oldStored = localStorage.getItem('isCarProfileMode');
    if (stored) {
      const value = stored as VehicleType;
      console.log('[VEHICLE-PROFILE] Initial type:', value);
      return value;
    } else if (oldStored === 'true') {
      console.log('[VEHICLE-PROFILE] Migrating from old car mode to new format');
      return 'car';
    }
    // SAFETY: Default to Class 1 High Trailer - never default to car mode
    console.log('[VEHICLE-PROFILE] Initial type: class1_high (default)');
    return 'class1_high';
  });
  
  // Derived boolean for backward compatibility
  const isCarProfileMode = vehicleType === 'car';
  const setIsCarProfileMode = (isCarMode: boolean) => {
    setVehicleType(isCarMode ? 'car' : 'class1_high');
  };
  
  // SAFETY: Persist vehicle type changes to localStorage immediately
  useEffect(() => {
    localStorage.setItem('vehicleType', vehicleType);
    // Also update old key for any legacy code
    localStorage.setItem('isCarProfileMode', String(vehicleType === 'car'));
    const typeLabels: Record<VehicleType, string> = {
      'car': 'Car (fastest route)',
      'class1_high': 'Class 1 - Double Decker Trailer (4.95m / 15.95ft)',
      'class1_standard': 'Class 1 : Standard Trailer (3.97m / 13.01ft)'
    };
    console.log('[VEHICLE-PROFILE] Type changed to:', typeLabels[vehicleType]);
    
    // Update profile dimensions based on vehicle type
    if (vehicleType !== 'car') {
      const heightValues: Record<Exclude<VehicleType, 'car'>, { metric: number; imperial: number }> = {
        'class1_high': { metric: 4.95, imperial: 15.95 },
        'class1_standard': { metric: 3.97, imperial: 13.01 }
      };
      const heights = heightValues[vehicleType as Exclude<VehicleType, 'car'>];
      if (selectedProfile) {
        const updatedProfile = {
          ...selectedProfile,
          height: heights.metric,
          width: 2.55,
          length: 16.5
        };
        console.log('[VEHICLE-PROFILE] Updating profile dimensions:', updatedProfile);
        setSelectedProfile(updatedProfile);
        setActiveProfile(updatedProfile);
      }
    }
  }, [vehicleType]);
  
  // Traffic prediction for ETA adjustment
  const [predictedTrafficDelay, setPredictedTrafficDelay] = useState<number>(0);
  
  // CRITICAL: Memoize violations to prevent re-renders from new array references
  // Using useMemo ensures same empty array reference when there are no violations
  const restrictionViolations = useMemo(() => currentRoute?.violations || [], [currentRoute?.violations]);
  
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
  // ALWAYS start in plan mode - navigation is activated after route calculation
  const [isLocalNavActive, setIsLocalNavActive] = useState(false);
  
  // Preview mode state - user explicitly clicks "Preview Route" button to see full route
  const [isShowingPreview, setIsShowingPreview] = useState(false);
  const [isFlyByInProgress, setIsFlyByInProgress] = useState(false);
  
  // Backwards compatibility: Derive isNavigating from LOCAL state (not server)
  const isNavigating = isLocalNavActive;
  
  // Screen Wake Lock - keeps screen on during navigation
  // Uses Wake Lock API with iOS Safari fallback (video element method)
  const { acquire: acquireWakeLock, release: releaseWakeLock } = useWakeLock();
  
  // Auto-acquire wake lock when navigation starts, release when it stops
  useEffect(() => {
    if (isNavigating) {
      console.log('[WAKE-LOCK] Navigation started - acquiring screen wake lock');
      acquireWakeLock();
    } else {
      // Only release if we were previously navigating (avoid release on initial mount)
      releaseWakeLock();
    }
  }, [isNavigating, acquireWakeLock, releaseWakeLock]);
  
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
  
  // NOTE: Legal consent is checked in parent NavigationPage wrapper BEFORE GPS starts
  
  // AR Navigation state
  const [isARMode, setIsARMode] = useState(false);
  const [arSupported, setARSupported] = useState(false);
  
  // Settings modal state - moved from NavigationSidebar to prevent closure with sidebar/drawer
  const [showVehicleSettings, setShowVehicleSettings] = useState(false);
  
  // Comprehensive mobile menu state
  const [showComprehensiveMenu, setShowComprehensiveMenu] = useState(false);
  
  // Reset trigger to clear menu inputs immediately on route cancellation
  const [menuResetTrigger, setMenuResetTrigger] = useState(0);
  
  // Flag to auto-start navigation on mobile after route calculation (GO button flow)
  const [shouldAutoNavigateOnMobile, setShouldAutoNavigateOnMobile] = useState(false);
  
  // Quick settings panel state (green gear button)
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  
  // Tool dialogs state (opened from navigation header dropdown)
  const [showWeatherTool, setShowWeatherTool] = useState(false);
  const [showEntertainmentTool, setShowEntertainmentTool] = useState(false);
  const [showVoiceNavTool, setShowVoiceNavTool] = useState(false);
  const [showFuelPricesTool, setShowFuelPricesTool] = useState(false);
  const [showFatigueMonitorTool, setShowFatigueMonitorTool] = useState(false);
  const [showRegionSettingsTool, setShowRegionSettingsTool] = useState(false);
  const [showLanguageTool, setShowLanguageTool] = useState(false);
  const [showMapSettingsTool, setShowMapSettingsTool] = useState(false);
  
  // Get onboarding context for replay tour
  const { resetTour } = useOnboarding();
  
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
  
  // Map control state for RightActionStack (rendered outside map container)
  const [mapControlState, setMapControlState] = useState({
    is3DMode: false,
    isSatelliteView: false,
    bearing: 0
  });
  
  // Toggle visibility of navigation controls stack (right-side 8 buttons)
  // Default to visible (true) so buttons show on entry, double-tap toggles
  const [showNavControls, setShowNavControls] = useState(true);
  
  // Debug: Log whenever showNavControls changes
  useEffect(() => {
    console.log('[NAV-CONTROLS] showNavControls state is now:', showNavControls);
  }, [showNavControls]);
  
  // Force traffic layer ON when navigation is active (safety feature)
  useEffect(() => {
    if (isLocalNavActive) {
      setShowTrafficLayer(true);
      console.log('[TRAFFIC] Forced traffic layer ON during navigation');
    }
  }, [isLocalNavActive]);
  
  // Incident reporting dialog state
  const [showIncidentReportDialog, setShowIncidentReportDialog] = useState(false);
  
  // Incident feed drawer state
  const [showIncidentFeed, setShowIncidentFeed] = useState(false);
  const [hasInteractedWithIncidentFeed, setHasInteractedWithIncidentFeed] = useState(false);
  
  // Live Traffic Panel state (unified view/report panel)
  const [showLiveTrafficPanel, setShowLiveTrafficPanel] = useState(false);
  const [liveTrafficPanelTab, setLiveTrafficPanelTab] = useState<'view' | 'report'>('view');
  
  // Professional navigation state
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentSpeedLimit, setCurrentSpeedLimit] = useState<number | null>(null);
  
  // GPS Mode with auto-switch to cache after 30 seconds of no signal
  const [gpsMode, setGpsMode] = useState<'gps' | 'cache'>('gps');
  const gpsLostTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Destination reached state
  const [showDestinationReached, setShowDestinationReached] = useState(false);
  const hasShownDestinationDialogRef = useRef(false);
  
  // Dynamic distance remaining that counts down during navigation
  const [dynamicDistanceRemaining, setDynamicDistanceRemaining] = useState<number>(0);
  
  // Dynamic ETA that counts down during navigation (in minutes)
  const [dynamicEtaMinutes, setDynamicEtaMinutes] = useState<number>(0);
  
  // Route cancellation guard to prevent race condition
  const isCancellingRouteRef = useRef(false);
  
  // CRITICAL: Store route before navigation starts - prevents loss during journey sync
  // This ref NEVER clears during navigation and serves as the authoritative source
  const lastCalculatedRouteRef = useRef<RouteWithViolations | null>(null);
  
  // CRITICAL: Navigation transition guard - prevents route clearing during GO button flow
  // This ref is set TRUE when GO is pressed and cleared when journey activation completes
  // It guards against React state batching causing route-clearing effects to run prematurely
  const isStartingNavigationRef = useRef(false);
  
  // Route calculation counter - tracks number of active route calculations
  // Uses counter instead of boolean to handle overlapping requests safely
  // Watchdog only fires when counter is 0 (no active calculations)
  const routeCalculationCountRef = useRef(0);
  
  // Ref to track current journey ID - avoids stale closure in mutation callbacks
  // Initialize from localStorage for hydration/offline flows
  const getInitialJourneyId = (): number | null => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('activeJourneyId');
      return stored ? parseInt(stored, 10) : null;
    }
    return null;
  };
  const currentJourneyIdRef = useRef<number | null>(getInitialJourneyId());
  
  // Ref to track current route ID - avoids stale closure in mutation callbacks
  const currentRouteIdRef = useRef<string | null>(null);
  
  // Monotonic navigation session counter - incremented at START of each new route calculation
  // Used for stale completion detection: if session changed since completion was initiated, it's stale
  const navigationSessionRef = useRef<number>(0);
  
  // Helper to get active journey ID from both ref and localStorage (synchronous fallback)
  const getActiveJourneyId = useCallback((): number | null => {
    // Prefer the ref if set (most current)
    if (currentJourneyIdRef.current !== null) {
      return currentJourneyIdRef.current;
    }
    // Fallback to localStorage for hydration/offline flows
    const stored = localStorage.getItem('activeJourneyId');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) {
        // Update ref with persisted value
        currentJourneyIdRef.current = parsed;
        return parsed;
      }
    }
    return null;
  }, []);
  
  // Auto-reroute callback - updates current route when driver goes off-route
  const handleRerouteSuccess = useCallback((newRoute: RouteWithViolations) => {
    console.log('[AUTO-REROUTE] Updating route with new TomTom route');
    setCurrentRoute(newRoute);
    // Reset route progress tracking for new route
    routeProgressRef.current = 0;
    // Reset distance and ETA remaining with new route values
    if (newRoute.distance) {
      setDynamicDistanceRemaining(newRoute.distance);
    }
    if (newRoute.duration) {
      setDynamicEtaMinutes(Math.ceil(newRoute.duration / 60));
    }
  }, []);

  // Fetch traffic prediction when route changes
  useEffect(() => {
    if (!currentRoute?.id) {
      setPredictedTrafficDelay(0);
      return;
    }
    
    const fetchTrafficPrediction = async () => {
      try {
        const response = await apiRequest('GET', `/api/traffic/predict/${currentRoute.id}`);
        const prediction = await response.json();
        if (prediction?.predictedDelayMinutes && prediction.dataQuality !== 'insufficient') {
          setPredictedTrafficDelay(prediction.predictedDelayMinutes);
        } else {
          setPredictedTrafficDelay(0);
        }
      } catch (error) {
        setPredictedTrafficDelay(0);
      }
    };
    
    fetchTrafficPrediction();
  }, [currentRoute?.id]);
  
  // Auto-reroute hook - detects off-route and automatically recalculates via TomTom API
  const { isOffRoute, isRerouting, distanceFromRoute, resetRerouteState } = useAutoReroute(
    currentRoute,
    isNavigating,
    toCoordinates,
    activeProfileId,
    handleRerouteSuccess,
    {
      lateralThresholdMeters: 50,
      consecutiveFixesRequired: 2,
      minSecondsBetweenReroutes: 15,
    }
  );
  
  // Double-tap detection for map controls toggle (when not navigating)
  const lastMapTapTimeRef = useRef<number>(0);
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const DOUBLE_TAP_THRESHOLD = 300; // ms

  // Handle map click to close overlays AND toggle nav controls via tap gestures
  const handleMapClick = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastMapTapTimeRef.current;
    
    console.log('[MAP-CLICK] Interaction detected', { 
      timeSinceLastTap, 
      threshold: DOUBLE_TAP_THRESHOLD,
      currentShowNav: showNavControls
    });

    // Clear any existing timer regardless of tap type
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }

    // CRITICAL: Prevent map clicks from closing the Quick Settings panel
    if (showQuickSettings) {
      console.log('[MAP-CLICK] Quick settings active - ignoring click to prevent close');
      return;
    }

    if (timeSinceLastTap < DOUBLE_TAP_THRESHOLD && timeSinceLastTap > 0) {
      console.log('[MAP-CLICK] DOUBLE-TAP CONFIRMED - Toggling controls');
      
      // Toggle visibility on double tap
      setShowNavControls(prev => {
        const newValue = !prev;
        console.log('[MAP-CLICK] State toggle:', prev, '->', newValue);
        return newValue;
      });
      
      lastMapTapTimeRef.current = 0; // Reset to prevent triple-tap issues
      return;
    }
    
    lastMapTapTimeRef.current = now;

    // Remove single tap timer entirely - single tap no longer hides controls
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }

    // Close incident feed if user has interacted with it
    if (hasInteractedWithIncidentFeed && showIncidentFeed) {
      setShowIncidentFeed(false);
    }
  }, [hasInteractedWithIncidentFeed, showIncidentFeed]);

  // Turn-by-turn navigation state
  const [nextTurn, setNextTurn] = useState<{
    direction: 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left';
    distance: number; // in meters
    roadName?: string;
  } | null>(null);
  
  // Route progress tracking - prevents snapping backwards to earlier segments
  const routeProgressRef = useRef<number>(0);
  
  // Helper: Check if turn indicator should be visible based on distance thresholds
  // Imperial: Show at 1000ft (305m), 500ft (152m), 100ft (30m) - within these thresholds
  // Metric: Show at 300m, 150m, 30m
  const shouldShowTurnIndicator = (distanceMeters: number, isImperial: boolean): boolean => {
    if (isImperial) {
      // Show when distance is within 1000ft (305m) threshold
      return distanceMeters <= 305 && distanceMeters >= 0;
    } else {
      // Show when distance is within 300m threshold
      return distanceMeters <= 300 && distanceMeters >= 0;
    }
  };
  
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
  // plan = no route or not navigating, preview = user explicitly clicked Preview button (OVERLAY ONLY), navigate = active navigation
  // NOTE: mobileNavMode only changes when isLocalNavActive changes (actual navigation) - preview is just an overlay
  const mobileNavMode: MobileNavMode = isLocalNavActive && currentRoute !== null
    ? 'navigate' 
    : 'plan';
  
  // CRITICAL FIX: Navigation UI should show whenever isLocalNavActive is true
  // This ensures HUD (speedometer, ETA header) appears immediately when GO is pressed
  // even before route calculation completes
  // Navigation UI is active when: local nav flag, mobile nav mode, route calculation in progress (GO button flow),
  // OR showing preview mode with a valid route (route-ready state)
  const isNavUIActive = isLocalNavActive || mobileNavMode === 'navigate' || shouldAutoNavigateOnMobile || (isShowingPreview && currentRoute !== null);
  
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
  
  // CRITICAL FIX: Ensure HUD is ALWAYS visible when UI is active
  useEffect(() => {
    if (isNavUIActive) {
      console.log('[NAV-UI] Forcing HUD controls visibility for active mode:', isNavUIActive);
      setShowNavControls(true);
      
      // Also ensure the map is expanded/visible
      if (isMobile && !isMapExpanded) {
        setIsMapExpanded(true);
      }
    }
  }, [isNavUIActive, isMobile, isMapExpanded]);
  
  // GPS Mode effect - wire up mode changes to GPS context
  // CRITICAL FIX: Destructure callbacks to prevent render loop
  // (depending on entire gpsData object causes infinite re-renders)
  const { startGPSTracking, stopGPSTracking } = gpsData || {};
  
  useEffect(() => {
    if (!startGPSTracking || !stopGPSTracking) return;
    
    if (gpsMode === 'gps') {
      // Start live GPS tracking
      console.log('[GPS-MODE] Switching to GPS mode - starting live tracking');
      startGPSTracking();
    } else {
      // Stop live GPS tracking, use cached/manual position
      console.log('[GPS-MODE] Switching to Cache mode - stopping live tracking');
      stopGPSTracking();
    }
    
    // Persist to localStorage
    localStorage.setItem('trucknav_gps_mode', gpsMode);
  }, [gpsMode, startGPSTracking, stopGPSTracking]);
  
  // GPS Mode toggle handler - no toast notifications per user request
  const handleGpsModeToggle = useCallback((mode: 'gps' | 'cache') => {
    console.log('[GPS-MODE] User toggled mode to:', mode);
    setGpsMode(mode);
  }, []);

  // Auto-switch to Cache mode after 30 seconds of no GPS signal
  useEffect(() => {
    if (!gpsData) return;

    const isGpsSignalAvailable = gpsData.status === 'ready' && gpsData.position !== null;
    const isGpsSignalLost = gpsData.status === 'unavailable' || gpsData.status === 'error';

    // GPS signal recovered - switch back immediately and clear timer
    if (isGpsSignalAvailable && gpsMode === 'cache') {
      console.log('[GPS-MODE-AUTO] ✅ GPS signal recovered - switching back to GPS mode');
      if (gpsLostTimerRef.current) {
        clearTimeout(gpsLostTimerRef.current);
        gpsLostTimerRef.current = null;
      }
      setGpsMode('gps');
    }

    // GPS signal lost - start 30 second timer before switching to Cache
    if (isGpsSignalLost && gpsMode === 'gps' && !gpsLostTimerRef.current) {
      console.log('[GPS-MODE-AUTO] ⏱️ GPS signal lost - starting 30s timer before Cache mode');
      gpsLostTimerRef.current = setTimeout(() => {
        console.log('[GPS-MODE-AUTO] 🚨 30 seconds elapsed - switching to Cache mode');
        setGpsMode('cache');
        gpsLostTimerRef.current = null;
      }, 30000);
    }

    // GPS signal restored before timer expired - cancel timer
    if (isGpsSignalAvailable && gpsLostTimerRef.current) {
      console.log('[GPS-MODE-AUTO] ✅ GPS signal restored - cancelling Cache mode timer');
      clearTimeout(gpsLostTimerRef.current);
      gpsLostTimerRef.current = null;
    }

    return () => {
      if (gpsLostTimerRef.current) {
        clearTimeout(gpsLostTimerRef.current);
        gpsLostTimerRef.current = null;
      }
    };
  }, [gpsData?.status, gpsData?.position, gpsMode])

  // CRITICAL FIX: Always start in plan mode on app launch
  // This ensures PWA doesn't restore stale navigation state
  useEffect(() => {
    // Clear navigation state on first mount - must clear activeJourneyId so server doesn't restore previous journey
    console.log('[NAV-STATE] App launched - resetting to plan mode');
    setIsLocalNavActive(false);
    
    // AGGRESSIVE storage cleanup - clear ALL trucknav navigation state
    const keysToRemove = [
      'navigation_ui_active',
      'navigation_mode',
      'activeJourneyId',
      'navigation_timestamp',
      'activeRouteId',
      'navigationSidebarState',
      'shouldShowHUD',
      'mobileNavMode',
      'isLocalNavActive',
      'last_navigation_state'
    ];
    
    // Remove all known navigation keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`[NAV-STATE] ✓ Cleared localStorage: ${key}`);
    });
    
    // Also clear any navigation-specific keys we might have missed
    // PRESERVE: All trucknav_ prefixed keys (user preferences), only clear navigation/journey/route specific keys
    const protectedPrefixes = ['trucknav_']; // Protect ALL trucknav_ keys (app version, legal, session, language, settings, etc.)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Skip ALL trucknav_ prefixed keys - these are user/app settings
      if (protectedPrefixes.some(prefix => key.startsWith(prefix))) {
        continue;
      }
      
      // Only clear navigation-specific state keys (not prefixed with trucknav_)
      // PRESERVE: Recent destinations for user convenience
      if (key === 'navigation_recentDestinations') {
        continue;
      }
      if (key.includes('navigation') || key.includes('journey') || key.includes('route') || key.includes('Journey') || key.includes('Route')) {
        localStorage.removeItem(key);
        console.log(`[NAV-STATE] ✓ Cleared localStorage: ${key}`);
      }
    }
    
    // Invalidate the active journey query so the hook refetches and gets nothing
    queryClient.invalidateQueries({ queryKey: ["/api/journeys/active"] });
  }, [queryClient]); // Run only once on mount
  
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
    // GUARD: Skip reset if GO button flow is active OR any route calculation is in progress
    // Using counter ref to handle overlapping requests (counter > 0 means at least one calculation active)
    // CRITICAL: Also check lastCalculatedRouteRef - if we have a saved route, DO NOT reset
    const hasSavedRoute = lastCalculatedRouteRef.current !== null;
    if (routeDataSettled && currentRoute === null && !hasSavedRoute && isLocalNavActive && !shouldAutoNavigateOnMobile && routeCalculationCountRef.current === 0) {
      console.log('[NAV-STATE] Auto-resetting isLocalNavActive - no route exists after data settled and no saved route');
      setIsLocalNavActive(false);
      localStorage.removeItem('navigation_ui_active');
      localStorage.removeItem('navigation_mode');
    } else if (routeDataSettled && currentRoute === null && hasSavedRoute && isLocalNavActive) {
      // Route is null but we have a saved route - restore it instead of resetting
      console.log('[NAV-STATE] Restoring route from lastCalculatedRouteRef instead of resetting');
      setCurrentRoute(lastCalculatedRouteRef.current);
    }
  }, [currentRoute, isLocalNavActive, routeDataSettled, shouldAutoNavigateOnMobile]);
  
  // Mode transition debouncing to prevent race conditions
  // REMOVED: Debounced setter was causing race conditions
  // mobileNavMode is derived from isLocalNavActive - no manual updates needed

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
  
  // Listen for overlay cleanup events (triggered by stale journey completions)
  // This closes Radix overlays without clearing the active route
  useEffect(() => {
    const handleOverlayCleanup = () => {
      console.log('[NAV-OVERLAY] 🧹 Closing overlays via event');
      setShowComprehensiveMenu(false);
      setShowQuickSettings(false);
      setShowVehicleSettings(false);
      setShowIncidentFeed(false);
      setIsAlternativeRoutesOpen(false);
    };
    
    window.addEventListener('navigation:overlayCleanup', handleOverlayCleanup);
    return () => {
      window.removeEventListener('navigation:overlayCleanup', handleOverlayCleanup);
    };
  }, []);
  
  // Fallback: Derive road info from route lane guidance when GPS is unavailable
  useEffect(() => {
    // Only use fallback when GPS is unavailable AND we have a route
    if (gpsData?.position || !currentRoute) {
      return; // GPS working or no route - don't use fallback
    }
    
    // Try to get road name from first lane guidance segment
    if (currentRoute.laneGuidance && currentRoute.laneGuidance.length > 0) {
      const firstSegment = currentRoute.laneGuidance[0];
      if (firstSegment.roadName) {
        setRoadInfo({
          confidence: 'low',
          roadRef: firstSegment.roadName,
          junction: null,
          destination: null
        });
        console.log(`[ROAD-INFO-FALLBACK] Using route data: ${firstSegment.roadName}`);
        return;
      }
    }
    
    // Clear if no fallback available
    setRoadInfo(null);
  }, [gpsData?.position, currentRoute]);
  
  // Fetch enhanced speed limit and road info when GPS position changes
  useEffect(() => {
    if (!gpsData?.position) {
      setCurrentSpeedLimit(null);
      // Don't clear roadInfo here - let fallback effect handle it
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
  // Runs in both Navigation mode AND Preview mode so turn indicators appear in both
  useEffect(() => {
    if ((!isNavigating && !isShowingPreview) || !currentRoute) {
      setNextTurn(null);
      return;
    }
    
    // Helper: Map routing API sign value to direction string
    // GraphHopper/routing sign codes: 
    // -3 = sharp left, -2 = left, -1 = slight left/keep left
    // 0 = straight/continue
    // 1 = slight right/keep right, 2 = right, 3 = sharp right
    // 4 = arrive, 5 = via reached, 6 = roundabout
    const mapSignToDirection = (sign: number): 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left' => {
      if (sign === 2) return 'right';
      if (sign === -2) return 'left';
      if (sign === 1) return 'slight_right';
      if (sign === -1) return 'slight_left';
      if (sign === 3) return 'sharp_right';
      if (sign === -3) return 'sharp_left';
      return 'straight';
    };

    // PRIORITY 1: Use actual TomTom instructions (most accurate turn data)
    // These contain real maneuver data from the routing API
    if ((currentRoute as any).instructions && Array.isArray((currentRoute as any).instructions) && (currentRoute as any).instructions.length > 0) {
      const instructions = (currentRoute as any).instructions as Array<{ text: string; distance: number; time: number; sign: number }>;
      
      // Find next instruction (skip first "depart" instruction)
      for (let i = 1; i < instructions.length; i++) {
        const instruction = instructions[i];
        const distanceMeters = instruction.distance * 1609.34; // Convert miles to meters
        
        // Skip very close instructions or arrival instructions
        if (distanceMeters < 10 || instruction.sign === 4) continue;
        
        const direction = mapSignToDirection(instruction.sign);
        
        // Extract road name from instruction text
        const roadMatch = instruction.text.match(/onto\s+(.+?)(?:\s*$|,)/i) || 
                         instruction.text.match(/on\s+(.+?)(?:\s*$|,)/i);
        const roadName = roadMatch ? roadMatch[1] : undefined;
        
        setNextTurn({
          direction,
          distance: distanceMeters,
          roadName
        });
        console.log(`[TURN-INFO] Using TomTom instruction: ${direction} (sign=${instruction.sign}) in ${distanceMeters.toFixed(0)}m - ${instruction.text}`);
        return;
      }
    }

    // FALLBACK: If no GPS, try lane guidance (less reliable as it may be mock data)
    if (!gpsData?.position) {
      if (currentRoute.laneGuidance && currentRoute.laneGuidance.length > 0) {
        const firstSegment = currentRoute.laneGuidance[0];
        let direction: 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left' = 'straight';
        
        const maneuverType = firstSegment.maneuverType;
        if (maneuverType === 'turn-left') {
          direction = 'left';
        } else if (maneuverType === 'turn-right') {
          direction = 'right';
        } else {
          direction = 'straight';
        }
        
        setNextTurn({
          direction,
          distance: (firstSegment.distance || 0) * 1609.34, // Convert miles to meters
          roadName: firstSegment.roadName
        });
        console.log(`[TURN-INFO-FALLBACK] Using lane guidance: ${direction} onto ${firstSegment.roadName || 'unknown road'}`);
      } else {
        // No guidance available - clear any stale turn info
        setNextTurn(null);
      }
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

    // Fallback: Calculate next turn from route path segments (matches blue route line)
    // Uses true perpendicular projection, route progress tracking, and GPS heading validation
    if (currentRoute.routePath && currentRoute.routePath.length > 2) {
      const routePath = currentRoute.routePath;
      
      // Calculate bearing between two points (normalized to [0, 360])
      const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const toRadians = (deg: number) => deg * (Math.PI / 180);
        const toDegrees = (rad: number) => rad * (180 / Math.PI);
        
        const dLng = toRadians(lng2 - lng1);
        const y = Math.sin(dLng) * Math.cos(toRadians(lat2));
        const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
                  Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLng);
        
        return (toDegrees(Math.atan2(y, x)) + 360) % 360;
      };

      // Precompute cumulative distances along route for O(1) distance lookups
      const cumulativeDistances: number[] = [0];
      for (let i = 0; i < routePath.length - 1; i++) {
        const d = calculateDistance(routePath[i].lat, routePath[i].lng, routePath[i+1].lat, routePath[i+1].lng);
        cumulativeDistances.push(cumulativeDistances[i] + d);
      }
      const totalRouteLength = cumulativeDistances[cumulativeDistances.length - 1];

      // Get vehicle heading from GPS (use smoothedHeading for stability)
      const vehicleHeading = gpsData?.position?.smoothedHeading ?? gpsData?.position?.heading;
      
      // Search window: only look from current progress forward (never backwards)
      // This prevents snapping to earlier segments in hairpins/parallel roads
      const searchStartIndex = Math.max(0, routeProgressRef.current - 2); // Allow small backwards movement for GPS jitter
      const searchEndIndex = Math.min(routeProgressRef.current + 20, routePath.length - 1); // Look up to 20 segments ahead
      
      // True perpendicular projection within search window
      let bestSegmentIndex = searchStartIndex;
      let bestProjectionT = 0;
      let bestDistance = Infinity;
      let bestHeadingMatch = false;
      
      for (let i = searchStartIndex; i < searchEndIndex; i++) {
        const p1 = routePath[i];
        const p2 = routePath[i + 1];
        
        // Convert to approximate Cartesian for projection
        const cosLat = Math.cos((latitude * Math.PI) / 180);
        const ax = p1.lng * cosLat;
        const ay = p1.lat;
        const bx = p2.lng * cosLat;
        const by = p2.lat;
        const px = longitude * cosLat;
        const py = latitude;
        
        // Vector projection
        const abx = bx - ax;
        const aby = by - ay;
        const abLenSq = abx * abx + aby * aby;
        const apx = px - ax;
        const apy = py - ay;
        
        let t = abLenSq > 0 ? (apx * abx + apy * aby) / abLenSq : 0;
        t = Math.max(0, Math.min(1, t));
        
        const closestX = ax + t * abx;
        const closestY = ay + t * aby;
        const dx = px - closestX;
        const dy = py - closestY;
        const distSq = dx * dx + dy * dy;
        
        // Check heading alignment if available
        const segmentBearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
        let headingMatch = true;
        if (vehicleHeading != null && !isNaN(vehicleHeading)) {
          let headingDiff = Math.abs(vehicleHeading - segmentBearing);
          if (headingDiff > 180) headingDiff = 360 - headingDiff;
          headingMatch = headingDiff < 90; // Vehicle facing roughly same direction as segment
        }
        
        // Prefer segments that match heading; within those, prefer closest
        const isBetterMatch = 
          (headingMatch && !bestHeadingMatch) || // Heading match wins over non-match
          (headingMatch === bestHeadingMatch && distSq < bestDistance); // Same heading status, prefer closer
        
        if (isBetterMatch) {
          bestDistance = distSq;
          bestSegmentIndex = i;
          bestProjectionT = t;
          bestHeadingMatch = headingMatch;
        }
      }
      
      // Update route progress (only move forward, never backwards by more than 2)
      if (bestSegmentIndex >= routeProgressRef.current) {
        routeProgressRef.current = bestSegmentIndex;
      }

      // Calculate distance along route to projected point
      const segmentLength = cumulativeDistances[bestSegmentIndex + 1] - cumulativeDistances[bestSegmentIndex];
      const projectedDistanceAlongRoute = cumulativeDistances[bestSegmentIndex] + segmentLength * bestProjectionT;

      // Update dynamic distance remaining during navigation
      const remainingDistance = totalRouteLength - projectedDistanceAlongRoute;
      if (remainingDistance >= 0) {
        setDynamicDistanceRemaining(remainingDistance);
        
        // Update dynamic ETA based on proportion of route remaining
        // Use the original route duration and scale it by remaining distance
        const originalDuration = currentRoute.duration || 0;
        const originalDistance = currentRoute.distance || totalRouteLength;
        if (originalDistance > 0 && originalDuration > 0) {
          const proportionRemaining = remainingDistance / originalDistance;
          const remainingSeconds = originalDuration * proportionRemaining;
          setDynamicEtaMinutes(Math.ceil(remainingSeconds / 60));
        }
      }

      // Scan ahead from projected position to find the next significant turn (>25° angle change)
      const TURN_THRESHOLD = 25;
      const startSearchIndex = bestSegmentIndex + 1;
      const LOOK_AHEAD_LIMIT = Math.min(startSearchIndex + 100, routePath.length - 2);
      
      let nextTurnIndex = -1;
      let turnAngleAtPoint = 0;
      
      for (let i = Math.max(1, startSearchIndex); i < LOOK_AHEAD_LIMIT; i++) {
        const prevPoint = routePath[i - 1];
        const currPoint = routePath[i];
        const nextPoint = routePath[i + 1];
        
        // Calculate turn angle using cross product for correct left/right determination
        // 
        // HEADING-UP NAVIGATION MODE ASSUMPTION:
        // This app uses heading-up map rotation during navigation, where the route line
        // always points upward (toward the top of screen) and the map rotates with the
        // user's heading. In this mode:
        // - The user is always "facing" up the screen along the route line
        // - LEFT turn = route curves to the left side of screen
        // - RIGHT turn = route curves to the right side of screen
        //
        // The turn direction is calculated relative to the route path (travel direction),
        // NOT relative to compass north. This is correct for heading-up navigation.
        
        // Vector from prevPoint to currPoint (incoming direction along route)
        const inX = currPoint.lng - prevPoint.lng;
        const inY = currPoint.lat - prevPoint.lat;
        
        // Vector from currPoint to nextPoint (outgoing direction along route)
        const outX = nextPoint.lng - currPoint.lng;
        const outY = nextPoint.lat - currPoint.lat;
        
        // 2D cross product determines rotation direction from incoming to outgoing:
        // cross = inX * outY - inY * outX
        // For heading-up display where route line points UP:
        // - Positive cross = route curves RIGHT relative to travel direction
        // - Negative cross = route curves LEFT relative to travel direction
        const crossProduct = inX * outY - inY * outX;
        
        // Calculate magnitude of turn using dot product for angle
        const inMag = Math.sqrt(inX * inX + inY * inY);
        const outMag = Math.sqrt(outX * outX + outY * outY);
        const dotProduct = inX * outX + inY * outY;
        const cosAngle = (inMag > 0 && outMag > 0) ? dotProduct / (inMag * outMag) : 1;
        const turnMagnitude = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
        
        // Apply sign from cross product:
        // crossProduct > 0 → RIGHT turn relative to travel direction (positive angle)
        // crossProduct < 0 → LEFT turn relative to travel direction (negative angle)
        let turnAngle = crossProduct > 0 ? turnMagnitude : -turnMagnitude;
        
        // Check if this is a significant turn
        if (Math.abs(turnAngle) >= TURN_THRESHOLD) {
          nextTurnIndex = i;
          turnAngleAtPoint = turnAngle;
          console.log(`[TURN-DEBUG] Detected turn at vertex ${i}: angle=${turnAngle.toFixed(1)}°, cross=${crossProduct.toFixed(6)}, in=(${inX.toFixed(5)},${inY.toFixed(5)}), out=(${outX.toFixed(5)},${outY.toFixed(5)})`);
          break;
        }
      }
      
      // If we found a turn ahead, set the turn indicator
      if (nextTurnIndex > 0) {
        // Distance from projected position to turn vertex using precomputed cumulative distances
        const turnDistanceAlongRoute = cumulativeDistances[nextTurnIndex];
        let distanceToTurn = turnDistanceAlongRoute - projectedDistanceAlongRoute;
        
        // Ensure distance is positive and at least 10m
        distanceToTurn = Math.max(10, distanceToTurn);
        
        // Map turn angle to direction (matches blue route line direction)
        let direction: 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left' = 'straight';
        
        // Turn angle thresholds: 25-50° slight, 50-115° regular, >115° sharp
        // Positive = right turn, Negative = left turn
        if (Math.abs(turnAngleAtPoint) < 25) {
          direction = 'straight';
        } else if (turnAngleAtPoint <= -115) {
          direction = 'sharp_left';
        } else if (turnAngleAtPoint <= -50) {
          direction = 'left';
        } else if (turnAngleAtPoint < -25) {
          direction = 'slight_left';
        } else if (turnAngleAtPoint >= 115) {
          direction = 'sharp_right';
        } else if (turnAngleAtPoint >= 50) {
          direction = 'right';
        } else if (turnAngleAtPoint > 25) {
          direction = 'slight_right';
        }

        setNextTurn({
          direction,
          distance: distanceToTurn,
          roadName: undefined
        });
        console.log(`[TURN-CALC] Route turn: ${direction} at ${turnAngleAtPoint.toFixed(1)}° in ${distanceToTurn.toFixed(0)}m (vertex ${nextTurnIndex})`);
      } else {
        // No significant turn found ahead - continue straight
        const remainingDistance = totalRouteLength - projectedDistanceAlongRoute;
        setNextTurn({
          direction: 'straight',
          distance: Math.max(100, remainingDistance),
          roadName: undefined
        });
      }
    }
  }, [isNavigating, isShowingPreview, currentRoute, gpsData?.position]);
  
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
          zoom: 17,    // Navigation zoom showing road ahead (like TomTom GO)
          pitch: 60,   // Steep 3D tilt for professional navigation perspective
          bearing: initialBearing, // Route pointing upward (heading-up)
          padding: { 
            top: 180,    // Space for HUD
            bottom: 250, // Space for speedometer
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
                pitch: 60,
                bearing: initialBearing,
                padding: { top: 180, bottom: 250, left: 0, right: 0 },
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
  
  // Sync currentJourneyIdRef from currentJourney for persisted/rehydrated journeys
  // This ensures the stale completion guard works for journeys loaded from storage
  // Syncs for 'active' and 'planned' statuses (not completed/cancelled)
  useEffect(() => {
    if (currentJourney?.id && (currentJourney.status === 'active' || currentJourney.status === 'planned')) {
      if (currentJourneyIdRef.current !== currentJourney.id) {
        console.log('[JOURNEY-SYNC] Syncing currentJourneyIdRef from query:', currentJourney.id, 'status:', currentJourney.status);
        currentJourneyIdRef.current = currentJourney.id;
      }
    } else if (!currentJourney) {
      // Journey is null/undefined - DON'T clear the ref here as it may be set by pending route calculation
      // Only clear on legitimate completion (in completeJourneyMutation.onSuccess)
    }
  }, [currentJourney?.id, currentJourney?.status]);
  

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
            // Reset route progress tracking for new route
            routeProgressRef.current = 0;
            
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
      // CRITICAL GUARD: Do NOT clear route during active navigation (isLocalNavActive), preview mode (isShowingPreview),
      // or navigation transition (isStartingNavigationRef) - prevents route disappearing during GO button flow
      // when currentJourney is briefly null before the journey is created/activated
      // Also prevents route clearing when Preview button is pressed (plan view → preview mode)
      if (!isLocalNavActive && !isShowingPreview && !isStartingNavigationRef.current) {
        console.log('[JOURNEY-LOAD] No journey - clearing route data');
        setCurrentRoute(null);
        lastCalculatedRouteRef.current = null; // Only clear ref when NOT navigating
      } else {
        console.log('[JOURNEY-LOAD] No journey but navigation/preview/transition active - preserving currentRoute');
        // CRITICAL: If currentRoute is null but we have a saved route, restore it immediately
        if (!currentRoute && lastCalculatedRouteRef.current) {
          console.log('[JOURNEY-LOAD] ⚠️ Restoring route from lastCalculatedRouteRef during navigation');
          setCurrentRoute(lastCalculatedRouteRef.current);
        }
      }
      // NOTE: Navigation state is automatically derived by useNavigationSession
    }
  }, [currentJourney, navState, shouldShowHUD, isLocalNavActive, currentRoute, isShowingPreview]);

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
      
      // CRITICAL: Increment session counter ONLY when journey successfully starts
      // This is the definitive moment when a new navigation session begins
      // Any pending completion callbacks from previous sessions will now be stale
      navigationSessionRef.current++;
      console.log('[NAV-SESSION] New session started:', navigationSessionRef.current, 'for journey:', journey?.id);
      
      // Update journey ID ref synchronously
      if (journey?.id) {
        currentJourneyIdRef.current = journey.id;
      }
      
      // CRITICAL: Clear navigation transition guard - journey created successfully
      // Route clearing effects can now run normally (but isLocalNavActive will be true)
      isStartingNavigationRef.current = false;
      console.log('[NAV-ACTIVATION] 🔓 Navigation transition guard CLEARED - journey started');
    },
    onError: (error) => {
      console.error('Failed to start journey:', error);
      // Comprehensive UI recovery on journey creation failure
      recoverUIOnError();
      // CRITICAL: Clear navigation transition guard on error
      isStartingNavigationRef.current = false;
      console.log('[NAV-ACTIVATION] 🔓 Navigation transition guard CLEARED (error)');
      // Show user-friendly error message
      // REMOVED TOAST: No popups per user request
    },
  });

  const completeJourneyMutation = useMutation({
    mutationKey: ['completeJourney'], // CRITICAL: For useNavigationSession to track 'completing' state
    mutationFn: async ({ journeyId, sessionAtInvocation }: { journeyId: number; sessionAtInvocation: number }) => {
      const response = await apiRequest("PATCH", `/api/journeys/${journeyId}/complete`, {});
      const result = await response.json();
      // Echo back the session number captured at invocation time
      return { journey: result, sessionAtInvocation };
    },
    onSuccess: ({ journey, sessionAtInvocation }) => {
      // GUARD: Don't clear route if session has changed since this completion was initiated
      // This is the primary guard - if a new route calculation started, the session number changed
      const currentSession = navigationSessionRef.current;
      const isSessionStale = sessionAtInvocation !== currentSession;
      
      // Secondary guards: journey/route ID mismatches
      const completingJourneyId = journey?.id;
      const completingRouteId = journey?.routeId;
      const activeJourneyId = getActiveJourneyId();
      const currentRouteId = currentRouteIdRef.current;
      
      const isJourneyStale = activeJourneyId !== null && completingJourneyId !== activeJourneyId;
      const isRouteStale = currentRouteId !== null && completingRouteId !== undefined && 
                          completingRouteId !== currentRouteId;
      const isStaleCompletion = isSessionStale || isJourneyStale || isRouteStale;
      
      if (routeCalculationCountRef.current > 0 || isStaleCompletion) {
        console.log('[JOURNEY-COMPLETE] ⏸️ Skipping route clear - stale completion detected', {
          activeCalculations: routeCalculationCountRef.current,
          isSessionStale,
          sessionAtInvocation,
          currentSession,
          isJourneyStale,
          isRouteStale,
          completingJourneyId,
          activeJourneyId
        });
        // Still invalidate queries to sync backend state, but don't clear UI route
        queryClient.invalidateQueries({ queryKey: ["/api/journeys/active"] });
        queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
        queryClient.invalidateQueries({ queryKey: ["/api/journeys", "last"] });
        isCancellingRouteRef.current = false;
        
        // CRITICAL: Still dispatch targeted overlay cleanup to prevent stuck UI
        // This ensures Radix overlays from the old journey are closed without clearing the new route
        const cleanupEvent = new CustomEvent('navigation:overlayCleanup', {
          detail: { source: 'staleCompletion', completingJourneyId, activeJourneyId, timestamp: Date.now() }
        });
        window.dispatchEvent(cleanupEvent);
        return;
      }
      
      // Clear all tracking refs since this is a legitimate completion
      currentJourneyIdRef.current = null;
      currentRouteIdRef.current = null;
      
      // CRITICAL: Clear route AFTER backend confirms - preserves polyline during transition
      setCurrentRoute(null);
      setPreviewRoute(null);
      localStorage.removeItem('activeJourneyId');
      // CRITICAL: Invalidate the exact query key that navSession uses
      queryClient.invalidateQueries({ queryKey: ["/api/journeys/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys", "last"] });
      refetchCurrentJourney();
      
      // Reset cancellation guard after journey is completed
      isCancellingRouteRef.current = false;
      console.log('[JOURNEY-COMPLETE] ✅ Route cancellation guard reset, route cleared');
      
      // CRITICAL: Dispatch full reset event to trigger complete state reset
      // This remounts NavigationPageContent with fresh initial state (same as after T&C accept)
      const resetEvent = new CustomEvent('navigation:fullReset', {
        detail: { source: 'journeyComplete', journeyId: journey?.id, timestamp: Date.now() }
      });
      window.dispatchEvent(resetEvent);
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
      // Increment counter to track active route calculation (prevents watchdog from resetting UI)
      // NOTE: Session counter is now incremented in handleStartNavigation ONLY for GO flow
      // Plan-only routes and auto-reroutes should NOT affect session
      routeCalculationCountRef.current++;
      console.log('[ROUTE-CALC] Active calculations:', routeCalculationCountRef.current);
      
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
      // Reset route progress tracking for new route
      routeProgressRef.current = 0;
      // Initialize dynamic distance and ETA for new route
      if (route.distance) {
        setDynamicDistanceRemaining(route.distance);
      }
      if (route.duration) {
        setDynamicEtaMinutes(Math.ceil(route.duration / 60));
      }
      // SAFETY: Also store in persistent ref for navigation start resilience
      lastCalculatedRouteRef.current = route;
      // Update route ID ref SYNCHRONOUSLY before any callbacks can fire
      currentRouteIdRef.current = route.id || null;
      // Update window sync with new route
      windowSync.updateRoute(route);
      
      // Ensure toLocation is set when route is calculated
      if (route && route.endLocation && !toLocation) {
        setToLocation(route.endLocation);
      }
      
      // Save destination to recent locations for quick access
      if (route && route.endLocation && route.routePath && route.routePath.length > 0) {
        try {
          const endPoint = route.routePath[route.routePath.length - 1];
          const newDestination = {
            name: route.endLocation,
            lat: endPoint.lat,
            lng: endPoint.lng,
            timestamp: Date.now()
          };
          const stored = localStorage.getItem('trucknav_recent_locations');
          const existing = stored ? JSON.parse(stored) : [];
          // Add to front, remove duplicates, keep last 5
          const updated = [newDestination, ...existing.filter((l: any) => 
            !(Math.abs(l.lat - endPoint.lat) < 0.001 && Math.abs(l.lng - endPoint.lng) < 0.001)
          )].slice(0, 5);
          localStorage.setItem('trucknav_recent_locations', JSON.stringify(updated));
          console.log('[RECENT-LOCATIONS] Saved destination:', route.endLocation);
        } catch (error) {
          console.error('[RECENT-LOCATIONS] Failed to save destination:', error);
        }
      }
      
      // Save origin (from) location to recent origins for quick access
      if (route && route.startLocation && route.routePath && route.routePath.length > 0) {
        try {
          const startPoint = route.routePath[0];
          // Don't save "Current Location" as origin - only save actual addresses
          if (!route.startLocation.toLowerCase().includes('current location')) {
            addOrigin(
              route.startLocation.split(',')[0],
              route.startLocation,
              { lat: startPoint.lat, lng: startPoint.lng }
            );
            console.log('[RECENT-ORIGINS] Saved origin:', route.startLocation);
          }
        } catch (error) {
          console.error('[RECENT-ORIGINS] Failed to save origin:', error);
        }
      }
      
      // Cache route for offline use
      if (route && route.startLocation && route.endLocation) {
        try {
          // Cache as active route
          localStorage.setItem('trucknav_active_route', JSON.stringify(route));
          // Also cache by destination for future offline lookups
          const cacheKey = `trucknav_cached_route_${route.startLocation}_${route.endLocation}`;
          localStorage.setItem(cacheKey, JSON.stringify(route));
          console.log('[ROUTE-CACHE] Route cached for offline use:', cacheKey);
        } catch (error) {
          console.error('[ROUTE-CACHE] Failed to cache route:', error);
        }
      }
      
      // If route calculation includes a plannedJourney (from route calculation), update sync
      // NOTE: We only set the ref here, not localStorage - localStorage is set when navigation STARTS
      // This prevents preview routes from reappearing on app reload
      if (route.plannedJourney) {
        // Track the journey ID from this route calculation - used to detect stale completions
        currentJourneyIdRef.current = route.plannedJourney.id;
        console.log('[ROUTE-CALC] Set currentJourneyIdRef to:', route.plannedJourney.id);
        windowSync.updateJourney(route.plannedJourney, false);
      }
      
      // Route calculated - check if auto-navigation is requested (mobile GO button flow)
      console.log('[ROUTE-CALC] Route calculated - checking auto-navigation flag:', shouldAutoNavigateOnMobile);
      
      // On mobile: only close menu and switch to preview if GO button was pressed
      // CRITICAL FIX: Do NOT auto-close menu after route calculation - user must press GO
      if (isMobile && shouldAutoNavigateOnMobile) {
        // Only close the menu if GO button was pressed (shouldAutoNavigateOnMobile flag)
        setShowComprehensiveMenu(false);
        
        // Collapse sidebar to show the route on the map
        if (sidebarState === 'open') {
          setSidebarState('collapsed');
          localStorage.setItem('navigationSidebarState', 'collapsed');
        }
      }
      
      // When GO button was pressed, show the preview screen (don't auto-start navigation)
      // This allows user to see route details and choose when to start navigation
      if (shouldAutoNavigateOnMobile) {
        console.log('[ROUTE-CALC] GO button flow - showing preview screen with route ready');
        
        // CRITICAL: Reset any stale cancellation guard from previous navigation session
        isCancellingRouteRef.current = false;
        
        // Reset auto-navigation flag
        setShouldAutoNavigateOnMobile(false);
        
        // Show the preview overlay with route info - user can choose to start navigation
        setIsShowingPreview(true);
        setShowNavControls(true);
        
        // Decrement counter
        routeCalculationCountRef.current = Math.max(0, routeCalculationCountRef.current - 1);
        console.log('[ROUTE-CALC] Calculation complete (preview path). Active calculations:', routeCalculationCountRef.current);
        
        // Don't auto-start navigation - let user see the preview first
        return;
      }
      
      // Reset auto-navigation flag now that route calculation is complete
      // This allows watchdog to work normally for future navigation cancellations
      setShouldAutoNavigateOnMobile(false);
      
      // Decrement counter - only when all calculations complete will watchdog be able to fire
      routeCalculationCountRef.current = Math.max(0, routeCalculationCountRef.current - 1);
      console.log('[ROUTE-CALC] Calculation complete. Active calculations:', routeCalculationCountRef.current);
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error('Failed to calculate route:', error);
      }
      // Clear any existing route on error
      setCurrentRoute(null);
      // Comprehensive UI recovery on route calculation failure
      recoverUIOnError();
      // Reset auto-navigation flag on error
      setShouldAutoNavigateOnMobile(false);
      // Decrement counter - only when all calculations complete will watchdog be able to fire
      routeCalculationCountRef.current = Math.max(0, routeCalculationCountRef.current - 1);
      console.log('[ROUTE-CALC] Calculation failed. Active calculations:', routeCalculationCountRef.current);
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
    console.log('[PLAN-ROUTE] Online status:', navigator.onLine);
    
    // Guard against duplicate requests while calculating
    if (calculateRouteMutation.isPending) {
      console.log('[PLAN-ROUTE] Already calculating route - skipping duplicate request');
      return;
    }
    
    // Ensure we have a valid vehicle profile ID before planning route
    if (!activeProfileId || activeProfileId.trim().length === 0) {
      console.error('[PLAN-ROUTE] ERROR: No vehicle profile selected! Please select a vehicle profile first.');
      return;
    }

    // Check for required locations
    const finalStartLoc = startLoc || fromLocation;
    const finalEndLoc = endLoc || toLocation;
    
    if (!finalStartLoc || !finalEndLoc) {
      console.error('[PLAN-ROUTE] ERROR: Missing locations - From:', finalStartLoc, 'To:', finalEndLoc);
      return;
    }

    // OFFLINE MODE: Try to use cached route if offline
    if (!navigator.onLine) {
      console.log('[PLAN-ROUTE] 📴 OFFLINE MODE - checking for cached routes...');
      
      try {
        // Try to load cached route from localStorage
        const cachedRouteKey = `trucknav_cached_route_${finalStartLoc}_${finalEndLoc}`;
        const cachedRouteData = localStorage.getItem(cachedRouteKey);
        
        // Also check for active route that might match
        const activeRoute = localStorage.getItem('trucknav_active_route');
        
        if (cachedRouteData) {
          console.log('[PLAN-ROUTE] ✅ Found cached route for this destination');
          const cachedRoute = JSON.parse(cachedRouteData);
          setCurrentRoute(cachedRoute);
          
          // Close menu and show route-ready state on mobile
          if (isMobile) {
            setShowComprehensiveMenu(false);
            if (shouldAutoNavigateOnMobile) {
              setShouldAutoNavigateOnMobile(false);
              // Show Preview mode so user can choose Preview (flyby) or Start (navigation)
              setIsShowingPreview(true);
              setShowNavControls(true);
            }
          }
          return;
        } else if (activeRoute) {
          console.log('[PLAN-ROUTE] ✅ Using active cached route for offline navigation');
          const parsedRoute = JSON.parse(activeRoute);
          setCurrentRoute(parsedRoute);
          
          // Close menu and show route-ready state on mobile
          if (isMobile) {
            setShowComprehensiveMenu(false);
            if (shouldAutoNavigateOnMobile) {
              setShouldAutoNavigateOnMobile(false);
              // Show Preview mode so user can choose Preview (flyby) or Start (navigation)
              setIsShowingPreview(true);
              setShowNavControls(true);
            }
          }
          return;
        } else {
          console.warn('[PLAN-ROUTE] ⚠️ No cached route available for offline mode');
          // Reset auto-navigation flag since we can't complete the request
          setShouldAutoNavigateOnMobile(false);
          return;
        }
      } catch (error) {
        console.error('[PLAN-ROUTE] Offline route loading failed:', error);
        setShouldAutoNavigateOnMobile(false);
        return;
      }
    }

    // ONLINE MODE: Normal geocoding and API call
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
      return;
    }

    const routeData = {
      startLocation: finalStartLoc,
      endLocation: finalEndLoc,
      startCoordinates: finalStartCoords,
      endCoordinates: finalEndCoords,
      vehicleProfileId: activeProfileId,
      routePreference: routePreference || 'fastest',
      useCarMode: isCarProfileMode,
    };

    console.log('[PLAN-ROUTE] Using Car mode:', isCarProfileMode);
    calculateRouteMutation.mutate(routeData);
  };

  // Alternative routes preview handlers
  const handlePreviewAlternativeRoute = (route: AlternativeRoute) => {
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
      // Reset route progress tracking for new route
      routeProgressRef.current = 0;
      // Initialize dynamic distance and ETA for alternative route
      if (newRoute.distance) {
        setDynamicDistanceRemaining(newRoute.distance);
      }
      if (newRoute.duration) {
        setDynamicEtaMinutes(Math.ceil(newRoute.duration / 60));
      }
      // SAFETY: Store in persistent ref for navigation resilience
      lastCalculatedRouteRef.current = newRoute;
      
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
  // GUARD: Do NOT clear route during active navigation, preview mode, transition, or when preparing to navigate
  useEffect(() => {
    // CRITICAL FIX: Also check isLocalNavActive, isShowingPreview, and isStartingNavigationRef to prevent race conditions
    // The route was disappearing because isNavigating (backend state) hadn't updated yet
    // Also guard against clearing route during preview mode (after Preview button pressed)
    // Also guard against clearing route during GO button transition (isStartingNavigationRef)
    if (currentRoute && (fromLocation || toLocation) && !isNavigating && !shouldAutoNavigateOnMobile && !isLocalNavActive && !isShowingPreview && !isStartingNavigationRef.current) {
      setCurrentRoute(null);
    }
  }, [fromLocation, toLocation, isNavigating, shouldAutoNavigateOnMobile, isLocalNavActive, isShowingPreview]);

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

  // NOTE: Route-ready state with Preview/Start buttons is now handled directly in
  // calculateRouteMutation.onSuccess when shouldAutoNavigateOnMobile is true.
  // This ensures proper timing - HUD shows immediately after route calculation completes.



  // Handle cancel route - stop navigation and reset to default Class 1 Truck
  const handleCancelRoute = () => {
    // CRITICAL: Set cancellation guard to prevent race condition where
    // currentJourney still exists and triggers route re-fetch before completion
    isCancellingRouteRef.current = true;
    console.log('[ROUTE-CANCEL] 🛡️ Route cancellation guard activated');
    
    // Reset route calculation counter to 0 if user cancels (abort all pending calculations)
    routeCalculationCountRef.current = 0;
    setShouldAutoNavigateOnMobile(false);
    
    // CRITICAL FIX: Immediately clear navigation UI state to return to preview mode
    // This ensures the hamburger button reappears immediately
    setIsLocalNavActive(false);
    // NOTE: Do NOT call setShowComprehensiveMenu(false) here - it prevents the menu from opening after cancellation
    setIsShowingPreview(false); // Also reset preview mode
    localStorage.removeItem('navigation_ui_active');
    localStorage.removeItem('navigation_mode');
    localStorage.removeItem('navigation_timestamp');
    console.log('[ROUTE-CANCEL] ✅ Navigation UI state cleared - returning to plan mode');
    
    // AUTO-RESET CAR MODE: If user was using Car mode for this route, reset to Lorry
    if (isCarProfileMode) {
      console.log('[ROUTE-CANCEL] 🔄 Resetting Car mode back to Class 1 Lorry');
      setIsCarProfileMode(false);
    }
    
    // DEACTIVATE OVERLAY KILL-SWITCH: Restore normal overlay behavior
    document.body.classList.remove('navigation-active');
    document.documentElement.classList.remove('overlay-safe-mode');
    
    // CRITICAL: Clear all route persistence - fresh start page
    localStorage.removeItem('activeJourneyId');
    // NOTE: Do NOT remove activeVehicleProfileId - preserve user's vehicle selection
    
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
      // Capture current session at invocation time for stale detection
      completeJourneyMutation.mutate({ 
        journeyId: currentJourney.id, 
        sessionAtInvocation: navigationSessionRef.current 
      });
    } else {
      // No journey to complete - reset guard immediately
      isCancellingRouteRef.current = false;
      console.log('[ROUTE-CANCEL] ℹ️ No journey to complete - guard reset immediately');
    }
    
    console.log('[ROUTE-CANCEL] ✅ Route cancelled - returned to plan mode with default truck');
  };

  // Handle preview route - fly-by animation along the route at 10x speed
  const handlePreviewRoute = () => {
    if (!currentRoute || !currentRoute.routePath || currentRoute.routePath.length < 2) {
      console.warn('[PREVIEW] Cannot preview - invalid route');
      return;
    }
    
    console.log('[PREVIEW] Starting fly-by route preview at 40x speed');
    setIsShowingPreview(true);
    setIsFlyByInProgress(true);
    
    // Trigger fly-by animation via map ref
    if (mapRef.current) {
      mapRef.current.flyByRoute(currentRoute.routePath!, {
        speedMultiplier: 40,
        onComplete: () => {
          console.log('[PREVIEW] Fly-by animation complete - zooming to full route bounds');
          setIsFlyByInProgress(false);
          // After fly-by, zoom out to show full route
          if (!currentRoute.routePath) return;
          const lats = currentRoute.routePath.map((p: any) => p.lat);
          const lngs = currentRoute.routePath.map((p: any) => p.lng);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          
          const zoomEvent = new CustomEvent('zoom_to_bounds', {
            detail: {
              bounds: { north: maxLat, south: minLat, east: maxLng, west: minLng },
              padding: 50
            }
          });
          window.dispatchEvent(zoomEvent);
        },
        onCancel: () => {
          console.log('[PREVIEW] Fly-by cancelled');
          setIsFlyByInProgress(false);
        }
      });
    } else {
      setIsFlyByInProgress(false);
      // Fallback to simple zoom if map ref not available
      const lats = currentRoute.routePath.map((p: any) => p.lat);
      const lngs = currentRoute.routePath.map((p: any) => p.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      const zoomEvent = new CustomEvent('zoom_to_bounds', {
        detail: {
          bounds: { north: maxLat, south: minLat, east: maxLng, west: minLng },
          padding: 50
        }
      });
      window.dispatchEvent(zoomEvent);
    }
  };
  
  // Handle cancel fly-by preview
  const handleCancelPreview = () => {
    if (mapRef.current) {
      mapRef.current.cancelFlyBy();
    }
    setIsFlyByInProgress(false);
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
    // Allow navigation from plan mode (after route calculation) or navigate mode
    // The isShowingPreview state indicates preview mode, not mobileNavMode
    if (isMobile && mobileNavMode === 'plan' && !isShowingPreview && !currentRoute) {
      console.warn('[NAV-MODE] Cannot start navigation - still in plan mode without route:', mobileNavMode);
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
  const handleStartNavigation = async (e?: React.MouseEvent | React.PointerEvent) => {
    // PREVENT PROPAGATION: Ensure event doesn't bubble if it exists
    if (e) {
      if ('preventDefault' in e) e.preventDefault();
      if ('stopPropagation' in e) e.stopPropagation();
    }
    
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
    
    // CRITICAL: Set navigation transition guard AFTER validation but BEFORE any state changes
    // This must be set BEFORE setIsShowingPreview(false) which could trigger route-clearing effects
    isStartingNavigationRef.current = true;
    console.log('[NAV-ACTIVATION] 🔒 Navigation transition guard SET - route clearing blocked');
    
    // CRITICAL FIX: Set isLocalNavActive VERY EARLY so MapLibreMap knows navigation is starting
    // This prevents the route/traffic layers from being cleared during async operations
    // Must happen BEFORE any async calls (ensureRouteReady) or state changes (setIsShowingPreview)
    setIsLocalNavActive(true);
    localStorage.setItem('navigation_ui_active', 'true');
    console.log('[NAV-ACTIVATION] ✅ Navigation UI state set VERY EARLY to prevent layer clearing');
    
    try {
      // CRITICAL: Cancel any active fly-by animation to prevent camera conflicts
      if (mapRef.current) {
        mapRef.current.cancelFlyBy();
        console.log('[NAV-ACTIVATION] ✅ Cancelled any active fly-by animation');
      }
      setIsFlyByInProgress(false);
      setIsShowingPreview(false);
      
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
      
      // NOTE: Session counter is incremented in startJourneyMutation.onSuccess
      // This ensures session only changes when journey actually starts successfully
      
      // CRITICAL: Persist route to state so component receives valid route
      setCurrentRoute(route);
      // Reset route progress tracking for new route
      routeProgressRef.current = 0;
      // SAFETY: Store in persistent ref BEFORE navigation starts - this survives journey sync effects
      lastCalculatedRouteRef.current = route;
      console.log('[NAV-ACTIVATION] ✅ Route ready and persisted to state + ref, proceeding with journey activation');

      // NOTE: Navigation state will be automatically derived by navSession hook
      // after journey is created/activated - no need to manually set states
      
      // NOTE: Camera setup for 3D navigation view is handled by the GPS heading effect
      // in maplibre-map.tsx to prevent conflicting camera animations
      console.log('[NAV-ACTIVATION] 🎯 Camera will be set by GPS heading effect (60° pitch, 16.5 zoom)');
      
      console.log('[NAV-ACTIVATION] Step 2: Set navigation active state for CSS styling');
      // Set navigation active state for CSS styling
      document.body.classList.add('navigation-active');
      document.documentElement.classList.add('overlay-safe-mode');
      
      // NOTE: isLocalNavActive was already set VERY EARLY (before async operations)
      // to ensure MapLibreMap preserves route/traffic layers during state transitions
      console.log('[NAV-ACTIVATION] ✅ Navigation UI state already set - verifying SpeedometerHUD state');
      
      // Reset any stale cancellation guard
      isCancellingRouteRef.current = false;
      
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
      
      // Save destination to history (ordered by travel - most recent first)
      if (toLocation && toCoordinates) {
        addDestination(
          toLocation.split(',')[0], // Short label from first part of address
          toLocation,
          toCoordinates
        );
        console.log('[NAV-ACTIVATION] ✅ Destination saved to history:', toLocation);
      }
      
      // NOTE: isLocalNavActive was already set earlier in Step 2 to ensure proper SpeedometerHUD state
      // Verify localStorage persistence is still in place
      console.log('[NAV-ACTIVATION] ✅ Navigation UI state verified - already set in Step 2');
      
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
      
      // CRITICAL: Clear navigation transition guard on error
      isStartingNavigationRef.current = false;
      console.log('[NAV-ACTIVATION] 🔓 Navigation transition guard CLEARED (catch error)');
      
      // CRITICAL: Revert isLocalNavActive since journey creation failed
      // This prevents stuck "navigating" state when backend never entered navigation
      setIsLocalNavActive(false);
      // Note: Don't clear lastCalculatedRouteRef on error - user may want to retry
      // The route is still valid, only the journey creation failed
      localStorage.removeItem('navigation_ui_active');
      localStorage.removeItem('navigation_mode');
      localStorage.removeItem('navigation_timestamp');
      console.log('[NAV-ACTIVATION] ❌ Failed - reverted navigation UI state');
      
      recoverUIOnError();
      
      // REMOVED TOAST: No popups per user request
    }
  };

  const handleStopNavigation = () => {
    console.log('[NAV-STOP] 🔴 Cancel button pressed!');
    
    // Reset route calculation counter to 0 if user cancels (abort all pending calculations)
    routeCalculationCountRef.current = 0;
    setShouldAutoNavigateOnMobile(false);
    
    // CRITICAL: Always reset cancellation guard at start of stop - prevents stuck disabled state
    // This ensures the Stop button is never permanently disabled due to stale guard state
    isCancellingRouteRef.current = false;
    console.log('[NAV-STOP] 🔓 Cancellation guard reset at entry');
    
    // If navigation is already cancelled (no route), go back to fresh start
    if (!isLocalNavActive && !currentRoute) {
      console.log('[NAV-STOP] ✅ Already cancelled - triggering full reset to clean state');
      // Dispatch full reset to restore initial screen state (same as after T&C accept)
      const resetEvent = new CustomEvent('navigation:fullReset', {
        detail: { source: 'stopNavigation_alreadyCancelled', timestamp: Date.now() }
      });
      window.dispatchEvent(resetEvent);
      return;
    }
    
    // GUARD: Prevent double-clicks - if mutation is pending, force complete UI reset
    if (completeJourneyMutation.isPending) {
      console.log('[NAV-STOP] ⏸️ Mutation pending - triggering full reset');
      // Dispatch full reset to restore initial screen state (same as after T&C accept)
      const resetEvent = new CustomEvent('navigation:fullReset', {
        detail: { source: 'stopNavigation_mutationPending', timestamp: Date.now() }
      });
      window.dispatchEvent(resetEvent);
      return;
    }
    
    // CRITICAL: Set cancellation guard to prevent race condition where
    // currentJourney still exists and triggers route re-fetch before completion
    isCancellingRouteRef.current = true;
    console.log('[NAV-STOP] 🛡️ Route cancellation guard activated');
    
    // Safety timeout: Reset guard after 3 seconds in case mutation fails
    setTimeout(() => {
      if (isCancellingRouteRef.current) {
        isCancellingRouteRef.current = false;
        console.log('[NAV-STOP] ⚠️ Safety timeout - guard force reset');
      }
    }, 3000);
    
    // CRITICAL FIX: Immediately clear navigation UI state to return to plan mode
    // This ensures the hamburger button reappears immediately
    setIsLocalNavActive(false);
    setIsShowingPreview(false); // CRITICAL: Reset preview mode so isNavUIActive becomes false
    setShowComprehensiveMenu(false); // Reset menu state to allow fresh opening
    setShouldAutoNavigateOnMobile(false); // CRITICAL: Reset auto-nav flag to ensure isNavUIActive becomes false
    setSidebarState(isMobile ? 'closed' : 'open'); // CRITICAL: Reset sidebar to prevent full-screen overlay blocking map
    resetRerouteState(); // Reset auto-reroute state for next navigation session
    // CRITICAL: Clear the persistent route ref on explicit stop to prevent restoration
    lastCalculatedRouteRef.current = null;
    // CRITICAL FIX: Clear currentRoute immediately to prevent NavigationLayout from blocking
    // This ensures the hamburger menu button becomes visible immediately
    setCurrentRoute(null);
    setPreviewRoute(null);
    localStorage.removeItem('navigation_ui_active');
    localStorage.removeItem('navigation_mode');
    localStorage.removeItem('navigation_timestamp');
    localStorage.removeItem('activeRouteId');
    localStorage.removeItem('activeJourneyId');
    // NOTE: Do NOT remove activeVehicleProfileId - preserve user's vehicle selection
    console.log('[NAV-STOP] ✅ Navigation UI state cleared - returning to preview mode');

    // AUTO-RESET CAR MODE: If user was using Car mode for this route, reset to Lorry
    if (isCarProfileMode) {
      console.log('[NAV-STOP] 🔄 Resetting Car mode back to Class 1 Lorry');
      setIsCarProfileMode(false);
    }
    
    if (currentJourney && (currentJourney.status === 'active' || currentJourney.status === 'planned')) {
      // Capture current session at invocation time for stale detection
      completeJourneyMutation.mutate({ 
        journeyId: currentJourney.id, 
        sessionAtInvocation: navigationSessionRef.current 
      });
    } else {
      // No journey to complete - just reset guard (route already cleared above)
      isCancellingRouteRef.current = false;
      console.log('[NAV-STOP] ℹ️ No journey to complete - guard reset immediately');
    }
    
    // Clear URL parameter
    const url = new URL(window.location.href);
    if (url.searchParams.has('journey')) {
      url.searchParams.delete('journey');
      window.history.replaceState({}, '', url.pathname);
    }
    
    // Reset destination reached state for next journey
    hasShownDestinationDialogRef.current = false;
    setShowDestinationReached(false);
    
    // Clear location inputs to allow fresh route planning
    setFromLocation('');
    setToLocation('');
    setFromCoordinates(null);
    setToCoordinates(null);
    
    // CRITICAL: Trigger menu input reset to clear local state in ComprehensiveMobileMenu
    setMenuResetTrigger(prev => prev + 1);
    
    // Clear alternative routes state
    setIsAlternativeRoutesOpen(false);
    setSelectedAlternativeRouteId(null);
    setIsApplyingRoute(false);
    
    // Reset UI states - but preserve map position/expansion unless in fullscreen nav
    // Only collapse map if we were in fullscreen navigation mode
    if (isFullscreenNav) {
      setIsMapExpanded(false);
    }
    setShowLaneGuidance(false);
    setIsARMode(false);
    setIsFullscreenNav(false);
    
    // NOTE: Do NOT reset showNavControls here - HUD buttons should remain functional
    // The hamburger menu visibility is controlled by mobileNavMode derived from isLocalNavActive
    // which we already set to false above, so hamburger will reappear automatically
    
    // NOTE: Sidebar state already set to 'closed' on mobile at line 2773 - do NOT overwrite
    // This ensures the UI returns to the exact initial state (same as after T&C accept)
    
    // Dispatch navigation stopped event for notification system
    const navigationStoppedEvent = new CustomEvent('navigation:stopped', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(navigationStoppedEvent);
    
    // CRITICAL: Dispatch full reset event to trigger complete state reset
    // This remounts NavigationPageContent with fresh initial state (same as after T&C accept)
    const resetEvent = new CustomEvent('navigation:fullReset', {
      detail: { source: 'stopNavigation', timestamp: Date.now() }
    });
    window.dispatchEvent(resetEvent);
    
    console.log('[ROUTE-CANCEL] ✅ Route cancelled - full reset triggered for fresh start');
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
  // NOTE: Legal consent is now checked in the parent NavigationPage wrapper BEFORE GPS starts

  return (
    <div className="min-h-[100svh] flex flex-col" style={{background: "transparent"}}>
      {/* Fleet Broadcast Notifications - Shows critical/important messages from fleet managers */}
      <BroadcastNotificationPopup />
      
      {/* Desktop-Only Navigation Header */}
      <DesktopHeader />

      {/* Mobile-First Layout - Clean 3-Mode Workflow */}
      {(isMobile || isStandalone) ? (
        <>
        {/* Navigation Header - OUTSIDE mobile-layout for proper z-index stacking */}
        {/* Green gear opens the quick settings panel (vehicle, language, theme) */}
        {!isARMode && (
          <NavigationHeader 
            onSettingsClick={() => setShowVehicleSettings(true)}
            onWeatherClick={() => setShowWeatherTool(true)}
            onEntertainmentClick={() => setShowEntertainmentTool(true)}
            onVoiceNavClick={() => setShowVoiceNavTool(true)}
            onFuelPricesClick={() => setShowFuelPricesTool(true)}
            onFatigueMonitorClick={() => setShowFatigueMonitorTool(true)}
            onRegionSettingsClick={() => setShowRegionSettingsTool(true)}
            onLanguageClick={() => setShowLanguageTool(true)}
            onMapSettingsClick={() => setShowMapSettingsTool(true)}
            onClearRouteClick={() => {
              setCurrentRoute(null);
              toast({ title: "Route cleared", description: "The map has been reset." });
            }}
            onReplayTourClick={() => resetTour()}
          />
        )}
        
        {/* Navigation UI active? (HUD) - DISABLED: Consolidated into CompactTripStrip glass bar */}
        {/* ProfessionalNavHUD removed to avoid duplicate ETA displays - all elements now in CompactTripStrip */}
        
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
                    hideControls={false}
                    hideCompass={false}
                    onMapClick={handleMapClick}
                    onDoubleTap={() => {
                      console.log('[DOUBLE-TAP] Toggling nav controls visibility');
                      setShowNavControls(prev => !prev);
                    }}
                    isNavigating={isNavigating || isLocalNavActive}
                    showUserMarker={showUserMarker}
                    useStaticRoute={isNavigating || isLocalNavActive}
                    restrictionViolations={restrictionViolations}
                    onToggleTraffic={() => setShowTrafficLayer(prev => !prev)}
                    onViewIncidents={() => {
                      console.log('[INCIDENTS-BTN] 🔴 Incidents button pressed - opening Live Traffic Panel (view tab)');
                      setLiveTrafficPanelTab('view');
                      setShowLiveTrafficPanel(true);
                    }}
                  />
                </MapShell>
              </div>
              
              {/* ETA GLASS BAR - Moved to NavigationLayout's topStrip to prevent duplicate rendering */}

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
              {isShowingPreview && 
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
              {isShowingPreview && 
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

              {/* PLAN MODE - Route calculated indicator removed - user uses GO button in drawer */}
              
              {/* PLAN MODE CONTROLS - Left Stack - Only Menu and Voice buttons remain here */}
              {mobileNavMode === 'plan' && !currentRoute && !isNavUIActive && (
                <>
                  <div className="fixed flex flex-col gap-3 z-[200] pointer-events-auto"
                    style={{
                      bottom: 'calc(56px + var(--safe-area-bottom))',
                      left: '16px'
                    }}>
                    {/* Voice Toggle Button - Visual indicator for mute state */}
                    <Button
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setProfessionalVoiceEnabled(!professionalVoiceEnabled);
                      }}
                      size="icon"
                      className={`h-10 w-10 rounded-full shadow-lg font-medium touch-none ${
                        professionalVoiceEnabled 
                          ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white' 
                          : 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white'
                      }`}
                      data-testid="button-toggle-voice"
                      aria-label={professionalVoiceEnabled ? "Mute voice navigation" : "Unmute voice navigation"}
                    >
                      {professionalVoiceEnabled ? <Speaker className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                    </Button>
                    
                    {/* Menu Button */}
                    <Button
                      onClick={() => {
                        console.log('[MENU-BUTTON] Hamburger menu button pressed');
                        setShowComprehensiveMenu(true);
                      }}
                      size="icon"
                      className="h-10 w-10 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium"
                      data-testid="button-open-menu-plan"
                    >
                      <Menu className="w-6 h-6" />
                    </Button>
                  </div>
                  
                  {/* PLAN MODE CONTROLS - Right Stack - Map control buttons (controlled by showNavControls toggle) */}
                  <div className="fixed flex flex-col gap-1 z-[200] pointer-events-auto"
                    style={{
                      bottom: 'calc(56px + var(--safe-area-bottom))',
                      right: '16px'
                    }}>
                    <RightActionStack
                      onZoomIn={() => mapRef.current?.zoomIn()}
                      onZoomOut={() => mapRef.current?.zoomOut()}
                      onRecenter={() => mapRef.current?.zoomToUserLocation()}
                      onToggle3D={() => {
                        mapRef.current?.toggle3DMode();
                        setMapControlState(prev => ({ ...prev, is3DMode: mapRef.current?.is3DMode() || false }));
                      }}
                      onToggleTraffic={() => {
                        console.log('[TRAFFIC-TOGGLE] 🟠 Traffic button pressed in PREVIEW mode - toggling from:', showTrafficLayer);
                        setShowTrafficLayer(prev => !prev);
                      }}
                      onToggleMapView={() => {
                        console.log('[MAP-VIEW-TOGGLE] Button pressed, calling toggleMapView');
                        mapRef.current?.toggleMapView();
                        setMapControlState(prev => {
                          const newSatelliteState = !prev.isSatelliteView;
                          console.log('[MAP-VIEW-TOGGLE] Toggling satellite view to:', newSatelliteState);
                          return { ...prev, isSatelliteView: newSatelliteState };
                        });
                      }}
                      onCompassClick={() => {
                        mapRef.current?.resetBearing();
                        mapRef.current?.zoomToUserLocation({ bearing: 0, pitch: 0 });
                      }}
                      is3DMode={mapControlState.is3DMode}
                      showTraffic={showTrafficLayer}
                      isSatelliteView={mapControlState.isSatelliteView}
                      bearing={mapControlState.bearing}
                      isVisible={showNavControls}
                      hideIncidents={true}
                      compact={true}
                    />
                  </div>
                </>
              )}

              {/* PREVIEW MODE OVERLAY (z-10+) - Visible only when showing preview, overlays on top of stable map */}
              {isShowingPreview && currentRoute && !isNavigating && (
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
                      className="h-6 w-6 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-md"
                      data-testid="button-settings-preview"
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* BOTTOM STACK CONTAINER - Preview Mode Actions */}
                  <div 
                    className="fixed left-0 right-0 flex flex-col items-center gap-3 pointer-events-none px-4 z-[200]"
                    style={{ 
                      bottom: 'calc(20px + var(--safe-area-bottom, 0px))'
                    }}
                  >
                    {/* Action Buttons - Info boxes moved to infoBoxes prop */}
                    <div className="flex flex-col items-center gap-3 pointer-events-auto w-full max-w-sm">
                      {/* Action Buttons */}
                      <div className="flex gap-2 w-full">
                        {/* Incident Report Button - same functionality as Navigation mode */}
                        <Button
                          onClick={() => {
                            console.log('[INCIDENT-BTN] 🟠 Orange button pressed in PREVIEW mode - opening Incident Report Dialog');
                            setShowIncidentReportDialog(true);
                          }}
                          variant="outline"
                          className="h-11 w-11 p-0 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white border-0 shadow-lg"
                          data-testid="button-report-incident-preview"
                        >
                          <AlertCircle className="w-5 h-5" />
                        </Button>
                        <Button
                          onClick={handlePreviewRoute}
                          disabled={isFlyByInProgress}
                          variant="outline"
                          className="flex-1 h-11 font-semibold bg-white/90 backdrop-blur-sm"
                          data-testid="button-preview-route"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          onClick={handleStartNavigation}
                          className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-semibold"
                          data-testid="button-start-navigation"
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Start
                        </Button>
                      </div>
                    </div>
                    
                    {/* Legal Ownership */}
                    <div className="w-full pointer-events-auto">
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

                  {/* Traffic Prediction Panel - HIDDEN: Removed per user request for cleaner preview/navigation UI */}

                  {/* ETA Glass Bar moved to top level - always visible when route exists */}
                </>
              )}

              {/* NAVIGATE MODE WITH NAVIGATION LAYOUT - Mobile Navigation UI */}
              {/* Only render NavigationLayout when navigation is active or route exists */}
              {/* This prevents the z-[99999] overlays from blocking the hamburger button in plan mode */}
              {!showComprehensiveMenu && (isNavUIActive || currentRoute) && (
                <>
                <NavigationLayout
                  isNavigating={isNavigating}
                  isNavUIActive={isNavUIActive}
                  showBottomBar={!!currentRoute}
                  rightStackVisible={showNavControls}
                  mapContent={
                    <>
                      {/* Map is already rendered in base layer, add overlays here */}
                      
                      {/* Navigation Guideline Overlay - Truck-specific visual route guidance */}
                      {mobileNavMode === 'navigate' && (
                        <NavigationGuidelineOverlay
                          isNavigating={isNavigating}
                          routeDistance={currentRoute?.distance || 0}
                          heading={gpsData?.position?.heading || 0}
                          routeCoordinates={currentRoute?.routePath?.map(p => [p.lng, p.lat] as [number, number]) || []}
                          nextTurn={nextTurn}
                          laneGuidance={currentRoute?.laneGuidance?.[0] ? {
                            lanes: currentRoute.laneGuidance[0].laneOptions?.map(l => l.direction) || [],
                            recommended: currentRoute.laneGuidance[0].laneOptions?.map((l, i) => l.recommended ? i : -1).filter(i => i >= 0) || [],
                            maneuverType: currentRoute.laneGuidance[0].maneuverType
                          } : null}
                        />
                      )}
                      
                      {/* Map Turn + Lane Indicator - Large bubble at top left with lane guidance */}
                      {/* Only show when distance is within thresholds: 1000ft/500ft/100ft (imperial) or 300m/150m/30m (metric) */}
                      {nextTurn && shouldShowTurnIndicator(nextTurn.distance, measurementSystem === 'imperial') && (
                        <MapTurnLaneIndicator
                          turnInfo={nextTurn}
                          unit={measurementSystem === 'imperial' ? 'mi' : 'km'}
                          laneInfo={currentRoute?.laneGuidance?.[0] ? {
                            lanes: currentRoute.laneGuidance[0].laneOptions?.map(l => ({
                              direction: l.direction as 'left' | 'right' | 'straight' | 'exit',
                              isRecommended: l.recommended || false
                            })) || []
                          } : null}
                          isVisible={true}
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
                    currentRoute ? (
                      <CompactTripStrip
                        eta={dynamicEtaMinutes > 0 ? dynamicEtaMinutes * 60 : (currentRoute.duration || 0)}
                        distanceRemaining={dynamicDistanceRemaining > 0 ? dynamicDistanceRemaining : (currentRoute.distance || 0)}
                        isOnline={navigator.onLine}
                        gpsStatus={gpsData?.status || 'unavailable'}
                        onPreviewStart={handlePreviewRoute}
                        onPreviewStop={() => {
                          console.log('[FLYBY] Stop requested - resetting to initial state');
                          if (mapRef.current) {
                            mapRef.current.cancelFlyBy();
                          }
                          setIsFlyByInProgress(false);
                          setIsShowingPreview(false);
                          if (currentRoute?.routePath) {
                            const lats = currentRoute.routePath.map((p: any) => p.lat);
                            const lngs = currentRoute.routePath.map((p: any) => p.lng);
                            window.dispatchEvent(new CustomEvent('zoom_to_bounds', {
                              detail: {
                                bounds: { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) },
                                padding: 50
                              }
                            }));
                          }
                        }}
                        onSetLocation={() => setShowManualLocationDialog(true)}
                        isPreviewActive={isFlyByInProgress}
                        voiceEnabled={professionalVoiceEnabled}
                        onVoiceToggle={() => setProfessionalVoiceEnabled(!professionalVoiceEnabled)}
                        roadInfo={roadInfo ? {
                          roadRef: roadInfo.roadRef,
                          junction: roadInfo.junction,
                          destination: roadInfo.destination
                        } : null}
                        turnInfo={nextTurn ? {
                          direction: nextTurn.direction,
                          distance: nextTurn.distance,
                          roadName: nextTurn.roadName
                        } : null}
                        currentSpeed={gpsData?.position?.speed || 0}
                        speedLimit={currentSpeedLimit || undefined}
                        isNavigating={isNavigating}
                        onCancelNavigation={handleStopNavigation}
                        isCancellingNavigation={completeJourneyMutation.isPending}
                        trafficDelayMinutes={predictedTrafficDelay}
                      />
                    ) : null
                  }
                  leftStack={
                    <LeftActionStack
                      onNavigate={() => mapRef.current?.zoomToUserLocation()}
                      onCancel={handleStopNavigation}
                      onReportIncident={() => {
                        console.log('[INCIDENT-BTN] 🟠 Orange button pressed - opening Incident Report Dialog (categories + mic)');
                        setShowIncidentReportDialog(true);
                      }}
                      onOpenMenu={() => setShowComprehensiveMenu(true)}
                      isNavigating={isNavUIActive}
                      currentLocation={currentGPSLocation}
                      showMenuButton={false}
                      onVoiceIncidentReport={(type: IncidentType, severity: 'low' | 'medium' | 'high') => {
                        if (currentGPSLocation) {
                          const incidentLabels: Record<IncidentType, string> = {
                            'traffic_jam': 'Traffic Jam',
                            'accident': 'Accident',
                            'road_hazard': 'Road Hazard',
                            'road_closure': 'Road Closure',
                            'police': 'Police Activity',
                            'speed_camera': 'Speed Camera',
                            'construction': 'Construction',
                            'weather_hazard': 'Weather Hazard',
                          };
                          apiRequest('POST', '/api/traffic-incidents', {
                            type: type,
                            title: incidentLabels[type] || type,
                            severity,
                            coordinates: currentGPSLocation,
                          }).then(() => {
                            queryClient.invalidateQueries({ queryKey: ['/api/traffic-incidents'] });
                            toast({
                              title: 'Incident Reported',
                              description: `${incidentLabels[type] || type} reported via voice command.`,
                            });
                            console.log('[VOICE-REPORT] ✅ Incident reported via voice:', type, severity);
                          }).catch(err => {
                            console.error('[VOICE-REPORT] ❌ Failed to report incident:', err);
                            toast({
                              title: 'Report Failed',
                              description: 'Could not submit the incident report.',
                              variant: 'destructive',
                            });
                          });
                        } else {
                          toast({
                            title: 'Location Required',
                            description: 'GPS location is needed to report an incident.',
                            variant: 'destructive',
                          });
                        }
                      }}
                      isVisible={showNavControls}
                      onVoiceNavigationCommand={(command: NavigationCommandType) => {
                        console.log('[VOICE-NAV] Navigation command received:', command);
                        switch (command) {
                          case 'zoom_in':
                            mapRef.current?.zoomIn();
                            break;
                          case 'zoom_out':
                            mapRef.current?.zoomOut();
                            break;
                          case 'recenter':
                            mapRef.current?.zoomToUserLocation();
                            break;
                          case 'start_navigation':
                            if (currentRoute && !isNavUIActive) {
                              handleStartNavigation();
                            }
                            break;
                          case 'stop_navigation':
                            if (isNavUIActive) {
                              handleStopNavigation();
                            }
                            break;
                          case 'toggle_3d':
                            mapRef.current?.toggle3DMode();
                            setMapControlState(prev => ({ ...prev, is3DMode: mapRef.current?.is3DMode() || false }));
                            break;
                          case 'toggle_satellite':
                            mapRef.current?.toggleMapView();
                            setMapControlState(prev => ({ ...prev, isSatelliteView: mapRef.current?.getMapViewMode() === 'satellite' }));
                            break;
                          case 'mute':
                            navigationVoice.setEnabled(false);
                            toast({ title: 'Voice Muted', description: 'Voice guidance has been muted.' });
                            break;
                          case 'unmute':
                            navigationVoice.setEnabled(true);
                            toast({ title: 'Voice Unmuted', description: 'Voice guidance is now active.' });
                            break;
                          case 'show_overview':
                            if (currentRoute?.geometry?.coordinates) {
                              const map = mapRef.current?.getMap();
                              if (map) {
                                const rawCoords = currentRoute.geometry.coordinates as Array<[number, number]>;
                                // CRITICAL: Validate all coordinates before use
                                const coords = rawCoords.filter(coord => 
                                  Array.isArray(coord) && coord.length >= 2 &&
                                  typeof coord[0] === 'number' && !isNaN(coord[0]) && isFinite(coord[0]) &&
                                  typeof coord[1] === 'number' && !isNaN(coord[1]) && isFinite(coord[1])
                                );
                                if (coords.length >= 2) {
                                  let minLng = coords[0][0], maxLng = coords[0][0];
                                  let minLat = coords[0][1], maxLat = coords[0][1];
                                  coords.forEach(([lng, lat]) => {
                                    if (lng < minLng) minLng = lng;
                                    if (lng > maxLng) maxLng = lng;
                                    if (lat < minLat) minLat = lat;
                                    if (lat > maxLat) maxLat = lat;
                                  });
                                  try {
                                    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50 });
                                  } catch (e) {
                                    console.warn('[VOICE-CMD] Failed to fit bounds:', e);
                                  }
                                }
                              }
                            }
                            break;
                          case 'next_turn':
                            if (isNavUIActive && currentRoute) {
                              const message = 'Continue on current route';
                              navigationVoice.speak(message, 'normal');
                              toast({ 
                                title: 'Next Turn', 
                                description: message 
                              });
                            } else {
                              toast({ 
                                title: 'No Navigation Active', 
                                description: 'Start navigation to hear upcoming turns.' 
                              });
                            }
                            break;
                          case 'repeat_instruction':
                            if (isNavUIActive) {
                              const message = 'Continue following the current route';
                              navigationVoice.speak(message, 'normal');
                              toast({ 
                                title: 'Instruction Repeated', 
                                description: message 
                              });
                            } else {
                              toast({ 
                                title: 'No Navigation Active', 
                                description: 'Start navigation to hear instructions.' 
                              });
                            }
                            break;
                          case 'find_fuel':
                          case 'find_parking':
                          case 'find_rest_area':
                            setShowComprehensiveMenu(true);
                            toast({ 
                              title: 'Opening Menu', 
                              description: 'Use the menu to search for nearby facilities.' 
                            });
                            break;
                          default:
                            console.log('[VOICE-NAV] Unhandled command:', command);
                        }
                      }}
                    />
                  }
                  topLeftStack={
                    /* Only show map controls in entry/plan mode - hide during navigation */
                    !isNavUIActive ? (
                    <>
                      {/* Compass Button - Reset bearing and recenter north */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          mapRef.current?.resetBearing();
                          mapRef.current?.zoomToUserLocation({ bearing: 0, pitch: 0 });
                        }}
                        className="h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 text-black border-2 border-blue-500 shadow-lg"
                        data-testid="button-compass-mobile"
                        aria-label="Reset compass bearing"
                      >
                        <Compass 
                          className="h-5 w-5 transition-transform duration-300"
                          style={{ transform: `rotate(${mapControlState.bearing}deg)` }}
                        />
                      </Button>
                      
                      {/* 3D Toggle Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          mapRef.current?.toggle3DMode();
                          setMapControlState(prev => ({ ...prev, is3DMode: mapRef.current?.is3DMode() || false }));
                        }}
                        className={cn(
                          "h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 text-black border-2 shadow-lg",
                          mapControlState.is3DMode ? "border-blue-500" : "border-gray-400"
                        )}
                        data-testid="button-3d-mobile"
                        aria-label="Toggle 3D mode"
                      >
                        <Box className="h-5 w-5" />
                      </Button>
                      
                    </>
                    ) : null
                  }
                  topRightStack={null}
                  rightStack={
                    <RightActionStack
                      onZoomIn={() => mapRef.current?.zoomIn()}
                      onZoomOut={() => mapRef.current?.zoomOut()}
                      onStaggeredZoomIn={() => mapRef.current?.staggeredZoomIn()}
                      onStaggeredZoomOut={() => mapRef.current?.staggeredZoomOut()}
                      onRecenter={() => mapRef.current?.zoomToUserLocation()}
                      onToggleMapView={() => {
                        console.log('[MAP-VIEW-TOGGLE] Button pressed, calling toggleMapView');
                        mapRef.current?.toggleMapView();
                        setMapControlState(prev => {
                          const newSatelliteState = !prev.isSatelliteView;
                          console.log('[MAP-VIEW-TOGGLE] Toggling satellite view to:', newSatelliteState);
                          return { ...prev, isSatelliteView: newSatelliteState };
                        });
                      }}
                      onToggleTraffic={() => {
                        console.log('[TRAFFIC-TOGGLE] 🟠 Traffic button pressed in NAVIGATION mode - toggling from:', showTrafficLayer);
                        setShowTrafficLayer(prev => !prev);
                      }}
                      onViewIncidents={() => {
                        console.log('[INCIDENTS-BTN] 🔴 Incidents button pressed - opening Live Traffic Panel (view tab)');
                        setLiveTrafficPanelTab('view');
                        setShowLiveTrafficPanel(true);
                      }}
                      showTraffic={showTrafficLayer}
                      isSatelliteView={mapControlState.isSatelliteView}
                      isVisible={showNavControls}
                      hideIncidents={false}
                      hideCompass={true}
                      hide3D={false}
                      onToggle3D={() => {
                        mapRef.current?.toggle3DMode();
                        setMapControlState(prev => ({ ...prev, is3DMode: mapRef.current?.is3DMode() || false }));
                      }}
                      is3DMode={mapControlState.is3DMode}
                      isNavigating={true}
                      compact={true}
                      bearing={mapControlState.bearing}
                    />
                  }
                  infoBoxes={
                    currentRoute ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-lg">
                          <RouteIcon className="w-4 h-4" />
                          <span className="font-bold text-sm">
                            {measurementSystem === 'imperial'
                              ? `${((dynamicDistanceRemaining > 0 ? dynamicDistanceRemaining : (currentRoute.distance || 0)) / 1609.344).toFixed(1)} mi`
                              : `${((dynamicDistanceRemaining > 0 ? dynamicDistanceRemaining : (currentRoute.distance || 0)) / 1000).toFixed(1)} km`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-1.5 rounded-lg shadow-lg">
                          <Clock className="w-4 h-4" />
                          <span className="font-bold text-sm">
                            {new Date(Date.now() + (currentRoute.duration || 0) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ) : null
                  }
                  bottomBar={
                    <SpeedometerHUD
                      currentSpeed={gpsData?.position?.speed || 0} // Speed in m/s (component converts internally)
                      speedLimit={currentSpeedLimit || undefined}
                      roadInfo={roadInfo}
                      isNavigating={isNavigating}
                      showGoButton={true}
                      showStopButton={true}
                      onStartNavigation={handleStartNavigation}
                      onStopNavigation={handleStopNavigation}
                    />
                  }
                />
                
                {/* iOS Safari Touch Capture Layer - Invisible overlay for Incidents and Traffic buttons */}
                {/* Bypasses iOS Safari's touch event blocking on fixed/transformed elements */}
                <IOSTouchCapture
                  onIncidentsClick={() => {
                    console.log('[IOS-TOUCH-CAPTURE] 🔴 Incidents callback triggered');
                    setLiveTrafficPanelTab('view');
                    setShowLiveTrafficPanel(true);
                  }}
                  onTrafficClick={() => {
                    console.log('[IOS-TOUCH-CAPTURE] 🟠 Traffic callback triggered');
                    setShowTrafficLayer(prev => !prev);
                  }}
                  isVisible={showNavControls}
                  compact={true}
                />
                </>
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
          "flex h-screen overflow-hidden pt-14",
          "automotive-layout desktop-sidebar"
        )}>
          
          {/* Desktop Hamburger Menu - Hidden during navigation mode and on mobile - positioned below header */}
          {!isSidebarOpen && !isNavigating && !isMobile && (
            <Button
              variant="default"
              size="icon"
              onClick={() => setSidebarState('open')}
              className="fixed top-[72px] left-4 z-40 hamburger-menu-button bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg h-10 w-10 p-1.5 hidden md:flex"
              data-testid="button-menu-desktop"
            >
              <Menu className="w-3.5 h-3.5" />
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
                    hideControls={false}
                    hideCompass={false}
                    onMapClick={handleMapClick}
                    onDoubleTap={() => {
                      console.log('[DOUBLE-TAP] Toggling nav controls visibility');
                      setShowNavControls(prev => !prev);
                    }}
                    isNavigating={isNavigating || isLocalNavActive}
                    showUserMarker={showUserMarker}
                    useStaticRoute={isNavigating || isLocalNavActive}
                    restrictionViolations={restrictionViolations}
                    onToggleTraffic={() => setShowTrafficLayer(prev => !prev)}
                    onViewIncidents={() => {
                      console.log('[INCIDENTS-BTN] 🔴 Incidents button pressed - opening Live Traffic Panel (view tab)');
                      setLiveTrafficPanelTab('view');
                      setShowLiveTrafficPanel(true);
                    }}
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
                
                      {/* NAVIGATE MODE OVERLAYS - Desktop ONLY when ACTIVELY NAVIGATING */}
                      {/* CRITICAL: Use isNavigating instead of isNavUIActive to prevent HUD showing during preview mode */}
                      {isNavigating && (
                  <>
                    {/* 3. Map Turn + Lane Indicator - Only show at 1000ft/500ft/100ft thresholds */}
                    {nextTurn && shouldShowTurnIndicator(nextTurn.distance, measurementSystem === 'imperial') && (
                      <MapTurnLaneIndicator
                        turnInfo={nextTurn}
                        unit={measurementSystem === 'imperial' ? 'mi' : 'km'}
                        laneInfo={currentRoute?.laneGuidance?.[0] ? {
                          lanes: currentRoute.laneGuidance[0].laneOptions?.map(l => ({
                            direction: l.direction as 'left' | 'right' | 'straight' | 'exit',
                            isRecommended: l.recommended || false
                          })) || []
                        } : null}
                        isVisible={true}
                      />
                    )}

                    {/* Route Mask - Solid white mask covering bottom area behind speedometer */}
                    <div 
                      className="fixed left-0 right-0 z-[160] pointer-events-none"
                      style={{
                        bottom: '0px',
                        height: 'calc(70px + var(--safe-area-bottom, 0px))',
                        background: 'white'
                      }}
                      data-testid="route-mask-bottom"
                    />
                    {/* Gradient fade above the solid mask for smoother transition */}
                    <div 
                      className="fixed left-0 right-0 z-[159] pointer-events-none"
                      style={{
                        bottom: 'calc(70px + var(--safe-area-bottom, 0px))',
                        height: '40px',
                        background: 'linear-gradient(to top, white 0%, rgba(255,255,255,0.8) 40%, rgba(255,255,255,0) 100%)'
                      }}
                      data-testid="route-mask-gradient"
                    />

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
                        showGoButton={true}
                        showStopButton={true}
                        onStartNavigation={handleStartNavigation}
                        onStopNavigation={handleStopNavigation}
                      />
                    </div>

                    {/* Cancel button removed - users use STOP button on speedometer */}

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
        onPreviewRoute={handlePreviewAlternativeRoute}
        isApplying={isApplyingRoute}
        selectedRouteId={selectedAlternativeRouteId || undefined}
      />

      
      {/* Settings Modal - rendered at page level to persist independently of sidebar state */}
      {/* CRITICAL: Conditional wrapper for iOS Safari overlay fix */}
      {showVehicleSettings && (
        <SettingsModal
          open={showVehicleSettings}
          onOpenChange={setShowVehicleSettings}
          onCloseSidebar={isSidebarOpen ? () => setSidebarState('collapsed') : undefined}
        />
      )}


      {/* Lane Guidance Popup - Can be triggered manually or during navigation */}
      <LaneGuidancePopup
        currentRoute={currentRoute}
        isNavigating={isNavigating}
        forceVisible={showLaneGuidance}
      />

      {/* Incident Report Dialog - CRITICAL: Conditional wrapper for iOS Safari overlay fix */}
      {showIncidentReportDialog && (
        <IncidentReportDialog
          open={showIncidentReportDialog}
          onOpenChange={setShowIncidentReportDialog}
          currentLocation={currentGPSLocation}
        />
      )}

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

      {/* Live Traffic Panel - Unified view/report panel (switchable tabs) */}
      <LiveTrafficPanel
        open={showLiveTrafficPanel}
        onClose={() => setShowLiveTrafficPanel(false)}
        currentLocation={currentGPSLocation}
        defaultTab={liveTrafficPanelTab}
      />

      {/* Comprehensive Mobile Menu - Uses internal early return for iOS Safari fix */}
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
        resetTrigger={menuResetTrigger}
        onRequestAutoNavigation={() => {
          console.log('[GO-BUTTON] Mobile GO pressed - showing route ready state with Preview/Start buttons');
          setShouldAutoNavigateOnMobile(true);
          // Show navigation controls immediately
          setShowNavControls(true);
          // Show Preview mode so user can choose Preview (flyby) or Start (navigation)
          // DON'T set isLocalNavActive yet - let user choose to start navigation
          setIsShowingPreview(true);
          localStorage.setItem('navigation_mode', 'route_ready');
          localStorage.setItem('navigation_timestamp', Date.now().toString());
        }}
        selectedProfile={selectedProfile}
        onProfileSelect={(profile) => {
          setSelectedProfile(profile);
          setActiveProfile(profile);
          queryClient.invalidateQueries({ queryKey: ["/api/vehicle-profiles"] });
        }}
        vehicleType={vehicleType}
        onVehicleTypeChange={(type) => {
          console.log('[PROFILE-SWITCH] Vehicle type changed to:', type);
          setVehicleType(type);
        }}
        isCarProfileMode={isCarProfileMode}
        onCarProfileModeChange={(isCarMode) => {
          console.log('[PROFILE-SWITCH] Car profile mode changed to:', isCarMode);
          setIsCarProfileMode(isCarMode);
        }}
        coordinates={currentGPSLocation}
        hideTabsInInputMode={false}
      />

      {/* Quick Settings Panel - Green gear button opens this */}
      {/* CRITICAL: Conditional wrapper for iOS Safari overlay fix */}
      {showQuickSettings && (
        <QuickSettingsPanel
          open={showQuickSettings}
          onOpenChange={setShowQuickSettings}
          selectedProfile={selectedProfile}
          onProfileSelect={(profile) => {
            setSelectedProfile(profile);
            setActiveProfile(profile);
            queryClient.invalidateQueries({ queryKey: ["/api/vehicle-profiles"] });
          }}
        />
      )}

      {/* Destination Reached Dialog - Early return pattern to unmount when closed (iOS Safari overlay fix) */}
      {showDestinationReached && (
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
                localStorage.removeItem('navigation_ui_active');
                localStorage.removeItem('navigation_mode');
                localStorage.removeItem('navigation_timestamp');
                localStorage.removeItem('activeRouteId');
                
                // Clear URL parameter
                const url = new URL(window.location.href);
                if (url.searchParams.has('journey')) {
                  url.searchParams.delete('journey');
                  window.history.replaceState({}, '', url.pathname);
                }
                
                // CRITICAL: Clear ALL navigation state for fresh start
                setIsLocalNavActive(false);
                setIsShowingPreview(false);
                setShouldAutoNavigateOnMobile(false); // Reset auto-navigate flag
                setCurrentRoute(null);
                setPreviewRoute(null);
                setFromLocation('');
                setToLocation('');
                setFromCoordinates(null);
                setToCoordinates(null);
                setIsMapExpanded(false);
                hasShownDestinationDialogRef.current = false;
                setShowDestinationReached(false);
                setSidebarState(isMobile ? 'collapsed' : 'open');
                
                // AUTO-RESET CAR MODE: If user was using Car mode, reset to Class 1 Lorry
                if (isCarProfileMode) {
                  console.log('[ROUTE-COMPLETE] 🔄 Resetting Car mode back to Class 1 Lorry');
                  setIsCarProfileMode(false);
                }
                
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
      )}

      {/* Manual Location Dialog - Early return pattern to unmount when closed (iOS Safari overlay fix) */}
      {showManualLocationDialog && (
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
      )}

      {/* Weather Tool - Component has its own modal */}
      <WeatherWidget 
        isOpen={showWeatherTool} 
        onClose={() => setShowWeatherTool(false)} 
      />

      {/* Entertainment Tool - Component has its own modal */}
      <EntertainmentPanel 
        isOpen={showEntertainmentTool} 
        onClose={() => setShowEntertainmentTool(false)} 
      />

      {/* Voice Navigation Tool Dialog - Conditional render for iOS Safari overlay fix */}
      {showVoiceNavTool && (
      <Dialog open={showVoiceNavTool} onOpenChange={setShowVoiceNavTool}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto bg-white text-gray-900 top-[70%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Voice Navigation</DialogTitle>
          </DialogHeader>
          <div className="bg-white">
            <VoiceNavigationPanel />
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Fuel Prices Tool Dialog - Conditional render for iOS Safari overlay fix */}
      {showFuelPricesTool && (
      <Dialog open={showFuelPricesTool} onOpenChange={setShowFuelPricesTool}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto bg-white text-gray-900 top-[70%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Fuel Price Comparison</DialogTitle>
          </DialogHeader>
          <div className="bg-white">
            <FuelPriceComparison />
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Driver Fatigue Monitor Tool Dialog - Conditional render for iOS Safari overlay fix */}
      {showFatigueMonitorTool && (
      <Dialog open={showFatigueMonitorTool} onOpenChange={setShowFatigueMonitorTool}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto bg-white text-gray-900 top-[70%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Driver Fatigue Monitor</DialogTitle>
          </DialogHeader>
          <div className="bg-white">
            <DriverFatigueAlert />
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Region Settings Tool Dialog - Conditional render for iOS Safari overlay fix */}
      {showRegionSettingsTool && (
      <Dialog open={showRegionSettingsTool} onOpenChange={setShowRegionSettingsTool}>
        <DialogContent className="sm:max-w-md bg-white text-gray-900 top-[70%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Region & Speed Limit Sign</DialogTitle>
            <DialogDescription className="text-gray-600">
              Select your region to use local speed limit signs and units
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 bg-white">
            <RegionSelector />
            <MeasurementSelector />
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Language Tool Dialog - Conditional render for iOS Safari overlay fix */}
      {showLanguageTool && (
      <Dialog open={showLanguageTool} onOpenChange={setShowLanguageTool}>
        <DialogContent className="sm:max-w-md bg-white text-gray-900 top-[70%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Language / Idioma / Sprache</DialogTitle>
            <DialogDescription className="text-gray-600">
              Change app and voice navigation language
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 bg-white">
            <LanguageSelector />
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Map Settings Tool - Opens the main settings modal */}
      {showMapSettingsTool && (
        <SettingsModal
          open={showMapSettingsTool}
          onOpenChange={setShowMapSettingsTool}
        />
      )}

    </div>
  );
}

// Main NavigationPage wrapper - checks consent BEFORE starting GPS
export default function NavigationPage() {
  const { hasAcceptedTerms, setConsentAccepted, isLoading } = useLegalConsent();
  
  // Navigation epoch key - increment to force complete remount of NavigationPageContent
  // This provides a clean "fresh start" state identical to first load after T&C accept
  const [navigationEpoch, setNavigationEpoch] = useState(0);

  const handleAccept = useCallback(async () => {
    await setConsentAccepted();
  }, [setConsentAccepted]);
  
  // Listen for navigation reset events (triggered by stop button or destination reached)
  useEffect(() => {
    const handleNavigationReset = (event: CustomEvent) => {
      console.log('[NAV-RESET] 🔄 Full navigation reset triggered - reloading page for fresh state', event.detail);
      
      // Clear all navigation-related localStorage keys
      const keysToRemove = [
        'navigation_ui_active',
        'navigation_mode', 
        'navigation_timestamp',
        'activeRouteId',
        'activeJourneyId',
        'navigationSidebarState',
        'shouldShowHUD',
        'mobileNavMode',
        'isLocalNavActive',
        'last_navigation_state'
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // CRITICAL FIX: Full page reload to get identical state as after T&C acceptance
      // This ensures all React state, DOM, and iOS Safari portals are completely reset
      // The epoch-based remount was not sufficient to fix iOS Safari dialog issues
      window.location.reload();
    };
    
    window.addEventListener('navigation:fullReset', handleNavigationReset as EventListener);
    return () => {
      window.removeEventListener('navigation:fullReset', handleNavigationReset as EventListener);
    };
  }, []);

  // Wait for consent state to load before deciding what to show
  // This prevents flashing Legal Disclaimer in PWA mode when consent is already stored
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show legal disclaimer BEFORE GPS starts - prevents permission popup during consent
  if (!hasAcceptedTerms) {
    return <LegalDisclaimerSimple onAccept={handleAccept} />;
  }

  // Only start GPS AFTER consent is accepted
  // Key prop forces complete remount when epoch changes, giving fresh initial state
  return (
    <GPSProvider
      enableHighAccuracy={true}
      timeout={5000}
      maximumAge={0}
      headingSmoothingAlpha={0.25}
      enableHeadingSmoothing={true}
    >
      <OnboardingProvider isReady={true} isFleetPage={false}>
        <NavigationPageContent key={`nav-epoch-${navigationEpoch}`} />
      </OnboardingProvider>
    </GPSProvider>
  );
}
