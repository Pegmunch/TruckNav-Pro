import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Route, X } from 'lucide-react';
import ManualSearchPanel from '@/components/navigation/manual-search-panel';
import RoutePlanningPanel from '@/components/route/route-planning-panel';
import { useQuery } from '@tanstack/react-query';
import type { VehicleProfile, Route as RouteType } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function RouteWindow() {
  const { toast } = useToast();

  // Mock data for demonstration - in real implementation, this would sync with parent window
  const { data: vehicleProfiles = [] } = useQuery<VehicleProfile[]>({ queryKey: ['/api/vehicle-profiles'] });
  const { data: currentRoute = null } = useQuery<RouteType | null>({ queryKey: ['/api/routes/current'] });
  
  const selectedProfile = vehicleProfiles[0] || null;

  useEffect(() => {
    document.title = 'TruckNav Pro - Route Planning';
  }, []);

  const handleCloseWindow = () => {
    window.close();
  };

  const handleLocationChange = (from: string, to: string) => {
    toast({
      title: "Location Updated",
      description: `Route updated: ${from} → ${to}`
    });
  };

  const handlePlanRoute = () => {
    toast({
      title: "Planning Route",
      description: "Calculating optimal truck route..."
    });
  };

  const handleStartNavigation = () => {
    toast({
      title: "Navigation Started",
      description: "TruckNav Pro is guiding your journey"
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Window Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Route className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Route Planning</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCloseWindow}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4 max-w-4xl">
        <ManualSearchPanel
          fromLocation=""
          toLocation=""
          onFromLocationChange={(value) => handleLocationChange(value, "")}
          onToLocationChange={(value) => handleLocationChange("", value)}
          onPlanRoute={handlePlanRoute}
          onStartNavigation={handleStartNavigation}
          currentRoute={currentRoute}
          selectedProfile={selectedProfile}
          isCalculating={false}
        />

        <RoutePlanningPanel
          fromLocation=""
          toLocation=""
          onFromLocationChange={(value) => handleLocationChange(value, "")}
          onToLocationChange={(value) => handleLocationChange("", value)}
          onPlanRoute={handlePlanRoute}
          onStartNavigation={handleStartNavigation}
          currentRoute={currentRoute}
          isCalculating={false}
          selectedProfile={selectedProfile}
          isNavigating={false}
        />
      </div>
    </div>
  );
}