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
  const [selectedProfile, setSelectedProfile] = useState<VehicleProfile | null>(null);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [fromLocation, setFromLocation] = useState("Current Location");
  const [toLocation, setToLocation] = useState("");
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Unified sidebar state management - single source of truth
  const [sidebarState, setSidebarState] = useState<'closed' | 'open' | 'collapsed'>('closed');
  
  // Computed states for backward compatibility
  const isSidebarOpen = sidebarState !== 'closed';
  const isSidebarCollapsed = sidebarState === 'collapsed';
  const isMobileDrawerOpen = isMobile ? isSidebarOpen : false;
  
  
  // Map expansion state - auto-expand when route is selected
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  
  // Legacy drawer state for navigation transitions  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
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
  

  // Initialize sidebar state to closed for full-screen map by default
  useEffect(() => {
    setSidebarState('closed');
  }, [isMobile]);

  // Check legal consent and show popup if needed
  useEffect(() => {
    if (!isConsentLoading && !hasAcceptedTerms) {
      setShowLegalPopup(true);
    }
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
    console.log('AR_TOGGLE_CLICKED');
    console.log(`AR_supported: ${arSupported}, navigating: ${isNavigating}, current_AR: ${isARMode}`);
    
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
    mutationFn: async (journeyId: number) => {
      const response = await apiRequest("PATCH", `/api/journeys/${journeyId}/activate`, {});
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
      // Show user-friendly error message
      toast({
          title: "Failed to start navigation",
          description: "Unable to activate journey. Please try again.",
          variant: "destructive",
        });
    },
  });

  const startJourneyMutation = useMutation({
    mutationFn: async (routeId: string) => {
      const response = await apiRequest("POST", "/api/journeys/start", { routeId });
      return response.json();
    },
    onSuccess: (journey) => {
      // Immediately activate the newly created journey
      activateJourneyMutation.mutate(journey.id);
    },
    onError: (error) => {
      console.error('Failed to start journey:', error);
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
      return response.json();
    },
    onSuccess: (route) => {
      // Trigger live notification for new route
      if (route && route !== currentRoute) {
        triggerLiveNotification('route_change');
      }
      
      setCurrentRoute(route);
      // Update window sync with new route
      windowSync.updateRoute(route);
      
      // If route calculation includes a plannedJourney (from route calculation), set it as active
      if (route.plannedJourney) {
        setActiveJourney(route.plannedJourney);
        localStorage.setItem('activeJourneyId', route.plannedJourney.id.toString());
        windowSync.updateJourney(route.plannedJourney, false);
      }
      
      // Show route preview overlay if geometry is available
      if (route.geometry) {
        setPreviewRouteData(route);
        setShowRoutePreview(true);
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
              // On mobile, close drawer to show full map
              setSidebarState('closed');
            } else {
              // Use existing in-page expansion logic for desktop
              setIsMapExpanded(true);
              if (window.innerWidth < 1024) {
                setSidebarState('closed');
              }
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
    // Ensure we have a valid vehicle profile ID before planning route
    if (!activeProfileId || activeProfileId.trim().length === 0) {
      toast({
        title: "Vehicle profile required",
        description: "Please select a valid vehicle profile before planning a route.",
        variant: "destructive",
      });
      return;
    }

    const routeData = {
      startLocation: startLoc || fromLocation,
      endLocation: endLoc || toLocation,
      vehicleProfileId: activeProfileId,
      routePreference: routePreference || 'fastest',
    };

    console.log('Submitting route calculation with payload:', routeData);
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
        // On mobile, close drawer to show full map
        setSidebarState('closed');
      } else {
        // Use existing in-page expansion logic for desktop
        setIsMapExpanded(true);
        if (window.innerWidth < 1024) {
          setSidebarState('closed');
        }
      }
    }
  };

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

  // Enhanced auto-expand map logic - works with both in-page and window modes
  useEffect(() => {
    if (currentRoute && !isMapWindowOpen()) {
      if (isMobile) {
        // On mobile, close drawer to show full map
        setSidebarState('closed');
      } else if (!isMapExpanded) {
        // Desktop: expand map temporarily
        const timer = setTimeout(() => {
          setIsMapExpanded(true);
          if (window.innerWidth < 1024) {
            setSidebarState('closed');
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentRoute, isMapExpanded, isMobile]);




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

  const handleStartNavigation = () => {
    if (currentRoute) {
      // Open swipe drawer for smooth transition
      setIsDrawerOpen(true);
      
      // If we already have a planned journey from route calculation, activate it
      if (activeJourney && activeJourney.status === 'planned') {
        // Activate the existing planned journey to 'active' status
        activateJourneyMutation.mutate(activeJourney.id);
      } else {
        // Create a new journey for this route if none exists (will auto-activate)
        startJourneyMutation.mutate(currentRoute.id);
      }
      
      // Auto-expand map after a short delay for smooth transition
      setTimeout(() => {
        setIsMapExpanded(true);
        // On mobile, close sidebar to give more space for map
        if (window.innerWidth < 1024) {
          setSidebarState('closed');
        }
      }, 300);
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

  // Unified sidebar toggle functionality - cycles through: closed → open → collapsed → closed
  const handleSidebarToggle = () => {
    switch (sidebarState) {
      case 'closed':
        // Closed → Open (expanded)
        setSidebarState('open');
        // Auto-collapse expanded map when sidebar opens
        if (isMapExpanded) {
          setIsMapExpanded(false);
        }
        break;
      case 'open':
        // Open → Collapsed (on desktop) or Closed (on mobile)
        setSidebarState(isMobile ? 'closed' : 'collapsed');
        break;
      case 'collapsed':
        // Collapsed → Closed
        setSidebarState('closed');
        break;
      default:
        setSidebarState('closed');
    }
  };

  // Keep this for compatibility with existing AR toggle functionality
  const handleSidebarCollapseToggle = () => {
    setSidebarState(isSidebarCollapsed ? 'open' : 'collapsed');
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
    <div className="bg-background">
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
            <div className="flex items-center gap-2">
              {/* AR Mode Toggle - Mobile */}
              {arSupported && isNavigating && (
                <Button
                  variant={isARMode ? "default" : "outline"}
                  size="icon"
                  onClick={handleToggleAR}
                  className={cn(
                    "automotive-touch-target mr-2 shadow-lg",
                    isARMode 
                      ? "bg-blue-600 text-white border-2 border-blue-600 hover:bg-blue-700"
                      : "bg-background text-foreground border-2 border-primary hover:bg-primary/10"
                  )}
                  data-testid="button-ar-toggle-mobile"
                >
                  <Camera className="w-5 h-5" />
                </Button>
              )}
              
              <Button
                variant="default"
                size="icon"
                onClick={() => setSidebarState('open')}
                className="automotive-touch-target bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 shadow-lg"
                data-testid="button-menu-mobile"
              >
                <div className="w-6 h-6 flex flex-col justify-center items-center gap-1">
                  <div className="w-5 h-1 bg-current rounded-sm"></div>
                  <div className="w-5 h-1 bg-current rounded-sm"></div>
                  <div className="w-5 h-1 bg-current rounded-sm"></div>
                </div>
              </Button>
            </div>
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
          <Drawer open={isMobileDrawerOpen} onOpenChange={(open) => setSidebarState(open ? 'open' : 'closed')}>
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
                    setSidebarState('closed'); // Close drawer after planning
                  }}
                  onStartNavigation={() => {
                    handleStartNavigation();
                    setSidebarState('closed'); // Close drawer when starting
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
                  onToggle={() => setSidebarState('closed')} // Close drawer when hamburger is clicked
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

      {/* Swipeable Navigation Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="automotive-drawer">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle className="automotive-text-lg">
              {isNavigating ? 'Navigation Active' : 'Starting Navigation...'}
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsDrawerOpen(false);
                setIsMapExpanded(false);
                if (!isSidebarOpen) {
                  setSidebarState('open');
                }
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
                    setIsDrawerOpen(false);
                    if (window.innerWidth < 1024) {
                      setSidebarState('closed');
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
                    setIsDrawerOpen(false);
                    setIsMapExpanded(false);
                    if (!isSidebarOpen) {
                      setSidebarState('open');
                    }
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
        onCloseSidebar={isSidebarOpen ? () => setSidebarState('closed') : undefined}
      />
    </div>
  );
}
