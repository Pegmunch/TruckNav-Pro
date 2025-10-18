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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Loader2
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
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import WeatherWidget from "@/components/weather/weather-widget";
import EntertainmentPanel from "@/components/entertainment/entertainment-panel";
import VoiceNavigationPanel from "@/components/navigation/voice-navigation-panel";
import SettingsModal from "@/components/settings/settings-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
}

const ComprehensiveMobileMenu = memo(function ComprehensiveMobileMenu({
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
  onSelectFacility
}: ComprehensiveMobileMenuProps) {
  const { toast } = useToast();
  const { formatDistance } = useMeasurement();
  const gps = useGPS();
  const [activeTab, setActiveTab] = useState("plan");
  
  // Local state for route planning inputs
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  
  // Autocomplete state
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  
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
  
  // Modal states for sub-panels
  const [showVehicleSetup, setShowVehicleSetup] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showEntertainment, setShowEntertainment] = useState(false);
  const [showVoiceNav, setShowVoiceNav] = useState(false);
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
  const { data: vehicleProfiles = [] } = useQuery<VehicleProfile[]>({
    queryKey: ["/api/vehicle-profiles"],
    enabled: open,
  });

  // Load favorite route
  const handleLoadFavorite = useCallback((route: RouteType) => {
    setFromInput(route.startLocation);
    setToInput(route.endLocation);
    onFromLocationChange(route.startLocation);
    onToLocationChange(route.endLocation);
    setActiveTab("plan"); // Switch to plan tab to show loaded route
    toast({
      title: "Route loaded",
      description: `Loaded ${route.name || 'favorite route'}`,
    });
  }, [onFromLocationChange, onToLocationChange, toast]);

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
      setActiveTab("plan"); // Switch to plan tab to show loaded route
      
      toast({
        title: "Journey loaded",
        description: `Route from ${route.startLocation} to ${route.endLocation}`,
      });
    } catch (error) {
      console.error("Failed to load journey route:", error);
      toast({
        title: "Error",
        description: "Failed to load journey route",
        variant: "destructive",
      });
    }
  }, [onFromLocationChange, onToLocationChange, toast]);

  // Delete favorite route
  const deleteFavoriteMutation = useMutation({
    mutationFn: async (routeId: string) => {
      await apiRequest("DELETE", `/api/routes/${routeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes", "favorites"] });
      toast({
        title: "Route deleted",
        description: "Favorite route has been removed",
      });
    },
  });

  // POI Categories
  const poiCategories = [
    { id: 'truck_stop', label: 'Truck Stops', icon: Truck, color: 'bg-blue-500' },
    { id: 'fuel', label: 'Fuel', icon: Fuel, color: 'bg-red-500' },
    { id: 'parking', label: 'Parking', icon: CircleParking, color: 'bg-green-500' },
    { id: 'restaurant', label: 'Food', icon: Utensils, color: 'bg-orange-500' },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full w-full h-[100vh] p-0 gap-0 bg-white dark:bg-gray-950 flex flex-col">
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b bg-white dark:bg-gray-950 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">Menu</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
                data-testid="button-close-menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <DialogDescription className="sr-only">
              Comprehensive menu for route planning, destinations, vehicle profiles, theme settings, and tools
            </DialogDescription>
          </DialogHeader>

          {/* Tabbed Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full grid grid-cols-5 rounded-none border-b bg-gray-100 dark:bg-gray-900 h-auto p-1 flex-shrink-0">
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
            </TabsList>

            <ScrollArea className="flex-1">
              {/* PLAN TAB - Route Planning */}
              <TabsContent value="plan" className="p-4 space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-blue-500" />
                      Plan Your Route
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Enter your start and destination
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* From Location with Autocomplete */}
                    <div className="space-y-2 relative">
                      <Label htmlFor="from-input" className="text-sm font-medium">
                        From
                      </Label>
                      <Input
                        id="from-input"
                        placeholder="Enter starting location..."
                        value={fromInput}
                        onChange={(e) => {
                          setFromInput(e.target.value);
                          onFromLocationChange(e.target.value);
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
                      />
                      {fromOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-950 border rounded-md shadow-lg">
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
                                        setFromInput(display);
                                        onFromLocationChange(display);
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
                        </div>
                      )}
                    </div>

                    {/* To Location with Autocomplete */}
                    <div className="space-y-2 relative">
                      <Label htmlFor="to-input" className="text-sm font-medium">
                        To
                      </Label>
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
                      />
                      {toOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-950 border rounded-md shadow-lg">
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
                        </div>
                      )}
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

                    {/* Navigation Control Buttons */}
                    {isNavigating ? (
                      <Button
                        onClick={() => {
                          if (onStopNavigation) {
                            onStopNavigation();
                          }
                          onOpenChange(false);
                        }}
                        className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
                        data-testid="button-cancel-route"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Cancel Route
                      </Button>
                    ) : (
                      <Button
                        onClick={async () => {
                          // Calculate route first if not already calculated
                          if (!currentRoute) {
                            await onPlanRoute();
                          }
                          // Then start navigation
                          onStartNavigation();
                          onOpenChange(false);
                        }}
                        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
                        disabled={!fromInput || !toInput || isCalculating}
                        data-testid="button-start-navigation"
                      >
                        {isCalculating ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Calculating Route...
                          </>
                        ) : (
                          <>
                            <Navigation className="h-5 w-5 mr-2" />
                            Start Navigation
                          </>
                        )}
                      </Button>
                    )}

                    {currentRoute && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="text-sm font-medium text-green-900 dark:text-green-100">
                          ✓ Route calculated
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                          {formatDistance(currentRoute.distance || 0, 'km')} • {formatDuration(currentRoute.duration || 0)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DESTINATIONS TAB */}
              <TabsContent value="destinations" className="p-4 space-y-4 mt-0">
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
                        <Card key={route.id} className="bg-muted/30">
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
                          className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
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
                    {vehicleProfiles.map((profile) => (
                      <Card 
                        key={profile.id} 
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-muted/50",
                          selectedProfile?.id === profile.id && "border-primary"
                        )}
                        onClick={() => onProfileSelect(profile)}
                        data-testid={`card-vehicle-profile-${profile.id}`}
                      >
                        <CardContent className="p-3">
                          <div className="font-medium text-sm">{profile.name || 'Unnamed Vehicle'}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {profile.height}m × {profile.width}m × {profile.length}m
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Create New Profile Button */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowVehicleSetup(true)}
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
                      Theme Mode
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Select day, night, or auto theme
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ThemeSelector showLabels={false} />
                  </CardContent>

                </Card>

                {/* Auto Theme Settings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Auto Mode Schedule
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure automatic theme switching
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AutoThemeSettings showTrigger={false} />
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
                {/* Quick POI Search */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Quick POI Search
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {poiCategories.map((category) => (
                        <Button
                          key={category.id}
                          variant="outline"
                          className="h-16 flex flex-col gap-1"
                          data-testid={`button-poi-${category.id}`}
                        >
                          <category.icon className="h-5 w-5" />
                          <span className="text-xs">{category.label}</span>
                        </Button>
                      ))}
                    </div>
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
                      onClick={() => setShowWeather(true)}
                      data-testid="button-tool-weather"
                    >
                      <Cloud className="h-4 w-4 mr-2" />
                      Weather
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowEntertainment(true)}
                      data-testid="button-tool-entertainment"
                    >
                      <Music className="h-4 w-4 mr-2" />
                      Entertainment
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
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowSettings(true)}
                      data-testid="button-tool-settings"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      App Settings
                    </Button>
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
                        setShowSettings(true);
                        setActiveTab("tools");
                      }}
                      data-testid="button-map-settings"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Map Settings
                    </Button>
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
    </>
  );
});

export default ComprehensiveMobileMenu;
