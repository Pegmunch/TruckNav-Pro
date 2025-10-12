/**
 * SpeedometerHUD Component for TruckNav Pro
 * Professional oval speedometer with speed limit indicators
 * Features dynamic road information, unit switching, and visual warnings
 */

import { memo, useState, useEffect, useRef } from 'react';
import { Gauge, Shield, AlertCircle, Navigation, MapPin, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGPS } from '@/contexts/gps-context';
import { useMeasurement } from '@/components/measurement/measurement-provider';
import { useSpeedLimit } from '@/hooks/use-speed-limit';
import { motion, AnimatePresence } from 'framer-motion';

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
 * Professional oval speedometer HUD with speed limit integration
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
  
  // State for smooth speed animation
  const [animatedSpeed, setAnimatedSpeed] = useState(0);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const prevSpeedingRef = useRef(false);
  
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
  
  // Determine speed status
  const speedDifference = convertedSpeedLimit ? convertedSpeed - convertedSpeedLimit : 0;
  const isSpeeding = convertedSpeedLimit && speedDifference > 5; // 5 unit tolerance
  const isNearLimit = convertedSpeedLimit && speedDifference > 0 && speedDifference <= 5;
  const isWellUnder = convertedSpeedLimit && speedDifference < -10;
  
  // Smooth speed animation
  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      setAnimatedSpeed(prev => {
        const diff = convertedSpeed - prev;
        if (Math.abs(diff) < 0.5) return convertedSpeed;
        return prev + diff * 0.2; // Smooth transition
      });
    });
    
    return () => cancelAnimationFrame(animationFrame);
  }, [convertedSpeed]);
  
  // Pulse animation when starting to speed
  useEffect(() => {
    if (isSpeeding && !prevSpeedingRef.current) {
      setPulseAnimation(true);
      setTimeout(() => setPulseAnimation(false), 2000);
    }
    prevSpeedingRef.current = isSpeeding as boolean;
  }, [isSpeeding]);
  
  // Get speed color based on status
  const getSpeedColor = () => {
    if (isSpeeding) return 'text-red-500';
    if (isNearLimit) return 'text-amber-500';
    if (isWellUnder) return 'text-green-500';
    return 'text-blue-500';
  };
  
  // Get background gradient based on status
  const getBackgroundGradient = () => {
    if (isSpeeding) {
      return 'from-red-600/20 via-red-500/15 to-red-600/20 dark:from-red-700/30 dark:via-red-600/25 dark:to-red-700/30';
    }
    if (isNearLimit) {
      return 'from-amber-600/20 via-amber-500/15 to-amber-600/20 dark:from-amber-700/30 dark:via-amber-600/25 dark:to-amber-700/30';
    }
    return 'from-slate-900/20 via-slate-800/15 to-slate-900/20 dark:from-slate-100/10 dark:via-slate-200/8 dark:to-slate-100/10';
  };
  
  // Get border style based on status
  const getBorderStyle = () => {
    if (isSpeeding) {
      return cn(
        'border-2 border-red-500/50',
        pulseAnimation && 'animate-pulse ring-4 ring-red-500/30'
      );
    }
    if (isNearLimit) {
      return 'border-2 border-amber-500/40';
    }
    return 'border border-slate-300/30 dark:border-slate-700/30';
  };
  
  // Road type badge color
  const getRoadBadgeColor = (ref: string) => {
    if (ref.match(/^M\d/)) return 'bg-blue-600 text-white'; // Motorways
    if (ref.match(/^A\d/)) return 'bg-green-600 text-white'; // A-roads
    if (ref.match(/^I-/)) return 'bg-blue-700 text-white'; // Interstate
    if (ref.match(/^US-/)) return 'bg-green-700 text-white'; // US Highway
    if (ref.match(/^E\d/)) return 'bg-blue-800 text-white'; // European routes
    return 'bg-slate-600 text-white'; // Other roads
  };
  
  // Confidence indicator
  const getConfidenceIndicator = () => {
    switch (roadInfo.confidence) {
      case 'high':
        return null; // No indicator for high confidence
      case 'medium':
        return { icon: '~', color: 'text-amber-500', tooltip: 'Estimated speed limit' };
      case 'low':
        return { icon: '?', color: 'text-orange-500', tooltip: 'Uncertain speed limit' };
      default:
        return null;
    }
  };
  
  const confidenceIndicator = getConfidenceIndicator();
  
  // Handle unit toggle
  const handleUnitToggle = () => {
    if (onUnitToggle) {
      onUnitToggle();
    } else {
      // Toggle between imperial and metric
      setSystem(measurementSystem === 'imperial' ? 'metric' : 'imperial');
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative',
        className
      )}
      data-testid="speedometer-hud"
    >
      {/* Main oval speedometer container - SIGNIFICANTLY THINNER AND MORE COMPACT */}
      <div
        className={cn(
          // Dramatically reduced oval shape - much thinner/narrower (200px-240px width, 70px-85px height)
          'relative w-[200px] h-[70px] sm:w-[220px] sm:h-[75px] md:w-[240px] md:h-[85px]',
          // Glassmorphism effect
          'backdrop-blur-xl bg-gradient-to-r',
          getBackgroundGradient(),
          // Border and shadow
          getBorderStyle(),
          'rounded-[45px] shadow-2xl',
          // Transition for smooth color changes
          'transition-all duration-300 ease-in-out'
        )}
      >
        {/* Inner container for content - reduced padding for tighter packing */}
        <div className="absolute inset-0 flex items-center justify-between px-4 sm:px-5">
          
          {/* Left Section: Speed Limit */}
          <div className="flex flex-col items-center justify-center min-w-[65px]">
            <div
              className={cn(
                'relative flex flex-col items-center justify-center',
                'w-10 h-10 sm:w-11 sm:h-11', // Significantly reduced for compact speedometer
                'rounded-full bg-white dark:bg-slate-900',
                'shadow-lg',
                convertedSpeedLimit ? 'border-[3px] border-red-600' : 'border-[3px] border-slate-400'
              )}
              data-testid="speed-limit-display"
            >
              {convertedSpeedLimit ? (
                <>
                  <span className="text-sm sm:text-base font-black text-black dark:text-white">
                    {convertedSpeedLimit}
                  </span>
                  {confidenceIndicator && (
                    <span
                      className={cn(
                        'absolute -top-1 -right-1',
                        'w-5 h-5 rounded-full bg-white dark:bg-slate-900',
                        'flex items-center justify-center',
                        'text-xs font-bold',
                        confidenceIndicator.color,
                        'shadow-md border border-white dark:border-slate-700'
                      )}
                      title={confidenceIndicator.tooltip}
                    >
                      {confidenceIndicator.icon}
                    </span>
                  )}
                </>
              ) : (
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              )}
            </div>
            <span className="mt-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase">
              LIMIT
            </span>
          </div>
          
          {/* Center Section: Current Speed */}
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="relative">
              {/* Speed value with animation */}
              <motion.div
                className={cn(
                  'text-2xl sm:text-3xl md:text-4xl font-black tabular-nums',
                  getSpeedColor(),
                  'transition-colors duration-300'
                )}
                animate={{
                  scale: isSpeeding ? [1, 1.05, 1] : 1
                }}
                transition={{
                  duration: 0.5,
                  repeat: isSpeeding ? Infinity : 0,
                  repeatDelay: 1
                }}
                data-testid="current-speed-value"
              >
                {Math.round(animatedSpeed)}
              </motion.div>
              
              {/* Speed unit (clickable for toggle) */}
              <button
                onClick={handleUnitToggle}
                className={cn(
                  'mt-0 text-[10px] sm:text-xs font-bold uppercase',
                  'text-slate-600 dark:text-slate-400',
                  'hover:text-blue-500 dark:hover:text-blue-400',
                  'transition-colors duration-200',
                  'cursor-pointer select-none',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  'rounded px-2 py-0.5'
                )}
                data-testid="speed-unit-toggle"
              >
                {speedUnit}
              </button>
            </div>
            
            {/* GPS status indicator */}
            {!gps?.position && (
              <div className="absolute bottom-2 flex items-center gap-1 text-xs text-slate-500">
                <AlertCircle className="w-3 h-3" />
                <span>No GPS</span>
              </div>
            )}
          </div>
          
          {/* Right Section: Road Info */}
          <div className="flex flex-col items-end justify-center min-w-[65px] max-w-[100px]">
            {roadInfo.roadRef ? (
              <div className="flex flex-col items-end gap-1">
                {/* Road reference badge */}
                <div
                  className={cn(
                    'px-1.5 py-0.5 rounded-lg',
                    'text-[11px] sm:text-xs font-black',
                    'shadow-md',
                    getRoadBadgeColor(roadInfo.roadRef)
                  )}
                  data-testid="road-ref-badge"
                >
                  {roadInfo.roadRef}
                </div>
                
                {/* Junction info */}
                {roadInfo.junction?.ref && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400">
                      J{roadInfo.junction.ref}
                    </span>
                  </div>
                )}
                
                {/* Destination */}
                {roadInfo.destination && (
                  <div className="flex items-center gap-1 max-w-full">
                    <Navigation className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400 truncate">
                      {roadInfo.destination}
                    </span>
                  </div>
                )}
              </div>
            ) : isNavigating ? (
              <div className="flex flex-col items-center justify-center">
                <Gauge className="w-6 h-6 text-slate-400" />
                <span className="mt-0.5 text-[9px] font-medium text-slate-500">
                  {speedLimitData.isLoading ? 'Loading...' : 'No road data'}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        
        {/* Visual warning overlay for speeding */}
        <AnimatePresence>
          {isSpeeding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-[45px] pointer-events-none"
            >
              <div
                className={cn(
                  'absolute inset-0 rounded-[45px]',
                  'bg-gradient-to-r from-red-500/10 via-transparent to-red-500/10',
                  'animate-pulse'
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Speed difference indicator */}
      {convertedSpeedLimit && isNavigating && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 text-xs font-medium">
            {isSpeeding ? (
              <span className="text-red-500">
                +{speedDifference} {speedUnit} over limit
              </span>
            ) : isNearLimit ? (
              <span className="text-amber-500">
                Approaching limit
              </span>
            ) : (
              <span className="text-green-500">
                Within limit
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
});

export default SpeedometerHUD;