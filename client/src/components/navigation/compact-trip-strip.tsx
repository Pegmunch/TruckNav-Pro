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
  trafficDelayMinutes?: number;
  isLandscapeMode?: boolean;
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
  trafficDelayMinutes = 0,
  isLandscapeMode = false
}: CompactTripStripProps) {
  const { formatDistance, system } = useMeasurement();
  const unit = system === 'imperial' ? 'mi' : 'km';
  
  const isGpsReady = gpsStatus === 'ready' || gpsStatus === 'manual';
  const isGpsAcquiring = gpsStatus === 'acquiring' || gpsStatus === 'initializing';

  const adjustedEta = eta + trafficDelayMinutes;
  const arrivalTime = new Date(Date.now() + adjustedEta * 60000);
  const arrivalTimeStr = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const hasTrafficDelay = trafficDelayMinutes > 0;

  const convertedSpeed = unit === 'mi' 
    ? Math.round(currentSpeed * 2.237)
    : Math.round(currentSpeed * 3.6);
  
  const convertedSpeedLimit = speedLimit 
    ? (unit === 'mi' ? Math.round(speedLimit * 0.621371) : speedLimit)
    : null;
  
  const isSpeeding = convertedSpeedLimit && convertedSpeed > convertedSpeedLimit;
  const speedUnit = unit === 'mi' ? 'MPH' : 'KM/H';

  const ls = isLandscapeMode;

  const getTurnIcon = (direction: string) => {
    const iconProps = { className: ls ? "w-4 h-4 stroke-[2.5px]" : "w-5 h-5 md:w-10 md:h-10 stroke-[2.5px]" };
    const d = direction.toLowerCase();
    switch (d) {
      case 'straight':
      case 'slight_right':
      case 'slight_left':
        return <ArrowUp {...iconProps} />;
      case 'right':
      case 'sharp_right': 
      case 'sharp_left':
      case 'left':
        if (d.includes('left')) return <ArrowLeft {...iconProps} />;
        if (d.includes('right')) return <ArrowRight {...iconProps} />;
        return <ArrowUp {...iconProps} />;
      default: 
        return <ArrowUp {...iconProps} />;
    }
  };

  const formatTurnDistance = (distanceM: number): string => {
    return "";
  };

  const getRoadBadgeStyle = (ref: string) => {
    const upperRef = ref.toUpperCase();
    if (upperRef.startsWith('M')) return 'bg-blue-600 text-white border-blue-700';
    if (upperRef.startsWith('A')) return 'bg-green-600 text-white border-green-700';
    if (upperRef.startsWith('B')) return 'bg-amber-500 text-black border-amber-600';
    return 'bg-gray-600 text-white border-gray-700';
  };

  const getLaneArrow = (direction: string, isRecommended: boolean, index: number, totalLanes: number, roadInfo?: RoadInfo | null) => {
    const iconClass = ls ? "w-3 h-3 stroke-[2.5px]" : "w-3.5 h-3.5 md:w-5 md:h-5 stroke-[2.5px]";
    const destination = roadInfo?.destination?.toLowerCase() || '';
    const isActuallyRecommended = isRecommended ||
      (destination.includes('left lane') && index === 0) ||
      (destination.includes('right lane') && index === totalLanes - 1) ||
      (destination.includes('middle lane') && index > 0 && index < totalLanes - 1);

    if (!isActuallyRecommended) {
      return <Minus className={cn(iconClass, "text-gray-400")} />;
    }
    switch (direction) {
      case 'left': return <ArrowLeft className={cn(iconClass, "text-blue-600")} />;
      case 'right': return <ArrowRight className={cn(iconClass, "text-blue-600")} />;
      case 'straight': return <ArrowUp className={cn(iconClass, "text-blue-600")} />;
      case 'exit': return <ArrowUpRight className={cn(iconClass, "text-blue-600")} />;
      default: return <ArrowUp className={cn(iconClass, "text-blue-600")} />;
    }
  };

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

  // ==================== LANDSCAPE MODE: ultra-compact single row ====================
  if (ls) {
    return (
      <div
        className={cn(
          'fixed left-0 right-0 px-1',
          'bg-white/95 dark:bg-gray-900/95',
          'border-b border-blue-500',
          'flex items-center gap-0.5',
          'pointer-events-auto',
          className
        )}
        style={{
          top: 'calc(28px + max(env(safe-area-inset-top, 0px), 0px))',
          zIndex: 6000,
          height: '22px',
        }}
        data-testid="compact-trip-strip"
      >
        {/* Turn arrow */}
        {turnInfo && (isNavigating || isPreviewActive) && (
          <div className="flex items-center justify-center w-[18px] h-[18px] bg-blue-600 rounded flex-shrink-0">
            {getTurnIcon(turnInfo.direction)}
          </div>
        )}

        {/* ETA */}
        <div className="flex items-center gap-px bg-blue-600 text-white px-1 rounded flex-shrink-0" style={{ height: '16px' }}>
          <Clock className="w-2.5 h-2.5" />
          <span className="text-[8px] font-bold whitespace-nowrap leading-none">{eta}m</span>
        </div>

        {/* Arrival */}
        <div className={cn(
          "flex items-center gap-px text-white px-1 rounded flex-shrink-0",
          hasTrafficDelay ? "bg-orange-600" : "bg-purple-600"
        )} style={{ height: '16px' }}>
          <Timer className="w-2.5 h-2.5" />
          <span className="text-[8px] font-bold whitespace-nowrap leading-none">{arrivalTimeStr}</span>
          {hasTrafficDelay && <span className="text-[6px] opacity-80">+{Math.round(trafficDelayMinutes)}m</span>}
        </div>

        {/* Speed limit circle */}
        {(isNavigating || isPreviewActive) && (
          <div className={cn(
            'flex items-center justify-center w-[16px] h-[16px] rounded-full border flex-shrink-0',
            convertedSpeedLimit ? 'bg-gray-100 dark:bg-gray-800 border-red-500' : 'bg-gray-100 dark:bg-gray-800 border-gray-400'
          )}>
            <span className="text-[7px] font-bold text-gray-900 dark:text-white leading-none">{convertedSpeedLimit || '--'}</span>
          </div>
        )}

        {/* Current speed */}
        {(isNavigating || isPreviewActive) && (
          <div className={cn(
            'flex items-center gap-px px-1 rounded flex-shrink-0',
            isSpeeding ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
          )} style={{ height: '16px' }}>
            <Gauge className={cn('w-2.5 h-2.5', isSpeeding ? 'text-white' : 'text-blue-600')} />
            <span className={cn('text-[8px] font-bold leading-none', isSpeeding && 'animate-pulse')}>{convertedSpeed}</span>
            <span className={cn('text-[6px] font-medium opacity-80 leading-none', isSpeeding ? 'text-red-100' : 'text-gray-500')}>{speedUnit}</span>
          </div>
        )}

        {/* Road badge */}
        {roadInfo?.roadRef && (
          <div className={cn('px-1 rounded text-[7px] font-bold flex-shrink-0 leading-none', getRoadBadgeStyle(roadInfo.roadRef))} style={{ height: '14px', display: 'flex', alignItems: 'center' }}>
            {roadInfo.roadRef}
          </div>
        )}

        {/* Lane guidance */}
        {laneInfo && laneInfo.lanes.length > 0 && (
          <div className="flex items-center gap-0 bg-gray-100/90 dark:bg-gray-800/90 px-0.5 rounded border border-blue-500 flex-shrink-0" style={{ height: '16px' }}>
            {laneInfo.lanes.map((lane, index) => (
              <div key={index} className="flex items-center justify-center">
                {getLaneArrow(lane.direction, lane.isRecommended, index, laneInfo.lanes.length, roadInfo)}
              </div>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Wifi */}
        <div className="flex items-center text-white px-0.5 rounded flex-shrink-0" style={{ backgroundColor: isOnline ? '#22c55e' : '#ef4444', height: '14px' }}>
          {isOnline ? <Wifi className="w-2 h-2" /> : <WifiOff className="w-2 h-2" />}
        </div>

        {/* GPS */}
        <button
          onClick={!isGpsReady && !isGpsAcquiring ? onSetLocation : undefined}
          className="flex items-center text-white px-0.5 rounded flex-shrink-0"
          style={{ backgroundColor: isGpsReady ? '#22c55e' : isGpsAcquiring ? '#3b82f6' : '#ef4444', height: '14px' }}
          disabled={isGpsReady || isGpsAcquiring}
        >
          {isGpsReady ? <Navigation className="w-2 h-2" /> : <MapPin className="w-2 h-2" />}
        </button>

        {/* Voice toggle */}
        <button
          type="button"
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as any)._touchHandled = Date.now();
            if (onVoiceToggle) onVoiceToggle();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const lastTouch = (e.currentTarget as any)._touchHandled || 0;
            if (Date.now() - lastTouch < 500) return;
            if (onVoiceToggle) onVoiceToggle();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}
          className={cn(
            'flex items-center rounded flex-shrink-0',
            voiceEnabled ? 'bg-green-500 text-white' : 'bg-slate-400 text-white'
          )}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', height: '16px', padding: '0 3px' }}
          data-testid="voice-toggle-button"
        >
          {voiceEnabled ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
        </button>

        {/* NAV/PRV badge */}
        {(isNavigating || isPreviewActive) && (
          <div className={cn(
            'px-1 rounded-full text-[7px] font-bold flex-shrink-0 leading-none flex items-center',
            isNavigating ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
          )} style={{ height: '14px' }}>
            {isNavigating ? 'NAV' : 'PRV'}
          </div>
        )}

        {/* Preview/Stop buttons */}
        {!isNavigating && (
          <div className="flex items-center gap-0 flex-shrink-0">
            <button
              onClick={onPreviewStart}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (!isPreviewActive && onPreviewStart) onPreviewStart();
              }}
              disabled={isPreviewActive}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[7px] active:scale-95 disabled:opacity-40 rounded-l flex items-center justify-center leading-none select-none"
              style={{ touchAction: 'manipulation', height: '18px', padding: '0 4px', WebkitTapHighlightColor: 'transparent' }}
              data-testid="button-preview-start"
            >
              Pre
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
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-[7px] active:scale-95 disabled:opacity-40 rounded-r flex items-center justify-center leading-none select-none"
              style={{ touchAction: 'manipulation', height: '18px', padding: '0 4px', WebkitTapHighlightColor: 'transparent' }}
              data-testid="button-preview-stop"
            >
              Stp
            </button>
          </div>
        )}
      </div>
    );
  }

  // ==================== PORTRAIT MODE: compact (half of original size) ====================
  return (
    <div 
      className={cn(
        'fixed left-0 right-0 px-1 md:px-4 py-0.5 md:py-2',
        'bg-white dark:bg-gray-900',
        'border-b border-blue-500 shadow-sm',
        'flex flex-col gap-0.5 md:gap-2',
        'pointer-events-auto',
        className
      )}
      style={{ 
        top: 'calc(40px + max(env(safe-area-inset-top, 0px), 0px))',
        zIndex: 6000,
      }}
      data-testid="compact-trip-strip"
    >
      {/* Row 1: ETA info + Speed + Action buttons */}
      <div className="flex items-center justify-between gap-0.5 md:gap-2">
        {/* Left: Direction Square + ETA/Distance/Arrival */}
        <div className="flex items-center gap-px md:gap-2 flex-1 min-w-0">
          {/* Direction Square */}
          {turnInfo && (isNavigating || isPreviewActive) && (
            <div 
              className="flex flex-col items-center justify-center w-6 h-6 md:w-14 md:h-14 bg-blue-600 rounded shadow-sm flex-shrink-0 relative overflow-hidden"
              data-testid="direction-square"
              aria-label={`Next turn: ${turnInfo.direction.replace('_', ' ')}`}
            >
              <div className="flex-grow flex items-center justify-center">
                {getTurnIcon(turnInfo.direction)}
              </div>
              <div className="w-full bg-black/30 text-center leading-none">
                <span className="text-[6px] md:text-[11px] font-black text-white tabular-nums">
                  {Math.round(turnInfo.distance * 3.28084)}
                  <span className="text-[5px] md:text-[8px] ml-0.5 uppercase font-bold">ft</span>
                </span>
              </div>
            </div>
          )}
          {/* ETA badge */}
          <div className="flex items-center gap-px md:gap-1.5 bg-blue-600 text-white px-1 md:px-4 py-0.5 md:py-2.5 rounded shadow-sm flex-shrink-0">
            <Clock className="w-2.5 h-2.5 md:w-5 md:h-5" />
            <span className="text-[9px] md:text-lg font-bold whitespace-nowrap">{eta}m</span>
          </div>
          {/* Arrival time */}
          <div className={cn(
            "flex items-center gap-px md:gap-1.5 text-white px-1 md:px-4 py-0.5 md:py-2.5 rounded shadow-sm flex-shrink-0",
            hasTrafficDelay ? "bg-orange-600" : "bg-purple-600"
          )}>
            <Timer className="w-2.5 h-2.5 md:w-5 md:h-5" />
            <span className="text-[9px] md:text-lg font-bold whitespace-nowrap">{arrivalTimeStr}</span>
            {hasTrafficDelay && <span className="text-[7px] md:text-sm opacity-80">+{Math.round(trafficDelayMinutes)}m</span>}
          </div>
          {/* Distance remaining - tablet only */}
          <div className="hidden md:flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2.5 rounded shadow-sm flex-shrink-0">
            <Route className="w-5 h-5" />
            <span className="text-lg font-bold whitespace-nowrap">{formatDistance(distanceRemaining, 'km')}</span>
          </div>
          {/* Wifi status */}
          <div 
            className="flex items-center gap-px md:gap-1 text-white px-1 md:px-3 py-0.5 md:py-2.5 rounded shadow-sm flex-shrink-0"
            style={{ backgroundColor: isOnline ? '#22c55e' : '#ef4444' }}
          >
            {isOnline ? <Wifi className="w-2.5 h-2.5 md:w-5 md:h-5" /> : <WifiOff className="w-2.5 h-2.5 md:w-5 md:h-5" />}
            <span className="text-[8px] md:text-base font-bold">{isOnline ? 'Net' : 'Off'}</span>
          </div>
          {/* GPS status */}
          <button
            onClick={!isGpsReady && !isGpsAcquiring ? onSetLocation : undefined}
            className="flex items-center gap-px md:gap-1 text-white px-1 md:px-3 py-0.5 md:py-2.5 rounded shadow-sm flex-shrink-0"
            style={{ backgroundColor: isGpsReady ? '#22c55e' : isGpsAcquiring ? '#3b82f6' : '#ef4444' }}
            disabled={isGpsReady || isGpsAcquiring}
          >
            {isGpsReady ? <Navigation className="w-2.5 h-2.5 md:w-5 md:h-5" /> : <MapPin className="w-2.5 h-2.5 md:w-5 md:h-5" />}
            <span className="text-[8px] md:text-base font-bold">{isGpsReady ? 'GPS' : isGpsAcquiring ? '...' : 'Set'}</span>
          </button>
        </div>
        
        {/* Center: Speed limit + Current speed */}
        {(isNavigating || isPreviewActive) && (
          <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
            {/* Speed Limit Sign */}
            <div className={cn(
              'flex items-center justify-center w-6 h-6 md:w-14 md:h-14 rounded-full border-[1.5px] md:border-[3px]',
              convertedSpeedLimit ? 'bg-gray-100 dark:bg-gray-800 border-red-500' : 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600'
            )}>
              <span className="text-[9px] md:text-xl font-bold text-gray-900 dark:text-white">{convertedSpeedLimit || '--'}</span>
            </div>
            {/* Current Speed */}
            <div className={cn(
              'flex items-center gap-px md:gap-1.5 px-1 md:px-4 py-0.5 md:py-2.5 rounded-lg shadow-sm min-w-[48px] md:min-w-[120px] justify-center',
              isSpeeding ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
            )}>
              <Gauge className={cn('w-3 h-3 md:w-6 md:h-6', isSpeeding ? 'text-white' : 'text-blue-600')} />
              <span className={cn('text-[10px] md:text-2xl font-bold', isSpeeding && 'animate-pulse')}>{convertedSpeed}</span>
              <span className={cn('text-[7px] md:text-sm font-medium opacity-80', isSpeeding ? 'text-red-100' : 'text-gray-500 dark:text-gray-400')}>{speedUnit}</span>
            </div>
          </div>
        )}
        
        {/* Right: Preview/Stop buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0 pr-0.5">
          {!isNavigating && (
            <div className="flex flex-row items-center gap-0">
              <button
                onClick={onPreviewStart}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (!isPreviewActive && onPreviewStart) onPreviewStart();
                }}
                disabled={isPreviewActive}
                className="h-7 md:h-12 px-2 md:px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[9px] md:text-base active:scale-95 active:bg-blue-800 transition-all disabled:opacity-40 rounded-l shadow-sm flex items-center justify-center leading-none select-none"
                style={{ touchAction: 'manipulation', minWidth: '36px', WebkitTapHighlightColor: 'transparent' }}
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
                className="h-7 md:h-12 px-2 md:px-5 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-[9px] md:text-base active:scale-95 active:bg-rose-700 transition-all disabled:opacity-40 rounded-r shadow-sm flex items-center justify-center leading-none select-none touch-manipulation"
                style={{ touchAction: 'manipulation', minWidth: '30px', WebkitTapHighlightColor: 'transparent' }}
                data-testid="button-preview-stop"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Row 2: Status icons + Road/Turn/Lane info + Nav status */}
      <div className="flex items-center justify-between gap-1 md:gap-4">
        {/* Left: Voice toggle */}
        <div className="flex items-center gap-1 md:gap-2">
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
              'flex items-center gap-0.5 md:gap-1.5 px-2 md:px-4 py-1 md:py-1.5 rounded-full transition-colors shadow-sm text-[8px] md:text-base font-bold select-none active:scale-95',
              voiceEnabled ? 'bg-green-500 text-white active:bg-green-600' : 'bg-slate-400 text-white active:bg-slate-500'
            )}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: '22px', minWidth: '40px', WebkitUserSelect: 'none', userSelect: 'none' }}
            data-testid="voice-toggle-button"
          >
            {voiceEnabled ? <Volume2 className="w-3 h-3 md:w-5 md:h-5" /> : <VolumeX className="w-3 h-3 md:w-5 md:h-5" />}
            {voiceEnabled ? 'On' : 'Off'}
          </button>
        </div>
        
        {/* Center: Road badge + Turn + Lane */}
        <div className="flex items-center gap-1 md:gap-3 flex-1 justify-center min-w-0">
          {roadInfo?.roadRef && (
            <div className={cn('px-1.5 md:px-4 py-px md:py-1.5 rounded text-[9px] md:text-lg font-bold shadow-sm', getRoadBadgeStyle(roadInfo.roadRef))}>
              {roadInfo.roadRef}
              {roadInfo.junction?.ref && <span className="ml-0.5 text-[8px] md:text-sm opacity-80">J{roadInfo.junction.ref}</span>}
            </div>
          )}
          
          {(turnInfo || (laneInfo && laneInfo.lanes.length > 0)) && (
            <div className="flex items-center gap-1 md:gap-2.5 bg-gray-100/90 dark:bg-gray-800/90 px-1.5 md:px-4 py-0.5 md:py-2 rounded-lg shadow-sm border border-blue-500">
              <div className="flex items-center gap-px md:gap-1.5">
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
              {turnInfo && turnInfo.distance > 0 && (
                <span className="text-[9px] md:text-lg font-bold text-gray-900 dark:text-white ml-0.5">
                  {formatTurnDistance(turnInfo.distance)}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Right: Nav status badge */}
        {(isNavigating || isPreviewActive) && (
          <div className={cn(
            'px-1.5 md:px-4 py-px md:py-1.5 rounded-full text-[8px] md:text-base font-bold shadow-sm flex-shrink-0',
            isNavigating ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
          )}>
            {isNavigating ? 'NAV' : 'PRV'}
          </div>
        )}
      </div>
    </div>
  );
}
