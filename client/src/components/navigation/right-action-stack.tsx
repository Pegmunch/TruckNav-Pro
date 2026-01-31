import { AlertCircle, Compass, Box, Plus, Minus, Layers, Crosshair, Map as MapIcon } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
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
// EXPORTED so MapLibre can check button bounds in its working touchend handler
export const buttonRegistry = new Map<string, ButtonRegistration>();

// Export type for MapLibre
export type { ButtonRegistration };

// Reference counter for window listener - attached when count > 0
let windowListenerRefCount = 0;
let windowTouchHandler: ((e: TouchEvent) => void) | null = null;

// CRITICAL: Uses touchstart NOT touchend - iOS Safari cancels touchend over WebGL
function handleWindowTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return; // Only single-finger taps
  
  const touch = e.touches[0];
  const x = touch.clientX;
  const y = touch.clientY;
  
  console.log(`[WINDOW-TOUCH-START-INTERCEPT] Touch at (${x}, ${y}), checking ${buttonRegistry.size} buttons`);
  
  // Check if touch landed on any registered button
  // Use large padding (25px) to compensate for iOS Safari WebGL coordinate offset
  // Logs show touches at x=324 when buttons are at x=341 - 17px offset
  for (const [id, registration] of Array.from(buttonRegistry.entries())) {
    const rect = registration.getRect();
    if (!rect) continue;
    
    // Check if touch is within button bounds with generous padding for iOS accuracy
    const padding = 25;
    if (
      x >= rect.left - padding &&
      x <= rect.right + padding &&
      y >= rect.top - padding &&
      y <= rect.bottom + padding
    ) {
      console.log(`[WINDOW-TOUCH-INTERCEPT] ✅ Touch hit button: ${id} at (${x}, ${y}), rect: (${rect.left}, ${rect.top})`);
      e.preventDefault();
      e.stopPropagation();
      hapticButtonPress();
      registration.callback();
      return; // Only trigger first matching button
    }
  }
}

// Exported so left-action-stack can also use the same listener
export function attachWindowTouchListener() {
  windowListenerRefCount++;
  if (windowListenerRefCount === 1) {
    // CRITICAL: Use touchstart NOT touchend - iOS Safari cancels touchend events over WebGL
    // touchstart fires BEFORE WebGL can intercept and block the event
    windowTouchHandler = handleWindowTouchStart;
    document.addEventListener('touchstart', windowTouchHandler, { passive: false, capture: true });
    // Also try window level as backup (like double-tap)
    window.addEventListener('touchstart', windowTouchHandler, { passive: false });
    console.log('[TOUCH-INTERCEPT] 📎 Document+Window TOUCHSTART interceptor attached (refCount: 1, capture: true)');
  } else {
    console.log(`[TOUCH-INTERCEPT] Ref count increased to ${windowListenerRefCount}`);
  }
}

// Exported so left-action-stack can also use the same listener
export function detachWindowTouchListener() {
  windowListenerRefCount--;
  if (windowListenerRefCount === 0 && windowTouchHandler) {
    document.removeEventListener('touchstart', windowTouchHandler, { capture: true });
    window.removeEventListener('touchstart', windowTouchHandler);
    windowTouchHandler = null;
    console.log('[TOUCH-INTERCEPT] 🗑️ Document+Window touch interceptor detached');
  } else if (windowListenerRefCount > 0) {
    console.log(`[TOUCH-INTERCEPT] Ref count decreased to ${windowListenerRefCount}`);
  }
}

// Hook to register a button with the window-level interceptor
function useWindowTouchInterceptor(
  ref: React.RefObject<HTMLButtonElement>,
  callback: (() => void) | undefined,
  id: string,
  isNavigating: boolean
) {
  // CRITICAL: Track mount state to re-run effect after refs are populated
  const [mounted, setMounted] = useState(false);
  
  // Force re-run after first render when refs are populated
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    // Enable window interceptor in BOTH modes for iOS Safari WebGL bug workaround
    // This ensures buttons work even when MapLibre blocks touch events
    if (!callback) {
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
      detachWindowTouchListener();
      console.log(`[WINDOW-TOUCH-REGISTER] 🗑️ Unregistered button: ${id}`);
    };
  }, [ref, callback, id, isNavigating, mounted]);
}

