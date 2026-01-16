/**
 * Navigation Voice Guidance System
 * 
 * Uses Web Speech API to provide turn-by-turn voice navigation for truck drivers.
 * Handles upcoming maneuvers, urgent instructions, and interruptions.
 * Supports multiple languages via i18next integration.
 */

import i18n from '@/i18n/config';

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
  
  // Supported language voice codes mapping - comprehensive for all countries
  private readonly LANGUAGE_VOICE_MAP: { [key: string]: string[] } = {
    'en-US': ['en-US', 'en_US', 'en'],
    'en-GB': ['en-GB', 'en_GB', 'en-AU', 'en'],
    'en-CA': ['en-CA', 'en_CA', 'en-US', 'en'],
    'en-AU': ['en-AU', 'en_AU', 'en-GB', 'en'],
    'es-ES': ['es-ES', 'es_ES', 'es'],
    'es-MX': ['es-MX', 'es_MX', 'es-ES', 'es'],
    'de-DE': ['de-DE', 'de_DE', 'de-AT', 'de'],
    'fr-FR': ['fr-FR', 'fr_FR', 'fr-CA', 'fr'],
    'fr-CA': ['fr-CA', 'fr_CA', 'fr-FR', 'fr'],
    'it-IT': ['it-IT', 'it_IT', 'it'],
    'pt-BR': ['pt-BR', 'pt_BR', 'pt-PT', 'pt'],
    'pt-PT': ['pt-PT', 'pt_PT', 'pt-BR', 'pt'],
    'pl-PL': ['pl-PL', 'pl_PL', 'pl'],
    'ro-RO': ['ro-RO', 'ro_RO', 'ro'],
    'nl-NL': ['nl-NL', 'nl_NL', 'nl-BE', 'nl'],
    'ru-RU': ['ru-RU', 'ru_RU', 'ru'],
    'tr-TR': ['tr-TR', 'tr_TR', 'tr'],
    'ar-SA': ['ar-SA', 'ar_SA', 'ar-AE', 'ar'],
    'ar-AE': ['ar-AE', 'ar_AE', 'ar-SA', 'ar'],
    'hi-IN': ['hi-IN', 'hi_IN', 'hi'],
    'zh-CN': ['zh-CN', 'zh_CN', 'zh-Hans', 'cmn-Hans-CN', 'zh'],
    'zh-TW': ['zh-TW', 'zh_TW', 'zh-Hant', 'cmn-Hant-TW', 'zh'],
    'ja-JP': ['ja-JP', 'ja_JP', 'ja'],
    'ko-KR': ['ko-KR', 'ko_KR', 'ko'],
    'sv-SE': ['sv-SE', 'sv_SE', 'sv'],
    'da-DK': ['da-DK', 'da_DK', 'da'],
    'no-NO': ['no-NO', 'no_NO', 'nb-NO', 'nn-NO', 'no'],
    'fi-FI': ['fi-FI', 'fi_FI', 'fi'],
    'cs-CZ': ['cs-CZ', 'cs_CZ', 'cs'],
    'hu-HU': ['hu-HU', 'hu_HU', 'hu'],
    'el-GR': ['el-GR', 'el_GR', 'el'],
    'he-IL': ['he-IL', 'he_IL', 'he'],
    'th-TH': ['th-TH', 'th_TH', 'th'],
    'vi-VN': ['vi-VN', 'vi_VN', 'vi'],
    'id-ID': ['id-ID', 'id_ID', 'id'],
    'ms-MY': ['ms-MY', 'ms_MY', 'ms'],
    'uk-UA': ['uk-UA', 'uk_UA', 'uk'],
    'bg-BG': ['bg-BG', 'bg_BG', 'bg'],
    'hr-HR': ['hr-HR', 'hr_HR', 'hr'],
    'sk-SK': ['sk-SK', 'sk_SK', 'sk'],
    'sl-SI': ['sl-SI', 'sl_SI', 'sl'],
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
        announcement = this.t('voice.distances.now', { direction: formattedDirection });
        level = 'critical';
      } else if (distanceInFeet <= this.DISTANCE_THRESHOLDS.NEAR) {
        announcement = this.t('voice.distances.in_200_feet', { direction: formattedDirection });
        level = 'urgent';
      } else if (distanceInFeet <= this.DISTANCE_THRESHOLDS.MEDIUM) {
        announcement = this.t('voice.distances.in_500_feet', { direction: formattedDirection });
        level = 'normal';
      } else if (distanceInFeet <= this.DISTANCE_THRESHOLDS.FAR) {
        announcement = this.t('voice.distances.in_800_feet', { direction: formattedDirection });
        level = 'normal';
      }
    } else {
      // Metric system
      if (distanceInMeters <= 15) {
        announcement = this.t('voice.distances.now', { direction: formattedDirection });
        level = 'critical';
      } else if (distanceInMeters <= 60) {
        announcement = this.t('voice.distances.in_50_meters', { direction: formattedDirection });
        level = 'urgent';
      } else if (distanceInMeters <= 150) {
        announcement = this.t('voice.distances.in_150_meters', { direction: formattedDirection });
        level = 'normal';
      } else if (distanceInMeters <= 250) {
        announcement = this.t('voice.distances.in_250_meters', { direction: formattedDirection });
        level = 'normal';
      }
    }
    
    // Add road name if available and enabled
    if (announcement && roadName && this.settings.announceRoadNames) {
      announcement += ' ' + this.t('voice.onto_road', { roadName });
    }
    
    // Prevent duplicate announcements for the same turn at similar distances
    const turnKey = `${direction}-${Math.floor(distance / 50)}`;
    if (announcement && turnKey !== this.lastAnnouncedTurn) {
      this.lastAnnouncedTurn = turnKey;
      this.speak(announcement, level, level === 'critical');
    }
  }
  
  /**
   * Get translated string using i18next
   */
  private t(key: string, options?: Record<string, unknown>): string {
    return i18n.t(key, options) as string;
  }
  
  /**
   * Format direction for natural speech using translations
   */
  private formatDirection(direction: string): string {
    const directionKey = `voice.directions.${direction}`;
    const translated = this.t(directionKey);
    // Fallback to direction string if translation key not found
    return translated !== directionKey ? translated : direction;
  }
  
  /**
   * Announce rerouting
   */
  public announceReroute(reason?: string): void {
    if (!this.isEnabled()) {
      return;
    }
    
    let message = this.t('voice.announcements.recalculating');
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
    
    this.speak(this.t('voice.announcements.arrived'), 'normal', true);
  }
  
  /**
   * Check if current language should use metric system
   */
  private shouldUseMetric(): boolean {
    // US and UK use imperial (miles), most other countries use metric (kilometers)
    const imperialLanguages = ['en-US', 'en-GB'];
    return !imperialLanguages.includes(this.settings.language);
  }
  
  /**
   * Announce traffic incident
   */
  public announceIncident(type: string, distance?: number, useMetric?: boolean): void {
    if (!this.isEnabled()) {
      return;
    }
    
    // Auto-detect metric if not specified
    const isMetric = useMetric ?? this.shouldUseMetric();
    
    // Try to get translated incident type
    const incidentTypeKey = `voice.incidents.${type.toLowerCase().replace(/\s+/g, '_')}`;
    const translatedType = this.t(incidentTypeKey);
    const displayType = translatedType !== incidentTypeKey ? translatedType : type;
    
    let message = this.t('voice.warnings.incident_ahead', { type: displayType });
    if (distance && distance < 5000) { // Less than 5km
      if (isMetric) {
        const km = (distance / 1000).toFixed(1);
        message += ' ' + this.t('voice.warnings.in_kilometers', { distance: km });
      } else {
        const miles = (distance / 1609.34).toFixed(1);
        message += ' ' + this.t('voice.warnings.in_miles', { distance: miles });
      }
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
    
    const unitKey = unit === 'mph' ? 'voice.units.mph' : 'voice.units.kmh';
    const unitText = this.t(unitKey);
    const message = this.t('voice.warnings.speed_warning', { 
      speed: Math.round(currentSpeed), 
      unit: unitText, 
      limit 
    });
    
    this.speak(message, 'urgent', false);
  }
  
  /**
   * Announce lane guidance
   */
  public announceLaneGuidance(lanes: string): void {
    if (!this.isEnabled() || !this.settings.announceLaneGuidance) {
      return;
    }
    
    const message = this.t('voice.announcements.use_lanes', { lanes });
    this.speak(message, 'normal', false);
  }
  
  /**
   * Test voice with sample message
   */
  public testVoice(): void {
    this.speak(this.t('voice.announcements.voice_ready'), 'normal', true);
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