import { useEffect, useRef, useCallback } from 'react';
import { hapticButtonPress } from '@/hooks/use-haptic-feedback';

interface IOSTouchCaptureProps {
  onIncidentsClick?: () => void;
  onTrafficClick?: () => void;
  isVisible?: boolean;
  compact?: boolean;
}

export function IOSTouchCapture({
  onIncidentsClick,
  onTrafficClick,
  isVisible = true,
  compact = false
}: IOSTouchCaptureProps) {
  const incidentsTouchRef = useRef<HTMLDivElement>(null);
  const trafficTouchRef = useRef<HTMLDivElement>(null);
  const lastIncidentsTouchRef = useRef(0);
  const lastTrafficTouchRef = useRef(0);
  
  const buttonSize = compact ? 36 : 44;
  const gap = compact ? 4 : 6;
  const buttonStep = buttonSize + gap;
  
  useEffect(() => {
    const incidentsEl = incidentsTouchRef.current;
    const trafficEl = trafficTouchRef.current;
    
    // CRITICAL: Fire on TOUCHSTART for iOS Safari - touchend often gets cancelled
    const handleIncidentsTouchStart = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastIncidentsTouchRef.current < 300) return; // Debounce
      lastIncidentsTouchRef.current = now;
      
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('[IOS-TOUCH-CAPTURE] ✅ Incidents TOUCHSTART - firing immediately!');
      hapticButtonPress();
      onIncidentsClick?.();
    };
    
    const handleTrafficTouchStart = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTrafficTouchRef.current < 300) return; // Debounce
      lastTrafficTouchRef.current = now;
      
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('[IOS-TOUCH-CAPTURE] ✅ Traffic TOUCHSTART - firing immediately!');
      hapticButtonPress();
      onTrafficClick?.();
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    if (incidentsEl && onIncidentsClick) {
      incidentsEl.addEventListener('touchstart', handleIncidentsTouchStart, { passive: false, capture: true });
      incidentsEl.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
      console.log('[IOS-TOUCH-CAPTURE] 📎 Incidents layer (touchstart mode) attached');
    }
    
    if (trafficEl && onTrafficClick) {
      trafficEl.addEventListener('touchstart', handleTrafficTouchStart, { passive: false, capture: true });
      trafficEl.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
      console.log('[IOS-TOUCH-CAPTURE] 📎 Traffic layer (touchstart mode) attached');
    }
    
    return () => {
      if (incidentsEl) {
        incidentsEl.removeEventListener('touchstart', handleIncidentsTouchStart, { capture: true });
        incidentsEl.removeEventListener('touchend', handleTouchEnd, { capture: true });
      }
      if (trafficEl) {
        trafficEl.removeEventListener('touchstart', handleTrafficTouchStart, { capture: true });
        trafficEl.removeEventListener('touchend', handleTouchEnd, { capture: true });
      }
    };
  }, [onIncidentsClick, onTrafficClick]);
  
  if (!isVisible) return null;
  
  return (
    <>
      {onIncidentsClick && (
        <div
          ref={incidentsTouchRef}
          className="fixed pointer-events-auto"
          style={{
            right: 16,
            bottom: `calc(100px + var(--safe-area-bottom, 0px) + ${buttonStep * 6}px)`,
            width: buttonSize + 8,
            height: buttonSize + 8,
            zIndex: 600001,
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            cursor: 'pointer',
            borderRadius: 12,
          }}
          data-testid="ios-touch-capture-incidents"
        />
      )}
      
      {onTrafficClick && (
        <div
          ref={trafficTouchRef}
          className="fixed pointer-events-auto"
          style={{
            right: 16,
            bottom: `calc(100px + var(--safe-area-bottom, 0px))`,
            width: buttonSize + 8,
            height: buttonSize + 8,
            zIndex: 600001,
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            cursor: 'pointer',
            borderRadius: 12,
          }}
          data-testid="ios-touch-capture-traffic"
        />
      )}
    </>
  );
}
