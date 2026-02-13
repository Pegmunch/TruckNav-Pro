/**
 * Alert Sounds Service for TruckNav Pro
 * 
 * Provides customizable audio alerts for:
 * - Speed limit warnings (when exceeding speed limit)
 * - Traffic incidents (accidents, road closures, congestion)
 * - Fatigue warnings (break reminders)
 * 
 * Features:
 * - Multiple sound options per alert type
 * - Volume control per alert type
 * - Enable/disable per alert type
 * - Web Audio API for reliable mobile playback
 */

export type AlertType = 'speedLimit' | 'traffic' | 'fatigue' | 'upcomingTurn';

export type SoundOption = {
  id: string;
  name: string;
  description: string;
};

export const SOUND_OPTIONS: Record<AlertType, SoundOption[]> = {
  speedLimit: [
    { id: 'beep', name: 'Beep', description: 'Simple beep tone' },
    { id: 'chime', name: 'Chime', description: 'Gentle chime' },
    { id: 'alert', name: 'Alert', description: 'Urgent alert tone' },
    { id: 'triple', name: 'Triple Beep', description: 'Three quick beeps' },
    { id: 'none', name: 'None', description: 'No sound' },
  ],
  traffic: [
    { id: 'notification', name: 'Notification', description: 'Standard notification' },
    { id: 'ding', name: 'Ding', description: 'Single ding' },
    { id: 'chime', name: 'Chime', description: 'Gentle chime' },
    { id: 'alert', name: 'Alert', description: 'Urgent alert' },
    { id: 'none', name: 'None', description: 'No sound' },
  ],
  fatigue: [
    { id: 'gentle', name: 'Gentle', description: 'Soft reminder' },
    { id: 'chime', name: 'Chime', description: 'Musical chime' },
    { id: 'alarm', name: 'Alarm', description: 'Wake-up alarm' },
    { id: 'bell', name: 'Bell', description: 'Bell ring' },
    { id: 'none', name: 'None', description: 'No sound' },
  ],
  upcomingTurn: [
    { id: 'ping', name: 'Ping', description: 'Quick directional ping' },
    { id: 'tick', name: 'Tick', description: 'Soft tick sound' },
    { id: 'boop', name: 'Boop', description: 'Two-tone boop' },
    { id: 'sonar', name: 'Sonar', description: 'Sonar-style pulse' },
    { id: 'none', name: 'None', description: 'No sound' },
  ],
};

export interface AlertSoundSettings {
  enabled: boolean;
  volume: number; // 0-1
  selectedSound: string;
}

export interface AllAlertSoundSettings {
  speedLimit: AlertSoundSettings;
  traffic: AlertSoundSettings;
  fatigue: AlertSoundSettings;
  upcomingTurn: AlertSoundSettings;
  masterVolume: number; // 0-1
}

const ALERT_SOUNDS_KEY = 'trucknav_alert_sounds';

const defaultSettings: AllAlertSoundSettings = {
  speedLimit: {
    enabled: true,
    volume: 0.8,
    selectedSound: 'beep',
  },
  traffic: {
    enabled: true,
    volume: 0.7,
    selectedSound: 'notification',
  },
  fatigue: {
    enabled: true,
    volume: 0.9,
    selectedSound: 'chime',
  },
  upcomingTurn: {
    enabled: true,
    volume: 0.6,
    selectedSound: 'ping',
  },
  masterVolume: 0.8,
};

const GLOBAL_MUTE_KEY = 'trucknav_mute_all_alerts';

class AlertSoundsService {
  private audioContext: AudioContext | null = null;
  private settings: AllAlertSoundSettings;
  private globalMuted: boolean = false;
  private lastPlayedTime: Record<AlertType, number> = {
    speedLimit: 0,
    traffic: 0,
    fatigue: 0,
    upcomingTurn: 0,
  };
  private cooldownMs: Record<AlertType, number> = {
    speedLimit: 5000,
    traffic: 10000,
    fatigue: 30000,
    upcomingTurn: 8000,
  };

  constructor() {
    this.settings = this.loadSettings();
    this.globalMuted = localStorage.getItem(GLOBAL_MUTE_KEY) === 'true';
  }

  setGlobalMute(muted: boolean): void {
    this.globalMuted = muted;
  }

  isGlobalMuted(): boolean {
    return this.globalMuted;
  }

