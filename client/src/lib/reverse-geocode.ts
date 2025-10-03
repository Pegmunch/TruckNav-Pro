/**
 * Reverse Geocoding Utility
 * Converts GPS coordinates to human-readable addresses using Photon API
 */

export interface ReverseGeocodeResult {
  address: string;
  city?: string;
  country?: string;
  fullData?: any;
}

/**
 * Reverse geocode GPS coordinates to address using Photon API
 * @param lat - Latitude
 * @param lng - Longitude
 * @param timeout - Request timeout in ms (default: 5000)
 * @returns Address string or null if failed
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  timeout: number = 5000
): Promise<ReverseGeocodeResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(
      `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}&limit=1`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Reverse geocoding failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn('No address found for coordinates:', { lat, lng });
      return null;
    }

    const feature = data.features[0];
    const props = feature.properties;

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
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        fullData: feature
      };
    }

    return {
      address: parts.join(', '),
      city,
      country: props.country,
      fullData: feature
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Reverse geocoding timeout');
    } else {
      console.error('Reverse geocoding error:', error);
    }
    return null;
  }
}

/**
 * Format coordinates as fallback address string
 */
export function formatCoordinatesAsAddress(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
