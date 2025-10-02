import { Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';

interface SimplifiedRouteDrawerProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  routePreference: 'fastest' | 'eco' | 'avoid_tolls';
  onRoutePreferenceChange: (value: 'fastest' | 'eco' | 'avoid_tolls') => void;
  onUseCurrentLocation?: () => void;
}

export function SimplifiedRouteDrawer({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  routePreference,
  onRoutePreferenceChange,
  onUseCurrentLocation
}: SimplifiedRouteDrawerProps) {

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
              placeholder=""
              testId="input-from-location"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={onUseCurrentLocation}
              className="h-10 w-10 shrink-0"
              data-testid="button-current-location"
            >
              <Crosshair className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to-location" className="text-sm font-medium">
            To
          </Label>
          <AddressAutocomplete
            id="to-location"
            value={toLocation}
            onChange={onToLocationChange}
            placeholder=""
            testId="input-to-location"
          />
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
