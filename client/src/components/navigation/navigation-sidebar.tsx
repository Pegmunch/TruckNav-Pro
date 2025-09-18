import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Truck, 
  Navigation, 
  Search,
  Route as RouteIcon,
  Menu,
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Loader2,
  MapPin,
  Crosshair,
  Palette,
  Music,
  Cloud,
  Monitor,
  X
} from "lucide-react";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import SettingsModal from "@/components/settings/settings-modal";
import EntertainmentPanel from "@/components/entertainment/entertainment-panel";
import { ThemeSelector } from "@/components/theme/theme-selector";
import WeatherWidget from "@/components/weather/weather-widget";
import { type VehicleProfile, type Route, type Journey } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface NavigationSidebarProps {
  // Route planning props
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onPlanRoute: () => void;
  onStartNavigation: () => void;
  onStopNavigation?: () => void;
  currentRoute: Route | null;
  isCalculating: boolean;
  
  // Vehicle profile props
  selectedProfile: VehicleProfile | null;
  onProfileSelect: (profile: VehicleProfile) => void;
  
  // Navigation state
  isNavigating?: boolean;
  isStartingJourney?: boolean;
  isCompletingJourney?: boolean;
  
  // Sidebar state
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
  
  // Search panel controls
  isSearchPanelOpen?: boolean;
  onToggleSearchPanel?: () => void;
}

