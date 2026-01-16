import { useState, useEffect, useCallback } from 'react';
import { Clock, Route, Zap, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hapticNavEvent } from '@/hooks/use-haptic-feedback';

interface RouteAlternative {
  id: string;
  name: string;
  distanceKm: number;
  durationMinutes: number;
  trafficDelayMinutes: number;
  isFaster: boolean;
  timeSavedMinutes: number;
  routePath?: Array<{ lat: number; lng: number }>;
}

interface DynamicRouteSuggestionsProps {
  isNavigating: boolean;
  currentRoute?: {
    distanceKm?: number;
    durationMinutes?: number;
    trafficDelayMinutes?: number;
  };
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  onAcceptAlternative?: (routeId: string, routePath?: Array<{ lat: number; lng: number }>) => void;
  onDismiss?: () => void;
}

export function DynamicRouteSuggestions({
  isNavigating,
  currentRoute,
  origin,
  destination,
  onAcceptAlternative,
  onDismiss
}: DynamicRouteSuggestionsProps) {
  const [alternatives, setAlternatives] = useState<RouteAlternative[]>([]);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  const checkForFasterRoutes = useCallback(async () => {
    if (!isNavigating || !origin || !destination || !currentRoute) return;
    
    const now = Date.now();
    if (now - lastCheckTime < 5 * 60 * 1000) return;
    
    setLastCheckTime(now);
    
    try {
      const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;
      if (!TOMTOM_API_KEY) return;
      
      const response = await fetch(
        `https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json?` +
        `key=${TOMTOM_API_KEY}&maxAlternatives=2&traffic=true&travelMode=truck&vehicleCommercial=true&computeTravelTimeFor=all`
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 1) {
        const currentDuration = currentRoute.durationMinutes || 0;
        
        const fasterRoutes = data.routes.slice(1).map((route: any, index: number) => {
          const summary = route.summary;
          const durationMinutes = Math.round(summary.travelTimeInSeconds / 60);
          const timeSaved = currentDuration - durationMinutes;
          
          return {
            id: `alt-${index}`,
            name: `Alternative ${index + 1}`,
            distanceKm: Math.round(summary.lengthInMeters / 1000),
            durationMinutes,
            trafficDelayMinutes: Math.round((summary.trafficDelayInSeconds || 0) / 60),
            isFaster: timeSaved > 2,
            timeSavedMinutes: timeSaved,
            routePath: route.legs?.[0]?.points?.map((p: any) => ({ lat: p.latitude, lng: p.longitude }))
          };
        }).filter((r: RouteAlternative) => r.isFaster && r.timeSavedMinutes >= 3);
        
        if (fasterRoutes.length > 0) {
          setAlternatives(fasterRoutes);
          setShowSuggestion(true);
          setDismissed(false);
          hapticNavEvent();
        }
      }
    } catch (error) {
      console.warn('[ROUTE-SUGGEST] Failed to check alternatives:', error);
    }
  }, [isNavigating, origin, destination, currentRoute, lastCheckTime]);

  useEffect(() => {
    if (!isNavigating) {
      setShowSuggestion(false);
      setAlternatives([]);
      setDismissed(false);
      setLastCheckTime(0);
      return;
    }
    
    checkForFasterRoutes();
    
    const interval = setInterval(checkForFasterRoutes, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
    };
  }, [isNavigating, checkForFasterRoutes]);

  const handleAccept = (alt: RouteAlternative) => {
    hapticNavEvent();
    onAcceptAlternative?.(alt.id, alt.routePath);
    setShowSuggestion(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowSuggestion(false);
    onDismiss?.();
  };

  if (!showSuggestion || dismissed || alternatives.length === 0) {
    return null;
  }

  const bestAlternative = alternatives.reduce((best, current) => 
    current.timeSavedMinutes > best.timeSavedMinutes ? current : best
  );

  return (
    <div 
      className="fixed top-[180px] left-4 right-4 z-[1800] pointer-events-auto"
      style={{ maxWidth: '400px', margin: '0 auto' }}
    >
      <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 rounded-full p-1.5">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">Faster Route Available</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="bg-white/10 rounded-lg p-2 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-white" />
                <span className="text-white text-sm">
                  Save <strong>{bestAlternative.timeSavedMinutes} min</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <Route className="h-3 w-3" />
                <span>{bestAlternative.distanceKm} km</span>
              </div>
            </div>
            {bestAlternative.trafficDelayMinutes > 0 && (
              <div className="flex items-center gap-1 mt-1 text-yellow-200 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <span>{bestAlternative.trafficDelayMinutes} min traffic delay on this route</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border-0 h-9"
            >
              Keep Current
            </Button>
            <Button
              size="sm"
              onClick={() => handleAccept(bestAlternative)}
              className="flex-1 bg-white hover:bg-white/90 text-green-700 font-semibold h-9"
            >
              Switch Route
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
