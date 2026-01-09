import { ReactNode } from 'react';

interface NavigationLayoutProps {
  topStrip?: ReactNode;
  leftStack?: ReactNode;
  rightStack?: ReactNode;
  rightStackVisible?: boolean;
  bottomBar?: ReactNode;
  mapContent: ReactNode;
  isNavigating: boolean;
  isNavUIActive?: boolean;
}

export function NavigationLayout({
  topStrip,
  leftStack,
  rightStack,
  rightStackVisible = true,
  bottomBar,
  mapContent,
  isNavigating,
  isNavUIActive
}: NavigationLayoutProps) {
  const shouldShowUI = isNavUIActive !== undefined ? isNavUIActive : isNavigating;
  
  return (
    <div className="relative w-full h-screen overflow-hidden pointer-events-none lg:pt-[calc(env(safe-area-inset-top,0px)+56px)]">
      {/* Map content - full screen overlay container (pointer-events: none to allow map clicks through) */}
      <div className="absolute inset-0 lg:top-[calc(env(safe-area-inset-top,0px)+56px)] z-0 pointer-events-none">
        {mapContent}
      </div>

      {/* Top navigation strip - ETA header (CompactTripStrip) - now self-positioning and draggable */}
      {shouldShowUI && topStrip && topStrip}

      {/* Left action stack - ALWAYS visible for menu button access - positioned at bottom */}
      {leftStack && (
        <div 
          className="fixed left-4 z-[1600] flex flex-col gap-3 pointer-events-auto"
          style={{ 
            bottom: 'calc(80px + var(--safe-area-bottom, 0px))',
          }}
        >
          {leftStack}
        </div>
      )}

      {/* Right navigation controls stack - Repositioned to top-right, slightly down to avoid ETA header */}
      {rightStackVisible && (
        <div 
          className="fixed right-4 z-[99999]"
          style={{ 
            top: 'calc(80px + var(--safe-area-top, 0px))',
            pointerEvents: 'auto',
            userSelect: 'none'
          }}
        >
          {rightStack}
        </div>
      )}

      {/* Bottom instrumentation bar - positioned near base of map */}
      {shouldShowUI && bottomBar && (
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