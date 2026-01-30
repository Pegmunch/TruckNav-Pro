import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hapticButtonPress } from '@/hooks/use-haptic-feedback';

interface PortalButtonProps {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  isVisible?: boolean;
  targetRef?: React.RefObject<HTMLElement>;
  position?: { top: number; right: number };
  id?: string;
}

export function PortalButton({
  onClick,
  className,
  children,
  isVisible = true,
  targetRef,
  position,
  id = 'portal-btn'
}: PortalButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!targetRef?.current) {
      if (position) {
        setButtonPosition({ top: position.top, left: window.innerWidth - position.right - 44 });
      }
      return;
    }

    const updatePosition = () => {
      const rect = targetRef.current?.getBoundingClientRect();
      if (rect) {
        setButtonPosition({ top: rect.top, left: rect.left });
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetRef, position]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`[PORTAL-BTN-${id}] ✅ TouchStart - triggering callback`);
    hapticButtonPress();
    onClick();
  }, [onClick, id]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`[PORTAL-BTN-${id}] ✅ Click - triggering callback`);
    hapticButtonPress();
    onClick();
  }, [onClick, id]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      e.preventDefault();
      e.stopPropagation();
      console.log(`[PORTAL-BTN-${id}] ✅ PointerDown (touch) - triggering callback`);
      hapticButtonPress();
      onClick();
    }
  }, [onClick, id]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const nativeTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log(`[PORTAL-BTN-${id}] ✅ Native TouchStart - triggering callback`);
      hapticButtonPress();
      onClick();
    };

    button.addEventListener('touchstart', nativeTouchStart, { passive: false, capture: true });

    return () => {
      button.removeEventListener('touchstart', nativeTouchStart, { capture: true });
    };
  }, [onClick, id]);

  if (!mounted || !isVisible || !buttonPosition) return null;

  const portalContent = (
    <button
      ref={buttonRef}
      id={`portal-${id}`}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      className={cn(
        "flex items-center justify-center rounded-md shadow-md",
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        "h-9 w-9 min-h-[36px] min-w-[36px]",
        "touch-manipulation select-none",
        className
      )}
      style={{
        position: 'fixed',
        top: `${buttonPosition.top}px`,
        left: `${buttonPosition.left}px`,
        zIndex: 2147483647,
        pointerEvents: 'auto',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        transform: 'none',
        willChange: 'auto',
      }}
    >
      {children}
    </button>
  );

  return createPortal(portalContent, document.body);
}

export function PortalIncidentButton({
  onClick,
  isNavigating,
  isVisible = true,
}: {
  onClick: () => void;
  isNavigating: boolean;
  isVisible?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleAction = useCallback(() => {
    console.log(`[PORTAL-INCIDENT-BTN] ✅ Action triggered (isNavigating: ${isNavigating})`);
    hapticButtonPress();
    onClick();
  }, [onClick, isNavigating]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const nativeTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('[PORTAL-INCIDENT-BTN] ✅ Native TouchStart captured');
      handleAction();
    };

    const nativePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'mouse') {
        e.preventDefault();
        e.stopPropagation();
        console.log('[PORTAL-INCIDENT-BTN] ✅ Native PointerDown captured');
        handleAction();
      }
    };

    button.addEventListener('touchstart', nativeTouchStart, { passive: false, capture: true });
    button.addEventListener('pointerdown', nativePointerDown, { capture: true });

    console.log('[PORTAL-INCIDENT-BTN] 📎 Native listeners attached to portal button');

    return () => {
      button.removeEventListener('touchstart', nativeTouchStart, { capture: true });
      button.removeEventListener('pointerdown', nativePointerDown, { capture: true });
    };
  }, [handleAction]);

  if (!mounted || !isVisible || !isNavigating) return null;

  const portalContent = (
    <button
      ref={buttonRef}
      id="portal-incident-btn"
      className={cn(
        "flex items-center justify-center rounded-md shadow-lg",
        "bg-orange-500 hover:bg-orange-600 text-white",
        "h-11 w-11 min-h-[44px] min-w-[44px]",
        "touch-manipulation select-none",
        "border-2 border-orange-400"
      )}
      style={{
        position: 'fixed',
        top: '120px',
        right: '16px',
        zIndex: 2147483647,
        pointerEvents: 'auto',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        transform: 'none',
        willChange: 'auto',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </button>
  );

  return createPortal(portalContent, document.body);
}

export function PortalTrafficButton({
  onClick,
  isNavigating,
  isVisible = true,
  showTraffic = false,
}: {
  onClick: () => void;
  isNavigating: boolean;
  isVisible?: boolean;
  showTraffic?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleAction = useCallback(() => {
    console.log(`[PORTAL-TRAFFIC-BTN] ✅ Action triggered (isNavigating: ${isNavigating})`);
    hapticButtonPress();
    onClick();
  }, [onClick, isNavigating]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const nativeTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('[PORTAL-TRAFFIC-BTN] ✅ Native TouchStart captured');
      handleAction();
    };

    const nativePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'mouse') {
        e.preventDefault();
        e.stopPropagation();
        console.log('[PORTAL-TRAFFIC-BTN] ✅ Native PointerDown captured');
        handleAction();
      }
    };

    button.addEventListener('touchstart', nativeTouchStart, { passive: false, capture: true });
    button.addEventListener('pointerdown', nativePointerDown, { capture: true });

    console.log('[PORTAL-TRAFFIC-BTN] 📎 Native listeners attached to portal button');

    return () => {
      button.removeEventListener('touchstart', nativeTouchStart, { capture: true });
      button.removeEventListener('pointerdown', nativePointerDown, { capture: true });
    };
  }, [handleAction]);

  if (!mounted || !isVisible || !isNavigating) return null;

  const portalContent = (
    <button
      ref={buttonRef}
      id="portal-traffic-btn"
      className={cn(
        "flex items-center justify-center rounded-md shadow-lg",
        showTraffic 
          ? "bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-400" 
          : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-300",
        "h-9 w-9 min-h-[36px] min-w-[36px]",
        "touch-manipulation select-none"
      )}
      style={{
        position: 'fixed',
        top: '170px',
        right: '16px',
        zIndex: 2147483647,
        pointerEvents: 'auto',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        transform: 'none',
        willChange: 'auto',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-3H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    </button>
  );

  return createPortal(portalContent, document.body);
}
