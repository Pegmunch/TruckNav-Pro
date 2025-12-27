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
    <div className="relative w-full h-screen overflow-hidden pointer-events-none">
      {/* Map content - full screen overlay container (pointer-events: none to allow map clicks through) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {mapContent}
      </div>

      {/* Top navigation strip - ETA header (CompactTripStrip) */}
      {shouldShowUI && topStrip && (
        <div 
          className="absolute left-0 right-0 z-[1700] w-full"
          style={{
            top: 'var(--safe-area-top, 0px)',
            maxHeight: '90px'
          }}
        >
          {topStrip}
        </div>
      )}

      {/* Left action stack - Fixed positioning lower on screen to avoid ETA header clash */}
      {shouldShowUI && leftStack && (
        <div 
          className="fixed left-4 z-[1600] flex flex-col gap-3 pointer-events-auto"
          style={{ 
            bottom: 'calc(140px + var(--safe-area-bottom, 0px))',
          }}
        >
          {leftStack}
        </div>
      )}

      {/* Right navigation controls stack - Fixed positioning lower to avoid ETA header */}
      {rightStackVisible && (
        <div 
          className="fixed right-4 z-[99999]"
          style={{ 
            bottom: 'calc(140px + var(--safe-area-bottom, 0px))',
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