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

export class TruckNavigationService {
  private static instance: TruckNavigationService;

  static getInstance(): TruckNavigationService {
    if (!TruckNavigationService.instance) {
      TruckNavigationService.instance = new TruckNavigationService();
    }
    return TruckNavigationService.instance;
  }

  /**
   * Calculate route avoiding restrictions based on vehicle dimensions using GraphHopper
   */
  async calculateSafeRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    vehicle: VehicleDimensions
  ): Promise<NavigationRoute | null> {
    try {
      const apiKey = import.meta.env.VITE_GRAPHHOPPER_API_KEY || 'GRAPHHOPPER_API_KEY';
      if (!apiKey || apiKey === 'GRAPHHOPPER_API_KEY') {
        console.error('GraphHopper API key not found');
        return this.createFallbackRoute(start, end, vehicle);
      }

      // Convert feet to meters for GraphHopper API (UK uses feet internally, but API expects meters)
      const heightMeters = (vehicle.height * 0.3048); // feet to meters
      const widthMeters = (vehicle.width * 0.3048); // feet to meters
      const weightKg = (vehicle.weight * 1000); // tonnes to kg
      const lengthMeters = (vehicle.length * 0.3048); // feet to meters

      const params = new URLSearchParams({
        point: `${start.lat},${start.lng}`,
        'point[1]': `${end.lat},${end.lng}`,
        vehicle: 'truck',
        'vehicle.height': heightMeters.toString(),
        'vehicle.width': widthMeters.toString(),
        'vehicle.weight': weightKg.toString(),
        'vehicle.length': lengthMeters.toString(),
        'vehicle.axle_load': '11500', // Standard EU axle load limit in kg
        locale: 'en-GB',
        instructions: 'true',
        calc_points: 'true',
        debug: 'false',
        elevation: 'false',
        points_encoded: 'false',
        type: 'json',
        key: apiKey
      });

      // Add hazmat routing if vehicle carries hazardous materials
      if (vehicle.isHazmat) {
        params.append('vehicle.hazmat', 'true');
      }

      const response = await fetch(`https://graphhopper.com/api/1/route?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('GraphHopper API error:', response.status, response.statusText);
        return this.createFallbackRoute(start, end, vehicle);
      }

      const data = await response.json();
      
      if (data.paths && data.paths.length > 0) {
        const path = data.paths[0];
        
        return {
          id: `route-${Date.now()}`,
          name: `Truck route for ${vehicle.height}ft (${heightMeters.toFixed(1)}m) height vehicle`,
          distance: Math.round(path.distance / 1609.34 * 100) / 100, // meters to miles, rounded
          duration: Math.round(path.time / 60000), // milliseconds to minutes
          coordinates: path.points.coordinates.map((coord: number[]) => ({ 
            lat: coord[1], 
            lng: coord[0] 
          })),
          restrictions: [], // GraphHopper handles restrictions internally
          instructions: path.instructions?.map((inst: any) => ({
            text: inst.text,
            distance: Math.round(inst.distance / 1609.34 * 100) / 100, // meters to miles
            time: Math.round(inst.time / 1000), // milliseconds to seconds
            sign: inst.sign
          })) || [],
          bbox: path.bbox ? {
            minLat: path.bbox[1],
            minLng: path.bbox[0], 
            maxLat: path.bbox[3],
            maxLng: path.bbox[2]
          } : undefined
        };
      } else {
        console.error('No route found from GraphHopper');
        return this.createFallbackRoute(start, end, vehicle);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      return this.createFallbackRoute(start, end, vehicle);
    }
  }

  /**
   * Create a fallback route when API is unavailable
   */
  private createFallbackRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    vehicle: VehicleDimensions
  ): NavigationRoute {
    return {
      id: `fallback-route-${Date.now()}`,
      name: `Direct route for ${vehicle.height}ft height truck (offline mode)`,
      distance: this.calculateDistance(start, end),
      duration: Math.round(this.calculateDistance(start, end) * 1.5), // rough estimate with truck speeds
      coordinates: [start, end],
      restrictions: [],
      instructions: [
        { text: `Head towards destination (${this.calculateDistance(start, end).toFixed(1)} miles)`, distance: this.calculateDistance(start, end), time: Math.round(this.calculateDistance(start, end) * 1.5 * 60), sign: 0 }
      ]
    };
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
