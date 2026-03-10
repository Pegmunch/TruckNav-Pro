/**
 * Voice Fallback Hook - MediaRecorder + OpenAI Whisper for TruckNav Pro
 * 
 * Comprehensive fallback solution for browsers without Web Speech API support:
 * - MediaRecorder API for audio capture with multi-format support
 * - OpenAI Whisper integration for server-side transcription
 * - Audio compression and optimization for reduced bandwidth
 * - Country-specific language support with confidence scoring
 * - Seamless integration with existing voice intent system
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCountryPreferences } from './use-country-preferences';
import type { VoiceState, VoiceTranscript, VoiceError, InteractionMode } from './use-voice-commands';
import { apiRequest } from '@/lib/queryClient';

// ===== FALLBACK CONFIGURATION =====

export interface VoiceFallbackConfig {
  // Recording settings
  interactionMode?: InteractionMode;
  audioFormat?: 'webm' | 'mp3' | 'wav' | 'auto';
  audioBitRate?: number;
  audioSampleRate?: number;
  audioChannels?: 1 | 2;
  
  // Processing settings
  maxRecordingDuration?: number;     // Maximum recording length (ms)
  minRecordingDuration?: number;     // Minimum recording length (ms)
  chunkSize?: number;                // Audio chunk size for streaming (ms)
  compressionLevel?: number;         // 0-10, higher = more compression
  
  // Upload settings
  maxFileSize?: number;              // Maximum upload size (bytes)
  uploadTimeout?: number;            // Upload timeout (ms)
  retryAttempts?: number;           // Failed upload retry attempts
  retryDelay?: number;              // Delay between retries (ms)
  
  // Performance settings
  enableVoiceActivityDetection?: boolean; // VAD for auto-stop
  vadSilenceThreshold?: number;          // Silence threshold (0-1)
  vadSilenceDuration?: number;           // Silence duration to stop (ms)
  enableNoiseCancellation?: boolean;     // Browser noise cancellation
  enableEchoCancellation?: boolean;      // Browser echo cancellation
  enableAutoGainControl?: boolean;       // Browser auto gain control
  
  // Quality settings
  highQualityMode?: boolean;         // High quality vs performance mode
  enablePreProcessing?: boolean;     // Audio preprocessing
  normalizeAudio?: boolean;          // Audio level normalization
  
  // Debug settings
  enableDebugLogging?: boolean;
  saveRecordingsLocal?: boolean;     // Save recordings to localStorage for debug
}

// ===== AUDIO FORMAT DEFINITIONS =====

interface AudioFormatConfig {
  mimeType: string;
  extension: string;
  browserSupport: string[];
  priority: number; // 1-10, higher = preferred
  maxSize: number; // Max file size estimate
  quality: 'low' | 'medium' | 'high';
}

const AUDIO_FORMATS: Record<string, AudioFormatConfig> = {
  webm: {
    mimeType: 'audio/webm;codecs=opus',
    extension: 'webm',
    browserSupport: ['chrome', 'firefox', 'edge'],
    priority: 9,
    maxSize: 1024 * 1024, // 1MB for 30 seconds
    quality: 'high'
  },
  mp4: {
    mimeType: 'audio/mp4',
    extension: 'm4a',
    browserSupport: ['safari', 'chrome', 'edge'],
    priority: 8,
    maxSize: 1536 * 1024, // 1.5MB for 30 seconds
    quality: 'high'
  },
  wav: {
    mimeType: 'audio/wav',
    extension: 'wav',
    browserSupport: ['chrome', 'firefox', 'safari', 'edge'],
    priority: 6,
    maxSize: 5 * 1024 * 1024, // 5MB for 30 seconds (uncompressed)
    quality: 'medium'
  },
  ogg: {
    mimeType: 'audio/ogg;codecs=opus',
    extension: 'ogg',
    browserSupport: ['firefox', 'chrome'],
    priority: 7,
    maxSize: 1024 * 1024, // 1MB for 30 seconds
    quality: 'high'
  }
};

// ===== BROWSER DETECTION =====

function detectBrowser(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
  if (userAgent.includes('edg')) return 'edge';
  
  return 'unknown';
}

function getSupportedAudioFormat(preferredFormat: string = 'auto'): AudioFormatConfig | null {
  if (typeof window === 'undefined' || !window.MediaRecorder) return null;
  
  const browser = detectBrowser();
  
  // If specific format requested, check if supported
  if (preferredFormat !== 'auto' && preferredFormat in AUDIO_FORMATS) {
    const format = AUDIO_FORMATS[preferredFormat];
    if (MediaRecorder.isTypeSupported(format.mimeType)) {
      return format;
    }
  }
  
  // Find best supported format for browser
  const supportedFormats = Object.values(AUDIO_FORMATS)
    .filter(format => 
      format.browserSupport.includes(browser) && 
      MediaRecorder.isTypeSupported(format.mimeType)
    )
    .sort((a, b) => b.priority - a.priority);
    
  return supportedFormats[0] || null;
}

// ===== TRANSCRIPTION TYPES =====

export interface TranscriptionRequest {
  audioData: Blob;
  language?: string;
  format: string;
  duration: number;
  timestamp: number;
}

export interface TranscriptionResponse {
  text: string;
  confidence: number;
  language?: string;
  duration: number;
  processingTime: number;
  words?: Array<{
    text: string;
    confidence: number;
    start: number;
    end: number;
  }>;
}

// ===== AUDIO PROCESSING UTILITIES =====

function compressAudioBlob(blob: Blob, compressionLevel: number = 5): Promise<Blob> {
  return new Promise((resolve) => {
    // For now, return original blob - would implement actual compression in production
    // This would involve creating an AudioContext, processing the audio, and re-encoding
    resolve(blob);
  });
}

function normalizeAudioBlob(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    // Audio normalization would be implemented here using Web Audio API
    resolve(blob);
  });
}

function detectAudioActivity(audioData: Float32Array, threshold: number = 0.01): boolean {
  // Simple Voice Activity Detection
  const sum = audioData.reduce((acc, val) => acc + Math.abs(val), 0);
  const average = sum / audioData.length;
  return average > threshold;
}

// ===== MAIN FALLBACK STATE =====

export interface VoiceFallbackState {
  // Core state
  state: VoiceState;
  isSupported: boolean;
  hasPermission: boolean | null;
  
  // Recording state
  isRecording: boolean;
  isProcessing: boolean;
  isUploading: boolean;
  
  // Audio data
  currentRecording: Blob | null;
  recordingDuration: number;
  audioFormat: AudioFormatConfig | null;
  
  // Transcription data
  currentTranscript: VoiceTranscript | null;
  transcriptionHistory: VoiceTranscript[];
  
  // Error handling
  error: VoiceError | null;
  errorHistory: VoiceError[];
  
  // Performance metrics
  sessionStats: {
    totalRecordings: number;
    successfulTranscriptions: number;
    averageProcessingTime: number;
    averageUploadTime: number;
    totalDataUploaded: number; // bytes
    sessionStartTime: number | null;
  };
}

export interface VoiceFallbackCallbacks {
  onTranscriptUpdate?: (transcript: VoiceTranscript) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: (duration: number) => void;
  onTranscriptionStart?: () => void;
  onTranscriptionComplete?: (transcript: VoiceTranscript) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: VoiceError) => void;
  onPermissionChange?: (hasPermission: boolean) => void;
}

// ===== HOOK IMPLEMENTATION =====

export function useVoiceFallback(
  config: VoiceFallbackConfig = {},
  callbacks: VoiceFallbackCallbacks = {}
) {
  // ===== CONFIGURATION =====
  
  const {
    interactionMode = 'toggle',
    audioFormat = 'auto',
    audioBitRate = 128000,
    audioSampleRate = 44100,
    audioChannels = 1,
    maxRecordingDuration = 30000,
    minRecordingDuration = 500,
    chunkSize = 1000,
    compressionLevel = 5,
    maxFileSize = 10 * 1024 * 1024, // 10MB
    uploadTimeout = 30000,
    retryAttempts = 3,
    retryDelay = 1000,
    enableVoiceActivityDetection = true,
    vadSilenceThreshold = 0.01,
    vadSilenceDuration = 2000,
    enableNoiseCancellation = true,
    enableEchoCancellation = true,
    enableAutoGainControl = true,
    highQualityMode = false,
    enablePreProcessing = true,
    normalizeAudio = false,
    enableDebugLogging = false,
    saveRecordingsLocal = false
  } = config;

  // ===== DEPENDENCIES =====
  
  const { preferences } = useCountryPreferences();

  // ===== STATE =====
  
  const [state, setState] = useState<VoiceFallbackState>({
    state: 'idle',
    isSupported: false,
    hasPermission: null,
    isRecording: false,
    isProcessing: false,
    isUploading: false,
    currentRecording: null,
    recordingDuration: 0,
    audioFormat: null,
    currentTranscript: null,
    transcriptionHistory: [],
    error: null,
    errorHistory: [],
    sessionStats: {
      totalRecordings: 0,
      successfulTranscriptions: 0,
      averageProcessingTime: 0,
      averageUploadTime: 0,
      totalDataUploaded: 0,
      sessionStartTime: null
    }
  });

  // ===== REFS =====
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceStartTimeRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ===== SUPPORT DETECTION =====
  
  const mediaRecorderSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    return !!(
      window.MediaRecorder &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }, []);

  const supportedAudioFormat = useMemo(() => {
    return getSupportedAudioFormat(audioFormat);
  }, [audioFormat]);

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
      console.error('[VoiceFallback] Error:', error);
    }
    
    setState(prev => ({
      ...prev,
      error,
      errorHistory: [...prev.errorHistory.slice(-9), error], // Keep last 10
      state: 'error',
      isRecording: false,
      isProcessing: false,
      isUploading: false
    }));
    
    callbacks.onError?.(error);
    callbacks.onStateChange?.('error');
  }, [enableDebugLogging, callbacks]);

  // ===== LANGUAGE MAPPING =====
  
  const getWhisperLanguage = useCallback((): string => {
    // Map country preferences to Whisper language codes
    const countryToWhisperLang: Record<string, string> = {
      'GB': 'en',
      'US': 'en', 
      'CA': 'en',
      'AU': 'en',
      'DE': 'de',
      'FR': 'fr',
      'ES': 'es',
      'IT': 'it',
      'NL': 'nl',
      'PL': 'pl',
      'PT': 'pt',
      'RU': 'ru',
      'CN': 'zh',
      'JP': 'ja',
      'KR': 'ko',
      'IN': 'hi',
      'TR': 'tr',
      'SA': 'ar'
    };
    
    return countryToWhisperLang[preferences.country.code] || 'en';
  }, [preferences.country]);

  // ===== PERMISSIONS =====
  
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: audioSampleRate,
          channelCount: audioChannels,
          echoCancellation: enableEchoCancellation,
          noiseSuppression: enableNoiseCancellation,
          autoGainControl: enableAutoGainControl
        } 
      });
      
      // Test stream briefly to ensure it works
      audioStreamRef.current = stream;
      
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
  }, [audioSampleRate, audioChannels, enableEchoCancellation, enableNoiseCancellation, enableAutoGainControl, createError, handleError, callbacks]);

  // ===== VOICE ACTIVITY DETECTION =====
  
  const setupVoiceActivityDetection = useCallback(() => {
    if (!enableVoiceActivityDetection || !audioStreamRef.current) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(audioStreamRef.current);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Convert to float and detect activity
        const floatData = Array.from(dataArray).map(val => val / 255.0);
        const hasActivity = detectAudioActivity(new Float32Array(floatData), vadSilenceThreshold);
        
        if (!hasActivity) {
          if (!silenceStartTimeRef.current) {
            silenceStartTimeRef.current = Date.now();
          } else if (Date.now() - silenceStartTimeRef.current > vadSilenceDuration) {
            // Auto-stop recording after silence
            stopRecording();
          }
        } else {
          silenceStartTimeRef.current = null;
        }
      }, 100); // Check every 100ms
      
    } catch (error) {
      if (enableDebugLogging) {
        console.warn('[VoiceFallback] VAD setup failed:', error);
      }
    }
  }, [enableVoiceActivityDetection, vadSilenceThreshold, vadSilenceDuration, enableDebugLogging]);

  // ===== RECORDING CONTROL =====
  
  const startRecording = useCallback(async (): Promise<boolean> => {
    if (state.isRecording || state.isProcessing) return false;
    
    try {
      // Request permissions if needed
      if (!state.hasPermission) {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return false;
      }

      // Get fresh stream if needed
      if (!audioStreamRef.current) {
        await requestPermissions();
      }

      if (!audioStreamRef.current || !supportedAudioFormat) {
        handleError(createError(
          'RECORDING_SETUP_FAILED',
          'Failed to set up audio recording. Please check browser support.',
          true
        ));
        return false;
      }

      // Create MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(audioStreamRef.current, {
        mimeType: supportedAudioFormat.mimeType,
        audioBitsPerSecond: audioBitRate
      });

      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      // Set up event handlers
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: supportedAudioFormat.mimeType 
        });

        const duration = recordingStartTimeRef.current ? 
          Date.now() - recordingStartTimeRef.current : 0;

        setState(prev => ({
          ...prev,
          currentRecording: audioBlob,
          recordingDuration: duration,
          isRecording: false,
          isProcessing: true,
          state: 'processing'
        }));

        callbacks.onRecordingStop?.(duration);
        callbacks.onStateChange?.('processing');

        // Process the recording
        await processRecording(audioBlob, duration);
      };

      mediaRecorderRef.current.onerror = (event) => {
        handleError(createError(
          'RECORDING_ERROR',
          'Recording failed due to a MediaRecorder error.',
          true,
          event
        ));
      };

      // Start recording
      mediaRecorderRef.current.start(chunkSize);
      
      // Set up VAD
      setupVoiceActivityDetection();

      // Set up duration tracking
      recordingIntervalRef.current = setInterval(() => {
        if (!recordingStartTimeRef.current) return;
        
        const duration = Date.now() - recordingStartTimeRef.current;
        setState(prev => ({ ...prev, recordingDuration: duration }));

        // Auto-stop at max duration
        if (duration >= maxRecordingDuration) {
          stopRecording();
        }
      }, 100);

      setState(prev => ({
        ...prev,
        isRecording: true,
        state: 'listening',
        error: null,
        sessionStats: {
          ...prev.sessionStats,
          totalRecordings: prev.sessionStats.totalRecordings + 1,
          sessionStartTime: prev.sessionStats.sessionStartTime || Date.now()
        }
      }));

      callbacks.onRecordingStart?.();
      callbacks.onStateChange?.('listening');

      return true;

    } catch (error) {
      handleError(createError(
        'RECORDING_START_FAILED',
        'Failed to start recording. Please check microphone permissions.',
        true,
        error
      ));
      return false;
    }
  }, [state.isRecording, state.isProcessing, state.hasPermission, supportedAudioFormat, audioBitRate, chunkSize, maxRecordingDuration, requestPermissions, createError, handleError, callbacks, setupVoiceActivityDetection]);

  const stopRecording = useCallback(() => {
    if (!state.isRecording || !mediaRecorderRef.current) return;

    try {
      mediaRecorderRef.current.stop();
      
      // Clean up intervals
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);
        vadIntervalRef.current = null;
      }
      
      silenceStartTimeRef.current = null;

    } catch (error) {
      handleError(createError(
        'RECORDING_STOP_FAILED',
        'Failed to stop recording properly.',
        true,
        error
      ));
    }
  }, [state.isRecording, handleError, createError]);

  // ===== AUDIO PROCESSING =====
  
  const processRecording = useCallback(async (audioBlob: Blob, duration: number) => {
    if (duration < minRecordingDuration) {
      handleError(createError(
        'RECORDING_TOO_SHORT',
        `Recording too short (${duration}ms). Minimum duration is ${minRecordingDuration}ms.`,
        true
      ));
      return;
    }

    if (audioBlob.size > maxFileSize) {
      handleError(createError(
        'FILE_TOO_LARGE',
        `Audio file too large (${Math.round(audioBlob.size / 1024)}KB). Maximum size is ${Math.round(maxFileSize / 1024)}KB.`,
        true
      ));
      return;
    }

    callbacks.onTranscriptionStart?.();

    let processedBlob = audioBlob;

    try {
      // Apply audio processing if enabled
      if (enablePreProcessing) {
        if (compressionLevel > 0) {
          processedBlob = await compressAudioBlob(processedBlob, compressionLevel);
        }
        
        if (normalizeAudio) {
          processedBlob = await normalizeAudioBlob(processedBlob);
        }
      }

      // Save locally if debugging
      if (saveRecordingsLocal && enableDebugLogging) {
        const reader = new FileReader();
        reader.onload = () => {
          localStorage.setItem(
            `voice-recording-${Date.now()}`,
            JSON.stringify({
              data: reader.result,
              duration,
              size: processedBlob.size,
              type: processedBlob.type
            })
          );
        };
        reader.readAsDataURL(processedBlob);
      }

      // Upload and transcribe
      await uploadAndTranscribe(processedBlob, duration);

    } catch (error) {
      handleError(createError(
        'PROCESSING_FAILED',
        'Failed to process audio recording.',
        true,
        error
      ));
    }
  }, [minRecordingDuration, maxFileSize, enablePreProcessing, compressionLevel, normalizeAudio, saveRecordingsLocal, enableDebugLogging, callbacks, createError, handleError]);

  const uploadAndTranscribe = useCallback(async (audioBlob: Blob, duration: number) => {
    const startTime = Date.now();
    
    setState(prev => ({ ...prev, isUploading: true }));

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${supportedAudioFormat?.extension || 'webm'}`);
      formData.append('language', getWhisperLanguage());
      formData.append('duration', duration.toString());
      formData.append('timestamp', Date.now().toString());

      const response = await apiRequest<TranscriptionResponse>('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
        timeout: uploadTimeout,
        retries: retryAttempts,
        retryDelay
      });

      const uploadTime = Date.now() - startTime;
      
      // Create transcript object
      const transcript: VoiceTranscript = {
        interim: '',
        final: response.text,
        confidence: response.confidence,
        timestamp: Date.now(),
        isFinal: true
      };

      setState(prev => ({
        ...prev,
        currentTranscript: transcript,
        transcriptionHistory: [...prev.transcriptionHistory.slice(-9), transcript], // Keep last 10
        isProcessing: false,
        isUploading: false,
        state: 'success',
        sessionStats: {
          ...prev.sessionStats,
          successfulTranscriptions: prev.sessionStats.successfulTranscriptions + 1,
          averageUploadTime: ((prev.sessionStats.averageUploadTime * prev.sessionStats.successfulTranscriptions) + uploadTime) / (prev.sessionStats.successfulTranscriptions + 1),
          averageProcessingTime: ((prev.sessionStats.averageProcessingTime * prev.sessionStats.successfulTranscriptions) + response.processingTime) / (prev.sessionStats.successfulTranscriptions + 1),
          totalDataUploaded: prev.sessionStats.totalDataUploaded + audioBlob.size
        }
      }));

      callbacks.onTranscriptUpdate?.(transcript);
      callbacks.onTranscriptionComplete?.(transcript);
      callbacks.onStateChange?.('success');

      // Auto-reset to idle after success
      setTimeout(() => {
        setState(prev => ({ ...prev, state: 'idle' }));
        callbacks.onStateChange?.('idle');
      }, 2000);

    } catch (error) {
      handleError(createError(
        'TRANSCRIPTION_FAILED',
        'Failed to transcribe audio. Please check your connection and try again.',
        true,
        error
      ));
    } finally {
      setState(prev => ({ ...prev, isUploading: false }));
    }
  }, [supportedAudioFormat, getWhisperLanguage, uploadTimeout, retryAttempts, retryDelay, callbacks, createError, handleError]);

  // ===== INITIALIZATION =====
  
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isSupported: mediaRecorderSupported && !!supportedAudioFormat,
      audioFormat: supportedAudioFormat
    }));
  }, [mediaRecorderSupported, supportedAudioFormat]);

  // ===== CLEANUP =====
  
  useEffect(() => {
    return () => {
      // Clean up resources
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);
      }

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // ===== UTILITY FUNCTIONS =====
  
  const resetToIdle = useCallback(() => {
    setState(prev => ({
      ...prev,
      state: 'idle',
      error: null,
      isRecording: false,
      isProcessing: false,
      isUploading: false
    }));
    callbacks.onStateChange?.('idle');
  }, [callbacks]);

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcriptionHistory: [],
      errorHistory: [],
      currentTranscript: null
    }));
  }, []);

  const getSessionStats = useCallback(() => {
    const stats = state.sessionStats;
    const sessionDuration = stats.sessionStartTime ? Date.now() - stats.sessionStartTime : 0;
    
    return {
      ...stats,
      sessionDuration,
      successRate: stats.totalRecordings > 0 ? stats.successfulTranscriptions / stats.totalRecordings : 0,
      averageDataPerUpload: stats.successfulTranscriptions > 0 ? stats.totalDataUploaded / stats.successfulTranscriptions : 0
    };
  }, [state.sessionStats]);

  // ===== RETURN API =====
  
  return {
    // State
    ...state,
    
    // Control functions
    startRecording,
    stopRecording,
    requestPermissions,
    
    // Utility functions
    resetToIdle,
    clearHistory,
    getSessionStats,
    
    // Configuration
    audioFormat: supportedAudioFormat,
    languageCode: getWhisperLanguage(),
    
    // Browser compatibility
    browserSupport: {
      mediaRecorder: mediaRecorderSupported,
      audioFormat: !!supportedAudioFormat,
      browser: detectBrowser(),
      supportedFormats: Object.keys(AUDIO_FORMATS).filter(format => 
        AUDIO_FORMATS[format].browserSupport.includes(detectBrowser()) &&
        MediaRecorder.isTypeSupported(AUDIO_FORMATS[format].mimeType)
      )
    }
  };
}

// ===== PRESET CONFIGURATIONS =====

export const VOICE_FALLBACK_PRESETS = {
  // High quality, larger file sizes
  highQuality: {
    highQualityMode: true,
    audioBitRate: 256000,
    audioSampleRate: 48000,
    compressionLevel: 3,
    enablePreProcessing: true,
    normalizeAudio: true
  } as VoiceFallbackConfig,
  
  // Balanced quality and performance
  balanced: {
    highQualityMode: false,
    audioBitRate: 128000,
    audioSampleRate: 44100,
    compressionLevel: 5,
    enablePreProcessing: true,
    normalizeAudio: false
  } as VoiceFallbackConfig,
  
  // Low bandwidth, faster upload
  lowBandwidth: {
    highQualityMode: false,
    audioBitRate: 64000,
    audioSampleRate: 22050,
    compressionLevel: 8,
    maxRecordingDuration: 15000,
    enablePreProcessing: true,
    normalizeAudio: false
  } as VoiceFallbackConfig,
  
  // Mobile optimized
  mobile: {
    highQualityMode: false,
    audioBitRate: 96000,
    audioSampleRate: 44100,
    compressionLevel: 6,
    maxRecordingDuration: 20000,
    enableVoiceActivityDetection: true,
    vadSilenceDuration: 1500,
    enablePreProcessing: true
  } as VoiceFallbackConfig
};