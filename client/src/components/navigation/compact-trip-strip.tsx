import { Clock, Route, Wifi, WifiOff, Navigation, MapPin, Timer, Volume2, VolumeX, ArrowUp, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUpLeft, ChevronRight, X, Gauge, Eye, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeasurement } from '@/components/measurement/measurement-provider';
import { Button } from '@/components/ui/button';

interface RoadInfo {
  roadRef: string | null;
  junction?: { name: string | null; ref: string | null; exitTo: string | null } | null;
  destination?: string | null;
}

interface TurnInfo {
  direction: 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left';
  distance: number; // in meters
  roadName?: string;
}

interface LaneInfo {
  lanes: Array<{
    direction: 'left' | 'right' | 'straight' | 'exit';
    isRecommended: boolean;
  }>;
}

interface CompactTripStripProps {
  eta: number;
  distanceRemaining: number;
  nextManeuver?: string;
  nextDistance?: number;
  className?: string;
  isOnline?: boolean;
  gpsStatus?: 'ready' | 'acquiring' | 'unavailable' | 'error' | 'initializing' | 'manual';
  onPreviewStart?: () => void;
  onPreviewStop?: () => void;
  onSetLocation?: () => void;
  isPreviewActive?: boolean;
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  roadInfo?: RoadInfo | null;
  turnInfo?: TurnInfo | null;
  laneInfo?: LaneInfo | null;
  currentSpeed?: number; // in m/s
  speedLimit?: number; // in km/h
  isNavigating?: boolean;
  onCancelNavigation?: () => void;
  isCancellingNavigation?: boolean;
  trafficDelayMinutes?: number; // Predicted traffic delay from historical data
}

