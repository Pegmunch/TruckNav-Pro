import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Volume2, VolumeX } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { type MobileNotificationData } from "./mobile-notification-system";

interface MobileNotificationCardProps {
  notification: MobileNotificationData;
  onDismiss: (id: string) => void;
  onAction?: (action: () => void) => void;
  getIcon: (type: MobileNotificationData['type']) => React.ReactNode;
  index: number;
  total: number;
}

export function MobileNotificationCard({
  notification,
  onDismiss,
  onAction,
  getIcon,
  index,
  total,
}: MobileNotificationCardProps) {
  const isMobile = useIsMobile();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const lastX = useRef<number>(0);
  
  // Auto-dismiss timer
  useEffect(() => {
    if (notification.ttl) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.ttl);
      
      return () => clearTimeout(timer);
    }
  }, [notification.ttl]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(notification.id), 300); // Wait for animation
  };

  // Touch event handlers for swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    startX.current = touch.clientX;
    lastX.current = touch.clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    
    // Only allow horizontal swipe
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
      setDragOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging) return;
    
    const threshold = isMobile ? 80 : 120;
    
    if (Math.abs(dragOffset) > threshold) {
      handleDismiss();
    } else {
      // Snap back
      setDragOffset(0);
    }
    
    setIsDragging(false);
  };

  // Mouse event handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    
    startX.current = e.clientX;
    lastX.current = e.clientX;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isMobile || !isDragging) return;
    
    const deltaX = e.clientX - startX.current;
    setDragOffset(deltaX);
  };

  const handleMouseUp = () => {
    if (isMobile || !isDragging) return;
    
    const threshold = 120;
    
    if (Math.abs(dragOffset) > threshold) {
      handleDismiss();
    } else {
      setDragOffset(0);
    }
    
    setIsDragging(false);
  };

  // Add/remove mouse event listeners
  useEffect(() => {
    if (isDragging && !isMobile) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isMobile]);

  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'high': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'medium': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'low': return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
      default: return 'bg-background';
    }
  };

  const getPriorityBadgeColor = () => {
    switch (notification.priority) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-blue-600 text-white';
      case 'low': return 'bg-gray-600 text-white';
      default: return 'bg-muted';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card
      ref={cardRef}
      className={cn(
        "mobile-notification-card relative overflow-hidden transition-all duration-300 ease-out",
        "select-none cursor-pointer",
        getPriorityColor(),
        isDragging ? "scale-105 shadow-lg" : "hover:scale-102",
        !isVisible && "opacity-0 scale-95 translate-y-[-20px]",
        // Mobile-optimized sizing
        isMobile ? [
          "mx-2 mb-2",
          "max-w-[calc(100vw-16px)]",
          "min-h-[72px]",
        ] : [
          "mx-4 mb-2", 
          "max-w-[380px]",
          "min-h-[80px]",
        ]
      )}
      style={{
        transform: `translateX(${dragOffset}px) ${isDragging ? 'scale(1.05)' : ''}`,
        transition: isDragging ? 'none' : 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1000 + index, // Ensure proper stacking
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      data-testid={`notification-card-${notification.id}`}
    >
      <CardContent className={cn(
        "p-2 flex items-center space-x-2",
        isMobile ? "min-h-[44px]" : "min-h-[48px]"
      )}>
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 rounded-full p-1 bg-background/80",
          isMobile ? "w-6 h-6" : "w-8 h-8"
        )}>
          {getIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center justify-between">
            <h4 className={cn(
              "font-medium text-foreground truncate",
              isMobile ? "text-xs" : "text-sm"
            )} data-testid={`notification-title-${notification.id}`}>
              {notification.title}
            </h4>
            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
              {/* Priority badge */}
              {notification.priority !== 'low' && (
                <Badge 
                  className={cn(
                    "text-xs font-medium",
                    getPriorityBadgeColor(),
                    isMobile ? "px-1.5 py-0.5" : "px-2 py-1"
                  )}
                >
                  {notification.priority.toUpperCase()}
                </Badge>
              )}
              
              {/* Voice indicator */}
              {notification.soundEnabled && (
                <div className="text-muted-foreground">
                  {notification.voiceAnnouncement ? (
                    <Volume2 className="w-3 h-3" />
                  ) : (
                    <VolumeX className="w-3 h-3" />
                  )}
                </div>
              )}
            </div>
          </div>
          
          <p className={cn(
            "text-muted-foreground leading-tight",
            isMobile ? "text-xs line-clamp-1" : "text-xs line-clamp-1"
          )} data-testid={`notification-description-${notification.id}`}>
            {notification.description}
          </p>

          {/* Action buttons */}
          {notification.actions && notification.actions.length > 0 && (
            <div className={cn(
              "flex space-x-2 pt-1",
              isMobile ? "flex-col space-y-1 space-x-0" : "flex-row"
            )}>
              {notification.actions.slice(0, isMobile ? 2 : 3).map((action, actionIndex) => (
                <Button
                  key={actionIndex}
                  variant={action.variant || 'outline'}
                  size="sm"
                  className={cn(
                    "flex-1 text-xs",
                    isMobile ? "h-8 min-h-[32px]" : "h-7"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.action();
                    if (onAction) onAction(action.action);
                  }}
                  data-testid={`notification-action-${notification.id}-${actionIndex}`}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex-shrink-0 hover:bg-background/80",
            isMobile ? "w-6 h-6 p-0" : "w-7 h-7 p-0"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          data-testid={`notification-dismiss-${notification.id}`}
        >
          <X className={cn(isMobile ? "w-3 h-3" : "w-4 h-4")} />
        </Button>
      </CardContent>

      {/* Swipe indicator */}
      {isDragging && Math.abs(dragOffset) > 20 && (
        <div className={cn(
          "absolute inset-y-0 flex items-center justify-center",
          "text-muted-foreground font-medium text-xs",
          dragOffset > 0 ? "left-4" : "right-4"
        )}>
          {Math.abs(dragOffset) > 80 ? "Release to dismiss" : "Swipe to dismiss"}
        </div>
      )}

      {/* Progress bar for auto-dismiss */}
      {notification.ttl && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted-foreground/20">
          <div 
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{
              animation: `shrink ${notification.ttl}ms linear`,
              transformOrigin: 'left center',
            }}
          />
        </div>
      )}
    </Card>
  );
}

interface MobileNotificationStackProps {
  notifications: Array<MobileNotificationData & { 
    shown: boolean; 
    dismissed: boolean; 
    createdAt: number; 
  }>;
  onDismiss: (id: string) => void;
  getIcon: (type: MobileNotificationData['type']) => React.ReactNode;
  dndEnabled: boolean;
  isNavigating: boolean;
  hasNavigationGuidance?: boolean; // New prop to indicate if navigation guidance is visible
}

export function MobileNotificationStack({
  notifications,
  onDismiss,
  getIcon,
  dndEnabled,
  isNavigating,
  hasNavigationGuidance = false,
}: MobileNotificationStackProps) {
  const isMobile = useIsMobile();
  const stackRef = useRef<HTMLDivElement>(null);
  
  // Error boundary guards
  if (!notifications || !Array.isArray(notifications)) {
    if (import.meta.env.DEV) {
      console.warn('[MobileNotificationStack] Invalid notifications array provided');
    }
    return null;
  }
  
  if (typeof onDismiss !== 'function') {
    if (import.meta.env.DEV) {
      console.warn('[MobileNotificationStack] onDismiss prop is not a function');
    }
    return null;
  }
  
  // Filter and sort notifications with safe access
  const activeNotifications = useMemo(() => {
    try {
      return notifications
        .filter(n => n && typeof n === 'object' && !n.dismissed)
        .sort((a, b) => {
          // Sort by priority first, then by timestamp
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority] || 0;
          const bPriority = priorityOrder[b.priority] || 0;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority; // Higher priority first
          }
          
          return (b.timestamp || 0) - (a.timestamp || 0); // Newer first
        });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[MobileNotificationStack] Error filtering notifications:', error);
      }
      return [];
    }
  }, [notifications]);

  // Calculate dynamic positioning with enhanced logic using useMemo to prevent infinite re-renders
  const positioningStyles = useMemo(() => {
    const baseOffset = isMobile ? 8 : 16;
    let dynamicOffset = baseOffset;
    
    if (isMobile) {
      // Account for navigation guidance card height (approx 72px)
      if (hasNavigationGuidance && isNavigating) {
        dynamicOffset += 80; // Navigation guidance + margin
      } else if (isNavigating) {
        dynamicOffset += 16; // Navigation bar space
      }
      
      // Account for status bar and notch on different devices
      dynamicOffset += 8; // Additional safe spacing
    }
    
    // Only log when positioning actually changes
    return {
      top: isMobile ? `calc(env(safe-area-inset-top, 20px) + ${dynamicOffset}px)` : '16px',
      left: isMobile ? '0px' : 'auto',
      right: isMobile ? '0px' : '16px',
      zIndex: 200, // Higher than most UI elements but below modals (300+)
      maxWidth: isMobile ? '100vw' : '400px',
    };
  }, [isMobile, hasNavigationGuidance, isNavigating]);

  // Diagnostic logging for positioning - only when notifications change
  useEffect(() => {
    if (activeNotifications.length > 0 && stackRef.current) {
      const rect = stackRef.current.getBoundingClientRect();
      
      // Only check for overlaps if we have navigation guidance
      if (hasNavigationGuidance) {
        const guidanceElement = document.querySelector('[data-testid="next-maneuver-card"]');
        if (guidanceElement) {
          const guidanceRect = guidanceElement.getBoundingClientRect();
          const overlap = rect.top < (guidanceRect.bottom + 8);
          if (overlap && import.meta.env.DEV) {
            console.warn(`[MobileNotificationStack] Overlap detected - adjusting position`);
          }
        }
      }
    }
  }, [activeNotifications.length]);

  if (activeNotifications.length === 0) {
    return null;
  }

  return (
    <div 
      ref={stackRef}
      className={cn(
        "mobile-notification-stack fixed flex flex-col",
        "transition-all duration-300 ease-out",
        // Responsive width handling
        isMobile ? "px-2" : "w-auto"
      )}
      style={positioningStyles}
      data-testid="mobile-notification-stack"
    >
      {/* DND indicator */}
      {dndEnabled && (
        <div className={cn(
          "bg-muted/90 text-muted-foreground rounded-lg px-3 py-1 mb-2",
          "text-xs font-medium flex items-center justify-center",
          "border border-muted",
          isMobile ? "mx-2" : "mx-0"
        )}>
          <VolumeX className="w-3 h-3 mr-1" />
          Do Not Disturb - Critical only
        </div>
      )}
      
      {/* Notification cards */}
      {activeNotifications.slice(0, isMobile ? 2 : 3).map((notification, index) => (
        <MobileNotificationCard
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          getIcon={getIcon}
          index={index}
          total={activeNotifications.length}
        />
      ))}
      
      {/* Show count of additional notifications */}
      {activeNotifications.length > (isMobile ? 2 : 3) && (
        <div className={cn(
          "bg-muted/90 text-muted-foreground rounded-lg px-3 py-2",
          "text-xs font-medium text-center",
          "border border-muted",
          isMobile ? "mx-2" : "mx-0"
        )}>
          +{activeNotifications.length - (isMobile ? 2 : 3)} more notifications
        </div>
      )}
    </div>
  );
}

// Add CSS animations and enhanced mobile styles
const styles = `
@keyframes shrink {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

@keyframes slideInFromTop {
  from { 
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideOutToTop {
  from { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to { 
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-notification-card {
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  animation: slideInFromTop 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.mobile-notification-card.dismissing {
  animation: slideOutToTop 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.mobile-notification-stack {
  pointer-events: none;
  /* Ensure proper stacking above map but below overlays */
  z-index: 200;
}

.mobile-notification-stack > * {
  pointer-events: auto;
}

/* Mobile-specific safe area adjustments */
@supports (padding: env(safe-area-inset-top)) {
  .mobile-notification-stack {
    /* Enhanced safe area support with fallbacks */
    padding-top: max(env(safe-area-inset-top, 0px), 8px);
  }
}

/* High-contrast mode support */
@media (prefers-contrast: high) {
  .mobile-notification-card {
    border-width: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .mobile-notification-card,
  .mobile-notification-stack {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}