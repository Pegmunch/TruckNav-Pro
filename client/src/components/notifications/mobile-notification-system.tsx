import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { type Route, type TrafficIncident, type VehicleProfile } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, Volume2, VolumeX, AlertTriangle, Info, Navigation, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';
import { navigationVoice } from '@/lib/navigation-voice';

// Notification Classification System
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationCategory = 'traffic' | 'route' | 'safety' | 'facility' | 'eta' | 'system';

export interface MobileNotificationData {
  id: string;
  type: 'traffic_update' | 'route_change' | 'incident_alert' | 'eta_update' | 'facility_alert' | 'safety_alert';
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  description: string;
  icon?: string;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'outline' | 'destructive';
  }>;
  soundEnabled?: boolean;
  voiceAnnouncement?: string;
}

export interface DoNotDisturbState {
  enabled: boolean;
  allowCritical: boolean;
  allowSafety: boolean;
  autoEnableOnNavigation: boolean;
  quietHours?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

interface MobileNotificationSystemProps {
  currentRoute: Route | null;
  selectedProfile: VehicleProfile | null;
  isNavigating: boolean;
  enabled: boolean;
}

interface NotificationQueueItem extends MobileNotificationData {
  shown: boolean;
  dismissed: boolean;
  createdAt: number;
}

export function useMobileNotificationSystem({
  currentRoute,
  selectedProfile,
  isNavigating,
  enabled = true
}: MobileNotificationSystemProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  
  // Notification queue and state
  const [notificationQueue, setNotificationQueue] = useState<NotificationQueueItem[]>([]);
  const [activeNotifications, setActiveNotifications] = useState<NotificationQueueItem[]>([]);
  const maxVisibleNotifications = isMobile ? 2 : 3;
  
  // Do Not Disturb state management
  const [dndState, setDndState] = useState<DoNotDisturbState>(() => {
    const stored = localStorage.getItem('mobile-notification-dnd');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to parse DND state:', error);
        }
      }
    }
    return {
      enabled: false,
      allowCritical: true,
      allowSafety: true,
      autoEnableOnNavigation: true,
    };
  });

  // Voice settings
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const stored = localStorage.getItem('mobile-notification-voice');
    return stored ? JSON.parse(stored) : false;
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationRef = useRef<number>(0);
  const ttsQueueRef = useRef<MobileNotificationData[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastTTSRef = useRef<number>(0);

  // Persist DND state to localStorage
  useEffect(() => {
    localStorage.setItem('mobile-notification-dnd', JSON.stringify(dndState));
  }, [dndState]);

  // Persist voice settings to localStorage
  useEffect(() => {
    localStorage.setItem('mobile-notification-voice', JSON.stringify(voiceEnabled));
  }, [voiceEnabled]);

  // Auto-enable DND when navigation starts
  useEffect(() => {
    if (dndState.autoEnableOnNavigation && isNavigating && !dndState.enabled) {
      setDndState(prev => ({ ...prev, enabled: true }));
    }
  }, [isNavigating, dndState.autoEnableOnNavigation, dndState.enabled]);

  // Get current traffic incidents for monitoring
  const { data: currentIncidents = [] } = useQuery<TrafficIncident[]>({
    queryKey: ["/api/traffic-incidents?north=54&south=50&east=2&west=-6"],
    enabled: enabled && !!currentRoute,
    refetchInterval: 30000,
  });

  // Notification classification helper
  const classifyNotification = (type: MobileNotificationData['type']): {
    category: NotificationCategory;
    priority: NotificationPriority;
  } => {
    switch (type) {
      case 'incident_alert':
        return { category: 'safety', priority: 'high' };
      case 'safety_alert':
        return { category: 'safety', priority: 'critical' };
      case 'route_change':
        return { category: 'route', priority: 'medium' };
      case 'traffic_update':
        return { category: 'traffic', priority: 'medium' };
      case 'eta_update':
        return { category: 'eta', priority: 'low' };
      case 'facility_alert':
        return { category: 'facility', priority: 'low' };
      default:
        return { category: 'system', priority: 'low' };
    }
  };

  // Check if notification should be shown based on DND settings
  const shouldShowNotification = useCallback((notification: MobileNotificationData): boolean => {
    if (!dndState.enabled) return true;

    // Always show critical notifications if allowed
    if (notification.priority === 'critical' && dndState.allowCritical) return true;
    
    // Always show safety notifications if allowed
    if (notification.category === 'safety' && dndState.allowSafety) return true;
    
    // Block all other notifications in DND mode
    return false;
  }, [dndState]);

  // Generate notification icon based on type
  const getNotificationIcon = (type: MobileNotificationData['type']) => {
    switch (type) {
      case 'traffic_update': return <Clock className="w-4 h-4" />;
      case 'incident_alert': return <AlertTriangle className="w-4 h-4" />;
      case 'route_change': return <Navigation className="w-4 h-4" />;
      case 'eta_update': return <Clock className="w-4 h-4" />;
      case 'facility_alert': return <MapPin className="w-4 h-4" />;
      case 'safety_alert': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  // Generate live notification data
  const generateLiveNotification = useCallback((): MobileNotificationData | null => {
    if (!currentRoute || !enabled) return null;

    const now = Date.now();
    const notifications: Omit<MobileNotificationData, 'category' | 'priority'>[] = [
      {
        id: `traffic-${now}`,
        type: 'traffic_update',
        title: 'Traffic Update',
        description: 'Moderate delays ahead - Alternative route available',
        timestamp: now,
        ttl: 10000,
        soundEnabled: true,
      },
      {
        id: `incident-${now}`,
        type: 'incident_alert',
        title: 'Road Incident',
        description: 'Accident reported 2 miles ahead - Route adjusting',
        timestamp: now,
        ttl: 15000,
        soundEnabled: true,
        voiceAnnouncement: 'Incident ahead, route is adjusting automatically',
      },
      {
        id: `eta-${now}`,
        type: 'eta_update',
        title: 'ETA Updated',
        description: 'Arrival time: 3 minutes saved via optimization',
        timestamp: now,
        ttl: 8000,
        soundEnabled: false,
      },
      {
        id: `facility-${now}`,
        type: 'facility_alert',
        title: 'Truck Stop Ahead',
        description: 'Fuel available 2 miles ahead on right',
        timestamp: now,
        ttl: 12000,
        soundEnabled: false,
      },
      {
        id: `route-${now}`,
        type: 'route_change',
        title: 'Faster Route Found',
        description: 'Save 8 minutes with current traffic conditions',
        timestamp: now,
        ttl: 10000,
        soundEnabled: true,
        actions: [
          {
            label: 'Accept',
            action: () => {
              if (import.meta.env.DEV) {
                console.log('Route accepted');
              }
            },
            variant: 'default' as const,
          },
          {
            label: 'Ignore',
            action: () => {
              if (import.meta.env.DEV) {
                console.log('Route ignored');
              }
            },
            variant: 'outline' as const,
          },
        ],
      },
    ];

    const baseNotification = notifications[Math.floor(Math.random() * notifications.length)];
    const classification = classifyNotification(baseNotification.type);

    return {
      ...baseNotification,
      ...classification,
    };
  }, [currentRoute, enabled]);

  // Add notification to queue with enhanced logging
  const queueNotification = useCallback((notification: MobileNotificationData) => {
    if (import.meta.env.DEV) {
      console.log(`[MobileNotifications] Processing notification: ${notification.title} (${notification.priority})`);
    }
    
    if (!shouldShowNotification(notification)) {
      if (import.meta.env.DEV) {
        console.log(`[MobileNotifications] ❌ Blocked by DND: ${notification.title} - DND enabled: ${dndState.enabled}, Priority: ${notification.priority}, Category: ${notification.category}`);
      }
      return;
    }

    const queueItem: NotificationQueueItem = {
      ...notification,
      shown: false,
      dismissed: false,
      createdAt: Date.now(),
    };

    if (import.meta.env.DEV) {
      console.log(`[MobileNotifications] ✅ Queueing notification: ${notification.title}`);
    }
    
    setNotificationQueue(prev => {
      // Remove expired notifications
      const now = Date.now();
      const expiredCount = prev.filter(item => item.ttl && (now - item.createdAt) > item.ttl).length;
      const filtered = prev.filter(item => {
        if (item.ttl && (now - item.createdAt) > item.ttl) {
          return false;
        }
        return !item.dismissed;
      });

      if (expiredCount > 0 && import.meta.env.DEV) {
        console.log(`[MobileNotifications] 🧹 Cleaned ${expiredCount} expired notifications`);
      }

      const newQueue = [...filtered, queueItem].slice(-10); // Keep max 10 in queue
      if (import.meta.env.DEV) {
        console.log(`[MobileNotifications] 📊 Queue status: ${newQueue.length} items (${newQueue.filter(n => !n.shown).length} pending)`);
      }
      
      return newQueue;
    });
  }, [shouldShowNotification, dndState.enabled]);

  // Process notification queue to show notifications with enhanced logging
  useEffect(() => {
    const processQueue = () => {
      setNotificationQueue(prev => {
        setActiveNotifications(current => {
          const now = Date.now();
          
          // Remove expired active notifications
          const expiredActive = current.filter(item => item.ttl && (now - item.createdAt) > item.ttl);
          const validActive = current.filter(item => {
            if (item.ttl && (now - item.createdAt) > item.ttl) {
              return false;
            }
            return !item.dismissed;
          });

          if (expiredActive.length > 0 && import.meta.env.DEV) {
            console.log(`[MobileNotifications] ⏰ Expired ${expiredActive.length} active notifications`);
          }

          // Find next notifications to show
          const canShow = maxVisibleNotifications - validActive.length;
          const toShow = prev
            .filter(item => !item.shown && !item.dismissed)
            .slice(0, canShow);

          if (toShow.length > 0 && import.meta.env.DEV) {
            console.log(`[MobileNotifications] 🔔 Showing ${toShow.length} new notifications (${canShow} slots available)`);
          }

          // Mark as shown and announce if needed
          toShow.forEach(item => {
            item.shown = true;
            if (import.meta.env.DEV) {
              console.log(`[MobileNotifications] 👁️  Now showing: ${item.title}`);
            }
            
            // Announce high-priority notifications
            if (item.voiceAnnouncement && (item.priority === 'critical' || item.priority === 'high')) {
              if (import.meta.env.DEV) {
                console.log(`[MobileNotifications] 🔊 Attempting TTS for: ${item.title}`);
              }
              announceNotification(item);
            } else if (item.voiceAnnouncement && import.meta.env.DEV) {
              console.log(`[MobileNotifications] 🔇 TTS skipped (priority too low): ${item.title} (${item.priority})`);
            }
          });

          const newActive = [...validActive, ...toShow];
          if (newActive.length !== current.length && import.meta.env.DEV) {
            console.log(`[MobileNotifications] 📱 Active notifications: ${newActive.length}/${maxVisibleNotifications}`);
          }

          return newActive;
        });

        return prev;
      });
    };

    const interval = setInterval(processQueue, 3000); // Reduced frequency to prevent excessive re-renders
    return () => clearInterval(interval);
  }, [maxVisibleNotifications]); // announceNotification is stable and called by reference

  // Dismiss notification
  const dismissNotification = useCallback((id: string) => {
    setActiveNotifications(prev => 
      prev.map(item => 
        item.id === id ? { ...item, dismissed: true } : item
      )
    );
    setNotificationQueue(prev => 
      prev.map(item => 
        item.id === id ? { ...item, dismissed: true } : item
      )
    );
  }, []);

  // Enhanced TTS with rate limiting, cancellation and proper queue management
  const announceNotification = useCallback((notification: MobileNotificationData) => {
    if (!voiceEnabled || !notification.voiceAnnouncement) {
      if (import.meta.env.DEV) {
        console.log(`[MobileNotifications] TTS skipped - voice disabled or no announcement`);
      }
      return;
    }
    
    // Respect DND settings - only announce if notification should be shown
    if (!shouldShowNotification(notification)) {
      if (import.meta.env.DEV) {
        console.log(`[MobileNotifications] Voice blocked by DND: ${notification.title}`);
      }
      return;
    }

    // Only announce high-priority notifications (traffic/safety alerts)
    if (notification.priority !== 'critical' && notification.priority !== 'high') {
      if (import.meta.env.DEV) {
        console.log(`[MobileNotifications] TTS skipped - priority too low: ${notification.priority}`);
      }
      return;
    }

    // Rate limiting - don't speak more than once every 5 seconds
    const now = Date.now();
    if (now - lastTTSRef.current < 5000) {
      if (import.meta.env.DEV) {
        console.log(`[MobileNotifications] TTS rate limited - last speech ${now - lastTTSRef.current}ms ago`);
      }
      return;
    }
    
    // Use unified NavigationVoice system for all announcements
    // This ensures single voice, proper filtering, and no conflicts
    try {
      lastTTSRef.current = now;
      
      // Route through unified voice system as traffic emergency (always speaks)
      // This bypasses motorway-only filtering for critical safety notifications
      if (notification.category === 'traffic' || notification.category === 'safety') {
        navigationVoice.announceIncident(
          notification.voiceAnnouncement || notification.title
        );
      } else {
        // For other notifications, use general speak which respects motorway-only mode
        navigationVoice.speak(
          notification.voiceAnnouncement || notification.title,
          notification.priority === 'critical' ? 'emergency' : 'urgent',
          false,
          'general'
        );
      }
      
      if (import.meta.env.DEV) {
        console.log(`[MobileNotifications] Routed to unified voice: "${notification.voiceAnnouncement}"`);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`[MobileNotifications] Unified voice failed for "${notification.title}":`, error);
      }
    }
  }, [voiceEnabled, shouldShowNotification]);

  // Process next TTS in queue - now handled by NavigationVoice
  const processNextTTS = useCallback(() => {
    // NavigationVoice handles its own queue - no action needed here
  }, []);

  useEffect(() => {
    if (!voiceEnabled) {
      if (import.meta.env.DEV) {
        console.log('[MobileNotifications] Notification voice disabled - navigation voice unaffected');
      }
    }
  }, [voiceEnabled]);

  // Cancel TTS when component unmounts
  useEffect(() => {
    return () => {
      if (currentUtteranceRef.current) {
        try {
          speechSynthesis.cancel();
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[MobileNotifications] Failed to cancel TTS on unmount:', error);
          }
        }
      }
    };
  }, []);

  // Manual trigger for testing
  const triggerNotification = useCallback((type?: MobileNotificationData['type']) => {
    const notification = generateLiveNotification();
    if (notification) {
      if (type) notification.type = type;
      queueNotification(notification);
      if (notification.voiceAnnouncement) {
        announceNotification(notification);
      }
    }
  }, [generateLiveNotification, queueNotification, announceNotification]);

  // Start live notification system - disabled to prevent conflicts with useLiveNotifications
  const startNotifications = useCallback(() => {
    // Automatic generation disabled to prevent conflicts - useLiveNotifications handles this
    if (import.meta.env.DEV) {
      console.log('[MobileNotifications] System ready (manual triggers only)');
    }
  }, []);

  // Stop notifications
  const stopNotifications = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (import.meta.env.DEV) {
        console.log('[MobileNotifications] Stopped notification system');
      }
    }
  }, []);

  // Effect to manage notification lifecycle
  useEffect(() => {
    if (enabled && (isNavigating || currentRoute)) {
      startNotifications();
    } else {
      stopNotifications();
    }

    return () => stopNotifications();
  }, [enabled, isNavigating, currentRoute, startNotifications, stopNotifications]);

  // Handle critical incidents
  useEffect(() => {
    if (currentIncidents.length > 0 && enabled && currentRoute) {
      const criticalIncidents = currentIncidents.filter(
        incident => incident.severity === 'critical' || incident.severity === 'high'
      );
      
      if (criticalIncidents.length > 0) {
        const incident = criticalIncidents[0];
        const notification: MobileNotificationData = {
          id: `critical-incident-${Date.now()}`,
          type: 'safety_alert',
          category: 'safety',
          priority: 'critical',
          title: 'Critical Alert',
          description: `${incident.title} - ${incident.type.replace('_', ' ')}`,
          timestamp: Date.now(),
          ttl: 20000,
          soundEnabled: true,
          voiceAnnouncement: `Critical alert: ${incident.title}`,
        };
        queueNotification(notification);
        announceNotification(notification);
      }
    }
  }, [currentIncidents, enabled, currentRoute, queueNotification, announceNotification]);

  return {
    // Notification queue management
    activeNotifications,
    queueNotification,
    dismissNotification,
    triggerNotification,
    
    // DND management
    dndState,
    setDndState,
    updateDndState: (updates: Partial<DoNotDisturbState>) => 
      setDndState(prev => ({ ...prev, ...updates })),
    
    // Voice management  
    voiceEnabled,
    setVoiceEnabled,
    announceNotification,
    
    // System status
    isActive: !!intervalRef.current,
    queueLength: notificationQueue.filter(n => !n.dismissed).length,
    
    // Utilities
    getNotificationIcon,
    shouldShowNotification,
    classifyNotification,
  };
}