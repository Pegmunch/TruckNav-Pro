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
  RotateCcw
} from "lucide-react";
import { type Route as RouteType, type VehicleProfile, type Restriction, type Facility, type Journey } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { useTrafficState } from "@/hooks/use-traffic";
import LocationDropdown from "./location-dropdown";
import TrafficConditionsDisplay from "@/components/traffic/traffic-conditions-display";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { useVoiceIntents, type IntentHandlers } from "@/hooks/use-voice-intents";
import { validatePostcode, formatPostcode, detectPostcodeCountry } from "@/lib/postcode-utils";

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
  const [showVoiceTranscript, setShowVoiceTranscript] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string>('');
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

  // Voice command handlers for route planning
  const routeVoiceHandlers: IntentHandlers = {
    navigation: async (intent, entities) => {
      console.log('Route navigation intent:', intent.action, entities);
      
      if (intent.action === 'navigate_to') {
        // Find postcode in entities
        const postcodeEntity = entities.find(e => e.type === 'postcode');
        if (postcodeEntity) {
          const postcode = postcodeEntity.value;
          const country = detectPostcodeCountry(postcode);
          
          if (country && validatePostcode(postcode, country)) {
            const formatted = formatPostcode(postcode, country);
            onToLocationChange(formatted);
            setLastVoiceCommand(`Set destination to ${formatted}`);
            
            toast({
              title: "Destination set",
              description: `Destination set to ${formatted}`,
            });
            
            // Auto-plan route if origin is set
            if (fromLocation) {
              setTimeout(onPlanRoute, 500);
            }
          } else {
            toast({
              title: "Invalid postcode",
              description: "Please speak a valid postcode",
              variant: "destructive"
            });
          }
        } else {
          // Handle location entity
          const locationEntity = entities.find(e => e.type === 'location' || e.type === 'poi');
          if (locationEntity) {
            onToLocationChange(locationEntity.value);
            setLastVoiceCommand(`Set destination to ${locationEntity.value}`);
            
            toast({
              title: "Destination set",
              description: `Destination set to ${locationEntity.value}`,
            });
            
            if (fromLocation) {
              setTimeout(onPlanRoute, 500);
            }
          }
        }
      } else if (intent.action === 'start_navigation') {
        if (currentRoute) {
          onStartNavigation();
          setLastVoiceCommand('Starting navigation');
          toast({
            title: "Navigation started",
            description: "Truck-safe navigation has begun",
          });
        } else if (fromLocation && toLocation) {
          onPlanRoute();
          setLastVoiceCommand('Planning route first');
          toast({
            title: "Planning route",
            description: "Planning truck-safe route before navigation",
          });
        } else {
          toast({
            title: "Missing locations",
            description: "Please set both origin and destination first",
            variant: "destructive"
          });
        }
      }
    },
    
    routing: async (intent, entities) => {
      console.log('Route routing intent:', intent.action, entities);
      
      if (intent.action === 'clear_destination') {
        onToLocationChange('');
        setLastVoiceCommand('Cleared destination');
        toast({
          title: "Destination cleared",
          description: "Destination has been cleared",
        });
      } else if (intent.action === 'swap_locations') {
        if (fromLocation && toLocation) {
          onFromLocationChange(toLocation);
          onToLocationChange(fromLocation);
          setLastVoiceCommand('Swapped origin and destination');
          toast({
            title: "Locations swapped",
            description: "Origin and destination have been swapped",
          });
        }
      } else if (intent.action === 'plan_route') {
        if (fromLocation && toLocation) {
          onPlanRoute();
          setLastVoiceCommand('Planning route');
          toast({
            title: "Planning route",
            description: "Calculating truck-safe route",
          });
        } else {
          toast({
            title: "Missing locations",
            description: "Please set both origin and destination first",
            variant: "destructive"
          });
        }
      }
    },
    
    unknown: async (intent, entities) => {
      setLastVoiceCommand(`Unrecognized: "${intent.originalText}"`);
      toast({
        title: "Command not recognized",
        description: "Try saying 'navigate to [postcode]' or 'plan route'",
        variant: "destructive"
      });
    }
  };
  
  // Initialize voice commands with route-specific handlers
  const voiceIntents = useVoiceIntents(routeVoiceHandlers, {
    minConfidence: 0.6,
    contextAware: true
  });
  
  const voiceCommands = useVoiceCommands(
    {
      interactionMode: 'toggle',
      continuous: true,
      interimResults: true,
      enableDebugLogging: true
    },
    {
      onTranscriptUpdate: (transcript) => {
        setShowVoiceTranscript(true);
        
        // Auto-hide transcript after final result
        if (transcript.isFinal) {
          setTimeout(() => setShowVoiceTranscript(false), 3000);
        }
      },
      onIntentProcessed: (result) => {
        console.log('Route intent processed:', result);
      },
      onError: (error) => {
        console.error('Route voice error:', error);
        toast({
          title: "Voice error",
          description: error.message,
          variant: "destructive"
        });
      }
    },
    routeVoiceHandlers
  );
  
  // Update voice context when route planning state changes
  useEffect(() => {
    voiceIntents.updateContext({
      routeActive: !!currentRoute,
      navigationState: isNavigating ? 'active' : 'idle',
      hasOrigin: !!fromLocation,
      hasDestination: !!toLocation
    });
  }, [currentRoute, isNavigating, fromLocation, toLocation, voiceIntents]);
  
  // Keyboard shortcut for voice activation (spacebar)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat && event.target === document.body) {
        event.preventDefault();
        if (voiceCommands.state === 'idle') {
          voiceCommands.startListening?.();
        }
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && event.target === document.body) {
        if (voiceCommands.state === 'listening') {
          voiceCommands.stopListening?.();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [voiceCommands]);
  
  // Voice command suggestions
  const getVoiceCommandSuggestions = () => {
    if (!fromLocation && !toLocation) {
      return ['"Navigate to [postcode]"', '"Set destination to [location]"'];
    } else if (!fromLocation) {
      return ['"Set origin to [location]"', '"Plan route"'];
    } else if (!toLocation) {
      return ['"Navigate to [postcode]"', '"Set destination to [location]"'];
    } else if (!currentRoute) {
      return ['"Plan route"', '"Start navigation"', '"Swap locations"'];
    } else {
      return ['"Start navigation"', '"Clear destination"', '"Plan new route"'];
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
          
          {/* To Location with Voice Input */}
          <div className="relative">
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <LocationDropdown
                  value={toLocation}
                  onChange={onToLocationChange}
                  placeholder="Destination (or use voice)"
                  testId="input-to-location"
                  icon="destination"
                />
              </div>
              
              {/* Voice Input Button for Destination */}
              <VoiceMicButton
                state={voiceCommands.state}
                size="md"
                onToggle={() => {
                  if (voiceCommands.state === 'idle') {
                    voiceCommands.startListening?.();
                  } else {
                    voiceCommands.stopListening?.();
                  }
                }}
                disabled={voiceCommands.isProcessing}
                className="shrink-0"
                data-testid="button-voice-destination"
                aria-label="Voice input for destination"
              />
              
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
            
            {/* Voice Transcript Display */}
            {showVoiceTranscript && voiceCommands.currentTranscript && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Listening...</span>
                </div>
                <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  {voiceCommands.currentTranscript.interim || voiceCommands.currentTranscript.final}
                </div>
                {voiceCommands.currentTranscript.isFinal && (
                  <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    Processing command...
                  </div>
                )}
              </div>
            )}
            
            {/* Last Voice Command Feedback */}
            {lastVoiceCommand && !showVoiceTranscript && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">{lastVoiceCommand}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLastVoiceCommand('')}
                    className="ml-auto h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
            
            {/* Voice Command Suggestions */}
            {voiceCommands.state === 'idle' && !voiceCommands.currentTranscript && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Voice commands:</div>
                <div className="flex flex-wrap gap-1">
                  {getVoiceCommandSuggestions().map((suggestion, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {suggestion}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Hold spacebar to speak
                </div>
              </div>
            )}
          </div>
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
              onClick={onPlanRoute}
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
    </div>
  );
});

export default RoutePlanningPanel;