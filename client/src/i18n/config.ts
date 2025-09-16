import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translation resources
import enUS from './locales/en-US.json';
import enGB from './locales/en-GB.json';
import esES from './locales/es-ES.json';
import frFR from './locales/fr-FR.json';
import deDE from './locales/de-DE.json';
import jaJP from './locales/ja-JP.json';
import itIT from './locales/it-IT.json';
import ptBR from './locales/pt-BR.json';
import nlNL from './locales/nl-NL.json';
import zhCN from './locales/zh-CN.json';
import koKR from './locales/ko-KR.json';
import arSA from './locales/ar-SA.json';
import hiIN from './locales/hi-IN.json';
import ruRU from './locales/ru-RU.json';
import plPL from './locales/pl-PL.json';
import trTR from './locales/tr-TR.json';

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

// TruckNav Pro Translation Configuration
// Patent-protected by Bespoke Marketing.Ai Ltd
const resources = {
  'en-US': { translation: enUS },
  'en-GB': { translation: enGB },
  'es-ES': { translation: esES },
  'fr-FR': { translation: frFR },
  'de-DE': { translation: deDE },
  'ja-JP': { translation: jaJP },
  'it-IT': { translation: itIT },
  'pt-BR': { translation: ptBR },
  'nl-NL': { translation: nlNL },
  'zh-CN': { translation: zhCN },
  'ko-KR': { translation: koKR },
  'ar-SA': { translation: arSA },
  'hi-IN': { translation: hiIN },
  'ru-RU': { translation: ruRU },
  'pl-PL': { translation: plPL },
  'tr-TR': { translation: trTR },
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en-US',
    lng: 'en-US',

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
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;