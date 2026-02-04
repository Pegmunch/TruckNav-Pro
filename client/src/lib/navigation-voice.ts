/**
 * Unified Navigation Voice Guidance System v2.0
 * 
 * MOTORWAY-ONLY MODE: Voice announcements only on motorways
 * - Junction exits and lane guidance only
 * - Emergency traffic notifications always enabled
 * - All other announcements muted
 * 
 * Uses Web Speech API with female voice preference at 0.8 rate
 * Supports 17+ languages with native female voices
 */

import i18n from '@/i18n/config';
import { audioBluetoothInit } from './audio-bluetooth-init';

export type VoiceGuidanceLevel = 'normal' | 'urgent' | 'critical' | 'emergency';
export type DistanceThreshold = 1000 | 500 | 100 | 50; // Distance in feet for announcements
export type AnnouncementType = 'junction' | 'lane_guidance' | 'traffic_emergency' | 'reroute' | 'arrival' | 'speed_warning' | 'general';
export type RoadType = 'motorway' | 'trunk' | 'primary' | 'secondary' | 'residential' | 'unknown';

interface VoiceSettings {
  enabled: boolean;
  voice: string | null;
  rate: number; // Default 0.8 for clearer navigation
  pitch: number;
  volume: number;
  announceDistances: boolean;
  announceRoadNames: boolean;
  announceSpeed: boolean;
  announceLaneGuidance: boolean;
  language: string;
  motorwayOnlyMode: boolean; // NEW: Only announce on motorways
  preferFemaleVoice: boolean; // NEW: Prefer female voices
}

interface QueuedInstruction {
  text: string;
  level: VoiceGuidanceLevel;
  id: string;
  timestamp: number;
  type: AnnouncementType; // NEW: Track announcement type for filtering
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
  private currentRoadType: RoadType = 'unknown'; // Track current road type
  
  // Distance thresholds for announcements (in feet)
  private readonly DISTANCE_THRESHOLDS = {
    FAR: 1000,      // "In 1000 feet..."
    MEDIUM: 500,    // "In 500 feet..."
    NEAR: 100,      // "In 100 feet, turn..."
    IMMEDIATE: 50   // "Turn now"
  };
  
  // Speech rate - slower for clarity (base rate, not urgency multipliers)
  private readonly SPEECH_RATES = {
    normal: 1.0,
    urgent: 1.0,
    critical: 1.0,
    emergency: 1.0
  };
  
  // Female voice name patterns for voice selection
  private readonly FEMALE_VOICE_PATTERNS = [
    'female', 'samantha', 'kate', 'karen', 'moira', 'tessa', 'fiona', 'victoria',
    'zira', 'susan', 'hazel', 'helena', 'linda', 'alice', 'amelie', 'anna',
    'ava', 'catarina', 'ioana', 'joana', 'kanya', 'kyoko', 'laura', 'lekha',
    'luciana', 'mariska', 'mei-jia', 'melina', 'milena', 'monica', 'nora',
    'paulina', 'sara', 'satu', 'sin-ji', 'ting-ting', 'yuna', 'zosia',
    'google uk english female', 'google us english female', 'google female',
    'microsoft zira', 'microsoft hazel', 'microsoft helena', 'microsoft sabina'
  ];
  
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

