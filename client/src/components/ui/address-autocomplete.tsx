import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
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
  coordinates?: {lat: number, lng: number} | null;
  placeholder: string;
  id: string;
  className?: string;
  testId: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onCoordinatesChange,
  coordinates,
  placeholder,
  id,
  className,
  testId
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [debouncedSearch, setDebouncedSearch] = useState(value);
  const [poiCategory, setPoiCategory] = useState<string>(''); 
  const { toast } = useToast();
  const gps = useGPS();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const countryCode = useMemo(() => {
    if (coordinates) {
      const { lat, lng } = coordinates;
      if (lat >= 49.9 && lat <= 60.9 && lng >= -8.2 && lng <= 1.8) return 'GB';
      return undefined;
    }
    if (gps?.position) {
      const { latitude, longitude } = gps.position;
      if (latitude >= 49.9 && latitude <= 60.9 && longitude >= -8.2 && longitude <= 1.8) return 'GB';
    }
    return undefined;
  }, [coordinates, gps?.position]);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: savedLocations = [] } = useQuery<SavedLocation[]>({
    queryKey: ['/api/locations'],
    staleTime: 300000,
  });

  const gpsCoordinates = useMemo(() => {
    if (coordinates) return coordinates;
    if (gps?.status === 'ready' && gps?.position) {
      return { lat: gps.position.latitude, lng: gps.position.longitude };
    }
    if (gps?.manualLocation) {
      return { lat: gps.manualLocation.latitude, lng: gps.manualLocation.longitude };
    }
    return undefined;
  }, [coordinates, gps?.position, gps?.status, gps?.manualLocation]);

  const { results: tomtomResults, isLoading: isLoadingTomTom } = useTomTomAutocomplete(
    searchTerm,
    open && searchTerm.length >= 3,
    countryCode,
    poiCategory || undefined,
    gpsCoordinates,
    poiCategory ? 'poi' : 'fuzzy'
  );

  const shouldTryUKPostcode = useMemo(() => {
    return (
      debouncedSearch.length >= 5 &&
      tomtomResults.length === 0 &&
      !isLoadingTomTom &&
      looksLikePostcode(debouncedSearch) &&
      detectPostcodeCountry(debouncedSearch) === 'UK'
    );
  }, [debouncedSearch, tomtomResults.length, isLoadingTomTom]);

  const { data: ukPostcodeResult, isLoading: isLoadingUKPostcode } = useQuery<PostcodeGeocodeResult | null>({
    queryKey: ['/api/uk-postcode', debouncedSearch],
    queryFn: async () => {
      return await geocodeUKPostcode(debouncedSearch);
    },
    enabled: open && shouldTryUKPostcode,
    staleTime: 300000,
    retry: 1,
  });

  const createLocationMutation = useMutation({
    mutationFn: async (locationData: { label: string; coordinates: { lat: number; lng: number }; isFavorite?: boolean }) => {
      const response = await apiRequest("POST", "/api/locations", locationData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
  });

  const filteredSavedLocations = savedLocations.filter(loc => 
    searchTerm.length === 0 || 
    loc.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const favoriteLocations = filteredSavedLocations.filter(loc => loc.isFavorite);
  const recentLocations = filteredSavedLocations
    .filter(loc => !loc.isFavorite && loc.useCount > 0)
    .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
    .slice(0, 5);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    if (newValue.length >= 2) setOpen(true);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && open) e.preventDefault();
  }, [open]);

  const handleSelectTomTom = useCallback((tomtomResult: TomTomResult) => {
    const displayLabel = formatTomTomDisplay(tomtomResult);
    const coordinates = extractTomTomCoordinates(tomtomResult);
    setSearchTerm(displayLabel);
    onChange(displayLabel);
    onCoordinatesChange?.(coordinates);
    setOpen(false);
    createLocationMutation.mutate({ label: displayLabel, coordinates, isFavorite: false });
  }, [onChange, onCoordinatesChange, createLocationMutation]);

  const handleSelectSavedLocation = useCallback((location: SavedLocation) => {
    setSearchTerm(location.label);
    onChange(location.label);
    onCoordinatesChange?.(location.coordinates);
    setOpen(false);
  }, [onChange, onCoordinatesChange]);

  const handleSelectUKPostcode = useCallback((result: PostcodeGeocodeResult) => {
    const displayLabel = result.address || result.formatted;
    setSearchTerm(displayLabel);
    onChange(displayLabel);
    onCoordinatesChange?.(result.coordinates);
    setOpen(false);
    createLocationMutation.mutate({ label: displayLabel, coordinates: result.coordinates, isFavorite: false });
  }, [onChange, onCoordinatesChange, createLocationMutation]);

  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleUseGPSLocation = useCallback(async () => {
    setIsGettingLocation(true);
    try {
      if (gps?.status === 'ready' && gps?.position) {
        const { latitude, longitude } = gps.position;
        const coordAddress = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setSearchTerm(coordAddress);
        onChange(coordAddress);
        onCoordinatesChange?.({ lat: latitude, lng: longitude });
        setOpen(true);
      } else if (gps?.manualLocation) {
        const { latitude, longitude, address } = gps.manualLocation;
        setSearchTerm(address || 'Manual Location');
        onChange(address || 'Manual Location');
        onCoordinatesChange?.({ lat: latitude, lng: longitude });
        setOpen(true);
      } else if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const coordAddress = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            setSearchTerm(coordAddress);
            onChange(coordAddress);
            onCoordinatesChange?.({ lat: latitude, lng: longitude });
            setOpen(true);
            setIsGettingLocation(false);
          },
          () => setIsGettingLocation(false),
          { enableHighAccuracy: true, timeout: 15000 }
        );
        return; 
      }
    } catch (error) {
      console.error('GPS Error:', error);
    } finally {
      setIsGettingLocation(false);
    }
  }, [gps, onChange, onCoordinatesChange]);

  const dynamicPlaceholder = useMemo(() => {
    if (poiCategory === '7315') return 'Search for truck stops near you...';
    if (poiCategory === '7311') return 'Search for gas stations near you...';
    if (poiCategory === '9920') return 'Search for rest areas near you...';
    return placeholder;
  }, [poiCategory, placeholder]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Search Type</Label>
        <ToggleGroup type="single" value={poiCategory} onValueChange={(v) => { setPoiCategory(v); setSearchTerm(''); }} className="justify-start gap-2 flex-wrap">
          <ToggleGroupItem value="" className="h-10 px-4 rounded-lg data-[state=on]:bg-blue-600 data-[state=on]:text-white"><MapPin className="h-4 w-4 mr-2" />Addresses</ToggleGroupItem>
          <ToggleGroupItem value="7315" className="h-10 px-4 rounded-lg data-[state=on]:bg-emerald-600 data-[state=on]:text-white"><Store className="h-4 w-4 mr-2" />Truck Stops</ToggleGroupItem>
          <ToggleGroupItem value="7311" className="h-10 px-4 rounded-lg data-[state=on]:bg-orange-600 data-[state=on]:text-white"><Fuel className="h-4 w-4 mr-2" />Gas Stations</ToggleGroupItem>
          <ToggleGroupItem value="9920" className="h-10 px-4 rounded-lg data-[state=on]:bg-purple-600 data-[state=on]:text-white"><UtensilsCrossed className="h-4 w-4 mr-2" />Rest Areas</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Button onClick={handleUseGPSLocation} disabled={isGettingLocation} variant="default" className="w-full h-14 bg-blue-600 text-white shadow-lg">
        {isGettingLocation ? <><Loader2 className="h-6 w-6 mr-2 animate-spin" />Getting Location...</> : <><Crosshair className="h-6 w-6 mr-2" />Use My Current Location</>}
      </Button>

      <div className="relative">
        <Input ref={inputRef} id={id} value={searchTerm} onChange={handleInputChange} onKeyDown={handleKeyDown} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} placeholder={dynamicPlaceholder} className={cn("h-14 text-base pl-12 pr-10", className)} data-testid={testId} />
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        {isLoadingTomTom && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {open && (
        <div className="mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 overflow-y-auto">
          <Command>
            <CommandList>
              {tomtomResults.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {tomtomResults.map((result, i) => (
                    <CommandItem key={i} onSelect={() => handleSelectTomTom(result)} className="p-3 cursor-pointer hover:bg-accent">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600"><MapPin className="h-4 w-4" /></div>
                        <div className="flex flex-col"><span className="font-medium">{result.poi?.name || result.address.freeformAddress}</span><span className="text-xs text-muted-foreground">{result.address.municipality}, {result.address.countrySubdivisionName}</span></div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {ukPostcodeResult && (
                <CommandGroup heading="UK Postcode">
                  <CommandItem onSelect={() => handleSelectUKPostcode(ukPostcodeResult)} className="p-3 cursor-pointer hover:bg-accent">
                    <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-blue-600" /><span>{ukPostcodeResult.formatted}</span></div>
                  </CommandItem>
                </CommandGroup>
              )}
              {favoriteLocations.length > 0 && (
                <CommandGroup heading="Favorites">
                  {favoriteLocations.map(loc => (
                    <CommandItem key={loc.id} onSelect={() => handleSelectSavedLocation(loc)} className="p-3 cursor-pointer hover:bg-accent">
                      <div className="flex items-center gap-3"><Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /><span>{loc.label}</span></div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {!isLoadingTomTom && tomtomResults.length === 0 && searchTerm.length >= 3 && <CommandEmpty className="p-4 text-center text-muted-foreground">No results found.</CommandEmpty>}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}