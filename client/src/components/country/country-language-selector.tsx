/**
 * Comprehensive Country-Language Selector for TruckNav Pro
 * Patent-protected by Bespoke Marketing.Ai Ltd
 * Provides integrated country and language selection with visual flags
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronDown, Globe, MapPin, Star, Clock, Loader2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { 
  countries, 
  countryGroups, 
  Country, 
  getCountryByCode, 
  searchCountries, 
  getTruckingMarkets,
  getCountriesByLanguage,
  DEFAULT_COUNTRY 
} from '@/data/countries';
import FlagIcon, { DropdownFlagIcon, FlagBadge } from './flag-icon';
import { useCountryPreferences } from '@/hooks/use-country-preferences';

interface CountryLanguageSelectorProps {
  value?: string; // Country code or language code
  onValueChange?: (countryCode: string, languageCode: string) => void;
  mode?: 'country-first' | 'language-first' | 'combined';
  variant?: 'default' | 'compact' | 'detailed';
  showFavorites?: boolean;
  showRecent?: boolean;
  showTruckingMarkets?: boolean;
  className?: string;
}

/**
 * Main country-language selector component
 * Supports multiple selection modes and visual configurations
 */
const CountryLanguageSelector = memo(function CountryLanguageSelector({
  value,
  onValueChange,
  mode = 'country-first',
  variant = 'default',
  showFavorites = true,
  showRecent = true,
  showTruckingMarkets = true,
  className = ''
}: CountryLanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Use the new country preferences hook
  const { 
    changeCountry, 
    currentCountry,
    isLoading: isChangingCountry,
    error: countryError 
  } = useCountryPreferences();
  
  // Get current selection (override from preferences hook if available)
  const selectedCountry = useMemo(() => {
    // Use the country from preferences hook if available
    if (currentCountry) {
      return currentCountry;
    }
    
    if (value) {
      // Try to find by country code first, then by language
      const byCode = getCountryByCode(value);
      if (byCode) return byCode;
      
      // Find country by language
      const byLanguage = getCountriesByLanguage(value);
      return byLanguage[0] || DEFAULT_COUNTRY;
    }
    
    // Try to determine from current i18n language
    const langCountries = getCountriesByLanguage(i18n.language);
    return langCountries[0] || DEFAULT_COUNTRY;
  }, [value, i18n.language, currentCountry]);

  const currentLanguage = i18n.language || selectedCountry.defaultLanguage;

  // Get recent countries from localStorage
  const recentCountries = useMemo(() => {
    try {
      const recent = localStorage.getItem('trucknav_recent_countries');
      if (recent) {
        const codes = JSON.parse(recent) as string[];
        return codes
          .map(code => getCountryByCode(code))
          .filter((country): country is Country => country !== undefined)
          .slice(0, 5);
      }
    } catch (error) {
      console.warn('Error loading recent countries:', error);
    }
    return [];
  }, []);

  // Get favorite countries from localStorage
  const favoriteCountries = useMemo(() => {
    try {
      const favorites = localStorage.getItem('trucknav_favorite_countries');
      if (favorites) {
        const codes = JSON.parse(favorites) as string[];
        return codes
          .map(code => getCountryByCode(code))
          .filter((country): country is Country => country !== undefined);
      }
    } catch (error) {
      console.warn('Error loading favorite countries:', error);
    }
    return [];
  }, []);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    return searchCountries(search);
  }, [search]);

  // Group countries for display
  const groupedCountries = useMemo(() => {
    const grouped: { [key: string]: Country[] } = {};
    
    countryGroups.forEach(group => {
      const groupCountries = group.countries
        .map(code => getCountryByCode(code))
        .filter((country): country is Country => country !== undefined)
        .filter(country => filteredCountries.includes(country));
      
      if (groupCountries.length > 0) {
        grouped[group.name] = groupCountries;
      }
    });
    
    return grouped;
  }, [filteredCountries]);

  // Handle country selection with new preferences system
  const handleCountrySelect = useCallback(async (country: Country) => {
    const languageCode = country.defaultLanguage;
    
    // Update recent countries
    try {
      const recent = recentCountries.filter(c => c.code !== country.code);
      recent.unshift(country);
      localStorage.setItem('trucknav_recent_countries', JSON.stringify(
        recent.slice(0, 10).map(c => c.code)
      ));
    } catch (error) {
      console.warn('Error saving recent country:', error);
    }

    // Use the new country preferences system to handle the change
    // This will automatically update fonts, maps, and other preferences
    try {
      await changeCountry(country.code);
      
      // Call parent handler
      onValueChange?.(country.code, languageCode);
    } catch (error) {
      console.error('Error changing country:', error);
      // Fallback to the old behavior if the new system fails
      i18n.changeLanguage(languageCode);
      localStorage.setItem('trucknav_language', languageCode);
      localStorage.setItem('trucknav_country', country.code);
      
      if (country.amazonRegion) {
        localStorage.setItem('trucknav_amazon_region', country.amazonRegion);
      }
      
      onValueChange?.(country.code, languageCode);
    }

    setOpen(false);
    setSearch('');
  }, [changeCountry, onValueChange, recentCountries, i18n]);

  // Toggle favorite country
  const toggleFavorite = useCallback((country: Country, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      const favorites = favoriteCountries.map(c => c.code);
      const isCurrentlyFavorite = favorites.includes(country.code);
      
      if (isCurrentlyFavorite) {
        const newFavorites = favorites.filter(code => code !== country.code);
        localStorage.setItem('trucknav_favorite_countries', JSON.stringify(newFavorites));
      } else {
        favorites.push(country.code);
        localStorage.setItem('trucknav_favorite_countries', JSON.stringify(favorites));
      }
      
      // Force re-render by updating a state that depends on localStorage
      // This is a bit hacky, but works for this demo
      window.location.reload(); // TODO: Use proper state management
    } catch (error) {
      console.warn('Error updating favorite countries:', error);
    }
  }, [favoriteCountries]);

  // Render country item
  const renderCountryItem = useCallback((country: Country, showFavoriteButton = true) => {
    const isFavorite = favoriteCountries.some(c => c.code === country.code);
    const isSelected = selectedCountry.code === country.code;
    
    return (
      <CommandItem
        key={country.code}
        value={`${country.code} ${country.name} ${country.nativeName}`}
        onSelect={() => handleCountrySelect(country)}
        className="flag-country-item flex items-center justify-between gap-2 group"
        data-testid={`country-item-${country.code.toLowerCase()}`}
        data-selected={isSelected ? "true" : "false"}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <DropdownFlagIcon country={country} />
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {country.name}
              </span>
              {country.truckingMarket && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  Trucking
                </Badge>
              )}
            </div>
            {variant === 'detailed' && country.nativeName !== country.name && (
              <span className="text-xs text-muted-foreground truncate">
                {country.nativeName}
              </span>
            )}
          </div>
          {isSelected && (
            <Check className="w-4 h-4 text-primary flex-shrink-0" />
          )}
        </div>
        
        {showFavoriteButton && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => toggleFavorite(country, e)}
            data-testid={`favorite-${country.code.toLowerCase()}`}
          >
            <Star 
              className={cn(
                "w-3 h-3",
                isFavorite ? "fill-current text-yellow-500" : "text-muted-foreground"
              )} 
            />
          </Button>
        )}
      </CommandItem>
    );
  }, [selectedCountry.code, favoriteCountries, handleCountrySelect, toggleFavorite, variant]);

  if (variant === 'compact') {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn("flex items-center gap-2", className)}
        onClick={() => setOpen(!open)}
        data-testid="country-selector-compact"
      >
        <DropdownFlagIcon country={currentCountry} />
        <span className="hidden sm:inline text-sm">{currentCountry.code}</span>
        <ChevronDown className="w-3 h-3" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between min-w-[200px]", className)}
          data-testid="country-selector-trigger"
        >
          <div className="flex items-center gap-2">
            <DropdownFlagIcon country={selectedCountry} />
            <span className="truncate">
              {variant === 'detailed' 
                ? `${selectedCountry.name} (${selectedCountry.nativeName})`
                : selectedCountry.name
              }
            </span>
            {isChangingCountry && (
              <Loader2 className="h-3 w-3 animate-spin ml-1" />
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[320px] p-0 flag-dropdown-frame" align="start">
        <Command>
          <CommandInput 
            placeholder={t('common.searchCountries', 'Search countries...')}
            value={search}
            onValueChange={setSearch}
            className="h-9 flag-dropdown-search"
            data-testid="country-search"
          />
          
          <ScrollArea className="h-[400px]">
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Globe className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('common.noCountriesFound', 'No countries found')}
                </p>
              </div>
            </CommandEmpty>

            {/* Recent Countries */}
            {showRecent && recentCountries.length > 0 && !search && (
              <>
                <CommandGroup 
                  heading={
                    <div className="flag-country-group-header flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {t('common.recent', 'Recent')}
                    </div>
                  }
                >
                  {recentCountries.map(country => renderCountryItem(country, false))}
                </CommandGroup>
                <Separator />
              </>
            )}

            {/* Favorite Countries */}
            {showFavorites && favoriteCountries.length > 0 && !search && (
              <>
                <CommandGroup 
                  heading={
                    <div className="flag-country-group-header flex items-center gap-2">
                      <Star className="w-3 h-3" />
                      {t('common.favorites', 'Favorites')}
                    </div>
                  }
                >
                  {favoriteCountries.map(country => renderCountryItem(country, true))}
                </CommandGroup>
                <Separator />
              </>
            )}

            {/* Trucking Markets */}
            {showTruckingMarkets && !search && (
              <>
                <CommandGroup 
                  heading={
                    <div className="flag-country-group-header flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {t('common.majorTruckingMarkets', 'Major Trucking Markets')}
                    </div>
                  }
                >
                  {getTruckingMarkets().slice(0, 6).map(country => renderCountryItem(country))}
                </CommandGroup>
                <Separator />
              </>
            )}

            {/* Grouped Countries */}
            {Object.entries(groupedCountries).map(([groupName, groupCountries], index) => (
              <CommandGroup key={groupName} heading={<div className="flag-country-group-header">{groupName}</div>}>
                {groupCountries.map(country => renderCountryItem(country))}
              </CommandGroup>
            ))}
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

export default CountryLanguageSelector;

/**
 * Simple country selector for quick selection
 * Used in compact interfaces or mobile views
 */
export const SimpleCountrySelector = memo(function SimpleCountrySelector({
  value,
  onValueChange,
  className = ''
}: {
  value?: string;
  onValueChange?: (countryCode: string) => void;
  className?: string;
}) {
  return (
    <CountryLanguageSelector
      value={value}
      onValueChange={(countryCode) => onValueChange?.(countryCode)}
      variant="compact"
      showFavorites={false}
      showRecent={false}
      showTruckingMarkets={false}
      className={className}
    />
  );
});

/**
 * Detailed country selector with full features
 * Used in settings or profile configuration
 */
export const DetailedCountrySelector = memo(function DetailedCountrySelector({
  value,
  onValueChange,
  className = ''
}: {
  value?: string;
  onValueChange?: (countryCode: string, languageCode: string) => void;
  className?: string;
}) {
  return (
    <CountryLanguageSelector
      value={value}
      onValueChange={onValueChange}
      variant="detailed"
      showFavorites={true}
      showRecent={true}
      showTruckingMarkets={true}
      className={className}
    />
  );
});