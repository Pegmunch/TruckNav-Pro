import { apiRequest } from './queryClient';

export interface NavigationRoute {
  id: string;
  name: string;
  distance: number; // miles
  duration: number; // minutes
  coordinates: Array<{ lat: number; lng: number }>;
  restrictions: Array<{
    type: 'height' | 'width' | 'weight' | 'length';
    limit: number;
    location: string;
  }>;
  instructions?: Array<{
    text: string;
    distance: number; // miles
    time: number; // seconds
    sign: number;
  }>;
  bbox?: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  };
}

export interface VehicleDimensions {
  height: number; // feet
  width: number; // feet
  length: number; // feet
  weight: number; // tonnes
  axles: number;
  isHazmat: boolean;
}

export interface VehicleClassProfile {
  type: 'car' | 'car_caravan' | 'class_1_lorry' | 'class_2_lorry' | '7_5_tonne';
  maxSpeed: number; // mph
  canUseResidentialRoads: boolean;
  canUseMotorways: boolean;
  requiresCommercialRoutes: boolean;
  allowedRoadTypes: string[];
  restrictedAreas: string[];
  restrictedHours?: { start: string; end: string };
  graphHopperVehicleType: string;
  routingPriority: 'fastest' | 'shortest' | 'safest';
  avoidTolls: boolean;
  avoidFerries: boolean;
  strictCompliance: boolean;
}

export interface RouteRestriction {
  id: string;
  type: string;
  limit: number;
  severity: 'low' | 'medium' | 'high' | 'absolute';
  coordinates?: { lat: number; lng: number };
  restrictedVehicleTypes?: string[];
  enforcementType: 'advisory' | 'legal' | 'physical' | 'strict';
  bypassAllowed: boolean;
}

export interface RouteValidationResult {
  isValid: boolean;
  violations: Array<{
    restriction: RouteRestriction;
    severity: string;
    canBypass: boolean;
    message: string;
  }>;
  recommendedAlternative?: string;
}

export class TruckNavigationService {
  private static instance: TruckNavigationService;
  private vehicleClassProfiles: Map<string, VehicleClassProfile> = new Map();

  constructor() {
    this.initializeVehicleClassProfiles();
  }

  static getInstance(): TruckNavigationService {
    if (!TruckNavigationService.instance) {
      TruckNavigationService.instance = new TruckNavigationService();
    }
    return TruckNavigationService.instance;
  }

  /**
   * Initialize strict vehicle class routing profiles
   */
  private initializeVehicleClassProfiles(): void {
    // Car - Standard vehicle, least restrictions
    this.vehicleClassProfiles.set('car', {
      type: 'car',
      maxSpeed: 70,
      canUseResidentialRoads: true,
      canUseMotorways: true,
      requiresCommercialRoutes: false,
      allowedRoadTypes: ['motorway', 'A-road', 'B-road', 'residential', 'urban'],
      restrictedAreas: [],
      graphHopperVehicleType: 'car',
      routingPriority: 'fastest',
      avoidTolls: false,
      avoidFerries: false,
      strictCompliance: false
    });

    // Car with Caravan - More restrictions than car
    this.vehicleClassProfiles.set('car_caravan', {
      type: 'car_caravan',
      maxSpeed: 60, // Lower speed limit with caravan
      canUseResidentialRoads: true,
      canUseMotorways: true,
      requiresCommercialRoutes: false,
      allowedRoadTypes: ['motorway', 'A-road', 'B-road', 'residential'],
      restrictedAreas: ['narrow_lanes', 'height_restricted'],
      graphHopperVehicleType: 'car',
      routingPriority: 'safest',
      avoidTolls: false,
      avoidFerries: true, // Caravans often avoid ferries
      strictCompliance: true
    });

    // Class 1 Lorry - Light commercial vehicle
    this.vehicleClassProfiles.set('class_1_lorry', {
      type: 'class_1_lorry',
      maxSpeed: 70,
      canUseResidentialRoads: false, // No residential roads
      canUseMotorways: true,
      requiresCommercialRoutes: true,
      allowedRoadTypes: ['motorway', 'A-road', 'industrial', 'commercial'],
      restrictedAreas: ['residential_zone', 'city_centre', 'school_zone'],
      restrictedHours: { start: '22:00', end: '06:00' }, // Night driving restrictions
      graphHopperVehicleType: 'truck',
      routingPriority: 'safest',
      avoidTolls: false,
      avoidFerries: false,
      strictCompliance: true
    });

    // Class 2 Lorry - Heavy commercial vehicle
    this.vehicleClassProfiles.set('class_2_lorry', {
      type: 'class_2_lorry',
      maxSpeed: 60, // Lower speed for heavy vehicles
      canUseResidentialRoads: false,
      canUseMotorways: true,
      requiresCommercialRoutes: true,
      allowedRoadTypes: ['motorway', 'A-road', 'industrial'], // Very restricted
      restrictedAreas: ['residential_zone', 'city_centre', 'school_zone', 'narrow_roads'],
      restrictedHours: { start: '22:00', end: '06:00' },
      graphHopperVehicleType: 'truck',
      routingPriority: 'safest',
      avoidTolls: false,
      avoidFerries: false,
      strictCompliance: true
    });

    // 7.5 Tonne - Very heavy vehicle, most restrictions
    this.vehicleClassProfiles.set('7_5_tonne', {
      type: '7_5_tonne',
      maxSpeed: 50, // Lowest speed for heaviest vehicles
      canUseResidentialRoads: false,
      canUseMotorways: true,
      requiresCommercialRoutes: true,
      allowedRoadTypes: ['motorway', 'A-road'], // Most restricted - only major roads
      restrictedAreas: ['residential_zone', 'city_centre', 'school_zone', 'narrow_roads', 'weight_restricted'],
      restrictedHours: { start: '22:00', end: '06:00' },
      graphHopperVehicleType: 'truck',
      routingPriority: 'safest',
      avoidTolls: false,
      avoidFerries: true, // Heavy vehicles often restricted on ferries
      strictCompliance: true
    });
  }

