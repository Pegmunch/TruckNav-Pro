import { AlertCircle, Compass, Box, Plus, Minus, Layers, Crosshair, Map as MapIcon } from 'lucide-react';
import { useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hapticButtonPress } from '@/hooks/use-haptic-feedback';

// ============================================================================
// WINDOW-LEVEL TOUCH INTERCEPTOR (Same pattern as working double-tap feature)
// ============================================================================
// iOS Safari WebGL bug blocks touch events from reaching DOM elements above canvas.
// The double-tap feature works because it uses window-level listeners.
// This registry allows buttons to register their bounds and callbacks,
// then a single window-level listener intercepts touches and triggers callbacks.
// ============================================================================

interface ButtonRegistration {
  id: string;
  getRect: () => DOMRect | null;
  callback: () => void;
}

// Global registry of buttons that need window-level touch handling
const buttonRegistry = new Map<string, ButtonRegistration>();

// Single window-level touchend listener (like double-tap feature)
let windowListenerAttached = false;

function attachWindowTouchListener() {
  if (windowListenerAttached) return;
  
  const handleWindowTouchEnd = (e: TouchEvent) => {
    if (e.changedTouches.length !== 1) return; // Only single-finger taps
    
    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    
    // Check if touch landed on any registered button
    for (const [id, registration] of buttonRegistry) {
      const rect = registration.getRect();
      if (!rect) continue;
      
      // Check if touch is within button bounds (with small padding for touch accuracy)
      const padding = 5;
      if (
        x >= rect.left - padding &&
        x <= rect.right + padding &&
        y >= rect.top - padding &&
        y <= rect.bottom + padding
      ) {
        console.log(`[WINDOW-TOUCH-INTERCEPT] ✅ Touch hit button: ${id} at (${x}, ${y})`);
        e.preventDefault();
        e.stopPropagation();
        hapticButtonPress();
        registration.callback();
        return; // Only trigger first matching button
      }
    }
  };
  
  // Use window.addEventListener like the working double-tap feature
  window.addEventListener('touchend', handleWindowTouchEnd, { passive: false, capture: true });
  windowListenerAttached = true;
  console.log('[WINDOW-TOUCH-INTERCEPT] 📎 Window-level touch interceptor attached');
}

// Hook to register a button with the window-level interceptor
function useWindowTouchInterceptor(
  ref: React.RefObject<HTMLButtonElement>,
  callback: (() => void) | undefined,
  id: string,
  isNavigating: boolean
) {
  useEffect(() => {
    // Only use window interceptor in navigation mode (where iOS Safari bug occurs)
    if (!isNavigating || !callback) {
      buttonRegistry.delete(id);
      return;
    }
    
    // Attach the global listener if not already attached
    attachWindowTouchListener();
    
    // Register this button
    buttonRegistry.set(id, {
      id,
      getRect: () => ref.current?.getBoundingClientRect() || null,
      callback
    });
    
    console.log(`[WINDOW-TOUCH-REGISTER] 📎 Registered button: ${id}`);
    
    return () => {
      buttonRegistry.delete(id);
      console.log(`[WINDOW-TOUCH-REGISTER] 🗑️ Unregistered button: ${id}`);
    };
  }, [ref, callback, id, isNavigating]);
}

