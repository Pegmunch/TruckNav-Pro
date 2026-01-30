import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// iOS Safari touch event handler - ensures buttons receive touch events
// This handler runs during the capture phase to prevent window-level handlers from interfering
const handleStackTouchCapture = (e: React.TouchEvent) => {
  // Let the event continue to the actual buttons - just log for debugging
  const target = e.target as HTMLElement;
  const isButton = target?.closest('button') !== null;
  if (isButton) {
    console.log('[NAV-LAYOUT] ✅ Touch captured on stack button, allowing through');
  }
};

// Native touch handler for iOS Safari - adds document-level listeners to ensure button touches work
// This is a fallback for when React event handlers don't fire on iOS Safari
const useIOSSafariTouchFix = () => {
  const hasAddedListeners = useRef(false);
  const touchedButtonRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (hasAddedListeners.current) return;
    hasAddedListeners.current = true;
    
    // Detect iOS Safari (excluding Chrome/Firefox on iOS which have their own handling)
    const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                        !(window as any).MSStream && 
                        /Safari/.test(navigator.userAgent) &&
                        !/CriOS|FxiOS/.test(navigator.userAgent);
    
    console.log('[IOS-TOUCH-FIX] Initialized, isIOSSafari:', isIOSSafari);
    
    // iOS Safari sometimes needs a native event listener to properly recognize touch targets
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Check if target is a button or inside a button - more permissive check
      const button = target?.closest('button') || 
                     (target?.tagName === 'BUTTON' ? target : null) ||
                     target?.closest('[role="button"]');
      
      if (button) {
        console.log('[IOS-TOUCH-FIX] ✅ Touch start on button detected:', button.getAttribute('data-testid'));
        touchedButtonRef.current = button as HTMLElement;
        button.classList.add('active', 'touching');
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const button = target?.closest('button') || 
                     (target?.tagName === 'BUTTON' ? target : null) ||
                     target?.closest('[role="button"]') ||
                     touchedButtonRef.current;
      
      if (button) {
        console.log('[IOS-TOUCH-FIX] ✅ Touch end on button detected - triggering click:', button.getAttribute('data-testid'));
        button.classList.remove('active', 'touching');
        touchedButtonRef.current = null;
        
        // For iOS Safari, manually dispatch a click event
        if (isIOSSafari) {
          e.preventDefault();
          // Use requestAnimationFrame to ensure the click happens after touch processing
          requestAnimationFrame(() => {
            (button as HTMLElement).click();
          });
        }
      }
    };
    
    // Add to document with capture: true to catch events before they're blocked
    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, []);
};

interface NavigationLayoutProps {
  topStrip?: ReactNode;
  leftStack?: ReactNode;
  topLeftStack?: ReactNode;
  rightStack?: ReactNode;
  topRightStack?: ReactNode;
  rightStackVisible?: boolean;
  bottomBar?: ReactNode;
  infoBoxes?: ReactNode;
  mapContent: ReactNode;
  isNavigating: boolean;
  isNavUIActive?: boolean;
  showBottomBar?: boolean;
}

