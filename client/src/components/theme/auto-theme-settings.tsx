import { useState, useEffect, useCallback } from "react";
import { 
  AutoThemeConfig, 
  loadAutoThemeConfig, 
  saveAutoThemeConfig, 
  defaultAutoThemeConfig,
  getCurrentTimeInfo,
  generatePreviewTimes,
  getCurrentPosition,
  formatTimeInfo,
  getUserTimeZone,
  formatTimeZone
} from "@/lib/auto-theme-utils";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Settings, 
  Clock, 
  MapPin, 
  Palette, 
  Eye, 
  RotateCcw, 
  Sun, 
  Moon, 
  Sunrise, 
  Sunset,
  Timer,
  Globe,
  Thermometer,
  Calendar,
  Play,
  Pause,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoThemeSettingsProps {
  className?: string;
  showTrigger?: boolean;
  triggerVariant?: "outline" | "default" | "ghost";
}

export function AutoThemeSettings({ 
  className,
  showTrigger = true,
  triggerVariant = "outline"
}: AutoThemeSettingsProps) {
  const { currentTheme, effectiveTheme } = useTheme();
  
  const [config, setConfig] = useState<AutoThemeConfig>(defaultAutoThemeConfig);
  const [isOpen, setIsOpen] = useState(false);
  const [timeInfo, setTimeInfo] = useState(getCurrentTimeInfo(defaultAutoThemeConfig));
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [previewTimes] = useState(generatePreviewTimes());
  
  // Load config on mount
  useEffect(() => {
    const savedConfig = loadAutoThemeConfig();
    setConfig(savedConfig);
    setTimeInfo(getCurrentTimeInfo(savedConfig, coordinates || undefined));
  }, [coordinates]);
  
  // Update time info when config changes
  useEffect(() => {
    setTimeInfo(getCurrentTimeInfo(config, coordinates || undefined));
  }, [config, coordinates]);
  
  // Save config changes
  const handleConfigChange = useCallback((updates: Partial<AutoThemeConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    saveAutoThemeConfig(newConfig);
  }, [config]);
  
  // Handle geolocation request
  const handleRequestLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    
    try {
      const position = await getCurrentPosition();
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      
      setCoordinates(coords);
      handleConfigChange({ useGeolocation: true });
    } catch (error) {
      console.warn("Failed to get location:", error);
      handleConfigChange({ useGeolocation: false });
    } finally {
      setIsLoadingLocation(false);
    }
  }, [handleConfigChange]);
  
  // Reset to defaults
  const handleReset = useCallback(() => {
    setConfig(defaultAutoThemeConfig);
    saveAutoThemeConfig(defaultAutoThemeConfig);
    setCoordinates(null);
  }, []);
  
  // Preview time selection
  const handlePreviewTime = useCallback((timeString: string) => {
    const isPreview = timeString !== "current";
    
    handleConfigChange({
      previewMode: isPreview,
      previewTime: isPreview ? timeString : undefined,
    });
  }, [handleConfigChange]);
  
  const SettingsContent = () => (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">Basic</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-1">
            <Settings className="w-3 h-3" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="hidden sm:inline">Location</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">Preview</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Basic Settings Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Time Schedule
              </CardTitle>
              <CardDescription>
                Configure when day and night themes are applied
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Day Start Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Sunrise className="w-4 h-4 text-orange-500" />
                    Day Theme Starts
                  </Label>
                  <Badge variant="outline">
                    {config.dayStartHour.toString().padStart(2, '0')}:00
                  </Badge>
                </div>
                <Slider
                  value={[config.dayStartHour]}
                  onValueChange={([value]) => handleConfigChange({ dayStartHour: value })}
                  max={23}
                  min={0}
                  step={1}
                  className="w-full"
                  data-testid="day-start-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:00</span>
                </div>
              </div>
              
              {/* Night Start Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Sunset className="w-4 h-4 text-indigo-500" />
                    Night Theme Starts
                  </Label>
                  <Badge variant="outline">
                    {config.nightStartHour.toString().padStart(2, '0')}:00
                  </Badge>
                </div>
                <Slider
                  value={[config.nightStartHour]}
                  onValueChange={([value]) => handleConfigChange({ nightStartHour: value })}
                  max={23}
                  min={0}
                  step={1}
                  className="w-full"
                  data-testid="night-start-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:00</span>
                </div>
              </div>
              
              {/* Color Temperature */}
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-amber-500" />
                    Night Color Temperature
                  </Label>
                  <Switch
                    checked={config.enableColorTemperature}
                    onCheckedChange={(checked) => handleConfigChange({ enableColorTemperature: checked })}
                    data-testid="color-temperature-switch"
                  />
                </div>
                
                {config.enableColorTemperature && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Warmth</span>
                      <Badge variant="outline">
                        {config.warmTemperatureStrength}%
                      </Badge>
                    </div>
                    <Slider
                      value={[config.warmTemperatureStrength]}
                      onValueChange={([value]) => handleConfigChange({ warmTemperatureStrength: value })}
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                      data-testid="warmth-slider"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Cool</span>
                      <span>Neutral</span>
                      <span>Warm</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Advanced Settings Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced Options
              </CardTitle>
              <CardDescription>
                Fine-tune auto-theme behavior and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seasonal Adjustment */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    Seasonal Adjustments
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Adjust daylight hours based on season
                  </p>
                </div>
                <Switch
                  checked={config.enableSeasonalAdjustment}
                  onCheckedChange={(checked) => handleConfigChange({ enableSeasonalAdjustment: checked })}
                  data-testid="seasonal-adjustment-switch"
                />
              </div>
              
              <Separator />
              
              {/* Update Interval */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-500" />
                    Update Interval
                  </Label>
                  <Badge variant="outline">
                    {config.updateInterval}s
                  </Badge>
                </div>
                <Slider
                  value={[config.updateInterval]}
                  onValueChange={([value]) => handleConfigChange({ updateInterval: value })}
                  max={300}
                  min={30}
                  step={30}
                  className="w-full"
                  data-testid="update-interval-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>30s (Fast)</span>
                  <span>2m</span>
                  <span>5m (Battery)</span>
                </div>
              </div>
              
              {/* Transition Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Transition Duration</Label>
                  <Badge variant="outline">
                    {config.transitionDuration}ms
                  </Badge>
                </div>
                <Slider
                  value={[config.transitionDuration]}
                  onValueChange={([value]) => handleConfigChange({ transitionDuration: value })}
                  max={5000}
                  min={100}
                  step={100}
                  className="w-full"
                  data-testid="transition-duration-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Fast</span>
                  <span>Smooth</span>
                  <span>Slow</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Location Settings Tab */}
        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Location-Based Themes
              </CardTitle>
              <CardDescription>
                Use GPS for accurate sunrise and sunset times
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Timezone */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Current Time Zone</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-mono">{formatTimeZone()}</p>
                  <p className="text-xs text-muted-foreground">
                    {getUserTimeZone()}
                  </p>
                </div>
              </div>
              
              {/* GPS Location */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    GPS Location
                  </Label>
                  <Switch
                    checked={config.useGeolocation}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleRequestLocation();
                      } else {
                        handleConfigChange({ useGeolocation: false });
                        setCoordinates(null);
                      }
                    }}
                    disabled={isLoadingLocation}
                    data-testid="geolocation-switch"
                  />
                </div>
                
                {coordinates && config.useGeolocation ? (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">Location Active</span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-mono">
                      {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
                    </p>
                  </div>
                ) : config.useGeolocation && isLoadingLocation ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Requesting location access...</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      Enable to use GPS coordinates for precise sunrise/sunset calculation
                    </p>
                  </div>
                )}
                
                {!config.useGeolocation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRequestLocation}
                    disabled={isLoadingLocation}
                    className="w-full"
                    data-testid="request-location-button"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Enable GPS Location
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Theme Preview
              </CardTitle>
              <CardDescription>
                Test different times and see how themes will look
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Status */}
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Status</span>
                  <Badge variant={timeInfo.currentTheme === "day" ? "default" : "secondary"}>
                    {timeInfo.currentTheme === "day" ? (
                      <><Sun className="w-3 h-3 mr-1" />Light</>
                    ) : (
                      <><Moon className="w-3 h-3 mr-1" />Dark</>
                    )}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {formatTimeInfo(timeInfo)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Next switch in {timeInfo.timeUntilNextSwitch} minutes
                </p>
              </div>
              
              {/* Preview Time Selection */}
              <div className="space-y-2">
                <Label>Preview Different Times</Label>
                <Select
                  value={config.previewMode ? (config.previewTime || "current") : "current"}
                  onValueChange={handlePreviewTime}
                  data-testid="preview-time-select"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">
                      <div className="flex items-center gap-2">
                        <Play className="w-3 h-3" />
                        Current Time (Live)
                      </div>
                    </SelectItem>
                    {previewTimes.map((time) => (
                      <SelectItem key={time.time} value={time.time}>
                        <div className="flex items-center gap-2">
                          {time.theme === "day" ? (
                            <Sun className="w-3 h-3 text-amber-500" />
                          ) : (
                            <Moon className="w-3 h-3 text-indigo-500" />
                          )}
                          {time.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {config.previewMode && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-md border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                    <Pause className="w-4 h-4" />
                    <span className="text-sm font-medium">Preview Mode Active</span>
                  </div>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Themes are locked to preview time. Switch to "Current Time" to resume auto-theme.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleReset}
          className="flex-1"
          data-testid="reset-settings-button"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
  
  if (!showTrigger) {
    return (
      <div className={className}>
        <SettingsContent />
      </div>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          className={cn("flex items-center gap-2", className)}
          data-testid="auto-theme-settings-trigger"
        >
          <Settings className="w-4 h-4" />
          Auto-Theme Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Auto-Theme Settings
          </DialogTitle>
          <DialogDescription>
            Configure automatic theme switching based on time and location
          </DialogDescription>
        </DialogHeader>
        <SettingsContent />
      </DialogContent>
    </Dialog>
  );
}

// Compact version for smaller spaces
export function CompactAutoThemeSettings({ className }: { className?: string }) {
  return (
    <AutoThemeSettings
      className={className}
      showTrigger={true}
      triggerVariant="ghost"
    />
  );
}

// Inline settings without dialog
export function InlineAutoThemeSettings({ className }: { className?: string }) {
  return (
    <AutoThemeSettings
      className={className}
      showTrigger={false}
    />
  );
}