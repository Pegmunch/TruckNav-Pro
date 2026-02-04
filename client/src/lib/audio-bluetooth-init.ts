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
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {}

  public static getInstance(): AudioBluetoothInit {
    if (!AudioBluetoothInit.instance) {
      AudioBluetoothInit.instance = new AudioBluetoothInit();
    }
    return AudioBluetoothInit.instance;
  }

  /**
   * Check if audio has been initialized
   */
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Initialize audio for Bluetooth/CarPlay/Android Auto
   * MUST be called from a user interaction event (tap, click)
   * 
   * This does three things:
   * 1. Creates and plays a silent audio element to activate the audio session
   * 2. Resumes any suspended AudioContext
   * 3. Speaks a silent utterance to activate speech synthesis
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('[AudioBluetooth] Already initialized');
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<boolean> {
    console.log('[AudioBluetooth] 🔊 Initializing audio for Bluetooth/CarPlay/Android Auto...');

    try {
      // Step 1: Create and play silent audio element
      // This activates the iOS audio session and enables Bluetooth routing
      await this.playSilentAudio();

      // Step 2: Resume AudioContext if suspended
      await this.resumeAudioContext();

      // Step 3: Warm up speech synthesis
      await this.warmupSpeechSynthesis();

      this.isInitialized = true;
      console.log('[AudioBluetooth] ✅ Audio initialization complete - Bluetooth/CarPlay ready');
      return true;
    } catch (error) {
      console.error('[AudioBluetooth] ❌ Audio initialization failed:', error);
      return false;
    }
  }

  /**
   * Play a silent audio element to activate the audio session
   * This is crucial for iOS to enable Bluetooth audio routing
   */
  private async playSilentAudio(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create audio element with silent audio data (base64 encoded silent MP3)
        // This is a minimal valid MP3 file with silence
        const silentMp3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYZt2aYpAAAAAAD/+1AEAAP8AABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAR7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7';

        this.audioElement = new Audio(silentMp3);
        this.audioElement.volume = 0.01; // Very low volume
        
        // Set attributes for iOS (using setAttribute for compatibility)
        this.audioElement.setAttribute('playsinline', 'true');
        this.audioElement.setAttribute('webkit-playsinline', 'true');
        (this.audioElement as any).playsInline = true;

        const playPromise = this.audioElement.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('[AudioBluetooth] Silent audio played - audio session active');
              setTimeout(() => {
                if (this.audioElement) {
                  this.audioElement.pause();
                  this.audioElement = null;
                }
              }, 100);
              resolve();
            })
            .catch((error) => {
              console.warn('[AudioBluetooth] Silent audio play failed (may need user interaction):', error);
              resolve(); // Continue anyway
            });
        } else {
          resolve();
        }
      } catch (error) {
        console.warn('[AudioBluetooth] Silent audio creation failed:', error);
        resolve(); // Continue anyway
      }
    });
  }

  /**
   * Resume any suspended AudioContext
   */
  private async resumeAudioContext(): Promise<void> {
    try {
      // Create AudioContext if not exists
      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      }

      // Resume if suspended
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('[AudioBluetooth] AudioContext resumed');
      }
    } catch (error) {
      console.warn('[AudioBluetooth] AudioContext resume failed:', error);
    }
  }

  /**
   * Warm up speech synthesis by speaking a silent/empty utterance
   * This helps ensure speech routes through Bluetooth
   */
  private async warmupSpeechSynthesis(): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (!window.speechSynthesis) {
          resolve();
          return;
        }

        // Cancel any pending speech
        window.speechSynthesis.cancel();

        // Create utterance with empty/silent text
        const utterance = new SpeechSynthesisUtterance(' ');
        utterance.volume = 0.01; // Very low volume
        utterance.rate = 2; // Fast to complete quickly
        
        utterance.onend = () => {
          console.log('[AudioBluetooth] Speech synthesis warmed up');
          resolve();
        };
        
        utterance.onerror = () => {
          console.warn('[AudioBluetooth] Speech synthesis warmup had error (continuing)');
          resolve();
        };

        // Speak the silent utterance
        window.speechSynthesis.speak(utterance);

        // Timeout fallback
        setTimeout(() => {
          resolve();
        }, 500);
      } catch (error) {
        console.warn('[AudioBluetooth] Speech synthesis warmup failed:', error);
        resolve();
      }
    });
  }

  /**
   * Get the shared AudioContext (for other modules to use)
   */
  public getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
    return this.audioContext;
  }

  /**
   * Force re-initialization (e.g., after Bluetooth reconnection)
   */
  public async reinitialize(): Promise<boolean> {
    this.isInitialized = false;
    this.initPromise = null;
    return this.initialize();
  }

  /**
   * Play a brief silent audio clip to activate Bluetooth audio routing
   * Call this IMMEDIATELY before speech synthesis to ensure speech routes through Bluetooth
   * 
   * On iOS, speech synthesis often doesn't route through Bluetooth by default.
   * Playing a brief audio clip first "wakes up" the Bluetooth audio session,
   * causing subsequent speech to route through the connected audio device.
   */
  public async activateBluetoothForSpeech(): Promise<void> {
    console.log('[AudioBluetooth] 🔊 Activating Bluetooth audio route for speech...');
    
    try {
      // Resume AudioContext first
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Create a short audible tone using Web Audio API
      // This tone needs to be AUDIBLE (not silent) to properly activate Bluetooth routing on iOS
      // iOS speech synthesis uses a different audio category - we need to "wake up" the media channel
      const ctx = this.getAudioContext();
      if (ctx) {
        // Create an oscillator with gentle fade-in/fade-out to avoid clicks
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // Use audible but soft volume (0.05) for reliable Bluetooth activation
        // Too quiet won't activate the audio route, too loud is jarring
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.02); // Fade in
        gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.15); // Hold
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2); // Fade out
        
        oscillator.frequency.value = 440;
        oscillator.type = 'sine'; // Smooth tone
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.25); // 250ms total duration
        
        // Wait for it to complete fully
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('[AudioBluetooth] ✅ Bluetooth audio route activated with audible tone');
      }
      
      // Also play HTML audio element as backup - this helps on some iOS versions
      // Use a longer clip with actual audio content
      const silentMp3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYZt2aYpAAAAAAD/+1AEAAP8AABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAR7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7';
      const audio = new Audio(silentMp3);
      audio.volume = 0.1; // Higher volume for better Bluetooth activation
      audio.setAttribute('playsinline', 'true');
      (audio as any).playsInline = true;
      
      try {
        await audio.play();
        await new Promise(resolve => setTimeout(resolve, 150)); // Let it play longer
        audio.pause();
      } catch (e) {
        // Ignore - oscillator already handled it
      }
      
      // Final delay to ensure audio route is fully established before speech
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.warn('[AudioBluetooth] Bluetooth activation failed:', error);
    }
  }

  /**
   * Keep-alive function to maintain Bluetooth audio connection during navigation
   * Call this periodically (e.g., every 30 seconds) during active navigation
   */
  public async keepBluetoothAlive(): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'running') {
        // Create a silent ping
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        gainNode.gain.value = 0.0001; // Essentially silent
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

/**
 * Hook to initialize audio on first user interaction
 * Add this to your main app component
 */
export function initializeAudioOnInteraction(): void {
  const handleInteraction = async () => {
    await audioBluetoothInit.initialize();
    // Remove listeners after first successful init
    document.removeEventListener('touchstart', handleInteraction);
    document.removeEventListener('click', handleInteraction);
  };

  document.addEventListener('touchstart', handleInteraction, { once: true, passive: true });
  document.addEventListener('click', handleInteraction, { once: true, passive: true });
}
