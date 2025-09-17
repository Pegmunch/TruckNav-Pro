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
  Route as RouteIcon,
  History,
  Play,
  ChevronDown,
  ChevronRight,
  Bookmark,
  BookmarkPlus,
  Trash2,
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
  const [favoritesExpanded, setFavoritesExpanded] = useState(false);
  const [saveRouteDialogOpen, setSaveRouteDialogOpen] = useState(false);
  const [routeName, setRouteName] = useState("");
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

  // Journey History
  const { data: lastJourney, isLoading: isLoadingLastJourney } = useQuery<Journey | null>({
    queryKey: ["/api/journeys", "last"],
    queryFn: () => fetch("/api/journeys/last", { credentials: "include" }).then(res => {
      if (res.status === 404) return null;
      return res.json();
    }),
    retry: false,
  });

  // Get last journey route details
  const { data: lastJourneyRoute } = useQuery<RouteType>({
    queryKey: ["/api/routes", lastJourney?.routeId],
    queryFn: () => fetch(`/api/routes/${lastJourney?.routeId}`, { credentials: "include" }).then(res => res.json()),
    enabled: !!lastJourney?.routeId,
  });

  // Route Favorites
  const { data: favoriteRoutes = [], isLoading: isLoadingFavorites } = useQuery<RouteType[]>({
    queryKey: ["/api/routes", "favorites"],
    queryFn: () => fetch("/api/routes/favorites", { credentials: "include" }).then(res => res.json()),
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
      // Call the navigation start handler if available
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

  // Helper functions
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

  // Helper functions
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
        
        {/* Route Options - Removed primary button, keeping utility buttons */}
        <div className="flex justify-end mt-4">
          <Button variant="outline" size="icon" data-testid="button-location-picker">
            <MapPin className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
                <input
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
          {isLoadingFavorites ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : favoriteRoutes.length > 0 ? (
            <div className="space-y-2">
              {favoriteRoutes.slice(0, favoritesExpanded ? favoriteRoutes.length : 3).map((route: RouteType) => (
                <Card 
                  key={route.id} 
                  className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleLoadFavoriteRoute(route)}
                  data-testid={`favorite-route-${route.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-foreground text-sm">
                        {route.name || `${route.startLocation} → ${route.endLocation}`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {route.startLocation} → {route.endLocation}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistance(route.distance || 0, "miles")} • {formatDuration(route.duration || 0)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteMutation.mutate({
                          routeId: route.id,
                          isFavorite: false
                        });
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      data-testid={`button-remove-favorite-${route.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
              
              {favoriteRoutes.length > 3 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                  className="w-full justify-center"
                  data-testid="button-toggle-favorites"
                >
                  {favoritesExpanded ? (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-3 h-3 mr-1" />
                      Show All ({favoriteRoutes.length})
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-4">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No saved routes</p>
              <p className="text-xs">Save your planned routes for quick access</p>
            </div>
          )}
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
            Started: {formatTimeAgo(activeJourney.startedAt)}
          </div>
          {activeJourney.status === 'active' && (
            <div className="text-xs text-green-600 mt-1 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Navigation in progress
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Bar - Main Go Button Area */}
      <div className="p-4 border-t border-border bg-accent/10">
        <div className="space-y-3">
          {/* Primary Go Button */}
          <div className="flex space-x-2">
            {!isNavigating ? (
              <Button 
                onClick={currentRoute ? onStartNavigation : onPlanRoute}
                disabled={(!fromLocation || !toLocation) || isStartingJourney || isCalculating}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-lg font-semibold automotive-button"
                data-testid="button-go-navigation"
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
                    Start Navigation
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={onStopNavigation}
                disabled={isCompletingJourney}
                variant="destructive"
                className="flex-1"
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
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleSaveCurrentRoute}
              disabled={!currentRoute}
              data-testid="button-save-route"
            >
              <BookmarkPlus className="w-4 h-4" />
            </Button>
          </div>
          {currentRoute && onOpenLaneSelection && (
            <Button 
              variant="outline"
              onClick={onOpenLaneSelection}
              className="w-full"
              disabled={isNavigating}
              data-testid="button-lane-selection"
            >
              <RouteIcon className="w-4 h-4 mr-2" />
              {isNavigating ? 'Lane Selection (Navigate to modify)' : 'Lane Selection'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

export default RoutePlanningPanel;
