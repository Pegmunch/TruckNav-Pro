/**
 * Driver Fatigue Alert System
 * Monitors driving time and provides alerts based on EU/UK regulations
 * 
 * EU Driving Time Regulations:
 * - Maximum 4.5 hours continuous driving before 45-min break
 * - Maximum 9 hours daily driving (can extend to 10 hours twice per week)
 * - Maximum 56 hours weekly driving
 * - Minimum 11 hours daily rest (can reduce to 9 hours three times per week)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  AlertTriangle, 
  Clock, 
  Coffee, 
  Moon, 
  Play, 
  Pause, 
  RotateCcw,
  Bell,
  Volume2,
  VolumeX,
  Timer,
  Activity,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Time constants (in milliseconds)
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// EU/UK Driving Regulations
const REGULATIONS = {
  BREAK_WARNING: 2 * HOUR, // Warn after 2 hours
  BREAK_REQUIRED: 4.5 * HOUR, // Must take break after 4.5 hours
  MIN_BREAK_DURATION: 45 * MINUTE, // Minimum 45 min break
  DAILY_LIMIT: 9 * HOUR, // 9 hours daily max (normal)
  DAILY_LIMIT_EXTENDED: 10 * HOUR, // 10 hours (twice per week allowed)
  WEEKLY_LIMIT: 56 * HOUR, // 56 hours weekly max
};

interface FatigueState {
  currentSessionStart: number | null;
  currentSessionDuration: number;
  totalDrivingToday: number;
  lastBreakEnd: number | null;
  isTracking: boolean;
  isPaused: boolean;
  alertLevel: 'none' | 'info' | 'warning' | 'critical';
}

interface DriverFatigueAlertProps {
  isNavigating?: boolean;
  onRequestBreak?: () => void;
  className?: string;
}

export function DriverFatigueAlert({ 
  isNavigating = false, 
  onRequestBreak,
  className 
}: DriverFatigueAlertProps) {
  const { toast } = useToast();
  const [state, setState] = useState<FatigueState>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('driver_fatigue_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Reset if it's a new day
      const today = new Date().toDateString();
      if (parsed.lastDate !== today) {
        return {
          currentSessionStart: null,
          currentSessionDuration: 0,
          totalDrivingToday: 0,
          lastBreakEnd: null,
          isTracking: false,
          isPaused: false,
          alertLevel: 'none',
        };
      }
      return {
        ...parsed,
        isTracking: false,
        isPaused: false,
      };
    }
    return {
      currentSessionStart: null,
      currentSessionDuration: 0,
      totalDrivingToday: 0,
      lastBreakEnd: null,
      isTracking: false,
      isPaused: false,
      alertLevel: 'none',
    };
  });

  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save state to localStorage
  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem('driver_fatigue_state', JSON.stringify({
      ...state,
      lastDate: today,
    }));
  }, [state]);

  // Calculate alert level based on current driving time
  const calculateAlertLevel = useCallback((sessionDuration: number, totalToday: number): FatigueState['alertLevel'] => {
    if (sessionDuration >= REGULATIONS.BREAK_REQUIRED) return 'critical';
    if (totalToday >= REGULATIONS.DAILY_LIMIT) return 'critical';
    if (sessionDuration >= REGULATIONS.BREAK_WARNING) return 'warning';
    if (totalToday >= REGULATIONS.DAILY_LIMIT * 0.8) return 'warning';
    if (sessionDuration >= REGULATIONS.BREAK_WARNING * 0.75) return 'info';
    return 'none';
  }, []);

  // Update timer
  useEffect(() => {
    if (state.isTracking && !state.isPaused) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          const now = Date.now();
          const sessionDuration = prev.currentSessionStart 
            ? now - prev.currentSessionStart 
            : 0;
          const alertLevel = calculateAlertLevel(sessionDuration, prev.totalDrivingToday + sessionDuration);
          
          // Show break dialog when critical
          if (alertLevel === 'critical' && prev.alertLevel !== 'critical') {
            setShowBreakDialog(true);
            // Play alert sound
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
          }
          
          return {
            ...prev,
            currentSessionDuration: sessionDuration,
            alertLevel,
          };
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isTracking, state.isPaused, soundEnabled, calculateAlertLevel]);

  // Auto-start/stop based on navigation
  useEffect(() => {
    if (isNavigating && !state.isTracking) {
      startTracking();
    }
  }, [isNavigating]);

  const startTracking = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSessionStart: Date.now(),
      currentSessionDuration: 0,
      isTracking: true,
      isPaused: false,
      alertLevel: 'none',
    }));
    toast({
      title: "Fatigue Tracking Started",
      description: "We'll monitor your driving time and alert you when to take breaks.",
    });
  }, [toast]);

  const pauseTracking = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: true,
      totalDrivingToday: prev.totalDrivingToday + prev.currentSessionDuration,
    }));
  }, []);

  const resumeTracking = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSessionStart: Date.now(),
      currentSessionDuration: 0,
      isPaused: false,
    }));
  }, []);

  const stopTracking = useCallback(() => {
    setState(prev => ({
      ...prev,
      isTracking: false,
      isPaused: false,
      totalDrivingToday: prev.totalDrivingToday + prev.currentSessionDuration,
      currentSessionDuration: 0,
      currentSessionStart: null,
    }));
  }, []);

  const takeBreak = useCallback(() => {
    setShowBreakDialog(false);
    pauseTracking();
    setState(prev => ({
      ...prev,
      lastBreakEnd: null, // Will be set when resuming
    }));
    if (onRequestBreak) {
      onRequestBreak();
    }
    toast({
      title: "Break Started",
      description: "Take at least 45 minutes rest. We'll remind you when you can resume.",
    });
  }, [onRequestBreak, pauseTracking, toast]);

  const resetDay = useCallback(() => {
    setState({
      currentSessionStart: null,
      currentSessionDuration: 0,
      totalDrivingToday: 0,
      lastBreakEnd: null,
      isTracking: false,
      isPaused: false,
      alertLevel: 'none',
    });
    localStorage.removeItem('driver_fatigue_state');
    toast({
      title: "Driving Time Reset",
      description: "Your daily driving time has been reset to zero.",
    });
  }, [toast]);

  // Format time helper
  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / HOUR);
    const minutes = Math.floor((ms % HOUR) / MINUTE);
    const seconds = Math.floor((ms % MINUTE) / 1000);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  // Calculate progress percentages
  const sessionProgress = (state.currentSessionDuration / REGULATIONS.BREAK_REQUIRED) * 100;
  const dailyProgress = ((state.totalDrivingToday + state.currentSessionDuration) / REGULATIONS.DAILY_LIMIT) * 100;

  // Get status color
  const getStatusColor = (level: FatigueState['alertLevel']) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'warning': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
      case 'info': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      default: return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    }
  };

  return (
    <>
      {/* Hidden audio for alerts */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleC8UFm25zpJdLg..." type="audio/wav" />
      </audio>

      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Driver Fatigue Monitor
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8"
                data-testid="button-toggle-fatigue-sound"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetDay}
                className="h-8 w-8"
                data-testid="button-reset-fatigue"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            EU/UK driving time regulations monitoring
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div className={cn(
            "p-3 rounded-lg flex items-center justify-between",
            getStatusColor(state.alertLevel)
          )}>
            <div className="flex items-center gap-2">
              {state.alertLevel === 'critical' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : state.alertLevel === 'warning' ? (
                <Bell className="w-5 h-5" />
              ) : state.isTracking ? (
                <Timer className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              <span className="font-medium">
                {state.alertLevel === 'critical' 
                  ? 'Break Required!' 
                  : state.alertLevel === 'warning'
                    ? 'Consider a Break'
                    : state.isTracking
                      ? state.isPaused ? 'Tracking Paused' : 'Tracking Active'
                      : 'Ready to Track'}
              </span>
            </div>
            {state.isTracking && !state.isPaused && (
              <Badge variant="outline" className="bg-white/50">
                {formatTime(state.currentSessionDuration)}
              </Badge>
            )}
          </div>

          {/* Current Session Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Session</span>
              <span className="font-medium">
                {formatTime(state.currentSessionDuration)} / {formatTime(REGULATIONS.BREAK_REQUIRED)}
              </span>
            </div>
            <Progress 
              value={Math.min(sessionProgress, 100)} 
              className={cn(
                "h-2",
                sessionProgress > 80 && "bg-red-200 [&>div]:bg-red-500"
              )}
            />
          </div>

          {/* Daily Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Today's Driving</span>
              <span className="font-medium">
                {formatTime(state.totalDrivingToday + state.currentSessionDuration)} / {formatTime(REGULATIONS.DAILY_LIMIT)}
              </span>
            </div>
            <Progress 
              value={Math.min(dailyProgress, 100)} 
              className={cn(
                "h-2",
                dailyProgress > 80 && "bg-amber-200 [&>div]:bg-amber-500"
              )}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2 pt-2">
            {!state.isTracking ? (
              <Button 
                onClick={startTracking} 
                className="flex-1"
                data-testid="button-start-fatigue-tracking"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Tracking
              </Button>
            ) : state.isPaused ? (
              <>
                <Button 
                  onClick={resumeTracking} 
                  className="flex-1"
                  data-testid="button-resume-fatigue-tracking"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
                <Button 
                  variant="outline" 
                  onClick={stopTracking}
                  data-testid="button-stop-fatigue-tracking"
                >
                  Stop
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={pauseTracking} 
                  className="flex-1"
                  data-testid="button-pause-fatigue-tracking"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={takeBreak}
                  data-testid="button-take-break"
                >
                  <Coffee className="w-4 h-4 mr-2" />
                  Break
                </Button>
              </>
            )}
          </div>

          {/* Regulation Tips */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Max 4.5 hours before 45-min break
            </p>
            <p className="flex items-center gap-1">
              <Moon className="w-3 h-3" />
              Max 9 hours daily driving
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Break Required Dialog */}
      <Dialog open={showBreakDialog} onOpenChange={setShowBreakDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              Break Required!
            </DialogTitle>
            <DialogDescription className="text-base">
              You've been driving for {formatTime(state.currentSessionDuration)}. 
              EU regulations require a minimum 45-minute break after 4.5 hours of driving.
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Safety Warning</AlertTitle>
            <AlertDescription>
              Driving while fatigued significantly increases accident risk. 
              Please take a proper rest break.
            </AlertDescription>
          </Alert>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setShowBreakDialog(false)}
              className="w-full sm:w-auto"
            >
              Dismiss (5 min)
            </Button>
            <Button 
              onClick={takeBreak}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-break"
            >
              <Coffee className="w-4 h-4 mr-2" />
              Take Break Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DriverFatigueAlert;
