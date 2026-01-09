import { Clock, Route, Wifi, WifiOff, Navigation, MapPin, Timer, Volume2, VolumeX, ArrowUp, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUpLeft, ChevronRight } from 'lucide-react';
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
  laneInfo
}: CompactTripStripProps) {
  const { formatDistance, system } = useMeasurement();
  const unit = system === 'imperial' ? 'mi' : 'km';
  
  const isGpsReady = gpsStatus === 'ready' || gpsStatus === 'manual';
  const isGpsAcquiring = gpsStatus === 'acquiring' || gpsStatus === 'initializing';

  const arrivalTime = new Date(Date.now() + eta * 60000);
  const arrivalTimeStr = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
        'fixed left-0 right-0 px-3 py-2',
        'bg-white/30 backdrop-blur-xl',
        'border-2 border-blue-500 shadow-lg',
        'flex items-stretch justify-between gap-2',
        'pointer-events-auto',
        'lg:hidden',
        className
      )}
      style={{ 
        top: 'calc(56px + max(env(safe-area-inset-top, 0px), 0px))',
        zIndex: 4800,
        minHeight: '90px'
      }}
      data-testid="compact-trip-strip"
    >
      {/* Left Section: ETA, Distance, Arrival Time - Same size as right buttons */}
      <div className="flex flex-col gap-1.5 min-w-0 flex-shrink-0">
        {/* ETA */}
        <div className="flex items-center gap-1.5 h-8 bg-blue-500/30 px-3 py-1.5 rounded-full shadow-sm border border-blue-400/50">
          <Clock className="w-4 h-4 text-blue-700" />
          <span className="text-sm font-bold text-blue-900">{eta} min</span>
        </div>
        {/* Distance */}
        <div className="flex items-center gap-1.5 h-8 bg-emerald-500/30 px-3 py-1.5 rounded-full shadow-sm border border-emerald-400/50">
          <Route className="w-4 h-4 text-emerald-700" />
          <span className="text-sm font-bold text-emerald-900">
            {formatDistance(distanceRemaining, "miles")}
          </span>
        </div>
        {/* Arrival Time */}
        <div className="flex items-center gap-1.5 h-8 bg-purple-500/30 px-3 py-1.5 rounded-full shadow-sm border border-purple-400/50">
          <Timer className="w-4 h-4 text-purple-700" />
          <span className="text-sm font-bold text-purple-900">
            {arrivalTimeStr}
          </span>
        </div>
      </div>

      {/* Center Section: Road Signage, Turn & Lane Indicators */}
      <div className="flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0">
        {/* Road Badge */}
        {roadInfo?.roadRef && (
          <div className={cn(
            'px-3 py-1 rounded-md text-sm font-bold shadow-sm border',
            getRoadBadgeStyle(roadInfo.roadRef)
          )}>
            <span>{roadInfo.roadRef}</span>
            {roadInfo.junction?.ref && (
              <span className="ml-1 text-xs opacity-80">J{roadInfo.junction.ref}</span>
            )}
          </div>
        )}

        {/* Turn Indicator (compact) */}
        {turnInfo && (
          <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl shadow-sm border border-gray-200/50">
            <div className="text-blue-600">
              {getTurnIcon(turnInfo.direction)}
            </div>
            <div className="text-sm font-bold text-gray-900">
              {formatTurnDistance(turnInfo.distance)}
            </div>
            {turnInfo.roadName && (
              <div className="text-xs text-gray-600 truncate max-w-[80px]">
                {turnInfo.roadName}
              </div>
            )}
          </div>
        )}

        {/* Lane Guidance (compact) */}
        {laneInfo && laneInfo.lanes.length > 0 && (
          <div className="flex items-center gap-0.5 bg-white/60 px-2 py-1 rounded-lg shadow-sm border border-gray-200/50">
            {laneInfo.lanes.map((lane, index) => (
              <div 
                key={index}
                className={cn(
                  'w-5 h-5 rounded border flex items-center justify-center',
                  lane.isRecommended 
                    ? 'bg-green-100 border-green-500' 
                    : 'bg-gray-100 border-gray-300'
                )}
              >
                {getLaneIcon(lane.direction, lane.isRecommended)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Section: Preview + Status Buttons - Stacked (all same h-8 size) */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {/* Preview Button - same h-8 size as other buttons */}
        <div className="flex flex-row rounded-full overflow-hidden shadow-sm">
          <Button
            onClick={onPreviewStart}
            size="sm"
            disabled={isPreviewActive}
            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 rounded-l-full rounded-r-none border-r border-white/30"
            style={{ touchAction: 'manipulation' }}
            data-testid="button-preview-start"
          >
            Preview
          </Button>
          <Button
            onClick={onPreviewStop}
            size="sm"
            disabled={!isPreviewActive}
            className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 rounded-r-full rounded-l-none"
            style={{ touchAction: 'manipulation' }}
            data-testid="button-preview-stop"
          >
            Stop
          </Button>
        </div>

        {/* Voice Navigation Toggle - h-8 uniform size */}
        <button
          onClick={onVoiceToggle}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-bold transition-colors shadow-sm',
            voiceEnabled 
              ? 'bg-green-500/30 text-green-800 hover:bg-green-500/40 border border-green-400/50' 
              : 'bg-red-500/30 text-red-800 hover:bg-red-500/40 border border-red-400/50'
          )}
          data-testid="voice-toggle-button"
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span>{voiceEnabled ? 'Voice' : 'Muted'}</span>
        </button>

        {/* Online Status - h-8 uniform size */}
        <div className={cn(
          'flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-bold shadow-sm',
          isOnline 
            ? 'bg-green-500/30 text-green-800 border border-green-400/50' 
            : 'bg-red-500/30 text-red-800 border border-red-400/50'
        )}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* GPS Status - h-8 uniform size */}
        <button
          onClick={!isGpsReady && !isGpsAcquiring ? onSetLocation : undefined}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-bold transition-colors shadow-sm',
            isGpsReady 
              ? 'bg-green-500/30 text-green-800 cursor-default border border-green-400/50'
              : isGpsAcquiring
                ? 'bg-blue-500/30 text-blue-800 cursor-default border border-blue-400/50'
                : 'bg-amber-500/30 text-amber-800 hover:bg-amber-500/40 cursor-pointer border border-amber-400/50'
          )}
          disabled={isGpsReady || isGpsAcquiring}
          data-testid="gps-status-button"
        >
          {isGpsReady ? (
            <Navigation className="w-4 h-4" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
          <span>
            {isGpsReady 
              ? 'GPS' 
              : isGpsAcquiring 
                ? 'GPS...' 
                : 'Set GPS'}
          </span>
        </button>
      </div>
    </div>
  );
}
