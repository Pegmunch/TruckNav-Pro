/**
 * Speed Display Component for TruckNav Pro
 * Shows current vehicle speed and speed limit in an oval display
 * Automatically adapts units based on country selection (MPH/KPH)
 */

import { memo } from 'react';
import { Shield, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountryPreferences } from '@/hooks/use-country-preferences';
import { useGPS } from '@/contexts/gps-context';

interface SpeedDisplayProps {
  className?: string;
  currentSpeed?: number; // Current vehicle speed in m/s
  speedLimit?: number; // Current road speed limit in km/h
  roadName?: string; // Current road/motorway name (e.g., "M25", "A1", "Oxford Street")
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
  speedLimit,
  roadName
}: SpeedDisplayProps) {
  const { preferences } = useCountryPreferences();
  
  const gps = useGPS();
  const gpsPosition = gps?.position ?? null;
  
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
  
  // Check if speeding (more than 5 over limit for tolerance)
  const isSpeeding = convertedSpeedLimit && convertedSpeed > convertedSpeedLimit + 5;
  const isNearLimit = convertedSpeedLimit && convertedSpeed > convertedSpeedLimit && !isSpeeding;
  
  // Speed limit sign colors (Red circular sign like highway speed limits)
  const getSpeedLimitColor = () => {
    if (!convertedSpeedLimit) return 'text-gray-400 border-gray-400';
    
    // Standard highway speed limit sign: white background, black text, red border
    return 'text-black border-red-600';
  };
  
  // Get speed display color based on speed vs limit
  const getSpeedColor = () => {
    if (isSpeeding) return 'text-red-600 dark:text-red-400';
    if (isNearLimit) return 'text-amber-600 dark:text-amber-400';
    return 'text-blue-600 dark:text-blue-400';
  };
  
  // Determine if road is a motorway/highway for badge styling
  const isMotorway = roadName && /^(M\d+|A\d+M|I-\d+|US-\d+|E\d+)/.test(roadName);
  const isARoad = roadName && /^A\d+/.test(roadName) && !isMotorway;
  
  return (
    <div 
      className={cn(
        "flex items-center justify-between gap-3",
        "backdrop-blur-md rounded-3xl",
        "px-4 py-3 shadow-2xl",
        "text-black dark:text-white font-bold",
        "transition-all duration-300",
        roadName ? "min-w-[280px]" : "min-w-[200px]", // Wider when road name shown
        "h-[64px]",
        isSpeeding && "bg-red-600/95 dark:bg-red-700/90 ring-4 ring-red-500 animate-pulse",
        isNearLimit && "bg-amber-500/95 dark:bg-amber-600/90 ring-2 ring-amber-400",
        !isSpeeding && !isNearLimit && "bg-white/95 dark:bg-black/90 border-2 border-black/10 dark:border-white/10",
        className
      )}
      data-testid="speed-display"
    >
      {/* Speed Limit Section (Left) */}
      <div className="flex items-center gap-3" data-testid="speed-limit-section">
        <div 
          className={cn(
            "flex items-center justify-center",
            "w-12 h-12 rounded-full bg-white shadow-lg",
            "border-[4px]",
            convertedSpeedLimit ? "border-red-600 text-black" : "border-gray-400 text-gray-400"
          )}
          data-testid="speed-limit-sign"
        >
          {convertedSpeedLimit ? (
            <span className="text-lg font-black leading-none" data-testid="speed-limit-value">
              {convertedSpeedLimit}
            </span>
          ) : (
            <Shield className="w-5 h-5" />
          )}
        </div>
        {convertedSpeedLimit && (
          <span className={cn(
            "text-xs font-black uppercase",
            isSpeeding ? "text-white" : "text-gray-700 dark:text-gray-300"
          )} data-testid="speed-limit-unit">
            {speedUnit}
          </span>
        )}
      </div>
      
      {/* Separator */}
      <div className={cn(
        "w-[2px] h-10 rounded-full",
        isSpeeding ? "bg-white/40" : "bg-black/20 dark:bg-white/20"
      )} />
      
      {/* Vehicle Speed Section (Middle) */}
      <div className="flex items-center gap-3" data-testid="vehicle-speed-section">
        <Gauge className={cn(
          "w-6 h-6 transition-colors duration-300",
          isSpeeding ? "text-white" : isNearLimit ? "text-white" : getSpeedColor()
        )} />
        <div className="text-right">
          <div className={cn(
            "text-3xl font-black transition-colors duration-300",
            isSpeeding ? "text-white" : isNearLimit ? "text-white" : getSpeedColor()
          )} data-testid="vehicle-speed-value">
            {convertedSpeed}
          </div>
          <div className={cn(
            "text-xs font-black uppercase -mt-1 transition-colors duration-300",
            isSpeeding ? "text-white" : isNearLimit ? "text-white" : getSpeedColor()
          )} data-testid="vehicle-speed-unit">
            {speedUnit}
          </div>
        </div>
      </div>
      
      {/* Road Name Section (Right) - Only shown during navigation with road name */}
      {roadName && (
        <>
          {/* Separator */}
          <div className={cn(
            "w-[2px] h-10 rounded-full",
            isSpeeding ? "bg-white/40" : "bg-black/20 dark:bg-white/20"
          )} />
          
          <div className="flex items-center" data-testid="road-name-section">
            <div className={cn(
              "px-3 py-1.5 rounded-lg font-black text-sm shadow-md transition-all duration-300",
              isMotorway && !isSpeeding && !isNearLimit && "bg-blue-600 text-white",
              isARoad && !isSpeeding && !isNearLimit && "bg-green-600 text-white",
              !isMotorway && !isARoad && !isSpeeding && !isNearLimit && "bg-gray-600 text-white",
              (isSpeeding || isNearLimit) && "bg-white/30 text-white"
            )} data-testid="road-name-badge">
              {roadName}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default SpeedDisplay;