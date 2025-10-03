import { Crosshair, CheckCircle, AlertCircle, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { useGPS } from '@/contexts/gps-context';

interface SimplifiedRouteDrawerProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onFromCoordinatesChange?: (coords: {lat: number, lng: number} | null) => void;
  onToCoordinatesChange?: (coords: {lat: number, lng: number} | null) => void;
  routePreference: 'fastest' | 'eco' | 'avoid_tolls';
  onRoutePreferenceChange: (value: 'fastest' | 'eco' | 'avoid_tolls') => void;
  onUseCurrentLocation?: () => void;
  onPlanRoute?: () => void;
}

export function SimplifiedRouteDrawer({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onFromCoordinatesChange,
  onToCoordinatesChange,
  routePreference,
  onRoutePreferenceChange,
  onUseCurrentLocation,
  onPlanRoute
}: SimplifiedRouteDrawerProps) {
  const gps = useGPS();

  const hasGPSError = gps?.error !== null || gps?.errorType !== null;
  const isGPSReady = gps?.position !== null && !hasGPSError;
  const isGPSInitializing = gps?.isTracking && !gps?.position && !hasGPSError;

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
              placeholder=""
              testId="input-from-location"
              className="flex-1"
            />
            <Button
              variant={hasGPSError ? "destructive" : "outline"}
              size="icon"
              onClick={onUseCurrentLocation}
              disabled={hasGPSError}
              className="h-10 w-10 shrink-0"
              data-testid="button-current-location"
            >
              <Crosshair className={`w-5 h-5 ${isGPSReady ? 'text-green-600 dark:text-green-400' : ''}`} />
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
            <AddressAutocomplete
              id="to-location"
              value={toLocation}
              onChange={onToLocationChange}
              onCoordinatesChange={onToCoordinatesChange}
              placeholder=""
              testId="input-to-location"
              className="flex-1"
            />
            <Button
              variant="default"
              size="lg"
              onClick={onPlanRoute}
              disabled={!fromLocation || !toLocation}
              className="h-10 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold shrink-0"
              data-testid="button-plan-route"
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
    </div>
  );
}
