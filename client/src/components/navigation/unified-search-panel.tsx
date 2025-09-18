import { useState, memo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
import { 
  Search,
  X,
  ArrowLeft,
  MapPin,
  Star,
  Fuel,
  CircleParking,
  Utensils,
  Bed,
  Coffee,
  Wrench,
  Truck,
  History,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Play,
  Clock,
  Route as RouteIcon,
  Loader2,
  Wifi,
  Phone,
  ShowerHead
} from "lucide-react";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { useVoiceIntents, type IntentHandlers } from "@/hooks/use-voice-intents";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { type Facility, type Route as RouteType, type Journey } from "@shared/schema";

interface UnifiedSearchPanelProps {
  // Panel state
  isOpen: boolean;
  onClose: () => void;
  
  // Search functionality
  coordinates?: { lat: number; lng: number };
  onSelectFacility?: (facility: Facility) => void;
  onNavigateToLocation?: (location: string) => void;
  
  // Route planning
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onStartNavigation: () => void;
  currentRoute: RouteType | null;
  
  // Styling
  className?: string;
}

// POI Categories with automotive-focused options
const POI_CATEGORIES = [
  { id: 'truck_stop', label: 'Truck Stops', icon: Truck, type: 'truck_stop', color: 'bg-blue-500' },
  { id: 'fuel', label: 'Fuel Stations', icon: Fuel, type: 'fuel', color: 'bg-red-500' },
  { id: 'parking', label: 'Parking', icon: CircleParking, type: 'parking', color: 'bg-green-500' },
  { id: 'restaurant', label: 'Restaurants', icon: Utensils, type: 'restaurant', color: 'bg-orange-500' },
  { id: 'hotel', label: 'Hotels', icon: Bed, type: 'hotel', color: 'bg-pink-500' },
  { id: 'rest_area', label: 'Rest Areas', icon: Coffee, type: 'rest_area', color: 'bg-amber-600' },
  { id: 'service', label: 'Service Stations', icon: Wrench, type: 'service', color: 'bg-gray-500' },
];

const UnifiedSearchPanel = memo(function UnifiedSearchPanel({
  isOpen,
  onClose,
  coordinates,
  onSelectFacility,
  onNavigateToLocation,
  onFromLocationChange,
  onToLocationChange,
  onStartNavigation,
  currentRoute,
  className
}: UnifiedSearchPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatDistance } = useMeasurement();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);
  
  // History & Favorites state
  const [saveRouteDialogOpen, setSaveRouteDialogOpen] = useState(false);
  const [routeName, setRouteName] = useState("");

  // Memoized duration formatting to prevent recalculation
  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, []);

  // Voice command integration
  const searchVoiceHandlers: IntentHandlers = {
    search: async (intent, entities) => {
      const poiEntities = entities.filter(e => e.type === 'poi');
      const locationEntities = entities.filter(e => e.type === 'location');
      
      if (intent.action === 'find_nearest' && poiEntities.length > 0) {
        const poiType = poiEntities[0].value.toLowerCase();
        
        // Map POI entity to category
        const category = POI_CATEGORIES.find(cat => 
          cat.label.toLowerCase().includes(poiType) ||
          cat.type.includes(poiType) ||
          poiType.includes(cat.type)
        );
        
        if (category) {
          setSelectedCategory(category.type);
          setSearchQuery("");
          
          toast({
            title: "Voice search activated",
            description: `Searching for ${category.label.toLowerCase()}`,
          });
        } else {
          setSearchQuery(poiType);
          setSelectedCategory("");
          
          toast({
            title: "Voice search activated",
            description: `Searching for "${poiType}"`,
          });
        }
      } else if (intent.action === 'search_location' && locationEntities.length > 0) {
        const location = locationEntities[0].value;
        setSearchQuery(location);
        setSelectedCategory("");
        
        toast({
          title: "Voice search activated",
          description: `Searching for "${location}"`,
        });
      }
    },
    
    unknown: async (intent) => {
      toast({
        title: "Voice command not recognized",
        description: "Try saying 'find nearest fuel station' or 'search for restaurants'",
        variant: "destructive",
      });
    }
  };

  const searchVoiceIntents = useVoiceIntents(searchVoiceHandlers);
  
  const searchVoiceCommands = useVoiceCommands(
    {
      interactionMode: 'toggle',
      continuous: false,
      interimResults: true,
    },
    {
      onTranscriptUpdate: (transcript: any) => {
        searchVoiceIntents.processVoiceInput(transcript.final || transcript.interim);
      },
      onIntentProcessed: (result: any) => {
        setIsVoiceSearchActive(false);
      },
      onError: (error: any) => {
        setIsVoiceSearchActive(false);
        toast({
          title: "Voice search error",
          description: error.message,
          variant: "destructive",
        });
      },
    }
  );

  // Build search query parameters with fallback coordinates
  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    
    // Use provided coordinates, or fall back to a default location (London, UK)
    const lat = coordinates?.lat || 51.5074;
    const lng = coordinates?.lng || -0.1278;
    
    params.set('lat', lat.toString());
    params.set('lng', lng.toString());
    params.set('radius', '25');
    
    if (selectedCategory) {
      params.set('type', selectedCategory);
    }
    
    return params.toString();
  }, [coordinates, selectedCategory]);

  // Facilities search query with error handling
  const searchParams = buildSearchParams();
  const { data: facilities = [], isLoading, error } = useQuery<Facility[]>({
    queryKey: ['/api/facilities', searchParams],
    enabled: isOpen,
    retry: 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Journey History
  const { data: lastJourney, isLoading: isLoadingLastJourney } = useQuery<Journey | null>({
    queryKey: ["/api/journeys", "last"],
    queryFn: () => fetch("/api/journeys/last", { credentials: "include" }).then(res => {
      if (res.status === 404) return null;
      return res.json();
    }),
    enabled: isOpen,
    retry: false,
  });

  // Get last journey route details
  const { data: lastJourneyRoute } = useQuery<RouteType>({
    queryKey: ["/api/routes", lastJourney?.routeId],
    queryFn: () => fetch(`/api/routes/${lastJourney?.routeId}`, { credentials: "include" }).then(res => res.json()),
    enabled: !!lastJourney?.routeId && isOpen,
  });

  // Route Favorites
  const { data: favoriteRoutes = [], isLoading: isLoadingFavorites } = useQuery<RouteType[]>({
    queryKey: ["/api/routes", "favorites"],
    queryFn: () => fetch("/api/routes/favorites", { credentials: "include" }).then(res => res.json()),
    enabled: isOpen,
  });

  // Save current route as favorite mutation
  const saveRouteMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!currentRoute) throw new Error("No route to save");
      const routeData = { ...currentRoute, name, isFavorite: true };
      const response = await apiRequest("POST", "/api/routes", routeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes", "favorites"] });
      toast({
        title: "Route saved",
        description: "Route has been added to your favorites",
      });
      setSaveRouteDialogOpen(false);
      setRouteName("");
    },
    onError: (error) => {
      toast({
        title: "Error saving route",
        description: error instanceof Error ? error.message : "Failed to save route",
        variant: "destructive",
      });
    },
  });

  // Toggle route favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ routeId, isFavorite }: { routeId: string; isFavorite: boolean }) => {
      const response = await apiRequest("PATCH", `/api/routes/${routeId}/favorite`, { isFavorite });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes", "favorites"] });
    },
  });

  // Resume journey mutation
  const resumeJourneyMutation = useMutation({
    mutationFn: async (routeId: string) => {
      const response = await apiRequest("POST", "/api/journeys/start", { routeId });
      return response.json();
    },
    onSuccess: (journey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      toast({
        title: "Journey resumed",
        description: "Navigation has been restarted",
      });
      if (lastJourneyRoute) {
        onStartNavigation();
      }
    },
    onError: (error) => {
      toast({
        title: "Error resuming journey",
        description: error instanceof Error ? error.message : "Failed to resume journey",
        variant: "destructive",
      });
    },
  });

  // Filter facilities by search query with null safety
  const filteredFacilities = (facilities || []).filter((facility: Facility) =>
    (facility.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (facility.address || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show error toast when query fails
  useEffect(() => {
    if (error) {
      toast({
        title: "Search Error",
        description: "Failed to search facilities. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Handle category selection
  const handleCategorySelect = (categoryType: string) => {
    setSelectedCategory(categoryType === selectedCategory ? "" : categoryType);
    setSearchQuery(""); // Clear text search when selecting category
  };

  // Handle voice search toggle
  const handleVoiceSearchToggle = () => {
    if (searchVoiceCommands.state === 'idle') {
      setIsVoiceSearchActive(true);
      searchVoiceCommands.startListening?.();
    } else {
      setIsVoiceSearchActive(false);
      searchVoiceCommands.stopListening?.();
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setSelectedCategory("");
  };

  // Handle facility selection
  const handleFacilitySelect = (facility: Facility) => {
    onSelectFacility?.(facility);
    toast({
      title: "Facility selected",
      description: `Selected ${facility.name}`,
    });
  };

  // Helper functions for History & Favorites
  const handleLoadFavoriteRoute = useCallback((route: RouteType) => {
    onFromLocationChange(route.startLocation);
    onToLocationChange(route.endLocation);
    toast({
      title: "Route loaded",
      description: `Loaded ${route.name || 'favorite route'}`,
    });
  }, [onFromLocationChange, onToLocationChange, toast]);

  const handleSaveCurrentRoute = useCallback(() => {
    if (!currentRoute) {
      toast({
        title: "No route to save",
        description: "Please plan a route first",
        variant: "destructive",
      });
      return;
    }
    setSaveRouteDialogOpen(true);
  }, [currentRoute, toast]);

  const formatTimeAgo = useCallback((date: Date | string) => {
    const now = new Date();
    const journeyDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - journeyDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just started";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 1) return "Less than an hour ago";
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  }, []);

  const getJourneyStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'planned': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }, []);

  // Get amenity icon
  const getAmenityIcon = (amenity: string): JSX.Element => {
    switch (amenity) {
      case 'fuel': return <Fuel className="w-3 h-3" />;
      case 'parking': return <CircleParking className="w-3 h-3" />;
      case 'restaurant': return <Utensils className="w-3 h-3" />;
      case 'restrooms': return <ShowerHead className="w-3 h-3" />;
      case 'showers': return <ShowerHead className="w-3 h-3" />;
      case 'wifi': return <Wifi className="w-3 h-3" />;
      case 'phone': return <Phone className="w-3 h-3" />;
      default: return <MapPin className="w-3 h-3" />;
    }
  };

  return (
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden" 
          onClick={onClose}
          data-testid="unified-search-panel-backdrop"
        />
      )}
      
      {/* Unified Search Panel */}
      <div className={cn(
        "fixed lg:absolute top-0 right-0 h-full w-80 lg:w-96 bg-card border-l border-border z-50 flex flex-col",
        "transform transition-transform duration-300 ease-in-out",
        "shadow-2xl lg:shadow-lg",
        isOpen ? "translate-x-0" : "translate-x-full",
        className
      )}>
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="automotive-button"
              data-testid="button-close-unified-search"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="mobile-text-lg font-bold text-foreground">Search & Recent</h2>
              <p className="mobile-text-sm text-muted-foreground">Find places and routes</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden automotive-button"
            data-testid="button-close-unified-search-mobile"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Unified Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Section */}
          <div className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="p-4 space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-12 automotive-input scalable-control-button"
                  data-testid="input-search-query"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <VoiceMicButton
                    state={searchVoiceCommands.state}
                    size="sm"
                    onToggle={handleVoiceSearchToggle}
                    data-testid="button-voice-search"
                  />
                </div>
              </div>

              {/* Category Buttons */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Categories</h3>
                <div className="grid grid-cols-2 gap-2">
                  {POI_CATEGORIES.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.type ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCategorySelect(category.type)}
                      className={cn(
                        "flex items-center space-x-2 justify-start scalable-control-button",
                        selectedCategory === category.type && category.color
                      )}
                      data-testid={`button-category-${category.id}`}
                    >
                      <category.icon className="w-4 h-4" />
                      <span className="text-xs">{category.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="w-full"
                  data-testid="button-clear-search"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Search
                </Button>
              )}
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
                      <p className="text-muted-foreground">Searching...</p>
                    </div>
                  ) : filteredFacilities.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No locations found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Try a different search term or category
                      </p>
                    </div>
                  ) : (
                    filteredFacilities.map((facility: Facility) => (
                      <Card 
                        key={facility.id} 
                        className="p-3 hover:shadow-md transition-shadow cursor-pointer automotive-card"
                        onClick={() => handleFacilitySelect(facility)}
                        data-testid={`facility-result-${facility.id}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground text-sm">{facility.name}</h4>
                            <p className="text-xs text-muted-foreground">{facility.address}</p>
                          </div>
                          <div className="text-right ml-2">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs font-medium">{facility.rating}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 mb-2">
                          <Badge 
                            variant={facility.truckParking ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {facility.truckParking ? "Truck Parking" : "Limited"}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {facility.type.replace('_', ' ')}
                          </Badge>
                        </div>

                        {(() => {
                          const amenities = facility.amenities as string[] | null;
                          return amenities && Array.isArray(amenities) && amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {amenities.slice(0, 4).map((amenity: string) => (
                                <div 
                                  key={amenity} 
                                  className="flex items-center space-x-1 text-xs text-muted-foreground bg-muted rounded px-1 py-0.5"
                                >
                                  {getAmenityIcon(amenity)}
                                  <span className="capitalize">{amenity}</span>
                                </div>
                              ))}
                              {amenities.length > 4 && (
                                <span className="text-xs text-muted-foreground">
                                  +{amenities.length - 4}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Recent Section (History & Favorites) */}
          <div className="border-t border-border overflow-y-auto touch-scroll">
            {/* Journey History Section */}
            {(lastJourney || isLoadingLastJourney) && (
              <div className="p-4 border-b border-border">
                <h4 className="font-medium text-foreground mb-3 flex items-center">
                  <History className="w-4 h-4 text-primary mr-2" />
                  Last Journey
                </h4>
                {isLoadingLastJourney ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ) : lastJourney && lastJourneyRoute ? (
                  <Card className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-foreground text-sm">
                          {lastJourneyRoute.startLocation} → {lastJourneyRoute.endLocation}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDistance(lastJourneyRoute.distance || 0, "miles")} • {formatDuration(lastJourneyRoute.duration || 0)} • {formatTimeAgo(lastJourney.startedAt)}
                        </div>
                      </div>
                      <Badge 
                        className={`text-xs ${getJourneyStatusColor(lastJourney.status)}`}
                        data-testid="badge-journey-status"
                      >
                        {lastJourney.status}
                      </Badge>
                    </div>
                    {lastJourney.status === 'planned' || lastJourney.status === 'active' ? (
                      <Button
                        size="sm"
                        onClick={() => resumeJourneyMutation.mutate(lastJourney.routeId)}
                        disabled={resumeJourneyMutation.isPending}
                        className="w-full mt-2"
                        data-testid="button-resume-journey"
                      >
                        <Play className="w-3 h-3 mr-2" />
                        {resumeJourneyMutation.isPending ? "Resuming..." : "Resume Journey"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadFavoriteRoute(lastJourneyRoute)}
                        className="w-full mt-2"
                        data-testid="button-repeat-journey"
                      >
                        <RouteIcon className="w-3 h-3 mr-2" />
                        Repeat Journey
                      </Button>
                    )}
                  </Card>
                ) : (
                  <div className="text-center text-muted-foreground text-sm">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No recent journeys</p>
                  </div>
                )}
              </div>
            )}

            {/* Route Favorites Section */}
            <div className="border-b border-border">
              <div className="p-4 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground flex items-center">
                    <Bookmark className="w-4 h-4 text-primary mr-2" />
                    Route Favorites
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveCurrentRoute}
                    disabled={!currentRoute || saveRouteMutation.isPending}
                    data-testid="button-save-route"
                  >
                    <BookmarkPlus className="w-3 h-3 mr-1" />
                    Save Route
                  </Button>
                </div>

                {/* Save Route Dialog */}
                {saveRouteDialogOpen && (
                  <Card className="p-3 mb-3 bg-accent/5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Route Name</label>
                      <Input
                        type="text"
                        value={routeName}
                        onChange={(e) => setRouteName(e.target.value)}
                        placeholder="Enter route name..."
                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                        data-testid="input-route-name"
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => saveRouteMutation.mutate(routeName)}
                          disabled={!routeName.trim() || saveRouteMutation.isPending}
                          data-testid="button-confirm-save"
                        >
                          {saveRouteMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSaveRouteDialogOpen(false);
                            setRouteName("");
                          }}
                          data-testid="button-cancel-save"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Favorites List */}
                <ScrollArea className="max-h-96">
                  <div className="space-y-2">
                    {isLoadingFavorites ? (
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : favoriteRoutes.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-4">
                        <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No favorite routes saved</p>
                        <p className="text-xs mt-1">Save routes you use frequently</p>
                      </div>
                    ) : (
                      favoriteRoutes.map((route) => (
                        <Card key={route.id} className="p-3 bg-accent/10">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-foreground text-sm">
                                {route.name || 'Unnamed Route'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {route.startLocation} → {route.endLocation}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDistance(route.distance || 0, "miles")} • {formatDuration(route.duration || 0)}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFavoriteMutation.mutate({ routeId: route.id, isFavorite: false })}
                              className="h-6 w-6 p-0 shrink-0"
                              data-testid={`button-unfavorite-${route.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoadFavoriteRoute(route)}
                            className="w-full"
                            data-testid={`button-load-favorite-${route.id}`}
                          >
                            <RouteIcon className="w-3 h-3 mr-2" />
                            Load Route
                          </Button>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default UnifiedSearchPanel;