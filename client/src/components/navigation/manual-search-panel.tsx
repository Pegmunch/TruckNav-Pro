import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Navigation, 
  Search, 
  X, 
  CornerUpLeft,
  ArrowUpDown,
  Crosshair,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useGPS } from "@/contexts/gps-context";
import { reverseGeocode, formatCoordinatesAsAddress } from "@/lib/reverse-geocode";

interface ManualSearchPanelProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
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
  const { toast } = useToast();
  const gpsData = useGPS();

  // Handle current location search
  const handleCurrentLocationSearch = useCallback(() => {
    if (!currentLocationSearch.trim()) {
      toast({
        title: "Please enter a location",
        description: "Enter a current location to search for",
        variant: "destructive"
      });
      return;
    }
    
    onFromLocationChange(currentLocationSearch.trim());
    
    toast({
      title: "Current location set",
      description: `Starting point updated to: ${currentLocationSearch.trim()}`
    });
  }, [currentLocationSearch, onFromLocationChange, toast]);

  // Handle destination search
  const handleDestinationSearch = useCallback(() => {
    if (!destinationSearch.trim()) {
      toast({
        title: "Please enter a destination",
        description: "Enter a destination to search for",
        variant: "destructive"
      });
      return;
    }
    
    onToLocationChange(destinationSearch.trim());
    
    toast({
      title: "Destination set",
      description: `Destination updated to: ${destinationSearch.trim()}`
    });
  }, [destinationSearch, onToLocationChange, toast]);

  // Handle postcode search
  const handlePostcodeSearch = useCallback(() => {
    if (!postcodeSearch.trim()) {
      toast({
        title: "Please enter a postcode",
        description: "Enter a valid postcode to search for",
        variant: "destructive"
      });
      return;
    }
    
    // Use postcode as destination by default
    onToLocationChange(postcodeSearch.trim());
    
    toast({
      title: "Postcode search complete",
      description: `Destination set to: ${postcodeSearch.trim()}`
    });
  }, [postcodeSearch, onToLocationChange, toast]);

  // Handle swap locations
  const handleSwapLocations = useCallback(() => {
    if (!fromLocation && !toLocation) {
      toast({
        title: "No locations to swap",
        description: "Please set both starting point and destination first",
        variant: "destructive"
      });
      return;
    }
    
    const temp = fromLocation;
    onFromLocationChange(toLocation);
    onToLocationChange(temp);
    
    toast({
      title: "Locations swapped",
      description: "Starting point and destination have been switched"
    });
  }, [fromLocation, toLocation, onFromLocationChange, onToLocationChange, toast]);

  // Handle use current location with reverse geocoding
  const handleUseCurrentLocation = useCallback(async () => {
    if (!gpsData || !gpsData.position) {
      toast({
        title: "GPS not available",
        description: "Unable to get your current location. Please enable GPS or enter address manually.",
        variant: "destructive",
      });
      return;
    }

    const { latitude, longitude } = gpsData.position;

    try {
      // Attempt reverse geocoding with 5 second timeout
      const result = await reverseGeocode(latitude, longitude, 5000);

      if (result && result.address) {
        // Success: Set the reverse geocoded address
        onFromLocationChange(result.address);
        toast({
          title: "Using current location",
          description: result.address,
        });
      } else {
        // Fallback: Use coordinates as string if reverse geocoding fails
        const coordsString = formatCoordinatesAsAddress(latitude, longitude);
        onFromLocationChange(coordsString);
        toast({
          title: "Using GPS coordinates",
          description: coordsString,
        });
      }
    } catch (error) {
      // Error handling: Fallback to coordinates
      const coordsString = formatCoordinatesAsAddress(latitude, longitude);
      onFromLocationChange(coordsString);
      toast({
        title: "Using GPS coordinates",
        description: coordsString,
      });
    }
  }, [gpsData, onFromLocationChange, toast]);

  return (
    <Card className={cn("bg-card", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <Search className="w-4 h-4 mr-2 text-primary" />
          Manual Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location Search */}
        <div className="space-y-2">
          <Label htmlFor="current-location-search" className="text-xs font-medium text-muted-foreground">
            Current Location Search
          </Label>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Input
                id="current-location-search"
                placeholder="Enter your current location..."
                value={currentLocationSearch}
                onChange={(e) => setCurrentLocationSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // If route exists and we can start navigation, do that instead of planning
                    if (currentRoute && selectedProfile && fromLocation && toLocation && onStartNavigation) {
                      onStartNavigation();
                    } else {
                      handleCurrentLocationSearch();
                    }
                  }
                }}
                className="automotive-input scalable-control-button"
                data-testid="input-current-location-search"
              />
            </div>
            <Button
              onClick={handleCurrentLocationSearch}
              disabled={!currentLocationSearch.trim()}
              size="sm"
              className="automotive-button shrink-0"
              data-testid="button-search-current-location"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Route calculation available after locations are set */}
          {isCalculating && (
            <div className="text-center py-2">
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                <CornerUpLeft className="w-4 h-4 mr-2 animate-spin" />
                <strong>CALCULATING ROUTE...</strong>
              </div>
            </div>
          )}

          {/* Use Current Location Button */}
          <Button
            onClick={handleUseCurrentLocation}
            variant="outline"
            size="sm"
            className="w-full automotive-button"
            data-testid="button-use-current-location"
          >
            <Crosshair className="w-4 h-4 mr-2" />
            Use GPS Location
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
              
              toast({
                title: "Locations swapped",
                description: "Starting point and destination have been switched"
              });
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
          <Label htmlFor="destination-search" className="text-xs font-medium text-muted-foreground">
            Destination Search
          </Label>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Input
                id="destination-search"
                placeholder="Enter your destination..."
                value={destinationSearch}
                onChange={(e) => setDestinationSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // If route exists and we can start navigation, do that instead of planning
                    if (currentRoute && selectedProfile && fromLocation && toLocation && onStartNavigation) {
                      onStartNavigation();
                    } else {
                      handleDestinationSearch();
                    }
                  }
                }}
                className="automotive-input scalable-control-button"
                data-testid="input-destination-search"
              />
            </div>
            <Button
              onClick={handleDestinationSearch}
              disabled={!destinationSearch.trim()}
              size="sm"
              className="automotive-button shrink-0"
              data-testid="button-search-destination"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
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