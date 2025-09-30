import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { MapPin, Loader2, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostcodeResult {
  postcode: string;
  formatted: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address?: string;
  city?: string;
  region?: string;
  confidence: number;
}

interface SavedLocation {
  id: number;
  label: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  isFavorite: boolean;
  useCount: number;
  lastUsedAt: string | null;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id: string;
  className?: string;
  testId: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  id,
  className,
  testId
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [debouncedSearch, setDebouncedSearch] = useState(value);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch saved locations
  const { data: savedLocations = [] } = useQuery<SavedLocation[]>({
    queryKey: ['/api/locations'],
    staleTime: 300000, // 5 minutes
  });

  // Fetch address suggestions
  const { data: suggestions = [], isLoading } = useQuery<PostcodeResult[]>({
    queryKey: ['/api/postcodes/search', { postcode: debouncedSearch }],
    enabled: debouncedSearch.length >= 2 && open,
    staleTime: 60000,
  });

  // Filter saved locations based on search term
  const filteredSavedLocations = savedLocations.filter(loc => 
    searchTerm.length === 0 || 
    loc.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate favorites and recent locations
  const favoriteLocations = filteredSavedLocations.filter(loc => loc.isFavorite);
  const recentLocations = filteredSavedLocations
    .filter(loc => !loc.isFavorite && loc.useCount > 0)
    .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
    .slice(0, 5);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    if (newValue.length >= 2) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [onChange]);

  const handleSelectSuggestion = useCallback((suggestion: PostcodeResult) => {
    const selectedValue = suggestion.address || suggestion.formatted;
    setSearchTerm(selectedValue);
    onChange(selectedValue);
    setOpen(false);
  }, [onChange]);

  const handleSelectSavedLocation = useCallback((location: SavedLocation) => {
    setSearchTerm(location.label);
    onChange(location.label);
    setOpen(false);
  }, [onChange]);

  const handleInputFocus = useCallback(() => {
    // Always open dropdown on focus to show saved locations
    setOpen(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      setOpen(false);
    }, 200);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            id={id}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className={cn("h-12 text-base pr-10", className)}
            data-testid={testId}
            autoComplete="off"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            {favoriteLocations.length === 0 && recentLocations.length === 0 && suggestions.length === 0 && (
              <CommandEmpty>
                {debouncedSearch.length < 2 
                  ? 'Type at least 2 characters to search'
                  : 'No addresses found'
                }
              </CommandEmpty>
            )}
            
            {/* Favorite Locations */}
            {favoriteLocations.length > 0 && (
              <CommandGroup heading="Favorites">
                {favoriteLocations.map((location) => (
                  <CommandItem
                    key={`favorite-${location.id}`}
                    value={location.label}
                    onSelect={() => handleSelectSavedLocation(location)}
                    className="cursor-pointer"
                    data-testid={`favorite-location-${location.id}`}
                  >
                    <Star className="mr-2 h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                    <span className="font-medium">{location.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Recent Locations */}
            {recentLocations.length > 0 && (
              <>
                {favoriteLocations.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Recent">
                  {recentLocations.map((location) => (
                    <CommandItem
                      key={`recent-${location.id}`}
                      value={location.label}
                      onSelect={() => handleSelectSavedLocation(location)}
                      className="cursor-pointer"
                      data-testid={`recent-location-${location.id}`}
                    >
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{location.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Address Suggestions */}
            {suggestions.length > 0 && (
              <>
                {(favoriteLocations.length > 0 || recentLocations.length > 0) && <CommandSeparator />}
                <CommandGroup heading="Suggested Addresses">
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={`${suggestion.postcode}-${index}`}
                      value={suggestion.formatted}
                      onSelect={() => handleSelectSuggestion(suggestion)}
                      className="cursor-pointer"
                      data-testid={`suggestion-${index}`}
                    >
                      <MapPin className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-medium">{suggestion.formatted}</span>
                        {suggestion.address && (
                          <span className="text-sm text-muted-foreground">
                            {suggestion.city && `${suggestion.city}, `}
                            {suggestion.region}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
