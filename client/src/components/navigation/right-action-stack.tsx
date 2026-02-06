import { AlertCircle, Compass, Box, Plus, Minus, Layers, Crosshair, Map as MapIcon } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hapticButtonPress } from '@/hooks/use-haptic-feedback';

// ============================================================================
// UNIFIED TOUCH HANDLING SYSTEM FOR iOS SAFARI WEBGL BUG
// ============================================================================
// iOS Safari blocks touch events from reaching DOM elements over WebGL canvas.
// This system provides three layers of touch handling:
// 1. Window-level touch interception (primary - works over WebGL on iOS Safari)
// 2. Native DOM touchstart listeners (secondary - direct element touch)
// 3. React onClick for keyboard accessibility and desktop mouse
// All handlers share a debounce timestamp per button to prevent double-firing.
// ============================================================================

interface ButtonRegistration {
  id: string;
  getRect: () => DOMRect | null;
  callback: () => void;
  lastFired: number;
  isVisible: boolean;
  touchPadding?: number;
}

// Global registry of buttons - shared across all touch handling layers
export const buttonRegistry = new Map<string, ButtonRegistration>();
export type { ButtonRegistration };

// Debounce threshold - reduced to 100ms for faster response
const FIRE_DEBOUNCE = 100;

// Global debounce tracker (backup for handlers outside registry)
const globalDebounce = new Map<string, number>();

// Check if a button can fire (not debounced)
function canButtonFire(id: string): boolean {
  const reg = buttonRegistry.get(id);
  const lastFired = reg?.lastFired || globalDebounce.get(id) || 0;
  return Date.now() - lastFired > FIRE_DEBOUNCE;
}

// Mark button as fired in both registry and global tracker
function markButtonFired(id: string): void {
  const now = Date.now();
  const reg = buttonRegistry.get(id);
  if (reg) {
    reg.lastFired = now;
  }
  globalDebounce.set(id, now);
}

// Reference counter for window listener
let windowListenerRefCount = 0;
let windowTouchHandler: ((e: TouchEvent) => void) | null = null;
let windowPointerHandler: ((e: PointerEvent) => void) | null = null;

// Shared hit-test logic for both touch and pointer events
function findClosestButton(x: number, y: number): { id: string; registration: ButtonRegistration; distance: number } | null {
  let closestButton: { id: string; registration: ButtonRegistration; distance: number } | null = null;
  const defaultPadding = 16;
  
  for (const [id, registration] of Array.from(buttonRegistry.entries())) {
    if (!registration.isVisible) continue;
    
    const rect = registration.getRect();
    if (!rect || rect.width === 0 || rect.height === 0) continue;
    
    const padding = registration.touchPadding ?? defaultPadding;
    
    if (
      x >= rect.left - padding &&
      x <= rect.right + padding &&
      y >= rect.top - padding &&
      y <= rect.bottom + padding
    ) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      
      if (!closestButton || distance < closestButton.distance) {
        closestButton = { id, registration, distance };
      }
    }
  }
  
  return closestButton;
}

function fireClosestButton(x: number, y: number, e: Event, source: string): boolean {
  const closestButton = findClosestButton(x, y);
  if (!closestButton) return false;
  
  const { id, registration } = closestButton;
  if (!canButtonFire(id)) return false;
  
  console.log(`[TOUCH-UNIFIED] ✅ ${source} hit: ${id}`);
  e.preventDefault();
  e.stopPropagation();
  markButtonFired(id);
  hapticButtonPress();
  registration.callback();
  return true;
}

// Window-level touch handler - catches ALL touches including over WebGL
function handleWindowTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return;
  fireClosestButton(e.touches[0].clientX, e.touches[0].clientY, e, 'touch');
}

// Window-level pointer handler - CRITICAL for iOS Safari where touch events
// are blocked by WebGL canvas but pointer events still fire
function handleWindowPointerDown(e: PointerEvent) {
  if (e.pointerType !== 'touch') return;
  fireClosestButton(e.clientX, e.clientY, e, 'pointer');
}

