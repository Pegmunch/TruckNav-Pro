/**
 * Reverse Geocoding Utility - Enterprise Edition
 * Converts GPS coordinates to human-readable addresses using Photon API
 * Features: Retry logic, caching, comprehensive error handling, performance monitoring
 */

/**
 * Error types for reverse geocoding failures
 */
export type ReverseGeocodeErrorType = 
  | 'TIMEOUT' 
  | 'NETWORK' 
  | 'NO_RESULTS' 
  | 'INVALID_COORDS' 
  | 'RATE_LIMIT';

/**
 * Successful reverse geocoding result
 */
export interface ReverseGeocodeResult {
  success: true;
  address: string;
  city?: string;
  country?: string;
  countryCode?: string;
  source: 'api' | 'cache';
  fullData?: any;
}

/**
 * Failed reverse geocoding result with error details
 */
export interface ReverseGeocodeError {
  success: false;
  error: ReverseGeocodeErrorType;
  message: string;
  coordinates: { lat: number; lng: number };
}

/**
 * Union type for all reverse geocoding responses
 */
export type ReverseGeocodeResponse = ReverseGeocodeResult | ReverseGeocodeError;

/**
 * Cache entry with timestamp for TTL
 */
interface CacheEntry {
  result: ReverseGeocodeResult;
  timestamp: number;
  lat: number;
  lng: number;
}

/**
 * Performance metrics tracker
 */
interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  retries: number;
  slowResponses: number;
}

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_PROXIMITY_METERS = 50; // 50 meters
const SLOW_RESPONSE_THRESHOLD_MS = 3000; // 3 seconds

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

// Coordinate bounds
const VALID_LAT_MIN = -90;
const VALID_LAT_MAX = 90;
const VALID_LNG_MIN = -180;
const VALID_LNG_MAX = 180;

// Cache storage
const geocodeCache = new Map<string, CacheEntry>();

// Performance metrics
const metrics: PerformanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  apiCalls: 0,
  retries: 0,
  slowResponses: 0,
};

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 - First latitude
 * @param lng1 - First longitude
 * @param lat2 - Second latitude
 * @param lng2 - Second longitude
 * @returns Distance in meters
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validate coordinate bounds
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns True if coordinates are valid
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    lat >= VALID_LAT_MIN &&
    lat <= VALID_LAT_MAX &&
    lng >= VALID_LNG_MIN &&
    lng <= VALID_LNG_MAX
  );
}

/**
 * Check cache for nearby geocoding results
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Cached result if found within proximity and TTL, null otherwise
 */
function checkCache(lat: number, lng: number): ReverseGeocodeResult | null {
  const now = Date.now();

  // Clean expired entries during lookup
  for (const [key, entry] of geocodeCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      geocodeCache.delete(key);
    }
  }

  // Check for nearby cached results
  for (const entry of geocodeCache.values()) {
    if (now - entry.timestamp <= CACHE_TTL_MS) {
      const distance = haversineDistance(lat, lng, entry.lat, entry.lng);
      if (distance <= CACHE_PROXIMITY_METERS) {
        metrics.cacheHits++;
        const hitRate = (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(1);
        console.debug(
          `[Reverse Geocode] Cache HIT for (${lat}, ${lng}) - ` +
          `Found cached result from (${entry.lat}, ${entry.lng}) ${distance.toFixed(0)}m away. ` +
          `Hit rate: ${hitRate}%`
        );
        return { ...entry.result, source: 'cache' };
      }
    }
  }

  metrics.cacheMisses++;
  return null;
}

/**
 * Store result in cache
 * @param lat - Latitude
 * @param lng - Longitude
 * @param result - Geocoding result to cache
 */
function storeInCache(
  lat: number,
  lng: number,
  result: ReverseGeocodeResult
): void {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  geocodeCache.set(key, {
    result,
    timestamp: Date.now(),
    lat,
    lng,
  });
}

/**
 * Sleep for specified milliseconds (for retry delays)
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if an error is retryable
 * @param error - The error to check
 * @param statusCode - HTTP status code if available
 * @returns True if the error should be retried
 */
function isRetryableError(error: any, statusCode?: number): boolean {
  // Don't retry client errors (400-499) except 429 (rate limit)
  if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return false;
  }

  // Retry timeouts, network errors, server errors, and rate limits
  if (error?.name === 'AbortError') return true;
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) return true;
  if (statusCode && statusCode >= 500) return true;
  if (statusCode === 429) return true;

  return false;
}

/**
 * Classify error type based on error and status code
 * @param error - The error that occurred
 * @param statusCode - HTTP status code if available
 * @returns Classified error type
 */
function classifyError(error: any, statusCode?: number): ReverseGeocodeErrorType {
  if (error?.name === 'AbortError') return 'TIMEOUT';
  if (statusCode === 429) return 'RATE_LIMIT';
  if (statusCode && statusCode >= 500) return 'NETWORK';
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) return 'NETWORK';
  return 'NETWORK';
}

/**
 * Perform single reverse geocoding API call
 * @param lat - Latitude
 * @param lng - Longitude
 * @param timeout - Request timeout in ms
 * @returns Geocoding result or error
 */
