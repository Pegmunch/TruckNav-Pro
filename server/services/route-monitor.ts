import { EventEmitter } from "events";
import { trafficService } from "./traffic-service";
import { type Route, type VehicleProfile, type Journey, type RouteMonitoring, type AlternativeRoute, type ReRoutingEvent, type TrafficCondition } from "@shared/schema";
import { randomUUID } from "crypto";

// Events emitted by the route monitor
export interface RouteMonitorEvents {
  'reroute-suggestion': (data: ReRouteSuggestionEvent) => void;
  'traffic-alert': (data: TrafficAlertEvent) => void;
  'route-completed': (data: RouteCompletionEvent) => void;
  'monitoring-error': (data: ErrorEvent) => void;
}

// Event data structures
export interface ReRouteSuggestionEvent {
  monitoringId: string;
  journeyId: number;
  originalRoute: Route;
  suggestedRoute: AlternativeRoute;
  timeSavings: number;
  confidence: number;
  reason: string;
  expiresAt: Date;
}

export interface TrafficAlertEvent {
  monitoringId: string;
  journeyId?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedRoutes: string[];
  trafficConditions: TrafficCondition[];
  recommendedAction: 'continue' | 'slow_down' | 'consider_alternative' | 'reroute_immediately';
}

export interface RouteCompletionEvent {
  monitoringId: string;
  journeyId: number;
  route: Route;
  actualDuration: number;
  predictedDuration: number;
  accuracy: number;
  rerouteCount: number;
}

interface ErrorEvent {
  monitoringId: string;
  error: string;
  timestamp: Date;
}

// Active monitoring session
interface MonitoringSession {
  id: string;
  route: Route;
  vehicleProfile: VehicleProfile;
  journey?: Journey;
  startTime: Date;
  lastCheck: Date;
  checkInterval: number; // milliseconds
  alertThreshold: number; // minutes
  isActive: boolean;
  userPreferences: {
    autoApply: boolean;
    notifyOnly: boolean;
    minTimeSavings: number;
    avoidTolls: boolean;
    preferHighways: boolean;
  };
  timer?: NodeJS.Timeout;
  rerouteCount: number;
  trafficHistory: Array<{
    timestamp: Date;
    conditions: TrafficCondition[];
    averageDelay: number;
  }>;
}

// Route monitoring service class
export class RouteMonitorService extends EventEmitter {
  private activeSessions: Map<string, MonitoringSession> = new Map();
  private globalTimer?: NodeJS.Timeout;
  private readonly GLOBAL_CHECK_INTERVAL = 60000; // 1 minute global check
  private readonly MAX_SESSIONS = 50; // Prevent memory leaks

  constructor() {
    super();
    this.startGlobalMonitoring();
  }

  /**
   * Start monitoring a route for traffic changes
   */
  async startMonitoring(
    route: Route,
    vehicleProfile: VehicleProfile,
    journey?: Journey,
    options?: {
      checkInterval?: number;
      alertThreshold?: number;
      autoApply?: boolean;
      notifyOnly?: boolean;
      minTimeSavings?: number;
    }
  ): Promise<string> {
    if (this.activeSessions.size >= this.MAX_SESSIONS) {
      throw new Error('Maximum monitoring sessions reached. Please stop some sessions first.');
    }

    const monitoringId = randomUUID();
    const checkInterval = options?.checkInterval || 300000; // 5 minutes default
    const alertThreshold = options?.alertThreshold || 5; // 5 minutes default

    const session: MonitoringSession = {
      id: monitoringId,
      route,
      vehicleProfile,
      journey,
      startTime: new Date(),
      lastCheck: new Date(),
      checkInterval,
      alertThreshold,
      isActive: true,
      userPreferences: {
        autoApply: options?.autoApply || false,
        notifyOnly: options?.notifyOnly || true,
        minTimeSavings: options?.minTimeSavings || 5,
        avoidTolls: false,
        preferHighways: true,
      },
      rerouteCount: 0,
      trafficHistory: [],
    };

    this.activeSessions.set(monitoringId, session);

    // Start individual session monitoring
    this.scheduleSessionCheck(session);

    // Perform initial check
    await this.checkSessionTraffic(session);

    console.log(`Started route monitoring for session ${monitoringId}`);
    return monitoringId;
  }

  /**
   * Stop monitoring a specific route
   */
  stopMonitoring(monitoringId: string): boolean {
    const session = this.activeSessions.get(monitoringId);
    if (!session) return false;

    session.isActive = false;
    if (session.timer) {
      clearTimeout(session.timer);
    }

    this.activeSessions.delete(monitoringId);
    console.log(`Stopped route monitoring for session ${monitoringId}`);
    return true;
  }

