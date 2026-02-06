/**
 * Country-based Map and Font Configuration Utilities
 * Patent-protected by Bespoke Marketing. Ai Ltd
 * Provides automatic map provider and font selection based on selected country
 */

import { Country } from '@/data/countries';

// Script types for font selection
export type ScriptType = 'latin' | 'cyrillic' | 'arabic' | 'chinese' | 'japanese' | 'korean' | 'devanagari' | 'thai';

// Map provider types
export type MapProvider = 'openstreetmap' | 'google' | 'amap' | 'yandex' | 'here' | 'mapbox';

// Font families with script support
export interface FontFamily {
  name: string;
  fallback: string[];
  scripts: ScriptType[];
  googleFonts?: string; // Google Fonts import URL if needed
}

// Map provider configuration
export interface MapProviderConfig {
  provider: MapProvider;
  tiles: string;
  attribution: string;
  maxZoom?: number;
  apiKey?: string;
}

// Comprehensive font families with script support
export const fontFamilies: Record<string, FontFamily> = {
  // Latin script fonts
  roboto: {
    name: 'Roboto',
    fallback: ['system-ui', 'sans-serif'],
    scripts: ['latin'],
    googleFonts: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'
  },
  
  inter: {
    name: 'Inter',
    fallback: ['system-ui', 'sans-serif'],
    scripts: ['latin'],
    googleFonts: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
  },

  // Multi-script fonts
  notoSans: {
    name: 'Noto Sans',
    fallback: ['system-ui', 'sans-serif'],
    scripts: ['latin', 'cyrillic', 'arabic', 'devanagari', 'thai'],
    googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@300;400;500;600;700&display=swap'
  },

  // Cyrillic support
  sourceCodePro: {
    name: 'Source Sans Pro',
    fallback: ['system-ui', 'sans-serif'],
    scripts: ['latin', 'cyrillic'],
    googleFonts: 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700&display=swap'
  },

  // Arabic script
  notoSansArabic: {
    name: 'Noto Sans Arabic',
    fallback: ['Tahoma', 'Arial Unicode MS', 'sans-serif'],
    scripts: ['arabic'],
    googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap'
  },

  // Chinese script
  notoSansSC: {
    name: 'Noto Sans SC',
    fallback: ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
    scripts: ['chinese'],
    googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap'
  },

  notoSansTC: {
    name: 'Noto Sans TC',
    fallback: ['PingFang TC', 'Hiragino Sans CNS', 'Microsoft JhengHei', 'sans-serif'],
    scripts: ['chinese'],
    googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700&display=swap'
  },

  // Japanese script
  notoSansJP: {
    name: 'Noto Sans JP',
    fallback: ['Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', 'sans-serif'],
    scripts: ['japanese'],
    googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap'
  },

  // Korean script
  notoSansKR: {
    name: 'Noto Sans KR',
    fallback: ['Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
    scripts: ['korean'],
    googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap'
  },

  // Devanagari script (Hindi, Sanskrit)
  notoSansDevanagari: {
    name: 'Noto Sans Devanagari',
    fallback: ['Mangal', 'Kokila', 'sans-serif'],
    scripts: ['devanagari'],
    googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@300;400;500;600;700&display=swap'
  },

  // Thai script
  notoSansThai: {
    name: 'Noto Sans Thai',
    fallback: ['Leelawadee UI', 'Thonburi', 'sans-serif'],
    scripts: ['thai'],
    googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap'
  }
};

// Map provider configurations
export const mapProviders: Record<MapProvider, MapProviderConfig> = {
  openstreetmap: {
    provider: 'openstreetmap',
    tiles: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  },
  
  google: {
    provider: 'google',
    tiles: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '© Google Maps',
    maxZoom: 20
  },

  amap: {
    provider: 'amap',
    tiles: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    attribution: '© AutoNavi',
    maxZoom: 18
  },

  yandex: {
    provider: 'yandex',
    tiles: 'https://core-carparks-renderer-lots.maps.yandex.net/maps-rdr-carparks/tiles?l=carparks&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
    attribution: '© Yandex Maps',
    maxZoom: 18
  },

  here: {
    provider: 'here',
    tiles: 'https://1.base.maps.ls.hereapi.com/maptile/2.1/maptile/newest/normal.day/{z}/{x}/{y}/512/png8?apikey={apikey}',
    attribution: '© HERE Maps',
    maxZoom: 20,
    apiKey: 'required'
  },

  mapbox: {
    provider: 'mapbox',
    tiles: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token={accessToken}',
    attribution: '© Mapbox © OpenStreetMap',
    maxZoom: 22,
    apiKey: 'required'
  }
};

// Language to script mapping
export const languageToScript: Record<string, ScriptType> = {
  // Latin scripts
  'en-US': 'latin',
  'en-GB': 'latin',
  'en-CA': 'latin',
  'es-ES': 'latin',
  'es-MX': 'latin',
  'fr-FR': 'latin',
  'fr-CA': 'latin',
  'de-DE': 'latin',
  'it-IT': 'latin',
  'pt-BR': 'latin',
  'nl-NL': 'latin',
  'pl-PL': 'latin',
  'tr-TR': 'latin',

  // Cyrillic scripts
  'ru-RU': 'cyrillic',

  // Arabic scripts
  'ar-SA': 'arabic',

  // Chinese scripts
  'zh-CN': 'chinese',
  'zh-TW': 'chinese',

  // Japanese script
  'ja-JP': 'japanese',

  // Korean script
  'ko-KR': 'korean',

  // Devanagari scripts
  'hi-IN': 'devanagari',

  // Thai script
  'th-TH': 'thai'
};

// Country to preferred map provider mapping
export const countryToMapProvider: Record<string, MapProvider> = {
  // China - AMap for best local coverage
  'CN': 'amap',

  // Russia - Yandex for local coverage
  'RU': 'yandex',

  // Google Maps regions (high coverage and detail)
  'US': 'google',
  'CA': 'google',
  'GB': 'google',
  'DE': 'google',
  'FR': 'google',
  'IT': 'google',
  'ES': 'google',
  'NL': 'google',
  'AU': 'google',
  'JP': 'google',
  'KR': 'google',
  'IN': 'google',
  'BR': 'google',
  'MX': 'google',

  // HERE Maps regions (good for Europe)
  'NO': 'here',
  'SE': 'here',
  'DK': 'here',
  'FI': 'here',

  // Default to OpenStreetMap for other regions
  // (will be used as fallback)
};

// Script to preferred font mapping
export const scriptToFontFamily: Record<ScriptType, string> = {
  'latin': 'notoSans', // Use Noto Sans for broad support
  'cyrillic': 'notoSans', // Noto Sans has good Cyrillic support
  'arabic': 'notoSansArabic',
  'chinese': 'notoSansSC', // Default to Simplified Chinese
  'japanese': 'notoSansJP',
  'korean': 'notoSansKR',
  'devanagari': 'notoSansDevanagari',
  'thai': 'notoSansThai'
};

// Extended configuration for specific countries
export const countrySpecificConfig: Record<string, {
  fontFamily?: string;
  mapProvider?: MapProvider;
  rtl?: boolean; // Right-to-left text support
  textDirection?: 'ltr' | 'rtl';
}> = {
  'CN': {
    fontFamily: 'notoSansSC',
    mapProvider: 'amap'
  },
  'TW': {
    fontFamily: 'notoSansTC',
    mapProvider: 'google'
  },
  'HK': {
    fontFamily: 'notoSansTC',
    mapProvider: 'google'
  },
  'JP': {
    fontFamily: 'notoSansJP',
    mapProvider: 'google'
  },
  'KR': {
    fontFamily: 'notoSansKR',
    mapProvider: 'google'
  },
  'RU': {
    fontFamily: 'notoSans', // Good Cyrillic support
    mapProvider: 'yandex'
  },
  'SA': {
    fontFamily: 'notoSansArabic',
    mapProvider: 'google',
    rtl: true,
    textDirection: 'rtl'
  },
  'IN': {
    fontFamily: 'notoSansDevanagari',
    mapProvider: 'google'
  },
  'TH': {
    fontFamily: 'notoSansThai',
    mapProvider: 'google'
  }
};

/**
 * Get the appropriate font family for a country
 */
export function getFontFamilyForCountry(country: Country): FontFamily {
  // Check for country-specific configuration first
  const countryConfig = countrySpecificConfig[country.code];
  if (countryConfig?.fontFamily) {
    return fontFamilies[countryConfig.fontFamily];
  }

  // Fall back to script-based selection
  const script = languageToScript[country.defaultLanguage] || 'latin';
  const fontFamilyKey = scriptToFontFamily[script];
  
  return fontFamilies[fontFamilyKey] || fontFamilies.notoSans;
}

/**
 * Get the appropriate map provider for a country
 */
export function getMapProviderForCountry(country: Country): MapProviderConfig {
  // Check for country-specific configuration first
  const countryConfig = countrySpecificConfig[country.code];
  if (countryConfig?.mapProvider) {
    return mapProviders[countryConfig.mapProvider];
  }

  // Fall back to country-to-provider mapping
  const provider = countryToMapProvider[country.code] || 'openstreetmap';
  return mapProviders[provider];
}

/**
 * Get all scripts supported by a country's languages
 */
export function getSupportedScripts(country: Country): ScriptType[] {
  const scripts = new Set<ScriptType>();
  
  country.languages.forEach(lang => {
    const script = languageToScript[lang];
    if (script) {
      scripts.add(script);
    }
  });

  return Array.from(scripts);
}

/**
 * Check if a font family supports all required scripts for a country
 */
export function fontSupportsCountry(fontFamily: FontFamily, country: Country): boolean {
  const requiredScripts = getSupportedScripts(country);
  return requiredScripts.every(script => fontFamily.scripts.includes(script));
}

/**
 * Generate CSS font-family string with proper fallbacks
 */
export function generateFontFamilyCSS(fontFamily: FontFamily): string {
  const fonts = [
    `'${fontFamily.name}'`,
    ...fontFamily.fallback.map(font => font.includes(' ') ? `'${font}'` : font)
  ];
  
  return fonts.join(', ');
}

/**
 * Check if a country uses right-to-left text
 */
export function isRTL(country: Country): boolean {
  const countryConfig = countrySpecificConfig[country.code];
  return countryConfig?.rtl || false;
}

/**
 * Get text direction for a country
 */
export function getTextDirection(country: Country): 'ltr' | 'rtl' {
  const countryConfig = countrySpecificConfig[country.code];
  return countryConfig?.textDirection || 'ltr';
}

/**
 * Load Google Fonts dynamically
 */
export function loadGoogleFont(fontFamily: FontFamily): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!fontFamily.googleFonts) {
      resolve();
      return;
    }

    // Check if already loaded
    const existingLink = document.querySelector(`link[href="${fontFamily.googleFonts}"]`);
    if (existingLink) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontFamily.googleFonts;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load font: ${fontFamily.name}`));
    
    document.head.appendChild(link);
  });
}

/**
 * Get fallback font family if primary font fails to load
 */
export function getFallbackFontFamily(country: Country): FontFamily {
  const script = languageToScript[country.defaultLanguage] || 'latin';
  
  // For non-Latin scripts, fall back to Noto Sans (has broad script support)
  if (script !== 'latin') {
    return fontFamilies.notoSans;
  }
  
  // For Latin scripts, fall back to system fonts
  return {
    name: 'System Font',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    scripts: ['latin']
  };
}

/**
 * Get fallback map provider if primary provider fails
 */
export function getFallbackMapProvider(): MapProviderConfig {
  return mapProviders.openstreetmap;
}