async function performReverseGeocodeRequest(
  lat: number,
  lng: number,
  timeout: number
): Promise<ReverseGeocodeResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const startTime = Date.now();
    
    const response = await fetch(
      `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}&limit=1`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);
    
    const elapsed = Date.now() - startTime;
    
    // Track slow responses
    if (elapsed > SLOW_RESPONSE_THRESHOLD_MS) {
      metrics.slowResponses++;
      console.warn(
        `[Reverse Geocode] Slow API response: ${elapsed}ms for (${lat}, ${lng})`
      );
    }

    if (!response.ok) {
      // Check for rate limiting
      if (response.status === 429) {
        return {
          success: false,
          error: 'RATE_LIMIT',
          message: 'API rate limit exceeded. Please try again later.',
          coordinates: { lat, lng },
        };
      }

      return {
        success: false,
        error: classifyError(null, response.status),
        message: `API request failed with status ${response.status}`,
        coordinates: { lat, lng },
      };
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'NETWORK',
        message: 'Malformed API response: invalid data structure',
        coordinates: { lat, lng },
      };
    }

    if (!data.features || !Array.isArray(data.features)) {
      return {
        success: false,
        error: 'NETWORK',
        message: 'Malformed API response: missing features array',
        coordinates: { lat, lng },
      };
    }

    if (data.features.length === 0) {
      return {
        success: false,
        error: 'NO_RESULTS',
        message: 'No address found for these coordinates',
        coordinates: { lat, lng },
      };
    }

    const feature = data.features[0];
    const props = feature.properties || {};

    // Build address from available properties
    const parts: string[] = [];

    // Primary location identifier (name, street, or house number)
    if (props.name) {
      parts.push(props.name);
    } else if (props.street) {
      if (props.housenumber) {
        parts.push(`${props.housenumber} ${props.street}`);
      } else {
        parts.push(props.street);
      }
    }

    // City/locality
    const city = props.city || props.town || props.village || props.locality;
    if (city) {
      parts.push(city);
    }

    // If we still don't have enough info, try state or country
    if (parts.length < 2) {
      if (props.state) {
        parts.push(props.state);
      } else if (props.country) {
        parts.push(props.country);
      }
    }

    // Fallback to coordinates if no address parts found
    if (parts.length === 0) {
      return {
        success: true,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        source: 'api',
        fullData: feature,
      };
    }

    return {
      success: true,
      address: parts.join(', '),
      city,
      country: props.country,
      countryCode: props.countrycode,
      source: 'api',
      fullData: feature,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    const errorType = classifyError(error);
    let message = 'Unknown error occurred';

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        message = `Request timeout after ${timeout}ms`;
      } else {
        message = error.message;
      }
    }

    return {
      success: false,
      error: errorType,
      message,
      coordinates: { lat, lng },
    };
  }
}

/**
 * Reverse geocode GPS coordinates to address with retry logic and caching
 * @param lat - Latitude
 * @param lng - Longitude
 * @param timeout - Request timeout in ms (default: 5000)
 * @returns Geocoding result with address or error details
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  timeout: number = 5000
): Promise<ReverseGeocodeResponse> {
  // Validate coordinates first
  if (!isValidCoordinate(lat, lng)) {
    return {
      success: false,
      error: 'INVALID_COORDS',
      message: `Invalid coordinates: lat must be between ${VALID_LAT_MIN} and ${VALID_LAT_MAX}, lng must be between ${VALID_LNG_MIN} and ${VALID_LNG_MAX}`,
      coordinates: { lat, lng },
    };
  }

  // Check cache first
  const cachedResult = checkCache(lat, lng);
  if (cachedResult) {
    return cachedResult;
  }

  // Perform API call with retry logic
  let lastError: ReverseGeocodeResponse | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    metrics.apiCalls++;

    const result = await performReverseGeocodeRequest(lat, lng, timeout);

    // Success - cache and return
    if (result.success) {
      storeInCache(lat, lng, result);
      return result;
    }

    // Non-retryable error - return immediately
    if (!isRetryableError(result, result.error === 'RATE_LIMIT' ? 429 : undefined)) {
      return result;
    }

    lastError = result;

    // Don't retry on last attempt
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS_MS[attempt];
      metrics.retries++;
      console.warn(
        `[Reverse Geocode] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms - ` +
        `Error: ${result.error} for (${lat}, ${lng})`
      );
      await sleep(delay);
    }
  }

  // All retries exhausted
  return (
    lastError || {
      success: false,
      error: 'NETWORK',
      message: 'All retry attempts failed',
      coordinates: { lat, lng },
    }
  );
}

/**
 * Clear the reverse geocoding cache (useful for testing)
 */
export function clearReverseGeocodeCache(): void {
  geocodeCache.clear();
  console.debug('[Reverse Geocode] Cache cleared');
}

/**
 * Get current performance metrics
 * @returns Current performance metrics
 */
export function getReverseGeocodeMetrics(): Readonly<PerformanceMetrics> {
  return { ...metrics };
}

/**
 * Reset performance metrics
 */
export function resetReverseGeocodeMetrics(): void {
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.apiCalls = 0;
  metrics.retries = 0;
  metrics.slowResponses = 0;
  console.debug('[Reverse Geocode] Metrics reset');
}

/**
 * Format coordinates as fallback address string
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Formatted coordinate string
 */
export function formatCoordinatesAsAddress(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
