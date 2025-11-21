/**
 * Turn Indicator Component
 * Large, prominent display showing next turn direction and distance
 * Inspired by professional navigation apps
 */

import { memo } from 'react';
import { ArrowUp, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUpLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TurnIndicatorProps {
  direction: 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left';
  distance: number; // in meters
  unit: 'mi' | 'km';
  roadName?: string;
  className?: string;
}

/**
 * Turn Indicator - Large bubble at top center showing next turn
 */
const TurnIndicator = memo(function TurnIndicator({
  direction,
  distance,
  unit,
  roadName,
  className
}: TurnIndicatorProps) {
  
  // Convert distance to appropriate unit
  const convertDistance = (distanceM: number): { value: string; unit: string } => {
    if (unit === 'mi') {
      const miles = distanceM / 1609.34;
      if (miles < 0.1) {
        // Show in feet for very short distances
        const feet = Math.round(distanceM * 3.28084);
        return { value: feet.toString(), unit: 'ft' };
      }
      return { value: miles.toFixed(1), unit: 'mi' };
    } else {
      const km = distanceM / 1000;
      if (km < 0.1) {
        // Show in meters for very short distances
        return { value: Math.round(distanceM).toString(), unit: 'm' };
      }
      return { value: km.toFixed(1), unit: 'km' };
    }
  };
  
  const { value, unit: displayUnit } = convertDistance(distance);
  
  // Get appropriate arrow icon for turn direction
  const getTurnIcon = () => {
    const iconProps = { className: "w-12 h-12 stroke-[3px]" };
    
    switch (direction) {
      case 'straight':
        return <ArrowUp {...iconProps} />;
      case 'right':
      case 'sharp_right':
        return <ArrowRight {...iconProps} />;
      case 'left':
      case 'sharp_left':
        return <ArrowLeft {...iconProps} />;
      case 'slight_right':
        return <ArrowUpRight {...iconProps} />;
      case 'slight_left':
        return <ArrowUpLeft {...iconProps} />;
      default:
        return <ArrowUp {...iconProps} />;
    }
  };
  
  return (
    <div 
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-[190]",
        "flex flex-col items-center gap-1",
        className
      )}
      data-testid="turn-indicator"
    >
      {/* Main Turn Bubble */}
      <div className={cn(
        "bg-white/95 backdrop-blur-md",
        "rounded-3xl shadow-2xl",
        "px-6 py-3",
        "flex items-center gap-3",
        "border-2 border-gray-200/50"
      )}>
        {/* Turn Arrow */}
        <div className="text-blue-600" data-testid="turn-arrow">
          {getTurnIcon()}
        </div>
        
        {/* Distance */}
        <div className="text-center">
          <div className="text-4xl font-black text-gray-900 leading-none" data-testid="turn-distance">
            {value}
          </div>
          <div className="text-sm font-bold text-gray-600 uppercase" data-testid="turn-unit">
            {displayUnit}
          </div>
        </div>
      </div>
      
      {/* Road Name (if available) */}
      {roadName && (
        <div className={cn(
          "bg-white/90 backdrop-blur-sm",
          "px-4 py-1.5 rounded-full",
          "text-gray-800 text-sm font-semibold",
          "shadow-lg border border-gray-200/50"
        )} data-testid="turn-road-name">
          onto {roadName}
        </div>
      )}
    </div>
  );
});

export default TurnIndicator;
