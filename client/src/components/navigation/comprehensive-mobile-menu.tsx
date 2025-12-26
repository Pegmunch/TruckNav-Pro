/**
 * Comprehensive Mobile Menu Panel for TruckNav Pro
 * 
 * Centralizes all app features into one mobile-friendly menu:
 * - Recent Destinations (History & Favorites)
 * - Vehicle Selection & Setup
 * - Theme & Appearance (Day/Night/Auto modes, colors)
 * - Map & POI Settings
 * - Tools (Weather, Entertainment, Voice Navigation)
 * - General Settings
 */

import { useState, memo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { 
  X,
  History,
  Bookmark,
  Truck,
  Palette,
  Map,
  Settings,
  Cloud,
  Music,
  Mic,
  ChevronRight,
  MapPin,
  Fuel,
  CircleParking,
  Utensils,
  Play,
  Trash2,
  Sun,
  Moon,
  Clock,
  Layers,
  Wrench,
  Navigation,
  MapPinned,
  Loader2,
  Store,
  ShoppingCart,
  Users,
  Crosshair,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { type Route as RouteType, type Journey, type VehicleProfile } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  useTomTomAutocomplete, 
  formatTomTomDisplay, 
  extractTomTomCoordinates,
  type TomTomResult 
} from "@/hooks/use-tomtom-autocomplete";
import { useGPS } from "@/contexts/gps-context";

// Import existing components
import { ThemeSelector } from "@/components/theme/theme-selector";
import { AutoThemeSettings } from "@/components/theme/auto-theme-settings";
import { GrayscaleSelector } from "@/components/theme/grayscale-selector";
import { ColorSpectrumPicker } from "@/components/theme/color-spectrum-picker";
import { RegionSelector } from "@/components/measurement/region-selector";
import { MeasurementSelector } from "@/components/measurement/measurement-selector";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import WeatherWidget from "@/components/weather/weather-widget";
import EntertainmentPanel from "@/components/entertainment/entertainment-panel";
import VoiceNavigationPanel from "@/components/navigation/voice-navigation-panel";
import SettingsModal from "@/components/settings/settings-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OfflineDownloadsPanel } from "@/components/navigation/offline-downloads-panel";
import { FuelPriceComparison } from "@/components/fuel/fuel-price-comparison";
import { DriverFatigueAlert } from "@/components/safety/driver-fatigue-alert";
import { LanguageSelector } from "@/components/settings/language-selector";

interface ComprehensiveMobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Route planning
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onPlanRoute: () => Promise<void>;
  onStartNavigation: () => void;
  onStopNavigation?: () => void;
  currentRoute: RouteType | null;
  isCalculating?: boolean;
  isNavigating?: boolean;
  // Vehicle
  selectedProfile: VehicleProfile | null;
  onProfileSelect: (profile: VehicleProfile) => void;
  // POI search
  coordinates?: { lat: number; lng: number };
  onSelectFacility?: (facility: any) => void;
  // Route input mode - hides tabs when entering route
  hideTabsInInputMode?: boolean;
}

