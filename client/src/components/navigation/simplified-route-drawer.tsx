import { Crosshair, CheckCircle, AlertCircle, Loader2, Navigation, ShoppingCart, UtensilsCrossed, Fuel, Store, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { useGPS } from '@/contexts/gps-context';
import React, { useState } from 'react';
import { 
  usePhotonAutocomplete, 
  formatPhotonDisplay, 
  extractPhotonCoordinates,
  type PhotonFeature 
} from '@/hooks/use-photon-autocomplete';

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

  const hasGPSError = gps?.error !== null || gps?.errorType !== null;
  const isGPSReady = gps?.position !== null && !hasGPSError;
  const isGPSInitializing = gps?.isTracking && !gps?.position && !hasGPSError;

  // POI Categories
  const poiCategories = [
    { value: 'shop:supermarket', label: 'Supermarket', icon: ShoppingCart },
    { value: 'amenity:restaurant', label: 'Restaurant', icon: UtensilsCrossed },
    { value: 'amenity:fuel', label: 'Fuel', icon: Fuel },
    { value: 'shop', label: 'Shop', icon: Store },
  ];

  // When POI category selected, automatically search with available location
  // Priority: 1) fromCoordinates (from address or GPS button), 2) direct GPS position
  const hasSearchableLocation = fromCoordinates || (isGPSReady && gps?.position);
  const shouldSearchPOI = selectedPOICategory && hasSearchableLocation;
  
  // Build search query with location context
  const poiSearchText = shouldSearchPOI 
    ? `${selectedPOICategory.split(':')[1] || selectedPOICategory} near me`
    : '';
  
  // DEBUG: Log POI search activation
  React.useEffect(() => {
    if (selectedPOICategory) {
      console.log('[POI-DEBUG] POI Category Selected:', selectedPOICategory);
      console.log('[POI-DEBUG] Has searchable location:', hasSearchableLocation);
      console.log('[POI-DEBUG] From Coordinates:', fromCoordinates);
      console.log('[POI-DEBUG] GPS Ready:', isGPSReady);
      console.log('[POI-DEBUG] GPS Position:', gps?.position ? {
        lat: gps.position.latitude,
        lng: gps.position.longitude
      } : 'not available');
      console.log('[POI-DEBUG] Using:', fromCoordinates ? 'Manual address coordinates' : isGPSReady ? 'GPS coordinates' : 'No coordinates');
    }
  }, [selectedPOICategory, hasSearchableLocation, fromCoordinates, gps, isGPSReady]);

  // Fetch POI results using Photon with osm_tag filtering and GPS coordinates
  // Use fromCoordinates first (from GPS button click), then fall back to direct GPS position
  const gpsCoords = fromCoordinates ? {
    lat: fromCoordinates.lat,
    lng: fromCoordinates.lng
  } : gps?.position ? { 
    lat: gps.position.latitude, 
    lng: gps.position.longitude 
  } : undefined;
  
  // DEBUG: Log GPS coordinates being passed to POI search
  if (selectedPOICategory) {
    console.log('[POI-DEBUG] POI Category Selected:', selectedPOICategory);
    console.log('[POI-DEBUG] GPS Position Available:', !!gps?.position);
    console.log('[POI-DEBUG] GPS Coordinates:', gpsCoords);
    console.log('[POI-DEBUG] Search Text:', poiSearchText);
    console.log('[POI-DEBUG] Should Search:', shouldSearchPOI);
  }
  
  const { results: poiResults, isLoading: isLoadingPOI } = usePhotonAutocomplete(
    poiSearchText,
    !!shouldSearchPOI,
    undefined, // No country restriction for POI
    selectedPOICategory, // Pass osm_tag filter
    gpsCoords // Pass GPS coordinates for location-biased search
  );

  // Handle POI selection
  const handleSelectPOI = (poi: PhotonFeature) => {
    const displayLabel = formatPhotonDisplay(poi);
    const coordinates = extractPhotonCoordinates(poi);
    
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
            {/* Address Autocomplete - TEMPORARILY DISABLED */}
            <Input
              id="from-location"
              value={fromLocation}
              onChange={(e) => onFromLocationChange(e.target.value)}
              placeholder="Autocomplete temporarily disabled"
              data-testid="input-from-location-disabled"
              className="flex-1"
              disabled={true}
              title="Address autocomplete temporarily disabled"
            />
            {/* GPS Button - TEMPORARILY DISABLED */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                alert('GPS functionality temporarily disabled for reconstruction');
              }}
              disabled={true}
              className="h-10 w-10 shrink-0 opacity-50 cursor-not-allowed"
              data-testid="button-current-location-disabled"
              title="GPS functionality temporarily disabled"
            >
              <Crosshair className="w-5 h-5 text-muted-foreground" />
            </Button>
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
            {/* Address Autocomplete - TEMPORARILY DISABLED */}
            <Input
              id="to-location"
              value={toLocation}
              onChange={(e) => onToLocationChange(e.target.value)}
              placeholder="Autocomplete temporarily disabled"
              data-testid="input-to-location-disabled"
              className="flex-1"
              disabled={true}
              title="Address autocomplete temporarily disabled"
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
                No {selectedPOICategory.split(':')[1] || 'places'} found nearby
              </p>
            )}

            {!isLoadingPOI && poiResults.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground px-2">
                  Found {poiResults.length} nearby:
                </p>
                {poiResults.slice(0, 5).map((poi, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 px-2 text-left"
                    onClick={() => handleSelectPOI(poi)}
                    data-testid={`poi-result-${index}`}
                  >
                    <MapPin className="w-4 h-4 mr-2 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {poi.properties.name || poi.properties.street || 'Unknown'}
                      </p>
                      {poi.properties.city && (
                        <p className="text-xs text-muted-foreground truncate">
                          {poi.properties.city}
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
