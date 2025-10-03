import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

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

  const { data, isLoading, error } = useQuery<PhotonFeature[]>({
    queryKey: ["/api/photon", debouncedQuery, countryCode],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(
          `https://photon.komoot.io/api?q=${encodeURIComponent(debouncedQuery)}&limit=5`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: PhotonResponse = await response.json();
        const features = data.features || [];
        
        // Filter by country code if provided
        if (countryCode) {
          const filtered = features.filter(f => 
            f.properties.countrycode?.toUpperCase() === countryCode.toUpperCase() ||
            f.properties.country?.toUpperCase() === countryCode.toUpperCase()
          );
          return filtered;
        }
        
        return features;
      } catch (err) {
        clearTimeout(timeoutId);
        
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.warn('[PHOTON] Request timeout after 5 seconds');
          } else {
            console.warn('[PHOTON] Error:', err.message);
          }
        } else {
          console.warn('[PHOTON] Unknown error:', err);
        }
        
        return [];
      }
    },
    enabled: shouldFetch,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    results: data || [],
    isLoading: shouldFetch && isLoading,
    error,
  };
};

// Helper function to format a Photon feature for display
export const formatPhotonDisplay = (feature: PhotonFeature): string => {
  const props = feature.properties;
  
  // Build address parts
  const parts: string[] = [];
  
  // Street address
  if (props.housenumber && props.street) {
    parts.push(`${props.housenumber} ${props.street}`);
  } else if (props.street) {
    parts.push(props.street);
  } else if (props.name) {
    parts.push(props.name);
  }
  
  // City
  if (props.city) {
    parts.push(props.city);
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
