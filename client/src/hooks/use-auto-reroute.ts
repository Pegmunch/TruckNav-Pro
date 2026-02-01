import { useState, useEffect, useRef, useCallback } from 'react';
import { useGPS, type GPSContextValue } from '@/contexts/gps-context';
import { useToast } from '@/hooks/use-toast';
import * as turf from '@turf/turf';
import type { Route } from '@shared/schema';

interface AutoRerouteConfig {
  lateralThresholdMeters: number;
  consecutiveFixesRequired: number;
  minSecondsBetweenReroutes: number;
  minProgressMeters: number;
  headingDeviationDegrees: number;
  offRouteDelaySeconds: number;
}

const DEFAULT_CONFIG: AutoRerouteConfig = {
  lateralThresholdMeters: 25,
  consecutiveFixesRequired: 2,
  minSecondsBetweenReroutes: 10,
  minProgressMeters: 50,
  headingDeviationDegrees: 45,
  offRouteDelaySeconds: 2,
};

interface RerouteState {
  isOffRoute: boolean;
  isRerouting: boolean;
  lastRerouteAt: number | null;
  offRouteCount: number;
  distanceFromRoute: number;
}

interface UseAutoRerouteReturn {
  isOffRoute: boolean;
  isRerouting: boolean;
  distanceFromRoute: number;
  triggerReroute: () => void;
  resetRerouteState: () => void;
}

