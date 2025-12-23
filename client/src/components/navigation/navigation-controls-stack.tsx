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
      {/* 1. View Incidents - Red */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-1-INCIDENTS] ✅ View Incidents clicked');
          onViewIncidents();
        }}
        className="h-8 w-8 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg"
        data-testid="nav-control-incidents"
        aria-label="View traffic incidents"
      >
        <AlertCircle className="h-4 w-4" />
      </Button>

      {/* 2. Compass - Blue */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-2-COMPASS] ✅ Compass clicked');
          handleCompassClick();
        }}
        className="h-8 w-8 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
        data-testid="nav-control-compass"
        aria-label="Reset compass to north"
      >
        <div
          className="relative h-4 w-4"
          style={{
            transform: `rotate(${-mapBearing}deg)`,
            transition: 'transform 0.3s ease'
          }}
        >
          <Compass className="h-4 w-4" />
        </div>
      </Button>

      {/* 3. Center on GPS - Gray */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-3-GPS] ✅ Center on GPS clicked');
          handleCenterOnGPS();
        }}
        className="h-8 w-8 rounded-xl bg-gray-500 hover:bg-gray-600 text-white shadow-lg"
        data-testid="nav-control-center-gps"
        aria-label="Center on current location"
      >
        <MapPin className="h-4 w-4" />
      </Button>

      {/* 4. Zoom In - Gray */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-4-ZOOM-IN] ✅ Zoom In clicked');
          handleZoomIn();
        }}
        className="h-8 w-8 rounded-xl bg-gray-500 hover:bg-gray-600 text-white shadow-lg"
        data-testid="nav-control-zoom-in"
        aria-label="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* 5. Zoom Out - Gray */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-5-ZOOM-OUT] ✅ Zoom Out clicked');
          handleZoomOut();
        }}
        className="h-8 w-8 rounded-xl bg-gray-500 hover:bg-gray-600 text-white shadow-lg"
        data-testid="nav-control-zoom-out"
        aria-label="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </Button>

      {/* 6. 3D Mode Toggle - Blue when active, gray when inactive */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-6-3D] ✅ 3D Mode clicked - Current:', map3DMode);
          onToggle3D();
        }}
        className={`h-8 w-8 rounded-xl shadow-lg ${
          map3DMode 
            ? "bg-blue-500 hover:bg-blue-600" 
            : "bg-gray-500 hover:bg-gray-600"
        } text-white`}
        data-testid="nav-control-3d"
        aria-label={map3DMode ? "Switch to 2D view" : "Switch to 3D view"}
      >
        <Layers3 className="h-4 w-4" />
      </Button>

      {/* 7. Traffic Layer Toggle - Orange when active, gray when inactive */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-7-TRAFFIC] ✅ Traffic clicked - Current:', showTrafficLayer);
          onToggleTraffic();
        }}
        className={`h-8 w-8 rounded-xl shadow-lg ${
          showTrafficLayer
            ? "bg-orange-500 hover:bg-orange-600"
            : "bg-gray-500 hover:bg-gray-600"
        } text-white`}
        data-testid="nav-control-traffic"
        aria-label={showTrafficLayer ? "Hide traffic layer" : "Show traffic layer"}
      >
        <Layers className="h-4 w-4" />
      </Button>

      {/* 8. Satellite View Toggle - Green when active, gray when inactive */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[RIGHT-BTN-8-SATELLITE] ✅ Satellite clicked - Current:', mapViewMode);
          onToggleMapView();
        }}
        className={`h-8 w-8 rounded-xl shadow-lg ${
          mapViewMode === 'satellite'
            ? "bg-green-500 hover:bg-green-600"
            : "bg-gray-500 hover:bg-gray-600"
        } text-white`}
        data-testid="nav-control-satellite"
        aria-label={mapViewMode === 'satellite' ? "Switch to roads view" : "Switch to satellite view"}
      >
        <Map className="h-4 w-4" />
      </Button>
    </>
  );
}
