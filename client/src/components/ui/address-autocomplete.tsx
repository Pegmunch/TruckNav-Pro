import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { MapPin, Loader2 } from 'lucide-react';
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

  const { data: suggestions = [], isLoading } = useQuery<PostcodeResult[]>({
    queryKey: ['/api/postcodes/search', { postcode: debouncedSearch }],
    enabled: debouncedSearch.length >= 2 && open,
    staleTime: 60000,
  });

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

  const handleInputFocus = useCallback(() => {
    if (searchTerm.length >= 2) {
      setOpen(true);
    }
  }, [searchTerm]);

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
            <CommandEmpty>
              {debouncedSearch.length < 2 
                ? 'Type at least 2 characters to search'
                : 'No addresses found'
              }
            </CommandEmpty>
            {suggestions.length > 0 && (
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
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
