import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Truck, X, Menu, MapPin, Settings, Search, Camera, Navigation, Car, AlertCircle, Compass, Box, Plus, Minus, Layers } from "lucide-react";
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
import { IncidentReportDialog } from "@/components/incidents/incident-report-dialog";
import { IncidentFeed } from "@/components/incidents/incident-feed";
import IncidentFeedPopup from "@/components/incidents/incident-feed-popup";

export default function NavigationPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { mapEngine, toggleMapEngine, isMapLibre } = useMapEngine();
  
  // Use centralized vehicle profile management
  const { activeProfile, activeProfileId, isLoading: profileLoading, setActiveProfile } = useActiveVehicleProfile();
  const [selectedProfile, setSelectedProfile] = useState<VehicleProfile | null>(activeProfile);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
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
  const [showLegalPopup, setShowLegalPopup] = useState(false);
  
  // AR Navigation state
  const [isARMode, setIsARMode] = useState(false);
  const [arSupported, setARSupported] = useState(false);
  
  // Settings modal state - moved from NavigationSidebar to prevent closure with sidebar/drawer
  const [showVehicleSettings, setShowVehicleSettings] = useState(false);
  
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
  const [currentGPSLocation, setCurrentGPSLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [professionalVoiceEnabled, setProfessionalVoiceEnabled] = useState(true);
  const [isFullscreenNav, setIsFullscreenNav] = useState(false);
  
  // Mobile navigation mode state - clean 3-mode workflow
  type MobileNavMode = 'plan' | 'preview' | 'navigate';
  const [mobileNavMode, setMobileNavMode] = useState<MobileNavMode>('plan');
  
  // Map reference for compass and 3D tilt control
  const mapRef = useRef<MapLibreMapRef>(null);
  const [mapBearing, setMapBearing] = useState(0);
  const [map3DMode, setMap3DMode] = useState(false);
  const [mapViewMode, setMapViewMode] = useState<'roads' | 'satellite'>('roads');

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
  
  // Auto-update mobile navigation mode based on state
  useEffect(() => {
    if (!isMobile) return; // Only applies to mobile
    
    if (isNavigating) {
      setMobileNavMode('navigate');
    } else if (currentRoute) {
      setMobileNavMode('preview');
    } else {
      setMobileNavMode('plan');
    }
  }, [isMobile, isNavigating, currentRoute]);
  
  // Track bearing from map for compass rotation
  useEffect(() => {
    const interval = setInterval(() => {
      if (mapRef.current) {
        const bearing = mapRef.current.getBearing();
        setMapBearing(bearing);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle AR mode toggle
  const handleToggleAR = useCallback(() => {
    
    if (!arSupported) {
      toast({
        title: "AR Not Supported",
        description: "Your device doesn't support AR navigation features.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isNavigating) {
      toast({
        title: "Start Navigation First",
        description: "Please start navigation before enabling AR mode.",
        variant: "destructive",
      });
      return;
    }
    
    setIsARMode(!isARMode);
    
    if (!isARMode) {
      toast({
        title: "AR Mode Activated",
        description: "Camera will start and directions will overlay on live feed.",
      });
    } else {
      toast({
        title: "AR Mode Deactivated",
        description: "Returning to map navigation.",
      });
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
      setActiveJourney(currentJourney);
      if (currentJourney.status === 'active') {
        setIsNavigating(true);
      }
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
    if (showLegalPopup) {
      setShowLegalPopup(false);
      console.log('🔙 Android back: Closed legal popup');
      return true;
    }
    
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
      toast({
        title: "AR Mode Disabled",
        description: "Returning to normal navigation view",
      });
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
      toast({
        title: "Navigation Active",
        description: "Please stop navigation before going back. Safety first!",
        variant: "destructive",
      });
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
      // Show user-friendly error message
      toast({
          title: "Failed to start navigation",
          description: "Unable to activate journey. Please try again.",
          variant: "destructive",
        });
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
      toast({
          title: "Failed to start journey",
          description: "Unable to create new journey. Please try again.",
          variant: "destructive",
        });
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
      setMobileNavMode('plan');
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
      toast({
          title: "Failed to stop navigation",
          description: "Unable to complete journey. Please try again.",
          variant: "destructive",
        });
    },
  });

  // Route calculation mutation
  const calculateRouteMutation = useMutation({
    mutationFn: async (routeData: { startLocation: string; endLocation: string; vehicleProfileId?: string; routePreference?: string }) => {
      const response = await apiRequest("POST", "/api/routes/calculate", routeData);
      const result = await response.json();
      return result;
    },
    onSuccess: (route) => {
      // Trigger live notification for new route
      if (route && route !== currentRoute) {
        triggerLiveNotification('route_change');
      }
      
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
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error('Failed to calculate route:', error);
      }
      // Clear any existing route on error
      setCurrentRoute(null);
      // Comprehensive UI recovery on route calculation failure
      recoverUIOnError();
      // Show user-friendly error message
      toast({
          title: "Route calculation failed",
          description: "Unable to calculate route. Please check your locations and try again.",
          variant: "destructive",
        });
    },
  });

  // Validate UUID format
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const handlePlanRoute = (routePreference?: 'fastest' | 'eco' | 'avoid_tolls', startLoc?: string, endLoc?: string) => {
    // Guard against duplicate requests while calculating
    if (calculateRouteMutation.isPending) {
      return;
    }
    
    // Ensure we have a valid vehicle profile ID before planning route
    if (!activeProfileId || activeProfileId.trim().length === 0) {
      toast({
        title: "Vehicle profile required",
        description: "Please select a valid vehicle profile before planning a route.",
        variant: "destructive",
      });
      return;
    }

    // Check for required locations
    const finalStartLoc = startLoc || fromLocation;
    const finalEndLoc = endLoc || toLocation;
    
    if (!finalStartLoc || !finalEndLoc) {
      toast({
        title: "Locations required",
        description: "Please enter both start and destination locations before planning a route.",
        variant: "destructive",
      });
      return;
    }

    const routeData = {
      startLocation: finalStartLoc,
      endLocation: finalEndLoc,
      vehicleProfileId: activeProfileId,
      routePreference: routePreference || 'fastest',
    };

    calculateRouteMutation.mutate(routeData);
  };

  // Alternative routes preview handlers
  const handlePreviewRoute = (route: AlternativeRoute) => {
    setPreviewRoute(route);
    toast({
      title: "Previewing alternative route",
      description: `Showing ${route.reasonForSuggestion?.replace(/_/g, ' ') || 'alternative route'} on map`,
    });
  };

  const handleSelectRoute = async (route: AlternativeRoute) => {
    setSelectedAlternativeRouteId(route.id);
    setIsApplyingRoute(true);
    
    try {
      // Ensure we have a valid vehicle profile before applying alternative route
      if (!activeProfile?.id) {
        toast({
          title: "Vehicle profile required",
          description: "Please select a vehicle profile before applying alternative routes.",
          variant: "destructive",
        });
        return;
      }

      // Apply the alternative route
      // Ensure we have a valid vehicle profile ID
      if (!activeProfileId || activeProfileId.trim().length === 0) {
        toast({
          title: "Vehicle profile required",
          description: "Please select a valid vehicle profile before applying routes.",
          variant: "destructive",
        });
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
      
      toast({
        title: "Route updated",
        description: `Now using ${route.reasonForSuggestion?.replace(/_/g, ' ') || 'alternative route'}`,
      });
      
      // Update window sync
      windowSync.updateRoute(newRoute);
      
    } catch (error) {
      console.error('Failed to apply alternative route:', error);
      // Comprehensive UI recovery on alternative route application failure
      recoverUIOnError();
      toast({
        title: "Failed to apply route",
        description: "Unable to switch to alternative route. Please try again.",
        variant: "destructive",
      });
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
  useEffect(() => {
    // Clear any existing timeout
    const timeoutId = setTimeout(() => {
      // Only auto-plan if we have both locations (min 5 chars each for complete postcodes) and no current route
      if (fromLocation && fromLocation.length >= 5 && toLocation && toLocation.length >= 5 && !currentRoute && !calculateRouteMutation.isPending && activeProfileId) {
        handlePlanRoute(routePreference);
      }
    }, 3000); // 3-second delay

    // Cleanup: clear timeout if user continues typing
    return () => clearTimeout(timeoutId);
  }, [fromLocation, toLocation, routePreference, activeProfileId, currentRoute, calculateRouteMutation.isPending]);

  // Effect to automatically show alternative routes when they become available
  useEffect(() => {
    if (alternatives.length > 0 && shouldReroute && timeSavingsAvailable && timeSavingsAvailable > 5) {
      // Auto-open alternatives panel if significant time savings are available
      setIsAlternativeRoutesOpen(true);
      
      // Trigger notification about available alternatives
      triggerLiveNotification('route_change');
      
      toast({
        title: "Better routes found",
        description: `Up to ${timeSavingsAvailable} minutes faster routes available`,
      });
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
    
    if (activeJourney?.id && (activeJourney.status === 'active' || activeJourney.status === 'planned')) {
      completeJourneyMutation.mutate(activeJourney.id);
      toast({
        title: "Navigation cancelled",
        description: "Route has been cancelled successfully",
      });
    }
  };

  // Generate secure idempotency keys (no session ID leakage)
  const generateIdempotencyKey = (action: string, params?: string) => {
    // Use crypto.randomUUID() for secure, opaque idempotency keys
    return crypto.randomUUID();
  };

  // Production-grade robust navigation flow
  const handleStartNavigation = async () => {
    // Comprehensive validation
    if (!fromLocation || !toLocation) {
      toast({
        title: "Missing locations",
        description: "Please enter both start and destination locations.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedProfile) {
      toast({
        title: "Vehicle profile required",
        description: "Please select a vehicle profile before starting navigation.",
        variant: "destructive"
      });
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
      setShowLegalPopup(false);
      
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
      
      // Update navigation state after successful activation
      setIsNavigating(true);
      
      if (route.id) {
        localStorage.setItem('activeRouteId', route.id.toString());
      }

      // Automatically enable street view in navigation mode when navigation starts
      const streetViewActivationEvent = new CustomEvent('activate_street_view_navigation', {
        detail: { route: route, profile: selectedProfile }
      });
      window.dispatchEvent(streetViewActivationEvent);

      setTimeout(() => {
        setIsMapExpanded(true);
      }, 300);

      // Dispatch navigation started event for notification system
      const navigationStartedEvent = new CustomEvent('navigation:started', {
        detail: { route: currentRoute, profile: selectedProfile }
      });
      window.dispatchEvent(navigationStartedEvent);

      toast({
        title: "Navigation started",
        description: "Route guidance is now active.",
      });

    } catch (error) {
      console.error('Navigation start failed:', error);
      recoverUIOnError();
      
      toast({
        title: "Navigation failed",
        description: "Unable to start navigation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleStopNavigation = () => {
    if (activeJourney && (activeJourney.status === 'active' || activeJourney.status === 'planned')) {
      completeJourneyMutation.mutate(activeJourney.id);
    }
    
    // Comprehensive state reset - completely cancel navigation
    setCurrentRoute(null);
    setPreviewRoute(null);
    setActiveJourney(null);
    setIsNavigating(false);
    setMobileNavMode('plan');
    
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
    
    toast({
      title: "Navigation stopped",
      description: "Route has been cleared successfully",
    });
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
    toast({
      title: "Facility selected",
      description: `Set destination to ${facility.name}`,
    });
  };

  // Handle navigation to location - for left sidebar
  const handleNavigateToLocation = (location: string) => {
    setToLocation(location);
    toast({
      title: "Destination set",
      description: `Navigating to: ${location}`,
    });
  };

  // Get current coordinates for search (fallback to London if not available)
  const currentCoordinates = { lat: 51.5074, lng: -0.1278 };
  
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

  return (
    <div className="min-h-[100svh] flex flex-col" style={{background: "transparent"}}>

      {/* Legal Disclaimer Popup */}
      {showLegalPopup && (
        <LegalDisclaimerPopup 
          onClose={() => {
            setShowLegalPopup(false);
          }}
        />
      )}
      {/* Mobile-First Layout - Clean 3-Mode Workflow */}
      {isMobile ? (
        <div className="mobile-layout h-[100svh] flex flex-col relative">
          
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
                      hideCompass={isMobile && mobileNavMode === 'navigate'}
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

              {/* PLAN MODE OVERLAYS (z-10+) */}
              {mobileNavMode === 'plan' && (
                <>
                  {/* Header - Thinner Overlay on top */}
                  <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between py-1 px-4 border-b bg-white">
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

                  {/* Start Navigation Button - Shows when route exists */}
                  {currentRoute && (
                    <div className="absolute bottom-6 left-6 right-6 z-20 mobile-safe-bottom pointer-events-auto">
                      <Button
                        onClick={handleStartNavigation}
                        disabled={startJourneyMutation.isPending}
                        className={cn(
                          "w-full h-14 text-lg font-semibold transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-lg",
                          currentRoute && selectedProfile && "ring-4 ring-blue-400/50 shadow-xl shadow-blue-500/50 animate-pulse"
                        )}
                        data-testid="button-start-navigation-plan"
                      >
                        <Navigation className="w-6 h-6 mr-3" />
                        Start Navigation
                      </Button>
                    </div>
                  )}

                  {/* Plan Route FAB - Only shows when no route */}
                  {!currentRoute && (
                    <div className="absolute bottom-6 right-6 z-20 mobile-safe-bottom pointer-events-auto">
                      <Button
                        onClick={() => setSidebarState('open')}
                        size="lg"
                        className="h-14 w-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 backdrop-blur-sm"
                        data-testid="button-plan-route-fab"
                        aria-label="Open route planner"
                      >
                        <Menu className="w-6 h-6" />
                      </Button>
                    </div>
                  )}

                  {/* Legal Ownership */}
                  <div className="absolute bottom-0 left-0 right-0 z-10">
                    <MapLegalOwnership compact={true} className="sm:hidden" />
                  </div>
                </>
              )}

              {/* PREVIEW MODE OVERLAYS (z-10+) */}
              {mobileNavMode === 'preview' && currentRoute && (
                <>
                  {/* FAB for secondary controls */}
                  <MobileFAB
                    mode="preview"
                    onSettingsClick={() => setShowVehicleSettings(true)}
                    onClearRoute={() => {
                      setCurrentRoute(null);
                      setMobileNavMode('plan');
                    }}
                    onMenuClick={() => setIsAlternativeRoutesOpen(!isAlternativeRoutesOpen)}
                    onReportIncident={() => setShowIncidentReportDialog(true)}
                    className="absolute bottom-24 right-6 z-20 mobile-safe-bottom"
                  />

                  {/* Settings Button - Top Right */}
                  <div className="absolute top-4 right-4 z-20 pointer-events-auto">
                    <Button
                      size="icon"
                      onClick={() => setShowVehicleSettings(true)}
                      className="h-12 w-12 shadow-lg bg-white hover:bg-white/90 text-gray-700 border border-slate-200"
                      data-testid="button-settings-preview"
                      aria-label="Vehicle Settings"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Route Summary Card + Start CTA - Bottom Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-4 border-t bg-background mobile-safe-bottom">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-2xl font-bold text-primary">
                          {(currentRoute.distance || 0).toFixed(1)} mi
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(currentRoute.duration || 0)} minutes
                        </div>
                      </div>
                      {selectedProfile && (
                        <div className="text-right text-sm text-muted-foreground">
                          <div>{selectedProfile.name}</div>
                          <div>{selectedProfile.height}ft H × {selectedProfile.width}ft W</div>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleStartNavigation}
                      disabled={startJourneyMutation.isPending}
                      className={cn(
                        "h-16 text-lg font-semibold transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-lg mr-20",
                        currentRoute && selectedProfile && "ring-4 ring-blue-400/50 shadow-xl shadow-blue-500/50 animate-pulse"
                      )}
                      data-testid="button-start-navigation-preview"
                    >
                      <Navigation className="w-6 h-6 mr-3" />
                      Start Navigation
                    </Button>
                  </div>

                  {/* Legal Ownership */}
                  <div className="absolute bottom-0 left-0 right-0 z-[5]">
                    <MapLegalOwnership compact={true} className="sm:hidden" />
                  </div>
                </>
              )}

              {/* NAVIGATE MODE OVERLAYS (z-10+) */}
              {mobileNavMode === 'navigate' && (
                <>
                  {/* Compact Trip Strip - Top Overlay with border */}
                  {currentRoute && (
                    <div className="absolute top-0 left-0 right-0 z-10 border-b-2 border-primary/20">
                      <CompactTripStrip
                        eta={Math.round(currentRoute.duration || 0)}
                        distanceRemaining={currentRoute.distance || 0}
                        nextManeuver="Turn Right"
                        nextDistance={0.8}
                      />
                    </div>
                  )}

                  {/* Map Control Buttons - Right side vertical stack */}
                  <div className="absolute bottom-12 right-4 z-[70] flex flex-col gap-2 pointer-events-auto">
                    <Button
                      size="icon"
                      onClick={() => mapRef.current?.zoomIn()}
                      className="h-8 w-8 shadow-lg bg-white hover:bg-white/90 text-gray-700 border border-slate-200 pointer-events-auto"
                      data-testid="button-zoom-in-navigate"
                      aria-label="Zoom in"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => mapRef.current?.zoomOut()}
                      className="h-8 w-8 shadow-lg bg-white hover:bg-white/90 text-gray-700 border border-slate-200 pointer-events-auto"
                      data-testid="button-zoom-out-navigate"
                      aria-label="Zoom out"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => {
                        mapRef.current?.toggleMapView();
                        setMapViewMode(mapRef.current?.getMapViewMode() || 'roads');
                      }}
                      className={cn(
                        "h-8 w-8 shadow-lg pointer-events-auto transition-colors border border-slate-200",
                        mapViewMode === 'satellite'
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-white hover:bg-white/90 text-gray-700"
                      )}
                      data-testid="button-toggle-satellite-navigate"
                      aria-label={mapViewMode === 'satellite' ? "Switch to roads view" : "Switch to satellite view"}
                    >
                      <Layers className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => mapRef.current?.resetBearing()}
                      className="h-8 w-8 shadow-lg bg-white hover:bg-white/90 text-gray-700 border border-slate-200 pointer-events-auto transition-all duration-300"
                      data-testid="button-compass-reset"
                      aria-label="Reset bearing to North"
                    >
                      <Compass 
                        className="h-3.5 w-3.5 transition-transform duration-300" 
                        style={{ transform: `rotate(${mapBearing}deg)` }}
                      />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => {
                        mapRef.current?.toggle3DMode();
                        setMap3DMode(!map3DMode);
                      }}
                      className={cn(
                        "h-8 w-8 shadow-lg pointer-events-auto transition-colors border border-slate-200",
                        map3DMode 
                          ? "bg-blue-500 text-white hover:bg-blue-600" 
                          : "bg-white hover:bg-white/90 text-gray-700"
                      )}
                      data-testid="button-toggle-3d-navigate"
                      aria-label={map3DMode ? "Switch to 2D view" : "Switch to 3D view"}
                    >
                      <Box className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => setShowTrafficLayer(!showTrafficLayer)}
                      className={cn(
                        "h-8 w-8 shadow-lg bg-white hover:bg-white/90 text-gray-700 border border-slate-200 pointer-events-auto",
                        showTrafficLayer && "ring-2 ring-primary"
                      )}
                      data-testid="button-toggle-traffic-mobile"
                      aria-label="Toggle traffic layer"
                    >
                      <Car className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => setShowIncidents(!showIncidents)}
                      className={cn(
                        "h-8 w-8 shadow-lg bg-white hover:bg-white/90 text-gray-700 border border-slate-200 pointer-events-auto",
                        showIncidents && "ring-2 ring-primary"
                      )}
                      data-testid="button-toggle-incidents-mobile"
                      aria-label="Toggle incidents layer"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Stop Button - Bottom Left Corner */}
                  <div className="absolute bottom-4 left-4 z-[100] mobile-safe-bottom pointer-events-auto">
                    <Button
                      onClick={handleStopNavigation}
                      disabled={completeJourneyMutation.isPending}
                      variant="destructive"
                      className="h-10 px-5 shadow-lg text-sm font-semibold pointer-events-auto bg-destructive hover:bg-destructive/90"
                      data-testid="button-stop-navigation"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Stop
                    </Button>
                  </div>

                  {/* FAB for secondary controls - Bottom Right */}
                  <MobileFAB
                    mode="navigate"
                    onSettingsClick={() => setShowVehicleSettings(true)}
                    onClearRoute={handleStopNavigation}
                    onMenuClick={() => setIsAlternativeRoutesOpen(!isAlternativeRoutesOpen)}
                    onReportIncident={() => setShowIncidentReportDialog(true)}
                    onViewIncidents={() => setShowIncidentFeed(true)}
                    className="absolute bottom-6 right-6 z-[70] mobile-safe-bottom pointer-events-auto"
                  />

                  {/* Legal Ownership */}
                  <div className="absolute bottom-0 left-0 right-0 z-10">
                    <MapLegalOwnership compact={true} className="sm:hidden" />
                  </div>
                </>
              )}
            </>
          )}

          {/* Full-Screen Route Planning Panel - Mobile Only */}
          {isMobileDrawerOpen && (
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
                <div className="flex items-center justify-between p-4 border-b mobile-safe-top">
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
                    onFromLocationChange={setFromLocation}
                    onToLocationChange={setToLocation}
                    routePreference={routePreference}
                    onRoutePreferenceChange={setRoutePreference}
                    onUseCurrentLocation={() => setFromLocation('Current Location')}
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
          
          {/* Desktop Hamburger Menu - Always visible when sidebar is closed */}
          {!isSidebarOpen && (
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
                      hideCompass={isMobile && mobileNavMode === 'navigate'}
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
                      currentLocation={currentGPSLocation || undefined}
                      onLocationUpdate={setCurrentGPSLocation}
                      onMapClick={handleMapClick}
                      isMapExpanded={isMapExpanded}
                      sidebarState={sidebarState}
                    />
                  )}
                </MapShell>
                
                {/* Legal Ownership Section - Desktop */}
                <MapLegalOwnership compact={true} className="hidden sm:block" />
              </>
            )}
          </div>

        </div>
      )}

      {/* Professional Navigation HUD - Desktop only (mobile uses CompactTripStrip) */}
      {isNavigating && !isARMode && !isMobile && (
        <ProfessionalNavHUD
          currentRoute={currentRoute}
          selectedProfile={selectedProfile || activeProfile}
          isNavigating={isNavigating}
          currentSpeed={currentSpeed}
          currentLocation={currentGPSLocation || undefined}
          onToggleVoice={() => setProfessionalVoiceEnabled(!professionalVoiceEnabled)}
          onToggleFullscreen={() => setIsFullscreenNav(!isFullscreenNav)}
          onCancelRoute={handleCancelRoute}
          isCancellingRoute={completeJourneyMutation.isPending}
          voiceEnabled={professionalVoiceEnabled}
          isFullscreen={isFullscreenNav}
        />
      )}

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

      {/* Alternative Routes Panel */}
      <AlternativeRoutesPanel
        isOpen={isAlternativeRoutesOpen}
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

    </div>
  );
}
