import { Clock, Route, Navigation2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactTripStripProps {
  eta: number;
  distanceRemaining: number;
  nextManeuver: string;
  nextDistance: number;
  className?: string;
}

export function CompactTripStrip({
  eta,
  distanceRemaining,
  nextManeuver,
  nextDistance,
  className
}: CompactTripStripProps) {
  return (
    <div 
      className={cn(
        'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-white/20 shadow-2xl mobile-safe-top shrink-0 backdrop-blur-xl',
        className
      )}
      data-testid="compact-trip-strip"
    >
      <div className="px-5 py-3 flex items-center justify-between gap-4">
        {/* Left: ETA & Distance */}
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0 bg-blue-500/15 px-3 py-1.5 rounded-lg">
            <Clock className="w-5 h-5 text-blue-400 drop-shadow-glow" />
            <span className="text-base font-bold text-white whitespace-nowrap drop-shadow-md">
              {eta}m
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Route className="w-5 h-5 text-emerald-400" />
            <span className="text-base font-semibold text-gray-200 whitespace-nowrap">
              {distanceRemaining.toFixed(1)} mi
            </span>
          </div>
        </div>

        {/* Right: Next Maneuver - Single Line */}
        <div className="flex items-center gap-2 max-w-[45%] overflow-hidden shrink-0 bg-gradient-to-r from-blue-500/20 to-transparent px-3 py-1.5 rounded-lg">
          <Navigation2 className="w-5 h-5 text-blue-400 shrink-0 drop-shadow-glow" />
          <span className="text-base font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-md">
            {nextManeuver} • {nextDistance.toFixed(1)} mi
          </span>
        </div>
      </div>
    </div>
  );
}
