import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import { useTranslation } from 'react-i18next';
import InteractiveMap from "@/components/map/interactive-map";
import NavigationSidebar from "@/components/navigation/navigation-sidebar";
import { type VehicleProfile, type Route, type Journey } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useWindowSync } from "@/hooks/use-window-sync";
import { isMapWindowOpen, focusMapWindow } from "@/lib/window-manager";

export default function NavigationPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [selectedProfile, setSelectedProfile] = useState<VehicleProfile | null>(null);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [fromLocation, setFromLocation] = useState("Manchester M1 Industrial Estate");
  const [toLocation, setToLocation] = useState("Birmingham B1 Logistics Hub");
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Sidebar state management
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Map expansion state - auto-expand when route is selected
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  
  // Window sync for cross-window communication
  const windowSync = useWindowSync();

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
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({
          title: "Failed to start navigation",
          description: "Unable to activate journey. Please try again.",
          variant: "destructive",
        });
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
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({
          title: "Failed to start journey",
          description: "Unable to create new journey. Please try again.",
          variant: "destructive",
        });
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
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({
          title: "Failed to stop navigation",
          description: "Unable to complete journey. Please try again.",
          variant: "destructive",
        });
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
          // Use existing in-page expansion logic
          setIsMapExpanded(true);
          // On mobile, also close sidebar to give more space
          if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
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
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({
          title: "Route calculation failed",
          description: "Unable to calculate route. Please check your locations and try again.",
          variant: "destructive",
        });
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
    if (currentRoute && !isMapExpanded) {
      // Only auto-expand in-page map if no map window is open
      if (!isMapWindowOpen()) {
        const timer = setTimeout(() => {
          setIsMapExpanded(true);
          // On mobile, also close sidebar to give more space
          if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentRoute, isMapExpanded]);

  const handleStartNavigation = () => {
    if (currentRoute) {
      // If we already have a planned journey from route calculation, activate it
      if (activeJourney && activeJourney.status === 'planned') {
        // Activate the existing planned journey to 'active' status
        activateJourneyMutation.mutate(activeJourney.id);
      } else {
        // Create a new journey for this route if none exists (will auto-activate)
        startJourneyMutation.mutate(currentRoute.id);
      }
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
      {/* Sidebar-Based Layout */}
      <div className={cn(
        "flex h-screen overflow-hidden",
        "automotive-layout"
      )}>
        
        {/* Navigation Sidebar */}
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

        {/* Main Map Area */}
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
            // Auto-expansion props
            autoExpanded={isMapExpanded}
            onCollapseMap={() => {
              setIsMapExpanded(false);
              if (!isSidebarOpen) {
                setIsSidebarOpen(true);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
