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
  
  if (!turnInfo || !isVisible) {
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
        top: 'calc(190px + var(--safe-area-top, 0px))',
        left: '16px'
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
