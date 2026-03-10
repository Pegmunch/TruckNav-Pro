// UK Postcode Geocoding Service using postcodes.io API
import { detectPostcodeCountry, formatPostcode } from "./postcode-utils";

export interface UKPostcodeResult {
  postcode: string;
  quality: number;
  eastings: number;
  northings: number;
  country: string;
  nhs_ha: string;
  longitude: number;
  latitude: number;
  european_electoral_region: string;
  primary_care_trust: string;
  region: string;
  lsoa: string;
  msoa: string;
  incode: string;
  outcode: string;
  parliamentary_constituency: string;
  admin_district: string;
  parish: string;
  admin_county: string;
  admin_ward: string;
  ced: string;
  ccg: string;
  nuts: string;
  codes: {
    admin_district: string;
    admin_county: string;
    admin_ward: string;
    parish: string;
    parliamentary_constituency: string;
    ccg: string;
    ccg_id: string;
    ced: string;
    nuts: string;
    lsoa: string;
    msoa: string;
    lau2: string;
  };
}

export interface PostcodeGeocodeResult {
  postcode: string;
  formatted: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address?: string;
  city?: string;
  region?: string;
  confidence: number;
}

/**
 * Geocode a UK postcode using the postcodes.io API
 * This provides highly accurate coordinates for UK postcodes
 */
export async function geocodeUKPostcode(postcode: string): Promise<PostcodeGeocodeResult | null> {
  try {
    // Validate and format the postcode
    const country = detectPostcodeCountry(postcode);
    if (country !== 'UK') {
      return null; // Not a UK postcode
    }

    const formattedPostcode = formatPostcode(postcode, 'UK');
    
    // Call postcodes.io API
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(formattedPostcode)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Postcode not found
        return null;
      }
      throw new Error(`Postcode API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      return null;
    }

    const result: UKPostcodeResult = data.result;

    return {
      postcode: result.postcode,
      formatted: result.postcode,
      country: 'UK',
      coordinates: {
        lat: result.latitude,
        lng: result.longitude
      },
      address: `${result.postcode}, ${result.admin_district}`,
      city: result.admin_district,
      region: result.region,
      confidence: 1.0 // postcodes.io provides highly accurate data
    };

  } catch (error) {
    console.error('UK postcode geocoding error:', error);
    return null;
  }
}

/**
 * Enhanced geocoding that tries UK-specific service first, then falls back to general geocoding
 */
export async function enhancedGeocoding(input: string): Promise<PostcodeGeocodeResult | null> {
  // Detect if it's a UK postcode
  const country = detectPostcodeCountry(input);
  
  if (country === 'UK') {
    // Use UK-specific geocoding service
    const ukResult = await geocodeUKPostcode(input);
    if (ukResult) {
      return ukResult;
    }
  }

  // For non-UK postcodes or if UK geocoding fails, use general geocoding
  // This would typically be implemented with a service like GraphHopper or Nominatim
  // For now, return null to indicate we need general geocoding fallback
  return null;
}

/**
 * Bulk geocode multiple UK postcodes
 */
export async function bulkGeocodeUKPostcodes(postcodes: string[]): Promise<(PostcodeGeocodeResult | null)[]> {
  // postcodes.io supports bulk requests
  const validPostcodes = postcodes
    .filter(p => detectPostcodeCountry(p) === 'UK')
    .map(p => formatPostcode(p, 'UK'));

  if (validPostcodes.length === 0) {
    return postcodes.map(() => null);
  }

  try {
    const response = await fetch('https://api.postcodes.io/postcodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postcodes: validPostcodes
      })
    });

    if (!response.ok) {
      throw new Error(`Bulk postcode API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.result.map((item: any, index: number) => {
      if (!item.result) {
        return null;
      }

      const result: UKPostcodeResult = item.result;
      return {
        postcode: result.postcode,
        formatted: result.postcode,
        country: 'UK',
        coordinates: {
          lat: result.latitude,
          lng: result.longitude
        },
        address: `${result.postcode}, ${result.admin_district}`,
        city: result.admin_district,
        region: result.region,
        confidence: 1.0
      };
    });

  } catch (error) {
    console.error('Bulk UK postcode geocoding error:', error);
    return postcodes.map(() => null);
  }
}