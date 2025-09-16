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
}

export interface VehicleDimensions {
  height: number; // feet
  width: number; // feet
  length: number; // feet
  weight: number; // tonnes
  axles: number;
  isHazmat: boolean;
}

export class TruckNavigationService {
  private static instance: TruckNavigationService;

  static getInstance(): TruckNavigationService {
    if (!TruckNavigationService.instance) {
      TruckNavigationService.instance = new TruckNavigationService();
    }
    return TruckNavigationService.instance;
  }

  /**
   * Calculate route avoiding restrictions based on vehicle dimensions
   */
  async calculateSafeRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    vehicle: VehicleDimensions
  ): Promise<NavigationRoute | null> {
    try {
      // In a real implementation, this would integrate with a routing service
      // like HERE Maps, Google Maps, or OpenStreetMap with truck routing
      
      const mockRoute: NavigationRoute = {
        id: `route-${Date.now()}`,
        name: `Safe route for ${vehicle.height}'H truck`,
        distance: this.calculateDistance(start, end),
        duration: Math.round(this.calculateDistance(start, end) * 1.2), // rough estimate
        coordinates: [start, end],
        restrictions: [],
      };

      return mockRoute;
    } catch (error) {
      console.error('Error calculating route:', error);
      return null;
    }
  }

  /**
   * Check if vehicle can pass through a restriction
   */
  canPassRestriction(
    restriction: { type: string; limit: number },
    vehicle: VehicleDimensions
  ): boolean {
    switch (restriction.type) {
      case 'height':
        return vehicle.height <= restriction.limit;
      case 'width':
        return vehicle.width <= restriction.limit;
      case 'weight':
        return vehicle.weight <= restriction.limit;
      case 'length':
        return vehicle.length <= restriction.limit;
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
}

export const navigationService = TruckNavigationService.getInstance();