export function CompactTripStrip({
  eta,
  distanceRemaining,
  className,
  isOnline = true,
  gpsStatus = 'ready',
  onPreviewStart,
  onPreviewStop,
  onSetLocation,
  isPreviewActive = false,
  voiceEnabled = true,
  onVoiceToggle,
  roadInfo,
  turnInfo,
  laneInfo,
  currentSpeed = 0,
  speedLimit,
  isNavigating = false,
  onCancelNavigation,
  isCancellingNavigation = false,
  trafficDelayMinutes = 0
}: CompactTripStripProps) {
  const { formatDistance, system } = useMeasurement();
  const unit = system === 'imperial' ? 'mi' : 'km';
  
  const isGpsReady = gpsStatus === 'ready' || gpsStatus === 'manual';
  const isGpsAcquiring = gpsStatus === 'acquiring' || gpsStatus === 'initializing';

  const adjustedEta = eta + trafficDelayMinutes;
  const arrivalTime = new Date(Date.now() + adjustedEta * 60000);
  const arrivalTimeStr = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const hasTrafficDelay = trafficDelayMinutes > 0;

  // Speed conversion
  const convertedSpeed = unit === 'mi' 
    ? Math.round(currentSpeed * 2.237) // m/s to mph
    : Math.round(currentSpeed * 3.6);   // m/s to km/h
  
  const convertedSpeedLimit = speedLimit 
    ? (unit === 'mi' ? Math.round(speedLimit * 0.621371) : speedLimit)
    : null;
  
  const isSpeeding = convertedSpeedLimit && convertedSpeed > convertedSpeedLimit;
  const speedUnit = unit === 'mi' ? 'MPH' : 'KM/H';

  // Get turn icon - larger on tablet portrait
  const getTurnIcon = (direction: string) => {
    const iconProps = { className: "w-8 h-8 md:w-10 md:h-10 stroke-[2.5px]" };
    switch (direction) {
      case 'straight':
      case 'slight_right':
      case 'slight_left':
        return <ArrowUp {...iconProps} />;
      case 'right':
      case 'sharp_right': return <ArrowRight {...iconProps} />;
      case 'left':
      case 'sharp_left': return <ArrowLeft {...iconProps} />;
      default: return <ArrowUp {...iconProps} />;
    }
  };

  // Convert turn distance
  const formatTurnDistance = (distanceM: number): string => {
    return ""; // Distance removed per user request
  };

  // Get road badge style
  const getRoadBadgeStyle = (ref: string) => {
    const upperRef = ref.toUpperCase();
    if (upperRef.startsWith('M')) {
      return 'bg-blue-600 text-white border-blue-700';
    } else if (upperRef.startsWith('A')) {
      return 'bg-green-600 text-white border-green-700';
    } else if (upperRef.startsWith('B')) {
      return 'bg-amber-500 text-black border-amber-600';
    }
    return 'bg-gray-600 text-white border-gray-700';
  };

  // Get lane arrow for multi-lane direction box
  // Recommended lanes: blue arrow in direction, Non-recommended: gray dash
  const getLaneArrow = (direction: string, isRecommended: boolean, index: number, totalLanes: number, roadInfo?: RoadInfo | null) => {
    // Mobile: w-4 h-4, Tablet portrait: w-5 h-5
    const iconClass = "w-4 h-4 md:w-5 md:h-5 stroke-[2.5px]";

    // Sync highlight with roadInfo destination text
    const destination = roadInfo?.destination?.toLowerCase() || '';
    const isActuallyRecommended = isRecommended ||
      (destination.includes('left lane') && index === 0) ||
      (destination.includes('right lane') && index === totalLanes - 1) ||
      (destination.includes('middle lane') && index > 0 && index < totalLanes - 1);

    if (!isActuallyRecommended) {
      // Non-recommended lane: show gray dash
      return <Minus className={cn(iconClass, "text-gray-400")} />;
    }

    // Recommended lane: show blue arrow in direction
    switch (direction) {
      case 'left': return <ArrowLeft className={cn(iconClass, "text-blue-600")} />;
      case 'right': return <ArrowRight className={cn(iconClass, "text-blue-600")} />;
      case 'straight': return <ArrowUp className={cn(iconClass, "text-blue-600")} />;
      case 'exit': return <ArrowUpRight className={cn(iconClass, "text-blue-600")} />;
      default: return <ArrowUp className={cn(iconClass, "text-blue-600")} />;
    }
  };
  
  // Legacy function for separate lane guidance display (kept for compatibility)
  const getLaneIcon = (direction: string, isRecommended: boolean) => {
    const iconClass = cn("w-3 h-3 md:w-4 md:h-4", isRecommended ? "text-green-600" : "text-gray-500");
    switch (direction) {
      case 'left': return <ArrowUpRight className={cn(iconClass, "rotate-[-45deg]")} />;
      case 'right': return <ArrowUpRight className={cn(iconClass, "rotate-[45deg]")} />;
      case 'straight': return <ArrowUp className={iconClass} />;
      case 'exit': return <ArrowRight className={iconClass} />;
      default: return <ArrowUp className={iconClass} />;
    }
  };

  return (
    <div 
      className={cn(
        'fixed left-0 right-0 px-2 md:px-4 py-1.5 md:py-2',
        'bg-white dark:bg-gray-900',
        'border-b-2 border-blue-500 shadow-md',
        'flex flex-col gap-1 md:gap-2',
        'pointer-events-auto',
        className
      )}
      style={{ 
        top: 'calc(64px + max(env(safe-area-inset-top, 0px), 0px))',
        zIndex: 6000,
      }}
      data-testid="compact-trip-strip"
    >
      {/* Row 1: ETA info + Speed + Action buttons */}
      <div className="flex items-center justify-between gap-1 md:gap-2">
        {/* Left: Direction Square + ETA/Distance/Arrival - larger on tablet */}
        <div className="flex items-center gap-0.5 md:gap-2 flex-1 min-w-0">
          {/* Direction Square with Turn Arrow - shows next turn direction */}
          {turnInfo && (isNavigating || isPreviewActive) && (
            <div 
              className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 bg-blue-600 rounded-lg shadow-md flex-shrink-0"
              data-testid="direction-square"
              aria-label={`Next turn: ${turnInfo.direction.replace('_', ' ')}`}
            >
              {getTurnIcon(turnInfo.direction)}
            </div>
          )}
          <div className="flex items-center gap-0.5 md:gap-1.5 bg-blue-600 text-white px-1.5 md:px-4 py-1 md:py-2.5 rounded shadow-sm flex-shrink-0">
            <Clock className="w-3.5 h-3.5 md:w-5 md:h-5" />
            <span className="text-[11px] md:text-lg font-bold whitespace-nowrap">{eta}m</span>
          </div>
          <div className={cn(
            "flex items-center gap-0.5 md:gap-1.5 text-white px-1.5 md:px-4 py-1 md:py-2.5 rounded shadow-sm flex-shrink-0",
            hasTrafficDelay ? "bg-orange-600" : "bg-purple-600"
          )}>
            <Timer className="w-3.5 h-3.5 md:w-5 md:h-5" />
            <span className="text-[11px] md:text-lg font-bold whitespace-nowrap">{arrivalTimeStr}</span>
            {hasTrafficDelay && <span className="text-[9px] md:text-sm opacity-80">+{Math.round(trafficDelayMinutes)}m</span>}
          </div>
          {/* Distance remaining - visible on tablet for better symmetry */}
          <div className="hidden md:flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2.5 rounded shadow-sm flex-shrink-0">
            <Route className="w-5 h-5" />
            <span className="text-lg font-bold whitespace-nowrap">{formatDistance(distanceRemaining, 'km')}</span>
          </div>
          <div 
            className="flex items-center gap-0.5 md:gap-1 text-white px-1.5 md:px-3 py-1 md:py-2.5 rounded shadow-sm flex-shrink-0"
            style={{ backgroundColor: isOnline ? '#22c55e' : '#ef4444' }}
          >
            {isOnline ? <Wifi className="w-3 h-3 md:w-5 md:h-5" /> : <WifiOff className="w-3 h-3 md:w-5 md:h-5" />}
            <span className="text-[10px] md:text-base font-bold">{isOnline ? 'Net' : 'Off'}</span>
          </div>
          <button
            onClick={!isGpsReady && !isGpsAcquiring ? onSetLocation : undefined}
            className="flex items-center gap-0.5 md:gap-1 text-white px-1.5 md:px-3 py-1 md:py-2.5 rounded shadow-sm flex-shrink-0"
            style={{ backgroundColor: isGpsReady ? '#22c55e' : isGpsAcquiring ? '#3b82f6' : '#ef4444' }}
            disabled={isGpsReady || isGpsAcquiring}
          >
            {isGpsReady ? <Navigation className="w-3 h-3 md:w-5 md:h-5" /> : <MapPin className="w-3 h-3 md:w-5 md:h-5" />}
            <span className="text-[10px] md:text-base font-bold">{isGpsReady ? 'GPS' : isGpsAcquiring ? '...' : 'Set'}</span>
          </button>
        </div>
        
        {/* Center: Speed limit + Current speed (unpacked) - larger on tablet */}
        {(isNavigating || isPreviewActive) && (
          <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
            {/* Speed Limit Sign - theme responsive */}
            <div className={cn(
              'flex items-center justify-center w-8 h-8 md:w-14 md:h-14 rounded-full border-2 md:border-[3px]',
              convertedSpeedLimit ? 'bg-gray-100 dark:bg-gray-800 border-red-500' : 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600'
            )}>
              <span className="text-[11px] md:text-xl font-bold text-gray-900 dark:text-white">{convertedSpeedLimit || '--'}</span>
            </div>
            {/* Current Speed - theme responsive */}
            <div className={cn(
              'flex items-center gap-0.5 md:gap-1.5 px-1.5 md:px-4 py-1 md:py-2.5 rounded-lg shadow-sm min-w-[65px] md:min-w-[120px] justify-center',
              isSpeeding ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
            )}>
              <Gauge className={cn('w-4 h-4 md:w-6 md:h-6', isSpeeding ? 'text-white' : 'text-blue-600')} />
              <span className={cn('text-sm md:text-2xl font-bold', isSpeeding && 'animate-pulse')}>{convertedSpeed}</span>
              <span className={cn('text-[9px] md:text-sm font-medium opacity-80', isSpeeding ? 'text-red-100' : 'text-gray-500 dark:text-gray-400')}>{speedUnit}</span>
            </div>
          </div>
        )}
        
        {/* Right: Action buttons - Preview/Stop only (End button removed - use Stop on speedometer) */}
        <div className="flex items-center gap-1 flex-shrink-0 pr-1">
          {!isNavigating && (
            <div className="flex flex-row items-center gap-0.5">
              <button
                onClick={onPreviewStart}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (!isPreviewActive && onPreviewStart) onPreviewStart();
                }}
                disabled={isPreviewActive}
                className="h-11 md:h-12 px-3 md:px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-base active:scale-95 active:bg-blue-800 transition-all disabled:opacity-40 rounded-l shadow-md flex items-center justify-center leading-none select-none"
                style={{ touchAction: 'manipulation', minWidth: '54px', WebkitTapHighlightColor: 'transparent' }}
                data-testid="button-preview-start"
              >
                Preview
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isPreviewActive && onPreviewStop) onPreviewStop();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isPreviewActive && onPreviewStop) onPreviewStop();
                }}
                disabled={!isPreviewActive}
                className="h-11 md:h-12 px-3 md:px-5 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs md:text-base active:scale-95 active:bg-rose-700 transition-all disabled:opacity-40 rounded-r shadow-md flex items-center justify-center leading-none select-none touch-manipulation"
                style={{ touchAction: 'manipulation', minWidth: '44px', WebkitTapHighlightColor: 'transparent' }}
                data-testid="button-preview-stop"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Row 2: Status icons + Road/Turn/Lane info + Nav status - larger on tablet */}
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* Left: Status icons with labels */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            type="button"
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[VOICE-BTN] onTouchEnd fired, current state:', voiceEnabled);
              (e.currentTarget as any)._touchHandled = Date.now();
              if (onVoiceToggle) onVoiceToggle();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const lastTouch = (e.currentTarget as any)._touchHandled || 0;
              if (Date.now() - lastTouch < 500) {
                console.log('[VOICE-BTN] onClick suppressed (already handled by touch)');
                return;
              }
              console.log('[VOICE-BTN] onClick fired, current state:', voiceEnabled);
              if (onVoiceToggle) onVoiceToggle();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}
            className={cn(
              'flex items-center gap-1 md:gap-1.5 px-3 md:px-4 py-1.5 md:py-1.5 rounded-full transition-colors shadow-sm text-[10px] md:text-base font-bold select-none active:scale-95',
              voiceEnabled ? 'bg-green-500 text-white active:bg-green-600' : 'bg-slate-400 text-white active:bg-slate-500'
            )}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '44px', minWidth: '70px', WebkitUserSelect: 'none', userSelect: 'none' }}
            data-testid="voice-toggle-button"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : <VolumeX className="w-4 h-4 md:w-5 md:h-5" />}
            {voiceEnabled ? 'On' : 'Off'}
          </button>
        </div>
        
        {/* Center: Road badge + Turn + Lane - larger on tablet */}
        <div className="flex items-center gap-1.5 md:gap-3 flex-1 justify-center min-w-0">
          {/* Road badge */}
          {roadInfo?.roadRef && (
            <div className={cn('px-2 md:px-4 py-0.5 md:py-1.5 rounded text-xs md:text-lg font-bold shadow-sm', getRoadBadgeStyle(roadInfo.roadRef))}>
              {roadInfo.roadRef}
              {roadInfo.junction?.ref && <span className="ml-1 text-[10px] md:text-sm opacity-80">J{roadInfo.junction.ref}</span>}
            </div>
          )}
          
          {/* Combined Direction Box with Multi-Arrow Lane Guidance - theme responsive */}
          {/* Shows lane arrows when available, falls back to single turn arrow */}
          {(turnInfo || (laneInfo && laneInfo.lanes.length > 0)) && (
            <div className="flex items-center gap-1.5 md:gap-2.5 bg-gray-100/90 dark:bg-gray-800/90 px-2 md:px-4 py-1 md:py-2 rounded-lg shadow-sm border border-blue-500">
              {/* Lane arrows or single direction arrow */}
              <div className="flex items-center gap-0.5 md:gap-1.5">
                {laneInfo && laneInfo.lanes.length > 0 ? (
                  laneInfo.lanes.map((lane, index) => (
                    <div key={index} className="flex items-center justify-center">
                      {getLaneArrow(lane.direction, lane.isRecommended, index, laneInfo.lanes.length, roadInfo)}
                    </div>
                  ))
                ) : (
                  turnInfo && <div className="text-blue-600">{getTurnIcon(turnInfo.direction)}</div>
                )}
              </div>
              {/* Distance to turn - theme responsive */}
              {turnInfo && turnInfo.distance > 0 && (
                <span className="text-xs md:text-lg font-bold text-gray-900 dark:text-white ml-0.5">
                  {formatTurnDistance(turnInfo.distance)}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Right: Nav status badge - larger on tablet */}
        {(isNavigating || isPreviewActive) && (
          <div className={cn(
            'px-2 md:px-4 py-0.5 md:py-1.5 rounded-full text-[10px] md:text-base font-bold shadow-sm flex-shrink-0',
            isNavigating ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
          )}>
            {isNavigating ? 'NAV' : 'PRV'}
          </div>
        )}
      </div>
    </div>
  );
}