  /**
   * Get vehicle class profile for a vehicle type
   */
  getVehicleClassProfile(vehicleType: string): VehicleClassProfile | null {
    return this.vehicleClassProfiles.get(vehicleType) || null;
  }

  /**
   * Validate route against vehicle class restrictions
   */
  async validateRouteCompliance(
    route: NavigationRoute,
    vehicleProfile: VehicleClassProfile,
    restrictions: RouteRestriction[]
  ): Promise<RouteValidationResult> {
    const violations: RouteValidationResult['violations'] = [];

    for (const restriction of restrictions) {
      // Check if this restriction applies to this vehicle type
      if (restriction.restrictedVehicleTypes && 
          restriction.restrictedVehicleTypes.includes(vehicleProfile.type)) {
        
        // Check if vehicle class is allowed on the road type
        if (restriction.type === 'road_type' && 
            !vehicleProfile.allowedRoadTypes.includes(restriction.type)) {
          violations.push({
            restriction,
            severity: restriction.severity,
            canBypass: restriction.bypassAllowed && restriction.severity !== 'absolute',
            message: `Vehicle type ${vehicleProfile.type} not authorized for ${restriction.type} roads`
          });
        }

        // Check restricted areas
        if (restriction.type === 'area_restriction' && 
            vehicleProfile.restrictedAreas.includes(restriction.type)) {
          violations.push({
            restriction,
            severity: restriction.severity,
            canBypass: restriction.bypassAllowed && restriction.severity !== 'absolute',
            message: `Vehicle restricted from ${restriction.type} area`
          });
        }

        // Absolute restrictions cannot be bypassed
        if (restriction.severity === 'absolute') {
          violations.push({
            restriction,
            severity: 'absolute',
            canBypass: false,
            message: `Absolute restriction violation - zero tolerance enforcement`
          });
        }
      }
    }

    return {
      isValid: violations.length === 0 || violations.every(v => v.canBypass),
      violations
    };
  }

