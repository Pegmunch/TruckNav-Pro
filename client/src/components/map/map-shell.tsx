import { useEffect, useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface MapShellProps {
  children: React.ReactNode;
  className?: string;
  onSizeChange?: (dimensions: { width: number; height: number }) => void;
  id?: string;
}

/**
 * MapShell - Unified wrapper for consistent map sizing across all devices
 * Solves the "squashed" mobile view and ensures proper safe area handling
 */
export function MapShell({ children, className, onSizeChange, id = 'map-container' }: MapShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Debounced resize handler for map invalidation
  const debouncedResize = useCallback((entries: ResizeObserverEntry[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        const newDimensions = { width, height };
        setDimensions(newDimensions);
        
        // Update CSS custom properties for HUD calculations
        document.documentElement.style.setProperty('--map-width', `${width}px`);
        document.documentElement.style.setProperty('--map-height', `${height}px`);
        
        onSizeChange?.(newDimensions);
        
        // Trigger Leaflet map invalidation if available
        const mapContainer = containerRef.current?.querySelector('.leaflet-container');
        if (mapContainer && (window as any).mapInstance) {
          try {
            (window as any).mapInstance.invalidateSize();
            console.log('📐 Map size invalidated due to container resize:', newDimensions);
          } catch (error) {
            console.warn('📐 Failed to invalidate map size:', error);
          }
        }
      }
    }, 150); // Debounce resize events
  }, [onSizeChange]);

  // Set up ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    resizeObserverRef.current = new ResizeObserver(debouncedResize);
    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [debouncedResize]);

  // Handle orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      // Give time for the orientation to settle
      setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const newDimensions = { width: rect.width, height: rect.height };
          setDimensions(newDimensions);
          onSizeChange?.(newDimensions);
          
          // Force map invalidation after orientation change
          const mapContainer = containerRef.current?.querySelector('.leaflet-container');
          if (mapContainer && (window as any).mapInstance) {
            try {
              (window as any).mapInstance.invalidateSize(true);
              console.log('📐 Map size invalidated due to orientation change:', newDimensions);
            } catch (error) {
              console.warn('📐 Failed to invalidate map size after orientation change:', error);
            }
          }
        }
      }, 250);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    // Also listen for screen orientation API changes
    if (screen?.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (screen?.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
    };
  }, [onSizeChange]);

  // Calculate dynamic heights based on overlays
  useEffect(() => {
    const updateOverlayHeights = () => {
      const hudElement = document.querySelector('.professional-nav-hud');
      const bottomBarElement = document.querySelector('.bottom-nav-safe');
      const headerElement = document.querySelector('.nav-header');

      const hudHeight = hudElement?.getBoundingClientRect().height || 0;
      const bottomBarHeight = bottomBarElement?.getBoundingClientRect().height || 0;
      const headerHeight = headerElement?.getBoundingClientRect().height || 0;

      // Update CSS custom properties
      document.documentElement.style.setProperty('--hud-height', `${hudHeight}px`);
      document.documentElement.style.setProperty('--bottom-bar-height', `${bottomBarHeight}px`);
      document.documentElement.style.setProperty('--nav-header-height', `${headerHeight}px`);
    };

    // Initial calculation
    updateOverlayHeights();

    // Recalculate when components mount/unmount
    const observer = new MutationObserver(updateOverlayHeights);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      id={id}
      className={cn(
        'map-shell',
        'relative w-full h-full overflow-visible',
        className
      )}
      data-testid="map-shell"
    >
      {children}
    </div>
  );
}

/**
 * Hook for accessing map shell dimensions and resize events
 */
export function useMapShell() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkMapShell = () => {
      const mapShell = document.getElementById('map-container');
      if (mapShell) {
        const rect = mapShell.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
        setIsReady(true);
      }
    };

    checkMapShell();
    
    const interval = setInterval(checkMapShell, 1000);
    return () => clearInterval(interval);
  }, []);

  const invalidateMap = useCallback(() => {
    if ((window as any).mapInstance) {
      try {
        (window as any).mapInstance.invalidateSize(true);
        console.log('📐 Map manually invalidated');
      } catch (error) {
        console.warn('📐 Failed to manually invalidate map:', error);
      }
    }
  }, []);

  return {
    dimensions,
    isReady,
    invalidateMap
  };
}