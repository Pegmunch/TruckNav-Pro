/**
 * Comprehensive Country Database for TruckNav Pro
 * Patent-protected by Bespoke Marketing.Ai Ltd
 * Supports international trucking navigation and localization
 */

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  code3: string; // ISO 3166-1 alpha-3
  name: string; // English name
  nativeName: string; // Native language name
  flag: string; // Unicode flag emoji
  continent: string; // Continent/Region
  languages: string[]; // Supported language codes (e.g., ['en-US'])
  defaultLanguage: string; // Primary language code
  currency: string; // Currency code (ISO 4217)
  timezone: string; // Primary timezone
  drivingSide: 'left' | 'right'; // Driving side
  truckingMarket: boolean; // Major trucking market
  amazonRegion?: string; // Amazon marketplace region
  phoneCode: string; // International dialing code
  coordinates: [number, number]; // [lat, lng] center coordinates
}

export interface CountryGroup {
  id: string;
  name: string;
  countries: string[]; // Array of country codes
  displayOrder: number;
}

// Comprehensive country data supporting all major trucking markets
export const countries: Country[] = [
  // North America - Major Trucking Markets
  {
    code: 'US',
    code3: 'USA',
    name: 'United States',
    nativeName: 'United States',
    flag: '🇺🇸',
    continent: 'North America',
    languages: ['en-US', 'es-US'],
    defaultLanguage: 'en-US',
    currency: 'USD',
    timezone: 'America/New_York',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'com',
    phoneCode: '+1',
    coordinates: [39.8283, -98.5795]
  },
  {
    code: 'CA',
    code3: 'CAN',
    name: 'Canada',
    nativeName: 'Canada',
    flag: '🇨🇦',
    continent: 'North America',
    languages: ['en-CA', 'fr-CA'],
    defaultLanguage: 'en-CA',
    currency: 'CAD',
    timezone: 'America/Toronto',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'ca',
    phoneCode: '+1',
    coordinates: [56.1304, -106.3468]
  },
  {
    code: 'MX',
    code3: 'MEX',
    name: 'Mexico',
    nativeName: 'México',
    flag: '🇲🇽',
    continent: 'North America',
    languages: ['es-MX', 'en-US'],
    defaultLanguage: 'es-MX',
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'com.mx',
    phoneCode: '+52',
    coordinates: [23.6345, -102.5528]
  },

  // Europe - Major Trucking Markets
  {
    code: 'GB',
    code3: 'GBR',
    name: 'United Kingdom',
    nativeName: 'United Kingdom',
    flag: '🇬🇧',
    continent: 'Europe',
    languages: ['en-GB'],
    defaultLanguage: 'en-GB',
    currency: 'GBP',
    timezone: 'Europe/London',
    drivingSide: 'left',
    truckingMarket: true,
    amazonRegion: 'co.uk',
    phoneCode: '+44',
    coordinates: [55.3781, -3.4360]
  },
  {
    code: 'DE',
    code3: 'DEU',
    name: 'Germany',
    nativeName: 'Deutschland',
    flag: '🇩🇪',
    continent: 'Europe',
    languages: ['de-DE', 'en-GB'],
    defaultLanguage: 'de-DE',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'de',
    phoneCode: '+49',
    coordinates: [51.1657, 10.4515]
  },
  {
    code: 'FR',
    code3: 'FRA',
    name: 'France',
    nativeName: 'France',
    flag: '🇫🇷',
    continent: 'Europe',
    languages: ['fr-FR', 'en-GB'],
    defaultLanguage: 'fr-FR',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'fr',
    phoneCode: '+33',
    coordinates: [46.2276, 2.2137]
  },
  {
    code: 'ES',
    code3: 'ESP',
    name: 'Spain',
    nativeName: 'España',
    flag: '🇪🇸',
    continent: 'Europe',
    languages: ['es-ES', 'en-GB'],
    defaultLanguage: 'es-ES',
    currency: 'EUR',
    timezone: 'Europe/Madrid',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'es',
    phoneCode: '+34',
    coordinates: [40.4637, -3.7492]
  },
  {
    code: 'IT',
    code3: 'ITA',
    name: 'Italy',
    nativeName: 'Italia',
    flag: '🇮🇹',
    continent: 'Europe',
    languages: ['it-IT', 'en-GB'],
    defaultLanguage: 'it-IT',
    currency: 'EUR',
    timezone: 'Europe/Rome',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'it',
    phoneCode: '+39',
    coordinates: [41.8719, 12.5674]
  },
  {
    code: 'NL',
    code3: 'NLD',
    name: 'Netherlands',
    nativeName: 'Nederland',
    flag: '🇳🇱',
    continent: 'Europe',
    languages: ['nl-NL', 'en-GB'],
    defaultLanguage: 'nl-NL',
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'nl',
    phoneCode: '+31',
    coordinates: [52.1326, 5.2913]
  },
  {
    code: 'BE',
    code3: 'BEL',
    name: 'Belgium',
    nativeName: 'België / Belgique',
    flag: '🇧🇪',
    continent: 'Europe',
    languages: ['nl-BE', 'fr-BE', 'en-GB'],
    defaultLanguage: 'nl-BE',
    currency: 'EUR',
    timezone: 'Europe/Brussels',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+32',
    coordinates: [50.5039, 4.4699]
  },
  {
    code: 'PL',
    code3: 'POL',
    name: 'Poland',
    nativeName: 'Polska',
    flag: '🇵🇱',
    continent: 'Europe',
    languages: ['pl-PL', 'en-GB'],
    defaultLanguage: 'pl-PL',
    currency: 'PLN',
    timezone: 'Europe/Warsaw',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'pl',
    phoneCode: '+48',
    coordinates: [51.9194, 19.1451]
  },
  {
    code: 'CZ',
    code3: 'CZE',
    name: 'Czech Republic',
    nativeName: 'Česká republika',
    flag: '🇨🇿',
    continent: 'Europe',
    languages: ['cs-CZ', 'en-GB'],
    defaultLanguage: 'cs-CZ',
    currency: 'CZK',
    timezone: 'Europe/Prague',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+420',
    coordinates: [49.8175, 15.4730]
  },
  {
    code: 'AT',
    code3: 'AUT',
    name: 'Austria',
    nativeName: 'Österreich',
    flag: '🇦🇹',
    continent: 'Europe',
    languages: ['de-AT', 'en-GB'],
    defaultLanguage: 'de-AT',
    currency: 'EUR',
    timezone: 'Europe/Vienna',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+43',
    coordinates: [47.5162, 14.5501]
  },
  {
    code: 'CH',
    code3: 'CHE',
    name: 'Switzerland',
    nativeName: 'Schweiz / Suisse / Svizzera',
    flag: '🇨🇭',
    continent: 'Europe',
    languages: ['de-CH', 'fr-CH', 'it-CH', 'en-GB'],
    defaultLanguage: 'de-CH',
    currency: 'CHF',
    timezone: 'Europe/Zurich',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+41',
    coordinates: [46.8182, 8.2275]
  },
  {
    code: 'NO',
    code3: 'NOR',
    name: 'Norway',
    nativeName: 'Norge',
    flag: '🇳🇴',
    continent: 'Europe',
    languages: ['nb-NO', 'en-GB'],
    defaultLanguage: 'nb-NO',
    currency: 'NOK',
    timezone: 'Europe/Oslo',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+47',
    coordinates: [60.4720, 8.4689]
  },
  {
    code: 'SE',
    code3: 'SWE',
    name: 'Sweden',
    nativeName: 'Sverige',
    flag: '🇸🇪',
    continent: 'Europe',
    languages: ['sv-SE', 'en-GB'],
    defaultLanguage: 'sv-SE',
    currency: 'SEK',
    timezone: 'Europe/Stockholm',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'se',
    phoneCode: '+46',
    coordinates: [60.1282, 18.6435]
  },
  {
    code: 'DK',
    code3: 'DNK',
    name: 'Denmark',
    nativeName: 'Danmark',
    flag: '🇩🇰',
    continent: 'Europe',
    languages: ['da-DK', 'en-GB'],
    defaultLanguage: 'da-DK',
    currency: 'DKK',
    timezone: 'Europe/Copenhagen',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+45',
    coordinates: [56.2639, 9.5018]
  },
  {
    code: 'FI',
    code3: 'FIN',
    name: 'Finland',
    nativeName: 'Suomi',
    flag: '🇫🇮',
    continent: 'Europe',
    languages: ['fi-FI', 'sv-FI', 'en-GB'],
    defaultLanguage: 'fi-FI',
    currency: 'EUR',
    timezone: 'Europe/Helsinki',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+358',
    coordinates: [61.9241, 25.7482]
  },
  {
    code: 'TR',
    code3: 'TUR',
    name: 'Turkey',
    nativeName: 'Türkiye',
    flag: '🇹🇷',
    continent: 'Europe',
    languages: ['tr-TR', 'en-GB'],
    defaultLanguage: 'tr-TR',
    currency: 'TRY',
    timezone: 'Europe/Istanbul',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'com.tr',
    phoneCode: '+90',
    coordinates: [38.9637, 35.2433]
  },
  {
    code: 'RU',
    code3: 'RUS',
    name: 'Russia',
    nativeName: 'Россия',
    flag: '🇷🇺',
    continent: 'Europe',
    languages: ['ru-RU', 'en-GB'],
    defaultLanguage: 'ru-RU',
    currency: 'RUB',
    timezone: 'Europe/Moscow',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'ru',
    phoneCode: '+7',
    coordinates: [61.5240, 105.3188]
  },
  {
    code: 'IE',
    code3: 'IRL',
    name: 'Ireland',
    nativeName: 'Éire',
    flag: '🇮🇪',
    continent: 'Europe',
    languages: ['en-IE', 'ga-IE'],
    defaultLanguage: 'en-IE',
    currency: 'EUR',
    timezone: 'Europe/Dublin',
    drivingSide: 'left',
    truckingMarket: true,
    phoneCode: '+353',
    coordinates: [53.1424, -7.6921]
  },
  {
    code: 'PT',
    code3: 'PRT',
    name: 'Portugal',
    nativeName: 'Portugal',
    flag: '🇵🇹',
    continent: 'Europe',
    languages: ['pt-PT', 'en-GB'],
    defaultLanguage: 'pt-PT',
    currency: 'EUR',
    timezone: 'Europe/Lisbon',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+351',
    coordinates: [39.3999, -8.2245]
  },

  // Asia-Pacific - Major Markets
  {
    code: 'AU',
    code3: 'AUS',
    name: 'Australia',
    nativeName: 'Australia',
    flag: '🇦🇺',
    continent: 'Asia-Pacific',
    languages: ['en-AU'],
    defaultLanguage: 'en-AU',
    currency: 'AUD',
    timezone: 'Australia/Sydney',
    drivingSide: 'left',
    truckingMarket: true,
    amazonRegion: 'com.au',
    phoneCode: '+61',
    coordinates: [-25.2744, 133.7751]
  },
  {
    code: 'NZ',
    code3: 'NZL',
    name: 'New Zealand',
    nativeName: 'New Zealand',
    flag: '🇳🇿',
    continent: 'Asia-Pacific',
    languages: ['en-NZ'],
    defaultLanguage: 'en-NZ',
    currency: 'NZD',
    timezone: 'Pacific/Auckland',
    drivingSide: 'left',
    truckingMarket: true,
    phoneCode: '+64',
    coordinates: [-40.9006, 174.8860]
  },
  {
    code: 'JP',
    code3: 'JPN',
    name: 'Japan',
    nativeName: '日本',
    flag: '🇯🇵',
    continent: 'Asia-Pacific',
    languages: ['ja-JP', 'en-US'],
    defaultLanguage: 'ja-JP',
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
    drivingSide: 'left',
    truckingMarket: true,
    amazonRegion: 'co.jp',
    phoneCode: '+81',
    coordinates: [36.2048, 138.2529]
  },
  {
    code: 'KR',
    code3: 'KOR',
    name: 'South Korea',
    nativeName: '대한민국',
    flag: '🇰🇷',
    continent: 'Asia-Pacific',
    languages: ['ko-KR', 'en-US'],
    defaultLanguage: 'ko-KR',
    currency: 'KRW',
    timezone: 'Asia/Seoul',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'kr',
    phoneCode: '+82',
    coordinates: [35.9078, 127.7669]
  },
  {
    code: 'CN',
    code3: 'CHN',
    name: 'China',
    nativeName: '中国',
    flag: '🇨🇳',
    continent: 'Asia-Pacific',
    languages: ['zh-CN', 'en-US'],
    defaultLanguage: 'zh-CN',
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'cn',
    phoneCode: '+86',
    coordinates: [35.8617, 104.1954]
  },
  {
    code: 'IN',
    code3: 'IND',
    name: 'India',
    nativeName: 'भारत',
    flag: '🇮🇳',
    continent: 'Asia-Pacific',
    languages: ['hi-IN', 'en-IN'],
    defaultLanguage: 'hi-IN',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    drivingSide: 'left',
    truckingMarket: true,
    amazonRegion: 'in',
    phoneCode: '+91',
    coordinates: [20.5937, 78.9629]
  },
  {
    code: 'SG',
    code3: 'SGP',
    name: 'Singapore',
    nativeName: 'Singapore',
    flag: '🇸🇬',
    continent: 'Asia-Pacific',
    languages: ['en-SG', 'zh-SG'],
    defaultLanguage: 'en-SG',
    currency: 'SGD',
    timezone: 'Asia/Singapore',
    drivingSide: 'left',
    truckingMarket: true,
    amazonRegion: 'sg',
    phoneCode: '+65',
    coordinates: [1.3521, 103.8198]
  },
  {
    code: 'MY',
    code3: 'MYS',
    name: 'Malaysia',
    nativeName: 'Malaysia',
    flag: '🇲🇾',
    continent: 'Asia-Pacific',
    languages: ['ms-MY', 'en-MY'],
    defaultLanguage: 'ms-MY',
    currency: 'MYR',
    timezone: 'Asia/Kuala_Lumpur',
    drivingSide: 'left',
    truckingMarket: true,
    phoneCode: '+60',
    coordinates: [4.2105, 101.9758]
  },
  {
    code: 'TH',
    code3: 'THA',
    name: 'Thailand',
    nativeName: 'ไทย',
    flag: '🇹🇭',
    continent: 'Asia-Pacific',
    languages: ['th-TH', 'en-US'],
    defaultLanguage: 'th-TH',
    currency: 'THB',
    timezone: 'Asia/Bangkok',
    drivingSide: 'left',
    truckingMarket: true,
    phoneCode: '+66',
    coordinates: [15.8700, 100.9925]
  },

  // Middle East & Africa
  {
    code: 'AE',
    code3: 'ARE',
    name: 'United Arab Emirates',
    nativeName: 'دولة الإمارات العربية المتحدة',
    flag: '🇦🇪',
    continent: 'Middle East',
    languages: ['ar-AE', 'en-US'],
    defaultLanguage: 'ar-AE',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'ae',
    phoneCode: '+971',
    coordinates: [23.4241, 53.8478]
  },
  {
    code: 'SA',
    code3: 'SAU',
    name: 'Saudi Arabia',
    nativeName: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    continent: 'Middle East',
    languages: ['ar-SA', 'en-US'],
    defaultLanguage: 'ar-SA',
    currency: 'SAR',
    timezone: 'Asia/Riyadh',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'sa',
    phoneCode: '+966',
    coordinates: [23.8859, 45.0792]
  },
  {
    code: 'ZA',
    code3: 'ZAF',
    name: 'South Africa',
    nativeName: 'South Africa',
    flag: '🇿🇦',
    continent: 'Africa',
    languages: ['en-ZA', 'af-ZA'],
    defaultLanguage: 'en-ZA',
    currency: 'ZAR',
    timezone: 'Africa/Johannesburg',
    drivingSide: 'left',
    truckingMarket: true,
    phoneCode: '+27',
    coordinates: [-30.5595, 22.9375]
  },
  {
    code: 'IL',
    code3: 'ISR',
    name: 'Israel',
    nativeName: 'ישראל',
    flag: '🇮🇱',
    continent: 'Middle East',
    languages: ['he-IL', 'ar-IL', 'en-US'],
    defaultLanguage: 'he-IL',
    currency: 'ILS',
    timezone: 'Asia/Jerusalem',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+972',
    coordinates: [31.0461, 34.8516]
  },

  // South America
  {
    code: 'BR',
    code3: 'BRA',
    name: 'Brazil',
    nativeName: 'Brasil',
    flag: '🇧🇷',
    continent: 'South America',
    languages: ['pt-BR', 'en-US'],
    defaultLanguage: 'pt-BR',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    drivingSide: 'right',
    truckingMarket: true,
    amazonRegion: 'com.br',
    phoneCode: '+55',
    coordinates: [-14.2350, -51.9253]
  },
  {
    code: 'AR',
    code3: 'ARG',
    name: 'Argentina',
    nativeName: 'Argentina',
    flag: '🇦🇷',
    continent: 'South America',
    languages: ['es-AR', 'en-US'],
    defaultLanguage: 'es-AR',
    currency: 'ARS',
    timezone: 'America/Argentina/Buenos_Aires',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+54',
    coordinates: [-38.4161, -63.6167]
  },
  {
    code: 'CL',
    code3: 'CHL',
    name: 'Chile',
    nativeName: 'Chile',
    flag: '🇨🇱',
    continent: 'South America',
    languages: ['es-CL', 'en-US'],
    defaultLanguage: 'es-CL',
    currency: 'CLP',
    timezone: 'America/Santiago',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+56',
    coordinates: [-35.6751, -71.5430]
  },
  {
    code: 'CO',
    code3: 'COL',
    name: 'Colombia',
    nativeName: 'Colombia',
    flag: '🇨🇴',
    continent: 'South America',
    languages: ['es-CO', 'en-US'],
    defaultLanguage: 'es-CO',
    currency: 'COP',
    timezone: 'America/Bogota',
    drivingSide: 'right',
    truckingMarket: true,
    phoneCode: '+57',
    coordinates: [4.5709, -74.2973]
  }
];

