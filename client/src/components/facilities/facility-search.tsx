import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MapPin, 
  Star, 
  Fuel, 
  ParkingMeter, 
  Utensils, 
  Bed, 
  ShoppingCart,
  ShowerHead,
  Wifi,
  Phone
} from "lucide-react";
import { type Facility } from "@shared/schema";

interface FacilitySearchProps {
  coordinates?: { lat: number; lng: number };
  onSelectFacility?: (facility: Facility) => void;
}

export default function FacilitySearch({ coordinates, onSelectFacility }: FacilitySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [facilityType, setFacilityType] = useState<string>("");

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

  // Build query parameters dynamically
  const queryParams = new URLSearchParams();
  if (coordinates) {
    queryParams.set('lat', coordinates.lat.toString());
    queryParams.set('lng', coordinates.lng.toString());
    queryParams.set('radius', getPoiRadius().toString());
  }
  if (facilityType) {
    queryParams.set('type', facilityType);
  }
  
  const queryString = queryParams.toString();
  const apiUrl = queryString ? `/api/facilities?${queryString}` : '/api/facilities';

  const { data: facilities = [], isLoading } = useQuery<Facility[]>({
    queryKey: [apiUrl],
  });

  const filteredFacilities = facilities.filter((facility: Facility) =>
    facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    facility.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const facilityTypes = [
    { value: "", label: "All", icon: Search },
    { value: "truck_stop", label: "Truck Stops", icon: Fuel },
    { value: "fuel", label: "Fuel", icon: Fuel },
    { value: "parking", label: "ParkingMeter", icon: ParkingMeter },
    { value: "restaurant", label: "Food", icon: Utensils },
    { value: "supermarket", label: "Supermarkets", icon: ShoppingCart },
    { value: "hotel", label: "Hotels", icon: Bed },
  ];

  const getAmenityIcon = (amenity: string): JSX.Element => {
    switch (amenity) {
      case 'fuel': return <Fuel className="w-3 h-3" />;
      case 'parking': return <ParkingMeter className="w-3 h-3" />;
      case 'restaurant': return <Utensils className="w-3 h-3" />;
      case 'restrooms': return <MapPin className="w-3 h-3" />;
      case 'showers': return <ShowerHead className="w-3 h-3" />;
      case 'wifi': return <Wifi className="w-3 h-3" />;
      case 'phone': return <Phone className="w-3 h-3" />;
      default: return <MapPin className="w-3 h-3" />;
    }
  };

  // Add event listener for voice-to-manual interface
  useEffect(() => {
    const handleFacilitySearch = (event: CustomEvent) => {
      const { query, type } = event.detail;
      
      if (query !== undefined) {
        setSearchQuery(query);
      }
      
      if (type !== undefined) {
        setFacilityType(type);
      }
    };

    window.addEventListener('search:facility', handleFacilitySearch as EventListener);

    return () => {
      window.removeEventListener('search:facility', handleFacilitySearch as EventListener);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search facilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-facility-search"
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2">
          {facilityTypes.map((type) => (
            <Button
              key={type.value}
              variant={facilityType === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFacilityType(type.value)}
              className="whitespace-nowrap"
              data-testid={`button-filter-${type.value || 'all'}`}
            >
              <type.icon className="w-4 h-4 mr-1" />
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Searching facilities...</p>
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No facilities found</p>
          </div>
        ) : (
          filteredFacilities.map((facility: Facility) => (
            <Card 
              key={facility.id} 
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectFacility?.(facility)}
              data-testid={`facility-card-${facility.id}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{facility.name}</h3>
                  <p className="text-sm text-muted-foreground">{facility.address}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{facility.rating}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{facility.reviewCount} reviews</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-3">
                <Badge variant={facility.truckParking ? "default" : "secondary"}>
                  {facility.truckParking ? "Truck ParkingMeter" : "Limited ParkingMeter"}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {facility.type.replace('_', ' ')}
                </Badge>
              </div>

              {(() => {
                const amenities = facility.amenities as string[] | null;
                return amenities && Array.isArray(amenities) && (
                  <div className="flex flex-wrap gap-2">
                    {amenities.slice(0, 5).map((amenity: string) => (
                      <div 
                        key={amenity} 
                        className="flex items-center space-x-1 text-xs text-muted-foreground bg-muted rounded px-2 py-1"
                      >
                        {getAmenityIcon(amenity)}
                        <span className="capitalize">{amenity}</span>
                      </div>
                    ))}
                    {amenities.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{amenities.length - 5} more
                      </span>
                    )}
                  </div>
                );
              })()}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
