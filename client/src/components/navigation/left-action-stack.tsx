import { AlertCircle, Menu, Navigation, X, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, type PointerEvent, type MouseEvent, type TouchEvent } from 'react';
import { Button } from '@/components/ui/button';
import { getVoiceCommandSystem, type IncidentType, type NavigationCommandType } from '@/lib/voice-commands';
import { hapticButtonPress } from '@/hooks/use-haptic-feedback';
import { navigationVoice } from '@/lib/navigation-voice';
import { getAlertSoundsService } from '@/lib/alert-sounds';

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
  isVisible?: boolean;
}

const MUTE_STATE_KEY = "trucknav_mute_all_alerts";

export function LeftActionStack({
  onNavigate,
  onReportIncident,
  onCancel,
  onOpenMenu,
  isNavigating,
  currentLocation,
  onVoiceIncidentReport,
  onVoiceNavigationCommand,
  showMenuButton = true,
  isVisible = true
}: LeftActionStackProps) {
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MUTE_STATE_KEY) === "true";
  });
  const voiceSystem = getVoiceCommandSystem();
  const isVoiceSupported = voiceSystem.isVoiceCommandSupported();

  useEffect(() => {
    if (isMuted) {
      navigationVoice.setEnabled(false);
      getAlertSoundsService().setGlobalMute(true);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const newState = !isMuted;
    setIsMuted(newState);
    localStorage.setItem(MUTE_STATE_KEY, String(newState));
    navigationVoice.setEnabled(!newState);
    getAlertSoundsService().setGlobalMute(newState);
  }, [isMuted]);

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
      e.preventDefault();
      e.stopPropagation();
      console.log(`[LEFT-BTN-${label}] 🔵 Touch started (iOS: ${isIOSSafari})`);
      handledByTouchRef.current[label] = true;
      hapticButtonPress();
      console.log(`[LEFT-BTN-${label}] ✅ Pressed via touchStart`);
      callback?.();
      setTimeout(() => { handledByTouchRef.current[label] = false; }, 500);
    },
    onTouchEnd: (e: TouchEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
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
      e.preventDefault();
      e.stopPropagation();
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
  
  console.log('[LEFT-STACK-RENDER]', { isNavigating, showMenuButton, hasVisibleButtons, hasOnReportIncident: !!onReportIncident });
  
  if (!hasVisibleButtons) {
    return null;
  }
  
  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      {/* Navigation button - red navigation arrow - ALWAYS VISIBLE during navigation */}
      {isNavigating && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onNavigate, 'NAV')}
          className="h-10 w-10 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 active:scale-95 text-white shadow-lg select-none touch-manipulation pointer-events-auto"
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-nav-left"
          data-tour-id="nav-button"
        >
          <Navigation className="h-5 w-5" />
        </Button>
      )}

      {/* Voice command button - microphone - ALWAYS VISIBLE during navigation */}
      {isNavigating && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(toggleVoiceListening, 'VOICE')}
          disabled={!isVoiceSupported}
          className={`h-10 w-10 rounded-xl shadow-lg select-none touch-manipulation pointer-events-auto ${
            isVoiceSupported
              ? isVoiceListening 
                ? 'bg-green-500 hover:bg-green-600 animate-pulse' 
                : 'bg-purple-500 hover:bg-purple-600'
              : 'bg-gray-300 cursor-not-allowed opacity-50'
          } text-white active:scale-95`}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
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

      {/* Mute All Alerts button - gray/red toggle - ALWAYS VISIBLE during navigation */}
      {isNavigating && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(toggleMute, 'MUTE')}
          className={`h-10 w-10 rounded-xl shadow-lg select-none touch-manipulation pointer-events-auto ${
            isMuted 
              ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' 
              : 'bg-gray-500 hover:bg-gray-600 active:bg-gray-700'
          } text-white active:scale-95`}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-mute-alerts"
          data-tour-id="mute-button"
          title={isMuted ? 'Tap to unmute alerts' : 'Tap to mute all alerts'}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </Button>
      )}

      {/* Incident report button - orange - ALWAYS VISIBLE during navigation */}
      {isNavigating && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onReportIncident, 'INCIDENT')}
          className="h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 active:scale-95 text-white shadow-lg select-none touch-manipulation pointer-events-auto"
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-report-incident"
          data-tour-id="incident-button"
        >
          <AlertCircle className="h-5 w-5" />
        </Button>
      )}

      {/* Cancel navigation button - red X - ALWAYS VISIBLE during navigation */}
      {isNavigating && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onCancel, 'CANCEL')}
          className="h-10 w-10 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 active:scale-95 text-white shadow-lg select-none touch-manipulation pointer-events-auto"
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-cancel-nav"
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      {/* Menu button - blue hamburger at bottom - ALWAYS VISIBLE */}
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          {...createHandler(onOpenMenu, 'MENU')}
          className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95 text-white shadow-lg select-none touch-manipulation pointer-events-auto"
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
          data-testid="button-menu"
          data-tour-id="menu-button"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
