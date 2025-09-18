/**
 * TruckNav Pro Voice Command Intent Parsing System
 * Comprehensive voice command recognition with country-specific postcode recognition
 * and navigation commands for professional truck navigation
 */

import { z } from "zod";
import type { PostcodeCountry } from "../../client/src/lib/postcode-utils";

// ===== CORE TYPES AND ENUMS =====

export type IntentCategory = 
  | 'navigation' 
  | 'routing' 
  | 'search' 
  | 'controls' 
  | 'settings' 
  | 'favorites' 
  | 'traffic'
  | 'entertainment'
  | 'help'
  | 'unknown';

export type EntityType = 
  | 'postcode'
  | 'poi'
  | 'location'
  | 'direction'
  | 'restriction'
  | 'facility'
  | 'theme'
  | 'country'
  | 'measurement'
  | 'number'
  | 'command'
  | 'vehicle';

export type NavigationAction = 
  | 'navigate_to'
  | 'start_navigation'
  | 'stop_navigation'
  | 'pause_navigation'
  | 'resume_navigation'
  | 'cancel_navigation';

export type RoutingAction = 
  | 'avoid_tolls'
  | 'avoid_height_restrictions'
  | 'avoid_width_restrictions'
  | 'avoid_weight_restrictions'
  | 'find_alternate_route'
  | 'reroute'
  | 'fastest_route'
  | 'shortest_route';

export type SearchAction = 
  | 'find_nearest'
  | 'search_location'
  | 'find_facilities'
  | 'search_postcode';

export type ControlAction = 
  | 'zoom_in'
  | 'zoom_out'
  | 'mute'
  | 'unmute'
  | 'volume_up'
  | 'volume_down'
  | 'center_map'
  | 'toggle_fullscreen';

export type SettingsAction = 
  | 'change_theme'
  | 'change_country'
  | 'change_language'
  | 'change_measurement_units'
  | 'toggle_voice_guidance'
  | 'adjust_volume';

export type FavoritesAction = 
  | 'save_favorite'
  | 'go_to_favorites'
  | 'save_current_location'
  | 'delete_favorite'
  | 'show_favorites';

export type TrafficAction = 
  | 'show_traffic'
  | 'hide_traffic'
  | 'avoid_traffic'
  | 'traffic_update'
  | 'report_incident'
  | 'check_traffic_ahead';

// ===== ENTITY DEFINITIONS =====

