/**
 * Country Utilities for TruckNav Pro
 * Patent-protected by Bespoke Marketing.Ai Ltd
 * Helper functions for country and language management
 */

import { countries, getCountryByCode, DEFAULT_COUNTRY, type Country } from '@/data/countries';

/**
 * Detect user's country based on browser language and other signals
 */
export function detectUserCountry(): Country {
  try {
    // Try to get from localStorage first
    const savedCountry = localStorage.getItem('trucknav_country');
    if (savedCountry) {
      const country = getCountryByCode(savedCountry);
      if (country) return country;
    }

    // Try to detect from browser language
    const browserLang = navigator.language || navigator.languages?.[0];
    if (browserLang) {
      // Extract country from language code (e.g., 'en-US' -> 'US')
      const parts = browserLang.split(/[-_]/);
      if (parts.length > 1) {
        const countryCode = parts[parts.length - 1].toUpperCase();
        const country = getCountryByCode(countryCode);
        if (country) return country;
      }

      // Try to find by language (e.g., 'en' -> find English-speaking countries)
      const languageCode = parts[0].toLowerCase();
      const matchingCountries = countries.filter(country => 
        country.languages.some(lang => lang.toLowerCase().startsWith(languageCode)) ||
        country.defaultLanguage.toLowerCase().startsWith(languageCode)
      );

      // Prefer major trucking markets
      const truckingMarkets = matchingCountries.filter(c => c.truckingMarket);
      if (truckingMarkets.length > 0) {
        return truckingMarkets[0];
      }

      if (matchingCountries.length > 0) {
        return matchingCountries[0];
      }
    }

    // Try timezone detection (basic)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      // Simple timezone to country mapping
      const timezoneCountryMap: { [key: string]: string } = {
        'America/New_York': 'US',
        'America/Los_Angeles': 'US',
        'America/Chicago': 'US',
        'America/Denver': 'US',
        'America/Toronto': 'CA',
        'America/Vancouver': 'CA',
        'Europe/London': 'GB',
        'Europe/Berlin': 'DE',
        'Europe/Paris': 'FR',
        'Europe/Madrid': 'ES',
        'Europe/Rome': 'IT',
        'Europe/Amsterdam': 'NL',
        'Australia/Sydney': 'AU',
        'Australia/Melbourne': 'AU',
        'Asia/Tokyo': 'JP',
        'Asia/Seoul': 'KR'
      };

      const detectedCountry = timezoneCountryMap[timezone];
      if (detectedCountry) {
        const country = getCountryByCode(detectedCountry);
        if (country) return country;
      }
    }

    // Fallback to default
    return DEFAULT_COUNTRY;
  } catch (error) {
    console.warn('Error detecting user country:', error);
    return DEFAULT_COUNTRY;
  }
}

/**
 * Get appropriate language for a country based on user preferences
 */
export function getPreferredLanguageForCountry(country: Country): string {
  try {
    // Check if user has a preferred language for this country
    const savedLanguage = localStorage.getItem('trucknav_language');
    if (savedLanguage && country.languages.includes(savedLanguage)) {
      return savedLanguage;
    }

    // Check browser language preference
    const browserLang = navigator.language || navigator.languages?.[0];
    if (browserLang) {
      const browserLanguages = [browserLang, ...navigator.languages || []];
      
      for (const lang of browserLanguages) {
        const normalizedLang = lang.replace('-', '-').toLowerCase();
        const matchingLanguage = country.languages.find(countryLang => 
          countryLang.toLowerCase() === normalizedLang
        );
        if (matchingLanguage) {
          return matchingLanguage;
        }
      }
    }

    // Fallback to country's default language
    return country.defaultLanguage;
  } catch (error) {
    console.warn('Error getting preferred language:', error);
    return country.defaultLanguage;
  }
}

/**
 * Format country display name with native name if different
 */
export function formatCountryDisplayName(country: Country, showNative = true): string {
  if (!showNative || country.name === country.nativeName) {
    return country.name;
  }
  return `${country.name} (${country.nativeName})`;
}

/**
 * Check if a country is a major trucking market
 */
export function isMajorTruckingMarket(country: Country): boolean {
  return country.truckingMarket;
}

/**
 * Get flag emoji for a country
 */
export function getFlagEmoji(country: Country): string {
  return country.flag;
}

/**
 * Save user's country and language preferences
 */
export function saveUserPreferences(country: Country, language: string): void {
  try {
    localStorage.setItem('trucknav_country', country.code);
    localStorage.setItem('trucknav_language', language);
    
    // Save Amazon region if available
    if (country.amazonRegion) {
      localStorage.setItem('trucknav_amazon_region', country.amazonRegion);
    }

    // Save currency for future use
    localStorage.setItem('trucknav_currency', country.currency);

    // Save timezone
    localStorage.setItem('trucknav_timezone', country.timezone);

    // Save driving side
    localStorage.setItem('trucknav_driving_side', country.drivingSide);
  } catch (error) {
    console.warn('Error saving user preferences:', error);
  }
}

/**
 * Load user's country and language preferences
 */
export function loadUserPreferences(): { country: Country; language: string } {
  try {
    const savedCountryCode = localStorage.getItem('trucknav_country');
    const savedLanguage = localStorage.getItem('trucknav_language');

    let country = DEFAULT_COUNTRY;
    if (savedCountryCode) {
      const foundCountry = getCountryByCode(savedCountryCode);
      if (foundCountry) {
        country = foundCountry;
      }
    } else {
      // Auto-detect if no saved preference
      country = detectUserCountry();
    }

    let language = country.defaultLanguage;
    if (savedLanguage && country.languages.includes(savedLanguage)) {
      language = savedLanguage;
    } else {
      language = getPreferredLanguageForCountry(country);
    }

    return { country, language };
  } catch (error) {
    console.warn('Error loading user preferences:', error);
    return { country: DEFAULT_COUNTRY, language: DEFAULT_COUNTRY.defaultLanguage };
  }
}

/**
 * Update recent countries list
 */
export function updateRecentCountries(country: Country): void {
  try {
    const recentKey = 'trucknav_recent_countries';
    const existing = localStorage.getItem(recentKey);
    let recent: string[] = [];
    
    if (existing) {
      recent = JSON.parse(existing);
    }

    // Remove if already exists
    recent = recent.filter(code => code !== country.code);
    
    // Add to beginning
    recent.unshift(country.code);
    
    // Keep only last 10
    recent = recent.slice(0, 10);
    
    localStorage.setItem(recentKey, JSON.stringify(recent));
  } catch (error) {
    console.warn('Error updating recent countries:', error);
  }
}

/**
 * Check if country supports specific features
 */
export function countrySupportsFeature(country: Country, feature: string): boolean {
  switch (feature) {
    case 'trucking':
      return country.truckingMarket;
    case 'amazon':
      return !!country.amazonRegion;
    case 'left_driving':
      return country.drivingSide === 'left';
    case 'right_driving':
      return country.drivingSide === 'right';
    default:
      return false;
  }
}