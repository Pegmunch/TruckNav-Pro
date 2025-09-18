import { useState, useEffect, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Clock, 
  Route as RouteIcon, 
  Undo2, 
  X, 
  Navigation,
  ArrowRight,
  MapPin,
  AlertCircle,
  Zap
} from "lucide-react";
import { type Route, type AlternativeRoute } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { cn } from "@/lib/utils";

interface ReroutingNotificationProps {
  isVisible: boolean;
  type: 'applying' | 'applied' | 'failed';
  oldRoute?: Route;
  newRoute?: AlternativeRoute;
  timeSaved?: number;
  error?: string;
  onUndo?: () => void;
  onDismiss: () => void;
  autoHideAfter?: number; // seconds
  canUndo?: boolean;
  undoTimeLeft?: number; // seconds
}

const ReroutingNotification = memo(function ReroutingNotification({
  isVisible,
  type,
  oldRoute,
  newRoute,
  timeSaved = 0,
  error,
  onUndo,
  onDismiss,
  autoHideAfter = 10,
  canUndo = false,
  undoTimeLeft = 0,
}: ReroutingNotificationProps) {
  const [progress, setProgress] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(autoHideAfter);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const { formatDistance } = useMeasurement();

  // Auto-hide timer for 'applied' type
  useEffect(() => {
    if (!isVisible || type !== 'applied') return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, type]);

  // Progress animation for 'applying' type
  useEffect(() => {
    if (!isVisible || type !== 'applying') return;

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(progressTimer);
  }, [isVisible, type]);

  // Complete progress when route is applied
  useEffect(() => {
    if (type === 'applied') {
      setProgress(100);
    }
  }, [type]);

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onDismiss();
      setIsAnimatingOut(false);
      setProgress(0);
      setSecondsRemaining(autoHideAfter);
    }, 300);
  };

  const handleUndo = () => {
    if (onUndo && canUndo) {
      onUndo();
    }
  };

  const getNotificationConfig = () => {
    switch (type) {
      case 'applying':
        return {
          icon: <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>,
          title: "Applying New Route",
          bgColor: "bg-blue-50 dark:bg-blue-950/30",
          borderColor: "border-blue-200 dark:border-blue-800",
          textColor: "text-blue-900 dark:text-blue-100",
          accentColor: "bg-blue-500",
        };
      case 'applied':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          title: "Route Updated Successfully",
          bgColor: "bg-green-50 dark:bg-green-950/30",
          borderColor: "border-green-200 dark:border-green-800",
          textColor: "text-green-900 dark:text-green-100",
          accentColor: "bg-green-500",
        };
      case 'failed':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          title: "Route Update Failed",
          bgColor: "bg-red-50 dark:bg-red-950/30",
          borderColor: "border-red-200 dark:border-red-800",
          textColor: "text-red-900 dark:text-red-100",
          accentColor: "bg-red-500",
        };
      default:
        return {
          icon: <Navigation className="w-5 h-5" />,
          title: "Route Update",
          bgColor: "bg-gray-50 dark:bg-gray-950/30",
          borderColor: "border-gray-200 dark:border-gray-800",
          textColor: "text-gray-900 dark:text-gray-100",
          accentColor: "bg-gray-500",
        };
    }
  };

  if (!isVisible) return null;

  const config = getNotificationConfig();

  return (
    <div 
      className={cn(
        "fixed top-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] transition-all duration-300 ease-in-out",
        isAnimatingOut && "opacity-0 transform translate-x-full"
      )}
      data-testid="rerouting-notification"
    >
      <Card className={cn(
        "shadow-xl border-2 overflow-hidden",
        config.bgColor,
        config.borderColor
      )}>
        {/* Accent Bar */}
        <div className={cn("h-1 w-full", config.accentColor)} />
        
        <CardContent className={cn("p-4 space-y-4", config.textColor)}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {config.icon}
              <div className="font-semibold">{config.title}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-current hover:bg-current/10"
              onClick={handleDismiss}
              data-testid="button-dismiss-notification"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar (for applying state) */}
          {type === 'applying' && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="text-sm">
                Recalculating route with traffic data...
              </div>
            </div>
          )}

          {/* Success Content */}
          {type === 'applied' && oldRoute && newRoute && (
            <div className="space-y-3">
              {/* Time Comparison */}
              <div className="flex items-center justify-between bg-white/50 dark:bg-black/10 rounded-lg p-3">
                <div className="space-y-1">
                  <div className="text-sm opacity-75">Previous ETA</div>
                  <div className="font-medium">
                    {oldRoute.duration && (
                      <>
                        {Math.floor(oldRoute.duration / 60)}h {oldRoute.duration % 60}m
                      </>
                    )}
                  </div>
                </div>
                
                <ArrowRight className="w-4 h-4 mx-3 opacity-60" />
                
                <div className="space-y-1">
                  <div className="text-sm opacity-75">New ETA</div>
                  <div className="font-medium">
                    {Math.floor(newRoute.duration / 60)}h {newRoute.duration % 60}m
                  </div>
                </div>
                
                <div className="ml-3 text-right">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    <Zap className="w-3 h-3 mr-1" />
                    -{timeSaved}min
                  </Badge>
                </div>
              </div>

              {/* Route Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <RouteIcon className="w-3 h-3" />
                    <span className="opacity-75">Distance</span>
                  </div>
                  <div className="font-medium">{formatDistance(newRoute.distance, "miles")}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span className="opacity-75">Route Quality</span>
                  </div>
                  <div className="font-medium">{Math.round((newRoute.confidenceLevel || 0.8) * 100)}%</div>
                </div>
              </div>

              {/* Reason for Re-routing */}
              {newRoute.reasonForSuggestion && (
                <div className="text-sm opacity-75 italic">
                  Reason: {newRoute.reasonForSuggestion.replace(/_/g, ' ')}
                </div>
              )}
            </div>
          )}

          {/* Error Content */}
          {type === 'failed' && (
            <div className="space-y-2">
              <div className="text-sm">
                {error || "Unable to apply the alternative route. Please try again."}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-current text-current hover:bg-current/10"
                onClick={handleDismiss}
                data-testid="button-retry"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          {type === 'applied' && (
            <div className="flex items-center justify-between pt-2 border-t border-current/20">
              <div className="flex items-center space-x-2">
                {canUndo && undoTimeLeft > 0 && onUndo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    className="border-current text-current hover:bg-current/10"
                    data-testid="button-undo-route"
                  >
                    <Undo2 className="w-3 h-3 mr-1" />
                    Undo ({undoTimeLeft}s)
                  </Button>
                )}
              </div>
              <div className="text-xs opacity-75">
                Auto-hide in {secondsRemaining}s
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default ReroutingNotification;