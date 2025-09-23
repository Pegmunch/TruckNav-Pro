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
      
      // Create Turf.js LineString for calculations
      const routeLine = turf.lineString(geometry.coordinates);
      routeLineRef.current = routeLine;

      // Pre-calculate cumulative lengths for efficient position lookup
      const coordinates = geometry.coordinates;
      const cumulativeLengths: number[] = [0];
      
      for (let i = 1; i < coordinates.length; i++) {
        const segmentLength = turf.distance(
          turf.point(coordinates[i - 1]),
          turf.point(coordinates[i]),
          { units: 'kilometers' }
        );
        cumulativeLengths.push(cumulativeLengths[i - 1] + segmentLength);
      }

      cumulativeLengthsRef.current = cumulativeLengths;
      totalLengthRef.current = cumulativeLengths[cumulativeLengths.length - 1];

      // Add route line to map
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: geometry
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

      // Update truck marker
      const truckSource = mapRef.current.getSource('truck') as maplibregl.GeoJSONSource;
      if (truckSource) {
        truckSource.setData({
          type: 'Feature',
          properties: { bearing: bearing },
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
      const truckSource = mapRef.current.getSource('truck') as maplibregl.GeoJSONSource;
      if (truckSource) {
        truckSource.setData({
          type: 'Feature',
          properties: { bearing: endPosition.bearing },
          geometry: {
            type: 'Point',
            coordinates: endPosition.position
          }
        });
      }
      updateCamera(endPosition.position, endPosition.bearing);
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
        "fixed inset-0 z-50 bg-black", // Solid background - no backdrop blur to prevent frosted glass overlay
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
        <div className="absolute top-4 left-4 right-4 z-10">
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
        className="absolute top-4 right-4 z-10 bg-background border border-border shadow-lg"
        data-testid="button-close-preview"
      >
        <X className="w-4 h-4" />
      </Button>

      {/* Route info overlay */}
      <div className="absolute top-4 left-4 z-10">
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

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-background/95 via-background/90 to-transparent">
        <div className="flex flex-col space-y-4 max-w-md mx-auto">
          {/* Progress indicator */}
          {(isAnimating || animationProgress > 0) && (
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${animationProgress * 100}%` }}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-3">
            {/* Play/Skip button */}
            {!isAnimating && animationProgress === 0 && isMapLoaded && (
              <Button
                onClick={startAnimation}
                className="flex-1 h-12 text-lg font-medium"
                disabled={prefersReducedMotion()}
                data-testid="button-start-preview"
              >
                <Play className="w-5 h-5 mr-2" />
                {prefersReducedMotion() ? 'Motion Disabled' : 'Preview Route'}
              </Button>
            )}
            
            {isAnimating && (
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex-1 h-12 text-lg font-medium"
                data-testid="button-skip-preview"
              >
                <SkipForward className="w-5 h-5 mr-2" />
                Skip Preview
              </Button>
            )}

            {/* Start Navigation - always visible once route is loaded */}
            {isMapLoaded && (
              <Button
                onClick={onStartNavigation}
                variant={animationProgress === 1 || prefersReducedMotion() ? "default" : "outline"}
                className="flex-1 h-12 text-lg font-medium"
                data-testid="button-start-navigation"
              >
                <Navigation className="w-5 h-5 mr-2" />
                Start Navigation
              </Button>
            )}
          </div>

          {/* Accessibility notice */}
          {prefersReducedMotion() && (
            <p className="text-sm text-muted-foreground text-center">
              Route animation disabled due to motion preferences
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default RoutePreviewOverlay;