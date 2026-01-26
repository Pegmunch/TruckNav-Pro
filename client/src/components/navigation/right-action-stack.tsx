import { AlertCircle, Compass, Box, Plus, Minus, Layers, Crosshair, Map } from 'lucide-react';
import { useRef, useState, useCallback, type PointerEvent, type MouseEvent, type TouchEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hapticButtonPress } from '@/hooks/use-haptic-feedback';

interface RightActionStackProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onStaggeredZoomIn?: (multiplier: number) => void;
  onStaggeredZoomOut?: (multiplier: number) => void;
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
  hideIncidents?: boolean;
  hide3D?: boolean;
  restrictionViolations?: any[];
  isVisible?: boolean;
  compact?: boolean;
  isNavigating?: boolean;
}

export function RightActionStack({
  onZoomIn,
  onZoomOut,
  onStaggeredZoomIn,
  onStaggeredZoomOut,
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
  hideIncidents = false,
  hide3D = false,
  restrictionViolations = [],
  isVisible = true,
  compact = false,
  isNavigating = false
}: RightActionStackProps) {
  // Button and icon sizes - compact for mobile navigation
  // Minimum 44px touch target for accessibility on tablets/touch devices
  const buttonSize = compact ? "h-9 w-9 min-h-[36px] min-w-[36px]" : "h-11 w-11 min-h-[44px] min-w-[44px]";
  const iconSize = compact ? "h-4 w-4" : "h-5 w-5";
  const handledByPointerRef = useRef<Record<string, boolean>>({});
  const zoomCooldownRef = useRef<boolean>(false);
  
  // Double-tap detection for x2 zoom multiplier during navigation
  const lastZoomTapRef = useRef<{ direction: 'in' | 'out'; time: number } | null>(null);
  const DOUBLE_TAP_THRESHOLD = 300; // ms
  
  const handleNavigationZoom = useCallback((direction: 'in' | 'out') => {
    if (zoomCooldownRef.current) return;
    
    const now = Date.now();
    const lastTap = lastZoomTapRef.current;
    let multiplier = 1;
    
    // Check for double-tap (same direction within threshold)
    if (lastTap && lastTap.direction === direction && (now - lastTap.time) < DOUBLE_TAP_THRESHOLD) {
      multiplier = 2; // x2 layer press
      lastZoomTapRef.current = null; // Reset after double-tap
      console.log(`[NAV-ZOOM-${direction.toUpperCase()}] 🚀 Double-tap detected! x2 multiplier (x20 total zoom)`);
    } else {
      lastZoomTapRef.current = { direction, time: now };
      console.log(`[NAV-ZOOM-${direction.toUpperCase()}] Single tap - x10 staggered zoom`);
    }
    
    // Trigger staggered zoom
    if (direction === 'in' && onStaggeredZoomIn) {
      zoomCooldownRef.current = true;
      onStaggeredZoomIn(multiplier);
      // Longer cooldown for staggered animation
      setTimeout(() => { zoomCooldownRef.current = false; }, multiplier === 2 ? 2000 : 1000);
    } else if (direction === 'out' && onStaggeredZoomOut) {
      zoomCooldownRef.current = true;
      onStaggeredZoomOut(multiplier);
      setTimeout(() => { zoomCooldownRef.current = false; }, multiplier === 2 ? 2000 : 1000);
    }
  }, [onStaggeredZoomIn, onStaggeredZoomOut]);
  
  const handleZoomWithCooldown = useCallback((zoomFn: (() => void) | undefined, direction: string) => {
    if (zoomCooldownRef.current || !zoomFn) return;
    zoomCooldownRef.current = true;
    console.log(`[ZOOM-${direction}] Zoom triggered, cooldown active`);
    zoomFn();
    setTimeout(() => {
      zoomCooldownRef.current = false;
    }, 400);
  }, []);
  
  const createHandler = (callback: (() => void) | undefined, label: string) => ({
    onTouchStart: (e: TouchEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`[RIGHT-BTN-${label}] 🔵 Touch started`);
      handledByPointerRef.current[label] = true;
      hapticButtonPress();
      console.log(`[RIGHT-BTN-${label}] ✅ Pressed via touchStart`);
      callback?.();
      setTimeout(() => { handledByPointerRef.current[label] = false; }, 500);
    },
    onTouchEnd: (e: TouchEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (handledByPointerRef.current[label]) {
        console.log(`[RIGHT-BTN-${label}] ⏭️ Skipped pointerDown (already handled by touch)`);
        return;
      }
      console.log(`[RIGHT-BTN-${label}] 🔵 PointerDown (${e.pointerType})`);
      handledByPointerRef.current[label] = true;
      hapticButtonPress();
      console.log(`[RIGHT-BTN-${label}] ✅ Pressed via pointerDown`);
      callback?.();
      setTimeout(() => { handledByPointerRef.current[label] = false; }, 500);
    },
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (handledByPointerRef.current[label]) {
        console.log(`[RIGHT-BTN-${label}] ⏭️ Skipped onClick (already handled)`);
        return;
      }
      console.log(`[RIGHT-BTN-${label}] 🔵 Click event`);
      hapticButtonPress();
      console.log(`[RIGHT-BTN-${label}] ✅ Pressed via onClick`);
      callback?.();
    }
  });

  return (
    <div 
      className={cn(
        "flex flex-col transition-all duration-300 transform-gpu pointer-events-auto",
        compact ? "gap-1" : "gap-1.5",
        isVisible ? "translate-x-0 opacity-100 scale-100" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
      )} 
      data-testid="right-action-stack"
      data-tour-id="right-controls"
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
        marginTop: compact ? '24px' : '0px',
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      {/* 1. Incidents - Red border (hidden when moved to top-right) */}
      {onViewIncidents && !hideIncidents && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onViewIncidents, 'INCIDENTS')}
          className={cn(buttonSize, "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-red-500 shadow-lg select-none touch-manipulation pointer-events-auto")}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-view-incidents"
        >
          <AlertCircle className={iconSize} />
        </Button>
      )}

      {/* 2. Toggle Map View - Green/Gray border */}
      {onToggleMapView && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onToggleMapView, 'MAP-VIEW')}
          className={cn(
            buttonSize, "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation pointer-events-auto",
            isSatelliteView ? "border-green-500" : "border-gray-400"
          )}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-toggle-view"
        >
          <Map className={iconSize} />
        </Button>
      )}


      {/* 3. Recenter - Gray border */}
      {onRecenter && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onRecenter, 'RECENTER')}
          className={cn(buttonSize, "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-gray-400 shadow-lg select-none touch-manipulation pointer-events-auto")}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-recenter"
        >
          <Crosshair className={iconSize} />
        </Button>
      )}

      {/* 4. Zoom In - Gray border - staggered x10 zoom in navigation mode */}
      {onZoomIn && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(
            isNavigating && onStaggeredZoomIn
              ? () => handleNavigationZoom('in')
              : () => handleZoomWithCooldown(onZoomIn, 'IN'),
            'ZOOM-IN'
          )}
          className={cn(buttonSize, "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation pointer-events-auto",
            isNavigating ? "border-blue-500" : "border-gray-400"
          )}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-zoom-in"
        >
          <Plus className={iconSize} />
        </Button>
      )}

      {/* 5. Zoom Out - Gray border - staggered x10 zoom in navigation mode */}
      {onZoomOut && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(
            isNavigating && onStaggeredZoomOut
              ? () => handleNavigationZoom('out')
              : () => handleZoomWithCooldown(onZoomOut, 'OUT'),
            'ZOOM-OUT'
          )}
          className={cn(buttonSize, "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation pointer-events-auto",
            isNavigating ? "border-blue-500" : "border-gray-400"
          )}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-zoom-out"
        >
          <Minus className={iconSize} />
        </Button>
      )}

      {/* 6. Compass - Blue border */}
      {!hideCompass && onCompassClick && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onCompassClick, 'COMPASS')}
          className={cn(buttonSize, "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-blue-500 shadow-lg select-none touch-manipulation pointer-events-auto")}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-compass-reset"
        >
          <Compass 
            className={cn(iconSize, "transition-transform duration-300")}
            style={{ transform: `rotate(${bearing}deg)` }}
          />
        </Button>
      )}

      {/* 7. 3D Toggle - Blue/Gray border */}
      {onToggle3D && !hide3D && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onToggle3D, '3D')}
          className={cn(
            buttonSize, "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation pointer-events-auto",
            is3DMode ? "border-blue-500" : "border-gray-400"
          )}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-toggle-3d"
        >
          <Box className={iconSize} />
        </Button>
      )}

      {/* 8. Traffic Toggle - Orange/Gray border */}
      {onToggleTraffic && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onToggleTraffic, 'TRAFFIC')}
          className={cn(
            buttonSize, "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation pointer-events-auto",
            showTraffic ? "border-orange-500" : "border-gray-400"
          )}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-toggle-traffic"
        >
          <Layers className={iconSize} />
        </Button>
      )}
    </div>
  );
}
