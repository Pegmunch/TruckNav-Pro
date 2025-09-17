import { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Plus, 
  Minus, 
  Crosshair, 
  MapPin, 
  AlertTriangle,
  ParkingMeter,
  Fuel,
  Navigation
} from "lucide-react";
import { type Route, type VehicleProfile, type Restriction, type Facility } from "@shared/schema";

interface InteractiveMapProps {
  currentRoute: Route | null;
  selectedProfile: VehicleProfile | null;
}

// Memoized for mobile performance - only re-renders when route or profile changes
const InteractiveMap = memo(function InteractiveMap({ currentRoute, selectedProfile }: InteractiveMapProps) {
  const [zoomLevel, setZoomLevel] = useState(10); // Default zoom level
  
  // Get restrictions for the current view
  const { data: restrictions = [] } = useQuery<Restriction[]>({
    queryKey: ["/api/restrictions?north=54&south=50&east=2&west=-6"],
    enabled: !!selectedProfile,
  });

  // Get facilities for the current view
  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ["/api/facilities?lat=52.5&lng=-1.5&radius=50"],
  });

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 18)); // Max zoom level 18
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 1)); // Min zoom level 1
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Current location:", position.coords.latitude, position.coords.longitude);
          // In a real implementation, this would center the map on the user's location
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  return (
    <div className="flex-1 relative map-container">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <Card className="overflow-hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-none border-b" 
            data-testid="button-zoom-in"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 18}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-none" 
            data-testid="button-zoom-out"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
          >
            <Minus className="w-4 h-4" />
          </Button>
        </Card>
        
        {/* Layer Controls */}
        <Card className="p-2 space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="button-layer-roads">
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            Roads
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="button-layer-satellite">
            <div className="w-4 h-4 mr-2 bg-muted rounded"></div>
            Satellite
          </Button>
          <Button variant="default" size="sm" className="w-full justify-start bg-accent/10 text-accent hover:bg-accent/20" data-testid="button-layer-truck">
            <Navigation className="w-4 h-4 mr-2" />
            Truck Routes
          </Button>
        </Card>
      </div>

      {/* Current Location Button */}
      <Button 
        variant="outline" 
        size="icon" 
        className="absolute bottom-20 right-4 bg-card shadow-lg"
        data-testid="button-current-location"
        onClick={handleCurrentLocation}
      >
        <Crosshair className="w-4 h-4" />
      </Button>
      
      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 left-4 bg-card border border-border rounded px-2 py-1 text-xs shadow-lg">
        Zoom: {zoomLevel}
      </div>

      {/* Mock Map Elements */}
      {currentRoute && (
        <>
          {/* Route Line */}
          <div 
            className="route-line" 
            style={{ 
              top: '35%', 
              left: '20%', 
              width: '60%', 
              transform: 'rotate(15deg)' 
            }}
            data-testid="route-line"
          ></div>
          
          {/* Starting Point */}
          <div className="absolute" style={{ top: '30%', left: '15%' }} data-testid="marker-start">
            <div className="w-6 h-6 bg-accent border-4 border-white rounded-full shadow-lg"></div>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg">
              {currentRoute.startLocation.split(' ')[0]}
            </div>
          </div>

          {/* Destination Point */}
          <div className="absolute" style={{ top: '45%', left: '75%' }} data-testid="marker-destination">
            <div className="w-6 h-6 bg-destructive border-4 border-white rounded-full shadow-lg"></div>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg">
              {currentRoute.endLocation.split(' ')[0]}
            </div>
          </div>
        </>
      )}

      {/* Restriction Markers */}
      {restrictions.slice(0, 2).map((restriction: Restriction, index: number) => (
        <div 
          key={restriction.id}
          className="absolute restriction-marker" 
          style={{ 
            top: `${32 + index * 5}%`, 
            left: `${30 + index * 15}%` 
          }}
          data-testid={`marker-restriction-${restriction.id}`}
        >
          <div className="w-5 h-5 bg-destructive border-2 border-white rounded-full shadow-lg"></div>
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground rounded px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg">
            <AlertTriangle className="w-3 h-3 mr-1 inline" />
            {restriction.description}
          </div>
        </div>
      ))}

      {/* Truck Stop Markers */}
      {facilities.slice(0, 2).map((facility: Facility, index: number) => (
        <div 
          key={facility.id}
          className="absolute" 
          style={{ 
            top: `${38 + index * 7}%`, 
            left: `${45 + index * 10}%` 
          }}
          data-testid={`marker-facility-${facility.id}`}
        >
          <div className="w-8 h-8 bg-primary border-3 border-white rounded-lg shadow-lg flex items-center justify-center">
            {facility.type === 'truck_stop' ? (
              <Fuel className="w-4 h-4 text-white" />
            ) : (
              <ParkingMeter className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg">
            <ParkingMeter className="w-3 h-3 mr-1 text-primary inline" />
            {facility.name.split(' ')[0]}
          </div>
        </div>
      ))}

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
              <span className="text-sm text-muted-foreground">Start</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-sm text-muted-foreground">Safe Route</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
              <span className="text-sm text-muted-foreground">Restrictions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-secondary rounded-full"></div>
              <span className="text-sm text-muted-foreground">Facilities</span>
            </div>
          </div>
          
          {facilities && facilities.length > 0 && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground" data-testid="text-next-facility">
                  Next: {facilities[0]?.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  12 miles • {Array.isArray(facilities[0]?.amenities) ? 
                    (facilities[0].amenities as string[]).slice(0, 2).join(' & ') : 
                    'Services'} available
                </div>
              </div>
              <Button size="sm" data-testid="button-facility-details">
                Details
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default InteractiveMap;
