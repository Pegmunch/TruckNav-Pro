import { useState, useEffect, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  AlertTriangle, 
  Route as RouteIcon, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Navigation,
  CheckCircle,
  X,
  MapPin,
  Zap,
  TrendingUp
} from "lucide-react";
import { type AlternativeRoute } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { cn } from "@/lib/utils";

interface TrafficAlertBannerProps {
  isVisible: boolean;
  bestAlternative?: AlternativeRoute;
  timeSavingsAvailable?: number;
  rerouteReason?: string;
  confidence?: number;
  onAcceptRoute: () => void;
  onDeclineRoute: () => void;
  onViewAlternatives: () => void;
  isApplying?: boolean;
  autoCollapseAfter?: number; // seconds
}

const TrafficAlertBanner = memo(function TrafficAlertBanner({
  isVisible,
  bestAlternative,
  timeSavingsAvailable = 0,
  rerouteReason = "Alternative route available",
  confidence = 0.8,
  onAcceptRoute,
  onDeclineRoute,
  onViewAlternatives,
  isApplying = false,
  autoCollapseAfter = 30,
}: TrafficAlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(autoCollapseAfter);
  const { formatDistance } = useMeasurement();

  // Auto-collapse timer
  useEffect(() => {
    if (!isVisible || !isExpanded) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          setIsExpanded(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, isExpanded]);

  // Reset timer when alert becomes visible
  useEffect(() => {
    if (isVisible && !isExpanded) {
      setSecondsRemaining(autoCollapseAfter);
      setIsExpanded(true);
      setIsAnimatingOut(false);
    }
  }, [isVisible, autoCollapseAfter, isExpanded]);

  const handleDecline = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onDeclineRoute();
      setIsAnimatingOut(false);
    }, 300);
  };

  const getSeverityConfig = () => {
    if (timeSavingsAvailable >= 15) {
      return {
        color: "bg-green-500 dark:bg-green-600",
        textColor: "text-green-900 dark:text-green-100",
        bgColor: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800",
        icon: <Zap className="w-5 h-5" />,
        label: "High Savings",
        urgency: "high" as const,
      };
    } else if (timeSavingsAvailable >= 8) {
      return {
        color: "bg-blue-500 dark:bg-blue-600",
        textColor: "text-blue-900 dark:text-blue-100",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800",
        icon: <TrendingUp className="w-5 h-5" />,
        label: "Good Savings",
        urgency: "medium" as const,
      };
    } else {
      return {
        color: "bg-yellow-500 dark:bg-yellow-600",
        textColor: "text-yellow-900 dark:text-yellow-100",
        bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        icon: <Navigation className="w-5 h-5" />,
        label: "Alternative Available",
        urgency: "low" as const,
      };
    }
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.9) return "text-green-600 dark:text-green-400";
    if (confidence >= 0.7) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  if (!isVisible) return null;

  const severityConfig = getSeverityConfig();

  return (
    <div 
      className={cn(
        "fixed top-20 left-4 right-4 z-40 transition-all duration-300 ease-in-out",
        isAnimatingOut && "opacity-0 transform -translate-y-2",
        !isExpanded && "transform -translate-y-full"
      )}
      data-testid="traffic-alert-banner"
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className={cn(
          "shadow-xl border-2 overflow-hidden",
          severityConfig.bgColor,
          severityConfig.borderColor
        )}>
          <CollapsibleTrigger asChild>
            <div className={cn(
              "w-full p-4 cursor-pointer transition-colors hover:opacity-90",
              severityConfig.color
            )}>
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-3">
                  {severityConfig.icon}
                  <div>
                    <div className="font-semibold text-lg">
                      Save {timeSavingsAvailable} minutes
                    </div>
                    <div className="text-sm opacity-90">
                      {rerouteReason}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {severityConfig.label}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className={cn("p-6 space-y-4", severityConfig.textColor)}>
              {/* Route Details */}
              {bestAlternative && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Time Comparison</span>
                      </div>
                      <div className="text-lg font-semibold">
                        {Math.floor(bestAlternative.duration / 60)}h {bestAlternative.duration % 60}m
                        <span className="text-sm font-normal ml-2">
                          (vs current route)
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RouteIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">Distance</span>
                      </div>
                      <div className="text-lg font-semibold">
                        {formatDistance(bestAlternative.distance)}
                        {bestAlternative.distance > (bestAlternative.distance - timeSavingsAvailable * 0.5) && (
                          <span className="text-sm font-normal ml-2 opacity-75">
                            (+{formatDistance(bestAlternative.distance - (bestAlternative.distance - timeSavingsAvailable * 0.5))} longer)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Confidence and Reason */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">Confidence:</span>
                      <Badge variant="outline" className={cn("text-xs", getConfidenceColor())}>
                        {Math.round(confidence * 100)}%
                      </Badge>
                    </div>
                    <div className="text-sm opacity-75">
                      Auto-collapse in {secondsRemaining}s
                    </div>
                  </div>

                  {/* Traffic Conditions Summary */}
                  {bestAlternative.trafficConditions && bestAlternative.trafficConditions.length > 0 && (
                    <div className="bg-white/10 dark:bg-black/10 rounded-lg p-3">
                      <div className="text-sm font-medium mb-2">Alternative Route Conditions:</div>
                      <div className="flex flex-wrap gap-2">
                        {bestAlternative.trafficConditions.slice(0, 3).map((condition, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {condition.roadName}: {condition.flowLevel}
                          </Badge>
                        ))}
                        {bestAlternative.trafficConditions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{bestAlternative.trafficConditions.length - 3} more segments
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-current/20">
                <Button
                  onClick={onAcceptRoute}
                  disabled={isApplying}
                  className="flex-1 bg-white text-current hover:bg-white/90"
                  data-testid="button-accept-route"
                >
                  {isApplying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Applying Route...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Use This Route
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={onViewAlternatives}
                  variant="outline"
                  className="flex-1 border-white/30 text-current hover:bg-white/10"
                  data-testid="button-view-alternatives"
                >
                  <RouteIcon className="w-4 h-4 mr-2" />
                  Compare Routes
                </Button>
                
                <Button
                  onClick={handleDecline}
                  variant="ghost"
                  size="sm"
                  className="sm:w-auto text-current hover:bg-white/10"
                  data-testid="button-decline-route"
                >
                  <X className="w-4 h-4 mr-1" />
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
});

export default TrafficAlertBanner;