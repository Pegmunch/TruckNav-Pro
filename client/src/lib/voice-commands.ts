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

type NavigationCommandType =
  | 'zoom_in'
  | 'zoom_out'
  | 'recenter'
  | 'start_navigation'
  | 'stop_navigation'
  | 'toggle_3d'
  | 'toggle_satellite'
  | 'mute'
  | 'unmute'
  | 'next_turn'
  | 'repeat_instruction'
  | 'show_overview'
  | 'find_fuel'
  | 'find_parking'
  | 'find_rest_area';

interface VoiceCommand {
  patterns: string[];
  action: () => void;
  description: string;
}

interface VoiceCommandResult {
  success: boolean;
  command?: string;
  incidentType?: IncidentType;
  navigationCommand?: NavigationCommandType;
  message: string;
}

type IncidentReportCallback = (type: IncidentType, severity: 'low' | 'medium' | 'high') => void;
type NavigationCommandCallback = (command: NavigationCommandType) => void;

class VoiceCommandSystem {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
  private onIncidentReport: IncidentReportCallback | null = null;
  private onNavigationCommand: NavigationCommandCallback | null = null;
  private navigationVoice: NavigationVoice;
  private lastCommandTime: number = 0;
  private commandCooldown: number = 2000;
  private currentLanguage: string = 'en-US';

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

  private readonly NAVIGATION_COMMANDS: Record<string, NavigationCommandType> = {
    // Zoom commands
    'zoom in': 'zoom_in',
    'closer': 'zoom_in',
    'magnify': 'zoom_in',
    'zoom out': 'zoom_out',
    'further': 'zoom_out',
    'show more': 'zoom_out',
    
    // Recenter commands
    'recenter': 'recenter',
    're-center': 'recenter',
    'center map': 'recenter',
    'find me': 'recenter',
    'where am i': 'recenter',
    'my location': 'recenter',
    'go to my location': 'recenter',
    
    // Navigation control
    'start navigation': 'start_navigation',
    'begin navigation': 'start_navigation',
    'start route': 'start_navigation',
    'go': 'start_navigation',
    'lets go': 'start_navigation',
    'navigate': 'start_navigation',
    
    'stop navigation': 'stop_navigation',
    'end navigation': 'stop_navigation',
    'cancel navigation': 'stop_navigation',
    'stop route': 'stop_navigation',
    'exit navigation': 'stop_navigation',
    
    // View controls
    '3d mode': 'toggle_3d',
    'three d mode': 'toggle_3d',
    'toggle 3d': 'toggle_3d',
    '3d view': 'toggle_3d',
    
    'satellite': 'toggle_satellite',
    'satellite view': 'toggle_satellite',
    'aerial view': 'toggle_satellite',
    
    'show overview': 'show_overview',
    'overview': 'show_overview',
    'full route': 'show_overview',
    
    // Audio controls
    'mute': 'mute',
    'be quiet': 'mute',
    'silence': 'mute',
    'unmute': 'unmute',
    'sound on': 'unmute',
    'speak': 'unmute',
    
    // Navigation assistance
    'next turn': 'next_turn',
    'whats next': 'next_turn',
    'upcoming turn': 'next_turn',
    
    'repeat': 'repeat_instruction',
    'say again': 'repeat_instruction',
    'repeat instruction': 'repeat_instruction',
    
    // POI search
    'find fuel': 'find_fuel',
    'find petrol': 'find_fuel',
    'find gas': 'find_fuel',
    'find diesel': 'find_fuel',
    'fuel station': 'find_fuel',
    'petrol station': 'find_fuel',
    'gas station': 'find_fuel',
    
    'find parking': 'find_parking',
    'truck parking': 'find_parking',
    'lorry parking': 'find_parking',
    'hgv parking': 'find_parking',
    
    'find rest': 'find_rest_area',
    'rest area': 'find_rest_area',
    'rest stop': 'find_rest_area',
    'services': 'find_rest_area',
    'truck stop': 'find_rest_area',
  };

