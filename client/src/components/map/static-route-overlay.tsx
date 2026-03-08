import { useEffect, useRef, useState, useCallback } from 'react';
import type maplibregl from 'maplibre-gl';

interface StaticRouteOverlayProps {
  map: maplibregl.Map | null;
  routeCoordinates: Array<{ lat: number; lng: number }>;
  isActive: boolean;
  routeColor?: string;
  routeWidth?: number;
}

export function StaticRouteOverlay({
  map,
  routeCoordinates,
  isActive,
  routeColor = '#3b82f6',
  routeWidth = 8
}: StaticRouteOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pathData, setPathData] = useState<string>('');
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const projectRouteToScreen = useCallback(() => {
    if (!map || !routeCoordinates.length || !isActive) {
      setPathData('');
      return;
    }

    const now = performance.now();
    if (now - lastUpdateRef.current < 16) return;
    lastUpdateRef.current = now;

    try {
      const screenPoints: Array<{ x: number; y: number }> = [];
      
      for (const coord of routeCoordinates) {
        const point = map.project([coord.lng, coord.lat]);
        screenPoints.push({ x: point.x, y: point.y });
      }

      if (screenPoints.length < 2) {
        setPathData('');
        return;
      }

      let d = `M ${screenPoints[0].x} ${screenPoints[0].y}`;
      for (let i = 1; i < screenPoints.length; i++) {
        d += ` L ${screenPoints[i].x} ${screenPoints[i].y}`;
      }
      
      setPathData(d);
    } catch (error) {
      console.warn('[STATIC-ROUTE] Failed to project coordinates:', error);
    }
  }, [map, routeCoordinates, isActive]);

  useEffect(() => {
    if (!map || !isActive) return;

    const handleMapUpdate = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(projectRouteToScreen);
    };

    map.on('move', handleMapUpdate);
    map.on('zoom', handleMapUpdate);
    map.on('rotate', handleMapUpdate);
    map.on('render', handleMapUpdate);

    projectRouteToScreen();

    return () => {
      map.off('move', handleMapUpdate);
      map.off('zoom', handleMapUpdate);
      map.off('rotate', handleMapUpdate);
      map.off('render', handleMapUpdate);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [map, isActive, projectRouteToScreen]);

  useEffect(() => {
    if (isActive) {
      projectRouteToScreen();
    }
  }, [routeCoordinates, isActive, projectRouteToScreen]);

  if (!isActive || !pathData) {
    return null;
  }

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none z-[40]"
      style={{ width: '100%', height: '100%' }}
      data-testid="static-route-overlay"
    >
      <path
        d={pathData}
        fill="none"
        stroke="white"
        strokeWidth={routeWidth + 4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={1}
      />
      <path
        d={pathData}
        fill="none"
        stroke={routeColor}
        strokeWidth={routeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={1}
      />
    </svg>
  );
}
