import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { X, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import UnifiedSearchPanel from "./unified-search-panel";
import { type VehicleProfile, type Route, type Facility } from "@shared/schema";

interface RightWidgetProps {
  // Panel state
  isOpen: boolean;
  onClose: () => void;
  
  // Search functionality - pass through to UnifiedSearchPanel
  coordinates?: { lat: number; lng: number };
  onSelectFacility?: (facility: Facility) => void;
  onNavigateToLocation?: (location: string) => void;
  
  // Route planning - pass through to UnifiedSearchPanel
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onStartNavigation: () => void;
  currentRoute: Route | null;
  
  // Auto-close configuration
  autoCloseDelay?: number; // in milliseconds, default 25000 (25 seconds)
  
  // Styling
  className?: string;
}

const RightWidget = memo(function RightWidget({
  isOpen,
  onClose,
  coordinates,
  onSelectFacility,
  onNavigateToLocation,
  onFromLocationChange,
  onToLocationChange,
  onStartNavigation,
  currentRoute,
  autoCloseDelay = 25000, // 25 seconds default
  className
}: RightWidgetProps) {
  const isMobile = useIsMobile();
  const widgetRef = useRef<HTMLDivElement>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  // Pin state - stored in localStorage
  const [isPinned, setIsPinned] = useState(() => {
    const stored = localStorage.getItem('rightWidget_pinned');
    return stored === 'true';
  });
  
  // Activity tracking state
  const [hasActivity, setHasActivity] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Update localStorage when pin state changes
  useEffect(() => {
    localStorage.setItem('rightWidget_pinned', isPinned.toString());
  }, [isPinned]);

  // Activity tracking functions
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setHasActivity(true);
    
    // Clear activity flag after a short delay
    setTimeout(() => setHasActivity(false), 1000);
  }, []);

  // Reset auto-close timer
  const resetAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    // Don't set timer if pinned, mobile, or inputs are focused
    if (isPinned || isMobile || isInputFocused) {
      return;
    }

    autoCloseTimerRef.current = setTimeout(() => {
      onClose();
    }, autoCloseDelay);
  }, [isPinned, isMobile, isInputFocused, autoCloseDelay, onClose]);

  // Setup activity event listeners
  useEffect(() => {
    if (!isOpen || !widgetRef.current) return;

    const widget = widgetRef.current;
    
    const handleActivity = (event: Event) => {
      recordActivity();
      resetAutoCloseTimer();
    };

    // Track various activity types
    const events = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach(event => {
      widget.addEventListener(event, handleActivity, { passive: true });
    });

    // Track input focus/blur events
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        setIsInputFocused(true);
        recordActivity();
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        // Delay to check if focus moved to another input
        setTimeout(() => {
          const activeElement = document.activeElement as HTMLElement;
          const isStillInputFocused = widget.contains(activeElement) && 
            (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.contentEditable === 'true');
          setIsInputFocused(isStillInputFocused);
          
          if (!isStillInputFocused) {
            resetAutoCloseTimer();
          }
        }, 100);
      }
    };

    widget.addEventListener('focusin', handleFocusIn);
    widget.addEventListener('focusout', handleFocusOut);

    // Initial timer setup
    resetAutoCloseTimer();

    return () => {
      events.forEach(event => {
        widget.removeEventListener(event, handleActivity);
      });
      widget.removeEventListener('focusin', handleFocusIn);
      widget.removeEventListener('focusout', handleFocusOut);
      
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [isOpen, resetAutoCloseTimer, recordActivity]);

  // ESC key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isOpen, onClose]);

  // Focus management - focus the widget when it opens
  useEffect(() => {
    if (isOpen && widgetRef.current) {
      // Focus the first focusable element or the container itself
      const focusableElement = widgetRef.current.querySelector(
        'input, textarea, button, select, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (focusableElement) {
        setTimeout(() => focusableElement.focus(), 100);
      } else {
        widgetRef.current.focus();
      }
    }
  }, [isOpen]);

  // Handle pin toggle
  const handlePinToggle = useCallback(() => {
    setIsPinned(!isPinned);
    recordActivity();
  }, [isPinned, recordActivity]);

  // Don't render on mobile - use existing drawer behavior
  if (isMobile) {
    return null;
  }

  return (
    <>
      {/* Backdrop - only show when open, no overlay for desktop */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ backgroundColor: 'transparent' }} // No dark overlay for desktop
        onClick={onClose}
        data-testid="right-widget-backdrop"
      />

      {/* Right Widget Panel */}
      <div
        ref={widgetRef}
        className={cn(
          "fixed right-0 top-0 h-screen z-50",
          "w-[360px] max-w-[90vw]", // ~360px width as specified
          "bg-background border-l border-border shadow-xl", // Solid background, no backdrop blur
          "transition-transform duration-300 ease-out",
          "flex flex-col",
          // Slide-in animation: translate-x-full → translate-x-0
          isOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
        tabIndex={-1}
        data-testid="right-widget-panel"
        style={{
          // Ensure widget appears above other elements
          zIndex: 50
        }}
      >
        {/* Widget Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center space-x-2">
            <h2 className="font-semibold text-foreground">Search & Navigation</h2>
            {hasActivity && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Pin/Unpin Button */}
            <Button
              variant={isPinned ? "default" : "ghost"}
              size="icon"
              onClick={handlePinToggle}
              className="scalable-control-button"
              title={isPinned ? "Unpin widget" : "Pin widget open"}
              data-testid="button-pin-right-widget"
            >
              {isPinned ? (
                <Pin className="w-4 h-4" />
              ) : (
                <PinOff className="w-4 h-4" />
              )}
            </Button>
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="scalable-control-button"
              title="Close search panel (ESC)"
              data-testid="button-close-right-widget"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Widget Content - UnifiedSearchPanel */}
        <div className="flex-1 overflow-hidden">
          <UnifiedSearchPanel
            isOpen={isOpen}
            onClose={onClose}
            coordinates={coordinates}
            onSelectFacility={onSelectFacility}
            onNavigateToLocation={onNavigateToLocation}
            onFromLocationChange={onFromLocationChange}
            onToLocationChange={onToLocationChange}
            onStartNavigation={onStartNavigation}
            currentRoute={currentRoute}
            className="h-full border-0 shadow-none bg-transparent" // Remove conflicting styles
          />
        </div>

        {/* Activity Indicator - shown when auto-close timer is active */}
        {!isPinned && !isInputFocused && isOpen && (
          <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-muted/80 px-2 py-1 rounded">
            Auto-close in {Math.ceil(autoCloseDelay / 1000)}s
          </div>
        )}
      </div>
    </>
  );
});

export default RightWidget;