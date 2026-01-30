import { AlertCircle, Compass, Box, Plus, Minus, Layers, Crosshair, Map } from 'lucide-react';
import { useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hapticButtonPress } from '@/hooks/use-haptic-feedback';

// Standard native event handler - uses touchend and click for consistent behavior
// Now that buttons are rendered with direct fixed positioning (not through NavigationLayout),
// standard event handling should work reliably on iOS Safari
function useNativeClickHandler(
  ref: React.RefObject<HTMLButtonElement>,
  callback: (() => void) | undefined,
  label: string
) {
  useEffect(() => {
    const button = ref.current;
    if (!button || !callback) return;
    
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`[NATIVE-${label}] ✅ TouchEnd fired`);
      hapticButtonPress();
      callback();
    };
    
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`[NATIVE-${label}] ✅ Click fired`);
      hapticButtonPress();
      callback();
    };
    
    // Use capture phase to get events before any other handlers
    button.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    button.addEventListener('click', handleClick, { capture: true });
    
    console.log(`[NATIVE-${label}] 📎 Listeners attached`);
    
    return () => {
      button.removeEventListener('touchend', handleTouchEnd, { capture: true });
      button.removeEventListener('click', handleClick, { capture: true });
    };
  }, [ref, callback, label]);
}

interface RightActionStackProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onStaggeredZoomIn?: () => void;
  onStaggeredZoomOut?: () => void;
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
  const zoomCooldownRef = useRef<boolean>(false);
  
  // Refs for buttons that need native event listeners (iOS Safari fix)
  const incidentsButtonRef = useRef<HTMLButtonElement>(null);
  const trafficButtonRef = useRef<HTMLButtonElement>(null);
  const mapViewButtonRef = useRef<HTMLButtonElement>(null);
  const recenterButtonRef = useRef<HTMLButtonElement>(null);
  const zoomInButtonRef = useRef<HTMLButtonElement>(null);
  const zoomOutButtonRef = useRef<HTMLButtonElement>(null);
  const compassButtonRef = useRef<HTMLButtonElement>(null);
  const toggle3DButtonRef = useRef<HTMLButtonElement>(null);
  
  // Double-tap detection for x2 zoom multiplier during navigation
  const lastZoomTapRef = useRef<{ direction: 'in' | 'out'; time: number } | null>(null);
  const DOUBLE_TAP_THRESHOLD = 300; // ms
  
  // Define helper functions FIRST (before they're used in handlers)
  const handleNavigationZoom = useCallback((direction: 'in' | 'out') => {
    if (zoomCooldownRef.current) return;
    
    console.log(`[NAV-ZOOM-${direction.toUpperCase()}] x2 staggered zoom triggered`);
    
    // Trigger staggered zoom (x2 per press, max 5 presses = x10 total)
    if (direction === 'in' && onStaggeredZoomIn) {
      zoomCooldownRef.current = true;
      onStaggeredZoomIn();
      // Short cooldown - allows rapid presses for cumulative zoom
      setTimeout(() => { zoomCooldownRef.current = false; }, 400);
    } else if (direction === 'out' && onStaggeredZoomOut) {
      zoomCooldownRef.current = true;
      onStaggeredZoomOut();
      setTimeout(() => { zoomCooldownRef.current = false; }, 400);
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
  
  // Zoom handlers with cooldown - wrapped for native listeners
  const zoomInHandler = useCallback(() => {
    if (isNavigating && onStaggeredZoomIn) {
      handleNavigationZoom('in');
    } else if (onZoomIn) {
      handleZoomWithCooldown(onZoomIn, 'IN');
    }
  }, [isNavigating, onStaggeredZoomIn, onZoomIn, handleNavigationZoom, handleZoomWithCooldown]);
  
  const zoomOutHandler = useCallback(() => {
    if (isNavigating && onStaggeredZoomOut) {
      handleNavigationZoom('out');
    } else if (onZoomOut) {
      handleZoomWithCooldown(onZoomOut, 'OUT');
    }
  }, [isNavigating, onStaggeredZoomOut, onZoomOut, handleNavigationZoom, handleZoomWithCooldown]);
  
  // Use native event listeners for ALL buttons to bypass React's synthetic event delegation
  // iOS Safari has issues with React's event delegation on fixed/transformed elements
  useNativeClickHandler(incidentsButtonRef, onViewIncidents, 'INCIDENTS');
  useNativeClickHandler(trafficButtonRef, onToggleTraffic, 'TRAFFIC');
  useNativeClickHandler(mapViewButtonRef, onToggleMapView, 'MAP-VIEW');
  useNativeClickHandler(recenterButtonRef, onRecenter, 'RECENTER');
  useNativeClickHandler(compassButtonRef, onCompassClick, 'COMPASS');
  useNativeClickHandler(toggle3DButtonRef, onToggle3D, '3D-TOGGLE');
  useNativeClickHandler(zoomInButtonRef, zoomInHandler, 'ZOOM-IN');
  useNativeClickHandler(zoomOutButtonRef, zoomOutHandler, 'ZOOM-OUT');
  
  // iOS Safari optimized handler - uses onClick, onTouchEnd AND onPointerUp for maximum reliability
  // iOS Safari sometimes blocks onTouchEnd on fixed elements with transforms
  const createHandler = (callback: (() => void) | undefined, label: string) => ({
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`[RIGHT-BTN-${label}] ✅ Click event`);
      hapticButtonPress();
      callback?.();
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`[RIGHT-BTN-${label}] ✅ TouchEnd event`);
      hapticButtonPress();
      callback?.();
    },
    onTouchStart: (e: React.TouchEvent) => {
      // Mark this element as being touched - helps iOS Safari recognize the tap
      console.log(`[RIGHT-BTN-${label}] TouchStart`);
      e.currentTarget.classList.add('touching');
    },
    onPointerUp: (e: React.PointerEvent) => {
      // Fallback for iOS Safari - pointer events are more reliable than touch events
      if (e.pointerType === 'touch') {
        console.log(`[RIGHT-BTN-${label}] ✅ PointerUp event (touch)`);
        e.preventDefault();
        hapticButtonPress();
        callback?.();
      }
    }
  });

  return (
    <div 
      className={cn(
        "flex flex-col transition-all duration-300 transform-gpu pointer-events-auto",
        compact ? "gap-1" : "gap-1.5"
      )} 
      data-testid="right-action-stack"
      data-tour-id="right-controls"
      style={{
        marginTop: compact ? '24px' : '0px',
        pointerEvents: 'auto'
      }}
    >
      {/* 1. Incidents - Red border - hides/shows with double-tap */}
      {/* FIXED: Added direct onClick for iOS Safari compatibility - matches preview mode approach */}
      {onViewIncidents && !hideIncidents && (
        <Button
          ref={incidentsButtonRef}
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[INCIDENTS-BTN] ✅ Direct onClick fired');
            hapticButtonPress();
            onViewIncidents();
          }}
          className={cn(
            buttonSize, 
            "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-red-500 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
            isVisible ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
          )}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-view-incidents"
        >
          <AlertCircle className={iconSize} />
        </Button>
      )}

      {/* 2. Toggle Map View - Green/Gray border - hides/shows with double-tap */}
      {onToggleMapView && (
        <Button
          ref={mapViewButtonRef}
          variant="ghost"
          size="icon"
          className={cn(
            buttonSize, 
            "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
            isSatelliteView ? "border-green-500" : "border-gray-400",
            isVisible ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
          )}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-toggle-view"
        >
          <Map className={iconSize} />
        </Button>
      )}


      {/* 3. Recenter - Gray border - hides/shows with double-tap */}
      {onRecenter && (
        <Button
          ref={recenterButtonRef}
          variant="ghost"
          size="icon"
          className={cn(
            buttonSize, 
            "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-gray-400 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
            isVisible ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
          )}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-recenter"
        >
          <Crosshair className={iconSize} />
        </Button>
      )}

      {/* 4. Zoom In - Blue border during navigation - hides/shows with double-tap */}
      {onZoomIn && (
        <Button
          ref={zoomInButtonRef}
          variant="ghost"
          size="icon"
          className={cn(buttonSize, "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
            isNavigating ? "border-blue-500" : "border-gray-400",
            isVisible ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
          )}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-zoom-in"
        >
          <Plus className={iconSize} />
        </Button>
      )}

      {/* 5. Zoom Out - Blue border during navigation - hides/shows with double-tap */}
      {onZoomOut && (
        <Button
          ref={zoomOutButtonRef}
          variant="ghost"
          size="icon"
          className={cn(buttonSize, "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
            isNavigating ? "border-blue-500" : "border-gray-400",
            isVisible ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
          )}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-zoom-out"
        >
          <Minus className={iconSize} />
        </Button>
      )}

      {/* 6. Compass - Blue border - hides/shows with double-tap */}
      {!hideCompass && onCompassClick && (
        <Button
          ref={compassButtonRef}
          variant="ghost"
          size="icon"
          className={cn(
            buttonSize, 
            "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-blue-500 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
            isVisible ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
          )}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-compass-reset"
        >
          <Compass 
            className={cn(iconSize, "transition-transform duration-300")}
            style={{ transform: `rotate(${bearing}deg)` }}
          />
        </Button>
      )}

      {/* 7. 3D Toggle - Blue/Gray border - hides/shows with double-tap */}
      {onToggle3D && !hide3D && (
        <Button
          ref={toggle3DButtonRef}
          variant="ghost"
          size="icon"
          className={cn(
            buttonSize, 
            "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
            is3DMode ? "border-blue-500" : "border-gray-400",
            isVisible ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
          )}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-toggle-3d"
        >
          <Box className={iconSize} />
        </Button>
      )}

      {/* 8. Traffic Toggle - Orange/Gray border - hides/shows with double-tap */}
      {/* FIXED: Added direct onClick for iOS Safari compatibility - matches preview mode approach */}
      {onToggleTraffic && (
        <Button
          ref={trafficButtonRef}
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[TRAFFIC-BTN] ✅ Direct onClick fired');
            hapticButtonPress();
            onToggleTraffic();
          }}
          className={cn(
            buttonSize, 
            "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
            showTraffic ? "border-orange-500" : "border-gray-400",
            isVisible ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
          )}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-toggle-traffic"
        >
          <Layers className={iconSize} />
        </Button>
      )}
    </div>
  );
}
