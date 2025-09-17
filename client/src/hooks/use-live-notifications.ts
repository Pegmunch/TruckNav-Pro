import { useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { type Route, type TrafficIncident, type VehicleProfile } from "@shared/schema";

interface LiveNotificationOptions {
  currentRoute: Route | null;
  selectedProfile: VehicleProfile | null;
  isNavigating: boolean;
  enabled: boolean;
}

interface NotificationData {
  id: string;
  type: 'traffic_update' | 'route_change' | 'incident_alert' | 'eta_update' | 'facility_alert';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
}

export function useLiveNotifications({
  currentRoute,
  selectedProfile,
  isNavigating,
  enabled = true
}: LiveNotificationOptions) {
  const { toast } = useToast();
  const lastNotificationRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current traffic incidents for comparison
  const { data: currentIncidents = [] } = useQuery<TrafficIncident[]>({
    queryKey: ["/api/traffic-incidents?north=54&south=50&east=2&west=-6"],
    enabled: enabled && !!currentRoute,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Mock live data generator - in real app this would come from WebSocket/SSE
  const generateLiveNotification = useCallback((): NotificationData | null => {
    if (!currentRoute || !enabled) return null;

    const now = Date.now();
    const notificationTypes: NotificationData[] = [
      {
        id: `traffic-${now}`,
        type: 'traffic_update',
        title: 'Traffic Update',
        description: 'Moderate delays detected ahead - Alternative route available',
        severity: 'warning',
        timestamp: now,
      },
      {
        id: `incident-${now}`,
        type: 'incident_alert',
        title: 'New Incident Alert',
        description: 'Road works reported on A1 - Route adjusted automatically',
        severity: 'info',
        timestamp: now,
      },
      {
        id: `eta-${now}`,
        type: 'eta_update',
        title: 'ETA Update',
        description: 'Arrival time updated: 3 minutes saved via optimized routing',
        severity: 'info',
        timestamp: now,
      },
      {
        id: `facility-${now}`,
        type: 'facility_alert',
        title: 'Upcoming Facility',
        description: 'Truck stop with diesel 2 miles ahead on the right',
        severity: 'info',
        timestamp: now,
      },
      {
        id: `route-${now}`,
        type: 'route_change',
        title: 'Route Optimization',
        description: 'Faster route found - Save 8 minutes with current traffic',
        severity: 'warning',
        timestamp: now,
      },
    ];

    // Return a random notification (simulate real-time updates)
    return notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
  }, [currentRoute, enabled]);

  // Show live notification with 5-second auto-dismiss
  const showLiveNotification = useCallback((notification: NotificationData) => {
    const getIcon = () => {
      switch (notification.type) {
        case 'traffic_update': return '⏰';
        case 'incident_alert': return '⚠️';
        case 'route_change': return '🧭';
        case 'eta_update': return '⚡';
        case 'facility_alert': return '🔔';
        default: return '🔔';
      }
    };

    const getVariant = () => {
      switch (notification.severity) {
        case 'critical': return 'destructive' as const;
        case 'warning': return 'default' as const;
        case 'info': return 'default' as const;
        default: return 'default' as const;
      }
    };

    // Create toast with 5-second auto-dismiss
    const toastInstance = toast({
      title: `${getIcon()} ${notification.title}`,
      description: notification.description,
      variant: getVariant(),
      duration: 5000, // 5 seconds
    });

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      toastInstance.dismiss();
    }, 5000);

    console.log(`[LiveNotifications] Shown: ${notification.title} - ${notification.description}`);
  }, [toast]);

  // Start live notification interval
  const startLiveNotifications = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      if (enabled && (isNavigating || currentRoute)) {
        const notification = generateLiveNotification();
        if (notification) {
          // Throttle notifications - don't show more than one every 10 seconds
          const now = Date.now();
          if (now - lastNotificationRef.current >= 10000) {
            showLiveNotification(notification);
            lastNotificationRef.current = now;
          }
        }
      }
    }, 15000); // Check every 15 seconds, but throttled to max one notification per 10 seconds

    console.log('[LiveNotifications] Started live notification system');
  }, [enabled, isNavigating, currentRoute, generateLiveNotification, showLiveNotification]);

  // Stop live notification interval
  const stopLiveNotifications = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('[LiveNotifications] Stopped live notification system');
    }
  }, []);

  // Manual trigger for immediate notification (for testing/demo)
  const triggerLiveNotification = useCallback((type?: NotificationData['type']) => {
    const notification = generateLiveNotification();
    if (notification) {
      if (type) notification.type = type;
      showLiveNotification(notification);
    }
  }, [generateLiveNotification, showLiveNotification]);

  // Effect to manage notification lifecycle
  useEffect(() => {
    if (enabled && (isNavigating || currentRoute)) {
      startLiveNotifications();
    } else {
      stopLiveNotifications();
    }

    // Cleanup on unmount
    return () => {
      stopLiveNotifications();
    };
  }, [enabled, isNavigating, currentRoute, startLiveNotifications, stopLiveNotifications]);

  // Effect to handle new incidents
  useEffect(() => {
    if (currentIncidents.length > 0 && enabled && currentRoute) {
      // Check for high-severity incidents and notify immediately
      const criticalIncidents = currentIncidents.filter(
        incident => incident.severity === 'critical' || incident.severity === 'high'
      );
      
      if (criticalIncidents.length > 0) {
        const incident = criticalIncidents[0];
        showLiveNotification({
          id: `critical-incident-${Date.now()}`,
          type: 'incident_alert',
          title: 'Critical Incident Alert',
          description: `${incident.title} - ${incident.type.replace('_', ' ')}`,
          severity: 'critical',
          timestamp: Date.now(),
        });
      }
    }
  }, [currentIncidents, enabled, currentRoute, showLiveNotification]);

  return {
    startLiveNotifications,
    stopLiveNotifications,
    triggerLiveNotification,
    isActive: !!intervalRef.current,
  };
}