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

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  MapPin,
  Car,
  Volume2,
  Eye,
  Layers,
  Navigation,
  Shield,
  Info,
  Headphones,
  Truck,
  Crosshair,
  Wifi,
  WifiOff,
  MapPinned,
  Play,
  Gauge,
  Coffee,
  AlertTriangle,
  Trash2,
  RotateCcw,
  Users,
  Building2,
  ClipboardCheck
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type FleetVehicle, type Operator } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useGPS } from "@/contexts/gps-context";
import { useTranslation } from "react-i18next";
import { countries } from "@/data/countries";

// Import existing components
import { MeasurementSelector } from "@/components/measurement/measurement-selector";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { DNDControls } from "@/components/notifications/dnd-controls";
import LegalNotices from "@/components/legal/legal-notices";
import { navigationVoice } from "@/lib/navigation-voice";
import { 
  getAlertSoundsService, 
  type AllAlertSoundSettings, 
  type AlertType,
  SOUND_OPTIONS 
} from "@/lib/alert-sounds";

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
  /** Callback to start pre-trip inspection with selected vehicle and operator */
  onStartInspection?: (vehicleId: string, operatorId: string, vehicleReg: string, operatorName: string) => void;
}

interface MapPreferences {
  mapViewMode: 'roads' | 'satellite';
  showTrafficLayer: boolean;
  showIncidents: boolean;
  showTruckRoutes: boolean;
  zoomLevel: number;
  persistSettings: boolean;
  poiSearchRadius: number; // Radius in kilometers
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
  poiSearchRadius: 10, // 10km (≈6 miles) default
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

function VoiceWheelPicker({ voices, selectedVoiceName, disabled, onSelect }: {
  voices: SpeechSynthesisVoice[];
  selectedVoiceName: string;
  disabled: boolean;
  onSelect: (value: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44;
  const visibleItems = 5;
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const voiceOptions = [
    { value: 'auto', label: 'Auto (Female preferred)', lang: '' },
    ...voices
      .filter(v => v.lang.startsWith('en'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(v => ({ value: v.name, label: v.name, lang: v.lang })),
    ...voices
      .filter(v => !v.lang.startsWith('en'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(v => ({ value: v.name, label: v.name, lang: v.lang })),
  ];

  const selectedIndex = voiceOptions.findIndex(v => v.value === selectedVoiceName);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetScroll = activeIndex * itemHeight;
    el.scrollTop = targetScroll;
  }, [activeIndex, voiceOptions.length]);

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    isScrollingRef.current = true;
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      const el = scrollRef.current;
      if (!el) return;
      const scrollPos = el.scrollTop;
      const snappedIndex = Math.round(scrollPos / itemHeight);
      const clampedIndex = Math.max(0, Math.min(snappedIndex, voiceOptions.length - 1));
      el.scrollTo({ top: clampedIndex * itemHeight, behavior: 'smooth' });
      if (voiceOptions[clampedIndex] && voiceOptions[clampedIndex].value !== selectedVoiceName) {
        onSelect(voiceOptions[clampedIndex].value);
      }
    }, 120);
  }, [voiceOptions, selectedVoiceName, onSelect, itemHeight]);

  const handleItemClick = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: index * itemHeight, behavior: 'smooth' });
    if (voiceOptions[index]) {
      onSelect(voiceOptions[index].value);
    }
  }, [voiceOptions, onSelect, itemHeight]);

  const wheelHeight = itemHeight * visibleItems;
  const paddingItems = Math.floor(visibleItems / 2);

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Voice Selection</Label>
      <p className="text-sm text-muted-foreground">
        Scroll to choose a voice for navigation
      </p>
      <div
        className={cn(
          "relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden",
          disabled && "opacity-50 pointer-events-none"
        )}
        style={{ height: wheelHeight }}
      >
        <div
          className="absolute left-0 right-0 pointer-events-none z-10 border-y-2 border-blue-500 bg-blue-50/30 dark:bg-blue-900/20"
          style={{
            top: paddingItems * itemHeight,
            height: itemHeight,
          }}
        />
        <div
          className="absolute left-0 right-0 top-0 pointer-events-none z-10"
          style={{
            height: paddingItems * itemHeight,
            background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)',
          }}
        />
        <div
          className="absolute left-0 right-0 bottom-0 pointer-events-none z-10"
          style={{
            height: paddingItems * itemHeight,
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)',
          }}
        />
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto"
          onScroll={handleScroll}
          style={{
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {Array.from({ length: paddingItems }).map((_, i) => (
            <div key={`pad-top-${i}`} style={{ height: itemHeight }} />
          ))}
          {voiceOptions.map((voice, index) => (
            <div
              key={voice.value}
              onClick={() => handleItemClick(index)}
              className={cn(
                "flex items-center justify-between px-4 cursor-pointer transition-all duration-150 select-none",
                index === activeIndex
                  ? "text-foreground font-semibold scale-100"
                  : "text-muted-foreground font-normal scale-95 opacity-70"
              )}
              style={{
                height: itemHeight,
                scrollSnapAlign: 'start',
              }}
            >
              <span className="truncate text-sm">{voice.label}</span>
              {voice.lang && (
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {voice.lang}
                </span>
              )}
            </div>
          ))}
          {Array.from({ length: paddingItems }).map((_, i) => (
            <div key={`pad-bot-${i}`} style={{ height: itemHeight }} />
          ))}
        </div>
      </div>
      {selectedVoiceName !== 'auto' && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => onSelect('auto')}
        >
          Reset to auto
        </Button>
      )}
    </div>
  );
}

