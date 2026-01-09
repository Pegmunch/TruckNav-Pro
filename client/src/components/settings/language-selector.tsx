import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { navigationVoice } from '@/lib/navigation-voice';

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', flag: '🇺🇸', voiceCode: 'en-US' },
  { code: 'en-GB', flag: '🇬🇧', voiceCode: 'en-GB' },
  { code: 'fr-FR', flag: '🇫🇷', voiceCode: 'fr-FR' },
  { code: 'es-ES', flag: '🇪🇸', voiceCode: 'es-ES' },
  { code: 'de-DE', flag: '🇩🇪', voiceCode: 'de-DE' },
  { code: 'it-IT', flag: '🇮🇹', voiceCode: 'it-IT' },
  { code: 'pt-BR', flag: '🇧🇷', voiceCode: 'pt-BR' },
  { code: 'pl-PL', flag: '🇵🇱', voiceCode: 'pl-PL' },
  { code: 'ro-RO', flag: '🇷🇴', voiceCode: 'ro-RO' },
  { code: 'zh-CN', flag: '🇨🇳', voiceCode: 'zh-CN' },
  { code: 'ja-JP', flag: '🇯🇵', voiceCode: 'ja-JP' },
] as const;

interface LanguageSelectorProps {
  compact?: boolean;
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  
  const currentLanguage = i18n.language || 'en-US';
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const handleLanguageChange = async (langCode: string) => {
    try {
      await i18n.changeLanguage(langCode);
      localStorage.setItem('trucknav_language', langCode);
      
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
      if (lang) {
        navigationVoice.setLanguage(lang.voiceCode);
      }
      
      const langName = t(`languages.${langCode}`);
      toast({
        title: t('settings.language_changed', { language: langName }),
      });
    } catch (error) {
      console.error('[LanguageSelector] Failed to change language:', error);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    }
  };

  if (compact) {
    return (
      <Select value={currentLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger 
          className="w-full h-12"
          data-testid="language-selector-compact"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <SelectValue>
              <span className="flex items-center gap-2">
                <span>{currentLang.flag}</span>
                <span>{t(`languages.${currentLanguage}`)}</span>
              </span>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem 
              key={lang.code} 
              value={lang.code}
              data-testid={`language-option-${lang.code}`}
            >
              <div className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{t(`languages.${lang.code}`)}</span>
                {currentLanguage === lang.code && (
                  <Check className="h-4 w-4 ml-auto text-green-500" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-3" data-testid="language-selector">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Globe className="h-4 w-4" />
        <span>{t('settings.select_language')}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Button
            key={lang.code}
            variant={currentLanguage === lang.code ? 'default' : 'outline'}
            className="h-12 justify-start gap-2"
            onClick={() => handleLanguageChange(lang.code)}
            data-testid={`language-btn-${lang.code}`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="text-sm truncate">{t(`languages.${lang.code}`)}</span>
            {currentLanguage === lang.code && (
              <Check className="h-4 w-4 ml-auto" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