export function attachWindowTouchListener() {
  windowListenerRefCount++;
  if (windowListenerRefCount === 1) {
    windowTouchHandler = handleWindowTouchStart;
    windowPointerHandler = handleWindowPointerDown;
    document.addEventListener('touchstart', windowTouchHandler, { passive: false, capture: true });
    window.addEventListener('touchstart', windowTouchHandler, { passive: false });
    document.addEventListener('pointerdown', windowPointerHandler, { capture: true });
    window.addEventListener('pointerdown', windowPointerHandler, { passive: false });
    console.log('[TOUCH-UNIFIED] 📎 Window touch+pointer listeners attached');
  }
}

export function detachWindowTouchListener() {
  windowListenerRefCount--;
  if (windowListenerRefCount === 0) {
    if (windowTouchHandler) {
      document.removeEventListener('touchstart', windowTouchHandler, { capture: true });
      window.removeEventListener('touchstart', windowTouchHandler);
      windowTouchHandler = null;
    }
    if (windowPointerHandler) {
      document.removeEventListener('pointerdown', windowPointerHandler, { capture: true });
      window.removeEventListener('pointerdown', windowPointerHandler);
      windowPointerHandler = null;
    }
    console.log('[TOUCH-UNIFIED] 🗑️ Window listeners detached');
  }
}