function ComprehensiveMobileMenu({
  open,
  onOpenChange,
  onFromLocationChange,
  onToLocationChange,
  onPlanRoute,
  onStartNavigation,
  onStopNavigation,
  currentRoute,
  isCalculating = false,
  isNavigating = false,
  selectedProfile,
  onProfileSelect,
  coordinates,
  onSelectFacility,
  hideTabsInInputMode = false
}: ComprehensiveMobileMenuProps) {
  const { toast } = useToast();
  const { formatDistance } = useMeasurement();
  const gps = useGPS();
  const [activeTab, setActiveTab] = useState("plan");
  
  // Local state for route planning inputs - Always start empty for new route planning
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  
  // Clear inputs when menu opens (fresh start for new route)
  useEffect(() => {
    if (open) {
      setFromInput("");
      setToInput("");
      setFromCoordinates(null);
      setActivePOICategory(null);
      setPoiSearchEnabled(false);
    }
  }, [open]);
  
  // Temporary function to clear old route data
  const handleClearOldRoute = () => {
    localStorage.removeItem('activeJourneyId');
    localStorage.removeItem('trucknav_active_journey');
    // Clear any URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('journey');
    window.history.replaceState({}, '', url.pathname);
    
    // toast({
    //   title: "Route Cleared",
    //   description: "Map reset to clean state",
    // });
    
    // Refresh page to ensure clean state
    window.location.reload();
  };
  
  // Autocomplete state
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  
  // Store coordinates from "From" location for POI search
  const [fromCoordinates, setFromCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  
  // POI search state
  const [activePOICategory, setActivePOICategory] = useState<string | null>(null);
  const [poiSearchEnabled, setPoiSearchEnabled] = useState(false);
  
  // GPS location fill state
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // Dropdown positioning is handled by Radix Popover which automatically
  // handles scroll/resize and portal rendering
  
  // Handler to get current GPS location and fill the "From" field via TomTom reverse geocode
  const handleFillCurrentLocation = useCallback(async () => {
    if (isGettingLocation) return;
    
    setIsGettingLocation(true);
    
    try {
      // Get current GPS position with proper error handling
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('GPS not available on this device'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          resolve, 
          (error: GeolocationPositionError) => {
            // Convert GeolocationPositionError to Error with meaningful message
            let message = 'Could not get location';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message = 'Location permission denied. Please enable location access.';
                break;
              case error.POSITION_UNAVAILABLE:
                message = 'Location unavailable. Please try again.';
                break;
              case error.TIMEOUT:
                message = 'Location request timed out. Please try again.';
                break;
            }
            reject(new Error(message));
          }, 
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        );
      });
      
      const { latitude, longitude } = position.coords;
      
      // Use TomTom reverse geocode API
      const apiKey = import.meta.env.VITE_TOMTOM_API_KEY;
      if (!apiKey) {
        throw new Error('Location service not configured');
      }
      
      // Safely encode coordinates for URL
      const lat = encodeURIComponent(latitude.toFixed(6));
      const lon = encodeURIComponent(longitude.toFixed(6));
      
      const response = await fetch(
        `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json?key=${encodeURIComponent(apiKey)}&radius=100`
      );
      
      if (!response.ok) {
        throw new Error('Failed to find address for location');
      }
      
      const data = await response.json();
      
      if (data.addresses && data.addresses.length > 0) {
        const address = data.addresses[0].address;
        // Prefer postcode + municipality for UK addresses, or freeformAddress
        let displayAddress = '';
        
        if (address.postalCode) {
          displayAddress = address.postalCode;
          if (address.municipality) {
            displayAddress += `, ${address.municipality}`;
          }
        } else if (address.freeformAddress) {
          displayAddress = address.freeformAddress;
        } else if (address.municipality) {
          displayAddress = address.municipality;
        }
        
        if (displayAddress) {
          // Update local input state
          setFromInput(displayAddress);
          // CRITICAL: Directly set search query to bypass debounce - query needs this to fire
          setFromSearch(displayAddress);
          // Notify parent component (same as autocomplete flow)
          onFromLocationChange(displayAddress);
          // Store coordinates for POI search (same as autocomplete flow)
          setFromCoordinates({ lat: latitude, lng: longitude });
          
          // Open dropdown immediately to show it's active
          setFromOpen(true);
          
          toast({
            title: "Location Set",
            description: displayAddress,
          });
        } else {
          throw new Error('Could not determine address');
        }
      } else {
        throw new Error('No address found for this location');
      }
    } catch (error) {
      console.error('GPS location error:', error);
      // Toast removed per user request - GPS errors shown inline instead
      // Users can see GPS status in the simplified route drawer
    } finally {
      setIsGettingLocation(false);
    }
  }, [isGettingLocation, onFromLocationChange, toast]);
  
  // Debounced search for autocomplete
  useEffect(() => {
    const timer = setTimeout(() => {
      setFromSearch(fromInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [fromInput]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setToSearch(toInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [toInput]);
  
  // Get GPS coordinates for location-biased search
  const gpsCoordinates = gps?.position ? {
    lat: gps.position.latitude,
    lng: gps.position.longitude
  } : undefined;
  
  // Use "From" location coordinates for POI search if available, otherwise use GPS
  const poiSearchCoordinates = fromCoordinates || gpsCoordinates;
  
  // TomTom autocomplete for From input
  const { results: fromResults, isLoading: fromLoading } = useTomTomAutocomplete(
    fromSearch,
    fromOpen && fromSearch.length >= 3,
    undefined, // No country restriction
    undefined, // No POI category
    gpsCoordinates,
    'fuzzy' // Address search
  );
  
  // TomTom autocomplete for To input
  const { results: toResults, isLoading: toLoading } = useTomTomAutocomplete(
    toSearch,
    toOpen && toSearch.length >= 3,
    undefined, // No country restriction
    undefined, // No POI category
    gpsCoordinates,
    'fuzzy' // Address search
  );
  
  // Search query for each POI category (no categorySet - let TomTom find best matches)
  const poiSearchQueryMap: { [key: string]: string } = {
    truck_stop: 'truck stop',
    fuel: 'petrol station',
    parking: 'parking',
    restaurant: 'restaurant',
    rest_area: 'rest area',
    shops: '', // Shops use our custom /api/poi-search endpoint instead
    supermarket: 'supermarket'
  };
  
  // TomTom POI search - uses "From" location if set, otherwise GPS
  // Note: Shops use our custom endpoint, other categories use TomTom
  const { results: tomtomPoiResults, isLoading: tomtomPoiLoading } = useTomTomAutocomplete(
    activePOICategory && activePOICategory !== 'shops' ? poiSearchQueryMap[activePOICategory] : '', // Skip TomTom for shops
    poiSearchEnabled && activePOICategory !== null && activePOICategory !== 'shops', // Don't use TomTom for shops
    undefined, // No country restriction
    undefined, // No category restriction - let search query find best matches
    poiSearchCoordinates, // Use From location or GPS
    'poi', // POI search
    9656 // 6-mile radius in meters
  );
  
  // Custom shop search using our API
  const { data: shopResults = [], isLoading: shopLoading } = useQuery<any[]>({
    queryKey: ['/api/poi-search', poiSearchCoordinates?.lat, poiSearchCoordinates?.lng, 'shop'],
    queryFn: async () => {
      if (!poiSearchCoordinates?.lat || !poiSearchCoordinates?.lng) {
        return [];
      }
      const params = new URLSearchParams({
        lat: poiSearchCoordinates.lat.toString(),
        lng: poiSearchCoordinates.lng.toString(),
        radius: '10', // 10km (6 miles)
        type: 'shop'
      });
      const response = await fetch(`/api/poi-search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch shops');
      }
      return response.json();
    },
    enabled: poiSearchEnabled && activePOICategory === 'shops' && Boolean(poiSearchCoordinates),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  // Combine results based on active category
  const poiResults = activePOICategory === 'shops' 
    ? shopResults.map(shop => ({
        id: shop.id,
        type: 'POI' as const,
        score: 100,
        poi: { name: shop.name },
        address: { freeformAddress: shop.address },
        dist: shop.distance * 1000, // Convert km to meters
        position: { lat: shop.lat || shop.latitude, lon: shop.lng || shop.longitude }
      }))
    : tomtomPoiResults;
  
  const poiLoading = activePOICategory === 'shops' ? shopLoading : tomtomPoiLoading;
  
  // Modal states for sub-panels
  const [showVehicleSetup, setShowVehicleSetup] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showEntertainment, setShowEntertainment] = useState(false);
  const [showVoiceNav, setShowVoiceNav] = useState(false);
  const [showFuelPrices, setShowFuelPrices] = useState(false);
  const [showFatigueMonitor, setShowFatigueMonitor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Format duration helper
  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, []);

  // Fetch recent journeys (last 5)
  const { data: recentJourneys = [], isLoading: isLoadingJourneys } = useQuery<Journey[]>({
    queryKey: ["/api/journeys"],
    queryFn: async () => {
      const res = await fetch("/api/journeys?limit=5", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  // Fetch favorite routes
  const { data: favoriteRoutes = [], isLoading: isLoadingFavorites } = useQuery<RouteType[]>({
    queryKey: ["/api/routes", "favorites"],
    queryFn: async () => {
      const res = await fetch("/api/routes/favorites", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  // Fetch vehicle profiles
  const { data: vehicleProfiles = [], isLoading: isLoadingProfiles } = useQuery<VehicleProfile[]>({
    queryKey: ["/api/vehicle-profiles"],
    enabled: open,
  });

  // Load favorite route
  const handleLoadFavorite = useCallback((route: RouteType) => {
    setFromInput(route.startLocation);
    setToInput(route.endLocation);
    onFromLocationChange(route.startLocation);
    onToLocationChange(route.endLocation);
    // Clear stored coordinates and POI search when loading a route template
    setFromCoordinates(null);
    setActivePOICategory(null);
    setPoiSearchEnabled(false);
    setActiveTab("plan"); // Switch to plan tab to show loaded route
  }, [onFromLocationChange, onToLocationChange]);

  // Load recent journey as a template for new route
  const handleLoadJourney = useCallback(async (journey: Journey) => {
    try {
      // Fetch the route associated with this journey
      const response = await fetch(`/api/routes/${journey.routeId}`, { credentials: "include" });
      
      if (!response.ok) {
        throw new Error("Failed to fetch route");
      }
      
      const route: RouteType = await response.json();
      
      // Populate inputs with route data
      setFromInput(route.startLocation);
      setToInput(route.endLocation);
      onFromLocationChange(route.startLocation);
      onToLocationChange(route.endLocation);
      // Clear stored coordinates and POI search when loading a route template
      setFromCoordinates(null);
      setActivePOICategory(null);
      setPoiSearchEnabled(false);
      setActiveTab("plan"); // Switch to plan tab to show loaded route
    } catch (error) {
      console.error("Failed to load journey route:", error);
    }
  }, [onFromLocationChange, onToLocationChange]);

  // Delete favorite route
  const deleteFavoriteMutation = useMutation({
    mutationFn: async (routeId: string) => {
      await apiRequest("DELETE", `/api/routes/${routeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes", "favorites"] });
    },
  });

  // POI Categories including shops and supermarkets
  const poiCategories = [
    { id: 'truck_stop', label: 'Truck Stops', icon: Truck, color: 'bg-blue-500' },
    { id: 'fuel', label: 'Fuel', icon: Fuel, color: 'bg-red-500' },
    { id: 'rest_area', label: 'Rest Areas', icon: CircleParking, color: 'bg-green-500' },
    { id: 'restaurant', label: 'Food', icon: Utensils, color: 'bg-orange-500' },
    { id: 'shops', label: 'Shops', icon: Store, color: 'bg-purple-500' },
    { id: 'supermarket', label: 'Supermarkets', icon: ShoppingCart, color: 'bg-pink-500' },
  ];
  
  // Handle POI category selection
  const handlePOISearch = useCallback((categoryId: string) => {
    // Use From location coordinates if available, otherwise GPS
    const searchCenter = fromCoordinates || gpsCoordinates;
    
    console.log('[POI-SEARCH] Button clicked:', {
      categoryId,
      fromCoordinates,
      gpsCoordinates,
      searchCenter,
      gpsAvailable: !!gps?.position
    });
    
    if (!searchCenter) {
      // toast({
      //   title: "Location needed",
      //   description: "Please enter a location in the 'From' field or enable GPS to search for nearby POIs.",
      //   variant: "destructive",
      // });
      return;
    }
    
    console.log('[POI-SEARCH] Starting search with coordinates:', searchCenter);
    setActivePOICategory(categoryId);
    setPoiSearchEnabled(true);
  }, [fromCoordinates, gpsCoordinates, toast, gps]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full w-full h-[100vh] p-0 gap-0 bg-white dark:bg-gray-950 flex flex-col" data-testid="comprehensive-mobile-menu">
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b bg-white dark:bg-gray-950 flex-shrink-0 relative z-10">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">Menu</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
                aria-label="Close menu"
                data-testid="button-close-menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Close menu</span>
              </Button>
            </div>
            <DialogDescription className="sr-only">
              Comprehensive menu for route planning, destinations, vehicle profiles, theme settings, and tools
            </DialogDescription>
          </DialogHeader>

          {/* Tabbed Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            {!hideTabsInInputMode && (
              <TabsList className="w-full grid grid-cols-7 rounded-none border-b bg-gray-100 dark:bg-gray-900 h-auto p-1 flex-shrink-0">
                <TabsTrigger 
                  value="plan" 
                  className="flex flex-col gap-1 py-2 data-[state=active]:bg-background"
                  data-testid="tab-plan"
                >
                  <MapPinned className="h-4 w-4" />
                  <span className="text-xs">Plan</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="destinations" 
                  className="flex flex-col gap-1 py-2 data-[state=active]:bg-background"
                  data-testid="tab-destinations"
                >
                  <History className="h-4 w-4" />
                  <span className="text-xs">Recent</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="vehicle" 
                  className="flex flex-col gap-1 py-2 data-[state=active]:bg-background"
                  data-testid="tab-vehicle"
                >
                  <Truck className="h-4 w-4" />
                  <span className="text-xs">Vehicle</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="social" 
                  className="flex flex-col gap-1 py-2 data-[state=active]:bg-background"
                  data-testid="tab-social"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Social</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="theme" 
                  className="flex flex-col gap-1 py-2 data-[state=active]:bg-background"
                  data-testid="tab-theme"
                >
                  <Palette className="h-4 w-4" />
                  <span className="text-xs">Theme</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tools" 
                  className="flex flex-col gap-1 py-2 data-[state=active]:bg-background"
                  data-testid="tab-tools"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-xs">Tools</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="offline" 
                  className="flex flex-col gap-1 py-2 data-[state=active]:bg-background"
                  data-testid="tab-offline"
                >
                  <Download className="h-4 w-4" />
                  <span className="text-xs">Offline</span>
                </TabsTrigger>
              </TabsList>
            )}

            <ScrollArea className="flex-1">
              {/* PLAN TAB - Route Planning */}
              <TabsContent value="plan" className="p-4 space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-blue-500" />
                        Plan Your Route
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleFillCurrentLocation}
                        disabled={isGettingLocation}
                        className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
                        data-testid="button-gps-fill-location"
                        title="Use current location"
                      >
                        {isGettingLocation ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Crosshair className="h-4 w-4" />
                        )}
                      </Button>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Enter your start and destination
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* From Location with Autocomplete using Radix Popover */}
                    <div className="space-y-2">
                      <Label htmlFor="from-input" className="text-sm font-medium">
                        From
                      </Label>
                      <Popover open={fromOpen} onOpenChange={setFromOpen} modal={false}>
                        <PopoverAnchor asChild>
                          <Input
                            id="from-input"
                            placeholder="Enter starting location..."
                            value={fromInput}
                            onChange={(e) => {
                              setFromInput(e.target.value);
                              onFromLocationChange(e.target.value);
                              setFromCoordinates(null);
                              setActivePOICategory(null);
                              setPoiSearchEnabled(false);
                              if (e.target.value.length >= 2) {
                                setFromOpen(true);
                              } else {
                                setFromOpen(false);
                              }
                            }}
                            onFocus={() => {
                              if (fromInput.length >= 2) {
                                setFromOpen(true);
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => setFromOpen(false), 200);
                            }}
                            data-testid="input-from-location"
                            className="h-11"
                            autoComplete="off"
                          />
                        </PopoverAnchor>
                        <PopoverContent 
                          className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999]" 
                          align="start"
                          side="bottom"
                          sideOffset={0}
                          avoidCollisions={false}
                          collisionPadding={0}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Command>
                            <CommandList className="max-h-[200px]">
                              {fromLoading && (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                              )}
                              {!fromLoading && fromResults.length === 0 && fromSearch.length >= 3 && (
                                <CommandEmpty>No locations found.</CommandEmpty>
                              )}
                              {fromResults.length > 0 && (
                                <CommandGroup>
                                  {fromResults.map((result) => (
                                    <CommandItem
                                      key={result.id}
                                      onSelect={() => {
                                        const display = formatTomTomDisplay(result);
                                        const coords = extractTomTomCoordinates(result);
                                        setFromInput(display);
                                        onFromLocationChange(display);
                                        if (coords) {
                                          setFromCoordinates(coords);
                                        }
                                        setFromOpen(false);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                      <span className="text-sm">{formatTomTomDisplay(result)}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* To Location with Autocomplete using Radix Popover */}
                    <div className="space-y-2">
                      <Label htmlFor="to-input" className="text-sm font-medium">
                        To
                      </Label>
                      <Popover open={toOpen} onOpenChange={setToOpen} modal={false}>
                        <PopoverAnchor asChild>
                          <Input
                            id="to-input"
                            placeholder="Enter destination..."
                            value={toInput}
                            onChange={(e) => {
                              setToInput(e.target.value);
                              onToLocationChange(e.target.value);
                              if (e.target.value.length >= 2) {
                                setToOpen(true);
                              } else {
                                setToOpen(false);
                              }
                            }}
                            onFocus={() => {
                              if (toInput.length >= 2) {
                                setToOpen(true);
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => setToOpen(false), 200);
                            }}
                            data-testid="input-to-location"
                            className="h-11"
                            autoComplete="off"
                          />
                        </PopoverAnchor>
                        <PopoverContent 
                          className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999]" 
                          align="start"
                          side="bottom"
                          sideOffset={0}
                          avoidCollisions={false}
                          collisionPadding={0}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Command>
                            <CommandList className="max-h-[200px]">
                              {toLoading && (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                              )}
                              {!toLoading && toResults.length === 0 && toSearch.length >= 3 && (
                                <CommandEmpty>No locations found.</CommandEmpty>
                              )}
                              {toResults.length > 0 && (
                                <CommandGroup>
                                  {toResults.map((result) => (
                                    <CommandItem
                                      key={result.id}
                                      onSelect={() => {
                                        const display = formatTomTomDisplay(result);
                                        setToInput(display);
                                        onToLocationChange(display);
                                        setToOpen(false);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                      <span className="text-sm">{formatTomTomDisplay(result)}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Quick POI Search - Integrated into Plan Tab */}
                    <div className="space-y-3 pt-2">
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-purple-500" />
                          Or find nearby truck-friendly locations
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {poiCategories.map((category) => (
                            <Button
                              key={category.id}
                              variant={activePOICategory === category.id ? "default" : "outline"}
                              className="h-14 flex flex-col gap-1 transition-opacity hover:opacity-90 active:opacity-70"
                              onClick={() => handlePOISearch(category.id)}
                              data-testid={`button-poi-${category.id}-plan`}
                            >
                              <category.icon className="h-4 w-4" />
                              <span className="text-xs">{category.label}</span>
                            </Button>
                          ))}
                        </div>
                        
                        {/* POI Results in Plan Tab */}
                        {poiLoading && activePOICategory && (
                          <div className="flex items-center justify-center py-3 bg-muted/30 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-xs text-muted-foreground">Searching nearby...</span>
                          </div>
                        )}
                        
                        {!poiLoading && activePOICategory && poiResults.length === 0 && (
                          <div className="text-xs text-muted-foreground py-3 text-center bg-muted/20 rounded-lg">
                            No {poiCategories.find(c => c.id === activePOICategory)?.label} found nearby
                          </div>
                        )}
                        
                        {!poiLoading && poiResults.length > 0 && (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            <div className="text-xs font-medium text-muted-foreground">
                              Found {poiResults.length} nearby
                            </div>
                            {poiResults.slice(0, 8).map((result, idx) => (
                              <Card 
                                key={result.id} 
                                className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all hover:translate-x-1 active:translate-x-0"
                                onClick={() => {
                                  const display = formatTomTomDisplay(result);
                                  setToInput(display);
                                  onToLocationChange(display);
                                  setActivePOICategory(null);
                                  setPoiSearchEnabled(false);
                                  // toast({
                                  //   title: "Destination set",
                                  //   description: `Route to: ${result.poi?.name || display}`,
                                  // });
                                }}
                                data-testid={`card-poi-result-plan-${idx}`}
                              >
                                <CardContent className="p-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-xs truncate">
                                        {result.poi?.name || formatTomTomDisplay(result)}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                        {formatTomTomDisplay(result)}
                                      </div>
                                      {result.dist !== undefined && (
                                        <div className="text-[11px] text-muted-foreground mt-0.5">
                                          {formatDistance(result.dist, 'meters')} away
                                        </div>
                                      )}
                                    </div>
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current Vehicle Info */}
                    {selectedProfile && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Selected Vehicle</div>
                        <div className="font-medium text-sm">{selectedProfile.name || 'Unnamed Vehicle'}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {selectedProfile.height}m × {selectedProfile.width}m × {selectedProfile.length}m
                        </div>
                      </div>
                    )}

                    {/* Find Route Button - Shows when locations entered but route not calculated */}
                    {!currentRoute && fromInput && toInput && selectedProfile && (
                      <Button
                        onClick={async () => {
                          await onPlanRoute();
                        }}
                        disabled={isCalculating}
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md"
                        data-testid="button-find-route"
                      >
                        {isCalculating ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Calculating Route...
                          </>
                        ) : (
                          <>
                            <Navigation className="h-5 w-5 mr-2" />
                            Find Route
                          </>
                        )}
                      </Button>
                    )}

                    {/* Route Status & Navigation Buttons */}
                    {currentRoute && !isNavigating && (
                      <div className="space-y-3">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="text-sm font-medium text-green-900 dark:text-green-100">
                            ✓ Route calculated
                          </div>
                          <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                            {formatDistance(currentRoute.distance || 0, 'km')} • {formatDuration(currentRoute.duration || 0)}
                          </div>
                        </div>
                        
                        {/* Green Start Navigation Button */}
                        <Button
                          onClick={() => {
                            onStartNavigation();
                            onOpenChange(false);
                          }}
                          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md"
                          data-testid="button-start-navigation-menu"
                        >
                          <Navigation className="h-5 w-5 mr-2" />
                          Start Navigation
                        </Button>
                      </div>
                    )}

                    {/* Stop Navigation Button - Shows when navigating */}
                    {isNavigating && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (onStopNavigation) {
                            onStopNavigation();
                          }
                          onOpenChange(false);
                        }}
                        className="w-full h-12 font-semibold"
                        data-testid="button-stop-navigation-menu"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Stop Navigation
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DESTINATIONS TAB */}
              <TabsContent value="destinations" className="p-4 space-y-4 mt-0">
                {/* POI Suggestions at Top */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-500" />
                      Quick POI Search
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Find nearby truck-friendly locations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {poiCategories.map((category) => (
                        <Button
                          key={category.id}
                          variant={activePOICategory === category.id ? "default" : "outline"}
                          className="h-16 flex flex-col gap-1 transition-opacity hover:opacity-90 active:opacity-70"
                          onClick={() => handlePOISearch(category.id)}
                          data-testid={`button-poi-${category.id}`}
                        >
                          <category.icon className="h-5 w-5" />
                          <span className="text-xs">{category.label}</span>
                        </Button>
                      ))}
                    </div>
                    
                    {/* POI Results */}
                    {poiLoading && activePOICategory && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                      </div>
                    )}
                    
                    {!poiLoading && activePOICategory && poiResults.length === 0 && (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        No {poiCategories.find(c => c.id === activePOICategory)?.label} found nearby
                      </div>
                    )}
                    
                    {!poiLoading && poiResults.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Found {poiResults.length} nearby
                        </div>
                        {poiResults.slice(0, 5).map((result, idx) => (
                          <Card 
                            key={result.id} 
                            className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all hover:translate-x-1 active:translate-x-0"
                            onClick={() => {
                              const coords = extractTomTomCoordinates(result);
                              if (coords && onSelectFacility) {
                                onSelectFacility({
                                  name: result.poi?.name || formatTomTomDisplay(result),
                                  coordinates: coords,
                                  type: activePOICategory,
                                  address: formatTomTomDisplay(result)
                                });
                                onOpenChange(false);
                              }
                            }}
                            data-testid={`card-poi-result-${idx}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {result.poi?.name || formatTomTomDisplay(result)}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 truncate">
                                    {formatTomTomDisplay(result)}
                                  </div>
                                  {result.dist !== undefined && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {formatDistance(result.dist, 'meters')} away
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Favorite Routes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bookmark className="h-4 w-4 text-yellow-500" />
                      Favorite Routes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isLoadingFavorites ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : favoriteRoutes.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        No favorite routes saved yet
                      </div>
                    ) : (
                      favoriteRoutes.map((route) => (
                        <Card 
                          key={route.id} 
                          className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all hover:translate-x-1 active:translate-x-0"
                          onClick={() => handleLoadFavorite(route)}
                          data-testid={`card-favorite-route-${route.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{route.name || 'Unnamed Route'}</div>
                                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                  <div className="truncate">From: {route.startLocation}</div>
                                  <div className="truncate">To: {route.endLocation}</div>
                                  <div className="flex gap-3 mt-1">
                                    <span>{formatDistance(route.distance || 0, 'km')}</span>
                                    <span>{formatDuration(route.duration || 0)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleLoadFavorite(route)}
                                  className="h-8 px-2"
                                  data-testid={`button-load-favorite-${route.id}`}
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteFavoriteMutation.mutate(route.id)}
                                  className="h-8 px-2 text-destructive"
                                  data-testid={`button-delete-favorite-${route.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Recent Journeys */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      Recent Destinations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isLoadingJourneys ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : recentJourneys.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        No recent journeys
                      </div>
                    ) : (
                      recentJourneys.map((journey) => (
                        <Card 
                          key={journey.id} 
                          className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all hover:translate-x-1 active:translate-x-0"
                          onClick={() => handleLoadJourney(journey)}
                          data-testid={`card-journey-${journey.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <Badge variant={
                                  journey.status === 'completed' ? 'default' :
                                  journey.status === 'active' ? 'secondary' : 'outline'
                                } className="mb-2 text-xs">
                                  {journey.status}
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(journey.startedAt).toLocaleDateString()}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* VEHICLE TAB */}
              <TabsContent value="vehicle" className="p-4 space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Vehicle Profiles
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Select or create a vehicle profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Current Profile */}
                    {selectedProfile && (
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">Current Vehicle</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {selectedProfile.name || 'Unnamed Vehicle'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                H: {selectedProfile.height}m × W: {selectedProfile.width}m × L: {selectedProfile.length}m
                              </div>
                            </div>
                            <Badge>Active</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Vehicle Profile List */}
                    {isLoadingProfiles ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Card key={i} className="animate-pulse">
                            <CardContent className="p-3 space-y-2">
                              <div className="h-4 bg-muted rounded-md w-3/4"></div>
                              <div className="h-3 bg-muted rounded-md w-1/2"></div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : vehicleProfiles.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        No vehicle profiles yet. Create one to get started!
                      </div>
                    ) : (
                      vehicleProfiles.map((profile) => (
                        <Card 
                          key={profile.id} 
                          className={cn(
                            "cursor-pointer transition-all hover:bg-muted/50 hover:translate-x-1 active:translate-x-0",
                            selectedProfile?.id === profile.id && "border-primary"
                          )}
                          onClick={() => onProfileSelect(profile)}
                          data-testid={`card-vehicle-profile-${profile.id}`}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="font-medium text-sm">{profile.name || 'Unnamed Vehicle'}</div>
                            <div className="text-xs text-muted-foreground">
                              {profile.height}m × {profile.width}m × {profile.length}m
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}

                    {/* Create New Profile Button */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        onOpenChange(false);
                        setShowVehicleSetup(true);
                      }}
                      data-testid="button-create-vehicle-profile"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Create New Profile
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* THEME TAB */}
              <TabsContent value="theme" className="p-4 space-y-4 mt-0">
                {/* Theme Mode Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Theme Settings
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Select day, night, or auto theme with color customization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ThemeSelector 
                      showLabels={true}
                      showGrayscale={false}
                      showColorSpectrum={false}
                      showAutoSettings={true}
                      showAutoStatus={true}
                    />
                  </CardContent>
                </Card>

                {/* Color Customization */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Color Spectrum
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Customize theme colors
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ColorSpectrumPicker showPresets={true} />
                  </CardContent>
                </Card>

                {/* Grayscale */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Grayscale Override
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GrayscaleSelector />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TOOLS TAB */}
              <TabsContent value="tools" className="p-4 space-y-4 mt-0">
                {/* Region / Speed Limit Style */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPinned className="h-4 w-4 text-blue-500" />
                      Region & Speed Limit Sign
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Select your region to use local speed limit signs and units
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RegionSelector />
                    <Separator />
                    <MeasurementSelector />
                  </CardContent>
                </Card>

                {/* Tools & Widgets */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Tools & Widgets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        onOpenChange(false);
                        setShowWeather(true);
                      }}
                      data-testid="button-tool-weather"
                    >
                      <Cloud className="h-4 w-4 mr-2" />
                      Weather
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        onOpenChange(false);
                        setShowEntertainment(true);
                      }}
                      data-testid="button-tool-entertainment"
                    >
                      <Music className="h-4 w-4 mr-2" />
                      Entertainment
                    </Button>
                    
                    {/* TEMPORARY: Clear Old Route Button */}
                    <Button
                      variant="outline"
                      className="w-full justify-start border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={handleClearOldRoute}
                      data-testid="button-clear-old-route"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Old Route (Fix Map)
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowVoiceNav(true)}
                      data-testid="button-tool-voice"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Voice Navigation
                    </Button>
                    
                    {/* Fuel Price Comparison */}
                    <Button
                      variant="outline"
                      className="w-full justify-start border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => {
                        onOpenChange(false);
                        setShowFuelPrices(true);
                      }}
                      data-testid="button-tool-fuel-prices"
                    >
                      <Fuel className="h-4 w-4 mr-2" />
                      Fuel Price Comparison
                    </Button>
                    
                    {/* Driver Fatigue Monitor */}
                    <Button
                      variant="outline"
                      className="w-full justify-start border-amber-500 text-amber-600 hover:bg-amber-50"
                      onClick={() => {
                        onOpenChange(false);
                        setShowFatigueMonitor(true);
                      }}
                      data-testid="button-tool-fatigue-monitor"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Driver Fatigue Monitor
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        onOpenChange(false);
                        setShowSettings(true);
                      }}
                      data-testid="button-tool-settings"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      App Settings
                    </Button>
                  </CardContent>
                </Card>

                {/* Language Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      🌐 Language / Idioma / Sprache
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Change app and voice navigation language
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LanguageSelector />
                  </CardContent>
                </Card>

                {/* Map Settings Quick Access */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      Map & Traffic
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        onOpenChange(false);
                        setShowSettings(true);
                      }}
                      data-testid="button-map-settings"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Map Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SOCIAL TAB - Social Network */}
              <TabsContent value="social" className="p-4 space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Social Trucking Network
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Connect with drivers, share routes, and build your network (Phase 1 - Coming Soon!)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Social features are currently in development. Soon you'll be able to:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                      <li>Create and manage your driver profile</li>
                      <li>Connect with other professional drivers</li>
                      <li>Share and discover routes from your network</li>
                      <li>Rate and comment on shared routes</li>
                    </ul>
                    <div className="pt-3 border-t">
                      <Badge variant="secondary" className="w-full justify-center py-2">
                        Phase 1: Launching Soon
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* OFFLINE TAB - Offline Map Downloads */}
              <TabsContent value="offline" className="p-4 space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Download className="h-4 w-4 text-green-500" />
                      Offline Maps
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Download map regions for offline navigation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <OfflineDownloadsPanel onClose={() => onOpenChange(false)} />
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Sub-Modals */}
      {showVehicleSetup && (
        <VehicleProfileSetup
          onClose={() => setShowVehicleSetup(false)}
          onProfileCreated={(profile) => {
            onProfileSelect(profile);
            setShowVehicleSetup(false);
          }}
        />
      )}

      {showWeather && (
        <WeatherWidget
          isOpen={showWeather}
          onClose={() => setShowWeather(false)}
        />
      )}

      {showEntertainment && (
        <EntertainmentPanel
          isOpen={showEntertainment}
          onClose={() => setShowEntertainment(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
        />
      )}

      {/* Fuel Price Comparison Dialog */}
      <Dialog open={showFuelPrices} onOpenChange={setShowFuelPrices}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-green-600" />
              Fuel Price Comparison
            </DialogTitle>
            <DialogDescription>
              Find the cheapest fuel near your location
            </DialogDescription>
          </DialogHeader>
          <FuelPriceComparison 
            onNavigateToStation={(station) => {
              setShowFuelPrices(false);
              toast({
                title: "Navigation Started",
                description: `Navigating to ${station.brand} - ${station.postcode}`,
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Driver Fatigue Monitor Dialog */}
      <Dialog open={showFatigueMonitor} onOpenChange={setShowFatigueMonitor}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Driver Fatigue Monitor
            </DialogTitle>
            <DialogDescription>
              Track your driving time for EU/UK compliance
            </DialogDescription>
          </DialogHeader>
          <DriverFatigueAlert 
            isNavigating={isNavigating}
            onRequestBreak={() => {
              setShowFatigueMonitor(false);
              toast({
                title: "Break Requested",
                description: "Find a safe place to rest. We'll show nearby truck stops.",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ComprehensiveMobileMenu;
