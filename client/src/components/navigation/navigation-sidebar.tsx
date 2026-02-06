import { useState, memo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Truck, 
  Navigation, 
  Search,
  Route as RouteIcon,
  Menu,
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Loader2,
  MapPin,
  Crosshair,
  Palette,
  Music,
  Cloud,
  Monitor,
  X,
  Fuel,
  CircleParking,
  Utensils,
  Bed,
  Coffee,
  Wrench,
  Camera,
  AlertTriangle,
  Store,
  ShoppingCart,
  CheckCircle,
  Eye,
  Mic,
  MessageCircle,
  History,
  MapPinned,
  Bookmark,
  Car,
  Trash2,
  Sun,
  Moon,
  Clock,
  Layers,
  Download,
  HelpCircle,
  Map
} from "lucide-react";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import EntertainmentPanel from "@/components/entertainment/entertainment-panel";
import { ThemeSelector } from "@/components/theme/theme-selector";
import WeatherWidget from "@/components/weather/weather-widget";
import VoiceNavigationPanel from "@/components/navigation/voice-navigation-panel";
import { ColorSpectrumPicker } from "@/components/theme/color-spectrum-picker";
import { GrayscaleSelector } from "@/components/theme/grayscale-selector";
import { RegionSelector } from "@/components/measurement/region-selector";
import { MeasurementSelector } from "@/components/measurement/measurement-selector";
import { LanguageSelector } from "@/components/settings/language-selector";
import { OfflineDownloadsPanel } from "@/components/navigation/offline-downloads-panel";
import { FuelPriceComparison } from "@/components/fuel/fuel-price-comparison";
import { DriverFatigueAlert } from "@/components/safety/driver-fatigue-alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { type VehicleProfile, type Route, type Route as RouteType, type Journey, type Facility } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import IncidentReportingForm from "@/components/traffic/incident-reporting-form";
import { useGPS } from "@/contexts/gps-context";
import { reverseGeocode, formatCoordinatesAsAddress } from "@/lib/reverse-geocode";
import { useDestinationHistory } from "@/hooks/use-destination-history";
import { useOriginHistory } from "@/hooks/use-origin-history";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { useTranslation } from 'react-i18next';

interface NavigationSidebarProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onFromCoordinatesChange?: (coords: {lat: number, lng: number} | null) => void;
  onToCoordinatesChange?: (coords: {lat: number, lng: number} | null) => void;
  onPlanRoute: (routePreference?: 'fastest' | 'eco' | 'avoid_tolls') => void;
  onStartNavigation: () => void;
  onStopNavigation?: () => void;
  currentRoute: Route | null;
  isCalculating: boolean;
  
  selectedProfile: VehicleProfile | null;
  onProfileSelect: (profile: VehicleProfile) => void;
  
  isNavigating?: boolean;
  isStartingJourney?: boolean;
  isCompletingJourney?: boolean;
  
  showRoutePreview?: boolean;
  onRoutePreviewToggle?: (enabled: boolean) => void;
  
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
  
  coordinates?: { lat: number; lng: number };
  onSelectFacility?: (facility: Facility) => void;
  onNavigateToLocation?: (location: string) => void;
  
  isSearchPanelOpen?: boolean;
  onToggleSearchPanel?: () => void;
  
  onToggleAR?: () => void;
  isARMode?: boolean;
  arSupported?: boolean;
  
  onShowLaneGuidance?: () => void;
  
  showVehicleSettings?: boolean;
  onShowVehicleSettings?: (show: boolean) => void;

  vehicleType?: 'car' | 'class1_high' | 'class1_standard';
  onVehicleTypeChange?: (type: 'car' | 'class1_high' | 'class1_standard') => void;
}

const NavigationSidebar = memo(function NavigationSidebar({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onFromCoordinatesChange,
  onToCoordinatesChange,
  onPlanRoute,
  onStartNavigation,
  onStopNavigation,
  currentRoute,
  isCalculating,
  selectedProfile,
  onProfileSelect,
  isNavigating = false,
  isStartingJourney = false,
  isCompletingJourney = false,
  isOpen,
  onToggle,
  isCollapsed,
  onCollapseToggle,
  coordinates,
  onSelectFacility,
  onNavigateToLocation,
  onToggleAR,
  isARMode = false,
  arSupported = false,
  onShowLaneGuidance,
  showVehicleSettings = false,
  onShowVehicleSettings,
  showRoutePreview = true,
  onRoutePreviewToggle,
  vehicleType = 'class1_high',
  onVehicleTypeChange,
}: NavigationSidebarProps) {
  const gpsData = useGPS();
  const { t } = useTranslation();
  const { formatDistance } = useMeasurement();
  
  const [showVehicleProfileSetup, setShowVehicleProfileSetup] = useState(false);
  const [showEntertainmentPanel, setShowEntertainmentPanel] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showWeatherWidget, setShowWeatherWidget] = useState(false);
  const [showIncidentReporting, setShowIncidentReporting] = useState(false);
  const [showVoiceNavigation, setShowVoiceNavigation] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [fromCoordinates, setFromCoordinates] = useState<{lat: number, lng: number} | null>(null);

  const [facilitySearchInput, setFacilitySearchInput] = useState("");
  const [selectedPOICategory, setSelectedPOICategory] = useState<string>("");
  
  const [routePreference, setRoutePreference] = useState<'fastest' | 'eco' | 'avoid_tolls'>('fastest');
  
  const [activeTab, setActiveTab] = useState("plan");
  const [showFuelPrices, setShowFuelPrices] = useState(false);
  const [showFatigueMonitor, setShowFatigueMonitor] = useState(false);
  
  const { destinations: previousDestinations, removeDestination } = useDestinationHistory();
  const { origins: previousOrigins } = useOriginHistory();
  
  const { data: recentJourneys = [], isLoading: isLoadingJourneys } = useQuery<Journey[]>({
    queryKey: ["/api/journeys"],
    queryFn: async () => {
      const res = await fetch("/api/journeys?limit=5", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
  });

  const { data: favoriteRoutes = [], isLoading: isLoadingFavorites } = useQuery<RouteType[]>({
    queryKey: ["/api/routes", "favorites"],
    queryFn: async () => {
      const res = await fetch("/api/routes/favorites", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
  });

  const deleteFavoriteMutation = useMutation({
    mutationFn: async (routeId: string) => {
      await apiRequest("DELETE", `/api/routes/${routeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes", "favorites"] });
    },
  });
  
  const handleFromCoordinatesUpdate = (coords: {lat: number, lng: number} | null) => {
    setFromCoordinates(coords);
    onFromCoordinatesChange?.(coords);
  };

  const getPoiRadius = () => {
    try {
      const mapPrefs = localStorage.getItem('trucknav_map_preferences');
      if (mapPrefs) {
        const prefs = JSON.parse(mapPrefs);
        return prefs.poiSearchRadius || 10;
      }
    } catch (error) {
      console.warn('Failed to load POI radius:', error);
    }
    return 10;
  };
  
  const buildFacilitySearchParams = () => {
    const params = new URLSearchParams();
    
    const gpsPosition = gpsData?.position;
    const manualLocation = gpsData?.manualLocation;
    const lat = fromCoordinates?.lat || gpsPosition?.latitude || manualLocation?.latitude || coordinates?.lat;
    const lng = fromCoordinates?.lng || gpsPosition?.longitude || manualLocation?.longitude || coordinates?.lng;
    
    if (!lat || !lng) {
      return null;
    }
    
    params.set('lat', lat.toString());
    params.set('lng', lng.toString());
    params.set('radius', getPoiRadius().toString());
    
    if (selectedPOICategory) {
      params.set('type', selectedPOICategory);
    }
    
    if (facilitySearchInput.trim()) {
      params.set('q', facilitySearchInput.trim());
    }
    
    return params.toString();
  };
  
  const searchParams = buildFacilitySearchParams();
  const shouldFetchFacilities = Boolean(
    isOpen && 
    searchParams &&
    ((selectedPOICategory && selectedPOICategory.length > 0) || 
     (facilitySearchInput && facilitySearchInput.trim().length > 0))
  );
  
  const { data: facilities = [], isLoading: isFacilitiesLoading, error: facilitiesError, refetch: refetchFacilities } = useQuery<Facility[]>({
    queryKey: ['/api/poi-search', searchParams],
    queryFn: async () => {
      const response = await fetch(`/api/poi-search?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch POIs: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: shouldFetchFacilities,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });


  const handleUseCurrentLocation = async () => {
    if (gpsData?.position) {
      const { latitude, longitude } = gpsData.position;
      
      setIsReverseGeocoding(true);

      try {
        const result = await reverseGeocode(latitude, longitude, 5000);

        if (result.success) {
          onFromLocationChange(result.address);
          handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
        } else {
          const coordsString = formatCoordinatesAsAddress(latitude, longitude);
          onFromLocationChange(coordsString);
          handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
        }
      } catch (error) {
        const coordsString = formatCoordinatesAsAddress(latitude, longitude);
        onFromLocationChange(coordsString);
        handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
      } finally {
        setIsReverseGeocoding(false);
      }
    } else if (gpsData?.manualLocation) {
      const { latitude, longitude, address } = gpsData.manualLocation;
      onFromLocationChange(address || formatCoordinatesAsAddress(latitude, longitude));
      handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
    } else {
      setIsReverseGeocoding(true);
      
      if (!navigator.geolocation) {
        setIsReverseGeocoding(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const result = await reverseGeocode(latitude, longitude, 5000);

            if (result.success) {
              onFromLocationChange(result.address);
              handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
            } else {
              const coordsString = formatCoordinatesAsAddress(latitude, longitude);
              onFromLocationChange(coordsString);
              handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
            }
          } catch (error) {
            const coordsString = formatCoordinatesAsAddress(latitude, longitude);
            onFromLocationChange(coordsString);
            handleFromCoordinatesUpdate({ lat: latitude, lng: longitude });
          } finally {
            setIsReverseGeocoding(false);
          }
        },
        (error) => {
          setIsReverseGeocoding(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  };

  const handleNavigationToggle = () => {
    if (isNavigating) {
      onStopNavigation?.();
    } else {
      if (currentRoute && selectedProfile) {
        onStartNavigation();
      }
    }
  };

  const handleProfileCreated = (profile: VehicleProfile) => {
    onProfileSelect(profile);
    setShowVehicleProfileSetup(false);
  };

  const handleVehicleTypeClick = () => {
    onShowLaneGuidance?.();
  };

  const handleVehicleSettingsClick = () => {
    onShowVehicleSettings?.(true);
  };

  const handleEntertainmentClick = () => {
    setShowEntertainmentPanel(true);
  };

  const handleThemeClick = () => {
    setShowThemeSelector(true);
  };

  const handleWeatherClick = () => {
    setShowWeatherWidget(true);
  };

  const handleIncidentReportClick = () => {
    setShowIncidentReporting(true);
  };

  const filteredFacilities = (facilities || []).filter((facility: Facility) =>
    (facility.name || "").toLowerCase().includes(facilitySearchInput.toLowerCase()) ||
    (facility.address || "").toLowerCase().includes(facilitySearchInput.toLowerCase())
  );

  const handleFacilitySelect = (facility: Facility) => {
    onSelectFacility?.(facility);
  };

  const handlePOISearch = (category: string) => {
    setSelectedPOICategory(category === selectedPOICategory ? "" : category);
    setFacilitySearchInput("");
  };

  const handleFacilitySearch = () => {
    if (!facilitySearchInput.trim()) {
      return;
    }
    setSelectedPOICategory("");
  };

  const handleNavigateToFacility = (facility: Facility) => {
    const locationString = `${facility.name}, ${facility.address || ''}`;
    onNavigateToLocation?.(locationString);
    onToLocationChange(locationString);
  };

  const handleTruckStopsClick = () => {
    handlePOISearch("truck_stop");
  };
  
  const handleFuelStationsClick = () => {
    handlePOISearch("fuel");
  };
  
  const handleParkingClick = () => {
    handlePOISearch("parking");
  };
  
  const handleRestaurantsClick = () => {
    handlePOISearch("restaurant");
  };
  
  const handleShopsClick = () => {
    handlePOISearch("shop");
  };

  const handleSupermarketsClick = () => {
    handlePOISearch("supermarket");
  };

  return (
    <>
      <div
        className={cn(
          "fixed top-1/3 -translate-y-1/2 z-[45] transition-all duration-300 ease-in-out",
          isOpen 
            ? (isCollapsed ? "left-[72px]" : "left-[324px]") 
            : "left-3"
        )}
      >
        <button
          onClick={(e) => {
            onToggle();
          }}
          className="rounded-lg shadow-lg select-none touch-manipulation transition-all duration-300 transform-gpu cursor-pointer hover:scale-105 active:scale-95"
          style={{
            width: '40px',
            height: '40px',
            minWidth: '40px',
            minHeight: '40px',
            maxWidth: '40px',
            maxHeight: '40px',
            backgroundColor: '#ffffff',
            borderTop: '3px solid #3b82f6',
            borderBottom: '3px solid #3b82f6',
            borderLeft: '1px solid #e5e7eb',
            borderRight: '1px solid #e5e7eb',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
            overflow: 'visible',
          }}
          data-testid="button-toggle-navigation-sidebar-tab"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
            <path d="M15 18H9" />
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
            <circle cx="17" cy="18" r="2" />
            <circle cx="7" cy="18" r="2" />
          </svg>
        </button>
      </div>

      <div
        className={cn(
          "fixed left-0 lg:top-[57px] top-0 lg:h-[calc(100vh-57px)] h-screen bg-white dark:bg-slate-900 border-r border-border z-[40] shadow-lg",
          "sidebar-transition",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          isCollapsed ? "w-16" : "w-80",
          "flex flex-col"
        )}
        data-testid="navigation-sidebar-panel"
      >

        {!isCollapsed && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', padding: '4px' }}>
              {[
                { key: 'plan', label: 'Plan' },
                { key: 'recent', label: 'Recent' },
                { key: 'vehicle', label: 'Vehicle' },
                { key: 'theme', label: 'Theme' },
                { key: 'tools', label: 'Tools' },
                { key: 'offline', label: 'Offline' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    height: '32px',
                    fontSize: '10px',
                    fontWeight: 600,
                    textAlign: 'center',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    border: activeTab === tab.key ? '2px solid #2563eb' : '1px solid #d1d5db',
                    backgroundColor: activeTab === tab.key ? '#3b82f6' : '#ffffff',
                    color: activeTab === tab.key ? '#ffffff' : '#4b5563',
                    transition: 'all 0.15s ease',
                    padding: '0',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  data-testid={`sidebar-tab-${tab.key}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-scroll">
              {activeTab === 'plan' && <div className="p-3 space-y-3">
                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-500" />
                      Plan Your Route
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isCalculating ? "Calculating your route..." : 
                       currentRoute ? "Route ready - tap Start to begin" : 
                       "Enter start and destination"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">From</Label>
                      <div className="relative">
                        <AddressAutocomplete
                          value={fromLocation}
                          onChange={onFromLocationChange}
                          onCoordinatesChange={handleFromCoordinatesUpdate}
                          placeholder="Search address, postcode, or POI..."
                          id="current-location-input"
                          testId="input-current-location"
                          className="h-10 text-sm"
                          showSearchTypeToggles={false}
                        />
                        {fromLocation && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onFromLocationChange('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            data-testid="button-clear-from-location"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!fromLocation && (
                          <Button
                            onClick={handleUseCurrentLocation}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-blue-300 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2"
                            disabled={isReverseGeocoding}
                            data-testid="button-use-current-location"
                          >
                            {isReverseGeocoding ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Finding address...
                              </>
                            ) : (
                              <>
                                <Crosshair className="w-3 h-3 mr-1" />
                                Use Current Location
                              </>
                            )}
                          </Button>
                        )}
                        {previousOrigins.length > 0 && !fromLocation && (
                          <div className="flex items-center gap-1 overflow-x-auto">
                            {previousOrigins.slice(0, 2).map((origin) => (
                              <Button
                                key={origin.id}
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  onFromLocationChange(origin.formattedAddress);
                                  handleFromCoordinatesUpdate(origin.coordinates);
                                }}
                                className="h-7 text-xs px-2 bg-muted/30 hover:bg-muted/50 whitespace-nowrap max-w-[120px] truncate"
                              >
                                <MapPinned className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{origin.label}</span>
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                        <span>To</span>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onPlanRoute(routePreference)}
                          disabled={!fromLocation || !toLocation || !selectedProfile || isCalculating}
                          className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                          data-testid="button-preview-route-desktop"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      </Label>
                      <div className="relative">
                        <AddressAutocomplete
                          value={toLocation}
                          onChange={onToLocationChange}
                          onCoordinatesChange={onToCoordinatesChange}
                          placeholder="Search destination..."
                          id="destination-input"
                          testId="input-destination"
                          className="h-10 text-sm"
                        />
                        {toLocation && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToLocationChange('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            data-testid="button-clear-to-location"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <Tabs
                      value={routePreference}
                      onValueChange={(value) => setRoutePreference(value as 'fastest' | 'eco' | 'avoid_tolls')}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3 h-7 p-0.5">
                        <TabsTrigger value="fastest" className="text-[10px] h-6 px-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-none" data-testid="tab-fastest-desktop">
                          Fast
                        </TabsTrigger>
                        <TabsTrigger value="eco" className="text-[10px] h-6 px-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-none" data-testid="tab-eco-desktop">
                          Eco
                        </TabsTrigger>
                        <TabsTrigger value="avoid_tolls" className="text-[10px] h-6 px-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-none" data-testid="tab-avoid-tolls-desktop">
                          No Tolls
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    {previousDestinations.length > 0 && !toLocation && (
                      <div className="space-y-2 pt-1">
                        <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                          <History className="h-3 w-3 text-purple-500" />
                          Recent Destinations
                        </Label>
                        <div className="space-y-1 max-h-[100px] overflow-y-auto">
                          {previousDestinations.slice(0, 3).map((dest) => (
                            <div
                              key={dest.id}
                              className="flex items-center gap-2 p-2 rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all"
                              onClick={() => {
                                onToLocationChange(dest.formattedAddress);
                                onToCoordinatesChange?.(dest.coordinates);
                              }}
                            >
                              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">{dest.label}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{dest.formattedAddress}</div>
                              </div>
                              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(isCalculating || currentRoute) && (
                      <div className={cn(
                        "flex items-center gap-2 p-2 rounded-md text-xs",
                        currentRoute ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      )}>
                        {isCalculating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Calculating route...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>Route ready</span>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {arSupported && isNavigating && onToggleAR && (
                  <Button
                    onClick={onToggleAR}
                    variant={isARMode ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "w-full h-9",
                      isARMode 
                        ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" 
                        : "hover:bg-primary/10"
                    )}
                    data-testid="button-ar-toggle-desktop"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isARMode ? "Exit AR Mode" : "AR Navigation"}
                  </Button>
                )}

                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Search className="w-4 h-4 text-purple-500" />
                      Find Nearby
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={handleTruckStopsClick}
                        variant={selectedPOICategory === 'truck_stop' ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "flex flex-col h-14 p-2 gap-1 text-xs",
                          selectedPOICategory !== 'truck_stop' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        data-testid="button-truck-stops"
                      >
                        <Truck className="w-4 h-4" />
                        <span className="text-[10px]">Truck Stops</span>
                      </Button>
                      
                      <Button
                        onClick={handleFuelStationsClick}
                        variant={selectedPOICategory === 'fuel' ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "flex flex-col h-14 p-2 gap-1 text-xs",
                          selectedPOICategory !== 'fuel' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        data-testid="button-fuel-stations"
                      >
                        <Fuel className="w-4 h-4" />
                        <span className="text-[10px]">Fuel</span>
                      </Button>
                      
                      <Button
                        onClick={handleParkingClick}
                        variant={selectedPOICategory === 'parking' ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "flex flex-col h-14 p-2 gap-1 text-xs",
                          selectedPOICategory !== 'parking' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        data-testid="button-parking"
                      >
                        <CircleParking className="w-4 h-4" />
                        <span className="text-[10px]">Parking</span>
                      </Button>
                      
                      <Button
                        onClick={handleRestaurantsClick}
                        variant={selectedPOICategory === 'restaurant' ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "flex flex-col h-14 p-2 gap-1 text-xs",
                          selectedPOICategory !== 'restaurant' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        data-testid="button-restaurants"
                      >
                        <Utensils className="w-4 h-4" />
                        <span className="text-[10px]">Food</span>
                      </Button>
                      
                      <Button
                        onClick={handleShopsClick}
                        variant={selectedPOICategory === 'shop' ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "flex flex-col h-14 p-2 gap-1 text-xs",
                          selectedPOICategory !== 'shop' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        data-testid="button-shops"
                      >
                        <Store className="w-4 h-4" />
                        <span className="text-[10px]">Shops</span>
                      </Button>

                      <Button
                        onClick={handleSupermarketsClick}
                        variant={selectedPOICategory === 'supermarket' ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "flex flex-col h-14 p-2 gap-1 text-xs",
                          selectedPOICategory !== 'supermarket' && "hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        data-testid="button-supermarkets"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-[10px]">Markets</span>
                      </Button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search facilities..."
                            value={facilitySearchInput}
                            onChange={(e) => setFacilitySearchInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleFacilitySearch();
                              }
                            }}
                            className="h-8 pl-8 text-xs"
                            data-testid="input-facility-search"
                          />
                        </div>
                        <Button
                          onClick={handleFacilitySearch}
                          disabled={!facilitySearchInput.trim()}
                          size="sm"
                          className="h-8 px-2.5"
                          data-testid="button-search-facilities"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {(selectedPOICategory || facilitySearchInput.trim()) && (
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center">
                          <Search className="w-4 h-4 mr-2 text-green-600" />
                          Search Results
                        </div>
                        <div className="flex items-center gap-2">
                          {isFacilitiesLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPOICategory("");
                              setFacilitySearchInput("");
                            }}
                            className="h-6 w-6 p-0"
                            data-testid="button-clear-search-results"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                      {isFacilitiesLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-background border rounded p-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                </div>
                                <div className="flex-1">
                                  <div className="h-3 bg-muted rounded mb-1"></div>
                                  <div className="h-2 bg-muted rounded w-3/4"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : filteredFacilities.length > 0 ? (
                        <div className="space-y-2">
                          {filteredFacilities.slice(0, 10).map((facility) => (
                            <div key={facility.id} className="bg-background border rounded p-2 hover:border-blue-300 transition-colors">
                              <div className="flex items-start space-x-2">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center flex-shrink-0">
                                  {facility.type === 'truck_stop' ? <Truck className="w-4 h-4 text-blue-600" /> :
                                   facility.type === 'fuel' ? <Fuel className="w-4 h-4 text-orange-600" /> :
                                   facility.type === 'parking' ? <CircleParking className="w-4 h-4 text-green-600" /> :
                                   facility.type === 'restaurant' ? <Utensils className="w-4 h-4 text-red-600" /> :
                                   facility.type === 'shop' ? <Store className="w-4 h-4 text-purple-600" /> :
                                   <MapPin className="w-4 h-4 text-gray-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="font-medium text-sm truncate" data-testid={`text-facility-name-${facility.id}`}>
                                      {facility.name}
                                    </div>
                                    {typeof (facility as any).distance === 'number' && (
                                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0">
                                        {(facility as any).distance < 1 
                                          ? `${Math.round((facility as any).distance * 1000)}m` 
                                          : `${((facility as any).distance as number).toFixed(1)}km`}
                                      </span>
                                    )}
                                  </div>
                                  {facility.address && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      {facility.address}
                                    </div>
                                  )}
                                  <div className="flex gap-1 mt-2">
                                    <Button
                                      onClick={() => handleFacilitySelect(facility)}
                                      variant="outline"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      data-testid={`button-select-facility-${facility.id}`}
                                    >
                                      Select
                                    </Button>
                                    <Button
                                      onClick={() => handleNavigateToFacility(facility)}
                                      variant="default"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      data-testid={`button-navigate-facility-${facility.id}`}
                                    >
                                      Navigate
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {filteredFacilities.length > 10 && (
                            <div className="text-xs text-center text-muted-foreground py-2">
                              Showing first 10 of {filteredFacilities.length} results
                            </div>
                          )}
                        </div>
                      ) : facilitiesError ? (
                        <div className="text-center py-4 space-y-2" data-testid="facilities-error-state">
                          <div className="text-sm text-red-600 dark:text-red-400">
                            ⚠️ Failed to load facilities
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Check your connection and try again
                          </div>
                          <Button
                            onClick={() => {
                              refetchFacilities();
                            }}
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            data-testid="button-retry-facilities"
                          >
                            Retry
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-muted-foreground" data-testid="no-facilities-state">
                          No facilities found for your search
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {currentRoute && (
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <RouteIcon className="w-4 h-4 mr-2 text-green-600" />
                        Route Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-background border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Current Route</span>
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Distance:</span>
                            <span className="font-medium" data-testid="text-route-distance">
                              {currentRoute.distance ? `${currentRoute.distance.toFixed(1)} miles` : '0 miles'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium">
                              {currentRoute.duration ? Math.round(currentRoute.duration / 60) : '0'} min
                            </span>
                          </div>
                          <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded text-xs text-green-700 dark:text-green-300">
                            Route ready for navigation
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isCalculating && !currentRoute && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="text-center py-2">
                        <div className="flex items-center justify-center text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Calculating route...
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedProfile && (
                  <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            {selectedProfile.name}
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            {selectedProfile.type.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>}

              {activeTab === 'recent' && <div className="p-3 space-y-3">
                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <History className="w-4 h-4 text-purple-500" />
                      Recent Destinations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {previousDestinations.length > 0 ? (
                      <div className="space-y-2">
                        {previousDestinations.map((dest) => (
                          <div
                            key={dest.id}
                            className="flex items-center gap-2 p-2 rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all"
                            onClick={() => {
                              onToLocationChange(dest.formattedAddress);
                              onToCoordinatesChange?.(dest.coordinates);
                              setActiveTab("plan");
                            }}
                          >
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{dest.label}</div>
                              <div className="text-xs text-muted-foreground truncate">{dest.formattedAddress}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeDestination(dest.id);
                              }}
                              className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        No recent destinations yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-yellow-500" />
                      Favorite Routes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {isLoadingFavorites ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : favoriteRoutes.length > 0 ? (
                      <div className="space-y-2">
                        {favoriteRoutes.map((route) => (
                          <div
                            key={route.id}
                            className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-all"
                          >
                            <Bookmark className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{route.name || 'Unnamed Route'}</div>
                              <div className="text-xs text-muted-foreground">
                                {route.distance ? `${route.distance.toFixed(1)} mi` : ''} 
                                {route.duration ? ` · ${Math.round(route.duration / 60)} min` : ''}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteFavoriteMutation.mutate(String(route.id))}
                              className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        No favorite routes saved
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Recent Journeys
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {isLoadingJourneys ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : recentJourneys.length > 0 ? (
                      <div className="space-y-2">
                        {recentJourneys.map((journey) => (
                          <div
                            key={journey.id}
                            className="p-2 rounded-md bg-muted/30"
                          >
                            <div className="text-sm font-medium truncate">
                              Journey #{journey.id}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {journey.status === 'completed' && (
                                <Badge variant="secondary" className="text-[10px] h-4">Completed</Badge>
                              )}
                              {journey.status === 'active' && (
                                <Badge variant="default" className="text-[10px] h-4 bg-green-500">Active</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        No recent journeys
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>}

              {activeTab === 'vehicle' && <div className="p-3 space-y-3">
                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-500" />
                      Vehicle Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    <Card
                      className={cn(
                        "cursor-pointer transition-all border-2",
                        vehicleType === 'class1_high'
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "border-transparent hover:border-gray-300"
                      )}
                      onClick={() => onVehicleTypeChange?.('class1_high')}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">Class 1 - Double Decker</div>
                          <div className="text-xs text-muted-foreground">4.95m / 15.95ft height</div>
                        </div>
                        {vehicleType === 'class1_high' && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </CardContent>
                    </Card>

                    <Card
                      className={cn(
                        "cursor-pointer transition-all border-2",
                        vehicleType === 'class1_standard'
                          ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                          : "border-transparent hover:border-gray-300"
                      )}
                      onClick={() => onVehicleTypeChange?.('class1_standard')}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">Class 1 - Standard</div>
                          <div className="text-xs text-muted-foreground">3.97m / 13.01ft height</div>
                        </div>
                        {vehicleType === 'class1_standard' && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </CardContent>
                    </Card>

                    <Card
                      className={cn(
                        "cursor-pointer transition-all border-2",
                        vehicleType === 'car'
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                          : "border-transparent hover:border-gray-300"
                      )}
                      onClick={() => onVehicleTypeChange?.('car')}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <Car className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">Car</div>
                          <div className="text-xs text-muted-foreground">Fastest route, no restrictions</div>
                        </div>
                        {vehicleType === 'car' && (
                          <CheckCircle className="w-5 h-5 text-purple-500" />
                        )}
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>

                {selectedProfile && (
                  <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        Current Vehicle Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {selectedProfile.name}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {selectedProfile.type.replace('_', ' ').toUpperCase()}
                        </div>
                        {selectedProfile.height && (
                          <div className="text-xs text-muted-foreground">
                            H: {selectedProfile.height}m · W: {selectedProfile.width}m · L: {selectedProfile.length}m
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => setShowVehicleProfileSetup(true)}
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full text-xs"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Edit Profile
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>}

              {activeTab === 'theme' && <div className="p-3 space-y-3">
                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Palette className="w-4 h-4 text-purple-500" />
                      Theme
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <ThemeSelector
                      showLabels={true}
                      showGrayscale={false}
                      showColorSpectrum={false}
                      showAutoSettings={true}
                      className="space-y-3"
                    />
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-500" />
                      Color Spectrum
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <ColorSpectrumPicker />
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Sun className="w-4 h-4 text-gray-500" />
                      Grayscale
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <GrayscaleSelector />
                  </CardContent>
                </Card>
              </div>}

              {activeTab === 'tools' && <div className="p-3 space-y-3">
                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Map className="w-4 h-4 text-green-500" />
                      Region & Measurement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <RegionSelector />
                    <MeasurementSelector />
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-gray-500" />
                      Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={handleWeatherClick}
                        variant="ghost"
                        size="sm"
                        className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Cloud className="w-4 h-4" />
                        <span className="text-[10px]">Weather</span>
                      </Button>
                      
                      <Button
                        onClick={handleEntertainmentClick}
                        variant="ghost"
                        size="sm"
                        className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Music className="w-4 h-4" />
                        <span className="text-[10px]">Media</span>
                      </Button>

                      <Button
                        onClick={() => setShowVoiceNavigation(true)}
                        variant="ghost"
                        size="sm"
                        className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Mic className="w-4 h-4" />
                        <span className="text-[10px]">Voice Nav</span>
                      </Button>

                      <Button
                        onClick={() => setShowFuelPrices(true)}
                        variant="ghost"
                        size="sm"
                        className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Fuel className="w-4 h-4" />
                        <span className="text-[10px]">Fuel Prices</span>
                      </Button>

                      <Button
                        onClick={() => setShowFatigueMonitor(true)}
                        variant="ghost"
                        size="sm"
                        className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-[10px]">Fatigue</span>
                      </Button>

                      <Button
                        onClick={handleVehicleSettingsClick}
                        variant="ghost"
                        size="sm"
                        className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-[10px]">Settings</span>
                      </Button>

                      <Button
                        onClick={handleIncidentReportClick}
                        variant="ghost"
                        size="sm"
                        className="flex flex-col h-14 p-2 gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-[10px]">Report</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-500" />
                      Language
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <LanguageSelector />
                  </CardContent>
                </Card>
              </div>}

              {activeTab === 'offline' && <div className="p-3 space-y-3">
                <OfflineDownloadsPanel />
              </div>}
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-2">
            <Button
              onClick={onToggle}
              variant="ghost"
              size="icon"
              className="w-10 h-10 scalable-control-button"
              data-testid="button-expand-navigation-sidebar"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-transparent z-20 lg:hidden"
          style={{ pointerEvents: 'none' }}
          data-testid="navigation-sidebar-overlay"
        >
          <div 
            className="absolute inset-0"
            style={{ 
              left: isCollapsed ? '64px' : '320px', 
              pointerEvents: 'auto' 
            }}
            onClick={onToggle}
          />
        </div>
      )}

      {showVehicleProfileSetup && (
        <VehicleProfileSetup
          onClose={() => setShowVehicleProfileSetup(false)}
          onProfileCreated={handleProfileCreated}
          currentProfile={selectedProfile}
        />
      )}

      <EntertainmentPanel
        isOpen={showEntertainmentPanel}
        onClose={() => setShowEntertainmentPanel(false)}
      />

      {showThemeSelector && (
        <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm max-h-[80vh] bg-background shadow-xl flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0">
              <CardTitle className="text-lg flex items-center">
                <Palette className="w-5 h-5 mr-2 text-primary" />
                Theme Settings
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowThemeSelector(false)}
                data-testid="button-close-theme"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 min-h-0">
              <ThemeSelector
                showLabels={true}
                showGrayscale={true}
                showColorSpectrum={true}
                showAutoSettings={true}
                className="space-y-4"
              />
            </CardContent>
          </Card>
        </div>
      )}

      <WeatherWidget
        isOpen={showWeatherWidget}
        onClose={() => setShowWeatherWidget(false)}
      />

      {showIncidentReporting && (
        <IncidentReportingForm
          currentLocation={coordinates}
          onClose={() => setShowIncidentReporting(false)}
          onIncidentCreated={() => {}}
        />
      )}

      <Dialog open={showFuelPrices} onOpenChange={setShowFuelPrices}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-green-600" />
              Fuel Price Comparison
            </DialogTitle>
            <DialogDescription>
              Find the cheapest fuel near your location
            </DialogDescription>
          </DialogHeader>
          <FuelPriceComparison 
            onNavigateToStation={() => {
              setShowFuelPrices(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showFatigueMonitor} onOpenChange={setShowFatigueMonitor}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Driver Fatigue Monitor
            </DialogTitle>
            <DialogDescription>
              Track your driving time for EU/UK compliance
            </DialogDescription>
          </DialogHeader>
          <DriverFatigueAlert 
            isNavigating={isNavigating}
            onRequestBreak={() => {
              setShowFatigueMonitor(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showVoiceNavigation} onOpenChange={setShowVoiceNavigation}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-600" />
              Voice Navigation
            </DialogTitle>
            <DialogDescription>
              Control navigation with voice commands
            </DialogDescription>
          </DialogHeader>
          <VoiceNavigationPanel />
        </DialogContent>
      </Dialog>
    </>
  );
});

export default NavigationSidebar;
