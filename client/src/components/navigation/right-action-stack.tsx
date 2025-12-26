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
  onCompassClick?: () => void;
  is3DMode?: boolean;
  showTraffic?: boolean;
  isSatelliteView?: boolean;
  bearing?: number;
  hideCompass?: boolean;
}

export function RightActionStack({
  onZoomIn,
  onZoomOut,
  onRecenter,
  onToggle3D,
  onToggleTraffic,
  onToggleMapView,
  onViewIncidents,
  onCompassClick,
  is3DMode = false,
  showTraffic = false,
  isSatelliteView = false,
  bearing = 0,
  hideCompass = false
}: RightActionStackProps) {
  return (
    <>
      {/* 1. Incidents */}
      {onViewIncidents && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onViewIncidents}
          className="h-8 w-8 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg"
          data-testid="button-view-incidents"
        >
          <AlertCircle className="h-4 w-4" />
        </Button>
      )}

      {/* 2. Toggle Map View */}
      {onToggleMapView && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMapView}
          className={cn(
            "h-8 w-8 rounded-xl shadow-lg text-white",
            isSatelliteView ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"
          )}
          data-testid="button-toggle-view"
        >
          <Map className="h-4 w-4" />
        </Button>
      )}

      {/* 3. Recenter */}
      {onRecenter && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRecenter}
          className="h-8 w-8 rounded-xl bg-gray-500 hover:bg-gray-600 text-white shadow-lg"
          data-testid="button-recenter"
        >
          <Crosshair className="h-4 w-4" />
        </Button>
      )}

      {/* 4. Zoom In */}
      {onZoomIn && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="h-8 w-8 rounded-xl bg-gray-500 hover:bg-gray-600 text-white shadow-lg"
          data-testid="button-zoom-in"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}

      {/* 5. Zoom Out */}
      {onZoomOut && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          className="h-8 w-8 rounded-xl bg-gray-500 hover:bg-gray-600 text-white shadow-lg"
          data-testid="button-zoom-out"
        >
          <Minus className="h-4 w-4" />
        </Button>
      )}

      {/* 6. Compass */}
      {!hideCompass && onCompassClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onCompassClick}
          className="h-8 w-8 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
          data-testid="button-compass-reset"
        >
          <Compass 
            className="h-4 w-4 transition-transform duration-300" 
            style={{ transform: `rotate(${bearing}deg)` }}
          />
        </Button>
      )}

      {/* 7. 3D Toggle */}
      {onToggle3D && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle3D}
          className={cn(
            "h-8 w-8 rounded-xl shadow-lg text-white",
            is3DMode ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-500 hover:bg-gray-600"
          )}
          data-testid="button-toggle-3d"
        >
          <Box className="h-4 w-4" />
        </Button>
      )}

      {/* 8. Traffic Toggle */}
      {onToggleTraffic && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTraffic}
          className={cn(
            "h-8 w-8 rounded-xl shadow-lg text-white",
            showTraffic ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-500 hover:bg-gray-600"
          )}
          data-testid="button-toggle-traffic"
        >
          <Layers className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}
