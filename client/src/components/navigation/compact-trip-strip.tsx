import { Clock, Route, Wifi, WifiOff, Navigation, MapPin, Timer, Volume2, VolumeX, ArrowUp, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUpLeft, ChevronRight, X, Gauge, Eye } from 'lucide-react';
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
  const arrivalTimeStr = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      case 'straight': return <ArrowUp {...iconProps} />;
      case 'right':
      case 'sharp_right': return <ArrowRight {...iconProps} />;
      case 'left':
      case 'sharp_left': return <ArrowLeft {...iconProps} />;
      case 'slight_right': return <ArrowUpRight {...iconProps} />;
      case 'slight_left': return <ArrowUpLeft {...iconProps} />;
      default: return <ArrowUp {...iconProps} />;
    }
  };

  // Convert turn distance
  const formatTurnDistance = (distanceM: number): string => {
    if (unit === 'mi') {
      const miles = distanceM / 1609.34;
      if (miles < 0.1) {
        return `${Math.round(distanceM * 3.28084)} ft`;
      }
      return `${miles.toFixed(1)} mi`;
    } else {
      const km = distanceM / 1000;
      if (km < 0.1) {
        return `${Math.round(distanceM)} m`;
      }
      return `${km.toFixed(1)} km`;
    }
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

  // Get lane direction icon (compact) - larger on tablet
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
        'bg-white',
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
      <div className="flex items-center justify-between gap-1">
        {/* Left: ETA/Distance/Arrival - larger on tablet */}
        <div className="flex items-center gap-0.5 md:gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-0.5 md:gap-1 bg-blue-600 text-white px-1.5 md:px-3 py-1 md:py-2 rounded shadow-sm flex-shrink-0">
            <Clock className="w-3.5 h-3.5 md:w-5 md:h-5" />
            <span className="text-[11px] md:text-base font-bold whitespace-nowrap">{eta}m</span>
          </div>
          <div className={cn(
            "flex items-center gap-0.5 md:gap-1 text-white px-1.5 md:px-3 py-1 md:py-2 rounded shadow-sm flex-shrink-0",
            hasTrafficDelay ? "bg-orange-600" : "bg-purple-600"
          )}>
            <Timer className="w-3.5 h-3.5 md:w-5 md:h-5" />
            <span className="text-[11px] md:text-base font-bold whitespace-nowrap">{arrivalTimeStr}</span>
            {hasTrafficDelay && <span className="text-[9px] md:text-xs opacity-80">+{Math.round(trafficDelayMinutes)}m</span>}
          </div>
        </div>
        
        {/* Center: Speed limit + Current speed (unpacked) - larger on tablet */}
        {(isNavigating || isPreviewActive) && (
          <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
            {/* Speed Limit Sign */}
            <div className={cn(
              'flex items-center justify-center w-8 h-8 md:w-12 md:h-12 rounded-full border-2 md:border-3',
              convertedSpeedLimit ? 'bg-white border-red-500' : 'bg-gray-100 border-gray-300'
            )}>
              <span className="text-[11px] md:text-lg font-bold text-gray-900">{convertedSpeedLimit || '--'}</span>
            </div>
            {/* Current Speed */}
            <div className={cn(
              'flex items-center gap-0.5 md:gap-1 px-1.5 md:px-3 py-1 md:py-2 rounded-lg shadow-sm min-w-[65px] md:min-w-[100px] justify-center',
              isSpeeding ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-900'
            )}>
              <Gauge className={cn('w-4 h-4 md:w-6 md:h-6', isSpeeding ? 'text-white' : 'text-blue-600')} />
              <span className={cn('text-sm md:text-xl font-bold', isSpeeding && 'animate-pulse')}>{convertedSpeed}</span>
              <span className={cn('text-[9px] md:text-sm font-medium opacity-80', isSpeeding ? 'text-red-100' : 'text-gray-500')}>{speedUnit}</span>
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
                className="h-11 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs active:scale-95 active:bg-blue-800 transition-all disabled:opacity-40 rounded-l shadow-md flex items-center justify-center leading-none select-none"
                style={{ touchAction: 'manipulation', minWidth: '54px', WebkitTapHighlightColor: 'transparent' }}
                data-testid="button-preview-start"
              >
                Preview
              </button>
              <button
                onClick={onPreviewStop}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (isPreviewActive && onPreviewStop) onPreviewStop();
                }}
                disabled={!isPreviewActive}
                className="h-11 px-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs active:scale-95 active:bg-rose-700 transition-all disabled:opacity-40 rounded-r shadow-md flex items-center justify-center leading-none select-none"
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
            onClick={onVoiceToggle}
            aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}
            className={cn(
              'flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 rounded-full transition-colors shadow-sm text-[10px] md:text-sm font-bold',
              voiceEnabled ? 'bg-green-500 text-white' : 'bg-slate-400 text-white'
            )}
            data-testid="voice-toggle-button"
          >
            {voiceEnabled ? <Volume2 className="w-3 h-3 md:w-4 md:h-4" /> : <VolumeX className="w-3 h-3 md:w-4 md:h-4" />}
            {voiceEnabled ? 'On' : 'Off'}
          </button>
          <div 
            aria-label={isOnline ? "Online" : "Offline"}
            className={cn(
              'flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 rounded-full shadow-sm text-[10px] md:text-sm font-bold',
              isOnline ? 'bg-green-500 text-white' : 'bg-slate-400 text-white'
            )}
          >
            {isOnline ? <Wifi className="w-3 h-3 md:w-4 md:h-4" /> : <WifiOff className="w-3 h-3 md:w-4 md:h-4" />}
            {isOnline ? 'Net' : 'Off'}
          </div>
          <button
            onClick={!isGpsReady && !isGpsAcquiring ? onSetLocation : undefined}
            aria-label={isGpsReady ? "GPS ready" : isGpsAcquiring ? "Acquiring GPS" : "Set GPS location"}
            className={cn(
              'flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 rounded-full transition-colors shadow-sm text-[10px] md:text-sm font-bold',
              isGpsReady 
                ? 'bg-green-500 text-white cursor-default'
                : isGpsAcquiring
                  ? 'bg-blue-500 text-white cursor-default animate-pulse'
                  : 'bg-amber-500 text-white cursor-pointer'
            )}
            disabled={isGpsReady || isGpsAcquiring}
            data-testid="gps-status-button"
          >
            {isGpsReady ? <Navigation className="w-3 h-3 md:w-4 md:h-4" /> : <MapPin className="w-3 h-3 md:w-4 md:h-4" />}
            {isGpsReady ? 'GPS' : isGpsAcquiring ? '...' : 'Set'}
          </button>
        </div>
        
        {/* Center: Road badge + Turn + Lane - larger on tablet */}
        <div className="flex items-center gap-1.5 md:gap-3 flex-1 justify-center min-w-0">
          {/* Road badge */}
          {roadInfo?.roadRef && (
            <div className={cn('px-2 md:px-3 py-0.5 md:py-1 rounded text-xs md:text-base font-bold shadow-sm', getRoadBadgeStyle(roadInfo.roadRef))}>
              {roadInfo.roadRef}
              {roadInfo.junction?.ref && <span className="ml-1 text-[10px] md:text-sm opacity-80">J{roadInfo.junction.ref}</span>}
            </div>
          )}
          
          {/* Turn Indicator */}
          {turnInfo && (
            <div className="flex items-center gap-1 md:gap-2 bg-white/80 px-2 md:px-3 py-0.5 md:py-1 rounded shadow-sm border border-gray-200">
              <div className="text-blue-600">{getTurnIcon(turnInfo.direction)}</div>
              <span className="text-xs md:text-base font-bold text-gray-900">{formatTurnDistance(turnInfo.distance)}</span>
            </div>
          )}
          
          {/* Lane Guidance */}
          {laneInfo && laneInfo.lanes.length > 0 && (
            <div className="flex items-center gap-0.5 md:gap-1 bg-white/80 px-1.5 md:px-2 py-0.5 md:py-1 rounded shadow-sm border border-gray-200">
              {laneInfo.lanes.map((lane, index) => (
                <div 
                  key={index}
                  className={cn(
                    'w-4 h-4 md:w-6 md:h-6 rounded border flex items-center justify-center',
                    lane.isRecommended ? 'bg-green-100 border-green-500' : 'bg-gray-100 border-gray-300'
                  )}
                >
                  {getLaneIcon(lane.direction, lane.isRecommended)}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Right: Nav status badge - larger on tablet */}
        {(isNavigating || isPreviewActive) && (
          <div className={cn(
            'px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-sm font-bold shadow-sm flex-shrink-0',
            isNavigating ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
          )}>
            {isNavigating ? 'NAV' : 'PRV'}
          </div>
        )}
      </div>
    </div>
  );
}
