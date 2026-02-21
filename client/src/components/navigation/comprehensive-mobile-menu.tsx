/**
 * Comprehensive Mobile Menu Panel for TruckNav Pro
 * 
 * Centralizes all app features into one mobile-friendly menu:
 * - Recent Destinations (History & Favorites)
 * - Vehicle Selection & Setup
 * - Theme & Appearance (Day/Night/Auto modes, colors)
 * - Map & POI Settings
 * - Tools (Weather, Entertainment, Voice Navigation)
 * - General Settings
 */

import { useState, memo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  X,
  History,
  Bookmark,
  Truck,
  Car,
  Palette,
  Map,
  Settings,
  Cloud,
  Music,
  Mic,
  ChevronRight,
  MapPin,
  Fuel,
  CircleParking,
  Utensils,
  Play,
  Trash2,
  Sun,
  Moon,
  Clock,
  Layers,
  Wrench,
  Navigation,
  MapPinned,
  Loader2,
  Store,
  ShoppingCart,
  Users,
  Download,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Route as RouteType, type Journey, type VehicleProfile, type FleetVehicle, type Operator } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  useTomTomAutocomplete, 
  formatTomTomDisplay, 
  extractTomTomCoordinates,
  type TomTomResult 
} from "@/hooks/use-tomtom-autocomplete";
import { useGPS } from "@/contexts/gps-context";

// Import existing components
import { ThemeSelector } from "@/components/theme/theme-selector";
import { AutoThemeSettings } from "@/components/theme/auto-theme-settings";
import { GrayscaleSelector } from "@/components/theme/grayscale-selector";
import { ColorSpectrumPicker } from "@/components/theme/color-spectrum-picker";
import { RegionSelector } from "@/components/measurement/region-selector";
import { MeasurementSelector } from "@/components/measurement/measurement-selector";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import WeatherWidget from "@/components/weather/weather-widget";
import EntertainmentPanel from "@/components/entertainment/entertainment-panel";
import VoiceNavigationPanel from "@/components/navigation/voice-navigation-panel";
import SettingsModal from "@/components/settings/settings-modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OfflineDownloadsPanel } from "@/components/navigation/offline-downloads-panel";
import { FuelPriceComparison } from "@/components/fuel/fuel-price-comparison";
import { DriverFatigueAlert } from "@/components/safety/driver-fatigue-alert";
import { LanguageSelector } from "@/components/settings/language-selector";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useDestinationHistory } from "@/hooks/use-destination-history";
import { useOriginHistory } from "@/hooks/use-origin-history";
import { Tabs as RouteTabs, TabsList as RouteTabsList, TabsTrigger as RouteTabsTrigger } from "@/components/ui/tabs";
import { useAddressDictation } from "@/hooks/use-address-dictation";
import { useTranslation } from 'react-i18next';
import { NavigationVoice } from "@/lib/navigation-voice";
import { getVoiceCommandSystem } from "@/lib/voice-commands";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { PreTripInspection } from "@/components/navigation/pre-trip-inspection";
import { WorkingTimeWarning, useWorkingTimeTracker } from "@/components/navigation/working-time-warning";
import { FileCheck, ClipboardCheck } from "lucide-react";

interface ComprehensiveMobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Route planning
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onPlanRoute: () => Promise<void>;
  onStartNavigation: () => void;
  onStopNavigation?: () => void;
  currentRoute: RouteType | null;
  isCalculating?: boolean;
  isNavigating?: boolean;
  // Reset trigger to clear inputs immediately (incremented on route cancellation)
  resetTrigger?: number;
  // Auto-navigation flag for GO button flow
  onRequestAutoNavigation?: () => void;
  // Vehicle
  selectedProfile: VehicleProfile | null;
  onProfileSelect: (profile: VehicleProfile) => void;
  // Vehicle type selection - supports multiple trailer types
  vehicleType?: 'car' | 'class1_high' | 'class1_standard';
  onVehicleTypeChange?: (type: 'car' | 'class1_high' | 'class1_standard') => void;
  // Legacy car profile mode - for backward compatibility
  isCarProfileMode?: boolean;
  onCarProfileModeChange?: (isCarMode: boolean) => void;
  // POI search
  coordinates?: { lat: number; lng: number };
  onSelectFacility?: (facility: any) => void;
  // Route input mode - hides tabs when entering route
  hideTabsInInputMode?: boolean;
}

