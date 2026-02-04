/**
 * SpeedometerHUD Component for TruckNav Pro
 * Oval-shaped speedometer with white background and clean design
 * Features speed limit on left, current speed in center, road info on right
 */

import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Shield, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGPS } from '@/contexts/gps-context';
import { useMeasurement } from '@/components/measurement/measurement-provider';
import { useSpeedLimit } from '@/hooks/use-speed-limit';
import { useToast } from '@/hooks/use-toast';
import { getAlertSoundsService } from '@/lib/alert-sounds';

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
  onStartNavigation?: () => void;
  onStopNavigation?: () => void;
  showGoButton?: boolean;
  showStopButton?: boolean;
  timeRemainingSeconds?: number; // Time remaining to destination in seconds (for countdown display)
  distanceRemainingMeters?: number; // Distance remaining to destination in meters
  vehicleType?: string; // Vehicle type for speed-based travel time calculation
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
  isNavigating = false,
  onStartNavigation,
  onStopNavigation,
  showGoButton = false,
  showStopButton = false,
  timeRemainingSeconds,
  distanceRemainingMeters,
  vehicleType
}: SpeedometerHUDProps) {
  // Get GPS data and measurement preferences
  const gps = useGPS();
  const { system: measurementSystem, region, setSystem } = useMeasurement();
  const speedLimitData = useSpeedLimit();
  const { toast } = useToast();
  
  // State for smooth speed animation
  const [animatedSpeed, setAnimatedSpeed] = useState(0);
  const [showJunctionInfo, setShowJunctionInfo] = useState(false);
  
  // Format time remaining as hours & minutes countdown
  const formatTimeRemaining = (seconds: number | undefined): string => {
    if (!seconds || seconds <= 0) return '--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  // Track speeding state for alert sound
  const wasSpeedingRef = useRef(false);
  
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
  
  // Live travel time calculation based on vehicle type max speed
  // Class 1 Lorry: max 56 MPH (90 km/h), Car: max 70 MPH (112.65 km/h)
  const isCarMode = vehicleType === 'car';
  const maxSpeedMph = isCarMode ? 70 : 56; // Car 70 MPH, Truck 56 MPH
  const maxSpeedMs = maxSpeedMph * 0.44704; // Convert MPH to m/s
  
  // Calculate estimated travel time based on remaining distance and max speed
  const calculateLiveTravelTime = (): { hours: number; minutes: number; seconds: number; totalSeconds: number } | null => {
    if (!distanceRemainingMeters || distanceRemainingMeters <= 0) return null;
    
    // Time = Distance / Speed (in seconds)
    const timeSeconds = distanceRemainingMeters / maxSpeedMs;
    const hours = Math.floor(timeSeconds / 3600);
    const minutes = Math.floor((timeSeconds % 3600) / 60);
    const seconds = Math.floor(timeSeconds % 60);
    
    return { hours, minutes, seconds, totalSeconds: timeSeconds };
  };
  
  const liveTravelTime = calculateLiveTravelTime();
  
  // Format live travel time for display
  const formatLiveTravelTime = (): string => {
    if (!liveTravelTime) return '--';
    const { hours, minutes } = liveTravelTime;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  // Play speed limit alert sound when starting to speed
  useEffect(() => {
    if (isSpeeding && !wasSpeedingRef.current && isNavigating) {
      // Just started speeding - play alert
      getAlertSoundsService().playAlert('speedLimit');
    }
    wasSpeedingRef.current = !!isSpeeding;
  }, [isSpeeding, isNavigating]);
  
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
      setTimeout(() => setShowJunctionInfo(false), 3000);
    }
  };
  
  // Handle GPS blocked button click - show instructions and retry
  const handleGPSBlockedClick = useCallback(() => {
    toast({
      title: "Location Access Blocked",
      description: "Go to Safari Settings > Website Settings > Location, then enable for this site. Tap here to retry after enabling.",
      duration: 6000,
    });
    // Still try to retry in case user has already enabled it
    gps?.retryGPS();
  }, [gps, toast]);
  
  return (
    <div
      className={cn(
        'relative flex flex-col items-center w-full',
        className
      )}
      data-testid="speedometer-hud"
      data-tour-id="speedometer"
    >
      {/* Live Travel Time Display - Above Speedometer */}
      {isNavigating && liveTravelTime && (
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <div className={cn(
            "px-3 py-1 rounded-full",
            "bg-black/80 backdrop-blur-sm",
            "shadow-lg",
            "flex items-center gap-2"
          )}>
            {/* Vehicle type indicator */}
            <span className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              isCarMode 
                ? "bg-blue-500 text-white" 
                : "bg-amber-500 text-black"
            )}>
              {isCarMode ? 'CAR' : 'HGV'}
            </span>
            
            {/* Max speed indicator */}
            <span className="text-gray-400 text-xs">
              @{maxSpeedMph} {usesMPH ? 'MPH' : 'KM/H'}
            </span>
            
            {/* Estimated time */}
            <span className="text-white font-bold text-sm tabular-nums">
              {formatLiveTravelTime()}
            </span>
          </div>
        </div>
      )}

      {/* Main speedometer row */}
      <div className="flex justify-center items-center w-full">

      {/* GO BUTTON - Left crescent hugging speedometer's left edge */}
      {showGoButton && onStartNavigation && (
        <div 
          className="relative h-[48px] sm:h-[52px] md:h-[56px] w-[70px] sm:w-[75px] mr-0.5"
          style={{ marginRight: '-2px' }}
        >
          <svg 
            viewBox="0 0 70 48" 
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="goGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
              <linearGradient id="goGradientHover" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#15803d" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
            {/* Crescent shape: left rounded, right convex curve bulging outward */}
            <path 
              d="M 24,0 L 55,0 Q 75,24 55,48 L 24,48 Q 0,48 0,24 Q 0,0 24,0 Z"
              fill="url(#goGradient)"
              className="transition-all duration-200"
            />
          </svg>
          <button
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse' && !isNavigating && onStartNavigation) {
                e.preventDefault();
                e.stopPropagation();
                onStartNavigation();
              }
            }}
            onClick={() => {
              if (!isNavigating && onStartNavigation) {
                onStartNavigation();
              }
            }}
            disabled={isNavigating}
            className={cn(
              'absolute inset-0 w-full h-full',
              'text-white font-bold text-base sm:text-lg tracking-wide',
              'flex items-center justify-center',
              'select-none',
              isNavigating && 'opacity-40 cursor-not-allowed'
            )}
            style={{ 
              touchAction: 'manipulation',
              background: 'transparent',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              WebkitTapHighlightColor: 'transparent',
              lineHeight: 1,
              paddingRight: '8px'
            }}
            data-testid="button-go-speedometer"
          >
            GO
          </button>
        </div>
      )}

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
            {/* Speed Limit Circle - UK/Europe style */}
            <div
              className={cn(
                // Perfect circle shape like traditional speed limit sign
                'flex items-center justify-center',
                'w-12 h-12',
                'rounded-full',
                // White background with red border
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
            
            {/* GPS status and Enable button */}
            {!gps?.position && (
              <div className="absolute -bottom-1 flex items-center gap-1.5">
                {gps?.errorType === 'PERMISSION_DENIED' ? (
                  <button
                    onClick={handleGPSBlockedClick}
                    className="flex items-center gap-1 px-2 py-0.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full text-[10px] font-semibold shadow-sm transition-colors animate-pulse"
                  >
                    <AlertCircle className="w-3 h-3" />
                    GPS Blocked - Enable in Settings
                  </button>
                ) : gps?.requiresUserGesture ? (
                  <button
                    onClick={() => gps?.requestGPSPermission()}
                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full text-[10px] font-semibold shadow-sm transition-colors"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Enable GPS
                  </button>
                ) : gps?.status === 'acquiring' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-blue-500 font-medium">Finding GPS...</span>
                  </>
                ) : (
                  <button
                    onClick={() => gps?.retryGPS()}
                    className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-full text-[10px] font-semibold shadow-sm transition-colors"
                  >
                    <AlertCircle className="w-3 h-3" />
                    GPS Unavailable - Retry
                  </button>
                )}
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

      {/* Road Name Display - Below speedometer during navigation */}
      {isNavigating && roadInfo.roadRef && (
        <div 
          className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 z-10"
          style={{ pointerEvents: 'none' }}
        >
          <div className={cn(
            "px-3 py-0.5 rounded-full",
            "bg-black/70 backdrop-blur-sm",
            "text-white text-xs font-medium",
            "whitespace-nowrap max-w-[200px] truncate",
            "shadow-lg"
          )}>
            {roadInfo.roadRef}
          </div>
        </div>
      )}

      {/* STOP BUTTON - Right crescent hugging speedometer's right edge */}
      {showStopButton && onStopNavigation && (
        <div 
          className="relative h-[48px] sm:h-[52px] md:h-[56px] w-[70px] sm:w-[75px] ml-0.5"
          style={{ marginLeft: '-2px' }}
        >
          <svg 
            viewBox="0 0 70 48" 
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="stopGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>
            {/* Crescent shape: left convex curve bulging outward, right rounded */}
            <path 
              d="M 15,0 Q -5,24 15,48 L 46,48 Q 70,48 70,24 Q 70,0 46,0 Z"
              fill="url(#stopGradient)"
              className="transition-all duration-200"
            />
          </svg>
          <button
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse' && isNavigating && onStopNavigation) {
                e.preventDefault();
                e.stopPropagation();
                onStopNavigation();
              }
            }}
            onClick={() => {
              if (isNavigating && onStopNavigation) {
                onStopNavigation();
              }
            }}
            disabled={!isNavigating}
            className={cn(
              'absolute inset-0 w-full h-full',
              'text-white font-bold text-base sm:text-lg tracking-wide',
              'flex items-center justify-center',
              'select-none',
              !isNavigating && 'opacity-40 cursor-not-allowed'
            )}
            style={{ 
              touchAction: 'manipulation',
              background: 'transparent',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              WebkitTapHighlightColor: 'transparent',
              lineHeight: 1,
              paddingLeft: '8px'
            }}
            data-testid="button-stop-speedometer"
          >
            STOP
          </button>
        </div>
      )}
      </div>
    </div>
  );
});

export default SpeedometerHUD;