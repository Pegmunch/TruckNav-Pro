import { useEffect, useState } from "react";

interface VerticalRouteIndicatorProps {
  isNavigating: boolean;
  className?: string;
}

export function VerticalRouteIndicator({ isNavigating, className }: VerticalRouteIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isNavigating) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [isNavigating]);

  if (!isNavigating || !isVisible) return null;

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '6px',
        height: '60vh',
        background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0) 0%, rgba(59, 130, 246, 0.95) 20%, rgba(59, 130, 246, 1) 50%, rgba(59, 130, 246, 0.95) 80%, rgba(59, 130, 246, 0) 100%)',
        pointerEvents: 'none',
        zIndex: 900,
        borderRadius: '3px',
        boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
      }}
      data-testid="vertical-route-indicator"
    />
  );
}
