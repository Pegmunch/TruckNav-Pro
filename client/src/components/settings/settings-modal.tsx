/**
 * Consolidated Settings Modal for TruckNav Pro
 * 
 * Centralizes all settings functionality into organized tabs:
 * - Map & Traffic: Map layers, traffic display toggles, persistence settings
 * - Theme: Dark/light theme selector
 * - Language & Country: Language and country selection
 * - Units: Measurement units selection
 * - Notifications: Notification preferences including Do Not Disturb settings
 * - Legal: Access to legal notices and disclaimers
 * - Entertainment: Entertainment system preferences and opt-in settings
 */

import { useState, useEffect, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  Map, 
  Palette, 
  Globe, 
  Ruler, 
  Bell, 
  FileText, 
  Music, 
  X,
  MapPin,
  Car,
  Volume2,
  Eye,
  Layers,
  Navigation,
  Shield,
  Info,
  Headphones,
  Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Import existing components
import { ThemeSelector } from "@/components/theme/theme-selector";
import { MeasurementSelector } from "@/components/measurement/measurement-selector";
import LanguageSelector from "@/components/language/language-selector";
import CountryLanguageSelector from "@/components/country/country-language-selector";
import { DNDControls } from "@/components/notifications/dnd-controls";
import LegalNotices from "@/components/legal/legal-notices";
import LegalDisclaimerDialog from "@/components/legal/legal-disclaimer-dialog";

// Types
interface SettingsModalProps {
  /** Controls the visibility of the modal */
  open: boolean;
  /** Callback fired when the modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** Additional CSS classes for the modal */
  className?: string;
  /** Default tab to open */
  defaultTab?: string;
  /** Optional callback to close sidebar when clicking in settings area */
  onCloseSidebar?: () => void;
}

interface MapPreferences {
  mapViewMode: 'roads' | 'satellite';
  showTrafficLayer: boolean;
  showIncidents: boolean;
  showTruckRoutes: boolean;
  zoomLevel: number;
  persistSettings: boolean;
}

interface DoNotDisturbState {
  enabled: boolean;
  autoEnableOnNavigation: boolean;
  allowCritical: boolean;
  allowSafety: boolean;
}

interface EntertainmentSettings {
  enabled: boolean;
  autoPlay: boolean;
  volume: number;
  preferredPlatforms: string[];
  showTruckingContent: boolean;
}

const MAP_PREFERENCES_KEY = 'trucknav_map_preferences';
const DND_SETTINGS_KEY = 'trucknav_dnd_settings';
const ENTERTAINMENT_SETTINGS_KEY = 'trucknav_entertainment_settings';

// Default settings
const defaultMapPreferences: MapPreferences = {
  mapViewMode: 'roads',
  showTrafficLayer: true,
  showIncidents: true,
  showTruckRoutes: true,
  zoomLevel: 10,
  persistSettings: true,
};

const defaultDndState: DoNotDisturbState = {
  enabled: false,
  autoEnableOnNavigation: true,
  allowCritical: true,
  allowSafety: true,
};

const defaultEntertainmentSettings: EntertainmentSettings = {
  enabled: true,
  autoPlay: false,
  volume: 0.8,
  preferredPlatforms: ['tunein'],
  showTruckingContent: true,
};

/**
 * Load settings from localStorage with fallback to defaults
 */
function loadSettings<T>(key: string, defaultSettings: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.warn(`Failed to load settings for ${key}:`, error);
  }
  return defaultSettings;
}

/**
 * Save settings to localStorage
 */
function saveSettings<T>(key: string, settings: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.warn(`Failed to save settings for ${key}:`, error);
  }
}

/**
 * Consolidated Settings Modal Component
 */
