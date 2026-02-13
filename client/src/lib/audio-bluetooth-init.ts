/**
 * Audio Bluetooth/CarPlay/Android Auto Initialization
 * 
 * This module ensures audio playback works correctly through:
 * - Vehicle Bluetooth systems
 * - Apple CarPlay
 * - Android Auto
 * - Device volume buttons
 * 
 * iOS Safari and mobile browsers require user interaction to enable audio.
 * This module provides initialization that must be called on first user tap.
 */

class AudioBluetoothInit {
  private static instance: AudioBluetoothInit | null = null;
  private isInitialized: boolean = false;
  private audioContext: AudioContext | null = null;
  private initPromise: Promise<boolean> | null = null;
  private speechPrimed: boolean = false;
  private duckingOscillator: OscillatorNode | null = null;
  private duckingGain: GainNode | null = null;
  private isDucking: boolean = false;

  private constructor() {}

  public static getInstance(): AudioBluetoothInit {
    if (!AudioBluetoothInit.instance) {
      AudioBluetoothInit.instance = new AudioBluetoothInit();
    }
    return AudioBluetoothInit.instance;
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  public isSpeechPrimed(): boolean {
    return this.speechPrimed;
  }

  /**
   * Initialize audio for Bluetooth/CarPlay/Android Auto
   * MUST be called from a user interaction event (tap, click)
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<boolean> {
    console.log('[AudioBluetooth] Initializing audio for Bluetooth/CarPlay/Android Auto...');

    try {
      await this.resumeAudioContext();
      this.isInitialized = true;
      console.log('[AudioBluetooth] Audio initialization complete');
      return true;
    } catch (error) {
      console.error('[AudioBluetooth] Audio initialization failed:', error);
      return false;
    }
  }

  /**
   * Resume any suspended AudioContext
   */
  private async resumeAudioContext(): Promise<void> {
    try {
      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      }

      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('[AudioBluetooth] AudioContext resumed');
      }
    } catch (error) {
      console.warn('[AudioBluetooth] AudioContext resume failed:', error);
    }
  }

  /**
   * Prime speech synthesis from a user gesture context
   * This MUST be called synchronously from a click/tap handler
   * It speaks a real short utterance to unlock iOS speech synthesis
   */
  public primeSpeechFromGesture(): void {
    if (this.speechPrimed) return;

    try {
      if (!window.speechSynthesis) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(' ');
      utterance.volume = 0.01;
      utterance.rate = 10;

      utterance.onend = () => {
        this.speechPrimed = true;
        console.log('[AudioBluetooth] Speech synthesis primed from user gesture');
      };

      utterance.onerror = () => {
        console.warn('[AudioBluetooth] Speech priming had error');
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('[AudioBluetooth] Speech priming failed:', error);
    }
  }

  public getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
    return this.audioContext;
  }

  public async reinitialize(): Promise<boolean> {
    this.isInitialized = false;
    this.initPromise = null;
    return this.initialize();
  }

  /**
   * Activate Bluetooth audio route before speech
   * Plays a sustained near-silent tone through AudioContext to wake up and hold
   * the Bluetooth/media audio session open. Speech synthesis then inherits this
   * active audio route instead of falling back to the phone earpiece.
   * 
   * The tone runs for 500ms at near-zero volume (inaudible) which is long enough
   * for iOS/Android to establish the Bluetooth A2DP or HFP audio path.
   */
  public async activateBluetoothForSpeech(): Promise<void> {
    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.02);
      gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.4);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

      oscillator.frequency.value = 200;
      oscillator.type = 'sine';

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.55);

      await new Promise(resolve => setTimeout(resolve, 250));
      console.log('[AudioBluetooth] Bluetooth audio route activated (held 250ms)');
    } catch (error) {
      console.warn('[AudioBluetooth] Bluetooth activation failed:', error);
    }
  }

  /**
   * Start audio ducking - signals the OS to reduce volume of other audio (music, podcasts)
   * so navigation voice can be heard clearly over Bluetooth/CarPlay/Android Auto.
   * 
   * Uses two techniques:
   * 1. navigator.audioSession API (where supported) to request 'transient' focus
   * 2. A sustained near-silent audio signal through AudioContext to keep the audio
   *    route active and trigger OS-level ducking behavior
   */
  public startAudioDucking(): void {
    if (this.isDucking) return;

    try {
      const nav = navigator as any;
      if (nav.audioSession) {
        nav.audioSession.type = 'auto';
        console.log('[AudioBluetooth] Set audioSession.type to auto for ducking');
      }

      const ctx = this.getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        this.duckingGain = ctx.createGain();
        this.duckingGain.connect(ctx.destination);
        this.duckingGain.gain.setValueAtTime(0, ctx.currentTime);
        this.duckingGain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.05);

        this.duckingOscillator = ctx.createOscillator();
        this.duckingOscillator.type = 'sine';
        this.duckingOscillator.frequency.value = 100;
        this.duckingOscillator.connect(this.duckingGain);
        this.duckingOscillator.start();

        this.isDucking = true;
        console.log('[AudioBluetooth] Audio ducking STARTED - other audio will be reduced');
      }
    } catch (error) {
      console.warn('[AudioBluetooth] Audio ducking start failed:', error);
    }
  }

  /**
   * Stop audio ducking - allows other audio (music, podcasts) to return to normal volume.
   * Fades out the ducking signal smoothly to avoid audio pops.
   */
  public stopAudioDucking(): void {
    if (!this.isDucking) return;

    try {
      const ctx = this.getAudioContext();

      if (this.duckingGain && ctx) {
        this.duckingGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      }

      setTimeout(() => {
        try {
          if (this.duckingOscillator) {
            this.duckingOscillator.stop();
            this.duckingOscillator.disconnect();
            this.duckingOscillator = null;
          }
          if (this.duckingGain) {
            this.duckingGain.disconnect();
            this.duckingGain = null;
          }
        } catch (e) {
          // Already stopped
        }
        this.isDucking = false;
        console.log('[AudioBluetooth] Audio ducking STOPPED - other audio restored');
      }, 400);
    } catch (error) {
      this.isDucking = false;
      console.warn('[AudioBluetooth] Audio ducking stop failed:', error);
    }
  }

  /**
   * Check if audio ducking is currently active
   */
  public isAudioDucking(): boolean {
    return this.isDucking;
  }

  /**
   * Keep-alive function to maintain Bluetooth audio connection during navigation
   */
  public async keepBluetoothAlive(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'running') {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.value = 0.0001;
        oscillator.frequency.value = 440;

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.01);
      }
    } catch (error) {
      // Silently ignore
    }
  }
}

export const audioBluetoothInit = AudioBluetoothInit.getInstance();

export function initializeAudioOnInteraction(): void {
  const handleInteraction = async () => {
    audioBluetoothInit.primeSpeechFromGesture();
    await audioBluetoothInit.initialize();
    document.removeEventListener('touchstart', handleInteraction);
    document.removeEventListener('click', handleInteraction);
  };

  document.addEventListener('touchstart', handleInteraction, { once: true, passive: true });
  document.addEventListener('click', handleInteraction, { once: true, passive: true });
}
