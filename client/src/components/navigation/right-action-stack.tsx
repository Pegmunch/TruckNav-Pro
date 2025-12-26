import { AlertCircle, Compass, Box, Plus, Minus, Layers, Crosshair, Map } from 'lucide-react';
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
  restrictionViolations = [],
  isVisible = true
}: RightActionStackProps) {
  return (
    <div 
      className="flex flex-col gap-2"
      data-testid="right-action-stack"
      style={{
        opacity: 1,
        visibility: 'visible',
        transform: 'none',
        pointerEvents: 'auto',
        position: 'relative',
        zIndex: 99999,
        background: 'rgba(255, 255, 255, 0.01)',
        minWidth: '40px',
        minHeight: '40px',
        padding: '4px'
      }}
    >
      {/* 1. Incidents - Red border */}
      {onViewIncidents && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onViewIncidents}
          className="h-8 w-8 rounded-xl bg-white hover:bg-gray-50 text-black border-2 border-red-500 shadow-lg"
          data-testid="button-view-incidents"
        >
          <AlertCircle className="h-4 w-4" />
        </Button>
      )}

      {/* 2. Toggle Map View - Green/Gray border */}
      {onToggleMapView && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMapView}
          className={cn(
            "h-8 w-8 rounded-xl bg-white hover:bg-gray-50 text-black border-2 shadow-lg",
            isSatelliteView ? "border-green-500" : "border-gray-400"
          )}
          data-testid="button-toggle-view"
        >
          <Map className="h-4 w-4" />
        </Button>
      )}

      {/* 3. Recenter - Gray border */}
      {onRecenter && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRecenter}
          className="h-8 w-8 rounded-xl bg-white hover:bg-gray-50 text-black border-2 border-gray-400 shadow-lg"
          data-testid="button-recenter"
        >
          <Crosshair className="h-4 w-4" />
        </Button>
      )}

      {/* 4. Zoom In - Gray border */}
      {onZoomIn && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="h-8 w-8 rounded-xl bg-white hover:bg-gray-50 text-black border-2 border-gray-400 shadow-lg"
          data-testid="button-zoom-in"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}

      {/* 5. Zoom Out - Gray border */}
      {onZoomOut && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          className="h-8 w-8 rounded-xl bg-white hover:bg-gray-50 text-black border-2 border-gray-400 shadow-lg"
          data-testid="button-zoom-out"
        >
          <Minus className="h-4 w-4" />
        </Button>
      )}

      {/* 6. Compass - Blue border */}
      {!hideCompass && onCompassClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onCompassClick}
          className="h-8 w-8 rounded-xl bg-white hover:bg-gray-50 text-black border-2 border-blue-500 shadow-lg"
          data-testid="button-compass-reset"
        >
          <Compass 
            className="h-4 w-4 transition-transform duration-300" 
            style={{ transform: `rotate(${bearing}deg)` }}
          />
        </Button>
      )}

      {/* 7. 3D Toggle - Blue/Gray border */}
      {onToggle3D && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle3D}
          className={cn(
            "h-8 w-8 rounded-xl bg-white hover:bg-gray-50 text-black border-2 shadow-lg",
            is3DMode ? "border-blue-500" : "border-gray-400"
          )}
          data-testid="button-toggle-3d"
        >
          <Box className="h-4 w-4" />
        </Button>
      )}

      {/* 8. Traffic Toggle - Orange/Gray border */}
      {onToggleTraffic && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTraffic}
          className={cn(
            "h-8 w-8 rounded-xl bg-white hover:bg-gray-50 text-black border-2 shadow-lg",
            showTraffic ? "border-orange-500" : "border-gray-400"
          )}
          data-testid="button-toggle-traffic"
        >
          <Layers className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