const SettingsModal = memo(function SettingsModal({
  open,
  onOpenChange,
  className,
  defaultTab = "map-traffic",
  onCloseSidebar
}: SettingsModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Settings state
  const [mapPreferences, setMapPreferences] = useState<MapPreferences>(() => 
    loadSettings(MAP_PREFERENCES_KEY, defaultMapPreferences)
  );
  const [dndState, setDndState] = useState<DoNotDisturbState>(() => 
    loadSettings(DND_SETTINGS_KEY, defaultDndState)
  );
  const [entertainmentSettings, setEntertainmentSettings] = useState<EntertainmentSettings>(() => 
    loadSettings(ENTERTAINMENT_SETTINGS_KEY, defaultEntertainmentSettings)
  );
  
  // Legal disclaimer dialog state
  const [isLegalDisclaimerOpen, setIsLegalDisclaimerOpen] = useState(false);
  
  // Mock state for demonstration - in real app these would come from context/hooks
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isNavigating] = useState(false);
  const [notificationCount] = useState(0);

  // Save settings when they change
  useEffect(() => {
    saveSettings(MAP_PREFERENCES_KEY, mapPreferences);
  }, [mapPreferences]);

  useEffect(() => {
    saveSettings(DND_SETTINGS_KEY, dndState);
  }, [dndState]);

  useEffect(() => {
    saveSettings(ENTERTAINMENT_SETTINGS_KEY, entertainmentSettings);
  }, [entertainmentSettings]);

  /**
   * Handle modal close
   */
  const handleClose = () => {
    onOpenChange(false);
  };

  /**
   * Handle country/language change
   */
  const handleCountryLanguageChange = (countryCode: string, languageCode: string) => {
    toast({
      title: "Language Updated",
      description: `Changed to ${languageCode} for ${countryCode}`,
    });
  };

  /**
   * Tab configuration
   */
  const tabs = [
    {
      id: "map-traffic",
      label: "Map & Traffic",
      icon: Map,
      description: "Map layers and traffic settings"
    },
    {
      id: "theme",
      label: "Theme", 
      icon: Palette,
      description: "Appearance and theme settings"
    },
    {
      id: "language",
      label: "Language & Country",
      icon: Globe,
      description: "Language and region preferences"
    },
    {
      id: "units",
      label: "Units",
      icon: Ruler,
      description: "Measurement system settings"
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      description: "Notification and Do Not Disturb settings"
    },
    {
      id: "legal",
      label: "Legal",
      icon: FileText,
      description: "Legal notices and disclaimers"
    },
    {
      id: "entertainment",
      label: "Entertainment",
      icon: Music,
      description: "Entertainment system preferences"
    }
  ];

  /**
   * Map & Traffic Tab Content
   */
  const renderMapTrafficTab = () => (
    <div className="space-y-6">
      {/* Map View Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Map Display
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Map View Mode</Label>
              <p className="text-sm text-muted-foreground">
                Choose between roads or satellite view
              </p>
            </div>
            <Select 
              value={mapPreferences.mapViewMode} 
              onValueChange={(value: 'roads' | 'satellite') => 
                setMapPreferences(prev => ({ ...prev, mapViewMode: value }))
              }
            >
              <SelectTrigger className="w-32" data-testid="select-map-view-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="roads">Roads</SelectItem>
                <SelectItem value="satellite">Satellite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Show Traffic Layer</Label>
              <p className="text-sm text-muted-foreground">
                Display real-time traffic conditions on the map
              </p>
            </div>
            <Switch
              checked={mapPreferences.showTrafficLayer}
              onCheckedChange={(checked) => 
                setMapPreferences(prev => ({ ...prev, showTrafficLayer: checked }))
              }
              data-testid="switch-show-traffic-layer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Show Traffic Incidents</Label>
              <p className="text-sm text-muted-foreground">
                Display accidents, road closures, and other incidents
              </p>
            </div>
            <Switch
              checked={mapPreferences.showIncidents}
              onCheckedChange={(checked) => 
                setMapPreferences(prev => ({ ...prev, showIncidents: checked }))
              }
              data-testid="switch-show-incidents"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Show Truck Routes</Label>
              <p className="text-sm text-muted-foreground">
                Highlight truck-specific routing and restrictions
              </p>
            </div>
            <Switch
              checked={mapPreferences.showTruckRoutes}
              onCheckedChange={(checked) => 
                setMapPreferences(prev => ({ ...prev, showTruckRoutes: checked }))
              }
              data-testid="switch-show-truck-routes"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Persist Settings</Label>
              <p className="text-sm text-muted-foreground">
                Remember map preferences between sessions
              </p>
            </div>
            <Switch
              checked={mapPreferences.persistSettings}
              onCheckedChange={(checked) => 
                setMapPreferences(prev => ({ ...prev, persistSettings: checked }))
              }
              data-testid="switch-persist-settings"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => {
              setMapPreferences(defaultMapPreferences);
              toast({
                title: "Settings Reset",
                description: "Map preferences have been reset to defaults",
              });
            }}
            data-testid="button-reset-map-settings"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  /**
   * Entertainment Tab Content
   */
  const renderEntertainmentTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            Entertainment System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Enable Entertainment</Label>
              <p className="text-sm text-muted-foreground">
                Allow access to TuneIn Radio and MixCloud
              </p>
            </div>
            <Switch
              checked={entertainmentSettings.enabled}
              onCheckedChange={(checked) => 
                setEntertainmentSettings(prev => ({ ...prev, enabled: checked }))
              }
              data-testid="switch-entertainment-enabled"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Auto-play Content</Label>
              <p className="text-sm text-muted-foreground">
                Automatically start playing when starting navigation
              </p>
            </div>
            <Switch
              checked={entertainmentSettings.autoPlay}
              onCheckedChange={(checked) => 
                setEntertainmentSettings(prev => ({ ...prev, autoPlay: checked }))
              }
              data-testid="switch-entertainment-autoplay"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Show Trucking Content</Label>
              <p className="text-sm text-muted-foreground">
                Prioritize truck driver-relevant stations and content
              </p>
            </div>
            <Switch
              checked={entertainmentSettings.showTruckingContent}
              onCheckedChange={(checked) => 
                setEntertainmentSettings(prev => ({ ...prev, showTruckingContent: checked }))
              }
              data-testid="switch-show-trucking-content"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-base font-medium">Preferred Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {['tunein', 'mixcloud'].map((platform) => (
                <Button
                  key={platform}
                  variant={entertainmentSettings.preferredPlatforms.includes(platform) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setEntertainmentSettings(prev => ({
                      ...prev,
                      preferredPlatforms: prev.preferredPlatforms.includes(platform)
                        ? prev.preferredPlatforms.filter(p => p !== platform)
                        : [...prev.preferredPlatforms, platform]
                    }));
                  }}
                  data-testid={`button-platform-${platform}`}
                >
                  {platform === 'tunein' ? 'TuneIn Radio' : 'MixCloud'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entertainment Status */}
      {entertainmentSettings.enabled && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Entertainment features are enabled. You can access TuneIn Radio and MixCloud 
            {entertainmentSettings.showTruckingContent && ' with prioritized trucking content'}.
            {entertainmentSettings.autoPlay && ' Content will auto-play during navigation.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "max-w-2xl w-full h-[75vh] max-h-[600px]",
            "p-0 overflow-hidden flex flex-col",
            "bg-background border",
            className
          )}
          data-testid="dialog-settings-modal"
          onClick={(e) => {
            // Close sidebar when clicking anywhere in the settings area
            // but only if the click is on non-interactive elements
            const target = e.target as HTMLElement;
            const isInteractive = target.closest('button, input, select, textarea, [role="button"], [role="combobox"], [role="tab"], [role="tabpanel"], [data-radix-collection-item]');
            
            if (!isInteractive && onCloseSidebar) {
              onCloseSidebar();
            }
          }}
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-primary" />
                <div>
                  <DialogTitle className="text-xl font-semibold" data-testid="text-settings-title">
                    Settings
                  </DialogTitle>
                  <DialogDescription data-testid="text-settings-description">
                    Configure your TruckNav Pro preferences
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
                data-testid="button-close-settings"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-hidden min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              {/* Tab Navigation */}
              <div className="px-6 py-3 border-b bg-muted/30">
                <TabsList className="grid grid-cols-7 w-full h-auto p-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="flex flex-col items-center gap-1 px-3 py-2 text-xs data-[state=active]:bg-background"
                        data-testid={`tab-${tab.id}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden md:inline">{tab.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <TabsContent value="map-traffic" className="mt-0">
                      {renderMapTrafficTab()}
                    </TabsContent>

                    <TabsContent value="theme" className="mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Palette className="w-5 h-5" />
                            Theme & Appearance
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ThemeSelector
                            showLabels={true}
                            size="default"
                            variant="outline"
                            showGrayscale={true}
                            showColorSpectrum={true}
                            showAutoSettings={true}
                            showAutoStatus={true}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="language" className="mt-0">
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Globe className="w-5 h-5" />
                              Language & Country
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="space-y-3">
                              <Label className="text-base font-medium">Country & Language Selection</Label>
                              <CountryLanguageSelector
                                onValueChange={handleCountryLanguageChange}
                                mode="country-first"
                                variant="default"
                                showFavorites={true}
                                showRecent={true}
                                showTruckingMarkets={true}
                              />
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-3">
                              <Label className="text-base font-medium">Quick Language Selection</Label>
                              <LanguageSelector
                                variant="dropdown"
                                showCountryFlags={true}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="units" className="mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Ruler className="w-5 h-5" />
                            Measurement Units
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <MeasurementSelector variant="full" />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="notifications" className="mt-0">
                      <DNDControls
                        dndState={dndState}
                        onUpdateDndState={(updates) => setDndState(prev => ({ ...prev, ...updates }))}
                        voiceEnabled={voiceEnabled}
                        onVoiceEnabledChange={setVoiceEnabled}
                        isNavigating={isNavigating}
                        notificationCount={notificationCount}
                        onTestNotification={() => {
                          toast({
                            title: "Test Notification",
                            description: "This is a test notification to verify your settings.",
                          });
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="legal" className="mt-0">
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Shield className="w-5 h-5" />
                              Legal Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => setIsLegalDisclaimerOpen(true)}
                              data-testid="button-view-legal-disclaimer"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View Legal Terms & Disclaimers
                            </Button>
                            
                            <Separator />
                            
                            <div className="space-y-2">
                              <Label className="text-base font-medium">Legal Notices</Label>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>© 2024-2025 Bespoke Marketing.Ai Ltd</p>
                                <p>TruckNav Pro is a patented technology</p>
                                <p>All rights reserved worldwide</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <LegalNotices />
                      </div>
                    </TabsContent>

                    <TabsContent value="entertainment" className="mt-0">
                      {renderEntertainmentTab()}
                    </TabsContent>
                  </div>
                </ScrollArea>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Legal Disclaimer Dialog - only render when main modal is open */}
      {open && (
        <LegalDisclaimerDialog
          open={isLegalDisclaimerOpen}
          onOpenChange={setIsLegalDisclaimerOpen}
        />
      )}
    </>
  );
});

export default SettingsModal;