import { Button } from "@/components/ui/button";
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
  onViewIncidents
}: NavigationControlsStackProps) {
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

  // Using same rendering approach as LeftActionStack but with ORIGINAL colors
  return (
    <>
      {/* 1. View Incidents - White with red icon */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-1-INCIDENTS] ✅ View Incidents clicked');
          onViewIncidents();
        }}
        className="h-24 w-24 rounded-xl bg-white hover:bg-gray-50 shadow-lg border border-gray-200"
        data-testid="nav-control-incidents"
        aria-label="View traffic incidents"
      >
        <AlertCircle className="h-12 w-12 text-red-600" />
      </Button>

      {/* 2. Compass - White with blue icon */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-2-COMPASS] ✅ Compass clicked');
          handleCompassClick();
        }}
        className="h-24 w-24 rounded-xl bg-white hover:bg-gray-50 shadow-lg border border-gray-200"
        data-testid="nav-control-compass"
        aria-label="Reset compass to north"
      >
        <div
          className="relative h-12 w-12"
          style={{
            transform: `rotate(${-mapBearing}deg)`,
            transition: 'transform 0.3s ease'
          }}
        >
          <Compass className="h-12 w-12 text-blue-600" />
        </div>
      </Button>

      {/* 3. Center on GPS - White with gray icon */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-3-GPS] ✅ Center on GPS clicked');
          handleCenterOnGPS();
        }}
        className="h-24 w-24 rounded-xl bg-white hover:bg-gray-50 shadow-lg border border-gray-200"
        data-testid="nav-control-center-gps"
        aria-label="Center on current location"
      >
        <MapPin className="h-12 w-12 text-gray-700" />
      </Button>

      {/* 4. Zoom In - White with gray icon */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-4-ZOOM-IN] ✅ Zoom In clicked');
          handleZoomIn();
        }}
        className="h-24 w-24 rounded-xl bg-white hover:bg-gray-50 shadow-lg border border-gray-200"
        data-testid="nav-control-zoom-in"
        aria-label="Zoom in"
      >
        <Plus className="h-12 w-12 text-gray-700" />
      </Button>

      {/* 5. Zoom Out - White with gray icon */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-5-ZOOM-OUT] ✅ Zoom Out clicked');
          handleZoomOut();
        }}
        className="h-24 w-24 rounded-xl bg-white hover:bg-gray-50 shadow-lg border border-gray-200"
        data-testid="nav-control-zoom-out"
        aria-label="Zoom out"
      >
        <Minus className="h-12 w-12 text-gray-700" />
      </Button>

      {/* 6. 3D Mode Toggle - Blue when active, white when inactive */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-6-3D] ✅ 3D Mode clicked - Current:', map3DMode);
          onToggle3D();
        }}
        className={`h-24 w-24 rounded-xl shadow-lg backdrop-blur-sm border ${
          map3DMode 
            ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-400" 
            : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
        }`}
        data-testid="nav-control-3d"
        aria-label={map3DMode ? "Switch to 2D view" : "Switch to 3D view"}
      >
        <Layers3 className="h-12 w-12" />
      </Button>

      {/* 7. Traffic Layer Toggle - Orange when active, white when inactive */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-7-TRAFFIC] ✅ Traffic clicked - Current:', showTrafficLayer);
          onToggleTraffic();
        }}
        className={`h-24 w-24 rounded-xl shadow-lg backdrop-blur-sm border ${
          showTrafficLayer
            ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-400"
            : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
        }`}
        data-testid="nav-control-traffic"
        aria-label={showTrafficLayer ? "Hide traffic layer" : "Show traffic layer"}
      >
        <Layers className="h-12 w-12" />
      </Button>

      {/* 8. Satellite View Toggle - Green when active, white when inactive */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-8-SATELLITE] ✅ Satellite clicked - Current:', mapViewMode);
          onToggleMapView();
        }}
        className={`h-24 w-24 rounded-xl shadow-lg backdrop-blur-sm border ${
          mapViewMode === 'satellite'
            ? "bg-green-500 hover:bg-green-600 text-white border-green-400"
            : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
        }`}
        data-testid="nav-control-satellite"
        aria-label={mapViewMode === 'satellite' ? "Switch to roads view" : "Switch to satellite view"}
      >
        <Map className="h-12 w-12" />
      </Button>
    </>
  );
}
