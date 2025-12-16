import { NavigationVoice } from './navigation-voice';

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventResult {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorResult {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventResult) => void) | null;
  onerror: ((event: SpeechRecognitionErrorResult) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type IncidentType = 
  | 'traffic_jam' 
  | 'accident' 
  | 'road_hazard' 
  | 'road_closure' 
  | 'police' 
  | 'speed_camera'
  | 'construction'
  | 'weather_hazard';

interface VoiceCommand {
  patterns: string[];
  action: () => void;
  description: string;
}

interface VoiceCommandResult {
  success: boolean;
  command?: string;
  incidentType?: IncidentType;
  message: string;
}

type IncidentReportCallback = (type: IncidentType, severity: 'low' | 'medium' | 'high') => void;

class VoiceCommandSystem {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
  private onIncidentReport: IncidentReportCallback | null = null;
  private navigationVoice: NavigationVoice;
  private lastCommandTime: number = 0;
  private commandCooldown: number = 3000;

  private readonly INCIDENT_COMMANDS: Record<string, { type: IncidentType; severity: 'low' | 'medium' | 'high' }> = {
    'report traffic': { type: 'traffic_jam', severity: 'medium' },
    'traffic jam': { type: 'traffic_jam', severity: 'medium' },
    'heavy traffic': { type: 'traffic_jam', severity: 'high' },
    'slow traffic': { type: 'traffic_jam', severity: 'low' },
    
    'report accident': { type: 'accident', severity: 'high' },
    'accident ahead': { type: 'accident', severity: 'high' },
    'car crash': { type: 'accident', severity: 'high' },
    'vehicle accident': { type: 'accident', severity: 'high' },
    
    'report hazard': { type: 'road_hazard', severity: 'medium' },
    'road hazard': { type: 'road_hazard', severity: 'medium' },
    'debris on road': { type: 'road_hazard', severity: 'medium' },
    'object on road': { type: 'road_hazard', severity: 'medium' },
    'pothole': { type: 'road_hazard', severity: 'low' },
    
    'road closed': { type: 'road_closure', severity: 'high' },
    'road closure': { type: 'road_closure', severity: 'high' },
    'road blocked': { type: 'road_closure', severity: 'high' },
    
    'report police': { type: 'police', severity: 'low' },
    'police ahead': { type: 'police', severity: 'low' },
    'police car': { type: 'police', severity: 'low' },
    
    'speed camera': { type: 'speed_camera', severity: 'low' },
    'camera ahead': { type: 'speed_camera', severity: 'low' },
    'speed trap': { type: 'speed_camera', severity: 'low' },
    
    'construction': { type: 'construction', severity: 'medium' },
    'road work': { type: 'construction', severity: 'medium' },
    'road works': { type: 'construction', severity: 'medium' },
    
    'bad weather': { type: 'weather_hazard', severity: 'medium' },
    'fog ahead': { type: 'weather_hazard', severity: 'medium' },
    'icy road': { type: 'weather_hazard', severity: 'high' },
    'flooding': { type: 'weather_hazard', severity: 'high' },
  };

  constructor() {
    this.navigationVoice = NavigationVoice.getInstance();
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognitionAPI = 
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn('[VoiceCommands] Speech Recognition API not supported');
      this.isSupported = false;
      return;
    }

    this.isSupported = true;
    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3;

    this.recognition.onresult = (event: SpeechRecognitionEventResult) => {
      this.handleSpeechResult(event);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorResult) => {
      console.warn('[VoiceCommands] Recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        if (this.isListening) {
          this.restartRecognition();
        }
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        this.restartRecognition();
      }
    };

    console.log('[VoiceCommands] Speech Recognition initialized');
  }

  private handleSpeechResult(event: SpeechRecognitionEventResult): void {
    const now = Date.now();
    if (now - this.lastCommandTime < this.commandCooldown) {
      return;
    }

    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        const alternatives = event.results[i];
        
        for (let j = 0; j < alternatives.length; j++) {
          const transcript = alternatives[j].transcript.toLowerCase().trim();
          console.log('[VoiceCommands] Heard:', transcript);
          
          const result = this.matchCommand(transcript);
          if (result.success) {
            this.lastCommandTime = now;
            this.executeIncidentReport(result);
            return;
          }
        }
      }
    }
  }

  private matchCommand(transcript: string): VoiceCommandResult {
    const normalizedTranscript = transcript.toLowerCase().replace(/[^\w\s]/g, '');
    
    for (const [pattern, config] of Object.entries(this.INCIDENT_COMMANDS)) {
      if (normalizedTranscript.includes(pattern)) {
        return {
          success: true,
          command: pattern,
          incidentType: config.type,
          message: `Matched command: ${pattern}`,
        };
      }
    }

    return {
      success: false,
      message: 'No matching command found',
    };
  }

  private executeIncidentReport(result: VoiceCommandResult): void {
    if (!result.incidentType) return;

    const config = this.INCIDENT_COMMANDS[result.command || ''];
    if (!config) return;

    const incidentLabels: Record<IncidentType, string> = {
      'traffic_jam': 'traffic jam',
      'accident': 'accident',
      'road_hazard': 'road hazard',
      'road_closure': 'road closure',
      'police': 'police activity',
      'speed_camera': 'speed camera',
      'construction': 'construction',
      'weather_hazard': 'weather hazard',
    };

    this.navigationVoice.speak(
      `Reporting ${incidentLabels[result.incidentType]}. Thank you for the report.`,
      'normal',
      true
    );

    if (this.onIncidentReport) {
      this.onIncidentReport(result.incidentType, config.severity);
    }

    console.log('[VoiceCommands] Incident reported:', result.incidentType, config.severity);
  }

  private restartRecognition(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        setTimeout(() => this.restartRecognition(), 100);
      }
    }
  }

  public startListening(): boolean {
    if (!this.isSupported || !this.recognition) {
      console.warn('[VoiceCommands] Cannot start - not supported');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      console.log('[VoiceCommands] Started listening for voice commands');
      return true;
    } catch (e) {
      console.error('[VoiceCommands] Failed to start:', e);
      return false;
    }
  }

  public stopListening(): void {
    if (!this.recognition) return;

    this.isListening = false;
    try {
      this.recognition.stop();
      console.log('[VoiceCommands] Stopped listening');
    } catch (e) {
      console.warn('[VoiceCommands] Error stopping:', e);
    }
  }

  public setIncidentReportCallback(callback: IncidentReportCallback): void {
    this.onIncidentReport = callback;
  }

  public isActive(): boolean {
    return this.isListening;
  }

  public isVoiceCommandSupported(): boolean {
    return this.isSupported;
  }

  public getAvailableCommands(): string[] {
    return Object.keys(this.INCIDENT_COMMANDS);
  }

  public getSupportedIncidentTypes(): { pattern: string; type: IncidentType; description: string }[] {
    const typeDescriptions: Record<IncidentType, string> = {
      'traffic_jam': 'Heavy or slow traffic',
      'accident': 'Vehicle accident or crash',
      'road_hazard': 'Debris, pothole, or obstacle',
      'road_closure': 'Road blocked or closed',
      'police': 'Police presence',
      'speed_camera': 'Speed camera or trap',
      'construction': 'Road work zone',
      'weather_hazard': 'Weather-related hazard',
    };

    return Object.entries(this.INCIDENT_COMMANDS).map(([pattern, config]) => ({
      pattern,
      type: config.type,
      description: typeDescriptions[config.type],
    }));
  }
}

let voiceCommandInstance: VoiceCommandSystem | null = null;

export function getVoiceCommandSystem(): VoiceCommandSystem {
  if (!voiceCommandInstance) {
    voiceCommandInstance = new VoiceCommandSystem();
  }
  return voiceCommandInstance;
}

export { VoiceCommandSystem };
export type { IncidentType, VoiceCommandResult, IncidentReportCallback };
