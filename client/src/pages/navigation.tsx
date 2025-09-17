import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Truck, Navigation, MapPin, Shield, Fuel, Utensils, Bed, Heart, Route as RouteIcon } from "lucide-react";
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/language/language-selector';
import CountryLanguageSelector, { DetailedCountrySelector } from '@/components/country/country-language-selector';
import InteractiveMap from "@/components/map/interactive-map";
import RoutePlanningPanel from "@/components/route/route-planning-panel";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import { MeasurementSelector } from "@/components/measurement/measurement-selector";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { type VehicleProfile, type Route, type Journey } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function NavigationPage() {
  const { t } = useTranslation();
  const { formatHeight, formatWeight } = useMeasurement();
  const [, setLocation] = useLocation();
  const [selectedProfile, setSelectedProfile] = useState<VehicleProfile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [fromLocation, setFromLocation] = useState("Manchester M1 Industrial Estate");
  const [toLocation, setToLocation] = useState("Birmingham B1 Logistics Hub");
  const [activeTab, setActiveTab] = useState("navigation");
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  // Automotive fullscreen map functionality
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

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
      // If route calculation includes a plannedJourney (from route calculation), set it as active
      if (route.plannedJourney) {
        setActiveJourney(route.plannedJourney);
        localStorage.setItem('activeJourneyId', route.plannedJourney.id.toString());
      }
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

  // Automotive fullscreen map functionality
  const handleToggleFullscreen = () => {
    setIsMapFullscreen(!isMapFullscreen);
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
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border md:sticky md:top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Truck className="text-primary-foreground text-lg" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{t('app.name')}</h1>
              <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSelector variant="country-first" />
            {selectedProfile && (
              <div className="bg-muted rounded-lg px-3 py-2 text-xs" data-testid="vehicle-profile-display">
                <span className="font-medium text-foreground">
                  {formatHeight(selectedProfile.height)} H × {formatHeight(selectedProfile.width)} W
                </span>
                <span className="text-muted-foreground ml-1">{formatWeight(selectedProfile.weight || 0)}</span>
              </div>
            )}
            <MeasurementSelector variant="compact" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProfileSetup(true)}
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Automotive Navigation Interface - Simplified for CarPlay/Android Auto */}
      <div className={`automotive-layout ${isMapFullscreen ? 'hidden' : 'flex flex-col md:flex-row min-h-screen'}`}>
        {/* Route Planning Panel */}
        <div className="w-full md:w-96 bg-card md:border-r border-b md:border-b-0">
          <RoutePlanningPanel
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
            selectedProfile={selectedProfile}
            activeJourney={activeJourney}
            isNavigating={isNavigating}
            isStartingJourney={startJourneyMutation.isPending || activateJourneyMutation.isPending}
            isCompletingJourney={completeJourneyMutation.isPending}
          />
        </div>

        {/* Map */}
        <div className="flex-1 min-h-[50vh] md:min-h-screen">
          <InteractiveMap
            currentRoute={currentRoute}
            selectedProfile={selectedProfile}
            onOpenLaneSelection={handleOpenLaneSelection}
            isFullscreen={isMapFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />
        </div>
      </div>



      {/* Vehicle Profile Setup Modal */}
      {showProfileSetup && (
        <VehicleProfileSetup
          onClose={() => setShowProfileSetup(false)}
          onProfileCreated={(profile) => {
            setSelectedProfile(profile);
            setShowProfileSetup(false);
            queryClient.invalidateQueries({ queryKey: ["/api/vehicle-profiles"] });
          }}
          currentProfile={selectedProfile}
        />
      )}
    </div>
  );
}
