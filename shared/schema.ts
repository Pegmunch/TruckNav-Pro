export interface VehicleProfile {
  id: string;
  name: string;
  type: string;
  height?: number;
  weight?: number;
  length?: number;
}

export interface Route {
  id: string;
  origin: string;
  destination: string;
  distance: number;
  duration: number;
  polyline?: string;
}

export interface Journey {
  id: string;
  route: Route;
  startTime: number;
  endTime?: number;
  status: "active" | "completed" | "cancelled";
}

export interface AlternativeRoute extends Route {
  trafficDelay?: number;
  reason?: string;
}

export interface TrafficIncident {
  id: string;
  type: string;
  lat: number;
  lon: number;
  description: string;
  severity: "low" | "medium" | "high";
  startTime?: number;
  endTime?: number;
}
