/**
 * Multi-Language Voice Pattern Support for TruckNav Pro
 * Country-specific language patterns and cultural navigation phrases
 */

import type { Country } from "../../client/src/data/countries";
import type { IntentPattern } from "./intents";

// ===== LANGUAGE-SPECIFIC PATTERNS =====

export interface LanguagePattern {
  language: string;
  country: string;
  patterns: Record<string, string[]>;
  cultural: {
    greetings: string[];
    politeness: string[];
    directions: Record<string, string[]>;
    measurements: Record<string, string>;
  };
}

// ===== ENGLISH VARIANTS =====

export const ENGLISH_US_PATTERNS: LanguagePattern = {
  language: 'en-US',
  country: 'US',
  patterns: {
    navigate_to: [
      'navigate to {location}',
      'drive to {location}',
      'take me to {location}',
      'head to {location}',
      'go to {location}',
      'route to {location}',
      'directions to {location}'
    ],
    find_fuel: [
      'find gas station',
      'find fuel',
      'where\'s the nearest gas station',
      'I need gas',
      'find diesel',
      'locate fuel station'
    ],
    avoid_tolls: [
      'avoid tolls',
      'no toll roads',
      'skip tolls',
      'toll-free route',
      'avoid toll highways'
    ],
    traffic_check: [
      'check traffic',
      'traffic conditions',
      'how\'s traffic',
      'traffic update',
      'any traffic ahead'
    ]
  },
  cultural: {
    greetings: ['hey', 'hi there', 'hello'],
    politeness: ['please', 'thank you', 'thanks'],
    directions: {
      north: ['north', 'northbound', 'up north'],
      south: ['south', 'southbound', 'down south'],
      east: ['east', 'eastbound'],
      west: ['west', 'westbound']
    },
    measurements: {
      height: 'feet',
      weight: 'tons',
      distance: 'miles'
    }
  }
};

export const ENGLISH_UK_PATTERNS: LanguagePattern = {
  language: 'en-GB',
  country: 'GB',
  patterns: {
    navigate_to: [
      'navigate to {location}',
      'drive to {location}',
      'take me to {location}',
      'head to {location}',
      'go to {location}',
      'route to {location}',
      'directions to {location}'
    ],
    find_fuel: [
      'find petrol station',
      'find fuel',
      'where\'s the nearest petrol station',
      'I need petrol',
      'find diesel',
      'locate fuel station',
      'find a garage'
    ],
    avoid_tolls: [
      'avoid tolls',
      'no toll roads',
      'skip tolls',
      'toll-free route',
      'avoid toll motorways'
    ],
    find_parking: [
      'find lorry park',
      'find truck parking',
      'find HGV parking',
      'where can I park the lorry',
      'overnight parking'
    ],
    traffic_check: [
      'check traffic',
      'traffic conditions',
      'how\'s the traffic',
      'traffic update',
      'any holdups ahead'
    ]
  },
  cultural: {
    greetings: ['hello', 'good morning', 'good afternoon'],
    politeness: ['please', 'thank you', 'cheers', 'ta'],
    directions: {
      north: ['north', 'northbound', 'up north'],
      south: ['south', 'southbound', 'down south'],
      east: ['east', 'eastbound'],
      west: ['west', 'westbound']
    },
    measurements: {
      height: 'feet',
      weight: 'tonnes',
      distance: 'miles'
    }
  }
};

export const ENGLISH_CA_PATTERNS: LanguagePattern = {
  language: 'en-CA',
  country: 'CA',
  patterns: {
    navigate_to: [
      'navigate to {location}',
      'drive to {location}',
      'take me to {location}',
      'head to {location}',
      'go to {location}',
      'route to {location}',
      'directions to {location}'
    ],
    find_fuel: [
      'find gas station',
      'find fuel',
      'where\'s the nearest gas station',
      'I need gas',
      'find diesel',
      'locate fuel station'
    ],
    avoid_tolls: [
      'avoid tolls',
      'no toll roads',
      'skip tolls',
      'toll-free route',
      'avoid toll highways'
    ],
    traffic_check: [
      'check traffic',
      'traffic conditions',
      'how\'s traffic',
      'traffic update',
      'any traffic ahead'
    ]
  },
  cultural: {
    greetings: ['hey', 'hi there', 'hello'],
    politeness: ['please', 'thank you', 'thanks'],
    directions: {
      north: ['north', 'northbound'],
      south: ['south', 'southbound'],
      east: ['east', 'eastbound'],
      west: ['west', 'westbound']
    },
    measurements: {
      height: 'metres',
      weight: 'kilograms',
      distance: 'kilometres'
    }
  }
};

// ===== EUROPEAN LANGUAGES =====

