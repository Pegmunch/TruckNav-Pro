/**
 * Comprehensive Test Examples and Validation for TruckNav Pro Voice Intents
 * Real-world voice command examples with expected outcomes
 */

import { z } from "zod";
import type { VoiceIntent, VoiceEntity } from "./intents";
import type { Country } from "../../client/src/data/countries";

// ===== TEST EXAMPLE TYPES =====

export interface VoiceCommandExample {
  id: string;
  input: string;
  language: string;
  country: string;
  expectedIntent: {
    category: string;
    action: string;
    minConfidence: number;
  };
  expectedEntities: Array<{
    type: string;
    value?: string;
    confidence?: number;
  }>;
  description: string;
  tags: string[];
}

export interface ValidationResult {
  passed: boolean;
  actualIntent: VoiceIntent;
  expectedIntent: VoiceCommandExample['expectedIntent'];
  entityMatches: boolean;
  confidenceCheck: boolean;
  errors: string[];
}

// ===== NAVIGATION EXAMPLES =====

export const NAVIGATION_EXAMPLES: VoiceCommandExample[] = [
  {
    id: 'nav_001',
    input: 'navigate to SW1A 1AA',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'navigation',
      action: 'navigate_to',
      minConfidence: 0.9
    },
    expectedEntities: [
      { type: 'postcode', value: 'SW1A 1AA', confidence: 0.9 }
    ],
    description: 'Navigate to UK postcode',
    tags: ['navigation', 'postcode', 'uk']
  },
  {
    id: 'nav_002',
    input: 'take me to the nearest truck stop',
    language: 'en-US',
    country: 'US',
    expectedIntent: {
      category: 'navigation',
      action: 'navigate_to',
      minConfidence: 0.8
    },
    expectedEntities: [
      { type: 'poi', confidence: 0.8 }
    ],
    description: 'Navigate to nearest POI',
    tags: ['navigation', 'poi', 'truck_stop']
  },
  {
    id: 'nav_003',
    input: 'drive to 90210',
    language: 'en-US',
    country: 'US',
    expectedIntent: {
      category: 'navigation',
      action: 'navigate_to',
      minConfidence: 0.9
    },
    expectedEntities: [
      { type: 'postcode', value: '90210', confidence: 0.9 }
    ],
    description: 'Navigate to US ZIP code',
    tags: ['navigation', 'postcode', 'us', 'zip']
  },
  {
    id: 'nav_004',
    input: 'start navigation',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'navigation',
      action: 'start_navigation',
      minConfidence: 0.95
    },
    expectedEntities: [],
    description: 'Start navigation command',
    tags: ['navigation', 'control']
  },
  {
    id: 'nav_005',
    input: 'go to Manchester',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'navigation',
      action: 'navigate_to',
      minConfidence: 0.8
    },
    expectedEntities: [
      { type: 'location', confidence: 0.7 }
    ],
    description: 'Navigate to city name',
    tags: ['navigation', 'location', 'city']
  }
];

// ===== SEARCH EXAMPLES =====

export const SEARCH_EXAMPLES: VoiceCommandExample[] = [
  {
    id: 'search_001',
    input: 'find nearest fuel station',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'search',
      action: 'find_nearest',
      minConfidence: 0.9
    },
    expectedEntities: [
      { type: 'poi', confidence: 0.8 }
    ],
    description: 'Find nearest fuel station',
    tags: ['search', 'poi', 'fuel']
  },
  {
    id: 'search_002',
    input: 'where is the nearest truck parking',
    language: 'en-US',
    country: 'US',
    expectedIntent: {
      category: 'search',
      action: 'find_nearest',
      minConfidence: 0.8
    },
    expectedEntities: [
      { type: 'poi', confidence: 0.8 }
    ],
    description: 'Find truck parking',
    tags: ['search', 'poi', 'parking', 'truck']
  },
  {
    id: 'search_003',
    input: 'I need a rest area',
    language: 'en-US',
    country: 'US',
    expectedIntent: {
      category: 'search',
      action: 'find_nearest',
      minConfidence: 0.7
    },
    expectedEntities: [
      { type: 'poi', confidence: 0.7 }
    ],
    description: 'Find rest area with natural language',
    tags: ['search', 'poi', 'rest_area', 'natural']
  },
  {
    id: 'search_004',
    input: 'search for Shell fuel station',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'search',
      action: 'find_nearest',
      minConfidence: 0.8
    },
    expectedEntities: [
      { type: 'poi', confidence: 0.8 }
    ],
    description: 'Search for specific brand',
    tags: ['search', 'poi', 'fuel', 'brand', 'shell']
  }
];

