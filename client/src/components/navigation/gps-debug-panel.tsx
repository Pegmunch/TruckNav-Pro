/**
 * GPS Debug Panel - Shows detailed GPS information to the user
 * Helps diagnose GPS issues and provides a Reset GPS button
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MapPin, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Wifi,
  Satellite,
  Clock,
  Target
} from "lucide-react";
import { useGPS } from "@/contexts/gps-context";
import { cn } from "@/lib/utils";

interface GPSDebugPanelProps {
  className?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function GPSDebugPanel({ 
  className, 
  isExpanded = true,
  onToggle 
}: GPSDebugPanelProps) {
  const gps = useGPS();
  const [showDebug, setShowDebug] = useState(isExpanded);
  const [isResetting, setIsResetting] = useState(false);
  const [localTimestamp, setLocalTimestamp] = useState<number>(Date.now());

  // Update timestamp every second to show age of GPS data
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if coordinates match expected location (Luton)
  const checkLocation = () => {
    if (!gps?.position) return { isLuton: false, isUnknown: true };
    
    const lat = gps.position.latitude;
    const lng = gps.position.longitude;
    
    // Luton coordinates: lat: ~51.8787, lng: ~-0.4200
    const isLuton = Math.abs(lat - 51.8787) < 0.1 && Math.abs(lng - (-0.4200)) < 0.1;
    
    return { isLuton, isUnknown: !isLuton };
  };

  const handleResetGPS = async () => {
    setIsResetting(true);
    console.log('[GPS-DEBUG-PANEL] Resetting GPS...');
    
    // Clear GPS cache and restart tracking
    gps?.clearGPSCache();
    
    // Give some time for GPS to restart
    setTimeout(() => {
      setIsResetting(false);
    }, 2000);
  };

  const { isLuton, isUnknown } = checkLocation();
  
  // Determine GPS source based on accuracy
  const getGPSSource = () => {
    if (!gps?.position) return "Unknown";
    const accuracy = gps.position.accuracy;
    
    if (accuracy > 1000) return "IP-Based (Low Accuracy)";
    if (accuracy > 100) return "Cell Tower";
    if (accuracy > 50) return "Wi-Fi";
    return "GPS Satellite (High Accuracy)";
  };

  // Calculate age of GPS data
  const getDataAge = () => {
    if (!gps?.position) return "No data";
    const age = Math.floor((localTimestamp - gps.position.timestamp) / 1000);
    if (age < 5) return "Live";
    if (age < 30) return `${age}s ago`;
    if (age < 60) return "< 1 min ago";
    const minutes = Math.floor(age / 60);
    return `${minutes} min ago`;
  };

  const getStatusIcon = () => {
    if (gps?.error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (gps?.status === 'acquiring') return <RotateCw className="h-4 w-4 animate-spin text-orange-500" />;
    if (gps?.status === 'ready') return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getAccuracyIcon = () => {
    if (!gps?.position) return <MapPin className="h-4 w-4 text-gray-400" />;
    const accuracy = gps.position.accuracy;
    
    if (accuracy > 1000) return <Wifi className="h-4 w-4 text-red-500" />;
    if (accuracy > 100) return <Wifi className="h-4 w-4 text-orange-500" />;
    if (accuracy > 50) return <Wifi className="h-4 w-4 text-yellow-500" />;
    return <Satellite className="h-4 w-4 text-green-500" />;
  };

  return (
    <Card className={cn("relative bg-white dark:bg-gray-900 shadow-xl", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {getStatusIcon()}
            GPS Debug Info
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={gps?.status === 'ready' ? "default" : gps?.status === 'acquiring' ? "secondary" : "destructive"}
              className="text-xs"
            >
              {gps?.status || 'Unknown'}
            </Badge>
            {onToggle && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowDebug(!showDebug);
                  onToggle();
                }}
              >
                {showDebug ? 'Hide' : 'Show'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {showDebug && (
        <CardContent className="space-y-3">
          {/* Location Detection Alert */}
          {isLuton && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-xs">
                <strong>SUCCESS:</strong> Correct location detected (Luton area)
              </AlertDescription>
            </Alert>
          )}

          {/* GPS Coordinates */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Coordinates</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">Latitude:</span>
                <div className="font-mono font-medium">
                  {gps?.position?.latitude?.toFixed(6) || 'Waiting...'}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Longitude:</span>
                <div className="font-mono font-medium">
                  {gps?.position?.longitude?.toFixed(6) || 'Waiting...'}
                </div>
              </div>
            </div>
          </div>

          {/* GPS Accuracy & Source */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Accuracy & Source</div>
            <div className="flex items-center gap-2">
              {getAccuracyIcon()}
              <div className="flex-1 space-y-1">
                <div className="text-xs">
                  {gps?.position ? `±${Math.round(gps.position.accuracy)}m` : 'No data'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {getGPSSource()}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {getDataAge()}
              </Badge>
            </div>
          </div>

          {/* Additional GPS Data */}
          {gps?.position && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">Speed:</span>
                <div className="font-medium">
                  {gps.position.speed !== null ? `${(gps.position.speed * 2.237).toFixed(1)} mph` : 'N/A'}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Heading:</span>
                <div className="font-medium">
                  {gps.position.heading !== null ? `${Math.round(gps.position.heading)}°` : 'N/A'}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Altitude:</span>
                <div className="font-medium">
                  {gps.position.altitude !== null ? `${Math.round(gps.position.altitude)}m` : 'N/A'}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {gps?.error && (
            <Alert className="border-red-500">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {gps.errorMessage || gps.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Cached Position Info */}
          {gps?.isUsingCached && (
            <Alert className="border-yellow-500">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Using cached position from {gps.cachedPosition?.ageDisplay}
              </AlertDescription>
            </Alert>
          )}

          {/* Reset GPS Button */}
          <div className="pt-2">
            <Button
              onClick={handleResetGPS}
              disabled={isResetting}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isResetting ? (
                <>
                  <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                  Resetting GPS...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Reset GPS & Clear Cache
                </>
              )}
            </Button>
          </div>

          {/* Debug Instructions */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>• High accuracy mode: {gps?.position && gps.position.accuracy < 50 ? '✅ Active' : '⚠️ Not active'}</p>
            <p>• Browser permissions: {gps?.errorType === 'PERMISSION_DENIED' ? '❌ Denied' : '✅ Granted'}</p>
            <p>• Expected location: Luton, UK (LU2 7FG)</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}