import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface IOSRightStackPortalProps {
  children: ReactNode;
  isNavigating: boolean;
  isVisible: boolean;
}

export function IOSRightStackPortal({ 
  children, 
  isNavigating,
  isVisible 
}: IOSRightStackPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
    if (iOS) {
      console.log('[IOS-RIGHT-PORTAL] iOS detected - rendering right stack via portal');
    }
  }, []);
  
  if (!mounted) return null;
  
  const shouldShowUI = isNavigating;
  
  const stackContent = (
    <div 
      id="ios-right-stack-portal"
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
        transform: 'translate3d(0,0,0)',
        WebkitTransform: 'translate3d(0,0,0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transition: isVisible ? 'transform 0.3s ease, opacity 0.3s ease' : 'none',
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? 'visible' as const : 'hidden' as const
      }}
      onTouchStart={(e) => {
        console.log('[IOS-RIGHT-PORTAL] TouchStart on portal container');
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        console.log('[IOS-RIGHT-PORTAL] TouchEnd on portal container');
      }}
    >
      {children}
    </div>
  );
  
  if (isIOS) {
    return createPortal(stackContent, document.body);
  }
  
  return <>{children}</>;
}
