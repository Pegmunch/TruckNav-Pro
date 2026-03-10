import { useState, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowUp, 
  ArrowUpRight, 
  ArrowRight, 
  ArrowDown, 
  RotateCcw,
  Navigation,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Route as RouteIcon
} from "lucide-react";
import { type LaneSegment, type LaneOption, type Route } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";

interface NextManeuverGuidanceProps {
  currentRoute: Route | null;
  onOpenLaneSelection?: () => void;
}

interface LaneIndicatorProps {
  lane: LaneOption;
  isSelected: boolean;
  isRecommended: boolean;
  isRestricted: boolean;
}

function LaneIndicator({ lane, isSelected, isRecommended, isRestricted }: LaneIndicatorProps) {
  const getDirectionIcon = () => {
    switch (lane.direction) {
      case 'left':
        return <ArrowUpRight className="w-3 h-3 rotate-[-45deg]" />;
      case 'right':
        return <ArrowUpRight className="w-3 h-3 rotate-[45deg]" />;
      case 'straight':
        return <ArrowUp className="w-3 h-3" />;
      case 'exit':
        return <ArrowRight className="w-3 h-3" />;
      default:
        return <ArrowUp className="w-3 h-3" />;
    }
  };

  const getClasses = () => {
    let classes = "relative w-8 h-8 rounded border-2 flex items-center justify-center transition-all duration-200 ";
    
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
    <div className="flex flex-col items-center space-y-1">
      <div className={getClasses()}>
        {getDirectionIcon()}
        {isSelected && (
          <CheckCircle className="absolute -top-1 -right-1 w-3 h-3 text-primary-foreground bg-primary rounded-full" />
        )}
        {isRecommended && !isSelected && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">
        {lane.index + 1}
      </div>
    </div>
  );
}

const NextManeuverGuidance = memo(function NextManeuverGuidance({
  currentRoute,
  onOpenLaneSelection,
}: NextManeuverGuidanceProps) {
  const { formatDistance } = useMeasurement();
  const [savedSelections, setSavedSelections] = useState<Record<number, number>>({});

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
    enabled: !!currentRoute?.id,
  });

  // Get the next upcoming maneuver
  const nextManeuver = laneGuidance.length > 0 ? laneGuidance[0] : null;

  if (!currentRoute || !nextManeuver) {
    return null;
  }

  const getManeuverIcon = () => {
    switch (nextManeuver.maneuverType) {
      case 'turn-left':
        return <ArrowUpRight className="w-5 h-5 rotate-[-45deg] text-blue-600" />;
      case 'turn-right':
        return <ArrowUpRight className="w-5 h-5 rotate-[45deg] text-blue-600" />;
      case 'straight':
        return <ArrowUp className="w-5 h-5 text-green-600" />;
      case 'merge':
        return <RotateCcw className="w-5 h-5 text-orange-600" />;
      case 'exit':
        return <ArrowRight className="w-5 h-5 text-purple-600" />;
      case 'enter':
        return <ArrowDown className="w-5 h-5 text-indigo-600" />;
      default:
        return <Navigation className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getManeuverLabel = () => {
    switch (nextManeuver.maneuverType) {
      case 'turn-left':
        return 'Turn Left';
      case 'turn-right':
        return 'Turn Right';
      case 'straight':
        return 'Continue Straight';
      case 'merge':
        return 'Merge';
      case 'exit':
        return 'Exit';
      case 'enter':
        return 'Enter';
      default:
        return 'Continue';
    }
  };

  const selectedLaneIndex = savedSelections[nextManeuver.stepIndex] ?? null;
  const hasLaneSelection = selectedLaneIndex !== null;

  return (
    <Card className="mx-4 mb-4 shadow-lg border-2 border-primary/20" data-testid="next-maneuver-guidance">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Maneuver Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getManeuverIcon()}
              <div>
                <h3 className="font-semibold text-foreground" data-testid="next-maneuver-title">
                  {getManeuverLabel()}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span data-testid="next-maneuver-road">{nextManeuver.roadName}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground" data-testid="next-maneuver-distance">
                {formatDistance(nextManeuver.distance, "miles")}
              </div>
              <Badge variant="default" className="bg-primary text-xs">
                Next
              </Badge>
            </div>
          </div>

          {/* Lane Display */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Lane Selection ({nextManeuver.totalLanes} lanes)
              </span>
              {hasLaneSelection && (
                <span className="text-xs text-green-600 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Lane {selectedLaneIndex! + 1} selected
                </span>
              )}
            </div>
            
            <div className="flex justify-center space-x-2 mb-3" data-testid="lane-indicators">
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
                  />
                );
              })}
            </div>

            {!hasLaneSelection && (
              <div className="flex items-center justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenLaneSelection}
                  className="text-xs"
                  data-testid="button-configure-lanes"
                >
                  <RouteIcon className="w-3 h-3 mr-1" />
                  Configure Lanes
                </Button>
              </div>
            )}
          </div>

          {/* Advisory */}
          {nextManeuver.advisory && (
            <div className="flex items-start space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <AlertTriangle className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300" data-testid="next-maneuver-advisory">
                {nextManeuver.advisory}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default NextManeuverGuidance;