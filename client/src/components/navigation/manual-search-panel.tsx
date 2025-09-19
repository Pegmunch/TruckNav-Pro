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

interface ManualSearchPanelProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onPlanRoute: () => void;
  isCalculating: boolean;
  className?: string;
}

export default function ManualSearchPanel({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onPlanRoute,
  isCalculating,
  className
}: ManualSearchPanelProps) {
  const [currentLocationSearch, setCurrentLocationSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [postcodeSearch, setPostcodeSearch] = useState("");
  const { toast } = useToast();

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
    setCurrentLocationSearch("");
    
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
    setDestinationSearch("");
    
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
    setPostcodeSearch("");
    
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

  // Handle use current location
  const handleUseCurrentLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          onFromLocationChange(locationString);
          
          toast({
            title: "Current location detected",
            description: "Your current GPS location has been set as the starting point"
          });
        },
        (error) => {
          console.error('Geolocation error details:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.code === 1,
            POSITION_UNAVAILABLE: error.code === 2,
            TIMEOUT: error.code === 3
          });
          
          let errorTitle = "Location access failed";
          let errorDescription = "Please enable location access or enter your location manually";
          
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorTitle = "Location permission denied";
              errorDescription = "Please allow location access in your browser settings and try again";
              break;
            case 2: // POSITION_UNAVAILABLE
              errorTitle = "Location unavailable";
              errorDescription = "Your location could not be determined. Please enter manually";
              break;
            case 3: // TIMEOUT
              errorTitle = "Location timeout";
              errorDescription = "Location request timed out. Please try again or enter manually";
              break;
          }
          
          toast({
            title: errorTitle,
            description: errorDescription,
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: false, // Changed for better Safari compatibility
          timeout: 15000, // Increased timeout for Safari
          maximumAge: 300000 // 5 minutes cache
        }
      );
    } else {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services",
        variant: "destructive"
      });
    }
  }, [onFromLocationChange, toast]);

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
              <Crosshair className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="current-location-search"
                placeholder="Enter your current location..."
                value={currentLocationSearch}
                onChange={(e) => setCurrentLocationSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCurrentLocationSearch();
                  }
                }}
                className="pl-10 automotive-input scalable-control-button"
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

        <Separator />

        {/* Destination Search */}
        <div className="space-y-2">
          <Label htmlFor="destination-search" className="text-xs font-medium text-muted-foreground">
            Destination Search
          </Label>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Navigation className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="destination-search"
                placeholder="Enter your destination..."
                value={destinationSearch}
                onChange={(e) => setDestinationSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleDestinationSearch();
                  }
                }}
                className="pl-10 automotive-input scalable-control-button"
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
              
              {fromLocation && toLocation && (
                <Button
                  onClick={onPlanRoute}
                  disabled={isCalculating}
                  size="sm"
                  className="flex-1 automotive-button"
                  data-testid="button-plan-route-manual"
                >
                  {isCalculating ? (
                    <>
                      <CornerUpLeft className="w-4 h-4 mr-2 animate-spin" />
                      Planning...
                    </>
                  ) : (
                    <>
                      <CornerUpLeft className="w-4 h-4 mr-2" />
                      Plan Route
                    </>
                  )}
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