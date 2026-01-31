import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  TrafficCone, 
  Gauge, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Navigation,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface TrafficLight {
  id: string;
  coordinates: { lat: number; lng: number };
  name: string;
  currentPhase: 'green' | 'yellow' | 'red';
  timeToNextPhase: number;
  cycleDuration: number;
  greenDuration: number;
  yellowDuration: number;
  redDuration: number;
  isAdaptive: boolean;
  direction: string;
}

interface TrafficLightPrediction {
  trafficLight: TrafficLight;
  distanceFromStart: number;
  estimatedArrivalTime: number;
  predictedPhase: 'green' | 'yellow' | 'red';
  waitTime: number;
  confidence: number;
  speedRecommendation?: {
    minSpeed: number;
    maxSpeed: number;
    action: 'maintain' | 'slow_down' | 'prepare_to_stop';
  };
}

interface GreenWaveAnalysis {
  routeId: string;
  totalTrafficLights: number;
  greenLightPercentage: number;
  estimatedWaitTime: number;
  optimalSpeed: number;
  recommendations: string[];
  predictions: TrafficLightPrediction[];
}

interface SmartTrafficLightsPanelProps {
  routeCoordinates?: Array<{ lat: number; lng: number }>;
  isNavigating?: boolean;
  currentSpeed?: number;
  onSpeedRecommendation?: (speed: number, action: string) => void;
  className?: string;
}

export function SmartTrafficLightsPanel({
  routeCoordinates,
  isNavigating = false,
  currentSpeed = 50,
  onSpeedRecommendation,
  className
}: SmartTrafficLightsPanelProps) {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<GreenWaveAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      setAnalysis(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/traffic-lights/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeCoordinates,
          averageSpeed: currentSpeed
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data as GreenWaveAnalysis);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('[SMART-TRAFFIC-LIGHTS] Error fetching analysis:', err);
      setError('Failed to analyze traffic lights');
    } finally {
      setIsLoading(false);
    }
  }, [routeCoordinates, currentSpeed]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  useEffect(() => {
    if (!isNavigating || !analysis) return;

    const interval = setInterval(() => {
      fetchAnalysis();
    }, 30000);

    return () => clearInterval(interval);
  }, [isNavigating, analysis, fetchAnalysis]);

  useEffect(() => {
    if (analysis && analysis.predictions.length > 0 && onSpeedRecommendation) {
      const nextPrediction = analysis.predictions[0];
      if (nextPrediction.speedRecommendation) {
        onSpeedRecommendation(
          nextPrediction.speedRecommendation.minSpeed,
          nextPrediction.speedRecommendation.action
        );
      }
    }
  }, [analysis, onSpeedRecommendation]);

  const getPhaseColor = (phase: 'green' | 'yellow' | 'red') => {
    switch (phase) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
    }
  };

  const getPhaseIcon = (phase: 'green' | 'yellow' | 'red') => {
    switch (phase) {
      case 'green': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'yellow': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'red': return <TrafficCone className="h-4 w-4 text-red-500" />;
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (!routeCoordinates || routeCoordinates.length < 2) {
    return null;
  }

  return (
    <Card className={cn("bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-500" />
            Smart Traffic Lights
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={fetchAnalysis}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {isLoading && !analysis ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Analyzing route...</span>
            </div>
          ) : error ? (
            <div className="text-sm text-destructive py-2">{error}</div>
          ) : analysis ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <div className="text-lg font-bold text-green-500">
                    {analysis.greenLightPercentage}%
                  </div>
                  <div className="text-xs text-muted-foreground">Green Wave</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <div className="text-lg font-bold">
                    {analysis.totalTrafficLights}
                  </div>
                  <div className="text-xs text-muted-foreground">Signals</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <div className="text-lg font-bold text-blue-500">
                    {analysis.optimalSpeed}
                  </div>
                  <div className="text-xs text-muted-foreground">km/h Optimal</div>
                </div>
              </div>

              {analysis.estimatedWaitTime > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Est. wait time: {formatTime(analysis.estimatedWaitTime)}</span>
                </div>
              )}

              <Progress 
                value={analysis.greenLightPercentage} 
                className="h-2"
              />

              {analysis.recommendations.length > 0 && (
                <div className="space-y-1">
                  {analysis.recommendations.slice(0, 2).map((rec, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                      <Navigation className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="text-xs font-medium text-muted-foreground mb-1">
                Upcoming Signals ({analysis.predictions.length})
              </div>

              <ScrollArea className="h-[120px]">
                <div className="space-y-2">
                  {analysis.predictions.slice(0, 5).map((prediction, idx) => (
                    <div 
                      key={prediction.trafficLight.id}
                      className="flex items-center justify-between bg-muted/30 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          getPhaseColor(prediction.predictedPhase)
                        )} />
                        <div>
                          <div className="text-xs font-medium">
                            {prediction.trafficLight.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistance(prediction.distanceFromStart)} • {prediction.trafficLight.direction}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {getPhaseIcon(prediction.predictedPhase)}
                          <span className="text-xs capitalize">
                            {prediction.predictedPhase}
                          </span>
                        </div>
                        {prediction.waitTime > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Wait: {formatTime(prediction.waitTime)}
                          </div>
                        )}
                        {prediction.speedRecommendation && prediction.speedRecommendation.action !== 'maintain' && (
                          <Badge variant="outline" className="text-xs mt-1">
                            <Gauge className="h-3 w-3 mr-1" />
                            {prediction.speedRecommendation.minSpeed} km/h
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {lastUpdate && (
                <div className="text-xs text-muted-foreground text-center">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-2">
              No traffic light data available
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function TrafficLightSpeedIndicator({
  recommendation,
  className
}: {
  recommendation?: {
    speed: number;
    action: 'maintain' | 'slow_down' | 'prepare_to_stop';
    message: string;
  };
  className?: string;
}) {
  if (!recommendation) return null;

  const getActionColor = () => {
    switch (recommendation.action) {
      case 'maintain': return 'text-green-500 border-green-500/50 bg-green-500/10';
      case 'slow_down': return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10';
      case 'prepare_to_stop': return 'text-red-500 border-red-500/50 bg-red-500/10';
    }
  };

  const getActionIcon = () => {
    switch (recommendation.action) {
      case 'maintain': return <CheckCircle className="h-5 w-5" />;
      case 'slow_down': return <Gauge className="h-5 w-5" />;
      case 'prepare_to_stop': return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2 rounded-lg border",
      getActionColor(),
      className
    )}>
      {getActionIcon()}
      <div>
        <div className="font-bold text-lg">{recommendation.speed} km/h</div>
        <div className="text-xs opacity-80">{recommendation.message}</div>
      </div>
    </div>
  );
}
