import { useEffect, useRef, useState, useCallback, memo } from "react";
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Play, SkipForward, Navigation, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Route, type GeoJsonLineString } from "@shared/schema";

interface RoutePreviewOverlayProps {
  route: Route;
  isVisible: boolean;
  onSkip: () => void;
  onStartNavigation: () => void;
  onClose: () => void;
}

// Animation constants
const ANIMATION_DURATION = 10000; // 10 seconds in milliseconds
const FPS = 60;
const FRAME_TIME = 1000 / FPS;

// Camera lerp settings for smooth following
const CAMERA_LERP_FACTOR = 0.15;
const CAMERA_ZOOM_LEVEL = 16;
const CAMERA_PITCH = 60; // Automotive angle
const CAMERA_BEARING_OFFSET = 10; // Slight offset for better view

// Reduced motion query
const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const RoutePreviewOverlay = memo(function RoutePreviewOverlay({
  route,
  isVisible,
  onSkip,
  onStartNavigation,
  onClose
}: RoutePreviewOverlayProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const routeLineRef = useRef<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const cumulativeLengthsRef = useRef<number[]>([]);
  const totalLengthRef = useRef<number>(0);
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize map when overlay becomes visible
  useEffect(() => {
    if (!isVisible || !mapContainerRef.current) return;

    try {
      // Create MapLibre GL JS map instance
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm'
            }
          ]
        },
        center: [0, 0], // Will be set once route loads
        zoom: 10,
        pitch: CAMERA_PITCH,
        bearing: 0
      });

      mapRef.current = map;

      // Handle map load
      map.on('load', () => {
        setIsMapLoaded(true);
        initializeRoute();
      });

      // Handle errors
      map.on('error', (e) => {
        console.error('MapLibre GL error:', e);
        setError('Failed to load map');
      });

      // Cleanup on unmount
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map');
    }
  }, [isVisible]);

  // Initialize route geometry and prepare for animation
  const initializeRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !route.geometry) {
      setError('Route geometry not available');
      return;
    }

    try {
      const geometry = route.geometry as GeoJsonLineString;
      
      // CRITICAL: Validate and filter coordinates before use
      const validCoordinates = geometry.coordinates.filter(
        (coord: number[]) => Array.isArray(coord) && 
          coord.length >= 2 &&
          typeof coord[0] === 'number' && !isNaN(coord[0]) && isFinite(coord[0]) &&
          typeof coord[1] === 'number' && !isNaN(coord[1]) && isFinite(coord[1])
      );
      
      if (validCoordinates.length < 2) {
        setError('Insufficient valid coordinates for route preview');
        return;
      }
      
      // Use validated coordinates
      const validatedGeometry = { ...geometry, coordinates: validCoordinates };
      
      // Create Turf.js LineString for calculations
      const routeLine = turf.lineString(validCoordinates);
      routeLineRef.current = routeLine;

      // Pre-calculate cumulative lengths for efficient position lookup
      const coordinates = validCoordinates;
      const cumulativeLengths: number[] = [0];
      
      try {
        for (let i = 1; i < coordinates.length; i++) {
          // Double-check coordinates are valid numbers
          const prev = coordinates[i - 1];
          const curr = coordinates[i];
          if (!Array.isArray(prev) || !Array.isArray(curr) ||
              prev.length < 2 || curr.length < 2 ||
              typeof prev[0] !== 'number' || typeof prev[1] !== 'number' ||
              typeof curr[0] !== 'number' || typeof curr[1] !== 'number' ||
              isNaN(prev[0]) || isNaN(prev[1]) || isNaN(curr[0]) || isNaN(curr[1])) {
            continue;
          }
          const segmentLength = turf.distance(
            turf.point(prev),
            turf.point(curr),
            { units: 'kilometers' }
          );
          cumulativeLengths.push(cumulativeLengths[cumulativeLengths.length - 1] + segmentLength);
        }
      } catch (e) {
        console.warn('[ROUTE-PREVIEW] Error calculating cumulative lengths:', e);
      }

      cumulativeLengthsRef.current = cumulativeLengths;
      totalLengthRef.current = cumulativeLengths[cumulativeLengths.length - 1];

      // Add route line to map (using validated geometry)
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: validatedGeometry
        }
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#2563eb', // Blue route line
          'line-width': 6,
          'line-opacity': 0.8
        }
      });

      // Add traffic-aware route overlay for preview
      // Since this is a preview, we'll use a simplified gradient approach
      // For a real implementation, you'd query traffic data similar to the main map
      
      // Create gradient-style traffic overlay (simplified for preview)
      const trafficOverlayData = {
        type: 'Feature' as const,
        properties: {},
        geometry: validatedGeometry
      };

      map.addSource('route-traffic-preview', {
        type: 'geojson',
        data: trafficOverlayData
      });

      // Add a semi-transparent overlay that will show traffic when available
      // For preview, we keep it simple - the main map will have full traffic integration
      map.addLayer({
        id: 'route-traffic-preview-overlay',
        type: 'line',
        source: 'route-traffic-preview',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#2563eb', // Default blue for preview
          'line-width': 6,
          'line-opacity': 0.6
        }
      });

      // Load truck icon first (create a simple SVG icon)
      const truckSvg = `
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="12" width="16" height="8" rx="2" fill="#2563eb" stroke="white" stroke-width="2"/>
          <rect x="20" y="16" width="6" height="4" rx="1" fill="#2563eb" stroke="white" stroke-width="2"/>
          <circle cx="8" cy="24" r="3" fill="#374151" stroke="white" stroke-width="2"/>
          <circle cx="22" cy="24" r="3" fill="#374151" stroke="white" stroke-width="2"/>
          <rect x="6" y="6" width="4" height="6" fill="#2563eb" stroke="white" stroke-width="1"/>
        </svg>
      `;
      
      const truckImage = new Image();
      truckImage.onload = () => {
        if (mapRef.current && !mapRef.current.hasImage('truck-icon')) {
          mapRef.current.addImage('truck-icon', truckImage);
        }

        // Add truck marker source and layer after image is loaded
        if (mapRef.current) {
          // Add truck marker source
          map.addSource('truck', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                bearing: 0
              },
              geometry: {
                type: 'Point',
                coordinates: coordinates[0] // Start at first coordinate
              }
            }
          });

          // Add truck marker layer - now that image is registered
          map.addLayer({
            id: 'truck-marker',
            type: 'symbol',
            source: 'truck',
            layout: {
              'icon-image': 'truck-icon',
              'icon-size': 1.2,
              'icon-rotate': ['get', 'bearing'],
              'icon-rotation-alignment': 'map',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true
            }
          });
        }
      };
      truckImage.src = 'data:image/svg+xml;base64,' + btoa(truckSvg);

      // Fit map to route with padding
      const bbox = turf.bbox(routeLine);
      map.fitBounds(
        [[bbox[0], bbox[1]], [bbox[2], bbox[3]]] as maplibregl.LngLatBoundsLike,
        {
          padding: { top: 50, bottom: 150, left: 50, right: 50 }, // Extra bottom padding for controls
          duration: 1000
        }
      );

      // Set initial position
      setCurrentPosition(coordinates[0] as [number, number]);

      // Start animation automatically if motion is allowed
      if (!prefersReducedMotion()) {
        setTimeout(() => {
          startAnimation();
        }, 1500); // Give map time to settle
      }

    } catch (err) {
      console.error('Error initializing route:', err);
      setError('Failed to initialize route preview');
    }
  }, [route]);

  // Calculate position along route based on progress (0-1)
  const getPositionAtProgress = useCallback((progress: number): { 
    position: [number, number], 
    bearing: number 
  } | null => {
    if (!routeLineRef.current || !cumulativeLengthsRef.current.length) {
      return null;
    }

    try {
      const targetDistance = progress * totalLengthRef.current;
      
      // Find the position using turf.along
      const position = turf.along(routeLineRef.current, targetDistance, { units: 'kilometers' });
      
      // Calculate bearing by looking ahead slightly
      const lookAheadDistance = Math.min(0.1, totalLengthRef.current * 0.01); // 100m or 1% of route
      const lookAheadPosition = turf.along(
        routeLineRef.current, 
        Math.min(targetDistance + lookAheadDistance, totalLengthRef.current),
        { units: 'kilometers' }
      );

      const bearing = turf.bearing(position, lookAheadPosition);

      return {
        position: position.geometry.coordinates as [number, number],
        bearing: bearing
      };
    } catch (err) {
      console.error('Error calculating position:', err);
      return null;
    }
  }, []);

  // Smooth camera interpolation
  const updateCamera = useCallback((position: [number, number], bearing: number) => {
    const map = mapRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const currentBearing = map.getBearing();

    // Lerp position
    const newLng = currentCenter.lng + (position[0] - currentCenter.lng) * CAMERA_LERP_FACTOR;
    const newLat = currentCenter.lat + (position[1] - currentCenter.lat) * CAMERA_LERP_FACTOR;

    // Lerp bearing with offset for better viewing angle
    const targetBearing = bearing + CAMERA_BEARING_OFFSET;
    let bearingDiff = targetBearing - currentBearing;
    
    // Handle bearing wrap-around
    if (bearingDiff > 180) bearingDiff -= 360;
    if (bearingDiff < -180) bearingDiff += 360;
    
    const newBearing = currentBearing + bearingDiff * CAMERA_LERP_FACTOR;

    // Update camera with smooth transition
    map.jumpTo({
      center: [newLng, newLat],
      bearing: newBearing,
      zoom: CAMERA_ZOOM_LEVEL,
      pitch: CAMERA_PITCH
    });
  }, []);

  // Animation loop
  const animate = useCallback((currentTime: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = currentTime;
    }

    const elapsed = currentTime - startTimeRef.current;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

    const positionData = getPositionAtProgress(progress);
    if (positionData && mapRef.current) {
      const { position, bearing } = positionData;
      
      // CRITICAL: Validate coordinates before passing to MapLibre
      if (!position || 
          !Array.isArray(position) || 
          position.length < 2 ||
          typeof position[0] !== 'number' || isNaN(position[0]) || !isFinite(position[0]) ||
          typeof position[1] !== 'number' || isNaN(position[1]) || !isFinite(position[1])) {
        console.warn('[ROUTE-PREVIEW] Invalid position coordinates, skipping update');
        return;
      }

      // Update truck marker
      const truckSource = mapRef.current.getSource('truck') as maplibregl.GeoJSONSource;
      if (truckSource) {
        truckSource.setData({
          type: 'Feature',
          properties: { bearing: bearing || 0 },
          geometry: {
            type: 'Point',
            coordinates: position
          }
        });
      }

      // Update camera
      updateCamera(position, bearing);
      
      // Update state
      setCurrentPosition(position);
      setAnimationProgress(progress);
    }

    // Continue animation or complete
    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete
      setIsAnimating(false);
      animationFrameRef.current = null;
      startTimeRef.current = null;
    }
  }, [getPositionAtProgress, updateCamera]);

  // Start animation
  const startAnimation = useCallback(() => {
    if (isAnimating || !isMapLoaded) return;
    
    setIsAnimating(true);
    setAnimationProgress(0);
    startTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isAnimating, isMapLoaded, animate]);

  // Skip animation
  const handleSkip = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Jump to end
    const endPosition = getPositionAtProgress(1);
    if (endPosition && mapRef.current) {
      const { position, bearing } = endPosition;
      
      // CRITICAL: Validate coordinates before passing to MapLibre
      if (!position || 
          !Array.isArray(position) || 
          position.length < 2 ||
          typeof position[0] !== 'number' || isNaN(position[0]) || !isFinite(position[0]) ||
          typeof position[1] !== 'number' || isNaN(position[1]) || !isFinite(position[1])) {
        console.warn('[ROUTE-PREVIEW] Invalid end position coordinates, skipping update');
        return;
      }
      
      const truckSource = mapRef.current.getSource('truck') as maplibregl.GeoJSONSource;
      if (truckSource) {
        truckSource.setData({
          type: 'Feature',
          properties: { bearing: bearing || 0 },
          geometry: {
            type: 'Point',
            coordinates: position
          }
        });
      }
      updateCamera(position, bearing || 0);
    }

    setIsAnimating(false);
    setAnimationProgress(1);
    startTimeRef.current = null;
    onSkip();
  }, [getPositionAtProgress, updateCamera, onSkip]);

  // Handle visibility changes (pause/resume on tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isAnimating) {
        // Pause animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      } else if (!document.hidden && isAnimating && !animationFrameRef.current) {
        // Resume animation by adjusting start time
        const currentProgress = animationProgress;
        startTimeRef.current = performance.now() - (currentProgress * ANIMATION_DURATION);
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAnimating, animationProgress, animate]);

  if (!isVisible) {
    console.log('Route preview overlay not visible');
    return null;
  }
  
  console.log('Route preview overlay is rendering', { route, isMapLoaded, error });

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-transparent", // Transparent background - no grey overlay
        "flex flex-col",
        "touch-none" // Prevent touch scrolling
      )}
      data-testid="route-preview-overlay"
    >
      {/* Map container */}
      <div 
        ref={mapContainerRef}
        className="flex-1 w-full h-full relative"
        data-testid="preview-map-container"
      />

      {/* Error display */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-[60]">
          <Card className="p-4 bg-destructive/10 border-destructive">
            <p className="text-destructive text-center">{error}</p>
          </Card>
        </div>
      )}

      {/* Close button */}
      <Button
        variant="outline"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] bg-background border border-border shadow-lg"
        data-testid="button-close-preview"
      >
        <X className="w-4 h-4" />
      </Button>

      {/* Route info overlay */}
      <div className="absolute top-4 left-4 z-[60]">
        <Card className="p-3 bg-background border border-border shadow-lg">
          <div className="flex items-center space-x-2 text-sm">
            <Truck className="w-4 h-4 text-primary" />
            <span className="font-medium">Route Preview</span>
            {isAnimating && (
              <span className="text-muted-foreground">
                ({Math.round(animationProgress * 100)}%)
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom controls - compact buttons only */}
      <div className="absolute bottom-0 left-0 right-0 z-[60] p-2">
        <div className="flex justify-center space-x-2 max-w-sm mx-auto">
          {/* Play/Skip button */}
          {!isAnimating && animationProgress === 0 && isMapLoaded && (
            <Button
              onClick={startAnimation}
              size="sm"
              className="h-8 text-sm px-3"
              disabled={prefersReducedMotion()}
              data-testid="button-start-preview"
            >
              <Play className="w-4 h-4 mr-1" />
              {prefersReducedMotion() ? 'Disabled' : 'Preview'}
            </Button>
          )}
          
          {isAnimating && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkip}
              className="h-8 text-sm px-3"
              data-testid="button-skip-preview"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Skip
            </Button>
          )}

          {/* Start Navigation button moved to bottom of screen */}
        </div>
      </div>
    </div>
  );
});

export default RoutePreviewOverlay;