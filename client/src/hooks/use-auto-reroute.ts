import { useState, useEffect, useRef, useCallback } from 'react';
import { useGPS, type GPSContextValue } from '@/contexts/gps-context';
import { apiRequest } from '@/lib/queryClient';
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
  lateralThresholdMeters: 35,
  consecutiveFixesRequired: 2,
  minSecondsBetweenReroutes: 10,
  minProgressMeters: 50,
  headingDeviationDegrees: 45,
  offRouteDelaySeconds: 5,
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

interface RerouteContext {
  toLocation: string | null;
  routePreference: 'fastest' | 'eco' | 'avoid_tolls';
  useCarMode: boolean;
}

export function useAutoReroute(
  currentRoute: Route | null,
  isNavigating: boolean,
  toCoordinates: { lat: number; lng: number } | null,
  activeProfileId: string | null,
  onRerouteSuccess: (newRoute: Route) => void,
  rerouteContext: RerouteContext,
  config: Partial<AutoRerouteConfig> = {}
): UseAutoRerouteReturn {
  const gpsData = useGPS();
  
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
  const lastOffRouteCheckTimeRef = useRef<number>(0);

  const gpsRef = useRef(gpsData);
  const toCoordinatesRef = useRef(toCoordinates);
  const activeProfileIdRef = useRef(activeProfileId);
  const onRerouteSuccessRef = useRef(onRerouteSuccess);
  const lastRerouteAtRef = useRef<number | null>(null);
  const rerouteContextRef = useRef(rerouteContext);

  useEffect(() => { gpsRef.current = gpsData; }, [gpsData]);
  useEffect(() => { toCoordinatesRef.current = toCoordinates; }, [toCoordinates]);
  useEffect(() => { activeProfileIdRef.current = activeProfileId; }, [activeProfileId]);
  useEffect(() => { onRerouteSuccessRef.current = onRerouteSuccess; }, [onRerouteSuccess]);
  useEffect(() => { rerouteContextRef.current = rerouteContext; }, [rerouteContext]);
  
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

  const buildRouteLineFromCoords = useCallback((coords: [number, number][]) => {
    if (coords.length >= 2) {
      try {
        const cleanCoords = coords.map((c) => [Number(c[0]), Number(c[1])] as [number, number]);
        routeLineRef.current = turf.lineString(cleanCoords);
        console.log('[AUTO-REROUTE] Route reference line built with', cleanCoords.length, 'coordinates');
      } catch (lineErr) {
        console.error('[AUTO-REROUTE] Failed to create lineString:', lineErr);
        routeLineRef.current = null;
      }
    } else {
      console.warn('[AUTO-REROUTE] Not enough valid coordinates for route line');
      routeLineRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    let built = false;

    if (currentRoute?.geometry) {
      try {
        const geometry = typeof currentRoute.geometry === 'string' 
          ? JSON.parse(currentRoute.geometry) 
          : currentRoute.geometry;
        
        if (geometry?.coordinates && Array.isArray(geometry.coordinates)) {
          const transformedCoords = geometry.coordinates
            .map((coord: unknown) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                const lng = Number(coord[0]);
                const lat = Number(coord[1]);
                if (!isNaN(lng) && !isNaN(lat) && isFinite(lng) && isFinite(lat)) {
                  return [lng, lat] as [number, number];
                }
              }
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
            buildRouteLineFromCoords(transformedCoords);
            built = true;
          }
        }
      } catch (e) {
        console.error('[AUTO-REROUTE] Failed to parse route geometry:', e);
      }
    }

    if (!built && currentRoute?.routePath && Array.isArray(currentRoute.routePath) && currentRoute.routePath.length >= 2) {
      const transformedCoords = currentRoute.routePath
        .map((coord: any) => {
          if (coord && typeof coord === 'object') {
            const lng = Number(coord.lng ?? coord.longitude ?? coord.lon);
            const lat = Number(coord.lat ?? coord.latitude);
            if (!isNaN(lng) && !isNaN(lat) && isFinite(lng) && isFinite(lat)) {
              return [lng, lat] as [number, number];
            }
          }
          return null;
        })
        .filter((coord: [number, number] | null): coord is [number, number] => coord !== null);
      
      if (transformedCoords.length >= 2) {
        buildRouteLineFromCoords(transformedCoords);
        built = true;
      }
    }

    if (!built) {
      routeLineRef.current = null;
    }
  }, [currentRoute?.geometry, currentRoute?.routePath, buildRouteLineFromCoords]);
  
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

    const pos = gps.position!;

    // GATE 1: Speed gate — do not flag off-route when stationary or near-stationary.
    // Vehicles stopped at lights, junctions or fuel stops would otherwise false-trigger.
    // 1.5 m/s ≈ 5.4 km/h — below this we treat the vehicle as stationary.
    if (pos.speed !== null && pos.speed !== undefined && pos.speed < 1.5) {
      return { isOff: false, distance: 0, bearing: 0 };
    }

    // GATE 2: GPS quality gate — if the device reports very poor accuracy (> 80 m)
    // the raw coordinate is too unreliable to make a rerouting decision.
    const gpsAccuracy = typeof pos.accuracy === 'number' ? pos.accuracy : 0;
    if (gpsAccuracy > 80) {
      console.log(`[AUTO-REROUTE] GPS accuracy too poor (${gpsAccuracy.toFixed(0)}m) — skipping off-route check`);
      return { isOff: false, distance: 0, bearing: 0 };
    }

    // GATE 3: Confidence gate — use the existing GPS confidence score.
    // Below 25/100 means the fix is likely stale or jittered.
    if (typeof pos.confidenceScore === 'number' && pos.confidenceScore < 25) {
      console.log(`[AUTO-REROUTE] GPS confidence too low (${pos.confidenceScore}) — skipping off-route check`);
      return { isOff: false, distance: 0, bearing: 0 };
    }

    try {
      const lng = pos.longitude;
      const lat = pos.latitude;

      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        console.warn('[AUTO-REROUTE] Invalid GPS coordinates:', { lng, lat });
        return { isOff: false, distance: 0, bearing: 0 };
      }

      const currentPoint = turf.point([lng, lat]);
      const nearestOnLine = turf.nearestPointOnLine(routeLineRef.current, currentPoint);

      const distanceKm = turf.distance(currentPoint, nearestOnLine, { units: 'kilometers' });
      const distanceMeters = distanceKm * 1000;

      // IMPROVEMENT: Dynamic threshold — widen the off-route trigger distance to account
      // for the GPS accuracy reported by the device. A fix with 30m accuracy should not
      // trigger rerouting at 35m deviation; only at 35m + a portion of the accuracy margin.
      // Formula: max(baseThreshold, accuracy × 0.6 + 15), capped at 75m.
      const dynamicThreshold = Math.min(
        Math.max(mergedConfig.lateralThresholdMeters, gpsAccuracy * 0.6 + 15),
        75
      );

      // Heading deviation against the nearest route segment
      let headingDeviation = 0;
      const heading = pos.smoothedHeading ?? pos.heading;
      if (heading !== null && heading !== undefined) {
        const routeCoords = routeLineRef.current.geometry.coordinates;
        const nearestIndex = nearestOnLine.properties.index || 0;

        if (nearestIndex < routeCoords.length - 1) {
          const startCoord = routeCoords[nearestIndex];
          const endCoord = routeCoords[nearestIndex + 1];

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

      const isLaterallyOff = distanceMeters > dynamicThreshold;
      const isHeadingOff = headingDeviation > mergedConfig.headingDeviationDegrees;

      // Only count as off-route if laterally beyond the dynamic threshold,
      // OR if significantly displaced (>40m) AND heading in the wrong direction.
      const isOff = isLaterallyOff || (distanceMeters > 40 && isHeadingOff);

      if (isOff) {
        console.log(
          `[AUTO-REROUTE] Off-route: ${distanceMeters.toFixed(0)}m (threshold ${dynamicThreshold.toFixed(0)}m, GPS acc ${gpsAccuracy.toFixed(0)}m, hdg dev ${headingDeviation.toFixed(0)}°)`
        );
      }

      return { isOff, distance: distanceMeters, bearing: headingDeviation };
    } catch (e) {
      console.warn('[AUTO-REROUTE] Error checking off-route status:', e);
      return { isOff: false, distance: 0, bearing: 0 };
    }
  }, [mergedConfig.lateralThresholdMeters, mergedConfig.headingDeviationDegrees, hasValidGpsCoordinates, isValidCoordinate]);
  
  const triggerReroute = useCallback(async () => {
    const latestGps = gpsRef.current;
    const latestDest = toCoordinatesRef.current;
    const latestProfileId = activeProfileIdRef.current;
    const ctx = rerouteContextRef.current;

    if (isReroutingRef.current) {
      console.log('[AUTO-REROUTE] Already rerouting, skipping');
      return;
    }
    if (!latestDest) {
      console.log('[AUTO-REROUTE] No destination coordinates, skipping reroute');
      return;
    }
    if (!hasValidGpsCoordinates(latestGps)) {
      console.log('[AUTO-REROUTE] No valid GPS position, skipping reroute');
      return;
    }
    
    const now = Date.now();
    if (lastRerouteAtRef.current && (now - lastRerouteAtRef.current) < mergedConfig.minSecondsBetweenReroutes * 1000) {
      console.log('[AUTO-REROUTE] Skipping - too soon since last reroute');
      return;
    }
    
    isReroutingRef.current = true;
    setState(prev => ({ ...prev, isRerouting: true }));
    
    const currentLat = latestGps!.position!.latitude;
    const currentLng = latestGps!.position!.longitude;
    
    const endLocationText = ctx.toLocation || `${latestDest.lat},${latestDest.lng}`;
    
    console.log('[AUTO-REROUTE] === AUTOMATIC REROUTE (identical to GO button) ===');
    console.log('[AUTO-REROUTE] From GPS:', { lat: currentLat, lng: currentLng });
    console.log('[AUTO-REROUTE] To destination:', endLocationText, latestDest);
    console.log('[AUTO-REROUTE] Vehicle profile:', latestProfileId);
    console.log('[AUTO-REROUTE] Route preference:', ctx.routePreference);
    console.log('[AUTO-REROUTE] Car mode:', ctx.useCarMode);
    
    try {
      const response = await apiRequest('POST', '/api/routes/calculate', {
        startLocation: `${currentLat},${currentLng}`,
        endLocation: endLocationText,
        startCoordinates: {
          lat: currentLat,
          lng: currentLng,
        },
        endCoordinates: latestDest,
        vehicleProfileId: latestProfileId,
        routePreference: ctx.routePreference || 'fastest',
        useCarMode: ctx.useCarMode,
        isReroute: true,
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Reroute API failed: ${response.status} - ${errorText}`);
      }
      
      const newRoute = await response.json();
      
      if (newRoute.routePath && Array.isArray(newRoute.routePath) && newRoute.routePath.length >= 2 && !newRoute.geometry) {
        newRoute.geometry = {
          type: 'LineString',
          coordinates: newRoute.routePath
            .filter((p: any) => p && typeof p.lat === 'number' && typeof p.lng === 'number')
            .map((p: any) => [p.lng, p.lat]),
        };
      }

      newRoute._rerouteTimestamp = Date.now();
      
      console.log('[AUTO-REROUTE] New route received:', {
        routePathLength: newRoute.routePath?.length || 0,
        hasGeometry: !!newRoute.geometry,
        geometryCoords: newRoute.geometry?.coordinates?.length || 0,
        instructionsCount: newRoute.instructions?.length || 0,
        distance: newRoute.distance,
        duration: newRoute.duration,
        rerouteTimestamp: newRoute._rerouteTimestamp,
      });
      
      onRerouteSuccessRef.current(newRoute);
      
      lastRerouteAtRef.current = Date.now();
      
      if (offRouteTimerRef.current) {
        clearTimeout(offRouteTimerRef.current);
        offRouteTimerRef.current = null;
      }
      offRouteStartTimeRef.current = null;
      
      routeLineRef.current = null;
      
      setState(prev => ({
        ...prev,
        isOffRoute: false,
        isRerouting: false,
        lastRerouteAt: Date.now(),
        offRouteCount: 0,
        distanceFromRoute: 0,
      }));
      consecutiveOffRouteFixesRef.current = 0;
      
      console.log('[AUTO-REROUTE] === REROUTE COMPLETE - Route rendered automatically ===');
      
    } catch (error) {
      console.error('[AUTO-REROUTE] Reroute failed:', error);
      setState(prev => ({ ...prev, isRerouting: false }));
    } finally {
      isReroutingRef.current = false;
    }
  }, [mergedConfig.minSecondsBetweenReroutes, hasValidGpsCoordinates]);
  
  useEffect(() => {
    if (!isNavigating || !routeLineRef.current || isReroutingRef.current) {
      if (offRouteTimerRef.current) {
        clearTimeout(offRouteTimerRef.current);
        offRouteTimerRef.current = null;
        offRouteStartTimeRef.current = null;
      }
      return;
    }
    
    if (!gpsData || !hasValidGpsCoordinates(gpsData)) {
      return;
    }
    
    const now = Date.now();
    if (now - lastOffRouteCheckTimeRef.current < 800) {
      return;
    }
    lastOffRouteCheckTimeRef.current = now;
    
    const { isOff, distance } = checkOffRoute(gpsData);
    
    const prevDist = state.distanceFromRoute;
    if (Math.abs(distance - prevDist) > 5) {
      setState(prev => ({ ...prev, distanceFromRoute: distance }));
    }
    
    if (isOff) {
      consecutiveOffRouteFixesRef.current++;
      
      if (consecutiveOffRouteFixesRef.current >= mergedConfig.consecutiveFixesRequired) {
        setState(prev => ({
          ...prev,
          isOffRoute: true,
        }));
        
        if (!offRouteTimerRef.current && !offRouteStartTimeRef.current) {
          offRouteStartTimeRef.current = Date.now();
          console.log(`[AUTO-REROUTE] Off-route detected: ${distance.toFixed(0)}m from route - starting ${mergedConfig.offRouteDelaySeconds}s timer`);
          
          offRouteTimerRef.current = setTimeout(() => {
            console.log(`[AUTO-REROUTE] ${mergedConfig.offRouteDelaySeconds}s timer expired - triggering automatic reroute`);
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
  }, [gpsData?.position?.latitude, gpsData?.position?.longitude, isNavigating, checkOffRoute, triggerReroute, mergedConfig.consecutiveFixesRequired, mergedConfig.offRouteDelaySeconds, hasValidGpsCoordinates, state.distanceFromRoute]);
  
  useEffect(() => {
    return () => {
      if (offRouteTimerRef.current) {
        clearTimeout(offRouteTimerRef.current);
        offRouteTimerRef.current = null;
      }
    };
  }, []);
  
  const resetRerouteState = useCallback(() => {
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
    lastRerouteAtRef.current = null;
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