  private readonly NAVIGATION_COMMAND_RESPONSES: Record<NavigationCommandType, string> = {
    'zoom_in': 'Zooming in',
    'zoom_out': 'Zooming out',
    'recenter': 'Centering on your location',
    'start_navigation': 'Starting navigation',
    'stop_navigation': 'Navigation stopped',
    'toggle_3d': 'Toggling 3D view',
    'toggle_satellite': 'Toggling satellite view',
    'mute': 'Voice muted',
    'unmute': 'Voice unmuted',
    'next_turn': 'Showing next turn',
    'repeat_instruction': 'Repeating instruction',
    'show_overview': 'Showing route overview',
    'find_fuel': 'Searching for fuel stations',
    'find_parking': 'Searching for truck parking',
    'find_rest_area': 'Searching for rest areas',
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
    this.recognition.lang = this.currentLanguage;
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

    console.log('[VoiceCommands] Speech Recognition initialized with navigation commands');
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
          
          // Try navigation commands first
          const navResult = this.matchNavigationCommand(transcript);
          if (navResult.success) {
            this.lastCommandTime = now;
            this.executeNavigationCommand(navResult);
            return;
          }
          
          // Then try incident commands
          const incidentResult = this.matchIncidentCommand(transcript);
          if (incidentResult.success) {
            this.lastCommandTime = now;
            this.executeIncidentReport(incidentResult);
            return;
          }
        }
      }
    }
  }

  private matchNavigationCommand(transcript: string): VoiceCommandResult {
    const normalizedTranscript = transcript.toLowerCase().replace(/[^\w\s]/g, '');
    
    for (const [pattern, commandType] of Object.entries(this.NAVIGATION_COMMANDS)) {
      if (normalizedTranscript.includes(pattern)) {
        return {
          success: true,
          command: pattern,
          navigationCommand: commandType,
          message: `Matched navigation command: ${pattern}`,
        };
      }
    }

    return {
      success: false,
      message: 'No matching navigation command found',
    };
  }

  private matchIncidentCommand(transcript: string): VoiceCommandResult {
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

  private executeNavigationCommand(result: VoiceCommandResult): void {
    if (!result.navigationCommand) return;

    const response = this.NAVIGATION_COMMAND_RESPONSES[result.navigationCommand];
    
    // Don't speak if muting
    if (result.navigationCommand !== 'mute') {
      this.navigationVoice.speak(response, 'normal', true);
    }

    if (this.onNavigationCommand) {
      this.onNavigationCommand(result.navigationCommand);
    }

    console.log('[VoiceCommands] Navigation command executed:', result.navigationCommand);
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

  public setNavigationCommandCallback(callback: NavigationCommandCallback): void {
    this.onNavigationCommand = callback;
  }

  public isActive(): boolean {
    return this.isListening;
  }

  public isVoiceCommandSupported(): boolean {
    return this.isSupported;
  }

  public setLanguage(lang: string): void {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
      console.log('[VoiceCommands] Language set to:', lang);
    }
  }

  public getLanguage(): string {
    return this.currentLanguage;
  }

  public getAvailableCommands(): string[] {
    return [
      ...Object.keys(this.INCIDENT_COMMANDS),
      ...Object.keys(this.NAVIGATION_COMMANDS)
    ];
  }

  public getNavigationCommands(): { pattern: string; type: NavigationCommandType; description: string }[] {
    const typeDescriptions: Record<NavigationCommandType, string> = {
      'zoom_in': 'Zoom the map in',
      'zoom_out': 'Zoom the map out',
      'recenter': 'Center map on your location',
      'start_navigation': 'Start turn-by-turn navigation',
      'stop_navigation': 'Stop current navigation',
      'toggle_3d': 'Toggle 3D building view',
      'toggle_satellite': 'Toggle satellite view',
      'mute': 'Mute voice guidance',
      'unmute': 'Unmute voice guidance',
      'next_turn': 'Show next turn information',
      'repeat_instruction': 'Repeat last instruction',
      'show_overview': 'Show full route overview',
      'find_fuel': 'Search for nearby fuel stations',
      'find_parking': 'Search for truck parking',
      'find_rest_area': 'Search for rest areas',
    };

    return Object.entries(this.NAVIGATION_COMMANDS).map(([pattern, commandType]) => ({
      pattern,
      type: commandType,
      description: typeDescriptions[commandType],
    }));
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
export type { IncidentType, NavigationCommandType, VoiceCommandResult, IncidentReportCallback, NavigationCommandCallback };
