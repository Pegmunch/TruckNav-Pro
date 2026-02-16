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
      "fixed z-50 bottom-nav-safe professional-nav-interface",
      // CRITICAL FIX: Remove gradient and backdrop blur, make wrapper non-interactive
      "bg-transparent overlay-safe-mode:bg-none overlay-safe-mode:backdrop-blur-0 pointer-events-none"
    )}
    style={{
      padding: "var(--density-spacing-md)",
      left: "50%",
      transform: "translateX(-50%)",
      bottom: "env(safe-area-inset-bottom, 0px)"
    }}>
      <Card className={cn(
        "mx-auto max-w-lg shadow-lg border-2 pointer-events-auto",
        isMobile ? "border-primary/20" : "border-primary/30"
      )}>
        <div style={{ padding: "var(--density-spacing-md)" }}>
          {canStartNavigation && (
            <Button
              onClick={onStartNavigation}
              disabled={isStartingJourney || isCompletingJourney}
              className={cn(
                "w-full font-semibold nav-button-primary",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "shadow-md hover:shadow-lg transition-all duration-200"
              )}
              style={{
                minHeight: "var(--density-touch-target-lg)",
                padding: "var(--density-spacing-md) var(--density-spacing-lg)",
                fontSize: "var(--density-text-lg)"
              }}
              data-testid="button-start-navigation-bottom"
            >
              {isStartingJourney ? (
                <>
                  <Loader2 className="animate-spin nav-icon-lg" 
                           style={{ 
                             width: "var(--density-icon-lg)", 
                             height: "var(--density-icon-lg)",
                             marginRight: "var(--density-spacing-sm)"
                           }} />
                  Starting Navigation...
                </>
              ) : (
                <>
                  <Navigation className="nav-icon-lg" 
                             style={{ 
                               width: "var(--density-icon-lg)", 
                               height: "var(--density-icon-lg)",
                               marginRight: "var(--density-spacing-sm)"
                             }} />
                  Start Navigation
                </>
              )}
            </Button>
          )}

          {canStopNavigation && (
            <Button
              onTouchStart={(e) => {
                if (onStopNavigation) {
                  e.preventDefault();
                  e.stopPropagation();
                  onStopNavigation();
                }
              }}
              onClick={onStopNavigation}
              disabled={isCompletingJourney}
              variant="destructive"
              className={cn(
                "w-full font-semibold nav-button-primary",
                "shadow-md hover:shadow-lg transition-all duration-200"
              )}
              style={{
                minHeight: "var(--density-touch-target-lg)",
                padding: "var(--density-spacing-md) var(--density-spacing-lg)",
                fontSize: "var(--density-text-lg)"
              }}
              data-testid="button-stop-navigation-bottom"
            >
              {isCompletingJourney ? (
                <>
                  <Loader2 className="animate-spin nav-icon-lg" 
                           style={{ 
                             width: "var(--density-icon-lg)", 
                             height: "var(--density-icon-lg)",
                             marginRight: "var(--density-spacing-sm)"
                           }} />
                  Stopping Navigation...
                </>
              ) : (
                <>
                  <StopCircle className="nav-icon-lg" 
                             style={{ 
                               width: "var(--density-icon-lg)", 
                               height: "var(--density-icon-lg)",
                               marginRight: "var(--density-spacing-sm)"
                             }} />
                  Stop Navigation
                </>
              )}
            </Button>
          )}

          {currentRoute && (
            <div className="mt-2 text-center text-muted-foreground"
                 style={{ 
                   fontSize: "var(--density-text-sm)",
                   marginTop: "var(--density-spacing-sm)"
                 }}>
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