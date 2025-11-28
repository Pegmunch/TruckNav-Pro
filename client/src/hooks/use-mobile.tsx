import * as React from "react"

const MOBILE_BREAKPOINT = 1024

// Detect if running as PWA standalone (iOS home screen app)
function isPWAStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  // iOS Safari standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  // Android/Chrome PWA standalone mode
  const isAndroidStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  return isIOSStandalone || isAndroidStandalone;
}

// Detect touch device capability
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(() => {
    if (typeof window === 'undefined') return true;
    
    // PWA standalone mode is ALWAYS mobile
    if (isPWAStandalone()) return true;
    
    // Touch devices with width <= 1024 are mobile
    if (isTouchDevice() && window.innerWidth <= MOBILE_BREAKPOINT) return true;
    
    // Standard viewport check
    return window.innerWidth < MOBILE_BREAKPOINT;
  })

  React.useEffect(() => {
    const checkMobile = () => {
      // PWA standalone is ALWAYS mobile regardless of viewport
      if (isPWAStandalone()) {
        setIsMobile(true);
        return;
      }
      
      // Touch devices with width <= 1024 are mobile
      if (isTouchDevice() && window.innerWidth <= MOBILE_BREAKPOINT) {
        setIsMobile(true);
        return;
      }
      
      // Standard viewport check
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", checkMobile);
    
    // Initial check
    checkMobile();
    
    return () => mql.removeEventListener("change", checkMobile);
  }, [])

  return isMobile ?? true // Default to mobile if still undefined
}
