import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Truck, Navigation, MapPin, Shield, Fuel, Utensils, Bed, Heart, Plus, Minus, Crosshair } from "lucide-react";
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/language/language-selector';
import InteractiveMap from "@/components/map/interactive-map";
import RoutePlanningPanel from "@/components/route/route-planning-panel";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import { type VehicleProfile, type Route } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function NavigationPage() {
  const { t } = useTranslation();
  const [selectedProfile, setSelectedProfile] = useState<VehicleProfile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [fromLocation, setFromLocation] = useState("Manchester M1 Industrial Estate");
  const [toLocation, setToLocation] = useState("Birmingham B1 Logistics Hub");

  // Get vehicle profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery<VehicleProfile[]>({
    queryKey: ["/api/vehicle-profiles"],
  });

  // Set default profile
  useEffect(() => {
    if (profiles && profiles.length > 0 && !selectedProfile) {
      setSelectedProfile(profiles[0]);
    }
  }, [profiles, selectedProfile]);

  // Route calculation mutation
  const calculateRouteMutation = useMutation({
    mutationFn: async (routeData: { startLocation: string; endLocation: string; vehicleProfileId?: string }) => {
      const response = await apiRequest("POST", "/api/routes/calculate", routeData);
      return response.json();
    },
    onSuccess: (route) => {
      setCurrentRoute(route);
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
      // In a real implementation, this would start GPS navigation
      console.log("Starting navigation for route:", currentRoute.id);
    }
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
    <div className="min-h-screen bg-background scroll-smooth no-scroll-lock">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
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
            <LanguageSelector variant="button" />
            {selectedProfile && (
              <div className="bg-muted rounded-lg px-3 py-2 text-xs" data-testid="vehicle-profile-display">
                <span className="font-medium text-foreground">
                  {Math.floor(selectedProfile.height)}'
                  {Math.round((selectedProfile.height % 1) * 12)}" H × {Math.floor(selectedProfile.width)}'
                  {Math.round((selectedProfile.width % 1) * 12)}" W
                </span>
                <span className="text-muted-foreground ml-1">{selectedProfile.weight}T</span>
              </div>
            )}
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

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-73px)] touch-scroll">
        {/* Route Planning Panel */}
        <div className="flex-shrink-0 overflow-y-auto touch-scroll">
          <RoutePlanningPanel
            fromLocation={fromLocation}
            toLocation={toLocation}
            onFromLocationChange={setFromLocation}
            onToLocationChange={setToLocation}
            onPlanRoute={handlePlanRoute}
            onStartNavigation={handleStartNavigation}
            currentRoute={currentRoute}
            isCalculating={calculateRouteMutation.isPending}
            selectedProfile={selectedProfile}
          />
        </div>

        {/* Map */}
        <div className="flex-1 overflow-hidden">
          <InteractiveMap
            currentRoute={currentRoute}
            selectedProfile={selectedProfile}
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
