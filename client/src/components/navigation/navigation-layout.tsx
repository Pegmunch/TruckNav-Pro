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
    <>
      {/* Map content overlays - rendered in normal flow */}
      {mapContent}

      {/* Top navigation strip - ETA Header - FIXED positioning for mobile/PWA */}
      {shouldShowUI && topStrip && (
        <div 
          className="fixed left-0 right-0 z-[1700]"
          style={{ top: '0px' }}
        >
          {topStrip}
        </div>
      )}

      {/* Left action stack - FIXED positioning */}
      {shouldShowUI && leftStack && (
        <div 
          className="fixed z-[1600] flex flex-col gap-3"
          style={{
            left: 'calc(16px + var(--safe-area-left, 0px))',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          {leftStack}
        </div>
      )}

      {/* Right navigation controls stack - 8 buttons - FIXED positioning */}
      {shouldShowUI && rightStack && (
        <div 
          className="fixed z-[1800] flex flex-col gap-2 overflow-y-auto pointer-events-auto"
          style={{
            top: 'calc(48px + env(safe-area-inset-top, 0px))',
            right: 'calc(12px + env(safe-area-inset-right, 0px))',
            maxHeight: 'calc(100vh - 160px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))'
          }}
        >
          {rightStack}
        </div>
      )}

      {/* Bottom instrumentation bar - Speedometer - LEFT side positioning */}
      {shouldShowUI && bottomBar && (
        <div 
          className="fixed z-[1500] pointer-events-auto"
          style={{
            left: 'calc(16px + var(--safe-area-left, 0px))',
            bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          {bottomBar}
        </div>
      )}
    </>
  );
}