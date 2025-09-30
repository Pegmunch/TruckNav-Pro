import { useState } from 'react';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SimplifiedRouteDrawerProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onPlanRoute: (routePreference?: 'fastest' | 'eco' | 'avoid_tolls') => void;
  isCalculating: boolean;
  onUseCurrentLocation?: () => void;
}

export function SimplifiedRouteDrawer({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onPlanRoute,
  isCalculating,
  onUseCurrentLocation
}: SimplifiedRouteDrawerProps) {
  const [routePreference, setRoutePreference] = useState<'fastest' | 'eco' | 'avoid_tolls'>('fastest');

  return (
    <div className="space-y-6">
      {/* Route Inputs */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="from-location" className="text-base font-medium">
            From
          </Label>
          <div className="flex gap-2">
            <Input
              id="from-location"
              value={fromLocation}
              onChange={(e) => onFromLocationChange(e.target.value)}
              placeholder="Start location"
              className="h-12 text-base"
              data-testid="input-from-location"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={onUseCurrentLocation}
              className="h-12 w-12 shrink-0"
              data-testid="button-current-location"
            >
              <Crosshair className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to-location" className="text-base font-medium">
            To
          </Label>
          <Input
            id="to-location"
            value={toLocation}
            onChange={(e) => onToLocationChange(e.target.value)}
            placeholder="Destination"
            className="h-12 text-base"
            data-testid="input-to-location"
          />
        </div>
      </div>

      {/* Route Preferences */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Route Preferences</h3>
        <Tabs value={routePreference} onValueChange={(value) => setRoutePreference(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12">
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

      {/* Calculate Route Button */}
      <Button
        onClick={() => onPlanRoute(routePreference)}
        disabled={!toLocation || isCalculating}
        className="w-full h-14 text-lg font-semibold"
        data-testid="button-calculate-route"
      >
        {isCalculating ? (
          <>
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            <MapPin className="w-5 h-5 mr-3" />
            Calculate Route
          </>
        )}
      </Button>
    </div>
  );
}