export interface VoiceEntity {
  type: EntityType;
  value: string;
  normalizedValue: string;
  confidence: number; // 0-1
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export interface PostcodeEntity extends VoiceEntity {
  type: 'postcode';
  country: PostcodeCountry;
  formatted: string;
  isValid: boolean;
}

export interface POIEntity extends VoiceEntity {
  type: 'poi';
  facilityType: string; // 'truck_stop', 'fuel', 'parking', etc.
  category: 'transportation' | 'food' | 'lodging' | 'services';
}

export interface LocationEntity extends VoiceEntity {
  type: 'location';
  locationType: 'address' | 'city' | 'landmark' | 'business';
  coordinates?: { lat: number; lng: number };
}

// ===== INTENT DEFINITIONS =====

export interface VoiceIntent {
  category: IntentCategory;
  action: string;
  confidence: number; // 0-1
  entities: VoiceEntity[];
  originalText: string;
  normalizedText: string;
  language?: string;
  country?: string;
  context?: Record<string, any>;
}

export interface IntentPattern {
  category: IntentCategory;
  action: string;
  patterns: string[];
  entitySlots: string[];
  requiredEntities?: EntityType[];
  optionalEntities?: EntityType[];
  languages: string[];
  countries?: string[];
  priority: number; // 1-10, higher = more specific/prioritized
  examples: string[];
}

// ===== PATTERN DEFINITIONS =====

export const NAVIGATION_PATTERNS: IntentPattern[] = [
  {
    category: 'navigation',
    action: 'navigate_to',
    patterns: [
      'navigate to {location}',
      'go to {location}',
      'drive to {location}',
      'take me to {location}',
      'directions to {location}',
      'route to {location}',
      'find route to {postcode}',
      'navigate to postcode {postcode}',
      'go to {postcode}',
      'drive to {poi}',
      'take me to the nearest {poi}',
      'navigate to {poi}',
    ],
    entitySlots: ['location', 'postcode', 'poi'],
    requiredEntities: ['location'],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 9,
    examples: [
      'navigate to SW1A 1AA',
      'go to the nearest truck stop',
      'drive to Manchester',
      'take me to Shell fuel station'
    ]
  },
  {
    category: 'navigation',
    action: 'start_navigation',
    patterns: [
      'start navigation',
      'begin navigation',
      'start driving',
      'let\'s go',
      'start route',
      'begin route',
      'start journey'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['start navigation', 'let\'s go', 'begin route']
  },
  {
    category: 'navigation',
    action: 'stop_navigation',
    patterns: [
      'stop navigation',
      'end navigation',
      'cancel navigation',
      'stop route',
      'end route',
      'finish navigation'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['stop navigation', 'cancel route', 'end navigation']
  },
  {
    category: 'navigation',
    action: 'pause_navigation',
    patterns: [
      'pause navigation',
      'pause route',
      'take a break',
      'stop for a moment'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 7,
    examples: ['pause navigation', 'take a break']
  },
  {
    category: 'navigation',
    action: 'resume_navigation',
    patterns: [
      'resume navigation',
      'continue navigation',
      'resume route',
      'continue route',
      'let\'s continue'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 7,
    examples: ['resume navigation', 'continue route']
  }
];

export const ROUTING_PATTERNS: IntentPattern[] = [
  {
    category: 'routing',
    action: 'avoid_tolls',
    patterns: [
      'avoid tolls',
      'no tolls',
      'skip tolls',
      'route without tolls',
      'avoid toll roads'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['avoid tolls', 'route without tolls']
  },
  {
    category: 'routing',
    action: 'avoid_height_restrictions',
    patterns: [
      'avoid height restrictions',
      'skip low bridges',
      'avoid low clearance',
      'no height limits',
      'route for tall vehicles'
    ],
    entitySlots: ['number'],
    optionalEntities: ['number'],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['avoid height restrictions', 'skip low bridges']
  },
  {
    category: 'routing',
    action: 'avoid_width_restrictions',
    patterns: [
      'avoid width restrictions',
      'skip narrow roads',
      'avoid narrow bridges',
      'route for wide vehicles'
    ],
    entitySlots: ['number'],
    optionalEntities: ['number'],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['avoid width restrictions', 'route for wide vehicles']
  },
  {
    category: 'routing',
    action: 'avoid_weight_restrictions',
    patterns: [
      'avoid weight restrictions',
      'skip weight limits',
      'route for heavy vehicles',
      'avoid weight bridges'
    ],
    entitySlots: ['number'],
    optionalEntities: ['number'],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['avoid weight restrictions', 'route for heavy vehicles']
  },
  {
    category: 'routing',
    action: 'find_alternate_route',
    patterns: [
      'find alternate route',
      'find alternative route',
      'find another route',
      'show me alternatives',
      'give me options',
      'different route'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 7,
    examples: ['find alternate route', 'show me alternatives']
  },
  {
    category: 'routing',
    action: 'reroute',
    patterns: [
      'reroute',
      'recalculate route',
      'find new route',
      'calculate again',
      'update route'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 7,
    examples: ['reroute', 'recalculate route']
  }
];

export const SEARCH_PATTERNS: IntentPattern[] = [
  {
    category: 'search',
    action: 'find_nearest',
    patterns: [
      'find nearest {poi}',
      'where is the nearest {poi}',
      'find closest {poi}',
      'locate nearest {poi}',
      'show me nearby {poi}',
      'find {poi} near me',
      'search for {poi}',
      'I need a {poi}'
    ],
    entitySlots: ['poi'],
    requiredEntities: ['poi'],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 9,
    examples: [
      'find nearest truck stop',
      'where is the nearest fuel station',
      'locate nearest parking',
      'find rest area near me'
    ]
  },
  {
    category: 'search',
    action: 'search_location',
    patterns: [
      'search for {location}',
      'find {location}',
      'locate {location}',
      'where is {location}',
      'search {location}',
      'look for {location}'
    ],
    entitySlots: ['location'],
    requiredEntities: ['location'],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: [
      'search for London',
      'find Birmingham',
      'where is Manchester',
      'locate Glasgow'
    ]
  },
  {
    category: 'search',
    action: 'search_postcode',
    patterns: [
      'search postcode {postcode}',
      'find postcode {postcode}',
      'locate {postcode}',
      'search for {postcode}',
      'find {postcode}'
    ],
    entitySlots: ['postcode'],
    requiredEntities: ['postcode'],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 9,
    examples: [
      'search postcode SW1A 1AA',
      'find M1 1AA',
      'locate 90210'
    ]
  }
];

export const CONTROL_PATTERNS: IntentPattern[] = [
  {
    category: 'controls',
    action: 'zoom_in',
    patterns: [
      'zoom in',
      'zoom closer',
      'make bigger',
      'increase zoom',
      'zoom in more'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['zoom in', 'zoom closer']
  },
  {
    category: 'controls',
    action: 'zoom_out',
    patterns: [
      'zoom out',
      'zoom back',
      'make smaller',
      'decrease zoom',
      'zoom out more'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['zoom out', 'zoom back']
  },
  {
    category: 'controls',
    action: 'mute',
    patterns: [
      'mute',
      'turn off sound',
      'silence',
      'quiet',
      'no sound'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['mute', 'turn off sound']
  },
  {
    category: 'controls',
    action: 'unmute',
    patterns: [
      'unmute',
      'turn on sound',
      'restore sound',
      'sound on',
      'enable sound'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['unmute', 'turn on sound']
  },
  {
    category: 'controls',
    action: 'volume_up',
    patterns: [
      'volume up',
      'louder',
      'increase volume',
      'turn up',
      'make louder'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['volume up', 'louder']
  },
  {
    category: 'controls',
    action: 'volume_down',
    patterns: [
      'volume down',
      'quieter',
      'decrease volume',
      'turn down',
      'make quieter'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['volume down', 'quieter']
  }
];

export const SETTINGS_PATTERNS: IntentPattern[] = [
  {
    category: 'settings',
    action: 'change_theme',
    patterns: [
      'change theme to {theme}',
      'set theme to {theme}',
      'switch to {theme} theme',
      'use {theme} mode',
      'enable {theme} theme'
    ],
    entitySlots: ['theme'],
    requiredEntities: ['theme'],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: [
      'change theme to dark',
      'set theme to light',
      'switch to auto theme'
    ]
  },
  {
    category: 'settings',
    action: 'change_country',
    patterns: [
      'change country to {country}',
      'set country to {country}',
      'switch to {country}',
      'use {country} settings'
    ],
    entitySlots: ['country'],
    requiredEntities: ['country'],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: [
      'change country to United States',
      'set country to Canada',
      'switch to Germany'
    ]
  }
];

export const FAVORITES_PATTERNS: IntentPattern[] = [
  {
    category: 'favorites',
    action: 'save_favorite',
    patterns: [
      'save favorite',
      'add to favorites',
      'bookmark this',
      'save this place',
      'add bookmark'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['save favorite', 'add to favorites']
  },
  {
    category: 'favorites',
    action: 'go_to_favorites',
    patterns: [
      'go to favorites',
      'show favorites',
      'open favorites',
      'favorites menu',
      'my favorites'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['go to favorites', 'show favorites']
  },
  {
    category: 'favorites',
    action: 'save_current_location',
    patterns: [
      'save this location',
      'save current location',
      'bookmark current location',
      'save where I am'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['save this location', 'save current location']
  }
];

export const TRAFFIC_PATTERNS: IntentPattern[] = [
  {
    category: 'traffic',
    action: 'show_traffic',
    patterns: [
      'show traffic',
      'display traffic',
      'traffic on',
      'enable traffic',
      'show traffic conditions'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['show traffic', 'display traffic']
  },
  {
    category: 'traffic',
    action: 'hide_traffic',
    patterns: [
      'hide traffic',
      'turn off traffic',
      'traffic off',
      'disable traffic'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['hide traffic', 'turn off traffic']
  },
  {
    category: 'traffic',
    action: 'avoid_traffic',
    patterns: [
      'avoid traffic',
      'skip traffic',
      'route around traffic',
      'avoid congestion'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['avoid traffic', 'route around traffic']
  },
  {
    category: 'traffic',
    action: 'traffic_update',
    patterns: [
      'traffic update',
      'traffic report',
      'check traffic',
      'what\'s the traffic like',
      'traffic conditions'
    ],
    entitySlots: [],
    languages: ['en-US', 'en-GB', 'en-CA'],
    priority: 8,
    examples: ['traffic update', 'check traffic']
  }
];

// Combine all patterns
export const ALL_INTENT_PATTERNS: IntentPattern[] = [
  ...NAVIGATION_PATTERNS,
  ...ROUTING_PATTERNS,
  ...SEARCH_PATTERNS,
  ...CONTROL_PATTERNS,
  ...SETTINGS_PATTERNS,
  ...FAVORITES_PATTERNS,
  ...TRAFFIC_PATTERNS
];

// ===== ENTITY RECOGNITION PATTERNS =====

export const POI_PATTERNS = {
  'truck_stop': [
    'truck stop', 'truckers stop', 'lorry park', 'hgv stop', 'service area',
    'motorway services', 'truck services', 'freight stop'
  ],
  'fuel': [
    'fuel station', 'petrol station', 'gas station', 'diesel', 'fuel',
    'shell', 'bp', 'esso', 'texaco', 'total', 'fuel stop'
  ],
  'parking': [
    'parking', 'truck parking', 'lorry parking', 'hgv parking',
    'overnight parking', 'secure parking', 'truck park'
  ],
  'restaurant': [
    'restaurant', 'food', 'cafe', 'diner', 'truck cafe', 'roadside cafe',
    'motorway cafe', 'services restaurant'
  ],
  'hotel': [
    'hotel', 'motel', 'lodging', 'accommodation', 'overnight stay',
    'truck inn', 'travel lodge'
  ],
  'rest_area': [
    'rest area', 'rest stop', 'lay by', 'picnic area', 'break area'
  ]
};

export const THEME_PATTERNS = {
  'light': ['light', 'bright', 'day', 'white'],
  'dark': ['dark', 'night', 'black', 'dim'],
  'auto': ['auto', 'automatic', 'system']
};

// ===== FUZZY MATCHING UTILITIES =====

export function calculateLevenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
}

export function calculateJaroWinklerSimilarity(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchWindow < 0) return s1 === s2 ? 1 : 0;
  
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  // Jaro-Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
}

export function fuzzyMatch(input: string, target: string, threshold: number = 0.7): number {
  const inputNorm = input.toLowerCase().trim();
  const targetNorm = target.toLowerCase().trim();
  
  // Exact match
  if (inputNorm === targetNorm) return 1.0;
  
  // Contains match
  if (targetNorm.includes(inputNorm) || inputNorm.includes(targetNorm)) {
    return Math.max(inputNorm.length, targetNorm.length) / Math.min(inputNorm.length, targetNorm.length) * 0.8;
  }
  
  // Jaro-Winkler similarity
  const similarity = calculateJaroWinklerSimilarity(inputNorm, targetNorm);
  return similarity >= threshold ? similarity : 0;
}

// ===== ENTITY RECOGNITION FUNCTIONS =====

export function extractPostcodeEntities(text: string, country?: PostcodeCountry): PostcodeEntity[] {
  const entities: PostcodeEntity[] = [];
  
  // Import postcode utilities dynamically to avoid import issues
  const postcodePatterns = {
    UK: /([A-Z]{1,2}[0-9][A-Z0-9]?)\s*([0-9][A-Z]{2})/gi,
    US: /\b[0-9]{5}(-[0-9]{4})?\b/g,
    CA: /\b[A-Z][0-9][A-Z]\s*[0-9][A-Z][0-9]\b/gi,
    AU: /\b[0-9]{4}\b/g,
    DE: /\b[0-9]{5}\b/g,
    FR: /\b[0-9]{5}\b/g
  };
  
  const patterns = country && country in postcodePatterns ? { [country]: postcodePatterns[country as keyof typeof postcodePatterns] } : postcodePatterns;
  
  for (const [countryCode, pattern] of Object.entries(patterns)) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[0];
      const startIndex = match.index!;
      const endIndex = startIndex + value.length;
      
      entities.push({
        type: 'postcode',
        value,
        normalizedValue: value.replace(/\s+/g, '').toUpperCase(),
        confidence: 0.9,
        startIndex,
        endIndex,
        country: countryCode as PostcodeCountry,
        formatted: value,
        isValid: true // Would use actual validation in real implementation
      });
    }
  }
  
  return entities;
}

export function extractPOIEntities(text: string): POIEntity[] {
  const entities: POIEntity[] = [];
  const normalizedText = text.toLowerCase();
  
  for (const [facilityType, patterns] of Object.entries(POI_PATTERNS)) {
    for (const pattern of patterns) {
      const index = normalizedText.indexOf(pattern);
      if (index !== -1) {
        const confidence = fuzzyMatch(pattern, pattern, 0.8);
        if (confidence > 0.7) {
          entities.push({
            type: 'poi',
            value: text.substring(index, index + pattern.length),
            normalizedValue: pattern,
            confidence,
            startIndex: index,
            endIndex: index + pattern.length,
            facilityType,
            category: getFacilityCategory(facilityType)
          });
        }
      }
    }
  }
  
  return entities;
}

export function extractLocationEntities(text: string): LocationEntity[] {
  const entities: LocationEntity[] = [];
  
  // Simple location patterns - in real implementation would use gazetteer/mapping service
  const locationPatterns = [
    /\b[A-Z][a-z]+(?: [A-Z][a-z]+)*(?:\s+(?:City|Town|Village))?\b/g,
    /\b\d+\s+[A-Z][a-z]+(?:\s+(?:Street|Road|Lane|Avenue|Drive|Way))?\b/gi
  ];
  
  for (const pattern of locationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[0];
      const startIndex = match.index!;
      const endIndex = startIndex + value.length;
      
      entities.push({
        type: 'location',
        value,
        normalizedValue: value.toLowerCase().trim(),
        confidence: 0.7,
        startIndex,
        endIndex,
        locationType: detectLocationType(value)
      });
    }
  }
  
  return entities;
}

function getFacilityCategory(facilityType: string): 'transportation' | 'food' | 'lodging' | 'services' {
  const categoryMap: Record<string, 'transportation' | 'food' | 'lodging' | 'services'> = {
    'truck_stop': 'transportation',
    'fuel': 'transportation',
    'parking': 'transportation',
    'restaurant': 'food',
    'hotel': 'lodging',
    'rest_area': 'services'
  };
  return categoryMap[facilityType] || 'services';
}

function detectLocationType(location: string): 'address' | 'city' | 'landmark' | 'business' {
  if (/\d/.test(location)) return 'address';
  if (/(?:City|Town|Village)/.test(location)) return 'city';
  if (/(?:Centre|Center|Station|Airport|Hospital)/.test(location)) return 'landmark';
  return 'business';
}

// ===== INTENT MATCHING ENGINE =====

export function matchIntentPattern(text: string, pattern: IntentPattern): number {
  const normalizedText = text.toLowerCase().trim();
  let bestScore = 0;
  
  for (const patternStr of pattern.patterns) {
    // Replace entity slots with wildcards for matching
    const patternRegex = patternStr
      .replace(/\{[^}]+\}/g, '([\\w\\s]+)')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\([\\w\\s]+\\)/g, '(.+)');
    
    const regex = new RegExp(`^${patternRegex}$`, 'i');
    
    if (regex.test(normalizedText)) {
      return 1.0; // Exact pattern match
    }
    
    // Fuzzy matching for partial matches
    const score = fuzzyMatch(normalizedText, patternStr.replace(/\{[^}]+\}/g, ''), 0.6);
    bestScore = Math.max(bestScore, score);
  }
  
  return bestScore;
}

export function parseVoiceIntent(
  text: string, 
  options: {
    language?: string;
    country?: string;
    context?: Record<string, any>;
  } = {}
): VoiceIntent {
  const { language = 'en-US', country, context = {} } = options;
  
  const normalizedText = text.toLowerCase().trim();
  const entities: VoiceEntity[] = [];
  
  // Extract entities
  entities.push(...extractPostcodeEntities(text, country as PostcodeCountry));
  entities.push(...extractPOIEntities(text));
  entities.push(...extractLocationEntities(text));
  
  // Find best matching intent pattern
  let bestMatch: { pattern: IntentPattern; score: number } | null = null;
  
  for (const pattern of ALL_INTENT_PATTERNS) {
    // Filter by language if specified
    if (language && !pattern.languages.includes(language)) continue;
    
    // Filter by country if specified
    if (country && pattern.countries && !pattern.countries.includes(country)) continue;
    
    const score = matchIntentPattern(text, pattern);
    
    if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { pattern, score };
    }
  }
  
  if (!bestMatch) {
    return {
      category: 'unknown',
      action: 'unknown',
      confidence: 0,
      entities,
      originalText: text,
      normalizedText,
      language,
      country,
      context
    };
  }
  
  return {
    category: bestMatch.pattern.category,
    action: bestMatch.pattern.action,
    confidence: bestMatch.score,
    entities,
    originalText: text,
    normalizedText,
    language,
    country,
    context
  };
}

// ===== VALIDATION SCHEMAS =====

export const voiceEntitySchema = z.object({
  type: z.enum(['postcode', 'poi', 'location', 'direction', 'restriction', 'facility', 'theme', 'country', 'measurement', 'number', 'command']),
  value: z.string(),
  normalizedValue: z.string(),
  confidence: z.number().min(0).max(1),
  startIndex: z.number().min(0),
  endIndex: z.number().min(0),
  metadata: z.record(z.any()).optional()
});

export const voiceIntentSchema = z.object({
  category: z.enum(['navigation', 'routing', 'search', 'controls', 'settings', 'favorites', 'traffic', 'help', 'unknown']),
  action: z.string(),
  confidence: z.number().min(0).max(1),
  entities: z.array(voiceEntitySchema),
  originalText: z.string(),
  normalizedText: z.string(),
  language: z.string().optional(),
  country: z.string().optional(),
  context: z.record(z.any()).optional()
});

export const intentProcessingOptionsSchema = z.object({
  language: z.string().optional(),
  country: z.string().optional(),
  context: z.record(z.any()).optional(),
  minConfidence: z.number().min(0).max(1).default(0.6),
  maxResults: z.number().positive().default(1)
});

// ===== CONTEXT-AWARE INTENT RESOLUTION =====

export interface IntentContext {
  currentLocation?: { lat: number; lng: number };
  lastIntent?: VoiceIntent;
  navigationState?: 'idle' | 'navigating' | 'paused';
  routeActive?: boolean;
  hasVehicleProfile?: boolean;
  sidebarSection?: string;
  userPreferences?: Record<string, any>;
}

export function resolveIntentWithContext(
  intent: VoiceIntent,
  context: IntentContext
): VoiceIntent {
  // Enhance intent based on context
  const enhancedIntent = { ...intent };
  
  // Context-aware entity resolution
  if (intent.category === 'navigation' && intent.action === 'resume_navigation') {
    if (context.navigationState !== 'paused') {
      enhancedIntent.confidence *= 0.5; // Lower confidence if not paused
    }
  }
  
  // Location context enhancement
  if (intent.entities.some(e => e.type === 'poi') && context.currentLocation) {
    enhancedIntent.context = {
      ...enhancedIntent.context,
      nearCurrentLocation: true,
      currentLocation: context.currentLocation
    };
  }
  
  return enhancedIntent;
}

// ===== ERROR HANDLING =====

export class VoiceIntentError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalText?: string
  ) {
    super(message);
    this.name = 'VoiceIntentError';
  }
}

export function handleUnrecognizedCommand(text: string): VoiceIntent {
  return {
    category: 'unknown',
    action: 'unrecognized',
    confidence: 0,
    entities: [],
    originalText: text,
    normalizedText: text.toLowerCase().trim(),
    context: {
      error: 'Command not recognized',
      suggestions: generateCommandSuggestions(text)
    }
  };
}

function generateCommandSuggestions(text: string): string[] {
  const suggestions: string[] = [];
  const normalizedText = text.toLowerCase();
  
  // Simple suggestion logic based on keywords
  if (normalizedText.includes('go') || normalizedText.includes('navigate')) {
    suggestions.push('Try: "navigate to [location]" or "go to [postcode]"');
  }
  
  if (normalizedText.includes('find') || normalizedText.includes('search')) {
    suggestions.push('Try: "find nearest truck stop" or "search for fuel station"');
  }
  
  if (normalizedText.includes('traffic')) {
    suggestions.push('Try: "show traffic" or "avoid traffic"');
  }
  
  return suggestions.length > 0 ? suggestions : [
    'Try: "navigate to [location]"',
    'Try: "find nearest truck stop"',
    'Try: "show traffic"'
  ];
}

