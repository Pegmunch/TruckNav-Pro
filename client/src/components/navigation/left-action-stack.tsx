import { AlertCircle, Menu, Navigation, X, Mic, MicOff } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, type PointerEvent, type MouseEvent, type TouchEvent } from 'react';
import { Button } from '@/components/ui/button';
import { getVoiceCommandSystem, type IncidentType, type NavigationCommandType } from '@/lib/voice-commands';
import { hapticButtonPress } from '@/hooks/use-haptic-feedback';

// Detect iOS Safari for touch-specific handling
const isIOSSafari = typeof navigator !== 'undefined' && 
  /iPhone|iPad|iPod/.test(navigator.userAgent) && 
  !('MSStream' in window);

interface LeftActionStackProps {
  onNavigate?: () => void;
  onReportIncident?: () => void;
  onCancel?: () => void;
  onOpenMenu?: () => void;
  isNavigating: boolean;
  currentLocation?: { lat: number; lng: number };
  onVoiceIncidentReport?: (type: IncidentType, severity: 'low' | 'medium' | 'high') => void;
  onVoiceNavigationCommand?: (command: NavigationCommandType) => void;
  showMenuButton?: boolean;
}

export function LeftActionStack({
  onNavigate,
  onReportIncident,
  onCancel,
  onOpenMenu,
  isNavigating,
  currentLocation,
  onVoiceIncidentReport,
  onVoiceNavigationCommand,
  showMenuButton = true
}: LeftActionStackProps) {
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const voiceSystem = getVoiceCommandSystem();
  const isVoiceSupported = voiceSystem.isVoiceCommandSupported();

  const handleVoiceReport = useCallback((type: IncidentType, severity: 'low' | 'medium' | 'high') => {
    if (onVoiceIncidentReport) {
      onVoiceIncidentReport(type, severity);
    }
  }, [onVoiceIncidentReport]);

  const handleNavigationCommand = useCallback((command: NavigationCommandType) => {
    if (onVoiceNavigationCommand) {
      onVoiceNavigationCommand(command);
    }
  }, [onVoiceNavigationCommand]);

  useEffect(() => {
    if (isVoiceSupported && onVoiceIncidentReport) {
      voiceSystem.setIncidentReportCallback(handleVoiceReport);
    }
    if (isVoiceSupported && onVoiceNavigationCommand) {
      voiceSystem.setNavigationCommandCallback(handleNavigationCommand);
    }
  }, [isVoiceSupported, handleVoiceReport, handleNavigationCommand, voiceSystem, onVoiceIncidentReport, onVoiceNavigationCommand]);

  // Stop voice listening when navigation ends (cleanup only - no auto-start)
  // Voice commands now only start when user manually taps the microphone button
  useEffect(() => {
    if (!isNavigating && isVoiceListening) {
      voiceSystem.stopListening();
      setIsVoiceListening(false);
    }
  }, [isNavigating, isVoiceListening, voiceSystem]);

  const toggleVoiceListening = () => {
    if (isVoiceListening) {
      voiceSystem.stopListening();
      setIsVoiceListening(false);
    } else {
      const started = voiceSystem.startListening();
      setIsVoiceListening(started);
    }
  };

  // Per-button guard to prevent double-firing from both touch and click events
  const handledByTouchRef = useRef<Record<string, boolean>>({});
  
  // iOS Safari-optimized handler using onTouchStart for immediate response
  const createHandler = (callback: (() => void) | undefined, label: string) => ({
    // Use onTouchStart for iOS Safari - more reliable than onPointerDown
    onTouchStart: (e: TouchEvent<HTMLButtonElement>) => {
      console.log(`[LEFT-BTN-${label}] 🔵 Touch started (iOS: ${isIOSSafari})`);
      handledByTouchRef.current[label] = true;
      hapticButtonPress();
      console.log(`[LEFT-BTN-${label}] ✅ Pressed via touchStart`);
      callback?.();
      setTimeout(() => { handledByTouchRef.current[label] = false; }, 500);
    },
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      // Skip if already handled by touch
      if (handledByTouchRef.current[label]) {
        console.log(`[LEFT-BTN-${label}] ⏭️ Skipped pointerDown (already handled by touch)`);
        return;
      }
      console.log(`[LEFT-BTN-${label}] 🔵 PointerDown (${e.pointerType})`);
      handledByTouchRef.current[label] = true;
      hapticButtonPress();
      console.log(`[LEFT-BTN-${label}] ✅ Pressed via pointerDown`);
      callback?.();
      setTimeout(() => { handledByTouchRef.current[label] = false; }, 500);
    },
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      // Skip if already handled
      if (handledByTouchRef.current[label]) {
        console.log(`[LEFT-BTN-${label}] ⏭️ Skipped onClick (already handled)`);
        return;
      }
      console.log(`[LEFT-BTN-${label}] 🔵 Click event`);
      hapticButtonPress();
      console.log(`[LEFT-BTN-${label}] ✅ Pressed via onClick`);
      callback?.();
    }
  });

  // CRITICAL: Return null if no buttons would be visible
  // This prevents an empty container from blocking touch events
  const hasVisibleButtons = isNavigating || showMenuButton;
  
  if (!hasVisibleButtons) {
    return null;
  }
  
  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      {/* Navigation button - red navigation arrow - Only show when navigating */}
      {isNavigating && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onNavigate, 'NAV')}
          className="h-10 w-10 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 active:scale-95 text-white shadow-lg select-none touch-manipulation"
          style={{ touchAction: 'manipulation' }}
          data-testid="button-nav-left"
          data-tour-id="nav-button"
        >
          <Navigation className="h-5 w-5" />
        </Button>
      )}

      {/* Voice command button - microphone - Only show when navigating */}
      {isNavigating && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(toggleVoiceListening, 'VOICE')}
          disabled={!isVoiceSupported}
          className={`h-10 w-10 rounded-xl shadow-lg transition-all select-none touch-manipulation ${
            isVoiceSupported
              ? isVoiceListening 
                ? 'bg-green-500 hover:bg-green-600 animate-pulse' 
                : 'bg-purple-500 hover:bg-purple-600'
              : 'bg-gray-300 cursor-not-allowed opacity-50'
          } text-white active:scale-95`}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-voice-command"
          data-tour-id="voice-button"
          title={!isVoiceSupported ? 'Voice not supported' : isVoiceListening ? 'Voice commands active' : 'Tap to enable voice commands'}
        >
          {isVoiceListening ? (
            <Mic className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </Button>
      )}

      {/* Incident report button - orange - Only show when navigating */}
      {isNavigating && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onReportIncident, 'INCIDENT')}
          className="h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 active:scale-95 text-white shadow-lg select-none touch-manipulation"
          style={{ touchAction: 'manipulation' }}
          data-testid="button-report-incident"
          data-tour-id="incident-button"
        >
          <AlertCircle className="h-5 w-5" />
        </Button>
      )}

      {/* Cancel navigation button - red X - Only show when navigating */}
      {isNavigating && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onCancel, 'CANCEL')}
          className="h-10 w-10 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 active:scale-95 text-white shadow-lg select-none touch-manipulation"
          style={{ touchAction: 'manipulation' }}
          data-testid="button-cancel-nav"
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      {/* Menu button - blue hamburger at bottom - conditionally show */}
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onOpenMenu, 'MENU')}
          className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95 text-white shadow-lg select-none touch-manipulation"
          style={{ touchAction: 'manipulation' }}
          data-testid="button-menu"
          data-tour-id="menu-button"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
