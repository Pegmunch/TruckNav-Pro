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
  
  const buttonSize = compact ? 36 : 44;
  const gap = compact ? 4 : 6;
  const buttonStep = buttonSize + gap;
  
  const handleIncidentsTouch = useCallback((e: TouchEvent | MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[IOS-TOUCH-CAPTURE] ✅ Incidents touch captured!');
    hapticButtonPress();
    onIncidentsClick?.();
  }, [onIncidentsClick]);
  
  const handleTrafficTouch = useCallback((e: TouchEvent | MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[IOS-TOUCH-CAPTURE] ✅ Traffic touch captured!');
    hapticButtonPress();
    onTrafficClick?.();
  }, [onTrafficClick]);
  
  useEffect(() => {
    const incidentsEl = incidentsTouchRef.current;
    const trafficEl = trafficTouchRef.current;
    
    if (incidentsEl && onIncidentsClick) {
      incidentsEl.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true, capture: true });
      incidentsEl.addEventListener('touchend', handleIncidentsTouch, { passive: false, capture: true });
      incidentsEl.addEventListener('click', handleIncidentsTouch, { capture: true });
      console.log('[IOS-TOUCH-CAPTURE] 📎 Incidents capture layer attached');
    }
    
    if (trafficEl && onTrafficClick) {
      trafficEl.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true, capture: true });
      trafficEl.addEventListener('touchend', handleTrafficTouch, { passive: false, capture: true });
      trafficEl.addEventListener('click', handleTrafficTouch, { capture: true });
      console.log('[IOS-TOUCH-CAPTURE] 📎 Traffic capture layer attached');
    }
    
    return () => {
      if (incidentsEl) {
        incidentsEl.removeEventListener('touchend', handleIncidentsTouch, { capture: true });
        incidentsEl.removeEventListener('click', handleIncidentsTouch, { capture: true });
      }
      if (trafficEl) {
        trafficEl.removeEventListener('touchend', handleTrafficTouch, { capture: true });
        trafficEl.removeEventListener('click', handleTrafficTouch, { capture: true });
      }
    };
  }, [handleIncidentsTouch, handleTrafficTouch, onIncidentsClick, onTrafficClick]);
  
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
