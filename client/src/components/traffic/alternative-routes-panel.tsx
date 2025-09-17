import { useState, memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Route as RouteIcon, 
  Clock, 
  MapPin, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Navigation,
  Truck,
  Fuel,
  X,
  Eye,
  Play,
  RotateCcw
} from "lucide-react";
import { type AlternativeRoute, type Route, type VehicleProfile, type TrafficCondition } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { cn } from "@/lib/utils";

interface AlternativeRoutesPanelProps {
  isOpen: boolean;
  alternatives: AlternativeRoute[];
  currentRoute: Route | null;
  vehicleProfile: VehicleProfile | null;
  onClose: () => void;
  onSelectRoute: (route: AlternativeRoute) => void;
  onPreviewRoute: (route: AlternativeRoute) => void;
  isApplying?: boolean;
  selectedRouteId?: string;
}

interface RouteComparisonRowProps {
  alternative: AlternativeRoute;
  currentRoute: Route;
  vehicleProfile: VehicleProfile | null;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  isApplying: boolean;
  rank: number;
}

const RouteComparisonRow = memo(function RouteComparisonRow({
  alternative,
  currentRoute,
  vehicleProfile,
  isSelected,
  onSelect,
  onPreview,
  isApplying,
  rank,
}: RouteComparisonRowProps) {
  const { formatDistance, formatWeight, formatHeight } = useMeasurement();

  const timeDifference = alternative.duration - (currentRoute.duration || 0);
  const distanceDifference = alternative.distance - (currentRoute.distance || 0);

  const getSuitabilityScore = useMemo(() => {
    if (!vehicleProfile || !alternative.restrictionsAvoided) return 100;
    
    // Calculate truck suitability based on restrictions avoided
    const baseScore = 85;
    const restrictionBonus = alternative.restrictionsAvoided.length * 5;
    return Math.min(100, baseScore + restrictionBonus);
  }, [vehicleProfile, alternative.restrictionsAvoided]);

  const getTrafficSummary = () => {
    if (!alternative.trafficConditions || alternative.trafficConditions.length === 0) {
      return { level: 'unknown', color: 'bg-gray-500', label: 'Unknown' };
    }

    const avgFlow = alternative.trafficConditions.reduce((acc, condition) => {
      const flowValues = { free: 0, light: 1, moderate: 2, heavy: 3, standstill: 4 };
      return acc + flowValues[condition.flowLevel];
    }, 0) / alternative.trafficConditions.length;

    if (avgFlow <= 0.5) return { level: 'free', color: 'bg-green-500', label: 'Free Flow' };
    if (avgFlow <= 1.5) return { level: 'light', color: 'bg-green-400', label: 'Light Traffic' };
    if (avgFlow <= 2.5) return { level: 'moderate', color: 'bg-yellow-500', label: 'Moderate' };
    if (avgFlow <= 3.5) return { level: 'heavy', color: 'bg-orange-500', label: 'Heavy Traffic' };
    return { level: 'standstill', color: 'bg-red-500', label: 'Congested' };
  };

  const trafficSummary = getTrafficSummary();
  const confidenceColor = alternative.confidenceLevel >= 0.8 ? 'text-green-600 dark:text-green-400' :
                         alternative.confidenceLevel >= 0.6 ? 'text-yellow-600 dark:text-yellow-400' :
                         'text-red-600 dark:text-red-400';

  return (
    <Card className={cn(
      "transition-all duration-200 cursor-pointer hover:shadow-md",
      isSelected && "ring-2 ring-primary ring-offset-2 bg-primary/5"
    )}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge variant={rank === 1 ? "default" : "secondary"} className="text-xs">
                Route {rank}
                {rank === 1 && <span className="ml-1">🏆</span>}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", confidenceColor)}>
                {Math.round(alternative.confidenceLevel * 100)}% confidence
              </Badge>
              {alternative.reasonForSuggestion && (
                <Badge variant="outline" className="text-xs">
                  {alternative.reasonForSuggestion.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={onPreview} data-testid={`button-preview-route-${rank}`}>
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
            </div>
          </div>

          {/* Time and Distance Comparison */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Travel Time</span>
              </div>
              <div className="text-lg font-semibold">
                {Math.floor(alternative.duration / 60)}h {alternative.duration % 60}m
              </div>
              <div className={cn("text-sm flex items-center space-x-1", 
                timeDifference < 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {timeDifference < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                <span>
                  {timeDifference < 0 ? 'Save' : 'Add'} {Math.abs(timeDifference)} min
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Distance</span>
              </div>
              <div className="text-lg font-semibold">
                {formatDistance(alternative.distance, 'miles')}
              </div>
              <div className={cn("text-sm flex items-center space-x-1",
                distanceDifference < 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {distanceDifference < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                <span>
                  {formatDistance(Math.abs(distanceDifference), 'miles')} {distanceDifference < 0 ? 'shorter' : 'longer'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <div className={cn("w-3 h-3 rounded-full", trafficSummary.color)} />
                <span className="text-sm font-medium">Traffic</span>
              </div>
              <div className="text-lg font-semibold">{trafficSummary.label}</div>
              <div className="text-sm text-muted-foreground">
                {alternative.trafficConditions?.length || 0} segments
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Suitability</span>
              </div>
              <div className="text-lg font-semibold">{getSuitabilityScore}%</div>
              <div className="text-sm text-muted-foreground">
                {alternative.restrictionsAvoided?.length || 0} restrictions avoided
              </div>
            </div>
          </div>

          {/* Traffic Conditions Detail */}
          {alternative.trafficConditions && alternative.trafficConditions.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Traffic Conditions:</div>
              <div className="flex flex-wrap gap-1">
                {alternative.trafficConditions.slice(0, 4).map((condition, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {condition.roadName}: {condition.currentSpeed}mph
                  </Badge>
                ))}
                {alternative.trafficConditions.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{alternative.trafficConditions.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={onSelect}
            disabled={isApplying}
            className={cn(
              "w-full",
              isSelected && "bg-primary text-primary-foreground"
            )}
            data-testid={`button-select-route-${rank}`}
          >
            {isApplying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Applying Route...
              </>
            ) : isSelected ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Selected Route
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Use This Route
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

const AlternativeRoutesPanel = memo(function AlternativeRoutesPanel({
  isOpen,
  alternatives,
  currentRoute,
  vehicleProfile,
  onClose,
  onSelectRoute,
  onPreviewRoute,
  isApplying = false,
  selectedRouteId,
}: AlternativeRoutesPanelProps) {
  const [activeTab, setActiveTab] = useState("comparison");

  if (!isOpen) return null;

  // Sort alternatives by time savings (best first)
  const sortedAlternatives = useMemo(() => {
    return [...alternatives].sort((a, b) => {
      if (!currentRoute?.duration) return 0;
      const aSavings = currentRoute.duration - a.duration;
      const bSavings = currentRoute.duration - b.duration;
      return bSavings - aSavings;
    });
  }, [alternatives, currentRoute?.duration]);

  const totalSavingsAvailable = useMemo(() => {
    if (!currentRoute?.duration || alternatives.length === 0) return 0;
    return Math.max(0, currentRoute.duration - sortedAlternatives[0].duration);
  }, [currentRoute?.duration, sortedAlternatives]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" data-testid="alternative-routes-panel">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Alternative Routes Available</CardTitle>
              <div className="text-sm text-muted-foreground">
                {alternatives.length} routes found
                {totalSavingsAvailable > 0 && (
                  <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                    • Up to {totalSavingsAvailable} min savings
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-alternatives">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="px-6 pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="comparison" data-testid="tab-comparison">
                  Route Comparison
                </TabsTrigger>
                <TabsTrigger value="details" data-testid="tab-details">
                  Traffic Details
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="comparison" className="m-0">
              <ScrollArea className="h-[60vh] px-6">
                <div className="space-y-4 pb-6">
                  {/* Current Route Summary */}
                  {currentRoute && (
                    <Card className="bg-muted/30 border-muted">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline">Current Route</Badge>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">
                                {Math.floor((currentRoute.duration || 0) / 60)}h {(currentRoute.duration || 0) % 60}m
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4" />
                              <span className="font-medium">
                                {(currentRoute.distance || 0).toFixed(1)} miles
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" data-testid="button-keep-current-route">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Keep Current
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Separator className="my-4" />

                  {/* Alternative Routes */}
                  <div className="space-y-4">
                    {sortedAlternatives.map((alternative, index) => (
                      <RouteComparisonRow
                        key={alternative.id}
                        alternative={alternative}
                        currentRoute={currentRoute!}
                        vehicleProfile={vehicleProfile}
                        isSelected={selectedRouteId === alternative.id}
                        onSelect={() => onSelectRoute(alternative)}
                        onPreview={() => onPreviewRoute(alternative)}
                        isApplying={isApplying && selectedRouteId === alternative.id}
                        rank={index + 1}
                      />
                    ))}
                  </div>

                  {alternatives.length === 0 && (
                    <div className="text-center py-12">
                      <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <div className="text-lg font-medium">No Alternative Routes Available</div>
                      <div className="text-sm text-muted-foreground">
                        Your current route is already the best option.
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="details" className="m-0">
              <ScrollArea className="h-[60vh] px-6">
                <div className="space-y-6 pb-6">
                  {sortedAlternatives.map((alternative, index) => (
                    <Card key={alternative.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <Badge>Route {index + 1}</Badge>
                          <span>Traffic Analysis</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {alternative.trafficConditions && alternative.trafficConditions.length > 0 ? (
                          <div className="grid gap-3">
                            {alternative.trafficConditions.map((condition, condIndex) => (
                              <div key={condIndex} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className={cn("w-3 h-3 rounded-full", {
                                    'bg-green-500': condition.flowLevel === 'free',
                                    'bg-green-400': condition.flowLevel === 'light',
                                    'bg-yellow-500': condition.flowLevel === 'moderate',
                                    'bg-orange-500': condition.flowLevel === 'heavy',
                                    'bg-red-500': condition.flowLevel === 'standstill',
                                  })} />
                                  <div>
                                    <div className="font-medium">{condition.roadName}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {condition.currentSpeed}mph (limit: {condition.speedLimit}mph)
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">
                                    {condition.delayMinutes.toFixed(1)} min delay
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {Math.round(condition.confidence * 100)}% confidence
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <Navigation className="w-8 h-8 mx-auto mb-2" />
                            <div>No detailed traffic data available</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});

export default AlternativeRoutesPanel;