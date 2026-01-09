import { Clock, Route, Wifi, WifiOff, Navigation, MapPin, Timer, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeasurement } from '@/components/measurement/measurement-provider';
import { Button } from '@/components/ui/button';

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
  onVoiceToggle
}: CompactTripStripProps) {
  const { formatDistance } = useMeasurement();
  
  const isGpsReady = gpsStatus === 'ready' || gpsStatus === 'manual';
  const isGpsAcquiring = gpsStatus === 'acquiring' || gpsStatus === 'initializing';

  const arrivalTime = new Date(Date.now() + eta * 60000);
  const arrivalTimeStr = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className={cn(
        'fixed left-0 right-0 px-3 py-2',
        'bg-white/30 backdrop-blur-xl',
        'border-2 border-blue-500 shadow-lg',
        'flex items-center justify-between gap-3',
        'pointer-events-auto',
        'lg:hidden',
        className
      )}
      style={{ 
        top: 'calc(56px + max(env(safe-area-inset-top, 0px), 0px))',
        zIndex: 4800,
        minHeight: '80px'
      }}
      data-testid="compact-trip-strip"
    >
      {/* Left Section: ETA, Distance, Arrival Time */}
      <div className="flex flex-col gap-1 min-w-0 flex-shrink-0">
        {/* ETA */}
        <div className="flex items-center gap-1.5 bg-blue-500/20 px-2 py-1 rounded-lg">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-gray-900">{eta} min</span>
        </div>
        {/* Distance */}
        <div className="flex items-center gap-1.5 bg-emerald-500/20 px-2 py-1 rounded-lg">
          <Route className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-gray-800">
            {formatDistance(distanceRemaining, "miles")}
          </span>
        </div>
        {/* Arrival Time */}
        <div className="flex items-center gap-1.5 bg-purple-500/20 px-2 py-1 rounded-lg">
          <Timer className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-gray-800">
            Arrive {arrivalTimeStr}
          </span>
        </div>
      </div>

      {/* Center Section: Preview Button Only (larger) */}
      <div className="flex items-center justify-center flex-1">
        <div className="flex flex-row rounded-full overflow-hidden shadow-lg">
          <Button
            onClick={onPreviewStart}
            size="lg"
            disabled={isPreviewActive}
            className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 rounded-l-full rounded-r-none border-r border-white/30"
            style={{ touchAction: 'manipulation' }}
            data-testid="button-preview-start"
          >
            Preview
          </Button>
          <Button
            onClick={onPreviewStop}
            size="lg"
            disabled={!isPreviewActive}
            className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 rounded-r-full rounded-l-none"
            style={{ touchAction: 'manipulation' }}
            data-testid="button-preview-stop"
          >
            Stop
          </Button>
        </div>
      </div>

      {/* Right Section: Status Indicators - Stacked */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {/* Voice Navigation Toggle */}
        <button
          onClick={onVoiceToggle}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors',
            voiceEnabled 
              ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30' 
              : 'bg-red-500/20 text-red-700 hover:bg-red-500/30'
          )}
          data-testid="voice-toggle-button"
        >
          {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
        </button>

        {/* Online Status */}
        <div className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
          isOnline 
            ? 'bg-green-500/20 text-green-700' 
            : 'bg-red-500/20 text-red-700'
        )}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* GPS Status */}
        <button
          onClick={!isGpsReady && !isGpsAcquiring ? onSetLocation : undefined}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors',
            isGpsReady 
              ? 'bg-green-500/20 text-green-700 cursor-default'
              : isGpsAcquiring
                ? 'bg-blue-500/20 text-blue-700 cursor-default'
                : 'bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 cursor-pointer'
          )}
          disabled={isGpsReady || isGpsAcquiring}
          data-testid="gps-status-button"
        >
          {isGpsReady ? (
            <Navigation className="w-3 h-3" />
          ) : (
            <MapPin className="w-3 h-3" />
          )}
          <span>
            {isGpsReady 
              ? 'GPS Ready' 
              : isGpsAcquiring 
                ? 'Acquiring' 
                : 'Set location'}
          </span>
        </button>
      </div>
    </div>
  );
}
