import { AlertCircle, Truck, Navigation, X, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { getVoiceCommandSystem, type IncidentType, type NavigationCommandType } from '@/lib/voice-commands';
import { hapticButtonPress } from '@/hooks/use-haptic-feedback';
import { navigationVoice } from '@/lib/navigation-voice';
import { getAlertSoundsService } from '@/lib/alert-sounds';
import { buttonRegistry, attachWindowTouchListener, detachWindowTouchListener } from './right-action-stack';

// Native event listener hook for iOS Safari - uses TOUCHSTART (not touchend)
// iOS Safari cancels touchend events over WebGL canvases
function useNativeClickHandler(
  ref: React.RefObject<HTMLButtonElement>,
  callback: (() => void) | undefined,
  label: string,
  isNavigating: boolean
) {
  // Debounce ref to prevent double-firing
  const lastTouchRef = useRef(0);
  // CRITICAL: Track mount state to re-run effect after refs are populated
  const [mounted, setMounted] = useState(false);
  
  // Force re-run after first render when refs are populated
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    const button = ref.current;
    if (!button || !callback) return;
    
    const mode = isNavigating ? 'NAV' : 'PREVIEW';
    
    // CRITICAL: Fire on touchstart - fires BEFORE WebGL can cancel the event
    const handleTouchStart = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchRef.current < 200) {
        console.log(`[NATIVE-LEFT-${label}-${mode}] ⏳ TouchStart debounced`);
        return; // Debounce - reduced to 200ms for faster response
      }
      lastTouchRef.current = now;
      
      e.preventDefault();
      e.stopPropagation();
      console.log(`[NATIVE-LEFT-${label}-${mode}] ✅ TouchStart fired - CALLING CALLBACK`);
      hapticButtonPress();
      callback();
    };
    
    const handlePointerDown = (e: PointerEvent) => {
      // Only handle mouse events here - touch is handled by touchstart
      if (e.pointerType === 'mouse') {
        e.preventDefault();
        e.stopPropagation();
        console.log(`[NATIVE-LEFT-${label}-${mode}] ✅ PointerDown (mouse) - CALLING CALLBACK`);
        hapticButtonPress();
        callback();
      }
    };
    
    const handleClick = (e: MouseEvent) => {
      // Fallback for desktop
      e.preventDefault();
      e.stopPropagation();
      console.log(`[NATIVE-LEFT-${label}-${mode}] ✅ Click fired - CALLING CALLBACK`);
      hapticButtonPress();
      callback();
    };
    
    // CRITICAL: Use touchstart with passive:false to preventDefault
    button.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    button.addEventListener('pointerdown', handlePointerDown, { capture: true });
    button.addEventListener('click', handleClick, { capture: true });
    
    // Log button position and computed styles
    const rect = button.getBoundingClientRect();
    const styles = window.getComputedStyle(button);
    console.log(`[NATIVE-LEFT-${label}-${mode}] 📎 Listeners attached. Button info:`, {
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      pointerEvents: styles.pointerEvents,
      zIndex: styles.zIndex,
      visibility: styles.visibility,
      opacity: styles.opacity,
      display: styles.display
    });
    
    return () => {
      button.removeEventListener('touchstart', handleTouchStart, { capture: true });
      button.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      button.removeEventListener('click', handleClick, { capture: true });
    };
  }, [ref, callback, label, isNavigating, mounted]);
}

