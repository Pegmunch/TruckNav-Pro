import { ReactNode } from 'react';

interface NavigationLayoutProps {
  topStrip?: ReactNode;
  leftStack?: ReactNode;
  rightStack?: ReactNode;
  bottomBar?: ReactNode;
  mapContent: ReactNode;
  isNavigating: boolean;
}

export function NavigationLayout({
  topStrip,
  leftStack,
  rightStack,
  bottomBar,
  mapContent,
  isNavigating
}: NavigationLayoutProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map content - full screen */}
      <div className="absolute inset-0 z-0">
        {mapContent}
      </div>

      {/* Top navigation strip */}
      {isNavigating && topStrip && (
        <div className="absolute top-0 left-0 right-0 z-[1700]">
          {topStrip}
        </div>
      )}

      {/* Left action stack */}
      {isNavigating && leftStack && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[1600] flex flex-col gap-4">
          {leftStack}
        </div>
      )}

      {/* Right navigation controls stack */}
      {isNavigating && rightStack && (
        <div className="absolute right-4 top-24 z-[1800] safe-top">
          {rightStack}
        </div>
      )}

      {/* Bottom instrumentation bar */}
      {isNavigating && bottomBar && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1500] safe-bottom">
          {bottomBar}
        </div>
      )}
    </div>
  );
}