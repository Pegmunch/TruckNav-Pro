/**
 * Audio Manager - Web Audio API integration for TruckNav Pro Entertainment
 * 
 * Handles audio playback, volume control, focus management, and background playback
 * Automotive-optimized for truck cabin environments
 */

import { type EntertainmentStation, type EntertainmentPlaybackState } from "@shared/schema";

export interface AudioManagerConfig {
  defaultVolume?: number;
  crossfadeEnabled?: boolean;
  crossfadeDuration?: number;
  emergencyInterruptEnabled?: boolean;
}

export interface PlaybackStatus {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  buffering: boolean;
  error: string | null;
}

export class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private currentStation: EntertainmentStation | null = null;
  private config: AudioManagerConfig;
  private playbackStatus: PlaybackStatus;
  private listeners: Set<(status: PlaybackStatus) => void> = new Set();
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private crossfadeTimeout: NodeJS.Timeout | null = null;

  constructor(config: AudioManagerConfig = {}) {
    this.config = {
      defaultVolume: 0.8,
      crossfadeEnabled: false,
      crossfadeDuration: 3,
      emergencyInterruptEnabled: true,
      ...config
    };

    this.playbackStatus = {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: this.config.defaultVolume!,
      buffering: false,
      error: null,
    };

    this.initializeAudioContext();
    this.setupMediaSessionAPI();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.config.defaultVolume!;
    } catch (error) {
      console.warn('Web Audio API not supported, falling back to basic audio', error);
    }
  }

  private setupMediaSessionAPI() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
      navigator.mediaSession.setActionHandler('seekbackward', () => this.seek(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => this.seek(10));
      navigator.mediaSession.setActionHandler('previoustrack', () => this.emit('previous'));
      navigator.mediaSession.setActionHandler('nexttrack', () => this.emit('next'));
    }
  }

  private updateMediaSessionMetadata() {
    if ('mediaSession' in navigator && this.currentStation) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentStation.name,
        artist: this.currentStation.creator || 'TruckNav Pro',
        album: this.currentStation.genre,
        artwork: this.currentStation.artworkUrl ? [
          { src: this.currentStation.artworkUrl, sizes: '512x512', type: 'image/png' }
        ] : undefined,
      });
    }
  }

  async loadStation(station: EntertainmentStation): Promise<void> {
    try {
      this.setStatus({ error: null, buffering: true });

      // Clean up existing audio
      if (this.audio) {
        this.audio.pause();
        this.audio.src = '';
        this.removeAudioListeners();
      }

      this.currentStation = station;
      this.audio = new Audio();
      this.audio.crossOrigin = 'anonymous';
      this.audio.preload = 'auto';

      // Connect to Web Audio API if available
      if (this.audioContext && this.gainNode) {
        try {
          const source = this.audioContext.createMediaElementSource(this.audio);
          source.connect(this.gainNode);
        } catch (error) {
          console.warn('Failed to connect to Web Audio API', error);
        }
      }

      this.setupAudioListeners();
      this.audio.src = station.streamUrl;
      this.updateMediaSessionMetadata();

      // Auto-resume AudioContext if suspended (mobile requirement)
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

    } catch (error) {
      console.error('Failed to load station:', error);
      this.setStatus({ 
        error: `Failed to load ${station.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        buffering: false 
      });
    }
  }

  private setupAudioListeners() {
    if (!this.audio) return;

    const audio = this.audio;

    const onLoadStart = () => this.setStatus({ buffering: true, error: null });
    const onCanPlay = () => this.setStatus({ buffering: false });
    const onPlay = () => this.setStatus({ isPlaying: true, buffering: false });
    const onPause = () => this.setStatus({ isPlaying: false });
    const onTimeUpdate = () => this.setStatus({ 
      currentTime: audio.currentTime,
      duration: audio.duration || 0 
    });
    const onVolumeChange = () => this.setStatus({ volume: audio.volume });
    const onError = (e: Event) => {
      const error = audio.error;
      let errorMessage = 'Audio playback error';
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio playback was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred while loading audio';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio format not supported';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio source not supported';
            break;
        }
      }

      this.setStatus({ 
        error: errorMessage,
        isPlaying: false,
        buffering: false 
      });
    };
    const onStalled = () => this.setStatus({ buffering: true });
    const onWaiting = () => this.setStatus({ buffering: true });

    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('volumechange', onVolumeChange);
    audio.addEventListener('error', onError);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('waiting', onWaiting);

    // Store listeners for cleanup
    (audio as any)._listeners = {
      onLoadStart, onCanPlay, onPlay, onPause, onTimeUpdate, 
      onVolumeChange, onError, onStalled, onWaiting
    };
  }

  private removeAudioListeners() {
    if (!this.audio || !(this.audio as any)._listeners) return;

    const audio = this.audio;
    const listeners = (audio as any)._listeners;

    audio.removeEventListener('loadstart', listeners.onLoadStart);
    audio.removeEventListener('canplay', listeners.onCanPlay);
    audio.removeEventListener('play', listeners.onPlay);
    audio.removeEventListener('pause', listeners.onPause);
    audio.removeEventListener('timeupdate', listeners.onTimeUpdate);
    audio.removeEventListener('volumechange', listeners.onVolumeChange);
    audio.removeEventListener('error', listeners.onError);
    audio.removeEventListener('stalled', listeners.onStalled);
    audio.removeEventListener('waiting', listeners.onWaiting);

    delete (audio as any)._listeners;
  }

  async play(): Promise<void> {
    if (!this.audio) throw new Error('No audio loaded');

    try {
      await this.audio.play();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.setStatus({ error: `Playback failed: ${message}` });
      throw error;
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  resume(): void {
    if (this.audio && this.audio.paused) {
      this.play().catch(console.error);
    }
  }

  stop(): void {
    if (this.audio) {
      this.pause();
      this.audio.currentTime = 0;
    }
  }

  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (this.config.crossfadeEnabled && this.audio) {
      this.crossfadeVolume(clampedVolume);
    } else {
      if (this.audio) {
        this.audio.volume = clampedVolume;
      }
      if (this.gainNode) {
        this.gainNode.gain.value = clampedVolume;
      }
    }

    this.setStatus({ volume: clampedVolume });
  }

  private crossfadeVolume(targetVolume: number): void {
    if (!this.audio || !this.gainNode) return;

    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout);
    }

    const startVolume = this.gainNode.gain.value;
    const duration = this.config.crossfadeDuration! * 1000;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = (targetVolume - startVolume) / steps;

    let currentStep = 0;

    const fadeStep = () => {
      if (currentStep >= steps || !this.gainNode) return;

      const newVolume = startVolume + (volumeStep * currentStep);
      this.gainNode.gain.value = newVolume;
      
      if (this.audio) {
        this.audio.volume = newVolume;
      }

      currentStep++;
      this.crossfadeTimeout = setTimeout(fadeStep, stepDuration);
    };

    fadeStep();
  }

  seek(seconds: number): void {
    if (this.audio && isFinite(this.audio.duration)) {
      const newTime = Math.max(0, Math.min(this.audio.duration, this.audio.currentTime + seconds));
      this.audio.currentTime = newTime;
    }
  }

  getCurrentStation(): EntertainmentStation | null {
    return this.currentStation;
  }

  getPlaybackStatus(): PlaybackStatus {
    return { ...this.playbackStatus };
  }

  // Emergency interrupt for navigation alerts
  emergencyInterrupt(): void {
    if (this.config.emergencyInterruptEnabled && this.audio?.volume) {
      const originalVolume = this.audio.volume;
      this.setVolume(0.2); // Reduce to 20% volume
      
      // Restore volume after 3 seconds
      setTimeout(() => {
        this.setVolume(originalVolume);
      }, 3000);
    }
  }

  // Event handling
  private emit(event: string, data?: any): void {
    if (event === 'previous' || event === 'next') {
      // Emit to parent component for station navigation
      window.dispatchEvent(new CustomEvent(`audio-${event}`, { detail: data }));
    }
  }

  subscribe(callback: (status: PlaybackStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private setStatus(updates: Partial<PlaybackStatus>): void {
    this.playbackStatus = { ...this.playbackStatus, ...updates };
    this.listeners.forEach(callback => callback(this.playbackStatus));
  }

  destroy(): void {
    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout);
    }

    if (this.audio) {
      this.removeAudioListeners();
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.listeners.clear();
    this.currentStation = null;
  }
}

// Singleton instance for global audio management
let audioManagerInstance: AudioManager | null = null;

export const getAudioManager = (config?: AudioManagerConfig): AudioManager => {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager(config);
  }
  return audioManagerInstance;
};

export const destroyAudioManager = (): void => {
  if (audioManagerInstance) {
    audioManagerInstance.destroy();
    audioManagerInstance = null;
  }
};