  // Default settings - female voice at 0.8 rate, all turns announced
  private readonly DEFAULT_SETTINGS: VoiceSettings = {
    enabled: true,
    voice: null,
    rate: 0.8, // Slower for clearer navigation
    pitch: 1.0,
    volume: 1.0, // MAXIMUM volume for clear navigation audio
    announceDistances: true,
    announceRoadNames: true,
    announceSpeed: false,
    announceLaneGuidance: true,
    language: 'en-GB', // Default to British English
    motorwayOnlyMode: false, // Announce ALL turns and lane selections, not just motorways
    preferFemaleVoice: true // Prefer female English voices
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
   * Select a female voice that matches the given language
   * Priority: Female voice in target language > Any voice in target language > Female English > Any
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
      // ALWAYS prefer female voice - check all female patterns
      if (this.settings.preferFemaleVoice) {
        for (const pattern of this.FEMALE_VOICE_PATTERNS) {
          const femaleVoice = matchingVoices.find(v => 
            v.name.toLowerCase().includes(pattern.toLowerCase())
          );
          if (femaleVoice) {
            this.selectedVoice = femaleVoice;
            console.log(`[NavigationVoice] Selected female voice for ${langCode}:`, this.selectedVoice?.name);
            return;
          }
        }
      }
      // No female found, use first matching voice
      this.selectedVoice = matchingVoices[0];
      console.log(`[NavigationVoice] Selected voice for ${langCode}:`, this.selectedVoice?.name);
    } else {
      // Fallback to British English female voice if no matching language found
      console.warn(`[NavigationVoice] No voice found for ${langCode}, falling back to English`);
      const englishVoices = this.voices.filter(v => v.lang.startsWith('en-GB') || v.lang.startsWith('en'));
      
      // Try to find female English voice
      if (this.settings.preferFemaleVoice) {
        for (const pattern of this.FEMALE_VOICE_PATTERNS) {
          const femaleVoice = englishVoices.find(v => 
            v.name.toLowerCase().includes(pattern.toLowerCase())
          );
          if (femaleVoice) {
            this.selectedVoice = femaleVoice;
            return;
          }
        }
      }
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
   * Always ensures volume is at maximum (1.0) for clear navigation audio
   */
  private loadSettings(): VoiceSettings {
    try {
      const stored = localStorage.getItem('trucknav_voice_settings');
      if (stored) {
        const parsedSettings = { ...this.DEFAULT_SETTINGS, ...JSON.parse(stored) };
        // ALWAYS force maximum volume for clear navigation audio
        parsedSettings.volume = 1.0;
        return parsedSettings;
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
   * Returns the setting value directly - don't block on initialization
   */
  public isEnabled(): boolean {
    return this.settings.enabled;
  }
  
  /**
   * Check if voice is fully ready (enabled AND initialized)
   */
  public isReady(): boolean {
    return this.settings.enabled && this.isInitialized;
  }
  
  /**
   * Set volume (0.0 to 1.0)
   */
  public setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    console.log(`[NavigationVoice] Volume set to ${this.settings.volume}`);
  }
  
  /**
   * Get current volume
   */
  public getVolume(): number {
    return this.settings.volume;
  }
  
  /**
   * Force maximum volume - useful for ensuring loud, clear navigation
   */
  public forceMaxVolume(): void {
    this.settings.volume = 1.0;
    this.saveSettings();
    console.log('[NavigationVoice] Volume forced to MAXIMUM (1.0)');
  }
  
  /**
   * Check if volume is at maximum
   */
  public isMaxVolume(): boolean {
    return this.settings.volume >= 1.0;
  }
  
  /**
   * Set current road type for motorway-only filtering
   */
  public setRoadType(roadType: RoadType): void {
    this.currentRoadType = roadType;
  }
  
  /**
   * Get current road type
   */
  public getRoadType(): RoadType {
    return this.currentRoadType;
  }
  
  /**
   * Check if announcement should be spoken based on motorway-only mode
   */
  private shouldAnnounce(type: AnnouncementType): boolean {
    // Emergency traffic notifications ALWAYS get through
    if (type === 'traffic_emergency') {
      return true;
    }
    
    // If motorway-only mode is disabled, allow all announcements
    if (!this.settings.motorwayOnlyMode) {
      return true;
    }
    
    // In motorway-only mode, only allow specific types on motorways/trunk roads
    const isMotorway = this.currentRoadType === 'motorway' || this.currentRoadType === 'trunk';
    
    if (isMotorway) {
      // On motorways: only junction exits and lane guidance
      return type === 'junction' || type === 'lane_guidance' || type === 'arrival';
    }
    
    // On other roads: mute all except traffic emergencies (already handled above)
    return false;
  }
  
  /**
   * Check if global mute (Mute All Alerts) is enabled
   */
  private isGlobalMuted(): boolean {
    try {
      return localStorage.getItem('trucknav_mute_all_alerts') === 'true';
    } catch {
      return false;
    }
  }
  
  /**
   * Speak a navigation instruction with type filtering
   */
  public speak(text: string, level: VoiceGuidanceLevel = 'normal', interrupt: boolean = false, type: AnnouncementType = 'general'): void {
    // Check global mute first (Mute All Alerts button)
    if (this.isGlobalMuted()) {
      console.log('[NavigationVoice] Global mute active (Mute All Alerts) - not speaking');
      return;
    }
    
    if (!this.settings.enabled) {
      console.log('[NavigationVoice] Voice disabled in settings - not speaking');
      return;
    }
    
    // Attempt late initialization if needed
    if (!this.isInitialized) {
      console.log('[NavigationVoice] Late initialization attempt...');
      this.loadVoices();
      this.isInitialized = this.voices.length > 0;
      if (!this.isInitialized) {
        console.warn('[NavigationVoice] No voices available - speech synthesis may not work');
      }
    }
    
    // Check if this announcement should be spoken based on motorway-only mode
    if (!this.shouldAnnounce(type)) {
      console.log(`[NavigationVoice] Muted ${type} announcement (motorway-only mode, road: ${this.currentRoadType})`);
      return;
    }
    
    console.log(`[NavigationVoice] 🔊 Speaking: "${text.substring(0, 50)}..." (type: ${type}, level: ${level})`);
    
    const instruction: QueuedInstruction = {
      text,
      level,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type
    };
    
    if (interrupt || level === 'emergency') {
      // Cancel current speech and clear queue for urgent/emergency messages
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
   * Ensures audio is initialized for Bluetooth/CarPlay/Android Auto before speaking
   * 
   * iOS FIXES:
   * 1. Activate Bluetooth audio route before speaking
   * 2. Call cancel() before speak() - iOS 15+ bug workaround
   * 3. Reload voices if empty - iOS sometimes loses voices
   * 4. Small delay after cancel on iOS to prevent silent failures
   */
  private async processInstruction(instruction: QueuedInstruction): Promise<void> {
    console.log(`[NavigationVoice] Processing instruction: "${instruction.text.substring(0, 40)}..."`);
    
    if (!this.synthesis) {
      console.warn('[NavigationVoice] ❌ No speech synthesis available - window.speechSynthesis is undefined');
      return;
    }
    
    // Check if speech synthesis is supported and working
    if (typeof this.synthesis.speak !== 'function') {
      console.warn('[NavigationVoice] ❌ Speech synthesis speak method not available');
      return;
    }
    
    // Ensure audio is initialized for Bluetooth/CarPlay/Android Auto
    if (!audioBluetoothInit.getIsInitialized()) {
      console.log('[NavigationVoice] Initializing audio for Bluetooth/CarPlay...');
      await audioBluetoothInit.initialize();
    }
    
    // CRITICAL: Activate Bluetooth audio route BEFORE speaking
    // This plays a brief silent audio to "wake up" the Bluetooth connection
    // Without this, speech often plays through device speaker instead of car audio
    await audioBluetoothInit.activateBluetoothForSpeech();
    
    // iOS FIX: Reload voices if they got lost (common iOS issue)
    if (this.voices.length === 0 || !this.selectedVoice) {
      console.log('[NavigationVoice] Reloading voices before speaking...');
      this.loadVoices();
      // Wait a tiny bit for voices to load
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // iOS FIX: ALWAYS cancel before speaking - critical for iOS 15+
    // This prevents the "silent speech" bug where speak() is silently ignored
    this.synthesis.cancel();
    
    // iOS FIX: Small delay after cancel to ensure iOS processes it
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(instruction.text);
    
    // Set voice if available
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    } else if (this.voices.length > 0) {
      // Fallback: use first available voice
      utterance.voice = this.voices[0];
      console.log('[NavigationVoice] Using fallback voice:', this.voices[0]?.name);
    }
    
    // Set speech parameters based on urgency level
    const rateMultiplier = this.SPEECH_RATES[instruction.level];
    utterance.rate = this.settings.rate * rateMultiplier;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;
    
    // iOS FIX: Ensure volume is at least 0.5 (some iOS versions have volume issues)
    if (isIOS && utterance.volume < 0.5) {
      utterance.volume = 1.0;
    }
    
    console.log('[NavigationVoice] 🔊 Speaking:', instruction.text.substring(0, 50) + '...', {
      voice: utterance.voice?.name || 'default',
      volume: utterance.volume,
      rate: utterance.rate,
      lang: utterance.lang || 'default'
    });
    
    // Handle speech start - confirms audio is actually playing
    utterance.onstart = () => {
      console.log('[NavigationVoice] 🎙️ Speech STARTED - audio should now be playing through speakers');
      console.log('[NavigationVoice] If you see this but hear nothing, the audio route is wrong (device speaker vs Bluetooth)');
    };
    
    // Handle completion
    utterance.onend = () => {
      console.log('[NavigationVoice] ✅ Speech COMPLETED successfully');
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.processQueue(); // Process next in queue
    };
    
    // Handle errors with detailed error info
    utterance.onerror = (event) => {
      const errorType = (event as any).error || 'unknown';
      console.warn('[NavigationVoice] ❌ Speech error:', errorType);
      console.warn('[NavigationVoice] Error details:', {
        error: errorType,
        charIndex: (event as any).charIndex,
        elapsedTime: (event as any).elapsedTime,
        name: (event as any).name
      });
      
      // Specific iOS error handling
      if (errorType === 'interrupted') {
        console.log('[NavigationVoice] Speech was interrupted - another audio source took over');
      } else if (errorType === 'canceled') {
        console.log('[NavigationVoice] Speech was canceled - this is normal if cancel() was called');
      } else if (errorType === 'synthesis-failed') {
        console.log('[NavigationVoice] Synthesis failed - voice engine error, will retry with next instruction');
      } else if (errorType === 'audio-busy') {
        console.log('[NavigationVoice] Audio busy - another audio session is active');
      }
      
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.processQueue(); // Try next in queue
    };
    
    // Handle boundary events (word/sentence) for debugging
    utterance.onboundary = (event) => {
      if (event.name === 'sentence') {
        console.log('[NavigationVoice] 📍 Sentence boundary reached at char:', event.charIndex);
      }
    };
    
    this.currentUtterance = utterance;
    
    // iOS FIX: Try-catch the speak call as iOS can throw errors
    try {
      console.log('[NavigationVoice] Calling speechSynthesis.speak()...');
      this.synthesis.speak(utterance);
      console.log('[NavigationVoice] speechSynthesis.speak() called - pending:', this.synthesis.pending, 'speaking:', this.synthesis.speaking);
    } catch (error) {
      console.error('[NavigationVoice] ❌ Failed to speak:', error);
      this.isSpeaking = false;
      this.processQueue();
    }
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
    // Imperial: 1000ft, 500ft, 100ft, now
    // Metric: 300m, 150m, 30m, now
    if (unit === 'mi') {
      if (distanceInFeet <= this.DISTANCE_THRESHOLDS.IMMEDIATE) {
        announcement = this.t('voice.distances.now', { direction: formattedDirection });
        level = 'critical';
      } else if (distanceInFeet <= this.DISTANCE_THRESHOLDS.NEAR) {
        // 100 feet - urgent turn warning
        announcement = this.t('voice.distances.in_100_feet', { direction: formattedDirection });
        level = 'urgent';
      } else if (distanceInFeet <= this.DISTANCE_THRESHOLDS.MEDIUM) {
        // 500 feet - prepare
        announcement = this.t('voice.distances.in_500_feet', { direction: formattedDirection });
        level = 'normal';
      } else if (distanceInFeet <= this.DISTANCE_THRESHOLDS.FAR) {
        // 1000 feet - advance notice
        announcement = this.t('voice.distances.in_1000_feet', { direction: formattedDirection });
        level = 'normal';
      }
    } else {
      // Metric system: 300m, 150m, 30m, now
      if (distanceInMeters <= 15) {
        announcement = this.t('voice.distances.now', { direction: formattedDirection });
        level = 'critical';
      } else if (distanceInMeters <= 30) {
        // 30 meters - urgent
        announcement = this.t('voice.distances.in_30_meters', { direction: formattedDirection });
        level = 'urgent';
      } else if (distanceInMeters <= 150) {
        // 150 meters - prepare
        announcement = this.t('voice.distances.in_150_meters', { direction: formattedDirection });
        level = 'normal';
      } else if (distanceInMeters <= 300) {
        // 300 meters - advance notice
        announcement = this.t('voice.distances.in_300_meters', { direction: formattedDirection });
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
      console.log(`[NavigationVoice] Announcing: "${announcement}" (level: ${level}, enabled: ${this.isEnabled()})`);
      // Use 'junction' type for motorway junction exits
      this.speak(announcement, level, level === 'critical', 'junction');
    } else if (!announcement) {
      console.log(`[NavigationVoice] No announcement for distance ${distance.toFixed(0)}m (${unit})`);
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
   * Announce rerouting - treated as traffic emergency to always announce
   */
  public announceReroute(reason?: string): void {
    if (!this.isEnabled()) {
      return;
    }
    
    let message = this.t('voice.announcements.recalculating');
    if (reason) {
      message += `. ${reason}`;
    }
    
    // Rerouting is important enough to announce
    this.speak(message, 'urgent', true, 'traffic_emergency');
  }
  
  /**
   * Announce arrival at destination - always announces
   */
  public announceArrival(): void {
    if (!this.isEnabled()) {
      return;
    }
    
    this.speak(this.t('voice.announcements.arrived'), 'normal', true, 'arrival');
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
   * Announce traffic incident - ALWAYS speaks (emergency)
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
    
    // Traffic incidents are emergency - always announce
    this.speak(message, 'emergency', true, 'traffic_emergency');
  }
  
  /**
   * Announce traffic delay/congestion - ALWAYS speaks (emergency)
   */
  public announceTrafficDelay(severity: string, delayMinutes?: number): void {
    if (!this.isEnabled()) {
      return;
    }
    
    let message = this.t('voice.warnings.traffic_delay', { severity });
    if (delayMinutes && delayMinutes > 0) {
      message += ' ' + this.t('voice.warnings.delay_time', { minutes: Math.round(delayMinutes) });
    }
    
    // Traffic delays are emergency - always announce
    this.speak(message, 'emergency', true, 'traffic_emergency');
  }
  
  /**
   * Announce speed warning - uses speed_warning type (muted in motorway-only mode)
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
    
    // Speed warnings are muted in motorway-only mode (uses general type)
    this.speak(message, 'urgent', false, 'speed_warning');
  }
  
  /**
   * Enable/disable motorway-only mode
   */
  public setMotorwayOnlyMode(enabled: boolean): void {
    this.settings.motorwayOnlyMode = enabled;
    this.saveSettings();
    console.log(`[NavigationVoice] Motorway-only mode: ${enabled ? 'ON' : 'OFF'}`);
  }
  
  /**
   * Check if motorway-only mode is enabled
   */
  public isMotorwayOnlyMode(): boolean {
    return this.settings.motorwayOnlyMode;
  }
  
  /**
   * Announce lane guidance with distance-based announcements
   * Uses same distance thresholds as turn announcements: 1000ft, 500ft, 100ft
   */
  public announceLaneGuidance(lanes: string, distance?: number, unit: 'mi' | 'km' = 'mi'): void {
    if (!this.isEnabled() || !this.settings.announceLaneGuidance) {
      return;
    }
    
    let message: string;
    let level: VoiceGuidanceLevel = 'normal';
    
    if (distance !== undefined) {
      const distanceInFeet = distance * 3.28084;
      const distanceInMeters = distance;
      
      if (unit === 'mi') {
        // Imperial: 1000ft, 500ft, 100ft
        if (distanceInFeet <= this.DISTANCE_THRESHOLDS.NEAR) {
          // 100 feet - urgent
          message = this.t('voice.announcements.use_lanes_in_100_feet', { lanes });
          level = 'urgent';
        } else if (distanceInFeet <= this.DISTANCE_THRESHOLDS.MEDIUM) {
          // 500 feet
          message = this.t('voice.announcements.use_lanes_in_500_feet', { lanes });
        } else if (distanceInFeet <= this.DISTANCE_THRESHOLDS.FAR) {
          // 1000 feet
          message = this.t('voice.announcements.use_lanes_in_1000_feet', { lanes });
        } else {
          return; // Too far, don't announce yet
        }
      } else {
        // Metric: 300m, 150m, 30m
        if (distanceInMeters <= 30) {
          // 30 meters - urgent
          message = this.t('voice.announcements.use_lanes_in_30_meters', { lanes });
          level = 'urgent';
        } else if (distanceInMeters <= 150) {
          // 150 meters
          message = this.t('voice.announcements.use_lanes_in_150_meters', { lanes });
        } else if (distanceInMeters <= 300) {
          // 300 meters
          message = this.t('voice.announcements.use_lanes_in_300_meters', { lanes });
        } else {
          return; // Too far, don't announce yet
        }
      }
    } else {
      // No distance provided, use simple announcement
      message = this.t('voice.announcements.use_lanes', { lanes });
    }
    
    this.speak(message, level, false, 'lane_guidance');
  }
  
  /**
   * Test voice with sample message
   * This is called from user gesture (button tap) so it should work on iOS
   * Also tests Bluetooth routing to ensure voice comes through car speakers
   */
  public async testVoice(): Promise<void> {
    console.log('[NavigationVoice] 🧪 Test voice triggered by user gesture');
    console.log('[NavigationVoice] Current settings:', JSON.stringify(this.settings));
    console.log('[NavigationVoice] Voices loaded:', this.voices.length);
    console.log('[NavigationVoice] Selected voice:', this.selectedVoice?.name || 'none');
    
    // Force enable voice for this test
    const wasEnabled = this.settings.enabled;
    this.settings.enabled = true;
    
    // Ensure audio is initialized (this is a user gesture so it should work)
    await audioBluetoothInit.initialize();
    
    // CRITICAL: Activate Bluetooth audio route for the test
    // This ensures the test voice plays through the car speakers, not just the phone
    await audioBluetoothInit.activateBluetoothForSpeech();
    
    // Reload voices on iOS if needed (or any platform)
    if (this.voices.length === 0 || !this.selectedVoice) {
      console.log('[NavigationVoice] Loading voices for test...');
      this.loadVoices();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // iOS: Cancel any pending speech first
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    
    // Small delay for iOS to process the cancel
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // Speak the test message directly (bypass the speak method to ensure it works)
    const testText = this.t('voice.announcements.voice_ready') || 'Voice navigation is ready';
    console.log('[NavigationVoice] 🔊 Speaking test message:', testText);
    
    const utterance = new SpeechSynthesisUtterance(testText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    } else if (this.voices.length > 0) {
      utterance.voice = this.voices[0];
    }
    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = 1.0; // Maximum volume for test
    
    utterance.onend = () => {
      console.log('[NavigationVoice] ✅ Test voice completed successfully');
    };
    
    utterance.onerror = (event) => {
      console.error('[NavigationVoice] ❌ Test voice error:', event.error);
    };
    
    try {
      this.synthesis.speak(utterance);
    } catch (error) {
      console.error('[NavigationVoice] ❌ Failed to speak test:', error);
    }
    
    // Restore original enabled state
    this.settings.enabled = wasEnabled;
  }
  
  /**
   * Prime voice for iOS Safari - must be called during a user gesture (button tap)
   * iOS Safari requires the first speech to happen during a user interaction to unlock speech synthesis
   * This speaks an empty/silent utterance to prime the audio system
   */
  public async primeForUserGesture(): Promise<void> {
    if (!this.synthesis) {
      console.warn('[NavigationVoice] Cannot prime - synthesis not available');
      return;
    }
    
    console.log('[NavigationVoice] 🔓 Priming voice for user gesture...');
    
    // Ensure audio is initialized first
    await audioBluetoothInit.initialize();
    
    // Ensure voice is enabled
    this.settings.enabled = true;
    this.saveSettings();
    
    // Reload voices if needed (iOS sometimes needs this)
    if (this.voices.length === 0) {
      this.loadVoices();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Create a silent utterance to prime iOS Safari speech synthesis
    // Using a single space character instead of empty string (empty strings are ignored)
    const silentUtterance = new SpeechSynthesisUtterance(' ');
    silentUtterance.volume = 0.01; // Very low volume (0 may be ignored on some devices)
    silentUtterance.rate = 10; // Fast (won't be heard anyway)
    
    // Select voice if available
    if (this.selectedVoice) {
      silentUtterance.voice = this.selectedVoice;
    } else if (this.voices.length > 0) {
      silentUtterance.voice = this.voices[0];
    }
    
    try {
      // Cancel any existing speech first
      this.synthesis.cancel();
      
      // iOS: Wait a bit after cancel
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Speak silent utterance to prime the system
      this.synthesis.speak(silentUtterance);
      console.log('[NavigationVoice] 🔊 Primed for iOS Safari user gesture');
    } catch (error) {
      console.warn('[NavigationVoice] Priming failed:', error);
    }
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