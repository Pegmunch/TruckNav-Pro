import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Navigation, MapPin, AlertTriangle, CheckCircle, ChevronRight, ArrowUp, ArrowUpRight, ArrowRight, ArrowDownRight, ArrowDown, RotateCcw } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { useToast } from "@/hooks/use-toast";
import { type LaneSegment, type LaneOption, type Route } from "@shared/schema";

interface LaneButtonProps {
  lane: LaneOption;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function LaneButton({ lane, isSelected, onSelect, disabled }: LaneButtonProps) {
  const isRestricted = lane.restrictions && lane.restrictions.length > 0;
  const isRecommended = lane.recommended && !isRestricted;
  
  const getAriaLabel = () => {
    const baseName = `Lane ${lane.index + 1}`;
    const status = isRestricted ? "restricted" : isRecommended ? "recommended" : "available";
    const selected = isSelected ? "selected" : "not selected";
    return `${baseName}, ${status}, ${selected}`;
  };
  
  const getDirectionIcon = () => {
    switch (lane.direction) {
      case 'left':
        return <ArrowUpRight className="w-4 h-4 rotate-[-45deg]" />;
      case 'right':
        return <ArrowUpRight className="w-4 h-4 rotate-[45deg]" />;
      case 'straight':
        return <ArrowUp className="w-4 h-4" />;
      case 'exit':
        return <ArrowRight className="w-4 h-4" />;
      default:
        return <ArrowUp className="w-4 h-4" />;
    }
  };

  const getButtonClasses = () => {
    let classes = "relative h-16 w-16 border-2 transition-all duration-200 ";
    
    if (disabled || isRestricted) {
      classes += "bg-muted/50 border-muted text-muted-foreground cursor-not-allowed opacity-60 ";
    } else if (isSelected) {
      classes += "bg-primary border-primary text-primary-foreground shadow-lg scale-105 ";
    } else if (isRecommended) {
      classes += "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 ";
    } else {
      classes += "bg-background border-border hover:bg-accent hover:text-accent-foreground ";
    }
    
    return classes;
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <Button
        variant="outline"
        size="icon"
        className={getButtonClasses()}
        onClick={onSelect}
        disabled={disabled || isRestricted}
        aria-label={getAriaLabel()}
        data-testid={`lane-button-${lane.index}`}
      >
        {getDirectionIcon()}
        {isSelected && (
          <CheckCircle className="absolute -top-1 -right-1 w-5 h-5 text-primary-foreground bg-primary rounded-full" />
        )}
        {isRecommended && !isSelected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
        )}
      </Button>
      
      <div className="text-center">
        <div className="text-xs font-medium" data-testid={`lane-index-${lane.index}`}>
          Lane {lane.index + 1}
        </div>
        {isRecommended && (
          <Badge variant="secondary" className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            Recommended
          </Badge>
        )}
        {isRestricted && (
          <Badge variant="destructive" className="text-[10px]">
            Restricted
          </Badge>
        )}
      </div>
    </div>
  );
}

interface LaneDisplayProps {
  laneOptions: LaneOption[];
  selectedLaneIndex: number | null;
  onLaneSelect: (laneIndex: number) => void;
}

function LaneDisplay({ laneOptions, selectedLaneIndex, onLaneSelect }: LaneDisplayProps) {
  return (
    <div className="flex justify-center space-x-4 p-4 bg-muted/30 rounded-lg" data-testid="lane-display">
      {laneOptions.map((lane) => (
        <LaneButton
          key={lane.index}
          lane={lane}
          isSelected={selectedLaneIndex === lane.index}
          onSelect={() => onLaneSelect(lane.index)}
        />
      ))}
    </div>
  );
}

interface ManeuverCardProps {
  segment: LaneSegment;
  selectedLaneIndex: number | null;
  onLaneSelect: (laneIndex: number) => void;
  isUpcoming?: boolean;
}

