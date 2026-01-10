import { ReactNode } from 'react';

interface NavigationLayoutProps {
  topStrip?: ReactNode;
  leftStack?: ReactNode;
  rightStack?: ReactNode;
  topRightStack?: ReactNode;
  rightStackVisible?: boolean;
  bottomBar?: ReactNode;
  mapContent: ReactNode;
  isNavigating: boolean;
  isNavUIActive?: boolean;
  showBottomBar?: boolean; // Allow showing speedometer even when not actively navigating (for Go button)
}

export function NavigationLayout({
  topStrip,
  leftStack,
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

      {/* Top navigation strip - ETA header (CompactTripStrip) - now self-positioning and draggable */}
      {shouldShowUI && topStrip && topStrip}

      {/* Left action stack - ALWAYS visible for menu button access - positioned at bottom */}
      {leftStack && (
        <div 
          className="fixed left-4 flex flex-col gap-3 pointer-events-auto touch-manipulation"
          style={{ 
            bottom: 'calc(100px + var(--safe-area-bottom, 0px))',
            zIndex: 99999,
            touchAction: 'manipulation'
          }}
        >
          {leftStack}
        </div>
      )}

      {/* Top-right quick access buttons (GPS + Incidents) - positioned below ETA header */}
      {topRightStack && (
        <div 
          className="fixed right-4 z-[99999] flex flex-col gap-3"
          style={{ 
            top: 'calc(168px + var(--safe-area-top, 0px))',
            pointerEvents: 'auto',
            userSelect: 'none'
          }}
        >
          {topRightStack}
        </div>
      )}

      {/* Right navigation controls stack - Positioned lower during navigation mode */}
      {rightStackVisible && (
        <div 
          className="fixed right-4 z-[99999]"
          style={{ 
            bottom: shouldShowUI ? 'calc(180px + var(--safe-area-bottom, 0px))' : 'calc(100px + var(--safe-area-bottom, 0px))',
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
          className="absolute left-1/2 -translate-x-1/2 z-[1500]"
          style={{ bottom: 'calc(24px + var(--safe-area-bottom, 0px))' }}
        >
          {bottomBar}
        </div>
      )}
    </div>
  );
}