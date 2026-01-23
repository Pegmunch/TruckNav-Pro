import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { INCIDENT_ICON_LIBRARY, INCIDENT_CATEGORIES, INCIDENT_TYPES, type IncidentTypeKey } from '@shared/incident-icons';
import { MapPin, Send, Loader2, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { hapticButtonPress } from '@/hooks/use-haptic-feedback';

// Voice recognition keyword mapping to incident types (using correct IncidentTypeKey values)
const VOICE_INCIDENT_KEYWORDS: Record<string, IncidentTypeKey> = {
  // Traffic
  'traffic': 'traffic_jam',
  'congestion': 'heavy_traffic',
  'slow': 'heavy_traffic',
  'jam': 'traffic_jam',
  'queue': 'traffic_jam',
  'heavy': 'heavy_traffic',
  // Accidents
  'accident': 'accident',
  'crash': 'accident',
  'collision': 'accident',
  'motorcycle': 'motorcycle_accident',
  // Road hazards
  'hazard': 'obstacle',
  'debris': 'debris',
  'obstacle': 'obstacle',
  'pothole': 'pothole',
  'hole': 'pothole',
  'spill': 'hazmat_spill',
  'hazmat': 'hazmat_spill',
  'chemical': 'hazmat_spill',
  // Weather
  'ice': 'ice',
  'icy': 'ice',
  'snow': 'ice',
  'flood': 'flooding',
  'flooding': 'flooding',
  'water': 'flooding',
  'fog': 'fog',
  'foggy': 'fog',
  'mist': 'fog',
  // Construction
  'construction': 'construction',
  'roadwork': 'construction',
  'roadworks': 'construction',
  'work': 'construction',
  // Closures
  'closed': 'road_closure',
  'closure': 'road_closure',
  'blocked': 'road_closure',
  // Police/Emergency
  'police': 'police',
  'checkpoint': 'police',
  'ambulance': 'ambulance',
  'fire': 'fire_engine',
  // Vehicles
  'breakdown': 'car_breakdown',
  'broken': 'car_breakdown',
  'truck breakdown': 'truck_breakdown',
  'lorry breakdown': 'truck_breakdown',
  'abandoned': 'car_abandoned',
  // Animals
  'animal': 'animal_on_road',
  'deer': 'animal_on_road',
  'sheep': 'animal_on_road',
  'cow': 'animal_on_road',
  'horse': 'animal_on_road',
};

// Check if Web Speech API is supported
const isVoiceSupported = typeof window !== 'undefined' && 
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

interface IncidentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLocation?: { lat: number; lng: number };
}