// Window-level touch interceptor for iOS Safari WebGL bug
// Registers button with the global touch handler from right-action-stack
function useWindowTouchInterceptor(
  ref: React.RefObject<HTMLButtonElement>,
  callback: (() => void) | undefined,
  id: string,
  isNavigating: boolean
) {
  // CRITICAL: Track mount state to re-run effect after refs are populated
  const [mounted, setMounted] = useState(false);
  
  // Force re-run after first render when refs are populated
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    // Enable in BOTH modes for iOS Safari WebGL bug workaround
    if (!callback) {
      buttonRegistry.delete(id);
      return;
    }
    
    // CRITICAL: Attach the global listener - don't just rely on right-action-stack
    attachWindowTouchListener();
    
    // Register this button with the global registry
    buttonRegistry.set(id, {
      id,
      getRect: () => ref.current?.getBoundingClientRect() || null,
      callback,
      lastFired: 0,
      isVisible: true
    });
    
    console.log(`[WINDOW-TOUCH-REGISTER-LEFT] 📎 Registered button: ${id} (navigating: ${isNavigating})`);
    
    return () => {
      buttonRegistry.delete(id);
      detachWindowTouchListener();
      console.log(`[WINDOW-TOUCH-REGISTER-LEFT] 🗑️ Unregistered button: ${id}`);
    };
  }, [ref, callback, id, isNavigating, mounted]);
}

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
  
  // Refs for buttons that need native event listeners (iOS Safari fix)
  const navButtonRef = useRef<HTMLButtonElement>(null);
  const voiceButtonRef = useRef<HTMLButtonElement>(null);
  const muteButtonRef = useRef<HTMLButtonElement>(null);
  const incidentButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isMuted) {
      navigationVoice.setEnabled(false);
      getAlertSoundsService().setGlobalMute(true);
    } else {
      // When not muted, ensure maximum volume for clear navigation audio
      navigationVoice.forceMaxVolume();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const newState = !isMuted;
    setIsMuted(newState);
    localStorage.setItem(MUTE_STATE_KEY, String(newState));
    navigationVoice.setEnabled(!newState);
    // When unmuting, force maximum volume for clear navigation audio
    if (!newState) {
      navigationVoice.forceMaxVolume();
    }
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

  // CRITICAL: Stable callback wrapper for iOS touch proxy - always defined
  const stableIncidentCallback = useCallback(() => {
    if (isNavigating && onReportIncident) {
      console.log('[LEFT-STACK] 🟠 Stable incident callback fired');
      onReportIncident();
    }
  }, [isNavigating, onReportIncident]);

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

  const toggleVoiceListening = useCallback(() => {
    if (isVoiceListening) {
      voiceSystem.stopListening();
      setIsVoiceListening(false);
    } else {
      const started = voiceSystem.startListening();
      setIsVoiceListening(started);
    }
  }, [isVoiceListening, voiceSystem]);

  // Use native event listeners for ALL buttons to bypass React's synthetic event delegation
  // iOS Safari has issues with React's event delegation on fixed/transformed elements
  useNativeClickHandler(navButtonRef, onNavigate, 'NAV', isNavigating);
  useNativeClickHandler(voiceButtonRef, isVoiceSupported ? toggleVoiceListening : undefined, 'VOICE', isNavigating);
  useNativeClickHandler(muteButtonRef, toggleMute, 'MUTE', isNavigating);
  useNativeClickHandler(incidentButtonRef, onReportIncident, 'INCIDENT', isNavigating);
  useNativeClickHandler(cancelButtonRef, onCancel, 'CANCEL', isNavigating);
  useNativeClickHandler(menuButtonRef, onOpenMenu, 'MENU', isNavigating);
  
  // ============================================================================
  // DIRECT MANUAL REGISTRATION for left-incident-btn - bypasses problematic hook
  // The useWindowTouchInterceptor hook's effect sometimes doesn't run for certain buttons
  // for unknown reasons. This direct registration ensures the button works.
  // ============================================================================
  useEffect(() => {
    console.log('[LEFT-INCIDENT-DIRECT] Manual registration effect running');
    if (!stableIncidentCallback) {
      console.log('[LEFT-INCIDENT-DIRECT] ❌ No callback - skipping');
      return;
    }
    
    attachWindowTouchListener();
    
    buttonRegistry.set('left-incident-btn', {
      id: 'left-incident-btn',
      getRect: () => incidentButtonRef.current?.getBoundingClientRect() || null,
      callback: stableIncidentCallback,
      lastFired: 0,
      isVisible: true
    });
    
    console.log('[LEFT-INCIDENT-DIRECT] ✅ Registered left-incident-btn directly');
    
    return () => {
      buttonRegistry.delete('left-incident-btn');
      detachWindowTouchListener();
      console.log('[LEFT-INCIDENT-DIRECT] 🗑️ Unregistered left-incident-btn');
    };
  }, [stableIncidentCallback]);

  // CRITICAL: For iOS Safari WebGL fix, we need to ALWAYS render the incident button
  // so its ref is valid and can register with the touch proxy system.
  // We still check if any buttons would be visible to avoid blocking touch events.
  const hasVisibleButtons = isNavigating || showMenuButton;
  
  return (
    <div className={`flex flex-col gap-2 ${hasVisibleButtons ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Navigation button - red navigation arrow - hides/shows with double-tap */}
      {isNavigating && (
        <Button
          ref={navButtonRef}
          variant="ghost"
          size="icon"
          className={`h-10 w-10 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 active:scale-95 text-white shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu ${
            isVisible ? 'translate-x-0 opacity-100 scale-100 pointer-events-auto' : '-translate-x-20 opacity-0 scale-95 pointer-events-none'
          }`}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-nav-left"
          data-tour-id="nav-button"
        >
          <Navigation className="h-5 w-5" />
        </Button>
      )}

      {/* Voice command button - microphone - hides/shows with double-tap */}
      {isNavigating && (
        <Button
          ref={voiceButtonRef}
          variant="ghost"
          size="icon"
          disabled={!isVoiceSupported}
          className={`h-10 w-10 rounded-xl shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu ${
            isVoiceSupported
              ? isVoiceListening 
                ? 'bg-green-500 hover:bg-green-600 animate-pulse' 
                : 'bg-purple-500 hover:bg-purple-600'
              : 'bg-gray-300 cursor-not-allowed opacity-50'
          } text-white active:scale-95 ${
            isVisible ? 'translate-x-0 opacity-100 scale-100 pointer-events-auto' : '-translate-x-20 opacity-0 scale-95 pointer-events-none'
          }`}
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

      {/* Mute button removed - use the one in ETA bar instead to avoid touch conflicts */}

      {/* Incident report button - orange - ALWAYS rendered for iOS touch proxy registration */}
      {/* Hidden when not navigating, but ref is always valid for touch interception */}
      <Button
        ref={incidentButtonRef}
        variant="ghost"
        size="icon"
        onTouchStart={(e) => {
          if (!isNavigating || !onReportIncident) return;
          e.preventDefault();
          e.stopPropagation();
          console.log('[INCIDENT-BTN] 🟠 Orange button TOUCHSTART in NAV mode');
          onReportIncident();
        }}
        onPointerDown={(e) => {
          if (!isNavigating || !onReportIncident) return;
          if (e.pointerType === 'mouse') {
            e.preventDefault();
            console.log('[INCIDENT-BTN] 🟠 Orange button POINTERDOWN (mouse) in NAV mode');
            onReportIncident();
          }
        }}
        className={`h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 active:scale-95 text-white shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu ${
          isNavigating && onReportIncident && isVisible 
            ? 'translate-x-0 opacity-100 scale-100 pointer-events-auto' 
            : '-translate-x-20 opacity-0 scale-95 pointer-events-none'
        }`}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        data-testid="button-report-incident"
        data-tour-id="incident-button"
      >
        <AlertCircle className="h-5 w-5" />
      </Button>

      {/* Cancel navigation button - red X - hides/shows with double-tap */}
      {isNavigating && (
        <Button
          ref={cancelButtonRef}
          variant="ghost"
          size="icon"
          className={`h-10 w-10 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 active:scale-95 text-white shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu ${
            isVisible ? 'translate-x-0 opacity-100 scale-100 pointer-events-auto' : '-translate-x-20 opacity-0 scale-95 pointer-events-none'
          }`}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-cancel-nav"
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      {/* Menu button - blue hamburger at bottom - hides/shows with double-tap */}
      {/* Mobile: moved up slightly with -mt-4, desktop: normal spacing */}
      {showMenuButton && (
        <Button
          ref={menuButtonRef}
          variant="ghost"
          size="icon"
          className={`h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 active:scale-95 text-blue-600 shadow-lg border-t-[3px] border-b-[3px] border-blue-500 select-none touch-manipulation transition-all duration-300 transform-gpu -mt-12 md:mt-0 ${
            isVisible ? 'translate-x-0 opacity-100 scale-100 pointer-events-auto' : '-translate-x-20 opacity-0 scale-95 pointer-events-none'
          }`}
          style={{ touchAction: 'manipulation' }}
          data-testid="button-menu"
          data-tour-id="menu-button"
        >
          <Truck className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
