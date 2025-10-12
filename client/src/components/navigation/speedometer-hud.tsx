/**
 * SpeedometerHUD Component for TruckNav Pro
 * Redesigned long, thin speedometer bar with solid backgrounds
 * Features speed limit on left, current speed in center, road info on right
 */

import { memo, useState, useEffect } from 'react';
import { Shield, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGPS } from '@/contexts/gps-context';
import { useMeasurement } from '@/components/measurement/measurement-provider';
import { useSpeedLimit } from '@/hooks/use-speed-limit';
import { useToast } from '@/hooks/use-toast';

interface SpeedometerHUDProps {
  className?: string;
  currentSpeed?: number; // Override speed in m/s
  speedLimit?: number; // Override speed limit in km/h
  roadInfo?: {
    confidence: 'high' | 'medium' | 'low' | 'none';
    roadRef: string | null;
    junction: { name: string | null; ref: string | null; exitTo: string | null } | null;
    destination: string | null;
  } | null;
  onUnitToggle?: () => void;
  isNavigating?: boolean;
}

/**
 * Long, thin speedometer bar with solid backgrounds
 */
const SpeedometerHUD = memo(function SpeedometerHUD({
  className,
  currentSpeed,
  speedLimit: propSpeedLimit,
  roadInfo: propRoadInfo,
  onUnitToggle,
  isNavigating = false
}: SpeedometerHUDProps) {
  // Get GPS data and measurement preferences
  const gps = useGPS();
  const { system: measurementSystem, setSystem } = useMeasurement();
  const speedLimitData = useSpeedLimit();
  const { toast } = useToast();
  
  // State for smooth speed animation
  const [animatedSpeed, setAnimatedSpeed] = useState(0);
  const [showJunctionInfo, setShowJunctionInfo] = useState(false);
  
  // Use provided data or fetch from hooks
  const gpsSpeed = gps?.position?.speed ?? 0;
  const displaySpeed = currentSpeed ?? gpsSpeed;
  
  // Speed limit and road info (prioritize props over hook data)
  const speedLimit = propSpeedLimit ?? speedLimitData.speedLimit;
  const roadInfo = propRoadInfo ?? {
    confidence: speedLimitData.confidence,
    roadRef: speedLimitData.roadRef ?? null,
    junction: speedLimitData.junction ?? null,
    destination: speedLimitData.destination ?? null
  };
  
  // Unit conversion helpers
  const usesMPH = measurementSystem === 'imperial';
  const speedUnit = usesMPH ? 'MPH' : 'KM/H';
  
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
  
  // Calculate display values
  const convertedSpeed = convertSpeed(Math.max(0, displaySpeed));
  const convertedSpeedLimit = speedLimit ? convertSpeedLimit(speedLimit) : null;
  
  // Determine speed status - simpler logic
  const isSpeeding = convertedSpeedLimit && convertedSpeed > convertedSpeedLimit;
  
  // Smooth speed animation
  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      setAnimatedSpeed(prev => {
        const diff = convertedSpeed - prev;
        if (Math.abs(diff) < 0.5) return convertedSpeed;
        return prev + diff * 0.3; // Slightly faster transition
      });
    });
    
    return () => cancelAnimationFrame(animationFrame);
  }, [convertedSpeed]);
  
  // Get speed text color based on status
  const getSpeedColor = () => {
    if (isSpeeding) return 'text-white'; // White when speeding (red background)
    return 'text-slate-900 dark:text-white';
  };
  
  // Road type badge color (UK motorway standards)
  const getRoadBadgeColor = (ref: string) => {
    if (ref.match(/^M\d/)) return 'bg-blue-600 text-white'; // UK Motorways
    if (ref.match(/^A\d/)) return 'bg-green-600 text-white'; // UK A-roads
    if (ref.match(/^B\d/)) return 'bg-amber-600 text-white'; // UK B-roads
    if (ref.match(/^I-/)) return 'bg-blue-700 text-white'; // US Interstate
    if (ref.match(/^US-/)) return 'bg-green-700 text-white'; // US Highway
    if (ref.match(/^E\d/)) return 'bg-blue-800 text-white'; // European routes
    return 'bg-slate-600 text-white'; // Other roads
  };
  
  // Handle unit toggle
  const handleUnitToggle = () => {
    if (onUnitToggle) {
      onUnitToggle();
    } else {
      setSystem(measurementSystem === 'imperial' ? 'metric' : 'imperial');
    }
  };
  
  // Handle motorway sign click
  const handleMotorwayClick = () => {
    if (roadInfo.junction) {
      setShowJunctionInfo(true);
      toast({
        title: `${roadInfo.roadRef || 'Road'} Junction ${roadInfo.junction.ref}`,
        description: roadInfo.junction.exitTo ? `Exit to: ${roadInfo.junction.exitTo}` : 
                     roadInfo.destination ? `Towards: ${roadInfo.destination}` : 
                     'Junction information',
      });
      setTimeout(() => setShowJunctionInfo(false), 3000);
    }
  };
  
  return (
    <div
      className={cn(
        'relative',
        className
      )}
      data-testid="speedometer-hud"
    >
      {/* Main speedometer bar - MUCH LONGER AND THINNER */}
      <div
        className={cn(
          // New dimensions: much wider and thinner
          'relative w-[360px] h-[60px] sm:w-[380px] sm:h-[64px] md:w-[400px] md:h-[64px]',
          // Solid background - changes color when speeding
          isSpeeding 
            ? 'bg-red-600 dark:bg-red-700' 
            : 'bg-slate-950 dark:bg-slate-900',
          // Border
          'border border-slate-700',
          // Less rounded corners for more rectangular look
          'rounded-2xl',
          // Shadow for depth
          'shadow-xl',
          // Smooth transition for background color changes
          'transition-all duration-500 ease-in-out'
        )}
      >
        {/* Inner container with horizontal layout */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          
          {/* LEFT: Speed Limit Badge (pill shape) */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                // Pill shape instead of circle
                'flex items-center gap-2 px-3 py-1.5',
                'rounded-full',
                // Background colors
                isSpeeding 
                  ? 'bg-white/20 border-2 border-white'
                  : convertedSpeedLimit 
                    ? 'bg-red-600 dark:bg-red-700 border-2 border-red-500'
                    : 'bg-slate-800 dark:bg-slate-700 border-2 border-slate-600',
                'shadow-md',
                'transition-all duration-300'
              )}
              data-testid="speed-limit-display"
            >
              <Shield className="w-4 h-4 text-white" />
              {convertedSpeedLimit ? (
                <span className="text-lg font-bold text-white tabular-nums">
                  {convertedSpeedLimit}
                </span>
              ) : (
                <span className="text-sm font-medium text-white/70">--</span>
              )}
            </div>
            
            {/* Vertical divider */}
            <div className="h-8 w-px bg-slate-600 dark:bg-slate-500" />
          </div>
          
          {/* CENTER: Current Speed (Large and prominent) */}
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="flex items-baseline gap-2">
              {/* Speed value */}
              <span
                className={cn(
                  'text-4xl font-bold tabular-nums',
                  getSpeedColor(),
                  'transition-colors duration-300'
                )}
                data-testid="current-speed-value"
              >
                {Math.round(animatedSpeed)}
              </span>
              
              {/* Speed unit (clickable for toggle) */}
              <button
                onClick={handleUnitToggle}
                className={cn(
                  'text-sm font-medium uppercase',
                  isSpeeding 
                    ? 'text-white/80 hover:text-white' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                  'transition-colors duration-200',
                  'cursor-pointer select-none',
                  'focus:outline-none',
                  'px-1'
                )}
                data-testid="speed-unit-toggle"
              >
                {speedUnit}
              </button>
            </div>
            
            {/* GPS status (only if no GPS) */}
            {!gps?.position && (
              <div className="absolute -bottom-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] text-amber-500 font-medium">NO GPS</span>
              </div>
            )}
          </div>
          
          {/* RIGHT: Motorway Sign (Interactive) */}
          <div className="flex items-center gap-3">
            {/* Vertical divider */}
            {roadInfo.roadRef && (
              <div className="h-8 w-px bg-slate-600 dark:bg-slate-500" />
            )}
            
            {roadInfo.roadRef ? (
              <button
                onClick={handleMotorwayClick}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5',
                  'rounded-lg',
                  'font-bold text-sm',
                  getRoadBadgeColor(roadInfo.roadRef),
                  'shadow-md',
                  'hover:scale-105 active:scale-100',
                  'transition-transform duration-200',
                  'cursor-pointer'
                )}
                data-testid="road-ref-badge"
              >
                <span className="font-black">{roadInfo.roadRef}</span>
                {roadInfo.junction?.ref && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-xs">J{roadInfo.junction.ref}</span>
                  </>
                )}
              </button>
            ) : isNavigating ? (
              <div className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700">
                <span className="text-xs font-medium text-slate-400">
                  No road data
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

export default SpeedometerHUD;