import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, X, Coffee } from 'lucide-react';

interface WorkingTimeWarningProps {
  onDismiss: () => void;
}

export function WorkingTimeWarning({ onDismiss }: WorkingTimeWarningProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-md border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/30 shadow-2xl animate-in fade-in zoom-in duration-300">
        <CardHeader className="pb-3 bg-orange-500 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
            Working Time Reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-4">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-800/50 flex items-center justify-center">
                <Coffee className="w-10 h-10 text-orange-600" />
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-orange-800 dark:text-orange-200 mb-2">
                Break Required Soon
              </h3>
              <p className="text-lg font-semibold text-orange-700 dark:text-orange-300">
                Working Time Needs to be taken within next hour
              </p>
            </div>
            
            <p className="text-sm text-muted-foreground">
              As per Working Time Directive regulations, you must take a break after 4.5 hours of driving.
              Please plan your rest stop.
            </p>
            
            <Button
              onClick={onDismiss}
              className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700 text-white"
            >
              <X className="w-5 h-5 mr-2" />
              Acknowledge & Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook to manage working time tracking
export function useWorkingTimeTracker() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const WORKING_TIME_LIMIT = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
  const WARNING_THRESHOLD = 4 * 60 * 60 * 1000; // Show warning at 4 hours (1 hour before limit)
  
  const checkWorkingTime = useCallback(() => {
    const startTimeStr = localStorage.getItem('workingTimeStart');
    if (!startTimeStr) {
      setShowWarning(false);
      setTimeRemaining(null);
      return;
    }
    
    const startTime = new Date(startTimeStr).getTime();
    const now = Date.now();
    const elapsed = now - startTime;
    const remaining = WORKING_TIME_LIMIT - elapsed;
    
    setTimeRemaining(remaining);
    
    // Show warning when 4 hours have passed (1 hour before the 5-hour limit)
    if (elapsed >= WARNING_THRESHOLD && remaining > 0) {
      const warningDismissed = localStorage.getItem('workingTimeWarningDismissed');
      const dismissedAt = warningDismissed ? new Date(warningDismissed).getTime() : 0;
      
      // Only show warning if not dismissed in the last 30 minutes
      if (now - dismissedAt > 30 * 60 * 1000) {
        setShowWarning(true);
      }
    }
    
    // Clear if time limit exceeded (they should have taken a break)
    if (elapsed >= WORKING_TIME_LIMIT) {
      localStorage.removeItem('workingTimeStart');
      localStorage.removeItem('workingTimeVehicle');
      localStorage.removeItem('workingTimeWarningDismissed');
      setShowWarning(false);
      setTimeRemaining(null);
    }
  }, []);
  
  useEffect(() => {
    // Check immediately
    checkWorkingTime();
    
    // Check every minute
    const interval = setInterval(checkWorkingTime, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [checkWorkingTime]);
  
  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    localStorage.setItem('workingTimeWarningDismissed', new Date().toISOString());
  }, []);
  
  const resetWorkingTime = useCallback(() => {
    localStorage.removeItem('workingTimeStart');
    localStorage.removeItem('workingTimeVehicle');
    localStorage.removeItem('workingTimeWarningDismissed');
    setShowWarning(false);
    setTimeRemaining(null);
  }, []);
  
  const formatTimeRemaining = useCallback(() => {
    if (timeRemaining === null) return null;
    const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  }, [timeRemaining]);
  
  return {
    showWarning,
    dismissWarning,
    resetWorkingTime,
    timeRemaining,
    formatTimeRemaining
  };
}
