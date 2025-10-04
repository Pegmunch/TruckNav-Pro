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

export const usePhotonAutocomplete = (
  query: string, 
  enabled: boolean = true,
  countryCode?: string
) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the query with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const shouldFetch = enabled && debouncedQuery.length >= 3;

  const { data, isLoading, error } = useQuery<{ results: PhotonFeature[]; error: string | null }>({
    queryKey: ["/api/photon-autocomplete", debouncedQuery, countryCode],
    queryFn: async () => {
      const trimmedQuery = debouncedQuery.trim();
      
      // Step 1: Check if input is a UK postcode
      const detectedCountry = detectPostcodeCountry(trimmedQuery);
      const isUKPostcode = detectedCountry === 'UK';
      
      // Step 2: If UK postcode detected, try UK API first for high accuracy
      if (isUKPostcode) {
        try {
          console.log('[AUTOCOMPLETE] Detected UK postcode, using postcodes.io API');
          const ukResult = await geocodeUKPostcode(trimmedQuery);
          
          if (ukResult) {
            // Return UK postcode result as primary result
            return {
              results: [postcodeResultToPhotonFeature(ukResult)],
              error: null
            };
          }
          // If UK API fails, continue to try Photon below
          console.log('[AUTOCOMPLETE] UK postcode not found in postcodes.io, falling back to Photon');
        } catch (err) {
          console.warn('[AUTOCOMPLETE] UK postcode API error:', err);
          // Continue to Photon fallback
        }
      }
      
      // Step 3: Try Photon API via backend proxy (for non-UK postcodes or as fallback)
      try {
        // Build backend proxy URL with query parameters
        const backendUrl = new URL('/api/photon-autocomplete', window.location.origin);
        backendUrl.searchParams.set('q', trimmedQuery);
        backendUrl.searchParams.set('limit', '10');
        
        const response = await fetch(backendUrl.toString());

        if (!response.ok) {
          const errorMsg = `Photon API error: HTTP ${response.status}`;
          console.error('[AUTOCOMPLETE]', errorMsg);
          
          // If Photon fails and input looks like UK postcode, try UK API as fallback
          if (looksLikePostcode(trimmedQuery)) {
            try {
              console.log('[AUTOCOMPLETE] Photon failed, trying UK postcode API as fallback');
              const ukResult = await geocodeUKPostcode(trimmedQuery);
              if (ukResult) {
                return {
                  results: [postcodeResultToPhotonFeature(ukResult)],
                  error: null
                };
              }
            } catch (ukErr) {
              console.warn('[AUTOCOMPLETE] UK fallback also failed:', ukErr);
            }
          }
          
          return {
            results: [],
            error: errorMsg
          };
        }

        const data: PhotonResponse = await response.json();
        let features = data.features || [];
        
        // Filter by country code if provided
        if (countryCode) {
          features = features.filter(f => 
            f.properties.countrycode?.toUpperCase() === countryCode.toUpperCase() ||
            f.properties.country?.toUpperCase() === countryCode.toUpperCase()
          );
        }
        
        // Step 4: If Photon returns no results and input looks like UK postcode, try UK API fallback
        if (features.length === 0 && looksLikePostcode(trimmedQuery)) {
          try {
            console.log('[AUTOCOMPLETE] No Photon results, trying UK postcode API fallback');
            const ukResult = await geocodeUKPostcode(trimmedQuery);
            if (ukResult) {
              return {
                results: [postcodeResultToPhotonFeature(ukResult)],
                error: null
              };
            }
          } catch (ukErr) {
            console.warn('[AUTOCOMPLETE] UK fallback failed:', ukErr);
          }
        }
        
        // Prioritize commercial/truck-suitable locations
        // POIs like service stations, commercial addresses, industrial areas
        const prioritized = features.sort((a, b) => {
          const aScore = getTruckSuitabilityScore(a);
          const bScore = getTruckSuitabilityScore(b);
          return bScore - aScore;
        });
        
        return {
          results: prioritized,
          error: null
        };
      } catch (err) {
        let errorMsg = 'Unknown error';
        if (err instanceof Error) {
          errorMsg = err.message;
        }
        
        console.error('[AUTOCOMPLETE] Photon error:', errorMsg);
        
        // Try UK postcode API as last resort if input looks like postcode
        if (looksLikePostcode(trimmedQuery)) {
          try {
            console.log('[AUTOCOMPLETE] Error occurred, trying UK postcode API as last resort');
            const ukResult = await geocodeUKPostcode(trimmedQuery);
            if (ukResult) {
              return {
                results: [postcodeResultToPhotonFeature(ukResult)],
                error: null
              };
            }
          } catch (ukErr) {
            console.warn('[AUTOCOMPLETE] UK fallback failed:', ukErr);
          }
        }
        
        // Surface error to UI
        return {
          results: [],
          error: errorMsg
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
