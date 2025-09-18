import { useState, memo, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Star,
  Square,
  Loader2
} from "lucide-react";
import { type Route as RouteType, type VehicleProfile, type Restriction, type Facility, type Journey } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { useTrafficState } from "@/hooks/use-traffic";
import LocationDropdown from "./location-dropdown";
import TrafficConditionsDisplay from "@/components/traffic/traffic-conditions-display";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RoutePlanningPanelProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onPlanRoute: () => void;
  onStartNavigation: () => void;
  onStopNavigation?: () => void;
  onOpenLaneSelection?: () => void;
  currentRoute: RouteType | null;
  isCalculating: boolean;
  selectedProfile: VehicleProfile | null;
  activeJourney?: Journey | null;
  isNavigating?: boolean;
  isStartingJourney?: boolean;
  isCompletingJourney?: boolean;
}

// Memoized for mobile performance - prevents unnecessary re-renders
const RoutePlanningPanel = memo(function RoutePlanningPanel({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onPlanRoute,
  onStartNavigation,
  onStopNavigation,
  onOpenLaneSelection,
  currentRoute,
  isCalculating,
  selectedProfile,
  activeJourney,
  isNavigating = false,
  isStartingJourney = false,
  isCompletingJourney = false,
}: RoutePlanningPanelProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const { formatDistance, formatHeight, system, convertDistance } = useMeasurement();
  const { toast } = useToast();

  // Get traffic state for current route
  const {
    trafficConditions,
    isLoadingConditions,
    shouldReroute,
    timeSavingsAvailable,
    bestAlternative,
    rerouteReason,
    alternatives,
    isLoadingAlternatives,
    isMonitoring,
    error: trafficError,
  } = useTrafficState(currentRoute?.id || null, selectedProfile);

  // Get restrictions that would be avoided
  const { data: restrictions = [] } = useQuery<Restriction[]>({
    queryKey: ["/api/restrictions?north=54&south=50&east=2&west=-6"],
    enabled: !!selectedProfile,
  });

  // Memoize expensive calculations for mobile performance
  const restrictionsToAvoid = useMemo(() => {
    if (!selectedProfile || !restrictions.length) return [];
    
    return restrictions.filter((restriction: Restriction) => {
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
  }, [selectedProfile, restrictions]);

  // Memoize duration formatting to prevent recalculation
  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, []);

  // Memoize fuel cost calculation to ensure accuracy across measurement systems
  const calculateFuelCost = useCallback((distanceInMiles: number) => {
    if (system === 'imperial') {
      // Imperial: £0.48 per mile
      return Math.round(distanceInMiles * 0.48);
    } else {
      // Metric: Convert miles to km, then £0.30 per km
      const distanceInKm = convertDistance(distanceInMiles, 'miles', 'km');
      return Math.round(distanceInKm * 0.30);
    }
  }, [system, convertDistance]);

  // Get facilities along the route
  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ["/api/facilities?lat=52.5&lng=-1.5&radius=50"],
  });

  // Note: Journey History and Route Favorites have been moved to HistoryFavoritesPanel

  // Note: Route favorite handling moved to HistoryFavoritesPanel

  // Note: Journey status formatting moved to HistoryFavoritesPanel

  return (
    <div className="w-full md:w-80 bg-card md:border-r border-border flex flex-col min-h-full overflow-y-auto touch-scroll">
      {/* Route Input Section */}
      <div className="p-4 border-b border-border">
        <div className="space-y-3">
          {/* From Location */}
          <LocationDropdown
            value={fromLocation}
            onChange={onFromLocationChange}
            placeholder="Starting location"
            testId="input-from-location"
            icon="start"
          />
          
          {/* To Location */}
          <LocationDropdown
            value={toLocation}
            onChange={onToLocationChange}
            placeholder="Destination"
            testId="input-to-location"
            icon="destination"
          />
        </div>
        
        {/* Route Options - Utility buttons */}
        <div className="flex justify-end mt-3">
          <Button variant="outline" size="icon" data-testid="button-location-picker">
            <MapPin className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Note: Journey History and Route Favorites sections have been moved to HistoryFavoritesPanel */}

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
                    {formatDistance(currentRoute.distance || 0, "miles")}
                  </div>
                  <div className="text-xs text-muted-foreground">distance</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground" data-testid="text-route-duration">
                    {formatDuration(currentRoute.duration || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">drive time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground" data-testid="text-fuel-cost">
                    £{calculateFuelCost(currentRoute.distance || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">est. fuel</div>
                </div>
              </div>
            </div>

            {/* Route Planning Controls - Start Navigation Button positioned in plan route section */}
            {(isNavigating || (fromLocation && toLocation)) && (
              <div className="p-4 border-b border-border bg-primary/5">
                <div className="mb-3">
                  <h4 className="font-medium text-foreground flex items-center">
                    <Navigation className="w-4 h-4 text-primary mr-2" />
                    Route Planning Controls
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {!isNavigating ? 'Ready to start your journey' : 'Navigation in progress'}
                  </p>
                </div>
                {!isNavigating ? (
                  <Button 
                    onClick={currentRoute ? onStartNavigation : onPlanRoute}
                    disabled={(!fromLocation || !toLocation) || isStartingJourney || isCalculating}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-lg font-semibold automotive-button"
                    data-testid="button-start-navigation button-go-navigation"
                  >
                    {isStartingJourney || isCalculating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                        {isCalculating ? "Planning Route..." : "Starting..."}
                      </>
                    ) : currentRoute ? (
                      <>
                        <Navigation className="w-5 h-5 mr-3" />
                        Start Navigation
                      </>
                    ) : (
                      <>
                        <Route className="w-5 h-5 mr-3" />
                        Plan Route
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={onStopNavigation}
                    disabled={isCompletingJourney}
                    variant="destructive"
                    className="w-full h-12 text-lg font-semibold automotive-button"
                    data-testid="button-stop-navigation"
                  >
                    {isCompletingJourney ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Ending...
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        End Navigation
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Restrictions Avoided */
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
                        {restriction.type === 'height' ? 'Height' : 'Width'}: {formatHeight(restriction.limit)}
                        {" "}(You: {restriction.type === 'height' ? 
                          formatHeight(selectedProfile?.height || 0) :
                          formatHeight(selectedProfile?.width || 0)
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
                          {formatDistance(Math.random() * 2 + 0.5, "miles")} off route
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

      {/* Journey Status Display */}
      {activeJourney && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-foreground flex items-center">
              <Navigation className="w-4 h-4 text-primary mr-2" />
              Active Journey
            </h4>
            <Badge 
              variant={activeJourney.status === 'active' ? 'default' : activeJourney.status === 'planned' ? 'secondary' : 'outline'}
              className={`${
                activeJourney.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                activeJourney.status === 'planned' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
              }`}
              data-testid="journey-status-badge"
            >
              {activeJourney.status === 'active' ? 'Navigating' : 
               activeJourney.status === 'planned' ? 'Planned' : 
               activeJourney.status === 'completed' ? 'Completed' : 'Unknown'}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Journey in progress
          </div>
          {activeJourney.status === 'active' && (
            <div className="text-xs text-green-600 mt-1 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Navigation in progress
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Bar - Lane Selection and Additional Options */}
      {currentRoute && onOpenLaneSelection && (
        <div className="p-4 border-t border-border bg-accent/10">
          <Button 
            variant="outline"
            onClick={onOpenLaneSelection}
            className="w-full"
            disabled={isNavigating}
            data-testid="button-lane-selection"
          >
            <Route className="w-4 h-4 mr-2" />
            {isNavigating ? 'Lane Selection (Navigate to modify)' : 'Lane Selection'}
          </Button>
        </div>
      )}
    </div>
  );
});

export default RoutePlanningPanel;