// Standard native event handler - uses touchend and click for consistent behavior
function useNativeClickHandler(
  ref: React.RefObject<HTMLButtonElement>,
  callback: (() => void) | undefined,
  label: string,
  isNavigating: boolean
) {
  useEffect(() => {
    const button = ref.current;
    if (!button || !callback) return;
    
    const mode = isNavigating ? 'NAV' : 'PREVIEW';
    
    const handleTouchStart = (e: TouchEvent) => {
      console.log(`[NATIVE-${label}-${mode}] 🔵 TouchStart - event received`);
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`[NATIVE-${label}-${mode}] ✅ TouchEnd fired - CALLING CALLBACK`);
      hapticButtonPress();
      callback();
    };
    
    const handlePointerDown = (e: PointerEvent) => {
      console.log(`[NATIVE-${label}-${mode}] 👆 PointerDown - type:`, e.pointerType);
      if (e.pointerType === 'touch' || e.pointerType === 'mouse') {
        e.preventDefault();
        e.stopPropagation();
        console.log(`[NATIVE-${label}-${mode}] ✅ PointerDown - CALLING CALLBACK`);
        hapticButtonPress();
        callback();
      }
    };
    
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`[NATIVE-${label}-${mode}] ✅ Click fired - CALLING CALLBACK`);
      hapticButtonPress();
      callback();
    };
    
    // Attach ALL event types in capture phase
    button.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    button.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    button.addEventListener('pointerdown', handlePointerDown, { capture: true });
    button.addEventListener('click', handleClick, { capture: true });
    
    // Log button position and computed styles
    const rect = button.getBoundingClientRect();
    const styles = window.getComputedStyle(button);
    console.log(`[NATIVE-${label}-${mode}] 📎 Listeners attached. Button info:`, {
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      pointerEvents: styles.pointerEvents,
      zIndex: styles.zIndex,
      visibility: styles.visibility,
      opacity: styles.opacity,
      display: styles.display
    });
    
    return () => {
      button.removeEventListener('touchstart', handleTouchStart, { capture: true });
      button.removeEventListener('touchend', handleTouchEnd, { capture: true });
      button.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      button.removeEventListener('click', handleClick, { capture: true });
    };
  }, [ref, callback, label, isNavigating]);
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
  useNativeClickHandler(incidentsButtonRef, onViewIncidents, 'INCIDENTS', isNavigating);
  useNativeClickHandler(trafficButtonRef, onToggleTraffic, 'TRAFFIC', isNavigating);
  useNativeClickHandler(mapViewButtonRef, onToggleMapView, 'MAP-VIEW', isNavigating);
  useNativeClickHandler(recenterButtonRef, onRecenter, 'RECENTER', isNavigating);
  useNativeClickHandler(compassButtonRef, onCompassClick, 'COMPASS', isNavigating);
  useNativeClickHandler(toggle3DButtonRef, onToggle3D, '3D-TOGGLE', isNavigating);
  useNativeClickHandler(zoomInButtonRef, zoomInHandler, 'ZOOM-IN', isNavigating);
  useNativeClickHandler(zoomOutButtonRef, zoomOutHandler, 'ZOOM-OUT', isNavigating);
  
  // ============================================================================
  // WINDOW-LEVEL TOUCH INTERCEPTOR - Critical fix for iOS Safari WebGL bug
  // This uses the same pattern as the working double-tap feature
  // Window-level listeners receive ALL touches regardless of WebGL canvas blocking
  // ============================================================================
  useWindowTouchInterceptor(incidentsButtonRef, onViewIncidents, 'incidents-btn', isNavigating);
  useWindowTouchInterceptor(trafficButtonRef, onToggleTraffic, 'traffic-btn', isNavigating);
  useWindowTouchInterceptor(mapViewButtonRef, onToggleMapView, 'map-view-btn', isNavigating);
  useWindowTouchInterceptor(recenterButtonRef, onRecenter, 'recenter-btn', isNavigating);
  useWindowTouchInterceptor(compassButtonRef, onCompassClick, 'compass-btn', isNavigating);
  useWindowTouchInterceptor(toggle3DButtonRef, onToggle3D, '3d-toggle-btn', isNavigating);
  useWindowTouchInterceptor(zoomInButtonRef, zoomInHandler, 'zoom-in-btn', isNavigating);
  useWindowTouchInterceptor(zoomOutButtonRef, zoomOutHandler, 'zoom-out-btn', isNavigating);
  
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
      {/* FIXED: Added direct onClick AND onTouchEnd for iOS Safari compatibility */}
      {onViewIncidents && !hideIncidents && (
        <Button
          ref={incidentsButtonRef}
          variant="ghost"
          size="icon"
          onPointerDown={(e) => {
            // iOS Safari fix: Fire on pointer DOWN not up/end
            // This fires immediately when finger touches screen
            if (e.pointerType === 'touch' || e.pointerType === 'mouse') {
              e.preventDefault();
              e.stopPropagation();
              console.log('[INCIDENTS-BTN] ✅ PointerDown fired');
              hapticButtonPress();
              onViewIncidents();
            }
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[INCIDENTS-BTN] ✅ onClick fired');
            hapticButtonPress();
            onViewIncidents();
          }}
          className={cn(
            buttonSize, 
            "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-red-500 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
            isVisible ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
          )}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
          <MapIcon className={iconSize} />
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
      {/* FIXED: Added direct onClick AND onTouchEnd for iOS Safari compatibility */}
      {onToggleTraffic && (
        <Button
          ref={trafficButtonRef}
          variant="ghost"
          size="icon"
          onPointerDown={(e) => {
            // iOS Safari fix: Fire on pointer DOWN not up/end
            if (e.pointerType === 'touch' || e.pointerType === 'mouse') {
              e.preventDefault();
              e.stopPropagation();
              console.log('[TRAFFIC-BTN] ✅ PointerDown fired');
              hapticButtonPress();
              onToggleTraffic();
            }
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[TRAFFIC-BTN] ✅ onClick fired');
            hapticButtonPress();
            onToggleTraffic();
          }}
          className={cn(
            buttonSize, 
            "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
            showTraffic ? "border-orange-500" : "border-gray-400",
            isVisible ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
          )}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          data-testid="button-toggle-traffic"
        >
          <Layers className={iconSize} />
        </Button>
      )}
    </div>
  );
}