  /**
   * Update monitoring preferences for a session
   */
  updatePreferences(
    monitoringId: string,
    preferences: Partial<MonitoringSession['userPreferences']>
  ): boolean {
    const session = this.activeSessions.get(monitoringId);
    if (!session) return false;

    session.userPreferences = { ...session.userPreferences, ...preferences };
    return true;
  }

  /**
   * Get current status of all monitoring sessions
   */
  getMonitoringStatus(): Array<{
    id: string;
    routeId: string;
    journeyId?: number;
    isActive: boolean;
    startTime: Date;
    lastCheck: Date;
    rerouteCount: number;
    trafficStatus: 'good' | 'moderate' | 'heavy' | 'critical';
  }> {
    return Array.from(this.activeSessions.values()).map(session => {
      const latestTraffic = session.trafficHistory[session.trafficHistory.length - 1];
      let trafficStatus: 'good' | 'moderate' | 'heavy' | 'critical' = 'good';

      if (latestTraffic) {
        const avgDelay = latestTraffic.averageDelay;
        if (avgDelay > 15) trafficStatus = 'critical';
        else if (avgDelay > 8) trafficStatus = 'heavy';
        else if (avgDelay > 3) trafficStatus = 'moderate';
      }

      return {
        id: session.id,
        routeId: session.route.id,
        journeyId: session.journey?.id,
        isActive: session.isActive,
        startTime: session.startTime,
        lastCheck: session.lastCheck,
        rerouteCount: session.rerouteCount,
        trafficStatus,
      };
    });
  }

  /**
   * Manually trigger a re-route check for a session
   */
  async triggerReRouteCheck(monitoringId: string): Promise<boolean> {
    const session = this.activeSessions.get(monitoringId);
    if (!session || !session.isActive) return false;

    await this.checkSessionTraffic(session);
    return true;
  }

  /**
   * Accept a suggested re-route
   */
  async acceptReRoute(
    monitoringId: string,
    alternativeRouteId: string
  ): Promise<{
    success: boolean;
    newRoute?: Route;
    error?: string;
  }> {
    const session = this.activeSessions.get(monitoringId);
    if (!session) {
      return { success: false, error: 'Monitoring session not found' };
    }

    try {
      // In a real implementation, this would:
      // 1. Update the journey with the new route
      // 2. Recalculate the route path
      // 3. Update navigation systems
      
      session.rerouteCount++;
      session.lastCheck = new Date();

      // Create re-routing event for logging
      const event: Partial<ReRoutingEvent> = {
        originalRouteId: session.route.id,
        alternativeRouteId,
        journeyId: session.journey?.id,
        triggerReason: 'user_requested',
        appliedAt: new Date(),
      };

      console.log(`Re-route accepted for session ${monitoringId}`);
      return { success: true };
    } catch (error) {
      console.error('Error accepting re-route:', error);
      return { success: false, error: 'Failed to apply re-route' };
    }
  }

  /**
   * Decline a suggested re-route
   */
  declineReRoute(monitoringId: string, alternativeRouteId: string): boolean {
    const session = this.activeSessions.get(monitoringId);
    if (!session) return false;

    // Log the declined re-route for analytics
    console.log(`Re-route declined for session ${monitoringId}`);
    return true;
  }

  /**
   * Cleanup inactive sessions and stop global monitoring
   */
  shutdown(): void {
    // Stop all active sessions
    for (const [id, session] of this.activeSessions.entries()) {
      this.stopMonitoring(id);
    }

    // Stop global monitoring
    if (this.globalTimer) {
      clearInterval(this.globalTimer);
      this.globalTimer = undefined;
    }

    console.log('Route monitoring service shut down');
  }

  // Private methods

  private startGlobalMonitoring(): void {
    this.globalTimer = setInterval(() => {
      this.performGlobalHealthCheck();
    }, this.GLOBAL_CHECK_INTERVAL);

    console.log('Started global route monitoring');
  }

  private async performGlobalHealthCheck(): Promise<void> {
    try {
      const activeSessions = Array.from(this.activeSessions.values()).filter(s => s.isActive);
      
      // Check for stale sessions (no check in last 30 minutes)
      const staleThreshold = 30 * 60 * 1000; // 30 minutes
      const now = Date.now();

      for (const session of activeSessions) {
        if (now - session.lastCheck.getTime() > staleThreshold) {
          console.warn(`Session ${session.id} appears stale, stopping monitoring`);
          this.stopMonitoring(session.id);
        }
      }

      // Emit system health event
      if (activeSessions.length > 0) {
        console.log(`Route monitor health check: ${activeSessions.length} active sessions`);
      }
    } catch (error) {
      console.error('Global health check error:', error);
    }
  }

