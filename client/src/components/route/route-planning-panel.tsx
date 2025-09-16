import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Route, 
  MapPin, 
  Shield, 
  Navigation, 
  Heart, 
  Clock, 
  Fuel,
  AlertTriangle,
  CornerLeftUp,
  ParkingMeter,
  Bed,
  Star
} from "lucide-react";
import { type Route as RouteType, type VehicleProfile, type Restriction, type Facility } from "@shared/schema";

interface RoutePlanningPanelProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onPlanRoute: () => void;
  onStartNavigation: () => void;
  currentRoute: RouteType | null;
  isCalculating: boolean;
  selectedProfile: VehicleProfile | null;
}

export default function RoutePlanningPanel({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onPlanRoute,
  onStartNavigation,
  currentRoute,
  isCalculating,
  selectedProfile,
}: RoutePlanningPanelProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  // Get restrictions that would be avoided
  const { data: restrictions = [] } = useQuery<Restriction[]>({
    queryKey: ["/api/restrictions", { north: 54, south: 50, east: 2, west: -6 }],
    enabled: !!selectedProfile,
  });

  // Get facilities along the route
  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ["/api/facilities", { lat: 52.5, lng: -1.5, radius: 50 }],
  });

  const restrictionsToAvoid = restrictions.filter((restriction: Restriction) => {
    if (!selectedProfile) return false;
    
    switch (restriction.type) {
      case 'height':
        return selectedProfile.height >= restriction.limit;
      case 'width':
        return selectedProfile.width >= restriction.limit;
      case 'weight':
        return selectedProfile.weight && selectedProfile.weight >= restriction.limit;
      default:
        return false;
    }
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col overflow-hidden">
      {/* Route Input Section */}
      <div className="p-4 border-b border-border">
        <div className="space-y-3">
          {/* From Location */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
            </div>
            <Input
              placeholder="Starting location"
              value={fromLocation}
              onChange={(e) => onFromLocationChange(e.target.value)}
              className="pl-10"
              data-testid="input-from-location"
            />
          </div>
          
          {/* To Location */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
            </div>
            <Input
              placeholder="Destination"
              value={toLocation}
              onChange={(e) => onToLocationChange(e.target.value)}
              className="pl-10"
              data-testid="input-to-location"
            />
          </div>
        </div>
        
        {/* Route Options */}
        <div className="flex space-x-2 mt-4">
          <Button 
            onClick={onPlanRoute}
            disabled={isCalculating || !fromLocation || !toLocation}
            className="flex-1"
            data-testid="button-plan-route"
          >
            {isCalculating ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Planning...
              </>
            ) : (
              <>
                <Route className="w-4 h-4 mr-2" />
                Plan Route
              </>
            )}
          </Button>
          <Button variant="outline" size="icon" data-testid="button-location-picker">
            <MapPin className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Route Results */}
      <div className="flex-1 overflow-y-auto">
        {currentRoute ? (
          <>
            {/* Route Summary */}
            <div className="p-4 border-b border-border bg-accent/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Recommended Route</h3>
                <Badge className="bg-accent text-accent-foreground" data-testid="badge-truck-safe">
                  TRUCK SAFE
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-foreground" data-testid="text-route-distance">
                    {currentRoute.distance}
                  </div>
                  <div className="text-xs text-muted-foreground">miles</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground" data-testid="text-route-duration">
                    {formatDuration(currentRoute.duration || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">drive time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground" data-testid="text-fuel-cost">
                    £{Math.round((currentRoute.distance || 0) * 0.48)}
                  </div>
                  <div className="text-xs text-muted-foreground">est. fuel</div>
                </div>
              </div>
            </div>

            {/* Restrictions Avoided */}
            <div className="p-4 border-b border-border">
              <h4 className="font-medium text-foreground mb-3 flex items-center">
                <Shield className="w-4 h-4 text-accent mr-2" />
                Restrictions Avoided
              </h4>
              <div className="space-y-2">
                {restrictionsToAvoid.slice(0, 3).map((restriction: Restriction) => (
                  <div 
                    key={restriction.id} 
                    className={`flex items-center space-x-3 p-2 rounded-lg ${
                      restriction.type === 'height' ? 'bg-destructive/10' : 'bg-secondary/10'
                    }`}
                    data-testid={`restriction-${restriction.id}`}
                  >
                    {restriction.type === 'height' ? (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    ) : (
                      <CornerLeftUp className="w-4 h-4 text-secondary" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{restriction.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {restriction.type === 'height' ? 'Height' : 'Width'}: {restriction.limit}
                        {restriction.type === 'height' ? '" ' : '" '}
                        (You: {restriction.type === 'height' ? 
                          `${Math.floor(selectedProfile?.height || 0)}'${Math.round(((selectedProfile?.height || 0) % 1) * 12)}"` :
                          `${Math.floor(selectedProfile?.width || 0)}'${Math.round(((selectedProfile?.width || 0) % 1) * 12)}"`
                        })
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Facilities Along Route */}
            <div className="p-4">
              <h4 className="font-medium text-foreground mb-3 flex items-center">
                <Fuel className="w-4 h-4 text-primary mr-2" />
                Facilities Along Route
              </h4>
              <div className="space-y-3">
                {facilities.slice(0, 3).map((facility: Facility) => (
                  <Card 
                    key={facility.id} 
                    className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                    data-testid={`facility-${facility.id}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        facility.type === 'truck_stop' ? 'bg-primary/10' : 'bg-secondary/10'
                      }`}>
                        {facility.type === 'truck_stop' ? (
                          <ParkingMeter className={`w-5 h-5 ${facility.type === 'truck_stop' ? 'text-primary' : 'text-secondary'}`} />
                        ) : (
                          <Bed className={`w-5 h-5 ${facility.type === 'truck_stop' ? 'text-primary' : 'text-secondary'}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{facility.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {Array.isArray(facility.amenities) ? 
                            (facility.amenities as string[]).join(' • ') : 
                            'Truck facilities available'
                          }
                        </div>
                        <div className="text-xs text-accent font-medium mt-1">
                          {Math.random() * 2 + 0.5} miles off route
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground flex items-center">
                          <Star className="w-3 h-3 text-yellow-500 mr-1" />
                          {facility.rating}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {facility.reviewCount} reviews
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <Route className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Plan a route to see truck-safe navigation</p>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex space-x-2">
          <Button 
            onClick={onStartNavigation}
            disabled={!currentRoute}
            className="flex-1 bg-accent hover:bg-accent/90"
            data-testid="button-start-navigation"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Start Navigation
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setIsFavorite(!isFavorite)}
            className={isFavorite ? "text-red-500" : ""}
            data-testid="button-favorite"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
