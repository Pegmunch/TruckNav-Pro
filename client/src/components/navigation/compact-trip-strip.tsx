import { Clock, Route, Navigation2, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useMeasurement } from '@/components/measurement/measurement-provider';

const STORAGE_KEY = 'trucknav-eta-position-v2';
const HEADER_HEIGHT = 56;

interface CompactTripStripProps {
  eta: number;
  distanceRemaining: number;
  nextManeuver: string;
  nextDistance: number;
  className?: string;
}

interface Position {
  x: number;
  y: number;
}

function getDefaultPosition(): Position {
  if (typeof window === 'undefined') {
    return { x: 20, y: HEADER_HEIGHT + 20 };
  }
  
  const stripWidth = Math.min(380, window.innerWidth * 0.92);
  
  // Start centered and below the navigation header (56px + safe area)
  return { 
    x: Math.max(10, (window.innerWidth - stripWidth) / 2), 
    y: 70 // Position below the TruckNav Pro header
  };
}

function clampPosition(pos: Position, expanded: boolean): Position {
  if (typeof window === 'undefined') return pos;
  
  const stripWidth = Math.min(380, window.innerWidth * 0.92);
  const stripHeight = expanded ? 200 : 80;
  const padding = 10;
  const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top') || '0', 10) || 0;
  const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom') || '0', 10) || 0;
  
  return {
    x: Math.max(padding, Math.min(pos.x, window.innerWidth - stripWidth - padding)),
    y: Math.max(safeTop + padding, Math.min(pos.y, window.innerHeight - stripHeight - safeBottom - padding))
  };
}

function loadPosition(): Position | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const pos = JSON.parse(stored) as Position;
      return clampPosition(pos, false);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function savePosition(pos: Position): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // Ignore storage errors
  }
}

export function CompactTripStrip({
  eta,
  distanceRemaining,
  nextManeuver,
  nextDistance,
  className
}: CompactTripStripProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { formatDistance } = useMeasurement();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [position, setPosition] = useState<Position>(() => {
    const saved = loadPosition();
    const initial = saved || getDefaultPosition();
    return clampPosition(initial, false);
  });

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => clampPosition(prev, isExpanded));
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isExpanded]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const newPos = clampPosition({
      x: position.x + info.offset.x,
      y: position.y + info.offset.y
    }, isExpanded);
    setPosition(newPos);
    savePosition(newPos);
  }, [position, isExpanded]);

  const handleExpandToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 30, 30]);
    }
  }, []);

  return (
    <motion.div 
      ref={containerRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      initial={false}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.5 }}
      className={cn(
        'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/20 shadow-2xl backdrop-blur-xl rounded-2xl overflow-hidden touch-none fixed w-[92vw] max-w-[380px] transition-shadow duration-300',
        isExpanded ? 'h-auto' : 'h-[72px]',
        isDragging ? 'ring-2 ring-blue-500 shadow-blue-500/30 cursor-grabbing scale-[1.02]' : 'cursor-grab',
        className
      )}
      style={{ 
        pointerEvents: 'auto',
        left: 0,
        top: 0,
        zIndex: 6000
      }}
      data-testid="compact-trip-strip"
    >
      {/* Drag Handle */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-5 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <div className="w-8 h-1 bg-white/30 rounded-full" />
      </div>

      {/* Expand/Collapse Button */}
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsExpanded(prev => !prev);
          if ('vibrate' in navigator) {
            navigator.vibrate([30, 30, 30]);
          }
        }}
        className="absolute top-2 right-2 p-2.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 transition-all z-10 select-none touch-manipulation"
        style={{ touchAction: 'manipulation' }}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        <GripHorizontal className="w-5 h-5 text-white/60" />
      </button>

      <div className="px-5 py-4 flex items-center justify-between gap-4 pt-6">
        {/* Left: ETA & Distance */}
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0 bg-blue-500/15 px-3 py-1.5 rounded-lg">
            <Clock className="w-5 h-5 text-blue-400 drop-shadow-glow" />
            <div className="flex flex-col">
              <span className="text-base font-bold text-white whitespace-nowrap drop-shadow-md leading-none">
                {eta}m
              </span>
              <span className="text-[10px] font-medium text-blue-300 whitespace-nowrap leading-tight mt-0.5">
                {formatDistance(distanceRemaining, "miles")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Route className="w-5 h-5 text-emerald-400" />
            <span className="text-base font-semibold text-gray-200 whitespace-nowrap">
              {formatDistance(distanceRemaining, "miles")}
            </span>
          </div>
        </div>

        {/* Right: Maneuver (only if not expanded) */}
        {!isExpanded && (
          <div className="flex items-center gap-2 shrink-0 bg-gradient-to-r from-blue-500/20 to-transparent px-3 py-1.5 rounded-lg max-w-[120px] overflow-hidden">
            <Navigation2 className="w-5 h-5 text-blue-400 shrink-0 drop-shadow-glow" />
            <span className="text-base font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-md">
              {nextManeuver}
            </span>
          </div>
        )}
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
              <div className="text-sm font-semibold text-gray-400 mt-1">In {formatDistance(nextDistance, "miles")}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Total Distance</div>
              <div className="text-lg font-bold text-white">{formatDistance(distanceRemaining, "miles")}</div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Remaining Time</div>
              <div className="text-lg font-bold text-white">{eta} min</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Drag hint - subtle */}
      {!isDragging && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/15 uppercase tracking-widest pointer-events-none">
          Drag to reposition
        </div>
      )}
    </motion.div>
  );
}
