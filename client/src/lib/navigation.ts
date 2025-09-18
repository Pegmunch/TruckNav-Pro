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
      const profileResponse = await fetch('/api/vehicle-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vehicleProfile)
      });

      if (!profileResponse.ok) {
        console.error('Failed to create temporary vehicle profile');
        return this.createFallbackRoute(start, end, vehicle, classProfile);
      }

      const createdProfile = await profileResponse.json();

      // Calculate route using server-side API
      const routeResponse = await fetch('/api/routes/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startLocation: `${start.lat}, ${start.lng}`,
          endLocation: `${end.lat}, ${end.lng}`,
          startCoordinates: start,
          endCoordinates: end,
          vehicleProfileId: createdProfile.id
        })
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
      await fetch(`/api/vehicle-profiles/${createdProfile.id}`, {
        method: 'DELETE'
      }).catch(() => {
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
   * Create a fallback route when API is unavailable
   */
  private createFallbackRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    vehicle: VehicleDimensions,
    classProfile?: VehicleClassProfile
  ): NavigationRoute {
    const distance = this.calculateDistance(start, end);
    const speedMultiplier = classProfile?.maxSpeed ? 60 / classProfile.maxSpeed : 1.5;
    
    return {
      id: `fallback-route-${Date.now()}`,
      name: classProfile ? 
        `${classProfile.type.toUpperCase()} fallback route (offline mode)` :
        `Direct route for ${vehicle.height}ft height truck (offline mode)`,
      distance,
      duration: Math.round(distance * speedMultiplier), // Adjust for vehicle class speed
      coordinates: [start, end],
      restrictions: [],
      instructions: [
        { 
          text: `Head towards destination (${distance.toFixed(1)} miles) - ${classProfile ? 'Class restricted routing' : 'Basic routing'}`, 
          distance, 
          time: Math.round(distance * speedMultiplier * 60), 
          sign: 0 
        }
      ]
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
   * Get current GPS position (mock implementation)
   */
  private getCurrentPosition(): { lat: number; lng: number } | null {
    // In a real implementation, this would use the Geolocation API
    // For now, return a mock position
    return { lat: 53.4808, lng: -2.2426 }; // Manchester coordinates
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
