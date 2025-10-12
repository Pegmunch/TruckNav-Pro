import { useState, memo, useCallback, useEffect, useRef } from "react";
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
  ShowerHead,
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  RefreshCw,
  Thermometer,
  AlertTriangle,
  Music,
  Settings,
  Palette
} from "lucide-react";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { useVoiceIntents, type IntentHandlers } from "@/hooks/use-voice-intents";
import { useWeatherData } from "@/hooks/use-weather-data";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { type Facility, type Route as RouteType, type Journey } from "@shared/schema";
import { useGPS } from "@/contexts/gps-context";

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
  
  // Quick action handlers
  onOpenWeatherModal?: () => void;
  onOpenEntertainmentPanel?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenThemeSelector?: () => void;
  onFocusOnFacilities?: () => void;
  onShowHistory?: () => void;
  
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
  onOpenWeatherModal,
  onOpenEntertainmentPanel,
  onOpenSettingsModal,
  onOpenThemeSelector,
  onFocusOnFacilities,
  onShowHistory,
  className
}: UnifiedSearchPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatDistance } = useMeasurement();
  
  // Get GPS position for POI search
  const gps = useGPS();
  const gpsPosition = gps?.position ?? null;
  
  // Weather data hook
  const { weatherData, isLoading: isWeatherLoading, error: weatherError, refreshWeather } = useWeatherData();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);
  
  // Refs for proper focus management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRegionRef = useRef<HTMLDivElement>(null);
  const [focusedChipIndex, setFocusedChipIndex] = useState(-1);
  
  // Quick action handlers for internal functionality
  const handleQuickFacilitiesSearch = useCallback(() => {
    // Focus on the search input using proper ref
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.placeholder = "Search for nearby truck stops, fuel stations, parking...";
    }
    
    // Clear current search and category to refresh results
    setSearchQuery("");
    setSelectedCategory(""); // This will show all facility categories
    
    // Trigger helpful toast
    toast({
      title: "🚛 Facilities Search",
      description: "Search for nearby truck stops, fuel stations, and parking areas above.",
      duration: 4000,
    });
    
    // Call the parent handler to record activity
    onFocusOnFacilities?.();
  }, [toast, onFocusOnFacilities]);

  const handleQuickHistoryView = useCallback(() => {
    // Scroll to the history section using proper ref
    setTimeout(() => {
      const historyElement = document.querySelector('[data-testid="section-navigation-history"]') || 
                           document.querySelector('.border-t');
      if (historyElement) {
        historyElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      } else {
        // Fallback: scroll to bottom of the panel using ref
        const panelElement = document.querySelector('.unified-search-panel') as HTMLElement;
        if (panelElement) {
          panelElement.scrollTo({ 
            top: panelElement.scrollHeight, 
            behavior: 'smooth' 
          });
        }
      }
    }, 100); // Small delay to ensure DOM is ready
    
    // Show helpful toast
    toast({
      title: "📍 Navigation History",
      description: "Your recent routes and saved favorites are shown below.",
      duration: 4000,
    });
    
    // Call the parent handler to record activity
    onShowHistory?.();
  }, [toast, onShowHistory]);
  
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
        } else {
          setSearchQuery(poiType);
          setSelectedCategory("");
        }
      } else if (intent.action === 'search_location' && locationEntities.length > 0) {
        const location = locationEntities[0].value;
        setSearchQuery(location);
        setSelectedCategory("");
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

  // Map POI categories to OSM tags for Photon API
  const getOSMTagForCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'fuel': 'amenity:fuel',
      'restaurant': 'amenity:restaurant',
      'parking': 'amenity:parking',
      'hotel': 'tourism:hotel',
      'truck_stop': 'highway:services',
      'rest_area': 'highway:rest_area',
      'service': 'shop:car_repair',
      'supermarket': 'shop:supermarket',
      'shop': 'shop'
    };
    return categoryMap[category] || '';
  };

  // Use Photon API for POI search with 150km radius filtering
  const { data: photonData, isLoading: isPhotonLoading, error: photonError } = useQuery({
    queryKey: ['/api/photon-autocomplete', selectedCategory, searchQuery, gpsPosition?.latitude, gpsPosition?.longitude, coordinates?.lat, coordinates?.lng],
    queryFn: async () => {
      // Use GPS position first, then coordinates prop
      // NO HARDCODED FALLBACK - real GPS only
      const lat = gpsPosition?.latitude || coordinates?.lat;
      const lng = gpsPosition?.longitude || coordinates?.lng;
      
      if (!lat || !lng) {
        console.log('[UNIFIED-SEARCH] No GPS available - skipping POI search');
        return [];
      }
      
      console.log('[UNIFIED-SEARCH] POI search with GPS:', { lat, lng });
      
      const url = new URL('/api/photon-autocomplete', window.location.origin);
      url.searchParams.set('q', selectedCategory ? POI_CATEGORIES.find(c => c.type === selectedCategory)?.label || searchQuery : searchQuery || 'amenity');
      url.searchParams.set('limit', '50');
      url.searchParams.set('lat', lat.toString());
      url.searchParams.set('lon', lng.toString());
      
      const osmTag = getOSMTagForCategory(selectedCategory);
      if (osmTag) {
        url.searchParams.set('osm_tag', osmTag);
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch POI data');
      }
      
      const data = await response.json();
      return data.features || [];
    },
    enabled: isOpen && (!!selectedCategory || searchQuery.length >= 3),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Convert Photon results to Facility format
  const facilities: Facility[] = (photonData || []).map((feature: any) => {
    const props = feature.properties || {};
    const coords = feature.geometry?.coordinates || [0, 0];
    
    return {
      id: `photon-${coords[1]}-${coords[0]}`,
      name: props.name || props.street || 'Unknown Location',
      type: selectedCategory || 'amenity',
      coordinates: { lat: coords[1], lng: coords[0] },
      address: [props.street, props.city, props.postcode].filter(Boolean).join(', '),
      amenities: [],
      rating: null,
      reviewCount: 0,
      truckParking: false,
      fuel: selectedCategory === 'fuel',
      restaurant: selectedCategory === 'restaurant',
      restrooms: false,
      showers: false,
      country: props.country || 'UK'
    } as Facility;
  });

  const isLoading = isPhotonLoading;
  const error = photonError;

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

  // Handle category selection
  const handleCategorySelect = (categoryType: string) => {
    setSelectedCategory(categoryType === selectedCategory ? "" : categoryType);
    setSearchQuery(""); // Clear text search when selecting category
  };
  
  // Handle keyboard navigation for POI chips
  const handleChipKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = index === 0 ? POI_CATEGORIES.length - 1 : index - 1;
        setFocusedChipIndex(prevIndex);
        // Focus the previous chip
        setTimeout(() => {
          const prevChip = document.querySelector(`[data-testid="button-category-chip-${POI_CATEGORIES[prevIndex].id}"]`) as HTMLButtonElement;
          prevChip?.focus();
        }, 0);
        break;
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = index === POI_CATEGORIES.length - 1 ? 0 : index + 1;
        setFocusedChipIndex(nextIndex);
        // Focus the next chip
        setTimeout(() => {
          const nextChip = document.querySelector(`[data-testid="button-category-chip-${POI_CATEGORIES[nextIndex].id}"]`) as HTMLButtonElement;
          nextChip?.focus();
        }, 0);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleCategorySelect(POI_CATEGORIES[index].type);
        break;
      case 'Escape':
        event.preventDefault();
        searchInputRef.current?.focus();
        break;
    }
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

  // Get weather icon based on condition
  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return Sun;
      case 'cloudy':
      case 'partly cloudy':
        return Cloud;
      case 'rainy':
      case 'rain':
        return CloudRain;
      case 'snowy':
      case 'snow':
        return CloudSnow;
      default:
        return Cloud;
    }
  };

  // Handle weather refresh
  const handleWeatherRefresh = useCallback(async () => {
    try {
      await refreshWeather();
      toast({
        title: "Weather Updated",
        description: "Current conditions refreshed",
      });
    } catch (error) {
      toast({
        title: "Weather Refresh Failed",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  }, [refreshWeather, toast]);

  return (
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden overlay-safe-mode:bg-transparent overlay-safe-mode:pointer-events-none" 
          onClick={onClose}
          data-testid="unified-search-panel-backdrop"
        />
      )}
      
      {/* Unified Search Panel */}
      <div className={cn(
        "unified-search-panel fixed lg:absolute top-0 right-0 h-full w-80 lg:w-96 bg-card border-l border-border z-50 flex flex-col",
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
          {/* Search Section wrapped in Card */}
          <div className="flex-1 flex flex-col overflow-hidden mt-4">
            <Card className="mx-4 mb-4 shadow-md border border-border bg-card dark:bg-card">
              <CardContent className="p-4 space-y-4">
                {/* POI Category Chips - Horizontal Scrolling */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Categories</h3>
                  <ScrollArea className="w-full">
                    <div 
                      className="flex space-x-2 pb-2"
                      role="tablist"
                      aria-label="Filter by facility categories"
                      data-testid="poi-chips-container"
                    >
                      {POI_CATEGORIES.map((category, index) => (
                        <Button
                          key={category.id}
                          variant={selectedCategory === category.type ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleCategorySelect(category.type)}
                          onKeyDown={(e) => handleChipKeyDown(e, index)}
                          className={cn(
                            "flex items-center space-x-2 whitespace-nowrap min-w-fit px-3 py-2 rounded-full transition-all",
                            "hover:shadow-sm active:scale-95 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
                            "bg-background dark:bg-background border border-border dark:border-border",
                            "text-foreground dark:text-foreground hover:bg-accent dark:hover:bg-accent",
                            selectedCategory === category.type && (
                              "bg-primary dark:bg-primary text-primary-foreground dark:text-primary-foreground border-primary dark:border-primary shadow-sm"
                            )
                          )}
                          data-testid={`button-category-chip-${category.id}`}
                          aria-label={`Filter by ${category.label}`}
                          role="tab"
                          aria-selected={selectedCategory === category.type}
                          aria-controls="search-results-region"
                          tabIndex={index === 0 || selectedCategory === category.type ? 0 : -1}
                        >
                          <category.icon className="w-4 h-4" />
                          <span className="text-xs font-medium">{category.label}</span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-12 bg-background dark:bg-background border-border dark:border-border text-foreground dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                    data-testid="input-search-query"
                    aria-label="Search for locations"
                    aria-describedby="search-results-live"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <VoiceMicButton
                      state={searchVoiceCommands.state}
                      size="sm"
                      onToggle={handleVoiceSearchToggle}
                      data-testid="button-voice-search"
                      aria-label="Voice search"
                    />
                  </div>
                </div>

                {(searchQuery || selectedCategory) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="w-full bg-muted/50 dark:bg-muted/50 hover:bg-muted dark:hover:bg-muted text-foreground dark:text-foreground"
                    data-testid="button-clear-search"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Search
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Grid */}
            <Card className="mx-4 mb-4 mt-6 shadow-sm border border-border bg-card dark:bg-card">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Weather Button */}
                  <Button
                    variant="outline"
                    onClick={onOpenWeatherModal}
                    className={cn(
                      "h-16 p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200",
                      "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600",
                      "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
                      "hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500",
                      "focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2",
                      "active:scale-95"
                    )}
                    aria-label="Open weather information"
                    data-testid="button-quickaction-weather"
                  >
                    <Cloud className="w-5 h-5" />
                    <span className="text-xs font-medium">Weather</span>
                  </Button>

                  {/* Facilities Button */}
                  <Button
                    variant="outline"
                    onClick={handleQuickFacilitiesSearch}
                    className={cn(
                      "h-16 p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200",
                      "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600",
                      "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
                      "hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500",
                      "focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2",
                      "active:scale-95"
                    )}
                    aria-label="Focus on facilities search"
                    data-testid="button-quickaction-facilities"
                  >
                    <MapPin className="w-5 h-5" />
                    <span className="text-xs font-medium">Facilities</span>
                  </Button>

                  {/* History Button */}
                  <Button
                    variant="outline"
                    onClick={handleQuickHistoryView}
                    className={cn(
                      "h-16 p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200",
                      "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600",
                      "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
                      "hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500",
                      "focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2",
                      "active:scale-95"
                    )}
                    aria-label="Show navigation history"
                    data-testid="button-quickaction-history"
                  >
                    <Clock className="w-5 h-5" />
                    <span className="text-xs font-medium">History</span>
                  </Button>

                  {/* Entertainment Button */}
                  <Button
                    variant="outline"
                    onClick={onOpenEntertainmentPanel}
                    className={cn(
                      "h-16 p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200",
                      "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600",
                      "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
                      "hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500",
                      "focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2",
                      "active:scale-95"
                    )}
                    aria-label="Open entertainment panel"
                    data-testid="button-quickaction-entertainment"
                  >
                    <Music className="w-5 h-5" />
                    <span className="text-xs font-medium">Entertainment</span>
                  </Button>

                  {/* Settings Button */}
                  <Button
                    variant="outline"
                    onClick={onOpenSettingsModal}
                    className={cn(
                      "h-16 p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200",
                      "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600",
                      "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
                      "hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500",
                      "focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2",
                      "active:scale-95"
                    )}
                    aria-label="Open settings modal"
                    data-testid="button-quickaction-settings"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-xs font-medium">Settings</span>
                  </Button>

                  {/* Theme Button */}
                  <Button
                    variant="outline"
                    onClick={onOpenThemeSelector}
                    className={cn(
                      "h-16 p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200",
                      "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600",
                      "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
                      "hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500",
                      "focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2",
                      "active:scale-95"
                    )}
                    aria-label="Open theme selector"
                    data-testid="button-quickaction-theme"
                  >
                    <Palette className="w-5 h-5" />
                    <span className="text-xs font-medium">Theme</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Weather Preview Card */}
            <Card className="mx-4 mb-4 shadow-sm border border-border bg-card dark:bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Current Weather</h3>
                  {weatherData && !isWeatherLoading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleWeatherRefresh}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Refresh weather data"
                      data-testid="button-refresh-weather-preview"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                {isWeatherLoading ? (
                  /* Loading State */
                  <div className="space-y-3" data-testid="weather-preview-loading">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-12" />
                    </div>
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : weatherError ? (
                  /* Error State */
                  <div className="text-center py-4 space-y-2" data-testid="weather-preview-error">
                    <AlertTriangle className="w-8 h-8 mx-auto text-orange-500 dark:text-orange-400" />
                    <p className="text-sm text-muted-foreground">Weather data unavailable</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWeatherRefresh}
                      className="h-8 px-3 text-xs"
                      data-testid="button-retry-weather"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                ) : weatherData ? (
                  /* Weather Data Display */
                  <div className="space-y-3" data-testid="weather-preview-data">
                    {/* Weather Summary */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {(() => {
                          const WeatherIcon = getWeatherIcon(weatherData.condition);
                          return (
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20">
                              <WeatherIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                          );
                        })()}
                        <div>
                          <div className="text-lg font-semibold text-foreground dark:text-foreground" data-testid="text-weather-temperature">
                            {weatherData.temperature}°C
                          </div>
                          <div className="text-xs text-muted-foreground dark:text-muted-foreground" data-testid="text-weather-condition">
                            {weatherData.condition}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground dark:text-muted-foreground" data-testid="text-weather-location">
                          {weatherData.location}
                        </div>
                      </div>
                    </div>

                    {/* Weather Alerts */}
                    {weatherData.alerts && weatherData.alerts.length > 0 && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-2">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-3 h-3 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                          <div className="text-xs text-orange-700 dark:text-orange-300" data-testid="text-weather-alert">
                            {weatherData.alerts[0]}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Open Weather Button */}
                    <Button
                      variant="outline"
                      onClick={onOpenWeatherModal}
                      className={cn(
                        "w-full h-8 text-xs font-medium transition-all duration-200",
                        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600",
                        "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
                        "hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500",
                        "focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2",
                        "active:scale-95"
                      )}
                      aria-label="Open detailed weather information"
                      data-testid="button-open-weather-modal"
                    >
                      <Cloud className="w-3 h-3 mr-1" />
                      Open Weather
                    </Button>
                  </div>
                ) : (
                  /* No Data State */
                  <div className="text-center py-4 space-y-2" data-testid="weather-preview-empty">
                    <Cloud className="w-8 h-8 mx-auto text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">No weather data</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWeatherRefresh}
                      className="h-8 px-3 text-xs"
                      data-testid="button-load-weather"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Load Weather
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Aria-live region for search results updates */}
            <div 
              id="search-results-live" 
              className="sr-only" 
              aria-live="polite" 
              aria-atomic="true"
              data-testid="search-results-live-region"
            >
              {isLoading ? "Searching for locations..." : 
               filteredFacilities.length === 0 ? "No locations found" :
               `Found ${filteredFacilities.length} location${filteredFacilities.length !== 1 ? 's' : ''}`}
            </div>

            {/* Search Results with improved design */}
            <div 
              className="flex-1 overflow-hidden"
              id="search-results-region"
              role="region"
              aria-label="Search results"
              data-testid="search-results-region"
            >
              <ScrollArea className="h-full">
                <div className="px-4 pb-4 space-y-3">
                  {isLoading ? (
                    /* Skeleton Loading States */
                    <div className="space-y-3" data-testid="search-results-loading">
                      <h4 className="text-sm font-medium text-muted-foreground dark:text-muted-foreground px-2 mb-3">
                        Searching nearby locations...
                      </h4>
                      {[1, 2, 3, 4].map((index) => (
                        <Card key={index} className="p-4 bg-card dark:bg-card border border-border dark:border-border">
                          <div className="flex items-center space-x-4">
                            {/* Icon skeleton */}
                            <Skeleton className="h-10 w-10 rounded-lg bg-muted dark:bg-muted" />
                            
                            {/* Content skeleton */}
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4 bg-muted dark:bg-muted" />
                              <Skeleton className="h-3 w-1/2 bg-muted dark:bg-muted" />
                              <div className="flex space-x-2">
                                <Skeleton className="h-5 w-16 rounded-full bg-muted dark:bg-muted" />
                                <Skeleton className="h-5 w-12 rounded-full bg-muted dark:bg-muted" />
                              </div>
                            </div>
                            
                            {/* Actions skeleton */}
                            <div className="flex flex-col space-y-2">
                              <Skeleton className="h-8 w-8 rounded bg-muted dark:bg-muted" />
                              <Skeleton className="h-8 w-8 rounded bg-muted dark:bg-muted" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : filteredFacilities.length === 0 ? (
                    /* Enhanced Empty State */
                    <div className="text-center py-12" data-testid="search-results-empty">
                      <div className="mb-4">
                        <MapPin className="w-16 h-16 text-muted-foreground dark:text-muted-foreground mx-auto mb-3 opacity-50" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">
                        No locations found
                      </h3>
                      <p className="text-muted-foreground dark:text-muted-foreground mb-4 max-w-sm mx-auto">
                        {searchQuery || selectedCategory 
                          ? "Try adjusting your search terms or selected category"
                          : "Enter a search term or select a category to find nearby places"
                        }
                      </p>
                      {(searchQuery || selectedCategory) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleClearSearch}
                          className="mt-2 bg-background dark:bg-background border-border dark:border-border text-foreground dark:text-foreground hover:bg-accent dark:hover:bg-accent"
                          data-testid="button-clear-search-empty"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Clear filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    /* Enhanced Results Cards */
                    <>
                      <h4 className="text-sm font-medium text-muted-foreground dark:text-muted-foreground px-2 mb-3">
                        Found {filteredFacilities.length} location{filteredFacilities.length !== 1 ? 's' : ''}
                      </h4>
                      {filteredFacilities.map((facility: Facility) => {
                        // Get facility type icon
                        const getFacilityTypeIcon = () => {
                          const category = POI_CATEGORIES.find(cat => cat.type === facility.type);
                          const IconComponent = category?.icon || MapPin;
                          return <IconComponent className="w-6 h-6 text-primary dark:text-primary" />;
                        };
                        
                        return (
                          <Card 
                            key={facility.id} 
                            className="group p-4 hover:shadow-lg transition-all duration-200 cursor-pointer bg-card dark:bg-card border border-border dark:border-border hover:border-primary/20 dark:hover:border-primary/20"
                            onClick={() => handleFacilitySelect(facility)}
                            data-testid={`facility-card-${facility.id}`}
                            role="button"
                            tabIndex={0}
                            aria-label={`Select ${facility.name} at ${facility.address}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleFacilitySelect(facility);
                              }
                            }}
                            onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
                          >
                            <div className="flex items-center space-x-4">
                              {/* Icon on the left */}
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/10 border border-primary/20 dark:border-primary/20 flex items-center justify-center group-hover:bg-primary/15 dark:group-hover:bg-primary/15 transition-colors">
                                  {getFacilityTypeIcon()}
                                </div>
                              </div>
                              
                              {/* Primary and secondary text lines */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-foreground dark:text-foreground text-sm truncate group-hover:text-primary dark:group-hover:text-primary transition-colors">
                                      {facility.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5 truncate">
                                      {facility.address}
                                    </p>
                                  </div>
                                  
                                  {/* Rating */}
                                  {facility.rating && (
                                    <div className="flex items-center space-x-1 ml-2">
                                      <Star className="w-3 h-3 text-yellow-500 dark:text-yellow-400 fill-current" />
                                      <span className="text-xs font-medium text-foreground dark:text-foreground">
                                        {facility.rating}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Badges */}
                                <div className="flex items-center space-x-1 mt-2">
                                  <Badge 
                                    variant={facility.truckParking ? "default" : "secondary"}
                                    className="text-xs bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground border border-border dark:border-border"
                                  >
                                    {facility.truckParking ? "Truck Parking" : "Limited"}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs capitalize bg-background dark:bg-background border-border dark:border-border text-muted-foreground dark:text-muted-foreground"
                                  >
                                    {facility.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                                
                                {/* Amenities */}
                                {(() => {
                                  const amenities = facility.amenities as string[] | null;
                                  return amenities && Array.isArray(amenities) && amenities.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {amenities.slice(0, 3).map((amenity: string) => (
                                        <div 
                                          key={amenity} 
                                          className="flex items-center space-x-1 text-xs text-muted-foreground dark:text-muted-foreground bg-muted/50 dark:bg-muted/50 rounded px-2 py-1 border border-border/50 dark:border-border/50"
                                        >
                                          {getAmenityIcon(amenity)}
                                          <span className="capitalize">{amenity}</span>
                                        </div>
                                      ))}
                                      {amenities.length > 3 && (
                                        <span className="text-xs text-muted-foreground dark:text-muted-foreground bg-muted/50 dark:bg-muted/50 rounded px-2 py-1 border border-border/50 dark:border-border/50">
                                          +{amenities.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                              
                              {/* Trailing inline actions */}
                              <div className="flex flex-col space-y-1 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={cn(
                                    "h-8 w-8 p-0 transition-all duration-200 rounded-md",
                                    "text-muted-foreground dark:text-muted-foreground",
                                    "hover:bg-primary/10 dark:hover:bg-primary/10",
                                    "hover:text-primary dark:hover:text-primary",
                                    "focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:outline-none",
                                    "active:scale-95"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigateToLocation?.(`${facility.name}, ${facility.address}`);
                                    toast({
                                      title: "Navigation started",
                                      description: `Navigating to ${facility.name}`
                                    });
                                  }}
                                  data-testid={`button-navigate-${facility.id}`}
                                  aria-label={`Navigate to ${facility.name}`}
                                >
                                  <RouteIcon className="w-4 h-4" />
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={cn(
                                    "h-8 w-8 p-0 transition-all duration-200 rounded-md",
                                    "text-muted-foreground dark:text-muted-foreground",
                                    "hover:bg-yellow-50 dark:hover:bg-yellow-900/20",
                                    "hover:text-yellow-700 dark:hover:text-yellow-400",
                                    "focus:ring-2 focus:ring-yellow-500/50 focus:ring-offset-2 focus:outline-none",
                                    "active:scale-95"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Implement save functionality here
                                  }}
                                  data-testid={`button-save-${facility.id}`}
                                  aria-label={`Save ${facility.name} to favorites`}
                                >
                                  <BookmarkPlus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </>
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