import { Crosshair, CheckCircle, AlertCircle, Loader2, Navigation, ShoppingCart, UtensilsCrossed, Fuel, Store, MapPin, Clock, X, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { useGPS } from '@/contexts/gps-context';
import React, { useState, useEffect, useRef, useCallback, type PointerEvent, type MouseEvent } from 'react';
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
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [recentLocations, setRecentLocations] = useState<Array<{ name: string; lat: number; lng: number; timestamp: number }>>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('trucknav_recent_locations');
      if (stored) {
        setRecentLocations(JSON.parse(stored).slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load recent locations:', error);
    }
  }, []);

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

  const handledByPointerRef = useRef<Record<string, boolean>>({});
  
  const createTouchHandler = useCallback((callback: (() => void) | undefined, label: string) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      handledByPointerRef.current[label] = true;
      callback?.();
      setTimeout(() => { handledByPointerRef.current[label] = false; }, 300);
    },
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!handledByPointerRef.current[label]) {
        callback?.();
      }
    }
  }), []);

  const poiCategories = [
    { value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
    { value: 'fuel', label: 'Fuel', icon: Fuel },
    { value: 'parking', label: 'Parking', icon: Store },
    { value: 'truck_stop', label: 'Truck Stop', icon: ShoppingCart },
    { value: 'shop', label: 'Shop', icon: Store },
    { value: 'supermarket', label: 'Supermarket', icon: ShoppingCart },
  ];

  const hasSearchableLocation = fromCoordinates || (isGPSReady && gps?.position);
  const shouldSearchPOI = selectedPOICategory && hasSearchableLocation;
  
  const gpsCoords = fromCoordinates ? {
    lat: fromCoordinates.lat,
    lng: fromCoordinates.lng
  } : gps?.position ? { 
    lat: gps.position.latitude, 
    lng: gps.position.longitude 
  } : undefined;
  
  const poiSearchParams = gpsCoords && selectedPOICategory ? 
    `lat=${gpsCoords.lat}&lng=${gpsCoords.lng}&radius=25&type=${selectedPOICategory}` : null;
  
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
    staleTime: 5 * 60 * 1000,
  });

  const handleSelectPOI = (poi: Facility) => {
    const displayLabel = poi.name;
    const address = poi.address || "";
    const fullLabel = address ? `${displayLabel}, ${address}` : displayLabel;
    const coordinates = { lat: poi.coordinates.lat, lng: poi.coordinates.lng };
    onToLocationChange(fullLabel);
    onToCoordinatesChange?.(coordinates);
    setSelectedPOICategory('');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="from-location" className="text-sm font-medium">From</Label>
          <div className="flex gap-2 relative">
            <AddressAutocomplete
              id="from-location"
              value={fromLocation}
              onChange={onFromLocationChange}
              onCoordinatesChange={onFromCoordinatesChange}
              placeholder="Search for address, postcode, or POI..."
              testId="input-from-location"
              className="flex-1"
              showSearchTypeToggles={false}
              hideGPSButton={true}
            />
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-3 shrink-0 cursor-pointer active:bg-gray-100 active:scale-95 select-none touch-manipulation"
              style={{ touchAction: 'manipulation' }}
              data-testid="button-location-dropdown"
              title="Select location or use GPS"
              {...createTouchHandler(() => setIsLocationDropdownOpen(!isLocationDropdownOpen), 'GPS-DROPDOWN')}
              type="button"
            >
              <Crosshair className={`w-5 h-5 ${isGPSReady ? 'text-green-600' : 'text-gray-400'}`} />
            </Button>

            {isLocationDropdownOpen && (
              <div 
                className="absolute top-full right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg p-2" 
                style={{ zIndex: 9999 }}
                data-testid="location-dropdown-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-1">
                  {isGPSReady && gps?.position && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-auto py-3 active:bg-gray-100 active:scale-98 select-none touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const coords = { lat: gps.position!.latitude, lng: gps.position!.longitude };
                        const locationName = 'Current Location';
                        onFromCoordinatesChange?.(coords);
                        onFromLocationChange(locationName);
                        saveRecentLocation(locationName, coords.lat, coords.lng);
                        onUseCurrentLocation?.();
                        setIsLocationDropdownOpen(false);
                      }}
                    >
                      <Crosshair className="w-4 h-4 mr-2 shrink-0 text-green-600" />
                      <span className="text-sm font-medium">Current Location</span>
                    </Button>
                  )}
                  {isGPSInitializing && !isGPSReady && (
                    <div className="p-3 text-xs text-center text-muted-foreground flex flex-col items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Waiting for GPS...</span>
                    </div>
                  )}
                  {hasGPSError && !isGPSReady && (
                    <div className="p-3 text-xs text-center text-destructive flex flex-col items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{gps?.errorMessage || 'Enable GPS in your browser settings'}</span>
                    </div>
                  )}
                  {recentLocations.length > 0 && <div className="border-t my-1" />}
                  {recentLocations.map((location, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      className="w-full justify-start h-auto py-3 active:bg-gray-100 active:scale-98 select-none touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const coords = { lat: location.lat, lng: location.lng };
                        onFromCoordinatesChange?.(coords);
                        onFromLocationChange(location.name);
                        saveRecentLocation(location.name, location.lat, location.lng);
                        onUseCurrentLocation?.();
                        setIsLocationDropdownOpen(false);
                      }}
                    >
                      <Clock className="w-4 h-4 mr-2 shrink-0 text-gray-400" />
                      <span className="text-sm truncate">{location.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {isLocationDropdownOpen && (
              <div className="fixed inset-0" style={{ zIndex: 45 }} onClick={() => setIsLocationDropdownOpen(false)} />
            )}
          </div>
          {gps && (
            <div className="flex items-center gap-2 text-xs">
              {isGPSReady ? (
                <><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-green-600">GPS Ready</span></>
              ) : hasGPSError ? (
                <><AlertCircle className="w-4 h-4 text-destructive" /><span className="text-destructive">{gps.errorMessage || 'GPS unavailable'}</span></>
              ) : isGPSInitializing ? (
                <><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Waiting for GPS...</span></>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="to-location" className="text-sm font-medium">To</Label>
          <div className="flex gap-2">
            <AddressAutocomplete
              id="to-location"
              value={toLocation}
              onChange={onToLocationChange}
              onCoordinatesChange={onToCoordinatesChange}
              placeholder="Search for destination..."
              testId="input-to-location"
              className="flex-1"
              hideGPSButton={true}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Route Preferences</h3>
        <Tabs value={routePreference} onValueChange={(value) => onRoutePreferenceChange(value as 'fastest' | 'eco' | 'avoid_tolls')}>
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="fastest">Fastest</TabsTrigger>
            <TabsTrigger value="eco">Eco</TabsTrigger>
            <TabsTrigger value="avoid_tolls">No Tolls</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-3 pb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Find Places Near Me</h3>
        <ToggleGroup type="single" value={selectedPOICategory} onValueChange={setSelectedPOICategory} className="grid grid-cols-2 gap-2 w-full">
          {poiCategories.map((category) => {
            const Icon = category.icon;
            return (
              <ToggleGroupItem key={category.value} value={category.value} className="h-12 text-sm" disabled={!hasSearchableLocation}>
                <Icon className="w-4 h-4 mr-2" />{category.label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

        {selectedPOICategory && hasSearchableLocation && (
          <div className="mt-3 space-y-2">
            {isLoadingPOI ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="ml-2 text-sm text-muted-foreground">Searching nearby...</span></div>
            ) : poiResults.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No {selectedPOICategory.replace('_', ' ')}s found nearby</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground px-2">Found {poiResults.length} nearby:</p>
                {poiResults.slice(0, 10).map((poi, index) => {
                  let distanceStr = '';
                  if (gpsCoords && poi.coordinates) {
                    const lat1 = gpsCoords.lat, lon1 = gpsCoords.lng, lat2 = poi.coordinates.lat, lon2 = poi.coordinates.lng;
                    const R = 3958.8, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
                    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
                    distanceStr = `(${(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1)} miles)`;
                  }
                  return (
                    <Button
                      key={poi.id || index}
                      variant="ghost"
                      className="w-full justify-start h-auto py-3 px-2 text-left active:bg-gray-100 active:scale-98 select-none touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectPOI(poi); }}
                    >
                      <MapPin className="w-4 h-4 mr-2 shrink-0 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{poi.name}</p>
                          {distanceStr && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">{distanceStr}</span>}
                        </div>
                        {poi.address && <p className="text-xs text-muted-foreground truncate">{poi.address}</p>}
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 mt-2 border-t sticky bottom-0 bg-white">
        <Button
          variant="default"
          size="lg"
          {...createTouchHandler(() => {
            console.log('[PREVIEW-DRAWER] Preview button clicked - calculating route only (no auto fly-by)');
            onPlanRoute?.();
          }, 'GO-ROUTE-FOOTER')}
          disabled={!fromLocation || !toLocation || !activeProfileId}
          className="w-full h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95 text-white text-lg font-bold shadow-lg flex items-center justify-center gap-3 select-none touch-manipulation"
          style={{ touchAction: 'manipulation' }}
        >
          <Map className="w-6 h-6" />
          Preview
        </Button>
      </div>
    </div>
  );
}
