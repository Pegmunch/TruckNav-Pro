import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navigation, StopCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { type Route, type VehicleProfile } from "@shared/schema";

interface BottomNavigationButtonProps {
  currentRoute: Route | null;
  selectedProfile: VehicleProfile | null;
  isNavigating: boolean;
  isStartingJourney: boolean;
  isCompletingJourney: boolean;
  fromLocation: string;
  toLocation: string;
  onStartNavigation: () => void;
  onStopNavigation?: () => void;
}

export function BottomNavigationButton({
  currentRoute,
  selectedProfile,
  isNavigating,
  isStartingJourney,
  isCompletingJourney,
  fromLocation,
  toLocation,
  onStartNavigation,
  onStopNavigation,
}: BottomNavigationButtonProps) {
  const isMobile = useIsMobile();

  // Don't show if no route or navigation requirements not met
  const canStartNavigation = currentRoute && selectedProfile && fromLocation && toLocation && !isNavigating;
  const canStopNavigation = isNavigating && onStopNavigation;


  if (!canStartNavigation && !canStopNavigation) {
    return null;
  }

  return (
    <div className={cn(
      "fixed z-50 start-nav-button-safe professional-nav-interface",
      // CRITICAL FIX: Remove gradient and backdrop blur, make wrapper non-interactive
      "bg-transparent overlay-safe-mode:bg-none overlay-safe-mode:backdrop-blur-0 pointer-events-none",
      "p-4"
    )}>
      <Card className={cn(
        "mx-auto max-w-lg shadow-lg border-2 pointer-events-auto",
        isMobile ? "border-primary/20" : "border-primary/30"
      )}>
        <div className="p-4">
          {canStartNavigation && (
            <Button
              onClick={onStartNavigation}
              disabled={isStartingJourney || isCompletingJourney}
              size={isMobile ? "lg" : "default"}
              className={cn(
                "w-full font-semibold",
                isMobile ? "h-14 text-lg" : "h-12 text-base",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "shadow-md hover:shadow-lg transition-all duration-200"
              )}
              data-testid="button-start-navigation-bottom"
            >
              {isStartingJourney ? (
                <>
                  <Loader2 className={cn("animate-spin", isMobile ? "w-6 h-6 mr-3" : "w-5 h-5 mr-2")} />
                  Starting Navigation...
                </>
              ) : (
                <>
                  <Navigation className={cn(isMobile ? "w-6 h-6 mr-3" : "w-5 h-5 mr-2")} />
                  Start Navigation
                </>
              )}
            </Button>
          )}

          {canStopNavigation && (
            <Button
              onClick={onStopNavigation}
              disabled={isCompletingJourney}
              variant="destructive"
              size={isMobile ? "lg" : "default"}
              className={cn(
                "w-full font-semibold",
                isMobile ? "h-14 text-lg" : "h-12 text-base",
                "shadow-md hover:shadow-lg transition-all duration-200"
              )}
              data-testid="button-stop-navigation-bottom"
            >
              {isCompletingJourney ? (
                <>
                  <Loader2 className={cn("animate-spin", isMobile ? "w-6 h-6 mr-3" : "w-5 h-5 mr-2")} />
                  Stopping Navigation...
                </>
              ) : (
                <>
                  <StopCircle className={cn(isMobile ? "w-6 h-6 mr-3" : "w-5 h-5 mr-2")} />
                  Stop Navigation
                </>
              )}
            </Button>
          )}

          {currentRoute && (
            <div className={cn(
              "mt-2 text-center text-muted-foreground",
              isMobile ? "text-sm" : "text-xs"
            )}>
              <span className="font-medium">{(currentRoute.distance || 0).toFixed(1)} miles</span>
              {" • "}
              <span>{Math.round(currentRoute.duration || 0)} min</span>
              {selectedProfile && (
                <>
                  {" • "}
                  <span>{selectedProfile.height}ft H</span>
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}