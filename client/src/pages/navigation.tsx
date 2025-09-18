import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Truck, X, Menu, MapPin } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from 'react-i18next';
import InteractiveMap from "@/components/map/interactive-map";
import NavigationSidebar from "@/components/navigation/navigation-sidebar";
import AlternativeRoutesPanel from "@/components/traffic/alternative-routes-panel";
import RoutePreviewOverlay from "@/components/map/route-preview-overlay";
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
import LegalDisclaimerPopup from "@/components/legal/legal-disclaimer-popup";

export default function NavigationPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [selectedProfile, setSelectedProfile] = useState<VehicleProfile | null>(null);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [fromLocation, setFromLocation] = useState("Manchester M1 Industrial Estate");
  const [toLocation, setToLocation] = useState("Birmingham B1 Logistics Hub");
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Mobile vs Desktop state management - initialize after isMobile is available
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Mobile drawer state (replaces sidebar on mobile)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
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

  // Initialize sidebar state to closed for full-screen map by default
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [isMobile]);

  // Check legal consent and show popup if needed
  useEffect(() => {
    if (!isConsentLoading && !hasAcceptedTerms) {
      setShowLegalPopup(true);
    }
  }, [hasAcceptedTerms, isConsentLoading]);

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
  } = useTrafficState(currentRoute?.id || null, selectedProfile);

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

  // Set default profile
  useEffect(() => {
    if (profiles && profiles.length > 0 && !selectedProfile) {
      setSelectedProfile(profiles[0]);
    }
  }, [profiles, selectedProfile]);

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
              setIsMobileDrawerOpen(false);
            } else {
              // Use existing in-page expansion logic for desktop
              setIsMapExpanded(true);
              if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
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

  const handlePlanRoute = (routePreference?: 'fastest' | 'eco' | 'avoid_tolls') => {
    calculateRouteMutation.mutate({
      startLocation: fromLocation,
      endLocation: toLocation,
      vehicleProfileId: selectedProfile?.id,
      routePreference: routePreference || 'fastest',
    });
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
      // Apply the alternative route
      const response = await apiRequest("POST", `/api/routes/apply-alternative`, {
        routeId: currentRoute?.id,
        alternativeRouteId: route.id,
        vehicleProfileId: selectedProfile?.id,
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
        setIsMobileDrawerOpen(false);
      } else {
        // Use existing in-page expansion logic for desktop
        setIsMapExpanded(true);
        if (window.innerWidth < 1024) {
          setIsSidebarOpen(false);
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
        setIsMobileDrawerOpen(false);
      } else if (!isMapExpanded) {
        // Desktop: expand map temporarily
        const timer = setTimeout(() => {
          setIsMapExpanded(true);
          if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentRoute, isMapExpanded, isMobile]);

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
          setIsSidebarOpen(false);
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
      setIsSidebarOpen(true);
    }
  };

  // Sidebar toggle functionality
  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarCollapseToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="automotive-touch-target"
              data-testid="button-open-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          {/* Mobile Fullscreen Map */}
          <div className="mobile-map-container">
            <InteractiveMap
              currentRoute={currentRoute}
              selectedProfile={selectedProfile}
              alternativeRoutes={alternatives}
              previewRoute={previewRoute}
              onOpenLaneSelection={handleOpenLaneSelection}
              isFullscreen={isMapExpanded}
              onToggleFullscreen={handleToggleMapExpansion}
              autoExpanded={isMapExpanded}
              onCollapseMap={() => {
                setIsMapExpanded(false);
                setIsDrawerOpen(false);
              }}
              onHideSidebar={() => setIsMobileDrawerOpen(false)}
            />
          </div>

          {/* Mobile Route Planning Drawer */}
          <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
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
                    setIsMobileDrawerOpen(false); // Close drawer after planning
                  }}
                  onStartNavigation={() => {
                    handleStartNavigation();
                    setIsMobileDrawerOpen(false); // Close drawer when starting
                  }}
                  onStopNavigation={handleStopNavigation}
                  onOpenLaneSelection={handleOpenLaneSelection}
                  currentRoute={currentRoute}
                  isCalculating={calculateRouteMutation.isPending}
                  
                  // Vehicle profile props
                  selectedProfile={selectedProfile}
                  onProfileSelect={(profile) => {
                    setSelectedProfile(profile);
                    queryClient.invalidateQueries({ queryKey: ["/api/vehicle-profiles"] });
                  }}
                  activeJourney={activeJourney}
                  isNavigating={isNavigating}
                  isStartingJourney={startJourneyMutation.isPending || activateJourneyMutation.isPending}
                  isCompletingJourney={completeJourneyMutation.isPending}
                  
                  // Sidebar state (always open in mobile drawer)
                  isOpen={true}
                  onToggle={() => setIsMobileDrawerOpen(false)} // Close drawer when hamburger is clicked
                  isCollapsed={false}
                  onCollapseToggle={() => {}}
                />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      ) : (
        /* Desktop Layout - Keep existing sidebar layout */
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
            onOpenLaneSelection={handleOpenLaneSelection}
            currentRoute={currentRoute}
            isCalculating={calculateRouteMutation.isPending}
            
            // Vehicle profile props
            selectedProfile={selectedProfile}
            onProfileSelect={(profile) => {
              setSelectedProfile(profile);
              queryClient.invalidateQueries({ queryKey: ["/api/vehicle-profiles"] });
            }}
            activeJourney={activeJourney}
            isNavigating={isNavigating}
            isStartingJourney={startJourneyMutation.isPending || activateJourneyMutation.isPending}
            isCompletingJourney={completeJourneyMutation.isPending}
            
            // Sidebar state
            isOpen={isSidebarOpen}
            onToggle={handleSidebarToggle}
            isCollapsed={isSidebarCollapsed}
            onCollapseToggle={handleSidebarCollapseToggle}
          />

          {/* Desktop Map Area */}
          <div className={cn(
            "flex-1 relative transition-all duration-300 ease-in-out",
            isMapExpanded ? "fixed inset-0 z-40 bg-background" : "min-h-screen"
          )}>
            <InteractiveMap
              currentRoute={currentRoute}
              selectedProfile={selectedProfile}
              alternativeRoutes={alternatives}
              previewRoute={previewRoute}
              onOpenLaneSelection={handleOpenLaneSelection}
              isFullscreen={isMapExpanded}
              onToggleFullscreen={handleToggleMapExpansion}
              autoExpanded={isMapExpanded}
              onCollapseMap={() => {
                setIsMapExpanded(false);
                setIsDrawerOpen(false);
                if (!isSidebarOpen) {
                  setIsSidebarOpen(true);
                }
              }}
              onHideSidebar={() => setIsSidebarOpen(false)}
            />
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
                  setIsSidebarOpen(true);
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
                      setIsSidebarOpen(false);
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
                      setIsSidebarOpen(true);
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
    </div>
  );
}
