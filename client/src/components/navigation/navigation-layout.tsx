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

      {/* Left action stack */}
      {shouldShowUI && leftStack && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[1600] flex flex-col gap-4">
          {leftStack}
        </div>
      )}

      {/* Right navigation controls stack - 8 buttons on right side below ETA header */}
      {/* Positioned just below the CompactTripStrip (ETA header) - responsive for mobile */}
      {shouldShowUI && rightStack && (
        <div 
          className="absolute z-[2100] flex flex-col gap-2 overflow-y-auto pointer-events-auto navigation-controls-container"
          data-testid="navigation-controls-container"
          style={{
            top: 'max(85px, calc(max(70px, 5vh) + var(--safe-area-top, 0px)))',
            right: '8px',
            bottom: '120px',
            width: '56px',
            maxHeight: 'calc(100% - 200px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {rightStack}
        </div>
      )}

      {/* Bottom instrumentation bar */}
      {shouldShowUI && bottomBar && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1500] safe-bottom">
          {bottomBar}
        </div>
      )}
    </div>
  );
}