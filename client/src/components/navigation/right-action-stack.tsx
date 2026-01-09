import { AlertCircle, Compass, Box, Plus, Minus, Layers, Crosshair, Map } from 'lucide-react';
import { useRef, type PointerEvent, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RightActionStackProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onRecenter?: () => void;
  onToggle3D?: () => void;
  onToggleTraffic?: () => void;
  onToggleMapView?: () => void;
  onViewIncidents?: () => void;
  onViewRestrictionDetails?: () => void;
  onCompassClick?: () => void;
  is3DMode?: boolean;
  showTraffic?: boolean;
  isSatelliteView?: boolean;
  bearing?: number;
  hideCompass?: boolean;
  hideIncidents?: boolean;
  restrictionViolations?: any[];
  isVisible?: boolean;
}

export function RightActionStack({
  onZoomIn,
  onZoomOut,
  onRecenter,
  onToggle3D,
  onToggleTraffic,
  onToggleMapView,
  onViewIncidents,
  onViewRestrictionDetails,
  onCompassClick,
  is3DMode = false,
  showTraffic = false,
  isSatelliteView = false,
  bearing = 0,
  hideCompass = false,
  hideIncidents = false,
  restrictionViolations = [],
  isVisible = true
}: RightActionStackProps) {
  const handledByPointerRef = useRef<Record<string, boolean>>({});
  
  const createHandler = (callback: (() => void) | undefined, label: string) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      handledByPointerRef.current[label] = true;
      callback?.();
      setTimeout(() => { handledByPointerRef.current[label] = false; }, 300);
    },
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!handledByPointerRef.current[label]) {
        callback?.();
      }
    }
  });

  return (
    <div 
      className={cn(
        "flex flex-col gap-2 transition-all duration-300 transform-gpu",
        isVisible ? "translate-x-0 opacity-100 scale-100" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
      )} 
      data-testid="right-action-stack"
      data-tour-id="right-controls"
      style={{
        visibility: isVisible ? 'visible' : 'hidden'
      }}
    >
      {/* 1. Incidents - Red border (hidden when moved to top-right) */}
      {onViewIncidents && !hideIncidents && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onViewIncidents, 'INCIDENTS')}
          className="h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-red-500 shadow-lg select-none touch-manipulation"
          style={{ touchAction: 'manipulation' }}
          data-testid="button-view-incidents"
        >
          <AlertCircle className="h-5 w-5" />
        </Button>
      )}

      {/* 2. Toggle Map View - Green/Gray border */}
      {onToggleMapView && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onToggleMapView, 'MAP-VIEW')}
          className={cn(
            "h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation",
            isSatelliteView ? "border-green-500" : "border-gray-400"
          )}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-toggle-view"
        >
          <Map className="h-5 w-5" />
        </Button>
      )}

      {/* Spacer to separate top 2 buttons from remaining controls on mobile */}
      <div className="h-4 md:h-2" aria-hidden="true" />

      {/* 3. Recenter - Gray border */}
      {onRecenter && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onRecenter, 'RECENTER')}
          className="h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-gray-400 shadow-lg select-none touch-manipulation"
          style={{ touchAction: 'manipulation' }}
          data-testid="button-recenter"
        >
          <Crosshair className="h-5 w-5" />
        </Button>
      )}

      {/* 4. Zoom In - Gray border */}
      {onZoomIn && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onZoomIn, 'ZOOM-IN')}
          className="h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-gray-400 shadow-lg select-none touch-manipulation"
          style={{ touchAction: 'manipulation' }}
          data-testid="button-zoom-in"
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}

      {/* 5. Zoom Out - Gray border */}
      {onZoomOut && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onZoomOut, 'ZOOM-OUT')}
          className="h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-gray-400 shadow-lg select-none touch-manipulation"
          style={{ touchAction: 'manipulation' }}
          data-testid="button-zoom-out"
        >
          <Minus className="h-5 w-5" />
        </Button>
      )}

      {/* 6. Compass - Blue border */}
      {!hideCompass && onCompassClick && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onCompassClick, 'COMPASS')}
          className="h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-blue-500 shadow-lg select-none touch-manipulation"
          style={{ touchAction: 'manipulation' }}
          data-testid="button-compass-reset"
        >
          <Compass 
            className="h-5 w-5 transition-transform duration-300" 
            style={{ transform: `rotate(${bearing}deg)` }}
          />
        </Button>
      )}

      {/* 7. 3D Toggle - Blue/Gray border */}
      {onToggle3D && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onToggle3D, '3D')}
          className={cn(
            "h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation",
            is3DMode ? "border-blue-500" : "border-gray-400"
          )}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-toggle-3d"
        >
          <Box className="h-5 w-5" />
        </Button>
      )}

      {/* 8. Traffic Toggle - Orange/Gray border */}
      {onToggleTraffic && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onToggleTraffic, 'TRAFFIC')}
          className={cn(
            "h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation",
            showTraffic ? "border-orange-500" : "border-gray-400"
          )}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-toggle-traffic"
        >
          <Layers className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