// ===== ROUTING EXAMPLES =====

export const ROUTING_EXAMPLES: VoiceCommandExample[] = [
  {
    id: 'route_001',
    input: 'avoid tolls',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'routing',
      action: 'avoid_tolls',
      minConfidence: 0.95
    },
    expectedEntities: [],
    description: 'Avoid toll roads',
    tags: ['routing', 'tolls', 'avoid']
  },
  {
    id: 'route_002',
    input: 'avoid height restrictions',
    language: 'en-US',
    country: 'US',
    expectedIntent: {
      category: 'routing',
      action: 'avoid_height_restrictions',
      minConfidence: 0.9
    },
    expectedEntities: [],
    description: 'Avoid height restrictions',
    tags: ['routing', 'restrictions', 'height']
  },
  {
    id: 'route_003',
    input: 'find alternate route',
    language: 'en-CA',
    country: 'CA',
    expectedIntent: {
      category: 'routing',
      action: 'find_alternate_route',
      minConfidence: 0.9
    },
    expectedEntities: [],
    description: 'Find alternative route',
    tags: ['routing', 'alternate', 'alternative']
  },
  {
    id: 'route_004',
    input: 'reroute',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'routing',
      action: 'reroute',
      minConfidence: 0.95
    },
    expectedEntities: [],
    description: 'Simple reroute command',
    tags: ['routing', 'reroute']
  }
];

// ===== TRAFFIC EXAMPLES =====

export const TRAFFIC_EXAMPLES: VoiceCommandExample[] = [
  {
    id: 'traffic_001',
    input: 'show traffic',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'traffic',
      action: 'show_traffic',
      minConfidence: 0.95
    },
    expectedEntities: [],
    description: 'Show traffic overlay',
    tags: ['traffic', 'show', 'display']
  },
  {
    id: 'traffic_002',
    input: 'avoid traffic',
    language: 'en-US',
    country: 'US',
    expectedIntent: {
      category: 'traffic',
      action: 'avoid_traffic',
      minConfidence: 0.9
    },
    expectedEntities: [],
    description: 'Avoid traffic in routing',
    tags: ['traffic', 'avoid', 'routing']
  },
  {
    id: 'traffic_003',
    input: 'traffic update',
    language: 'en-CA',
    country: 'CA',
    expectedIntent: {
      category: 'traffic',
      action: 'traffic_update',
      minConfidence: 0.9
    },
    expectedEntities: [],
    description: 'Get traffic update',
    tags: ['traffic', 'update', 'report']
  },
  {
    id: 'traffic_004',
    input: 'what\'s the traffic like',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'traffic',
      action: 'traffic_update',
      minConfidence: 0.7
    },
    expectedEntities: [],
    description: 'Natural language traffic query',
    tags: ['traffic', 'query', 'natural']
  }
];

// ===== CONTROLS EXAMPLES =====

export const CONTROLS_EXAMPLES: VoiceCommandExample[] = [
  {
    id: 'control_001',
    input: 'zoom in',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'controls',
      action: 'zoom_in',
      minConfidence: 0.95
    },
    expectedEntities: [],
    description: 'Zoom in map',
    tags: ['controls', 'zoom', 'map']
  },
  {
    id: 'control_002',
    input: 'mute',
    language: 'en-US',
    country: 'US',
    expectedIntent: {
      category: 'controls',
      action: 'mute',
      minConfidence: 0.95
    },
    expectedEntities: [],
    description: 'Mute audio',
    tags: ['controls', 'audio', 'mute']
  },
  {
    id: 'control_003',
    input: 'volume up',
    language: 'en-CA',
    country: 'CA',
    expectedIntent: {
      category: 'controls',
      action: 'volume_up',
      minConfidence: 0.9
    },
    expectedEntities: [],
    description: 'Increase volume',
    tags: ['controls', 'audio', 'volume']
  }
];

