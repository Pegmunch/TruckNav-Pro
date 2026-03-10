import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EnhancedInput, QuickInput } from "@/components/ui/enhanced-input";
import { InputGroup, FieldGroup, ActionGroup } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Navigation, 
  ArrowUpDown, 
  Route,
  Clock,
  Fuel,
  Shield,
  Zap,
  Settings,
  Star,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedRouteFormProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onPlanRoute: (preference?: 'fastest' | 'eco' | 'avoid_tolls') => void;
  onSwapLocations: () => void;
  isCalculating: boolean;
  className?: string;
}

/**
 * Enhanced Route Form Component
 * Demonstrates improved route planning interface with:
 * - Quick input modes for different use cases
 * - Organized route preferences
 * - Better visual hierarchy
 * - Mobile-optimized touch targets
 */
export function EnhancedRouteForm({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onPlanRoute,
  onSwapLocations,
  isCalculating,
  className
}: EnhancedRouteFormProps) {
  const [routePreference, setRoutePreference] = useState<'fastest' | 'eco' | 'avoid_tolls'>('fastest');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidFerries, setAvoidFerries] = useState(false);
  const [avoidUnpavedRoads, setAvoidUnpavedRoads] = useState(true);

  const routeOptions = [
    {
      id: 'fastest',
      label: 'Fastest Route',
      description: 'Prioritizes speed and time efficiency',
      icon: Zap,
      badge: 'Recommended'
    },
    {
      id: 'eco',
      label: 'Eco Route',
      description: 'Optimized for fuel efficiency and lower emissions',
      icon: Fuel,
      badge: 'Green'
    },
    {
      id: 'avoid_tolls',
      label: 'Avoid Tolls',
      description: 'Routes around toll roads when possible',
      icon: Shield,
      badge: 'Economic'
    }
  ] as const;

  const handlePlanRoute = () => {
    if (!fromLocation.trim() || !toLocation.trim()) {
      return;
    }
    onPlanRoute(routePreference);
  };

  return (
    <div className={cn("space-y-6", className)} data-testid="enhanced-route-form">
      <Tabs defaultValue="route" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="route" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Route
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="route" className="space-y-6 mt-6">
          {/* Location Input Section */}
          <InputGroup
            title="Route Planning"
            description="Enter your starting point and destination"
            variant="card"
          >
            <div className="space-y-4">
              <FieldGroup
                label="Starting Point"
                description="Current location or departure address"
                required
              >
                <div className="relative">
                  <EnhancedInput
                    value={fromLocation}
                    onChange={(e) => onFromLocationChange(e.target.value)}
                    placeholder="Enter starting location..."
                    variant="location"
                    clearable
                    onClear={() => onFromLocationChange("")}
                    leftIcon={<MapPin className="h-4 w-4" />}
                    data-testid="input-from-location"
                  />
                </div>
              </FieldGroup>

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSwapLocations}
                  className="rounded-full h-10 w-10 p-0"
                  data-testid="button-swap-locations"
                  disabled={!fromLocation && !toLocation}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>

              <FieldGroup
                label="Destination"
                description="Where you want to go"
                required
              >
                <div className="relative">
                  <EnhancedInput
                    value={toLocation}
                    onChange={(e) => onToLocationChange(e.target.value)}
                    placeholder="Enter destination..."
                    variant="destination"
                    clearable
                    onClear={() => onToLocationChange("")}
                    leftIcon={<Navigation className="h-4 w-4" />}
                    data-testid="input-to-location"
                  />
                </div>
              </FieldGroup>
            </div>
          </InputGroup>

          {/* Route Preferences */}
          <InputGroup
            title="Route Preferences"
            description="Choose how you want your route calculated"
            variant="card"
          >
            <div className="grid grid-cols-1 gap-3">
              {routeOptions.map((option) => {
                const IconComponent = option.icon;
                const isSelected = routePreference === option.id;
                
                return (
                  <Card
                    key={option.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md",
                      isSelected 
                        ? "ring-2 ring-primary border-primary bg-primary/5" 
                        : "hover:border-primary/50"
                    )}
                    onClick={() => setRoutePreference(option.id)}
                    data-testid={`option-${option.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{option.label}</span>
                            <Badge 
                              variant={isSelected ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {option.badge}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </InputGroup>

          {/* Advanced Options */}
          <InputGroup
            title="Advanced Options"
            description="Additional routing constraints"
            variant="minimal"
          >
            <div className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full justify-between"
                data-testid="toggle-advanced-options"
              >
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Routing Options
                </span>
                <span className="text-xs text-muted-foreground">
                  {showAdvancedOptions ? 'Hide' : 'Show'}
                </span>
              </Button>

              {showAdvancedOptions && (
                <Card className="p-4">
                  <div className="space-y-4">
                    <FieldGroup layout="inline">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={avoidTolls}
                          onCheckedChange={setAvoidTolls}
                          data-testid="switch-avoid-tolls"
                        />
                        <div>
                          <span className="font-medium">Avoid Toll Roads</span>
                          <p className="text-sm text-muted-foreground">
                            Route around toll roads when possible
                          </p>
                        </div>
                      </div>
                    </FieldGroup>

                    <FieldGroup layout="inline">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={avoidFerries}
                          onCheckedChange={setAvoidFerries}
                          data-testid="switch-avoid-ferries"
                        />
                        <div>
                          <span className="font-medium">Avoid Ferries</span>
                          <p className="text-sm text-muted-foreground">
                            Avoid ferry crossings and water routes
                          </p>
                        </div>
                      </div>
                    </FieldGroup>

                    <FieldGroup layout="inline">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={avoidUnpavedRoads}
                          onCheckedChange={setAvoidUnpavedRoads}
                          data-testid="switch-avoid-unpaved"
                        />
                        <div>
                          <span className="font-medium">Avoid Unpaved Roads</span>
                          <p className="text-sm text-muted-foreground">
                            Stick to paved roads only
                          </p>
                        </div>
                      </div>
                    </FieldGroup>
                  </div>
                </Card>
              )}
            </div>
          </InputGroup>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4 mt-6">
          <InputGroup
            title="Favorite Locations"
            description="Quickly select from your saved locations"
            variant="card"
          >
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2" />
              <p>No favorite locations saved yet</p>
              <p className="text-sm">Save locations from your route history</p>
            </div>
          </InputGroup>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4 mt-6">
          <InputGroup
            title="Recent Routes"
            description="Select from your recent routes"
            variant="card"
          >
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2" />
              <p>No recent routes found</p>
              <p className="text-sm">Your route history will appear here</p>
            </div>
          </InputGroup>
        </TabsContent>
      </Tabs>

      {/* Route planning happens automatically - Start Navigation button is in the sidebar */}
      {isCalculating && (
        <div className="text-center py-4">
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            Calculating route...
          </div>
        </div>
      )}
    </div>
  );
}