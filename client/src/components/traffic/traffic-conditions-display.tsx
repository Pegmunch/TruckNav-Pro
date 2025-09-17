import { useState, memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Navigation,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Signal,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Info
} from "lucide-react";
import { type TrafficCondition, type TrafficIncident, type Route } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TrafficConditionsDisplayProps {
  route: Route | null;
  trafficConditions: TrafficCondition[];
  incidents: TrafficIncident[];
  lastUpdated?: Date;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
  compact?: boolean;
}

interface TrafficSegmentProps {
  condition: TrafficCondition;
  incidents: TrafficIncident[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  compact?: boolean;
}

const TrafficSegment = memo(function TrafficSegment({
  condition,
  incidents,
  isExpanded,
  onToggleExpanded,
  compact = false,
}: TrafficSegmentProps) {
  const segmentIncidents = incidents.filter(incident => 
    incident.coordinates && 
    Math.abs(incident.coordinates.lat - condition.coordinates.start.lat) < 0.01 &&
    Math.abs(incident.coordinates.lng - condition.coordinates.start.lng) < 0.01
  );

  const getFlowLevelConfig = () => {
    switch (condition.flowLevel) {
      case 'free':
        return { 
          color: 'bg-green-500', 
          textColor: 'text-green-700 dark:text-green-300',
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          label: 'Free Flow',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'light':
        return { 
          color: 'bg-green-400', 
          textColor: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          label: 'Light Traffic',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'moderate':
        return { 
          color: 'bg-yellow-500', 
          textColor: 'text-yellow-700 dark:text-yellow-300',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
          label: 'Moderate',
          icon: <Minus className="w-4 h-4" />
        };
      case 'heavy':
        return { 
          color: 'bg-orange-500', 
          textColor: 'text-orange-700 dark:text-orange-300',
          bgColor: 'bg-orange-50 dark:bg-orange-950/30',
          label: 'Heavy Traffic',
          icon: <TrendingDown className="w-4 h-4" />
        };
      case 'standstill':
        return { 
          color: 'bg-red-500', 
          textColor: 'text-red-700 dark:text-red-300',
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          label: 'Standstill',
          icon: <AlertTriangle className="w-4 h-4" />
        };
      default:
        return { 
          color: 'bg-gray-500', 
          textColor: 'text-gray-700 dark:text-gray-300',
          bgColor: 'bg-gray-50 dark:bg-gray-950/30',
          label: 'Unknown',
          icon: <Info className="w-4 h-4" />
        };
    }
  };

  const flowConfig = getFlowLevelConfig();
  const speedDiff = condition.speedLimit - condition.currentSpeed;
  const isDelayed = condition.delayMinutes > 1;

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-3 py-2", flowConfig.bgColor)}>
        <div className={cn("w-3 h-3 rounded-full", flowConfig.color)} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{condition.roadName}</div>
          <div className="text-xs text-muted-foreground">
            {condition.currentSpeed}mph • {flowConfig.label}
            {isDelayed && (
              <span className="ml-2 text-orange-600 dark:text-orange-400">
                +{condition.delayMinutes.toFixed(0)}min
              </span>
            )}
          </div>
        </div>
        {segmentIncidents.length > 0 && (
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <Card className={cn("transition-all duration-200", flowConfig.bgColor)}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn("w-4 h-4 rounded-full flex-shrink-0", flowConfig.color)} />
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-medium truncate">
                    {condition.roadName}
                  </CardTitle>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>{condition.currentSpeed}mph</span>
                    <span>•</span>
                    <span>{flowConfig.label}</span>
                    {isDelayed && (
                      <>
                        <span>•</span>
                        <span className="text-orange-600 dark:text-orange-400">
                          +{condition.delayMinutes.toFixed(0)} min delay
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {segmentIncidents.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {segmentIncidents.length} incident{segmentIncidents.length > 1 ? 's' : ''}
                  </Badge>
                )}
                <div className={cn("text-xs px-2 py-1 rounded", 
                  condition.confidence >= 0.8 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  condition.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                )}>
                  {Math.round(condition.confidence * 100)}%
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Speed and Traffic Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Current Speed</div>
                <div className="text-lg font-semibold">{condition.currentSpeed}mph</div>
                <div className={cn("text-xs flex items-center space-x-1",
                  speedDiff > 10 ? "text-red-600 dark:text-red-400" :
                  speedDiff > 5 ? "text-yellow-600 dark:text-yellow-400" :
                  "text-green-600 dark:text-green-400"
                )}>
                  {speedDiff > 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  <span>{Math.abs(speedDiff)} mph {speedDiff > 0 ? 'below' : 'above'} limit</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Speed Limit</div>
                <div className="text-lg font-semibold">{condition.speedLimit}mph</div>
                <div className="text-xs text-muted-foreground">Posted limit</div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Delay</div>
                <div className="text-lg font-semibold">
                  {condition.delayMinutes < 1 ? '<1' : condition.delayMinutes.toFixed(0)} min
                </div>
                <div className="text-xs text-muted-foreground">vs free flow</div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Data Quality</div>
                <div className="text-lg font-semibold">{Math.round(condition.confidence * 100)}%</div>
                <div className="text-xs text-muted-foreground">
                  Updated {new Date(condition.lastUpdated).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Incidents */}
            {segmentIncidents.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Active Incidents</span>
                </div>
                <div className="space-y-2">
                  {segmentIncidents.map(incident => (
                    <div key={incident.id} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{incident.title}</div>
                          {incident.description && (
                            <div className="text-sm text-muted-foreground mt-1">{incident.description}</div>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant={
                              incident.severity === 'critical' ? 'destructive' :
                              incident.severity === 'high' ? 'destructive' :
                              incident.severity === 'medium' ? 'secondary' : 'outline'
                            } className="text-xs">
                              {incident.severity}
                            </Badge>
                            {incident.estimatedClearTime && (
                              <div className="text-xs text-muted-foreground">
                                Est. clear: {new Date(incident.estimatedClearTime).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});

const TrafficConditionsDisplay = memo(function TrafficConditionsDisplay({
  route,
  trafficConditions,
  incidents = [],
  lastUpdated,
  isLoading = false,
  onRefresh,
  className,
  compact = false,
}: TrafficConditionsDisplayProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());

  const toggleSegmentExpanded = (segmentId: string) => {
    const newExpanded = new Set(expandedSegments);
    if (newExpanded.has(segmentId)) {
      newExpanded.delete(segmentId);
    } else {
      newExpanded.add(segmentId);
    }
    setExpandedSegments(newExpanded);
  };

  const trafficSummary = useMemo(() => {
    if (trafficConditions.length === 0) return null;

    const totalDelay = trafficConditions.reduce((sum, condition) => sum + condition.delayMinutes, 0);
    const avgSpeed = trafficConditions.reduce((sum, condition) => sum + condition.currentSpeed, 0) / trafficConditions.length;
    const avgConfidence = trafficConditions.reduce((sum, condition) => sum + condition.confidence, 0) / trafficConditions.length;
    
    const flowLevelCounts = trafficConditions.reduce((acc, condition) => {
      acc[condition.flowLevel] = (acc[condition.flowLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const primaryFlowLevel = Object.entries(flowLevelCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as TrafficCondition['flowLevel'] || 'free';

    return {
      totalDelay,
      avgSpeed,
      avgConfidence,
      primaryFlowLevel,
      segmentCount: trafficConditions.length,
      activeIncidents: incidents.filter(i => i.isActive).length,
    };
  }, [trafficConditions, incidents]);

  if (!route || trafficConditions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Navigation className="w-12 h-12 text-muted-foreground mx-auto" />
            <div className="font-medium">No Traffic Data</div>
            <div className="text-sm text-muted-foreground">
              {!route ? 'Plan a route to see traffic conditions' : 'Traffic data not available for this route'}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Traffic Conditions</span>
              {trafficSummary && (
                <Badge variant={
                  trafficSummary.primaryFlowLevel === 'standstill' || trafficSummary.primaryFlowLevel === 'heavy' ? 'destructive' :
                  trafficSummary.primaryFlowLevel === 'moderate' ? 'secondary' : 'outline'
                }>
                  {trafficSummary.primaryFlowLevel === 'free' ? 'Clear' :
                   trafficSummary.primaryFlowLevel === 'light' ? 'Light' :
                   trafficSummary.primaryFlowLevel === 'moderate' ? 'Moderate' :
                   trafficSummary.primaryFlowLevel === 'heavy' ? 'Heavy' : 'Congested'}
                </Badge>
              )}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {trafficSummary && (
                <div className="flex items-center space-x-4">
                  <span>{trafficSummary.segmentCount} segments</span>
                  <span>Avg: {trafficSummary.avgSpeed.toFixed(0)}mph</span>
                  {trafficSummary.totalDelay > 1 && (
                    <span className="text-orange-600 dark:text-orange-400">
                      +{trafficSummary.totalDelay.toFixed(0)}min delay
                    </span>
                  )}
                  {trafficSummary.activeIncidents > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      {trafficSummary.activeIncidents} incidents
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {lastUpdated && (
              <div className="text-xs text-muted-foreground">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            )}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                data-testid="button-refresh-traffic"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className={cn("space-y-3", compact ? "max-h-64" : "max-h-96")}>
          {trafficConditions.map(condition => (
            <TrafficSegment
              key={condition.segmentId}
              condition={condition}
              incidents={incidents}
              isExpanded={expandedSegments.has(condition.segmentId)}
              onToggleExpanded={() => toggleSegmentExpanded(condition.segmentId)}
              compact={compact}
            />
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

export default TrafficConditionsDisplay;