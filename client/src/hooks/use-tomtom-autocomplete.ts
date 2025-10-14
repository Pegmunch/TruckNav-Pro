import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface TomTomAddress {
  streetNumber?: string;
  streetName?: string;
  municipality?: string;
  countrySubdivision?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  freeformAddress?: string;
  localName?: string;
}

interface TomTomPoi {
  name?: string;
  categories?: string[];
  categorySet?: Array<{ id: number; name?: string }>;
  classifications?: Array<{ code: string; names?: Array<{ name?: string }> }>;
}

interface TomTomPosition {
  lat: number;
  lon: number;
}

export interface TomTomResult {
  type: string;
  id: string;
  score: number;
  address: TomTomAddress;
  position: TomTomPosition;
  poi?: TomTomPoi;
  dist?: number;
  entityType?: string;
}

interface TomTomResponse {
  results: TomTomResult[];
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

// Circuit breaker for API calls
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
      console.log(`[TOMTOM-CIRCUIT] Half-open after ${this.cooldownPeriod}ms cooldown`);
      this.isOpen = false;
      this.failures = 0;
      return true;
    }

    if (this.failures >= this.threshold && (now - this.lastFailureTime) < this.timeout) {
      if (!this.isOpen) {
        console.warn(`[TOMTOM-CIRCUIT] OPENING - ${this.failures} failures`);
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
    console.warn(`[TOMTOM-CIRCUIT] Failure #${this.failures}, next cooldown: ${this.cooldownPeriod}ms`);
  }

  recordSuccess(): void {
    if (this.failures > 0 || this.isOpen) {
      console.log('[TOMTOM-CIRCUIT] Success - resetting');
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

// Global singleton instances
const globalTomTomCache = new LRUCache<string, { results: TomTomResult[]; error: string | null }>(100, 300000);
const globalTomTomCircuitBreaker = new CircuitBreaker();

const saveToSessionStorage = (key: string, data: any): void => {
  try {
    sessionStorage.setItem(`trucknav_tomtom_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('[TOMTOM] SessionStorage save failed');
  }
};

const loadFromSessionStorage = (key: string): any | null => {
  try {
    const stored = sessionStorage.getItem(`trucknav_tomtom_${key}`);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    
    if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.timestamp !== 'number') {
      console.warn('[TOMTOM] Corrupted sessionStorage data, clearing');
      sessionStorage.removeItem(`trucknav_tomtom_${key}`);
      return null;
    }

    const age = Date.now() - parsed.timestamp;

    if (age < 3600000) {
      console.log(`[TOMTOM] SessionStorage hit - Age: ${Math.round(age/1000)}s`);
      return parsed.data;
    } else {
      console.log('[TOMTOM] SessionStorage expired, clearing');
      sessionStorage.removeItem(`trucknav_tomtom_${key}`);
    }
  } catch (e) {
    console.error('[TOMTOM] SessionStorage parse error, clearing:', e);
    try {
      sessionStorage.removeItem(`trucknav_tomtom_${key}`);
    } catch {}
  }
  return null;
};

export const useTomTomAutocomplete = (
  query: string, 
  enabled: boolean = true,
  countryCode?: string,
  poiCategory?: string, // TomTom category ID or name
  gpsCoordinates?: { lat: number; lng: number },
  searchType: 'fuzzy' | 'poi' = 'fuzzy' // fuzzy for addresses, poi for points of interest
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
      console.log('[TOMTOM] Network online - resetting circuit breaker');
      globalTomTomCircuitBreaker.recordSuccess();
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      console.warn('[TOMTOM] Network offline - will use cache');
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

  const { data, isLoading, error } = useQuery<{ results: TomTomResult[]; error: string | null }>({
    queryKey: ["/api/tomtom-search", debouncedQuery, countryCode, poiCategory, gpsCoordinates?.lat, gpsCoordinates?.lng, searchType],
    queryFn: async () => {
      const trimmedQuery = debouncedQuery.trim();
      
      const locationKey = gpsCoordinates ? `${gpsCoordinates.lat.toFixed(4)}_${gpsCoordinates.lng.toFixed(4)}` : 'no_gps';
      const cacheKey = `${searchType}_${countryCode || 'global'}_${poiCategory || 'all'}_${locationKey}_${trimmedQuery.toLowerCase()}`;
      
      const cached = globalTomTomCache.get(cacheKey);
      if (cached) {
        console.log('[TOMTOM] Cache hit (memory)');
        return cached;
      }

      const sessionCached = loadFromSessionStorage(cacheKey);
      if (sessionCached) {
        console.log('[TOMTOM] Cache hit (sessionStorage)');
        globalTomTomCache.set(cacheKey, sessionCached);
        return sessionCached;
      }

      if (!isOnline) {
        console.warn('[TOMTOM] Offline - using cached data only');
        const staleCache = loadFromSessionStorage(cacheKey);
        if (staleCache) {
          return { ...staleCache, isStale: true, offline: true };
        }
        return { results: [], error: 'No internet connection' };
      }

      if (!globalTomTomCircuitBreaker.canProceed()) {
        console.warn('[TOMTOM] Circuit breaker OPEN');
        
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
        const backendUrl = new URL('/api/tomtom-search', window.location.origin);
        backendUrl.searchParams.set('q', trimmedQuery);
        backendUrl.searchParams.set('limit', '10');
        backendUrl.searchParams.set('searchType', searchType);
        
        // Add POI category filter if specified
        if (poiCategory && searchType === 'poi') {
          backendUrl.searchParams.set('categorySet', poiCategory);
        }
        
        // Add GPS coordinates for location-biased search
        if (gpsCoordinates) {
          backendUrl.searchParams.set('lat', gpsCoordinates.lat.toString());
          backendUrl.searchParams.set('lon', gpsCoordinates.lng.toString());
          console.log(`[TOMTOM] Using GPS location: lat=${gpsCoordinates.lat}, lng=${gpsCoordinates.lng}`);
        }
        
        // Add country filter
        if (countryCode) {
          backendUrl.searchParams.set('countrySet', countryCode);
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(backendUrl.toString(), { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: TomTomResponse = await response.json();
        let results = data.results || [];

        // Sort by truck suitability
        results = results.sort((a: TomTomResult, b: TomTomResult) => {
          const aScore = getTruckSuitabilityScore(a);
          const bScore = getTruckSuitabilityScore(b);
          return bScore - aScore;
        });

        const result = { results: results.slice(0, 10), error: null };
        
        globalTomTomCircuitBreaker.recordSuccess();
        globalTomTomCache.set(cacheKey, result);
        saveToSessionStorage(cacheKey, result);
        
        return result;

      } catch (error) {
        globalTomTomCircuitBreaker.recordFailure();
        console.error('[TOMTOM] Search error:', error);

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
    retry: 1,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  return {
    results: data?.results || [],
    isLoading: shouldFetch && isLoading,
    error: data?.error || (error ? String(error) : null),
  };
};

// Calculate truck suitability score for POI prioritization
function getTruckSuitabilityScore(result: TomTomResult): number {
  let score = result.score || 0;
  
  // Boost POI results for truck-relevant categories
  if (result.poi) {
    const categories = result.poi.categories || [];
    const categorySet = result.poi.categorySet || [];
    
    // High priority: Gas stations, truck stops, service areas
    if (categories.some(cat => cat.toLowerCase().includes('gas') || cat.toLowerCase().includes('fuel'))) {
      score += 50;
    }
    if (categories.some(cat => cat.toLowerCase().includes('truck') || cat.toLowerCase().includes('service'))) {
      score += 60;
    }
    if (categories.some(cat => cat.toLowerCase().includes('rest') || cat.toLowerCase().includes('parking'))) {
      score += 40;
    }
    
    // Medium priority: Commercial, industrial
    if (categories.some(cat => cat.toLowerCase().includes('commercial') || cat.toLowerCase().includes('industrial'))) {
      score += 30;
    }
    
    // Check category set IDs for truck-specific categories
    // TomTom category IDs: 7311 = Gas Station, 7313 = Electric Vehicle Station, 7315 = Truck Stop
    if (categorySet.some(cs => cs.id === 7315)) score += 100; // Truck stop
    if (categorySet.some(cs => cs.id === 7311)) score += 50;  // Gas station
    if (categorySet.some(cs => cs.id === 9920)) score += 40;  // Rest area
  }
  
  // Prefer results with postal codes (more specific)
  if (result.address.postalCode) {
    score += 10;
  }
  
  // Prefer closer results if distance is provided
  if (result.dist !== undefined) {
    score += Math.max(0, 100 - result.dist / 100); // Closer = higher score
  }
  
  return score;
}

// Helper function to format a TomTom result for display
export const formatTomTomDisplay = (result: TomTomResult): string => {
  const addr = result.address;
  
  // If it's a POI, show POI name first
  if (result.poi?.name) {
    const parts: string[] = [result.poi.name];
    
    if (addr.freeformAddress) {
      parts.push(addr.freeformAddress);
    } else {
      if (addr.streetName) parts.push(addr.streetName);
      if (addr.municipality) parts.push(addr.municipality);
      if (addr.countrySubdivision) parts.push(addr.countrySubdivision);
      if (addr.postalCode) parts.push(addr.postalCode);
    }
    
    return parts.join(", ");
  }
  
  // For address results, use freeformAddress or build from parts
  if (addr.freeformAddress) {
    return addr.freeformAddress;
  }
  
  const parts: string[] = [];
  
  if (addr.streetNumber && addr.streetName) {
    parts.push(`${addr.streetNumber} ${addr.streetName}`);
  } else if (addr.streetName) {
    parts.push(addr.streetName);
  }
  
  if (addr.municipality) parts.push(addr.municipality);
  if (addr.countrySubdivision) parts.push(addr.countrySubdivision);
  if (addr.postalCode) parts.push(addr.postalCode);
  if (addr.country) parts.push(addr.country);
  
  return parts.length > 0 ? parts.join(", ") : "Unknown location";
};

// Helper function to extract coordinates from TomTom result
export const extractTomTomCoordinates = (result: TomTomResult): { lat: number; lng: number } => {
  return { lat: result.position.lat, lng: result.position.lon };
};

// Helper to check if result is a POI
export const isTomTomPOI = (result: TomTomResult): boolean => {
  return result.poi !== undefined && result.poi !== null;
};

// Helper to get POI category names
export const getTomTomPOICategories = (result: TomTomResult): string[] => {
  if (!result.poi) return [];
  return result.poi.categories || [];
};
