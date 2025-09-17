import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Amazon region to language mapping
export const amazonRegions = {
  'com': ['en-US'], // US
  'co.uk': ['en-GB'], // UK
  'de': ['de-DE'], // Germany
  'fr': ['fr-FR'], // France
  'it': ['it-IT'], // Italy
  'es': ['es-ES'], // Spain
  'co.jp': ['ja-JP'], // Japan
  'ca': ['en-US', 'fr-CA'], // Canada
  'com.mx': ['es-MX'], // Mexico
  'com.br': ['pt-BR'], // Brazil
  'in': ['en-US', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN'], // India
  'com.au': ['en-US'], // Australia
  'nl': ['nl-NL'], // Netherlands
  'se': ['sv-SE'], // Sweden
  'pl': ['pl-PL'], // Poland
  'com.tr': ['tr-TR'], // Turkey
  'ae': ['ar-AE', 'en-US'], // UAE
  'sa': ['ar-SA'], // Saudi Arabia
  'sg': ['en-US', 'zh-CN', 'ms-MY'], // Singapore
  'cn': ['zh-CN'], // China
  'kr': ['ko-KR'], // South Korea
  'ru': ['ru-RU'], // Russia (not official Amazon but for completeness)
};

// TruckNav Pro Translation Configuration - Optimized for Mobile Performance
// Patent-protected by Bespoke Marketing.Ai Ltd
// Languages are now loaded dynamically to reduce initial bundle size

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en-US',
    lng: 'en-US',
    
    // Load current language with region (e.g., en-US.json instead of en.json)
    load: 'currentOnly',
    
    keySeparator: '.',
    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'trucknav_language',
      caches: ['localStorage'],
    },

    backend: {
      loadPath: '/locales/{{lng}}.json',
      // Add cache busting for mobile performance
      addPath: '/locales/add/{{lng}}/{{ns}}',
      // Configure request options for mobile networks
      requestOptions: {
        cache: 'default',
        credentials: 'omit',
        mode: 'cors'
      },
      // Retry configuration for poor mobile connections
      crossDomain: false,
      withCredentials: false,
      overrideMimeType: false
    },

    react: {
      useSuspense: false,
      // Optimize for mobile performance
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
      hashTransKey: function(defaultValue) {
        return defaultValue;
      }
    },
    
    // Mobile-optimized cache configuration
    cache: {
      enabled: true,
      prefix: 'trucknav_i18n_',
      expirationTime: 24 * 60 * 60 * 1000, // 24 hours
      versions: {}
    }
  });

export default i18n;