  private scheduleSessionCheck(session: MonitoringSession): void {
    if (!session.isActive) return;

    session.timer = setTimeout(async () => {
      if (session.isActive) {
        await this.checkSessionTraffic(session);
        this.scheduleSessionCheck(session); // Reschedule
      }
    }, session.checkInterval);
  }

  private async checkSessionTraffic(session: MonitoringSession): Promise<void> {
    if (!session.isActive) return;

    try {
      session.lastCheck = new Date();

      // Get current traffic conditions
      const routePath = session.route.routePath as Array<{ lat: number; lng: number }>;
      const currentConditions = await trafficService.getTrafficConditions(
        routePath,
        session.vehicleProfile
      );

      // Calculate average delay
      const averageDelay = currentConditions.reduce((sum, condition) => 
        sum + condition.delayMinutes, 0
      ) / currentConditions.length;

      // Store traffic history
      session.trafficHistory.push({
        timestamp: new Date(),
        conditions: currentConditions,
        averageDelay,
      });

      // Keep only last 24 hours of history
      const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
      session.trafficHistory = session.trafficHistory.filter(
        entry => entry.timestamp.getTime() > dayAgo
      );

      // Check for traffic alerts
      await this.checkForTrafficAlerts(session, currentConditions);

      // Check if re-routing is beneficial
      await this.checkForReRoutingOpportunity(session, currentConditions);

    } catch (error) {
      console.error(`Traffic check error for session ${session.id}:`, error);
      
      this.emit('monitoring-error', {
        monitoringId: session.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  private async checkForTrafficAlerts(
    session: MonitoringSession,
    conditions: TrafficCondition[]
  ): Promise<void> {
    // Check for critical traffic conditions
    const criticalConditions = conditions.filter(c => 
      c.flowLevel === 'standstill' || c.delayMinutes > 15
    );

    const heavyConditions = conditions.filter(c => 
      c.flowLevel === 'heavy' || (c.delayMinutes > 8 && c.delayMinutes <= 15)
    );

    if (criticalConditions.length > 0) {
      this.emit('traffic-alert', {
        monitoringId: session.id,
        journeyId: session.journey?.id,
        severity: 'critical',
        message: `Critical traffic detected: ${criticalConditions.length} severe bottlenecks`,
        affectedRoutes: [session.route.id],
        trafficConditions: criticalConditions,
        recommendedAction: 'reroute_immediately',
      });
    } else if (heavyConditions.length > 0) {
      this.emit('traffic-alert', {
        monitoringId: session.id,
        journeyId: session.journey?.id,
        severity: 'medium',
        message: `Heavy traffic ahead: ${heavyConditions.length} congestion points`,
        affectedRoutes: [session.route.id],
        trafficConditions: heavyConditions,
        recommendedAction: 'consider_alternative',
      });
    }
  }

  private async checkForReRoutingOpportunity(
    session: MonitoringSession,
    conditions: TrafficCondition[]
  ): Promise<void> {
    // Calculate if significant delays are present
    const totalDelay = conditions.reduce((sum, condition) => sum + condition.delayMinutes, 0);
    
    if (totalDelay < session.alertThreshold) {
      return; // No significant delays
    }

    try {
      // Check for alternative routes
      const monitorResult = await trafficService.monitorRouteConditions(
        session.route.id,
        session.route.routePath as Array<{ lat: number; lng: number }>,
        session.vehicleProfile,
        session.userPreferences.minTimeSavings
      );

      if (monitorResult.shouldReroute && monitorResult.bestAlternative) {
        const suggestion: ReRouteSuggestionEvent = {
          monitoringId: session.id,
          journeyId: session.journey?.id || 0,
          originalRoute: session.route,
          suggestedRoute: monitorResult.bestAlternative,
          timeSavings: monitorResult.timeSavingsAvailable || 0,
          confidence: monitorResult.bestAlternative.confidenceLevel,
          reason: monitorResult.reason || 'Traffic optimization',
          expiresAt: new Date(Date.now() + (15 * 60 * 1000)), // Expires in 15 minutes
        };

        // Auto-apply if user preferences allow and confidence is high
        if (session.userPreferences.autoApply && 
            suggestion.confidence > 0.8 && 
            suggestion.timeSavings >= session.userPreferences.minTimeSavings) {
          
          await this.acceptReRoute(session.id, suggestion.suggestedRoute.id);
          console.log(`Auto-applied re-route for session ${session.id}`);
        } else {
          // Emit suggestion for user decision
          this.emit('reroute-suggestion', suggestion);
        }
      }
    } catch (error) {
      console.error('Error checking for re-routing opportunity:', error);
    }
  }
}

// Create and export singleton instance
export const routeMonitorService = new RouteMonitorService();

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down route monitoring...');
  routeMonitorService.shutdown();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down route monitoring...');
  routeMonitorService.shutdown();
});