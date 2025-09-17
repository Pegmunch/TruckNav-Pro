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
import { type VehicleProfile, type Route, type Journey } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useWindowSync } from "@/hooks/use-window-sync";
import { isMapWindowOpen, focusMapWindow } from "@/lib/window-manager";
import { useToast } from "@/hooks/use-toast";
import { useLiveNotifications } from "@/hooks/use-live-notifications";

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
  
  // Mobile vs Desktop state management
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Mobile drawer state (replaces sidebar on mobile)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  // Map expansion state - auto-expand when route is selected
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  
  // Legacy drawer state for navigation transitions
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Window sync for cross-window communication
  const windowSync = useWindowSync();

  // Live notifications system
  const { triggerLiveNotification, isActive: notificationsActive } = useLiveNotifications({
    currentRoute,
    selectedProfile,
    isNavigating,
    enabled: true, // Always enabled for live updates
  });

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
    mutationFn: async (routeData: { startLocation: string; endLocation: string; vehicleProfileId?: string }) => {
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
      
      // Auto-expand map window if open, otherwise expand in-page map
      const handleMapExpansion = () => {
        if (isMapWindowOpen()) {
          // Focus the map window and let it handle auto-expansion
          focusMapWindow();
          console.log('Route calculated: focusing map window for auto-expansion');
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
    },
    onError: (error) => {
      console.error('Failed to calculate route:', error);
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

  const handlePlanRoute = () => {
    calculateRouteMutation.mutate({
      startLocation: fromLocation,
      endLocation: toLocation,
      vehicleProfileId: selectedProfile?.id,
    });
  };

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
              onOpenLaneSelection={handleOpenLaneSelection}
              isFullscreen={true}
              onToggleFullscreen={() => {}} // No-op for mobile
              autoExpanded={true}
              onCollapseMap={() => {}} // No-op for mobile
            />
          </div>

          {/* Mobile Route Planning Drawer */}
          <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="mobile-text-xl">Route Planning</DrawerTitle>
              </DrawerHeader>
              <div className="drawer-content">
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
                  onToggle={() => {}}
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
    </div>
  );
}
