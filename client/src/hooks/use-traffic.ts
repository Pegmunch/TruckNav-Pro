import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type TrafficCondition, type AlternativeRoute, type Route, type VehicleProfile, type TrafficSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Hook for getting current traffic conditions for a route
export function useCurrentTrafficConditions(routeId: string | null, enabled: boolean = true) {
  return useQuery<TrafficCondition[]>({
    queryKey: ["/api/traffic", "conditions", routeId],
    enabled: !!routeId && enabled,
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    staleTime: 1 * 60 * 1000, // Consider data stale after 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

// Hook for getting alternative routes when traffic is detected
export function useAlternativeRoutes(
  routeId: string | null,
  vehicleProfile: VehicleProfile | null,
  enabled: boolean = false
) {
  return useQuery<AlternativeRoute[]>({
    queryKey: ["/api/traffic", "alternatives", routeId, vehicleProfile?.id],
    enabled: !!routeId && !!vehicleProfile && enabled,
    staleTime: 30 * 1000, // Consider alternatives stale after 30 seconds
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

// Hook for getting traffic incidents in a geographic area
export function useTrafficIncidents(
  bounds?: { north: number; south: number; east: number; west: number },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["/api/traffic-incidents", bounds?.north, bounds?.south, bounds?.east, bounds?.west],
    queryFn: async () => {
      if (!bounds) {
        // If no bounds provided, return empty array instead of throwing error
        return [];
      }
      
      const params = new URLSearchParams({
        north: bounds.north.toString(),
        south: bounds.south.toString(),
        east: bounds.east.toString(),
        west: bounds.west.toString(),
      });
      
      const response = await fetch(`/api/traffic-incidents?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch traffic incidents: ${response.status}`);
        return [];
      }
      
      return response.json();
    },
    enabled: enabled,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    retry: 2,
  });
}

// Hook for monitoring route conditions in real-time
export function useRouteMonitoring(
  routeId: string | null,
  vehicleProfile: VehicleProfile | null,
  enabled: boolean = false
) {
  return useQuery<{
    shouldReroute: boolean;
    timeSavingsAvailable?: number;
    bestAlternative?: AlternativeRoute;
    reason?: string;
    confidence?: number;
  }>({
    queryKey: ["/api/routes", routeId, "monitor"],
    queryFn: async () => {
      if (!routeId || !vehicleProfile) {
        throw new Error("Route ID and vehicle profile required for monitoring");
      }
      
      const response = await apiRequest("POST", `/api/routes/${routeId}/monitor`, {
        vehicleProfile,
        alertThreshold: 5, // minutes
      });
      return response.json();
    },
    enabled: !!routeId && !!vehicleProfile && enabled,
    refetchInterval: 3 * 60 * 1000, // Check every 3 minutes for re-routing opportunities
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

// Hook for applying alternative route
export function useApplyAlternativeRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      currentRouteId: string;
      alternativeRouteId: string;
      journeyId?: number;
      reason?: string;
    }) => {
      const response = await apiRequest("POST", "/api/routes/apply-alternative", data);
      return response.json();
    },
    onSuccess: (newRoute, variables) => {
      // Invalidate traffic-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/traffic"] });
      queryClient.invalidateQueries({ queryKey: ["/api/routes", variables.currentRouteId] });
      
      // Update route queries with new data
      queryClient.setQueryData(["/api/routes", variables.currentRouteId], newRoute);
    },
  });
}

// Hook for updating traffic settings/preferences
export function useUpdateTrafficSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<TrafficSettings>) => {
      const response = await apiRequest("POST", "/api/user/traffic-settings", settings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user", "settings"] });
    },
  });
}

// Hook for getting traffic settings
export function useTrafficSettings() {
  return useQuery<TrafficSettings>({
    queryKey: ["/api/user", "traffic-settings"],
    staleTime: 10 * 60 * 1000, // Settings change rarely, keep for 10 minutes
    retry: 1,
  });
}

// Hook for real-time traffic updates via Server-Sent Events (SSE)
export function useRealTimeTrafficUpdates(
  routeId: string | null,
  onTrafficUpdate?: (data: TrafficCondition[]) => void,
  onRerouteAlert?: (data: { alternative: AlternativeRoute; timeSavings: number }) => void
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["/api/traffic", "realtime", routeId],
    queryFn: async () => {
      if (!routeId) return null;

      // Create SSE connection
      const eventSource = new EventSource(`/api/traffic/stream/${routeId}`, {
        withCredentials: true,
      });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'traffic_update':
              onTrafficUpdate?.(data.conditions);
              // Update query cache with new traffic data
              queryClient.setQueryData(["/api/traffic", "conditions", routeId], data.conditions);
              break;
              
            case 'reroute_suggestion':
              onRerouteAlert?.(data);
              // Update monitoring query with reroute suggestion
              queryClient.setQueryData(["/api/routes", routeId, "monitor"], {
                shouldReroute: true,
                timeSavingsAvailable: data.timeSavings,
                bestAlternative: data.alternative,
                reason: data.reason,
                confidence: data.confidence,
              });
              break;
              
            case 'incident_alert':
              // Refresh incident data
              queryClient.invalidateQueries({ queryKey: ["/api/traffic-incidents"] });
              break;
          }
        } catch (error) {
          console.error('Error parsing SSE traffic update:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Traffic SSE connection error:', error);
        eventSource.close();
      };

      // Return cleanup function
      return () => {
        eventSource.close();
      };
    },
    enabled: !!routeId,
    staleTime: Infinity, // SSE connection should persist
    gcTime: 0, // Don't cache the connection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false, // Don't retry SSE connections automatically
  });
}

// Hook for traffic analytics and history
export function useTrafficAnalytics(journeyId: number | null) {
  return useQuery({
    queryKey: ["/api/journeys", journeyId, "traffic-analytics"],
    enabled: !!journeyId,
    staleTime: 5 * 60 * 1000, // Analytics don't change frequently
    retry: 1,
  });
}

// Hook for bulk traffic data (used by map components)
export function useBulkTrafficData(
  routes: string[],
  bounds?: { north: number; south: number; east: number; west: number }
) {
  return useQuery({
    queryKey: ["/api/traffic", "bulk", routes.sort(), bounds],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/traffic/bulk", {
        routeIds: routes,
        bounds,
        includeAlternatives: false,
        includeIncidents: true,
      });
      return response.json();
    },
    enabled: routes.length > 0,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

// Custom hook for traffic state management
export function useTrafficState(routeId: string | null, vehicleProfile: VehicleProfile | null) {
  const conditions = useCurrentTrafficConditions(routeId);
  const monitoring = useRouteMonitoring(routeId, vehicleProfile, true);
  const alternatives = useAlternativeRoutes(
    routeId,
    vehicleProfile,
    monitoring.data?.shouldReroute || false
  );

  return {
    trafficConditions: conditions.data || [],
    isLoadingConditions: conditions.isLoading,
    shouldReroute: monitoring.data?.shouldReroute || false,
    timeSavingsAvailable: monitoring.data?.timeSavingsAvailable,
    bestAlternative: monitoring.data?.bestAlternative,
    rerouteReason: monitoring.data?.reason,
    alternatives: alternatives.data || [],
    isLoadingAlternatives: alternatives.isLoading,
    isMonitoring: monitoring.isFetching,
    error: conditions.error || monitoring.error || alternatives.error,
  };
}