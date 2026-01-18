import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Gauge,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface TrafficPrediction {
  routeId: string;
  departureTime: string;
  predictedDuration: number;
  baselineDuration: number;
  predictedDelay: number;
  congestionScore: number;
  confidence: number;
  bestDepartureTime: string | null;
  alternativeTimes: Array<{
    time: string;
    predictedDuration: number;
    predictedDelay: number;
    congestionScore: number;
  }>;
  dataQuality: 'high' | 'medium' | 'low' | 'insufficient';
}

interface TrafficPredictionPanelProps {
  routeId: string;
  departureTime?: Date;
  onDepartureTimeChange?: (time: Date) => void;
  compact?: boolean;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getCongestionColor(score: number): string {
  if (score < 0.3) return "text-green-600 dark:text-green-400";
  if (score < 0.6) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getCongestionBadge(score: number): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (score < 0.3) return { label: "Light Traffic", variant: "default" };
  if (score < 0.6) return { label: "Moderate Traffic", variant: "secondary" };
  if (score < 0.8) return { label: "Heavy Traffic", variant: "destructive" };
  return { label: "Severe Congestion", variant: "destructive" };
}

function getDataQualityInfo(quality: string): { icon: typeof CheckCircle; label: string; color: string } {
  switch (quality) {
    case 'high':
      return { icon: CheckCircle, label: "High confidence", color: "text-green-600" };
    case 'medium':
      return { icon: TrendingUp, label: "Medium confidence", color: "text-yellow-600" };
    case 'low':
      return { icon: AlertTriangle, label: "Limited data", color: "text-orange-600" };
    default:
      return { icon: AlertTriangle, label: "Insufficient data", color: "text-red-600" };
  }
}

export function TrafficPredictionPanel({ 
  routeId, 
  departureTime,
  onDepartureTimeChange,
  compact = false 
}: TrafficPredictionPanelProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);

  const { data: prediction, isLoading, error } = useQuery<TrafficPrediction>({
    queryKey: ['/api/traffic/predict', routeId, departureTime?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (departureTime) {
        params.set('departureTime', departureTime.toISOString());
      }
      const response = await apiRequest('GET', `/api/traffic/predict/${routeId}?${params}`);
      return response.json();
    },
    enabled: !!routeId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <Card className={cn("w-full", compact && "p-2")}>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null;
  }

  if (!prediction) {
    return null;
  }

  if (prediction.dataQuality === 'insufficient') {
    if (compact) return null;
    return (
      <Card className="w-full border-l-4 border-l-muted">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <BarChart3 className="w-5 h-5" />
            <div>
              <p className="text-sm font-medium">Traffic Prediction</p>
              <p className="text-xs">Collecting data to provide accurate predictions for this route</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const congestionBadge = getCongestionBadge(prediction.congestionScore);
  const qualityInfo = getDataQualityInfo(prediction.dataQuality);
  const QualityIcon = qualityInfo.icon;
  const hasBetterTime = prediction.bestDepartureTime && 
    new Date(prediction.bestDepartureTime).getTime() !== new Date(prediction.departureTime).getTime();

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <Gauge className={cn("w-4 h-4", getCongestionColor(prediction.congestionScore))} />
        <span className="text-sm font-medium">
          {formatDuration(prediction.predictedDuration)}
        </span>
        {prediction.predictedDelay > 2 && (
          <span className="text-xs text-red-600">
            +{Math.round(prediction.predictedDelay)}m delay
          </span>
        )}
        <Badge variant={congestionBadge.variant} className="text-xs h-5">
          {congestionBadge.label}
        </Badge>
      </div>
    );
  }

  return (
    <Card className="w-full border-l-4 border-l-primary/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Traffic Prediction
          </CardTitle>
          <div className="flex items-center gap-1">
            <QualityIcon className={cn("w-4 h-4", qualityInfo.color)} />
            <span className={cn("text-xs", qualityInfo.color)}>{qualityInfo.label}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Predicted Duration</p>
            <p className="text-2xl font-bold">{formatDuration(prediction.predictedDuration)}</p>
            {prediction.predictedDelay > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                +{Math.round(prediction.predictedDelay)} min delay
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Traffic Status</p>
            <Badge variant={congestionBadge.variant} className="text-sm">
              {congestionBadge.label}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {Math.round(prediction.congestionScore * 100)}% congestion
            </p>
          </div>
        </div>

        {hasBetterTime && prediction.bestDepartureTime && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Better departure time available
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Depart at {formatTime(prediction.bestDepartureTime)} for less traffic
                  </p>
                </div>
              </div>
              {onDepartureTimeChange && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-100 dark:hover:bg-green-900"
                  onClick={() => onDepartureTimeChange(new Date(prediction.bestDepartureTime!))}
                >
                  Use this time
                </Button>
              )}
            </div>
          </div>
        )}

        {prediction.alternativeTimes.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setShowAlternatives(!showAlternatives)}
            >
              <span className="text-sm">View alternative departure times</span>
              {showAlternatives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {showAlternatives && (
              <div className="mt-2 space-y-2">
                {prediction.alternativeTimes.slice(0, 5).map((alt, index) => {
                  const altBadge = getCongestionBadge(alt.congestionScore);
                  const isBetter = alt.predictedDuration < prediction.predictedDuration;
                  
                  return (
                    <div 
                      key={index}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg border",
                        isBetter ? "bg-green-50 dark:bg-green-900/10 border-green-200" : "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{formatTime(alt.time)}</span>
                        <Badge variant={altBadge.variant} className="text-xs">
                          {altBadge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{formatDuration(alt.predictedDuration)}</span>
                        {isBetter && (
                          <TrendingDown className="w-4 h-4 text-green-600" />
                        )}
                        {onDepartureTimeChange && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => onDepartureTimeChange(new Date(alt.time))}
                          >
                            Select
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Base duration: {formatDuration(prediction.baselineDuration)}</span>
          <span>Updated: {formatTime(prediction.departureTime)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function CompactTrafficPrediction({ routeId, departureTime }: { routeId: string; departureTime?: Date }) {
  return <TrafficPredictionPanel routeId={routeId} departureTime={departureTime} compact />;
}