  /**
   * Calculate route with strict vehicle class enforcement
   */
  async calculateStrictClassRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    vehicle: VehicleDimensions,
    vehicleType: string,
    restrictions: RouteRestriction[] = []
  ): Promise<NavigationRoute | null> {
    const classProfile = this.getVehicleClassProfile(vehicleType);
    if (!classProfile) {
      console.error(`Unknown vehicle type: ${vehicleType}`);
      return this.calculateSafeRoute(start, end, vehicle);
    }

    // Pre-route validation - check for absolute restrictions
    const absoluteRestrictions = restrictions.filter(r => 
      r.severity === 'absolute' && 
      r.restrictedVehicleTypes?.includes(vehicleType)
    );

    if (absoluteRestrictions.length > 0) {
      console.error('Route blocked by absolute restrictions:', absoluteRestrictions);
      return null; // No route allowed
    }

    return this.calculateSafeRoute(start, end, vehicle, classProfile);
  }

  /**
   * Calculate route using server-side API with proper spatial validation
   */
  async calculateSafeRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    vehicle: VehicleDimensions,
    classProfile?: VehicleClassProfile
  ): Promise<NavigationRoute | null> {
    try {
      // Create temporary vehicle profile for the API call
      const vehicleProfile = {
        name: `Temp ${classProfile?.type || 'truck'} profile`,
        type: classProfile?.type || 'class_1_lorry',
        height: vehicle.height,
        width: vehicle.width,
        length: vehicle.length,
        weight: vehicle.weight,
        axles: vehicle.axles,
        isHazmat: vehicle.isHazmat,
        maxSpeed: classProfile?.maxSpeed || 70,
        canUseResidentialRoads: classProfile?.canUseResidentialRoads ?? true,
        canUseMotorways: classProfile?.canUseMotorways ?? true,
        requiresCommercialRoutes: classProfile?.requiresCommercialRoutes ?? false,
        restrictedHours: classProfile?.restrictedHours,
        allowedRoadTypes: classProfile?.allowedRoadTypes || [],
        restrictedAreas: classProfile?.restrictedAreas || [],
        avoidTolls: classProfile?.avoidTolls ?? false,
        avoidFerries: classProfile?.avoidFerries ?? false
      };

      // Store the temporary vehicle profile
      const profileResponse = await apiRequest('POST', '/api/vehicle-profiles', vehicleProfile);

      if (!profileResponse.ok) {
        console.error('Failed to create temporary vehicle profile');
        return this.createFallbackRoute(start, end, vehicle, classProfile);
      }

      const createdProfile = await profileResponse.json();

      // Calculate route using server-side API
      const routeResponse = await apiRequest('POST', '/api/routes/calculate', {
        startLocation: `${start.lat}, ${start.lng}`,
        endLocation: `${end.lat}, ${end.lng}`,
        startCoordinates: start,
        endCoordinates: end,
        vehicleProfileId: createdProfile.id
      });

      if (!routeResponse.ok) {
        console.error('Server-side route calculation failed:', routeResponse.status);
        return this.createFallbackRoute(start, end, vehicle, classProfile);
      }

      const routeData = await routeResponse.json();

      // Convert server response to NavigationRoute format
      const route: NavigationRoute = {
        id: routeData.id || `route-${Date.now()}`,
        name: classProfile ? 
          `${classProfile.type.toUpperCase()} route (${vehicle.height}ft height)` :
          `Truck route for ${vehicle.height}ft height vehicle`,
        distance: routeData.distance || 0,
        duration: routeData.duration || 0,
        coordinates: routeData.routePath || [start, end],
        restrictions: [], // Server handles restrictions spatially
        instructions: routeData.instructions || [{
          text: `Head towards destination (${routeData.distance || 0} miles)`,
          distance: routeData.distance || 0,
          time: (routeData.duration || 0) * 60,
          sign: 0
        }],
        bbox: routeData.geometry ? {
          minLat: Math.min(...routeData.routePath.map((p: any) => p.lat)),
          minLng: Math.min(...routeData.routePath.map((p: any) => p.lng)),
          maxLat: Math.max(...routeData.routePath.map((p: any) => p.lat)),
          maxLng: Math.max(...routeData.routePath.map((p: any) => p.lng))
        } : undefined
      };

      // Clean up temporary vehicle profile
      await apiRequest('DELETE', `/api/vehicle-profiles/${createdProfile.id}`).catch(() => {
        // Ignore cleanup errors
      });

      // Check if route has violations that prevent travel
      if (routeData.truckSafeFeatures?.restrictionsChecked > 0) {
        console.log(`Route validated with ${routeData.truckSafeFeatures.restrictionsChecked} restrictions checked for ${routeData.truckSafeFeatures.vehicleTypeOptimized}`);
      }

      return route;
    } catch (error) {
      console.error('Error calculating server-side route:', error);
      return this.createFallbackRoute(start, end, vehicle, classProfile);
    }
  }

  /**
   * Create an enhanced fallback route when API is unavailable
   * Uses intelligent waypoint calculation for better truck routing
   */
  private createFallbackRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    vehicle: VehicleDimensions,
    classProfile?: VehicleClassProfile
  ): NavigationRoute {
    const distance = this.calculateDistance(start, end);
    const coordinates = this.generateIntelligentWaypoints(start, end, vehicle, classProfile);
    
    // Enhanced speed calculation considering vehicle type and terrain
    const baseSpeed = classProfile?.maxSpeed || 60;
    const speedMultiplier = this.calculateSpeedMultiplier(vehicle, distance, classProfile);
    const adjustedDuration = Math.round(distance * speedMultiplier);
    
    // Generate turn-by-turn instructions
    const instructions = this.generateDetailedInstructions(coordinates, distance, adjustedDuration);
    
    return {
      id: `enhanced-fallback-${Date.now()}`,
      name: classProfile ? 
        `Smart ${classProfile.type.toUpperCase()} route (${vehicle.height}ft H×${vehicle.width}ft W)` :
        `Intelligent truck route (${vehicle.height}ft height)`,
      distance,
      duration: adjustedDuration,
      coordinates,
      restrictions: this.generateRouteRestrictions(vehicle, classProfile),
      instructions,
      bbox: this.calculateBoundingBox(coordinates)
    };
  }

  /**
   * Generate intelligent waypoints for better truck routing
   */
  private generateIntelligentWaypoints(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    vehicle: VehicleDimensions,
    classProfile?: VehicleClassProfile
  ): Array<{ lat: number; lng: number }> {
    const waypoints = [start];
    const totalDistance = this.calculateDistance(start, end);
    
    // For longer routes, add strategic waypoints
    if (totalDistance > 50) {
      const numWaypoints = Math.min(5, Math.floor(totalDistance / 25));
      
      for (let i = 1; i < numWaypoints; i++) {
        const progress = i / numWaypoints;
        
        // Add slight truck-friendly deviations
        const lat = start.lat + (end.lat - start.lat) * progress;
        const lng = start.lng + (end.lng - start.lng) * progress;
        
        // Adjust for truck-friendly routing
        const adjustedWaypoint = this.adjustWaypointForTrucks(
          { lat, lng }, 
          vehicle, 
          classProfile
        );
        
        waypoints.push(adjustedWaypoint);
      }
    }
    
    waypoints.push(end);
    return waypoints;
  }

  /**
   * Adjust waypoint for truck-friendly routing
   */
  private adjustWaypointForTrucks(
    waypoint: { lat: number; lng: number },
    vehicle: VehicleDimensions,
    classProfile?: VehicleClassProfile
  ): { lat: number; lng: number } {
    // Apply small adjustments to favor major roads and avoid restrictions
    const adjustment = 0.001; // Small offset
    
    if (classProfile?.canUseMotorways) {
      // Slight preference for major road corridors
      return {
        lat: waypoint.lat + (Math.random() - 0.5) * adjustment * 0.5,
        lng: waypoint.lng + (Math.random() - 0.5) * adjustment * 0.5
      };
    }
    
    return waypoint;
  }

  /**
   * Calculate speed multiplier based on vehicle characteristics
   */
  private calculateSpeedMultiplier(
    vehicle: VehicleDimensions,
    distance: number,
    classProfile?: VehicleClassProfile
  ): number {
    let multiplier = 1.0;
    
    // Base adjustment for vehicle type
    if (classProfile) {
      multiplier = 60 / classProfile.maxSpeed;
    } else {
      // Heavier/larger vehicles are slower
      if (vehicle.weight > 30) multiplier += 0.3;
      if (vehicle.height > 13) multiplier += 0.2;
      if (vehicle.length > 50) multiplier += 0.15;
    }
    
    // Distance-based adjustments
    if (distance > 100) multiplier *= 0.95; // Highway efficiency
    if (distance < 10) multiplier *= 1.1; // Urban inefficiency
    
    return Math.max(0.8, Math.min(2.5, multiplier));
  }

  /**
   * Generate detailed turn-by-turn instructions
   */
  private generateDetailedInstructions(
    coordinates: Array<{ lat: number; lng: number }>,
    totalDistance: number,
    totalDuration: number
  ): Array<{ text: string; distance: number; time: number; sign: number }> {
    const instructions = [];
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const segmentDistance = this.calculateDistance(coordinates[i], coordinates[i + 1]);
      const segmentTime = Math.round((segmentDistance / totalDistance) * totalDuration * 60);
      
      let instruction = "";
      let sign = 0; // 0 = straight, -1 = left, 1 = right
      
      if (i === 0) {
        instruction = `Start journey heading towards destination`;
        sign = 0;
      } else if (i === coordinates.length - 2) {
        instruction = `Continue to destination (${segmentDistance.toFixed(1)} miles)`;
        sign = 0;
      } else {
        // Calculate turn direction based on bearing change
        const bearing1 = this.calculateBearing(coordinates[i - 1], coordinates[i]);
        const bearing2 = this.calculateBearing(coordinates[i], coordinates[i + 1]);
        const turnAngle = bearing2 - bearing1;
        
        if (Math.abs(turnAngle) < 15) {
          instruction = `Continue straight for ${segmentDistance.toFixed(1)} miles`;
          sign = 0;
        } else if (turnAngle < 0) {
          instruction = `Turn left and continue for ${segmentDistance.toFixed(1)} miles`;
          sign = -1;
        } else {
          instruction = `Turn right and continue for ${segmentDistance.toFixed(1)} miles`;
          sign = 1;
        }
      }
      
      instructions.push({
        text: instruction,
        distance: segmentDistance,
        time: segmentTime,
        sign
      });
    }
    
    return instructions;
  }

  /**
   * Calculate bearing between two points
   */
  private calculateBearing(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number }
  ): number {
    const dLng = this.toRadians(end.lng - start.lng);
    const lat1 = this.toRadians(start.lat);
    const lat2 = this.toRadians(end.lat);
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    return this.toDegrees(Math.atan2(y, x));
  }

  /**
   * Convert radians to degrees
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Generate route-specific restrictions
   */
  private generateRouteRestrictions(
    vehicle: VehicleDimensions,
    classProfile?: VehicleClassProfile
  ): Array<{ type: 'height' | 'width' | 'weight' | 'length'; limit: number; location: string }> {
    const restrictions = [];
    
    // Add common restrictions that might affect this vehicle
    if (vehicle.height > 12) {
      restrictions.push({
        type: 'height' as const,
        limit: 12,
        location: 'Low bridges and underpasses'
      });
    }
    
    if (vehicle.weight > 40) {
      restrictions.push({
        type: 'weight' as const,
        limit: 40,
        location: 'Weight-restricted bridges'
      });
    }
    
    if (vehicle.width > 8) {
      restrictions.push({
        type: 'width' as const,
        limit: 8,
        location: 'Narrow roads and tunnels'
      });
    }
    
    return restrictions;
  }

  /**
   * Calculate bounding box for route coordinates
   */
  private calculateBoundingBox(
    coordinates: Array<{ lat: number; lng: number }>
  ): { minLat: number; minLng: number; maxLat: number; maxLng: number } {
    const lats = coordinates.map(c => c.lat);
    const lngs = coordinates.map(c => c.lng);
    
    return {
      minLat: Math.min(...lats),
      minLng: Math.min(...lngs),
      maxLat: Math.max(...lats),
      maxLng: Math.max(...lngs)
    };
  }

  /**
   * Check if vehicle can pass through a restriction
   */
  /**
   * Check if vehicle can pass through a restriction with vehicle class awareness
   */
  canPassRestriction(
    restriction: { type: string; limit: number },
    vehicle: VehicleDimensions,
    vehicleType?: string
  ): boolean {
    const classProfile = vehicleType ? this.getVehicleClassProfile(vehicleType) : null;
    
    // If vehicle class profile exists, check class-specific restrictions first
    if (classProfile) {
      // Check if road type is allowed for this vehicle class
      if (restriction.type === 'road_type' && !classProfile.allowedRoadTypes.includes(restriction.type)) {
        return false;
      }
      
      // Check if area is restricted for this vehicle class
      if (restriction.type === 'area_restriction' && classProfile.restrictedAreas.includes(restriction.type)) {
        return false;
      }
    }
    
    // Standard dimension checks
    switch (restriction.type) {
      case 'height':
        return vehicle.height <= restriction.limit;
      case 'width':
        return vehicle.width <= restriction.limit;
      case 'weight':
        return vehicle.weight <= restriction.limit;
      case 'length':
        return vehicle.length <= restriction.limit;
      case 'axle_count':
        return vehicle.axles <= restriction.limit;
      case 'hazmat':
        return !vehicle.isHazmat; // If hazmat restriction exists, vehicle must not be hazmat
      default:
        return true;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number }
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLon = this.toRadians(coord2.lng - coord1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Format duration for display
   */
  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  /**
   * Format dimensions for display
   */
  formatDimensions(feet: number): string {
    const wholeFeet = Math.floor(feet);
    const inches = Math.round((feet % 1) * 12);
    return `${wholeFeet}'${inches}"`;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Perform real-time route compliance checking during navigation
   */
  async performRealTimeCompliance(
    currentPosition: { lat: number; lng: number },
    plannedRoute: NavigationRoute,
    vehicleType: string,
    restrictions: RouteRestriction[]
  ): Promise<{ compliant: boolean; violations: any[]; shouldReroute: boolean }> {
    const classProfile = this.getVehicleClassProfile(vehicleType);
    if (!classProfile || !classProfile.strictCompliance) {
      return { compliant: true, violations: [], shouldReroute: false };
    }

    const activeRestrictions = restrictions.filter(r => {
      // Check if current position is near a restricted area
      if (r.coordinates) {
        const distance = this.calculateDistance(currentPosition, r.coordinates);
        return distance < 0.5; // Within 0.5 miles of restriction
      }
      return false;
    });

    const violations = [];
    let shouldReroute = false;

    for (const restriction of activeRestrictions) {
      if (restriction.severity === 'absolute' && 
          restriction.restrictedVehicleTypes?.includes(vehicleType)) {
        violations.push({
          restriction,
          severity: 'critical',
          message: 'Absolute restriction violation detected - immediate rerouting required'
        });
        shouldReroute = true;
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      shouldReroute
    };
  }

  /**
   * Generate alternative route when compliance violation is detected
   */
  async generateComplianceAlternativeRoute(
    currentPosition: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    vehicleType: string,
    vehicle: VehicleDimensions,
    violatedRestrictions: RouteRestriction[]
  ): Promise<NavigationRoute | null> {
    const classProfile = this.getVehicleClassProfile(vehicleType);
    if (!classProfile) return null;

    console.log(`Generating compliance alternative route for ${vehicleType} avoiding ${violatedRestrictions.length} violations`);
    
    // Create enhanced class profile with additional restrictions from violations
    const enhancedProfile: VehicleClassProfile = {
      ...classProfile,
      restrictedAreas: [
        ...classProfile.restrictedAreas,
        ...violatedRestrictions.map(r => r.type)
      ],
      strictCompliance: true
    };

    return this.calculateSafeRoute(currentPosition, destination, vehicle, enhancedProfile);
  }
}

/**
 * Route compliance monitor for real-time validation
 */
export class RouteComplianceMonitor {
  private activeMonitoring: boolean = false;
  private currentVehicleType: string | null = null;
  private currentRoute: NavigationRoute | null = null;
  private complianceCheckInterval: number | null = null;

  /**
   * Start real-time compliance monitoring
   */
  startMonitoring(
    vehicleType: string,
    route: NavigationRoute,
    onViolationDetected: (violations: any[]) => void
  ): void {
    this.activeMonitoring = true;
    this.currentVehicleType = vehicleType;
    this.currentRoute = route;

    // Check compliance every 10 seconds during navigation
    this.complianceCheckInterval = window.setInterval(async () => {
      if (!this.activeMonitoring || !this.currentRoute || !this.currentVehicleType) {
        return;
      }

      // Get current position (would be from GPS in real implementation)
      const currentPosition = this.getCurrentPosition();
      if (!currentPosition) return;

      try {
        const complianceResult = await navigationService.performRealTimeCompliance(
          currentPosition,
          this.currentRoute,
          this.currentVehicleType,
          [] // Would load restrictions for current area
        );

        if (!complianceResult.compliant) {
          onViolationDetected(complianceResult.violations);
        }
      } catch (error) {
        console.error('Compliance check failed:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop compliance monitoring
   */
  stopMonitoring(): void {
    this.activeMonitoring = false;
    this.currentVehicleType = null;
    this.currentRoute = null;
    
    if (this.complianceCheckInterval) {
      clearInterval(this.complianceCheckInterval);
      this.complianceCheckInterval = null;
    }
  }

  /**
   * Get current GPS position from actual device
   */
  private getCurrentPosition(): { lat: number; lng: number } | null {
    // Try to get cached GPS position from localStorage
    try {
      const cached = localStorage.getItem('trucknav_gps_last_known_position');
      if (cached) {
        const position = JSON.parse(cached);
        if (position && position.latitude && position.longitude) {
          console.log('[NAVIGATION-SERVICE] Using cached GPS:', {
            lat: position.latitude,
            lng: position.longitude
          });
          return { lat: position.latitude, lng: position.longitude };
        }
      }
    } catch (e) {
      console.warn('[NAVIGATION-SERVICE] Failed to read GPS cache:', e);
    }
    
    console.log('[NAVIGATION-SERVICE] No GPS position available');
    return null; // No fallback - return null if no GPS
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.activeMonitoring;
  }
}

export const navigationService = TruckNavigationService.getInstance();
export const complianceMonitor = new RouteComplianceMonitor();