export const GERMAN_PATTERNS: LanguagePattern = {
  language: 'de-DE',
  country: 'DE',
  patterns: {
    navigate_to: [
      'navigiere zu {location}',
      'fahre zu {location}',
      'bring mich zu {location}',
      'route zu {location}',
      'fahre nach {location}'
    ],
    find_fuel: [
      'tankstelle finden',
      'diesel finden',
      'wo ist die nächste tankstelle',
      'ich brauche diesel',
      'tankstelle suchen'
    ],
    avoid_tolls: [
      'maut vermeiden',
      'keine mautstraßen',
      'mautfrei fahren',
      'ohne maut'
    ],
    find_parking: [
      'lkw parkplatz finden',
      'parkplatz für lastwagen',
      'wo kann ich parken',
      'rastplatz finden'
    ],
    traffic_check: [
      'verkehr prüfen',
      'verkehrslage',
      'wie ist der verkehr',
      'stau meldung'
    ]
  },
  cultural: {
    greetings: ['hallo', 'guten tag', 'guten morgen'],
    politeness: ['bitte', 'danke', 'vielen dank'],
    directions: {
      north: ['nord', 'norden', 'richtung norden'],
      south: ['süd', 'süden', 'richtung süden'],
      east: ['ost', 'osten', 'richtung osten'],
      west: ['west', 'westen', 'richtung westen']
    },
    measurements: {
      height: 'meter',
      weight: 'tonnen',
      distance: 'kilometer'
    }
  }
};

export const FRENCH_PATTERNS: LanguagePattern = {
  language: 'fr-FR',
  country: 'FR',
  patterns: {
    navigate_to: [
      'navigue vers {location}',
      'va à {location}',
      'emmène-moi à {location}',
      'route vers {location}',
      'direction {location}'
    ],
    find_fuel: [
      'trouve station essence',
      'trouve diesel',
      'où est la station service',
      'j\'ai besoin de carburant',
      'cherche station service'
    ],
    avoid_tolls: [
      'éviter péages',
      'sans péage',
      'route gratuite',
      'éviter autoroutes payantes'
    ],
    find_parking: [
      'trouve parking poids lourd',
      'parking camion',
      'où me garer',
      'aire de stationnement'
    ],
    traffic_check: [
      'vérifier trafic',
      'conditions circulation',
      'comment est le trafic',
      'info trafic'
    ]
  },
  cultural: {
    greetings: ['bonjour', 'salut', 'bonsoir'],
    politeness: ['s\'il vous plaît', 'merci', 'merci beaucoup'],
    directions: {
      north: ['nord', 'direction nord'],
      south: ['sud', 'direction sud'],
      east: ['est', 'direction est'],
      west: ['ouest', 'direction ouest']
    },
    measurements: {
      height: 'mètres',
      weight: 'tonnes',
      distance: 'kilomètres'
    }
  }
};

export const SPANISH_PATTERNS: LanguagePattern = {
  language: 'es-ES',
  country: 'ES',
  patterns: {
    navigate_to: [
      'navegar a {location}',
      'ir a {location}',
      'llévame a {location}',
      'ruta a {location}',
      'direcciones a {location}'
    ],
    find_fuel: [
      'encontrar gasolinera',
      'encontrar diesel',
      'dónde está la gasolinera más cercana',
      'necesito combustible',
      'buscar estación de servicio'
    ],
    avoid_tolls: [
      'evitar peajes',
      'sin peajes',
      'ruta gratuita',
      'evitar autopistas de pago'
    ],
    find_parking: [
      'encontrar aparcamiento camión',
      'parking para camiones',
      'dónde aparcar',
      'área de descanso'
    ],
    traffic_check: [
      'comprobar tráfico',
      'condiciones del tráfico',
      'cómo está el tráfico',
      'información de tráfico'
    ]
  },
  cultural: {
    greetings: ['hola', 'buenos días', 'buenas tardes'],
    politeness: ['por favor', 'gracias', 'muchas gracias'],
    directions: {
      north: ['norte', 'dirección norte'],
      south: ['sur', 'dirección sur'],
      east: ['este', 'dirección este'],
      west: ['oeste', 'dirección oeste']
    },
    measurements: {
      height: 'metros',
      weight: 'toneladas',
      distance: 'kilómetros'
    }
  }
};

// ===== PATTERN MAPPING =====

export const LANGUAGE_PATTERNS: Record<string, LanguagePattern> = {
  'en-US': ENGLISH_US_PATTERNS,
  'en-GB': ENGLISH_UK_PATTERNS,
  'en-CA': ENGLISH_CA_PATTERNS,
  'de-DE': GERMAN_PATTERNS,
  'fr-FR': FRENCH_PATTERNS,
  'es-ES': SPANISH_PATTERNS
};

// ===== HELPER FUNCTIONS =====

