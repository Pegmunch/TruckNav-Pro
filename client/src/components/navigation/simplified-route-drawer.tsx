import { Crosshair, CheckCircle, AlertCircle, Loader2, Navigation, ShoppingCart, UtensilsCrossed, Fuel, Store, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { useGPS } from '@/contexts/gps-context';
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Facility } from '@shared/schema';

interface SimplifiedRouteDrawerProps {
  fromLocation: string;
  toLocation: string;
  fromCoordinates?: {lat: number, lng: number} | null;
  toCoordinates?: {lat: number, lng: number} | null;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onFromCoordinatesChange?: (coords: {lat: number, lng: number} | null) => void;
  onToCoordinatesChange?: (coords: {lat: number, lng: number} | null) => void;
  routePreference: 'fastest' | 'eco' | 'avoid_tolls';
  onRoutePreferenceChange: (value: 'fastest' | 'eco' | 'avoid_tolls') => void;
  onUseCurrentLocation?: () => void;
  onPlanRoute?: () => void;
  activeProfileId?: string | null;
}

export function SimplifiedRouteDrawer({
  fromLocation,
  toLocation,
  fromCoordinates,
  toCoordinates,
  onFromLocationChange,
  onToLocationChange,
  onFromCoordinatesChange,
  onToCoordinatesChange,
  routePreference,
  onRoutePreferenceChange,
  onUseCurrentLocation,
  onPlanRoute,
  activeProfileId
}: SimplifiedRouteDrawerProps) {
  const gps = useGPS();
  const [selectedPOICategory, setSelectedPOICategory] = useState<string>('');
  const [poiSearchQuery, setPOISearchQuery] = useState('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [recentLocations, setRecentLocations] = useState<Array<{ name: string; lat: number; lng: number; timestamp: number }>>([]);

  // Load recent locations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('trucknav_recent_locations');
      if (stored) {
        setRecentLocations(JSON.parse(stored).slice(0, 5)); // Keep last 5
      }
    } catch (error) {
      console.error('Failed to load recent locations:', error);
    }
  }, []);

  // Save a location to recent locations
  const saveRecentLocation = (name: string, lat: number, lng: number) => {
    const newLocation = { name, lat, lng, timestamp: Date.now() };
    const updated = [newLocation, ...recentLocations.filter(l => !(l.lat === lat && l.lng === lng))].slice(0, 5);
    setRecentLocations(updated);
    try {
      localStorage.setItem('trucknav_recent_locations', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent location:', error);
    }
  };

  const hasGPSError = gps?.error !== null || gps?.errorType !== null;
  const isGPSReady = gps?.position !== null && !hasGPSError;
  const isGPSInitializing = gps?.isTracking && !gps?.position && !hasGPSError;

  // POI Categories - mapped to TomTom POI types
  const poiCategories = [
    { value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
    { value: 'fuel', label: 'Fuel', icon: Fuel },
    { value: 'parking', label: 'Parking', icon: Store },
    { value: 'truck_stop', label: 'Truck Stop', icon: ShoppingCart },
  ];

  // When POI category selected, automatically search with available location
  // Priority: 1) fromCoordinates (from address or GPS button), 2) direct GPS position
  const hasSearchableLocation = fromCoordinates || (isGPSReady && gps?.position);
  const shouldSearchPOI = selectedPOICategory && hasSearchableLocation;
  
  // Get coordinates for POI search
  const gpsCoords = fromCoordinates ? {
    lat: fromCoordinates.lat,
    lng: fromCoordinates.lng
  } : gps?.position ? { 
    lat: gps.position.latitude, 
    lng: gps.position.longitude 
  } : undefined;
  
  // Build POI search parameters for TomTom API
  const poiSearchParams = gpsCoords && selectedPOICategory ? 
    `lat=${gpsCoords.lat}&lng=${gpsCoords.lng}&radius=25&type=${selectedPOICategory}` : null;
  
  // Fetch POI results using TomTom-based /api/poi-search endpoint
  const { data: poiResults = [], isLoading: isLoadingPOI } = useQuery<Facility[]>({
    queryKey: ['/api/poi-search', poiSearchParams],
    queryFn: async () => {
      if (!poiSearchParams) return [];
      const response = await fetch(`/api/poi-search?${poiSearchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch POIs: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!shouldSearchPOI && !!poiSearchParams,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Handle POI selection
  const handleSelectPOI = (poi: Facility) => {
    const displayLabel = `${poi.name}${poi.address ? `, ${poi.address}` : ''}`;
    const coordinates = { lat: poi.coordinates.lat, lng: poi.coordinates.lng };
    
    onToLocationChange(displayLabel);
    onToCoordinatesChange?.(coordinates);
    setSelectedPOICategory(''); // Clear selection after choosing
  };

  return (
    <div className="space-y-6">
      {/* Route Inputs */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="from-location" className="text-sm font-medium">
            From
          </Label>
          <div className="flex gap-2">
            <AddressAutocomplete
              id="from-location"
              value={fromLocation}
              onChange={onFromLocationChange}
              onCoordinatesChange={onFromCoordinatesChange}
              placeholder="Search for address, postcode, or POI..."
              testId="input-from-location"
              className="flex-1"
            />
            <Popover open={isLocationDropdownOpen} onOpenChange={setIsLocationDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={!isGPSReady}
                  className="h-10 px-3 shrink-0"
                  data-testid="button-location-dropdown"
                  title={isGPSReady ? "Select location" : "GPS not ready"}
                >
                  <Crosshair className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start" data-testid="location-dropdown-menu">
                <div className="space-y-1">
                  {/* Current GPS Location - Always at top */}
                  {isGPSReady && gps?.position && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-auto py-2"
                      onClick={() => {
                        const coords = { lat: gps.position!.latitude, lng: gps.position!.longitude };
                        const locationName = 'Current Location';
                        onFromCoordinatesChange?.(coords);
                        onFromLocationChange(locationName);
                        saveRecentLocation(locationName, coords.lat, coords.lng);
                        onUseCurrentLocation?.();
                        setIsLocationDropdownOpen(false);
                      }}
                      data-testid="location-option-current"
                    >
                      <Crosshair className="w-4 h-4 mr-2 shrink-0 text-green-600" />
                      <span className="text-sm font-medium">Current Location</span>
                    </Button>
                  )}

                  {/* Divider if there are recent locations */}
                  {recentLocations.length > 0 && <div className="border-t my-1" />}

                  {/* Recent Locations */}
                  {recentLocations.map((location, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2"
                      onClick={() => {
                        const coords = { lat: location.lat, lng: location.lng };
                        onFromCoordinatesChange?.(coords);
                        onFromLocationChange(location.name);
                        saveRecentLocation(location.name, location.lat, location.lng);
                        onUseCurrentLocation?.();
                        setIsLocationDropdownOpen(false);
                      }}
                      data-testid={`location-option-recent-${idx}`}
                    >
                      <Clock className="w-4 h-4 mr-2 shrink-0 text-gray-400" />
                      <span className="text-sm truncate">{location.name}</span>
                    </Button>
                  ))}

                  {/* Empty state */}
                  {recentLocations.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      Locations will appear here as you use them
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* GPS Status Indicator */}
          {gps && (
            <div className="flex items-center gap-2 text-xs" data-testid="gps-status-indicator">
              {isGPSReady && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400">GPS Ready</span>
                </>
              )}
              {hasGPSError && (
                <>
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-destructive">{gps.errorMessage || 'GPS unavailable'}</span>
                </>
              )}
              {isGPSInitializing && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Waiting for GPS...</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="to-location" className="text-sm font-medium">
            To
          </Label>
          <div className="flex gap-2">
            <AddressAutocomplete
              id="to-location"
              value={toLocation}
              onChange={onToLocationChange}
              onCoordinatesChange={onToCoordinatesChange}
              placeholder="Search for destination..."
              testId="input-to-location"
              className="flex-1"
            />
            <Button
              variant="default"
              size="lg"
              onClick={onPlanRoute}
              disabled={!fromLocation || !toLocation || !activeProfileId}
              className="h-10 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-plan-route"
              title={!activeProfileId ? "Please select a vehicle profile first" : "Plan route"}
            >
              <Navigation className="w-5 h-5 mr-2" />
              GO
            </Button>
          </div>
        </div>
      </div>

      {/* Route Preferences */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Route Preferences</h3>
        <Tabs value={routePreference} onValueChange={(value) => onRoutePreferenceChange(value as 'fastest' | 'eco' | 'avoid_tolls')} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="fastest" className="text-sm" data-testid="tab-fastest">
              Fastest
            </TabsTrigger>
            <TabsTrigger value="eco" className="text-sm" data-testid="tab-eco">
              Eco
            </TabsTrigger>
            <TabsTrigger value="avoid_tolls" className="text-sm" data-testid="tab-avoid-tolls">
              No Tolls
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* POI Near Me */}
      <div className="space-y-3 pb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Find Places Near Me</h3>
        
        {/* POI Category Buttons */}
        <ToggleGroup 
          type="single" 
          value={selectedPOICategory} 
          onValueChange={setSelectedPOICategory}
          className="grid grid-cols-2 gap-2 w-full"
        >
          {poiCategories.map((category) => {
            const Icon = category.icon;
            return (
              <ToggleGroupItem
                key={category.value}
                value={category.value}
                className="h-12 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                data-testid={`poi-category-${category.value}`}
                disabled={!hasSearchableLocation}
              >
                <Icon className="w-4 h-4 mr-2" />
                {category.label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

        {!hasSearchableLocation && (
          <p className="text-xs text-muted-foreground text-center">
            {hasGPSError 
              ? 'Enter an address or click the GPS button to search nearby places' 
              : fromLocation 
                ? 'Enter a more specific address to search nearby places'
                : 'Enter a starting location to search nearby places'
            }
          </p>
        )}

        {/* POI Results */}
        {selectedPOICategory && hasSearchableLocation && (
          <div className="mt-3 space-y-2">
            {isLoadingPOI && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Searching nearby...</span>
              </div>
            )}

            {!isLoadingPOI && poiResults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No {selectedPOICategory.replace('_', ' ')}s found nearby
              </p>
            )}

            {!isLoadingPOI && poiResults.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground px-2">
                  Found {poiResults.length} nearby:
                </p>
                {poiResults.slice(0, 10).map((poi, index) => (
                  <Button
                    key={poi.id || index}
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 px-2 text-left"
                    onClick={() => handleSelectPOI(poi)}
                    data-testid={`poi-result-${index}`}
                  >
                    <MapPin className="w-4 h-4 mr-2 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {poi.name}
                      </p>
                      {poi.address && (
                        <p className="text-xs text-muted-foreground truncate">
                          {poi.address}
                        </p>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