function ComprehensiveMobileMenu({
  open,
  onOpenChange,
  onFromLocationChange,
  onToLocationChange,
  onPlanRoute,
  onStartNavigation,
  onStopNavigation,
  currentRoute,
  isCalculating = false,
  isNavigating = false,
  resetTrigger = 0,
  onRequestAutoNavigation,
  selectedProfile,
  onProfileSelect,
  vehicleType = 'class1_high',
  onVehicleTypeChange,
  isCarProfileMode = false,
  onCarProfileModeChange,
  coordinates,
  onSelectFacility,
  hideTabsInInputMode = false
}: ComprehensiveMobileMenuProps) {
  // Use vehicleType if provided, otherwise derive from isCarProfileMode for backward compatibility
  const activeVehicleType = vehicleType || (isCarProfileMode ? 'car' : 'class1_high');
  const handleVehicleTypeChange = (type: 'car' | 'class1_high' | 'class1_standard') => {
    if (onVehicleTypeChange) {
      onVehicleTypeChange(type);
    } else if (onCarProfileModeChange) {
      // Fallback to legacy boolean mode
      onCarProfileModeChange(type === 'car');
    }
  };
  const { formatDistance } = useMeasurement();
  const gps = useGPS();
  const { resetTour } = useOnboarding();
  const { destinations: previousDestinations, removeDestination } = useDestinationHistory();
  const { origins: previousOrigins, removeOrigin } = useOriginHistory();
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("plan");
  
  // Fleet vehicle and operator selection state
  const FLEET_VEHICLE_KEY = 'trucknav_active_fleet_vehicle';
  const FLEET_OPERATOR_KEY = 'trucknav_active_operator';
  
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
    enabled: open && activeTab === 'vehicle',
    staleTime: 60000,
  });
  
  // Fetch operators for dropdown
  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ['/api/fleet/operators/active'],
    enabled: open && activeTab === 'vehicle',
    staleTime: 60000,
  });
  
  // Sync driver session with server
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
        console.log('[Fleet-Mobile] Driver session synced');
      } else if (!vehicleId && selectedFleetVehicleId) {
        await fetch(`/api/fleet/driver-session/${selectedFleetVehicleId}`, { method: 'DELETE' });
        console.log('[Fleet-Mobile] Driver session ended');
      }
    } catch (error) {
      console.error('[Fleet-Mobile] Failed to sync driver session:', error);
    }
  };
  
  const handleFleetVehicleChange = (vehicleId: string) => {
    const id = vehicleId === 'none' ? null : vehicleId;
    setSelectedFleetVehicleId(id);
    if (id) {
      localStorage.setItem(FLEET_VEHICLE_KEY, id);
    } else {
      localStorage.removeItem(FLEET_VEHICLE_KEY);
    }
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
    syncDriverSession(selectedFleetVehicleId, id);
  };
  
  // Pre-trip inspection state
  const [showInspection, setShowInspection] = useState(false);
  
  // Working time tracker
  const { showWarning: showWorkingTimeWarning, dismissWarning } = useWorkingTimeTracker();
  
  // Get selected vehicle and operator names for inspection
  const selectedVehicle = fleetVehicles.find(v => v.id === selectedFleetVehicleId);
  const selectedOperator = operators.find(o => o.id === selectedOperatorId);
  
  // Track if we've auto-filled "from" with GPS to avoid re-triggering
  const hasAutoFilledFromGPS = useRef(false);
  
  // Local state for route planning inputs - Always start empty for new route planning
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  
  // Store coordinates from "From" location for POI search
  const [fromCoordinates, setFromCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [toCoordinates, setToCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  
  // Route preference state (Fastest, Eco, No Tolls)
  const [routePreference, setRoutePreference] = useState<'fastest' | 'eco' | 'avoid_tolls'>('fastest');
  
  // Loading state for reverse geocoding when using current location
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  
  // POI search state
  const [activePOICategory, setActivePOICategory] = useState<string | null>(null);
  const [poiSearchEnabled, setPoiSearchEnabled] = useState(false);
  
  // Clear inputs when resetTrigger changes (immediate reset on route cancellation)
  useEffect(() => {
    if (resetTrigger > 0) {
      console.log('[MENU-RESET] Clearing inputs on reset trigger:', resetTrigger);
      setFromInput('');
      setToInput('');
      setFromCoordinates(null);
      setToCoordinates(null);
      // Notify parent of cleared values
      onFromLocationChange('');
      onToLocationChange('');
    }
  }, [resetTrigger, onFromLocationChange, onToLocationChange]);
  
  // Reset POI state when menu opens
  useEffect(() => {
    if (open) {
      setActivePOICategory(null);
      setPoiSearchEnabled(false);
    }
  }, [open]);
  
  // Auto-fill "from" with GPS location when destination is entered first
  useEffect(() => {
    // Only trigger if: destination has text, from is empty, GPS is available, and we haven't auto-filled yet
    if (toInput && toInput.length > 3 && !fromInput && gps?.position && !hasAutoFilledFromGPS.current) {
      hasAutoFilledFromGPS.current = true;
      const lat = gps.position.latitude;
      const lng = gps.position.longitude;
      
      console.log('[AUTO-GPS] Auto-filling "from" with current GPS location - reverse geocoding:', lat, lng);
      setFromCoordinates({ lat, lng });
      
      // Perform reverse geocoding to get actual address
      reverseGeocode(lat, lng).then(result => {
        if (result.success) {
          console.log('[AUTO-GPS] Reverse geocode success:', result.address);
          setFromInput(result.address);
          onFromLocationChange(result.address);
        } else {
          // Fallback to coordinates if reverse geocoding fails
          const fallbackAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          console.log('[AUTO-GPS] Reverse geocode failed, using coordinates:', fallbackAddress);
          setFromInput(fallbackAddress);
          onFromLocationChange(fallbackAddress);
        }
      }).catch(error => {
        // Fallback to coordinates on error
        const fallbackAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        console.error('[AUTO-GPS] Reverse geocode error:', error);
        setFromInput(fallbackAddress);
        onFromLocationChange(fallbackAddress);
      });
    }
  }, [toInput, fromInput, gps?.position, onFromLocationChange]);
  
  // Reset auto-fill flag when inputs are cleared
  useEffect(() => {
    if (!fromInput && !toInput) {
      hasAutoFilledFromGPS.current = false;
    }
  }, [fromInput, toInput]);
  
  // Sync voice systems with current i18n language
  useEffect(() => {
    const currentLang = i18n.language || 'en-US';
    try {
      // Update NavigationVoice singleton
      NavigationVoice.getInstance().setLanguage(currentLang);
      // Update VoiceCommandSystem singleton  
      getVoiceCommandSystem().setLanguage(currentLang);
      console.log('[VOICE-LANG] Synced voice systems to language:', currentLang);
    } catch (error) {
      console.warn('[VOICE-LANG] Failed to sync voice language:', error);
    }
  }, [i18n.language]);
  
  // Temporary function to clear old route data
  const handleClearOldRoute = () => {
    localStorage.removeItem('activeJourneyId');
    localStorage.removeItem('trucknav_active_journey');
    // Clear any URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('journey');
    window.history.replaceState({}, '', url.pathname);
    
    // Refresh page to ensure clean state
    window.location.reload();
  };
  
  // State to force open the From dropdown after voice dictation
  const [forceOpenFromDropdown, setForceOpenFromDropdown] = useState(false);
  
  // Voice dictation for address input
  // Flow: Press mic button → tap input field → speak → text fills that field
  const [activeDictationField, setActiveDictationField] = useState<'from' | 'to' | null>(null);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false); // Mic button pressed, waiting for field selection
  
  // Use ref to avoid stale closure in callbacks - React state is captured at callback creation time
  const activeDictationFieldRef = useRef<'from' | 'to' | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    activeDictationFieldRef.current = activeDictationField;
  }, [activeDictationField]);
  
  const { 
    isSupported: voiceSupported,
    isListening,
    interimTranscript,
    startListening: startVoiceDictation,
    stopListening: stopVoiceDictation 
  } = useAddressDictation({
    lang: i18n.language || 'en-US',
    timeout: 10000,
    onFinalResult: (transcript) => {
      const field = activeDictationFieldRef.current;
      console.log('[VOICE-DICTATION] Final result for field:', field, 'transcript:', transcript);
      if (field === 'from') {
        setFromInput(transcript);
        onFromLocationChange(transcript);
        // Force open the dropdown to show autocomplete suggestions
        setForceOpenFromDropdown(true);
      } else if (field === 'to') {
        setToInput(transcript);
        onToLocationChange(transcript);
      }
      // Reset voice mode after successful dictation
      activeDictationFieldRef.current = null;
      setActiveDictationField(null);
      setIsVoiceModeActive(false);
    },
    onError: (error) => {
      console.error('[VOICE-DICTATION] Error:', error);
      activeDictationFieldRef.current = null;
      setActiveDictationField(null);
      setIsVoiceModeActive(false);
    },
    onStateChange: (state) => {
      console.log('[VOICE-DICTATION] State changed to:', state);
      if (state === 'idle' || state === 'error') {
        // Only reset field selection, keep voice mode active if user hasn't spoken yet
        if (activeDictationFieldRef.current) {
          activeDictationFieldRef.current = null;
          setActiveDictationField(null);
        }
      }
    }
  });
  
  // Handle voice dictation button click - toggles voice input mode
  const handleVoiceDictation = useCallback(() => {
    if (isListening) {
      // Stop current dictation
      stopVoiceDictation();
      setActiveDictationField(null);
      setIsVoiceModeActive(false);
    } else if (isVoiceModeActive) {
      // Cancel voice mode
      setIsVoiceModeActive(false);
      setActiveDictationField(null);
    } else {
      // Activate voice mode - waiting for user to tap a field
      console.log('[VOICE-DICTATION] Voice mode activated - tap an input field');
      setIsVoiceModeActive(true);
    }
  }, [isListening, isVoiceModeActive, stopVoiceDictation]);
  
  // Handle input field tap when voice mode is active
  const handleFieldTapForVoice = useCallback((field: 'from' | 'to') => {
    if (isVoiceModeActive && !isListening) {
      console.log('[VOICE-DICTATION] Starting dictation for field:', field);
      // Set both ref and state - ref is used in callbacks to avoid stale closures
      activeDictationFieldRef.current = field;
      setActiveDictationField(field);
      startVoiceDictation();
    }
  }, [isVoiceModeActive, isListening, startVoiceDictation]);
  
  // Get GPS coordinates for location-biased search
  const gpsCoordinates = gps?.position ? {
    lat: gps.position.latitude,
    lng: gps.position.longitude
  } : undefined;
  
  // Use "From" location coordinates for POI search if available, otherwise use GPS
  const poiSearchCoordinates = fromCoordinates || gpsCoordinates;
  
  // Search query for each POI category (no categorySet - let TomTom find best matches)
  const poiSearchQueryMap: { [key: string]: string } = {
    truck_stop: 'truck stop',
    fuel: 'petrol station',
    parking: 'parking',
    restaurant: 'restaurant',
    rest_area: 'rest area',
    shops: '', // Shops use our custom /api/poi-search endpoint instead
    supermarket: 'supermarket'
  };
  
  // TomTom POI search - uses "From" location if set, otherwise GPS
  // Note: Shops use our custom endpoint, other categories use TomTom
  const { results: tomtomPoiResults, isLoading: tomtomPoiLoading } = useTomTomAutocomplete(
    activePOICategory && activePOICategory !== 'shops' ? poiSearchQueryMap[activePOICategory] : '', // Skip TomTom for shops
    poiSearchEnabled && activePOICategory !== null && activePOICategory !== 'shops', // Don't use TomTom for shops
    undefined, // No country restriction
    undefined, // No category restriction - let search query find best matches
    poiSearchCoordinates, // Use From location or GPS
    'poi', // POI search
    9656 // 6-mile radius in meters
  );
  
  // Custom shop search using our API
  const { data: shopResults = [], isLoading: shopLoading } = useQuery<any[]>({
    queryKey: ['/api/poi-search', poiSearchCoordinates?.lat, poiSearchCoordinates?.lng, 'shop'],
    queryFn: async () => {
      if (!poiSearchCoordinates?.lat || !poiSearchCoordinates?.lng) {
        return [];
      }
      const params = new URLSearchParams({
        lat: poiSearchCoordinates.lat.toString(),
        lng: poiSearchCoordinates.lng.toString(),
        radius: '10', // 10km (6 miles)
        type: 'shop'
      });
      const response = await fetch(`/api/poi-search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch shops');
      }
      return response.json();
    },
    enabled: poiSearchEnabled && activePOICategory === 'shops' && Boolean(poiSearchCoordinates),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  // Combine results based on active category
  const poiResults = activePOICategory === 'shops' 
    ? shopResults.map(shop => ({
        id: shop.id,
        type: 'POI' as const,
        score: 100,
        poi: { name: shop.name },
        address: { freeformAddress: shop.address },
        dist: (shop.distance || 0) * 1000, // Convert km to meters
        position: { lat: shop.lat || shop.latitude, lon: shop.lng || shop.longitude }
      }))
    : tomtomPoiResults;
  
  const poiLoading = activePOICategory === 'shops' ? shopLoading : tomtomPoiLoading;

  // Handle POI selection
  const handleSelectPOI = useCallback((poi: any) => {
    const displayLabel = poi.poi?.name || poi.name || "Unknown Place";
    const address = poi.address?.freeformAddress || poi.address || "";
    const fullLabel = address ? `${displayLabel}, ${address}` : displayLabel;
    
    const lat = poi.position?.lat || poi.position?.latitude;
    const lng = poi.position?.lon || poi.position?.lng;

    if (lat && lng) {
      setToInput(fullLabel);
      onToLocationChange(fullLabel);
      setActiveTab("plan");
      setActivePOICategory(null);
      setPoiSearchEnabled(false);
    }
  }, [onToLocationChange]);
  
  // Modal states for sub-panels
  const [showVehicleSetup, setShowVehicleSetup] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showEntertainment, setShowEntertainment] = useState(false);
  const [showVoiceNav, setShowVoiceNav] = useState(false);
  const [showFuelPrices, setShowFuelPrices] = useState(false);
  const [showFatigueMonitor, setShowFatigueMonitor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Format duration helper
  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, []);

  // Fetch recent journeys (last 5)
  const { data: recentJourneys = [], isLoading: isLoadingJourneys } = useQuery<Journey[]>({
    queryKey: ["/api/journeys"],
    queryFn: async () => {
      const res = await fetch("/api/journeys?limit=5", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  // Fetch favorite routes
  const { data: favoriteRoutes = [], isLoading: isLoadingFavorites } = useQuery<RouteType[]>({
    queryKey: ["/api/routes", "favorites"],
    queryFn: async () => {
      const res = await fetch("/api/routes/favorites", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  // Fetch vehicle profiles
  const { data: vehicleProfiles = [], isLoading: isLoadingProfiles } = useQuery<VehicleProfile[]>({
    queryKey: ["/api/vehicle-profiles"],
    enabled: open,
  });

  // Load favorite route
  const handleLoadFavorite = useCallback((route: RouteType) => {
    setFromInput(route.startLocation);
    setToInput(route.endLocation);
    onFromLocationChange(route.startLocation);
    onToLocationChange(route.endLocation);
    // Clear stored coordinates and POI search when loading a route template
    setFromCoordinates(null);
    setActivePOICategory(null);
    setPoiSearchEnabled(false);
    setActiveTab("plan"); // Switch to plan tab to show loaded route
  }, [onFromLocationChange, onToLocationChange]);

  // Load recent journey as a template for new route
  const handleLoadJourney = useCallback(async (journey: Journey) => {
    try {
      // Fetch the route associated with this journey
      const response = await fetch(`/api/routes/${journey.routeId}`, { credentials: "include" });
      
      if (!response.ok) {
        throw new Error("Failed to fetch route");
      }
      
      const route: RouteType = await response.json();
      
      // Populate inputs with route data
      setFromInput(route.startLocation);
      setToInput(route.endLocation);
      onFromLocationChange(route.startLocation);
      onToLocationChange(route.endLocation);
      // Clear stored coordinates and POI search when loading a route template
      setFromCoordinates(null);
      setActivePOICategory(null);
      setPoiSearchEnabled(false);
      setActiveTab("plan"); // Switch to plan tab to show loaded route
    } catch (error) {
      console.error("Failed to load journey route:", error);
    }
  }, [onFromLocationChange, onToLocationChange]);

  // Delete favorite route
  const deleteFavoriteMutation = useMutation({
    mutationFn: async (routeId: string) => {
      await apiRequest("DELETE", `/api/routes/${routeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes", "favorites"] });
    },
  });

  // POI Categories including shops and supermarkets
  const poiCategories = [
    { id: 'truck_stop', label: 'Truck Stops', icon: Truck, color: 'bg-blue-500' },
    { id: 'fuel', label: 'Fuel', icon: Fuel, color: 'bg-red-500' },
    { id: 'rest_area', label: 'Rest Areas', icon: CircleParking, color: 'bg-green-500' },
    { id: 'restaurant', label: 'Food', icon: Utensils, color: 'bg-orange-500' },
    { id: 'shops', label: 'Shops', icon: Store, color: 'bg-purple-500' },
    { id: 'supermarket', label: 'Supermarkets', icon: ShoppingCart, color: 'bg-pink-500' },
  ];
  
  // Handle POI category selection
  const handlePOISearch = useCallback((categoryId: string) => {
    // Use From location coordinates if available, otherwise GPS
    const searchCenter = fromCoordinates || gpsCoordinates;
    
    console.log('[POI-SEARCH] Button clicked:', {
      categoryId,
      fromCoordinates,
      gpsCoordinates,
      searchCenter,
      gpsAvailable: !!gps?.position
    });
    
    if (!searchCenter) {
      // toast({
      //   title: "Location needed",
      //   description: "Please enter a location in the 'From' field or enable GPS to search for nearby POIs.",
      //   variant: "destructive",
      // });
      return;
    }
    
    console.log('[POI-SEARCH] Starting search with coordinates:', searchCenter);
    setActivePOICategory(categoryId);
    setPoiSearchEnabled(true);
  }, [fromCoordinates, gpsCoordinates, gps]);

  // CRITICAL FIX: Use simple fixed div instead of Radix Dialog to avoid iOS Safari portal issues
  // The Radix Dialog portal can cause invisible overlays that block touch events
  if (!open) {
    return null;
  }

  return (
    <>
    {/* Full-screen fixed menu - bypasses Radix Dialog portal issues on iOS Safari */}
    <div 
      className="fixed inset-0 z-[200000] bg-white dark:bg-gray-950 flex flex-col pointer-events-auto"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
      data-testid="comprehensive-mobile-menu"
      role="dialog"
      data-state="open"
      aria-modal="true"
      aria-labelledby="mobile-menu-title"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white dark:bg-gray-950 flex-shrink-0 relative z-10">
        <div className="flex items-center justify-between">
          <h2 id="mobile-menu-title" className="text-lg font-semibold">Menu</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              console.log('[MOBILE-MENU] Close button clicked');
              onOpenChange(false);
            }}
            className="h-8 w-8"
            aria-label="Close menu"
            data-testid="button-close-menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>
      </div>

          {/* Tabbed Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            {!hideTabsInInputMode && (
              <TabsList className="w-full grid grid-cols-7 rounded-none border-b bg-gray-100 dark:bg-gray-900 h-auto p-0.5 flex-shrink-0 gap-px" tabIndex={-1}>
                <TabsTrigger 
                  value="plan" 
                  className="flex flex-col gap-0.5 !py-1.5 !px-1 data-[state=active]:bg-background min-w-0 !whitespace-normal"
                  data-testid="tab-plan"
                >
                  <MapPinned className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-[9px] leading-tight truncate w-full text-center">Plan</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="destinations" 
                  className="flex flex-col gap-0.5 !py-1.5 !px-1 data-[state=active]:bg-background min-w-0 !whitespace-normal"
                  data-testid="tab-destinations"
                >
                  <History className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-[9px] leading-tight truncate w-full text-center">Recent</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="vehicle" 
                  className="flex flex-col gap-0.5 !py-1.5 !px-1 data-[state=active]:bg-background min-w-0 !whitespace-normal"
                  data-testid="tab-vehicle"
                >
                  <Truck className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-[9px] leading-tight truncate w-full text-center">Vehicle</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="social" 
                  className="flex flex-col gap-0.5 !py-1.5 !px-1 data-[state=active]:bg-background min-w-0 !whitespace-normal"
                  data-testid="tab-social"
                >
                  <Users className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-[9px] leading-tight truncate w-full text-center">Social</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="theme" 
                  className="flex flex-col gap-0.5 !py-1.5 !px-1 data-[state=active]:bg-background min-w-0 !whitespace-normal"
                  data-testid="tab-theme"
                >
                  <Palette className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-[9px] leading-tight truncate w-full text-center">Theme</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tools" 
                  className="flex flex-col gap-0.5 !py-1.5 !px-1 data-[state=active]:bg-background min-w-0 !whitespace-normal"
                  data-testid="tab-tools"
                >
                  <Settings className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-[9px] leading-tight truncate w-full text-center">Tools</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="offline" 
                  className="flex flex-col gap-0.5 !py-1.5 !px-1 data-[state=active]:bg-background min-w-0 !whitespace-normal"
                  data-testid="tab-offline"
                >
                  <Download className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-[9px] leading-tight truncate w-full text-center">Offline</span>
                </TabsTrigger>
              </TabsList>
            )}

            <ScrollArea className="flex-1 overflow-x-hidden">
              {/* PLAN TAB - Route Planning */}
              <TabsContent value="plan" className="p-4 space-y-4 mt-0 overflow-hidden max-w-full">
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-blue-500" />
                        Plan Your Route
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleVoiceDictation}
                        disabled={!voiceSupported}
                        className={cn(
                          "h-8 w-8 rounded-full transition-colors",
                          isListening 
                            ? "bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 animate-pulse" 
                            : isVoiceModeActive
                            ? "bg-orange-100 hover:bg-orange-200 text-orange-600 hover:text-orange-700 animate-pulse"
                            : "bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700"
                        )}
                        data-testid="button-voice-dictation"
                        title={isListening ? "Listening... tap to stop" : isVoiceModeActive ? "Tap an input field" : "Voice input"}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {isListening ? (
                        <span className="text-red-600 font-medium">
                          Listening... speak your {activeDictationField === 'from' ? 'starting' : 'destination'} address
                          {interimTranscript && <span className="block text-gray-500 italic mt-1">"{interimTranscript}"</span>}
                        </span>
                      ) : isVoiceModeActive ? (
                        <span className="text-orange-600 font-medium">
                          Tap the From or To box to speak
                        </span>
                      ) : (
                        "Enter your start and destination"
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 overflow-hidden">
                    {/* From Location with AddressAutocomplete - Simple input without search options */}
                    <div 
                      className={cn(
                        "space-y-2 rounded-lg p-2 -m-2 transition-all",
                        isVoiceModeActive && !isListening && "ring-2 ring-orange-400 ring-offset-2 cursor-pointer bg-orange-50/50",
                        activeDictationField === 'from' && isListening && "ring-2 ring-red-400 ring-offset-2 bg-red-50/50"
                      )}
                      onClick={() => handleFieldTapForVoice('from')}
                    >
                      <Label className="text-sm font-medium flex items-center gap-2">
                        From
                        {isVoiceModeActive && !isListening && <span className="text-orange-600 text-xs">(tap to speak)</span>}
                        {activeDictationField === 'from' && isListening && <Mic className="h-3 w-3 text-red-600 animate-pulse" />}
                      </Label>
                      <AddressAutocomplete
                        id="from-input-menu"
                        value={fromInput}
                        onChange={(value) => {
                          setFromInput(value);
                          onFromLocationChange(value);
                          setActivePOICategory(null);
                          setPoiSearchEnabled(false);
                        }}
                        onCoordinatesChange={(coords) => {
                          setFromCoordinates(coords);
                        }}
                        coordinates={fromCoordinates}
                        placeholder="Search for address, postcode, or POI..."
                        testId="input-from-location"
                        showSearchTypeToggles={false}
                        hideGPSButton={true}
                        forceOpen={forceOpenFromDropdown}
                        onForceOpenConsumed={() => setForceOpenFromDropdown(false)}
                      />
                    </div>
                    
                    {/* Use Current Location Button */}
                    <div className="flex items-center gap-2 -mt-1">
                      {gps?.position && !fromInput && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isGeocodingLocation}
                          onClick={async () => {
                            const lat = gps.position!.latitude;
                            const lng = gps.position!.longitude;
                            console.log('[GPS-BUTTON] Using current location - starting reverse geocode:', lat, lng);
                            
                            setIsGeocodingLocation(true);
                            setFromCoordinates({ lat, lng });
                            
                            try {
                              const result = await reverseGeocode(lat, lng);
                              
                              if (result.success) {
                                console.log('[GPS-BUTTON] Reverse geocode success:', result.address);
                                setFromInput(result.address);
                                onFromLocationChange(result.address);
                              } else {
                                const fallbackAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                                console.log('[GPS-BUTTON] Reverse geocode failed, using coordinates:', fallbackAddress);
                                setFromInput(fallbackAddress);
                                onFromLocationChange(fallbackAddress);
                              }
                            } catch (error) {
                              const fallbackAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                              console.error('[GPS-BUTTON] Reverse geocode error:', error);
                              setFromInput(fallbackAddress);
                              onFromLocationChange(fallbackAddress);
                            } finally {
                              setIsGeocodingLocation(false);
                            }
                          }}
                          className="h-8 text-xs flex items-center gap-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          {isGeocodingLocation ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Navigation className="h-3 w-3" />
                          )}
                          {isGeocodingLocation ? 'Finding Address...' : 'Use Current Location'}
                        </Button>
                      )}
                    </div>

                    {/* Recent Origins - Quick Access below From input */}
                    {previousOrigins.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs font-medium flex items-center gap-1.5 px-1 text-muted-foreground">
                          <History className="h-3.5 w-3.5 text-blue-500" />
                          Recent Origins
                        </Label>
                        <div className="space-y-1 px-1 max-h-[90px] overflow-y-auto">
                          {previousOrigins.slice(0, 3).map((origin) => (
                            <div
                              key={origin.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all active:scale-[0.98]"
                              onClick={() => {
                                setFromInput(origin.formattedAddress);
                                setFromCoordinates(origin.coordinates);
                                onFromLocationChange(origin.formattedAddress);
                              }}
                              data-testid={`recent-origin-${origin.id}`}
                            >
                              <MapPinned className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{origin.label}</div>
                                <div className="text-xs text-muted-foreground truncate">{origin.formattedAddress}</div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* To Location with AddressAutocomplete */}
                    <div 
                      className={cn(
                        "space-y-2 rounded-lg p-2 -m-2 transition-all",
                        isVoiceModeActive && !isListening && "ring-2 ring-orange-400 ring-offset-2 cursor-pointer bg-orange-50/50",
                        activeDictationField === 'to' && isListening && "ring-2 ring-red-400 ring-offset-2 bg-red-50/50"
                      )}
                      onClick={() => handleFieldTapForVoice('to')}
                    >
                      <Label className="text-sm font-medium flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          To
                          {isVoiceModeActive && !isListening && <span className="text-orange-600 text-xs">(tap to speak)</span>}
                          {activeDictationField === 'to' && isListening && <Mic className="h-3 w-3 text-red-600 animate-pulse" />}
                        </span>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            console.log('[PREVIEW-BUTTON] Clicked - triggering auto-navigation flow');
                            onOpenChange(false);
                            if (onRequestAutoNavigation) {
                              onRequestAutoNavigation();
                            }
                            onPlanRoute();
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            const hasOrigin = fromInput || (gps?.position);
                            if (!hasOrigin || !toInput || !selectedProfile || isCalculating) return;
                            console.log('[PREVIEW-BUTTON] TouchEnd - triggering auto-navigation flow');
                            onOpenChange(false);
                            if (onRequestAutoNavigation) {
                              onRequestAutoNavigation();
                            }
                            onPlanRoute();
                          }}
                          disabled={(!fromInput && !gps?.position) || !toInput || !selectedProfile || isCalculating}
                          className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          data-testid="button-preview-route"
                        >
                          <Map className="h-4 w-4 mr-1" />
                          GO
                        </Button>
                      </Label>
                      <AddressAutocomplete
                        id="to-input-menu"
                        value={toInput}
                        onChange={(value) => {
                          setToInput(value);
                          onToLocationChange(value);
                        }}
                        onCoordinatesChange={(coords) => {
                          setToCoordinates(coords);
                        }}
                        coordinates={toCoordinates}
                        placeholder="Search for destination..."
                        testId="input-to-location"
                        showSearchTypeToggles={false}
                        hideGPSButton={true}
                      />
                    </div>

                    {/* Route Preferences - Fastest/Eco/No Tolls */}
                    <RouteTabs 
                      value={routePreference} 
                      onValueChange={(value) => setRoutePreference(value as 'fastest' | 'eco' | 'avoid_tolls')} 
                      className="w-full"
                    >
                      <RouteTabsList className="grid w-full grid-cols-3 h-10">
                        <RouteTabsTrigger value="fastest" className="text-sm" data-testid="tab-fastest">
                          Fastest
                        </RouteTabsTrigger>
                        <RouteTabsTrigger value="eco" className="text-sm" data-testid="tab-eco">
                          Eco
                        </RouteTabsTrigger>
                        <RouteTabsTrigger value="avoid_tolls" className="text-sm" data-testid="tab-avoid-tolls">
                          No Tolls
                        </RouteTabsTrigger>
                      </RouteTabsList>
                    </RouteTabs>

                    {/* Recent Destinations - Quick Access in Plan Tab */}
                    {previousDestinations.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <Separator />
                        <Label className="text-sm font-medium flex items-center gap-2 px-1">
                          <History className="h-4 w-4 text-purple-500" />
                          Recent Destinations
                        </Label>
                        <div className="space-y-1 px-1 max-h-[120px] overflow-y-auto">
                          {previousDestinations.slice(0, 3).map((dest) => (
                            <div
                              key={dest.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all active:scale-[0.98]"
                              onClick={() => {
                                setToInput(dest.formattedAddress);
                                onToLocationChange(dest.formattedAddress);
                                setToCoordinates(dest.coordinates);
                              }}
                              data-testid={`recent-dest-${dest.id}`}
                            >
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{dest.label}</div>
                                <div className="text-xs text-muted-foreground truncate">{dest.formattedAddress}</div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick POI Search - Integrated into Plan Tab */}
                    <div className="space-y-3 pt-2">
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2 px-1">
                          <MapPin className="h-4 w-4 text-purple-500" />
                          Nearby truck-friendly locations
                        </Label>
                        <div className="grid grid-cols-3 gap-2 px-1">
                          {poiCategories.map((category) => (
                            <Button
                              key={category.id}
                              variant={activePOICategory === category.id ? "default" : "outline"}
                              className={cn(
                                "h-14 flex flex-col gap-1 transition-all active:scale-95",
                                activePOICategory === category.id && "bg-blue-600 text-white border-blue-600"
                              )}
                              onClick={() => handlePOISearch(category.id)}
                              data-testid={`button-poi-${category.id}-plan`}
                            >
                              <category.icon className="h-4 w-4" />
                              <span className="text-[10px] font-medium">{category.label}</span>
                            </Button>
                          ))}
                        </div>
                        
                        {/* POI Results in Plan Tab */}
                        {activePOICategory && (
                          <div className="mt-2 space-y-2 px-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                {poiCategories.find(c => c.id === activePOICategory)?.label} Results
                              </span>
                              {poiLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 pb-2">
                              {!poiLoading && poiResults.length === 0 ? (
                                <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg border-dashed">
                                  No results found nearby
                                </div>
                              ) : (
                                poiResults.slice(0, 10).map((result: any, idx: number) => (
                                  <Card 
                                    key={result.id || idx} 
                                    className="cursor-pointer hover:border-blue-400 transition-all active:scale-[0.98] shadow-sm"
                                    onClick={() => handleSelectPOI(result)}
                                    data-testid={`card-poi-result-plan-${idx}`}
                                  >
                                    <CardContent className="p-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="font-bold text-sm truncate">
                                            {result.poi?.name || result.name || "Unknown"}
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                            {result.address?.freeformAddress || result.address || "No address"}
                                          </div>
                                          {result.dist != null && !isNaN(result.dist) && (
                                            <div className="text-[10px] text-blue-600 font-bold mt-1 uppercase tracking-wider">
                                              {(result.dist / 1609.34).toFixed(1)} miles away
                                            </div>
                                          )}
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current Vehicle Info */}
                    {selectedProfile && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Selected Vehicle</div>
                        <div className="font-medium text-sm">{selectedProfile.name || 'Unnamed Vehicle'}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {selectedProfile.height}m × {selectedProfile.width}m × {selectedProfile.length}m
                        </div>
                      </div>
                    )}

                    {/* GO Button - Shows when destination entered (origin auto-fills from GPS if empty) */}
                    {!currentRoute && (fromInput || gps?.position) && toInput && selectedProfile && (
                      <Button
                        onClick={async () => {
                          console.log('[GO-BUTTON-BOTTOM] Clicked - triggering route calculation and preview');
                          onOpenChange(false);
                          if (onRequestAutoNavigation) {
                            onRequestAutoNavigation();
                          }
                          await onPlanRoute();
                        }}
                        onTouchEnd={async (e) => {
                          e.preventDefault();
                          if (isCalculating) return;
                          console.log('[GO-BUTTON-BOTTOM] TouchEnd - triggering route calculation and preview');
                          onOpenChange(false);
                          if (onRequestAutoNavigation) {
                            onRequestAutoNavigation();
                          }
                          await onPlanRoute();
                        }}
                        disabled={isCalculating}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                        data-testid="button-go-route-bottom"
                      >
                        {isCalculating ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Calculating Route...
                          </>
                        ) : (
                          <>
                            <Navigation className="h-5 w-5 mr-2" />
                            GO
                          </>
                        )}
                      </Button>
                    )}

                    {/* Route Status - Shows route info when calculated */}
                    {currentRoute && !isNavigating && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="text-sm font-medium text-green-900 dark:text-green-100">
                          ✓ Route calculated - Close menu and tap GO to start
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                          {formatDistance(currentRoute.distance || 0, 'km')} • {formatDuration(currentRoute.duration || 0)}
                        </div>
                      </div>
                    )}

                    {/* Stop Navigation Button - Shows when navigating */}
                    {isNavigating && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (onStopNavigation) {
                            onStopNavigation();
                          }
                          onOpenChange(false);
                        }}
                        className="w-full h-12 font-semibold"
                        data-testid="button-stop-navigation-menu"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Stop Navigation
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DESTINATIONS TAB */}
              <TabsContent value="destinations" className="p-4 space-y-4 mt-0">
                {/* Recent Destinations & POI Search */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4 text-purple-500" />
                      Recent Destinations
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Your saved destinations and nearby POI search
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {poiCategories.map((category) => (
                        <Button
                          key={category.id}
                          variant={activePOICategory === category.id ? "default" : "outline"}
                          className="h-16 flex flex-col gap-1 transition-opacity hover:opacity-90 active:opacity-70"
                          onClick={() => handlePOISearch(category.id)}
                          data-testid={`button-poi-${category.id}`}
                        >
                          <category.icon className="h-5 w-5" />
                          <span className="text-xs">{category.label}</span>
                        </Button>
                      ))}
                    </div>
                    
                    {/* POI Results */}
                    {poiLoading && activePOICategory && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                      </div>
                    )}
                    
                    {!poiLoading && activePOICategory && poiResults.length === 0 && (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        No {poiCategories.find(c => c.id === activePOICategory)?.label} found nearby
                      </div>
                    )}
                    
                    {!poiLoading && poiResults.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Found {poiResults.length} nearby
                        </div>
                        {poiResults.slice(0, 5).map((result, idx) => (
                          <Card 
                            key={result.id} 
                            className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all hover:translate-x-1 active:translate-x-0"
                            onClick={() => {
                              const coords = extractTomTomCoordinates(result);
                              if (coords && onSelectFacility) {
                                onSelectFacility({
                                  name: result.poi?.name || formatTomTomDisplay(result),
                                  coordinates: coords,
                                  type: activePOICategory,
                                  address: formatTomTomDisplay(result)
                                });
                                onOpenChange(false);
                              }
                            }}
                            data-testid={`card-poi-result-${idx}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {result.poi?.name || formatTomTomDisplay(result)}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 truncate">
                                    {formatTomTomDisplay(result)}
                                  </div>
                                  {result.dist != null && !isNaN(result.dist) && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {formatDistance(result.dist, 'meters')} away
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Previous Destinations - Order of Travel (Most Recent First) */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4 text-blue-500" />
                      Previous Destinations
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Tap to navigate again (ordered by travel)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {previousDestinations.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        No previous destinations yet
                      </div>
                    ) : (
                      previousDestinations.slice(0, 10).map((dest) => (
                        <Card 
                          key={dest.id} 
                          className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all hover:translate-x-1 active:translate-x-0"
                          onClick={() => {
                            if (onSelectFacility) {
                              onSelectFacility({
                                name: dest.label,
                                coordinates: dest.coordinates,
                                type: 'previous',
                                address: dest.formattedAddress
                              });
                              setActiveTab("plan");
                            }
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {dest.label}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  {dest.formattedAddress}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                  <span>{new Date(dest.lastVisitedAt).toLocaleDateString()}</span>
                                  {dest.visitCount > 1 && (
                                    <Badge variant="secondary" className="text-xs px-1 py-0">
                                      {dest.visitCount}x
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeDestination(dest.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Favorite Routes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bookmark className="h-4 w-4 text-yellow-500" />
                      Favorite Routes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isLoadingFavorites ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : favoriteRoutes.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        No favorite routes saved yet
                      </div>
                    ) : (
                      favoriteRoutes.map((route) => (
                        <Card 
                          key={route.id} 
                          className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all hover:translate-x-1 active:translate-x-0"
                          onClick={() => handleLoadFavorite(route)}
                          data-testid={`card-favorite-route-${route.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{route.name || 'Unnamed Route'}</div>
                                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                  <div className="truncate">From: {route.startLocation}</div>
                                  <div className="truncate">To: {route.endLocation}</div>
                                  <div className="flex gap-3 mt-1">
                                    <span>{formatDistance(route.distance || 0, 'km')}</span>
                                    <span>{formatDuration(route.duration || 0)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleLoadFavorite(route)}
                                  className="h-8 px-2"
                                  data-testid={`button-load-favorite-${route.id}`}
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteFavoriteMutation.mutate(route.id)}
                                  className="h-8 px-2 text-destructive"
                                  data-testid={`button-delete-favorite-${route.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Recent Journeys */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      Recent Destinations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isLoadingJourneys ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : recentJourneys.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        No recent journeys
                      </div>
                    ) : (
                      recentJourneys.map((journey) => (
                        <Card 
                          key={journey.id} 
                          className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all hover:translate-x-1 active:translate-x-0"
                          onClick={() => handleLoadJourney(journey)}
                          data-testid={`card-journey-${journey.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <Badge variant={
                                  journey.status === 'completed' ? 'default' :
                                  journey.status === 'active' ? 'secondary' : 'outline'
                                } className="mb-2 text-xs">
                                  {journey.status}
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(journey.startedAt).toLocaleDateString()}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* VEHICLE TAB */}
              <TabsContent value="vehicle" className="p-4 space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Vehicle Profiles
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Switch between truck and car routing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Current Active Profile Display */}
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">Current Vehicle</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {activeVehicleType === 'car' ? 'Car' : 
                               activeVehicleType === 'class1_high' ? 'Class 1 - Double Decker Trailer' : 
                               'Class 1 : Standard Trailer'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {activeVehicleType === 'car' 
                                ? 'L: 4.4m × H: 1.5m × W: 1.8m'
                                : activeVehicleType === 'class1_high'
                                ? 'H: 4.95m (15.95ft) × W: 2.55m × L: 16.5m'
                                : 'H: 3.97m (13.01ft) × W: 2.55m × L: 16.5m'
                              }
                            </div>
                          </div>
                          <Badge>Active</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Vehicle Selection - Three options */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Select Vehicle Type</Label>
                      
                      {/* Class 1 - Double Decker Trailer Option (High) */}
                      <Card 
                        className={cn(
                          "cursor-pointer transition-all hover:bg-muted/50 active:scale-[0.98]",
                          activeVehicleType === 'class1_high' && "border-primary bg-primary/5"
                        )}
                        onClick={() => handleVehicleTypeChange('class1_high')}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Truck className="h-5 w-5 text-primary" />
                            <div className="flex-1">
                              <div className="font-bold text-sm">Class 1 - Double Decker Trailer</div>
                              <div className="text-xs text-muted-foreground">
                                H: <span className="font-bold">15.95ft</span> (4.95m) × W: 2.55m × L: 16.5m
                              </div>
                            </div>
                            {activeVehicleType === 'class1_high' && <Badge variant="secondary" className="text-[10px]">Selected</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Class 1 : Standard Trailer Option */}
                      <Card 
                        className={cn(
                          "cursor-pointer transition-all hover:bg-muted/50 active:scale-[0.98]",
                          activeVehicleType === 'class1_standard' && "border-primary bg-primary/5"
                        )}
                        onClick={() => handleVehicleTypeChange('class1_standard')}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Truck className="h-5 w-5 text-primary" />
                            <div className="flex-1">
                              <div className="font-bold text-sm">Class 1 : Standard Trailer</div>
                              <div className="text-xs text-muted-foreground">
                                H: <span className="font-bold">13.01ft</span> (3.97m) × W: 2.55m × L: 16.5m
                              </div>
                            </div>
                            {activeVehicleType === 'class1_standard' && <Badge variant="secondary" className="text-[10px]">Selected</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Car Option */}
                      <Card 
                        className={cn(
                          "cursor-pointer transition-all hover:bg-muted/50 active:scale-[0.98]",
                          activeVehicleType === 'car' && "border-primary bg-primary/5"
                        )}
                        onClick={() => handleVehicleTypeChange('car')}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Car className="h-5 w-5 text-primary" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">Car</div>
                              <div className="text-xs text-muted-foreground">
                                L: 4.4m × H: 1.5m × W: 1.8m
                              </div>
                            </div>
                            {activeVehicleType === 'car' && <Badge variant="secondary" className="text-[10px]">Selected</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <p className="text-[10px] text-muted-foreground">
                        {activeVehicleType === 'car' 
                          ? "Car mode: Fastest route without truck restrictions."
                          : "Truck mode: Routes avoid low bridges, weight limits and width restrictions."}
                      </p>
                    </div>
                  </CardContent>
                </Card>

              </TabsContent>

              {/* THEME TAB */}
              <TabsContent value="theme" className="p-4 space-y-4 mt-0">
                {/* Theme Mode Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Theme Settings
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Select day, night, or auto theme with color customization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ThemeSelector 
                      showLabels={true}
                      showGrayscale={false}
                      showColorSpectrum={false}
                      showAutoSettings={true}
                      showAutoStatus={true}
                    />
                  </CardContent>
                </Card>

                {/* Color Customization */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Color Spectrum
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Customize theme colors
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ColorSpectrumPicker showPresets={true} />
                  </CardContent>
                </Card>

                {/* Grayscale */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Grayscale Override
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GrayscaleSelector />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TOOLS TAB */}
              <TabsContent value="tools" className="p-4 space-y-4 mt-0">
                {/* Region / Speed Limit Style */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPinned className="h-4 w-4 text-blue-500" />
                      Region & Speed Limit Sign
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Select your region to use local speed limit signs and units
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RegionSelector />
                    <Separator />
                    <MeasurementSelector />
                  </CardContent>
                </Card>

                {/* Tools & Widgets */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Tools & Widgets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        onOpenChange(false);
                        setShowWeather(true);
                      }}
                      data-testid="button-tool-weather"
                    >
                      <Cloud className="h-4 w-4 mr-2" />
                      Weather
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        onOpenChange(false);
                        setShowEntertainment(true);
                      }}
                      data-testid="button-tool-entertainment"
                    >
                      <Music className="h-4 w-4 mr-2" />
                      Entertainment
                    </Button>
                    
                    {/* TEMPORARY: Clear Old Route Button */}
                    <Button
                      variant="outline"
                      className="w-full justify-start border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={handleClearOldRoute}
                      data-testid="button-clear-old-route"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Old Route (Fix Map)
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowVoiceNav(true)}
                      data-testid="button-tool-voice"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Voice Navigation
                    </Button>
                    
                    {/* Fuel Price Comparison */}
                    <Button
                      variant="outline"
                      className="w-full justify-start border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => {
                        onOpenChange(false);
                        setShowFuelPrices(true);
                      }}
                      data-testid="button-tool-fuel-prices"
                    >
                      <Fuel className="h-4 w-4 mr-2" />
                      Fuel Price Comparison
                    </Button>
                    
                    {/* Driver Fatigue Monitor */}
                    <Button
                      variant="outline"
                      className="w-full justify-start border-amber-500 text-amber-600 hover:bg-amber-50"
                      onClick={() => {
                        onOpenChange(false);
                        setShowFatigueMonitor(true);
                      }}
                      data-testid="button-tool-fatigue-monitor"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Driver Fatigue Monitor
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        onOpenChange(false);
                        setShowSettings(true);
                      }}
                      data-testid="button-tool-settings"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      App Settings
                    </Button>
                    
                    {/* Replay Tour Button */}
                    <Button
                      variant="outline"
                      className="w-full justify-start border-blue-500 text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        onOpenChange(false);
                        resetTour();
                      }}
                      data-testid="button-replay-tour"
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Replay App Tour
                    </Button>
                  </CardContent>
                </Card>

                {/* Language Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      🌐 Language / Idioma / Sprache
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Change app and voice navigation language
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LanguageSelector />
                  </CardContent>
                </Card>

                {/* Map Settings Quick Access */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      Map & Traffic
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        onOpenChange(false);
                        setShowSettings(true);
                      }}
                      data-testid="button-map-settings"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Map Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SOCIAL TAB - Social Network */}
              <TabsContent value="social" className="p-4 space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Social Trucking Network
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Connect with drivers, share routes, and build your network (Phase 1 - Coming Soon!)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Social features are currently in development. Soon you'll be able to:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                      <li>Create and manage your driver profile</li>
                      <li>Connect with other professional drivers</li>
                      <li>Share and discover routes from your network</li>
                      <li>Rate and comment on shared routes</li>
                    </ul>
                    <div className="pt-3 border-t">
                      <Badge variant="secondary" className="w-full justify-center py-2">
                        Phase 1: Launching Soon
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* OFFLINE TAB - Offline Map Downloads */}
              <TabsContent value="offline" className="p-4 space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Download className="h-4 w-4 text-green-500" />
                      Offline Maps
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Download map regions for offline navigation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <OfflineDownloadsPanel onClose={() => onOpenChange(false)} />
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
    </div>

      {/* Sub-Modals */}
      {showVehicleSetup && (
        <VehicleProfileSetup
          onClose={() => setShowVehicleSetup(false)}
          onProfileCreated={(profile) => {
            onProfileSelect(profile);
            setShowVehicleSetup(false);
          }}
        />
      )}

      {showWeather && (
        <WeatherWidget
          isOpen={showWeather}
          onClose={() => setShowWeather(false)}
        />
      )}

      {showEntertainment && (
        <EntertainmentPanel
          isOpen={showEntertainment}
          onClose={() => setShowEntertainment(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
          onStartInspection={(vehicleId, operatorId, vehicleReg, operatorName) => {
            setShowSettings(false);
            setShowInspection(true);
          }}
        />
      )}

      {/* Fuel Price Comparison Dialog */}
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
            routePath={currentRoute?.routePath ?? undefined}
            onNavigateToStation={(station) => {
              setShowFuelPrices(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Driver Fatigue Monitor Dialog */}
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

      {/* Pre-Trip Inspection Overlay */}
      {showInspection && selectedVehicle && selectedOperator && (
        <div className="fixed inset-0 z-[300000] bg-background">
          <PreTripInspection
            vehicleRegistration={selectedVehicle.registration}
            operatorName={`${selectedOperator.firstName} ${selectedOperator.lastName}`}
            operatorId={selectedOperatorId!}
            vehicleId={selectedFleetVehicleId!}
            onComplete={() => {
              setShowInspection(false);
              onOpenChange(false); // Close the menu after inspection complete
            }}
            onBack={() => setShowInspection(false)}
          />
        </div>
      )}

      {/* Working Time Warning */}
      {showWorkingTimeWarning && (
        <WorkingTimeWarning onDismiss={dismissWarning} />
      )}
    </>
  );
}

export default ComprehensiveMobileMenu;
