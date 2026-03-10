import { useEffect, useCallback } from 'react';

interface UseCarPlayOptions {
  routeId?: string;
  startLocation?: string;
  endLocation?: string;
  distance?: number;
  duration?: number;
  isNavigating?: boolean;
}

// CarPlay Service - calls backend API instead of importing server module
const CarPlayService = {
  async startNavigation(route: { id: string; startLocation: string; endLocation: string; distance: number; duration: number }) {
    try {
      const response = await fetch('/api/carplay/start-navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(route),
      });
      return await response.json();
    } catch (error) {
      console.error('Error starting CarPlay navigation:', error);
      return { success: false };
    }
  },

  async updateProgress(progress: { distanceRemaining: number; timeRemaining: number; currentManeuver: string }) {
    try {
      const response = await fetch('/api/carplay/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progress),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating CarPlay progress:', error);
      return { success: false };
    }
  },

  async endNavigation() {
    try {
      const response = await fetch('/api/carplay/end-navigation', { method: 'POST' });
      return await response.json();
    } catch (error) {
      console.error('Error ending CarPlay navigation:', error);
      return { success: false };
    }
  },

  async showAlternativeRoute(altRoute: { id: string; distance: number; duration: number; timeSavings: number }) {
    try {
      const response = await fetch('/api/carplay/show-alternative-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(altRoute),
      });
      return await response.json();
    } catch (error) {
      console.error('Error showing alternative route:', error);
      return { accepted: false };
    }
  },
};

export function useCarPlay(options: UseCarPlayOptions) {
  const {
    routeId,
    startLocation,
    endLocation,
    distance,
    duration,
    isNavigating,
  } = options;

  // Start CarPlay navigation when route is ready
  useEffect(() => {
    if (!isNavigating || !routeId || !startLocation || !endLocation || !distance || !duration) {
      return;
    }

    const startCarPlayNav = async () => {
      const result = await CarPlayService.startNavigation({
        id: routeId,
        startLocation,
        endLocation,
        distance,
        duration,
      });
      
      if (result.success) {
        console.log('✅ CarPlay navigation started successfully');
      }
    };

    startCarPlayNav();
  }, [isNavigating, routeId, startLocation, endLocation, distance, duration]);

  // Update progress during navigation
  const updateProgress = useCallback(async (
    distanceRemaining: number,
    timeRemaining: number,
    currentManeuver: string
  ) => {
    if (!isNavigating) return;
    
    return await CarPlayService.updateProgress({
      distanceRemaining,
      timeRemaining,
      currentManeuver,
    });
  }, [isNavigating]);

  // End CarPlay navigation
  const endNavigation = useCallback(async () => {
    return await CarPlayService.endNavigation();
  }, []);

  // Show alternative route on CarPlay
  const showAlternativeRoute = useCallback(async (
    altRouteId: string,
    distance: number,
    duration: number,
    timeSavings: number
  ) => {
    return await CarPlayService.showAlternativeRoute({
      id: altRouteId,
      distance,
      duration,
      timeSavings,
    });
  }, []);

  return {
    updateProgress,
    endNavigation,
    showAlternativeRoute,
  };
}
