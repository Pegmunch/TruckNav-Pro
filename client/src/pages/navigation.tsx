import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Truck, Navigation, MapPin, Shield, Fuel, Utensils, Bed, Heart, Plus, Minus, Crosshair, TestTube, CheckCircle, AlertTriangle, Route as RouteIcon } from "lucide-react";
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/language/language-selector';
import InteractiveMap from "@/components/map/interactive-map";
import RoutePlanningPanel from "@/components/route/route-planning-panel";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import { CompactThemeSelector, ThemeSelector } from "@/components/theme/theme-selector";
import { GrayscaleSelector } from "@/components/theme/grayscale-selector";
import AccessibilityTest from "@/components/theme/accessibility-test";
import UIComponentTest from "@/components/theme/ui-component-test";
import EdgeCaseTest from "@/components/theme/edge-case-test";
import AccessibilitySummary from "@/components/theme/accessibility-summary";
import { MeasurementSelector } from "@/components/measurement/measurement-selector";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { type VehicleProfile, type Route } from "@shared/schema";
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
  const [showTestingMode, setShowTestingMode] = useState(false);

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

  const handleOpenLaneSelection = () => {
    if (currentRoute) {
      setLocation(`/lane-selection/${currentRoute.id}`);
    } else {
      // Navigate to lane selection with demo route if no current route
      setLocation("/lane-selection");
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
            <LanguageSelector variant="button" />
            {selectedProfile && (
              <div className="bg-muted rounded-lg px-3 py-2 text-xs" data-testid="vehicle-profile-display">
                <span className="font-medium text-foreground">
                  {formatHeight(selectedProfile.height)} H × {formatHeight(selectedProfile.width)} W
                </span>
                <span className="text-muted-foreground ml-1">{formatWeight(selectedProfile.weight || 0)}</span>
              </div>
            )}
            <MeasurementSelector variant="compact" />
            <CompactThemeSelector data-testid="header-theme-selector" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTestingMode(!showTestingMode)}
              data-testid="button-testing-mode"
              className={showTestingMode ? "bg-secondary" : ""}
            >
              <TestTube className="w-4 h-4" />
            </Button>
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
      {!showTestingMode ? (
        <div className="flex flex-col md:flex-row min-h-screen">
          {/* Route Planning Panel */}
          <div className="w-full md:w-96 bg-card md:border-r border-b md:border-b-0">
            <RoutePlanningPanel
              fromLocation={fromLocation}
              toLocation={toLocation}
              onFromLocationChange={setFromLocation}
              onToLocationChange={setToLocation}
              onPlanRoute={handlePlanRoute}
              onStartNavigation={handleStartNavigation}
              onOpenLaneSelection={handleOpenLaneSelection}
              currentRoute={currentRoute}
              isCalculating={calculateRouteMutation.isPending}
              selectedProfile={selectedProfile}
            />
          </div>

          {/* Map */}
          <div className="flex-1 min-h-[50vh] md:min-h-screen">
            <InteractiveMap
              currentRoute={currentRoute}
              selectedProfile={selectedProfile}
            />
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-background">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border bg-background">
              <TabsList className="w-full justify-start bg-transparent h-12 p-0 space-x-0">
                <TabsTrigger 
                  value="navigation" 
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  data-testid="tab-navigation"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Navigation
                </TabsTrigger>
                <TabsTrigger 
                  value="accessibility" 
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  data-testid="tab-accessibility"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Accessibility Testing
                </TabsTrigger>
                <TabsTrigger 
                  value="theme-controls" 
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  data-testid="tab-theme-controls"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Theme Controls
                </TabsTrigger>
                <TabsTrigger 
                  value="ui-components" 
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  data-testid="tab-ui-components"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  UI Components
                </TabsTrigger>
                <TabsTrigger 
                  value="edge-cases" 
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  data-testid="tab-edge-cases"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Edge Cases
                </TabsTrigger>
                <TabsTrigger 
                  value="summary" 
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  data-testid="tab-summary"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Summary
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="navigation" className="mt-0">
              <div className="flex flex-col md:flex-row min-h-screen">
                {/* Route Planning Panel */}
                <div className="w-full md:w-96 bg-card md:border-r border-b md:border-b-0">
                  <RoutePlanningPanel
                    fromLocation={fromLocation}
                    toLocation={toLocation}
                    onFromLocationChange={setFromLocation}
                    onToLocationChange={setToLocation}
                    onPlanRoute={handlePlanRoute}
                    onStartNavigation={handleStartNavigation}
                    onOpenLaneSelection={handleOpenLaneSelection}
                    currentRoute={currentRoute}
                    isCalculating={calculateRouteMutation.isPending}
                    selectedProfile={selectedProfile}
                  />
                </div>

                {/* Map */}
                <div className="flex-1 min-h-[50vh] md:min-h-screen">
                  <InteractiveMap
                    currentRoute={currentRoute}
                    selectedProfile={selectedProfile}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="accessibility" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <AccessibilityTest />
              </div>
            </TabsContent>

            <TabsContent value="theme-controls" className="mt-0 p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-xl font-semibold">Theme Selection</h3>
                    <p className="text-muted-foreground">
                      Test different theme modes and grayscale combinations for accessibility compliance.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ThemeSelector showGrayscale={true} />
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium">Standalone Grayscale Controls</h4>
                      <GrayscaleSelector showLabel={true} showReset={true} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="ui-components" className="mt-0 p-6">
              <div className="max-w-6xl mx-auto">
                <UIComponentTest />
              </div>
            </TabsContent>

            <TabsContent value="edge-cases" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <EdgeCaseTest />
              </div>
            </TabsContent>

            <TabsContent value="summary" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <AccessibilitySummary />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}


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
