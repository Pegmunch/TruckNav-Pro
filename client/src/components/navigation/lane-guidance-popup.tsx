import { useState, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowUp, 
  ArrowUpRight, 
  ArrowUpLeft,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Navigation,
  Hand,
  X,
  CornerUpRight,
  CornerUpLeft,
  RotateCcw,
  TrendingUp
} from "lucide-react";
import { type LaneSegment, type LaneOption, type Route } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";

// Bendy arrow SVG components for curved turns
const BendyArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 19V5" />
    <path d="M5 5c6 0 10 4 14 10" />
    <path d="M15 11l4 4-4 4" />
  </svg>
);

const BendyArrowLeft = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 19V5" />
    <path d="M19 5c-6 0-10 4-14 10" />
    <path d="M9 11l-4 4 4 4" />
  </svg>
);

const SharpBendRight = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 19V12a3 3 0 013-3h6" />
    <path d="M12 6l3 3-3 3" />
  </svg>
);

const SharpBendLeft = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 19V12a3 3 0 00-3-3H9" />
    <path d="M12 6l-3 3 3 3" />
  </svg>
);

const UTurnArrow = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14l-4-4 4-4" />
    <path d="M5 10h11a4 4 0 014 4v0a4 4 0 01-4 4H12" />
  </svg>
);

const SlightCurveRight = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5" />
    <path d="M12 5c4 0 6 2 8 6" />
    <path d="M17 8l3 3-3 3" />
  </svg>
);

const SlightCurveLeft = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5" />
    <path d="M12 5c-4 0-6 2-8 6" />
    <path d="M7 8l-3 3 3 3" />
  </svg>
);

// Direction type from maneuver instruction
type DirectionType = 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left' | 'uturn_left' | 'uturn_right' | 'exit_right' | 'exit_left' | 'merge' | 'roundabout';

// Get direction from maneuver instruction text
function getDirectionFromInstruction(instruction: string): DirectionType {
  const lower = instruction.toLowerCase();
  if (lower.includes('u-turn') || lower.includes('uturn')) {
    return lower.includes('left') ? 'uturn_left' : 'uturn_right';
  }
  if (lower.includes('sharp right')) return 'sharp_right';
  if (lower.includes('sharp left')) return 'sharp_left';
  if (lower.includes('slight right') || lower.includes('bear right') || lower.includes('keep right')) return 'slight_right';
  if (lower.includes('slight left') || lower.includes('bear left') || lower.includes('keep left')) return 'slight_left';
  if (lower.includes('exit') && lower.includes('right')) return 'exit_right';
  if (lower.includes('exit') && lower.includes('left')) return 'exit_left';
  if (lower.includes('turn right') || lower.includes('right onto')) return 'right';
  if (lower.includes('turn left') || lower.includes('left onto')) return 'left';
  if (lower.includes('roundabout')) return 'roundabout';
  if (lower.includes('merge')) return 'merge';
  return 'straight';
}

