import { type TrafficCondition, type AlternativeRoute, type Route, type VehicleProfile, type TrafficIncident } from "@shared/schema";
import { randomUUID } from "crypto";

// Configuration for traffic API providers
interface TrafficAPIConfig {
  provider: 'tomtom' | 'here' | 'nextbillion' | 'mock';
  apiKey?: string;
  baseUrl?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

// Standardized traffic data structure across all providers
interface TrafficAPIResponse {
  success: boolean;
  data?: TrafficCondition[];
  error?: string;
  rateLimitRemaining?: number;
}

// Route calculation request with truck-specific parameters
interface RouteCalculationRequest {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  vehicleProfile: VehicleProfile;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  currentTime?: Date;
}

// Alternative route calculation response
interface AlternativeRouteResponse {
  alternatives: AlternativeRoute[];
  originalRouteConditions: TrafficCondition[];
  calculationTime: number;
  confidence: number;
}

// Traffic service class for handling all traffic-related operations
export class TrafficService {
  private config: TrafficAPIConfig;
  private requestCount: { minute: number; hour: number; timestamp: number };
  private cache: Map<string, { data: any; expires: number }>;

  constructor(config?: Partial<TrafficAPIConfig>) {
    this.config = {
      provider: 'mock',
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
      },
      ...config,
    };

    this.requestCount = { minute: 0, hour: 0, timestamp: Date.now() };
    this.cache = new Map();
  }

