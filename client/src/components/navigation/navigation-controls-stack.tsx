import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Compass,
  MapPin,
  Plus,
  Minus,
  Layers,
  Map,
  AlertCircle,
  Layers3
} from "lucide-react";
import type { MapLibreMapRef } from "@/components/map/maplibre-map";

interface NavigationControlsStackProps {
  mapRef: React.RefObject<MapLibreMapRef | null>;
  mapBearing: number;
  map3DMode: boolean;
  onToggle3D: () => void;
  showTrafficLayer: boolean;
  onToggleTraffic: () => void;
  mapViewMode: 'roads' | 'satellite';
  onToggleMapView: () => void;
  onViewIncidents: () => void;
  mode: 'preview' | 'navigate';
  className?: string;
}

export function NavigationControlsStack({
  mapRef,
  mapBearing,
  map3DMode,
  onToggle3D,
  showTrafficLayer,
  onToggleTraffic,
  mapViewMode,
  onToggleMapView,
  onViewIncidents,
  mode,
  className
}: NavigationControlsStackProps) {
  // Debug logging
  console.log('[NAV-CONTROLS] Component rendered with mode:', mode);
  console.log('[NAV-CONTROLS] Should render:', mode === 'navigate');
  
  // CRITICAL: Only show in navigate mode - Required for PWA navigation
  if (mode !== 'navigate') {
    console.log('[NAV-CONTROLS] Not rendering - mode is not navigate');
    return null;
  }
  
  console.log('[NAV-CONTROLS] Rendering navigation control buttons');

  const handleCompassClick = () => {
    mapRef.current?.resetBearing();
  };

  const handleCenterOnGPS = () => {
    mapRef.current?.zoomToUserLocation({
      zoom: 17,
      duration: 1000
    });
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  return (
    <div 
      className={cn(
        "fixed right-4 flex flex-col gap-2 z-[1800]",
        className
      )}
      style={{
        top: 'calc(120px + var(--safe-area-top))',
        right: 'calc(16px + var(--safe-area-right))'
      }}
    >
      {/* 1. Compass - Top Position */}
      <Button
        size="icon"
        variant="secondary"
        onClick={handleCompassClick}
        className={cn(
          "h-12 w-12 bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm",
          "border border-gray-200",
          "transition-all duration-200"
        )}
        data-testid="nav-control-compass"
        aria-label="Reset compass to north"
      >
        <div
          className="relative w-6 h-6"
          style={{
            transform: `rotate(${-mapBearing}deg)`,
            transition: 'transform 0.3s ease'
          }}
        >
          <Compass className="w-6 h-6 text-blue-600" />
        </div>
      </Button>

      {/* 2. Center on GPS */}
      <Button
        size="icon"
        variant="secondary"
        onClick={handleCenterOnGPS}
        className="h-12 w-12 bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm border border-gray-200"
        data-testid="nav-control-center-gps"
        aria-label="Center on current location"
      >
        <MapPin className="w-6 h-6 text-gray-700" />
      </Button>

      {/* 3. Zoom In */}
      <Button
        size="icon"
        variant="secondary"
        onClick={handleZoomIn}
        className="h-12 w-12 bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm border border-gray-200"
        data-testid="nav-control-zoom-in"
        aria-label="Zoom in"
      >
        <Plus className="w-6 h-6 text-gray-700" />
      </Button>

      {/* 4. Zoom Out */}
      <Button
        size="icon"
        variant="secondary"
        onClick={handleZoomOut}
        className="h-12 w-12 bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm border border-gray-200"
        data-testid="nav-control-zoom-out"
        aria-label="Zoom out"
      >
        <Minus className="w-6 h-6 text-gray-700" />
      </Button>

      {/* 5. 3D Mode Toggle */}
      <Button
        size="icon"
        variant="secondary"
        onClick={onToggle3D}
        className={cn(
          "h-12 w-12 shadow-lg backdrop-blur-sm border",
          map3DMode 
            ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-400"
            : "bg-white/90 hover:bg-white text-gray-700 border-gray-200"
        )}
        data-testid="nav-control-3d"
        aria-label={map3DMode ? "Switch to 2D view" : "Switch to 3D view"}
      >
        <Layers3 className="w-6 h-6" />
      </Button>

      {/* 6. Traffic Toggle */}
      <Button
        size="icon"
        variant="secondary"
        onClick={onToggleTraffic}
        className={cn(
          "h-12 w-12 shadow-lg backdrop-blur-sm border",
          showTrafficLayer 
            ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-400"
            : "bg-white/90 hover:bg-white text-gray-700 border-gray-200"
        )}
        data-testid="nav-control-traffic"
        aria-label={showTrafficLayer ? "Hide traffic" : "Show traffic"}
      >
        <Layers className="w-6 h-6" />
      </Button>

      {/* 7. Satellite View Toggle */}
      <Button
        size="icon"
        variant="secondary"
        onClick={onToggleMapView}
        className={cn(
          "h-12 w-12 shadow-lg backdrop-blur-sm border",
          mapViewMode === 'satellite'
            ? "bg-green-500 hover:bg-green-600 text-white border-green-400"
            : "bg-white/90 hover:bg-white text-gray-700 border-gray-200"
        )}
        data-testid="nav-control-satellite"
        aria-label={mapViewMode === 'satellite' ? "Switch to roads view" : "Switch to satellite view"}
      >
        <Map className="w-6 h-6" />
      </Button>

      {/* 8. View Incidents */}
      <Button
        size="icon"
        variant="secondary"
        onClick={onViewIncidents}
        className="h-12 w-12 bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm border border-gray-200"
        data-testid="nav-control-incidents"
        aria-label="View traffic incidents"
      >
        <AlertCircle className="w-6 h-6 text-red-600" />
      </Button>
    </div>
  );
}