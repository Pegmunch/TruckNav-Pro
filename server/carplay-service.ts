import { registerPlugin } from '@capacitor/core';

interface CarPlayPlugin {
  startNavigationSession(options: {
    routeId: string;
    startLocation: string;
    endLocation: string;
    distance: number;
    duration: number;
  }): Promise<{ success: boolean }>;
  
  updateRouteProgress(options: {
    distanceRemaining: number;
    timeRemaining: number;
    currentManeuver: string;
  }): Promise<{ success: boolean }>;
  
  endNavigationSession(): Promise<{ success: boolean }>;
  
  showAlternativeRoute(options: {
    routeId: string;
    distance: number;
    duration: number;
    timeSavings: number;
  }): Promise<{ accepted: boolean }>;
}

const CarPlay = registerPlugin<CarPlayPlugin>('CarPlay');

export class CarPlayService {
  static isCarPlayAvailable(): Promise<boolean> {
    return Promise.resolve(true); // Will be true only on iOS devices with CarPlay
  }

  static async startNavigation(route: {
    id: string;
    startLocation: string;
    endLocation: string;
    distance: number;
    duration: number;
  }) {
    try {
      const result = await CarPlay.startNavigationSession({
        routeId: route.id,
        startLocation: route.startLocation,
        endLocation: route.endLocation,
        distance: route.distance,
        duration: route.duration,
      });
      console.log('CarPlay navigation started:', result);
      return result;
    } catch (error) {
      console.error('Error starting CarPlay navigation:', error);
      return { success: false };
    }
  }

  static async updateProgress(progress: {
    distanceRemaining: number;
    timeRemaining: number;
    currentManeuver: string;
  }) {
    try {
      return await CarPlay.updateRouteProgress({
        distanceRemaining: progress.distanceRemaining,
        timeRemaining: progress.timeRemaining,
        currentManeuver: progress.currentManeuver,
      });
    } catch (error) {
      console.error('Error updating CarPlay progress:', error);
      return { success: false };
    }
  }

  static async endNavigation() {
    try {
      return await CarPlay.endNavigationSession();
    } catch (error) {
      console.error('Error ending CarPlay navigation:', error);
      return { success: false };
    }
  }

  static async showAlternativeRoute(altRoute: {
    id: string;
    distance: number;
    duration: number;
    timeSavings: number;
  }) {
    try {
      return await CarPlay.showAlternativeRoute({
        routeId: altRoute.id,
        distance: altRoute.distance,
        duration: altRoute.duration,
        timeSavings: altRoute.timeSavings,
      });
    } catch (error) {
      console.error('Error showing alternative route on CarPlay:', error);
      return { accepted: false };
    }
  }
}
