import { Clock, Route, Navigation2, Wifi, MapPin, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeasurement } from '@/components/measurement/measurement-provider';
import { ReactNode } from 'react';

const HEADER_HEIGHT = 56;

interface CompactTripStripProps {
  eta: number;
  distanceRemaining: number;
  nextManeuver: string;
  nextDistance: number;
  className?: string;
  children?: ReactNode;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
  gpsStatus?: 'available' | 'unavailable' | 'error' | 'acquiring';
  onSetLocation?: () => void;
}

export function CompactTripStrip({
  eta,
  distanceRemaining,
  nextManeuver,
  nextDistance,
  className,
  children,
  showOnlineIndicator = true,
  isOnline = true,
  gpsStatus = 'available',
  onSetLocation
}: CompactTripStripProps) {
  const { formatDistance } = useMeasurement();

  return (
    <div 
      className={cn(
        'fixed left-0 right-0 bg-white/20 backdrop-blur-xl border-b-2 border-blue-600/60 shadow-lg',
        className
      )}
      style={{ 
        top: `calc(${HEADER_HEIGHT}px + var(--safe-area-top, 0px))`,
        height: `${HEADER_HEIGHT}px`,
        zIndex: 3900,
        pointerEvents: 'auto'
      }}
      data-testid="compact-trip-strip"
    >
      <div className="h-full px-3 flex items-center justify-between gap-2">
        {/* Left Section: ETA & Distance */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-blue-600/20 px-2 py-1 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
              {eta}m
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Route className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
              {formatDistance(distanceRemaining, "miles")}
            </span>
          </div>
        </div>

        {/* Center Section: Control Buttons (children) */}
        <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
          {children}
        </div>

        {/* Right Section: Status Indicators */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Online Indicator */}
          {showOnlineIndicator && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              isOnline 
                ? "bg-green-500/20 text-green-700 border border-green-500/40"
                : "bg-red-500/20 text-red-700 border border-red-500/40"
            )}>
              <Wifi className="w-3 h-3" />
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          )}

          {/* GPS Status */}
          {gpsStatus === 'unavailable' || gpsStatus === 'error' ? (
            <button
              onClick={onSetLocation}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-700 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
            >
              <AlertCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Set location</span>
            </button>
          ) : gpsStatus === 'acquiring' ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-700 border border-blue-500/40">
              <MapPin className="w-3 h-3 animate-pulse" />
              <span className="hidden sm:inline">GPS...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-700 border border-green-500/40">
              <MapPin className="w-3 h-3" />
              <span className="hidden sm:inline">GPS</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
