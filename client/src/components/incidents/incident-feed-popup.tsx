import { memo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronsUp,
  ChevronsDown,
  X,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IncidentFeed } from "./incident-feed";
import { type TrafficIncident } from "@shared/schema";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface IncidentFeedPopupProps {
  currentLocation?: { lat: number; lng: number };
  showIncidents: boolean;
  onClose?: () => void;
  onInteraction?: () => void;
  className?: string;
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  
  return distanceKm;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

const IncidentFeedPopup = memo(function IncidentFeedPopup({
  currentLocation,
  showIncidents,
  className,
  onClose,
  onInteraction
}: IncidentFeedPopupProps) {
  const [expandState, setExpandState] = useState<'small' | 'fullscreen'>('small');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ 
    x: typeof window !== 'undefined' ? (window.innerWidth / 2 - 125) : 100,
    y: typeof window !== 'undefined' ? (window.innerHeight / 2 - 150) : 100
  });
  const dragRef = useRef<HTMLDivElement>(null);
  
  const { data: incidents = [] } = useQuery<TrafficIncident[]>({
    queryKey: ["/api/traffic-incidents"],
    refetchInterval: 120000,
    enabled: showIncidents,
  });

  const nearbyIncidentCount = incidents.filter((incident) => {
    if (!incident.isActive) return false;
    if (!currentLocation) return true;
    
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      incident.coordinates.lat,
      incident.coordinates.lng
    );
    
    const maxDistanceKm = 50;
    return distance <= maxDistanceKm;
  }).length;
  
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const focusTrapRef = useFocusTrap<HTMLDivElement>({
    enabled: showIncidents && expandState === 'fullscreen',
    onEscape: handleClose,
    initialFocus: false,
    returnFocus: true,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (expandState === 'fullscreen') return;
    setIsDragging(true);
    e.preventDefault();
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      setPosition(prev => ({
        x: Math.max(0, Math.min(window.innerWidth - 250, prev.x + e.movementX)),
        y: Math.max(0, Math.min(window.innerHeight - 300, prev.y + e.movementY))
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

  if (!showIncidents) {
    return null;
  }
  
  return (
    <Card 
      ref={expandState === 'fullscreen' ? focusTrapRef : dragRef}
      role="dialog"
      aria-labelledby="incident-feed-title"
      aria-describedby="incident-feed-description"
      aria-modal={expandState === 'fullscreen' ? 'true' : 'false'}
      className={cn(
        "fixed z-50 shadow-2xl border-2 transition-all duration-300 select-none",
        expandState === 'fullscreen' 
          ? "inset-0 w-full h-full" 
          : "w-[20vw] h-[30vh] min-w-[250px] min-h-[300px]",
        className
      )}
      style={{
        left: expandState === 'fullscreen' ? 0 : position.x,
        top: expandState === 'fullscreen' ? 0 : position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      data-testid="incident-feed-popup"
    >
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 h-10 bg-blue-600 flex items-center justify-between px-3 text-white text-sm z-10 rounded-t-md",
          expandState === 'small' ? "cursor-grab" : ""
        )}
        onMouseDown={handleMouseDown}
        data-testid="incident-feed-header"
      >
        <span id="incident-feed-title" className="font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span id="incident-feed-description">Nearby Incidents</span>
          <Badge 
            variant="secondary" 
            className="bg-white/20 text-white hover:bg-white/30 text-xs"
            data-testid="badge-incident-count"
            aria-label={`${nearbyIncidentCount} nearby incidents`}
          >
            {nearbyIncidentCount}
          </Badge>
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="min-w-[44px] min-h-[44px] p-0 text-white hover:bg-white/20"
            onClick={() => {
              setExpandState(expandState === 'small' ? 'fullscreen' : 'small');
              onInteraction?.();
            }}
            data-testid={expandState === 'fullscreen' ? "collapse-incident-feed" : "expand-incident-feed"}
            title={expandState === 'fullscreen' ? "Collapse" : "Expand"}
            aria-label={expandState === 'fullscreen' ? "Collapse incident feed" : "Expand incident feed"}
          >
            {expandState === 'fullscreen' ? (
              <ChevronsDown className="w-4 h-4" />
            ) : (
              <ChevronsUp className="w-4 h-4" />
            )}
          </Button>
          {expandState === 'small' && onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="min-w-[44px] min-h-[44px] p-0 text-white hover:bg-white/20"
              onClick={() => {
                onClose();
                onInteraction?.();
              }}
              data-testid="close-incident-feed"
              title="Close"
              aria-label="Close incident feed"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      <CardContent className="p-0 h-full pt-10">
        <div className="h-full rounded-b-md overflow-hidden">
          <IncidentFeed
            currentLocation={currentLocation}
            showIncidents={showIncidents}
          />
        </div>
      </CardContent>
    </Card>
  );
});

export default IncidentFeedPopup;
