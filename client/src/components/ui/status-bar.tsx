/**
 * Status Bar Component for TruckNav Pro Mobile PWA
 * Provides a clean, minimal status bar for mobile devices
 * Optimized for readability and reduced height
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, Battery, Signal, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatusBarProps {
  className?: string;
  compact?: boolean; // For reduced height in mobile PWA
}

const StatusBar = memo(function StatusBar({ 
  className,
  compact = true // Default to compact mode for mobile
}: StatusBarProps) {
  const [time, setTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  return (
    <div 
      className={cn(
        "w-full flex items-center justify-between",
        "bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm",
        "border-b border-border/50",
        compact ? "h-8 px-3 py-1" : "h-10 px-4 py-2", // Reduced height in compact mode
        "text-xs font-medium",
        "z-[200]", // Ensure it's above other elements
        className
      )}
      data-testid="status-bar"
    >
      {/* Left side - Time */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span className="truncate">{formatTime(time)}</span>
      </div>
      
      {/* Center - App name (hidden on very small screens) */}
      <div className="hidden sm:block text-center text-muted-foreground truncate px-2">
        TruckNav Pro
      </div>
      
      {/* Right side - Status indicators */}
      <div className="flex items-center gap-2 text-muted-foreground">
        {/* Connection status */}
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Wifi className="h-3 w-3 text-green-600" />
          ) : (
            <Wifi className="h-3 w-3 text-red-600 opacity-50" />
          )}
        </div>
        
        {/* Signal strength (placeholder) */}
        <Signal className="h-3 w-3" />
        
        {/* Battery indicator (placeholder) */}
        <div className="flex items-center gap-0.5">
          <Battery className="h-3 w-3" />
          <span className="text-[10px]">100%</span>
        </div>
      </div>
    </div>
  );
});

export { StatusBar };
export default StatusBar;