// Regional country groupings for organization
export const countryGroups: CountryGroup[] = [
  {
    id: 'north-america',
    name: 'North America',
    countries: ['US', 'CA', 'MX'],
    displayOrder: 1
  },
  {
    id: 'europe-west',
    name: 'Western Europe',
    countries: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'IE', 'PT'],
    displayOrder: 2
  },
  {
    id: 'europe-north',
    name: 'Northern Europe',
    countries: ['NO', 'SE', 'DK', 'FI'],
    displayOrder: 3
  },
  {
    id: 'europe-east',
    name: 'Eastern Europe',
    countries: ['PL', 'CZ', 'RU', 'TR'],
    displayOrder: 4
  },
  {
    id: 'asia-pacific',
    name: 'Asia-Pacific',
    countries: ['AU', 'NZ', 'JP', 'KR', 'CN', 'IN', 'SG', 'MY', 'TH'],
    displayOrder: 5
  },
  {
    id: 'middle-east-africa',
    name: 'Middle East & Africa',
    countries: ['AE', 'SA', 'ZA', 'IL'],
    displayOrder: 6
  },
  {
    id: 'south-america',
    name: 'South America',
    countries: ['BR', 'AR', 'CL', 'CO'],
    displayOrder: 7
  }
];

// Utility functions for country data manipulation
export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(country => 
    country.code.toLowerCase() === code.toLowerCase() || 
    country.code3.toLowerCase() === code.toLowerCase()
  );
};

export const getCountriesByContinent = (continent: string): Country[] => {
  return countries.filter(country => country.continent === continent);
};

export const getTruckingMarkets = (): Country[] => {
  return countries.filter(country => country.truckingMarket);
};

export const getCountriesByLanguage = (languageCode: string): Country[] => {
  return countries.filter(country => 
    country.languages.includes(languageCode) || 
    country.defaultLanguage === languageCode
  );
};

export const searchCountries = (query: string): Country[] => {
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) return countries;
  
  return countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm) ||
    country.nativeName.toLowerCase().includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm) ||
    country.code3.toLowerCase().includes(searchTerm)
  );
};

export const getCountriesGrouped = (): { [key: string]: Country[] } => {
  const grouped: { [key: string]: Country[] } = {};
  
  countryGroups
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .forEach(group => {
      grouped[group.name] = group.countries
        .map(code => getCountryByCode(code))
        .filter((country): country is Country => country !== undefined);
    });
  
  return grouped;
};

// Default country for fallback (can be overridden by user preference or geolocation)
export const DEFAULT_COUNTRY: Country = getCountryByCode('US')!;