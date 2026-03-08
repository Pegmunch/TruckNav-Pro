import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
export function useTrafficState(_routeId?: number | null, _profile?: any) {
  return { trafficEnabled: false, setTrafficEnabled: () => {}, alternatives: [], shouldReroute: false, bestAlternative: null, timeSavingsAvailable: 0, rerouteReason: null, isLoadingAlternatives: false };
}
export function useCurrentTrafficConditions(_routeId: number | null, _enabled: boolean) {
  return useQuery({ queryKey: ["/api/traffic-conditions", _routeId], enabled: false, queryFn: async () => [] });
}
export function useTrafficIncidents(_bounds: any, _enabled: boolean) {
  return useQuery({ queryKey: ["/api/traffic-incidents", JSON.stringify(_bounds)], enabled: false, queryFn: async () => [] });
}
