import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { detectPostcodeCountry, looksLikePostcode } from "@/lib/postcode-utils";
import { geocodeUKPostcode, PostcodeGeocodeResult } from "@/lib/uk-postcode-geocoding";

interface PhotonProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  country?: string;
  countrycode?: string;
  postcode?: string;
  state?: string;
  district?: string;
  osm_key?: string;
  osm_value?: string;
}

interface PhotonGeometry {
  coordinates: [number, number]; // [longitude, latitude]
  type: string;
}

export interface PhotonFeature {
  type: string;
  geometry: PhotonGeometry;
  properties: PhotonProperties;
}

interface PhotonResponse {
  features: PhotonFeature[];
}

// Convert UK postcode result to PhotonFeature format for consistency
function postcodeResultToPhotonFeature(result: PostcodeGeocodeResult): PhotonFeature {
  return {
    type: "Feature",
    geometry: {
      coordinates: [result.coordinates.lng, result.coordinates.lat],
      type: "Point"
    },
    properties: {
      name: result.postcode,
      postcode: result.postcode,
      city: result.city,
      district: result.region,
      country: "United Kingdom",
      countrycode: "GB",
      osm_key: "postcode",
      osm_value: "uk_postcode_accurate"
    }
  };
}

// LRU Cache for autocomplete results
class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 100, ttl: number = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Circuit breaker for API calls with exponential backoff
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private isOpen: boolean = false;
  private readonly threshold: number = 3;
  private readonly timeout: number = 30000;
  private cooldownPeriod: number = 10000;

  canProceed(): boolean {
    const now = Date.now();

    if (this.isOpen && (now - this.lastFailureTime) > this.cooldownPeriod) {
      console.log(`[CIRCUIT-BREAKER] Half-open after ${this.cooldownPeriod}ms cooldown`);
      this.isOpen = false;
      this.failures = 0;
      return true;
    }

    if (this.failures >= this.threshold && (now - this.lastFailureTime) < this.timeout) {
      if (!this.isOpen) {
        console.warn(`[CIRCUIT-BREAKER] OPENING - ${this.failures} failures`);
      }
      this.isOpen = true;
      return false;
    }

    return true;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    this.cooldownPeriod = Math.min(this.cooldownPeriod * 2, 60000);
    console.warn(`[CIRCUIT-BREAKER] Failure #${this.failures}, next cooldown: ${this.cooldownPeriod}ms`);
  }

  recordSuccess(): void {
    if (this.failures > 0 || this.isOpen) {
      console.log('[CIRCUIT-BREAKER] Success - resetting');
    }
    this.reset();
  }

  private reset(): void {
    this.failures = 0;
    this.isOpen = false;
    this.cooldownPeriod = 10000;
  }

  isCircuitOpen(): boolean {
    return this.isOpen;
  }
}

// Global singleton instances (shared across all hook consumers)
const globalAutocompleteCache = new LRUCache<string, { results: PhotonFeature[]; error: string | null }>(100, 300000);
const globalPhotonCircuitBreaker = new CircuitBreaker();
const globalUkCircuitBreaker = new CircuitBreaker();

