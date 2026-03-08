import { useState } from "react";
export interface RouteIncident {
  id: string;
  type: string;
  lat: number;
  lon: number;
  description: string;
  severity?: string;
  coordinates?: { lat: number; lng: number };
  reportedAt?: string;
  delay?: number;
  roadName?: string;
  distanceFromRoute?: number;
  isActive?: boolean;
}
export function useRouteIncidents(_routePath?: any, _enabled?: any, _refreshInterval?: number) {
  const [incidents] = useState<RouteIncident[]>([]);
  return { 
    incidents, 
    tomtomIncidents: [] as RouteIncident[], 
    isLoading: false, 
    error: null,
    lastUpdated: null as Date | null,
  };
}
