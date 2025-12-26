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
}

export function LeftActionStack({
  onNavigate,
  onReportIncident,
  onCancel,
  onOpenMenu,
  isNavigating,
  currentLocation,
  onVoiceIncidentReport
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

  useEffect(() => {
    if (isNavigating && isVoiceSupported) {
      const started = voiceSystem.startListening();
      setIsVoiceListening(started);
    }
    return () => {
      if (isVoiceSupported) {
        voiceSystem.stopListening();
        setIsVoiceListening(false);
      }
    };
  }, [isNavigating, isVoiceSupported, voiceSystem]);

  const toggleVoiceListening = () => {
    if (isVoiceListening) {
      voiceSystem.stopListening();
      setIsVoiceListening(false);
    } else {
      const started = voiceSystem.startListening();
      setIsVoiceListening(started);
    }
  };

  if (!isNavigating) return null;
  
  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      {/* Navigation button - red navigation arrow */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[LEFT-BTN-1-NAV] ✅ Navigation arrow button clicked');
          onNavigate?.();
        }}
        className="h-8 w-8 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg"
        data-testid="button-nav-left"
      >
        <Navigation className="h-4 w-4" />
      </Button>

      {/* Voice command button - microphone - Always reserve space to prevent layout shift */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleVoiceListening}
        disabled={!isVoiceSupported}
        className={`h-8 w-8 rounded-xl shadow-lg transition-all ${
          isVoiceSupported
            ? isVoiceListening 
              ? 'bg-green-500 hover:bg-green-600 animate-pulse' 
              : 'bg-purple-500 hover:bg-purple-600'
            : 'bg-gray-300 cursor-not-allowed opacity-50'
        } text-white`}
        data-testid="button-voice-command"
        title={!isVoiceSupported ? 'Voice not supported' : isVoiceListening ? 'Voice commands active' : 'Tap to enable voice commands'}
      >
        {isVoiceListening ? (
          <Mic className="h-4 w-4" />
        ) : (
          <MicOff className="h-4 w-4" />
        )}
      </Button>

      {/* Incident report button - orange */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[LEFT-BTN-2-INCIDENT] ✅ Report Incident button clicked - Opening dialog');
          onReportIncident?.();
        }}
        className="h-8 w-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
        data-testid="button-report-incident"
      >
        <AlertCircle className="h-4 w-4" />
      </Button>

      {/* Cancel navigation button - red X */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[LEFT-BTN-3-CANCEL] ✅ Cancel Navigation button clicked - Stopping navigation');
          onCancel?.();
        }}
        className="h-8 w-8 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg"
        data-testid="button-cancel-nav"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Menu button - blue hamburger at bottom */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          console.log('[LEFT-BTN-4-MENU] ✅ Menu button clicked - Opening comprehensive menu');
          onOpenMenu?.();
        }}
        className="h-8 w-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        data-testid="button-menu"
      >
        <Menu className="h-4 w-4" />
      </Button>
    </div>
  );
}
