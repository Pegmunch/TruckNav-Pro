import { useState, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  X,
  Fuel,
  CircleParking,
  Utensils,
  Bed,
  Coffee,
  Wrench,
  Camera
} from "lucide-react";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import EntertainmentPanel from "@/components/entertainment/entertainment-panel";
import { ThemeSelector } from "@/components/theme/theme-selector";
import WeatherWidget from "@/components/weather/weather-widget";
import { type VehicleProfile, type Route, type Journey, type Facility } from "@shared/schema";
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
  onCollapseToggle: () => void; // Keep for AR compatibility, but won't show separate button
  
  // Search functionality props
  coordinates?: { lat: number; lng: number };
  onSelectFacility?: (facility: Facility) => void;
  onNavigateToLocation?: (location: string) => void;
  
  // Search panel controls
  isSearchPanelOpen?: boolean;
  onToggleSearchPanel?: () => void;
  
  // AR Navigation controls
  onToggleAR?: () => void;
  isARMode?: boolean;
  arSupported?: boolean;
  
  // Settings modal controls
  showVehicleSettings?: boolean;
  onShowVehicleSettings?: (show: boolean) => void;
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
  coordinates,
  onSelectFacility,
  onNavigateToLocation,
  onToggleAR,
  isARMode = false,
  arSupported = false,
  showVehicleSettings = false,
  onShowVehicleSettings,
}: NavigationSidebarProps) {
  const { toast } = useToast();
  
  // State for Quick Picks modal components
  const [showVehicleProfileSetup, setShowVehicleProfileSetup] = useState(false);
  const [showEntertainmentPanel, setShowEntertainmentPanel] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showWeatherWidget, setShowWeatherWidget] = useState(false);

  // Current location input handling
  const [currentLocationInput, setCurrentLocationInput] = useState("");
  
  // Destination input handling
  const [destinationInput, setDestinationInput] = useState("");

  // Search functionality state
  const [facilitySearchInput, setFacilitySearchInput] = useState("");
  const [selectedPOICategory, setSelectedPOICategory] = useState<string>("");
  
  // Build search query parameters for facility search
  const buildFacilitySearchParams = () => {
    const params = new URLSearchParams();
    
    // Use provided coordinates, or fall back to a default location (London, UK)
    const lat = coordinates?.lat || 51.5074;
    const lng = coordinates?.lng || -0.1278;
    
    params.set('lat', lat.toString());
    params.set('lng', lng.toString());
    params.set('radius', '25');
    
    if (selectedPOICategory) {
      params.set('type', selectedPOICategory);
    }
    
    // Include text search query parameter
    if (facilitySearchInput.trim()) {
      params.set('q', facilitySearchInput.trim());
    }
    
    return params.toString();
  };
  
  // Facilities search query - only when there's an active POI category or search
  const searchParams = buildFacilitySearchParams();
  const shouldFetchFacilities = Boolean(
    isOpen && 
    ((selectedPOICategory && selectedPOICategory.length > 0) || 
     (facilitySearchInput && facilitySearchInput.trim().length > 0))
  );
  
  const { data: facilities = [], isLoading: isFacilitiesLoading, error: facilitiesError, refetch: refetchFacilities } = useQuery<Facility[]>({
    queryKey: ['/api/facilities', searchParams],
    queryFn: async () => {
      const response = await fetch(`/api/facilities?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch facilities: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: shouldFetchFacilities,
    retry: 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

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
    console.log('Vehicle Type clicked');
    toast({
      title: "Vehicle Type",
      description: "Opening vehicle type selector...",
    });
    setShowVehicleProfileSetup(true);
  };

  const handleVehicleSettingsClick = () => {
    console.log('Vehicle Settings clicked');
    toast({
      title: "Vehicle Settings",
      description: "Opening vehicle settings...",
    });
    onShowVehicleSettings?.(true);
  };

  const handleEntertainmentClick = () => {
    console.log('Entertainment clicked');
    toast({
      title: "Entertainment",
      description: "Opening entertainment panel...",
    });
    setShowEntertainmentPanel(true);
  };

  const handleThemeClick = () => {
    console.log('Theme clicked');
    toast({
      title: "Themes",
      description: "Opening theme selector...",
    });
    setShowThemeSelector(true);
  };

  const handleWeatherClick = () => {
    console.log('Weather clicked');
    toast({
      title: "Weather",
      description: "Opening weather widget...",
    });
    setShowWeatherWidget(true);
  };

  // Filter facilities by search query with null safety
  const filteredFacilities = (facilities || []).filter((facility: Facility) =>
    (facility.name || "").toLowerCase().includes(facilitySearchInput.toLowerCase()) ||
    (facility.address || "").toLowerCase().includes(facilitySearchInput.toLowerCase())
  );

  // Handle facility selection
  const handleFacilitySelect = (facility: Facility) => {
    onSelectFacility?.(facility);
    toast({
      title: "Facility selected",
      description: `Selected: ${facility.name}`,
    });
  };

  // POI Search handlers - now perform real searches
  const handlePOISearch = (category: string) => {
    setSelectedPOICategory(category === selectedPOICategory ? "" : category);
    setFacilitySearchInput(""); // Clear text search when selecting category
    
    if (category !== selectedPOICategory) {
      toast({
        title: `Searching for ${category.replace('_', ' ')}`,
        description: "Finding nearby locations...",
      });
    } else {
      toast({
        title: "Search cleared",
        description: "Category filter removed",
      });
    }
  };

  // Handle facility text search
  const handleFacilitySearch = () => {
    if (!facilitySearchInput.trim()) {
      toast({
        title: "Please enter search terms",
        description: "Enter a location or facility name to search for",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedPOICategory(""); // Clear category when doing text search
    
    toast({
      title: "Searching facilities",
      description: `Looking for: ${facilitySearchInput.trim()}`,
    });
  };

  // Handle facility navigation
  const handleNavigateToFacility = (facility: Facility) => {
    const locationString = `${facility.name}, ${facility.address || ''}`;
    onNavigateToLocation?.(locationString);
    onToLocationChange(locationString);
    
    toast({
      title: "Destination set",
      description: `Navigating to: ${facility.name}`,
    });
  };

  const handleTruckStopsClick = () => {
    console.log('Truck Stops clicked');
    toast({
      title: "Truck Stops",
      description: "Searching for nearby truck stops...",
    });
    handlePOISearch("truck_stop");
  };
  
  const handleFuelStationsClick = () => {
    console.log('Fuel Stations clicked');
    toast({
      title: "Fuel Stations", 
      description: "Searching for nearby fuel stations...",
    });
    handlePOISearch("fuel");
  };
  
  const handleParkingClick = () => {
    console.log('Parking clicked');
    toast({
      title: "Parking",
      description: "Searching for nearby parking...",
    });
    handlePOISearch("parking");
  };
  
  const handleRestaurantsClick = () => {
    console.log('Restaurants clicked');
    toast({
      title: "Restaurants",
      description: "Searching for nearby restaurants...",
    });
    handlePOISearch("restaurant");
  };

  return (
    <>
      {/* Sidebar Toggle Button */}
      <div
        className={cn(
          "fixed left-0 top-1/3 -translate-y-1/2 z-[45] transition-all duration-300 ease-in-out",
          isOpen 
            ? (isCollapsed ? "left-16" : "left-80") 
            : "left-0"
        )}
      >
        <Button
          onClick={onToggle}
          variant="default"
          className={cn(
            "h-16 w-8 rounded-r-lg rounded-l-lg",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "border border-border shadow-lg",
            "scalable-control-button flex flex-col items-center justify-center gap-1",
            "transform transition-all duration-300 ease-in-out cursor-pointer",
            "touch-manipulation pointer-events-auto",
            "relative overflow-hidden",
            !isOpen && "hover:scale-105"
          )}
          style={{ 
            padding: '2px 1px 2px 1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          data-testid="button-toggle-navigation-sidebar-tab"
        >
          <div className="flex flex-col items-center justify-center gap-1 pointer-events-none" style={{
            position: 'relative',
            transform: 'translate(12px, -12px)'
          }}>
            <Menu className="w-4 h-4" />
            <div className="text-xs font-medium leading-none">
              NAV
            </div>
          </div>
        </Button>
      </div>

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 h-screen bg-background border-r border-border z-[40] shadow-lg",
          "sidebar-transition",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          isCollapsed ? "w-16" : "w-80",
          "flex flex-col"
        )}
        data-testid="navigation-sidebar-panel"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30 shrink-0">
          {!isCollapsed && (
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Navigation className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="font-semibold text-foreground truncate">Navigation</h2>
            </div>
          )}
        </div>

        {/* Sidebar Content */}
        {!isCollapsed && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-scroll">
            <div className="flex flex-col space-y-4 p-4">
            
            {/* 1. Location Search Section */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Search className="w-4 h-4 mr-2 text-primary" />
                  Location Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Current Location Input */}
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
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
                      className="automotive-input"
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

                {/* Destination Input */}
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
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
                      className="automotive-input"
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

                {/* START NAVIGATION Button - Always visible when both fields have text */}
                {(currentLocationInput.trim() && destinationInput.trim()) && (
                  <Button
                    onClick={() => {
                      // Auto-search if text is entered but not yet searched
                      if (currentLocationInput.trim() && !fromLocation) {
                        onFromLocationChange(currentLocationInput.trim());
                      }
                      if (destinationInput.trim() && !toLocation) {
                        onToLocationChange(destinationInput.trim());
                      }
                      // Then plan the route
                      onPlanRoute();
                    }}
                    disabled={isCalculating}
                    size="lg"
                    className="w-full automotive-button bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                    data-testid="button-start-navigation"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        <strong>CALCULATING...</strong>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-5 h-5 mr-2" />
                        <strong>START NAVIGATION</strong>
                      </>
                    )}
                  </Button>
                )}

                {/* Location Status */}
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

            {/* 2. GPS Location Section */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Crosshair className="w-4 h-4 mr-2 text-green-600" />
                  GPS Location
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* 3. Start Navigation Button */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <Button
                  onClick={onPlanRoute}
                  disabled={!fromLocation || !toLocation || isCalculating}
                  variant="default"
                  size="lg"
                  className="w-full automotive-button h-12"
                  data-testid="button-plan-route"
                >
                  {isCalculating ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <RouteIcon className="w-5 h-5 mr-2" />
                  )}
                  {isCalculating ? "Calculating..." : "Plan Route"}
                </Button>
              </CardContent>
            </Card>

            {/* AR Navigation Toggle - Desktop */}
            {arSupported && isNavigating && onToggleAR && (
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <Button
                    onClick={onToggleAR}
                    variant={isARMode ? "default" : "outline"}
                    size="lg"
                    className={cn(
                      "w-full automotive-button h-12",
                      isARMode 
                        ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" 
                        : "hover:bg-primary/10"
                    )}
                    data-testid="button-ar-toggle-desktop"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    {isARMode ? "Exit AR Mode" : "AR Navigation"}
                  </Button>
                </CardContent>
              </Card>
            )}

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
                    className="flex flex-col h-20 p-3 gap-1 text-xs min-h-fit"
                    data-testid="button-vehicle-type"
                  >
                    <Truck className="w-5 h-5 flex-shrink-0" />
                    <span className="text-center leading-tight">Vehicle Type</span>
                  </Button>
                  
                  <Button
                    onClick={handleVehicleSettingsClick}
                    variant="outline"
                    size="sm"
                    className="flex flex-col h-20 p-3 gap-1 text-xs min-h-fit"
                    data-testid="button-vehicle-settings"
                  >
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    <span className="text-center leading-tight">Vehicle Settings</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 5. Tools & Widgets Section */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Search className="w-4 h-4 mr-2 text-purple-600" />
                  Tools & Widgets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Search & POI Section */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">POI Search</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleTruckStopsClick}
                      variant="outline"
                      size="sm"
                      className="flex flex-col h-16 p-2 gap-1 text-xs min-h-fit"
                      data-testid="button-truck-stops"
                    >
                      <Truck className="w-4 h-4 flex-shrink-0" />
                      <span className="text-center leading-tight">Truck Stops</span>
                    </Button>
                    
                    <Button
                      onClick={handleFuelStationsClick}
                      variant="outline"
                      size="sm"
                      className="flex flex-col h-16 p-2 gap-1 text-xs min-h-fit"
                      data-testid="button-fuel-stations"
                    >
                      <Fuel className="w-4 h-4 flex-shrink-0" />
                      <span className="text-center leading-tight">Fuel Stations</span>
                    </Button>
                    
                    <Button
                      onClick={handleParkingClick}
                      variant="outline"
                      size="sm"
                      className="flex flex-col h-16 p-2 gap-1 text-xs min-h-fit"
                      data-testid="button-parking"
                    >
                      <CircleParking className="w-4 h-4 flex-shrink-0" />
                      <span className="text-center leading-tight">Parking</span>
                    </Button>
                    
                    <Button
                      onClick={handleRestaurantsClick}
                      variant="outline"
                      size="sm"
                      className="flex flex-col h-16 p-2 gap-1 text-xs min-h-fit"
                      data-testid="button-restaurants"
                    >
                      <Utensils className="w-4 h-4 flex-shrink-0" />
                      <span className="text-center leading-tight">Restaurants</span>
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Widget Access Buttons */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Quick Access</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleWeatherClick}
                      variant="outline"
                      size="sm"
                      className="flex flex-col h-16 p-2 gap-1 text-xs min-h-fit"
                      data-testid="button-weather-widget"
                    >
                      <Cloud className="w-4 h-4 flex-shrink-0" />
                      <span className="text-center leading-tight">Weather</span>
                    </Button>
                    
                    <Button
                      onClick={handleEntertainmentClick}
                      variant="outline"
                      size="sm"
                      className="flex flex-col h-16 p-2 gap-1 text-xs min-h-fit"
                      data-testid="button-entertainment-widget"
                    >
                      <Music className="w-4 h-4 flex-shrink-0" />
                      <span className="text-center leading-tight">Entertainment</span>
                    </Button>
                    
                    <Button
                      onClick={handleThemeClick}
                      variant="outline"
                      size="sm"
                      className="flex flex-col h-16 p-2 gap-1 text-xs min-h-fit"
                      data-testid="button-theme-widget"
                    >
                      <Palette className="w-4 h-4 flex-shrink-0" />
                      <span className="text-center leading-tight">Themes</span>
                    </Button>
                    
                    <Button
                      onClick={handleVehicleSettingsClick}
                      variant="outline"
                      size="sm"
                      className="flex flex-col h-16 p-2 gap-1 text-xs min-h-fit"
                      data-testid="button-settings-widget"
                    >
                      <Settings className="w-4 h-4 flex-shrink-0" />
                      <span className="text-center leading-tight">Settings</span>
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Advanced Search */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Advanced Search</Label>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search facilities, locations..."
                        value={facilitySearchInput}
                        onChange={(e) => setFacilitySearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleFacilitySearch();
                          }
                        }}
                        className="pl-10 automotive-input text-sm"
                        data-testid="input-facility-search"
                      />
                    </div>
                    <Button
                      onClick={handleFacilitySearch}
                      disabled={!facilitySearchInput.trim()}
                      size="sm"
                      className="automotive-button shrink-0"
                      data-testid="button-search-facilities"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Results Section - Show when there are facilities */}
            {(selectedPOICategory || facilitySearchInput.trim()) && (
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center">
                      <Search className="w-4 h-4 mr-2 text-green-600" />
                      Search Results
                    </div>
                    <div className="flex items-center gap-2">
                      {isFacilitiesLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPOICategory("");
                          setFacilitySearchInput("");
                        }}
                        className="h-6 w-6 p-0"
                        data-testid="button-clear-search-results"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                  {isFacilitiesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-background border rounded p-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                            <div className="flex-1">
                              <div className="h-3 bg-muted rounded mb-1"></div>
                              <div className="h-2 bg-muted rounded w-3/4"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredFacilities.length > 0 ? (
                    <div className="space-y-2">
                      {filteredFacilities.slice(0, 10).map((facility) => (
                        <div key={facility.id} className="bg-background border rounded p-2 hover:border-blue-300 transition-colors">
                          <div className="flex items-start space-x-2">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center flex-shrink-0">
                              {facility.type === 'truck_stop' ? <Truck className="w-4 h-4 text-blue-600" /> :
                               facility.type === 'fuel' ? <Fuel className="w-4 h-4 text-orange-600" /> :
                               facility.type === 'parking' ? <CircleParking className="w-4 h-4 text-green-600" /> :
                               facility.type === 'restaurant' ? <Utensils className="w-4 h-4 text-red-600" /> :
                               <MapPin className="w-4 h-4 text-gray-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate" data-testid={`text-facility-name-${facility.id}`}>
                                {facility.name}
                              </div>
                              {facility.address && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {facility.address}
                                </div>
                              )}
                              <div className="flex gap-1 mt-2">
                                <Button
                                  onClick={() => handleFacilitySelect(facility)}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  data-testid={`button-select-facility-${facility.id}`}
                                >
                                  Select
                                </Button>
                                <Button
                                  onClick={() => handleNavigateToFacility(facility)}
                                  variant="default"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  data-testid={`button-navigate-facility-${facility.id}`}
                                >
                                  Navigate
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {filteredFacilities.length > 10 && (
                        <div className="text-xs text-center text-muted-foreground py-2">
                          Showing first 10 of {filteredFacilities.length} results
                        </div>
                      )}
                    </div>
                  ) : facilitiesError ? (
                    <div className="text-center py-4 space-y-2" data-testid="facilities-error-state">
                      <div className="text-sm text-red-600 dark:text-red-400">
                        ⚠️ Failed to load facilities
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Check your connection and try again
                      </div>
                      <Button
                        onClick={() => {
                          // Use React Query's refetch method for proper retry functionality
                          refetchFacilities();
                        }}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        data-testid="button-retry-facilities"
                      >
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground" data-testid="no-facilities-state">
                      No facilities found for your search
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 6. Plan Route Section */}
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

      {/* Vehicle Settings Modal - now rendered in parent component */}

      {/* Entertainment Panel */}
      <EntertainmentPanel
        isOpen={showEntertainmentPanel}
        onClose={() => setShowEntertainmentPanel(false)}
      />

      {/* Theme Selector Modal */}
      {showThemeSelector && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm max-h-[80vh] bg-background shadow-xl flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0">
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
            <CardContent className="overflow-y-auto flex-1 min-h-0">
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