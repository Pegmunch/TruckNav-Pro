/**
 * Speed Limit Hook for TruckNav Pro
 * 
 * Fetches real-time speed limit data from OpenStreetMap Overpass API
 * with intelligent fallback based on road type
 * 
 * Features:
 * - Queries every 5 seconds based on GPS location
 * - 100m radius coverage
 * - Confidence indicators (high/medium/low/none)
 * - Automatic mph/km/h conversion based on country
 * - Road type fallback estimates
 */

import { useState, useEffect, useRef } from 'react';
import { useGPS } from '@/contexts/gps-context';
import { useCountryPreferences } from '@/hooks/use-country-preferences';

export interface SpeedLimitData {
  speedLimit: number | null; // in km/h from API
  speedLimitDisplay: number | null; // converted to user's preferred unit
  unit: 'mph' | 'km/h';
  confidence: 'high' | 'medium' | 'low' | 'none';
  source: 'openstreetmap' | 'estimated' | 'not_found' | 'variable' | 'error';
  roadType?: string;
  roadName?: string;
  roadRef?: string;
  junction?: {
    name: string | null;
    ref: string | null;
    exitTo: string | null;
  } | null;
  destination?: string | null;
  destinationRef?: string | null;
  isLoading: boolean;
  lastUpdated: number | null;
}

// Countries that use mph (most use km/h)
const MPH_COUNTRIES = ['GB', 'US', 'LR', 'MM'];

/**
 * Hook to fetch and manage speed limit data based on GPS location
 */
export function useSpeedLimit() {
  const gps = useGPS();
  const { preferences } = useCountryPreferences();
  
  const [speedLimitData, setSpeedLimitData] = useState<SpeedLimitData>({
    speedLimit: null,
    speedLimitDisplay: null,
    unit: 'mph',
    confidence: 'none',
    source: 'not_found',
    isLoading: false,
    lastUpdated: null
  });

  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    // Only fetch if we have a GPS position
    if (!gps?.position) {
      return;
    }

    const { latitude, longitude } = gps.position;

    // Determine unit based on country
    const usesMph = MPH_COUNTRIES.includes(preferences.country.code);
    const unit = usesMph ? 'mph' : 'km/h';

    const fetchSpeedLimit = async () => {
      // Prevent concurrent fetches
      if (isFetchingRef.current) {
        return;
      }

      const now = Date.now();
      
      // Only fetch if 5 seconds have passed since last fetch
      if (now - lastFetchRef.current < 5000) {
        return;
      }

      try {
        isFetchingRef.current = true;
        setSpeedLimitData(prev => ({ ...prev, isLoading: true }));

        const response = await fetch(`/api/speed-limit?lat=${latitude}&lng=${longitude}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Convert km/h to mph if needed
        let displaySpeed: number | null = null;
        if (data.speedLimit !== null) {
          displaySpeed = usesMph 
            ? Math.round(data.speedLimit * 0.621371) // km/h to mph
            : data.speedLimit;
        }

        setSpeedLimitData({
          speedLimit: data.speedLimit,
          speedLimitDisplay: displaySpeed,
          unit,
          confidence: data.confidence || 'none',
          source: data.source || 'not_found',
          roadType: data.roadType,
          roadName: data.roadName,
          roadRef: data.roadRef,
          junction: data.junction || null,
          destination: data.destination || null,
          destinationRef: data.destinationRef || null,
          isLoading: false,
          lastUpdated: now
        });

        lastFetchRef.current = now;

      } catch (error) {
        // Silently handle errors - speed limit data is not critical
        // IMPORTANT: Preserve road name/ref on error to prevent flashing
        setSpeedLimitData(prev => ({
          ...prev,
          // Keep speed limit and road info from previous state
          speedLimit: prev.speedLimit,
          speedLimitDisplay: prev.speedLimitDisplay,
          roadName: prev.roadName,
          roadRef: prev.roadRef,
          roadType: prev.roadType,
          junction: prev.junction,
          destination: prev.destination,
          destinationRef: prev.destinationRef,
          confidence: prev.confidence !== 'none' ? prev.confidence : 'none',
          source: 'error',
          isLoading: false,
          lastUpdated: Date.now()
        }));
      } finally {
        isFetchingRef.current = false;
      }
    };

    // Fetch immediately on location change
    fetchSpeedLimit();

    // Set up interval for periodic updates (every 5 seconds)
    const intervalId = setInterval(fetchSpeedLimit, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [gps?.position?.latitude, gps?.position?.longitude, preferences.country.code]);

  return speedLimitData;
}

/**
 * Helper function to determine if currently speeding
 */
export function isSpeeding(
  currentSpeed: number, // in mph or km/h (same unit as speedLimit)
  speedLimit: number | null,
  tolerance: number = 0 // allow small tolerance
): boolean {
  if (speedLimit === null || currentSpeed <= 0) {
    return false;
  }
  
  return currentSpeed > (speedLimit + tolerance);
}

/**
 * Get confidence color for badge display
 */
export function getConfidenceColor(confidence: SpeedLimitData['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'bg-green-600/20 text-green-300 border-green-500/30';
    case 'medium':
      return 'bg-amber-600/20 text-amber-300 border-amber-500/30';
    case 'low':
      return 'bg-orange-600/20 text-orange-300 border-orange-500/30';
    default:
      return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
  }
}

/**
 * Get confidence label for display
 */
export function getConfidenceLabel(confidence: SpeedLimitData['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'Verified';
    case 'medium':
      return 'Estimated';
    case 'low':
      return 'Approximate';
    default:
      return 'Unknown';
  }
}
