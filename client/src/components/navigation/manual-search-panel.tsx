import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MapPin, 
  Navigation, 
  Search, 
  X, 
  CornerUpLeft,
  ArrowUpDown,
  Crosshair,
  Mail,
  Loader2,
  AlertCircle,
  MapPinOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useGPS } from "@/contexts/gps-context";
import { reverseGeocode, formatCoordinatesAsAddress } from "@/lib/reverse-geocode";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

interface ManualSearchPanelProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onFromCoordinatesChange?: (coords: {lat: number, lng: number} | null) => void;
  onToCoordinatesChange?: (coords: {lat: number, lng: number} | null) => void;
  onPlanRoute: (routePreference?: 'fastest' | 'eco' | 'avoid_tolls', startLoc?: string, endLoc?: string) => void;
  onStartNavigation?: () => void;
  currentRoute?: any | null;
  selectedProfile?: any | null;
  isCalculating: boolean;
  className?: string;
}

export default function ManualSearchPanel({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onFromCoordinatesChange,
  onToCoordinatesChange,
  onPlanRoute,
  onStartNavigation,
  currentRoute,
  selectedProfile,
  isCalculating,
  className
}: ManualSearchPanelProps) {
  const [currentLocationSearch, setCurrentLocationSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [postcodeSearch, setPostcodeSearch] = useState("");
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [manualLocationDialogOpen, setManualLocationDialogOpen] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState("");
  const [isGeocodingManualLocation, setIsGeocodingManualLocation] = useState(false);
  const { toast } = useToast();
  const gpsData = useGPS();
  
  // Check if GPS is unavailable or permission denied
  const isGPSUnavailable = gpsData?.status === 'unavailable' || 
                          gpsData?.status === 'error' ||
                          gpsData?.errorType === 'PERMISSION_DENIED';
  const isUsingManualLocation = gpsData?.status === 'manual';

  // Handle current location search
  const handleCurrentLocationSearch = useCallback(() => {
    if (!currentLocationSearch.trim()) {
      // toast({
      //   title: "Please enter a location",
      //   description: "Enter a current location to search for",
      //   variant: "destructive"
      // });
      return;
    }
    
    onFromLocationChange(currentLocationSearch.trim());
    
    // toast({
    //   title: "Current location set",
    //   description: `Starting point updated to: ${currentLocationSearch.trim()}`
    // });
  }, [currentLocationSearch, onFromLocationChange, toast]);

  // Handle destination search
  const handleDestinationSearch = useCallback(() => {
    if (!destinationSearch.trim()) {
      // toast({
      //   title: "Please enter a destination",
      //   description: "Enter a destination to search for",
      //   variant: "destructive"
      // });
      return;
    }
    
    onToLocationChange(destinationSearch.trim());
    
    // toast({
    //   title: "Destination set",
    //   description: `Destination updated to: ${destinationSearch.trim()}`
    // });
  }, [destinationSearch, onToLocationChange, toast]);

  // Handle postcode search
  const handlePostcodeSearch = useCallback(() => {
    if (!postcodeSearch.trim()) {
      // toast({
      //   title: "Please enter a postcode",
      //   description: "Enter a valid postcode to search for",
      //   variant: "destructive"
      // });
      return;
    }
    
    // Use postcode as destination by default
    onToLocationChange(postcodeSearch.trim());
    
    // toast({
    //   title: "Postcode search complete",
    //   description: `Destination set to: ${postcodeSearch.trim()}`
    // });
  }, [postcodeSearch, onToLocationChange, toast]);

  // Handle swap locations
  const handleSwapLocations = useCallback(() => {
    if (!fromLocation && !toLocation) {
      // toast({
      //   title: "No locations to swap",
      //   description: "Please set both starting point and destination first",
      //   variant: "destructive"
      // });
      return;
    }
    
    const temp = fromLocation;
    onFromLocationChange(toLocation);
    onToLocationChange(temp);
    
    // toast({
    //   title: "Locations swapped",
    //   description: "Starting point and destination have been switched"
    // });
  }, [fromLocation, toLocation, onFromLocationChange, onToLocationChange, toast]);
  
  // Handle manual location setting when GPS unavailable
  const handleSetManualLocation = useCallback(async () => {
    if (!manualLocationInput.trim()) {
      // toast({
      //   title: "Please enter a location",
      //   description: "Enter an address or postcode (e.g., 'Luton LU2 7FG')",
      //   variant: "destructive"
      // });
      return;
    }
    
    setIsGeocodingManualLocation(true);
    
    try {
      // Try to geocode the address using Photon API directly
      // Wait for geocoding results
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(manualLocationInput)}&limit=1`);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.geometry.coordinates;
        const address = feature.properties.name || 
                       `${feature.properties.street || ''} ${feature.properties.housenumber || ''}`.trim() ||
                       feature.properties.city || 
                       feature.properties.state || 
                       manualLocationInput;
        
        // Set manual location in GPS context
        gpsData?.setManualLocation({
          latitude: lat,
          longitude: lng,
          address: address,
          timestamp: Date.now()
        });
        
        // Also set as from location
        onFromLocationChange(address);
        onFromCoordinatesChange?.({ lat, lng });
        
        // toast({
        //   title: "Manual location set",
        //   description: `Location set to: ${address}`,
        // });
        
        setManualLocationDialogOpen(false);
        setManualLocationInput("");
        
        console.log('[MANUAL-LOCATION] Set manual location:', {
          lat,
          lng,
          address
        });
      } else {
        // Try to parse as coordinates if no geocoding results
        const coordPattern = /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/;
        const match = manualLocationInput.match(coordPattern);
        
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          
          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            // Valid coordinates
            const address = formatCoordinatesAsAddress(lat, lng);
            
            gpsData?.setManualLocation({
              latitude: lat,
              longitude: lng,
              address: address,
              timestamp: Date.now()
            });
            
            onFromLocationChange(address);
            onFromCoordinatesChange?.({ lat, lng });
            
            // toast({
            //   title: "Manual location set",
            //   description: `Location set to coordinates: ${address}`,
            // });
            
            setManualLocationDialogOpen(false);
            setManualLocationInput("");
          } else {
            throw new Error("Invalid coordinates");
          }
        } else {
          throw new Error("No geocoding results found");
        }
      }
    } catch (error) {
      console.error('[MANUAL-LOCATION] Error setting manual location:', error);
      // toast({
      //   title: "Unable to set location",
      //   description: "Please try a different address or enter coordinates (lat, lng)",
      //   variant: "destructive"
      // });
    } finally {
      setIsGeocodingManualLocation(false);
    }
  }, [manualLocationInput, gpsData, onFromLocationChange, onFromCoordinatesChange, toast]);
  
  // Handle clearing manual location
  const handleClearManualLocation = useCallback(() => {
    gpsData?.clearManualLocation();
    // toast({
    //   title: "Manual location cleared",
    //   description: "GPS acquisition will be attempted",
    // });
  }, [gpsData, toast]);


  return (
    <Card className={cn("bg-card", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <Search className="w-4 h-4 mr-2 text-primary" />
          Manual Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GPS Unavailable Warning and Manual Location Setting */}
        {isGPSUnavailable && (
          <Alert className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800" data-testid="alert-gps-unavailable">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="space-y-2">
              <div className="font-medium text-orange-900 dark:text-orange-100" data-testid="text-gps-unavailable">
                GPS unavailable - Set your location manually
              </div>
              <Dialog open={manualLocationDialogOpen} onOpenChange={setManualLocationDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    data-testid="button-set-manual-location"
                  >
                    <MapPinOff className="w-4 h-4 mr-2" />
                    Set Location Manually
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Set Manual Location</DialogTitle>
                    <DialogDescription>
                      Enter an address, postcode, or coordinates to set your location manually.
                      This will be used when GPS is unavailable.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="manual-location">
                        Location (e.g., "Luton LU2 7FG" or "51.8787, -0.4200")
                      </Label>
                      <Input
                        id="manual-location"
                        placeholder="Enter address, postcode, or coordinates..."
                        value={manualLocationInput}
                        onChange={(e) => setManualLocationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isGeocodingManualLocation) {
                            e.preventDefault();
                            handleSetManualLocation();
                          }
                        }}
                        className="w-full"
                        autoFocus
                        data-testid="input-manual-location"
                      />
                      <p className="text-xs text-muted-foreground">
                        Examples: "London SW1A 1AA", "Manchester", "52.4862, -1.8904"
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setManualLocationDialogOpen(false)}
                      disabled={isGeocodingManualLocation}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSetManualLocation}
                      disabled={!manualLocationInput.trim() || isGeocodingManualLocation}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      data-testid="button-set-location"
                    >
                      {isGeocodingManualLocation ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Setting...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 mr-2" />
                          Set Location
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Show manual location indicator when active */}
        {isUsingManualLocation && gpsData?.manualLocation && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  Manual Location Active
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300" data-testid="text-manual-location-display">
                  {gpsData.manualLocation.address}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearManualLocation}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                data-testid="button-clear-manual-location"
              >
                <X className="w-4 h-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Current Location Search with AddressAutocomplete - includes GPS dropdown */}
        <div className="space-y-2">
          <Label htmlFor="from-location-autocomplete" className="text-xs font-medium text-muted-foreground">
            From (Current Location)
          </Label>
          <AddressAutocomplete
            id="from-location-autocomplete"
            value={currentLocationSearch}
            onChange={(value) => {
              setCurrentLocationSearch(value);
            }}
            onCoordinatesChange={(coords) => {
              if (coords) {
                onFromCoordinatesChange?.(coords);
              }
            }}
            coordinates={{lat: 0, lng: 0}}
            placeholder="Enter location or click GPS button"
            testId="input-from-location"
            className="w-full"
          />
          
          {/* Route calculation available after locations are set */}
          {isCalculating && (
            <div className="text-center py-2">
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                <CornerUpLeft className="w-4 h-4 mr-2 animate-spin" />
                <strong>CALCULATING ROUTE...</strong>
              </div>
            </div>
          )}
          
          {/* Confirm button for manual search */}
          <Button
            onClick={handleCurrentLocationSearch}
            disabled={!currentLocationSearch.trim()}
            size="sm"
            className="w-full automotive-button"
            data-testid="button-search-current-location"
          >
            <Search className="w-4 h-4 mr-2" />
            Confirm Location
          </Button>
        </div>

        {/* Swap Button between inputs */}
        <div className="flex justify-center">
          <Button
            onClick={() => {
              // Swap local input states
              const tempCurrent = currentLocationSearch;
              setCurrentLocationSearch(destinationSearch);
              setDestinationSearch(tempCurrent);
              
              // Also swap the actual location props if they exist
              if (fromLocation || toLocation) {
                const temp = fromLocation;
                onFromLocationChange(toLocation);
                onToLocationChange(temp);
              }
              
              // toast({
              //   title: "Locations swapped",
              //   description: "Starting point and destination have been switched"
              // });
            }}
            variant="outline"
            size="sm"
            className="automotive-button"
            data-testid="button-swap-locations-inline"
            disabled={!currentLocationSearch.trim() && !destinationSearch.trim() && !fromLocation && !toLocation}
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>

        <Separator />

        {/* Destination Search */}
        <div className="space-y-2">
          <Label htmlFor="destination-autocomplete" className="text-xs font-medium text-muted-foreground">
            Destination Search
          </Label>
          <AddressAutocomplete
            id="destination-autocomplete"
            value={destinationSearch}
            onChange={(value) => {
              setDestinationSearch(value);
              onToLocationChange(value);
            }}
            onCoordinatesChange={(coords) => {
              if (coords) {
                onToCoordinatesChange?.(coords);
              }
            }}
            coordinates={{lat: 0, lng: 0}}
            placeholder="Enter destination..."
            testId="input-destination-search"
            className="w-full"
          />
        </div>

        <Separator />

        {/* Postcode Search */}
        <div className="space-y-2">
          <Label htmlFor="postcode-search" className="text-xs font-medium text-muted-foreground">
            Postcode Search
          </Label>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="postcode-search"
                placeholder="Enter postcode (e.g., SW1A 1AA)..."
                value={postcodeSearch}
                onChange={(e) => setPostcodeSearch(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handlePostcodeSearch();
                  }
                }}
                className="pl-10 automotive-input scalable-control-button"
                data-testid="input-postcode-search"
              />
            </div>
            <Button
              onClick={handlePostcodeSearch}
              disabled={!postcodeSearch.trim()}
              size="sm"
              className="automotive-button shrink-0"
              data-testid="button-search-postcode"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Current Route Status */}
        {(fromLocation || toLocation) && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Current Route</Label>
            <div className="space-y-2">
              {fromLocation && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3 h-3 text-green-600" />
                  <span className="text-sm truncate">From: {fromLocation}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFromLocationChange('')}
                    className="h-6 w-6 p-0 shrink-0"
                    data-testid="button-clear-from-location"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {toLocation && (
                <div className="flex items-center space-x-2">
                  <Navigation className="w-3 h-3 text-red-600" />
                  <span className="text-sm truncate">To: {toLocation}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToLocationChange('')}
                    className="h-6 w-6 p-0 shrink-0"
                    data-testid="button-clear-to-location"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Route Actions */}
            <div className="flex space-x-2">
              {fromLocation && toLocation && (
                <Button
                  onClick={handleSwapLocations}
                  variant="outline"
                  size="sm"
                  className="flex-1 automotive-button"
                  data-testid="button-swap-locations"
                >
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  Swap
                </Button>
              )}
              
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          💡 Use keyboard to type locations and press Enter to search, or click the search buttons. GPS location button will use your current position.
        </div>
      </CardContent>
    </Card>
  );
}