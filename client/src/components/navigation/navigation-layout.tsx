import { ReactNode } from 'react';

interface NavigationLayoutProps {
  topStrip?: ReactNode;
  leftStack?: ReactNode;
  rightStack?: ReactNode;
  bottomBar?: ReactNode;
  mapContent: ReactNode;
  isNavigating: boolean;
  isNavUIActive?: boolean;
}

export function NavigationLayout({
  topStrip,
  leftStack,
  rightStack,
  bottomBar,
  mapContent,
  isNavigating,
  isNavUIActive
}: NavigationLayoutProps) {
  const shouldShowUI = isNavUIActive !== undefined ? isNavUIActive : isNavigating;
  
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map content - full screen */}
      <div className="absolute inset-0 z-0">
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

      {/* Left action stack - Fixed positioning to prevent map overlay */}
      {shouldShowUI && leftStack && (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[1600] flex flex-col gap-4 pointer-events-auto" style={{ top: 'calc(50% + var(--safe-area-top, 0px))' }}>
          {leftStack}
        </div>
      )}

      {/* Right navigation controls stack - Fixed positioning */}
      <div 
        className="fixed right-4 z-[99999]"
        style={{ 
          top: '100px',
          display: 'block',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        <div className="pointer-events-auto">
          {rightStack}
        </div>
      </div>

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