const SettingsModal = memo(function SettingsModal({
  open,
  onOpenChange,
  className,
  defaultTab = "map-traffic",
  onCloseSidebar,
  onStartInspection
}: SettingsModalProps) {
  const { toast } = useToast();
  const { system, convertDistance } = useMeasurement();
  const gps = useGPS();
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Settings state - sync mapViewMode from maplibre preferences on initial load
  const [mapPreferences, setMapPreferences] = useState<MapPreferences>(() => {
    const prefs = loadSettings(MAP_PREFERENCES_KEY, defaultMapPreferences);
    // Sync mapViewMode from maplibre preferences (the actual map uses this key)
    try {
      const maplibreKey = 'trucknav_maplibre_preferences';
      const maplibreData = localStorage.getItem(maplibreKey);
      if (maplibreData) {
        const maplibrePrefs = JSON.parse(maplibreData);
        if (maplibrePrefs.mapViewMode) {
          prefs.mapViewMode = maplibrePrefs.mapViewMode;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    return prefs;
  });
  const [dndState, setDndState] = useState<DoNotDisturbState>(() => 
    loadSettings(DND_SETTINGS_KEY, defaultDndState)
  );
  const [entertainmentSettings, setEntertainmentSettings] = useState<EntertainmentSettings>(() => 
    loadSettings(ENTERTAINMENT_SETTINGS_KEY, defaultEntertainmentSettings)
  );
  
  // Alert sounds state
  const [alertSoundSettings, setAlertSoundSettings] = useState<AllAlertSoundSettings>(() => 
    getAlertSoundsService().getSettings()
  );
  
  // Voice navigation state - connected to actual NavigationVoice singleton
  const [voiceNavEnabled, setVoiceNavEnabled] = useState(() => navigationVoice.getSettings().enabled);
  const [voiceNavVolume, setVoiceNavVolume] = useState(() => navigationVoice.getVolume());
  const [voiceNavRate, setVoiceNavRate] = useState(() => navigationVoice.getSettings().rate);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => navigationVoice.getSelectedVoiceName() || 'auto');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Mock state for demonstration - in real app these would come from context/hooks
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isNavigating] = useState(false);
  const [notificationCount] = useState(0);
  
  // Fleet linkage state - persisted to localStorage
  const FLEET_VEHICLE_KEY = 'trucknav_active_fleet_vehicle';
  const FLEET_OPERATOR_KEY = 'trucknav_active_operator';
  
  const [vehicleInputText, setVehicleInputText] = useState('');
  const [operatorInputText, setOperatorInputText] = useState('');
  
  const [selectedFleetVehicleId, setSelectedFleetVehicleId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(FLEET_VEHICLE_KEY);
    } catch {
      return null;
    }
  });
  
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(FLEET_OPERATOR_KEY);
    } catch {
      return null;
    }
  });
  
  // Fetch fleet vehicles for dropdown
  const { data: fleetVehicles = [] } = useQuery<FleetVehicle[]>({
    queryKey: ['/api/fleet/vehicles/active'],
    enabled: open && activeTab === 'fleet',
    staleTime: 60000,
  });
  
  // Fetch operators for dropdown
  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ['/api/fleet/operators/active'],
    enabled: open && activeTab === 'fleet',
    staleTime: 60000,
  });
  
  // Sync driver session with server when both vehicle and operator are selected
  const syncDriverSession = async (vehicleId: string | null, operatorId: string | null) => {
    try {
      if (vehicleId && operatorId) {
        const vehicle = fleetVehicles.find(v => v.id === vehicleId);
        const operator = operators.find(o => o.id === operatorId);
        
        await fetch('/api/fleet/driver-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operatorId,
            vehicleId,
            operatorName: operator ? `${operator.firstName} ${operator.lastName}` : 'Unknown',
            vehicleRegistration: vehicle?.registration || 'Unknown'
          })
        });
        console.log('[Fleet] Driver session synced to server');
        toast({ title: 'Fleet Linked', description: `${operator?.firstName} logged into ${vehicle?.registration}` });
      } else if (!vehicleId && selectedFleetVehicleId) {
        // Driver logging out - end session
        await fetch(`/api/fleet/driver-session/${selectedFleetVehicleId}`, { method: 'DELETE' });
        console.log('[Fleet] Driver session ended');
      }
    } catch (error) {
      console.error('[Fleet] Failed to sync driver session:', error);
    }
  };

  // Save fleet selections to localStorage and sync with server
  const handleFleetVehicleChange = (vehicleId: string) => {
    const id = vehicleId === 'none' ? null : vehicleId;
    setSelectedFleetVehicleId(id);
    if (id) {
      localStorage.setItem(FLEET_VEHICLE_KEY, id);
    } else {
      localStorage.removeItem(FLEET_VEHICLE_KEY);
    }
    console.log('[Fleet] Vehicle Reg linked:', id);
    syncDriverSession(id, selectedOperatorId);
  };
  
  const handleOperatorChange = (operatorId: string) => {
    const id = operatorId === 'none' ? null : operatorId;
    setSelectedOperatorId(id);
    if (id) {
      localStorage.setItem(FLEET_OPERATOR_KEY, id);
    } else {
      localStorage.removeItem(FLEET_OPERATOR_KEY);
    }
    console.log('[Fleet] Operator linked:', id);
    syncDriverSession(selectedFleetVehicleId, id);
  };

  // Sync voice settings when modal opens - get the actual enabled state from settings
  useEffect(() => {
    if (open) {
      const settings = navigationVoice.getSettings();
      setVoiceNavEnabled(settings.enabled);
      setVoiceNavVolume(settings.volume);
      setVoiceNavRate(settings.rate);
      setSelectedVoiceName(navigationVoice.getSelectedVoiceName() || 'auto');
      
      const refreshVoices = () => {
        const v = navigationVoice.getAvailableVoices();
        if (v.length > 0) {
          setAvailableVoices(v);
          setSelectedVoiceName(navigationVoice.getSelectedVoiceName() || 'auto');
        }
      };
      refreshVoices();
      
      const onVoicesChanged = () => refreshVoices();
      window.speechSynthesis?.addEventListener?.('voiceschanged', onVoicesChanged);
      
      const pollTimer = setInterval(refreshVoices, 300);
      const pollTimeout = setTimeout(() => clearInterval(pollTimer), 5000);
      
      console.log('[Settings] Synced voice settings on open:', settings.enabled);
      return () => {
        window.speechSynthesis?.removeEventListener?.('voiceschanged', onVoicesChanged);
        clearInterval(pollTimer);
        clearTimeout(pollTimeout);
      };
    }
  }, [open]);

  // Save settings when they change - sync with BOTH storage keys for map preferences
  useEffect(() => {
    saveSettings(MAP_PREFERENCES_KEY, mapPreferences);
    
    // CRITICAL: Also sync mapViewMode to the maplibre preferences storage key
    // This ensures the actual map component receives the updated setting
    try {
      const maplibreKey = 'trucknav_maplibre_preferences';
      const existingMaplibre = localStorage.getItem(maplibreKey);
      const maplibrePrefs = existingMaplibre ? JSON.parse(existingMaplibre) : {};
      
      // Sync the mapViewMode setting
      if (maplibrePrefs.mapViewMode !== mapPreferences.mapViewMode) {
        maplibrePrefs.mapViewMode = mapPreferences.mapViewMode;
        localStorage.setItem(maplibreKey, JSON.stringify(maplibrePrefs));
        console.log('[Settings] Synced mapViewMode to maplibre preferences:', mapPreferences.mapViewMode);
      }
    } catch (error) {
      console.warn('[Settings] Failed to sync maplibre preferences:', error);
    }
  }, [mapPreferences]);

  useEffect(() => {
    saveSettings(DND_SETTINGS_KEY, dndState);
  }, [dndState]);

  useEffect(() => {
    saveSettings(ENTERTAINMENT_SETTINGS_KEY, entertainmentSettings);
  }, [entertainmentSettings]);


  /**
   * Handle country/language change
   */
  const handleCountryLanguageChange = (countryCode: string, languageCode: string) => {
    // toast({
    //   title: "Language Updated",
    //   description: `Changed to ${languageCode} for ${countryCode}`,
    // });
  };

  /**
   * Tab configuration
   */
  const tabs = [
    {
      id: "offline",
      label: "Offline",
      icon: WifiOff,
      description: "GPS cache and offline settings"
    },
    {
      id: "map-traffic",
      label: "Map",
      icon: Map,
      description: "Map layers and traffic settings"
    },
    {
      id: "language",
      label: "Language",
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
      label: "Alerts",
      icon: Bell,
      description: "Notification and Do Not Disturb settings"
    },
    {
      id: "alert-sounds",
      label: "Sounds",
      icon: Volume2,
      description: "Customize audio alerts for warnings"
    },
    {
      id: "legal",
      label: "Legal",
      icon: FileText,
      description: "Legal notices and disclaimers"
    },
    {
      id: "entertainment",
      label: "Media",
      icon: Music,
      description: "Entertainment system preferences"
    },
    {
      id: "location",
      label: "GPS",
      icon: Crosshair,
      description: "GPS and location mode settings"
    },
    {
      id: "fleet",
      label: "Fleet",
      icon: Building2,
      description: "Link to fleet management system"
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
              <SelectTrigger 
                className="w-32 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" 
                data-testid="select-map-view-mode"
                style={{ touchAction: 'manipulation' }}
              >
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent 
                className="z-[10000] bg-white dark:bg-gray-800"
                position="popper"
                sideOffset={4}
              >
                <SelectItem value="roads" className="cursor-pointer">Roads</SelectItem>
                <SelectItem value="satellite" className="cursor-pointer">Satellite</SelectItem>
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

      {/* POI Search Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            POI Search Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Search Radius</Label>
              <p className="text-sm text-muted-foreground">
                Default radius for finding points of interest
              </p>
            </div>
            <Select
              value={mapPreferences.poiSearchRadius.toString()}
              onValueChange={(value) => 
                setMapPreferences(prev => ({ ...prev, poiSearchRadius: parseInt(value) }))
              }
            >
              <SelectTrigger 
                className="w-40 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" 
                data-testid="select-poi-radius"
                style={{ touchAction: 'manipulation' }}
              >
                <SelectValue>
                  {system === 'imperial' ? (
                    mapPreferences.poiSearchRadius === 5 ? '3 miles' :
                    mapPreferences.poiSearchRadius === 10 ? '6 miles' :  // Display 10km as "6 miles" for cleaner UI
                    mapPreferences.poiSearchRadius === 25 ? '15 miles' :
                    mapPreferences.poiSearchRadius === 50 ? '30 miles' :
                    mapPreferences.poiSearchRadius === 100 ? '60 miles' :
                    `${Math.round(convertDistance(mapPreferences.poiSearchRadius, 'km', 'miles'))} miles`
                  ) : (
                    `${mapPreferences.poiSearchRadius} km`
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent 
                className="z-[10000] bg-white dark:bg-gray-800"
                position="popper"
                sideOffset={4}
              >
                <SelectItem value="5" className="cursor-pointer">
                  {system === 'imperial' ? '3 miles' : '5 km'}
                </SelectItem>
                <SelectItem value="10" className="cursor-pointer">
                  {system === 'imperial' ? '6 miles' : '10 km'} {/* Clean display for 6 miles */}
                </SelectItem>
                <SelectItem value="25" className="cursor-pointer">
                  {system === 'imperial' ? '15 miles' : '25 km'}
                </SelectItem>
                <SelectItem value="50" className="cursor-pointer">
                  {system === 'imperial' ? '30 miles' : '50 km'}
                </SelectItem>
                <SelectItem value="100" className="cursor-pointer">
                  {system === 'imperial' ? '60 miles' : '100 km'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              {system === 'imperial' 
                ? 'Searches for fuel stations, restaurants, parking, and other facilities within the selected radius from your location or specified point.'
                : 'Searches for fuel stations, restaurants, parking, and other facilities within the selected radius from your location or specified point.'}
            </p>
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
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          
          <Button 
            variant="destructive" 
            className="w-full justify-start"
            onClick={() => {
              // Clear all route and map cached data
              const keysToRemove = [
                // Navigation state
                'navigation_ui_active',
                'navigation_mode',
                'activeJourneyId',
                'navigation_timestamp',
                'activeRouteId',
                'navigationSidebarState',
                'shouldShowHUD',
                'mobileNavMode',
                'isLocalNavActive',
                'last_navigation_state',
                'navigation_recentOrigins',
                // Route data
                'saved_journey',
                'current_route',
                'saved_route_data',
                'route_alternatives',
                'truck_route_cache',
                // Recent destinations
                'recent_destinations',
                'recentDestinations',
                'trucknav_recent_destinations',
                // Location data
                'manual_location',
                'cached_gps_position',
                'last_known_position',
                'gps_last_position',
                // Map state
                'trucknav_map_preferences',
                'map_center',
                'map_zoom',
                'map_bearing',
                'map_pitch',
                // Restrictions cache
                'restrictions_cache',
                'restriction_violations',
                // Traffic cache
                'traffic_cache',
                'route_traffic_data',
                // Offline cache
                'offline_routes',
                'offline_restrictions',
                'offline_facilities'
              ];
              
              keysToRemove.forEach(key => {
                try {
                  localStorage.removeItem(key);
                } catch (e) {
                  console.warn(`Failed to remove ${key}:`, e);
                }
              });
              
              // Reset map preferences to defaults
              setMapPreferences(defaultMapPreferences);
              
              toast({
                title: "Map Data Cleared",
                description: "All routes, recent locations, and cached data have been cleared. The map will reset on next load.",
              });
              
              // Close modal and trigger a page reload after a short delay
              setTimeout(() => {
                onOpenChange(false);
                window.location.reload();
              }, 1500);
            }}
            data-testid="button-clear-map-data"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Old Route & Reset Map
          </Button>
          
          <p className="text-xs text-muted-foreground mt-2">
            Clears all cached routes, recent destinations, and location data. The app will reload to a fresh state.
          </p>
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

  // CRITICAL FIX: Fully unmount the Dialog when closed to remove Radix overlay from DOM
  // This prevents the "glass overlay" blocking issue on iOS Safari
  if (!open) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "max-w-2xl w-full h-[85vh] sm:h-[75vh] max-h-[600px]",
            "p-0 overflow-hidden flex flex-col",
            "!bg-white dark:!bg-slate-900 border-2 border-gray-300 dark:border-gray-600",
            "fixed bottom-0 sm:bottom-auto sm:top-[50%] left-[50%] -translate-x-1/2 sm:-translate-y-1/2",
            "rounded-t-xl sm:rounded-xl",
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
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-hidden min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              {/* Tab Navigation - Scrollable on mobile, clean grid on desktop */}
              <div className="px-2 md:px-4 py-3 border-b bg-gray-50 dark:bg-gray-900/50">
                <div 
                  className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600" 
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <div className="inline-flex w-max md:flex md:flex-wrap md:w-full h-auto p-1 gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          className={cn(
                            "flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[56px] cursor-pointer rounded-md transition-all duration-150 select-none",
                            "font-medium tracking-tight",
                            isActive 
                              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600' 
                              : 'hover:bg-gray-200/70 dark:hover:bg-gray-700/70 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          )}
                          data-testid={`tab-${tab.id}`}
                          style={{ 
                            touchAction: 'manipulation', 
                            WebkitTapHighlightColor: 'rgba(0,0,0,0.1)'
                          }}
                          onPointerDown={() => setActiveTab(tab.id)}
                        >
                          <Icon className={cn(
                            "w-4 h-4 pointer-events-none",
                            isActive && "text-blue-600 dark:text-blue-400"
                          )} />
                          <span className={cn(
                            "text-[10px] leading-tight pointer-events-none",
                            isActive ? "font-semibold" : "font-medium"
                          )}>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <TabsContent value="offline" className="mt-0">
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <WifiOff className="w-5 h-5" />
                              GPS Cache & Offline Mode
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <Label className="text-base font-medium">GPS Status</Label>
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                                {gps?.status === 'ready' && (
                                  <>
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium text-green-700 dark:text-green-400">GPS Active</span>
                                    {gps?.isUsingCached && (
                                      <Badge variant="outline" className="ml-auto">Using Cached</Badge>
                                    )}
                                  </>
                                )}
                                {(gps?.status === 'acquiring' || gps?.status === 'initializing') && (
                                  <>
                                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                                      {gps?.status === 'initializing' ? 'Initializing GPS...' : 'Acquiring GPS...'}
                                    </span>
                                  </>
                                )}
                                {gps?.status === 'manual' && (
                                  <>
                                    <MapPinned className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Manual Location</span>
                                  </>
                                )}
                                {(gps?.status === 'unavailable' || gps?.status === 'error') && (
                                  <>
                                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                                    <span className="text-sm font-medium text-red-700 dark:text-red-400">GPS Unavailable</span>
                                  </>
                                )}
                                {!gps && (
                                  <>
                                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">GPS Not Available</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <Separator />

                            {gps ? (
                              <>
                                <div className="space-y-3">
                                  <Label className="text-base font-medium">Use Last Known Location?</Label>
                                  <p className="text-sm text-muted-foreground">
                                    Choose how to determine your location when GPS signal is weak or unavailable.
                                  </p>
                                  
                                  {gps.cachedPosition && (
                                    <div className="space-y-3">
                                      <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                                        <div className="flex items-start gap-3">
                                          <MapPin className="w-5 h-5 text-amber-600 mt-0.5" />
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                              Cached Location Available
                                            </p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                              From {gps.cachedPosition.ageDisplay}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => gps.useCachedPosition(true)}
                                          variant="default"
                                          className="flex-1"
                                          data-testid="button-use-cached-offline"
                                        >
                                          <WifiOff className="w-4 h-4 mr-2" />
                                          Use Cached
                                        </Button>
                                        <Button
                                          onClick={() => gps.useCachedPosition(false)}
                                          variant="outline"
                                          className="flex-1"
                                          data-testid="button-wait-gps-offline"
                                        >
                                          <Wifi className="w-4 h-4 mr-2" />
                                          Wait for GPS
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {!gps.cachedPosition && gps.status !== 'ready' && (
                                    <Alert>
                                      <Info className="h-4 w-4" />
                                      <AlertDescription>
                                        No cached location available. Please ensure GPS is enabled on your device.
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                  <Label className="text-base font-medium">Clear GPS Cache</Label>
                                  <p className="text-sm text-muted-foreground">
                                    Clear stored location data and force fresh GPS acquisition.
                                  </p>
                                  <Button
                                    onClick={() => gps.clearGPSCache()}
                                    variant="outline"
                                    className="w-full"
                                    data-testid="button-clear-gps-cache-offline"
                                  >
                                    <Crosshair className="w-4 h-4 mr-2" />
                                    Clear Cache & Refresh GPS
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                  GPS service is not available. Please reload the app or check your device's location settings.
                                </AlertDescription>
                              </Alert>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="map-traffic" className="mt-0">
                      {renderMapTrafficTab()}
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
                              <Label className="text-base font-medium">Country Selection</Label>
                              <p className="text-sm text-muted-foreground">
                                Sets your region and default language
                              </p>
                              <select
                                className="w-full h-12 px-3 py-2 text-base bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                                style={{ fontSize: '16px', WebkitAppearance: 'menulist' }}
                                value={localStorage.getItem('trucknav_country') || 'GB'}
                                onChange={(e) => {
                                  const countryCode = e.target.value;
                                  const countryData = countries.find(c => c.code === countryCode);
                                  if (countryData) {
                                    localStorage.setItem('trucknav_country', countryCode);
                                    i18n.changeLanguage(countryData.defaultLanguage);
                                    localStorage.setItem('trucknav_language', countryData.defaultLanguage);
                                    navigationVoice.setLanguage(countryData.defaultLanguage);
                                    handleCountryLanguageChange(countryCode, countryData.defaultLanguage);
                                    toast({
                                      title: "Country Updated",
                                      description: `Set to ${countryData.name} with ${countryData.defaultLanguage} language`,
                                    });
                                  }
                                }}
                                data-testid="country-selector"
                              >
                                <optgroup label="Major Trucking Markets">
                                  {countries.filter(c => c.truckingMarket).map((country) => (
                                    <option key={country.code} value={country.code}>
                                      {country.flag} {country.name}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Other Countries">
                                  {countries.filter(c => !c.truckingMarket).slice(0, 30).map((country) => (
                                    <option key={country.code} value={country.code}>
                                      {country.flag} {country.name}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-3">
                              <Label className="text-base font-medium">Language Selection</Label>
                              <p className="text-sm text-muted-foreground">
                                Changes app text and voice navigation language
                              </p>
                              <select
                                className="w-full h-12 px-3 py-2 text-base bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                                style={{ fontSize: '16px', WebkitAppearance: 'menulist' }}
                                value={i18n.language}
                                onChange={(e) => {
                                  const languageCode = e.target.value;
                                  i18n.changeLanguage(languageCode);
                                  localStorage.setItem('trucknav_language', languageCode);
                                  navigationVoice.setLanguage(languageCode);
                                  toast({
                                    title: "Language Updated",
                                    description: `App and voice navigation set to ${languageCode}`,
                                  });
                                }}
                                data-testid="language-selector"
                              >
                                <option value="en-GB">🇬🇧 English (UK)</option>
                                <option value="en-US">🇺🇸 English (US)</option>
                                <option value="de-DE">🇩🇪 Deutsch</option>
                                <option value="fr-FR">🇫🇷 Français</option>
                                <option value="es-ES">🇪🇸 Español</option>
                                <option value="it-IT">🇮🇹 Italiano</option>
                                <option value="pt-BR">🇧🇷 Português (BR)</option>
                                <option value="nl-NL">🇳🇱 Nederlands</option>
                                <option value="pl-PL">🇵🇱 Polski</option>
                                <option value="ru-RU">🇷🇺 Русский</option>
                                <option value="ja-JP">🇯🇵 日本語</option>
                                <option value="zh-CN">🇨🇳 中文</option>
                                <option value="ko-KR">🇰🇷 한국어</option>
                                <option value="ar-SA">🇸🇦 العربية</option>
                                <option value="hi-IN">🇮🇳 हिन्दी</option>
                                <option value="tr-TR">🇹🇷 Türkçe</option>
                              </select>
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
                          // toast({
                          //   title: "Test Notification",
                          //   description: "This is a test notification to verify your settings.",
                          // });
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="alert-sounds" className="mt-0">
                      <div className="space-y-6">
                        {/* Master Volume */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Volume2 className="w-5 h-5" />
                              Alert Sound Settings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Master Volume</Label>
                                <span className="text-sm text-muted-foreground">
                                  {Math.round(alertSoundSettings.masterVolume * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round(alertSoundSettings.masterVolume * 100)}
                                onChange={(e) => {
                                  const newSettings = {
                                    ...alertSoundSettings,
                                    masterVolume: parseInt(e.target.value) / 100
                                  };
                                  setAlertSoundSettings(newSettings);
                                  getAlertSoundsService().saveSettings(newSettings);
                                }}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                              />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Voice Navigation Settings */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Navigation className="w-5 h-5 text-blue-500" />
                              Voice Navigation
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-base font-medium">Enable Voice Navigation</Label>
                                <p className="text-sm text-muted-foreground">
                                  Spoken turn-by-turn directions
                                </p>
                              </div>
                              <Switch
                                checked={voiceNavEnabled}
                                onCheckedChange={async (checked) => {
                                  console.log('[Settings] Voice toggle changed to:', checked);
                                  setVoiceNavEnabled(checked);
                                  navigationVoice.setEnabled(checked);
                                  if (checked) {
                                    navigationVoice.forceMaxVolume();
                                    navigationVoice.primeForUserGesture();
                                  }
                                  // Verify the setting was saved
                                  const settings = navigationVoice.getSettings();
                                  console.log('[Settings] Voice setting saved:', settings.enabled);
                                }}
                                data-testid="switch-voice-navigation"
                              />
                            </div>

                            <Separator />

                            <VoiceWheelPicker
                              voices={availableVoices}
                              selectedVoiceName={selectedVoiceName}
                              disabled={!voiceNavEnabled}
                              onSelect={(value) => {
                                setSelectedVoiceName(value);
                                if (value === 'auto') {
                                  navigationVoice.resetToAuto();
                                } else {
                                  navigationVoice.setVoice(value);
                                }
                              }}
                            />

                            <Separator />

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Voice Volume</Label>
                                <span className="text-sm text-muted-foreground">
                                  {Math.round(voiceNavVolume * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round(voiceNavVolume * 100)}
                                onChange={(e) => {
                                  const newVolume = parseInt(e.target.value) / 100;
                                  setVoiceNavVolume(newVolume);
                                  navigationVoice.setVolume(newVolume);
                                }}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                disabled={!voiceNavEnabled}
                              />
                            </div>

                            <Separator />

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Speech Rate</Label>
                                <span className="text-sm text-muted-foreground">
                                  {voiceNavRate === 0.6 ? 'Slow' : voiceNavRate === 0.8 ? 'Normal' : voiceNavRate === 1.0 ? 'Fast' : `${voiceNavRate}x`}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant={voiceNavRate === 0.6 ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setVoiceNavRate(0.6);
                                    navigationVoice.updateSettings({ rate: 0.6 });
                                  }}
                                  disabled={!voiceNavEnabled}
                                >
                                  Slow
                                </Button>
                                <Button
                                  variant={voiceNavRate === 0.8 ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setVoiceNavRate(0.8);
                                    navigationVoice.updateSettings({ rate: 0.8 });
                                  }}
                                  disabled={!voiceNavEnabled}
                                >
                                  Normal
                                </Button>
                                <Button
                                  variant={voiceNavRate === 1.0 ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setVoiceNavRate(1.0);
                                    navigationVoice.updateSettings({ rate: 1.0 });
                                  }}
                                  disabled={!voiceNavEnabled}
                                >
                                  Fast
                                </Button>
                              </div>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-base font-medium">Test Voice</Label>
                                <p className="text-sm text-muted-foreground">
                                  Play a sample navigation instruction
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigationVoice.testVoice();
                                }}
                                disabled={!voiceNavEnabled}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Test
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Speed Limit Alerts */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Gauge className="w-5 h-5 text-red-500" />
                              Speed Limit Warnings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-base font-medium">Enable Sound</Label>
                                <p className="text-sm text-muted-foreground">
                                  Play sound when exceeding speed limit
                                </p>
                              </div>
                              <Switch
                                checked={alertSoundSettings.speedLimit.enabled}
                                onCheckedChange={(checked) => {
                                  const newSettings = {
                                    ...alertSoundSettings,
                                    speedLimit: { ...alertSoundSettings.speedLimit, enabled: checked }
                                  };
                                  setAlertSoundSettings(newSettings);
                                  getAlertSoundsService().saveSettings(newSettings);
                                }}
                                data-testid="switch-speed-limit-sound"
                              />
                            </div>

                            <Separator />

                            <div className="space-y-3">
                              <Label className="text-base font-medium">Sound Type</Label>
                              <div className="flex flex-wrap gap-2">
                                {SOUND_OPTIONS.speedLimit.map((sound) => (
                                  <Button
                                    key={sound.id}
                                    variant={alertSoundSettings.speedLimit.selectedSound === sound.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      const newSettings = {
                                        ...alertSoundSettings,
                                        speedLimit: { ...alertSoundSettings.speedLimit, selectedSound: sound.id }
                                      };
                                      setAlertSoundSettings(newSettings);
                                      getAlertSoundsService().saveSettings(newSettings);
                                      if (sound.id !== 'none') {
                                        getAlertSoundsService().previewSound('speedLimit', sound.id);
                                      }
                                    }}
                                    className="gap-1"
                                    data-testid={`btn-sound-speedlimit-${sound.id}`}
                                  >
                                    {sound.id !== 'none' && <Play className="w-3 h-3" />}
                                    {sound.name}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Volume</Label>
                                <span className="text-sm text-muted-foreground">
                                  {Math.round(alertSoundSettings.speedLimit.volume * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round(alertSoundSettings.speedLimit.volume * 100)}
                                onChange={(e) => {
                                  const newSettings = {
                                    ...alertSoundSettings,
                                    speedLimit: { ...alertSoundSettings.speedLimit, volume: parseInt(e.target.value) / 100 }
                                  };
                                  setAlertSoundSettings(newSettings);
                                  getAlertSoundsService().saveSettings(newSettings);
                                }}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                disabled={!alertSoundSettings.speedLimit.enabled}
                              />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Traffic Alerts */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-amber-500" />
                              Traffic Incident Alerts
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-base font-medium">Enable Sound</Label>
                                <p className="text-sm text-muted-foreground">
                                  Play sound for traffic incidents
                                </p>
                              </div>
                              <Switch
                                checked={alertSoundSettings.traffic.enabled}
                                onCheckedChange={(checked) => {
                                  const newSettings = {
                                    ...alertSoundSettings,
                                    traffic: { ...alertSoundSettings.traffic, enabled: checked }
                                  };
                                  setAlertSoundSettings(newSettings);
                                  getAlertSoundsService().saveSettings(newSettings);
                                }}
                                data-testid="switch-traffic-sound"
                              />
                            </div>

                            <Separator />

                            <div className="space-y-3">
                              <Label className="text-base font-medium">Sound Type</Label>
                              <div className="flex flex-wrap gap-2">
                                {SOUND_OPTIONS.traffic.map((sound) => (
                                  <Button
                                    key={sound.id}
                                    variant={alertSoundSettings.traffic.selectedSound === sound.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      const newSettings = {
                                        ...alertSoundSettings,
                                        traffic: { ...alertSoundSettings.traffic, selectedSound: sound.id }
                                      };
                                      setAlertSoundSettings(newSettings);
                                      getAlertSoundsService().saveSettings(newSettings);
                                      if (sound.id !== 'none') {
                                        getAlertSoundsService().previewSound('traffic', sound.id);
                                      }
                                    }}
                                    className="gap-1"
                                    data-testid={`btn-sound-traffic-${sound.id}`}
                                  >
                                    {sound.id !== 'none' && <Play className="w-3 h-3" />}
                                    {sound.name}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Volume</Label>
                                <span className="text-sm text-muted-foreground">
                                  {Math.round(alertSoundSettings.traffic.volume * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round(alertSoundSettings.traffic.volume * 100)}
                                onChange={(e) => {
                                  const newSettings = {
                                    ...alertSoundSettings,
                                    traffic: { ...alertSoundSettings.traffic, volume: parseInt(e.target.value) / 100 }
                                  };
                                  setAlertSoundSettings(newSettings);
                                  getAlertSoundsService().saveSettings(newSettings);
                                }}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                disabled={!alertSoundSettings.traffic.enabled}
                              />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Fatigue Alerts */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Coffee className="w-5 h-5 text-blue-500" />
                              Fatigue & Break Reminders
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-base font-medium">Enable Sound</Label>
                                <p className="text-sm text-muted-foreground">
                                  Play sound for break reminders
                                </p>
                              </div>
                              <Switch
                                checked={alertSoundSettings.fatigue.enabled}
                                onCheckedChange={(checked) => {
                                  const newSettings = {
                                    ...alertSoundSettings,
                                    fatigue: { ...alertSoundSettings.fatigue, enabled: checked }
                                  };
                                  setAlertSoundSettings(newSettings);
                                  getAlertSoundsService().saveSettings(newSettings);
                                }}
                                data-testid="switch-fatigue-sound"
                              />
                            </div>

                            <Separator />

                            <div className="space-y-3">
                              <Label className="text-base font-medium">Sound Type</Label>
                              <div className="flex flex-wrap gap-2">
                                {SOUND_OPTIONS.fatigue.map((sound) => (
                                  <Button
                                    key={sound.id}
                                    variant={alertSoundSettings.fatigue.selectedSound === sound.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      const newSettings = {
                                        ...alertSoundSettings,
                                        fatigue: { ...alertSoundSettings.fatigue, selectedSound: sound.id }
                                      };
                                      setAlertSoundSettings(newSettings);
                                      getAlertSoundsService().saveSettings(newSettings);
                                      if (sound.id !== 'none') {
                                        getAlertSoundsService().previewSound('fatigue', sound.id);
                                      }
                                    }}
                                    className="gap-1"
                                    data-testid={`btn-sound-fatigue-${sound.id}`}
                                  >
                                    {sound.id !== 'none' && <Play className="w-3 h-3" />}
                                    {sound.name}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Volume</Label>
                                <span className="text-sm text-muted-foreground">
                                  {Math.round(alertSoundSettings.fatigue.volume * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round(alertSoundSettings.fatigue.volume * 100)}
                                onChange={(e) => {
                                  const newSettings = {
                                    ...alertSoundSettings,
                                    fatigue: { ...alertSoundSettings.fatigue, volume: parseInt(e.target.value) / 100 }
                                  };
                                  setAlertSoundSettings(newSettings);
                                  getAlertSoundsService().saveSettings(newSettings);
                                }}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                disabled={!alertSoundSettings.fatigue.enabled}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
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
                            <div className="space-y-2">
                              <Label className="text-base font-medium">Legal Notices</Label>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>© 2024-2025 Bespoke Marketing. Ai Ltd</p>
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

                    <TabsContent value="location" className="mt-0">
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Crosshair className="w-5 h-5" />
                              Location Mode
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <Label className="text-base font-medium">GPS Status</Label>
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                                {gps?.status === 'ready' && (
                                  <>
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium text-green-700 dark:text-green-400">GPS Active</span>
                                    {gps?.isUsingCached && (
                                      <Badge variant="outline" className="ml-auto">Using Cached</Badge>
                                    )}
                                  </>
                                )}
                                {(gps?.status === 'acquiring' || gps?.status === 'initializing') && (
                                  <>
                                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                                      {gps?.status === 'initializing' ? 'Initializing GPS...' : 'Acquiring GPS...'}
                                    </span>
                                  </>
                                )}
                                {gps?.status === 'manual' && (
                                  <>
                                    <MapPinned className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Manual Location</span>
                                  </>
                                )}
                                {(gps?.status === 'unavailable' || gps?.status === 'error') && (
                                  <>
                                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                                    <span className="text-sm font-medium text-red-700 dark:text-red-400">GPS Unavailable</span>
                                  </>
                                )}
                                {!gps && (
                                  <>
                                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">GPS Not Available</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                              <Label className="text-base font-medium">Location Settings</Label>
                              <p className="text-sm text-muted-foreground">
                                For GPS cache settings and offline location options, visit the Offline tab.
                              </p>
                              <Button
                                onClick={() => setActiveTab('offline')}
                                variant="outline"
                                className="w-full"
                                data-testid="button-go-to-offline"
                              >
                                <WifiOff className="w-4 h-4 mr-2" />
                                Go to Offline Settings
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Fleet Integration Tab */}
                    <TabsContent value="fleet" className="mt-0">
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Building2 className="w-5 h-5" />
                              Fleet Management Link
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <p className="text-sm text-muted-foreground">
                              Link this navigation session to your fleet management system to track journeys, fuel consumption, and driver performance.
                            </p>

                            {/* Vehicle Registration Input */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-600" />
                                <Label className="text-base font-medium">Vehicle Reg</Label>
                              </div>
                              <div className="relative">
                                <Input
                                  type="text"
                                  inputMode="text"
                                  autoComplete="off"
                                  autoCapitalize="characters"
                                  placeholder="Type registration e.g. AB12 CDE"
                                  className="w-full font-mono uppercase"
                                  data-testid="input-fleet-vehicle"
                                  onFocus={(e) => {
                                    // Scroll input into view when keyboard opens
                                    setTimeout(() => {
                                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 300);
                                  }}
                                  value={vehicleInputText || (() => {
                                    const selected = fleetVehicles.find(v => v.id === selectedFleetVehicleId);
                                    return selected?.registration || '';
                                  })()}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const value = e.target.value.toUpperCase();
                                    setVehicleInputText(value);
                                    const match = fleetVehicles.find(v => 
                                      v.registration.toUpperCase() === value
                                    );
                                    if (match) {
                                      handleFleetVehicleChange(match.id);
                                      setVehicleInputText('');
                                    } else if (value === '') {
                                      handleFleetVehicleChange('none');
                                    }
                                  }}
                                />
                                {fleetVehicles.length > 0 && !selectedFleetVehicleId && (
                                  <div className="mt-2 max-h-32 overflow-y-auto border rounded-md bg-background">
                                    {fleetVehicles.map((vehicle) => (
                                      <button
                                        key={vehicle.id}
                                        type="button"
                                        className="w-full px-3 py-2 text-left hover:bg-muted/50 active:bg-muted border-b last:border-b-0 flex items-center justify-between"
                                        onClick={() => handleFleetVehicleChange(vehicle.id)}
                                      >
                                        <span className="font-mono font-bold">{vehicle.registration}</span>
                                        <span className="text-xs text-muted-foreground">{vehicle.make} {vehicle.model}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {fleetVehicles.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                  No vehicles found. Add vehicles in Fleet Management.
                                </p>
                              )}
                            </div>

                            <Separator />

                            {/* Operator Input */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-purple-600" />
                                <Label className="text-base font-medium">Operator</Label>
                              </div>
                              <div className="relative">
                                <Input
                                  type="text"
                                  inputMode="text"
                                  autoComplete="off"
                                  placeholder="Type operator name"
                                  className="w-full"
                                  data-testid="input-operator"
                                  onFocus={(e) => {
                                    // Scroll input into view when keyboard opens
                                    setTimeout(() => {
                                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 300);
                                  }}
                                  value={operatorInputText || (() => {
                                    const selected = operators.find(o => o.id === selectedOperatorId);
                                    return selected ? `${selected.firstName} ${selected.lastName}` : '';
                                  })()}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const value = e.target.value;
                                    setOperatorInputText(value);
                                    const match = operators.find(o => 
                                      `${o.firstName} ${o.lastName}`.toLowerCase() === value.toLowerCase()
                                    );
                                    if (match) {
                                      handleOperatorChange(match.id);
                                      setOperatorInputText('');
                                    } else if (value === '') {
                                      handleOperatorChange('none');
                                    }
                                  }}
                                />
                                {operators.length > 0 && !selectedOperatorId && (
                                  <div className="mt-2 max-h-32 overflow-y-auto border rounded-md bg-background">
                                    {operators.map((operator) => (
                                      <button
                                        key={operator.id}
                                        type="button"
                                        className="w-full px-3 py-2 text-left hover:bg-muted/50 active:bg-muted border-b last:border-b-0 flex items-center justify-between"
                                        onClick={() => handleOperatorChange(operator.id)}
                                      >
                                        <span className="font-medium">{operator.firstName} {operator.lastName}</span>
                                        {operator.licenseNumber && (
                                          <span className="text-xs text-muted-foreground">{operator.licenseNumber}</span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {operators.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                  No operators found. Add operators in Fleet Management.
                                </p>
                              )}
                            </div>

                            {/* Next Button - Start Pre-Trip Inspection */}
                            <Button
                              className="w-full h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => {
                                if (!selectedFleetVehicleId || !selectedOperatorId) {
                                  toast({
                                    title: "Missing Information",
                                    description: "Please enter a vehicle registration and operator name that match entries in Fleet Management.",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                if (!onStartInspection) return;
                                const vehicle = fleetVehicles.find(v => v.id === selectedFleetVehicleId);
                                const operator = operators.find(o => o.id === selectedOperatorId);
                                if (vehicle && operator) {
                                  onOpenChange(false);
                                  onStartInspection(
                                    selectedFleetVehicleId,
                                    selectedOperatorId,
                                    vehicle.registration,
                                    `${operator.firstName} ${operator.lastName}`
                                  );
                                }
                              }}
                            >
                              <ClipboardCheck className="w-4 h-4 mr-2" />
                              Next
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default SettingsModal;