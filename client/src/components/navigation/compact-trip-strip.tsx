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
        'bg-background/95 backdrop-blur-sm border-b shadow-lg mobile-safe-top shrink-0',
        className
      )}
      data-testid="compact-trip-strip"
    >
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        {/* Left: ETA & Distance */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary whitespace-nowrap">
              {eta}m
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Route className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {distanceRemaining.toFixed(1)} mi
            </span>
          </div>
        </div>

        {/* Right: Next Maneuver - Single Line */}
        <div className="flex items-center gap-1.5 max-w-[45%] overflow-hidden shrink-0">
          <Navigation2 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
            {nextManeuver} • {nextDistance.toFixed(1)} mi
          </span>
        </div>
      </div>
    </div>
  );
}
