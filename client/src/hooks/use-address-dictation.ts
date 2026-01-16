/**
 * useAddressDictation Hook - Simple speech-to-text for address input
 * 
 * Lightweight hook specifically for dictating addresses into input fields.
 * Uses Web Speech API for real-time transcription.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
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
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly confidence: number;
  readonly transcript: string;
}

export type DictationState = 'idle' | 'listening' | 'processing' | 'error';

export interface AddressDictationResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export interface UseAddressDictationOptions {
  lang?: string;
  onResult?: (result: AddressDictationResult) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: DictationState) => void;
  timeout?: number;
}

export function useAddressDictation(options: UseAddressDictationOptions = {}) {
  const {
    lang = 'en-GB',
    onResult,
    onFinalResult,
    onError,
    onStateChange,
    timeout = 10000
  } = options;

  const [state, setState] = useState<DictationState>('idle');
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionClass);
  }, []);

  const updateState = useCallback((newState: DictationState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearTimeouts();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
    updateState('idle');
  }, [clearTimeouts, updateState]);

  const startListening = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      console.error('[ADDRESS-DICTATION] Speech recognition not supported');
      onError?.('Speech recognition is not supported in this browser');
      updateState('error');
      return;
    }

    if (recognitionRef.current) {
      stopListening();
    }

    console.log('[ADDRESS-DICTATION] Starting speech recognition...');
    
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[ADDRESS-DICTATION] Listening started');
      updateState('listening');
      setInterimTranscript('');
      setFinalTranscript('');

      timeoutRef.current = setTimeout(() => {
        console.log('[ADDRESS-DICTATION] Timeout - stopping');
        stopListening();
      }, timeout);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          final += transcript;
          const confidence = result[0].confidence;
          console.log('[ADDRESS-DICTATION] Final result:', transcript, 'confidence:', confidence);
          
          onResult?.({
            transcript,
            isFinal: true,
            confidence
          });
          
          onFinalResult?.(transcript.trim());
        } else {
          interim += transcript;
          onResult?.({
            transcript,
            isFinal: false,
            confidence: result[0].confidence
          });
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }
      if (final) {
        setFinalTranscript(final);
        clearTimeouts();
        updateState('processing');
        
        setTimeout(() => {
          stopListening();
        }, 500);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[ADDRESS-DICTATION] Error:', event.error);
      clearTimeouts();
      
      let errorMessage = 'Speech recognition error';
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your device.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          updateState('idle');
          return;
      }
      
      onError?.(errorMessage);
      updateState('error');
      
      setTimeout(() => {
        updateState('idle');
      }, 2000);
    };

    recognition.onend = () => {
      console.log('[ADDRESS-DICTATION] Recognition ended');
      clearTimeouts();
      if (state === 'listening') {
        updateState('idle');
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error('[ADDRESS-DICTATION] Failed to start:', error);
      onError?.('Failed to start speech recognition');
      updateState('error');
    }
  }, [lang, timeout, onResult, onFinalResult, onError, stopListening, clearTimeouts, updateState, state]);

  const toggleListening = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening]);

  useEffect(() => {
    return () => {
      clearTimeouts();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [clearTimeouts]);

  return {
    state,
    isSupported,
    isListening: state === 'listening',
    isProcessing: state === 'processing',
    interimTranscript,
    finalTranscript,
    startListening,
    stopListening,
    toggleListening
  };
}
