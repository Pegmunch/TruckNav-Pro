import { useState, useEffect, useCallback, useRef } from 'react';

export interface TrafficSegment {
  startIndex: number;
  endIndex: number;
  coordinates: [number, number][];
  speedRatio: number;
  color: string;
  flowLevel: 'free' | 'light' | 'moderate' | 'heavy' | 'standstill' | 'unknown';
  currentSpeed?: number;
  freeFlowSpeed?: number;
}

export interface RouteTrafficData {
  segments: TrafficSegment[];
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

const TRAFFIC_COLORS = {
  free: '#0067FF', // Bold bright blue for free-flowing traffic (per design guidelines)
  light: '#10B981', // Emerald green for light traffic
  moderate: '#EAB308', // Golden yellow for moderate
  heavy: '#F97316', // Orange for heavy traffic
  standstill: '#EF4444', // Red for standstill
  unknown: 'transparent', // Transparent so blue route shows through
};

function getFlowLevel(speedRatio: number): 'free' | 'light' | 'moderate' | 'heavy' | 'standstill' | 'unknown' {
  if (speedRatio < 0) return 'unknown';
  if (speedRatio >= 0.85) return 'free';
  if (speedRatio >= 0.65) return 'light';
  if (speedRatio >= 0.45) return 'moderate';
  if (speedRatio >= 0.25) return 'heavy';
  return 'standstill';
}

function getTrafficColor(speedRatio: number): string {
  const level = getFlowLevel(speedRatio);
  return TRAFFIC_COLORS[level];
}

export function useRouteTrafficOverlay(
  routePath: Array<{ lat: number; lng: number }> | null | undefined,
  enabled: boolean = true,
  refreshIntervalMs: number = 2 * 60 * 1000
): RouteTrafficData {
  const [segments, setSegments] = useState<TrafficSegment[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastRouteHashRef = useRef<string>('');

  const hashRoute = useCallback((path: Array<{ lat: number; lng: number }>): string => {
    if (!path || path.length < 2) return '';
    const first = path[0];
    const last = path[path.length - 1];
    return `${first.lat.toFixed(4)},${first.lng.toFixed(4)}-${last.lat.toFixed(4)},${last.lng.toFixed(4)}-${path.length}`;
  }, []);

  const fetchTrafficForRoute = useCallback(async (path: Array<{ lat: number; lng: number }>) => {
    if (!path || path.length < 2) {
      setSegments([]);
      return;
    }

    const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;
    console.log('[ROUTE-TRAFFIC] TomTom API key present:', !!TOMTOM_API_KEY);
    if (!TOMTOM_API_KEY) {
      console.warn('[ROUTE-TRAFFIC] No TomTom API key found - trying HERE fallback only');
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const newSegments: TrafficSegment[] = [];
      const SEGMENT_SIZE = 3;
      const validPath = path.filter(p => 
        typeof p.lat === 'number' && typeof p.lng === 'number' &&
        !isNaN(p.lat) && !isNaN(p.lng) &&
        isFinite(p.lat) && isFinite(p.lng)
      );

      if (validPath.length < 2) {
        setSegments([]);
        setIsLoading(false);
        return;
      }

      for (let segStart = 0; segStart < validPath.length - 1; segStart += SEGMENT_SIZE) {
        const segEnd = Math.min(segStart + SEGMENT_SIZE, validPath.length - 1);
        const segmentPoints: Array<{ lat: number; lng: number }> = [];
        
        for (let i = segStart; i <= segEnd; i++) {
          segmentPoints.push(validPath[i]);
        }

        if (segmentPoints.length < 2) continue;

        const midIndex = Math.floor(segmentPoints.length / 2);
        const midPoint = segmentPoints[midIndex];
        
        try {
          // Try TomTom Traffic Flow API first
          let data: any = null;
          let response = await fetch(
            `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative/10/json?point=${midPoint.lat.toFixed(6)},${midPoint.lng.toFixed(6)}&key=${TOMTOM_API_KEY}&unit=MPH`,
            { signal: abortControllerRef.current?.signal }
          );

          // If TomTom fails (403 Forbidden or other error), try HERE Traffic API as fallback
          if (!response.ok) {
            console.warn(`[ROUTE-TRAFFIC] TomTom API error: ${response.status}, trying HERE fallback...`);
            
            try {
              const hereResponse = await fetch(
                `/api/here/traffic-flow?lat=${midPoint.lat.toFixed(6)}&lng=${midPoint.lng.toFixed(6)}`,
                { signal: abortControllerRef.current?.signal }
              );
              
              if (hereResponse.ok) {
                data = await hereResponse.json();
                console.log(`[ROUTE-TRAFFIC] ✅ HERE fallback successful for segment ${segStart}`);
              } else {
                console.warn(`[ROUTE-TRAFFIC] HERE fallback also failed: ${hereResponse.status}, trying Mapbox...`);
                
                // Try Mapbox as third fallback
                try {
                  const mapboxResponse = await fetch(
                    `/api/mapbox/traffic-flow?lat=${midPoint.lat.toFixed(6)}&lng=${midPoint.lng.toFixed(6)}`,
                    { signal: abortControllerRef.current?.signal }
                  );
                  
                  if (mapboxResponse.ok) {
                    data = await mapboxResponse.json();
                    console.log(`[ROUTE-TRAFFIC] ✅ Mapbox fallback successful for segment ${segStart}`);
                  } else {
                    console.warn(`[ROUTE-TRAFFIC] Mapbox fallback also failed: ${mapboxResponse.status}`);
                  }
                } catch (mapboxErr) {
                  console.warn(`[ROUTE-TRAFFIC] Mapbox fallback error:`, mapboxErr);
                }
              }
            } catch (hereErr) {
              console.warn(`[ROUTE-TRAFFIC] HERE fallback error:`, hereErr);
            }
            
            // If all APIs failed, mark as unknown
            if (!data) {
              newSegments.push({
                startIndex: segStart,
                endIndex: segEnd,
                coordinates: segmentPoints.map(p => [p.lng, p.lat] as [number, number]),
                speedRatio: -1,
                color: TRAFFIC_COLORS.unknown,
                flowLevel: 'unknown',
              });
              continue;
            }
          } else {
            data = await response.json();
          }
          
          if (data.flowSegmentData) {
            const { currentSpeed, freeFlowSpeed } = data.flowSegmentData;
            const speedRatio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;
            
            newSegments.push({
              startIndex: segStart,
              endIndex: segEnd,
              coordinates: segmentPoints.map(p => [p.lng, p.lat] as [number, number]),
              speedRatio: Math.max(0, Math.min(1, speedRatio)),
              color: getTrafficColor(speedRatio),
              flowLevel: getFlowLevel(speedRatio),
              currentSpeed,
              freeFlowSpeed,
            });
          } else {
            newSegments.push({
              startIndex: segStart,
              endIndex: segEnd,
              coordinates: segmentPoints.map(p => [p.lng, p.lat] as [number, number]),
              speedRatio: 1,
              color: TRAFFIC_COLORS.free,
              flowLevel: 'free',
            });
          }
        } catch (fetchError: any) {
          if (fetchError.name === 'AbortError') {
            return;
          }
          console.warn(`[ROUTE-TRAFFIC] Fetch error for segment ${segStart}:`, fetchError);
          newSegments.push({
            startIndex: segStart,
            endIndex: segEnd,
            coordinates: segmentPoints.map(p => [p.lng, p.lat] as [number, number]),
            speedRatio: -1,
            color: TRAFFIC_COLORS.unknown,
            flowLevel: 'unknown',
          });
        }

        if (segEnd < validPath.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      setSegments(newSegments);
      setLastUpdated(new Date());
      console.log(`[ROUTE-TRAFFIC] ✅ Fetched ${newSegments.length} traffic segments for route`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[ROUTE-TRAFFIC] Error fetching traffic data:', err);
        setError(err.message || 'Failed to fetch traffic data');
        setSegments([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('[ROUTE-TRAFFIC-HOOK] Effect triggered:', { 
      enabled, 
      routePathLength: routePath?.length || 0,
      hasValidPath: routePath && routePath.length >= 2
    });
    
    // FIXED: Don't clear segments when just disabled - preserve data for quick toggle back
    // Only clear if there's no valid path
    if (!routePath || routePath.length < 2) {
      console.log('[ROUTE-TRAFFIC-HOOK] Early exit - no valid path');
      setSegments([]);
      lastRouteHashRef.current = '';
      return;
    }
    
    // If disabled but path exists, just pause updates but keep data
    if (!enabled) {
      console.log('[ROUTE-TRAFFIC-HOOK] Disabled - preserving existing segments for quick re-enable');
      return;
    }

    const routeHash = hashRoute(routePath);
    
    // Force refetch if segments are empty (after toggle ON), even if hash matches
    if (routeHash === lastRouteHashRef.current && segments.length > 0) {
      console.log('[ROUTE-TRAFFIC-HOOK] Route hash unchanged, using cached segments');
      return;
    }
    
    // Always update hash and refetch when enabled with empty segments
    lastRouteHashRef.current = routeHash;

    console.log('[ROUTE-TRAFFIC-HOOK] ✅ Fetching traffic for route with', routePath.length, 'points');
    fetchTrafficForRoute(routePath);

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    intervalRef.current = window.setInterval(() => {
      if (routePath && routePath.length >= 2) {
        console.log('[ROUTE-TRAFFIC] 🔄 Refreshing traffic data...');
        fetchTrafficForRoute(routePath);
      }
    }, refreshIntervalMs);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [routePath, enabled, refreshIntervalMs, fetchTrafficForRoute, hashRoute]);

  return {
    segments,
    lastUpdated,
    isLoading,
    error,
  };
}
