/**
 * Fuel Price Comparison Tool
 * Shows nearby fuel stations with current prices, sorted by cheapest
 * Supports both GPS-based and route-based fuel station discovery
 * Uses UK Government Open Data Scheme for fuel pricing
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Fuel, 
  MapPin, 
  RefreshCw, 
  Navigation,
  TrendingDown,
  TrendingUp,
  Clock,
  Star,
  Route,
  Droplets,
  Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGPS } from "@/contexts/gps-context";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { apiRequest } from "@/lib/queryClient";

// Fuel types available in UK
type FuelType = 'B7' | 'E10' | 'E5' | 'SDV';

const FUEL_TYPES: { value: FuelType; label: string; description: string }[] = [
  { value: 'B7', label: 'Diesel (B7)', description: 'Standard diesel' },
  { value: 'E10', label: 'Petrol E10', description: 'Standard petrol' },
  { value: 'E5', label: 'Petrol E5', description: 'Premium petrol' },
  { value: 'SDV', label: 'Super Diesel', description: 'Premium diesel' },
];

interface FuelStation {
  id: string;
  brand: string;
  name: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  distance?: number; // km from current location (nearby mode)
  distanceAlongRoute?: number; // km from route start (route mode)
  distanceFromRoute?: number; // km off the main route
  prices: {
    B7?: number; // Diesel
    E10?: number; // Petrol E10
    E5?: number; // Petrol E5
    SDV?: number; // Super Diesel
  };
  lastUpdated: string;
  facilities?: string[];
  hasHGVPumps?: boolean;
  hasAdBlue?: boolean;
}

interface FuelPriceComparisonProps {
  onNavigateToStation?: (station: FuelStation) => void;
  routePath?: Array<{ lat: number; lng: number }>; // Optional route for along-route search
  className?: string;
}

export function FuelPriceComparison({ onNavigateToStation, routePath, className }: FuelPriceComparisonProps) {
  const gps = useGPS();
  const position = gps?.position;
  const { formatDistance } = useMeasurement();
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>('B7'); // Diesel default for trucks
  const [searchRadius, setSearchRadius] = useState(10); // km
  const [corridorWidth, setCorridorWidth] = useState(5); // km from route
  const [sortBy, setSortBy] = useState<'price' | 'distance'>('price');
  const [searchMode, setSearchMode] = useState<'nearby' | 'route'>(routePath ? 'route' : 'nearby');
  const [filterHGV, setFilterHGV] = useState(false);
  const [filterAdBlue, setFilterAdBlue] = useState(false);

  // Fetch nearby fuel prices from backend with coordinates and radius
  const { data: nearbyStations, isLoading: isLoadingNearby, error: errorNearby, refetch: refetchNearby, isFetching: isFetchingNearby } = useQuery<FuelStation[]>({
    queryKey: ['/api/fuel-prices', position?.latitude, position?.longitude, searchRadius],
    queryFn: async () => {
      if (!position) return [];
      const url = `/api/fuel-prices?lat=${position.latitude}&lng=${position.longitude}&radius=${searchRadius}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch fuel prices');
      return response.json();
    },
    enabled: !!position && searchMode === 'nearby',
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  // Create a stable hash of the route for cache key
  const routeHash = useMemo(() => {
    if (!routePath || routePath.length < 2) return null;
    // Use first, middle, and last points plus length for a stable signature
    const first = routePath[0];
    const mid = routePath[Math.floor(routePath.length / 2)];
    const last = routePath[routePath.length - 1];
    return `${first.lat.toFixed(4)},${first.lng.toFixed(4)}-${mid.lat.toFixed(4)},${mid.lng.toFixed(4)}-${last.lat.toFixed(4)},${last.lng.toFixed(4)}-${routePath.length}`;
  }, [routePath]);

  // Fetch fuel stations along route
  const { data: routeStations, isLoading: isLoadingRoute, error: errorRoute, refetch: refetchRoute, isFetching: isFetchingRoute } = useQuery<FuelStation[]>({
    queryKey: ['/api/fuel-prices/along-route', routeHash, corridorWidth],
    queryFn: async () => {
      if (!routePath || routePath.length < 2) return [];
      const response = await apiRequest('POST', '/api/fuel-prices/along-route', {
        routePath,
        corridorWidth,
      });
      return response.json();
    },
    enabled: !!routePath && routePath.length >= 2 && searchMode === 'route',
    staleTime: 5 * 60 * 1000,
  });

  // Use appropriate stations based on search mode
  const stations = searchMode === 'route' ? routeStations : nearbyStations;
  const isLoading = searchMode === 'route' ? isLoadingRoute : isLoadingNearby;
  const error = searchMode === 'route' ? errorRoute : errorNearby;
  const isFetching = searchMode === 'route' ? isFetchingRoute : isFetchingNearby;
  const refetch = searchMode === 'route' ? refetchRoute : refetchNearby;

  // Sort and filter stations
  const sortedStations = useMemo(() => {
    if (!stations) return [];
    
    return [...stations]
      .filter(station => station.prices[selectedFuelType] !== undefined)
      .filter(station => !filterHGV || station.hasHGVPumps)
      .filter(station => !filterAdBlue || station.hasAdBlue)
      .sort((a, b) => {
        if (sortBy === 'price') {
          const priceA = a.prices[selectedFuelType] ?? Infinity;
          const priceB = b.prices[selectedFuelType] ?? Infinity;
          return priceA - priceB;
        }
        // Distance sorting - use appropriate distance field
        const distA = searchMode === 'route' ? (a.distanceAlongRoute ?? 0) : (a.distance ?? 0);
        const distB = searchMode === 'route' ? (b.distanceAlongRoute ?? 0) : (b.distance ?? 0);
        return distA - distB;
      });
  }, [stations, selectedFuelType, sortBy, filterHGV, filterAdBlue, searchMode]);

  // Calculate average price for comparison
  const averagePrice = useMemo(() => {
    const validPrices = sortedStations
      .map(s => s.prices[selectedFuelType])
      .filter((p): p is number => p !== undefined);
    if (validPrices.length === 0) return null;
    return validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  }, [sortedStations, selectedFuelType]);

  // Find cheapest station
  const cheapestStation = sortedStations[0];
  const potentialSavings = useMemo(() => {
    if (!cheapestStation || !averagePrice) return null;
    const cheapestPrice = cheapestStation.prices[selectedFuelType];
    if (!cheapestPrice) return null;
    // Calculate savings for a 400L tank (typical truck tank)
    // Prices are in pence per litre, so divide by 100 to convert to pounds
    return ((averagePrice - cheapestPrice) * 400 / 100).toFixed(2);
  }, [cheapestStation, averagePrice, selectedFuelType]);

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return 'N/A';
    // Prices are in pence per litre, format as "XXX.Xp"
    return `${price.toFixed(1)}p`;
  };

  const getPriceIndicator = (price: number | undefined) => {
    if (!price || !averagePrice) return null;
    const diff = price - averagePrice;
    if (diff < -2) return { icon: TrendingDown, color: 'text-green-600', label: 'Below avg' };
    if (diff > 2) return { icon: TrendingUp, color: 'text-red-600', label: 'Above avg' };
    return null;
  };

  // Show waiting for GPS only if no route and no position
  if (!position && !routePath) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5" />
            Fuel Price Comparison
          </CardTitle>
          <CardDescription>
            Enable location or plan a route to find fuel stations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <MapPin className="w-6 h-6 mr-2" />
            <span>Waiting for GPS location or route...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5" />
            Fuel Price Comparison
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-fuel-prices"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          </Button>
        </div>
        
        {/* Potential savings banner */}
        {potentialSavings && parseFloat(potentialSavings) > 5 && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              💰 Save up to £{potentialSavings} on a full tank by choosing the cheapest station!
            </p>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Mode Tabs - only show if route is available */}
        {routePath && routePath.length >= 2 && (
          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'nearby' | 'route')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="nearby" className="text-xs">
                <MapPin className="w-3 h-3 mr-1" />
                Nearby
              </TabsTrigger>
              <TabsTrigger value="route" className="text-xs">
                <Route className="w-3 h-3 mr-1" />
                Along Route
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Fuel Type</label>
            <Select value={selectedFuelType} onValueChange={(v) => setSelectedFuelType(v as FuelType)}>
              <SelectTrigger data-testid="select-fuel-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUEL_TYPES.map(fuel => (
                  <SelectItem key={fuel.value} value={fuel.value}>
                    {fuel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Sort By</label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'price' | 'distance')}>
              <SelectTrigger data-testid="select-sort-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Cheapest First</SelectItem>
                <SelectItem value="distance">{searchMode === 'route' ? 'Along Route' : 'Nearest First'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* HGV Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterHGV ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterHGV(!filterHGV)}
            className="h-7 text-xs"
          >
            <Truck className="w-3 h-3 mr-1" />
            HGV Pumps
          </Button>
          <Button
            variant={filterAdBlue ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterAdBlue(!filterAdBlue)}
            className="h-7 text-xs"
          >
            <Droplets className="w-3 h-3 mr-1" />
            AdBlue
          </Button>
        </div>

        {/* Search radius / Corridor width */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs text-muted-foreground">
              {searchMode === 'route' ? 'Corridor Width' : 'Search Radius'}
            </label>
            <span className="text-xs font-medium">
              {searchMode === 'route' ? corridorWidth : searchRadius} km
            </span>
          </div>
          <Slider
            value={[searchMode === 'route' ? corridorWidth : searchRadius]}
            onValueChange={([v]) => searchMode === 'route' ? setCorridorWidth(v) : setSearchRadius(v)}
            min={searchMode === 'route' ? 1 : 5}
            max={searchMode === 'route' ? 20 : 50}
            step={searchMode === 'route' ? 1 : 5}
            data-testid="slider-search-radius"
          />
        </div>

        {/* Average price indicator */}
        {averagePrice && (
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Area Average ({selectedFuelType})</span>
            <span className="font-semibold">{formatPrice(averagePrice)}</span>
          </div>
        )}

        {/* Stations list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-500">
            <p>Failed to load fuel prices</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              Try Again
            </Button>
          </div>
        ) : sortedStations.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <Fuel className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No fuel stations found {searchMode === 'route' ? 'along route' : `within ${searchRadius}km`}</p>
            <p className="text-xs mt-1">
              {searchMode === 'route' 
                ? 'Try increasing the corridor width' 
                : 'Try increasing the search radius'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-3">
              {sortedStations.map((station, index) => {
                const price = station.prices[selectedFuelType];
                const indicator = getPriceIndicator(price);
                const isCheapest = index === 0 && sortBy === 'price';
                const displayDistance = searchMode === 'route' 
                  ? station.distanceAlongRoute 
                  : station.distance;
                
                return (
                  <div
                    key={station.id}
                    className={cn(
                      "p-3 border rounded-lg transition-colors hover:bg-muted/50",
                      isCheapest && "border-green-500 bg-green-50/50 dark:bg-green-900/10"
                    )}
                    data-testid={`fuel-station-${station.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium truncate">{station.brand}</h4>
                          {isCheapest && (
                            <Badge variant="default" className="bg-green-600 text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Best Price
                            </Badge>
                          )}
                          {station.hasHGVPumps && (
                            <Badge variant="outline" className="text-xs">
                              <Truck className="w-3 h-3 mr-1" />
                              HGV
                            </Badge>
                          )}
                          {station.hasAdBlue && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                              <Droplets className="w-3 h-3 mr-1" />
                              AdBlue
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {station.name || station.address}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {station.postcode}
                        </p>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "text-lg font-bold",
                            isCheapest && "text-green-600"
                          )}>
                            {formatPrice(price)}
                          </span>
                          {indicator && (
                            <indicator.icon className={cn("w-4 h-4", indicator.color)} />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">per litre</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {searchMode === 'route' ? <Route className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                          {formatDistance(displayDistance ?? 0, 'km')}
                          {searchMode === 'route' && ' along route'}
                        </span>
                        {searchMode === 'route' && station.distanceFromRoute !== undefined && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {formatDistance(station.distanceFromRoute, 'km')} off route
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(station.lastUpdated).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {onNavigateToStation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigateToStation(station)}
                          className="h-7 text-xs"
                          data-testid={`button-navigate-station-${station.id}`}
                        >
                          <Navigation className="w-3 h-3 mr-1" />
                          Go
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default FuelPriceComparison;
