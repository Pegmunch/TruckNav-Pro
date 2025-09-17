export interface VehicleLocation {
  vehicleId: string;
  driverId?: string;
  coordinates: { lat: number; lng: number };
  timestamp: Date;
  speed: number; // mph or km/h depending on region
  heading: number; // degrees
  altitude?: number; // meters
  accuracy?: number; // meters
}

export interface FleetVehicle {
  id: string;
  name: string;
  profileId: string;
  driverId?: string;
  lastLocation?: VehicleLocation;
  status: 'active' | 'inactive' | 'maintenance' | 'offline';
  currentRoute?: string;
  estimatedArrival?: Date;
}

export interface RemoteCommand {
  id: string;
  vehicleId: string;
  type: 'route_update' | 'emergency_stop' | 'status_check' | 'message';
  payload: any;
  timestamp: Date;
  acknowledged: boolean;
}

export class RemoteTrackingService {
  private static instance: RemoteTrackingService;
  private vehicles: Map<string, FleetVehicle> = new Map();
  private locationHistory: Map<string, VehicleLocation[]> = new Map();
  private commands: Map<string, RemoteCommand[]> = new Map();
  private watchPosition?: number;
  private isTracking = false;

  static getInstance(): RemoteTrackingService {
    if (!RemoteTrackingService.instance) {
      RemoteTrackingService.instance = new RemoteTrackingService();
    }
    return RemoteTrackingService.instance;
  }

  /**
   * Start tracking current vehicle location
   */
  startTracking(vehicleId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        resolve(false);
        return;
      }

      this.isTracking = true;
      
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000 // 30 seconds
      };

      this.watchPosition = navigator.geolocation.watchPosition(
        (position) => {
          const location: VehicleLocation = {
            vehicleId,
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            },
            timestamp: new Date(),
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0,
            altitude: position.coords.altitude || undefined,
            accuracy: position.coords.accuracy
          };

          this.updateVehicleLocation(location);
          this.broadcastLocationUpdate(location);
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        options
      );

      resolve(true);
    });
  }

  /**
   * Stop tracking current vehicle
   */
  stopTracking(): void {
    if (this.watchPosition) {
      navigator.geolocation.clearWatch(this.watchPosition);
      this.watchPosition = undefined;
    }
    this.isTracking = false;
  }

  /**
   * Update vehicle location in fleet
   */
  private updateVehicleLocation(location: VehicleLocation): void {
    const vehicle = this.vehicles.get(location.vehicleId);
    if (vehicle) {
      vehicle.lastLocation = location;
      vehicle.status = 'active';
      this.vehicles.set(location.vehicleId, vehicle);
    }

    // Store location history (keep last 100 locations)
    let history = this.locationHistory.get(location.vehicleId) || [];
    history.push(location);
    if (history.length > 100) {
      history = history.slice(-100);
    }
    this.locationHistory.set(location.vehicleId, history);
  }

  /**
   * Broadcast location update to fleet management
   */
  private async broadcastLocationUpdate(location: VehicleLocation): Promise<void> {
    try {
      // In a real implementation, this would send to a fleet management server
      console.log('Broadcasting location update:', location);
      
      // Simulate API call to fleet management system
      // await fetch('/api/fleet/location', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(location)
      // });
    } catch (error) {
      console.error('Failed to broadcast location update:', error);
    }
  }

  /**
   * Register a vehicle in the fleet
   */
  registerVehicle(vehicle: Omit<FleetVehicle, 'status'>): void {
    const fleetVehicle: FleetVehicle = {
      ...vehicle,
      status: 'inactive'
    };
    this.vehicles.set(vehicle.id, fleetVehicle);
  }

  /**
   * Get all vehicles in fleet
   */
  getFleetVehicles(): FleetVehicle[] {
    return Array.from(this.vehicles.values());
  }

  /**
   * Get vehicle location history
   */
  getLocationHistory(vehicleId: string, hours: number = 24): VehicleLocation[] {
    const history = this.locationHistory.get(vehicleId) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return history.filter(loc => loc.timestamp >= cutoff);
  }

  /**
   * Send remote command to vehicle
   */
  async sendCommand(vehicleId: string, type: RemoteCommand['type'], payload: any): Promise<boolean> {
    const command: RemoteCommand = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vehicleId,
      type,
      payload,
      timestamp: new Date(),
      acknowledged: false
    };

    let commands = this.commands.get(vehicleId) || [];
    commands.push(command);
    this.commands.set(vehicleId, commands);

    try {
      // In a real implementation, this would send via cellular/satellite
      console.log('Sending command to vehicle:', command);
      return true;
    } catch (error) {
      console.error('Failed to send command:', error);
      return false;
    }
  }

  /**
   * Get pending commands for a vehicle
   */
  getPendingCommands(vehicleId: string): RemoteCommand[] {
    const commands = this.commands.get(vehicleId) || [];
    return commands.filter(cmd => !cmd.acknowledged);
  }

  /**
   * Acknowledge command receipt
   */
  acknowledgeCommand(commandId: string): void {
    for (const [vehicleId, commands] of Array.from(this.commands.entries())) {
      const command = commands.find((cmd: RemoteCommand) => cmd.id === commandId);
      if (command) {
        command.acknowledged = true;
        break;
      }
    }
  }

  /**
   * Calculate estimated arrival time
   */
  calculateETA(vehicleId: string, destinationCoords: { lat: number; lng: number }): Date | null {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle?.lastLocation) return null;

    const history = this.getLocationHistory(vehicleId, 1); // Last hour
    if (history.length < 2) return null;

    // Calculate average speed from recent history
    let totalDistance = 0;
    let totalTime = 0;
    
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      
      const distance = this.calculateDistance(prev.coordinates, curr.coordinates);
      const time = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000 / 3600; // hours
      
      totalDistance += distance;
      totalTime += time;
    }

    const avgSpeed = totalDistance / totalTime; // mph
    const distanceToDestination = this.calculateDistance(
      vehicle.lastLocation.coordinates,
      destinationCoords
    );

    const etaHours = distanceToDestination / avgSpeed;
    return new Date(Date.now() + etaHours * 60 * 60 * 1000);
  }

  /**
   * Calculate distance between coordinates (same as navigation service)
   */
  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
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

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get current tracking status
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Share route with other vehicles or fleet management
   */
  async shareRoute(routeData: any, shareWith: 'fleet' | 'driver' | string[]): Promise<boolean> {
    try {
      const sharePayload = {
        route: routeData,
        sharedAt: new Date(),
        shareWith,
        sharedBy: 'current_driver' // Would be actual driver ID in real implementation
      };

      console.log('Sharing route:', sharePayload);
      
      // In real implementation, would send to fleet management API
      // await fetch('/api/routes/share', {
      //   method: 'POST', 
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(sharePayload)
      // });
      
      return true;
    } catch (error) {
      console.error('Failed to share route:', error);
      return false;
    }
  }
}

export const remoteTrackingService = RemoteTrackingService.getInstance();