// Standard native event handler - uses TOUCHSTART (not touchend) for iOS Safari
// iOS Safari cancels touchend events over WebGL canvases
function useNativeClickHandler(
  ref: React.RefObject<HTMLButtonElement>,
  callback: (() => void) | undefined,
  label: string,
  isNavigating: boolean
) {
  // Debounce ref to prevent double-firing
  const lastTouchRef = useRef(0);
  // CRITICAL: Track mount state to re-run effect after refs are populated
  const [mounted, setMounted] = useState(false);
  
  // Force re-run after first render when refs are populated
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    const button = ref.current;
    if (!button || !callback) return;
    
    const mode = isNavigating ? 'NAV' : 'PREVIEW';
    
    // CRITICAL: Fire on touchstart - fires BEFORE WebGL can cancel the event
    const handleTouchStart = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchRef.current < 300) {
        console.log(`[NATIVE-${label}-${mode}] ⏳ TouchStart debounced`);
        return; // Debounce
      }
      lastTouchRef.current = now;
      
      e.preventDefault();
      e.stopPropagation();
      console.log(`[NATIVE-${label}-${mode}] ✅ TouchStart fired - CALLING CALLBACK`);
      hapticButtonPress();
      callback();
    };
    
    const handlePointerDown = (e: PointerEvent) => {
      // Only handle mouse events here - touch is handled by touchstart
      if (e.pointerType === 'mouse') {
        e.preventDefault();
        e.stopPropagation();
        console.log(`[NATIVE-${label}-${mode}] ✅ PointerDown (mouse) - CALLING CALLBACK`);
        hapticButtonPress();
        callback();
      }
    };
    
    const handleClick = (e: MouseEvent) => {
      // Fallback for desktop
      e.preventDefault();
      e.stopPropagation();
      console.log(`[NATIVE-${label}-${mode}] ✅ Click fired - CALLING CALLBACK`);
      hapticButtonPress();
      callback();
    };
    
    // CRITICAL: Use touchstart with passive:false to preventDefault
    button.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
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
      button.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      button.removeEventListener('click', handleClick, { capture: true });
    };
  }, [ref, callback, label, isNavigating, mounted]);
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
  
  // Debounce refs to prevent double-firing from multiple event handlers
  const last3DToggleRef = useRef(0);
  const lastTrafficToggleRef = useRef(0);
  const TOGGLE_DEBOUNCE = 300; // ms
  
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
  
  // CRITICAL: Stable callback wrapper for iOS touch proxy - always defined
  const stableViewIncidentsCallback = useCallback(() => {
    if (onViewIncidents && !hideIncidents) {
      console.log('[RIGHT-STACK] 🔴 Stable incidents callback fired');
      onViewIncidents();
    }
  }, [onViewIncidents, hideIncidents]);
  
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
  // DIRECT MANUAL REGISTRATION for incidents-btn - bypasses problematic hook
  // The useWindowTouchInterceptor hook's effect doesn't run for incidents-btn
  // for unknown reasons. This direct registration ensures the button works.
  // ============================================================================
  useEffect(() => {
    console.log('[INCIDENTS-DIRECT] Manual registration effect running');
    if (!stableViewIncidentsCallback) {
      console.log('[INCIDENTS-DIRECT] ❌ No callback - skipping');
      return;
    }
    
    attachWindowTouchListener();
    
    buttonRegistry.set('incidents-btn', {
      id: 'incidents-btn',
      getRect: () => incidentsButtonRef.current?.getBoundingClientRect() || null,
      callback: stableViewIncidentsCallback
    });
    
    console.log('[INCIDENTS-DIRECT] ✅ Registered incidents-btn directly');
    
    return () => {
      buttonRegistry.delete('incidents-btn');
      detachWindowTouchListener();
      console.log('[INCIDENTS-DIRECT] 🗑️ Unregistered incidents-btn');
    };
  }, [stableViewIncidentsCallback]);
  
  // ============================================================================
  // WINDOW-LEVEL TOUCH INTERCEPTOR - Critical fix for iOS Safari WebGL bug
  // This uses the same pattern as the working double-tap feature
  // Window-level listeners receive ALL touches regardless of WebGL canvas blocking
  // ============================================================================
  // Note: incidents-btn is registered directly above, not through this hook
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
      {/* 1. Incidents - Red border - ALWAYS rendered for iOS touch proxy registration */}
      <Button
        ref={incidentsButtonRef}
        variant="ghost"
        size="icon"
        onTouchStart={(e) => {
          if (!onViewIncidents || hideIncidents) return;
          e.preventDefault();
          e.stopPropagation();
          console.log('[INCIDENTS-BTN] 🔴 View Incidents TOUCHSTART');
          onViewIncidents();
        }}
        onPointerDown={(e) => {
          if (!onViewIncidents || hideIncidents) return;
          if (e.pointerType === 'mouse') {
            e.preventDefault();
            console.log('[INCIDENTS-BTN] 🔴 View Incidents POINTERDOWN (mouse)');
            onViewIncidents();
          }
        }}
        className={cn(
          buttonSize, 
          "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 border-red-500 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
          onViewIncidents && !hideIncidents && isVisible 
            ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" 
            : "translate-x-20 opacity-0 scale-95 pointer-events-none"
        )}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        data-testid="button-view-incidents"
      >
        <AlertCircle className={iconSize} />
      </Button>

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

      {/* 7. 3D Toggle - Blue/Gray border - cycles: tilted → overhead → normal */}
      {/* Uses INLINE handlers with debouncing to prevent double-firing */}
      {onToggle3D && !hide3D && (
        <Button
          ref={toggle3DButtonRef}
          variant="ghost"
          size="icon"
          onTouchStart={(e) => {
            if (!onToggle3D) return;
            const now = Date.now();
            if (now - last3DToggleRef.current < TOGGLE_DEBOUNCE) return;
            last3DToggleRef.current = now;
            e.preventDefault();
            e.stopPropagation();
            console.log('[3D-BTN] 🔵 3D Toggle TOUCHSTART - calling callback');
            hapticButtonPress();
            onToggle3D();
          }}
          onPointerDown={(e) => {
            if (!onToggle3D) return;
            if (e.pointerType === 'mouse') {
              const now = Date.now();
              if (now - last3DToggleRef.current < TOGGLE_DEBOUNCE) return;
              last3DToggleRef.current = now;
              e.preventDefault();
              console.log('[3D-BTN] 🔵 3D Toggle POINTERDOWN (mouse) - calling callback');
              hapticButtonPress();
              onToggle3D();
            }
          }}
          onClick={(e) => {
            // Skip onClick if already handled by touchstart/pointerdown
            const now = Date.now();
            if (now - last3DToggleRef.current < TOGGLE_DEBOUNCE) return;
          }}
          className={cn(
            buttonSize, 
            "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu",
            is3DMode ? "border-blue-500" : "border-gray-400",
            isVisible ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "translate-x-20 opacity-0 scale-95 pointer-events-none"
          )}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          data-testid="button-toggle-3d"
        >
          <Box className={iconSize} />
        </Button>
      )}

      {/* 8. Traffic Toggle - Orange/Gray border - toggles traffic layer visibility */}
      {/* Uses INLINE handlers with debouncing to prevent double-firing */}
      {onToggleTraffic && (
        <Button
          ref={trafficButtonRef}
          variant="ghost"
          size="icon"
          onTouchStart={(e) => {
            if (!onToggleTraffic) return;
            const now = Date.now();
            if (now - lastTrafficToggleRef.current < TOGGLE_DEBOUNCE) return;
            lastTrafficToggleRef.current = now;
            e.preventDefault();
            e.stopPropagation();
            console.log('[TRAFFIC-BTN] 🟠 Traffic Toggle TOUCHSTART - calling callback');
            hapticButtonPress();
            onToggleTraffic();
          }}
          onPointerDown={(e) => {
            if (!onToggleTraffic) return;
            if (e.pointerType === 'mouse') {
              const now = Date.now();
              if (now - lastTrafficToggleRef.current < TOGGLE_DEBOUNCE) return;
              lastTrafficToggleRef.current = now;
              e.preventDefault();
              console.log('[TRAFFIC-BTN] 🟠 Traffic Toggle POINTERDOWN (mouse) - calling callback');
              hapticButtonPress();
              onToggleTraffic();
            }
          }}
          onClick={(e) => {
            // Skip onClick if already handled by touchstart/pointerdown
            const now = Date.now();
            if (now - lastTrafficToggleRef.current < TOGGLE_DEBOUNCE) return;
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
