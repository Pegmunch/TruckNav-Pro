import { useState, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUp, 
  ArrowUpRight, 
  ArrowRight, 
  CheckCircle,
  Navigation,
  Hand
} from "lucide-react";
import { type LaneSegment, type LaneOption, type Route } from "@shared/schema";
import { cn } from "@/lib/utils";

interface LaneGuidancePopupProps {
  currentRoute: Route | null;
  isNavigating: boolean;
  className?: string;
  forceVisible?: boolean;
}

interface LaneIndicatorProps {
  lane: LaneOption;
  isSelected: boolean;
  isRecommended: boolean;
  isRestricted: boolean;
  compact?: boolean;
  onClick?: (laneIndex: number) => void;
}

// Extracted and optimized LaneIndicator component for the popup
function LaneIndicator({ lane, isSelected, isRecommended, isRestricted, compact = false, onClick }: LaneIndicatorProps) {
  const getDirectionIcon = () => {
    const iconSize = compact ? "w-2 h-2" : "w-3 h-3";
    
    switch (lane.direction) {
      case 'left':
        return <ArrowUpRight className={`${iconSize} rotate-[-45deg]`} />;
      case 'right':
        return <ArrowUpRight className={`${iconSize} rotate-[45deg]`} />;
      case 'straight':
        return <ArrowUp className={iconSize} />;
      case 'exit':
        return <ArrowRight className={iconSize} />;
      default:
        return <ArrowUp className={iconSize} />;
    }
  };

  const getClasses = () => {
    const baseSize = compact ? "w-6 h-6" : "w-8 h-8";
    let classes = `relative ${baseSize} rounded border-2 flex items-center justify-center transition-all duration-200 `;
    
    if (isRestricted) {
      classes += "bg-muted/50 border-muted text-muted-foreground opacity-60 ";
    } else if (isSelected) {
      classes += "bg-primary border-primary text-primary-foreground scale-110 ";
    } else if (isRecommended) {
      classes += "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300 ";
    } else {
      classes += "bg-background border-border text-muted-foreground ";
    }
    
    return classes;
  };

  return (
    <div className="flex flex-col items-center space-y-0.5">
      <button 
        className={cn(getClasses(), "cursor-pointer hover:scale-105 active:scale-95 disabled:cursor-not-allowed")} 
        onClick={() => !isRestricted && onClick?.(lane.index)}
        disabled={isRestricted}
        data-testid={`lane-option-${lane.index + 1}`}
        aria-label={`Select lane ${lane.index + 1}`}
      >
        {getDirectionIcon()}
        {isSelected && (
          <CheckCircle className={`absolute -top-1 -right-1 ${compact ? "w-2 h-2" : "w-3 h-3"} text-primary-foreground bg-primary rounded-full`} />
        )}
        {isRecommended && !isSelected && (
          <div className={`absolute -top-1 -right-1 ${compact ? "w-1.5 h-1.5" : "w-2 h-2"} bg-green-500 rounded-full`} />
        )}
      </button>
      <div className={`${compact ? "text-[8px]" : "text-[10px]"} text-muted-foreground`}>
        {lane.index + 1}
      </div>
    </div>
  );
}

