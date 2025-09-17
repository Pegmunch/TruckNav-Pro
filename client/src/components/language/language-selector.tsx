import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Globe, ChevronDown } from "lucide-react";
import { amazonRegions } from '@/i18n/config';
import CountryLanguageSelector, { SimpleCountrySelector } from '@/components/country/country-language-selector';
import { detectUserCountry, getPreferredLanguageForCountry, saveUserPreferences } from '@/lib/country-utils';
import { getCountryByCode } from '@/data/countries';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'button' | 'country-first';
  className?: string;
  showCountryFlags?: boolean;
}

// Enhanced LanguageSelector with country flag support
// Now integrates with comprehensive country-language system
const LanguageSelector = memo(function LanguageSelector({ 
  variant = 'dropdown', 
  className = '',
  showCountryFlags = true 
}: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();

  // Memoize languages array to prevent recreation on every render
  const languages = useMemo(() => [
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸', amazonRegion: 'com' },
    { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧', amazonRegion: 'co.uk' },
    { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪', amazonRegion: 'de' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷', amazonRegion: 'fr' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸', amazonRegion: 'es' },
    { code: 'it-IT', name: 'Italiano', flag: '🇮🇹', amazonRegion: 'it' },
    { code: 'pt-BR', name: 'Português (BR)', flag: '🇧🇷', amazonRegion: 'com.br' },
    { code: 'nl-NL', name: 'Nederlands', flag: '🇳🇱', amazonRegion: 'nl' },
    { code: 'ja-JP', name: '日本語', flag: '🇯🇵', amazonRegion: 'co.jp' },
    { code: 'zh-CN', name: '中文', flag: '🇨🇳', amazonRegion: 'cn' },
    { code: 'ko-KR', name: '한국어', flag: '🇰🇷', amazonRegion: 'kr' },
    { code: 'ar-SA', name: 'العربية', flag: '🇸🇦', amazonRegion: 'sa' },
    { code: 'hi-IN', name: 'हिन्दी', flag: '🇮🇳', amazonRegion: 'in' },
    { code: 'ru-RU', name: 'Русский', flag: '🇷🇺', amazonRegion: 'ru' },
    { code: 'pl-PL', name: 'Polski', flag: '🇵🇱', amazonRegion: 'pl' },
    { code: 'tr-TR', name: 'Türkçe', flag: '🇹🇷', amazonRegion: 'com.tr' },
  ], []);

  // Memoize current language lookup
  const currentLanguage = useMemo(() => 
    languages.find(lang => lang.code === i18n.language) || languages[0],
    [languages, i18n.language]
  );

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('trucknav_language', languageCode);
    
    // Update Amazon region for better localization
    const selectedLang = languages.find(lang => lang.code === languageCode);
    if (selectedLang?.amazonRegion) {
      localStorage.setItem('trucknav_amazon_region', selectedLang.amazonRegion);
    }
  };

  // Handle country-first selection mode
  const handleCountryLanguageChange = (countryCode: string, languageCode: string) => {
    i18n.changeLanguage(languageCode);
    // Use the actually selected country, not the detected one
    const selectedCountry = getCountryByCode(countryCode);
    if (selectedCountry) {
      saveUserPreferences(selectedCountry, languageCode);
    }
  };

  // Use new country-first variant for enhanced experience
  if (variant === 'country-first') {
    return (
      <CountryLanguageSelector
        value={i18n.language}
        onValueChange={handleCountryLanguageChange}
        variant="default"
        showFavorites={true}
        showRecent={true}
        showTruckingMarkets={true}
        className={className}
      />
    );
  }

  if (variant === 'button') {
    return (
      <SimpleCountrySelector
        value={i18n.language}
        onValueChange={(countryCode) => {
          // Use the selected country, not the detected one
          const selectedCountry = getCountryByCode(countryCode);
          if (selectedCountry) {
            const language = getPreferredLanguageForCountry(selectedCountry);
            handleCountryLanguageChange(countryCode, language);
          }
        }}
        className={`flex items-center gap-2 ${className}`}
      />
    );
  }

  // Enhanced dropdown with country flags if enabled
  if (showCountryFlags) {
    return (
      <CountryLanguageSelector
        value={i18n.language}
        onValueChange={handleCountryLanguageChange}
        variant="default"
        showFavorites={false}
        showRecent={false}
        showTruckingMarkets={false}
        className={className}
      />
    );
  }

  // Fallback to traditional language selector
  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className={`w-[180px] ${className}`} data-testid="select-language">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          <SelectValue placeholder={t('common.language')} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((language) => (
          <SelectItem key={language.code} value={language.code} data-testid={`select-item-${language.code}`}>
            <div className="flex items-center gap-2">
              <span>{language.flag}</span>
              <span>{language.name}</span>
              {amazonRegions[language.amazonRegion as keyof typeof amazonRegions] && (
                <span className="text-xs text-muted-foreground ml-2">
                  Amazon {language.amazonRegion}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

export default LanguageSelector;

// Amazon Fire TV specific language selector for remote navigation - also memoized
export const FireTVLanguageSelector = memo(function FireTVLanguageSelector() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
    { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
    { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
    { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
    { code: 'ar-SA', name: 'العربية', flag: '🇸🇦' },
    { code: 'hi-IN', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ru-RU', name: 'Русский', flag: '🇷🇺' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
      <h3 className="col-span-full text-lg font-semibold mb-2 text-center">
        {t('common.language')}
      </h3>
      {languages.map((language) => (
        <Button
          key={language.code}
          variant={i18n.language === language.code ? "default" : "outline"}
          className="h-16 flex flex-col items-center gap-2 text-lg"
          onClick={() => i18n.changeLanguage(language.code)}
          data-testid={`firetv-lang-${language.code}`}
        >
          <span className="text-2xl">{language.flag}</span>
          <span className="text-sm">{language.name}</span>
        </Button>
      ))}
    </div>
  );
});