export function getLanguagePatterns(country: Country): LanguagePattern | null {
  // Try to find exact match for default language
  if (LANGUAGE_PATTERNS[country.defaultLanguage]) {
    return LANGUAGE_PATTERNS[country.defaultLanguage];
  }
  
  // Try to find language family match
  const languageCode = country.defaultLanguage.split('-')[0];
  for (const [key, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (key.startsWith(languageCode)) {
      return pattern;
    }
  }
  
  // Default to English
  return LANGUAGE_PATTERNS['en-GB'];
}

export function getLocalizedPatterns(
  category: string,
  action: string,
  country: Country
): string[] {
  const languagePattern = getLanguagePatterns(country);
  if (!languagePattern) return [];
  
  const key = `${category}_${action}` as keyof typeof languagePattern.patterns;
  return languagePattern.patterns[key] || [];
}

export function getMeasurementUnit(
  measurementType: 'height' | 'weight' | 'distance',
  country: Country
): string {
  const languagePattern = getLanguagePatterns(country);
  return languagePattern?.cultural.measurements[measurementType] || 'metric';
}

export function getDirectionPhrase(
  direction: string,
  country: Country
): string[] {
  const languagePattern = getLanguagePatterns(country);
  if (!languagePattern) return [direction];
  
  return languagePattern.cultural.directions[direction] || [direction];
}

export function isPolitePhrase(text: string, country: Country): boolean {
  const languagePattern = getLanguagePatterns(country);
  if (!languagePattern) return false;
  
  const lowerText = text.toLowerCase();
  return languagePattern.cultural.politeness.some(phrase => 
    lowerText.includes(phrase.toLowerCase())
  );
}

// ===== CULTURAL CONTEXT =====

export interface CulturalContext {
  country: Country;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  formality: 'formal' | 'informal';
  urgency: 'low' | 'medium' | 'high';
}

export function getGreeting(context: CulturalContext): string {
  const languagePattern = getLanguagePatterns(context.country);
  if (!languagePattern) return 'Hello';
  
  const greetings = languagePattern.cultural.greetings;
  
  // Select appropriate greeting based on time and formality
  if (context.timeOfDay === 'morning' && context.formality === 'formal') {
    return greetings.find(g => g.includes('morning')) || greetings[0];
  }
  
  if (context.timeOfDay === 'afternoon' && context.formality === 'formal') {
    return greetings.find(g => g.includes('afternoon')) || greetings[0];
  }
  
  // Default to first greeting (usually informal)
  return greetings[0] || 'Hello';
}

export function formatResponse(
  response: string,
  context: CulturalContext
): string {
  const languagePattern = getLanguagePatterns(context.country);
  if (!languagePattern) return response;
  
  // Add politeness markers based on culture
  if (context.formality === 'formal') {
    const politeness = languagePattern.cultural.politeness[0]; // 'please'
    return `${politeness}, ${response}`;
  }
  
  return response;
}

// ===== TRUCK-SPECIFIC TERMINOLOGY =====

export const TRUCK_TERMINOLOGY: Record<string, Record<string, string[]>> = {
  'en-GB': {
    truck: ['lorry', 'HGV', 'heavy goods vehicle', 'articulated lorry'],
    trailer: ['trailer', 'semi-trailer', 'artic'],
    parking: ['lorry park', 'truck park', 'HGV parking'],
    fuel: ['diesel', 'red diesel', 'commercial diesel'],
    restrictions: ['height restriction', 'weight limit', 'bridge restriction']
  },
  'en-US': {
    truck: ['truck', 'semi', 'tractor-trailer', 'big rig', '18-wheeler'],
    trailer: ['trailer', 'semi-trailer', 'rig'],
    parking: ['truck stop', 'truck parking', 'commercial parking'],
    fuel: ['diesel', 'truck diesel', 'commercial diesel'],
    restrictions: ['height restriction', 'weight limit', 'bridge restriction']
  },
  'de-DE': {
    truck: ['LKW', 'Lastkraftwagen', 'Sattelzug', 'Brummi'],
    trailer: ['Anhänger', 'Sattelanhänger', 'Auflieger'],
    parking: ['LKW-Parkplatz', 'Rastplatz', 'Autohof'],
    fuel: ['Diesel', 'LKW-Diesel', 'Kraftstoff'],
    restrictions: ['Höhenbeschränkung', 'Gewichtsbeschränkung', 'Brückenbeschränkung']
  },
  'fr-FR': {
    truck: ['camion', 'poids lourd', 'semi-remorque', 'routier'],
    trailer: ['remorque', 'semi-remorque', 'citerne'],
    parking: ['parking poids lourd', 'aire de stationnement', 'relais routier'],
    fuel: ['diesel', 'gazole', 'carburant'],
    restrictions: ['limitation hauteur', 'limitation poids', 'restriction pont']
  }
};

export function getTruckTerminology(
  termType: string,
  country: Country
): string[] {
  const language = country.defaultLanguage;
  const terminology = TRUCK_TERMINOLOGY[language];
  
  if (!terminology) {
    // Fallback to English
    return TRUCK_TERMINOLOGY['en-GB'][termType] || [];
  }
  
  return terminology[termType] || [];
}

