import { useState, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUp, 
  ArrowUpRight, 
  ArrowRight, 
  CheckCircle,
  Navigation
} from "lucide-react";
import { type LaneSegment, type LaneOption, type Route } from "@shared/schema";
import { cn } from "@/lib/utils";

interface LaneGuidancePopupProps {
  currentRoute: Route | null;
  isNavigating: boolean;
  className?: string;
}

interface LaneIndicatorProps {
  lane: LaneOption;
  isSelected: boolean;
  isRecommended: boolean;
  isRestricted: boolean;
  compact?: boolean;
}

// Extracted and optimized LaneIndicator component for the popup
function LaneIndicator({ lane, isSelected, isRecommended, isRestricted, compact = false }: LaneIndicatorProps) {
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
      <div className={getClasses()}>
        {getDirectionIcon()}
        {isSelected && (
          <CheckCircle className={`absolute -top-1 -right-1 ${compact ? "w-2 h-2" : "w-3 h-3"} text-primary-foreground bg-primary rounded-full`} />
        )}
        {isRecommended && !isSelected && (
          <div className={`absolute -top-1 -right-1 ${compact ? "w-1.5 h-1.5" : "w-2 h-2"} bg-green-500 rounded-full`} />
        )}
      </div>
      <div className={`${compact ? "text-[8px]" : "text-[10px]"} text-muted-foreground`}>
        {lane.index + 1}
      </div>
    </div>
  );
}

const LaneGuidancePopup = memo(function LaneGuidancePopup({
  currentRoute,
  isNavigating,
  className
}: LaneGuidancePopupProps) {
  const [savedSelections, setSavedSelections] = useState<Record<number, number>>({});
  const [isVisible, setIsVisible] = useState(false);

  // Load saved lane selections from localStorage
  useEffect(() => {
    if (currentRoute?.id) {
      const saved = localStorage.getItem(`lane-selections-${currentRoute.id}`);
      if (saved) {
        try {
          setSavedSelections(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to load saved lane selections:', error);
        }
      }
    }
  }, [currentRoute?.id]);

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
  }, [isNavigating, currentRoute, nextManeuver]);

  // Don't render anything if not visible
  if (!isVisible || !nextManeuver) {
    return null;
  }

  const selectedLaneIndex = savedSelections[nextManeuver.stepIndex] ?? null;
  const hasLaneSelection = selectedLaneIndex !== null;

  // Calculate responsive size (1/4 of screen)
  const popupStyle = {
    width: 'min(calc(100vw / 4), calc(100vh / 4))', // 1/4 screen size, responsive to both width and height
    height: 'auto',
    minWidth: '120px',
    maxWidth: '200px',
  };

  return (
    <div 
      className={cn(
        "fixed right-4 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ease-in-out",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full",
        className
      )}
      style={popupStyle}
      data-testid="lane-guidance-popup"
    >
      <Card className="shadow-xl border-2 border-primary/30 backdrop-blur-sm bg-background/95">
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Navigation className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-foreground">Lane Guide</span>
              </div>
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {nextManeuver.totalLanes}
              </Badge>
            </div>

            {/* Lane indicators */}
            <div className="flex justify-center space-x-1" data-testid="popup-lane-indicators">
              {nextManeuver.laneOptions.map((lane) => {
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
                {nextManeuver.distance < 1 
                  ? `${Math.round(nextManeuver.distance * 5280)} ft`
                  : `${nextManeuver.distance.toFixed(1)} mi`
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