// ===== SETTINGS EXAMPLES =====

export const SETTINGS_EXAMPLES: VoiceCommandExample[] = [
  {
    id: 'settings_001',
    input: 'change theme to dark',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'settings',
      action: 'change_theme',
      minConfidence: 0.9
    },
    expectedEntities: [
      { type: 'theme', confidence: 0.8 }
    ],
    description: 'Change to dark theme',
    tags: ['settings', 'theme', 'dark']
  },
  {
    id: 'settings_002',
    input: 'set country to United States',
    language: 'en-US',
    country: 'US',
    expectedIntent: {
      category: 'settings',
      action: 'change_country',
      minConfidence: 0.9
    },
    expectedEntities: [
      { type: 'country', confidence: 0.8 }
    ],
    description: 'Change country setting',
    tags: ['settings', 'country', 'us']
  }
];

// ===== MULTILINGUAL EXAMPLES =====

export const MULTILINGUAL_EXAMPLES: VoiceCommandExample[] = [
  {
    id: 'ml_001',
    input: 'navigiere zu 10115',
    language: 'de-DE',
    country: 'DE',
    expectedIntent: {
      category: 'navigation',
      action: 'navigate_to',
      minConfidence: 0.8
    },
    expectedEntities: [
      { type: 'postcode', value: '10115', confidence: 0.9 }
    ],
    description: 'German navigation to postcode',
    tags: ['navigation', 'german', 'postcode', 'multilingual']
  },
  {
    id: 'ml_002',
    input: 'trouve station essence',
    language: 'fr-FR',
    country: 'FR',
    expectedIntent: {
      category: 'search',
      action: 'find_nearest',
      minConfidence: 0.8
    },
    expectedEntities: [
      { type: 'poi', confidence: 0.8 }
    ],
    description: 'French fuel station search',
    tags: ['search', 'french', 'fuel', 'multilingual']
  },
  {
    id: 'ml_003',
    input: 'evitar peajes',
    language: 'es-ES',
    country: 'ES',
    expectedIntent: {
      category: 'routing',
      action: 'avoid_tolls',
      minConfidence: 0.8
    },
    expectedEntities: [],
    description: 'Spanish avoid tolls',
    tags: ['routing', 'spanish', 'tolls', 'multilingual']
  }
];

// ===== COMPLEX EXAMPLES =====

export const COMPLEX_EXAMPLES: VoiceCommandExample[] = [
  {
    id: 'complex_001',
    input: 'navigate to the nearest truck stop in M1 1AA area',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'navigation',
      action: 'navigate_to',
      minConfidence: 0.8
    },
    expectedEntities: [
      { type: 'poi', confidence: 0.8 },
      { type: 'postcode', value: 'M1 1AA', confidence: 0.9 }
    ],
    description: 'Complex navigation with POI and postcode',
    tags: ['navigation', 'complex', 'poi', 'postcode']
  },
  {
    id: 'complex_002',
    input: 'find fuel station avoiding tolls for my 7.5 tonne truck',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'search',
      action: 'find_nearest',
      minConfidence: 0.7
    },
    expectedEntities: [
      { type: 'poi', confidence: 0.8 },
      { type: 'vehicle', confidence: 0.8 }
    ],
    description: 'Complex search with routing and vehicle type',
    tags: ['search', 'complex', 'vehicle', 'routing', 'fuel']
  },
  {
    id: 'complex_003',
    input: 'I need to park my truck overnight near SW1A 1AA',
    language: 'en-GB',
    country: 'GB',
    expectedIntent: {
      category: 'search',
      action: 'find_nearest',
      minConfidence: 0.7
    },
    expectedEntities: [
      { type: 'poi', confidence: 0.7 },
      { type: 'postcode', value: 'SW1A 1AA', confidence: 0.9 },
      { type: 'vehicle', confidence: 0.7 }
    ],
    description: 'Natural language complex request',
    tags: ['search', 'complex', 'natural', 'parking', 'overnight']
  }
];

// ===== ALL EXAMPLES COLLECTION =====

