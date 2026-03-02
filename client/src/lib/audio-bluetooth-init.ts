/**
 * Audio Bluetooth/CarPlay/Android Auto Initialization
 *
 * Key iOS behaviour this module works around:
 * - Web Speech API takes over the AVAudioSession, cutting off music.
 * - Solution: Hold a continuous, near-silent audio stream throughout
 *   navigation so iOS treats the whole session as "media playback" and
 *   routes speech through the same Bluetooth channel, ducking (not
 *   cutting) any background music.
 *
 * Approach:
 *  1. startPersistentSession() — called once when navigation begins.
 *     Plays a looping silent Audio element AND a near-zero AudioContext
 *     oscillator. This claims the Bluetooth A2DP route and holds it open.
 *  2. activateBluetoothForSpeech() — called before each utterance.
 *     If a persistent session is already active, just ensures the
 *     AudioContext is running (no extra 400ms warmup needed).
 *  3. stopBluetoothBridge() — called after each utterance.
 *     Does NOT stop the silent loop; it only cleans up any per-utterance
 *     oscillator, keeping the session alive for the next announcement.
 *  4. stopPersistentSession() — called once when navigation ends.
 *     Tears everything down cleanly.
 */

class AudioBluetoothInit {
  private static instance: AudioBluetoothInit | null = null;
  private isInitialized: boolean = false;
  private audioContext: AudioContext | null = null;
  private initPromise: Promise<boolean> | null = null;
  private speechPrimed: boolean = false;

  // Per-utterance bridge nodes (created/destroyed around each speak())
  private bridgeOscillator: OscillatorNode | null = null;
  private bridgeGain: GainNode | null = null;

  // Ducking nodes (held for the duration of an utterance)
  private duckingOscillator: OscillatorNode | null = null;
  private duckingGain: GainNode | null = null;
  private isDucking: boolean = false;

  // Persistent session (held for the full navigation session)
  private silentAudio: HTMLAudioElement | null = null;
  private sessionOscillator: OscillatorNode | null = null;
  private sessionGain: GainNode | null = null;
  private isPersistentSessionActive: boolean = false;
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
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<boolean> {
    console.log('[AudioBluetooth] Initializing...');
    try {
      await this.resumeAudioContext();
      this.createSilentAudioElement();
      this.isInitialized = true;
      console.log('[AudioBluetooth] Initialization complete');
      return true;
    } catch (error) {
      console.error('[AudioBluetooth] Initialization failed:', error);
      return false;
    }
  }

