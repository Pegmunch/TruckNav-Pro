/**
 * Navigation Voice Guidance System
 * 
 * Uses Web Speech API to provide turn-by-turn voice navigation for truck drivers.
 * Handles upcoming maneuvers, urgent instructions, and interruptions.
 */

export type VoiceGuidanceLevel = 'normal' | 'urgent' | 'critical';
export type DistanceThreshold = 500 | 200 | 50; // Distance in feet for announcements

interface VoiceSettings {
  enabled: boolean;
  voice: string | null; // Voice name or null for default
  rate: number; // Speech rate (0.5 - 2)
  pitch: number; // Voice pitch (0 - 2)
  volume: number; // Volume (0 - 1)
  announceDistances: boolean;
  announceRoadNames: boolean;
  announceSpeed: boolean;
  announceLaneGuidance: boolean;
  language: string; // BCP-47 language code (e.g., 'en-US', 'es-ES')
}

interface QueuedInstruction {
  text: string;
  level: VoiceGuidanceLevel;
  id: string;
  timestamp: number;
}

export class NavigationVoice {
  private static instance: NavigationVoice | null = null;
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private settings: VoiceSettings;
  private instructionQueue: QueuedInstruction[] = [];
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isInitialized: boolean = false;
  private isSpeaking: boolean = false;
  private lastAnnouncedTurn: string | null = null;
  private lastAnnouncedDistance: number | null = null;
  private voiceLoadRetries: number = 0;
  private maxVoiceLoadRetries: number = 10;
  
  // Distance thresholds for announcements (in feet)
  private readonly DISTANCE_THRESHOLDS = {
    FAR: 800,     // "In 800 feet..."
    MEDIUM: 500,  // "In 500 feet..."
    NEAR: 200,    // "In 200 feet..."
    IMMEDIATE: 50 // "Turn now"
  };
  
  // Speech rate settings based on urgency
  private readonly SPEECH_RATES = {
    normal: 1.0,
    urgent: 1.2,
    critical: 1.3
  };
  
  // Supported language voice codes mapping
  private readonly LANGUAGE_VOICE_MAP: { [key: string]: string[] } = {
    'en-US': ['en-US', 'en_US', 'en'],
    'en-GB': ['en-GB', 'en_GB', 'en'],
    'es-ES': ['es-ES', 'es_ES', 'es-MX', 'es'],
    'de-DE': ['de-DE', 'de_DE', 'de'],
    'it-IT': ['it-IT', 'it_IT', 'it'],
    'pt-BR': ['pt-BR', 'pt_BR', 'pt-PT', 'pt'],
    'pl-PL': ['pl-PL', 'pl_PL', 'pl'],
    'ro-RO': ['ro-RO', 'ro_RO', 'ro'],
    'zh-CN': ['zh-CN', 'zh_CN', 'zh-Hans', 'zh'],
    'ja-JP': ['ja-JP', 'ja_JP', 'ja'],
  };

  // Default settings
  private readonly DEFAULT_SETTINGS: VoiceSettings = {
    enabled: true,
    voice: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 0.9,
    announceDistances: true,
    announceRoadNames: true,
    announceSpeed: false,
    announceLaneGuidance: true,
    language: 'en-US'
  };
  
  private constructor() {
    this.synthesis = window.speechSynthesis;
    this.settings = this.loadSettings();
    this.initialize();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): NavigationVoice {
    if (!NavigationVoice.instance) {
      NavigationVoice.instance = new NavigationVoice();
    }
    return NavigationVoice.instance;
  }
  
  /**
   * Initialize voice synthesis and load available voices
   */
  private async initialize(): Promise<void> {
    if (!this.synthesis) {
      console.warn('[NavigationVoice] Web Speech API not supported');
      return;
    }
    
    // Load voices (may need to wait for voiceschanged event)
    this.loadVoices();
    
    // Chrome loads voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
    
    // Retry loading voices if not immediately available
    if (this.voices.length === 0 && this.voiceLoadRetries < this.maxVoiceLoadRetries) {
      this.voiceLoadRetries++;
      setTimeout(() => this.initialize(), 100);
    } else {
      this.isInitialized = true;
      console.log(`[NavigationVoice] Initialized with ${this.voices.length} voices`);
    }
  }
  
  /**
   * Load available voices and select preferred one for current language
   */
  private loadVoices(): void {
    this.voices = this.synthesis.getVoices();
    
    if (this.voices.length === 0) {
      return;
    }
    
    // Try to find the user's preferred voice
    if (this.settings.voice) {
      this.selectedVoice = this.voices.find(v => v.name === this.settings.voice) || null;
    }
    
    // If no preferred voice or not found, select based on language
    if (!this.selectedVoice) {
      this.selectVoiceForLanguage(this.settings.language);
    }
  }
  
