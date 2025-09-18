import { useState, memo, useMemo, useCallback, useEffect } from "react";
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
  CornerUpLeft,
  ParkingCircle,
  Bed,
  Star,
  Square,
  Loader2,
  ArrowUpDown,
  X,
  RotateCcw,
  Search,
  Settings,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  RotateCw,
  Maximize,
  Play,
  Pause,
  Music,
  Radio,
  Filter,
  SlidersHorizontal,
  ExternalLink,
  Coffee
} from "lucide-react";
import { type Route as RouteType, type VehicleProfile, type Restriction, type Facility, type Journey } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { useTrafficState } from "@/hooks/use-traffic";
import LocationDropdown from "./location-dropdown";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { useVoiceIntents, type IntentHandlers } from "@/hooks/use-voice-intents";
import TrafficConditionsDisplay from "@/components/traffic/traffic-conditions-display";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { openMapWindow, closeMapWindow, isMapWindowOpen, TruckNavWindowManager, windowManager } from "@/lib/window-manager";
import { useWindowSync } from "@/hooks/use-window-sync";

interface RoutePlanningPanelProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onPlanRoute: (routePreference?: 'fastest' | 'eco' | 'avoid_tolls') => void;
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
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showMapControls, setShowMapControls] = useState(false);
  const [showRoutingOptions, setShowRoutingOptions] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [trafficVisible, setTrafficVisible] = useState(true);
  const [routePreference, setRoutePreference] = useState<'fastest' | 'eco' | 'avoid_tolls'>('fastest');
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

  // Window sync state for map integration
  const windowSync = useWindowSync();

  // Navigation readiness logic
  const isReadyToGo = fromLocation && toLocation && selectedProfile;
  const canStartNavigation = isReadyToGo && currentRoute && !isNavigating;
  
  // Manual action handlers that both voice and buttons can use
  const handleZoomIn = useCallback(() => {
    // Send zoom in command to map service
    window.dispatchEvent(new CustomEvent('map:zoom', { detail: { direction: 'in' } }));
    toast({ title: "Zoom in", description: "Map zoomed in" });
  }, [toast]);

  const handleZoomOut = useCallback(() => {
    // Send zoom out command to map service
    window.dispatchEvent(new CustomEvent('map:zoom', { detail: { direction: 'out' } }));
    toast({ title: "Zoom out", description: "Map zoomed out" });
  }, [toast]);

  const handleCenterMap = useCallback(() => {
    // Send center map command to map service
    window.dispatchEvent(new CustomEvent('map:center', { detail: {} }));
    toast({ title: "Map centered", description: "Map view centered" });
  }, [toast]);

  const handleToggleTraffic = useCallback(() => {
    const newState = !trafficVisible;
    setTrafficVisible(newState);
    window.dispatchEvent(new CustomEvent('map:traffic', { detail: { show: newState } }));
    toast({ 
      title: newState ? "Traffic shown" : "Traffic hidden", 
      description: `Traffic layer ${newState ? 'enabled' : 'disabled'}` 
    });
  }, [trafficVisible, toast]);

  const handleFullscreen = useCallback(() => {
    // Toggle fullscreen mode
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
    toast({ title: "Fullscreen", description: "Toggled fullscreen mode" });
  }, [toast]);

  const handleAvoidTolls = useCallback(() => {
    setRoutePreference('avoid_tolls');
    if (currentRoute) {
      onPlanRoute(); // Recalculate with new preference
    }
    toast({ title: "Route preference", description: "Avoiding tolls" });
  }, [currentRoute, onPlanRoute, toast]);

  const handleFastestRoute = useCallback(() => {
    setRoutePreference('fastest');
    if (currentRoute) {
      onPlanRoute(); // Recalculate with new preference
    }
    toast({ title: "Route preference", description: "Fastest route selected" });
  }, [currentRoute, onPlanRoute, toast]);

  const handleReroute = useCallback(() => {
    if (currentRoute) {
      onPlanRoute();
      toast({ title: "Recalculating", description: "Finding new route..." });
    }
  }, [currentRoute, onPlanRoute, toast]);

  const handleAlternatives = useCallback(() => {
    // Request alternative routes
    window.dispatchEvent(new CustomEvent('route:alternatives', { detail: { routeId: currentRoute?.id } }));
    toast({ title: "Alternative routes", description: "Searching for alternatives..." });
  }, [currentRoute, toast]);

  const handleToggleAudio = useCallback(() => {
    const newMutedState = !isAudioMuted;
    setIsAudioMuted(newMutedState);
    window.dispatchEvent(new CustomEvent('audio:navigation', { detail: { muted: newMutedState } }));
    toast({ 
      title: newMutedState ? "Audio muted" : "Audio unmuted", 
      description: `Navigation audio ${newMutedState ? 'muted' : 'unmuted'}` 
    });
  }, [isAudioMuted, toast]);

  const handleFindFacility = useCallback((facilityType: 'fuel' | 'parking' | 'rest' | 'truck_stop') => {
    const facilityNames = {
      fuel: 'fuel stations',
      parking: 'truck parking',
      rest: 'rest areas', 
      truck_stop: 'truck stops'
    };
    // Dispatch facility search event
    window.dispatchEvent(new CustomEvent('search:facility', { 
      detail: { 
        type: facilityType, 
        location: currentRoute ? 'route' : 'current' 
      } 
    }));
    toast({ 
      title: "Searching", 
      description: `Finding nearest ${facilityNames[facilityType]}...` 
    });
  }, [currentRoute, toast]);

  // Voice command handlers for route planning  
  const routePlanningVoiceHandlers: IntentHandlers = {
    navigation: async (intent, entities) => {
      if (intent.action === 'start_navigation') {
        if (canStartNavigation) {
          onStartNavigation();
          toast({ title: "Navigation started", description: "Voice command executed" });
        }
      } else if (intent.action === 'stop_navigation') {
        if (isNavigating && onStopNavigation) {
          onStopNavigation();
          toast({ title: "Navigation stopped", description: "Voice command executed" });
        }
      }
    },
    routing: async (intent, entities) => {
      if (intent.action === 'avoid_tolls') {
        handleAvoidTolls();
      } else if (intent.action === 'fastest_route') {
        handleFastestRoute();
      } else if (intent.action === 'reroute') {
        handleReroute();
      }
    },
    search: async (intent, entities) => {
      if (intent.action === 'find_nearest') {
        // Extract facility type from entities
        const facilityEntity = entities.find(e => e.type === 'poi');
        if (facilityEntity) {
          const facilityType = facilityEntity.value.includes('fuel') ? 'fuel' :
                              facilityEntity.value.includes('park') ? 'parking' :
                              facilityEntity.value.includes('rest') ? 'rest' : 'truck_stop';
          handleFindFacility(facilityType);
        } else {
          setShowSearchPanel(true);
        }
      } else if (intent.action === 'search_location') {
        setShowSearchPanel(true);
        toast({ title: "Search activated", description: "Voice command executed" });
      }
    },
    controls: async (intent, entities) => {
      if (intent.action === 'zoom_in') {
        handleZoomIn();
      } else if (intent.action === 'zoom_out') {
        handleZoomOut();
      } else if (intent.action === 'center_map') {
        handleCenterMap();
      } else if (intent.action === 'mute_audio') {
        if (!isAudioMuted) handleToggleAudio();
      } else if (intent.action === 'unmute_audio') {
        if (isAudioMuted) handleToggleAudio();
      } else if (intent.action === 'show_traffic') {
        if (!trafficVisible) handleToggleTraffic();
      } else if (intent.action === 'hide_traffic') {
        if (trafficVisible) handleToggleTraffic();
      }
    }
  };
  
  // Voice commands state
  const voiceCommands = useVoiceCommands({
    interactionMode: 'toggle',
    continuous: true,
    enableFallback: true
  }, {
    onIntentProcessed: (result) => {
      console.log('Route planning voice command processed:', result);
    }
  }, routePlanningVoiceHandlers);

  // Window management handlers
  const handleOpenMapWindow = async () => {
    try {
      const mapWindow = await openMapWindow({
        automotive: true, // Optimize for automotive displays
        fallbackToFullscreen: true,
        onPopupBlocked: () => {
          toast({
            title: "Popup Blocked",
            description: TruckNavWindowManager.getPopupBlockedMessage(),
            variant: "destructive",
          });
        },
        onWindowClosed: () => {
          windowSync.closeMapWindow();
        }
      });

      if (mapWindow) {
        windowSync.openMapWindow();
        toast({
          title: "Map window opened",
          description: "Your map is now displayed in a separate window.",
        });
      }
    } catch (error) {
      console.error('Failed to open map window:', error);
      toast({
        title: "Failed to open map window",
        description: "There was an error opening the map in a new window.",
        variant: "destructive",
      });
    }
  };

  // Start Navigation handler
  const handleGoNavigation = async () => {
    if (!canStartNavigation) {
      if (!selectedProfile) {
        toast({
          title: "Vehicle profile required",
          description: "Please set up your vehicle profile before starting navigation.",
          variant: "destructive",
        });
        return;
      }
      
      if (!fromLocation || !toLocation) {
        toast({
          title: "Locations required",
          description: "Please set both starting point and destination.",
          variant: "destructive",
        });
        return;
      }
      
      if (!currentRoute) {
        // Try to plan route first
        onPlanRoute();
        return;
      }
    }

    try {
      // Start navigation
      onStartNavigation();
      
      // Open map window automatically
      await handleOpenMapWindow();
      
      toast({
        title: "Navigation started",
        description: "TruckNav Pro is now guiding your journey.",
      });
    } catch (error) {
      console.error('Failed to start navigation:', error);
      toast({
        title: "Failed to start navigation",
        description: "There was an error starting navigation. Please try again.",
        variant: "destructive",
      });
    }
  };

  
  // Note: Journey History and Route Favorites have been moved to HistoryFavoritesPanel

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
          <div className="relative">
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <LocationDropdown
                  value={toLocation}
                  onChange={onToLocationChange}
                  placeholder="Destination"
                  testId="input-to-location"
                  icon="destination"
                />
              </div>
              
              {/* Quick Action Buttons */}
              {(fromLocation && toLocation) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onFromLocationChange(toLocation);
                    onToLocationChange(fromLocation);
                    toast({
                      title: "Locations swapped",
                      description: "Origin and destination have been swapped",
                    });
                  }}
                  className="shrink-0 h-10 w-10 p-0"
                  data-testid="button-swap-locations"
                  aria-label="Swap origin and destination"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              )}
              
              {toLocation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onToLocationChange('');
                    toast({
                      title: "Destination cleared",
                      description: "Destination has been cleared",
                    });
                  }}
                  className="shrink-0 h-10 w-10 p-0"
                  data-testid="button-clear-destination"
                  aria-label="Clear destination"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Start Navigation Button - appears right after destination input */}
          {currentRoute && !isNavigating && (
            <div className="mt-3 pt-3 border-t border-border">
              <Button 
                onClick={handleGoNavigation}
                disabled={(!fromLocation || !toLocation) || !selectedProfile || isStartingJourney}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-lg font-semibold automotive-button shadow-lg"
                data-testid="button-start-navigation"
              >
                {isStartingJourney ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Starting Navigation...
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5 mr-3" />
                    Start Navigation
                  </>
                )}
              </Button>
              
              {/* Prerequisites Check */}
              {(!selectedProfile || !fromLocation || !toLocation) && (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="text-amber-800 dark:text-amber-200 text-sm">
                    {!selectedProfile && '• Vehicle profile required'}
                    {!fromLocation && '• Starting location required'}
                    {!toLocation && '• Destination required'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Plan Route Section */}
      {(fromLocation && toLocation) && (
        <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center">
              <Shield className="w-4 h-4 text-primary mr-2" />
              Truck-Safe Route Planning
            </h3>
            {selectedProfile && (
              <Badge variant="outline" className="text-xs">
                {selectedProfile.type.replace('_', ' ').toUpperCase()}
              </Badge>
            )}
          </div>
          
          {/* Vehicle Profile Warning */}
          {!selectedProfile && (
            <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Vehicle profile required for truck-safe routing</span>
              </div>
            </div>
          )}

          {/* Restrictions Warning */}
          {selectedProfile && restrictionsToAvoid.length > 0 && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800 dark:text-red-200 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {restrictionsToAvoid.length} restriction{restrictionsToAvoid.length > 1 ? 's' : ''} detected in route area
                </span>
              </div>
              <div className="text-xs text-red-700 dark:text-red-300">
                Your {selectedProfile.type.replace('_', ' ')} ({formatHeight(selectedProfile.height)}) will use truck-safe routing to avoid these restrictions.
              </div>
            </div>
          )}

          {/* Plan Route Button */}
          <div className="space-y-2">
            <Button 
              onClick={() => onPlanRoute?.(routePreference)}
              disabled={(!fromLocation || !toLocation) || isCalculating}
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground h-12 text-base font-semibold automotive-button shadow-lg"
              data-testid="button-plan-route"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Calculating Truck-Safe Route...
                </>
              ) : (
                <>
                  <Route className="w-5 h-5 mr-3" />
                  {selectedProfile ? 'Plan Truck-Safe Route' : 'Plan Route'}
                </>
              )}
            </Button>
            
            {/* Route Status */}
            {currentRoute && (
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-green-800 dark:text-green-200">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Truck-safe route planned</span>
                </div>
                <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Ready for navigation
                </div>
              </div>
            )}
            
            {/* Route Options Row */}
            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" size="sm" className="text-xs" data-testid="button-route-options">
                <MapPin className="w-3 h-3 mr-1" />
                Route Options
              </Button>
              {currentRoute && (
                <Button variant="ghost" size="sm" className="text-xs" data-testid="button-alternative-routes">
                  <CornerUpLeft className="w-3 h-3 mr-1" />
                  Alternatives
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Truck-Safe Features Summary */}
      {selectedProfile && (fromLocation && toLocation) && (
        <div className="px-4 py-2 bg-accent/5 border-b border-border">
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Vehicle: {formatHeight(selectedProfile.height)} H × {formatHeight(selectedProfile.width)} W</span>
              {selectedProfile.weight && (
                <span>Weight: {selectedProfile.weight}t</span>
              )}
            </div>
          </div>
        </div>
      )}

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

            {/* Enhanced Restrictions Avoided */}
            <div className="p-4 border-b border-border">
              <h4 className="font-medium text-foreground mb-3 flex items-center">
                <Shield className="w-4 h-4 text-green-600 mr-2" />
                Vehicle Restrictions Successfully Avoided
              </h4>
              {restrictionsToAvoid.length > 0 ? (
                <div className="space-y-3">
                  {restrictionsToAvoid.slice(0, 4).map((restriction: Restriction) => {
                    const isHeightRestriction = restriction.type === 'height';
                    const isWeightRestriction = restriction.type === 'weight';
                    const yourValue = restriction.type === 'height' ? 
                      selectedProfile?.height || 0 :
                      restriction.type === 'width' ?
                      selectedProfile?.width || 0 :
                      selectedProfile?.weight || 0;
                    
                    return (
                      <div 
                        key={restriction.id} 
                        className={`flex items-center space-x-3 p-3 rounded-lg border-l-4 ${
                          isHeightRestriction ? 'bg-red-50 dark:bg-red-900/20 border-red-500' : 
                          isWeightRestriction ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500' :
                          'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                        }`}
                        data-testid={`restriction-${restriction.id}`}
                      >
                        <div className={`p-2 rounded-full ${
                          isHeightRestriction ? 'bg-red-100 dark:bg-red-800' : 
                          isWeightRestriction ? 'bg-orange-100 dark:bg-orange-800' :
                          'bg-blue-100 dark:bg-blue-800'
                        }`}>
                          {isHeightRestriction ? (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          ) : isWeightRestriction ? (
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                          ) : (
                            <CornerUpLeft className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">{restriction.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <div className="flex items-center justify-between">
                              <span>
                                {restriction.type === 'height' ? 'Max Height' : 
                                 restriction.type === 'width' ? 'Max Width' : 'Max Weight'}: {
                                  restriction.type === 'weight' ? 
                                  `${restriction.limit}t` : 
                                  formatHeight(restriction.limit)
                                }
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                isHeightRestriction ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200' :
                                isWeightRestriction ? 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                              }`}>
                                Your {restriction.type === 'weight' ? 
                                  `${yourValue}t` : 
                                  formatHeight(yourValue)
                                }
                              </span>
                            </div>
                          </div>
                          {restriction.location && (
                            <div className="text-xs text-muted-foreground mt-1">
                              📍 {restriction.location}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {restrictionsToAvoid.length > 4 && (
                    <div className="text-center">
                      <Badge variant="outline" className="text-xs">
                        +{restrictionsToAvoid.length - 4} more restrictions avoided
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">No vehicle restrictions detected in this route area</p>
                  <p className="text-xs">Route is safe for your {selectedProfile?.type.replace('_', ' ')} vehicle</p>
                </div>
              )}
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
                          <ParkingCircle className={`w-5 h-5 ${facility.type === 'truck_stop' ? 'text-primary' : 'text-secondary'}`} />
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
      
      {/* Enhanced Manual Controls Panel */}
      <div className="border-t border-border">
        {/* Voice Command Information */}
        {voiceCommands.currentTranscript && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-800 dark:text-blue-200">
                Voice: "{voiceCommands.currentTranscript.final || voiceCommands.currentTranscript.interim}"
              </span>
            </div>
          </div>
        )}
        
        {/* Main Controls Bar with Voice Button */}
        <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">Manual Controls</h3>
              <Badge variant="outline" className="text-xs">Voice + Manual</Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Voice Mic Button for All Controls */}
              <VoiceMicButton
                state={voiceCommands.state}
                size="md"
                mode="toggle"
                transcript={voiceCommands.currentTranscript?.final || voiceCommands.currentTranscript?.interim || ''}
                showTranscript={voiceCommands.isListening}
                transcriptPosition="top"
                onToggle={(isRecording) => {
                  if (isRecording) {
                    voiceCommands.startListening();
                  } else {
                    voiceCommands.stopListening();
                  }
                }}
                tooltipText="Voice: 'Start navigation', 'Find nearest truck stop', 'Avoid tolls', 'Zoom in'"
                data-testid="voice-button-main-controls"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                data-testid="button-toggle-advanced-controls"
              >
                <SlidersHorizontal className="w-4 h-4 mr-1" />
                {showAdvancedControls ? 'Hide' : 'Show'} All
              </Button>
            </div>
          </div>
          
          {/* Quick Action Controls */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSearchPanel(!showSearchPanel)}
              className="flex flex-col h-16 p-2"
              data-testid="button-quick-search"
            >
              <Search className="w-4 h-4 mb-1" />
              <span className="text-xs">Search</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowRoutingOptions(!showRoutingOptions)}
              className="flex flex-col h-16 p-2"
              data-testid="button-quick-routing"
            >
              <Filter className="w-4 h-4 mb-1" />
              <span className="text-xs">Routing</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowMapControls(!showMapControls)}
              className="flex flex-col h-16 p-2"
              data-testid="button-quick-map"
            >
              <Settings className="w-4 h-4 mb-1" />
              <span className="text-xs">Map</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                toast({
                  title: "Entertainment panel",
                  description: "Opening entertainment controls"
                });
              }}
              className="flex flex-col h-16 p-2"
              data-testid="button-quick-entertainment"
            >
              <Music className="w-4 h-4 mb-1" />
              <span className="text-xs">Media</span>
            </Button>
          </div>
        </div>
        
        {/* Expandable Advanced Controls */}
        {showAdvancedControls && (
          <div className="p-4 border-t border-border space-y-4">
            {/* Search Panel */}
            {showSearchPanel && (
              <div className="p-3 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm flex items-center">
                    <Search className="w-4 h-4 mr-2" />
                    Find Facilities
                  </h4>
                  <VoiceMicButton
                    state={voiceCommands.state}
                    size="sm"
                    mode="toggle"
                    transcript={voiceCommands.currentTranscript?.final || voiceCommands.currentTranscript?.interim || ''}
                    showTranscript={voiceCommands.isListening}
                    onToggle={(isRecording) => {
                      if (isRecording) {
                        voiceCommands.startListening();
                      } else {
                        voiceCommands.stopListening();
                      }
                    }}
                    tooltipText="Voice: 'Find nearest fuel station', 'Find parking'"
                    data-testid="voice-button-search"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleFindFacility('fuel')}
                    className="h-12 automotive-button"
                    data-testid="button-find-fuel"
                  >
                    <Fuel className="w-4 h-4 mr-1" />
                    Fuel Stations
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleFindFacility('parking')}
                    className="h-12 automotive-button"
                    data-testid="button-find-parking"
                  >
                    <ParkingCircle className="w-4 h-4 mr-1" />
                    Truck Parking
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleFindFacility('rest')}
                    className="h-12 automotive-button"
                    data-testid="button-find-rest"
                  >
                    <Bed className="w-4 h-4 mr-1" />
                    Rest Areas
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleFindFacility('truck_stop')}
                    className="h-12 automotive-button"
                    data-testid="button-find-truck-stop"
                  >
                    <Coffee className="w-4 h-4 mr-1" />
                    Truck Stops
                  </Button>
                </div>
              </div>
            )}
            
            {/* Routing Options Panel */}
            {showRoutingOptions && (
              <div className="p-3 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    Route Preferences
                  </h4>
                  <VoiceMicButton
                    state={voiceCommands.state}
                    size="sm"
                    mode="toggle"
                    transcript={voiceCommands.currentTranscript?.final || voiceCommands.currentTranscript?.interim || ''}
                    showTranscript={voiceCommands.isListening}
                    onToggle={(isRecording) => {
                      if (isRecording) {
                        voiceCommands.startListening();
                      } else {
                        voiceCommands.stopListening();
                      }
                    }}
                    tooltipText="Voice: 'Avoid tolls', 'Fastest route', 'Reroute'"
                    data-testid="voice-button-routing"
                  />
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={routePreference === 'avoid_tolls' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={handleAvoidTolls}
                      className="h-12 automotive-button"
                      data-testid="button-avoid-tolls"
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      Avoid Tolls
                    </Button>
                    <Button 
                      variant={routePreference === 'fastest' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={handleFastestRoute}
                      className="h-12 automotive-button"
                      data-testid="button-fastest-route"
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Fastest Route
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleReroute}
                      disabled={!currentRoute}
                      className="h-12 automotive-button"
                      data-testid="button-reroute"
                    >
                      <RotateCw className="w-4 h-4 mr-1" />
                      Recalculate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAlternatives}
                      disabled={!currentRoute}
                      className="h-12 automotive-button"
                      data-testid="button-alternatives"
                    >
                      <Route className="w-4 h-4 mr-1" />
                      Alternatives
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Map Controls Panel */}
            {showMapControls && (
              <div className="p-3 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Map Controls
                  </h4>
                  <VoiceMicButton
                    state={voiceCommands.state}
                    size="sm"
                    mode="toggle"
                    transcript={voiceCommands.currentTranscript?.final || voiceCommands.currentTranscript?.interim || ''}
                    showTranscript={voiceCommands.isListening}
                    onToggle={(isRecording) => {
                      if (isRecording) {
                        voiceCommands.startListening();
                      } else {
                        voiceCommands.stopListening();
                      }
                    }}
                    tooltipText="Voice: 'Zoom in', 'Zoom out', 'Center map', 'Show traffic'"
                    data-testid="voice-button-map-controls"
                  />
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleZoomIn}
                      className="h-12 automotive-button"
                      data-testid="button-zoom-in"
                    >
                      <ZoomIn className="w-4 h-4 mr-1" />
                      Zoom In
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleZoomOut}
                      className="h-12 automotive-button"
                      data-testid="button-zoom-out"
                    >
                      <ZoomOut className="w-4 h-4 mr-1" />
                      Zoom Out
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCenterMap}
                      className="h-12 automotive-button"
                      data-testid="button-center-map"
                    >
                      <MapPin className="w-4 h-4 mr-1" />
                      Center Map
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleFullscreen}
                      className="h-12 automotive-button"
                      data-testid="button-fullscreen"
                    >
                      <Maximize className="w-4 h-4 mr-1" />
                      Fullscreen
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={trafficVisible ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={handleToggleTraffic}
                      className="h-12 automotive-button"
                      data-testid="button-toggle-traffic"
                    >
                      {trafficVisible ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          Hide Traffic
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          Show Traffic
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenMapWindow()}
                      className="h-12 automotive-button"
                      data-testid="button-open-map-window"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open Map
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Audio & Entertainment Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-border rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center">
                  <Volume2 className="w-4 h-4 mr-2" />
                  Audio
                </h4>
                <div className="flex gap-1">
                  <Button 
                    variant={isAudioMuted ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={handleToggleAudio}
                    className="flex-1 h-12 automotive-button"
                    data-testid="button-toggle-audio"
                  >
                    {isAudioMuted ? (
                      <>
                        <Volume2 className="w-4 h-4 mr-1" />
                        Unmute
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 mr-1" />
                        Mute
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="p-3 border border-border rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center">
                  <Music className="w-4 h-4 mr-2" />
                  Media
                </h4>
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('entertainment:toggle', { detail: { type: 'music' } }));
                      toast({ title: "Music", description: "Opening music player" });
                    }}
                    className="flex-1 h-12 automotive-button"
                    data-testid="button-music"
                  >
                    <Music className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('entertainment:toggle', { detail: { type: 'radio' } }));
                      toast({ title: "Radio", description: "Opening radio player" });
                    }}
                    className="flex-1 h-12 automotive-button"
                    data-testid="button-radio"
                  >
                    <Radio className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default RoutePlanningPanel;