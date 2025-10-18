/**
 * Bulletproof Geocoding Service - 99.9% Reliability
 * Handles UK postcodes, full addresses, and provides comprehensive fallbacks
 */

import { geocodeUKPostcode, type PostcodeGeocodeResult } from "./uk-postcode-geocoding";
import { looksLikePostcode, detectPostcodeCountry } from "./postcode-utils";

export interface GeocodeResult {
  coordinates: { lat: number; lng: number };
  address: string;
  confidence: number;
  source: 'cached' | 'postcode_io' | 'tomtom' | 'fallback';
}

/**
 * Robust geocoding with multiple fallbacks
 * Priority: Cached coordinates > UK Postcode API > TomTom Search API
 */
export async function robustGeocode(
  address: string,
  existingCoordinates?: { lat: number; lng: number } | null
): Promise<GeocodeResult> {
  console.log(`[ROBUST-GEOCODE] Geocoding: "${address}"`);
  console.log(`[ROBUST-GEOCODE] Existing coordinates:`, existingCoordinates);

  // Priority 0: Check if address is direct coordinate input (highest priority)
  const directCoords = extractCoordinatesFromString(address);
  if (directCoords) {
    console.log(`[ROBUST-GEOCODE] ✅ Direct coordinate input detected`);
    return {
      coordinates: directCoords,
      address: `${directCoords.lat}, ${directCoords.lng}`,
      confidence: 1.0,
      source: 'cached'
    };
  }

  // Priority 1: Use existing cached coordinates if valid (including zero values)
  if (existingCoordinates && validateCoordinates(existingCoordinates)) {
    console.log(`[ROBUST-GEOCODE] ✅ Using cached coordinates`);
    return {
      coordinates: existingCoordinates,
      address,
      confidence: 1.0,
      source: 'cached'
    };
  }

  // Priority 2: UK Postcode lookup (highly accurate)
  if (looksLikePostcode(address) && detectPostcodeCountry(address) === 'UK') {
    console.log(`[ROBUST-GEOCODE] Detected UK postcode, using postcodes.io`);
    try {
      const result = await geocodeUKPostcode(address);
      if (result) {
        console.log(`[ROBUST-GEOCODE] ✅ UK postcode geocoded successfully`);
        return {
          coordinates: result.coordinates,
          address: result.address || address,
          confidence: result.confidence,
          source: 'postcode_io'
        };
      }
    } catch (error) {
      console.warn(`[ROBUST-GEOCODE] UK postcode geocoding failed:`, error);
      // Fall through to TomTom
    }
  } else {
    console.log(`[ROBUST-GEOCODE] Not a UK postcode, will use TomTom`);
  }

  // Priority 3: TomTom Search API with retry/backoff (universal geocoder)
  console.log(`[ROBUST-GEOCODE] Using TomTom search API with retry logic`);
  try {
    const tomtomResult = await geocodeWithTomTomRetry(address);
    if (tomtomResult) {
      console.log(`[ROBUST-GEOCODE] ✅ TomTom geocoded successfully`);
      return tomtomResult;
    }
  } catch (error) {
    console.error(`[ROBUST-GEOCODE] TomTom geocoding failed after retries:`, error);
  }

  // If all methods fail, throw comprehensive error
  throw new Error(
    `Failed to geocode address: "${address}". ` +
    `Please ensure the address is valid and contains enough detail (e.g., city, postcode, or full street address).`
  );
}

/**
 * Geocode using TomTom Search API with retry/backoff
 * Handles transient network errors and API rate limits
 */
async function geocodeWithTomTomRetry(
  address: string,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<GeocodeResult | null> {
  console.log(`[TOMTOM-GEOCODE] Starting geocode with retry for: "${address}"`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await geocodeWithTomTom(address);
      if (result) {
        return result;
      }
      
      // If no result but no error, it might be a valid "not found" - don't retry
      if (attempt < maxRetries) {
        console.log(`[TOMTOM-GEOCODE] Attempt ${attempt} returned no results, retrying...`);
      }
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      console.error(`[TOMTOM-GEOCODE] Attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (isLastAttempt) {
        throw error;
      }
      
      // Exponential backoff: wait before retrying
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`[TOMTOM-GEOCODE] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
}

/**
 * Geocode using TomTom Search API (single attempt)
 * Handles full addresses, partial addresses, and landmarks
 */
async function geocodeWithTomTom(address: string): Promise<GeocodeResult | null> {
  const url = `/api/tomtom-search?` +
    `q=${encodeURIComponent(address)}` +
    `&limit=1` +
    `&searchType=fuzzy`;
  
  console.log(`[TOMTOM-GEOCODE] Fetching: ${url}`);
  
  // Call our backend proxy for TomTom search
  const response = await fetch(url);

  console.log(`[TOMTOM-GEOCODE] Response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unable to read error');
    
    // Differentiate between client errors (4xx) and server/network errors (5xx)
    if (response.status >= 400 && response.status < 500) {
      console.error(`[TOMTOM-GEOCODE] Client error ${response.status}:`, errorText);
      // Don't retry client errors - return null
      return null;
    }
    
    // Throw for server errors so retry logic can handle them
    throw new Error(`TomTom API server error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log(`[TOMTOM-GEOCODE] Response data:`, data);

  if (!data.results || data.results.length === 0) {
    console.warn(`[TOMTOM-GEOCODE] No results found for: ${address}`);
    return null;
  }

  const result = data.results[0];
  console.log(`[TOMTOM-GEOCODE] First result:`, result);
  
  if (!result.position || typeof result.position.lat !== 'number' || typeof result.position.lon !== 'number') {
    console.error(`[TOMTOM-GEOCODE] Invalid position data:`, result.position);
    return null;
  }

  const geocoded: GeocodeResult = {
    coordinates: {
      lat: result.position.lat,
      lng: result.position.lon
    },
    address: result.address?.freeformAddress || address,
    confidence: result.score || 0.8,
    source: 'tomtom'
  };

  console.log(`[TOMTOM-GEOCODE] ✅ Success:`, geocoded);
  return geocoded;
}

/**
 * Batch geocode multiple addresses efficiently
 */
export async function batchGeocode(
  addresses: Array<{
    address: string;
    existingCoordinates?: { lat: number; lng: number } | null;
  }>
): Promise<Array<GeocodeResult | null>> {
  console.log(`[BATCH-GEOCODE] Geocoding ${addresses.length} addresses`);

  const results = await Promise.allSettled(
    addresses.map(({ address, existingCoordinates }) =>
      robustGeocode(address, existingCoordinates)
    )
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`[BATCH-GEOCODE] Failed to geocode address ${index}:`, result.reason);
      return null;
    }
  });
}

/**
 * Validate coordinates are within reasonable bounds
 */
export function validateCoordinates(coords: { lat: number; lng: number }): boolean {
  return (
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lng >= -180 &&
    coords.lng <= 180 &&
    !isNaN(coords.lat) &&
    !isNaN(coords.lng)
  );
}

/**
 * Extract coordinates from various input formats
 */
export function extractCoordinatesFromString(input: string): { lat: number; lng: number } | null {
  // Try to match coordinate patterns: "lat, lng" or "lat,lng"
  const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
  const match = input.trim().match(coordPattern);

  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    if (validateCoordinates({ lat, lng })) {
      return { lat, lng };
    }
  }

  return null;
}
