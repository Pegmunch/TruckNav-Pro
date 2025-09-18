/**
 * Enhanced Entity Recognition for TruckNav Pro Voice Commands
 * Integrates with existing postcode-utils.ts and country preferences
 */

import { z } from "zod";
import type { 
  PostcodeCountry, 
  PostcodeValidationResult 
} from "../../client/src/lib/postcode-utils";
import type { Country } from "../../client/src/data/countries";
import type { 
  VoiceEntity, 
  PostcodeEntity, 
  POIEntity, 
  LocationEntity,
  EntityType 
} from "./intents";

// ===== ENHANCED POSTCODE ENTITY RECOGNITION =====

// Postcode patterns that integrate with existing postcode-utils.ts
export function extractPostcodeEntitiesAdvanced(
  text: string, 
  country?: PostcodeCountry,
  countryPreferences?: Country
): PostcodeEntity[] {
  const entities: PostcodeEntity[] = [];
  
  // Use the actual postcode patterns from the existing utility
  const postcodePatterns = {
    UK: /\b([A-Z]{1,2}[0-9][A-Z0-9]?)\s*([0-9][A-Z]{2})\b/gi,
    US: /\b[0-9]{5}(-[0-9]{4})?\b/g,
    CA: /\b[A-Z][0-9][A-Z]\s*[0-9][A-Z][0-9]\b/gi,
    AU: /\b[0-9]{4}\b/g,
    DE: /\b[0-9]{5}\b/g,
    FR: /\b[0-9]{5}\b/g
  };
  
  // If country preference is provided, prioritize that country's pattern
  const targetCountries = country 
    ? [country] 
    : countryPreferences 
      ? [mapCountryCodeToPostcodeCountry(countryPreferences.code), ...Object.keys(postcodePatterns)] as PostcodeCountry[]
      : Object.keys(postcodePatterns) as PostcodeCountry[];
  
  for (const countryCode of targetCountries) {
    const pattern = postcodePatterns[countryCode as keyof typeof postcodePatterns];
    if (!pattern) continue;
    
    let match;
    const patternCopy = new RegExp(pattern.source, pattern.flags);
    
    while ((match = patternCopy.exec(text)) !== null) {
      const value = match[0];
      const startIndex = match.index!;
      const endIndex = startIndex + value.length;
      
      // Calculate confidence based on country preference match
      let confidence = 0.8;
      if (countryPreferences && countryCode === mapCountryCodeToPostcodeCountry(countryPreferences.code)) {
        confidence = 0.95; // Higher confidence for user's country
      }
      
      // Use existing postcode validation logic (would import in real implementation)
      const isValid = validatePostcodeFormat(value, countryCode);
      const formatted = formatPostcodeForCountry(value, countryCode);
      
      entities.push({
        type: 'postcode',
        value,
        normalizedValue: value.replace(/\s+/g, '').toUpperCase(),
        confidence,
        startIndex,
        endIndex,
        country: countryCode,
        formatted,
        isValid,
        metadata: {
          detectedPattern: pattern.source,
          countryPreference: countryPreferences?.code
        }
      });
      
      // Prevent duplicate matches by adjusting regex lastIndex
      if (!pattern.global) break;
    }
  }
  
  return entities.sort((a, b) => b.confidence - a.confidence);
}

function mapCountryCodeToPostcodeCountry(countryCode: string): PostcodeCountry {
  const mapping: Record<string, PostcodeCountry> = {
    'GB': 'UK',
    'US': 'US', 
    'CA': 'CA',
    'AU': 'AU',
    'DE': 'DE',
    'FR': 'FR'
  };
  return mapping[countryCode] || 'UK';
}

function validatePostcodeFormat(postcode: string, country: PostcodeCountry): boolean {
  // Simplified validation - would use actual postcode-utils.ts functions
  const patterns = {
    UK: /^([A-Z]{1,2}[0-9][A-Z0-9]?)\s*([0-9][A-Z]{2})$/i,
    US: /^[0-9]{5}(-[0-9]{4})?$/,
    CA: /^[A-Z][0-9][A-Z]\s*[0-9][A-Z][0-9]$/i,
    AU: /^[0-9]{4}$/,
    DE: /^[0-9]{5}$/,
    FR: /^[0-9]{5}$/
  };
  
  const normalized = postcode.replace(/\s+/g, '').toUpperCase();
  return patterns[country].test(postcode) || patterns[country].test(normalized);
}