export function IncidentReportDialog({ 
  open, 
  onOpenChange, 
  currentLocation
}: IncidentReportDialogProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<IncidentTypeKey | null>(null);
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');
  
  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Stop voice recognition when dialog closes
  useEffect(() => {
    if (!open && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setVoiceTranscript('');
    }
  }, [open]);

  // Process voice transcript to find incident type
  const processVoiceTranscript = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase();
    console.log('[VOICE-INCIDENT] Processing transcript:', lowerTranscript);
    
    // Check each keyword
    for (const [keyword, incidentType] of Object.entries(VOICE_INCIDENT_KEYWORDS)) {
      if (lowerTranscript.includes(keyword)) {
        console.log('[VOICE-INCIDENT] Matched keyword:', keyword, '-> Type:', incidentType);
        
        // Check if this incident type exists in our library
        if (INCIDENT_ICON_LIBRARY[incidentType]) {
          // Find the category for this incident type
          const config = INCIDENT_ICON_LIBRARY[incidentType];
          setSelectedCategory(config.category);
          setSelectedType(incidentType);
          setVoiceTranscript('');
          
          toast({
            title: "Voice Recognized",
            description: `Reporting: ${config.label}`,
          });
          return true;
        }
      }
    }
    return false;
  }, [toast]);

  // Toggle voice recognition
  const toggleVoiceRecognition = useCallback(() => {
    hapticButtonPress();
    
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      console.log('[VOICE-INCIDENT] Stopped listening');
      return;
    }

    if (!isVoiceSupported) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create recognition instance
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        console.log('[VOICE-INCIDENT] 🎤 Started listening');
        setIsListening(true);
        setVoiceTranscript('');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        console.log('[VOICE-INCIDENT] Transcript:', transcript);
        setVoiceTranscript(transcript);
        
        // Process final results
        if (event.results[0]?.isFinal) {
          processVoiceTranscript(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[VOICE-INCIDENT] Error:', event.error);
        setIsListening(false);
        if (event.error !== 'aborted') {
          toast({
            title: "Voice Error",
            description: `Recognition error: ${event.error}`,
            variant: "destructive",
          });
        }
      };

      recognition.onend = () => {
        console.log('[VOICE-INCIDENT] 🎤 Ended');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      console.error('[VOICE-INCIDENT] Failed to start:', error);
      setIsListening(false);
      toast({
        title: "Voice Error",
        description: "Failed to start voice recognition.",
        variant: "destructive",
      });
    }
  }, [isListening, toast, processVoiceTranscript]);

  const reportIncidentMutation = useMutation({
    mutationFn: async (incidentData: {
      type: string;
      title: string;
      description?: string;
      severity: 'low' | 'medium' | 'high';
      coordinates: { lat: number; lng: number };
    }) => {
      const response = await apiRequest('POST', '/api/traffic-incidents', incidentData);
      return response.json();
    },
    onSuccess: () => {
      // toast({
      //   title: "Incident Reported",
      //   description: "Thank you for helping keep other drivers safe!",
      // });
      
      queryClient.invalidateQueries({ queryKey: ['/api/traffic-incidents'] });
      
      setSelectedCategory(null);
      setSelectedType(null);
      setSeverity('medium');
      setDescription('');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Failed to report incident:', error);
      // toast({
      //   title: "Failed to Report Incident",
      //   description: "Unable to submit your report. Please try again.",
      //   variant: "destructive",
      // });
    },
  });

  const handleSubmit = () => {
    if (!selectedType || !currentLocation) return;

    const config = INCIDENT_ICON_LIBRARY[selectedType];
    reportIncidentMutation.mutate({
      type: selectedType,
      title: config.label,
      description: description || config.description,
      severity,
      coordinates: currentLocation,
    });
  };

  const filteredIncidents = selectedCategory
    ? Object.entries(INCIDENT_ICON_LIBRARY)
        .filter(([_, config]) => config.category === selectedCategory)
        .map(([type, config]) => ({ type: type as IncidentTypeKey, ...config }))
    : [];

  // CRITICAL FIX: Early return when dialog is closed to prevent invisible Radix overlay from blocking iOS Safari
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Report Road Incident
          </DialogTitle>
          <DialogDescription>
            Help other truck drivers by reporting road incidents and hazards
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Voice Report Button - Always visible at top when no selection */}
            {!selectedType && (
              <div className="space-y-3">
                <Button
                  onClick={toggleVoiceRecognition}
                  disabled={!isVoiceSupported}
                  className={cn(
                    "w-full h-16 text-lg font-semibold transition-all",
                    isListening 
                      ? "bg-green-500 hover:bg-green-600 animate-pulse" 
                      : "bg-purple-500 hover:bg-purple-600",
                    !isVoiceSupported && "bg-gray-300 cursor-not-allowed"
                  )}
                  data-testid="button-voice-report"
                >
                  {isListening ? (
                    <>
                      <Mic className="w-6 h-6 mr-3 animate-bounce" />
                      Listening... Say what you see!
                    </>
                  ) : (
                    <>
                      <Mic className="w-6 h-6 mr-3" />
                      Tap to Report by Voice
                    </>
                  )}
                </Button>
                
                {/* Voice transcript display */}
                {voiceTranscript && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Heard: "{voiceTranscript}"
                    </p>
                  </div>
                )}
                
                {!isVoiceSupported && (
                  <p className="text-xs text-center text-muted-foreground">
                    Voice not supported on this device
                  </p>
                )}
              </div>
            )}
            
            {/* Divider */}
            {!selectedType && (
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground">OR TAP A CATEGORY</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>
            )}

            {/* Step 1: Select Category */}
            {!selectedCategory && !selectedType && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Select Incident Category</h3>
                <div className="grid grid-cols-2 gap-3">
                  {INCIDENT_CATEGORIES.map((category) => (
                    <Button
                      key={category.id}
                      variant="outline"
                      className="h-auto py-4 px-4 justify-start"
                      onClick={() => setSelectedCategory(category.id)}
                      data-testid={`category-${category.id}`}
                    >
                      <div className="text-left">
                        <div className={cn("font-semibold", category.color)}>
                          {category.label}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Incident Type */}
            {selectedCategory && !selectedType && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Select Incident Type</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    data-testid="button-back-category"
                  >
                    ← Back
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {filteredIncidents.map((incident) => (
                    <Button
                      key={incident.type}
                      variant="outline"
                      className="h-auto py-4 px-4 justify-start"
                      onClick={() => setSelectedType(incident.type)}
                      data-testid={`incident-${incident.type}`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div 
                          className="text-2xl w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: incident.bgColor }}
                        >
                          {incident.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{incident.label}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {incident.description}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Add Details */}
            {selectedType && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Incident Details</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedType(null)}
                    data-testid="button-back-type"
                  >
                    ← Back
                  </Button>
                </div>

                {/* Selected Incident Preview */}
                <div 
                  className="p-4 rounded-lg border-2 flex items-center gap-3"
                  style={{ 
                    backgroundColor: INCIDENT_ICON_LIBRARY[selectedType].bgColor,
                    borderColor: INCIDENT_ICON_LIBRARY[selectedType].color 
                  }}
                >
                  <div className="text-3xl">
                    {INCIDENT_ICON_LIBRARY[selectedType].emoji}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {INCIDENT_ICON_LIBRARY[selectedType].label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {INCIDENT_ICON_LIBRARY[selectedType].description}
                    </div>
                  </div>
                </div>

                {/* Severity Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Severity</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <Button
                        key={level}
                        variant={severity === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeverity(level)}
                        className="flex-1"
                        data-testid={`severity-${level}`}
                      >
                        <Badge
                          variant={
                            level === 'high' 
                              ? 'destructive' 
                              : level === 'medium' 
                              ? 'default' 
                              : 'secondary'
                          }
                          className="mr-2"
                        >
                          {level.toUpperCase()}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Additional Details (Optional)
                  </label>
                  <Textarea
                    placeholder="Add any additional information about this incident..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    data-testid="input-description"
                  />
                </div>

                {/* Location Info */}
                {currentLocation && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>
                        Location: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  size="lg"
                  disabled={!currentLocation || reportIncidentMutation.isPending}
                  data-testid="button-submit-report"
                >
                  {reportIncidentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
