/**
 * Voice Intent Processing Hook for TruckNav Pro
 * React hook for processing voice commands with country-specific recognition
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useCountryPreferences } from './use-country-preferences';
import { 
  parseVoiceIntent,
  resolveIntentWithContext,
  handleUnrecognizedCommand,
  type VoiceIntent,
  type IntentContext,
  type VoiceEntity,
  type PostcodeEntity,
  type POIEntity
} from '../../../shared/voice/intents';
import { 
  extractAllEntities,
  type MeasurementEntity,
  type VehicleEntity
} from '../../../shared/voice/entity-recognition';
import { 
  getLanguagePatterns,
  getTruckTerminology,
  type LanguagePattern
} from '../../../shared/voice/language-patterns';
import { 
  detectPostcodeCountry,
  validatePostcode,
  formatPostcode,
  type PostcodeCountry
} from '../lib/postcode-utils';

// ===== HOOK OPTIONS =====

export interface VoiceIntentOptions {
  minConfidence?: number;
  includeVehicleEntities?: boolean;
  includeMeasurementEntities?: boolean;
  contextAware?: boolean;
  enableFuzzyMatching?: boolean;
  maxProcessingTime?: number;
}

// ===== PROCESSING RESULT =====

export interface VoiceProcessingResult {
  intent: VoiceIntent;
  entities: VoiceEntity[];
  postcodes: PostcodeEntity[];
  pois: POIEntity[];
  measurements: MeasurementEntity[];
  vehicles: VehicleEntity[];
  processingTime: number;
  suggestions?: string[];
  errors?: string[];
}

// ===== INTENT HANDLER TYPES =====

export type IntentHandler = (intent: VoiceIntent, entities: VoiceEntity[]) => void | Promise<void>;

export interface IntentHandlers {
  navigation?: IntentHandler;
  routing?: IntentHandler;
  search?: IntentHandler;
  controls?: IntentHandler;
  settings?: IntentHandler;
  favorites?: IntentHandler;
  traffic?: IntentHandler;
  entertainment?: IntentHandler;
  help?: IntentHandler;
  unknown?: IntentHandler;
}

// ===== PROCESSING STATE =====

export interface VoiceProcessingState {
  isProcessing: boolean;
  lastProcessedText: string;
  lastResult: VoiceProcessingResult | null;
  processingHistory: VoiceProcessingResult[];
  context: IntentContext;
}

// ===== MAIN HOOK =====

export function useVoiceIntents(
  handlers: IntentHandlers = {},
  options: VoiceIntentOptions = {}
) {
  const {
    minConfidence = 0.6,
    includeVehicleEntities = true,
    includeMeasurementEntities = true,
    contextAware = true,
    enableFuzzyMatching = true,
    maxProcessingTime = 1000
  } = options;

  const { preferences } = useCountryPreferences();
  
  const [state, setState] = useState<VoiceProcessingState>({
    isProcessing: false,
    lastProcessedText: '',
    lastResult: null,
    processingHistory: [],
    context: {
      navigationState: 'idle',
      routeActive: false,
      userPreferences: {}
    }
  });

  // ===== LANGUAGE CONTEXT =====

  const languagePattern = useMemo(() => {
    return getLanguagePatterns(preferences.country);
  }, [preferences.country]);

  const truckTerminology = useMemo(() => {
    return {
      truck: getTruckTerminology('truck', preferences.country),
      parking: getTruckTerminology('parking', preferences.country),
      fuel: getTruckTerminology('fuel', preferences.country),
      restrictions: getTruckTerminology('restrictions', preferences.country)
    };
  }, [preferences.country]);

  // ===== POSTCODE INTEGRATION =====

  const processPostcodes = useCallback((entities: VoiceEntity[]): PostcodeEntity[] => {
    return entities
      .filter((entity): entity is PostcodeEntity => entity.type === 'postcode')
      .map(entity => {
        // Enhanced validation using existing postcode utilities
        const country = entity.country || detectPostcodeCountry(entity.value);
        if (!country) return entity;

        const isValid = validatePostcode(entity.value, country);
        const formatted = formatPostcode(entity.value, country);

        return {
          ...entity,
          country,
          formatted,
          isValid,
          confidence: isValid ? Math.min(entity.confidence + 0.1, 1.0) : entity.confidence * 0.8,
          metadata: {
            ...entity.metadata,
            validatedByUtils: true,
            originalFormat: entity.value,
            countryDetected: !entity.country
          }
        };
      });
  }, []);

  // ===== MAIN PROCESSING FUNCTION =====

  const processVoiceInput = useCallback(async (
    text: string,
    additionalContext?: Partial<IntentContext>
  ): Promise<VoiceProcessingResult> => {
    const startTime = Date.now();
    
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      lastProcessedText: text 
    }));

    try {
      // Extract entities with country context
      const entities = extractAllEntities(text, {
        country: preferences.country.code as PostcodeCountry,
        countryPreferences: preferences.country,
        includeVehicle: includeVehicleEntities,
        includeMeasurements: includeMeasurementEntities
      });

      // Process postcodes with enhanced validation
      const postcodes = processPostcodes(entities);

      // Parse intent with language and country context
      let intent = parseVoiceIntent(text, {
        language: preferences.country.defaultLanguage,
        country: preferences.country.code,
        context: additionalContext
      });

      // Apply context-aware resolution if enabled
      if (contextAware) {
        const enhancedContext: IntentContext = {
          ...state.context,
          ...additionalContext,
          lastIntent: state.lastResult?.intent
        };
        intent = resolveIntentWithContext(intent, enhancedContext);
      }

      // Filter entities by confidence
      const highConfidenceEntities = entities.filter(e => e.confidence >= minConfidence);

      // Categorize entities
      const pois = highConfidenceEntities.filter((e): e is POIEntity => e.type === 'poi');
      const measurements = highConfidenceEntities.filter(e => e.type === 'measurement') as MeasurementEntity[];
      const vehicles = highConfidenceEntities.filter(e => e.type === 'vehicle') as VehicleEntity[];

      const processingTime = Date.now() - startTime;

      // Handle timeout
      if (processingTime > maxProcessingTime) {
        console.warn(`Voice processing took ${processingTime}ms, exceeding limit of ${maxProcessingTime}ms`);
      }

      // Generate suggestions for low confidence intents
      let suggestions: string[] | undefined;
      let errors: string[] | undefined;

      if (intent.confidence < minConfidence) {
        const unrecognizedResult = handleUnrecognizedCommand(text);
        suggestions = unrecognizedResult.context?.suggestions as string[];
        errors = ['Command not recognized with sufficient confidence'];
      }

      const result: VoiceProcessingResult = {
        intent,
        entities: highConfidenceEntities,
        postcodes,
        pois,
        measurements,
        vehicles,
        processingTime,
        suggestions,
        errors
      };

      // Update state
      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResult: result,
        processingHistory: [...prev.processingHistory.slice(-9), result], // Keep last 10
        context: {
          ...prev.context,
          lastIntent: intent,
          ...(additionalContext || {})
        }
      }));

      // Call appropriate handler
      if (intent.confidence >= minConfidence) {
        const handler = handlers[intent.category];
        if (handler) {
          try {
            await handler(intent, highConfidenceEntities);
          } catch (error) {
            console.error('Intent handler error:', error);
            result.errors = [...(result.errors || []), `Handler error: ${error}`];
          }
        }
      }

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Voice processing error:', error);
      
      const errorResult: VoiceProcessingResult = {
        intent: handleUnrecognizedCommand(text),
        entities: [],
        postcodes: [],
        pois: [],
        measurements: [],
        vehicles: [],
        processingTime,
        errors: [`Processing error: ${error}`]
      };

      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResult: errorResult
      }));

      return errorResult;
    }
  }, [
    preferences.country,
    includeVehicleEntities,
    includeMeasurementEntities,
    contextAware,
    minConfidence,
    maxProcessingTime,
    handlers,
    state.context,
    state.lastResult,
    processPostcodes
  ]);

  // ===== CONTEXT MANAGEMENT =====

  const updateContext = useCallback((updates: Partial<IntentContext>) => {
    setState(prev => ({
      ...prev,
      context: { ...prev.context, ...updates }
    }));
  }, []);

  const setNavigationState = useCallback((navigationState: IntentContext['navigationState']) => {
    updateContext({ navigationState });
  }, [updateContext]);

  const setRouteActive = useCallback((routeActive: boolean) => {
    updateContext({ routeActive });
  }, [updateContext]);

  const setCurrentLocation = useCallback((location: { lat: number; lng: number }) => {
    updateContext({ currentLocation: location });
  }, [updateContext]);

  // ===== UTILITY FUNCTIONS =====

  const getIntentSuggestions = useCallback((category: string): string[] => {
    if (!languagePattern) return [];
    
    const patterns = languagePattern.patterns[category];
    if (!patterns) return [];
    
    return patterns.slice(0, 3).map(pattern => 
      pattern.replace(/\{[^}]+\}/g, '[location]')
    );
  }, [languagePattern]);

  const validateCommand = useCallback((text: string): boolean => {
    return text.trim().length > 0 && text.trim().length < 200;
  }, []);

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      processingHistory: [],
      lastResult: null
    }));
  }, []);

  // ===== ENTITY HELPERS =====

  const findPostcodeInResults = useCallback((country?: PostcodeCountry): PostcodeEntity | null => {
    const postcodes = state.lastResult?.postcodes || [];
    if (country) {
      return postcodes.find(p => p.country === country) || null;
    }
    return postcodes[0] || null;
  }, [state.lastResult]);

  const findPOIInResults = useCallback((facilityType?: string): POIEntity | null => {
    const pois = state.lastResult?.pois || [];
    if (facilityType) {
      return pois.find(p => p.facilityType === facilityType) || null;
    }
    return pois[0] || null;
  }, [state.lastResult]);

  const getMeasurementsInResults = useCallback((measurementType?: string): MeasurementEntity[] => {
    const measurements = state.lastResult?.measurements || [];
    if (measurementType) {
      return measurements.filter(m => m.measurementType === measurementType);
    }
    return measurements;
  }, [state.lastResult]);

  // ===== PERFORMANCE MONITORING =====

  const getAverageProcessingTime = useCallback((): number => {
    const history = state.processingHistory;
    if (history.length === 0) return 0;
    
    const totalTime = history.reduce((sum, result) => sum + result.processingTime, 0);
    return totalTime / history.length;
  }, [state.processingHistory]);

  const getSuccessRate = useCallback((): number => {
    const history = state.processingHistory;
    if (history.length === 0) return 0;
    
    const successful = history.filter(result => 
      result.intent.confidence >= minConfidence && !result.errors?.length
    ).length;
    
    return successful / history.length;
  }, [state.processingHistory, minConfidence]);

  // ===== RETURN HOOK API =====

  return {
    // Core functions
    processVoiceInput,
    
    // State
    ...state,
    
    // Context management
    updateContext,
    setNavigationState,
    setRouteActive,
    setCurrentLocation,
    
    // Utilities
    getIntentSuggestions,
    validateCommand,
    clearHistory,
    
    // Entity helpers
    findPostcodeInResults,
    findPOIInResults,
    getMeasurementsInResults,
    
    // Performance metrics
    getAverageProcessingTime,
    getSuccessRate,
    
    // Configuration
    languagePattern,
    truckTerminology,
    countryPreferences: preferences
  };
}

// ===== PRESET HOOKS FOR COMMON USE CASES =====

export function useNavigationVoiceIntents() {
  return useVoiceIntents({
    navigation: async (intent, entities) => {
      console.log('Navigation intent:', intent.action, entities);
      // Navigation-specific handling would go here
    },
    search: async (intent, entities) => {
      console.log('Search intent:', intent.action, entities);
      // Search-specific handling would go here
    }
  });
}

export function useControlsVoiceIntents() {
  return useVoiceIntents({
    controls: async (intent, entities) => {
      console.log('Controls intent:', intent.action, entities);
      // Controls-specific handling would go here
    },
    settings: async (intent, entities) => {
      console.log('Settings intent:', intent.action, entities);
      // Settings-specific handling would go here
    }
  });
}

export function useTrafficVoiceIntents() {
  return useVoiceIntents({
    traffic: async (intent, entities) => {
      console.log('Traffic intent:', intent.action, entities);
      // Traffic-specific handling would go here
    },
    routing: async (intent, entities) => {
      console.log('Routing intent:', intent.action, entities);
      // Routing-specific handling would go here
    }
  });
}

