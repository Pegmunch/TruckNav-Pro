import { memo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  MessageCircle,
  Keyboard,
  MapPin,
  Navigation2
} from "lucide-react";
import { useVoiceIntents, type IntentHandlers } from "@/hooks/use-voice-intents";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';
import { navigationVoice } from '@/lib/navigation-voice';

interface VoiceNavigationPanelProps {
  isNavigating?: boolean;
  onDestinationVoice?: (destination: string) => void;
  onNavigationCommand?: (command: string) => void;
  className?: string;
}

// Speech Recognition setup
const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  
  const SpeechRecognition = 
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition;
  
  return SpeechRecognition;
};

// Text-to-speech setup
const getTextToSpeech = () => {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis;
};

const VoiceNavigationPanel = memo(function VoiceNavigationPanel({
  isNavigating = false,
  onDestinationVoice,
  onNavigationCommand,
  className
}: VoiceNavigationPanelProps) {
  const { i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState('');

  // Subscribe to voice announcements for visual feedback
  useEffect(() => {
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    
    const unsubscribe = navigationVoice.onVoiceAnnouncement((text, isPlaying) => {
      // Clear any pending timer
      if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = null;
      }
      
      setIsSpeaking(isPlaying);
      if (isPlaying) {
        setCurrentAnnouncement(text);
      } else {
        clearTimer = setTimeout(() => setCurrentAnnouncement(''), 1000);
      }
    });
    
    return () => {
      if (clearTimer) clearTimeout(clearTimer);
      unsubscribe();
    };
  }, []);

  // Voice intent handlers for navigation commands
  const intentHandlers: IntentHandlers = {
    navigation: async (intent, entities) => {
      const command = `${intent.action} ${entities.map(e => e.value).join(' ')}`;
      setLastCommand(command);
      onNavigationCommand?.(command);
      
      if (speechEnabled) {
        speak(`Navigation command: ${command}`);
      }
    },
    
    search: async (intent, entities) => {
      const destination = entities.map(e => e.value).join(' ');
      setLastCommand(`Search for: ${destination}`);
      onDestinationVoice?.(destination);
      
      if (speechEnabled) {
        speak(`Searching for ${destination}`);
      }
    },
    
    controls: async (intent, entities) => {
      const command = `${intent.action} ${entities.map(e => e.value).join(' ')}`;
      setLastCommand(command);
      onNavigationCommand?.(command);
      
      if (speechEnabled) {
        speak(`Control command: ${command}`);
      }
    },
    
    routing: async (intent, entities) => {
      const command = `${intent.action} ${entities.map(e => e.value).join(' ')}`;
      setLastCommand(command);
      onNavigationCommand?.(command);
      
      if (speechEnabled) {
        speak(`Routing command: ${command}`);
      }
    }
  };

  // Use the voice intents hook
  const voiceIntents = useVoiceIntents(intentHandlers, {
    minConfidence: 0.7,
    contextAware: true,
    includeVehicleEntities: true
  });

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setVoiceInputEnabled(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = i18n.language || 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTranscript(transcript);
      setIsProcessing(true);
      
      try {
        // Process the voice command through the intent system
        await voiceIntents.processVoiceInput(transcript, {
          navigationState: isNavigating ? 'navigating' : 'idle',
          routeActive: isNavigating
        });
      } catch (error) {
        console.error('Voice processing error:', error);
        if (speechEnabled) {
          speak("Sorry, I didn't understand that command.");
        }
      }
      
      setIsProcessing(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsProcessing(false);
      
      if (speechEnabled) {
        speak("Voice recognition error. Please try again.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognition);

    return () => {
      recognition.stop();
    };
  }, [isNavigating, speechEnabled, voiceIntents, onDestinationVoice, onNavigationCommand, i18n.language]);

  // Text-to-speech function - uses unified NavigationVoice system
  const speak = useCallback((text: string) => {
    if (!speechEnabled) return;
    
    // Route through unified voice system (respects motorway-only mode)
    navigationVoice.speak(text, 'normal', false, 'general');
  }, [speechEnabled]);

  // Start/stop listening
  const toggleListening = useCallback(() => {
    if (!recognition || !voiceInputEnabled) return;

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [recognition, isListening, voiceInputEnabled]);

  // Provide navigation instruction via TTS
  const announceInstruction = useCallback((instruction: string) => {
    if (speechEnabled && isNavigating) {
      speak(instruction);
    }
  }, [speechEnabled, isNavigating, speak]);

  // Export this function for parent components to use
  useEffect(() => {
    // Attach to window for external access if needed
    (window as any).announceNavigationInstruction = announceInstruction;
  }, [announceInstruction]);

  return (
    <Card className={cn("w-full", className)} data-testid="voice-navigation-panel">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Voice Navigation
            {isSpeaking && (
              <span className="ml-1 flex items-center gap-1 animate-pulse text-green-600 dark:text-green-400">
                <Volume2 className="w-4 h-4" />
              </span>
            )}
          </div>
          <Badge 
            variant={isSpeaking ? "default" : "secondary"} 
            className={cn(
              "text-xs transition-colors",
              isSpeaking && "bg-green-600 text-white"
            )}
          >
            {isSpeaking ? "Speaking..." : voiceIntents.isProcessing ? "Processing..." : isListening ? "Listening" : "Ready"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      {/* Voice Speaking Indicator */}
      {isSpeaking && currentAnnouncement && (
        <div className="mx-4 mb-2 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-700">
          <p className="text-xs text-green-800 dark:text-green-200 flex items-center gap-2">
            <Volume2 className="w-3 h-3 animate-pulse" />
            <span className="truncate">{currentAnnouncement}</span>
          </p>
        </div>
      )}
      
      <CardContent className="space-y-3">
        {/* Voice Input Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={isListening ? "destructive" : "default"}
              size="sm"
              onClick={toggleListening}
              disabled={!voiceInputEnabled || isProcessing}
              data-testid={isListening ? "stop-voice-input" : "start-voice-input"}
              className="flex items-center gap-1"
            >
              {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              {isListening ? "Stop" : "Listen"}
            </Button>
            
            <Button
              variant={speechEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setSpeechEnabled(!speechEnabled)}
              data-testid="toggle-speech-output"
              className="flex items-center gap-1"
            >
              {speechEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              TTS
            </Button>
          </div>
        </div>

        {/* Current Transcript */}
        {transcript && (
          <div className="p-2 bg-muted rounded text-xs">
            <div className="flex items-center gap-1 mb-1">
              <Keyboard className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Heard:</span>
            </div>
            <div className="text-foreground">{transcript}</div>
          </div>
        )}

        {/* Last Command */}
        {lastCommand && (
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
            <div className="flex items-center gap-1 mb-1">
              <Navigation2 className="w-3 h-3 text-blue-600" />
              <span className="text-blue-600">Command:</span>
            </div>
            <div className="text-blue-800 dark:text-blue-200">{lastCommand}</div>
          </div>
        )}

        {/* Voice Command Examples */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Voice Commands:</div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            {isNavigating ? (
              <>
                <div className="text-muted-foreground">"Find nearest fuel station"</div>
                <div className="text-muted-foreground">"Zoom in on map"</div>
                <div className="text-muted-foreground">"Avoid tolls"</div>
                <div className="text-muted-foreground">"Stop navigation"</div>
              </>
            ) : (
              <>
                <div className="text-muted-foreground">"Navigate to Birmingham"</div>
                <div className="text-muted-foreground">"Find parking in London"</div>
                <div className="text-muted-foreground">"Search for M25 3AB"</div>
                <div className="text-muted-foreground">"Start navigation"</div>
              </>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        {!voiceInputEnabled && (
          <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            Voice input not supported in this browser
          </div>
        )}
        
        {voiceIntents.lastResult?.errors && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {voiceIntents.lastResult.errors.join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default VoiceNavigationPanel;