  private loadSettings(): AllAlertSoundSettings {
    try {
      const stored = localStorage.getItem(ALERT_SOUNDS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load alert sound settings:', error);
    }
    return { ...defaultSettings };
  }

  saveSettings(settings: AllAlertSoundSettings): void {
    this.settings = settings;
    try {
      localStorage.setItem(ALERT_SOUNDS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save alert sound settings:', error);
    }
  }

  getSettings(): AllAlertSoundSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<AllAlertSoundSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings(this.settings);
  }

  updateAlertSettings(alertType: AlertType, updates: Partial<AlertSoundSettings>): void {
    this.settings[alertType] = { ...this.settings[alertType], ...updates };
    this.saveSettings(this.settings);
  }

  private getAudioContext(): AudioContext {
    // Try to use shared AudioContext from Bluetooth init for better routing
    try {
      const { audioBluetoothInit } = require('./audio-bluetooth-init');
      const sharedContext: AudioContext | null = audioBluetoothInit.getAudioContext();
      if (sharedContext !== null && sharedContext.state !== 'closed') {
        this.audioContext = sharedContext;
        return this.audioContext;
      }
    } catch (e) {
      // Fall through to create new context
    }
    
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private canPlay(alertType: AlertType): boolean {
    if (this.globalMuted) {
      return false;
    }

    const now = Date.now();
    const lastPlayed = this.lastPlayedTime[alertType];
    const cooldown = this.cooldownMs[alertType];
    
    if (now - lastPlayed < cooldown) {
      return false;
    }
    
    const alertSettings = this.settings[alertType];
    if (!alertSettings.enabled || alertSettings.selectedSound === 'none') {
      return false;
    }
    
    return true;
  }

  async playAlert(alertType: AlertType, force: boolean = false): Promise<void> {
    if (!force && !this.canPlay(alertType)) {
      return;
    }

    const alertSettings = this.settings[alertType];
    if (!alertSettings.enabled || alertSettings.selectedSound === 'none') {
      return;
    }

    this.lastPlayedTime[alertType] = Date.now();

    try {
      const ctx = this.getAudioContext();
      
      // Resume if suspended (required for mobile)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const volume = alertSettings.volume * this.settings.masterVolume;
      const soundId = alertSettings.selectedSound;

      // Generate sound based on type and selected sound
      await this.generateSound(ctx, alertType, soundId, volume);
    } catch (error) {
      console.warn('Failed to play alert sound:', error);
    }
  }

  private async generateSound(
    ctx: AudioContext, 
    alertType: AlertType, 
    soundId: string, 
    volume: number
  ): Promise<void> {
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.value = volume;

    switch (alertType) {
      case 'speedLimit':
        await this.playSpeedLimitSound(ctx, gainNode, soundId);
        break;
      case 'traffic':
        await this.playTrafficSound(ctx, gainNode, soundId);
        break;
      case 'fatigue':
        await this.playFatigueSound(ctx, gainNode, soundId);
        break;
      case 'upcomingTurn':
        await this.playUpcomingTurnSound(ctx, gainNode, soundId);
        break;
    }
  }

  private async playSpeedLimitSound(ctx: AudioContext, gainNode: GainNode, soundId: string): Promise<void> {
    switch (soundId) {
      case 'beep':
        this.playTone(ctx, gainNode, 880, 0.15, 'sine');
        break;
      case 'chime':
        this.playTone(ctx, gainNode, 523, 0.1, 'sine');
        setTimeout(() => this.playTone(ctx, gainNode, 659, 0.1, 'sine'), 120);
        break;
      case 'alert':
        this.playTone(ctx, gainNode, 1200, 0.1, 'square');
        setTimeout(() => this.playTone(ctx, gainNode, 1400, 0.1, 'square'), 120);
        break;
      case 'triple':
        this.playTone(ctx, gainNode, 880, 0.08, 'sine');
        setTimeout(() => this.playTone(ctx, gainNode, 880, 0.08, 'sine'), 120);
        setTimeout(() => this.playTone(ctx, gainNode, 880, 0.08, 'sine'), 240);
        break;
    }
  }

  private async playTrafficSound(ctx: AudioContext, gainNode: GainNode, soundId: string): Promise<void> {
    switch (soundId) {
      case 'notification':
        this.playTone(ctx, gainNode, 587, 0.12, 'sine');
        setTimeout(() => this.playTone(ctx, gainNode, 784, 0.15, 'sine'), 150);
        break;
      case 'ding':
        this.playTone(ctx, gainNode, 1047, 0.3, 'sine');
        break;
      case 'chime':
        this.playTone(ctx, gainNode, 392, 0.1, 'sine');
        setTimeout(() => this.playTone(ctx, gainNode, 523, 0.1, 'sine'), 100);
        setTimeout(() => this.playTone(ctx, gainNode, 659, 0.15, 'sine'), 200);
        break;
      case 'alert':
        this.playTone(ctx, gainNode, 800, 0.1, 'sawtooth');
        setTimeout(() => this.playTone(ctx, gainNode, 1000, 0.1, 'sawtooth'), 150);
        break;
    }
  }

  private async playFatigueSound(ctx: AudioContext, gainNode: GainNode, soundId: string): Promise<void> {
    switch (soundId) {
      case 'gentle':
        this.playTone(ctx, gainNode, 440, 0.2, 'sine');
        setTimeout(() => this.playTone(ctx, gainNode, 554, 0.25, 'sine'), 250);
        break;
      case 'chime':
        this.playTone(ctx, gainNode, 523, 0.15, 'sine');
        setTimeout(() => this.playTone(ctx, gainNode, 659, 0.15, 'sine'), 180);
        setTimeout(() => this.playTone(ctx, gainNode, 784, 0.2, 'sine'), 360);
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            this.playTone(ctx, gainNode, 1000, 0.15, 'square');
          }, i * 300);
        }
        break;
      case 'bell':
        this.playTone(ctx, gainNode, 880, 0.4, 'sine');
        // Add harmonics for bell-like sound
        const bellGain = ctx.createGain();
        bellGain.connect(gainNode);
        bellGain.gain.value = 0.3;
        this.playTone(ctx, bellGain, 1760, 0.3, 'sine');
        break;
    }
  }

  private async playUpcomingTurnSound(ctx: AudioContext, gainNode: GainNode, soundId: string): Promise<void> {
    switch (soundId) {
      case 'ping':
        this.playTone(ctx, gainNode, 1320, 0.08, 'sine');
        setTimeout(() => this.playTone(ctx, gainNode, 1760, 0.06, 'sine'), 80);
        break;
      case 'tick':
        this.playTone(ctx, gainNode, 2000, 0.04, 'square');
        break;
      case 'boop':
        this.playTone(ctx, gainNode, 660, 0.1, 'sine');
        setTimeout(() => this.playTone(ctx, gainNode, 880, 0.12, 'sine'), 110);
        break;
      case 'sonar':
        this.playTone(ctx, gainNode, 440, 0.2, 'sine');
        const sonarGain = ctx.createGain();
        sonarGain.connect(gainNode);
        sonarGain.gain.value = 0.25;
        this.playTone(ctx, sonarGain, 880, 0.18, 'sine');
        break;
    }
  }

  private playTone(
    ctx: AudioContext, 
    destination: AudioNode, 
    frequency: number, 
    duration: number, 
    type: OscillatorType
  ): void {
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    
    oscillator.connect(envelope);
    envelope.connect(destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    const now = ctx.currentTime;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(1, now + 0.01);
    envelope.gain.linearRampToValueAtTime(0, now + duration);
    
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  async previewSound(alertType: AlertType, soundId: string): Promise<void> {
    if (soundId === 'none') return;
    
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.value = this.settings.masterVolume * 0.7;
      
      switch (alertType) {
        case 'speedLimit':
          await this.playSpeedLimitSound(ctx, gainNode, soundId);
          break;
        case 'traffic':
          await this.playTrafficSound(ctx, gainNode, soundId);
          break;
        case 'fatigue':
          await this.playFatigueSound(ctx, gainNode, soundId);
          break;
        case 'upcomingTurn':
          await this.playUpcomingTurnSound(ctx, gainNode, soundId);
          break;
      }
    } catch (error) {
      console.warn('Failed to preview sound:', error);
    }
  }

  destroy(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
let alertSoundsInstance: AlertSoundsService | null = null;

export function getAlertSoundsService(): AlertSoundsService {
  if (!alertSoundsInstance) {
    alertSoundsInstance = new AlertSoundsService();
  }
  return alertSoundsInstance;
}

export function destroyAlertSoundsService(): void {
  if (alertSoundsInstance) {
    alertSoundsInstance.destroy();
    alertSoundsInstance = null;
  }
}

export default AlertSoundsService;
