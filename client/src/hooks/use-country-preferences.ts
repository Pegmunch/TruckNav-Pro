/**
 * Country-based Preferences Hook
 * Patent-protected by Bespoke Marketing.Ai Ltd
 * Manages automatic map and font selection based on selected country
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  getFontFamilyForCountry, 
  getMapProviderForCountry,
  getFallbackFontFamily,
  getFallbackMapProvider,
  loadGoogleFont,
  generateFontFamilyCSS,
  isRTL,
  getTextDirection,
  type FontFamily,
  type MapProviderConfig
} from '@/lib/country-map-font-utils';
import { getCountryByCode, DEFAULT_COUNTRY, type Country } from '@/data/countries';

// Enhanced preferences interface
interface CountryPreferences {
  country: Country;
  fontFamily: FontFamily;
  mapProvider: MapProviderConfig;
  rtl: boolean;
  textDirection: 'ltr' | 'rtl';
  fontLoaded: boolean;
  lastUpdated: number;
}

// Storage keys
const STORAGE_KEYS = {
  COUNTRY_PREFERENCES: 'trucknav_country_preferences',
  MAP_PREFERENCES: 'trucknav_map_preferences',
  FONT_PREFERENCES: 'trucknav_font_preferences',
  COUNTRY: 'trucknav_country',
  LANGUAGE: 'trucknav_language'
} as const;

// Default preferences
const getDefaultPreferences = (country: Country): CountryPreferences => ({
  country,
  fontFamily: getFontFamilyForCountry(country),
  mapProvider: getMapProviderForCountry(country),
  rtl: isRTL(country),
  textDirection: getTextDirection(country),
  fontLoaded: false,
  lastUpdated: Date.now()
});

/**
 * Hook for managing country-based preferences
 */