// Unified hook that registers a button with ALL touch handling layers
function useUnifiedTouchHandler(
  ref: React.RefObject<HTMLButtonElement>,
  callback: (() => void) | undefined,
  id: string,
  isVisible: boolean = true,
  touchPadding?: number
) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    // Only register if visible and has callback
    if (!callback || !mounted || !isVisible) {
      buttonRegistry.delete(id);
      return;
    }
    
    // Attach window listener
    attachWindowTouchListener();
    
    // Register button with callback and visibility
    buttonRegistry.set(id, {
      id,
      getRect: () => ref.current?.getBoundingClientRect() || null,
      callback,
      lastFired: globalDebounce.get(id) || 0,
      isVisible,
      touchPadding
    });
    
    // Also attach direct DOM listeners as backup
    const button = ref.current;
    if (button) {
      const handleDirectTouch = (e: TouchEvent) => {
        if (!canButtonFire(id)) return;
        e.preventDefault();
        e.stopPropagation();
        console.log(`[TOUCH-DIRECT] ✅ Direct touch: ${id}`);
        markButtonFired(id);
        hapticButtonPress();
        callback();
      };
      
      const handleDirectPointer = (e: PointerEvent) => {
        if (e.pointerType !== 'touch') return;
        if (!canButtonFire(id)) return;
        e.preventDefault();
        e.stopPropagation();
        console.log(`[TOUCH-DIRECT] ✅ Direct pointer: ${id}`);
        markButtonFired(id);
        hapticButtonPress();
        callback();
      };
      
      button.addEventListener('touchstart', handleDirectTouch, { passive: false, capture: true });
      button.addEventListener('pointerdown', handleDirectPointer, { passive: false, capture: true });
      
      return () => {
        button.removeEventListener('touchstart', handleDirectTouch, { capture: true });
        button.removeEventListener('pointerdown', handleDirectPointer, { capture: true });
        buttonRegistry.delete(id);
        detachWindowTouchListener();
      };
    }
    
    return () => {
      buttonRegistry.delete(id);
      detachWindowTouchListener();
    };
  }, [ref, callback, id, mounted, isVisible, touchPadding]);
  
  // Return handlers for React events
  // onTouchStart fires IMMEDIATELY on touch (most reliable for iOS)
  // onClick preserves keyboard accessibility (Enter/Space keys)
  // onPointerDown handles mouse clicks with debounce
  return {
    onTouchStart: useCallback((e: React.TouchEvent) => {
      if (!callback) return;
      if (!canButtonFire(id)) return;
      
      e.preventDefault();
      e.stopPropagation();
      console.log(`[TOUCH-REACT] ✅ TouchStart: ${id}`);
      markButtonFired(id);
      hapticButtonPress();
      callback();
    }, [callback, id]),
    
    onClick: useCallback((e: React.MouseEvent) => {
      if (!callback) return;
      // Allow keyboard activation without debounce check (accessibility)
      // For mouse/touch, check debounce
      if (e.detail > 0 && !canButtonFire(id)) return;
      
      console.log(`[TOUCH-REACT] ✅ Click: ${id} (detail=${e.detail})`);
      markButtonFired(id);
      hapticButtonPress();
      callback();
    }, [callback, id]),
    
    onPointerDown: useCallback((e: React.PointerEvent) => {
      if (!callback) return;
      if (!canButtonFire(id)) return;
      
      e.preventDefault();
      console.log(`[TOUCH-REACT] ✅ PointerDown (${e.pointerType}): ${id}`);
      markButtonFired(id);
      hapticButtonPress();
      callback();
    }, [callback, id])
  };
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
  const buttonSize = compact ? "h-9 w-9 min-h-[36px] min-w-[36px]" : "h-11 w-11 min-h-[44px] min-w-[44px]";
  const iconSize = compact ? "h-4 w-4" : "h-5 w-5";
  
  // Zoom cooldown to prevent excessive rapid zooming
  const zoomCooldownRef = useRef<boolean>(false);
  const ZOOM_COOLDOWN_MS = 400;
  
  // Refs for all buttons
  const incidentsRef = useRef<HTMLButtonElement>(null);
  const mapViewRef = useRef<HTMLButtonElement>(null);
  const recenterRef = useRef<HTMLButtonElement>(null);
  const zoomInRef = useRef<HTMLButtonElement>(null);
  const zoomOutRef = useRef<HTMLButtonElement>(null);
  const compassRef = useRef<HTMLButtonElement>(null);
  const toggle3DRef = useRef<HTMLButtonElement>(null);
  const trafficRef = useRef<HTMLButtonElement>(null);
  
  // Zoom handlers with cooldown and navigation mode support
  const zoomInHandler = useCallback(() => {
    console.log('[BUTTON-CALLBACK] ➕ ZoomIn callback invoked');
    if (zoomCooldownRef.current) return;
    zoomCooldownRef.current = true;
    
    if (isNavigating && onStaggeredZoomIn) {
      console.log('[ZOOM-IN] Staggered navigation zoom');
      onStaggeredZoomIn();
    } else if (onZoomIn) {
      console.log('[ZOOM-IN] Standard zoom');
      onZoomIn();
    }
    
    setTimeout(() => { zoomCooldownRef.current = false; }, ZOOM_COOLDOWN_MS);
  }, [isNavigating, onStaggeredZoomIn, onZoomIn]);
  
  const zoomOutHandler = useCallback(() => {
    console.log('[BUTTON-CALLBACK] ➖ ZoomOut callback invoked');
    if (zoomCooldownRef.current) return;
    zoomCooldownRef.current = true;
    
    if (isNavigating && onStaggeredZoomOut) {
      console.log('[ZOOM-OUT] Staggered navigation zoom');
      onStaggeredZoomOut();
    } else if (onZoomOut) {
      console.log('[ZOOM-OUT] Standard zoom');
      onZoomOut();
    }
    
    setTimeout(() => { zoomCooldownRef.current = false; }, ZOOM_COOLDOWN_MS);
  }, [isNavigating, onStaggeredZoomOut, onZoomOut]);
  
  // Stable callback for incidents (handles hideIncidents)
  const incidentsCallback = useCallback(() => {
    console.log('[BUTTON-CALLBACK] 🔴 Incidents callback invoked');
    if (onViewIncidents && !hideIncidents) {
      onViewIncidents();
    }
  }, [onViewIncidents, hideIncidents]);
  
  // Stable callback wrappers with logging for debugging
  // MapView uses a ref-based callback to prevent re-registration churn
  // (onToggleMapView is an inline arrow that changes every render)
  const mapViewCallbackRef = useRef(onToggleMapView);
  mapViewCallbackRef.current = onToggleMapView;
  const mapViewCallback = useCallback(() => {
    console.log('[BUTTON-CALLBACK] 🟢 MapView callback invoked - should toggle satellite view');
    if (mapViewCallbackRef.current) {
      mapViewCallbackRef.current();
    }
  }, []);
  
  const toggle3DCallback = useCallback(() => {
    console.log('[BUTTON-CALLBACK] 🔵 Toggle3D callback invoked - should toggle 3D/tilt mode');
    if (onToggle3D) {
      onToggle3D();
    }
  }, [onToggle3D]);
  
  const compassCallback = useCallback(() => {
    console.log('[BUTTON-CALLBACK] 🧭 Compass callback invoked');
    if (onCompassClick) {
      onCompassClick();
    }
  }, [onCompassClick]);
  
  const trafficCallback = useCallback(() => {
    console.log('[BUTTON-CALLBACK] 🟠 Traffic callback invoked');
    if (onToggleTraffic) {
      onToggleTraffic();
    }
  }, [onToggleTraffic]);
  
  // Button visibility states
  const incidentsVisible = Boolean(onViewIncidents && !hideIncidents && isVisible);
  const mapViewVisible = Boolean(onToggleMapView && isVisible);
  const recenterVisible = Boolean(onRecenter && isVisible);
  const zoomInVisible = Boolean(onZoomIn && isVisible);
  const zoomOutVisible = Boolean(onZoomOut && isVisible);
  const compassVisible = Boolean(!hideCompass && onCompassClick && isVisible);
  const toggle3DVisible = Boolean(onToggle3D && !hide3D && isVisible);
  const trafficVisible = Boolean(onToggleTraffic && isVisible);
  
  // Register all buttons with unified touch handling (includes visibility)
  // Using stable callback wrappers with logging for debugging
  const incidentsHandlers = useUnifiedTouchHandler(incidentsRef, incidentsCallback, 'incidents-btn', incidentsVisible);
  const mapViewHandlers = useUnifiedTouchHandler(mapViewRef, mapViewCallback, 'map-view-btn', mapViewVisible, 24);
  const recenterHandlers = useUnifiedTouchHandler(recenterRef, onRecenter, 'recenter-btn', recenterVisible);
  const zoomInHandlers = useUnifiedTouchHandler(zoomInRef, zoomInHandler, 'zoom-in-btn', zoomInVisible);
  const zoomOutHandlers = useUnifiedTouchHandler(zoomOutRef, zoomOutHandler, 'zoom-out-btn', zoomOutVisible);
  const compassHandlers = useUnifiedTouchHandler(compassRef, compassCallback, 'compass-btn', compassVisible);
  const toggle3DHandlers = useUnifiedTouchHandler(toggle3DRef, toggle3DCallback, '3d-toggle-btn', toggle3DVisible);
  const trafficHandlers = useUnifiedTouchHandler(trafficRef, trafficCallback, 'traffic-btn', trafficVisible);
  
  // Common button styles
  const baseButtonClass = "rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-black border-2 shadow-lg select-none touch-manipulation transition-all duration-150 transform-gpu";
  const visibleClass = "translate-x-0 opacity-100 scale-100 pointer-events-auto";
  const hiddenClass = "translate-x-20 opacity-0 scale-95 pointer-events-none";
  const buttonStyle = { touchAction: 'manipulation' as const, WebkitTapHighlightColor: 'transparent' };
  
  return (
    <div 
      className={cn(
        "flex flex-col pointer-events-auto",
        compact ? "gap-[14px]" : "gap-4"
      )} 
      data-testid="right-action-stack"
      style={{ marginTop: compact ? '24px' : '0px', pointerEvents: 'auto' }}
    >
      {/* 1. Incidents - Red border */}
      <Button
        ref={incidentsRef}
        variant="ghost"
        size="icon"
        onTouchStart={incidentsHandlers.onTouchStart}
        onClick={incidentsHandlers.onClick}
        onPointerDown={incidentsHandlers.onPointerDown}
        className={cn(
          buttonSize, 
          baseButtonClass,
          "border-red-500",
          incidentsVisible ? visibleClass : hiddenClass
        )}
        style={buttonStyle}
        data-testid="button-view-incidents"
        aria-label="View incidents"
      >
        <AlertCircle className={iconSize} />
      </Button>

      {/* 2. Map View Toggle (Satellite) - Green when satellite */}
      {onToggleMapView && (
        <Button
          ref={mapViewRef}
          variant="ghost"
          size="icon"
          onTouchStart={mapViewHandlers.onTouchStart}
          onClick={mapViewHandlers.onClick}
          onPointerDown={mapViewHandlers.onPointerDown}
          className={cn(
            buttonSize, 
            baseButtonClass,
            isSatelliteView ? "border-green-500" : "border-gray-400",
            mapViewVisible ? visibleClass : hiddenClass
          )}
          style={buttonStyle}
          data-testid="button-toggle-view"
          aria-label={isSatelliteView ? "Switch to map view" : "Switch to satellite view"}
        >
          <MapIcon className={iconSize} />
        </Button>
      )}

      {/* 3. Compass - Blue border */}
      {!hideCompass && onCompassClick && (
        <Button
          ref={compassRef}
          variant="ghost"
          size="icon"
          onTouchStart={compassHandlers.onTouchStart}
          onClick={compassHandlers.onClick}
          onPointerDown={compassHandlers.onPointerDown}
          className={cn(
            buttonSize, 
            baseButtonClass,
            "border-blue-500",
            compassVisible ? visibleClass : hiddenClass
          )}
          style={buttonStyle}
          data-testid="button-compass-reset"
          aria-label="Reset compass bearing"
        >
          <Compass 
            className={cn(iconSize, "transition-transform duration-300")}
            style={{ transform: `rotate(${bearing}deg)` }}
          />
        </Button>
      )}

      {/* 4. Zoom In (Plus) - Blue when navigating */}
      {onZoomIn && (
        <Button
          ref={zoomInRef}
          variant="ghost"
          size="icon"
          onTouchStart={zoomInHandlers.onTouchStart}
          onClick={zoomInHandlers.onClick}
          onPointerDown={zoomInHandlers.onPointerDown}
          className={cn(
            buttonSize, 
            baseButtonClass,
            isNavigating ? "border-blue-500" : "border-gray-400",
            zoomInVisible ? visibleClass : hiddenClass
          )}
          style={buttonStyle}
          data-testid="button-zoom-in"
          aria-label="Zoom in"
        >
          <Plus className={iconSize} />
        </Button>
      )}

      {/* 5. Zoom Out (Minus) - Blue when navigating */}
      {onZoomOut && (
        <Button
          ref={zoomOutRef}
          variant="ghost"
          size="icon"
          onTouchStart={zoomOutHandlers.onTouchStart}
          onClick={zoomOutHandlers.onClick}
          onPointerDown={zoomOutHandlers.onPointerDown}
          className={cn(
            buttonSize, 
            baseButtonClass,
            isNavigating ? "border-blue-500" : "border-gray-400",
            zoomOutVisible ? visibleClass : hiddenClass
          )}
          style={buttonStyle}
          data-testid="button-zoom-out"
          aria-label="Zoom out"
        >
          <Minus className={iconSize} />
        </Button>
      )}

      {/* 6. Tilt (3D Toggle) - Blue when active */}
      {onToggle3D && !hide3D && (
        <Button
          ref={toggle3DRef}
          variant="ghost"
          size="icon"
          onTouchStart={toggle3DHandlers.onTouchStart}
          onClick={toggle3DHandlers.onClick}
          onPointerDown={toggle3DHandlers.onPointerDown}
          className={cn(
            buttonSize, 
            baseButtonClass,
            is3DMode ? "border-blue-500" : "border-gray-400",
            toggle3DVisible ? visibleClass : hiddenClass
          )}
          style={buttonStyle}
          data-testid="button-toggle-3d"
          aria-label={is3DMode ? "Switch to 2D view" : "Switch to 3D view"}
        >
          <Box className={iconSize} />
        </Button>
      )}

      {/* 7. Traffic Layer Toggle - Orange when active */}
      {onToggleTraffic && (
        <Button
          ref={trafficRef}
          variant="ghost"
          size="icon"
          onTouchStart={trafficHandlers.onTouchStart}
          onClick={trafficHandlers.onClick}
          onPointerDown={trafficHandlers.onPointerDown}
          className={cn(
            buttonSize, 
            baseButtonClass,
            showTraffic ? "border-orange-500" : "border-gray-400",
            trafficVisible ? visibleClass : hiddenClass
          )}
          style={buttonStyle}
          data-testid="button-toggle-traffic"
          aria-label={showTraffic ? "Hide traffic" : "Show traffic"}
        >
          <Layers className={iconSize} />
        </Button>
      )}

      {/* 8. Recenter (hidden from main stack, only shown when needed) */}
      {onRecenter && (
        <Button
          ref={recenterRef}
          variant="ghost"
          size="icon"
          onTouchStart={recenterHandlers.onTouchStart}
          onClick={recenterHandlers.onClick}
          onPointerDown={recenterHandlers.onPointerDown}
          className={cn(
            buttonSize, 
            baseButtonClass,
            "border-gray-400",
            "hidden" // Hidden by default - not in user's 7-button list
          )}
          style={buttonStyle}
          data-testid="button-recenter"
          aria-label="Recenter map"
        >
          <Crosshair className={iconSize} />
        </Button>
      )}
    </div>
  );
}
