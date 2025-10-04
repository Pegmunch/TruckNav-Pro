import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MapPin, Loader2, Star, Clock, Globe, AlertTriangle, ShoppingCart, UtensilsCrossed, Fuel, Store, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  usePhotonAutocomplete, 
  formatPhotonDisplay, 
  extractPhotonCoordinates,
  type PhotonFeature 
} from '@/hooks/use-photon-autocomplete';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useGPS } from '@/contexts/gps-context';
import { detectPostcodeCountry, looksLikePostcode } from '@/lib/postcode-utils';
import { geocodeUKPostcode, type PostcodeGeocodeResult } from '@/lib/uk-postcode-geocoding';

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
  onCoordinatesChange?: (coords: {lat: number, lng: number} | null) => void;
  placeholder: string;
  id: string;
  className?: string;
  testId: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onCoordinatesChange,
  placeholder,
  id,
  className,
  testId
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [debouncedSearch, setDebouncedSearch] = useState(value);
  const { toast } = useToast();
  const gps = useGPS();

  // Detect country from GPS coordinates
  const countryCode = useMemo(() => {
    // Default to UK for truck navigation (until GPS confirms otherwise)
    if (!gps?.position) return 'GB';
    
    const { latitude, longitude } = gps.position;
    
    // UK bounds: lat 49.9-60.9, lng -8.2-1.8
    if (latitude >= 49.9 && latitude <= 60.9 && longitude >= -8.2 && longitude <= 1.8) {
      return 'GB';
    }
    
    // If GPS shows user is outside UK, allow worldwide search
    return undefined;
  }, [gps?.position]);

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

  // Fetch Photon suggestions (worldwide address search)
  const { results: photonResults, isLoading: isLoadingPhoton, error: photonError } = usePhotonAutocomplete(
    searchTerm,
    open && searchTerm.length >= 3,
    countryCode
  );

  // UK Postcode fallback - Try postcodes.io when Photon returns no results
  const shouldTryUKPostcode = useMemo(() => {
    return (
      debouncedSearch.length >= 5 && // Minimum UK postcode length
      photonResults.length === 0 && // No Photon results
      !isLoadingPhoton && // Photon has finished loading
      looksLikePostcode(debouncedSearch) && // Looks like a postcode
      detectPostcodeCountry(debouncedSearch) === 'UK' // Specifically UK postcode
    );
  }, [debouncedSearch, photonResults.length, isLoadingPhoton]);

  const { data: ukPostcodeResult, isLoading: isLoadingUKPostcode } = useQuery<PostcodeGeocodeResult | null>({
    queryKey: ['/api/uk-postcode', debouncedSearch],
    queryFn: async () => {
      console.log('[UK-POSTCODE] Attempting to geocode:', debouncedSearch);
      const result = await geocodeUKPostcode(debouncedSearch);
      if (result) {
        console.log('[UK-POSTCODE] Success:', result);
      } else {
        console.log('[UK-POSTCODE] Not found or invalid');
      }
      return result;
    },
    enabled: open && shouldTryUKPostcode,
    staleTime: 300000, // Cache for 5 minutes
    retry: 1, // Only retry once for postcodes
  });

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (locationData: { label: string; coordinates: { lat: number; lng: number }; isFavorite?: boolean }) => {
      const response = await apiRequest("POST", "/api/locations", locationData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
    onError: (error) => {
      toast({
        title: "Error saving location",
        description: error instanceof Error ? error.message : "Failed to save location",
        variant: "destructive",
      });
    },
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && open) {
      e.preventDefault();
    }
  }, [open]);

  const handleSelectPhoton = useCallback((photonFeature: PhotonFeature) => {
    const displayLabel = formatPhotonDisplay(photonFeature);
    const coordinates = extractPhotonCoordinates(photonFeature);
    
    setSearchTerm(displayLabel);
    onChange(displayLabel);
    onCoordinatesChange?.(coordinates);
    
    // Force close popup immediately and prevent reopening
    setOpen(false);
    
    // Blur the input to prevent popup from reopening
    setTimeout(() => {
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) {
        input.blur();
      }
    }, 0);
    
    // Create location entry for this Photon result
    const locationData = {
      label: displayLabel,
      coordinates,
      isFavorite: false,
    };
    
    createLocationMutation.mutate(locationData);
    
    // Toast notification removed per user request
  }, [onChange, onCoordinatesChange, createLocationMutation, toast, id]);

  const handleSelectSavedLocation = useCallback((location: SavedLocation) => {
    setSearchTerm(location.label);
    onChange(location.label);
    onCoordinatesChange?.(location.coordinates);
    
    // Force close popup immediately and prevent reopening
    setOpen(false);
    
    // Blur the input to prevent popup from reopening
    setTimeout(() => {
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) {
        input.blur();
      }
    }, 0);
  }, [onChange, onCoordinatesChange, id]);

  const handleSelectUKPostcode = useCallback((result: PostcodeGeocodeResult) => {
    const displayLabel = result.address || result.formatted;
    
    setSearchTerm(displayLabel);
    onChange(displayLabel);
    onCoordinatesChange?.(result.coordinates);
    
    // Force close popup immediately and prevent reopening
    setOpen(false);
    
    // Blur the input to prevent popup from reopening
    setTimeout(() => {
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) {
        input.blur();
      }
    }, 0);
    
    // Create location entry for this UK postcode result
    const locationData = {
      label: displayLabel,
      coordinates: result.coordinates,
      isFavorite: false,
    };
    
    createLocationMutation.mutate(locationData);
    
    // Toast notification removed per user request
  }, [onChange, onCoordinatesChange, createLocationMutation, toast, id]);

  const handleInputFocus = useCallback(() => {
    // Check if in mobile/PWA mode - don't show popups in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isMobile = window.innerWidth < 768;
    
    // Don't open dropdown in mobile/PWA mode
    if (isStandalone || isMobile) {
      return;
    }
    
    // Open dropdown on desktop only
    setOpen(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      setOpen(false);
    }, 200);
  }, []);

  const isLoading = isLoadingPhoton || isLoadingUKPostcode;

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              id={id}
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              className={cn("h-12 text-base pr-10", className)}
              data-testid={testId}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              data-lpignore="true"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[60]" 
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            {favoriteLocations.length === 0 && 
             recentLocations.length === 0 && 
             photonResults.length === 0 && 
             !ukPostcodeResult && (
              <CommandEmpty>
                {debouncedSearch.length < 3 
                  ? 'Type at least 3 characters to search'
                  : isLoadingUKPostcode
                    ? 'Checking UK postcode...'
                    : 'No addresses found'
                }
              </CommandEmpty>
            )}

            {/* UK Postcode Result (postcodes.io fallback) */}
            {ukPostcodeResult && (
              <CommandGroup heading="UK Postcode">
                <CommandItem
                  key="uk-postcode-result"
                  value={ukPostcodeResult.formatted}
                  onSelect={() => handleSelectUKPostcode(ukPostcodeResult)}
                  className="cursor-pointer bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500"
                  data-testid="uk-postcode-result"
                >
                  <MapPin className="mr-2 h-4 w-4 text-blue-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {ukPostcodeResult.formatted}
                    </span>
                    {ukPostcodeResult.city && (
                      <span className="text-sm text-muted-foreground">
                        {ukPostcodeResult.city}{ukPostcodeResult.region && `, ${ukPostcodeResult.region}`}
                      </span>
                    )}
                    <span className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Coordinates: {ukPostcodeResult.coordinates.lat.toFixed(5)}, {ukPostcodeResult.coordinates.lng.toFixed(5)}
                    </span>
                  </div>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Photon Results (Worldwide Addresses) */}
            {photonResults.length > 0 && (
              <>
                {ukPostcodeResult && <CommandSeparator />}
                <CommandGroup heading="Address Results">
                  {photonResults.map((result: PhotonFeature, index: number) => (
                    <CommandItem
                      key={`photon-${index}`}
                      value={formatPhotonDisplay(result)}
                      onSelect={() => handleSelectPhoton(result)}
                      className="cursor-pointer"
                      data-testid={`photon-result-${index}`}
                    >
                      <Globe className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {result.properties.name || result.properties.street || 'Unknown'}
                        </span>
                        {(result.properties.city || result.properties.country) && (
                          <span className="text-sm text-muted-foreground">
                            {result.properties.city && `${result.properties.city}, `}
                            {result.properties.country}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Favorite Locations */}
            {favoriteLocations.length > 0 && (
              <>
                {photonResults.length > 0 && <CommandSeparator />}
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
              </>
            )}

            {/* Recent Locations */}
            {recentLocations.length > 0 && (
              <>
                {(favoriteLocations.length > 0 || photonResults.length > 0) && <CommandSeparator />}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    
    {/* Error Display */}
    {photonError && debouncedSearch.length >= 3 && (
      <div className="flex items-start gap-2 px-2 py-1.5 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive" data-testid="address-autocomplete-error">
        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
        <span>Address search unavailable. Please check your connection or try again later.</span>
      </div>
    )}
    
    {/* Country Detection Status */}
    {gps?.position && countryCode && (
      <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground" data-testid="country-detection-status">
        <Globe className="w-3 h-3" />
        <span>Searching {countryCode === 'GB' ? 'UK' : 'worldwide'} addresses</span>
      </div>
    )}
    
    {/* GPS Error Hint */}
    {gps?.errorType && gps.errorType !== 'NOT_SUPPORTED' && (
      <div className="flex items-start gap-2 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-700 dark:text-yellow-400" data-testid="gps-error-hint">
        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
        <div className="flex-1">
          <span>{gps.errorMessage}</span>
          {gps.canRetry && (
            <Button
              variant="link"
              size="sm"
              onClick={() => gps.retryGPS()}
              className="h-auto p-0 ml-1 text-xs text-yellow-700 dark:text-yellow-400 underline"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    )}
  </div>
  );
}