  /**
   * Select a voice that matches the given language
   */
  private selectVoiceForLanguage(langCode: string): void {
    if (this.voices.length === 0) {
      return;
    }
    
    const langPatterns = this.LANGUAGE_VOICE_MAP[langCode] || [langCode, langCode.split('-')[0]];
    
    // Find voices matching the language patterns
    let matchingVoices: SpeechSynthesisVoice[] = [];
    for (const pattern of langPatterns) {
      matchingVoices = this.voices.filter(v => 
        v.lang.toLowerCase().startsWith(pattern.toLowerCase()) ||
        v.lang.toLowerCase().replace('_', '-').startsWith(pattern.toLowerCase().replace('_', '-'))
      );
      if (matchingVoices.length > 0) break;
    }
    
    if (matchingVoices.length > 0) {
      // Prefer a female voice as they're often clearer in navigation systems
      this.selectedVoice = matchingVoices.find(v => v.name.toLowerCase().includes('female')) ||
                          matchingVoices.find(v => v.name.toLowerCase().includes('samantha')) ||
                          matchingVoices.find(v => v.name.toLowerCase().includes('kate')) ||
                          matchingVoices.find(v => v.name.toLowerCase().includes('zira')) ||
                          matchingVoices.find(v => v.name.toLowerCase().includes('google')) ||
                          matchingVoices[0];
      console.log(`[NavigationVoice] Selected voice for ${langCode}:`, this.selectedVoice?.name);
    } else {
      // Fallback to English if no matching voice found
      console.warn(`[NavigationVoice] No voice found for ${langCode}, falling back to English`);
      const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
      this.selectedVoice = englishVoices[0] || this.voices[0];
    }
  }
  
  /**
   * Set the language for voice guidance
   */
  public setLanguage(langCode: string): void {
    this.settings.language = langCode;
    this.saveSettings();
    this.selectVoiceForLanguage(langCode);
    console.log(`[NavigationVoice] Language set to ${langCode}`);
  }
  
  /**
   * Get current language
   */
  public getLanguage(): string {
    return this.settings.language;
  }
  
  /**
   * Load settings from localStorage
   */
  private loadSettings(): VoiceSettings {
    try {
      const stored = localStorage.getItem('trucknav_voice_settings');
      if (stored) {
        return { ...this.DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('[NavigationVoice] Failed to load settings:', error);
    }
    return { ...this.DEFAULT_SETTINGS };
  }
  
  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('trucknav_voice_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('[NavigationVoice] Failed to save settings:', error);
    }
  }
  
  /**
   * Update voice settings
   */
  public updateSettings(settings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();
    
    // Reload voice if changed
    if (settings.voice !== undefined) {
      this.loadVoices();
    }
  }
  
  /**
   * Get current settings
   */
  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }
  
  /**
   * Enable or disable voice guidance
   */
  public setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.saveSettings();
    
