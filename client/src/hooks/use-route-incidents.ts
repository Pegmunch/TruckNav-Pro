import { useState } from "react";

export interface RouteIncident {
  id: string;
  type: string;
  lat: number;
  lon: number;
  description: string;
}

export function useRouteIncidents() {
  const [incidents, setIncidents] = useState<RouteIncident[]>([]);
  return { incidents, setIncidents };
}