// Large direction indicator component with arrows/bendy arrows
function DirectionIndicator({ direction, distance, instruction }: { direction: DirectionType; distance: number; instruction?: string }) {
  const iconClass = "w-10 h-10 md:w-12 md:h-12 stroke-[2.5px]";
  
  const getDirectionIcon = () => {
    switch (direction) {
      case 'straight':
        return <ArrowUp className={iconClass} />;
      case 'right':
        return <BendyArrowRight className={iconClass} />;
      case 'left':
        return <BendyArrowLeft className={iconClass} />;
      case 'slight_right':
        return <SlightCurveRight className={iconClass} />;
      case 'slight_left':
        return <SlightCurveLeft className={iconClass} />;
      case 'sharp_right':
        return <SharpBendRight className={iconClass} />;
      case 'sharp_left':
        return <SharpBendLeft className={iconClass} />;
      case 'uturn_left':
      case 'uturn_right':
        return <UTurnArrow className={cn(iconClass, direction === 'uturn_right' && 'scale-x-[-1]')} />;
      case 'exit_right':
        return <CornerUpRight className={iconClass} />;
      case 'exit_left':
        return <CornerUpLeft className={iconClass} />;
      case 'roundabout':
        return <RotateCcw className={iconClass} />;
      case 'merge':
        return <TrendingUp className={iconClass} />;
      default:
        return <ArrowUp className={iconClass} />;
    }
  };

  const getDirectionLabel = () => {
    switch (direction) {
      case 'straight': return 'Continue straight';
      case 'right': return 'Turn right';
      case 'left': return 'Turn left';
      case 'slight_right': return 'Bear right';
      case 'slight_left': return 'Bear left';
      case 'sharp_right': return 'Sharp right';
      case 'sharp_left': return 'Sharp left';
      case 'uturn_left':
      case 'uturn_right': return 'U-turn';
      case 'exit_right': return 'Exit right';
      case 'exit_left': return 'Exit left';
      case 'roundabout': return 'Roundabout';
      case 'merge': return 'Merge';
      default: return 'Continue';
    }
  };

  const getDistanceDisplay = () => {
    if (distance < 100) {
      return `${Math.round(distance)} m`;
    } else if (distance < 1000) {
      return `${Math.round(distance / 10) * 10} m`;
    } else {
      return `${(distance / 1000).toFixed(1)} km`;
    }
  };

  const getBackgroundColor = () => {
    // Color-code based on distance for urgency
    if (distance < 100) return 'bg-red-600'; // Imminent
    if (distance < 300) return 'bg-orange-500'; // Approaching
    return 'bg-blue-600'; // Upcoming
  };

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Direction arrow box */}
      <div className={cn(
        "flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl shadow-lg",
        getBackgroundColor(),
        "text-white flex-shrink-0"
      )}>
        {getDirectionIcon()}
      </div>
      
      {/* Direction info */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm md:text-base font-bold text-foreground truncate">
          {getDirectionLabel()}
        </span>
        <span className="text-lg md:text-xl font-bold text-blue-600">
          {getDistanceDisplay()}
        </span>
        {instruction && (
          <span className="text-[10px] md:text-xs text-muted-foreground truncate">
            {instruction.length > 30 ? instruction.substring(0, 30) + '...' : instruction}
          </span>
        )}
      </div>
    </div>
  );
}

