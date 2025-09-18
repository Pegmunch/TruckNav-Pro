import { useState, useEffect, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
import { 
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Star,
  Fuel,
  ParkingMeter,
  Utensils,
  ShoppingCart,
  Coffee,
  Car,
  Wrench,
  Bed,
  ShowerHead,
  Wifi,
  Phone,
  Building,
  Truck,
  Navigation,
  MapPin as ToiletIcon,
  Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { useVoiceIntents, type IntentHandlers } from "@/hooks/use-voice-intents";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { type Facility } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface SearchSidebarProps {
  // Sidebar state
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
  
  // Search functionality
  coordinates?: { lat: number; lng: number };
  onSelectFacility?: (facility: Facility) => void;
  onNavigateToLocation?: (location: string) => void;
}

// POI Categories with automotive-focused options
const POI_CATEGORIES = [
  { id: 'truck_stop', label: 'Truck Stops', icon: Truck, type: 'truck_stop', color: 'bg-blue-500' },
  { id: 'fuel', label: 'Fuel Stations', icon: Fuel, type: 'fuel', color: 'bg-red-500' },
  { id: 'parking', label: 'Parking', icon: ParkingMeter, type: 'parking', color: 'bg-green-500' },
  { id: 'restaurant', label: 'Restaurants', icon: Utensils, type: 'restaurant', color: 'bg-orange-500' },
  { id: 'supermarket', label: 'Supermarkets', icon: ShoppingCart, type: 'supermarket', color: 'bg-purple-500' },
  { id: 'shop', label: 'Shops', icon: Building, type: 'shop', color: 'bg-indigo-500' },
  { id: 'coffee', label: 'Coffee Shops', icon: Coffee, type: 'coffee', color: 'bg-amber-600' },
  { id: 'hotel', label: 'Hotels', icon: Bed, type: 'hotel', color: 'bg-pink-500' },
  { id: 'toilet', label: 'Toilets', icon: ToiletIcon, type: 'toilet', color: 'bg-cyan-500' },
  { id: 'repair', label: 'Repair Shops', icon: Wrench, type: 'repair', color: 'bg-gray-500' },
];

// Memoized search sidebar component for automotive performance
const SearchSidebar = memo(function SearchSidebar({
  isOpen,
  onToggle,
  isCollapsed,
  onCollapseToggle,
  coordinates,
  onSelectFacility,
  onNavigateToLocation,
}: SearchSidebarProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);
  
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

  // Build search query parameters
  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (coordinates) {
      params.set('lat', coordinates.lat.toString());
      params.set('lng', coordinates.lng.toString());
      params.set('radius', '25');
    }
    
    if (selectedCategory) {
      params.set('type', selectedCategory);
    }
    
    return params.toString();
  }, [coordinates, selectedCategory]);

  // Facilities search query
  const searchParams = buildSearchParams();
  const { data: facilities = [], isLoading } = useQuery<Facility[]>({
    queryKey: ['/api/facilities', searchParams],
    queryFn: async () => {
      const url = searchParams ? `/api/facilities?${searchParams}` : '/api/facilities';
      const response = await fetch(url);
      return response.json();
    },
    enabled: isOpen, // Only fetch when sidebar is open
  });

  // Filter facilities by search query
  const filteredFacilities = facilities.filter((facility: Facility) =>
    facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    facility.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Get amenity icon
  const getAmenityIcon = (amenity: string): JSX.Element => {
    switch (amenity) {
      case 'fuel': return <Fuel className="w-3 h-3" />;
      case 'parking': return <ParkingMeter className="w-3 h-3" />;
      case 'restaurant': return <Utensils className="w-3 h-3" />;
      case 'restrooms': return <ToiletIcon className="w-3 h-3" />;
      case 'showers': return <ShowerHead className="w-3 h-3" />;
      case 'wifi': return <Wifi className="w-3 h-3" />;
      case 'phone': return <Phone className="w-3 h-3" />;
      default: return <MapPin className="w-3 h-3" />;
    }
  };

  return (
    <>
      {/* Sidebar Tab Toggle Button */}
      <div
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ease-in-out",
          isOpen 
            ? (isCollapsed ? "left-1/2 -translate-x-8" : "left-1/2 -translate-x-40") 
            : "left-1/2 -translate-x-4"
        )}
      >
        <Button
          onClick={onToggle}
          variant="default"
          className={cn(
            "h-16 w-8 rounded-l-lg rounded-r-lg px-0 py-0",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "border border-border shadow-lg",
            "scalable-control-button flex flex-col items-center justify-center gap-1",
            "transform transition-all duration-300 ease-in-out",
            !isOpen && "hover:scale-105"
          )}
          data-testid="button-toggle-search-sidebar-tab"
        >
          <Search className="w-4 h-4" />
          <div className="text-xs font-medium leading-none">
            S
          </div>
        </Button>
      </div>

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed left-1/2 top-0 h-screen bg-background border-l border-r border-border z-30 shadow-lg",
          "automotive-layout sidebar-transition -translate-x-1/2",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          isCollapsed ? "w-16" : "w-80",
          "flex flex-col"
        )}
        data-testid="search-sidebar-panel"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Search POI</h2>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearSearch}
                className="scalable-control-button"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onCollapseToggle}
              className="scalable-control-button"
              data-testid="button-collapse-search-sidebar"
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
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-12 automotive-input scalable-control-button"
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
            </div>

            <Separator />

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
        )}

        {/* Collapsed Icon State */}
        {isCollapsed && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Search className="w-8 h-8 text-primary" />
            <div className="text-xs text-muted-foreground text-center px-2">
              Search
            </div>
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={onToggle}
          data-testid="search-sidebar-overlay"
        />
      )}
    </>
  );
});

export default SearchSidebar;