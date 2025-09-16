import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Globe, ChevronDown } from "lucide-react";
import { amazonRegions } from '@/i18n/config';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'button';
  className?: string;
}

export default function LanguageSelector({ variant = 'dropdown', className = '' }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();

  const languages = [
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
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('trucknav_language', languageCode);
    
    // Update Amazon region for better localization
    const selectedLang = languages.find(lang => lang.code === languageCode);
    if (selectedLang?.amazonRegion) {
      localStorage.setItem('trucknav_amazon_region', selectedLang.amazonRegion);
    }
    
    // Optional: Use OpenAI for dynamic content translation if needed
    // This would be called for user-generated content that isn't pre-translated
  };

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="sm"
        className={`flex items-center gap-2 ${className}`}
        onClick={() => {
          const nextIndex = (languages.findIndex(lang => lang.code === i18n.language) + 1) % languages.length;
          handleLanguageChange(languages[nextIndex].code);
        }}
        data-testid="button-language-toggle"
      >
        <Globe className="w-4 h-4" />
        <span>{currentLanguage.flag}</span>
        <span className="hidden sm:inline">{currentLanguage.name}</span>
      </Button>
    );
  }

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
}

// Amazon Fire TV specific language selector for remote navigation
export function FireTVLanguageSelector() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
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
}