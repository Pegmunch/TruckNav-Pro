import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { IncidentTypeKey } from '@shared/incident-icons';

export interface RouteIncident {
  id: string;
  type: IncidentTypeKey;
  coordinates: { lat: number; lng: number };
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: 'tomtom' | 'here' | 'crowdsourced';
  distanceFromRoute: number;
  reportedAt: Date;
  endTime?: Date;
  delay?: number;
  roadName?: string;
}

export interface RouteIncidentsData {
  incidents: RouteIncident[];
  tomtomIncidents: RouteIncident[];
  crowdsourcedIncidents: RouteIncident[];
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

const INCIDENT_TYPE_MAP: Record<string, IncidentTypeKey> = {
  'ACCIDENT': 'accident',
  'CONGESTION': 'traffic_jam',
  'JAM': 'traffic_jam',
  'ROAD_CLOSURE': 'road_closure',
  'ROAD_CLOSED': 'road_closure',
  'LANE_CLOSURE': 'road_closure',
  'LANE_CLOSED': 'road_closure',
  'CONSTRUCTION': 'construction',
  'ROAD_WORKS': 'construction',
  'ROADWORK': 'construction',
  'HAZARD': 'obstacle',
  'DANGER': 'obstacle',
  'WEATHER': 'fog',
  'FOG': 'fog',
  'ICE': 'ice',
  'FLOOD': 'flooding',
  'FLOODING': 'flooding',
  'BROKEN_DOWN_VEHICLE': 'car_breakdown',
  'BREAKDOWN': 'car_breakdown',
  'TRUCK_BREAKDOWN': 'truck_breakdown',
  'POLICE': 'police',
  'SPEED_CAMERA': 'speed_camera',
  'CAMERA': 'speed_camera',
  'FIXED_CAMERA': 'speed_camera',
  'MOBILE_CAMERA': 'speed_camera',
  'AVERAGE_SPEED': 'speed_camera',
  'SPECS': 'speed_camera',
  'HEAVY_TRAFFIC': 'heavy_traffic',
  'DEBRIS': 'debris',
  'POTHOLE': 'pothole',
  'ANIMAL': 'animal_on_road',
  'OBSTACLE': 'obstacle',
};

function mapTomTomIncidentType(tomtomType: string): IncidentTypeKey {
  const upperType = tomtomType.toUpperCase().replace(/[^A-Z_]/g, '_');
  return INCIDENT_TYPE_MAP[upperType] || 'obstacle';
}

function mapSeverity(magnitude: number | undefined): 'low' | 'medium' | 'high' | 'critical' {
  if (!magnitude || magnitude <= 1) return 'low';
  if (magnitude <= 2) return 'medium';
  if (magnitude <= 3) return 'high';
  return 'critical';
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function pointToSegmentDistance(
  point: { lat: number; lng: number },
  segStart: { lat: number; lng: number },
  segEnd: { lat: number; lng: number }
): number {
  const dx = segEnd.lng - segStart.lng;
  const dy = segEnd.lat - segStart.lat;
  const segLengthSq = dx * dx + dy * dy;
  
  if (segLengthSq === 0) {
    return calculateDistance(point.lat, point.lng, segStart.lat, segStart.lng);
  }
  
  let t = ((point.lng - segStart.lng) * dx + (point.lat - segStart.lat) * dy) / segLengthSq;
  t = Math.max(0, Math.min(1, t));
  
  const projLng = segStart.lng + t * dx;
  const projLat = segStart.lat + t * dy;
  
  return calculateDistance(point.lat, point.lng, projLat, projLng);
}

function isPointNearRoute(
  point: { lat: number; lng: number },
  routePath: Array<{ lat: number; lng: number }>,
  maxDistanceKm: number = 0.5
): { isNear: boolean; minDistance: number } {
  let minDistance = Infinity;

  for (let i = 0; i < routePath.length - 1; i++) {
    const segStart = routePath[i];
    const segEnd = routePath[i + 1];
    const distance = pointToSegmentDistance(point, segStart, segEnd);
    minDistance = Math.min(minDistance, distance);
    
    if (distance <= maxDistanceKm) {
      return { isNear: true, minDistance: distance };
    }
  }
  
  if (routePath.length > 0) {
    const lastPoint = routePath[routePath.length - 1];
    const distToEnd = calculateDistance(point.lat, point.lng, lastPoint.lat, lastPoint.lng);
    minDistance = Math.min(minDistance, distToEnd);
  }

  return { isNear: minDistance <= maxDistanceKm, minDistance };
}

function getBoundingBox(routePath: Array<{ lat: number; lng: number }>, bufferKm: number = 50) {
  if (!routePath || routePath.length === 0) return null;

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  for (const point of routePath) {
    if (point.lat < minLat) minLat = point.lat;
    if (point.lat > maxLat) maxLat = point.lat;
    if (point.lng < minLng) minLng = point.lng;
    if (point.lng > maxLng) maxLng = point.lng;
  }

  const latBuffer = bufferKm / 111;
  const lngBuffer = bufferKm / (111 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));

  return {
    north: maxLat + latBuffer,
    south: minLat - latBuffer,
    east: maxLng + lngBuffer,
    west: minLng - lngBuffer,
  };
}

export function useRouteIncidents(
  routePath: Array<{ lat: number; lng: number }> | null | undefined,
  enabled: boolean = true,
  refreshIntervalMs: number = 2 * 60 * 1000
): RouteIncidentsData {
  const [tomtomIncidents, setTomtomIncidents] = useState<RouteIncident[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<number | null>(null);

  const boundingBox = routePath && routePath.length >= 2 ? getBoundingBox(routePath, 50) : null;

  const { data: crowdsourcedData } = useQuery({
    queryKey: ['/api/traffic-incidents', boundingBox?.north, boundingBox?.south, boundingBox?.east, boundingBox?.west],
    queryFn: async () => {
      if (!boundingBox) return [];
      
      const params = new URLSearchParams({
        north: boundingBox.north.toString(),
        south: boundingBox.south.toString(),
        east: boundingBox.east.toString(),
        west: boundingBox.west.toString(),
      });
      
      const response = await fetch(`/api/traffic-incidents?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) return [];
      return response.json();
    },
    enabled: enabled && !!boundingBox,
    refetchInterval: refreshIntervalMs,
    staleTime: 60 * 1000,
  });

  const fetchTomTomIncidents = useCallback(async (path: Array<{ lat: number; lng: number }>) => {
    const bbox = getBoundingBox(path, 50);
    if (!bbox) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tomtom/traffic-incidents?north=${bbox.north.toFixed(6)}&south=${bbox.south.toFixed(6)}&east=${bbox.east.toFixed(6)}&west=${bbox.west.toFixed(6)}`,
        { 
          signal: abortControllerRef.current?.signal,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        console.warn(`[ROUTE-INCIDENTS] Server incidents API error: ${response.status}`);
        setError(`Incidents API error: ${response.status}`);
        return;
      }

      const serverIncidents = await response.json();
      
      if (!Array.isArray(serverIncidents) || serverIncidents.length === 0) {
        console.log('[ROUTE-INCIDENTS] No incidents returned from server (TomTom + HERE)');
        setTomtomIncidents([]);
        return;
      }

      const routeIncidents: RouteIncident[] = [];

      for (const incident of serverIncidents) {
        const incidentLat = incident.latitude || incident.coordinates?.lat || 0;
        const incidentLng = incident.longitude || incident.coordinates?.lng || 0;
        
        if (incidentLat === 0 && incidentLng === 0) continue;

        const { isNear, minDistance } = isPointNearRoute(
          { lat: incidentLat, lng: incidentLng },
          path,
          0.5
        );

        if (!isNear) continue;

        const incidentType = mapTomTomIncidentType(incident.type || 'UNKNOWN');
        const source = incident.source || 'tomtom';

        routeIncidents.push({
          id: incident.id || `${source}_${incidentLat.toFixed(5)}_${incidentLng.toFixed(5)}_${Date.now()}`,
          type: incidentType,
          coordinates: { lat: incidentLat, lng: incidentLng },
          description: incident.description || undefined,
          severity: incident.severity || mapSeverity(incident.magnitudeOfDelay || incident.delay),
          source: source as 'tomtom' | 'here' | 'crowdsourced',
          distanceFromRoute: minDistance,
          reportedAt: incident.reportedAt ? new Date(incident.reportedAt) : new Date(),
          endTime: incident.expiresAt ? new Date(incident.expiresAt) : undefined,
          delay: incident.delay,
          roadName: incident.roadNumbers?.[0] || incident.from,
        });
      }

      setTomtomIncidents(routeIncidents);
      setLastUpdated(new Date());
      console.log(`[ROUTE-INCIDENTS] ✅ Found ${routeIncidents.length} live incidents along route (source: server proxy with TomTom + HERE fallback)`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[ROUTE-INCIDENTS] Error fetching incidents:', err);
        setError(err.message || 'Failed to fetch incidents');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !routePath || routePath.length < 2) {
      setTomtomIncidents([]);
      return;
    }

    fetchTomTomIncidents(routePath);

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    intervalRef.current = window.setInterval(() => {
      if (routePath && routePath.length >= 2) {
        console.log('[ROUTE-INCIDENTS] 🔄 Refreshing incident data...');
        fetchTomTomIncidents(routePath);
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
  }, [routePath, enabled, refreshIntervalMs, fetchTomTomIncidents]);

  const filteredCrowdsourced: RouteIncident[] = (crowdsourcedData || [])
    .filter((incident: any) => {
      if (!incident.coordinates || !routePath) return false;
      const { isNear } = isPointNearRoute(incident.coordinates, routePath, 0.5);
      return isNear;
    })
    .map((incident: any) => ({
      id: incident.id || `crowdsourced_${incident.coordinates?.lat}_${incident.coordinates?.lng}`,
      type: incident.type as IncidentTypeKey,
      coordinates: incident.coordinates,
      description: incident.description,
      severity: incident.severity || 'medium',
      source: 'crowdsourced' as const,
      distanceFromRoute: 0,
      reportedAt: new Date(incident.reportedAt || incident.createdAt || Date.now()),
      endTime: incident.endTime ? new Date(incident.endTime) : undefined,
    }));

  const allIncidents = [...tomtomIncidents, ...filteredCrowdsourced]
    .sort((a, b) => a.distanceFromRoute - b.distanceFromRoute);

  return {
    incidents: allIncidents,
    tomtomIncidents,
    crowdsourcedIncidents: filteredCrowdsourced,
    lastUpdated,
    isLoading,
    error,
  };
}
