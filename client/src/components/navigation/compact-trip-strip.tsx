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
  // New props from ProfessionalNavHUD
  currentSpeed?: number; // in m/s
  speedLimit?: number; // in km/h
  isNavigating?: boolean;
  onCancelNavigation?: () => void;
  isCancellingNavigation?: boolean;
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
  isCancellingNavigation = false
}: CompactTripStripProps) {
  const { formatDistance, system } = useMeasurement();
  const unit = system === 'imperial' ? 'mi' : 'km';
  
  const isGpsReady = gpsStatus === 'ready' || gpsStatus === 'manual';
  const isGpsAcquiring = gpsStatus === 'acquiring' || gpsStatus === 'initializing';

  const arrivalTime = new Date(Date.now() + eta * 60000);
  const arrivalTimeStr = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Speed conversion
  const convertedSpeed = unit === 'mi' 
    ? Math.round(currentSpeed * 2.237) // m/s to mph
    : Math.round(currentSpeed * 3.6);   // m/s to km/h
  
  const convertedSpeedLimit = speedLimit 
    ? (unit === 'mi' ? Math.round(speedLimit * 0.621371) : speedLimit)
    : null;
  
  const isSpeeding = convertedSpeedLimit && convertedSpeed > convertedSpeedLimit;
  const speedUnit = unit === 'mi' ? 'MPH' : 'KM/H';

  // Get turn icon
  const getTurnIcon = (direction: string) => {
    const iconProps = { className: "w-6 h-6 stroke-[2.5px]" };
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

  // Get lane direction icon (compact)
  const getLaneIcon = (direction: string, isRecommended: boolean) => {
    const iconClass = cn("w-3 h-3", isRecommended ? "text-green-600" : "text-gray-500");
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
        'fixed left-0 right-0 px-2 py-1.5',
        'bg-white/50 backdrop-blur-xl',
        'border-b-2 border-blue-500 shadow-md',
        'flex flex-col gap-1',
        'pointer-events-auto',
        'lg:hidden',
        className
      )}
      style={{ 
        top: 'calc(64px + max(env(safe-area-inset-top, 0px), 0px))',
        zIndex: 99998,
      }}
      data-testid="compact-trip-strip"
    >
      {/* Row 1: ETA info + Speed + Action buttons */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: ETA/Distance/Arrival */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded shadow-sm">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{eta}m</span>
          </div>
          <div className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-1 rounded shadow-sm">
            <Route className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{formatDistance(distanceRemaining, "miles")}</span>
          </div>
          <div className="flex items-center gap-1 bg-purple-600 text-white px-2 py-1 rounded shadow-sm">
            <Timer className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{arrivalTimeStr}</span>
          </div>
        </div>
        
        {/* Center: Speed limit + Current speed (unpacked) */}
        {(isNavigating || isPreviewActive) && (
          <div className="flex items-center gap-2">
            {/* Speed Limit Sign */}
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full border-2',
              convertedSpeedLimit ? 'bg-white border-red-500' : 'bg-gray-100 border-gray-300'
            )}>
              <span className="text-xs font-bold text-gray-900">{convertedSpeedLimit || '--'}</span>
            </div>
            {/* Current Speed */}
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg shadow-sm',
              isSpeeding ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-900'
            )}>
              <Gauge className={cn('w-4 h-4', isSpeeding ? 'text-white' : 'text-blue-600')} />
              <span className={cn('text-base font-bold', isSpeeding && 'animate-pulse')}>{convertedSpeed}</span>
              <span className={cn('text-[10px]', isSpeeding ? 'text-red-100' : 'text-gray-500')}>{speedUnit}</span>
            </div>
          </div>
        )}
        
        {/* Right: Action buttons - positioned slightly left */}
        <div className="flex items-center gap-1 flex-shrink-0 mr-4">
          {isNavigating && onCancelNavigation && (
            <Button
              onClick={onCancelNavigation}
              size="sm"
              disabled={isCancellingNavigation}
              className="h-5 px-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-[9px] active:scale-95 transition-transform disabled:opacity-50 rounded shadow-sm flex items-center gap-0.5"
              style={{ touchAction: 'manipulation' }}
              data-testid="button-cancel-navigation"
            >
              <X className="w-3 h-3" />
              End
            </Button>
          )}
          {!isNavigating && (
            <div className="flex flex-row items-center gap-0.5">
              <button
                onClick={onPreviewStart}
                disabled={isPreviewActive}
                className="h-5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[9px] active:scale-95 transition-all disabled:opacity-40 rounded-l-full shadow-sm flex items-center justify-center"
                style={{ touchAction: 'manipulation', minWidth: '48px' }}
                data-testid="button-preview-start"
              >
                Preview
              </button>
              <button
                onClick={onPreviewStop}
                disabled={!isPreviewActive}
                className="h-5 px-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-[9px] active:scale-95 transition-all disabled:opacity-40 rounded-r-full shadow-sm flex items-center justify-center"
                style={{ touchAction: 'manipulation', minWidth: '36px' }}
                data-testid="button-preview-stop"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Row 2: Status icons + Road/Turn/Lane info + Nav status */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Status icons with labels */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onVoiceToggle}
            aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors shadow-sm text-[10px] font-bold',
              voiceEnabled ? 'bg-green-500 text-white' : 'bg-slate-400 text-white'
            )}
            data-testid="voice-toggle-button"
          >
            {voiceEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {voiceEnabled ? 'On' : 'Off'}
          </button>
          <div 
            aria-label={isOnline ? "Online" : "Offline"}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full shadow-sm text-[10px] font-bold',
              isOnline ? 'bg-green-500 text-white' : 'bg-slate-400 text-white'
            )}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Net' : 'Off'}
          </div>
          <button
            onClick={!isGpsReady && !isGpsAcquiring ? onSetLocation : undefined}
            aria-label={isGpsReady ? "GPS ready" : isGpsAcquiring ? "Acquiring GPS" : "Set GPS location"}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors shadow-sm text-[10px] font-bold',
              isGpsReady 
                ? 'bg-green-500 text-white cursor-default'
                : isGpsAcquiring
                  ? 'bg-blue-500 text-white cursor-default animate-pulse'
                  : 'bg-amber-500 text-white cursor-pointer'
            )}
            disabled={isGpsReady || isGpsAcquiring}
            data-testid="gps-status-button"
          >
            {isGpsReady ? <Navigation className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
            {isGpsReady ? 'GPS' : isGpsAcquiring ? '...' : 'Set'}
          </button>
        </div>
        
        {/* Center: Road badge + Turn + Lane */}
        <div className="flex items-center gap-1.5 flex-1 justify-center min-w-0">
          {/* Road badge */}
          {roadInfo?.roadRef && (
            <div className={cn('px-2 py-0.5 rounded text-xs font-bold shadow-sm', getRoadBadgeStyle(roadInfo.roadRef))}>
              {roadInfo.roadRef}
              {roadInfo.junction?.ref && <span className="ml-1 text-[10px] opacity-80">J{roadInfo.junction.ref}</span>}
            </div>
          )}
          
          {/* Turn Indicator */}
          {turnInfo && (
            <div className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded shadow-sm border border-gray-200">
              <div className="text-blue-600">{getTurnIcon(turnInfo.direction)}</div>
              <span className="text-xs font-bold text-gray-900">{formatTurnDistance(turnInfo.distance)}</span>
            </div>
          )}
          
          {/* Lane Guidance */}
          {laneInfo && laneInfo.lanes.length > 0 && (
            <div className="flex items-center gap-0.5 bg-white/80 px-1.5 py-0.5 rounded shadow-sm border border-gray-200">
              {laneInfo.lanes.map((lane, index) => (
                <div 
                  key={index}
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center',
                    lane.isRecommended ? 'bg-green-100 border-green-500' : 'bg-gray-100 border-gray-300'
                  )}
                >
                  {getLaneIcon(lane.direction, lane.isRecommended)}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Right: Nav status badge */}
        {(isNavigating || isPreviewActive) && (
          <div className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm flex-shrink-0',
            isNavigating ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
          )}>
            {isNavigating ? 'NAV' : 'PRV'}
          </div>
        )}
      </div>
    </div>
  );
}