function formatPostcodeForCountry(postcode: string, country: PostcodeCountry): string {
  // Simplified formatting - would use actual postcode-utils.ts functions
  const normalized = postcode.replace(/\s+/g, '').toUpperCase();
  
  switch (country) {
    case 'UK':
    case 'CA':
      // Add space before last 3 characters
      if (normalized.length >= 6) {
        return normalized.slice(0, -3) + ' ' + normalized.slice(-3);
      }
      return normalized;
    case 'US':
      // Add hyphen for ZIP+4
      if (normalized.length === 9) {
        return normalized.slice(0, 5) + '-' + normalized.slice(5);
      }
      return normalized;
    default:
      return normalized;
  }
}

// ===== ENHANCED POI RECOGNITION =====

export interface TruckSpecificPOI {
  name: string;
  aliases: string[];
  category: 'fuel' | 'parking' | 'services' | 'food' | 'lodging';
  truckFriendly: boolean;
  restrictions?: string[];
}

export const TRUCK_SPECIFIC_POIS: Record<string, TruckSpecificPOI> = {
  // Fuel Stations
  'truck_fuel': {
    name: 'Truck Fuel Station',
    aliases: ['truck diesel', 'hgv fuel', 'commercial diesel', 'truck stop fuel', 'lorry diesel'],
    category: 'fuel',
    truckFriendly: true
  },
  'shell_truck': {
    name: 'Shell Truck Stop',
    aliases: ['shell commercial', 'shell hgv', 'shell truck fuel'],
    category: 'fuel',
    truckFriendly: true
  },
  'bp_truck': {
    name: 'BP Truck Stop', 
    aliases: ['bp commercial', 'bp hgv', 'bp truck fuel'],
    category: 'fuel',
    truckFriendly: true
  },
  
  // Parking
  'truck_parking': {
    name: 'Truck Parking',
    aliases: ['lorry park', 'hgv parking', 'commercial parking', 'overnight parking'],
    category: 'parking',
    truckFriendly: true
  },
  'secure_parking': {
    name: 'Secure Truck Parking',
    aliases: ['secure lorry park', 'guarded parking', 'safe parking'],
    category: 'parking',
    truckFriendly: true,
    restrictions: ['height_clearance', 'security_required']
  },
  
  // Services
  'truck_wash': {
    name: 'Truck Wash',
    aliases: ['lorry wash', 'hgv wash', 'commercial vehicle wash'],
    category: 'services',
    truckFriendly: true
  },
  'weigh_station': {
    name: 'Weigh Station',
    aliases: ['weight check', 'vehicle weighing', 'truck scales'],
    category: 'services',
    truckFriendly: true
  },
  
  // Food & Rest
  'truck_cafe': {
    name: 'Truck Cafe',
    aliases: ['transport cafe', 'drivers cafe', 'truckers diner', 'roadside cafe'],
    category: 'food',
    truckFriendly: true
  },
  'motorway_services': {
    name: 'Motorway Services',
    aliases: ['service station', 'highway services', 'services', 'msa'],
    category: 'services',
    truckFriendly: true
  }
};

