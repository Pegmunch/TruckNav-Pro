import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2, Star, Clock, Globe, AlertTriangle, ShoppingCart, UtensilsCrossed, Fuel, Store, Map, Navigation2, Crosshair, MapPinned } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useTomTomAutocomplete, 
  formatTomTomDisplay, 
  extractTomTomCoordinates,
  isTomTomPOI,
  type TomTomResult 
} from '@/hooks/use-tomtom-autocomplete';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  coordinates?: {lat: number, lng: number} | null;
  placeholder: string;
  id: string;
  className?: string;
  testId: string;
  /** Hide the SEARCH TYPE toggles (Addresses, Truck Stops, etc.) - useful for "From" field where simple input is preferred */
  showSearchTypeToggles?: boolean;
  /** Hide the GPS "Use My Current Location" button - useful when parent component has its own GPS button */
  hideGPSButton?: boolean;
  /** Externally control whether dropdown is open - used by parent to open after GPS fill */
  forceOpen?: boolean;
  /** Callback when forceOpen should be reset after dropdown opened */
  onForceOpenConsumed?: () => void;
}

export function AddressAutocomplete({
  value,
  onChange,
  onCoordinatesChange,
  coordinates,
  placeholder,
  id,
  className,
  testId,
  showSearchTypeToggles = true,
  hideGPSButton = false,
  forceOpen = false,
  onForceOpenConsumed
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [debouncedSearch, setDebouncedSearch] = useState(value);
  const [poiCategory, setPoiCategory] = useState<string>(''); // '' = addresses, '7315' = truck stops, '7311' = gas stations, '9920' = rest areas
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // GPS candidate state - holds geocoded location pending user confirmation
  const [gpsCandidate, setGpsCandidate] = useState<{
    address: string;
    coordinates: { lat: number; lng: number };
  } | null>(null);
  
  // CRITICAL: Sync searchTerm with external value prop changes
  // This ensures the input displays the correct value when parent updates it
  // NOTE: Only sync from parent when value differs and isn't already being updated by user interaction
  useEffect(() => {
    // Only sync if value is different and not coordinate-like (avoid showing raw coords)
    const looksLikeCoordinates = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(value.trim());
    if (value !== searchTerm && !looksLikeCoordinates) {
      console.log('[AUTOCOMPLETE] Syncing searchTerm from value prop:', value, '(was:', searchTerm, ')');
      setSearchTerm(value);
    }
  }, [value, searchTerm]);
  
  // Handle forceOpen prop - allows parent to programmatically open the dropdown
  useEffect(() => {
    if (forceOpen && !open) {
      console.log('[AUTOCOMPLETE] Force opening dropdown from parent');
      setOpen(true);
      // Notify parent that forceOpen has been consumed
      onForceOpenConsumed?.();
    }
  }, [forceOpen, open, onForceOpenConsumed]);
  
  const gps = useGPS();
  const isGPSReady = gps?.status === 'ready' && !gps?.isUsingCached;
  
  // Close dropdown when clicking/tapping outside using document-level listener
  // This replaces blur-based closing which is unreliable on iOS
  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if click is inside input wrapper (which now includes inline dropdown)
      if (inputWrapperRef.current?.contains(target)) return;
      
      // Fallback: Check if target or any ancestor has our dropdown marker
      if (target.closest?.('[data-autocomplete-dropdown="true"]')) return;
      
      // Click was outside - close dropdown
      setOpen(false);
    };
    
    // Use mousedown/touchstart to close before onClick fires elsewhere
    document.addEventListener('mousedown', handleClickOutside, false);
    document.addEventListener('touchstart', handleClickOutside, false);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, false);
      document.removeEventListener('touchstart', handleClickOutside, false);
    };
  }, [open]);

  // Detect country from GPS coordinates
  const countryCode = useMemo(() => {
    // If we have explicit coordinates passed (from GPS button), use those
    if (coordinates) {
      const { lat, lng } = coordinates;
      // UK bounds: lat 49.9-60.9, lng -8.2-1.8
      if (lat >= 49.9 && lat <= 60.9 && lng >= -8.2 && lng <= 1.8) {
        return 'GB';
      }
      return undefined; // Worldwide search
    }
    
    // Only default to UK if we have actual GPS position
    if (gps?.position) {
      const { latitude, longitude } = gps.position;
      // UK bounds: lat 49.9-60.9, lng -8.2-1.8
      if (latitude >= 49.9 && latitude <= 60.9 && longitude >= -8.2 && longitude <= 1.8) {
        return 'GB';
      }
    }
    
    // No default - allow worldwide search when no GPS
    return undefined;
  }, [coordinates, gps?.position]);

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

  // Get GPS coordinates for location-biased search (POI near me)
  // CRITICAL: Use passed coordinates first, then GPS coordinates, then manual location as fallback
  const gpsCoordinates = useMemo(() => {
    // First priority: Explicitly passed coordinates (from GPS button click)
    if (coordinates) {
      console.log('[ADDRESS-AUTOCOMPLETE] Using passed coordinates for location-biased search:', {
        lat: coordinates.lat,
        lng: coordinates.lng,
        source: 'explicit'
      });
      return coordinates;
    }
    
    // Second priority: Fresh GPS position
    if (isGPSReady && gps?.position) {
      console.log('[ADDRESS-AUTOCOMPLETE] Using fresh GPS for location-biased search:', {
        lat: gps.position.latitude,
        lng: gps.position.longitude,
        status: gps.status
      });
      return {
        lat: gps.position.latitude,
        lng: gps.position.longitude
      };
    }
    
    // Third priority: Manual location when GPS unavailable
    if (gps?.manualLocation) {
      console.log('[ADDRESS-AUTOCOMPLETE] Using manual location for location-biased search:', {
        lat: gps.manualLocation.latitude,
        lng: gps.manualLocation.longitude,
        address: gps.manualLocation.address
      });
      return {
        lat: gps.manualLocation.latitude,
        lng: gps.manualLocation.longitude
      };
    }
    
    console.log('[ADDRESS-AUTOCOMPLETE] No location available for biased search - status:', gps?.status);
    return undefined;
  }, [coordinates, gps?.position, gps?.status, gps?.manualLocation, isGPSReady]);

  // Fetch TomTom suggestions (worldwide address search with GPS bias for POI)
  const { results: tomtomResults, isLoading: isLoadingTomTom, error: tomtomError } = useTomTomAutocomplete(
    searchTerm,
    open && searchTerm.length >= 3,
    countryCode,
    poiCategory || undefined, // POI category filter
    gpsCoordinates, // Pass GPS coordinates for location-biased search!
    poiCategory ? 'poi' : 'fuzzy' // Use POI search when category selected, otherwise fuzzy address search
  );

  // UK Postcode fallback - Try postcodes.io when TomTom returns no results
  const shouldTryUKPostcode = useMemo(() => {
    return (
      debouncedSearch.length >= 5 && // Minimum UK postcode length
      tomtomResults.length === 0 && // No TomTom results
      !isLoadingTomTom && // TomTom has finished loading
      looksLikePostcode(debouncedSearch) && // Looks like a postcode
      detectPostcodeCountry(debouncedSearch) === 'UK' // Specifically UK postcode
    );
  }, [debouncedSearch, tomtomResults.length, isLoadingTomTom]);

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
      // REMOVED TOAST: No popups per user request
      console.error("Error saving location:", error);
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

  // Helper to detect mobile/PWA context - prevents dropdown flicker on mobile
  // Evaluated dynamically on each call to handle viewport changes
  const checkIsMobileOrPWA = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isMobile = window.innerWidth < 768;
    return isStandalone || isMobile;
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    
    // Always open dropdown if there's content (on all platforms)
    if (newValue.length >= 2) {
      setOpen(true);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && open) {
      e.preventDefault();
    }
  }, [open]);

  const handleSelectTomTom = useCallback((tomtomResult: TomTomResult) => {
    const displayLabel = formatTomTomDisplay(tomtomResult);
    const coordinates = extractTomTomCoordinates(tomtomResult);
    
    console.log('[AUTOCOMPLETE] TomTom selection triggered - setting display:', displayLabel);
    
    // Update local state and parent SYNCHRONOUSLY before any async operations
    setSearchTerm(displayLabel);
    onChange(displayLabel);
    onCoordinatesChange?.(coordinates);
    
    console.log('[AUTOCOMPLETE] Selection complete - searchTerm set to:', displayLabel);
    
    // CRITICAL: Delay close until next frame so handler completes before unmount
    requestAnimationFrame(() => {
      setOpen(false);
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) input.blur();
    });
    
    // Create location entry
    createLocationMutation.mutate({
      label: displayLabel,
      coordinates,
      isFavorite: false,
    });
  }, [onChange, onCoordinatesChange, createLocationMutation, id]);

  const handleSelectSavedLocation = useCallback((location: SavedLocation) => {
    console.log('[AUTOCOMPLETE] Saved location selection triggered');
    
    setSearchTerm(location.label);
    onChange(location.label);
    onCoordinatesChange?.(location.coordinates);
    
    // CRITICAL: Delay close until next frame so handler completes before unmount
    requestAnimationFrame(() => {
      setOpen(false);
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) input.blur();
    });
  }, [onChange, onCoordinatesChange, id]);

  const handleSelectUKPostcode = useCallback((result: PostcodeGeocodeResult) => {
    console.log('[AUTOCOMPLETE] UK postcode selection triggered');
    
    const displayLabel = result.address || result.formatted;
    
    setSearchTerm(displayLabel);
    onChange(displayLabel);
    onCoordinatesChange?.(result.coordinates);
    
    // CRITICAL: Delay close until next frame so handler completes before unmount
    requestAnimationFrame(() => {
      setOpen(false);
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) input.blur();
    });
    
    createLocationMutation.mutate({
      label: displayLabel,
      coordinates: result.coordinates,
      isFavorite: false,
    });
  }, [onChange, onCoordinatesChange, createLocationMutation, id]);

  const handleInputFocus = useCallback(() => {
    setOpen(true);
  }, []);

  // Don't close on blur - we use document-level pointerdown instead
  // This prevents iOS from closing dropdown when tapping inside the portal
  const handleInputBlur = useCallback(() => {
    // Intentionally empty - closing is handled by pointerdown listener
  }, []);

  const isLoading = isLoadingTomTom || isLoadingUKPostcode;
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Handler to confirm and select GPS candidate
  const handleSelectGPSCandidate = useCallback(() => {
    if (!gpsCandidate) return;
    
    console.log('[AUTOCOMPLETE] GPS candidate selection triggered:', gpsCandidate.address);
    
    // Capture values before state changes
    const address = gpsCandidate.address;
    const coordinates = gpsCandidate.coordinates;
    
    setSearchTerm(address);
    onChange(address);
    onCoordinatesChange?.(coordinates);
    setGpsCandidate(null);
    
    // CRITICAL: Delay close until next frame so handler completes before unmount
    requestAnimationFrame(() => {
      setOpen(false);
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) input.blur();
    });
    
    // Save to recent locations
    createLocationMutation.mutate({
      label: address,
      coordinates,
      isFavorite: false,
    });
  }, [gpsCandidate, onChange, onCoordinatesChange, createLocationMutation, id]);

  // GPS Quick-Set Handler - Gets GPS, geocodes, and shows in dropdown for confirmation
  const handleUseGPSLocation = useCallback(async () => {
    setIsGettingLocation(true);
    setGpsCandidate(null); // Clear any previous candidate
    setOpen(true); // Open dropdown immediately to show loading state
    console.log('[GPS-LOCATION] Button clicked - status:', gps?.status, 'position:', gps?.position ? 'available' : 'none');
    
    // Helper function to reverse geocode and set as candidate (not final)
    const setLocationCandidate = async (latitude: number, longitude: number): Promise<boolean> => {
      try {
        // Try reverse geocoding to get address
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        let response;
        try {
          response = await fetch(
            `https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`,
            { signal: controller.signal }
          );
        } finally {
          clearTimeout(timeoutId);
        }
        
        if (response?.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const props = feature.properties;
            // Build a readable address from components, never show raw coordinates
            const addressParts: string[] = [];
            if (props.name) addressParts.push(props.name);
            else if (props.street) {
              addressParts.push(`${props.housenumber || ''} ${props.street}`.trim());
            }
            if (props.city) addressParts.push(props.city);
            if (props.postcode) addressParts.push(props.postcode);
            if (props.country) addressParts.push(props.country);
            
            const address = addressParts.length > 0 ? addressParts.join(', ') : 'Current Location';
            
            // Set as candidate - user must confirm by tapping
            setGpsCandidate({ address, coordinates: { lat: latitude, lng: longitude } });
            console.log('[GPS-LOCATION] GPS candidate ready for confirmation:', address);
            return true;
          }
        }
        // Fallback to "Current Location" text (never raw coordinates)
        setGpsCandidate({ address: 'Current Location', coordinates: { lat: latitude, lng: longitude } });
        console.log('[GPS-LOCATION] GPS candidate set as Current Location (reverse geocode empty)');
        return true;
      } catch (error) {
        // Fallback to "Current Location" on error (never raw coordinates)
        setGpsCandidate({ address: 'Current Location', coordinates: { lat: latitude, lng: longitude } });
        console.log('[GPS-LOCATION] GPS candidate set as Current Location (error fallback)');
        return true;
      }
    };
    
    try {
      // First priority: Use existing GPS position if ready
      if (gps?.status === 'ready' && gps?.position) {
        const { latitude, longitude } = gps.position;
        await setLocationCandidate(latitude, longitude);
        return;
      }
      
      // Second priority: Use manual location if available
      if (gps?.manualLocation) {
        setGpsCandidate({
          address: gps.manualLocation.address || 'Manual Location',
          coordinates: { lat: gps.manualLocation.latitude, lng: gps.manualLocation.longitude }
        });
        console.log('[GPS-LOCATION] Manual location candidate ready');
        return;
      }
      
      // Third priority: Try cached position first (instant fallback)
      if (gps?.cachedPosition?.position) {
        const { latitude, longitude } = gps.cachedPosition.position;
        console.log('[GPS-LOCATION] Using cached GPS position (age:', gps.cachedPosition.ageDisplay, ')');
        await setLocationCandidate(latitude, longitude);
        return;
      }
      
      // Fourth priority: Request fresh GPS position (for PWA mode)
      if ('geolocation' in navigator) {
        console.log('[GPS-LOCATION] Requesting fresh GPS position...');
        const success = await new Promise<boolean>((resolve) => {
          const timeoutHandle = setTimeout(() => {
            console.warn('[GPS-LOCATION] GPS request timed out');
            resolve(false);
          }, 10000); // Reduced to 10 seconds for better UX
          
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              clearTimeout(timeoutHandle);
              const { latitude, longitude } = position.coords;
              console.log('[GPS-LOCATION] Fresh GPS acquired:', latitude, longitude);
              await setLocationCandidate(latitude, longitude);
              resolve(true);
            },
            (error) => {
              clearTimeout(timeoutHandle);
              console.error('[GPS-LOCATION] GPS error:', error.message);
              resolve(false);
            },
            {
              enableHighAccuracy: false, // Faster acquisition with network-based location
              timeout: 8000,
              maximumAge: 300000 // Allow 5-minute old positions for faster response
            }
          );
        });
        
        if (!success) {
          console.warn('[GPS-LOCATION] Could not acquire location - check device permissions');
          setOpen(false); // Close dropdown on error
        }
      } else {
        console.warn('[GPS-LOCATION] Geolocation not supported in this browser');
        setOpen(false); // Close dropdown on error
      }
    } catch (error) {
      console.warn('[GPS-LOCATION] Failed to get GPS position:', error);
      setOpen(false); // Close dropdown on error
    } finally {
      // CRITICAL: Always reset loading state, guaranteed by finally block
      setIsGettingLocation(false);
    }
  }, [gps]);

  // Dynamic placeholder based on POI category
  const dynamicPlaceholder = useMemo(() => {
    if (poiCategory === '7315') return 'Search for truck stops near you...';
    if (poiCategory === '7311') return 'Search for gas stations near you...';
    if (poiCategory === '9920') return 'Search for rest areas near you...';
    return placeholder; // Default address search
  }, [poiCategory, placeholder]);

  return (
    <div className="space-y-3">
      {/* POI Category Selector - Only shown when showSearchTypeToggles is true */}
      {showSearchTypeToggles && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Search Type
          </Label>
          <ToggleGroup 
            type="single" 
            value={poiCategory} 
            onValueChange={(value) => {
              setPoiCategory(value);
              // Clear search when switching categories
              if (value !== poiCategory) {
                setSearchTerm('');
                setDebouncedSearch('');
              }
            }}
            className="justify-start gap-2 flex-wrap"
          >
            <ToggleGroupItem 
              value="" 
              aria-label="Search addresses"
              className="h-10 px-4 text-sm font-medium rounded-lg transition-all data-[state=on]:bg-gradient-to-r data-[state=on]:from-blue-600 data-[state=on]:to-blue-500 data-[state=on]:text-white data-[state=on]:shadow-lg data-[state=on]:shadow-blue-500/50 hover:scale-105"
              data-testid="poi-category-addresses"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Addresses
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="7315" 
              aria-label="Truck stops"
              className="h-10 px-4 text-sm font-medium rounded-lg transition-all data-[state=on]:bg-gradient-to-r data-[state=on]:from-emerald-600 data-[state=on]:to-emerald-500 data-[state=on]:text-white data-[state=on]:shadow-lg data-[state=on]:shadow-emerald-500/50 hover:scale-105"
              data-testid="poi-category-truck-stops"
            >
              <Store className="h-4 w-4 mr-2" />
              Truck Stops
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="7311" 
              aria-label="Gas stations"
              className="h-10 px-4 text-sm font-medium rounded-lg transition-all data-[state=on]:bg-gradient-to-r data-[state=on]:from-orange-600 data-[state=on]:to-orange-500 data-[state=on]:text-white data-[state=on]:shadow-lg data-[state=on]:shadow-orange-500/50 hover:scale-105"
              data-testid="poi-category-gas-stations"
            >
              <Fuel className="h-4 w-4 mr-2" />
              Gas Stations
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="9920" 
              aria-label="Rest areas"
              className="h-10 px-4 text-sm font-medium rounded-lg transition-all data-[state=on]:bg-gradient-to-r data-[state=on]:from-purple-600 data-[state=on]:to-purple-500 data-[state=on]:text-white data-[state=on]:shadow-lg data-[state=on]:shadow-purple-500/50 hover:scale-105"
              data-testid="poi-category-rest-areas"
            >
              <UtensilsCrossed className="h-4 w-4 mr-2" />
              Rest Areas
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* GPS Quick Access Button - Hidden when parent has its own GPS button */}
      {!hideGPSButton && (
        <Button
            onClick={handleUseGPSLocation}
            disabled={isGettingLocation}
            variant="default"
            className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 hover:from-blue-600 hover:to-indigo-600 active:from-blue-700 active:to-indigo-700 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-touch-target"
            data-testid="button-use-gps-location"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                <span>Getting Location...</span>
              </>
            ) : (
              <>
                <Crosshair className="h-6 w-6 mr-2" />
                <span className="flex-1">Use My Current Location</span>
                {gps?.status === 'ready' && gps?.position && (
                  <Badge variant="secondary" className="ml-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                    GPS Ready
                  </Badge>
                )}
                {gps?.manualLocation && !gps?.position && (
                  <Badge variant="secondary" className="ml-2 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                    Manual
                  </Badge>
                )}
              </>
            )}
        </Button>
      )}

      <div ref={inputWrapperRef} className="relative" style={{ position: 'relative', overflow: 'visible' }}>
        <Input
          id={id}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={dynamicPlaceholder}
          className={cn("relative h-14 text-base pr-12 pl-4 rounded-lg border-2 focus:border-blue-500 dark:focus:border-blue-400 transition-all bg-white dark:bg-slate-900", className)}
          data-testid={testId}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-form-type="other"
          data-lpignore="true"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
          )}
          <MapPinned className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        </div>

        {/* Inline Dropdown - No portal, renders directly under input for proper touch handling */}
        {open && (
          <div 
            ref={dropdownRef}
            data-autocomplete-dropdown="true"
            className="absolute left-0 right-0 top-full mt-1 z-[9999] shadow-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 max-h-[350px] overflow-y-auto rounded-lg animate-in fade-in zoom-in-95 duration-200"
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
          >
            <Command className="bg-transparent">
              <CommandList className="max-h-[300px] overflow-y-auto">
                {/* GPS Location Loading/Candidate - Always at top when GPS is active */}
                {(isGettingLocation || gpsCandidate) && (
                  <CommandGroup heading="Your Location">
                    {isGettingLocation && !gpsCandidate && (
                      <div className="flex items-center p-4 text-muted-foreground">
                        <Loader2 className="mr-3 h-5 w-5 animate-spin text-blue-500" />
                        <span>Getting your location...</span>
                      </div>
                    )}
                    {gpsCandidate && (
                      <div
                        role="option"
                        tabIndex={0}
                        onClick={() => handleSelectGPSCandidate()}
                        style={{ touchAction: 'manipulation' }}
                        className="flex items-center p-4 cursor-pointer bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 active:bg-blue-200 dark:active:bg-blue-800 border-2 border-blue-500 rounded-lg"
                      >
                        <Navigation2 className="mr-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
                        <div className="flex flex-col flex-1">
                          <span className="font-bold text-blue-700 dark:text-blue-300">{gpsCandidate.address}</span>
                          <span className="text-xs text-blue-600 dark:text-blue-400">Tap to use this location</span>
                        </div>
                        <Crosshair className="h-5 w-5 text-blue-500" />
                      </div>
                    )}
                  </CommandGroup>
                )}

                {favoriteLocations.length === 0 && 
                 recentLocations.length === 0 && 
                 tomtomResults.length === 0 && 
                 !ukPostcodeResult &&
                 !gpsCandidate &&
                 !isGettingLocation && (
                  <CommandEmpty className="py-6 text-center text-muted-foreground">
                    {debouncedSearch.length < 3 
                      ? "Type at least 3 characters to search..." 
                      : "No locations found."}
                  </CommandEmpty>
                )}

                {/* Saved/Favorite Locations */}
                {(favoriteLocations.length > 0 || recentLocations.length > 0) && (
                  <CommandGroup heading="Saved Locations">
                    {favoriteLocations.map(loc => (
                      <div
                        key={`fav-${loc.id}`}
                        role="option"
                        tabIndex={0}
                        onClick={() => handleSelectSavedLocation(loc)}
                        style={{ touchAction: 'manipulation' }}
                        className="flex items-center p-3 cursor-pointer hover:bg-accent active:bg-accent/80"
                      >
                        <Star className="mr-3 h-5 w-5 text-yellow-500 fill-yellow-500" />
                        <div className="flex flex-col">
                          <span className="font-semibold">{loc.label}</span>
                          <span className="text-xs text-muted-foreground">Favorite Location</span>
                        </div>
                      </div>
                    ))}
                    {recentLocations.map(loc => (
                      <div
                        key={`recent-${loc.id}`}
                        role="option"
                        tabIndex={0}
                        onClick={() => handleSelectSavedLocation(loc)}
                        style={{ touchAction: 'manipulation' }}
                        className="flex items-center p-3 cursor-pointer hover:bg-accent active:bg-accent/80"
                      >
                        <Clock className="mr-3 h-5 w-5 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-semibold">{loc.label}</span>
                          <span className="text-xs text-muted-foreground">Recent Location</span>
                        </div>
                      </div>
                    ))}
                  </CommandGroup>
                )}

                {/* UK Postcode Result (Fallback) */}
                {ukPostcodeResult && (
                  <CommandGroup heading="Postcode Result">
                    <div
                      role="option"
                      tabIndex={0}
                      onClick={() => handleSelectUKPostcode(ukPostcodeResult)}
                      style={{ touchAction: 'manipulation' }}
                      className="flex items-center p-3 cursor-pointer hover:bg-accent active:bg-accent/80"
                    >
                      <MapPin className="mr-3 h-5 w-5 text-blue-500" />
                      <div className="flex flex-col">
                        <span className="font-semibold">{ukPostcodeResult.address || ukPostcodeResult.formatted}</span>
                        <span className="text-xs text-muted-foreground">UK Postcode Geocode</span>
                      </div>
                    </div>
                  </CommandGroup>
                )}

                {/* TomTom Search Results */}
                {tomtomResults.length > 0 && (
                  <CommandGroup heading={poiCategory ? "Nearby Places" : "Search Results"}>
                    {tomtomResults.map((result, index) => {
                      const isPoi = isTomTomPOI(result);
                      return (
                        <div
                          key={result.id || `tomtom-${index}`}
                          role="option"
                          tabIndex={0}
                          onClick={() => handleSelectTomTom(result)}
                          style={{ touchAction: 'manipulation' }}
                          className="flex items-center p-3 cursor-pointer hover:bg-accent active:bg-accent/80 border-b border-border/50 last:border-0"
                        >
                          {isPoi ? (
                            <Store className="mr-3 h-5 w-5 text-emerald-500 shrink-0" />
                          ) : (
                            <Globe className="mr-3 h-5 w-5 text-blue-500 shrink-0" />
                          )}
                          <div className="flex flex-col overflow-hidden">
                            <span className="font-semibold truncate">
                              {result.poi?.name || result.address.freeformAddress}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {result.address.municipality && `${result.address.municipality}, `}
                              {result.address.countryCode || result.address.country}
                            </span>
                            {result.dist != null && !isNaN(result.dist) && (
                              <Badge variant="secondary" className="w-fit mt-1 text-[10px] h-4 px-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                {(result.dist / 1609.34).toFixed(1)} miles away
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    
    {/* Error Display */}
    {tomtomError && debouncedSearch.length >= 3 && (
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