export function NavigationLayout({
  topStrip,
  leftStack,
  topLeftStack,
  rightStack,
  topRightStack,
  rightStackVisible = true,
  bottomBar,
  infoBoxes,
  mapContent,
  isNavigating,
  isNavUIActive,
  showBottomBar
}: NavigationLayoutProps) {
  const shouldShowUI = isNavUIActive !== undefined ? isNavUIActive : isNavigating;
  const shouldShowBottomBar = showBottomBar !== undefined ? showBottomBar : shouldShowUI;
  const [mounted, setMounted] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
    if (iOS) {
      console.log('[NAV-LAYOUT] iOS detected - right stack will render via portal');
    }
  }, []);
  
  // iOS Safari fix: Add document-level touch listeners to ensure buttons work
  useIOSSafariTouchFix();
  
  return (
    <div 
      className="relative w-full h-screen overflow-visible pointer-events-none lg:pt-[calc(env(safe-area-inset-top,0px)+56px)]"
      style={{ zIndex: 600000 }}
    >
      {/* Map content - full screen overlay container - pointer-events-none so touch events reach the actual map below */}
      {/* Child elements that need interaction (buttons, controls) have their own pointer-events-auto */}
      {/* CRITICAL: This container must NOT intercept touch events - they must pass through to the map AND to fixed-position button stacks */}
      {/* FIXED: Removed touchAction: 'none' to allow double-tap gestures to reach the underlying map */}
      <div 
        className="absolute inset-0 lg:top-[calc(env(safe-area-inset-top,0px)+56px)] z-0 pointer-events-none"
      >
        {mapContent}
      </div>

      {/* Top navigation strip - ETA header (CompactTripStrip) - ALWAYS visible when route exists */}
      {topStrip && topStrip}

      {/* Top-left stack - Mobile only: Map/Recenter buttons below ETA */}
      {topLeftStack && (
        <div 
          className="fixed left-4 z-[99999] flex flex-col gap-2 lg:hidden pointer-events-auto"
          onTouchStartCapture={handleStackTouchCapture}
          onTouchEndCapture={handleStackTouchCapture}
          data-nav-controls="top-left-stack"
          style={{ 
            top: 'calc(180px + var(--safe-area-top, 0px))',
            userSelect: 'none',
            touchAction: 'manipulation',
            cursor: 'pointer'
          }}
        >
          {topLeftStack}
        </div>
      )}

      {/* Left action stack - ALWAYS visible for menu button access - positioned at bottom */}
      {/* iOS Safari WebGL fix: Render via portal on iOS to escape WebGL compositor blocking */}
      {/* CRITICAL: On iOS, this renders directly to document.body via createPortal */}
      {leftStack && mounted && (
        isIOS ? (
          createPortal(
            <div 
              id="ios-left-stack-portal"
              onTouchStart={(e) => {
                console.log('[IOS-LEFT-PORTAL] 🔵 TouchStart on left portal container');
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                console.log('[IOS-LEFT-PORTAL] 🔴 TouchEnd on left portal container');
              }}
              onTouchStartCapture={handleStackTouchCapture}
              onTouchEndCapture={handleStackTouchCapture}
              data-nav-controls="left-stack-portal"
              style={{ 
                position: 'fixed',
                left: '16px',
                bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 2147483646,
                pointerEvents: 'auto',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                cursor: 'pointer',
                transform: 'translate3d(0,0,0)',
                WebkitTransform: 'translate3d(0,0,0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              {leftStack}
            </div>,
            document.body
          )
        ) : (
          <div 
            className="fixed left-4 flex flex-col gap-3"
            onTouchStartCapture={handleStackTouchCapture}
            onTouchEndCapture={handleStackTouchCapture}
            data-nav-controls="left-stack"
            style={{ 
              bottom: 'calc(100px + var(--safe-area-bottom, 0px))',
              zIndex: 500000,
              pointerEvents: 'auto',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              cursor: 'pointer'
            }}
          >
            {leftStack}
          </div>
        )
      )}

      {/* Top-right quick access buttons (GPS toggle) - positioned below ETA header */}
      {topRightStack && (
        <div 
          className="fixed right-4 z-[99999] flex flex-col gap-3"
          onTouchStartCapture={handleStackTouchCapture}
          onTouchEndCapture={handleStackTouchCapture}
          data-nav-controls="top-right-stack"
          style={{ 
            top: 'calc(170px + var(--safe-area-top, 0px))',
            pointerEvents: 'auto',
            userSelect: 'none',
            touchAction: 'manipulation',
            cursor: 'pointer'
          }}
        >
          {topRightStack}
        </div>
      )}

      {/* Right navigation controls stack - Positioned from bottom, above instrumentation bar */}
      {/* iOS Safari WebGL fix: Render via portal on iOS to escape WebGL compositor blocking */}
      {/* CRITICAL: On iOS, this renders directly to document.body via createPortal */}
      {rightStackVisible && rightStack && mounted && (
        isIOS ? (
          createPortal(
            <div 
              id="ios-right-stack-portal"
              onTouchStart={(e) => {
                console.log('[IOS-RIGHT-PORTAL] 🔵 TouchStart on portal container');
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                console.log('[IOS-RIGHT-PORTAL] 🔴 TouchEnd on portal container');
              }}
              onTouchStartCapture={handleStackTouchCapture}
              onTouchEndCapture={handleStackTouchCapture}
              data-nav-controls="right-stack-portal"
              style={{ 
                position: 'fixed',
                right: '16px',
                bottom: shouldShowUI ? 'calc(100px + env(safe-area-inset-bottom, 0px))' : 'calc(80px + env(safe-area-inset-bottom, 0px))',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 2147483646,
                pointerEvents: 'auto',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                cursor: 'pointer',
                transform: 'translate3d(0,0,0)',
                WebkitTransform: 'translate3d(0,0,0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              {rightStack}
            </div>,
            document.body
          )
        ) : (
          <div 
            className="fixed right-4 flex flex-col gap-1"
            onTouchStart={(e) => {
              console.log('[RIGHT-STACK-TOUCH] 🔵 TouchStart on rightStack container');
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              console.log('[RIGHT-STACK-TOUCH] 🔴 TouchEnd on rightStack container');
            }}
            onTouchStartCapture={handleStackTouchCapture}
            onTouchEndCapture={handleStackTouchCapture}
            data-nav-controls="right-stack"
            style={{ 
              bottom: shouldShowUI ? 'calc(100px + var(--safe-area-bottom, 0px))' : 'calc(80px + var(--safe-area-bottom, 0px))',
              zIndex: 999999,
              pointerEvents: 'auto',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              cursor: 'pointer',
              transform: 'translate3d(0,0,0)',
              WebkitTransform: 'translate3d(0,0,0)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              perspective: 1000,
              WebkitPerspective: 1000
            }}
          >
            {rightStack}
          </div>
        )
      )}

      {/* Info boxes above speedometer - Distance and ETA during navigation - CENTERED */}
      {shouldShowBottomBar && infoBoxes && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-[99999] pointer-events-auto"
          onTouchStartCapture={handleStackTouchCapture}
          onTouchEndCapture={handleStackTouchCapture}
          data-nav-controls="info-boxes"
          style={{ 
            bottom: 'calc(85px + var(--safe-area-bottom, 0px))',
            touchAction: 'manipulation',
            cursor: 'pointer'
          }}
        >
          {infoBoxes}
        </div>
      )}

      {/* Bottom instrumentation bar - positioned near base of map */}
      {shouldShowBottomBar && bottomBar && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-[99999] pointer-events-auto"
          onTouchStartCapture={handleStackTouchCapture}
          onTouchEndCapture={handleStackTouchCapture}
          data-nav-controls="bottom-bar"
          style={{ 
            bottom: 'calc(24px + var(--safe-area-bottom, 0px))',
            touchAction: 'manipulation',
            cursor: 'pointer'
          }}
        >
          {bottomBar}
        </div>
      )}
    </div>
  );
}