export function extractPOIEntitiesAdvanced(
  text: string,
  countryPreferences?: Country
): POIEntity[] {
  const entities: POIEntity[] = [];
  const normalizedText = text.toLowerCase();
  
  // Extract truck-specific POIs
  for (const [poiId, poi] of Object.entries(TRUCK_SPECIFIC_POIS)) {
    // Check main name
    const nameIndex = normalizedText.indexOf(poi.name.toLowerCase());
    if (nameIndex !== -1) {
      entities.push(createPOIEntity(text, poi.name, nameIndex, poi, 0.9));
    }
    
    // Check aliases
    for (const alias of poi.aliases) {
      const aliasIndex = normalizedText.indexOf(alias.toLowerCase());
      if (aliasIndex !== -1) {
        entities.push(createPOIEntity(text, alias, aliasIndex, poi, 0.8));
      }
    }
  }
  
  // Extract generic POIs with fuzzy matching
  const genericPOIPatterns = [
    { pattern: /\b(?:truck\s*)?stop\b/gi, type: 'truck_stop', confidence: 0.85 },
    { pattern: /\b(?:fuel|petrol|gas)\s*station\b/gi, type: 'fuel', confidence: 0.8 },
    { pattern: /\bparking\b/gi, type: 'parking', confidence: 0.7 },
    { pattern: /\b(?:restaurant|cafe|diner)\b/gi, type: 'food', confidence: 0.7 },
    { pattern: /\b(?:hotel|motel|lodge)\b/gi, type: 'lodging', confidence: 0.7 },
    { pattern: /\brest\s*area\b/gi, type: 'rest_area', confidence: 0.8 }
  ];
  
  for (const { pattern, type, confidence } of genericPOIPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[0];
      const startIndex = match.index!;
      
      entities.push({
        type: 'poi',
        value,
        normalizedValue: value.toLowerCase().trim(),
        confidence,
        startIndex,
        endIndex: startIndex + value.length,
        facilityType: type,
        category: mapPOITypeToCategory(type),
        metadata: {
          generic: true,
          countryContext: countryPreferences?.code
        }
      });
    }
  }
  
  return entities.sort((a, b) => b.confidence - a.confidence);
}

function createPOIEntity(
  text: string, 
  matchedText: string, 
  startIndex: number, 
  poi: TruckSpecificPOI, 
  confidence: number
): POIEntity {
  return {
    type: 'poi',
    value: text.substring(startIndex, startIndex + matchedText.length),
    normalizedValue: matchedText.toLowerCase(),
    confidence,
    startIndex,
    endIndex: startIndex + matchedText.length,
    facilityType: poi.category,
    category: mapPOITypeToCategory(poi.category),
    metadata: {
      truckFriendly: poi.truckFriendly,
      restrictions: poi.restrictions,
      specificPOI: true
    }
  };
}

function mapPOITypeToCategory(type: string): 'transportation' | 'food' | 'lodging' | 'services' {
  const mapping: Record<string, 'transportation' | 'food' | 'lodging' | 'services'> = {
    'truck_stop': 'transportation',
    'fuel': 'transportation', 
    'parking': 'transportation',
    'food': 'food',
    'restaurant': 'food',
    'cafe': 'food',
    'lodging': 'lodging',
    'hotel': 'lodging',
    'rest_area': 'services',
    'truck_wash': 'services',
    'weigh_station': 'services'
  };
  return mapping[type] || 'services';
}

// ===== MEASUREMENT AND VEHICLE ENTITY RECOGNITION =====

export interface MeasurementEntity extends Omit<VoiceEntity, 'value'> {
  type: 'measurement';
  value: string;
  unit: 'feet' | 'metres' | 'tons' | 'tonnes' | 'pounds' | 'kilograms';
  numericValue: number;
  measurementType: 'height' | 'width' | 'length' | 'weight';
}

