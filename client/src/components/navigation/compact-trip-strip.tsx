import { Clock, Route, Navigation2, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { motion, useDragControls } from 'framer-motion';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const dragControls = useDragControls();
  const constraintsRef = useRef(null);

  return (
    <motion.div 
      drag
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ 
        top: 10, 
        left: 10, 
        right: typeof window !== 'undefined' ? window.innerWidth - 410 : 300, 
        bottom: typeof window !== 'undefined' ? window.innerHeight - 150 : 500 
      }}
      dragElastic={0.1}
      dragMomentum={false}
      className={cn(
        'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/20 shadow-2xl mobile-safe-top shrink-0 backdrop-blur-xl rounded-2xl overflow-hidden touch-none fixed w-[92vw] left-[4vw] max-w-[400px]',
        isExpanded ? 'h-auto' : 'h-[72px]',
        className
      )}
      style={{ pointerEvents: 'auto' }}
      data-testid="compact-trip-strip"
    >
      {/* Drag Handle */}
      <div 
        className="h-6 flex items-center justify-center bg-white/5 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripHorizontal className="w-6 h-6 text-white/30" />
      </div>

      <div className="px-5 py-2 flex items-center justify-between gap-4">
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

        {/* Right: Toggle & Maneuver */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {!isExpanded && (
            <div className="flex items-center gap-2 shrink-0 bg-gradient-to-r from-blue-500/20 to-transparent px-3 py-1.5 rounded-lg max-w-[150px] overflow-hidden">
              <Navigation2 className="w-5 h-5 text-blue-400 shrink-0 drop-shadow-glow" />
              <span className="text-base font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-md">
                {nextManeuver}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 pb-4 space-y-3 border-t border-white/10 mt-2 pt-3"
        >
          <div className="flex items-start gap-3 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
            <Navigation2 className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
            <div>
              <div className="text-xs font-medium text-blue-400 uppercase tracking-wider">Next Maneuver</div>
              <div className="text-lg font-bold text-white leading-tight">{nextManeuver}</div>
              <div className="text-sm font-semibold text-gray-400 mt-1">In {nextDistance.toFixed(1)} miles</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Total Distance</div>
              <div className="text-lg font-bold text-white">{distanceRemaining.toFixed(1)} mi</div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Remaining Time</div>
              <div className="text-lg font-bold text-white">{eta} min</div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
