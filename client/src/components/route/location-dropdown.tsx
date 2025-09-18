import { useState, useEffect, memo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import VirtualKeyboard from "@/components/ui/virtual-keyboard";
import { 
  MapPin, 
  Bookmark, 
  BookmarkPlus, 
  Heart, 
  Clock,
  ChevronDown,
  Check,
  Mail,
  Globe,
  Keyboard,
  Search
} from "lucide-react";
import { type Location } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  autoFormatPostcode, 
  looksLikePostcode, 
  validatePostcodeInput, 
  POSTCODE_PATTERNS, 
  type PostcodeCountry 
} from "@/lib/postcode-utils";

interface LocationDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  testId: string;
  icon: "start" | "destination";
}

const LocationDropdown = memo(function LocationDropdown({
  value,
  onChange,
  placeholder,
  testId,
  icon,
}: LocationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [isPostcodeMode, setIsPostcodeMode] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [postcodeValidation, setPostcodeValidation] = useState<{
    isValid: boolean;
    country: PostcodeCountry | null;
    formatted: string;
    error?: string;
  }>({ isValid: false, country: null, formatted: "" });
  const { toast } = useToast();

  // Sync internal search value with external value
  useEffect(() => {
    setSearchValue(value);
    
    // Auto-detect if the input looks like a postcode
    if (value && looksLikePostcode(value) && !isPostcodeMode) {
      setIsPostcodeMode(true);
    }
  }, [value, isPostcodeMode]);

  // Handle postcode validation and formatting
  useEffect(() => {
    if (isPostcodeMode && searchValue) {
      const validation = validatePostcodeInput(searchValue);
      setPostcodeValidation(validation);
      
      // Auto-format the postcode if valid
      if (validation.isValid && validation.formatted !== searchValue) {
        setSearchValue(validation.formatted);
        onChange(validation.formatted);
      }
    } else {
      setPostcodeValidation({ isValid: false, country: null, formatted: "" });
    }
  }, [searchValue, isPostcodeMode, onChange]);

  // Virtual keyboard handlers
  const handleKeyboardSearch = useCallback((searchTerm: string) => {
    if (searchTerm.trim()) {
      setSearchValue(searchTerm);
      onChange(searchTerm);
      setOpen(true); // Open dropdown to show results
      setShowVirtualKeyboard(false);
    }
  }, [onChange]);

  const handleKeyboardEnter = useCallback(() => {
    if (searchValue.trim()) {
      onChange(searchValue);
      setOpen(true); // Open dropdown to show results
      setShowVirtualKeyboard(false);
    }
  }, [searchValue, onChange]);

  const handleToggleKeyboard = useCallback(() => {
    setShowVirtualKeyboard(!showVirtualKeyboard);
    // Close dropdown when opening keyboard
    if (!showVirtualKeyboard) {
      setOpen(false);
    }
  }, [showVirtualKeyboard]);

  // Fetch location history and favorites
  const { data: allLocations = [], isLoading: isLoadingAll } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const { data: favoriteLocations = [], isLoading: isLoadingFavorites } = useQuery<Location[]>({
    queryKey: ["/api/locations", "favorites"],
    queryFn: () => fetch("/api/locations?favorites=true", { credentials: "include" }).then(res => res.json()),
  });

  // Sort locations for display
  const sortedLocations = allLocations
    .filter(loc => !loc.isFavorite) // Non-favorites only (favorites shown separately)
    .sort((a, b) => {
      // Sort by usage count and last used date
      if (a.useCount !== b.useCount) {
        return (b.useCount || 0) - (a.useCount || 0);
      }
      if (a.lastUsedAt && b.lastUsedAt) {
        return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
      }
      return 0;
    })
    .slice(0, 10); // Show top 10 recent locations

  // Postcode search query (only active when in postcode mode)
  const { data: postcodeResults = [], isLoading: isLoadingPostcodes } = useQuery({
    queryKey: ["/api/postcodes/search", searchValue, postcodeValidation.country],
    queryFn: async () => {
      if (!searchValue || searchValue.length < 3) return [];
      const params = new URLSearchParams({ postcode: searchValue });
      if (postcodeValidation.country) {
        params.append('country', postcodeValidation.country);
      }
      const response = await fetch(`/api/postcodes/search?${params}`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isPostcodeMode && searchValue.length >= 3,
    retry: false,
  });

  // Postcode geocoding mutation for exact lookups
  const geocodePostcodeMutation = useMutation({
    mutationFn: async (postcodeData: { postcode: string; country?: string }) => {
      const response = await apiRequest("POST", "/api/postcodes/geocode", postcodeData);
      return response.json();
    },
    onSuccess: (result) => {
      // Create or update location with postcode result
      const locationData = {
        label: `${result.formatted} (${result.address || result.city || 'Postcode'})`,
        coordinates: result.coordinates,
        isFavorite: false,
      };
      
      createLocationMutation.mutate(locationData);
      
      // Set the value immediately
      onChange(result.formatted);
      setSearchValue(result.formatted);
      setOpen(false);
      
      toast({
        title: "Postcode found",
        description: `${result.formatted} - ${result.address || result.city}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Postcode not found",
        description: error instanceof Error ? error.message : "Could not geocode this postcode",
        variant: "destructive",
      });
    },
  });

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (locationData: { label: string; coordinates: { lat: number; lng: number }; isFavorite?: boolean }) => {
      const response = await apiRequest("POST", "/api/locations", locationData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate location queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({
        title: "Location saved",
        description: "Location has been added to your history",
      });
      setShowSaveDialog(false);
      setSaveLabel("");
    },
    onError: (error) => {
      toast({
        title: "Error saving location",
        description: error instanceof Error ? error.message : "Failed to save location",
        variant: "destructive",
      });
    },
  });

  // Mark location as used mutation
  const markUsedMutation = useMutation({
    mutationFn: async (locationId: number) => {
      const response = await apiRequest("POST", `/api/locations/${locationId}/use`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to update usage counts
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation<
    any,
    Error,
    { locationId: number; isFavorite: boolean }
  >({
    mutationFn: async ({ locationId, isFavorite }: { locationId: number; isFavorite: boolean }) => {
      const response = await apiRequest("PATCH", `/api/locations/${locationId}`, { isFavorite });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({
        title: variables.isFavorite ? "Added to favorites" : "Removed from favorites",
        description: "Location favorites updated",
      });
    },
  });

  const handleLocationSelect = useCallback((location: Location) => {
    onChange(location.label);
    setSearchValue(location.label);
    setOpen(false);
    
    // Mark location as used
    markUsedMutation.mutate(location.id);
  }, [onChange, markUsedMutation]);

  // Handle postcode result selection
  const handlePostcodeSelect = useCallback((postcodeResult: any) => {
    const formattedLabel = `${postcodeResult.formatted} (${postcodeResult.address || postcodeResult.city})`;
    onChange(formattedLabel);
    setSearchValue(postcodeResult.formatted);
    setOpen(false);
    
    // Create location entry for this postcode
    const locationData = {
      label: formattedLabel,
      coordinates: postcodeResult.coordinates,
      isFavorite: false,
    };
    
    createLocationMutation.mutate(locationData);
    
    toast({
      title: "Postcode selected",
      description: `${postcodeResult.formatted} - ${postcodeResult.address || postcodeResult.city}`,
    });
  }, [onChange, createLocationMutation, toast]);

  // Handle enter key press for postcode search
  const handlePostcodeEnter = useCallback(() => {
    if (isPostcodeMode && postcodeValidation.isValid && searchValue) {
      geocodePostcodeMutation.mutate({
        postcode: searchValue,
        country: postcodeValidation.country || undefined,
      });
    }
  }, [isPostcodeMode, postcodeValidation, searchValue, geocodePostcodeMutation]);

  const handleSaveLocation = useCallback(() => {
    if (!saveLabel.trim()) {
      toast({
        title: "Invalid location name",
        description: "Please enter a name for this location",
        variant: "destructive",
      });
      return;
    }

    // For demo purposes, we'll use sample coordinates
    // In a real app, this would come from geocoding the current input value
    const mockCoordinates = {
      lat: 52.5074 + (Math.random() - 0.5) * 0.1, // Random coordinates near London
      lng: -0.1278 + (Math.random() - 0.5) * 0.1,
    };

    createLocationMutation.mutate({
      label: saveLabel,
      coordinates: mockCoordinates,
      isFavorite: false,
    });
  }, [saveLabel, createLocationMutation, toast]);

  const handleToggleFavorite = useCallback((location: Location, event: React.MouseEvent) => {
    event.stopPropagation();
    toggleFavoriteMutation.mutate({
      locationId: location.id,
      isFavorite: !location.isFavorite,
    });
  }, [toggleFavoriteMutation]);

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <div className={`w-3 h-3 rounded-full ${
                  icon === "start" ? "bg-accent" : "bg-destructive"
                }`}></div>
              </div>
              <Input
                placeholder={isPostcodeMode 
                  ? `Enter ${postcodeValidation.country ? POSTCODE_PATTERNS[postcodeValidation.country]?.label || 'postcode' : 'postcode'} (e.g., ${postcodeValidation.country ? POSTCODE_PATTERNS[postcodeValidation.country]?.example : 'SW1A 1AA, 10001'})`
                  : placeholder
                }
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  onChange(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isPostcodeMode) {
                    e.preventDefault();
                    handlePostcodeEnter();
                  }
                }}
                className={`pl-10 pr-8 ${
                  isPostcodeMode && postcodeValidation.error 
                    ? "border-destructive focus:border-destructive" 
                    : ""
                } ${
                  isPostcodeMode && postcodeValidation.isValid 
                    ? "border-green-500 focus:border-green-500" 
                    : ""
                }`}
                data-testid={testId}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {isPostcodeMode && (
                  <div className="flex items-center gap-1">
                    {postcodeValidation.country && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {postcodeValidation.country}
                      </Badge>
                    )}
                    {postcodeValidation.isValid && (
                      <Check className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <Label htmlFor="postcode-mode" className="text-sm font-medium">
                  Postcode Search
                </Label>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <Switch
                    id="postcode-mode"
                    checked={isPostcodeMode}
                    onCheckedChange={setIsPostcodeMode}
                    data-testid="switch-postcode-mode"
                  />
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              {isPostcodeMode && postcodeValidation.error && (
                <div className="mt-2 text-xs text-destructive">
                  {postcodeValidation.error}
                </div>
              )}
              {isPostcodeMode && postcodeValidation.isValid && (
                <div className="mt-2 text-xs text-green-600">
                  Valid {postcodeValidation.country} postcode format
                </div>
              )}
            </div>
            <Command>
              <CommandInput
                placeholder={isPostcodeMode 
                  ? "Enter postcode/ZIP code..." 
                  : "Search locations..."
                }
                value={searchValue}
                onValueChange={(value) => {
                  setSearchValue(value);
                  onChange(value);
                }}
              />
              <CommandList>
                {(isLoadingAll || isLoadingFavorites || isLoadingPostcodes) && (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                )}

                {/* Postcode Search Results */}
                {isPostcodeMode && postcodeResults.length > 0 && (
                  <CommandGroup heading="Postcode Results">
                    {postcodeResults.map((result: any, index: number) => (
                      <CommandItem
                        key={`postcode-${result.postcode}-${index}`}
                        value={result.formatted}
                        onSelect={() => handlePostcodeSelect(result)}
                        className="flex items-center justify-between cursor-pointer"
                        data-testid={`postcode-result-${index}`}
                      >
                        <div className="flex items-center space-x-3">
                          <Mail className="w-4 h-4 text-blue-500" />
                          <div>
                            <div className="font-medium">{result.formatted}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.address || result.city} ({result.country})
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {(result.confidence * 100).toFixed(0)}%
                          </Badge>
                          <Globe className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Show "Press Enter to search" for valid postcodes */}
                {isPostcodeMode && postcodeValidation.isValid && postcodeResults.length === 0 && !isLoadingPostcodes && (
                  <CommandGroup heading="Postcode Search">
                    <CommandItem
                      onSelect={handlePostcodeEnter}
                      className="flex items-center space-x-3 cursor-pointer"
                      data-testid="postcode-search-enter"
                    >
                      <Mail className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="font-medium">Search for {postcodeValidation.formatted}</div>
                        <div className="text-xs text-muted-foreground">
                          Press Enter or click to find this postcode
                        </div>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                )}

                {/* No results for postcode search */}
                {isPostcodeMode && searchValue.length >= 3 && postcodeResults.length === 0 && !isLoadingPostcodes && !postcodeValidation.isValid && (
                  <CommandEmpty>
                    <div className="text-center py-4">
                      <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No postcodes found. Check the format and try again.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported: UK, US, CA, AU, DE, FR postcodes
                      </p>
                    </div>
                  </CommandEmpty>
                )}

                {favoriteLocations.length > 0 && (
                  <CommandGroup heading="Favorites">
                    {favoriteLocations.map((location) => (
                      <CommandItem
                        key={`fav-${location.id}`}
                        value={location.label}
                        onSelect={() => handleLocationSelect(location)}
                        className="flex items-center justify-between cursor-pointer"
                        data-testid={`location-favorite-${location.id}`}
                      >
                        <div className="flex items-center space-x-3">
                          <Heart className="w-4 h-4 text-red-500 fill-current" />
                          <div>
                            <div className="font-medium">{location.label}</div>
                            <div className="text-xs text-muted-foreground">
                              Used {location.useCount || 0} times
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleToggleFavorite(location, e)}
                          className="h-auto p-1"
                          data-testid={`button-unfavorite-${location.id}`}
                        >
                          <Heart className="w-3 h-3 text-red-500 fill-current" />
                        </Button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {favoriteLocations.length > 0 && sortedLocations.length > 0 && (
                  <Separator />
                )}

                {sortedLocations.length > 0 && (
                  <CommandGroup heading="Recent Locations">
                    {sortedLocations.map((location) => (
                      <CommandItem
                        key={`recent-${location.id}`}
                        value={location.label}
                        onSelect={() => handleLocationSelect(location)}
                        className="flex items-center justify-between cursor-pointer"
                        data-testid={`location-recent-${location.id}`}
                      >
                        <div className="flex items-center space-x-3">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{location.label}</div>
                            <div className="text-xs text-muted-foreground">
                              Used {location.useCount || 0} times
                              {location.lastUsedAt && (
                                <> • {new Date(location.lastUsedAt).toLocaleDateString()}</>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleToggleFavorite(location, e)}
                          className="h-auto p-1"
                          data-testid={`button-favorite-${location.id}`}
                        >
                          <Heart className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {!isLoadingAll && !isLoadingFavorites && 
                 favoriteLocations.length === 0 && sortedLocations.length === 0 && (
                  <CommandEmpty>
                    <div className="text-center py-4">
                      <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No locations found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Save locations to see them here
                      </p>
                    </div>
                  </CommandEmpty>
                )}

                {searchValue && (
                  <>
                    <Separator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSaveLabel(searchValue);
                          setShowSaveDialog(true);
                          setOpen(false);
                        }}
                        className="flex items-center space-x-3 cursor-pointer"
                        data-testid={`button-save-new-location`}
                      >
                        <BookmarkPlus className="w-4 h-4 text-primary" />
                        <div>
                          <div className="font-medium">Save "{searchValue}"</div>
                          <div className="text-xs text-muted-foreground">
                            Add to your location history
                          </div>
                        </div>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Go Button for Postcode Search - appears when in postcode mode */}
        {isPostcodeMode && (
          <Button
            size="lg"
            onClick={handlePostcodeEnter}
            disabled={!postcodeValidation.isValid || geocodePostcodeMutation.isPending || !searchValue.trim()}
            className="h-11 min-w-[44px] px-4 shrink-0"
            aria-label="Search postcode"
            data-testid="button-postcode-go"
          >
            {geocodePostcodeMutation.isPending ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span className="hidden sm:inline ml-2">Go</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={handleToggleKeyboard}
          className={`shrink-0 ${showVirtualKeyboard ? 'bg-primary text-primary-foreground' : ''}`}
          data-testid={`button-toggle-keyboard-${icon}`}
        >
          <Keyboard className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setSaveLabel(value);
            setShowSaveDialog(true);
          }}
          disabled={!value.trim()}
          className="shrink-0"
          data-testid={`button-save-location-${icon}`}
        >
          <Bookmark className="w-4 h-4" />
        </Button>
      </div>

      {/* Save Location Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="dialog-save-location">
          <div className="bg-card border rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Location</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Location Name</label>
                <Input
                  value={saveLabel}
                  onChange={(e) => setSaveLabel(e.target.value)}
                  placeholder="Enter a name for this location"
                  data-testid="input-save-location-name"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveLabel("");
                  }}
                  className="flex-1"
                  data-testid="button-cancel-save"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveLocation}
                  disabled={!saveLabel.trim() || createLocationMutation.isPending}
                  className="flex-1"
                  data-testid="button-confirm-save"
                >
                  {createLocationMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Virtual Keyboard */}
      <VirtualKeyboard
        value={searchValue}
        onChange={(newValue) => {
          // Auto-uppercase for postcode mode
          const finalValue = isPostcodeMode ? newValue.toUpperCase() : newValue;
          setSearchValue(finalValue);
          onChange(finalValue);
        }}
        onEnter={handleKeyboardEnter}
        onSearch={handleKeyboardSearch}
        placeholder={isPostcodeMode 
          ? `Enter ${postcodeValidation.country ? POSTCODE_PATTERNS[postcodeValidation.country]?.label || 'postcode' : 'postcode'}...`
          : `Enter ${icon === 'start' ? 'starting location' : 'destination'}...`
        }
        isVisible={showVirtualKeyboard}
        onToggleKeyboard={handleToggleKeyboard}
        keyboardLayout={isPostcodeMode ? "alphabetical" : "qwerty"}
        showSuggestions={true}
        suggestions={isPostcodeMode 
          ? (postcodeValidation.country ? [POSTCODE_PATTERNS[postcodeValidation.country].example] : ['SW1A 1AA', '10001', 'K1A 0A6', '2000'])
          : favoriteLocations.map(loc => loc.label).slice(0, 5)
        }
        onSuggestionClick={(suggestion) => {
          setSearchValue(suggestion);
          onChange(suggestion);
          setShowVirtualKeyboard(false);
        }}
        compact={false}
        className="mt-4"
        testId={`virtual-keyboard-${icon}`}
      />
    </div>
  );
});

export default LocationDropdown;