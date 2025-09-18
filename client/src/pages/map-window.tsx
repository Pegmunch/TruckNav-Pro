import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X, 
  Navigation, 
  MapPin, 
  ArrowLeft,
  Settings,
  Route as RouteIcon,
  Truck,
  Eye,
  EyeOff
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import InteractiveMap from "@/components/map/interactive-map";
import NextManeuverGuidance from "@/components/route/next-maneuver-guidance";
import { type VehicleProfile, type Route, type Journey } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useWindowSync } from "@/hooks/use-window-sync";

export default function MapWindow() {
  const { t } = useTranslation();
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // State synchronized from main window via BroadcastChannel
  const {
    currentRoute,
    selectedProfile,
    activeJourney,
    isNavigating,
    fromLocation,
    toLocation,
    isMapWindowOpen,
    closeMapWindow
  } = useWindowSync();

  // Handle window close events
  useEffect(() => {
    const handleBeforeUnload = () => {
      closeMapWindow();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Close window on Escape key
      if (event.key === 'Escape') {
        window.close();
      }
      // Toggle fullscreen on F11
      if (event.key === 'F11') {
        event.preventDefault();
        setIsFullscreen(!isFullscreen);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);

    // Auto-expand map when route is available
    if (currentRoute) {
      setIsFullscreen(true);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentRoute, isFullscreen, closeMapWindow]);

  // Get route info for display
  const routeInfo = currentRoute ? {
    distance: currentRoute.totalDistance || 0,
    duration: currentRoute.estimatedDuration || 0,
    hasRestrictions: (currentRoute.restrictions?.length || 0) > 0
  } : null;

  const handleCloseWindow = () => {
    closeMapWindow();
    window.close();
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleToggleTrafficLayer = () => {
    setShowTrafficLayer(!showTrafficLayer);
  };

  const handleToggleIncidents = () => {
    setShowIncidents(!showIncidents);
  };

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Map Window Header - Automotive Style */}
      <div className={cn(
        "absolute top-0 left-0 right-0 bg-card border-b border-border z-40",
        "transition-transform duration-300",
        isFullscreen ? "-translate-y-full" : "translate-y-0"
      )}>
        <div className="flex items-center justify-between p-3">
          {/* Route Information */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Truck className="text-primary-foreground text-sm" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground">{t('app.name')} - Map</h1>
                {routeInfo && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round(routeInfo.distance / 1000)}km • {Math.round(routeInfo.duration / 60)}min
                    {routeInfo.hasRestrictions && " • Restrictions"}
                  </p>
                )}
              </div>
            </div>

            {/* Route Status Badge */}
            {currentRoute && (
              <Badge variant={isNavigating ? "default" : "secondary"}>
                {isNavigating ? "Navigating" : "Route Planned"}
              </Badge>
            )}
          </div>

          {/* Window Controls */}
          <div className="flex items-center space-x-2">
            {/* Layer Toggle Controls */}
            <div className="flex items-center space-x-1">
              <Button
                variant={showTrafficLayer ? "default" : "outline"}
                size="sm"
                onClick={handleToggleTrafficLayer}
                className="automotive-button text-xs"
                data-testid="button-toggle-traffic"
              >
                Traffic
              </Button>
              <Button
                variant={showIncidents ? "default" : "outline"}
                size="sm"
                onClick={handleToggleIncidents}
                className="automotive-button text-xs"
                data-testid="button-toggle-incidents"
              >
                Incidents
              </Button>
            </div>

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFullscreen}
              className="automotive-button"
              data-testid="button-toggle-fullscreen"
            >
              {isFullscreen ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>

            {/* Close Window */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseWindow}
              className="automotive-button text-destructive hover:text-destructive"
              data-testid="button-close-window"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Next Maneuver Guidance - Overlay Style */}
      {isNavigating && activeJourney && (
        <div className="absolute top-16 left-4 right-4 z-30">
          <NextManeuverGuidance
            currentRoute={currentRoute}
            activeJourney={activeJourney}
            selectedProfile={selectedProfile}
            variant="overlay"
          />
        </div>
      )}

      {/* Main Map Container */}
      <div className={cn(
        "h-full w-full",
        isFullscreen ? "pt-0" : "pt-16"
      )}>
        <InteractiveMap
          currentRoute={currentRoute}
          selectedProfile={selectedProfile}
          showTrafficLayer={showTrafficLayer}
          showIncidents={showIncidents}
          onToggleTrafficLayer={handleToggleTrafficLayer}
          onToggleIncidents={handleToggleIncidents}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          autoExpanded={!!currentRoute}
        />
      </div>

      {/* No Route Placeholder */}
      {!currentRoute && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
          <Card className="p-8 text-center max-w-md">
            <CardHeader className="pb-4">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>No Route Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Plan a route in the main navigation window to view it here.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>From:</strong> {fromLocation || "Not selected"}</p>
                <p><strong>To:</strong> {toLocation || "Not selected"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 right-4 z-30">
        <Card className="p-3 bg-card border border-border shadow-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> Close window</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">F11</kbd> Toggle fullscreen</div>
          </div>
        </Card>
      </div>
    </div>
  );
}