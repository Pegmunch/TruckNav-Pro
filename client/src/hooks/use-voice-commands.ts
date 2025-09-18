/**
 * useVoiceCommands Hook - Web Speech API Integration for TruckNav Pro
 * 
 * Comprehensive voice recognition hook with:
 * - Web Speech API integration with cross-platform compatibility
 * - Country-aware language settings from useCountryPreferences
 * - Intent processing integration via useVoiceIntents
 * - Production-ready state management and error handling
 * - Mobile-optimized performance and battery usage
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCountryPreferences } from './use-country-preferences';
import { useVoiceIntents, type VoiceProcessingResult, type IntentHandlers } from './use-voice-intents';
import { useVoiceFallback, type VoiceFallbackConfig, VOICE_FALLBACK_PRESETS } from './use-voice-fallback';
import type { VoiceState, InteractionMode } from '@/components/ui/voice-mic-button';

// ===== WEB SPEECH API TYPE DECLARATIONS =====

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  serviceURI: string;
  abort(): void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly confidence: number;
  readonly transcript: string;
}

interface SpeechGrammarList {
  readonly length: number;
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

// ===== TYPES AND INTERFACES =====

export interface VoiceCommandsConfig {
  // Recognition settings
  interactionMode?: InteractionMode;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  
  // Timeout settings
  noSpeechTimeout?: number;        // No speech detected timeout (ms)
  silenceTimeout?: number;         // Silence after speech timeout (ms)
  maxDuration?: number;           // Maximum recording duration (ms)
  autoRestartDelay?: number;      // Delay before auto-restart (ms)
  
  // Performance settings
  vadThreshold?: number;          // Voice Activity Detection threshold
  enableRateLimit?: boolean;      // Rate limiting for continuous use
  rateLimitWindow?: number;       // Rate limit window (ms)
  maxRequestsPerWindow?: number;  // Max requests per window
  
  // Fallback configuration
  enableFallback?: boolean;       // Enable Whisper fallback when Web Speech API unavailable
  fallbackMode?: 'auto' | 'force'; // 'auto' = fallback only when needed, 'force' = always use fallback
  fallbackConfig?: VoiceFallbackConfig; // Configuration for fallback hook
  
  // Debug settings
  enableDebugLogging?: boolean;
  logTranscripts?: boolean;       // Be careful with privacy
}

export interface VoiceTranscript {
  interim: string;
  final: string;
  confidence: number;
  timestamp: number;
  isFinal: boolean;
}

export interface VoiceError {
  code: string;
  message: string;
  recoverable: boolean;
  timestamp: number;
  details?: any;
}

export interface VoiceCommandsState {
  // Core state
  state: VoiceState;
  isSupported: boolean;
  hasPermission: boolean | null;
  
  // Recognition state
  isListening: boolean;
  isProcessing: boolean;
  
  // Transcript data
  currentTranscript: VoiceTranscript | null;
  transcriptHistory: VoiceTranscript[];
  
  // Processing results
  lastProcessingResult: VoiceProcessingResult | null;
  processingHistory: VoiceProcessingResult[];
  
  // Error handling
  error: VoiceError | null;
  errorHistory: VoiceError[];
  
  // Fallback state
  usingFallback: boolean;          // Whether currently using fallback
  webSpeechSupported: boolean;     // Web Speech API support detection
  fallbackSupported: boolean;      // MediaRecorder fallback support
  fallbackReason: string | null;   // Reason for using fallback
  
  // Performance tracking
  sessionStats: {
    totalCommands: number;
    successfulCommands: number;
    averageProcessingTime: number;
    totalSessionTime: number;
    sessionStartTime: number | null;
  };
}

export interface VoiceCommandsCallbacks {
  onTranscriptUpdate?: (transcript: VoiceTranscript) => void;
  onIntentProcessed?: (result: VoiceProcessingResult) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: VoiceError) => void;
  onPermissionChange?: (hasPermission: boolean) => void;
}

// ===== HOOK IMPLEMENTATION =====

export function useVoiceCommands(
  config: VoiceCommandsConfig = {},
  callbacks: VoiceCommandsCallbacks = {},
  intentHandlers: IntentHandlers = {}
) {
  // ===== CONFIGURATION =====
  
  const {
    interactionMode = 'toggle',
    continuous = true,
    interimResults = true,
    maxAlternatives = 1,
    noSpeechTimeout = 5000,
    silenceTimeout = 2000,
    maxDuration = 30000,
    autoRestartDelay = 1000,
    vadThreshold = 0.1,
    enableRateLimit = true,
    rateLimitWindow = 60000,
    maxRequestsPerWindow = 20,
    enableFallback = true,
    fallbackMode = 'auto',
    fallbackConfig,
    enableDebugLogging = false,
    logTranscripts = false
  } = config;

  // ===== DEPENDENCIES =====
  
  const { preferences } = useCountryPreferences();
  const voiceIntents = useVoiceIntents(intentHandlers, {
    minConfidence: 0.6,
    contextAware: true,
    enableFuzzyMatching: true
  });

  // ===== FALLBACK DETECTION =====
  
  const webSpeechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    // Check for native SpeechRecognition or webkit prefixed version
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognitionClass;
  }, []);

  // Determine if we should use fallback
  const shouldUseFallback = useMemo(() => {
    if (!enableFallback) return false;
    if (fallbackMode === 'force') return true;
    if (fallbackMode === 'auto') return !webSpeechSupported;
    return false;
  }, [enableFallback, fallbackMode, webSpeechSupported]);

  // ===== FALLBACK INITIALIZATION =====
  
  // Configure fallback based on main config
  const fallbackConfiguration: VoiceFallbackConfig = useMemo(() => ({
    interactionMode,
    maxRecordingDuration: maxDuration,
    enableDebugLogging,
    enableVoiceActivityDetection: true,
    vadSilenceDuration: silenceTimeout,
    ...fallbackConfig
  }), [interactionMode, maxDuration, enableDebugLogging, silenceTimeout, fallbackConfig]);

  // Always initialize fallback hook to maintain consistent hook order
  const fallback = useVoiceFallback(
    fallbackConfiguration,
    {
      onTranscriptUpdate: (transcript) => {
        if (!shouldUseFallback) return; // Don't process if not using fallback
        callbacks.onTranscriptUpdate?.(transcript);
        // Process the transcript through voice intents
        if (transcript.isFinal && transcript.final.trim()) {
          voiceIntents.processVoiceInput(transcript.final.trim()).then((result) => {
            callbacks.onIntentProcessed?.(result);
          }).catch((error) => {
            console.error('[VoiceCommands] Intent processing error:', error);
          });
        }
      },
      onStateChange: (state) => {
        if (!shouldUseFallback) return; // Don't process if not using fallback
        callbacks.onStateChange?.(state);
      },
      onError: (error) => {
        if (!shouldUseFallback) return; // Don't process if not using fallback
        callbacks.onError?.(error);
      },
      onPermissionChange: (hasPermission) => {
        if (!shouldUseFallback) return; // Don't process if not using fallback
        callbacks.onPermissionChange?.(hasPermission);
      }
    }
  );

  // ===== STATE =====
  
  const [state, setState] = useState<VoiceCommandsState>({
    state: 'idle',
    isSupported: false,
    hasPermission: null,
    isListening: false,
    isProcessing: false,
    currentTranscript: null,
    transcriptHistory: [],
    lastProcessingResult: null,
    processingHistory: [],
    error: null,
    errorHistory: [],
    usingFallback: shouldUseFallback,
    webSpeechSupported: webSpeechSupported,
    fallbackSupported: fallback.isSupported,
    fallbackReason: shouldUseFallback ? 
      (fallbackMode === 'force' ? 'Forced fallback mode' : 'Web Speech API not available') : 
      null,
    sessionStats: {
      totalCommands: 0,
      successfulCommands: 0,
      averageProcessingTime: 0,
      totalSessionTime: 0,
      sessionStartTime: null
    }
  });

  // ===== REFS =====
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRefs = useRef<{
    noSpeech?: NodeJS.Timeout;
    silence?: NodeJS.Timeout;
    maxDuration?: NodeJS.Timeout;
    autoRestart?: NodeJS.Timeout;
  }>({});
  const rateLimitRef = useRef<{
    requests: number[];
    lastWindowStart: number;
  }>({ requests: [], lastWindowStart: Date.now() });
  const isInitializedRef = useRef(false);
  const sessionStartRef = useRef<number | null>(null);

  // ===== WEB SPEECH API DETECTION =====
  
  const speechRecognitionSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    // Check for native SpeechRecognition or webkit prefixed version
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognitionClass;
  }, []);

  // ===== LANGUAGE CONFIGURATION =====
  
  const recognitionLanguage = useMemo(() => {
    // Map country to recognition language code
    const countryToLang: Record<string, string> = {
      'GB': 'en-GB',
      'US': 'en-US', 
      'CA': 'en-CA',
      'AU': 'en-AU',
      'DE': 'de-DE',
      'FR': 'fr-FR',
      'ES': 'es-ES',
      'IT': 'it-IT',
      'NL': 'nl-NL',
      'PL': 'pl-PL',
      'PT': 'pt-BR',
      'RU': 'ru-RU',
      'CN': 'zh-CN',
      'JP': 'ja-JP',
      'KR': 'ko-KR',
      'IN': 'hi-IN',
      'TR': 'tr-TR',
      'SA': 'ar-SA'
    };
    
    return countryToLang[preferences.country.code] || preferences.country.defaultLanguage || 'en-GB';
  }, [preferences.country]);

  // ===== ERROR HANDLING =====
  
  const createError = useCallback((code: string, message: string, recoverable: boolean = true, details?: any): VoiceError => {
    return {
      code,
      message,
      recoverable,
      timestamp: Date.now(),
      details
    };
  }, []);

  const handleError = useCallback((error: VoiceError) => {
    if (enableDebugLogging) {
      console.error('[VoiceCommands] Error:', error);
    }
    
    setState(prev => ({
      ...prev,
      error,
      errorHistory: [...prev.errorHistory.slice(-9), error], // Keep last 10
      state: 'error'
    }));
    
    callbacks.onError?.(error);
    callbacks.onStateChange?.('error');
    
    // Auto-recovery for recoverable errors
    if (error.recoverable && autoRestartDelay > 0) {
      timeoutRefs.current.autoRestart = setTimeout(() => {
        if (state.state === 'error') {
          resetToIdle();
        }
      }, autoRestartDelay);
    }
  }, [enableDebugLogging, callbacks, autoRestartDelay, state.state]);

  // ===== RATE LIMITING =====
  
  const checkRateLimit = useCallback((): boolean => {
    if (!enableRateLimit) return true;
    
    const now = Date.now();
    const { requests, lastWindowStart } = rateLimitRef.current;
    
    // Reset window if needed
    if (now - lastWindowStart >= rateLimitWindow) {
      rateLimitRef.current = {
        requests: [],
        lastWindowStart: now
      };
      return true;
    }
    
    // Check current window
    const recentRequests = requests.filter(time => now - time < rateLimitWindow);
    rateLimitRef.current.requests = recentRequests;
    
    if (recentRequests.length >= maxRequestsPerWindow) {
      handleError(createError(
        'RATE_LIMIT_EXCEEDED',
        `Too many requests. Maximum ${maxRequestsPerWindow} requests per ${rateLimitWindow / 1000} seconds.`,
        true
      ));
      return false;
    }
    
    // Add current request
    rateLimitRef.current.requests.push(now);
    return true;
  }, [enableRateLimit, rateLimitWindow, maxRequestsPerWindow, handleError, createError]);

  // ===== PERMISSIONS =====
  
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setState(prev => ({ ...prev, hasPermission: true }));
      callbacks.onPermissionChange?.(true);
      return true;
      
    } catch (error) {
      const voiceError = createError(
        'PERMISSION_DENIED',
        'Microphone permission denied. Please enable microphone access to use voice commands.',
        false,
        error
      );
      
      setState(prev => ({ ...prev, hasPermission: false }));
      callbacks.onPermissionChange?.(false);
      handleError(voiceError);
      return false;
    }
  }, [createError, handleError, callbacks]);

  // ===== TIMEOUTS MANAGEMENT =====
  
  const clearAllTimeouts = useCallback(() => {
    Object.values(timeoutRefs.current).forEach(timeout => {
      if (timeout) clearTimeout(timeout);
    });
    timeoutRefs.current = {};
  }, []);

  const startTimeouts = useCallback(() => {
    clearAllTimeouts();
    
    // No speech timeout
    if (noSpeechTimeout > 0) {
      timeoutRefs.current.noSpeech = setTimeout(() => {
        handleError(createError(
          'NO_SPEECH',
          'No speech detected. Please try speaking again.',
          true
        ));
      }, noSpeechTimeout);
    }
    
    // Maximum duration timeout
    if (maxDuration > 0) {
      timeoutRefs.current.maxDuration = setTimeout(() => {
        handleError(createError(
          'MAX_DURATION_EXCEEDED',
          `Recording stopped after ${maxDuration / 1000} seconds maximum duration.`,
          true
        ));
      }, maxDuration);
    }
  }, [clearAllTimeouts, noSpeechTimeout, maxDuration, handleError, createError]);

  // ===== UTILITIES =====
  
  const resetToIdle = useCallback(() => {
    clearAllTimeouts();
    
    setState(prev => ({
      ...prev,
      state: 'idle',
      isListening: false,
      isProcessing: false,
      error: null,
      currentTranscript: null
    }));
    
    callbacks.onStateChange?.('idle');
  }, [clearAllTimeouts, callbacks]);

  const updateSessionStats = useCallback((processingTime?: number, success?: boolean) => {
    setState(prev => {
      const stats = { ...prev.sessionStats };
      
      if (processingTime !== undefined) {
        stats.totalCommands++;
        if (success) stats.successfulCommands++;
        
        // Update average processing time
        const totalTime = stats.averageProcessingTime * (stats.totalCommands - 1) + processingTime;
        stats.averageProcessingTime = totalTime / stats.totalCommands;
      }
      
      // Update session time
      if (stats.sessionStartTime) {
        stats.totalSessionTime = Date.now() - stats.sessionStartTime;
      }
      
      return { ...prev, sessionStats: stats };
    });
  }, []);

  // ===== TRANSCRIPT PROCESSING =====
  
  const processTranscript = useCallback(async (transcript: string, isFinal: boolean, confidence: number = 1.0) => {
    const now = Date.now();
    
    const transcriptData: VoiceTranscript = {
      interim: !isFinal ? transcript : '',
      final: isFinal ? transcript : state.currentTranscript?.final || '',
      confidence,
      timestamp: now,
      isFinal
    };
    
    setState(prev => ({
      ...prev,
      currentTranscript: transcriptData,
      transcriptHistory: isFinal 
        ? [...prev.transcriptHistory.slice(-19), transcriptData] // Keep last 20
        : prev.transcriptHistory
    }));
    
    callbacks.onTranscriptUpdate?.(transcriptData);
    
    // Process final transcripts for intents
    if (isFinal && transcript.trim()) {
      setState(prev => ({ ...prev, state: 'processing', isProcessing: true }));
      callbacks.onStateChange?.('processing');
      
      try {
        const processingStart = Date.now();
        const result = await voiceIntents.processVoiceInput(transcript);
        const processingTime = Date.now() - processingStart;
        
        const success = result.intent.confidence >= 0.6;
        
        setState(prev => ({
          ...prev,
          lastProcessingResult: result,
          processingHistory: [...prev.processingHistory.slice(-9), result], // Keep last 10
          state: success ? 'success' : 'idle',
          isProcessing: false
        }));
        
        updateSessionStats(processingTime, success);
        callbacks.onIntentProcessed?.(result);
        callbacks.onStateChange?.(success ? 'success' : 'idle');
        
        // Auto-reset to idle after success
        if (success) {
          setTimeout(() => {
            if (state.state === 'success') {
              resetToIdle();
            }
          }, 1500);
        }
        
      } catch (error) {
        const voiceError = createError(
          'PROCESSING_ERROR',
          'Failed to process voice command',
          true,
          error
        );
        handleError(voiceError);
      }
    }
  }, [state.currentTranscript, state.state, callbacks, voiceIntents, updateSessionStats, resetToIdle, createError, handleError]);

  // ===== SPEECH RECOGNITION SETUP =====
  
  const setupRecognition = useCallback(() => {
    if (!speechRecognitionSupported) return null;
    
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return null;
    
    const recognition = new SpeechRecognitionClass();
    
    // Basic configuration
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = maxAlternatives;
    recognition.lang = recognitionLanguage;
    
    // Event handlers
    recognition.onstart = () => {
      if (enableDebugLogging) console.log('[VoiceCommands] Recognition started');
      
      clearTimeout(timeoutRefs.current.noSpeech);
      startTimeouts();
      
      setState(prev => ({ 
        ...prev, 
        state: 'listening', 
        isListening: true,
        error: null,
        sessionStats: {
          ...prev.sessionStats,
          sessionStartTime: prev.sessionStats.sessionStartTime || Date.now()
        }
      }));
      
      callbacks.onStateChange?.('listening');
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Clear no-speech timeout on first result
      clearTimeout(timeoutRefs.current.noSpeech);
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        const isFinal = result.isFinal;
        
        if (logTranscripts && enableDebugLogging) {
          console.log(`[VoiceCommands] ${isFinal ? 'Final' : 'Interim'}: "${transcript}" (${confidence})`);
        }
        
        processTranscript(transcript, isFinal, confidence);
        
        // Set silence timeout for interim results
        if (!isFinal && silenceTimeout > 0) {
          clearTimeout(timeoutRefs.current.silence);
          timeoutRefs.current.silence = setTimeout(() => {
            if (state.isListening) {
              stopListening();
            }
          }, silenceTimeout);
        }
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (enableDebugLogging) console.error('[VoiceCommands] Recognition error:', event.error);
      
      let errorCode = 'RECOGNITION_ERROR';
      let errorMessage = 'Voice recognition error occurred';
      let recoverable = true;
      
      switch (event.error) {
        case 'no-speech':
          errorCode = 'NO_SPEECH';
          errorMessage = 'No speech detected. Please try speaking again.';
          break;
        case 'audio-capture':
          errorCode = 'AUDIO_CAPTURE';
          errorMessage = 'Microphone not accessible. Please check your audio settings.';
          recoverable = false;
          break;
        case 'not-allowed':
          errorCode = 'PERMISSION_DENIED';
          errorMessage = 'Microphone permission denied. Please enable microphone access.';
          recoverable = false;
          break;
        case 'network':
          errorCode = 'NETWORK_ERROR';
          errorMessage = 'Network connection required for voice recognition.';
          break;
        case 'service-not-allowed':
          errorCode = 'SERVICE_NOT_ALLOWED';
          errorMessage = 'Voice recognition service not available in your region.';
          recoverable = false;
          break;
        case 'bad-grammar':
        case 'language-not-supported':
          errorCode = 'LANGUAGE_ERROR';
          errorMessage = `Language "${recognitionLanguage}" not supported for voice recognition.`;
          break;
      }
      
      const voiceError = createError(errorCode, errorMessage, recoverable, event);
      handleError(voiceError);
    };
    
    recognition.onend = () => {
      if (enableDebugLogging) console.log('[VoiceCommands] Recognition ended');
      
      clearAllTimeouts();
      
      setState(prev => ({
        ...prev,
        isListening: false
      }));
      
      // Auto-restart for continuous mode if we're still supposed to be listening
      if (continuous && state.state === 'listening' && !state.error) {
        setTimeout(() => {
          if (recognitionRef.current && state.state === 'listening') {
            try {
              recognitionRef.current.start();
            } catch (error) {
              if (enableDebugLogging) console.warn('[VoiceCommands] Auto-restart failed:', error);
            }
          }
        }, 100);
      }
    };
    
    recognition.onspeechstart = () => {
      if (enableDebugLogging) console.log('[VoiceCommands] Speech started');
      clearTimeout(timeoutRefs.current.noSpeech);
    };
    
    recognition.onspeechend = () => {
      if (enableDebugLogging) console.log('[VoiceCommands] Speech ended');
      
      // For toggle mode or non-continuous mode, stop after speech ends
      if (interactionMode === 'toggle' || !continuous) {
        setTimeout(() => stopListening(), 500);
      }
    };
    
    return recognition;
  }, [
    speechRecognitionSupported,
    continuous,
    interimResults,
    maxAlternatives,
    recognitionLanguage,
    enableDebugLogging,
    logTranscripts,
    silenceTimeout,
    interactionMode,
    startTimeouts,
    clearAllTimeouts,
    processTranscript,
    createError,
    handleError,
    callbacks,
    state.isListening,
    state.state,
    state.error
  ]);

  // ===== CORE ACTIONS =====
  
  const startListening = useCallback(async () => {
    // Check if we should use fallback
    if (shouldUseFallback) {
      if (enableDebugLogging) console.log('[VoiceCommands] Using Whisper fallback for recording');
      return await fallback.startRecording();
    }
    
    // Use Web Speech API
    if (!webSpeechSupported) {
      handleError(createError(
        'NOT_SUPPORTED',
        'Speech recognition is not supported in this browser and fallback is disabled',
        false
      ));
      return false;
    }
    
    if (state.isListening) return true;
    
    // Check rate limit
    if (!checkRateLimit()) return false;
    
    // Check permissions
    if (state.hasPermission === null || state.hasPermission === false) {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return false;
    }
    
    try {
      // Stop any existing recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Create new recognition instance
      const recognition = setupRecognition();
      if (!recognition) return false;
      
      recognitionRef.current = recognition;
      recognition.start();
      
      return true;
      
    } catch (error) {
      const voiceError = createError(
        'START_ERROR',
        'Failed to start voice recognition',
        true,
        error
      );
      handleError(voiceError);
      return false;
    }
  }, [
    shouldUseFallback,
    fallback,
    enableDebugLogging,
    webSpeechSupported,
    state.isListening,
    state.hasPermission,
    checkRateLimit,
    requestPermissions,
    setupRecognition,
    createError,
    handleError
  ]);
  
  const stopListening = useCallback(() => {
    // Check if we should use fallback
    if (shouldUseFallback) {
      if (enableDebugLogging) console.log('[VoiceCommands] Stopping Whisper fallback recording');
      fallback.stopRecording();
      return;
    }
    
    // Use Web Speech API
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    clearAllTimeouts();
    
    setState(prev => ({
      ...prev,
      state: 'idle',
      isListening: false
    }));
    
    callbacks.onStateChange?.('idle');
  }, [shouldUseFallback, enableDebugLogging, fallback, clearAllTimeouts, callbacks]);
  
  const toggleListening = useCallback(async () => {
    if (state.isListening) {
      stopListening();
      return false;
    } else {
      return await startListening();
    }
  }, [state.isListening, stopListening, startListening]);
  
  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcriptHistory: [],
      processingHistory: [],
      errorHistory: [],
      currentTranscript: null,
      lastProcessingResult: null,
      sessionStats: {
        totalCommands: 0,
        successfulCommands: 0,
        averageProcessingTime: 0,
        totalSessionTime: 0,
        sessionStartTime: null
      }
    }));
  }, []);

  // ===== INITIALIZATION AND CLEANUP =====
  
  useEffect(() => {
    if (!isInitializedRef.current) {
      const totalSupported = webSpeechSupported || (enableFallback && fallback.isSupported);
      
      setState(prev => ({
        ...prev,
        isSupported: totalSupported,
        usingFallback: shouldUseFallback,
        webSpeechSupported: webSpeechSupported,
        fallbackSupported: fallback.isSupported,
        fallbackReason: shouldUseFallback ? 
          (fallbackMode === 'force' ? 'Forced fallback mode' : 'Web Speech API not available') : 
          null
      }));
      
      isInitializedRef.current = true;
      
      if (enableDebugLogging) {
        console.log('[VoiceCommands] Initialized', {
          supported: totalSupported,
          webSpeechSupported: webSpeechSupported,
          fallbackSupported: fallback.isSupported,
          usingFallback: shouldUseFallback,
          fallbackReason: shouldUseFallback ? 
            (fallbackMode === 'force' ? 'Forced fallback mode' : 'Web Speech API not available') : 
            null,
          language: recognitionLanguage,
          continuous,
          interimResults
        });
      }
    }
  }, [
    webSpeechSupported,
    fallback.isSupported,
    shouldUseFallback,
    fallbackMode,
    enableFallback,
    recognitionLanguage,
    continuous,
    interimResults,
    enableDebugLogging
  ]);
  
  // Handle language changes
  useEffect(() => {
    if (recognitionRef.current && state.isListening) {
      // Restart recognition with new language
      stopListening();
      setTimeout(() => startListening(), 100);
    }
  }, [recognitionLanguage, state.isListening, stopListening, startListening]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  // ===== RETURN HOOK INTERFACE =====
  
  return {
    // State
    ...state,
    
    // Core actions
    startListening,
    stopListening,
    toggleListening,
    
    // Utility actions
    resetToIdle,
    clearHistory,
    requestPermissions,
    
    // Configuration
    config: {
      interactionMode,
      recognitionLanguage,
      isSupported: state.isSupported, // Now includes fallback support
      webSpeechSupported: state.webSpeechSupported,
      fallbackSupported: state.fallbackSupported,
      usingFallback: state.usingFallback,
      fallbackReason: state.fallbackReason,
      continuous,
      interimResults
    },
    
    // Fallback specific info
    fallback: {
      isSupported: fallback.isSupported,
      isRecording: fallback.isRecording,
      isProcessing: fallback.isProcessing,
      recordingFormat: fallback.recordingFormat,
      hasPermission: fallback.hasPermission,
      audioLevel: fallback.audioLevel
    },
    
    // Session info
    sessionDuration: state.sessionStats.sessionStartTime 
      ? Date.now() - state.sessionStats.sessionStartTime 
      : 0
  };
}

export type UseVoiceCommandsReturn = ReturnType<typeof useVoiceCommands>;