const saveToSessionStorage = (key: string, data: any): void => {
  try {
    sessionStorage.setItem(`trucknav_autocomplete_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('[AUTOCOMPLETE] SessionStorage save failed');
  }
};

const loadFromSessionStorage = (key: string): any | null => {
  try {
    const stored = sessionStorage.getItem(`trucknav_autocomplete_${key}`);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    
    if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.timestamp !== 'number') {
      console.warn('[AUTOCOMPLETE] Corrupted sessionStorage data, clearing');
      sessionStorage.removeItem(`trucknav_autocomplete_${key}`);
      return null;
    }

    const age = Date.now() - parsed.timestamp;

    if (age < 3600000) {
      console.log(`[AUTOCOMPLETE] SessionStorage hit - Age: ${Math.round(age/1000)}s`);
      return parsed.data;
    } else {
      console.log('[AUTOCOMPLETE] SessionStorage expired, clearing');
      sessionStorage.removeItem(`trucknav_autocomplete_${key}`);
    }
  } catch (e) {
    console.error('[AUTOCOMPLETE] SessionStorage parse error, clearing:', e);
    try {
      sessionStorage.removeItem(`trucknav_autocomplete_${key}`);
    } catch {}
  }
  return null;
};

export const usePhotonAutocomplete = (
  query: string, 
  enabled: boolean = true,
  countryCode?: string,
  poiCategory?: string // e.g., "shop:supermarket", "amenity:restaurant", "amenity:fuel"
) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Debounce the query with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[AUTOCOMPLETE] Network online - resetting circuit breakers');
      globalPhotonCircuitBreaker.recordSuccess();
      globalUkCircuitBreaker.recordSuccess();
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      console.warn('[AUTOCOMPLETE] Network offline - will use cache');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const shouldFetch = enabled && debouncedQuery.length >= 3;

  const { data, isLoading, error } = useQuery<{ results: PhotonFeature[]; error: string | null }>({
    queryKey: ["/api/photon-autocomplete", debouncedQuery, countryCode, poiCategory],
    queryFn: async () => {
      const trimmedQuery = debouncedQuery.trim();
      
      const cacheKey = `${countryCode || 'global'}_${poiCategory || 'all'}_${trimmedQuery.toLowerCase()}`;
      
      const cached = globalAutocompleteCache.get(cacheKey);
      if (cached) {
        console.log('[AUTOCOMPLETE] Cache hit (memory)');
        return cached;
      }

      const sessionCached = loadFromSessionStorage(cacheKey);
      if (sessionCached) {
        console.log('[AUTOCOMPLETE] Cache hit (sessionStorage)');
        globalAutocompleteCache.set(cacheKey, sessionCached);
        return sessionCached;
      }

      if (!isOnline) {
        console.warn('[AUTOCOMPLETE] Offline - using cached data only');
        const cached = globalAutocompleteCache.get(cacheKey) || loadFromSessionStorage(cacheKey);
        if (cached) {
          return { ...cached, isStale: true, offline: true };
        }
        return { results: [], error: 'No internet connection' };
      }

      const detectedCountry = detectPostcodeCountry(trimmedQuery);
      const isUKPostcode = detectedCountry === 'UK';

      if (isUKPostcode && globalUkCircuitBreaker.canProceed()) {
        try {
          console.log('[AUTOCOMPLETE] UK postcode detected, trying postcodes.io');
          const ukResult = await geocodeUKPostcode(trimmedQuery);
          
          if (ukResult) {
            const result = {
              results: [postcodeResultToPhotonFeature(ukResult)],
              error: null
            };
            
            globalUkCircuitBreaker.recordSuccess();
            globalAutocompleteCache.set(cacheKey, result);
            saveToSessionStorage(cacheKey, result);
            return result;
          }
        } catch (err) {
          globalUkCircuitBreaker.recordFailure();
          console.warn('[AUTOCOMPLETE] UK API error:', err);
        }
      }

      if (!globalPhotonCircuitBreaker.canProceed()) {
        console.warn('[AUTOCOMPLETE] Photon circuit breaker OPEN');
        
        const staleCache = loadFromSessionStorage(cacheKey);
        if (staleCache) {
          return { ...staleCache, isStale: true };
        }
        
        return {
          results: [],
          error: 'Service temporarily unavailable. Please try again.'
        };
      }

      try {
        const backendUrl = new URL('/api/photon-autocomplete', window.location.origin);
        backendUrl.searchParams.set('q', trimmedQuery);
        backendUrl.searchParams.set('limit', '10');
        
        // Add POI filter if category specified
        if (poiCategory) {
          backendUrl.searchParams.set('osm_tag', poiCategory);
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(backendUrl.toString(), { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: PhotonResponse = await response.json();
        let features = data.features || [];

        if (countryCode) {
          features = features.filter((f: PhotonFeature) => 
            f.properties.countrycode?.toUpperCase() === countryCode.toUpperCase()
          );
        }

        features = features.sort((a: PhotonFeature, b: PhotonFeature) => {
          const aScore = getTruckSuitabilityScore(a);
          const bScore = getTruckSuitabilityScore(b);
          return bScore - aScore;
        });

        const result = { results: features.slice(0, 10), error: null };
        
        globalPhotonCircuitBreaker.recordSuccess();
        globalAutocompleteCache.set(cacheKey, result);
        saveToSessionStorage(cacheKey, result);
        
        return result;

      } catch (error) {
        globalPhotonCircuitBreaker.recordFailure();
        console.error('[AUTOCOMPLETE] Photon error:', error);
        
        if (looksLikePostcode(trimmedQuery) && globalUkCircuitBreaker.canProceed()) {
          try {
            const ukResult = await geocodeUKPostcode(trimmedQuery);
            if (ukResult) {
              const result = {
                results: [postcodeResultToPhotonFeature(ukResult)],
                error: null
              };
              globalAutocompleteCache.set(cacheKey, result);
              saveToSessionStorage(cacheKey, result);
              return result;
            }
          } catch (ukErr) {
            globalUkCircuitBreaker.recordFailure();
          }
        }

        const staleCache = loadFromSessionStorage(cacheKey);
        if (staleCache) {
          return { ...staleCache, isStale: true, error: 'Using cached results' };
        }

        return {
          results: [],
          error: error instanceof Error ? error.message : 'Search temporarily unavailable'
        };
      }
    },
    enabled: shouldFetch,
    retry: 1, // Reduced retry since we have UK fallback
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    results: data?.results || [],
    isLoading: shouldFetch && isLoading,
    error: data?.error || (error ? String(error) : null),
  };
};

// Calculate truck suitability score for POI prioritization
function getTruckSuitabilityScore(feature: PhotonFeature): number {
  const props = feature.properties;
  let score = 0;
  
  // Prioritize by OSM tags that indicate truck-suitable locations
  const osmKey = props.osm_key?.toLowerCase() || '';
  const osmValue = props.osm_value?.toLowerCase() || '';
  
  // High priority: Service stations, truck stops, industrial areas
  if (osmKey === 'amenity' && (osmValue.includes('fuel') || osmValue.includes('charging_station'))) {
    score += 10;
  }
  if (osmKey === 'highway' && osmValue === 'services') {
    score += 10;
  }
  if (osmKey === 'landuse' && (osmValue === 'industrial' || osmValue === 'commercial')) {
    score += 8;
  }
  
  // Medium priority: Commercial addresses, warehouses, depots
  if (osmKey === 'building' && (osmValue === 'commercial' || osmValue === 'industrial' || osmValue === 'warehouse')) {
    score += 6;
  }
  if (osmKey === 'shop' || osmKey === 'office') {
    score += 4;
  }
  
  // Postcode results get high priority
  if (osmValue === 'uk_postcode_accurate') {
    score += 15;
  }
  
  // Prefer results with postcodes
  if (props.postcode) {
    score += 2;
  }
  
  // Prefer complete addresses with street and city
  if (props.street) {
    score += 1;
  }
  if (props.city) {
    score += 1;
  }
  
  return score;
}

// Helper function to format a Photon feature for display with improved metadata
export const formatPhotonDisplay = (feature: PhotonFeature): string => {
  const props = feature.properties;
  
  // Build address parts with more detail
  const parts: string[] = [];
  
  // Street address
  if (props.housenumber && props.street) {
    parts.push(`${props.housenumber} ${props.street}`);
  } else if (props.street) {
    parts.push(props.street);
  } else if (props.name && props.name !== props.city) {
    parts.push(props.name);
  }
  
  // City or district
  if (props.city) {
    parts.push(props.city);
  } else if (props.district) {
    parts.push(props.district);
  }
  
  // Add region/state for context
  if (props.state && props.state !== props.city) {
    parts.push(props.state);
  }
  
  // Add postcode if available (important for UK addresses)
  if (props.postcode) {
    parts.push(props.postcode);
  }
  
  // Country
  if (props.country) {
    parts.push(props.country);
  }
  
  return parts.length > 0 ? parts.join(", ") : "Unknown location";
};

// Helper function to extract coordinates from Photon feature
export const extractPhotonCoordinates = (feature: PhotonFeature): { lat: number; lng: number } => {
  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng };
};

// Helper to check if a result is from UK postcode API
export const isUKPostcodeResult = (feature: PhotonFeature): boolean => {
  return feature.properties.osm_value === 'uk_postcode_accurate';
};