export function useAutoReroute(
  currentRoute: Route | null,
  isNavigating: boolean,
  toCoordinates: { lat: number; lng: number } | null,
  activeProfileId: string | null,
  onRerouteSuccess: (newRoute: Route) => void,
  config: Partial<AutoRerouteConfig> = {}
): UseAutoRerouteReturn {
  const gpsData = useGPS();
  const { toast } = useToast();
  
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<RerouteState>({
    isOffRoute: false,
    isRerouting: false,
    lastRerouteAt: null,
    offRouteCount: 0,
    distanceFromRoute: 0,
  });
  
  const consecutiveOffRouteFixesRef = useRef(0);
  const lastProgressDistanceRef = useRef(0);
  const routeLineRef = useRef<ReturnType<typeof turf.lineString> | null>(null);
  const isReroutingRef = useRef(false);
  const offRouteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offRouteStartTimeRef = useRef<number | null>(null);
  
  // Helper to validate a single coordinate pair
  const isValidCoordinate = useCallback((coord: unknown): coord is [number, number] => {
    if (!Array.isArray(coord) || coord.length < 2) return false;
    const [lng, lat] = coord;
    return (
      typeof lng === 'number' &&
      typeof lat === 'number' &&
      !isNaN(lng) &&
      !isNaN(lat) &&
      isFinite(lng) &&
      isFinite(lat)
    );
  }, []);
  
  useEffect(() => {
    if (!currentRoute?.geometry) {
      routeLineRef.current = null;
      return;
    }
    
    try {
      const geometry = typeof currentRoute.geometry === 'string' 
        ? JSON.parse(currentRoute.geometry) 
        : currentRoute.geometry;
      
      if (geometry?.coordinates && Array.isArray(geometry.coordinates)) {
        // Transform and filter coordinates - handle various formats
        const transformedCoords = geometry.coordinates
          .map((coord: unknown) => {
            // Handle array format [lng, lat]
            if (Array.isArray(coord) && coord.length >= 2) {
              const lng = Number(coord[0]);
              const lat = Number(coord[1]);
              if (!isNaN(lng) && !isNaN(lat) && isFinite(lng) && isFinite(lat)) {
                return [lng, lat] as [number, number];
              }
            }
            // Handle object format {lng, lat} or {longitude, latitude}
            if (coord && typeof coord === 'object') {
              const obj = coord as Record<string, unknown>;
              const lng = Number(obj.lng ?? obj.longitude ?? obj.lon);
              const lat = Number(obj.lat ?? obj.latitude);
              if (!isNaN(lng) && !isNaN(lat) && isFinite(lng) && isFinite(lat)) {
                return [lng, lat] as [number, number];
              }
            }
            return null;
          })
          .filter((coord: [number, number] | null): coord is [number, number] => coord !== null);
        
        if (transformedCoords.length >= 2) {
          try {
            // Extra safety: ensure all coords are clean number pairs
            const cleanCoords = transformedCoords.map((c: [number, number]) => [Number(c[0]), Number(c[1])] as [number, number]);
            routeLineRef.current = turf.lineString(cleanCoords);
          } catch (lineErr) {
            console.error('[AUTO-REROUTE] Failed to create lineString:', lineErr);
            routeLineRef.current = null;
          }
        } else {
          console.warn('[AUTO-REROUTE] Not enough valid coordinates for route line');
          routeLineRef.current = null;
        }
      } else {
        routeLineRef.current = null;
      }
    } catch (e) {
      console.error('[AUTO-REROUTE] Failed to parse route geometry:', e);
      routeLineRef.current = null;
    }
  }, [currentRoute?.geometry]);
  
  // Helper to check if GPS has valid coordinates
  const hasValidGpsCoordinates = useCallback((gps: GPSContextValue | null): boolean => {
    if (!gps?.position) return false;
    const { latitude, longitude } = gps.position;
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude !== 0 &&
      longitude !== 0
    );
  }, []);
  
  const checkOffRoute = useCallback((gps: GPSContextValue): { isOff: boolean; distance: number; bearing: number } => {
    if (!routeLineRef.current || !hasValidGpsCoordinates(gps)) {
      return { isOff: false, distance: 0, bearing: 0 };
    }
    
    try {
      const lng = gps.position!.longitude;
      const lat = gps.position!.latitude;
      
      // Final validation before creating point
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        console.warn('[AUTO-REROUTE] Invalid GPS coordinates:', { lng, lat });
        return { isOff: false, distance: 0, bearing: 0 };
      }
      
      const currentPoint = turf.point([lng, lat]);
      const nearestOnLine = turf.nearestPointOnLine(routeLineRef.current, currentPoint);
    
    const distanceKm = turf.distance(currentPoint, nearestOnLine, { units: 'kilometers' });
    const distanceMeters = distanceKm * 1000;
    
    let headingDeviation = 0;
    const heading = gps.position!.heading;
    if (heading !== null && heading !== undefined) {
      const routeCoords = routeLineRef.current.geometry.coordinates;
      const nearestIndex = nearestOnLine.properties.index || 0;
      
      if (nearestIndex < routeCoords.length - 1) {
        const startCoord = routeCoords[nearestIndex];
        const endCoord = routeCoords[nearestIndex + 1];
        
        // Validate coordinates before using in turf.point
        if (isValidCoordinate(startCoord) && isValidCoordinate(endCoord)) {
          const segmentStart = turf.point(startCoord);
          const segmentEnd = turf.point(endCoord);
          const routeBearing = turf.bearing(segmentStart, segmentEnd);
          
          headingDeviation = Math.abs(heading - routeBearing);
          if (headingDeviation > 180) {
            headingDeviation = 360 - headingDeviation;
          }
        }
      }
    }
    
    const isLaterallyOff = distanceMeters > mergedConfig.lateralThresholdMeters;
    const isHeadingOff = headingDeviation > mergedConfig.headingDeviationDegrees;
    
    return {
      isOff: isLaterallyOff || (distanceMeters > 30 && isHeadingOff),
      distance: distanceMeters,
      bearing: headingDeviation,
    };
    } catch (e) {
      console.warn('[AUTO-REROUTE] Error checking off-route status:', e);
      return { isOff: false, distance: 0, bearing: 0 };
    }
  }, [mergedConfig.lateralThresholdMeters, mergedConfig.headingDeviationDegrees, hasValidGpsCoordinates, isValidCoordinate]);
  
  const triggerReroute = useCallback(async () => {
    if (isReroutingRef.current || !toCoordinates || !hasValidGpsCoordinates(gpsData)) {
      return;
    }
    
    const now = Date.now();
    if (state.lastRerouteAt && (now - state.lastRerouteAt) < mergedConfig.minSecondsBetweenReroutes * 1000) {
      console.log('[AUTO-REROUTE] Skipping - too soon since last reroute');
      return;
    }
    
    isReroutingRef.current = true;
    setState(prev => ({ ...prev, isRerouting: true }));
    
    // REMOVED: Toast notification disabled per user request - no popups
    console.log('[AUTO-REROUTE] Recalculating route from current position...');
    
    try {
      const currentLat = gpsData!.position!.latitude;
      const currentLng = gpsData!.position!.longitude;
      
      const response = await fetch('/api/routes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLocation: `${currentLat},${currentLng}`,
          endLocation: `${toCoordinates.lat},${toCoordinates.lng}`,
          startCoordinates: {
            lat: currentLat,
            lng: currentLng,
          },
          endCoordinates: toCoordinates,
          vehicleProfileId: activeProfileId,
          routePreference: 'fastest',
          isReroute: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Reroute failed: ${response.status}`);
      }
      
      const newRoute = await response.json();
      
      console.log('[AUTO-REROUTE] Successfully calculated new route');
      
      // REMOVED: Toast notification disabled per user request - no popups
      
      onRerouteSuccess(newRoute);
      
      setState(prev => ({
        ...prev,
        isOffRoute: false,
        isRerouting: false,
        lastRerouteAt: Date.now(),
        offRouteCount: 0,
        distanceFromRoute: 0,
      }));
      consecutiveOffRouteFixesRef.current = 0;
      
    } catch (error) {
      console.error('[AUTO-REROUTE] Reroute failed:', error);
      
      // REMOVED: Toast notification disabled per user request - no popups
      
      setState(prev => ({ ...prev, isRerouting: false }));
    } finally {
      isReroutingRef.current = false;
    }
  }, [toCoordinates, gpsData?.position, activeProfileId, state.lastRerouteAt, mergedConfig.minSecondsBetweenReroutes, onRerouteSuccess, toast]);
  
  useEffect(() => {
    // Skip rerouting if not navigating, no valid GPS, no route, or already rerouting
    if (!isNavigating || !routeLineRef.current || isReroutingRef.current) {
      // Clear any pending timer if navigation stops
      if (offRouteTimerRef.current) {
        clearTimeout(offRouteTimerRef.current);
        offRouteTimerRef.current = null;
        offRouteStartTimeRef.current = null;
      }
      return;
    }
    
    // CRITICAL: Only attempt rerouting with valid GPS coordinates
    if (!gpsData || !hasValidGpsCoordinates(gpsData)) {
      console.log('[AUTO-REROUTE] Skipping - no valid GPS coordinates available');
      return;
    }
    
    const { isOff, distance } = checkOffRoute(gpsData);
    
    setState(prev => ({ ...prev, distanceFromRoute: distance }));
    
    if (isOff) {
      consecutiveOffRouteFixesRef.current++;
      
      // Only start timer after minimum consecutive fixes to avoid false positives
      if (consecutiveOffRouteFixesRef.current >= mergedConfig.consecutiveFixesRequired) {
        setState(prev => ({
          ...prev,
          isOffRoute: true,
        }));
        
        // Start 10-second timer if not already running
        if (!offRouteTimerRef.current && !offRouteStartTimeRef.current) {
          offRouteStartTimeRef.current = Date.now();
          console.log(`[AUTO-REROUTE] Off-route detected: ${distance.toFixed(0)}m from route - starting ${mergedConfig.offRouteDelaySeconds}s timer`);
          
          offRouteTimerRef.current = setTimeout(() => {
            console.log(`[AUTO-REROUTE] ${mergedConfig.offRouteDelaySeconds}s timer expired - triggering reroute`);
            offRouteTimerRef.current = null;
            offRouteStartTimeRef.current = null;
            setState(prev => ({
              ...prev,
              offRouteCount: prev.offRouteCount + 1,
            }));
            triggerReroute();
          }, mergedConfig.offRouteDelaySeconds * 1000);
        } else if (offRouteStartTimeRef.current) {
          const elapsedSeconds = Math.round((Date.now() - offRouteStartTimeRef.current) / 1000);
          console.log(`[AUTO-REROUTE] Still off-route: ${distance.toFixed(0)}m - ${elapsedSeconds}s elapsed of ${mergedConfig.offRouteDelaySeconds}s`);
        }
      }
    } else {
      // Back on route - cancel the timer
      if (offRouteTimerRef.current) {
        console.log('[AUTO-REROUTE] Back on route - cancelling reroute timer');
        clearTimeout(offRouteTimerRef.current);
        offRouteTimerRef.current = null;
        offRouteStartTimeRef.current = null;
      }
      if (consecutiveOffRouteFixesRef.current > 0) {
        console.log('[AUTO-REROUTE] Back on route');
      }
      consecutiveOffRouteFixesRef.current = 0;
      setState(prev => ({ ...prev, isOffRoute: false }));
    }
  }, [gpsData, gpsData?.position?.latitude, gpsData?.position?.longitude, isNavigating, checkOffRoute, triggerReroute, mergedConfig.consecutiveFixesRequired, mergedConfig.offRouteDelaySeconds, hasValidGpsCoordinates]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (offRouteTimerRef.current) {
        clearTimeout(offRouteTimerRef.current);
        offRouteTimerRef.current = null;
      }
    };
  }, []);
  
  const resetRerouteState = useCallback(() => {
    // Clear any pending reroute timer
    if (offRouteTimerRef.current) {
      clearTimeout(offRouteTimerRef.current);
      offRouteTimerRef.current = null;
    }
    offRouteStartTimeRef.current = null;
    
    setState({
      isOffRoute: false,
      isRerouting: false,
      lastRerouteAt: null,
      offRouteCount: 0,
      distanceFromRoute: 0,
    });
    consecutiveOffRouteFixesRef.current = 0;
    lastProgressDistanceRef.current = 0;
    routeLineRef.current = null;
  }, []);
  
  useEffect(() => {
    if (!isNavigating) {
      resetRerouteState();
    }
  }, [isNavigating, resetRerouteState]);
  
  return {
    isOffRoute: state.isOffRoute,
    isRerouting: state.isRerouting,
    distanceFromRoute: state.distanceFromRoute,
    triggerReroute,
    resetRerouteState,
  };
}
