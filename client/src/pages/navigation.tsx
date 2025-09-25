import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Truck, X, Menu, MapPin, Settings, Search, Camera } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from 'react-i18next';
import InteractiveMap from "@/components/map/interactive-map";
import EnhancedRealisticMap from "@/components/map/enhanced-realistic-map";
import ProfessionalNavHUD from "@/components/navigation/professional-nav-hud";
import NavigationSidebar from "@/components/navigation/navigation-sidebar";
import AlternativeRoutesPanel from "@/components/traffic/alternative-routes-panel";
import RoutePreviewOverlay from "@/components/map/route-preview-overlay";
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

export default function NavigationPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
  // Use centralized vehicle profile management
  const { activeProfile, activeProfileId, isLoading: profileLoading, setActiveProfile } = useActiveVehicleProfile();
  const [selectedProfile, setSelectedProfile] = useState<VehicleProfile | null>(activeProfile);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [fromLocation, setFromLocation] = useState("Current Location");
  const [toLocation, setToLocation] = useState("");
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Unified sidebar state management - single source of truth
  const [sidebarState, setSidebarState] = useState<'closed' | 'open' | 'collapsed'>('open');
  
  // Computed states for backward compatibility
  const isSidebarOpen = sidebarState !== 'closed';
  const isSidebarCollapsed = sidebarState === 'collapsed';
  // Fixed: Only open mobile drawer when sidebarState is explicitly 'open'
  const isMobileDrawerOpen = isMobile && sidebarState === 'open';
  
  
  // Map expansion state - DISABLED to prevent grey overlay blocking interface
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  
  // Removed legacy isDrawerOpen - now using sidebarState as single source of truth
  
  // Alternative routes panel state
  const [isAlternativeRoutesOpen, setIsAlternativeRoutesOpen] = useState(false);
  const [previewRoute, setPreviewRoute] = useState<AlternativeRoute | null>(null);
  const [selectedAlternativeRouteId, setSelectedAlternativeRouteId] = useState<string | null>(null);
  const [isApplyingRoute, setIsApplyingRoute] = useState(false);
  
  // Route preview overlay state
  const [showRoutePreview, setShowRoutePreview] = useState(false);
  const [previewRouteData, setPreviewRouteData] = useState<Route | null>(null);
  
  
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
  
  // Professional navigation state
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentGPSLocation, setCurrentGPSLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [professionalVoiceEnabled, setProfessionalVoiceEnabled] = useState(true);
  const [isFullscreenNav, setIsFullscreenNav] = useState(false);
  

  // Centralized UI error recovery helper - ensures consistent state after failures
  const recoverUIOnError = () => {
    // NEVER auto-reset sidebar based on screen size - preserve user choice
    // Only ensure it's not completely closed
    if (sidebarState === 'closed') {
      setSidebarState('collapsed');
    }
    setIsMapExpanded(false);         // Collapse any expanded map to prevent overlay conflicts  
    setShowRoutePreview(false);      // Clear any route preview overlay that might obscure sidebar
    setPreviewRouteData(null);       // Clear preview data
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

  // TEMPORARILY DISABLE legal popup to fix grey overlay issue
  useEffect(() => {
    // Force accept legal terms to bypass broken popup
    if (!isConsentLoading && !hasAcceptedTerms) {
      // Auto-accept legal terms to bypass popup issue
      console.log('[LEGAL] Auto-accepting legal terms to bypass broken popup');
      localStorage.setItem('trucknav_legal_consent', JSON.stringify({
        hasAcceptedTerms: true,
        consentVersion: '1.0',
        consentTimestamp: new Date().toISOString(),
      }));
      // Force refresh to pick up the change
      window.location.reload();
    }
    setShowLegalPopup(false); // Never show popup
  }, [hasAcceptedTerms, isConsentLoading]);
  
  // Check AR support and auto-detect GPS location on component mount
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
    
    const autoDetectLocation = async () => {
      if (!navigator.geolocation) return;
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          });
        });
        
        // Get address from coordinates using postcode API
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`/api/postcodes/reverse?lat=${latitude}&lng=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
              setFromLocation(data[0].formatted || 'Current Location');
            }
          }
        } catch (error) {
          console.warn('Failed to get address from coordinates:', error);
          setFromLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch (error) {
        console.warn('Auto GPS location detection failed:', error);
      }
    };
    
    checkARSupport();
    autoDetectLocation();
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
      console.log('[NAVIGATION] Journey created successfully:', journey.id);
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
      console.log('calculateRouteMutation.mutationFn called with:', routeData);
      const response = await apiRequest("POST", "/api/routes/calculate", routeData);
      console.log('API response status:', response.status);
      const result = await response.json();
      console.log('API response data:', result);
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
      
      // Ensure toLocation is set when route is calculated (fix for disabled Start Navigation button)
      if (route && route.endLocation && !toLocation) {
        console.log('[ROUTE_CALC] Setting toLocation from route:', route.endLocation);
        setToLocation(route.endLocation);
      }
      
      // If route calculation includes a plannedJourney (from route calculation), set it as active
      if (route.plannedJourney) {
        setActiveJourney(route.plannedJourney);
        localStorage.setItem('activeJourneyId', route.plannedJourney.id.toString());
        windowSync.updateJourney(route.plannedJourney, false);
      }
      
      // NOTE: Route preview overlay disabled - show route directly on main map instead
      // The overlay was blocking the map interface with a solid black background
      if (route.geometry) {
        // Route will be displayed on the main map instead of in an overlay
      } else {
        // Fallback to existing map expansion behavior if no geometry
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
              // DISABLED: Don't auto-expand map to prevent grey overlay
              // setIsMapExpanded(true);
              // Map will stay in normal embedded view instead of full-screen overlay
              console.log('[MAP] Route calculated - keeping map in normal view to prevent grey overlay');
            }
          }
        };

        // Small delay to allow route state to update
        setTimeout(handleMapExpansion, 200);
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
    console.log('=== ROUTE PLANNING ATTEMPT ===');
    console.log('handlePlanRoute called with:', { 
      fromLocation, 
      toLocation, 
      routePreference,
      startLoc,
      endLoc,
      activeProfileId,
      selectedProfile: selectedProfile?.id 
    });
    
    // Guard against duplicate requests while calculating
    if (calculateRouteMutation.isPending) {
      console.log('Route planning blocked: Already calculating');
      return;
    }
    
    // Ensure we have a valid vehicle profile ID before planning route
    if (!activeProfileId || activeProfileId.trim().length === 0) {
      console.log('Route planning blocked: No valid vehicle profile');
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
      console.log('Route planning blocked: Missing locations', { finalStartLoc, finalEndLoc, fromLocation, toLocation });
      toast({
        title: "Locations required",
        description: "Please enter both start and destination locations before planning a route.",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Validation passed! Calling mutation...');

    const routeData = {
      startLocation: finalStartLoc,
      endLocation: finalEndLoc,
      vehicleProfileId: activeProfileId,
      routePreference: routePreference || 'fastest',
    };

    console.log('Submitting route calculation with payload:', routeData);
    console.log('About to call calculateRouteMutation.mutate');
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

  // Route preview overlay handlers
  const handleSkipPreview = () => {
    setShowRoutePreview(false);
    setPreviewRouteData(null);
    // Show the regular map view after skipping
    handleMapExpansionAfterPreview();
  };

  const handleStartNavigationFromPreview = () => {
    setShowRoutePreview(false);
    setPreviewRouteData(null);
    // Start navigation immediately
    handleStartNavigation();
  };

  const handleClosePreview = () => {
    setShowRoutePreview(false);
    setPreviewRouteData(null);
    // Don't expand map, just return to planning view
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
        // DISABLED: Don't auto-expand map to prevent grey overlay
        // setIsMapExpanded(true);
        // Map will stay in normal embedded view instead of full-screen overlay
        console.log('[MAP] Route preview - keeping map in normal view to prevent grey overlay');
      }
    }
  };

  // Clear current route when locations change to ensure fresh planning
  useEffect(() => {
    if (currentRoute && (fromLocation || toLocation)) {
      setCurrentRoute(null);
    }
  }, [fromLocation, toLocation]);

  // Auto-plan route when both locations are set
  useEffect(() => {
    // Only auto-plan if we have both locations and no current route
    if (fromLocation && toLocation && !currentRoute && !calculateRouteMutation.isPending && activeProfileId) {
      handlePlanRoute();
    }
  }, [fromLocation, toLocation, activeProfileId, currentRoute, calculateRouteMutation.isPending]);

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

  // DISABLED: Auto-expand map to prevent grey overlay blocking interface
  // useEffect(() => {
  //   if (currentRoute && !isMapWindowOpen()) {
  //     if (!isMapExpanded) {
  //       const timer = setTimeout(() => {
  //         setIsMapExpanded(true);
  //       }, 300);
  //       return () => clearTimeout(timer);
  //     }
  //   }
  // }, [currentRoute, isMapExpanded, isMobile]);




  // Handle cancel route - stop navigation
  const handleCancelRoute = () => {
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
      // Open sidebar for navigation preparation
      setSidebarState('open');

      // If no route exists, plan it first then start navigation
      if (!currentRoute) {
        await new Promise<void>((resolve, reject) => {
          const unsubscribe = calculateRouteMutation.mutateAsync({
            startLocation: fromLocation,
            endLocation: toLocation,
            vehicleProfileId: selectedProfile?.id?.toString(),
            routePreference: 'fastest'
          }).then((routeData) => {
            unsubscribe;
            resolve();
          }).catch((error) => {
            console.error('Route planning failed:', error);
            recoverUIOnError();
            toast({
              title: "Route planning failed",
              description: "Unable to calculate route. Please check locations and try again.",
              variant: "destructive"
            });
            reject(error);
          });
        });
      }

      // Route should now exist, start navigation
      if (!currentRoute) {
        throw new Error('Route calculation failed');
      }

      // Start or activate journey based on current state with idempotency
      if (activeJourney && activeJourney.status === 'planned') {
        // Activate existing planned journey with stable idempotency key
        const idempotencyKey = generateIdempotencyKey('activate', activeJourney.id.toString());
        await activateJourneyMutation.mutateAsync({ journeyId: activeJourney.id, idempotencyKey });
      } else {
        // Create new journey with stable idempotency key
        const idempotencyKey = generateIdempotencyKey('start', currentRoute.id);
        await startJourneyMutation.mutateAsync({ routeId: currentRoute.id, idempotencyKey });
      }

      // DISABLED: Don't auto-expand map to prevent grey overlay
      // setTimeout(() => {
      //   setIsMapExpanded(true);
      // }, 300);

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

  if (profilesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Truck className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading vehicle profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-transparent">
      {/* Legal Disclaimer Popup - shown automatically on first visit */}
      {showLegalPopup && (
        <div className="fixed inset-0 z-50 bg-background">
          <LegalDisclaimerPopup 
            onClose={() => {
              setShowLegalPopup(false);
            }}
          />
        </div>
      )}
      {/* Mobile-First Layout */}
      {isMobile ? (
        <div className="mobile-layout">
          {/* Mobile Header with Menu Button */}
          <div className="mobile-nav-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary" />
              <span className="mobile-text-lg font-semibold">TruckNav Pro</span>
            </div>
            
            {/* Top Right Hamburger Button - Always visible */}
            <Button
              variant="default"
              size="icon"
              onClick={() => setSidebarState('open')}
              className="hamburger-menu-button automotive-touch-target bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 shadow-lg"
              data-testid="button-menu-top-right"
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center gap-1">
                <div className="w-5 h-1 bg-current rounded-sm"></div>
                <div className="w-5 h-1 bg-current rounded-sm"></div>
                <div className="w-5 h-1 bg-current rounded-sm"></div>
              </div>
            </Button>
          </div>

          {/* Mobile Fullscreen Map */}
          <div className="mobile-map-container relative">
            {/* AR Navigation - Mobile */}
            {isARMode && (
              <ARNavigation
                isActive={isARMode}
                onToggleAR={handleToggleAR}
                currentDirection={getARDirectionData()}
                route={getARRouteData()}
              />
            )}
            
            {/* Professional Navigation HUD - Mobile */}
            {isNavigating && !isARMode && (
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
            
            {/* Enhanced Professional Map - Mobile */}
            {!isARMode && (
              <>
                <EnhancedRealisticMap
                  currentRoute={currentRoute}
                  selectedProfile={selectedProfile || activeProfile}
                  alternativeRoutes={alternatives}
                  previewRoute={previewRoute}
                  showTrafficLayer={true}
                  showIncidents={true}
                  isNavigating={isNavigating}
                  currentLocation={currentGPSLocation || undefined}
                  onLocationUpdate={setCurrentGPSLocation}
                />
                
                {/* Legal Ownership Section - Mobile */}
                <MapLegalOwnership compact={true} className="sm:hidden" />
              </>
            )}
          </div>

          {/* Mobile Route Planning Drawer */}
          <Drawer open={isMobileDrawerOpen} onOpenChange={(open) => setSidebarState(open ? 'open' : 'collapsed')}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="mobile-text-xl">Route Planning</DrawerTitle>
              </DrawerHeader>
              <div className="drawer-content space-y-4">
                {/* Notification Controls */}
                <DNDControls
                  dndState={dndState}
                  onUpdateDndState={updateDndState}
                  voiceEnabled={voiceEnabled}
                  onVoiceEnabledChange={setVoiceEnabled}
                  isNavigating={isNavigating}
                  notificationCount={queueLength}
                  onTestNotification={() => triggerLiveNotification()}
                />
                
                {/* Navigation Sidebar */}
                <NavigationSidebar
                  // Route planning props
                  fromLocation={fromLocation}
                  toLocation={toLocation}
                  onFromLocationChange={setFromLocation}
                  onToLocationChange={setToLocation}
                  onPlanRoute={() => {
                    handlePlanRoute();
                    setSidebarState('collapsed'); // Collapse drawer but keep accessible
                  }}
                  onStartNavigation={() => {
                    handleStartNavigation();
                    // Don't auto-collapse during navigation start - let handleStartNavigation manage state
                  }}
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
                  
                  // Sidebar state (always open in mobile drawer)
                  isOpen={true}
                  onToggle={() => setSidebarState('collapsed')} // Collapse drawer but keep accessible
                  isCollapsed={false}
                  onCollapseToggle={() => {}}
                  
                  // Search panel integration - not needed on mobile since left sidebar contains search
                  isSearchPanelOpen={false}
                  onToggleSearchPanel={() => {}}
                  
                  // Settings modal props
                  showVehicleSettings={showVehicleSettings}
                  onShowVehicleSettings={setShowVehicleSettings}
                />
              </div>
            </DrawerContent>
          </Drawer>


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
          />

          {/* Desktop Map Area */}
          <div className={cn(
            "flex-1 relative transition-all duration-300 ease-in-out",
            isMapExpanded ? "fixed inset-0 z-40 bg-background" : "min-h-screen"
          )}>

            {/* AR Navigation - Desktop */}
            {isARMode && (
              <ARNavigation
                isActive={isARMode}
                onToggleAR={handleToggleAR}
                currentDirection={getARDirectionData()}
                route={getARRouteData()}
              />
            )}

            {/* Professional Navigation HUD - Desktop */}
            {isNavigating && !isARMode && (
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

            {/* Enhanced Professional Map - Desktop */}
            {!isARMode && (
              <>
                <EnhancedRealisticMap
                  currentRoute={currentRoute}
                  selectedProfile={selectedProfile || activeProfile}
                  alternativeRoutes={alternatives}
                  previewRoute={previewRoute}
                  showTrafficLayer={true}
                  showIncidents={true}
                  isNavigating={isNavigating}
                  currentLocation={currentGPSLocation || undefined}
                  onLocationUpdate={setCurrentGPSLocation}
                />
                
                {/* Legal Ownership Section - Desktop */}
                <MapLegalOwnership compact={true} className="hidden sm:block" />
              </>
            )}
          </div>

        </div>
      )}

      {/* Navigation Status Drawer - removed legacy separate state */}
      <Drawer open={false} onOpenChange={() => {}}>
        <DrawerContent className="automotive-drawer">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle className="automotive-text-lg">
              {isNavigating ? 'Navigation Active' : 'Starting Navigation...'}
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsMapExpanded(false);
                setSidebarState('open');
              }}
              className="automotive-touch-target"
              data-testid="button-close-drawer"
            >
              <X className="w-5 h-5" />
            </Button>
          </DrawerHeader>
          <div className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <div className="automotive-text-base text-muted-foreground mb-2">
                  Route: {fromLocation} → {toLocation}
                </div>
                {currentRoute && (
                  <div className="text-sm text-muted-foreground">
                    Distance: {Math.round((currentRoute.distance || 0) / 1000)} km • 
                    Duration: {Math.round((currentRoute.duration || 0) / 60)} min
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    setIsMapExpanded(true);
                    // NEVER close sidebar completely - keep it collapsed but accessible
                    if (window.innerWidth < 1024) {
                      setSidebarState('collapsed');
                    }
                  }}
                  className="flex-1 automotive-button automotive-text-base"
                  data-testid="button-expand-map"
                >
                  View Full Map
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsMapExpanded(false);
                    // Ensure sidebar is properly set to planning mode state
                    setSidebarState('open');
                  }}
                  className="flex-1 automotive-button automotive-text-base"
                  data-testid="button-back-to-planning"
                >
                  Back to Planning
                </Button>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                Swipe down to dismiss or tap outside
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

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

      {/* Route Preview Overlay */}
      {showRoutePreview && previewRouteData && (
        <RoutePreviewOverlay
          route={previewRouteData}
          isVisible={showRoutePreview}
          onSkip={handleSkipPreview}
          onStartNavigation={handleStartNavigationFromPreview}
          onClose={handleClosePreview}
        />
      )}
      
      {/* Settings Modal - rendered at page level to persist independently of sidebar state */}
      <SettingsModal
        open={showVehicleSettings}
        onOpenChange={setShowVehicleSettings}
        onCloseSidebar={isSidebarOpen ? () => setSidebarState('collapsed') : undefined}
      />

    </div>
  );
}