export function useCountryPreferences() {
  const { i18n } = useTranslation();
  
  // State for current preferences
  const [preferences, setPreferences] = useState<CountryPreferences>(() => {
    // Initialize from current country selection
    const countryCode = localStorage.getItem(STORAGE_KEYS.COUNTRY) || 'GB';
    const country = getCountryByCode(countryCode) || DEFAULT_COUNTRY;
    return getDefaultPreferences(country);
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from localStorage
  const loadPreferences = useCallback((country: Country): CountryPreferences => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.COUNTRY_PREFERENCES);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Validate and merge with current country
        if (parsed.country?.code === country.code) {
          return {
            ...getDefaultPreferences(country),
            ...parsed,
            country, // Always use fresh country data
            lastUpdated: parsed.lastUpdated || Date.now()
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load country preferences:', error);
    }
    
    return getDefaultPreferences(country);
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((prefs: CountryPreferences): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.COUNTRY_PREFERENCES, JSON.stringify({
        ...prefs,
        lastUpdated: Date.now()
      }));

      // Also update individual storage keys for backward compatibility
      localStorage.setItem(STORAGE_KEYS.COUNTRY, prefs.country.code);
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, prefs.country.defaultLanguage);
      
      // Save map preferences
      const mapPrefs = {
        provider: prefs.mapProvider.provider,
        tiles: prefs.mapProvider.tiles,
        attribution: prefs.mapProvider.attribution,
        maxZoom: prefs.mapProvider.maxZoom
      };
      localStorage.setItem(STORAGE_KEYS.MAP_PREFERENCES, JSON.stringify(mapPrefs));
      
      // Save font preferences
      const fontPrefs = {
        family: prefs.fontFamily.name,
        fallback: prefs.fontFamily.fallback,
        css: generateFontFamilyCSS(prefs.fontFamily),
        rtl: prefs.rtl,
        textDirection: prefs.textDirection
      };
      localStorage.setItem(STORAGE_KEYS.FONT_PREFERENCES, JSON.stringify(fontPrefs));
      
    } catch (error) {
      console.error('Failed to save country preferences:', error);
    }
  }, []);

  // Apply font to document with enhanced error handling
  const applyFont = useCallback(async (fontFamily: FontFamily): Promise<boolean> => {
    try {
      // Load Google Font if needed
      if (fontFamily.googleFonts) {
        await loadGoogleFont(fontFamily);
        
        // Wait a brief moment for font to be available
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify font loaded
        if (!document.fonts.check(`16px "${fontFamily.name}"`)) {
          console.warn(`Font ${fontFamily.name} may not have loaded properly`);
        }
      }

      // Generate CSS font family string
      const fontCSS = generateFontFamilyCSS(fontFamily);
      
      // Update CSS custom properties for all font types
      document.documentElement.style.setProperty('--font-sans', fontCSS);
      
      // Also update body font-family directly for immediate effect
      document.body.style.fontFamily = fontCSS;
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('font-changed', { 
        detail: { fontFamily, fontCSS } 
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to apply font:', error);
      return false;
    }
  }, []);

  // Apply text direction to document
  const applyTextDirection = useCallback((textDirection: 'ltr' | 'rtl') => {
    document.documentElement.setAttribute('dir', textDirection);
    document.documentElement.style.setProperty('--text-direction', textDirection);
  }, []);

  // Update preferences for a new country with comprehensive error handling
  const updateCountryPreferences = useCallback(async (country: Country) => {
    setIsLoading(true);
    setError(null);

    try {
      // Load preferences for this country
      let newPreferences = loadPreferences(country);
      
      // Try to apply the font with retry logic
      let fontSuccess = await applyFont(newPreferences.fontFamily);
      let attempts = 1;
      const maxAttempts = 3;
      
      // Retry font loading if initial attempt fails
      while (!fontSuccess && attempts < maxAttempts) {
        console.warn(`Font loading attempt ${attempts + 1}/${maxAttempts} for ${newPreferences.fontFamily.name}`);
        await new Promise(resolve => setTimeout(resolve, 500 * attempts)); // Exponential backoff
        fontSuccess = await applyFont(newPreferences.fontFamily);
        attempts++;
      }
      
      if (!fontSuccess) {
        // Fall back to a safe font
        console.warn('Primary font failed after retries, using fallback');
        const fallbackFont = getFallbackFontFamily(country);
        const fallbackSuccess = await applyFont(fallbackFont);
        
        if (fallbackSuccess) {
          newPreferences.fontFamily = fallbackFont;
          fontSuccess = true;
        } else {
          // Ultimate fallback - use system font
          console.error('Even fallback font failed, using system font');
          const systemFont = {
            name: 'System Font',
            fallback: ['system-ui', '-apple-system', 'sans-serif'],
            scripts: ['latin' as const]
          };
          newPreferences.fontFamily = systemFont;
          await applyFont(systemFont);
          fontSuccess = true;
        }
      }
      
      // Apply text direction
      applyTextDirection(newPreferences.textDirection);
      
      // Update state
      newPreferences.fontLoaded = fontSuccess;
      newPreferences.lastUpdated = Date.now();
      setPreferences(newPreferences);
      
      // Save to storage
      savePreferences(newPreferences);
      
      // Dispatch custom event for same-tab listeners (e.g., MeasurementProvider)
      window.dispatchEvent(new CustomEvent('country-changed', {
        detail: { countryCode: country.code }
      }));
      
      // Change i18n language with error handling
      if (i18n.language !== country.defaultLanguage) {
        try {
          await i18n.changeLanguage(country.defaultLanguage);
        } catch (langError) {
          console.warn('Failed to change language, continuing with current language:', langError);
        }
      }
      
    } catch (err) {
      console.error('Error updating country preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      // Fall back to safe defaults
      try {
        const fallbackPreferences = getDefaultPreferences(country);
        fallbackPreferences.fontFamily = getFallbackFontFamily(country);
        fallbackPreferences.mapProvider = getFallbackMapProvider();
        
        await applyFont(fallbackPreferences.fontFamily);
        applyTextDirection(fallbackPreferences.textDirection);
        
        setPreferences(fallbackPreferences);
        savePreferences(fallbackPreferences);
      } catch (fallbackError) {
        console.error('Even fallback preferences failed:', fallbackError);
        // Use absolute minimal defaults
        const minimalPreferences = getDefaultPreferences(DEFAULT_COUNTRY);
        setPreferences(minimalPreferences);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadPreferences, savePreferences, applyFont, applyTextDirection, i18n]);

  // Initialize preferences on mount
  useEffect(() => {
    const initializePreferences = async () => {
      const countryCode = localStorage.getItem(STORAGE_KEYS.COUNTRY) || 'GB';
      const country = getCountryByCode(countryCode) || DEFAULT_COUNTRY;
      await updateCountryPreferences(country);
    };

    initializePreferences();
  }, [updateCountryPreferences]);

  // Listen for country changes from other components
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.COUNTRY && event.newValue) {
        const country = getCountryByCode(event.newValue) || DEFAULT_COUNTRY;
        updateCountryPreferences(country);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [updateCountryPreferences]);

  // Manually change country (for integration with country selector)
  const changeCountry = useCallback(async (countryCode: string) => {
    const country = getCountryByCode(countryCode) || DEFAULT_COUNTRY;
    await updateCountryPreferences(country);
    
    // Dispatch custom event for same-tab listeners (e.g., MeasurementProvider)
    window.dispatchEvent(new CustomEvent('country-changed', {
      detail: { countryCode: country.code }
    }));
  }, [updateCountryPreferences]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    const country = preferences.country;
    const defaultPrefs = getDefaultPreferences(country);
    await updateCountryPreferences(country);
  }, [preferences.country, updateCountryPreferences]);

  // Get current map tiles configuration for MapLibre
  const getMapConfig = useCallback(() => {
    const { mapProvider } = preferences;
    
    return {
      style: {
        version: 8,
        sources: {
          'country-optimized': {
            type: 'raster' as const,
            tiles: [mapProvider.tiles],
            tileSize: 256,
            attribution: mapProvider.attribution,
            maxzoom: mapProvider.maxZoom || 18
          }
        },
        layers: [
          {
            id: 'country-optimized-layer',
            type: 'raster' as const,
            source: 'country-optimized',
            minzoom: 0,
            maxzoom: mapProvider.maxZoom || 18
          }
        ]
      },
      provider: mapProvider.provider,
      attribution: mapProvider.attribution
    };
  }, [preferences]);

  // Check if font is loaded
  const checkFontLoaded = useCallback((): boolean => {
    if (!preferences.fontFamily.googleFonts) {
      return true; // System fonts are always "loaded"
    }

    try {
      // Check if font is in document fonts
      return document.fonts.check(`16px "${preferences.fontFamily.name}"`);
    } catch {
      return preferences.fontLoaded; // Fallback to stored state
    }
  }, [preferences.fontFamily, preferences.fontLoaded]);

  return {
    // Current state
    preferences,
    isLoading,
    error,
    
    // Actions
    changeCountry,
    updateCountryPreferences,
    resetToDefaults,
    
    // Utilities
    getMapConfig,
    checkFontLoaded,
    
    // Computed values
    currentCountry: preferences.country,
    currentFontFamily: preferences.fontFamily,
    currentMapProvider: preferences.mapProvider,
    isRTL: preferences.rtl,
    textDirection: preferences.textDirection,
    fontCSS: generateFontFamilyCSS(preferences.fontFamily)
  };
}

// Utility hook for components that only need font information
export function useCountryFont() {
  const { preferences, fontCSS, checkFontLoaded } = useCountryPreferences();
  
  return {
    fontFamily: preferences.fontFamily,
    fontCSS,
    isRTL: preferences.rtl,
    textDirection: preferences.textDirection,
    fontLoaded: checkFontLoaded()
  };
}

// Utility hook for components that only need map information  
export function useCountryMap() {
  const { preferences, getMapConfig } = useCountryPreferences();
  
  return {
    mapProvider: preferences.mapProvider,
    getMapConfig,
    country: preferences.country
  };
}