  private async resumeAudioContext(): Promise<void> {
    try {
      if (!this.audioContext) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) this.audioContext = new AC();
      }
      if (this.audioContext?.state === 'suspended') {
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
      // Minimal valid WAV (silence) — loops to hold iOS media session
      const silentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      this.silentAudio = new Audio(silentWav);
      this.silentAudio.volume = 0.001;
      this.silentAudio.loop = true;
      console.log('[AudioBluetooth] Silent audio element created');
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
      utterance.volume = 0.001;
      utterance.rate = 10;
      utterance.onend = () => {
        this.speechPrimed = true;
        console.log('[AudioBluetooth] Speech synthesis primed from user gesture');
      };
      utterance.onerror = () => {
        console.warn('[AudioBluetooth] Speech priming had error (non-critical)');
      };
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('[AudioBluetooth] Speech priming failed:', error);
    }
  }

  public getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) this.audioContext = new AC();
    }
    return this.audioContext;
  }

  public async reinitialize(): Promise<boolean> {
    this.isInitialized = false;
    this.initPromise = null;
    return this.initialize();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERSISTENT SESSION — holds the Bluetooth A2DP route for entire navigation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Start a persistent audio session that holds the Bluetooth route open
   * for the entire navigation session. Call this once when navigation begins.
   * This prevents iOS from releasing the audio session between announcements,
   * which eliminates the music-cutting-to-silence problem.
   */
  public async startPersistentSession(): Promise<void> {
    if (this.isPersistentSessionActive) return;

    console.log('[AudioBluetooth] Starting persistent navigation audio session...');
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }

      // NOTE: Do NOT set navigator.audioSession.type = 'playback' here.
      // 'playback' tells iOS this is a music player, which blocks speech synthesis
      // from sharing the audio route. The silent audio loop below is sufficient
      // to claim the Bluetooth A2DP channel while leaving speech synthesis working.

      // Play the silent audio loop — this is what holds the media session
      if (this.silentAudio) {
        try {
          this.silentAudio.loop = true;
          this.silentAudio.volume = 0.001;
          await this.silentAudio.play();
          console.log('[AudioBluetooth] Silent audio loop STARTED — Bluetooth route claimed');
        } catch (e) {
          console.warn('[AudioBluetooth] Silent audio play failed (needs user gesture):', e);
        }
      }

      // Also hold a near-zero oscillator in AudioContext to reinforce the session
      if (ctx && ctx.state === 'running') {
        try {
          this.sessionGain = ctx.createGain();
          this.sessionGain.gain.value = 0.0001;
          this.sessionGain.connect(ctx.destination);

          this.sessionOscillator = ctx.createOscillator();
          this.sessionOscillator.frequency.value = 60;
          this.sessionOscillator.connect(this.sessionGain);
          this.sessionOscillator.start();
          console.log('[AudioBluetooth] Session oscillator running');
        } catch (_) {}
      }

      this.isPersistentSessionActive = true;
      console.log('[AudioBluetooth] Persistent session ACTIVE');
    } catch (error) {
      console.warn('[AudioBluetooth] Persistent session start failed:', error);
    }
  }

  /**
   * Stop the persistent audio session. Call this once when navigation ends.
   */
  public stopPersistentSession(): void {
    if (!this.isPersistentSessionActive) return;

    console.log('[AudioBluetooth] Stopping persistent navigation audio session');
    try {
      if (this.silentAudio) {
        this.silentAudio.pause();
        this.silentAudio.currentTime = 0;
      }
    } catch (_) {}

    try {
      const ctx = this.getAudioContext();
      if (this.sessionGain && ctx) {
        this.sessionGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      }
      setTimeout(() => {
        try {
          this.sessionOscillator?.stop();
          this.sessionOscillator?.disconnect();
          this.sessionOscillator = null;
          this.sessionGain?.disconnect();
          this.sessionGain = null;
        } catch (_) {}
      }, 200);
    } catch (_) {}

    this.isPersistentSessionActive = false;
    console.log('[AudioBluetooth] Persistent session STOPPED');
  }

  public isPersistentSessionRunning(): boolean {
    return this.isPersistentSessionActive;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PER-UTTERANCE ACTIVATION — called immediately before each speak()
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Prepare the audio route for an upcoming speech utterance.
   * If a persistent session is already running (normal during navigation),
   * this is lightweight — just ensures AudioContext is awake.
   * If called outside of a persistent session (e.g. a one-off alert),
   * it falls back to the original 400ms warmup approach.
   */
  public async activateBluetoothForSpeech(): Promise<void> {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (this.isPersistentSessionActive) {
        // Session already holds the Bluetooth route — no extra warmup needed.
        // Just ensure the silent audio is still playing (it can stop if iOS
        // temporarily suspends it during a phone call or other interruption).
        if (this.silentAudio && this.silentAudio.paused) {
          try {
            await this.silentAudio.play();
          } catch (_) {}
        }
        return;
      }

      // Fallback: no persistent session — use the original 3-layer warmup
      if (this.silentAudio) {
        try {
          this.silentAudio.currentTime = 0;
          this.silentAudio.volume = 0.001;
          await this.silentAudio.play();
        } catch (e) {
          console.warn('[AudioBluetooth] Silent audio play failed:', e);
        }
      }

      this.stopBridgeOscillator();

      if (ctx && ctx.state === 'running') {
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
        console.log('[AudioBluetooth] Fallback Bluetooth warmup complete (400ms)');
      }
    } catch (error) {
      console.warn('[AudioBluetooth] activateBluetoothForSpeech failed:', error);
    }
  }

  /**
   * Called after each utterance ends. Cleans up the per-utterance bridge
   * oscillator. Does NOT stop the persistent session silent audio.
   */
  public stopBluetoothBridge(): void {
    // If persistent session is running, leave the silent audio alone.
    // Only stop it if we started it as a one-off (no persistent session).
    if (!this.isPersistentSessionActive && this.silentAudio) {
      try {
        this.silentAudio.pause();
        this.silentAudio.currentTime = 0;
      } catch (_) {}
    }
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
          this.bridgeOscillator?.stop();
          this.bridgeOscillator?.disconnect();
          this.bridgeOscillator = null;
          this.bridgeGain?.disconnect();
          this.bridgeGain = null;
        } catch (_) {}
      }, 200);
    } catch (_) {}
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AUDIO DUCKING
  // ─────────────────────────────────────────────────────────────────────────

  public startAudioDucking(): void {
    // Previously this created AudioContext oscillators and changed navigator.audioSession.type,
    // which caused iOS to renegotiate the AVAudioSession on every utterance — the root cause
    // of music cutting out every ~1 second. The persistent session silent loop already holds
    // the Bluetooth A2DP route open, and iOS speech synthesis handles its own ducking
    // natively through AVAudioSession mixing. No manual oscillators or session type changes
    // are needed here.
    if (this.isDucking) return;
    this.isDucking = true;
    console.log('[AudioBluetooth] Audio ducking flag set (passive — no session interruption)');
  }

  public stopAudioDucking(): void {
    if (!this.isDucking) return;
    this.isDucking = false;
    // Clean up any leftover nodes from before this refactor (safety)
    try {
      this.duckingOscillator?.stop();
      this.duckingOscillator?.disconnect();
      this.duckingOscillator = null;
      this.duckingGain?.disconnect();
      this.duckingGain = null;
    } catch (_) {}
    console.log('[AudioBluetooth] Audio ducking flag cleared');
  }

  public isAudioDucking(): boolean {
    return this.isDucking;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KEEP-ALIVE (legacy — superseded by persistent session but kept for
  // backward compatibility with any code that calls it)
  // ─────────────────────────────────────────────────────────────────────────

  public startNavigationKeepAlive(): void {
    // Delegate to the persistent session which already holds the route open.
    // The 25s keep-alive interval is no longer needed when a persistent
    // session is active, but we start it anyway as a belt-and-suspenders measure.
    if (this.keepAliveInterval) return;
    this.keepAliveInterval = setInterval(() => {
      this.keepBluetoothAlive();
    }, 25000);
    console.log('[AudioBluetooth] Keep-alive interval started (25s)');
  }

  public stopNavigationKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log('[AudioBluetooth] Keep-alive interval stopped');
    }
  }

  public async keepBluetoothAlive(): Promise<void> {
    if (!this.isInitialized) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();
      if (ctx.state === 'running') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 0.0001;
        osc.frequency.value = 440;
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
      // Ensure silent audio loop is still going during persistent session
      if (this.isPersistentSessionActive && this.silentAudio && this.silentAudio.paused) {
        try { await this.silentAudio.play(); } catch (_) {}
      }
    } catch (_) {}
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
