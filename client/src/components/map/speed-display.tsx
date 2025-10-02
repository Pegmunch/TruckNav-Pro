/**
 * Speed Display Component for TruckNav Pro
 * Shows current vehicle speed and speed limit in an oval display
 * Automatically adapts units based on country selection (MPH/KPH)
 */

import { memo, useState, useEffect } from 'react';
import { Shield, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountryPreferences } from '@/hooks/use-country-preferences';

interface SpeedDisplayProps {
  className?: string;
  currentSpeed?: number; // Current vehicle speed in m/s
  speedLimit?: number; // Current road speed limit in km/h
}

// Countries that use MPH (primarily US, UK, and some territories)
// All other countries use KPH by default
const MPH_COUNTRIES = [
  'US', // United States
  'GB', // United Kingdom
  'LR', // Liberia
  'MM', // Myanmar (Burma)
  'AS', // American Samoa
  'GU', // Guam
  'MP', // Northern Mariana Islands
  'PR', // Puerto Rico
  'VI'  // US Virgin Islands
];

/**
 * Speed Display Component
 * Shows speed limit sign (left) and current vehicle speed (right)
 */
const SpeedDisplay = memo(function SpeedDisplay({
  className,
  currentSpeed = 0,
  speedLimit
}: SpeedDisplayProps) {
  const { preferences } = useCountryPreferences();
  const [liveSpeed, setLiveSpeed] = useState(0);
  
  // Determine if country uses MPH or KPH
  const usesMPH = MPH_COUNTRIES.includes(preferences.country.code);
  const speedUnit = usesMPH ? 'MPH' : 'KPH';
  const speedLimitUnit = usesMPH ? 'MPH' : '';
  
  // Convert speed from m/s to appropriate unit
  const convertSpeed = (speedMs: number): number => {
    if (usesMPH) {
      return Math.round(speedMs * 2.237); // m/s to mph
    }
    return Math.round(speedMs * 3.6); // m/s to km/h
  };
  
  // Convert speed limit from km/h to appropriate unit
  const convertSpeedLimit = (speedKmh: number): number => {
    if (usesMPH) {
      return Math.round(speedKmh * 0.621371); // km/h to mph
    }
    return speedKmh; // already in km/h
  };
  
  // Live speed tracking using GPS with Safari compatibility
  useEffect(() => {
    let watchId: number;
    
    const startSpeedTracking = async () => {
      if (!('geolocation' in navigator)) {
        return;
      }
      
      try {
        // Safari requires explicit permission request
        const permission = await navigator.permissions?.query({name: 'geolocation'});
        if (permission && permission.state === 'denied') {
          return;
        }
        
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            // Use GPS speed if available, otherwise calculate from position changes
            const speed = position.coords.speed || 0; // Speed in m/s
            setLiveSpeed(Math.max(0, speed)); // Ensure non-negative speed
          },
          (error) => {
            // Silently handle geolocation errors in Safari
            if (error.code !== error.PERMISSION_DENIED) {
              console.debug('Speed tracking unavailable:', error.message);
            }
          },
          {
            enableHighAccuracy: true, // High accuracy for precise speed readings
            timeout: 10000,
            maximumAge: 1000 // Fresh data for accurate speed
          }
        );
      } catch (error) {
        // Permission API not supported in all Safari versions
        try {
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const speed = position.coords.speed || 0;
              setLiveSpeed(Math.max(0, speed));
            },
            () => {}, // Silent error handling for Safari
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 1000
            }
          );
        } catch (fallbackError) {
          // Geolocation completely unavailable
        }
      }
    };
    
    startSpeedTracking();
    
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);
  
  // Use live speed or provided current speed
  const displaySpeed = currentSpeed > 0 ? currentSpeed : liveSpeed;
  const convertedSpeed = convertSpeed(displaySpeed);
  const convertedSpeedLimit = speedLimit ? convertSpeedLimit(speedLimit) : null;
  
  // Speed limit sign colors (Red circular sign like highway speed limits)
  const getSpeedLimitColor = () => {
    if (!convertedSpeedLimit) return 'text-gray-400 border-gray-400';
    
    // Standard highway speed limit sign: white background, black text, red border
    return 'text-black border-red-600';
  };
  
  return (
    <div 
      className={cn(
        "flex items-center justify-between",
        "bg-yellow-400 backdrop-blur-sm rounded-full",
        "px-6 py-3 shadow-lg border border-yellow-600",
        "text-gray-900 font-semibold",
        "min-w-[220px] h-[60px]",
        "transition-all duration-300",
        className
      )}
      data-testid="speed-display"
    >
      {/* Speed Limit Section (Left) */}
      <div className="flex items-center gap-2" data-testid="speed-limit-section">
        <div 
          className={cn(
            "flex items-center justify-center",
            "w-10 h-10 rounded-full border-4 bg-white",
            convertedSpeedLimit ? getSpeedLimitColor() : "border-gray-400 text-gray-400"
          )}
          data-testid="speed-limit-sign"
        >
          {convertedSpeedLimit ? (
            <span className="text-sm font-bold" data-testid="speed-limit-value">
              {convertedSpeedLimit}
            </span>
          ) : (
            <Shield className="w-4 h-4" />
          )}
        </div>
        {convertedSpeedLimit && (
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200" data-testid="speed-limit-unit">
            {speedUnit}
          </span>
        )}
      </div>
      
      {/* Separator */}
      <div className="w-px h-8 bg-black/30 dark:bg-white/30" />
      
      {/* Vehicle Speed Section (Right) */}
      <div className="flex items-center gap-2" data-testid="vehicle-speed-section">
        <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <div className="text-right">
          <div className="text-2xl font-bold" data-testid="vehicle-speed-value">
            {convertedSpeed}
          </div>
          <div className="text-sm font-bold text-blue-600 dark:text-blue-400 -mt-1" data-testid="vehicle-speed-unit">
            {speedUnit}
          </div>
        </div>
      </div>
    </div>
  );
});

export default SpeedDisplay;