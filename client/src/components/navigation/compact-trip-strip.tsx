import { Clock, Route, Wifi, WifiOff, Navigation, MapPin } from 'lucide-react';
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
  onGoStart?: () => void;
  onGoStop?: () => void;
  onSetLocation?: () => void;
  isPreviewActive?: boolean;
  isNavigating?: boolean;
}

export function CompactTripStrip({
  eta,
  distanceRemaining,
  className,
  isOnline = true,
  gpsStatus = 'ready',
  onPreviewStart,
  onPreviewStop,
  onGoStart,
  onGoStop,
  onSetLocation,
  isPreviewActive = false,
  isNavigating = false
}: CompactTripStripProps) {
  const { formatDistance } = useMeasurement();
  
  const isGpsReady = gpsStatus === 'ready' || gpsStatus === 'manual';
  const isGpsAcquiring = gpsStatus === 'acquiring' || gpsStatus === 'initializing';

  return (
    <div 
      className={cn(
        'fixed left-0 right-0 h-14 px-3',
        'bg-white/30 backdrop-blur-xl',
        'border-2 border-blue-500 shadow-lg',
        'flex items-center justify-between gap-2',
        'pointer-events-auto',
        'lg:hidden',
        className
      )}
      style={{ 
        top: 'calc(56px + max(env(safe-area-inset-top, 0px), 0px))',
        zIndex: 4800
      }}
      data-testid="compact-trip-strip"
    >
      {/* Left Section: ETA & Distance */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
        <div className="flex items-center gap-1 bg-blue-500/20 px-2 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-bold text-gray-900">{eta}m</span>
        </div>
        <div className="flex items-center gap-1">
          <Route className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-semibold text-gray-800">
            {formatDistance(distanceRemaining, "miles")}
          </span>
        </div>
      </div>

      {/* Center Section: Action Buttons - Stacked */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        {/* Preview Button - Split */}
        <div className="flex flex-row bg-blue-600 rounded-full overflow-hidden shadow-sm">
          <Button
            onClick={onPreviewStart}
            size="sm"
            disabled={isPreviewActive}
            className="h-5 px-2 bg-transparent hover:bg-white/10 text-white font-medium text-[10px] active:scale-95 transition-transform disabled:opacity-50 border-r border-white/30 rounded-none"
            style={{ touchAction: 'manipulation' }}
            data-testid="button-preview-start"
          >
            Preview
          </Button>
          <Button
            onClick={onPreviewStop}
            size="sm"
            disabled={!isPreviewActive}
            className="h-5 px-2 bg-transparent hover:bg-white/10 text-white font-medium text-[10px] active:scale-95 transition-transform disabled:opacity-50 rounded-none"
            style={{ touchAction: 'manipulation' }}
            data-testid="button-preview-stop"
          >
            Stop
          </Button>
        </div>

        {/* Go/Stop Button - Split */}
        <div className="flex flex-row bg-green-600 rounded-full overflow-hidden shadow-sm">
          <Button
            onClick={onGoStart}
            size="sm"
            disabled={isNavigating}
            className="h-5 px-2 bg-transparent hover:bg-white/10 text-white font-medium text-[10px] active:scale-95 transition-transform disabled:opacity-50 border-r border-white/30 rounded-none"
            style={{ touchAction: 'manipulation' }}
            data-testid="button-go-start"
          >
            Go
          </Button>
          <Button
            onClick={onGoStop}
            size="sm"
            disabled={!isNavigating}
            className="h-5 px-2 bg-transparent hover:bg-white/10 text-white font-medium text-[10px] active:scale-95 transition-transform disabled:opacity-50 rounded-none"
            style={{ touchAction: 'manipulation' }}
            data-testid="button-go-stop"
          >
            Stop
          </Button>
        </div>
      </div>

      {/* Right Section: Status Indicators - Stacked */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {/* Online Status */}
        <div className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
          isOnline 
            ? 'bg-green-500/20 text-green-700' 
            : 'bg-red-500/20 text-red-700'
        )}>
          {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* GPS Status */}
        <button
          onClick={!isGpsReady && !isGpsAcquiring ? onSetLocation : undefined}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-colors',
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
            <Navigation className="w-2.5 h-2.5" />
          ) : (
            <MapPin className="w-2.5 h-2.5" />
          )}
          <span>
            {isGpsReady 
              ? 'GPS' 
              : isGpsAcquiring 
                ? 'Acquiring' 
                : 'Set location'}
          </span>
        </button>
      </div>
    </div>
  );
}