interface LaneGuidancePopupProps {
  currentRoute: Route | null;
  isNavigating: boolean;
  className?: string;
  forceVisible?: boolean;
  onClose?: () => void;
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
  forceVisible = false,
  onClose
}: LaneGuidancePopupProps) {
  const [savedSelections, setSavedSelections] = useState<Record<number, number>>({});
  const [isVisible, setIsVisible] = useState(false);
  
  // Drag functionality state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Handle close
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  // Focus trap for accessibility - ESC key closes the modal
  const focusTrapRef = useFocusTrap<HTMLDivElement>({
    enabled: isVisible,
    onEscape: handleClose,
    initialFocus: false,
    returnFocus: true,
  });

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
  
  // Track previous maneuver distance to detect when we've passed a junction
  const [previousDistance, setPreviousDistance] = useState<number | null>(null);
  const [maneuverCompleted, setManeuverCompleted] = useState(false);
  const [lastManeuverStepIndex, setLastManeuverStepIndex] = useState<number | null>(null);

  // Distance thresholds for auto-show/hide (in meters)
  const APPROACH_DISTANCE = 800; // Show when within 800m of maneuver (earlier visibility)
  const COMPLETION_DISTANCE = 30; // Consider completed when within 30m (passed through)

  // Detect maneuver completion - when distance decreases to near-zero then we've passed it
  useEffect(() => {
    if (!nextManeuver) {
      setPreviousDistance(null);
      return;
    }
    
    const currentDistance = nextManeuver.distance;
    
    // Detect new maneuver (step index changed) - reset completion state
    if (lastManeuverStepIndex !== nextManeuver.stepIndex) {
      setManeuverCompleted(false);
      setLastManeuverStepIndex(nextManeuver.stepIndex);
      setPreviousDistance(currentDistance);
      return;
    }
    
    // Detect if we've passed through the junction (distance went below threshold)
    if (previousDistance !== null && previousDistance > COMPLETION_DISTANCE && currentDistance <= COMPLETION_DISTANCE) {
      console.log('Maneuver completed - passed through junction');
      setManeuverCompleted(true);
    }
    
    setPreviousDistance(currentDistance);
  }, [nextManeuver?.distance, nextManeuver?.stepIndex, previousDistance, lastManeuverStepIndex]);

  // Auto show/hide logic based on distance and maneuver completion
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
    
    // Hide if maneuver was completed (we passed through)
    if (maneuverCompleted) {
      setIsVisible(false);
      return;
    }
    
    // Count only usable lanes (filter out restricted lanes)
    const usableLanes = nextManeuver.laneOptions.filter(lane => 
      !lane.restrictions || lane.restrictions.length === 0
    );
    const usableLanesCount = usableLanes.length;
    
    // Check distance - only show when approaching (within threshold distance)
    const isApproaching = nextManeuver.distance <= APPROACH_DISTANCE;
    
    // Check if user has already selected the correct lane (recommended lane)
    const selectedLaneIndex = savedSelections[nextManeuver.stepIndex];
    const hasSelectedRecommendedLane = selectedLaneIndex !== undefined && 
      nextManeuver.laneOptions[selectedLaneIndex]?.recommended === true;
    
    // Show popup when:
    // 1. Approaching the maneuver (within threshold)
    // 2. Multiple usable lanes available
    // 3. User hasn't yet confirmed they're in the recommended lane
    const shouldShow = Boolean(
      isApproaching &&
      usableLanesCount > 1 && 
      nextManeuver.laneOptions.length > 1 &&
      !hasSelectedRecommendedLane
    );
    
    setIsVisible(shouldShow);
  }, [isNavigating, currentRoute, nextManeuver, forceVisible, maneuverCompleted, savedSelections]);

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

  // Calculate responsive size for top-left positioning
  const popupStyle = {
    width: 'auto',
    height: 'auto',
    minWidth: '180px', // Increased for direction indicator
    maxWidth: '240px',
  };

  // Get direction type from maneuverType or demo instruction
  const getDirectionFromManeuverType = (maneuverType: string): DirectionType => {
    switch (maneuverType) {
      case 'turn-right': return 'right';
      case 'turn-left': return 'left';
      case 'exit': return 'exit_right';
      case 'merge': return 'merge';
      case 'straight': return 'straight';
      case 'enter': return 'straight';
      default: return 'straight';
    }
  };
  
  const directionType = 'maneuverType' in currentManeuver && currentManeuver.maneuverType
    ? getDirectionFromManeuverType(currentManeuver.maneuverType)
    : ('instruction' in currentManeuver && currentManeuver.instruction 
        ? getDirectionFromInstruction(currentManeuver.instruction as string)
        : 'straight');
  
  const instructionText = 'roadName' in currentManeuver ? currentManeuver.roadName : 
    ('instruction' in currentManeuver ? (currentManeuver.instruction as string) : undefined);

  return (
    <div 
      ref={focusTrapRef}
      role="dialog"
      aria-labelledby="lane-guidance-title"
      aria-describedby="lane-guidance-description"
      aria-modal="true"
      className={cn(
        "fixed z-[6100] transition-all duration-300 ease-in-out lane-guidance-safe professional-nav-interface",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4",
        className
      )}
      style={{
        ...popupStyle,
        // Position: top-left corner above the stack button during navigation
        left: dragPosition.x > 0 ? `${dragPosition.x}px` : `max(12px, calc(12px + env(safe-area-inset-left, 0px)))`,
        top: dragPosition.y > 0 ? `${dragPosition.y}px` : `calc(64px + max(env(safe-area-inset-top, 0px), 0px) + 100px)`,
        right: 'auto',
        bottom: 'auto',
        transform: isDragging ? 'scale(1.05)' : 'scale(1)'
      }}
      data-testid="popup-lane-indicators"
    >
      <Card className="shadow-xl border-2 border-gray-200 bg-white">
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Header with Drag Handle and Close Button */}
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
                  <span id="lane-guidance-title" className="text-xs font-medium text-foreground">Lane Guide</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs px-1 py-0" aria-label={`${currentManeuver.laneOptions?.length || 4} lanes available`}>
                  {currentManeuver.laneOptions?.length || 4}
                </Badge>
                {onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-w-[44px] min-h-[44px] p-0 h-auto w-auto"
                    onClick={handleClose}
                    data-testid="button-close-lane-guidance"
                    aria-label="Close lane guidance"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Hidden description for screen readers */}
            <span id="lane-guidance-description" className="sr-only">
              Lane guidance popup showing available lanes and recommendations for your route
            </span>

            {/* Direction Indicator - Shows upcoming turn with arrow */}
            <DirectionIndicator 
              direction={directionType}
              distance={currentManeuver.distance}
              instruction={instructionText}
            />

            {/* Separator */}
            <div className="border-t border-gray-200 my-1" />

            {/* Lane indicators label */}
            <div className="text-[10px] text-muted-foreground text-center uppercase tracking-wide">
              Lane Selection
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