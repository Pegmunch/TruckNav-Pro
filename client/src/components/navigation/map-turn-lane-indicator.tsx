import { memo } from 'react';
import { ArrowUp, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUpLeft, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  
  if (!turnInfo || turnInfo.direction === 'straight' || !isVisible) {
    return null;
  }
  
  const { value, displayUnit } = convertDistance(turnInfo.distance, unit);
  
  const getTurnIcon = () => {
    const iconProps = { className: "w-6 h-6 stroke-[2.5px]" };
    switch (turnInfo.direction) {
      case 'straight': return <ArrowUp {...iconProps} />;
      case 'right':
      case 'sharp_right': return <ArrowRight {...iconProps} />;
      case 'left':
      case 'sharp_left': return <ArrowLeft {...iconProps} />;
      case 'slight_right': return <ArrowUpRight {...iconProps} />;
      case 'slight_left': return <ArrowUpLeft {...iconProps} />;
      default: return <ArrowUp {...iconProps} />;
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
    const iconClass = "w-5 h-5 stroke-[2.5px]";
    
    if (!isRecommended) {
      return <Minus className={cn(iconClass, "text-gray-400")} />;
    }
    
    switch (direction) {
      case 'left': return <ArrowLeft className={cn(iconClass, "text-blue-600")} />;
      case 'right': return <ArrowRight className={cn(iconClass, "text-blue-600")} />;
      case 'straight': return <ArrowUp className={cn(iconClass, "text-blue-600")} />;
      case 'exit': return <ArrowUpRight className={cn(iconClass, "text-blue-600")} />;
      default: return <ArrowUp className={cn(iconClass, "text-gray-400")} />;
    }
  };
  
  const laneGuidanceText = getLaneGuidance();
  
  return (
    <div 
      className={cn(
        "fixed z-[6100] pointer-events-none",
        "transition-all duration-300 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4",
        className
      )}
      style={{
        top: 'calc(140px + var(--safe-area-top, 0px))',
        left: '16px'
      }}
      data-testid="map-turn-lane-indicator"
    >
      {/* Main turn indicator - matches ETA box style */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-lg w-[90px]">
          <div className="flex-shrink-0">
            {getTurnIcon()}
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 bg-amber-500 text-white px-2 py-1.5 rounded-lg shadow-lg w-[90px]">
          <span className="font-bold text-lg">{value}</span>
          <span className="font-bold text-sm">{displayUnit}</span>
        </div>
      </div>
      
      {/* Lane guidance text - matches ETA box style */}
      {laneGuidanceText && (
        <div className="mt-2 flex items-center justify-center bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-lg">
          <span className="font-bold text-sm">{laneGuidanceText}</span>
        </div>
      )}
      
      {/* Lane arrows - styled to match */}
      {laneInfo?.lanes && laneInfo.lanes.length > 0 && (
        <div className="mt-2 flex gap-1 justify-start bg-blue-600 rounded-lg py-1.5 px-3 shadow-lg">
          {laneInfo.lanes.map((lane, idx) => (
            <div 
              key={idx}
              className={cn(
                "flex items-center justify-center",
                "w-7 h-7 rounded",
                lane.isRecommended 
                  ? "bg-white text-blue-600" 
                  : "bg-blue-500 text-blue-300"
              )}
            >
              {getLaneArrow(lane.direction, lane.isRecommended)}
            </div>
          ))}
        </div>
      )}
      
      {/* Road name - matches ETA box style */}
      {turnInfo.roadName && (
        <div className="mt-1 flex items-center justify-center bg-amber-500 text-white px-3 py-1 rounded-lg shadow-lg">
          <span className="font-semibold text-xs">onto {turnInfo.roadName}</span>
        </div>
      )}
    </div>
  );
});

export default MapTurnLaneIndicator;