export function extractMeasurementEntities(text: string): MeasurementEntity[] {
  const entities: MeasurementEntity[] = [];
  
  const measurementPatterns = [
    // Height patterns
    { regex: /(\d+(?:\.\d+)?)\s*(?:feet|ft|')/gi, unit: 'feet' as const, type: 'height' as const },
    { regex: /(\d+(?:\.\d+)?)\s*(?:metres?|meters?|m)\s*(?:high|height)?/gi, unit: 'metres' as const, type: 'height' as const },
    
    // Weight patterns  
    { regex: /(\d+(?:\.\d+)?)\s*(?:tons?|t)\b/gi, unit: 'tons' as const, type: 'weight' as const },
    { regex: /(\d+(?:\.\d+)?)\s*(?:tonnes?)\b/gi, unit: 'tonnes' as const, type: 'weight' as const },
    { regex: /(\d+(?:\.\d+)?)\s*(?:pounds?|lbs?|lb)\b/gi, unit: 'pounds' as const, type: 'weight' as const },
    { regex: /(\d+(?:\.\d+)?)\s*(?:kilograms?|kgs?|kg)\b/gi, unit: 'kilograms' as const, type: 'weight' as const },
    
    // Width patterns
    { regex: /(\d+(?:\.\d+)?)\s*(?:feet|ft|')\s*(?:wide|width)/gi, unit: 'feet' as const, type: 'width' as const },
    { regex: /(\d+(?:\.\d+)?)\s*(?:metres?|meters?|m)\s*(?:wide|width)/gi, unit: 'metres' as const, type: 'width' as const },
    
    // Length patterns
    { regex: /(\d+(?:\.\d+)?)\s*(?:feet|ft|')\s*(?:long|length)/gi, unit: 'feet' as const, type: 'length' as const },
    { regex: /(\d+(?:\.\d+)?)\s*(?:metres?|meters?|m)\s*(?:long|length)/gi, unit: 'metres' as const, type: 'length' as const }
  ];
  
  for (const { regex, unit, type } of measurementPatterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0];
      const value = parseFloat(match[1]);
      const startIndex = match.index!;
      
      entities.push({
        type: 'measurement',
        value: fullMatch,
        normalizedValue: `${value} ${unit}`,
        confidence: 0.9,
        startIndex,
        endIndex: startIndex + fullMatch.length,
        unit,
        numericValue: value,
        measurementType: type,
        metadata: {
          originalUnit: unit,
          numericValue: value
        }
      });
    }
  }
  
  return entities;
}

// ===== VEHICLE TYPE RECOGNITION =====

export interface VehicleEntity extends Omit<VoiceEntity, 'type'> {
  type: 'vehicle';
  vehicleType: 'car' | 'car_caravan' | 'class_1_lorry' | 'class_2_lorry' | '7_5_tonne' | 'truck';
  restrictions: string[];
}

export function extractVehicleEntities(text: string): VehicleEntity[] {
  const entities: VehicleEntity[] = [];
  const normalizedText = text.toLowerCase();
  
  const vehiclePatterns = [
    { 
      patterns: ['car', 'automobile', 'vehicle'], 
      type: 'car' as const, 
      restrictions: [] 
    },
    { 
      patterns: ['car with caravan', 'car and caravan', 'caravan'], 
      type: 'car_caravan' as const, 
      restrictions: ['length', 'width'] 
    },
    { 
      patterns: ['class 1 lorry', 'class one lorry', 'light lorry', 'small lorry'], 
      type: 'class_1_lorry' as const, 
      restrictions: ['height', 'weight'] 
    },
    { 
      patterns: ['class 2 lorry', 'small truck', 'delivery truck'], 
      type: 'class_2_lorry' as const, 
      restrictions: ['height', 'weight'] 
    },
    { 
      patterns: ['7.5 tonne', '7.5t', 'medium truck'], 
      type: '7_5_tonne' as const, 
      restrictions: ['height', 'weight', 'width'] 
    },
    { 
      patterns: ['truck', 'lorry', 'hgv', 'heavy goods vehicle', 'articulated'], 
      type: 'truck' as const, 
      restrictions: ['height', 'weight', 'width', 'length'] 
    }
  ];
  
  for (const { patterns, type, restrictions } of vehiclePatterns) {
    for (const pattern of patterns) {
      const index = normalizedText.indexOf(pattern);
      if (index !== -1) {
        entities.push({
          type: 'vehicle',
          value: text.substring(index, index + pattern.length),
          normalizedValue: pattern,
          confidence: 0.85,
          startIndex: index,
          endIndex: index + pattern.length,
          vehicleType: type,
          restrictions,
          metadata: {
            hasRestrictions: restrictions.length > 0,
            restrictionTypes: restrictions
          }
        });
      }
    }
  }
  
  return entities;
}

// ===== DIRECTION AND COMMAND ENTITY RECOGNITION =====

export interface DirectionEntity extends VoiceEntity {
  type: 'direction';
  direction: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
}

export interface CommandEntity extends VoiceEntity {
  type: 'command';
  commandType: 'navigation' | 'control' | 'setting' | 'query';
  action: string;
}

export function extractDirectionEntities(text: string): DirectionEntity[] {
  const entities: DirectionEntity[] = [];
  const normalizedText = text.toLowerCase();
  
  const directions = [
    { patterns: ['north', 'northbound', 'heading north'], direction: 'north' as const },
    { patterns: ['south', 'southbound', 'heading south'], direction: 'south' as const },
    { patterns: ['east', 'eastbound', 'heading east'], direction: 'east' as const },
    { patterns: ['west', 'westbound', 'heading west'], direction: 'west' as const },
    { patterns: ['northeast', 'north east', 'ne'], direction: 'northeast' as const },
    { patterns: ['northwest', 'north west', 'nw'], direction: 'northwest' as const },
    { patterns: ['southeast', 'south east', 'se'], direction: 'southeast' as const },
    { patterns: ['southwest', 'south west', 'sw'], direction: 'southwest' as const }
  ];
  
  for (const { patterns, direction } of directions) {
    for (const pattern of patterns) {
      const index = normalizedText.indexOf(pattern);
      if (index !== -1) {
        entities.push({
          type: 'direction',
          value: text.substring(index, index + pattern.length),
          normalizedValue: pattern,
          confidence: 0.9,
          startIndex: index,
          endIndex: index + pattern.length,
          direction,
          metadata: {
            compassDirection: direction
          }
        });
      }
    }
  }
  
  return entities;
}

// ===== UNIFIED ENTITY EXTRACTION =====

export function extractAllEntities(
  text: string,
  options: {
    country?: PostcodeCountry;
    countryPreferences?: Country;
    includeVehicle?: boolean;
    includeMeasurements?: boolean;
  } = {}
): VoiceEntity[] {
  const { country, countryPreferences, includeVehicle = true, includeMeasurements = true } = options;
  
  const allEntities: VoiceEntity[] = [];
  
  // Extract postcodes with enhanced integration
  allEntities.push(...extractPostcodeEntitiesAdvanced(text, country, countryPreferences));
  
  // Extract POIs with truck-specific recognition
  allEntities.push(...extractPOIEntitiesAdvanced(text, countryPreferences));
  
  // Extract directions
  allEntities.push(...extractDirectionEntities(text));
  
  // Optionally extract vehicle types
  if (includeVehicle) {
    allEntities.push(...extractVehicleEntities(text));
  }
  
  // Optionally extract measurements
  if (includeMeasurements) {
    allEntities.push(...extractMeasurementEntities(text));
  }
  
  // Remove overlapping entities (keep highest confidence)
  return removeOverlappingEntities(allEntities);
}

function removeOverlappingEntities(entities: VoiceEntity[]): VoiceEntity[] {
  // Sort by confidence descending
  const sorted = entities.sort((a, b) => b.confidence - a.confidence);
  const result: VoiceEntity[] = [];
  
  for (const entity of sorted) {
    // Check if this entity overlaps with any already accepted entity
    const overlaps = result.some(existing => 
      (entity.startIndex < existing.endIndex && entity.endIndex > existing.startIndex)
    );
    
    if (!overlaps) {
      result.push(entity);
    }
  }
  
  return result.sort((a, b) => a.startIndex - b.startIndex);
}

// ===== ADDITIONAL ENTITY INTERFACES =====

export interface DirectionEntity extends VoiceEntity {
  type: 'direction';
  direction: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
}

export interface CommandEntity extends VoiceEntity {
  type: 'command';
  command: string;
  actionType: 'navigation' | 'control' | 'setting';
}

// ===== VALIDATION SCHEMAS =====

export const measurementEntitySchema = z.object({
  type: z.literal('measurement'),
  value: z.string(),
  normalizedValue: z.string(),
  confidence: z.number().min(0).max(1),
  startIndex: z.number().min(0),
  endIndex: z.number().min(0),
  unit: z.enum(['feet', 'metres', 'tons', 'tonnes', 'pounds', 'kilograms']),
  numericValue: z.number(),
  measurementType: z.enum(['height', 'width', 'length', 'weight']),
  metadata: z.record(z.any()).optional()
});

export const vehicleEntitySchema = z.object({
  type: z.literal('vehicle'),
  value: z.string(),
  normalizedValue: z.string(),
  confidence: z.number().min(0).max(1),
  startIndex: z.number().min(0),
  endIndex: z.number().min(0),
  vehicleType: z.enum(['car', 'car_caravan', 'class_2_lorry', '7_5_tonne', 'truck']),
  restrictions: z.array(z.string()),
  metadata: z.record(z.any()).optional()
});

export const directionEntitySchema = z.object({
  type: z.literal('direction'),
  value: z.string(), 
  normalizedValue: z.string(),
  confidence: z.number().min(0).max(1),
  startIndex: z.number().min(0),
  endIndex: z.number().min(0),
  direction: z.enum(['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest']),
  metadata: z.record(z.any()).optional()
});