  /**
   * Get current traffic conditions for a route
   */
  async getTrafficConditions(
    routePath: Array<{ lat: number; lng: number }>,
    vehicleProfile?: VehicleProfile
  ): Promise<TrafficCondition[]> {
    const cacheKey = `traffic_${this.hashRoute(routePath)}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached as TrafficCondition[];
    }

    try {
      const conditions = await this.fetchTrafficFromAPI(routePath, vehicleProfile);
      this.setCache(cacheKey, conditions, 300); // Cache for 5 minutes
      return conditions;
    } catch (error) {
      console.error('Error fetching traffic conditions:', error);
      return this.getFallbackTrafficConditions(routePath);
    }
  }

  /**
   * Calculate alternative routes with traffic considerations
   */
  async calculateAlternativeRoutes(
    request: RouteCalculationRequest
  ): Promise<AlternativeRouteResponse> {
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const startTime = Date.now();
    
    try {
      // Get current conditions for original route
      const originalRoute = await this.calculateRoute(request);
      const originalConditions = await this.getTrafficConditions(
        originalRoute.routePath as Array<{ lat: number; lng: number }>,
        request.vehicleProfile
      );

      // Calculate alternative routes
      const alternatives = await this.findAlternativeRoutes(request, originalRoute);
      
      // Analyze traffic for each alternative
      const analyzedAlternatives = await Promise.all(
        alternatives.map(alt => this.analyzeAlternativeRoute(alt, originalRoute, request.vehicleProfile))
      );

      // Filter and rank alternatives by viability
      const viableAlternatives = analyzedAlternatives
        .filter(alt => alt.timeSavingsMinutes > 0 && alt.viabilityScore > 0.6)
        .sort((a, b) => b.timeSavingsMinutes - a.timeSavingsMinutes)
        .slice(0, 3); // Return top 3 alternatives

      return {
        alternatives: viableAlternatives,
        originalRouteConditions: originalConditions,
        calculationTime: Date.now() - startTime,
        confidence: this.calculateConfidence(viableAlternatives),
      };
    } catch (error) {
      console.error('Error calculating alternative routes:', error);
      throw new Error('Failed to calculate alternative routes');
    }
  }

  /**
   * Monitor route conditions and detect when re-routing is beneficial
   */
  async monitorRouteConditions(
    routeId: string,
    routePath: Array<{ lat: number; lng: number }>,
    vehicleProfile: VehicleProfile,
    alertThreshold: number = 5
  ): Promise<{
    shouldReroute: boolean;
    timeSavingsAvailable?: number;
    bestAlternative?: AlternativeRoute;
    reason?: string;
  }> {
    try {
      // Get current conditions
      const currentConditions = await this.getTrafficConditions(routePath, vehicleProfile);
      
      // Check for significant incidents or congestion
      const majorIncidents = currentConditions.filter(
        condition => condition.flowLevel === 'standstill' || condition.delayMinutes > 10
      );

      if (majorIncidents.length === 0) {
        return { shouldReroute: false };
      }

      // Calculate alternatives if major issues detected
      const request: RouteCalculationRequest = {
        start: routePath[0],
        end: routePath[routePath.length - 1],
        vehicleProfile,
        currentTime: new Date(),
      };

      const alternatives = await this.calculateAlternativeRoutes(request);
      
      if (alternatives.alternatives.length === 0) {
        return { shouldReroute: false };
      }

      const bestAlternative = alternatives.alternatives[0];
      
      if (bestAlternative.timeSavingsMinutes >= alertThreshold) {
        return {
          shouldReroute: true,
          timeSavingsAvailable: bestAlternative.timeSavingsMinutes,
          bestAlternative,
          reason: this.determineRerouteReason(currentConditions, bestAlternative),
        };
      }

      return { shouldReroute: false };
    } catch (error) {
      console.error('Error monitoring route conditions:', error);
      return { shouldReroute: false };
    }
  }

  /**
   * Get traffic incidents along a route
   */
  async getTrafficIncidents(
    routePath: Array<{ lat: number; lng: number }>,
    radiusKm: number = 5
  ): Promise<TrafficIncident[]> {
    // Implementation depends on provider API
    // For now, return mock incidents based on traffic conditions
    return this.getMockTrafficIncidents(routePath);
  }

  // Private helper methods

  private async fetchTrafficFromAPI(
    routePath: Array<{ lat: number; lng: number }>,
    vehicleProfile?: VehicleProfile
  ): Promise<TrafficCondition[]> {
    // Update request count for rate limiting
    this.updateRequestCount();

    switch (this.config.provider) {
      case 'tomtom':
        return this.fetchFromTomTom(routePath, vehicleProfile);
      case 'here':
        return this.fetchFromHere(routePath, vehicleProfile);
      case 'nextbillion':
        return this.fetchFromNextBillion(routePath, vehicleProfile);
      default:
        return this.getMockTrafficConditions(routePath);
    }
  }

  private async fetchFromTomTom(
    routePath: Array<{ lat: number; lng: number }>,
    vehicleProfile?: VehicleProfile
  ): Promise<TrafficCondition[]> {
    // TomTom Traffic Flow API implementation
    // This would use actual TomTom API endpoints
    const conditions: TrafficCondition[] = [];
    
    for (let i = 0; i < routePath.length - 1; i++) {
      const start = routePath[i];
      const end = routePath[i + 1];
      
      // Mock TomTom API response processing
      conditions.push({
        segmentId: `tomtom_${i}`,
        roadName: `Road Segment ${i + 1}`,
        coordinates: { start, end },
        speedLimit: this.estimateSpeedLimit(start, end),
        currentSpeed: this.calculateCurrentSpeed(),
        flowLevel: this.determineFlowLevel(),
        delayMinutes: Math.random() * 10,
        confidence: 0.8 + Math.random() * 0.15,
        lastUpdated: new Date(),
        incidents: [],
      });
    }
    
    return conditions;
  }

  private async fetchFromHere(
    routePath: Array<{ lat: number; lng: number }>,
    vehicleProfile?: VehicleProfile
  ): Promise<TrafficCondition[]> {
    // HERE Traffic API implementation
    return this.getMockTrafficConditions(routePath);
  }

  private async fetchFromNextBillion(
    routePath: Array<{ lat: number; lng: number }>,
    vehicleProfile?: VehicleProfile
  ): Promise<TrafficCondition[]> {
    // NextBillion.ai API implementation
    return this.getMockTrafficConditions(routePath);
  }

  private getMockTrafficConditions(routePath: Array<{ lat: number; lng: number }>): TrafficCondition[] {
    return routePath.slice(0, -1).map((point, index) => ({
      segmentId: `mock_segment_${index}`,
      roadName: `Road Segment ${index + 1}`,
      coordinates: {
        start: point,
        end: routePath[index + 1],
      },
      speedLimit: this.estimateSpeedLimit(point, routePath[index + 1]),
      currentSpeed: this.calculateCurrentSpeed(),
      flowLevel: this.determineFlowLevel(),
      delayMinutes: Math.random() * 8,
      confidence: 0.75 + Math.random() * 0.2,
      lastUpdated: new Date(),
      incidents: [],
    }));
  }

  private async calculateRoute(request: RouteCalculationRequest): Promise<Route> {
    // Mock route calculation - in real implementation this would call routing API
    const distance = this.calculateDistance(request.start, request.end);
    const baseTime = distance * 1.5; // Rough estimate for trucks
    
    return {
      id: randomUUID(),
      name: 'Calculated Route',
      startLocation: `${request.start.lat},${request.start.lng}`,
      endLocation: `${request.end.lat},${request.end.lng}`,
      startCoordinates: request.start,
      endCoordinates: request.end,
      distance,
      duration: Math.round(baseTime),
      vehicleProfileId: request.vehicleProfile.id,
      routePath: this.generateRoutePath(request.start, request.end),
      restrictionsAvoided: [],
      facilitiesNearby: [],
      laneGuidance: [],
      isFavorite: false,
    };
  }

  private async findAlternativeRoutes(
    request: RouteCalculationRequest,
    originalRoute: Route
  ): Promise<Partial<AlternativeRoute>[]> {
    // Generate 2-3 alternative route candidates
    const alternatives: Partial<AlternativeRoute>[] = [];
    
    for (let i = 0; i < 3; i++) {
      const altRoute = await this.generateAlternativeRoute(request, originalRoute, i);
      alternatives.push(altRoute);
    }
    
    return alternatives;
  }

  private async generateAlternativeRoute(
    request: RouteCalculationRequest,
    originalRoute: Route,
    variation: number
  ): Promise<Partial<AlternativeRoute>> {
    // Mock alternative route generation
    const distanceVariation = 1 + (variation * 0.1); // 0%, 10%, 20% longer
    const timeVariation = 0.9 + (variation * 0.05); // Potentially faster despite being longer
    
    return {
      id: randomUUID(),
      originalRouteId: originalRoute.id,
      routePath: this.generateAlternativeRoutePath(request.start, request.end, variation),
      distance: originalRoute.distance! * distanceVariation,
      duration: Math.round(originalRoute.duration! * timeVariation),
      durationWithoutTraffic: originalRoute.duration!,
      timeSavingsMinutes: 0, // Will be calculated in analyzeAlternativeRoute
      confidenceLevel: 0.8,
      trafficConditions: [],
      restrictionsAvoided: [],
      viabilityScore: 0.7 + (Math.random() * 0.2),
      reasonForSuggestion: variation === 0 ? 'faster_alternative' : 'traffic_incident',
      calculatedAt: new Date(),
    };
  }

  private async analyzeAlternativeRoute(
    alternative: Partial<AlternativeRoute>,
    originalRoute: Route,
    vehicleProfile: VehicleProfile
  ): Promise<AlternativeRoute> {
    const conditions = await this.getTrafficConditions(
      alternative.routePath as Array<{ lat: number; lng: number }>,
      vehicleProfile
    );

    const totalDelay = conditions.reduce((sum, condition) => sum + condition.delayMinutes, 0);
    const adjustedDuration = alternative.durationWithoutTraffic! + totalDelay;
    const timeSavings = originalRoute.duration! - adjustedDuration;

    return {
      ...alternative,
      duration: Math.round(adjustedDuration),
      timeSavingsMinutes: Math.max(0, Math.round(timeSavings)),
      trafficConditions: conditions,
      confidenceLevel: conditions.reduce((sum, c) => sum + c.confidence, 0) / conditions.length,
    } as AlternativeRoute;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const minuteMs = 60 * 1000;
    const hourMs = 60 * 60 * 1000;

    // Reset counters if time window has passed
    if (now - this.requestCount.timestamp > minuteMs) {
      this.requestCount.minute = 0;
    }
    if (now - this.requestCount.timestamp > hourMs) {
      this.requestCount.hour = 0;
    }

    return (
      this.requestCount.minute < this.config.rateLimit.requestsPerMinute &&
      this.requestCount.hour < this.config.rateLimit.requestsPerHour
    );
  }

  private updateRequestCount(): void {
    const now = Date.now();
    this.requestCount.minute++;
    this.requestCount.hour++;
    this.requestCount.timestamp = now;
  }

  private getFromCache(key: string): any {
    const item = this.cache.get(key);
    if (item && item.expires > Date.now()) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000),
    });
  }

  private getFallbackTrafficConditions(routePath: Array<{ lat: number; lng: number }>): TrafficCondition[] {
    // Return basic conditions with moderate flow when API fails
    return routePath.slice(0, -1).map((point, index) => ({
      segmentId: `fallback_${index}`,
      roadName: `Road Segment ${index + 1}`,
      coordinates: { start: point, end: routePath[index + 1] },
      speedLimit: 60, // Default speed limit
      currentSpeed: 45, // Moderate traffic
      flowLevel: 'moderate' as const,
      delayMinutes: 2,
      confidence: 0.5, // Lower confidence for fallback data
      lastUpdated: new Date(),
      incidents: [],
    }));
  }

  private getMockTrafficIncidents(routePath: Array<{ lat: number; lng: number }>): TrafficIncident[] {
    // Generate mock incidents for demonstration
    const incidents: TrafficIncident[] = [];
    
    if (Math.random() > 0.7) { // 30% chance of incident
      const randomIndex = Math.floor(Math.random() * routePath.length);
      const point = routePath[randomIndex];
      
      incidents.push({
        id: randomUUID(),
        type: ['accident', 'construction', 'heavy_traffic'][Math.floor(Math.random() * 3)] as any,
        severity: ['medium', 'high'][Math.floor(Math.random() * 2)] as any,
        title: 'Traffic Incident',
        description: 'Heavy congestion reported',
        coordinates: point,
        roadName: `Road at ${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}`,
        direction: 'both_directions',
        reportedBy: 'system',
        reporterName: null,
        isVerified: true,
        isActive: true,
        reportedAt: new Date(),
        resolvedAt: null,
        estimatedClearTime: null,
        affectedLanes: 2,
        totalLanes: 3,
        truckWarnings: [],
        trafficDelay: 15,
        alternativeRoute: null,
        country: 'UK',
      });
    }
    
    return incidents;
  }

  // Utility methods
  private hashRoute(routePath: Array<{ lat: number; lng: number }>): string {
    return routePath.map(p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');
  }

  private estimateSpeedLimit(start: { lat: number; lng: number }, end: { lat: number; lng: number }): number {
    // Mock speed limit estimation based on coordinates
    // In reality, this would come from map data
    return [30, 40, 50, 60, 70][Math.floor(Math.random() * 5)];
  }

  private calculateCurrentSpeed(): number {
    const baseSpeed = 45;
    const variation = (Math.random() - 0.5) * 20;
    return Math.max(10, Math.round(baseSpeed + variation));
  }

  private determineFlowLevel(): TrafficCondition['flowLevel'] {
    const levels: TrafficCondition['flowLevel'][] = ['free', 'light', 'moderate', 'heavy', 'standstill'];
    const weights = [0.3, 0.3, 0.25, 0.1, 0.05]; // Probability weights
    
    let random = Math.random();
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) return levels[i];
    }
    return 'moderate';
  }

  private calculateDistance(start: { lat: number; lng: number }, end: { lat: number; lng: number }): number {
    // Haversine formula for distance calculation
    const R = 3959; // Earth's radius in miles
    const dLat = (end.lat - start.lat) * Math.PI / 180;
    const dLon = (end.lng - start.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private generateRoutePath(start: { lat: number; lng: number }, end: { lat: number; lng: number }): Array<{ lat: number; lng: number }> {
    // Generate a simple path with waypoints
    const steps = 10;
    const path: Array<{ lat: number; lng: number }> = [start];
    
    for (let i = 1; i < steps; i++) {
      const progress = i / steps;
      path.push({
        lat: start.lat + (end.lat - start.lat) * progress + (Math.random() - 0.5) * 0.01,
        lng: start.lng + (end.lng - start.lng) * progress + (Math.random() - 0.5) * 0.01,
      });
    }
    
    path.push(end);
    return path;
  }

  private generateAlternativeRoutePath(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    variation: number
  ): Array<{ lat: number; lng: number }> {
    // Generate alternative path with more deviation
    const steps = 12;
    const path: Array<{ lat: number; lng: number }> = [start];
    const deviation = 0.02 + (variation * 0.01);
    
    for (let i = 1; i < steps; i++) {
      const progress = i / steps;
      path.push({
        lat: start.lat + (end.lat - start.lat) * progress + (Math.random() - 0.5) * deviation,
        lng: start.lng + (end.lng - start.lng) * progress + (Math.random() - 0.5) * deviation,
      });
    }
    
    path.push(end);
    return path;
  }

  private calculateConfidence(alternatives: AlternativeRoute[]): number {
    if (alternatives.length === 0) return 0;
    return alternatives.reduce((sum, alt) => sum + alt.confidenceLevel, 0) / alternatives.length;
  }

  private determineRerouteReason(conditions: TrafficCondition[], alternative: AlternativeRoute): string {
    const hasStandstill = conditions.some(c => c.flowLevel === 'standstill');
    const hasHeavyTraffic = conditions.some(c => c.flowLevel === 'heavy');
    const hasIncidents = conditions.some(c => c.incidents && c.incidents.length > 0);

    if (hasStandstill) return 'Traffic standstill detected on current route';
    if (hasIncidents) return 'Traffic incident blocking current route';
    if (hasHeavyTraffic) return 'Heavy congestion on current route';
    return `Alternative route saves ${alternative.timeSavingsMinutes} minutes`;
  }
}

// Create and export a singleton instance
export const trafficService = new TrafficService({
  provider: process.env.TRAFFIC_API_PROVIDER as any || 'mock',
  apiKey: process.env.TRAFFIC_API_KEY,
  rateLimit: {
    requestsPerMinute: parseInt(process.env.TRAFFIC_RATE_LIMIT_PER_MINUTE || '100'),
    requestsPerHour: parseInt(process.env.TRAFFIC_RATE_LIMIT_PER_HOUR || '2000'),
  },
});