function ManeuverCard({ segment, selectedLaneIndex, onLaneSelect, isUpcoming = false }: ManeuverCardProps) {
  const { formatDistance } = useMeasurement();
  
  const getManeuverIcon = () => {
    switch (segment.maneuverType) {
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
    switch (segment.maneuverType) {
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

  return (
    <Card className={`transition-all duration-200 ${isUpcoming ? 'ring-2 ring-primary shadow-lg' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getManeuverIcon()}
            <div>
              <CardTitle className="text-lg" data-testid={`maneuver-title-${segment.stepIndex}`}>
                {getManeuverLabel()}
              </CardTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span data-testid={`road-name-${segment.stepIndex}`}>{segment.roadName}</span>
                <span>•</span>
                <span data-testid={`distance-${segment.stepIndex}`}>{formatDistance(segment.distance, "miles")}</span>
              </div>
            </div>
          </div>
          {isUpcoming && (
            <Badge variant="default" className="bg-primary">
              Next
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <LaneDisplay
          laneOptions={segment.laneOptions}
          selectedLaneIndex={selectedLaneIndex}
          onLaneSelect={onLaneSelect}
        />
        
        {segment.advisory && (
          <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300" data-testid={`advisory-${segment.stepIndex}`}>
              {segment.advisory}
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{segment.totalLanes} lanes available</span>
          {selectedLaneIndex !== null && (
            <span className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Lane {selectedLaneIndex + 1} selected</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface LaneSelectionPageProps {
  params?: { id?: string; routeId?: string };
}

export default function LaneSelectionPage({ params }: LaneSelectionPageProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Get route ID from URL params (either :id or :routeId) or use default for demo
  const routeId = params?.id || params?.routeId || "550e8400-e29b-41d4-a716-446655440001";
  
  // Local state for lane selections
  const [laneSelections, setLaneSelections] = useState<Record<number, number>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isInitialLoad = useRef(true);

  // Load lane selections from localStorage on mount
  useEffect(() => {
    const savedSelections = localStorage.getItem(`lane-selections-${routeId}`);
    if (savedSelections) {
      try {
        const selections = JSON.parse(savedSelections);
        setLaneSelections(selections);
      } catch (error) {
        console.error('Failed to load saved lane selections:', error);
      }
    }
    // Mark initial load as complete
    isInitialLoad.current = false;
  }, [routeId]);

  // Save selections to localStorage whenever they change (but not during initial load)
  useEffect(() => {
    if (Object.keys(laneSelections).length > 0) {
      localStorage.setItem(`lane-selections-${routeId}`, JSON.stringify(laneSelections));
      // Only set unsaved changes flag after initial load is complete
      if (!isInitialLoad.current) {
        setHasUnsavedChanges(true);
      }
    }
  }, [laneSelections, routeId]);

  // Fetch route details
  const { data: route, isLoading: routeLoading } = useQuery<Route>({
    queryKey: ["/api/routes", routeId],
    queryFn: async () => {
      const response = await fetch(`/api/routes/${routeId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch route");
      }
      return response.json();
    },
  });

  // Fetch lane guidance
  const { data: laneGuidance, isLoading: laneLoading, error: laneError } = useQuery<LaneSegment[]>({
    queryKey: ["/api/routes", routeId, "lanes"],
    queryFn: async () => {
      const response = await fetch(`/api/routes/${routeId}/lanes`);
      if (!response.ok) {
        throw new Error("Failed to fetch lane guidance");
      }
      return response.json();
    },
  });

  // Save lane selections mutation
  const saveLaneSelectionsMutation = useMutation({
    mutationFn: async (selections: Record<number, number>) => {
      const response = await apiRequest("PATCH", `/api/routes/${routeId}/lanes/select`, {
        selections: selections,
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant cache entries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/routes", routeId, "lanes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/routes", routeId] });
      
      toast({
        title: "Lane selections saved",
        description: "Your lane preferences have been saved for this route.",
      });
      setHasUnsavedChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save selections",
        description: error.message || "An error occurred while saving your lane selections.",
        variant: "destructive",
      });
    },
  });

  const handleLaneSelect = (stepIndex: number, laneIndex: number) => {
    setLaneSelections(prev => ({
      ...prev,
      [stepIndex]: laneIndex,
    }));
  };

  const handleSaveSelections = () => {
    if (Object.keys(laneSelections).length === 0) {
      toast({
        title: "No selections to save",
        description: "Please select lanes for at least one maneuver before saving.",
        variant: "destructive",
      });
      return;
    }

    saveLaneSelectionsMutation.mutate(laneSelections);
  };

  const handleNavigationWithConfirmation = (destination: string = "/") => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved lane selections. Are you sure you want to leave this page?"
      );
      if (!confirmed) return;
    }
    setLocation(destination);
  };

  const handleBackToNavigation = () => {
    handleNavigationWithConfirmation("/");
  };

  if (routeLoading || laneLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Navigation className="w-12 h-12 text-primary mx-auto animate-spin" />
          <p className="text-muted-foreground">Loading lane guidance...</p>
        </div>
      </div>
    );
  }

  if (laneError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Failed to Load Lane Guidance</h2>
          <p className="text-muted-foreground">
            Unable to load lane guidance for this route. Please check your connection and try again.
          </p>
          <Button onClick={() => setLocation("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Navigation
          </Button>
        </div>
      </div>
    );
  }

  if (!laneGuidance || laneGuidance.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">No Lane Guidance Available</h2>
          <p className="text-muted-foreground">
            Lane guidance is not available for this route. You can still navigate using the main map view.
          </p>
          <Button onClick={() => setLocation("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Navigation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToNavigation}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">Lane Selection</h1>
              {route && (
                <p className="text-sm text-muted-foreground">
                  {route.startLocation} → {route.endLocation}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Unsaved Changes
              </Badge>
            )}
            <Button
              onClick={handleSaveSelections}
              disabled={saveLaneSelectionsMutation.isPending || !hasUnsavedChanges}
              data-testid="button-save-selections"
            >
              {saveLaneSelectionsMutation.isPending ? "Saving..." : "Save Selections"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {/* Route Summary */}
        {route && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Navigation className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="font-semibold" data-testid="route-summary-title">
                      {route.name || `${route.startLocation} to ${route.endLocation}`}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {laneGuidance.length} maneuvers • Select your preferred lanes
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>{Object.keys(laneSelections).length} of {laneGuidance.length} selected</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lane Guidance Segments */}
        <div className="space-y-4" data-testid="lane-guidance-list">
          {laneGuidance.map((segment, index) => (
            <ManeuverCard
              key={segment.stepIndex}
              segment={segment}
              selectedLaneIndex={laneSelections[segment.stepIndex] ?? null}
              onLaneSelect={(laneIndex) => handleLaneSelect(segment.stepIndex, laneIndex)}
              isUpcoming={index === 0}
            />
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="sticky bottom-4 bg-card rounded-lg border shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {Object.keys(laneSelections).length} of {laneGuidance.length} maneuvers configured
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => handleNavigationWithConfirmation("/")}
                data-testid="button-continue-navigation"
              >
                Continue Navigation
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}