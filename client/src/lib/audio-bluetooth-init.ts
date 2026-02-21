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
 * 
 * Key technique: Uses both AudioContext AND HTML Audio element to claim
 * the media audio session on iOS, forcing SpeechSynthesis to route
 * through Bluetooth instead of the phone speaker.
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
  private silentAudio: HTMLAudioElement | null = null;
  private bridgeOscillator: OscillatorNode | null = null;
  private bridgeGain: GainNode | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

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
      this.createSilentAudioElement();
      this.isInitialized = true;
      console.log('[AudioBluetooth] Audio initialization complete');
      return true;
    } catch (error) {
      console.error('[AudioBluetooth] Audio initialization failed:', error);
      return false;
    }
  }

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

  private createSilentAudioElement(): void {
    try {
      if (this.silentAudio) return;
      const silentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      this.silentAudio = new Audio(silentWav);
      this.silentAudio.volume = 0.01;
      this.silentAudio.loop = true;
      console.log('[AudioBluetooth] Silent audio element created for Bluetooth route claiming');
    } catch (error) {
      console.warn('[AudioBluetooth] Failed to create silent audio element:', error);
    }
  }

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

      if (this.silentAudio) {
        this.silentAudio.play().catch(() => {
          console.warn('[AudioBluetooth] Silent audio play from gesture failed');
        });
        setTimeout(() => {
          if (this.silentAudio) {
            this.silentAudio.pause();
            this.silentAudio.currentTime = 0;
          }
        }, 500);
      }
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
   * Activate Bluetooth audio route before speech synthesis.
   * 
   * Uses a 3-layer approach to claim the Bluetooth media audio route:
   * 1. HTML Audio element - plays silent audio to claim iOS media session
   * 2. AudioContext oscillator - sustained tone to hold Bluetooth A2DP route
   * 3. Extended warmup (400ms) - gives iOS time to switch audio routing
   * 
   * The bridge oscillator keeps running until stopBluetoothBridge() is called
   * after speech ends, maintaining the audio route for the entire utterance.
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

      if (this.silentAudio) {
        try {
          this.silentAudio.currentTime = 0;
          this.silentAudio.volume = 0.01;
          await this.silentAudio.play();
          console.log('[AudioBluetooth] Silent audio element playing - claiming media session');
        } catch (e) {
          console.warn('[AudioBluetooth] Silent audio play failed (expected if no user gesture):', e);
        }
      }

      this.stopBridgeOscillator();

      this.bridgeGain = ctx.createGain();
      this.bridgeGain.connect(ctx.destination);
      this.bridgeGain.gain.setValueAtTime(0, ctx.currentTime);
      this.bridgeGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.05);

      this.bridgeOscillator = ctx.createOscillator();
      this.bridgeOscillator.type = 'sine';
      this.bridgeOscillator.frequency.value = 200;
      this.bridgeOscillator.connect(this.bridgeGain);
      this.bridgeOscillator.start();

      await new Promise(resolve => setTimeout(resolve, 400));
      console.log('[AudioBluetooth] Bluetooth audio route activated (3-layer, held 400ms, bridge running)');
    } catch (error) {
      console.warn('[AudioBluetooth] Bluetooth activation failed:', error);
    }
  }

  /**
   * Stop the bridge oscillator after speech completes.
   * Fades out smoothly to avoid audio pops.
   */
  public stopBluetoothBridge(): void {
    try {
      if (this.silentAudio) {
        this.silentAudio.pause();
        this.silentAudio.currentTime = 0;
      }
    } catch (e) {}

    this.stopBridgeOscillator();
  }

  private stopBridgeOscillator(): void {
    try {
      const ctx = this.getAudioContext();
      if (this.bridgeGain && ctx) {
        this.bridgeGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      }
      setTimeout(() => {
        try {
          if (this.bridgeOscillator) {
            this.bridgeOscillator.stop();
            this.bridgeOscillator.disconnect();
            this.bridgeOscillator = null;
          }
          if (this.bridgeGain) {
            this.bridgeGain.disconnect();
            this.bridgeGain = null;
          }
        } catch (e) {}
      }, 200);
    } catch (e) {}
  }

  /**
   * Start audio ducking - signals the OS to reduce volume of other audio
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
   * Stop audio ducking - allows other audio to return to normal volume
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
        }
        this.isDucking = false;
        console.log('[AudioBluetooth] Audio ducking STOPPED - other audio restored');
      }, 400);
    } catch (error) {
      this.isDucking = false;
      console.warn('[AudioBluetooth] Audio ducking stop failed:', error);
    }
  }

  public isAudioDucking(): boolean {
    return this.isDucking;
  }

  /**
   * Start a periodic keep-alive that maintains the Bluetooth audio connection
   * during active navigation. Plays a micro-burst every 25 seconds to prevent
   * iOS from suspending the audio session.
   */
  public startNavigationKeepAlive(): void {
    if (this.keepAliveInterval) return;

    this.keepAliveInterval = setInterval(() => {
      this.keepBluetoothAlive();
    }, 25000);
    console.log('[AudioBluetooth] Navigation keep-alive STARTED (25s interval)');
  }

  public stopNavigationKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log('[AudioBluetooth] Navigation keep-alive STOPPED');
    }
  }

  public async keepBluetoothAlive(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (ctx.state === 'running') {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.value = 0.001;
        oscillator.frequency.value = 440;

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.05);
      }

      if (this.silentAudio) {
        try {
          this.silentAudio.currentTime = 0;
          await this.silentAudio.play();
          setTimeout(() => {
            if (this.silentAudio) {
              this.silentAudio.pause();
            }
          }, 100);
        } catch (e) {}
      }
    } catch (error) {
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
