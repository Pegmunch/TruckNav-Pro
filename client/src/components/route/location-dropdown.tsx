import { useState, useEffect, memo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Bookmark, 
  BookmarkPlus, 
  Heart, 
  Clock,
  ChevronDown,
  Check
} from "lucide-react";
import { type Location } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  // Sync internal search value with external value
  useEffect(() => {
    setSearchValue(value);
  }, [value]);

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
                placeholder={placeholder}
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  onChange(e.target.value);
                }}
                className="pl-10 pr-8"
                data-testid={testId}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search locations..."
                value={searchValue}
                onValueChange={(value) => {
                  setSearchValue(value);
                  onChange(value);
                }}
              />
              <CommandList>
                {(isLoadingAll || isLoadingFavorites) && (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
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
    </div>
  );
});

export default LocationDropdown;