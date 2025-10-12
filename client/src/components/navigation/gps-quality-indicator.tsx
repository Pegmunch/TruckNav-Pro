import { useEffect, useState } from 'react';
import { useGPS } from '@/contexts/gps-context';
import { cn } from '@/lib/utils';
import { 
  Satellite, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  WifiOff,
  Navigation
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function GPSQualityIndicator({ 
  className, 
  showDetails = false,
  variant = 'compact' 
}: { 
  className?: string;
  showDetails?: boolean;
  variant?: 'compact' | 'expanded';
}) {
  const gps = useGPS();
  const [isFlashing, setIsFlashing] = useState(false);

  // Trigger flash animation when signal is poor
  useEffect(() => {
    if (gps?.position && gps.position.confidenceLevel === 'very-low') {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [gps?.position?.confidenceLevel]);

  if (!gps) return null;

  const {
    status,
    position,
    validationWarnings,
    timeSinceLastUpdate,
    shouldPreventAutoCenter,
    error,
    canRetry,
    retryGPS
  } = gps;

  // Determine display state
  const getDisplayState = () => {
    if (status === 'error' || error) return 'error';
    if (status === 'initializing') return 'initializing';
    if (status === 'acquiring') return 'acquiring';
    if (status === 'unavailable' || timeSinceLastUpdate && timeSinceLastUpdate > 30) return 'lost';
    if (!position) return 'no-signal';
    if (position.confidenceLevel === 'high') return 'excellent';
    if (position.confidenceLevel === 'medium') return 'good';
    if (position.confidenceLevel === 'low') return 'fair';
    return 'poor';
  };

  const displayState = getDisplayState();

  // Get icon based on state
  const getIcon = () => {
    switch (displayState) {
      case 'initializing':
      case 'acquiring':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'error':
      case 'lost':
        return <WifiOff className="w-4 h-4" />;
      case 'excellent':
        return <Satellite className="w-4 h-4" />;
      case 'good':
        return <CheckCircle className="w-4 h-4" />;
      case 'fair':
        return <AlertCircle className="w-4 h-4" />;
      case 'poor':
      case 'no-signal':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Navigation className="w-4 h-4" />;
    }
  };

  // Get color classes based on state
  const getColorClasses = () => {
    switch (displayState) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'fair':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
      case 'lost':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'error':
      case 'no-signal':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (displayState) {
      case 'initializing':
        return 'GPS Initializing...';
      case 'acquiring':
        return 'Acquiring GPS Signal...';
      case 'excellent':
        return `Excellent (±${Math.round(position?.accuracy || 0)}m)`;
      case 'good':
        return `Good (±${Math.round(position?.accuracy || 0)}m)`;
      case 'fair':
        return `Fair (±${Math.round(position?.accuracy || 0)}m)`;
      case 'poor':
        return `Poor (±${Math.round(position?.accuracy || 0)}m)`;
      case 'lost':
        return 'GPS Signal Lost';
      case 'error':
        return 'GPS Error';
      case 'no-signal':
        return 'No GPS Signal';
      default:
        return 'GPS Status Unknown';
    }
  };

  // Compact variant (for toolbar/header)
  if (variant === 'compact') {
    return (
      <Badge
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 transition-all',
          getColorClasses(),
          isFlashing && 'animate-pulse',
          className
        )}
        variant="outline"
        data-testid="gps-quality-indicator"
      >
        {getIcon()}
        <span className="text-xs font-medium">{getStatusText()}</span>
        {timeSinceLastUpdate && timeSinceLastUpdate > 10 && (
          <span className="text-xs opacity-75">
            ({timeSinceLastUpdate}s ago)
          </span>
        )}
      </Badge>
    );
  }

  // Expanded variant (for settings panel or detailed view)
  return (
    <Card className={cn('p-4', className)} data-testid="gps-quality-indicator-expanded">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', getColorClasses())}>
              {getIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-sm">GPS Signal Quality</h3>
              <p className="text-xs text-muted-foreground">{getStatusText()}</p>
            </div>
          </div>
          {canRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={retryGPS}
              data-testid="button-retry-gps"
            >
              Retry
            </Button>
          )}
        </div>

        {/* Details */}
        {showDetails && position && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Accuracy:</span>
              <span className="ml-1 font-medium">±{Math.round(position.accuracy)}m</span>
            </div>
            <div>
              <span className="text-muted-foreground">Confidence:</span>
              <span className="ml-1 font-medium">{position.confidenceScore}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Level:</span>
              <span className="ml-1 font-medium capitalize">{position.accuracyLevel}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last Update:</span>
              <span className="ml-1 font-medium">
                {timeSinceLastUpdate ? `${timeSinceLastUpdate}s ago` : 'Just now'}
              </span>
            </div>
            {position.isStuck && (
              <div className="col-span-2">
                <Badge variant="secondary" className="bg-yellow-100">
                  GPS may be stuck
                </Badge>
              </div>
            )}
            {position.isOutOfBounds && (
              <div className="col-span-2">
                <Badge variant="secondary" className="bg-red-100">
                  Location out of bounds
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Warnings */}
        {validationWarnings && validationWarnings.length > 0 && (
          <div className="space-y-2">
            {validationWarnings.map((warning, index) => (
              <Alert 
                key={index}
                variant={warning.severity === 'error' ? 'destructive' : 'default'}
                className="py-2"
              >
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  {warning.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Auto-center warning */}
        {shouldPreventAutoCenter && (
          <Alert className="py-2 border-orange-200 bg-orange-50">
            <AlertCircle className="h-3 w-3 text-orange-600" />
            <AlertTitle className="text-xs font-medium text-orange-900">
              Map Auto-Center Disabled
            </AlertTitle>
            <AlertDescription className="text-xs text-orange-700">
              GPS accuracy is too low for automatic map centering. 
              Improve your signal for better navigation.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}

// Minimal GPS status bar for mobile
export function GPSStatusBar({ className }: { className?: string }) {
  const gps = useGPS();
  
  if (!gps || !gps.position) return null;
  
  const { position, timeSinceLastUpdate, shouldPreventAutoCenter } = gps;
  const showWarning = position.confidenceLevel === 'low' || 
                     position.confidenceLevel === 'very-low' ||
                     shouldPreventAutoCenter;

  if (!showWarning) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-yellow-500 text-white text-xs py-1 px-3',
        'flex items-center justify-center gap-2',
        'animate-in slide-in-from-top duration-300',
        className
      )}
      data-testid="gps-status-bar"
    >
      <AlertTriangle className="w-3 h-3" />
      <span className="font-medium">
        Poor GPS Signal ({Math.round(position.accuracy)}m accuracy)
      </span>
      {timeSinceLastUpdate && timeSinceLastUpdate > 10 && (
        <span className="opacity-90">• {timeSinceLastUpdate}s since update</span>
      )}
    </div>
  );
}