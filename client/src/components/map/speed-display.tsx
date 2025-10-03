/**
 * Speed Display Component for TruckNav Pro
 * Shows current vehicle speed and speed limit in an oval display
 * Automatically adapts units based on country selection (MPH/KPH)
 */

import { memo } from 'react';
import { Shield, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountryPreferences } from '@/hooks/use-country-preferences';
import { useGPSTracking } from '@/hooks/use-gps-tracking';

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
  
  const { position: gpsPosition } = useGPSTracking({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 1000,
    enableHeadingSmoothing: false
  });
  
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
  
  // Get live speed from centralized GPS hook
  const liveSpeed = gpsPosition?.speed ?? 0;
  
  // Use live speed or provided current speed
  const displaySpeed = currentSpeed > 0 ? currentSpeed : Math.max(0, liveSpeed);
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
        "bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-full",
        "px-6 py-3 shadow-lg border border-black/20 dark:border-white/20",
        "text-black dark:text-white font-semibold",
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