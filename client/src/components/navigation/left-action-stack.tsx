import { AlertCircle, Menu, Navigation, X, Mic, MicOff } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { getVoiceCommandSystem, type IncidentType } from '@/lib/voice-commands';

interface LeftActionStackProps {
  onNavigate?: () => void;
  onReportIncident?: () => void;
  onCancel?: () => void;
  onOpenMenu?: () => void;
  isNavigating: boolean;
  currentLocation?: { lat: number; lng: number };
  onVoiceIncidentReport?: (type: IncidentType, severity: 'low' | 'medium' | 'high') => void;
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

  useEffect(() => {
    if (isVoiceSupported && onVoiceIncidentReport) {
      voiceSystem.setIncidentReportCallback(handleVoiceReport);
    }
  }, [isVoiceSupported, handleVoiceReport, voiceSystem, onVoiceIncidentReport]);

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

  // CRITICAL: The LeftActionStack should always be visible in Navigation view
  // to provide access to the menu, even when not actively navigating.
  // The internal buttons handle their own visibility if needed.
  
  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      {/* Navigation button - red navigation arrow - Only show when navigating */}
      {isNavigating && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LEFT-BTN-1-NAV] ✅ Navigation arrow button pressed');
            onNavigate?.();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LEFT-BTN-1-NAV] ✅ Navigation arrow button touched');
            onNavigate?.();
          }}
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleVoiceListening();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleVoiceListening();
          }}
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LEFT-BTN-2-INCIDENT] ✅ Report Incident button pressed - Opening dialog');
            onReportIncident?.();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LEFT-BTN-2-INCIDENT] ✅ Report Incident button touched');
            onReportIncident?.();
          }}
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LEFT-BTN-3-CANCEL] ✅ Cancel Navigation button pressed - Stopping navigation');
            onCancel?.();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LEFT-BTN-3-CANCEL] ✅ Cancel Navigation button touched');
            onCancel?.();
          }}
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LEFT-BTN-4-MENU] ✅ Menu button pressed - Opening comprehensive menu');
            onOpenMenu?.();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LEFT-BTN-4-MENU] ✅ Menu button touched');
            onOpenMenu?.();
          }}
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
