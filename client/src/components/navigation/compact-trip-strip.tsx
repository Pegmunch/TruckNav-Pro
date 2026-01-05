import { Clock, Route, Navigation2, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [isDraggable, setIsDraggable] = useState(false);
  const dragControls = useDragControls();
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startLongPress = useCallback((e: React.PointerEvent) => {
    // Only trigger for touch or left mouse button
    if (e.button !== 0 && e.pointerType !== 'touch') return;

    // Reset state
    setIsDraggable(false);

    longPressTimerRef.current = setTimeout(() => {
      setIsDraggable(true);
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      // Start drag immediately on long press
      dragControls.start(e);
    }, 2000); // 2 second firm hold
  }, [dragControls]);

  const endLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Corner expand logic
  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cornerSize = 40; // 40px touch area in corners

    const isTopLeft = x < cornerSize && y < cornerSize;
    const isTopRight = x > rect.width - cornerSize && y < cornerSize;
    const isBottomLeft = x < cornerSize && y > rect.height - cornerSize;
    const isBottomRight = x > rect.width - cornerSize && y > rect.height - cornerSize;

    if (isTopLeft || isTopRight || isBottomLeft || isBottomRight) {
      longPressTimerRef.current = setTimeout(() => {
        setIsExpanded(prev => !prev);
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 50, 50]);
        }
      }, 2000);
    } else {
      startLongPress(e);
    }
  };

  return (
    <motion.div 
      ref={containerRef}
      drag={isDraggable}
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
      onPointerDown={handlePointerDown}
      onPointerUp={endLongPress}
      onPointerLeave={endLongPress}
      className={cn(
        'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/20 shadow-2xl mobile-safe-top shrink-0 backdrop-blur-xl rounded-2xl overflow-hidden touch-none fixed w-[92vw] left-[4vw] max-w-[400px] transition-shadow duration-300',
        isExpanded ? 'h-auto' : 'h-[72px]',
        isDraggable ? 'ring-2 ring-blue-500 shadow-blue-500/20 cursor-grabbing' : 'cursor-pointer',
        className
      )}
      style={{ pointerEvents: 'auto' }}
      data-testid="compact-trip-strip"
    >
      {/* Visual Feedback for Draggable Mode */}
      {isDraggable && (
        <div className="absolute inset-0 bg-blue-500/10 pointer-events-none animate-pulse flex items-center justify-center">
          <GripHorizontal className="w-8 h-8 text-blue-400 opacity-50" />
        </div>
      )}

      <div className="px-5 py-4 flex items-center justify-between gap-4">
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

        {/* Right: Maneuver (only if not expanded) */}
        {!isExpanded && (
          <div className="flex items-center gap-2 shrink-0 bg-gradient-to-r from-blue-500/20 to-transparent px-3 py-1.5 rounded-lg max-w-[150px] overflow-hidden">
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

      {/* Interactive Hint (only visible briefly) */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/20 uppercase tracking-widest pointer-events-none">
        Hold corners to expand • Hold center to move
      </div>
    </motion.div>
  );
}