const LaneGuidancePopup = memo(function LaneGuidancePopup({
  currentRoute,
  isNavigating,
  className,
  forceVisible = false
}: LaneGuidancePopupProps) {
  const [savedSelections, setSavedSelections] = useState<Record<number, number>>({});
  const [isVisible, setIsVisible] = useState(false);
  
  // Drag functionality state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load saved lane selections from localStorage
  useEffect(() => {
    const storageKey = currentRoute?.id ? `lane-selections-${currentRoute.id}` : 'lane-selections-demo';
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedSelections = JSON.parse(saved);
        setSavedSelections(parsedSelections);
        console.log('Lane selections loaded from storage key:', storageKey, parsedSelections);
      } else {
        setSavedSelections({});
      }
    } catch (error) {
      console.error('Failed to load lane selections:', error);
      setSavedSelections({});
    }
  }, [currentRoute?.id, forceVisible]);

  // Fetch lane guidance for the current route
  const { data: laneGuidance = [] } = useQuery<LaneSegment[]>({
    queryKey: ["/api/routes", currentRoute?.id, "lanes"],
    queryFn: async () => {
      if (!currentRoute?.id) return [];
      const response = await fetch(`/api/routes/${currentRoute.id}/lanes`);
      if (!response.ok) {
        throw new Error("Failed to fetch lane guidance");
      }
      return response.json();
    },
    enabled: !!currentRoute?.id && isNavigating,
  });

  // Get the next upcoming maneuver
  const nextManeuver = laneGuidance.length > 0 ? laneGuidance[0] : null;

  // Auto show/hide logic: show when navigating, has route, has maneuver, and has multiple usable lanes
  useEffect(() => {
    // If forced to be visible (manual trigger), always show
    if (forceVisible) {
      setIsVisible(true);
      return;
    }
    
    if (!isNavigating || !currentRoute || !nextManeuver) {
      setIsVisible(false);
      return;
    }
    
    // Count only usable lanes (filter out restricted lanes)
    const usableLanes = nextManeuver.laneOptions.filter(lane => 
      !lane.restrictions || lane.restrictions.length === 0
    );
    const usableLanesCount = usableLanes.length;
    
    // Show popup only when there are multiple usable lanes available
    const shouldShow = Boolean(
      usableLanesCount > 1 && 
      nextManeuver.laneOptions.length > 1
    );
    
    setIsVisible(shouldShow);
  }, [isNavigating, currentRoute, nextManeuver, forceVisible]);

  // Handle lane selection
  const handleLaneSelection = (laneIndex: number, currentManeuver: any) => {
    const newSelections = {
      ...savedSelections,
      [currentManeuver.stepIndex]: laneIndex
    };
    
    setSavedSelections(newSelections);
    
    // Save to localStorage (use demo key when no current route)
    const storageKey = currentRoute?.id ? `lane-selections-${currentRoute.id}` : 'lane-selections-demo';
    try {
      localStorage.setItem(storageKey, JSON.stringify(newSelections));
      console.log('Lane selection saved:', laneIndex + 1, 'to storage key:', storageKey);
    } catch (error) {
      console.error('Failed to save lane selection:', error);
    }
  };

  // Drag functionality handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragOffset({
      x: clientX - dragPosition.x,
      y: clientY - dragPosition.y
    });
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragPosition({
      x: clientX - dragOffset.x,
      y: clientY - dragOffset.y
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Add global event listeners for drag functionality
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
      const handleMouseUp = () => handleDragEnd();
      const handleTouchMove = (e: TouchEvent) => handleDragMove(e);
      const handleTouchEnd = () => handleDragEnd();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset]);

  // Don't render anything if not visible
  if (!isVisible) {
    return null;
  }

  // Create demo lane data when forced visible but no real data
  const demoLaneSegment = {
    stepIndex: 0,
    instruction: "Keep right to continue on highway",
    distance: 500,
    laneOptions: [
      { index: 0, direction: 'left' as const, recommended: false, restrictions: ['no_trucks'] },
      { index: 1, direction: 'straight' as const, recommended: true, restrictions: [] },
      { index: 2, direction: 'straight' as const, recommended: true, restrictions: [] },
      { index: 3, direction: 'right' as const, recommended: false, restrictions: [] }
    ]
  };

  // Use demo data when forced visible but no real navigation data
  const currentManeuver = forceVisible && !nextManeuver ? demoLaneSegment : nextManeuver;
  
  if (!currentManeuver) {
    return null;
  }

  const selectedLaneIndex = savedSelections[currentManeuver.stepIndex] ?? null;
  const hasLaneSelection = selectedLaneIndex !== null;

  // Calculate responsive size (1/8 of screen)
  const popupStyle = {
    width: 'calc(12.5vw)', // True 1/8 screen width
    height: 'auto',
    minWidth: '120px', // Reasonable minimum for readability
    minHeight: '100px',
  };

  return (
    <div 
      className={cn(
        "fixed z-50 transition-all duration-300 ease-in-out",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full",
        className
      )}
      style={{
        ...popupStyle,
        right: dragPosition.x > 0 ? 'auto' : '16px',
        bottom: dragPosition.y > 0 ? 'auto' : '128px',
        left: dragPosition.x > 0 ? `${dragPosition.x}px` : 'auto',
        top: dragPosition.y > 0 ? `${dragPosition.y}px` : 'auto',
        transform: isDragging ? 'scale(1.05)' : 'scale(1)'
      }}
      data-testid="popup-lane-indicators"
    >
      <Card className="shadow-xl border-2 border-primary/30 backdrop-blur-sm bg-background/95">
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Header with Drag Handle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <div 
                  className="flex items-center space-x-1 cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleDragStart}
                  onTouchStart={handleDragStart}
                  data-testid="drag-handle"
                >
                  <Hand className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
                  <Navigation className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-foreground">Lane Guide</span>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {currentManeuver.laneOptions?.length || 4}
              </Badge>
            </div>

            {/* Lane indicators */}
            <div className="flex justify-center space-x-1">
              {currentManeuver.laneOptions.map((lane) => {
                const isSelected = selectedLaneIndex === lane.index;
                const isRecommended = Boolean(lane.recommended && !lane.restrictions?.length);
                const isRestricted = Boolean(lane.restrictions && lane.restrictions.length > 0);
                
                return (
                  <LaneIndicator
                    key={lane.index}
                    lane={lane}
                    isSelected={isSelected}
                    isRecommended={isRecommended}
                    isRestricted={isRestricted}
                    compact={true}
                    onClick={(laneIndex: number) => handleLaneSelection(laneIndex, currentManeuver)}
                  />
                );
              })}
            </div>

            {/* Status indicator */}
            {hasLaneSelection ? (
              <div className="text-center">
                <span className="text-xs text-green-600 flex items-center justify-center">
                  <CheckCircle className="w-2 h-2 mr-1" />
                  Lane {selectedLaneIndex! + 1}
                </span>
              </div>
            ) : (
              <div className="text-center">
                <span className="text-xs text-muted-foreground">Select lane</span>
              </div>
            )}

            {/* Distance indicator */}
            <div className="text-center">
              <span className="text-xs font-medium text-foreground">
                {currentManeuver.distance < 1000 
                  ? `${Math.round(currentManeuver.distance)} m`
                  : `${(currentManeuver.distance / 1000).toFixed(1)} km`
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default LaneGuidancePopup;