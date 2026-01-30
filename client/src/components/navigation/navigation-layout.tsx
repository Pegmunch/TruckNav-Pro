import { ReactNode } from 'react';

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
  
  return (
    <div 
      className="relative w-full h-screen overflow-visible pointer-events-none lg:pt-[calc(env(safe-area-inset-top,0px)+56px)]"
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
      {/* iOS Safari fix: Removed isolation/contain/transform that were blocking touch events */}
      {/* CRITICAL: onTouchStartCapture ensures touch events reach buttons before window listeners */}
      {leftStack && (
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
            cursor: 'pointer'
          }}
        >
          {leftStack}
        </div>
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
      {/* iOS Safari fix: Removed isolation/contain/transform that were blocking touch events */}
      {/* CRITICAL: onTouchStartCapture ensures touch events reach buttons before window listeners */}
      {rightStackVisible && (
        <div 
          className="fixed right-4 overflow-y-auto overflow-x-hidden"
          onTouchStartCapture={handleStackTouchCapture}
          onTouchEndCapture={handleStackTouchCapture}
          data-nav-controls="right-stack"
          style={{ 
            bottom: shouldShowUI ? 'calc(100px + var(--safe-area-bottom, 0px))' : 'calc(80px + var(--safe-area-bottom, 0px))',
            maxHeight: 'calc(100vh - 280px - var(--safe-area-top, 0px) - var(--safe-area-bottom, 0px))',
            zIndex: 500000,
            pointerEvents: 'auto',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            cursor: 'pointer'
          }}
        >
          {rightStack}
        </div>
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