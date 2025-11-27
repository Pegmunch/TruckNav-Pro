import { Gauge } from 'lucide-react';

interface BottomInstrumentationBarProps {
  speed: number;
  speedLimit?: number;
  unit?: 'mph' | 'kmh';
  hasGpsSignal?: boolean;
}

export function BottomInstrumentationBar({
  speed,
  speedLimit,
  unit = 'mph',
  hasGpsSignal = false
}: BottomInstrumentationBarProps) {
  return (
    <div className="flex items-center justify-center gap-3 bg-white/95 backdrop-blur-md rounded-full px-4 py-3 shadow-2xl border border-gray-200 w-auto max-w-[90vw] sm:min-w-[280px] sm:max-w-[360px]">
      {/* Speed gauge icon */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <Gauge className="h-6 w-6 text-gray-600" />
        </div>
      </div>

      {/* Speed display */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">
              {Math.round(speed)}
            </span>
            <span className="text-sm font-medium text-gray-500 uppercase">
              {unit}
            </span>
          </div>
          {speedLimit && (
            <div className="text-xs text-gray-500 mt-1">
              Limit: {speedLimit} {unit}
            </div>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex-shrink-0">
        <div className="text-right">
          <div className={`text-xs font-medium ${hasGpsSignal ? 'text-green-600' : 'text-orange-500'}`}>
            {hasGpsSignal ? 'GPS' : 'No GPS'}
          </div>
          {!hasGpsSignal && (
            <div className="text-xs text-gray-500">
              No road data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}