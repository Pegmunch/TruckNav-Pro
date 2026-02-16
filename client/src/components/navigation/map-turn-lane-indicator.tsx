import { memo } from 'react';
import { ArrowUp, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUpLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// Curved arrow SVG for left turn (gray when inactive)
const CurvedArrowLeft = ({ className, isActive }: { className?: string; isActive?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path 
      d="M19 20V10C19 5.58172 15.4183 2 11 2C6.58172 2 3 5.58172 3 10" 
      stroke={isActive ? "#22D3EE" : "#9CA3AF"} 
      strokeWidth="3" 
      strokeLinecap="round"
      fill="none"
    />
    <path 
      d="M7 6L3 10L7 14" 
      stroke={isActive ? "#22D3EE" : "#9CA3AF"} 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// Curved arrow SVG for right turn (gray when inactive)
const CurvedArrowRight = ({ className, isActive }: { className?: string; isActive?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path 
      d="M5 20V10C5 5.58172 8.58172 2 13 2C17.4183 2 21 5.58172 21 10" 
      stroke={isActive ? "#22D3EE" : "#9CA3AF"} 
      strokeWidth="3" 
      strokeLinecap="round"
      fill="none"
    />
    <path 
      d="M17 6L21 10L17 14" 
      stroke={isActive ? "#22D3EE" : "#9CA3AF"} 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// Straight arrow SVG (cyan when active, gray when inactive)
const StraightArrow = ({ className, isActive }: { className?: string; isActive?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path 
      d="M12 20V4" 
      stroke={isActive ? "#22D3EE" : "#9CA3AF"} 
      strokeWidth="3" 
      strokeLinecap="round"
      fill="none"
    />
    <path 
      d="M6 10L12 4L18 10" 
      stroke={isActive ? "#22D3EE" : "#9CA3AF"} 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// Slight right arrow SVG
const SlightRightArrow = ({ className, isActive }: { className?: string; isActive?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path 
      d="M7 20V12C7 8 10 5 14 5H20" 
      stroke={isActive ? "#22D3EE" : "#9CA3AF"} 
      strokeWidth="3" 
      strokeLinecap="round"
      fill="none"
    />
    <path 
      d="M16 1L20 5L16 9" 
      stroke={isActive ? "#22D3EE" : "#9CA3AF"} 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// Slight left arrow SVG
const SlightLeftArrow = ({ className, isActive }: { className?: string; isActive?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path 
      d="M17 20V12C17 8 14 5 10 5H4" 
      stroke={isActive ? "#22D3EE" : "#9CA3AF"} 
      strokeWidth="3" 
      strokeLinecap="round"
      fill="none"
    />
    <path 
      d="M8 1L4 5L8 9" 
      stroke={isActive ? "#22D3EE" : "#9CA3AF"} 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

interface TurnInfo {
  direction: 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left';
  distance: number;
  roadName?: string;
}

interface LaneInfo {
  lanes: Array<{
    direction: 'left' | 'right' | 'straight' | 'exit';
    isRecommended: boolean;
  }>;
}

interface MapTurnLaneIndicatorProps {
  turnInfo: TurnInfo | null;
  laneInfo?: LaneInfo | null;
  unit: 'mi' | 'km';
  className?: string;
  isVisible?: boolean;
}

const convertDistance = (distanceM: number, unit: 'mi' | 'km'): { value: string; displayUnit: string } => {
  if (unit === 'mi') {
    const feet = distanceM * 3.28084;
    if (feet > 750) {
      return { value: '1000', displayUnit: 'ft' };
    } else if (feet > 300) {
      return { value: '500', displayUnit: 'ft' };
    } else {
      return { value: '100', displayUnit: 'ft' };
    }
  } else {
    if (distanceM > 225) {
      return { value: '300', displayUnit: 'm' };
    } else if (distanceM > 90) {
      return { value: '150', displayUnit: 'm' };
    } else {
      return { value: '30', displayUnit: 'm' };
    }
  }
};

const MapTurnLaneIndicator = memo(function MapTurnLaneIndicator({
  turnInfo,
  laneInfo,
  unit,
  className,
  isVisible = true
}: MapTurnLaneIndicatorProps) {
  
  if (!turnInfo || !isVisible) {
    return null;
  }
  
  const { value, displayUnit } = convertDistance(turnInfo.distance, unit);
  
  // Get appropriate arrow icon - matches ETA strip exactly
  const getTurnIcon = () => {
    const iconProps = { className: "w-6 h-6 stroke-[2.5px]" };
    const d = turnInfo.direction.toLowerCase();
    
    switch (d) {
      case 'straight':
      case 'slight_right':
      case 'slight_left':
        return <ArrowUp {...iconProps} />;
      case 'right':
      case 'sharp_right': 
      case 'sharp_left':
      case 'left':
        if (d.includes('left')) return <ArrowRight {...iconProps} />;
        if (d.includes('right')) return <ArrowLeft {...iconProps} />;
        return <ArrowUp {...iconProps} />;
      default: 
        return <ArrowUp {...iconProps} />;
    }
  };
  
  const getLaneGuidance = (): string | null => {
    if (!laneInfo?.lanes || laneInfo.lanes.length === 0) return null;
    
    const recommendedLanes = laneInfo.lanes
      .map((lane, idx) => ({ ...lane, position: idx }))
      .filter(lane => lane.isRecommended);
    
    if (recommendedLanes.length === 0) return null;
    
    const positions = recommendedLanes.map(l => l.position);
    const leftMost = Math.min(...positions);
    const rightMost = Math.max(...positions);
    const totalLanes = laneInfo.lanes.length;
    
    if (leftMost === 0 && rightMost === 0) {
      return 'Use Left Lane';
    } else if (leftMost === totalLanes - 1 && rightMost === totalLanes - 1) {
      return 'Use Right Lane';
    } else if (leftMost === rightMost) {
      if (leftMost === Math.floor(totalLanes / 2)) {
        return 'Use Center Lane';
      }
      return `Use Lane ${leftMost + 1}`;
    } else {
      return 'Keep Current Lane';
    }
  };
  
  const getLaneArrow = (direction: string, isRecommended: boolean) => {
    const iconClass = "w-6 h-6";
    
    switch (direction) {
      case 'left': return <CurvedArrowLeft className={iconClass} isActive={isRecommended} />;
      case 'right': return <CurvedArrowRight className={iconClass} isActive={isRecommended} />;
      case 'straight': return <StraightArrow className={iconClass} isActive={isRecommended} />;
      case 'exit': return <SlightRightArrow className={iconClass} isActive={isRecommended} />;
      default: return <StraightArrow className={iconClass} isActive={isRecommended} />;
    }
  };
  
  const laneGuidanceText = getLaneGuidance();
  
  return (
    <div 
      className={cn(
        "fixed pointer-events-none",
        "transition-all duration-300 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4",
        className
      )}
      style={{
        top: 'calc(190px + var(--safe-area-top, 0px))',
        left: '16px',
        zIndex: 500001,
      }}
      data-testid="map-turn-lane-indicator"
    >
      {/* Main turn indicator - white pill with blue arrow + distance - high contrast for satellite view */}
      <div className="flex items-center gap-3 bg-white rounded-full px-4 py-2 shadow-xl border-2 border-blue-500">
        <div className="text-blue-600 flex-shrink-0">
          {getTurnIcon()}
        </div>
        <span className="font-medium text-gray-900 text-base">{value} {displayUnit}</span>
      </div>
      
      {/* Lane arrows visual indicator - shows all lanes with recommended highlighted */}
      {laneInfo && laneInfo.lanes && laneInfo.lanes.length > 0 && (
        <div className="mt-2 flex items-center justify-center gap-1 bg-gray-800 rounded-lg px-3 py-2 shadow-xl border-2 border-gray-600">
          {laneInfo.lanes.map((lane, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded",
                lane.isRecommended ? "bg-cyan-500" : "bg-gray-600"
              )}
            >
              {getLaneArrow(lane.direction, lane.isRecommended)}
            </div>
          ))}
        </div>
      )}
      
      {/* Lane guidance text - white pill style - high contrast for satellite view */}
      {laneGuidanceText && (
        <div className="mt-2 flex items-center justify-center bg-white rounded-full px-4 py-2 shadow-xl border-2 border-blue-500">
          <span className="font-medium text-gray-900 text-sm">{laneGuidanceText}</span>
        </div>
      )}
      
      {/* Road name - white pill style - high contrast for satellite view */}
      {turnInfo.roadName && (
        <div className="mt-2 flex items-center justify-center bg-white rounded-full px-4 py-2 shadow-xl border-2 border-blue-500">
          <span className="font-medium text-gray-900 text-sm truncate">{turnInfo.roadName}</span>
        </div>
      )}
    </div>
  );
});

export default MapTurnLaneIndicator;