    if (!enabled) {
      this.cancelCurrent();
      this.clearQueue();
    }
  }
  
  /**
   * Check if voice guidance is enabled
   */
  public isEnabled(): boolean {
    return this.settings.enabled && this.isInitialized;
  }
  
  /**
   * Speak a navigation instruction
   */
  public speak(text: string, level: VoiceGuidanceLevel = 'normal', interrupt: boolean = false): void {
    if (!this.isEnabled()) {
      return;
    }
    
    const instruction: QueuedInstruction = {
      text,
      level,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now()
    };
    
    if (interrupt) {
      // Cancel current speech and clear queue for urgent messages
      this.cancelCurrent();
      this.clearQueue();
      this.processInstruction(instruction);
    } else if (level === 'critical') {
      // Critical messages jump to front of queue
      this.instructionQueue.unshift(instruction);
      if (!this.isSpeaking) {
        this.processQueue();
      }
    } else {
      // Normal queuing
      this.instructionQueue.push(instruction);
      if (!this.isSpeaking) {
        this.processQueue();
      }
    }
  }
  
  /**
   * Process queued instructions
   */
  private processQueue(): void {
    if (this.instructionQueue.length === 0 || this.isSpeaking) {
      return;
    }
    
    const instruction = this.instructionQueue.shift();
    if (instruction) {
      this.processInstruction(instruction);
    }
  }
  
  /**
   * Process a single instruction
   */
  private processInstruction(instruction: QueuedInstruction): void {
    if (!this.synthesis) {
      return;
    }
    
    this.isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(instruction.text);
    
    // Set voice if available
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    
    // Set speech parameters based on urgency level
    const rateMultiplier = this.SPEECH_RATES[instruction.level];
    utterance.rate = this.settings.rate * rateMultiplier;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;
    
    // Handle completion
    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.processQueue(); // Process next in queue
    };
    
    // Handle errors
    utterance.onerror = (event) => {
      console.warn('[NavigationVoice] Speech error:', event);
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.processQueue(); // Try next in queue
    };
    
    this.currentUtterance = utterance;
    this.synthesis.speak(utterance);
  }
  
  /**
   * Cancel current speech
   */
  public cancelCurrent(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }
  
  /**
   * Clear instruction queue
   */
  public clearQueue(): void {
    this.instructionQueue = [];
  }
  
  /**
   * Announce turn-by-turn navigation
   */
  public announceTurn(
    direction: string,
    distance: number, // in meters
    roadName?: string,
    unit: 'mi' | 'km' = 'mi'
  ): void {
    if (!this.isEnabled()) {
      return;
    }
    
    // Convert to feet for imperial, meters for metric
    const distanceInFeet = distance * 3.28084;
    const distanceInMeters = distance;
    
    // Determine announcement based on distance
    let announcement = '';
    let level: VoiceGuidanceLevel = 'normal';
    
    // Format direction for speech
    const formattedDirection = this.formatDirection(direction);
    
    // Check if we should announce based on distance thresholds
    if (unit === 'mi') {
      if (distanceInFeet <= this.DISTANCE_THRESHOLDS.IMMEDIATE) {
        announcement = `${formattedDirection} now`;
        level = 'critical';
      } else if (distanceInFeet <= this.DISTANCE_THRESHOLDS.NEAR) {
        announcement = `${formattedDirection} in 200 feet`;
        level = 'urgent';
      } else if (distanceInFeet <= this.DISTANCE_THRESHOLDS.MEDIUM) {
        announcement = `In 500 feet, ${formattedDirection}`;
        level = 'normal';
      } else if (distanceInFeet <= this.DISTANCE_THRESHOLDS.FAR) {
        announcement = `In 800 feet, ${formattedDirection}`;
        level = 'normal';
      }
    } else {
      // Metric system
      if (distanceInMeters <= 15) {
        announcement = `${formattedDirection} now`;
        level = 'critical';
      } else if (distanceInMeters <= 60) {
        announcement = `${formattedDirection} in 50 meters`;
        level = 'urgent';
      } else if (distanceInMeters <= 150) {
        announcement = `In 150 meters, ${formattedDirection}`;
        level = 'normal';
      } else if (distanceInMeters <= 250) {
        announcement = `In 250 meters, ${formattedDirection}`;
        level = 'normal';
      }
    }
    
    // Add road name if available and enabled
    if (announcement && roadName && this.settings.announceRoadNames) {
      if (level === 'critical') {
        announcement += ` onto ${roadName}`;
      } else {
        announcement += ` onto ${roadName}`;
      }
    }
    
    // Prevent duplicate announcements for the same turn at similar distances
    const turnKey = `${direction}-${Math.floor(distance / 50)}`;
    if (announcement && turnKey !== this.lastAnnouncedTurn) {
      this.lastAnnouncedTurn = turnKey;
      this.speak(announcement, level, level === 'critical');
    }
  }
  
  /**
   * Format direction for natural speech
   */
  private formatDirection(direction: string): string {
    const directionMap: { [key: string]: string } = {
      'straight': 'Continue straight',
      'right': 'Turn right',
      'left': 'Turn left',
      'slight_right': 'Bear right',
      'slight_left': 'Bear left',
      'sharp_right': 'Turn sharp right',
      'sharp_left': 'Turn sharp left',
      'u_turn': 'Make a U-turn',
      'roundabout_right': 'Take the roundabout to the right',
      'roundabout_left': 'Take the roundabout to the left',
      'exit_right': 'Take the exit on the right',
      'exit_left': 'Take the exit on the left'
    };
    
    return directionMap[direction] || direction;
  }
  
  /**
   * Announce rerouting
   */
  public announceReroute(reason?: string): void {
    if (!this.isEnabled()) {
      return;
    }
    
    let message = 'Recalculating route';
    if (reason) {
      message += `. ${reason}`;
    }
    
    this.speak(message, 'urgent', true);
  }
  
  /**
   * Announce arrival at destination
   */
  public announceArrival(): void {
    if (!this.isEnabled()) {
      return;
    }
    
    this.speak('You have arrived at your destination', 'normal', true);
  }
  
  /**
   * Announce traffic incident
   */
  public announceIncident(type: string, distance?: number): void {
    if (!this.isEnabled()) {
      return;
    }
    
    let message = `Warning: ${type} ahead`;
    if (distance && distance < 5000) { // Less than 5km
      const miles = (distance / 1609.34).toFixed(1);
      message += ` in ${miles} miles`;
    }
    
    this.speak(message, 'urgent', false);
  }
  
  /**
   * Announce speed warning
   */
  public announceSpeedWarning(currentSpeed: number, limit: number, unit: 'mph' | 'kmh' = 'mph'): void {
    if (!this.isEnabled() || !this.settings.announceSpeed) {
      return;
    }
    
    const unitText = unit === 'mph' ? 'miles per hour' : 'kilometers per hour';
    const message = `Speed warning. Current speed ${Math.round(currentSpeed)} ${unitText}. Speed limit is ${limit}`;
    
    this.speak(message, 'urgent', false);
  }
  
  /**
   * Announce lane guidance
   */
  public announceLaneGuidance(lanes: string): void {
    if (!this.isEnabled() || !this.settings.announceLaneGuidance) {
      return;
    }
    
    const message = `Use ${lanes}`;
    this.speak(message, 'normal', false);
  }
  
  /**
   * Test voice with sample message
   */
  public testVoice(): void {
    this.speak('Voice guidance is ready for navigation', 'normal', true);
  }
  
  /**
   * Get available voices
   */
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
  
  /**
   * Check if currently speaking
   */
  public isSpeakingNow(): boolean {
    return this.isSpeaking;
  }
}

// Export singleton instance
export const navigationVoice = NavigationVoice.getInstance();