const NavigationSidebar = memo(function NavigationSidebar({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onPlanRoute,
  onStartNavigation,
  onStopNavigation,
  currentRoute,
  isCalculating,
  selectedProfile,
  onProfileSelect,
  isNavigating = false,
  isStartingJourney = false,
  isCompletingJourney = false,
  isOpen,
  onToggle,
  isCollapsed,
  onCollapseToggle,
}: NavigationSidebarProps) {
  const { toast } = useToast();
  
  // State for Quick Picks modal components
  const [showVehicleProfileSetup, setShowVehicleProfileSetup] = useState(false);
  const [showVehicleSettings, setShowVehicleSettings] = useState(false);
  const [showEntertainmentPanel, setShowEntertainmentPanel] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showWeatherWidget, setShowWeatherWidget] = useState(false);

  // Current location input handling
  const [currentLocationInput, setCurrentLocationInput] = useState("");
  
  // Destination input handling
  const [destinationInput, setDestinationInput] = useState("");

  // Handle current location search
  const handleCurrentLocationSearch = () => {
    if (!currentLocationInput.trim()) {
      toast({
        title: "Please enter a location",
        description: "Enter a current location to search for",
        variant: "destructive"
      });
      return;
    }
    
    onFromLocationChange(currentLocationInput.trim());
    setCurrentLocationInput("");
    
    toast({
      title: "Current location set",
      description: `Starting point updated to: ${currentLocationInput.trim()}`
    });
  };

  // Handle destination search
  const handleDestinationSearch = () => {
    if (!destinationInput.trim()) {
      toast({
        title: "Please enter a destination",
        description: "Enter a destination to search for",
        variant: "destructive"
      });
      return;
    }
    
    onToLocationChange(destinationInput.trim());
    setDestinationInput("");
    
    toast({
      title: "Destination set",
      description: `Destination updated to: ${destinationInput.trim()}`
    });
  };

  // Handle use current GPS location
  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          onFromLocationChange(locationString);
          
          toast({
            title: "Current location detected",
            description: "Your current GPS location has been set as the starting point"
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: "Location access denied",
            description: "Please enable location access or enter your location manually",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services",
        variant: "destructive"
      });
    }
  };

  // Handle navigation start/stop
  const handleNavigationToggle = () => {
    if (isNavigating) {
      onStopNavigation?.();
    } else {
      // Check if route is ready
      if (currentRoute && selectedProfile) {
        onStartNavigation();
      } else {
        toast({
          title: "Route not ready",
          description: "Please set both locations and vehicle profile first",
          variant: "destructive"
        });
      }
    }
  };

  // Handle vehicle profile creation
  const handleProfileCreated = (profile: VehicleProfile) => {
    onProfileSelect(profile);
    setShowVehicleProfileSetup(false);
  };

  // Quick Picks button handlers
  const handleVehicleTypeClick = () => {
    setShowVehicleProfileSetup(true);
  };

  const handleVehicleSettingsClick = () => {
    setShowVehicleSettings(true);
  };

  const handleEntertainmentClick = () => {
    setShowEntertainmentPanel(true);
  };

  const handleThemeClick = () => {
    setShowThemeSelector(true);
  };

  const handleWeatherClick = () => {
    setShowWeatherWidget(true);
  };

  return (
    <>
      {/* Sidebar Toggle Button */}
      <div
        className={cn(
          "fixed left-0 top-1/3 -translate-y-1/2 z-30 transition-all duration-300 ease-in-out",
          isOpen 
            ? (isCollapsed ? "left-16" : "left-80") 
            : "left-0"
        )}
      >
        <Button
          onClick={onToggle}
          variant="default"
          className={cn(
            "h-16 w-8 rounded-r-lg rounded-l-lg px-0 py-0",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "border border-border shadow-lg",
            "scalable-control-button flex flex-col items-center justify-center gap-1",
            "transform transition-all duration-300 ease-in-out",
            !isOpen && "hover:scale-105"
          )}
          data-testid="button-toggle-navigation-sidebar-tab"
        >
          <Menu className="w-4 h-4" />
          <div className="text-xs font-medium leading-none">
            NAV
          </div>
        </Button>
      </div>

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 h-screen bg-background border-r border-border z-30 shadow-lg",
          "automotive-layout sidebar-transition",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          isCollapsed ? "w-16" : "w-80",
          "flex flex-col"
        )}
        data-testid="navigation-sidebar-panel"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          {!isCollapsed && (
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Navigation className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="font-semibold text-foreground truncate">Navigation</h2>
            </div>
          )}
          
          <div className="flex items-center ml-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onCollapseToggle}
              className="scalable-control-button h-9 w-9"
              data-testid="button-collapse-navigation-sidebar"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar Content */}
        {!isCollapsed && (
          <div className="flex-1 flex flex-col overflow-y-auto space-y-4 p-4">
            
            {/* 1. Current Location Section */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-green-600" />
                  Current Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Crosshair className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter your current location..."
                      value={currentLocationInput}
                      onChange={(e) => setCurrentLocationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCurrentLocationSearch();
                        }
                      }}
                      className="pl-10 automotive-input"
                      data-testid="input-current-location"
                    />
                  </div>
                  <Button
                    onClick={handleCurrentLocationSearch}
                    disabled={!currentLocationInput.trim()}
                    size="sm"
                    className="automotive-button shrink-0"
                    data-testid="button-search-current-location"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                
                <Button
                  onClick={handleUseCurrentLocation}
                  variant="outline"
                  size="sm"
                  className="w-full automotive-button"
                  data-testid="button-use-current-location"
                >
                  <Crosshair className="w-4 h-4 mr-2" />
                  Use GPS Location
                </Button>

                {fromLocation && (
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-xs text-muted-foreground">From: {fromLocation}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFromLocationChange('')}
                      className="h-6 w-6 p-0"
                      data-testid="button-clear-from-location"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Destination Section */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Navigation className="w-4 h-4 mr-2 text-red-600" />
                  Destination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Navigation className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter your destination..."
                      value={destinationInput}
                      onChange={(e) => setDestinationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleDestinationSearch();
                        }
                      }}
                      className="pl-10 automotive-input"
                      data-testid="input-destination"
                    />
                  </div>
                  <Button
                    onClick={handleDestinationSearch}
                    disabled={!destinationInput.trim()}
                    size="sm"
                    className="automotive-button shrink-0"
                    data-testid="button-search-destination"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {toLocation && (
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-xs text-muted-foreground">To: {toLocation}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToLocationChange('')}
                      className="h-6 w-6 p-0"
                      data-testid="button-clear-to-location"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Start Navigation Button */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <Button
                  onClick={handleNavigationToggle}
                  disabled={!currentRoute || !selectedProfile || isStartingJourney || isCompletingJourney}
                  variant={isNavigating ? "destructive" : "default"}
                  size="lg"
                  className="w-full automotive-button h-12"
                  data-testid="button-start-navigation"
                >
                  {isStartingJourney || isCompletingJourney ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : isNavigating ? (
                    <Square className="w-5 h-5 mr-2" />
                  ) : (
                    <Play className="w-5 h-5 mr-2" />
                  )}
                  {isStartingJourney ? "Starting..." : 
                   isCompletingJourney ? "Stopping..." :
                   isNavigating ? "Stop Navigation" : "Start Navigation"}
                </Button>
              </CardContent>
            </Card>

            {/* 4. Quick Picks Section */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Menu className="w-4 h-4 mr-2 text-primary" />
                  Quick Picks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleVehicleTypeClick}
                    variant="outline"
                    size="sm"
                    className="automotive-button flex flex-col h-16 p-2"
                    data-testid="button-vehicle-type"
                  >
                    <Truck className="w-5 h-5 mb-1" />
                    <span className="text-xs">Vehicle Type</span>
                  </Button>
                  
                  <Button
                    onClick={handleVehicleSettingsClick}
                    variant="outline"
                    size="sm"
                    className="automotive-button flex flex-col h-16 p-2"
                    data-testid="button-vehicle-settings"
                  >
                    <Settings className="w-5 h-5 mb-1" />
                    <span className="text-xs">Vehicle Settings</span>
                  </Button>
                  
                  <Button
                    onClick={handleEntertainmentClick}
                    variant="outline"
                    size="sm"
                    className="automotive-button flex flex-col h-16 p-2"
                    data-testid="button-entertainment"
                  >
                    <Music className="w-5 h-5 mb-1" />
                    <span className="text-xs">Entertainment</span>
                  </Button>
                  
                  <Button
                    onClick={handleThemeClick}
                    variant="outline"
                    size="sm"
                    className="automotive-button flex flex-col h-16 p-2"
                    data-testid="button-theme"
                  >
                    <Palette className="w-5 h-5 mb-1" />
                    <span className="text-xs">Theme</span>
                  </Button>
                </div>
                
                <Button
                  onClick={handleWeatherClick}
                  variant="outline"
                  size="sm"
                  className="w-full automotive-button flex items-center h-12"
                  data-testid="button-weather"
                >
                  <Cloud className="w-5 h-5 mr-2" />
                  Weather
                </Button>
              </CardContent>
            </Card>

            {/* 5. Plan Route Section */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <RouteIcon className="w-4 h-4 mr-2 text-blue-600" />
                  Plan Route
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Plan Route Simulation Window */}
                <div className="bg-background border rounded p-3 min-h-[100px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Route Simulation</span>
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  {currentRoute ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Distance:</span>
                        <span className="font-medium" data-testid="text-route-distance">
                          {currentRoute.distance ? (currentRoute.distance / 1000).toFixed(1) : '0'} km
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">
                          {currentRoute.duration ? Math.round(currentRoute.duration / 60) : '0'} min
                        </span>
                      </div>
                      <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded text-xs text-green-700 dark:text-green-300">
                        Route ready for navigation
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
                      {fromLocation && toLocation ? 
                        "Click Plan Route to calculate" : 
                        "Set locations to plan route"
                      }
                    </div>
                  )}
                </div>

                {/* Plan Route Button */}
                <Button
                  onClick={onPlanRoute}
                  disabled={!fromLocation || !toLocation || isCalculating}
                  variant="default"
                  size="lg"
                  className="w-full automotive-button h-12"
                  data-testid="button-plan-route"
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Planning Route...
                    </>
                  ) : (
                    <>
                      <RouteIcon className="w-5 h-5 mr-2" />
                      Plan Route
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Vehicle Profile Status */}
            {selectedProfile && (
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {selectedProfile.name}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {selectedProfile.type.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}

        {/* Collapsed Icon State */}
        {isCollapsed && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-2">
            <Button
              onClick={onToggle}
              variant="ghost"
              size="icon"
              className="w-10 h-10 scalable-control-button"
              data-testid="button-expand-navigation-sidebar"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={onToggle}
          data-testid="navigation-sidebar-overlay"
        />
      )}

      {/* Quick Picks Modal Components */}
      
      {/* Vehicle Profile Setup Modal */}
      {showVehicleProfileSetup && (
        <VehicleProfileSetup
          onClose={() => setShowVehicleProfileSetup(false)}
          onProfileCreated={handleProfileCreated}
          currentProfile={selectedProfile}
        />
      )}

      {/* Vehicle Settings Modal */}
      <SettingsModal
        open={showVehicleSettings}
        onOpenChange={setShowVehicleSettings}
      />

      {/* Entertainment Panel */}
      <EntertainmentPanel
        isOpen={showEntertainmentPanel}
        onClose={() => setShowEntertainmentPanel(false)}
      />

      {/* Theme Selector Modal */}
      {showThemeSelector && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-background shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center">
                <Palette className="w-5 h-5 mr-2 text-primary" />
                Theme Settings
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowThemeSelector(false)}
                data-testid="button-close-theme"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <ThemeSelector
                showLabels={true}
                showGrayscale={true}
                showColorSpectrum={true}
                showAutoSettings={true}
                className="space-y-4"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weather Widget */}
      <WeatherWidget
        isOpen={showWeatherWidget}
        onClose={() => setShowWeatherWidget(false)}
      />
    </>
  );
});

export default NavigationSidebar;