export const ALL_EXAMPLES: VoiceCommandExample[] = [
  ...NAVIGATION_EXAMPLES,
  ...SEARCH_EXAMPLES,
  ...ROUTING_EXAMPLES,
  ...TRAFFIC_EXAMPLES,
  ...CONTROLS_EXAMPLES,
  ...SETTINGS_EXAMPLES,
  ...MULTILINGUAL_EXAMPLES,
  ...COMPLEX_EXAMPLES
];

// ===== VALIDATION FUNCTIONS =====

export function validateVoiceIntent(
  result: VoiceIntent,
  example: VoiceCommandExample
): ValidationResult {
  const errors: string[] = [];
  
  // Check intent category and action
  const intentMatch = result.category === example.expectedIntent.category &&
                     result.action === example.expectedIntent.action;
  
  if (!intentMatch) {
    errors.push(
      `Intent mismatch: expected ${example.expectedIntent.category}/${example.expectedIntent.action}, ` +
      `got ${result.category}/${result.action}`
    );
  }
  
  // Check confidence
  const confidenceCheck = result.confidence >= example.expectedIntent.minConfidence;
  
  if (!confidenceCheck) {
    errors.push(
      `Confidence too low: expected >= ${example.expectedIntent.minConfidence}, ` +
      `got ${result.confidence}`
    );
  }
  
  // Check entities
  let entityMatches = true;
  
  for (const expectedEntity of example.expectedEntities) {
    const matchingEntity = result.entities.find(e => 
      e.type === expectedEntity.type &&
      (!expectedEntity.value || e.value.includes(expectedEntity.value)) &&
      (!expectedEntity.confidence || e.confidence >= expectedEntity.confidence)
    );
    
    if (!matchingEntity) {
      entityMatches = false;
      errors.push(`Missing expected entity: ${expectedEntity.type}`);
    }
  }
  
  return {
    passed: intentMatch && confidenceCheck && entityMatches,
    actualIntent: result,
    expectedIntent: example.expectedIntent,
    entityMatches,
    confidenceCheck,
    errors
  };
}

export function runValidationSuite(
  examples: VoiceCommandExample[],
  processor: (text: string, language: string, country: string) => VoiceIntent
): {
  totalTests: number;
  passed: number;
  failed: number;
  results: Array<{ example: VoiceCommandExample; result: ValidationResult }>;
} {
  const results = examples.map(example => {
    const intent = processor(example.input, example.language, example.country);
    const result = validateVoiceIntent(intent, example);
    
    return { example, result };
  });
  
  const passed = results.filter(r => r.result.passed).length;
  const failed = results.length - passed;
  
  return {
    totalTests: results.length,
    passed,
    failed,
    results
  };
}

// ===== PERFORMANCE BENCHMARKS =====

export const PERFORMANCE_BENCHMARKS = {
  maxProcessingTime: 100, // milliseconds
  minConfidenceThreshold: 0.7,
  targetAccuracy: 0.9, // 90% of tests should pass
  maxMemoryUsage: 50, // MB
  supportedLanguages: ['en-US', 'en-GB', 'en-CA', 'de-DE', 'fr-FR', 'es-ES'],
  supportedCountries: ['US', 'GB', 'CA', 'DE', 'FR', 'ES']
};

// ===== VALIDATION SCHEMAS =====

export const voiceCommandExampleSchema = z.object({
  id: z.string(),
  input: z.string(),
  language: z.string(),
  country: z.string(),
  expectedIntent: z.object({
    category: z.string(),
    action: z.string(),
    minConfidence: z.number().min(0).max(1)
  }),
  expectedEntities: z.array(z.object({
    type: z.string(),
    value: z.string().optional(),
    confidence: z.number().min(0).max(1).optional()
  })),
  description: z.string(),
  tags: z.array(z.string())
});

export const validationResultSchema = z.object({
  passed: z.boolean(),
  actualIntent: z.any(), // VoiceIntent schema would be imported
  expectedIntent: z.object({
    category: z.string(),
    action: z.string(),
    minConfidence: z.number()
  }),
  entityMatches: z.boolean(),
  confidenceCheck: z.boolean(),
  errors: z.array(z.string())
});

