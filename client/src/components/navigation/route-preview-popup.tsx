import { memo, useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Minimize2, 
  Maximize2,
  X,
  MapPin,
  Flag
} from "lucide-react";
import { type Route } from "@shared/schema";
import { cn } from "@/lib/utils";

interface RoutePreviewPopupProps {
  currentRoute: Route | null;
  isNavigating: boolean;
  currentLocation?: { lat: number; lng: number };
  className?: string;
}

// Always use satellite view for the preview popup
const satelliteProvider = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: '© Esri, DigitalGlobe, GeoEye',
  maxZoom: 18
};

// Create start marker (green pin)
const createStartIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        width: 20px; 
        height: 20px; 
        background: #10B981; 
        border: 2px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          color: white;
          font-size: 10px;
          transform: rotate(45deg);
          font-weight: bold;
        ">S</div>
      </div>
    `,
    className: 'route-start-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -20]
  });
};

// Create end marker (red flag)
const createEndIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        width: 20px; 
        height: 20px; 
        background: #EF4444; 
        border: 2px solid white;
        border-radius: 3px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          color: white;
          font-size: 10px;
          font-weight: bold;
        ">🏁</div>
      </div>
    `,
    className: 'route-end-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -20]
  });
};

// Component to fit route bounds automatically
const RouteViewFitter = ({ routePath }: { routePath: { lat: number; lng: number }[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (routePath && routePath.length > 0) {
      // Create bounds from route path
      const bounds = L.latLngBounds(
        routePath.map(coord => [coord.lat, coord.lng])
      );
      
      // Fit the route with some padding
      map.fitBounds(bounds, { 
        padding: [10, 10],
        maxZoom: 15 // Don't zoom in too much for route overview
      });
    }
  }, [map, routePath]);
  
  return null;
};

const RoutePreviewPopup = memo(function RoutePreviewPopup({
  currentRoute,
  isNavigating,
  currentLocation,
  className
}: RoutePreviewPopupProps) {
  // Don't render if not navigating or no route - MUST be before hooks
  if (!isNavigating || !currentRoute || !currentRoute.routePath || currentRoute.routePath.length === 0) {
    return null;
  }

  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ 
    x: 10, // Far left
    y: typeof window !== 'undefined' ? (window.innerHeight / 2 - 75) : 100 // Vertically centered
  });
  const dragRef = useRef<HTMLDivElement>(null);
  
  const routePath = currentRoute.routePath;
  const startPoint = routePath[0];
  const endPoint = routePath[routePath.length - 1];
  
  // Handle drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return; // Only drag from header area
    setIsDragging(true);
    e.preventDefault();
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      setPosition(prev => ({
        x: Math.max(0, Math.min(window.innerWidth - 220, prev.x + e.movementX)),
        y: Math.max(0, Math.min(window.innerHeight - 200, prev.y + e.movementY))
      }));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  return (
    <Card 
      className={cn(
        "fixed z-50 shadow-2xl border-2 transition-all duration-300 select-none",
        isFullscreen ? "inset-0 w-full h-full" : isMinimized ? "w-12 h-10" : "w-[12.5vw] h-[12.5vw] min-w-[150px] min-h-[150px]",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      ref={dragRef}
      data-testid="route-preview-popup"
    >
      {/* Header with controls */}
      <div 
        className="absolute top-0 left-0 right-0 h-8 bg-blue-600 flex items-center justify-between px-2 text-white text-xs cursor-grab z-10 rounded-t-md"
        onMouseDown={handleMouseDown}
        data-testid="route-preview-header"
      >
        <span className="font-medium flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {isMinimized ? "" : "Route Overview"}
        </span>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-white hover:bg-white/20"
              onClick={() => setIsFullscreen(!isFullscreen)}
              data-testid={isFullscreen ? "exit-fullscreen-preview" : "fullscreen-route-preview"}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-white hover:bg-white/20"
            onClick={() => {
              if (isFullscreen) setIsFullscreen(false);
              setIsMinimized(!isMinimized);
            }}
            data-testid={isMinimized ? "maximize-route-preview" : "minimize-route-preview"}
            title={isMinimized ? "Restore" : "Minimize"}
          >
            {isMinimized ? (
              <Maximize2 className="w-3 h-3" />
            ) : (
              <Minimize2 className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Map content - only show when not minimized */}
      {!isMinimized && (
        <CardContent className="p-0 h-full pt-8">
          <div className="h-full rounded-b-md overflow-hidden">
            <MapContainer
              center={[startPoint.lat, startPoint.lng]}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={true}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              touchZoom={false}
              data-testid="route-preview-map"
            >
              {/* Always satellite tile layer */}
              <TileLayer
                url={satelliteProvider.url}
                attribution={satelliteProvider.attribution}
                maxZoom={satelliteProvider.maxZoom}
              />
              
              {/* Route path polyline */}
              <Polyline
                positions={routePath.map(coord => [coord.lat, coord.lng])}
                color="#3B82F6"
                weight={3}
                opacity={0.9}
                data-testid="route-preview-path"
              />
              
              {/* Start marker */}
              <Marker
                position={[startPoint.lat, startPoint.lng]}
                icon={createStartIcon()}
              />
              
              {/* End marker */}
              <Marker
                position={[endPoint.lat, endPoint.lng]}
                icon={createEndIcon()}
              />
              
              {/* Current location marker if available */}
              {currentLocation && (
                <Marker
                  position={[currentLocation.lat, currentLocation.lng]}
                  icon={L.divIcon({
                    html: `
                      <div style="
                        width: 12px; 
                        height: 12px; 
                        background: #FBBF24; 
                        border: 2px solid white;
                        border-radius: 50%;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                      "></div>
                    `,
                    className: 'current-location-marker',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                  })}
                />
              )}
              
              {/* Auto-fit route bounds */}
              <RouteViewFitter routePath={routePath} />
            </MapContainer>
          </div>
          
          {/* Route info overlay */}
          <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded flex justify-between items-center">
            <span className="flex items-center gap-1">
              <Flag className="w-3 h-3" />
              {currentRoute.distance ? `${currentRoute.distance.toFixed(1)} mi` : 'Route'}
            </span>
            <span className="text-green-400">
              Satellite
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
});

export default RoutePreviewPopup;