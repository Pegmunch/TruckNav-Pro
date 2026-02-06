import { useState, memo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
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
  Camera,
  AlertTriangle,
  Store,
  ShoppingCart,
  CheckCircle,
  Eye,
  Mic,
  MessageCircle,
  History,
  MapPinned
} from "lucide-react";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import EntertainmentPanel from "@/components/entertainment/entertainment-panel";
import { ThemeSelector } from "@/components/theme/theme-selector";
import WeatherWidget from "@/components/weather/weather-widget";
import VoiceNavigationPanel from "@/components/navigation/voice-navigation-panel";
import { type VehicleProfile, type Route, type Journey, type Facility } from "@shared/schema";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import IncidentReportingForm from "@/components/traffic/incident-reporting-form";
import { useGPS } from "@/contexts/gps-context";
import { reverseGeocode, formatCoordinatesAsAddress } from "@/lib/reverse-geocode";
import { useDestinationHistory } from "@/hooks/use-destination-history";
import { useOriginHistory } from "@/hooks/use-origin-history";

interface NavigationSidebarProps {
  // Route planning props
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onFromCoordinatesChange?: (coords: {lat: number, lng: number} | null) => void;
  onToCoordinatesChange?: (coords: {lat: number, lng: number} | null) => void;
  onPlanRoute: (routePreference?: 'fastest' | 'eco' | 'avoid_tolls') => void;
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
  
  // Route preview toggle
  showRoutePreview?: boolean;
  onRoutePreviewToggle?: (enabled: boolean) => void;
  
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
  
  // Lane guidance controls
  onShowLaneGuidance?: () => void;
  
  // Settings modal controls
  showVehicleSettings?: boolean;
  onShowVehicleSettings?: (show: boolean) => void;
}

