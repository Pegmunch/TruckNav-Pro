/**
 * SpeedometerHUD Component for TruckNav Pro
 * Oval-shaped speedometer with white background and clean design
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
 * Oval-shaped speedometer with white background
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
  const { system: measurementSystem, region, setSystem } = useMeasurement();
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
    if (isSpeeding) return 'text-white'; // White text on red background when speeding
    return 'text-gray-900 dark:text-gray-900'; // Dark text on white background normally
  };
  
  // Country-authentic road badge styling
  // Returns object with background, text color, border, and special styling
  // IMPORTANT: Check region FIRST, then road type, to avoid misclassifying European A-roads as UK
  const getRoadBadgeStyle = (ref: string): { 
    bg: string; 
    text: string; 
    border: string; 
    shape: 'rectangle' | 'shield' | 'oval';
    specialStyle?: string;
  } => {
    // ===== UK REGION =====
    if (region === 'uk') {
      // UK Motorways (M1, M25, etc.) - Blue background, white text
      if (ref.match(/^M\d/)) {
        return { 
          bg: 'bg-[#0063B0]', // BS 381C Middle Blue
          text: 'text-white font-black',
          border: 'border-2 border-white',
          shape: 'rectangle'
        };
      }
      // UK Primary A-roads (A1, A404, etc.) - Green background, YELLOW route number
      if (ref.match(/^A\d/)) {
        return { 
          bg: 'bg-[#00703C]', // BS 381C Middle Brunswick Green
          text: 'text-yellow-300 font-black',
          border: 'border-2 border-white',
          shape: 'rectangle'
        };
      }
      // UK B-roads - White background, black text
      if (ref.match(/^B\d/)) {
        return { 
          bg: 'bg-white',
          text: 'text-black font-bold',
          border: 'border-2 border-black',
          shape: 'rectangle'
        };
      }
    }
    
    // ===== USA REGION =====
    if (region === 'usa') {
      // USA Interstate (I-95, I-405, etc.) - Red/Blue shield
      if (ref.match(/^I-?\d/)) {
        return { 
          bg: 'bg-[#003F87]', // Interstate blue
          text: 'text-white font-black',
          border: 'border-2 border-white',
          shape: 'shield',
          specialStyle: 'interstate'
        };
      }
      // USA US Routes (US-1, US-66, etc.) - Black and white shield
      if (ref.match(/^US-?\d/)) {
        return { 
          bg: 'bg-white',
          text: 'text-black font-bold',
          border: 'border-2 border-black',
          shape: 'shield'
        };
      }
      // USA State Routes - White shield with black
      if (ref.match(/^SR-?\d|^State\s/i)) {
        return { 
          bg: 'bg-white',
          text: 'text-black font-bold',
          border: 'border-2 border-black',
          shape: 'rectangle'
        };
      }
    }
    
    // ===== EUROPE REGION =====
    if (region === 'europe') {
      // European E-roads (E15, E40, etc.) - Green background, white text
      if (ref.match(/^E\d/)) {
        return { 
          bg: 'bg-[#006B3F]', // European green
          text: 'text-white font-black',
          border: 'border-2 border-white',
          shape: 'rectangle'
        };
      }
      // German/European Autobahn (A1, A9, etc.) - Blue background
      if (ref.match(/^A\d/)) {
        return { 
          bg: 'bg-[#003399]', // German Autobahn blue
          text: 'text-white font-black',
          border: 'border-2 border-white',
          shape: 'rectangle'
        };
      }
      // German Bundesstraße (B roads) - Yellow background
      if (ref.match(/^B\d/)) {
        return { 
          bg: 'bg-yellow-400',
          text: 'text-black font-bold',
          border: 'border-2 border-black',
          shape: 'rectangle'
        };
      }
    }
    
    // ===== FALLBACK FOR UNKNOWN REGION =====
    // Use pattern-based detection when region not set
    
    // Motorways (M roads) - Blue (assume UK style)
    if (ref.match(/^M\d/)) {
      return { 
        bg: 'bg-[#0063B0]',
        text: 'text-white font-black',
        border: 'border-2 border-white',
        shape: 'rectangle'
      };
    }
    // Interstate (I roads) - USA style
    if (ref.match(/^I-?\d/)) {
      return { 
        bg: 'bg-[#003F87]',
        text: 'text-white font-black',
        border: 'border-2 border-white',
        shape: 'shield',
        specialStyle: 'interstate'
      };
    }
    // E-roads - European green
    if (ref.match(/^E\d/)) {
      return { 
        bg: 'bg-[#006B3F]',
        text: 'text-white font-black',
        border: 'border-2 border-white',
        shape: 'rectangle'
      };
    }
    // A-roads (default to UK green/yellow when region unknown)
    if (ref.match(/^A\d/)) {
      return { 
        bg: 'bg-[#00703C]',
        text: 'text-yellow-300 font-black',
        border: 'border-2 border-white',
        shape: 'rectangle'
      };
    }
    
    // Default - Gray
    return { 
      bg: 'bg-slate-600',
      text: 'text-white font-medium',
      border: 'border border-slate-500',
      shape: 'rectangle'
    };
  };
  
  // Legacy function for backwards compatibility
  const getRoadBadgeColor = (ref: string) => {
    const style = getRoadBadgeStyle(ref);
    return `${style.bg} ${style.text}`;
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
      // toast({
      //   title: `${roadInfo.roadRef || 'Road'} Junction ${roadInfo.junction.ref}`,
      //   description: roadInfo.junction.exitTo ? `Exit to: ${roadInfo.junction.exitTo}` : 
      //                roadInfo.destination ? `Towards: ${roadInfo.destination}` : 
      //                'Junction information',
      // });
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
      {/* Main speedometer - OVAL SHAPE WITH WHITE BACKGROUND */}
      <div
        className={cn(
          // Thinner dimensions for compact oval shape (same width, reduced height)
          'relative w-[240px] h-[48px] sm:w-[260px] sm:h-[52px] md:w-[280px] md:h-[56px]',
          // White background normally, red when speeding
          isSpeeding 
            ? 'bg-red-500 dark:bg-red-500' 
            : 'bg-white dark:bg-gray-100',
          // Subtle border for white background
          isSpeeding 
            ? 'border border-red-600'
            : 'border border-gray-200 dark:border-gray-300',
          // Full rounded corners for oval shape
          'rounded-full',
          // Shadow for depth and elevation
          'shadow-lg',
          // Smooth transition for background color changes
          'transition-all duration-500 ease-in-out'
        )}
      >
        {/* Inner container with horizontal layout */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          
          {/* LEFT: Speed Limit Sign (region-specific styling) */}
          <div className="flex items-center gap-3">
            {/* UK: Circular red border sign */}
            {region === 'uk' && (
              <div
                className={cn(
                  // Perfect circle shape like traditional UK speed limit sign
                  'flex items-center justify-center',
                  'w-12 h-12',
                  'rounded-full',
                  // White background with red border (UK standard)
                  convertedSpeedLimit 
                    ? 'bg-white dark:bg-white border-[3px] border-red-600' 
                    : 'bg-gray-100 dark:bg-gray-200 border-[3px] border-gray-400',
                  'shadow-md',
                  'transition-all duration-300'
                )}
                data-testid="speed-limit-display"
              >
                {convertedSpeedLimit ? (
                  <span className="text-xl font-bold tabular-nums text-gray-900">
                    {convertedSpeedLimit}
                  </span>
                ) : (
                  <span className="text-base font-medium text-gray-500">--</span>
                )}
              </div>
            )}

            {/* USA: Rectangular white sign with black border */}
            {region === 'usa' && (
              <div
                className={cn(
                  // Rectangular shape like USA speed limit sign
                  'flex flex-col items-center justify-center',
                  'w-12 h-14',
                  'rounded-sm',
                  // White background with black border (USA standard)
                  convertedSpeedLimit 
                    ? 'bg-white dark:bg-white border-[3px] border-gray-900' 
                    : 'bg-gray-100 dark:bg-gray-200 border-[3px] border-gray-400',
                  'shadow-md',
                  'transition-all duration-300'
                )}
                data-testid="speed-limit-display"
              >
                {convertedSpeedLimit ? (
                  <>
                    <span className="text-[9px] font-bold text-gray-900 leading-none">SPEED</span>
                    <span className="text-[9px] font-bold text-gray-900 leading-none mb-0.5">LIMIT</span>
                    <span className="text-xl font-bold tabular-nums text-gray-900 leading-none">
                      {convertedSpeedLimit}
                    </span>
                  </>
                ) : (
                  <span className="text-base font-medium text-gray-500">--</span>
                )}
              </div>
            )}

            {/* Europe: Circular red border sign (like UK but with KPH) */}
            {region === 'europe' && (
              <div
                className={cn(
                  // Perfect circle shape like European speed limit sign
                  'flex items-center justify-center',
                  'w-12 h-12',
                  'rounded-full',
                  // White background with red border (European standard)
                  convertedSpeedLimit 
                    ? 'bg-white dark:bg-white border-[3px] border-red-600' 
                    : 'bg-gray-100 dark:bg-gray-200 border-[3px] border-gray-400',
                  'shadow-md',
                  'transition-all duration-300'
                )}
                data-testid="speed-limit-display"
              >
                {convertedSpeedLimit ? (
                  <span className="text-xl font-bold tabular-nums text-gray-900">
                    {convertedSpeedLimit}
                  </span>
                ) : (
                  <span className="text-base font-medium text-gray-500">--</span>
                )}
              </div>
            )}
            
            {/* Vertical divider */}
            <div className={cn(
              "h-8 w-px",
              isSpeeding 
                ? "bg-white/40" 
                : "bg-gray-300 dark:bg-gray-400"
            )} />
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
                    : 'text-gray-600 dark:text-gray-600 hover:text-gray-900 dark:hover:text-gray-900',
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
              <div className={cn(
                "h-8 w-px",
                isSpeeding 
                  ? "bg-white/40" 
                  : "bg-gray-300 dark:bg-gray-400"
              )} />
            )}
            
            {roadInfo.roadRef ? (
              (() => {
                const badgeStyle = getRoadBadgeStyle(roadInfo.roadRef);
                const isInterstate = badgeStyle.specialStyle === 'interstate';
                
                return (
                  <button
                    onClick={handleMotorwayClick}
                    className={cn(
                      'flex items-center justify-center gap-1',
                      'text-sm',
                      badgeStyle.bg,
                      badgeStyle.text,
                      badgeStyle.border,
                      'shadow-lg',
                      'hover:scale-105 active:scale-100',
                      'transition-transform duration-200',
                      'cursor-pointer',
                      // Shape-specific styling
                      badgeStyle.shape === 'shield' 
                        ? 'px-2 py-1 rounded-t-full rounded-b-lg min-w-[48px]' // Shield shape
                        : 'px-3 py-1.5 rounded-md min-w-[44px]', // Rectangle
                      // Interstate special red top bar
                      isInterstate && 'relative overflow-hidden'
                    )}
                    data-testid="road-ref-badge"
                  >
                    {/* Interstate red banner at top */}
                    {isInterstate && (
                      <div className="absolute top-0 left-0 right-0 h-[6px] bg-[#BF0A30]" />
                    )}
                    <span className={cn(
                      "font-black tracking-tight",
                      isInterstate && "mt-1" // Push text down for interstate red bar
                    )}>
                      {roadInfo.roadRef}
                    </span>
                    {roadInfo.junction?.ref && (
                      <>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-xs font-bold">J{roadInfo.junction.ref}</span>
                      </>
                    )}
                  </button>
                );
              })()
            ) : isNavigating ? (
              <div className={cn(
                "px-3 py-1.5 rounded-lg",
                isSpeeding 
                  ? "bg-white/20" 
                  : "bg-gray-200 dark:bg-gray-300"
              )}>
                <span className={cn(
                  "text-xs font-medium",
                  isSpeeding 
                    ? "text-white" 
                    : "text-gray-600 dark:text-gray-700"
                )}>
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