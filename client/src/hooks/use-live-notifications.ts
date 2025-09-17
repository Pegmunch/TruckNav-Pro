import { useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { type Route, type TrafficIncident, type VehicleProfile } from "@shared/schema";
import { useMobileNotificationSystem, type MobileNotificationData } from "@/components/notifications/mobile-notification-system";

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
  const isMobile = useIsMobile();
  const lastNotificationRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use mobile notification system for enhanced features
  const mobileNotificationSystem = useMobileNotificationSystem({
    currentRoute,
    selectedProfile,
    isNavigating,
    enabled,
  });

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

  // Show live notification - uses mobile system on mobile, fallback to toast on desktop
  const showLiveNotification = useCallback((notification: NotificationData) => {
    // Convert legacy NotificationData to MobileNotificationData format
    const convertToMobileNotification = (oldNotification: NotificationData): MobileNotificationData => {
      const { category, priority } = mobileNotificationSystem.classifyNotification(oldNotification.type);
      
      // Convert severity to priority if needed
      let convertedPriority = priority;
      if (oldNotification.severity === 'critical') convertedPriority = 'critical';
      else if (oldNotification.severity === 'warning') convertedPriority = 'high';
      else if (oldNotification.severity === 'info') convertedPriority = 'medium';

      return {
        id: oldNotification.id,
        type: oldNotification.type,
        category,
        priority: convertedPriority,
        title: oldNotification.title,
        description: oldNotification.description,
        timestamp: oldNotification.timestamp,
        ttl: 8000, // 8 seconds for live notifications
        soundEnabled: true,
        voiceAnnouncement: convertedPriority === 'critical' || convertedPriority === 'high' 
          ? `${oldNotification.title}. ${oldNotification.description}` 
          : undefined,
      };
    };

    // Use mobile notification system on mobile devices
    if (isMobile && mobileNotificationSystem) {
      const mobileNotification = convertToMobileNotification(notification);
      mobileNotificationSystem.queueNotification(mobileNotification);
      console.log(`[LiveNotifications] Queued mobile notification: ${notification.title}`);
      return;
    }

    // Fallback to toast system for desktop
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

    // Create toast with 5-second auto-dismiss (desktop only)
    const toastInstance = toast({
      title: `${getIcon()} ${notification.title}`,
      description: notification.description,
      variant: getVariant(),
      duration: 5000,
    });

    setTimeout(() => {
      toastInstance.dismiss();
    }, 5000);

    console.log(`[LiveNotifications] Shown desktop toast: ${notification.title} - ${notification.description}`);
  }, [toast, isMobile, mobileNotificationSystem]);

  // Start live notification interval
  const startLiveNotifications = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      if (enabled && (isNavigating || currentRoute)) {
        const notification = generateLiveNotification();
        if (notification) {
          // Throttle notifications - don't show more than one every 15 seconds
          const now = Date.now();
          if (now - lastNotificationRef.current >= 15000) {
            showLiveNotification(notification);
            lastNotificationRef.current = now;
          }
        }
      }
    }, 20000); // Check every 20 seconds, but throttled to max one notification per 15 seconds

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
    // Legacy API compatibility
    startLiveNotifications,
    stopLiveNotifications,
    triggerLiveNotification,
    isActive: !!intervalRef.current,
    
    // Mobile notification system integration
    mobileNotificationSystem,
    
    // Direct access to mobile features
    activeNotifications: mobileNotificationSystem.activeNotifications,
    dismissNotification: mobileNotificationSystem.dismissNotification,
    dndState: mobileNotificationSystem.dndState,
    updateDndState: mobileNotificationSystem.updateDndState,
    voiceEnabled: mobileNotificationSystem.voiceEnabled,
    setVoiceEnabled: mobileNotificationSystem.setVoiceEnabled,
    queueLength: mobileNotificationSystem.queueLength,
    getNotificationIcon: mobileNotificationSystem.getNotificationIcon,
  };
}