const NavigationSidebar = memo(function NavigationSidebar({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onFromCoordinatesChange,
  onToCoordinatesChange,
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
  onShowLaneGuidance,
  showVehicleSettings = false,
  onShowVehicleSettings,
  showRoutePreview = true,
  onRoutePreviewToggle,
}: NavigationSidebarProps) {
  const gpsData = useGPS();
  
  // State for Quick Picks modal components
  const [showVehicleProfileSetup, setShowVehicleProfileSetup] = useState(false);
  const [showEntertainmentPanel, setShowEntertainmentPanel] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showWeatherWidget, setShowWeatherWidget] = useState(false);
  const [showIncidentReporting, setShowIncidentReporting] = useState(false);
  const [showVoiceNavigation, setShowVoiceNavigation] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [fromCoordinates, setFromCoordinates] = useState<{lat: number, lng: number} | null>(null);

  // Search functionality state
  const [facilitySearchInput, setFacilitySearchInput] = useState("");
  const [selectedPOICategory, setSelectedPOICategory] = useState<string>("");
  
  // Route preference selection
  const [routePreference, setRoutePreference] = useState<'fastest' | 'eco' | 'avoid_tolls'>('fastest');
  
  // Recent destinations and origins
  const { destinations: previousDestinations } = useDestinationHistory();
  const { origins: previousOrigins } = useOriginHistory();
  
  // Track the coordinates from the "From" field for POI searches
  const handleFromCoordinatesUpdate = (coords: {lat: number, lng: number} | null) => {
    setFromCoordinates(coords);
    onFromCoordinatesChange?.(coords);
  };

  // Get saved POI radius from localStorage
  const getPoiRadius = () => {
    try {
      const mapPrefs = localStorage.getItem('trucknav_map_preferences');
      if (mapPrefs) {
        const prefs = JSON.parse(mapPrefs);
        return prefs.poiSearchRadius || 10; // Default to 10km (6 miles)
      }
    } catch (error) {
      console.warn('Failed to load POI radius:', error);
    }
    return 10; // Default to 10km (6 miles)
  };
  
  // Build search query parameters for facility search
  const buildFacilitySearchParams = () => {
    const params = new URLSearchParams();
    
    // Prioritize fromCoordinates (from the "Current Location" field) when available
    // This ensures shop search uses the location the user typed in
    const gpsPosition = gpsData?.position;
    const manualLocation = gpsData?.manualLocation;
    const lat = fromCoordinates?.lat || gpsPosition?.latitude || manualLocation?.latitude || coordinates?.lat;
    const lng = fromCoordinates?.lng || gpsPosition?.longitude || manualLocation?.longitude || coordinates?.lng;
    
    // Only proceed if we have valid coordinates
    if (!lat || !lng) {
      console.log('[NAV-SIDEBAR] No GPS or coordinates available for search');
      return null;
    }
    
    const source = fromCoordinates ? 'Current Location field' : gpsPosition ? 'GPS' : manualLocation ? 'Manual' : 'Provided';
    console.log(`[NAV-SIDEBAR] Building search with ${source} location:`, { lat, lng });
    params.set('lat', lat.toString());
    params.set('lng', lng.toString());
    params.set('radius', getPoiRadius().toString());
    
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
    searchParams && // Only search if we have valid GPS coordinates
    ((selectedPOICategory && selectedPOICategory.length > 0) || 
     (facilitySearchInput && facilitySearchInput.trim().length > 0))
  );
  
  const { data: facilities = [], isLoading: isFacilitiesLoading, error: facilitiesError, refetch: refetchFacilities } = useQuery<Facility[]>({
    queryKey: ['/api/poi-search', searchParams],
    queryFn: async () => {
      const response = await fetch(`/api/poi-search?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch POIs: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: shouldFetchFacilities,
    retry: 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });


  // Handle use current GPS location with reverse geocoding
  const handleUseCurrentLocation = async () => {
    // If GPS data already exists, use it
    if (gpsData?.position) {
      const { latitude, longitude } = gpsData.position;
      
      setIsReverseGeocoding(true);

      try {
        // Attempt reverse geocoding with 5 second timeout
        const result = await reverseGeocode(latitude, longitude, 5000);

        if (result.success) {
          // Success: Set the reverse geocoded address AND coordinates
          onFromLocationChange(result.address);
          handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
        } else {
          // Error result from reverse geocoding
          const coordsString = formatCoordinatesAsAddress(latitude, longitude);
          onFromLocationChange(coordsString);
          handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
        }
      } catch (error) {
        // Unexpected error: Fallback to coordinates
        const coordsString = formatCoordinatesAsAddress(latitude, longitude);
        onFromLocationChange(coordsString);
        handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
      } finally {
        setIsReverseGeocoding(false);
      }
    } else if (gpsData?.manualLocation) {
      // Use manual location if available
      const { latitude, longitude, address } = gpsData.manualLocation;
      onFromLocationChange(address || formatCoordinatesAsAddress(latitude, longitude));
      handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
    } else {
      // No GPS or manual location - actively request GPS
      setIsReverseGeocoding(true);
      
      if (!navigator.geolocation) {
        console.warn("GPS not supported - browser doesn't support geolocation");
        setIsReverseGeocoding(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Attempt reverse geocoding with 5 second timeout
            const result = await reverseGeocode(latitude, longitude, 5000);

            if (result.success) {
              onFromLocationChange(result.address);
              handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
            } else {
              const coordsString = formatCoordinatesAsAddress(latitude, longitude);
              onFromLocationChange(coordsString);
              handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
            }
          } catch (error) {
            const coordsString = formatCoordinatesAsAddress(latitude, longitude);
            onFromLocationChange(coordsString);
            handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
          } finally {
            setIsReverseGeocoding(false);
          }
        },
        (error) => {
          setIsReverseGeocoding(false);
          
          let errorMessage = "Unable to get your location";
          let errorDescription = "Please check your GPS settings";
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location permission denied";
              errorDescription = "Please allow location access for this website";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location unavailable";
              errorDescription = "GPS signal not available. Try moving to an open area";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timeout";
              errorDescription = "GPS is taking too long. Please try again";
              break;
          }
          
          console.warn(`GPS Error: ${errorMessage} - ${errorDescription}`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
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
        console.warn("Route not ready - Please set both locations and vehicle profile first");
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
    console.log('Lane Guidance clicked');
    onShowLaneGuidance?.();
  };

  const handleVehicleSettingsClick = () => {
    console.log('Vehicle Settings clicked');
    onShowVehicleSettings?.(true);
  };

  const handleEntertainmentClick = () => {
    console.log('Entertainment clicked');
    setShowEntertainmentPanel(true);
  };

  const handleThemeClick = () => {
    console.log('Theme clicked');
    setShowThemeSelector(true);
  };

  const handleWeatherClick = () => {
    console.log('Weather clicked');
    setShowWeatherWidget(true);
  };

  const handleIncidentReportClick = () => {
    console.log('Incident Report clicked');
    setShowIncidentReporting(true);
  };

  // Filter facilities by search query with null safety
  const filteredFacilities = (facilities || []).filter((facility: Facility) =>
    (facility.name || "").toLowerCase().includes(facilitySearchInput.toLowerCase()) ||
    (facility.address || "").toLowerCase().includes(facilitySearchInput.toLowerCase())
  );

  // Handle facility selection
  const handleFacilitySelect = (facility: Facility) => {
    onSelectFacility?.(facility);
    console.log(`Facility selected: ${facility.name}`);
  };

  // POI Search handlers - now perform real searches
  const handlePOISearch = (category: string) => {
    // Check if we have any location available
    const hasLocation = Boolean(
      gpsData?.position || 
      gpsData?.manualLocation || 
      coordinates
    );
    
    setSelectedPOICategory(category === selectedPOICategory ? "" : category);
    setFacilitySearchInput(""); // Clear text search when selecting category
    
    if (category !== selectedPOICategory) {
      if (hasLocation) {
        const source = gpsData?.position ? 'GPS' : gpsData?.manualLocation ? 'your location' : 'route location';
        console.log(`Searching for ${category.replace('_', ' ')} using ${source}...`);
      } else {
        console.log(`${category.replace('_', ' ')} search ready - need location`);
      }
    } else {
      console.log("Search category cleared");
    }
  };

  // Handle facility text search
  const handleFacilitySearch = () => {
    if (!facilitySearchInput.trim()) {
      console.log({
        title: "Please enter search terms",
        description: "Enter a location or facility name to search for",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedPOICategory(""); // Clear category when doing text search
    
    console.log({
      title: "Searching facilities",
      description: `Looking for: ${facilitySearchInput.trim()}`,
    });
  };

  // Handle facility navigation
  const handleNavigateToFacility = (facility: Facility) => {
    const locationString = `${facility.name}, ${facility.address || ''}`;
    onNavigateToLocation?.(locationString);
    onToLocationChange(locationString);
    
    console.log({
      title: "Destination set",
      description: `Navigating to: ${facility.name}`,
    });
  };

  const handleTruckStopsClick = () => {
    console.log('Truck Stops clicked');
    console.log({
      title: "Truck Stops",
      description: "Searching for nearby truck stops...",
    });
    handlePOISearch("truck_stop");
  };
  
  const handleFuelStationsClick = () => {
    console.log('Fuel Stations clicked');
    console.log({
      title: "Fuel Stations", 
      description: "Searching for nearby fuel stations...",
    });
    handlePOISearch("fuel");
  };
  
  const handleParkingClick = () => {
    console.log('Parking clicked');
    console.log({
      title: "Parking",
      description: "Searching for nearby parking...",
    });
    handlePOISearch("parking");
  };
  
  const handleRestaurantsClick = () => {
    console.log('Restaurants clicked');
    console.log({
      title: "Restaurants",
      description: "Searching for nearby restaurants...",
    });
    handlePOISearch("restaurant");
  };
  
  const handleShopsClick = () => {
    console.log('Shops clicked');
    handlePOISearch("shop");
  };

  const handleSupermarketsClick = () => {
    console.log('Supermarkets clicked');
    handlePOISearch("supermarket");
  };

  return (
    <>
      {/* Sidebar Toggle Button - Expanded clickable area */}
      <div
        className={cn(
          "fixed left-0 top-1/3 -translate-y-1/2 z-[45] transition-all duration-300 ease-in-out",
          isOpen 
            ? (isCollapsed ? "left-16" : "left-80") 
            : "left-0"
        )}
      >
        <div
          onClick={(e) => {
            console.log('🍔 HAMBURGER BUTTON CLICKED!', {
              clickX: e.clientX,
              clickY: e.clientY,
              buttonBounds: e.currentTarget.getBoundingClientRect(),
              timestamp: new Date().toISOString()
            });
            onToggle();
          }}
          onMouseEnter={(e) => {
            console.log('🍔 HAMBURGER HOVER IN', {
              mouseX: e.clientX,
              mouseY: e.clientY,
              buttonBounds: e.currentTarget.getBoundingClientRect()
            });
          }}
          className={cn(
            "h-16 w-8 rounded-r-lg rounded-l-lg",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "border border-border shadow-lg",
            "scalable-control-button flex flex-col items-center justify-center gap-1",
            "transform transition-all duration-300 ease-in-out cursor-pointer",
            "touch-manipulation pointer-events-auto select-none",
            !isOpen && "hover:scale-105"
          )}
          data-testid="button-toggle-navigation-sidebar-tab"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
            margin: '0'
          }}
        >
          <Menu className="w-4 h-4 pointer-events-none" />
          <div className="text-xs font-medium leading-none pointer-events-none">
            NAV
          </div>
        </div>
      </div>

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 h-screen bg-white border-r border-border z-[40] shadow-lg",
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

        {/* Sticky Top Start Navigation Button */}
        {/* CRITICAL FIX: Only show Start button when not navigating - navigation UI has its own controls */}
        {!isCollapsed && !isNavigating && (
          <div className="sticky top-0 z-20 bg-card px-3 pt-3 pb-2 border-b border-border/50">
            <Button
              onClick={() => {
                console.warn('[START_NAV_DEBUG] Button conditions:', {
                  currentRoute: !!currentRoute,
                  selectedProfile: !!selectedProfile, 
                  fromLocation: !!fromLocation,
                  toLocation: !!toLocation,
                  isStartingJourney,
                  disabled: !currentRoute || !selectedProfile || isStartingJourney
                });
                if (currentRoute && selectedProfile) {
                  onStartNavigation();
                } else {
                  console.log({
                    title: "Route required",
                    description: "Set both locations and vehicle profile to calculate a route",
                    variant: "destructive"
                  });
                }
              }}
              disabled={!currentRoute || !selectedProfile || isStartingJourney}
              aria-label="Start turn-by-turn navigation with selected route"
              aria-busy={isStartingJourney}
              size="lg"
              className={cn(
                "w-full h-11 text-sm font-bold rounded-lg shadow-xl transition-all duration-200",
                "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white",
                "border-2 border-blue-400/50 hover:scale-105 active:scale-95",
                "focus-visible:ring-4 focus-visible:ring-blue-500",
                currentRoute && selectedProfile && "ring-4 ring-blue-400/60 shadow-2xl shadow-blue-500/50"
              )}
              data-testid="button-start-navigation-top"
            >
              {isStartingJourney ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Starting Navigation...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5 mr-2" />
                  Start Navigation
                </>
              )}
            </Button>
            
            {/* Route Preview Toggle - Only show during navigation */}
            {isNavigating && typeof onRoutePreviewToggle === 'function' && (
              <div className="mt-3 px-3 pb-2">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="route-preview-toggle" className="text-sm font-medium">
                      Route Preview
                    </Label>
                  </div>
                  <Switch
                    id="route-preview-toggle"
                    checked={showRoutePreview || false}
                    onCheckedChange={(checked) => onRoutePreviewToggle?.(checked)}
                    data-testid="switch-route-preview"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sidebar Content */}
        {!isCollapsed && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-scroll">
            <div className="flex flex-col space-y-3 p-3">
            
            {/* Plan Your Route - Consolidated input section matching mobile design */}
            <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-500" />
                  Plan Your Route
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {isCalculating ? "Calculating your route..." : 
                   currentRoute ? "Route ready - tap Start to begin" : 
                   "Enter start and destination"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                {/* From Location */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">From</Label>
                  <div className="relative">
                    <AddressAutocomplete
                      value={fromLocation}
                      onChange={onFromLocationChange}
                      onCoordinatesChange={handleFromCoordinatesUpdate}
                      placeholder="Search address, postcode, or POI..."
                      id="current-location-input"
                      testId="input-current-location"
                      className="h-10 text-sm"
                      showSearchTypeToggles={false}
                    />
                    {fromLocation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFromLocationChange('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        data-testid="button-clear-from-location"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {/* Use Current Location button + Recent Origins */}
                  <div className="flex items-center gap-2">
                    {!fromLocation && (
                      <Button
                        onClick={handleUseCurrentLocation}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-blue-300 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2"
                        disabled={isReverseGeocoding}
                        data-testid="button-use-current-location"
                      >
                        {isReverseGeocoding ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Finding address...
                          </>
                        ) : (
                          <>
                            <Crosshair className="w-3 h-3 mr-1" />
                            Use Current Location
                          </>
                        )}
                      </Button>
                    )}
                    {previousOrigins.length > 0 && !fromLocation && (
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {previousOrigins.slice(0, 2).map((origin) => (
                          <Button
                            key={origin.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onFromLocationChange(origin.formattedAddress);
                              handleFromCoordinatesUpdate(origin.coordinates);
                            }}
                            className="h-7 text-xs px-2 bg-muted/30 hover:bg-muted/50 whitespace-nowrap max-w-[120px] truncate"
                          >
                            <MapPinned className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{origin.label}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* To Location */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    <span>To</span>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onPlanRoute(routePreference)}
                      disabled={!fromLocation || !toLocation || !selectedProfile || isCalculating}
                      className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                      data-testid="button-preview-route-desktop"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </Label>
                  <div className="relative">
                    <AddressAutocomplete
                      value={toLocation}
                      onChange={onToLocationChange}
                      onCoordinatesChange={onToCoordinatesChange}
                      placeholder="Search destination..."
                      id="destination-input"
                      testId="input-destination"
                      className="h-10 text-sm"
                    />
                    {toLocation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToLocationChange('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        data-testid="button-clear-to-location"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Route Preferences - Fastest/Eco/No Tolls */}
                <Tabs
                  value={routePreference}
                  onValueChange={(value) => setRoutePreference(value as 'fastest' | 'eco' | 'avoid_tolls')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3 h-9">
                    <TabsTrigger value="fastest" className="text-xs" data-testid="tab-fastest-desktop">
                      Fastest
                    </TabsTrigger>
                    <TabsTrigger value="eco" className="text-xs" data-testid="tab-eco-desktop">
                      Eco
                    </TabsTrigger>
                    <TabsTrigger value="avoid_tolls" className="text-xs" data-testid="tab-avoid-tolls-desktop">
                      No Tolls
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Recent Destinations - Quick Access */}
                {previousDestinations.length > 0 && !toLocation && (
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                      <History className="h-3 w-3 text-purple-500" />
                      Recent Destinations
                    </Label>
                    <div className="space-y-1 max-h-[100px] overflow-y-auto">
                      {previousDestinations.slice(0, 3).map((dest) => (
                        <div
                          key={dest.id}
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all"
                          onClick={() => {
                            onToLocationChange(dest.formattedAddress);
                            onToCoordinatesChange?.(dest.coordinates);
                          }}
                        >
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{dest.label}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{dest.formattedAddress}</div>
                          </div>
                          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Route Status - Inline indicator */}
                {(isCalculating || currentRoute) && (
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-xs",
                    currentRoute ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  )}>
                    {isCalculating ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Calculating route...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>Route ready</span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AR Navigation Toggle - Desktop */}
            {arSupported && isNavigating && onToggleAR && (
              <Button
                onClick={onToggleAR}
                variant={isARMode ? "default" : "outline"}
                size="sm"
                className={cn(
                  "w-full h-9",
                  isARMode 
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" 
                    : "hover:bg-primary/10"
                )}
                data-testid="button-ar-toggle-desktop"
              >
                <Camera className="w-4 h-4 mr-2" />
                {isARMode ? "Exit AR Mode" : "AR Navigation"}
              </Button>
            )}

            {/* Quick Actions - Simplified grid */}
            <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Search className="w-4 h-4 text-purple-500" />
                  Find Nearby
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={handleTruckStopsClick}
                    variant={selectedPOICategory === 'truck_stop' ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex flex-col h-14 p-2 gap-1 text-xs",
                      selectedPOICategory !== 'truck_stop' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    data-testid="button-truck-stops"
                  >
                    <Truck className="w-4 h-4" />
                    <span className="text-[10px]">Truck Stops</span>
                  </Button>
                  
                  <Button
                    onClick={handleFuelStationsClick}
                    variant={selectedPOICategory === 'fuel' ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex flex-col h-14 p-2 gap-1 text-xs",
                      selectedPOICategory !== 'fuel' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    data-testid="button-fuel-stations"
                  >
                    <Fuel className="w-4 h-4" />
                    <span className="text-[10px]">Fuel</span>
                  </Button>
                  
                  <Button
                    onClick={handleParkingClick}
                    variant={selectedPOICategory === 'parking' ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex flex-col h-14 p-2 gap-1 text-xs",
                      selectedPOICategory !== 'parking' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    data-testid="button-parking"
                  >
                    <CircleParking className="w-4 h-4" />
                    <span className="text-[10px]">Parking</span>
                  </Button>
                  
                  <Button
                    onClick={handleRestaurantsClick}
                    variant={selectedPOICategory === 'restaurant' ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex flex-col h-14 p-2 gap-1 text-xs",
                      selectedPOICategory !== 'restaurant' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    data-testid="button-restaurants"
                  >
                    <Utensils className="w-4 h-4" />
                    <span className="text-[10px]">Food</span>
                  </Button>
                  
                  <Button
                    onClick={handleShopsClick}
                    variant={selectedPOICategory === 'shop' ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex flex-col h-14 p-2 gap-1 text-xs",
                      selectedPOICategory !== 'shop' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    data-testid="button-shops"
                  >
                    <Store className="w-4 h-4" />
                    <span className="text-[10px]">Shops</span>
                  </Button>

                  <Button
                    onClick={handleSupermarketsClick}
                    variant={selectedPOICategory === 'supermarket' ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex flex-col h-14 p-2 gap-1 text-xs",
                      selectedPOICategory !== 'supermarket' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    data-testid="button-supermarkets"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span className="text-[10px]">Markets</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tools Card - Simplified */}
            <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={handleWeatherClick}
                    variant="ghost"
                    size="sm"
                    className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                    data-testid="button-weather-widget"
                  >
                    <Cloud className="w-4 h-4" />
                    <span className="text-[10px]">Weather</span>
                  </Button>
                  
                  <Button
                    onClick={handleEntertainmentClick}
                    variant="ghost"
                    size="sm"
                    className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                    data-testid="button-entertainment-widget"
                  >
                    <Music className="w-4 h-4" />
                    <span className="text-[10px]">Media</span>
                  </Button>
                  
                  <Button
                    onClick={handleThemeClick}
                    variant="ghost"
                    size="sm"
                    className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                    data-testid="button-theme-widget"
                  >
                    <Palette className="w-4 h-4" />
                    <span className="text-[10px]">Theme</span>
                  </Button>
                  
                  <Button
                    onClick={handleVehicleSettingsClick}
                    variant="ghost"
                    size="sm"
                    className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                    data-testid="button-settings-widget"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-[10px]">Settings</span>
                  </Button>
                  
                  <Button
                    onClick={handleIncidentReportClick}
                    variant="ghost"
                    size="sm"
                    className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                    data-testid="button-report-incident"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-[10px]">Report</span>
                  </Button>
                  
                  <Button
                    onClick={handleVehicleTypeClick}
                    variant="ghost"
                    size="sm"
                    className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                    data-testid="button-vehicle-type"
                  >
                    <Navigation className="w-4 h-4" />
                    <span className="text-[10px]">Lanes</span>
                  </Button>
                </div>

                {/* Advanced Search - Text search for facilities */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search facilities..."
                        value={facilitySearchInput}
                        onChange={(e) => setFacilitySearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleFacilitySearch();
                          }
                        }}
                        className="h-8 pl-8 text-xs"
                        data-testid="input-facility-search"
                      />
                    </div>
                    <Button
                      onClick={handleFacilitySearch}
                      disabled={!facilitySearchInput.trim()}
                      size="sm"
                      className="h-8 px-2.5"
                      data-testid="button-search-facilities"
                    >
                      <Search className="w-3.5 h-3.5" />
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
                               facility.type === 'shop' ? <Store className="w-4 h-4 text-purple-600" /> :
                               <MapPin className="w-4 h-4 text-gray-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-medium text-sm truncate" data-testid={`text-facility-name-${facility.id}`}>
                                  {facility.name}
                                </div>
                                {typeof (facility as any).distance === 'number' && (
                                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0">
                                    {(facility as any).distance < 1 
                                      ? `${Math.round((facility as any).distance * 1000)}m` 
                                      : `${((facility as any).distance as number).toFixed(1)}km`}
                                  </span>
                                )}
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

            {/* 6. Route Status Section */}
            {currentRoute && (
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <RouteIcon className="w-4 h-4 mr-2 text-green-600" />
                    Route Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Route Summary */}
                  <div className="bg-background border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Current Route</span>
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Distance:</span>
                        <span className="font-medium" data-testid="text-route-distance">
                          {currentRoute.distance ? `${currentRoute.distance.toFixed(1)} miles` : '0 miles'}
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
                  </div>

                  {/* Route Preferences */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Route Preference
                    </Label>
                    <ToggleGroup 
                      type="single" 
                      value={routePreference} 
                      onValueChange={(value) => {
                        if (value && (value === 'fastest' || value === 'eco' || value === 'avoid_tolls')) {
                          setRoutePreference(value);
                        }
                      }}
                      className="grid grid-cols-3 gap-1"
                      data-testid="toggle-route-preferences"
                    >
                      <ToggleGroupItem 
                        value="fastest" 
                        className="text-xs py-1 px-2 h-8"
                        data-testid="toggle-fastest"
                      >
                        Fastest
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="eco" 
                        className="text-xs py-1 px-2 h-8"
                        data-testid="toggle-eco"
                      >
                        Eco
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="avoid_tolls" 
                        className="text-xs py-1 px-2 h-8"
                        data-testid="toggle-avoid-tolls"
                      >
                        No Tolls
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Auto Route Planning Status */}
            {isCalculating && !currentRoute && (
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="text-center py-2">
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
Calculating route...
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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

      {/* Mobile Overlay - Only block clicks outside sidebar area */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-transparent z-20 lg:hidden"
          style={{ pointerEvents: 'none' }}
          data-testid="navigation-sidebar-overlay"
        >
          <div 
            className="absolute inset-0"
            style={{ 
              left: isCollapsed ? '64px' : '320px', 
              pointerEvents: 'auto' 
            }}
            onClick={onToggle}
          />
        </div>
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
        <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4">
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

      {/* Incident Reporting Form */}
      {showIncidentReporting && (
        <IncidentReportingForm
          currentLocation={coordinates}
          onClose={() => setShowIncidentReporting(false)}
          onIncidentCreated={() => {
            // Incident created successfully, could show success message
            console.log({
              title: "Incident Reported",
              description: "Your incident report has been submitted successfully.",
            });
          }}
        />
      )}
    </>
  );
});

export default NavigationSidebar;