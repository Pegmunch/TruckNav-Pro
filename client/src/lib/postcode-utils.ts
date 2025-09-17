import { z } from "zod";

// Supported countries for postcode search
export type PostcodeCountry = 'UK' | 'US' | 'CA' | 'AU' | 'DE' | 'FR';

// Country-specific postcode patterns and configurations
export const POSTCODE_PATTERNS = {
  UK: {
    // UK postcode patterns: SW1A 1AA, M1 1AA, B33 8TH, etc.
    regex: /^([A-Z]{1,2}[0-9][A-Z0-9]?)\s*([0-9][A-Z]{2})$/i,
    format: (code: string) => code.replace(/([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9][A-Z]{2})/i, '$1 $2'),
    normalize: (code: string) => code.replace(/\s+/g, '').toUpperCase(),
    example: 'SW1A 1AA',
    label: 'UK Postcode',
    maxLength: 8,
    description: 'Enter a UK postcode (e.g., SW1A 1AA, M1 1AA)',
  },
  US: {
    // US ZIP codes: 10001, 90210-1234, etc.
    regex: /^[0-9]{5}(-[0-9]{4})?$/,
    format: (code: string) => {
      const cleaned = code.replace(/\D/g, '');
      if (cleaned.length > 5) {
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}`;
      }
      return cleaned;
    },
    normalize: (code: string) => code.replace(/\D/g, ''),
    example: '10001',
    label: 'US ZIP Code',
    maxLength: 10,
    description: 'Enter a US ZIP code (e.g., 10001 or 90210-1234)',
  },
  CA: {
    // Canadian postal codes: K1A 0A6, H0H 0H0, etc.
    regex: /^[A-Z][0-9][A-Z]\s*[0-9][A-Z][0-9]$/i,
    format: (code: string) => code.replace(/([A-Z][0-9][A-Z])([0-9][A-Z][0-9])/i, '$1 $2'),
    normalize: (code: string) => code.replace(/\s+/g, '').toUpperCase(),
    example: 'K1A 0A6',
    label: 'Canadian Postal Code',
    maxLength: 7,
    description: 'Enter a Canadian postal code (e.g., K1A 0A6)',
  },
  AU: {
    // Australian postcodes: 2000, 3000, 4000, etc.
    regex: /^[0-9]{4}$/,
    format: (code: string) => code.replace(/\D/g, ''),
    normalize: (code: string) => code.replace(/\D/g, ''),
    example: '2000',
    label: 'Australian Postcode',
    maxLength: 4,
    description: 'Enter an Australian postcode (e.g., 2000)',
  },
  DE: {
    // German PLZ: 10115, 80331, etc.
    regex: /^[0-9]{5}$/,
    format: (code: string) => code.replace(/\D/g, ''),
    normalize: (code: string) => code.replace(/\D/g, ''),
    example: '10115',
    label: 'German PLZ',
    maxLength: 5,
    description: 'Enter a German postal code (e.g., 10115)',
  },
  FR: {
    // French postal codes: 75001, 69001, etc.
    regex: /^[0-9]{5}$/,
    format: (code: string) => code.replace(/\D/g, ''),
    normalize: (code: string) => code.replace(/\D/g, ''),
    example: '75001',
    label: 'French Postal Code',
    maxLength: 5,
    description: 'Enter a French postal code (e.g., 75001)',
  },
} as const;

// Auto-detect country from postcode format
export function detectPostcodeCountry(postcode: string): PostcodeCountry | null {
  const normalized = postcode.replace(/\s+/g, '').toUpperCase();
  
  // Test patterns in order of specificity
  const testOrder: PostcodeCountry[] = ['CA', 'UK', 'US', 'AU', 'DE', 'FR'];
  
  for (const country of testOrder) {
    const pattern = POSTCODE_PATTERNS[country];
    if (pattern.regex.test(normalized) || pattern.regex.test(postcode)) {
      return country;
    }
  }
  
  return null;
}

// Validate postcode for a specific country
export function validatePostcode(postcode: string, country: PostcodeCountry): boolean {
  if (!postcode || postcode.trim().length === 0) return false;
  
  const pattern = POSTCODE_PATTERNS[country];
  const normalized = pattern.normalize(postcode);
  
  return pattern.regex.test(postcode) || pattern.regex.test(normalized);
}

// Format postcode according to country conventions
export function formatPostcode(postcode: string, country: PostcodeCountry): string {
  if (!postcode || postcode.trim().length === 0) return '';
  
  const pattern = POSTCODE_PATTERNS[country];
  const normalized = pattern.normalize(postcode);
  
  return pattern.format(normalized);
}

// Normalize postcode (remove spaces, convert to uppercase, etc.)
export function normalizePostcode(postcode: string, country: PostcodeCountry): string {
  if (!postcode || postcode.trim().length === 0) return '';
  
  const pattern = POSTCODE_PATTERNS[country];
  return pattern.normalize(postcode);
}

// Get validation error message for invalid postcode
export function getPostcodeValidationError(postcode: string, country: PostcodeCountry): string | null {
  if (!postcode || postcode.trim().length === 0) {
    return `Please enter a ${POSTCODE_PATTERNS[country].label.toLowerCase()}`;
  }
  
  if (!validatePostcode(postcode, country)) {
    return `Invalid ${POSTCODE_PATTERNS[country].label.toLowerCase()} format. ${POSTCODE_PATTERNS[country].description}`;
  }
  
  return null;
}

// Auto-format postcode as user types
export function autoFormatPostcode(input: string, country?: PostcodeCountry): {
  formatted: string;
  detectedCountry: PostcodeCountry | null;
  isValid: boolean;
} {
  if (!input || input.trim().length === 0) {
    return {
      formatted: '',
      detectedCountry: null,
      isValid: false,
    };
  }
  
  // Use provided country or try to detect
  const targetCountry = country || detectPostcodeCountry(input);
  
  if (!targetCountry) {
    return {
      formatted: input,
      detectedCountry: null,
      isValid: false,
    };
  }
  
  const formatted = formatPostcode(input, targetCountry);
  const isValid = validatePostcode(input, targetCountry);
  
  return {
    formatted,
    detectedCountry: targetCountry,
    isValid,
  };
}

// Check if a string looks like a postcode (heuristic detection)
export function looksLikePostcode(input: string): boolean {
  if (!input || input.trim().length === 0) return false;
  
  // Remove spaces and check length
  const cleaned = input.replace(/\s+/g, '');
  
  // Basic heuristics for postcode-like strings
  const patterns = [
    /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/i, // UK format
    /^[0-9]{5}(-?[0-9]{4})?$/, // US ZIP format
    /^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$/i, // Canadian format
    /^[0-9]{4,5}$/, // Australian/German/French format
  ];
  
  return patterns.some(pattern => pattern.test(cleaned) || pattern.test(input));
}

// Zod schemas for postcode validation
export const postcodeSchemas = {
  UK: z.string().refine(
    (val) => validatePostcode(val, 'UK'),
    (val) => ({ message: getPostcodeValidationError(val, 'UK') || 'Invalid UK postcode' })
  ),
  US: z.string().refine(
    (val) => validatePostcode(val, 'US'),
    (val) => ({ message: getPostcodeValidationError(val, 'US') || 'Invalid US ZIP code' })
  ),
  CA: z.string().refine(
    (val) => validatePostcode(val, 'CA'),
    (val) => ({ message: getPostcodeValidationError(val, 'CA') || 'Invalid Canadian postal code' })
  ),
  AU: z.string().refine(
    (val) => validatePostcode(val, 'AU'),
    (val) => ({ message: getPostcodeValidationError(val, 'AU') || 'Invalid Australian postcode' })
  ),
  DE: z.string().refine(
    (val) => validatePostcode(val, 'DE'),
    (val) => ({ message: getPostcodeValidationError(val, 'DE') || 'Invalid German PLZ' })
  ),
  FR: z.string().refine(
    (val) => validatePostcode(val, 'FR'),
    (val) => ({ message: getPostcodeValidationError(val, 'FR') || 'Invalid French postal code' })
  ),
};

// Generic postcode schema that auto-detects country
export const postcodeSchema = z.string().refine(
  (val) => {
    const country = detectPostcodeCountry(val);
    return country ? validatePostcode(val, country) : false;
  },
  {
    message: 'Invalid postcode format. Supported formats: UK (SW1A 1AA), US (10001), CA (K1A 0A6), AU (2000), DE (10115), FR (75001)',
  }
);

// Type for postcode search result
export interface PostcodeSearchResult {
  postcode: string;
  formatted: string;
  country: PostcodeCountry;
  coordinates: {
    lat: number;
    lng: number;
  };
  address?: string;
  city?: string;
  region?: string;
  confidence?: number; // 0-1 confidence score
}

// Type for postcode validation result
export interface PostcodeValidationResult {
  isValid: boolean;
  country: PostcodeCountry | null;
  formatted: string;
  normalized: string;
  error?: string;
}

// Comprehensive validation function
export function validatePostcodeInput(input: string): PostcodeValidationResult {
  if (!input || input.trim().length === 0) {
    return {
      isValid: false,
      country: null,
      formatted: '',
      normalized: '',
      error: 'Please enter a postcode',
    };
  }
  
  const country = detectPostcodeCountry(input);
  
  if (!country) {
    return {
      isValid: false,
      country: null,
      formatted: input,
      normalized: input,
      error: 'Postcode format not recognized. Supported formats: UK (SW1A 1AA), US (10001), CA (K1A 0A6), AU (2000), DE (10115), FR (75001)',
    };
  }
  
  const isValid = validatePostcode(input, country);
  const formatted = formatPostcode(input, country);
  const normalized = normalizePostcode(input, country);
  const error = isValid ? undefined : getPostcodeValidationError(input, country) || 'Invalid postcode format';
  
  return {
    isValid,
    country,
    formatted,
    normalized,
    error,
  };
}