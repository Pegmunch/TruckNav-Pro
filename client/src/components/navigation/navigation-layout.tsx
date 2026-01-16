import { ReactNode } from 'react';

interface NavigationLayoutProps {
  topStrip?: ReactNode;
  leftStack?: ReactNode;
  topLeftStack?: ReactNode;
  rightStack?: ReactNode;
  topRightStack?: ReactNode;
  rightStackVisible?: boolean;
  bottomBar?: ReactNode;
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
  mapContent,
  isNavigating,
  isNavUIActive,
  showBottomBar
}: NavigationLayoutProps) {
  const shouldShowUI = isNavUIActive !== undefined ? isNavUIActive : isNavigating;
  const shouldShowBottomBar = showBottomBar !== undefined ? showBottomBar : shouldShowUI;
  
  return (
    <div className="relative w-full h-screen overflow-visible pointer-events-none lg:pt-[calc(env(safe-area-inset-top,0px)+56px)]">
      {/* Map content - full screen overlay container (pointer-events: none to allow map clicks through) */}
      <div className="absolute inset-0 lg:top-[calc(env(safe-area-inset-top,0px)+56px)] z-0 pointer-events-none">
        {mapContent}
      </div>

      {/* Top navigation strip - ETA header (CompactTripStrip) - ALWAYS visible when route exists */}
      {topStrip && topStrip}

      {/* Top-left stack - Mobile only: Map/Recenter buttons below ETA */}
      {topLeftStack && (
        <div 
          className="fixed left-4 z-[99999] flex flex-col gap-2 lg:hidden pointer-events-auto"
          style={{ 
            top: 'calc(180px + var(--safe-area-top, 0px))',
            userSelect: 'none'
          }}
        >
          {topLeftStack}
        </div>
      )}

      {/* Left action stack - ALWAYS visible for menu button access - positioned at bottom */}
      {/* CRITICAL: wrapper uses pointer-events-none to prevent blocking - children have pointer-events-auto */}
      {leftStack && (
        <div 
          className="fixed left-4 flex flex-col gap-3 pointer-events-none touch-manipulation"
          style={{ 
            bottom: 'calc(100px + var(--safe-area-bottom, 0px))',
            zIndex: 99999,
            touchAction: 'manipulation'
          }}
        >
          {leftStack}
        </div>
      )}

      {/* Top-right quick access buttons (GPS toggle) - positioned below ETA header */}
      {topRightStack && (
        <div 
          className="fixed right-4 z-[99999] flex flex-col gap-3"
          style={{ 
            top: 'calc(170px + var(--safe-area-top, 0px))',
            pointerEvents: 'auto',
            userSelect: 'none'
          }}
        >
          {topRightStack}
        </div>
      )}

      {/* Right navigation controls stack - Positioned from bottom, below instrumentation bar */}
      {rightStackVisible && (
        <div 
          className="fixed right-4 z-[99999]"
          style={{ 
            bottom: shouldShowUI ? 'calc(60px + var(--safe-area-bottom, 0px))' : 'calc(40px + var(--safe-area-bottom, 0px))',
            pointerEvents: 'auto',
            userSelect: 'none'
          }}
        >
          {rightStack}
        </div>
      )}

      {/* Bottom instrumentation bar - positioned near base of map */}
      {shouldShowBottomBar && bottomBar && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-[99999] pointer-events-auto"
          style={{ bottom: 'calc(24px + var(--safe-area-bottom, 0px))' }}
        >
          {bottomBar}
        </div>
      )}
    </div>
  );
}