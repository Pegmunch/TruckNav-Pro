import { createContext, useContext, useState, useEffect } from "react";

export type MeasurementSystem = "imperial" | "metric";
export type Region = "uk" | "usa" | "europe";

interface MeasurementContextType {
  system: MeasurementSystem;
  setSystem: (system: MeasurementSystem) => void;
  region: Region;
  setRegion: (region: Region) => void;
  formatDistance: (distance: number, unit: "miles" | "km" | "yards" | "meters" | "feet") => string;
  formatSpeed: (speed: number, unit: "mph" | "kmh") => string;
  formatHeight: (heightInFeet: number) => string;
  formatWeight: (weightInTonnes: number) => string;
  convertDistance: (distance: number, fromUnit: string, toUnit: string) => number;
  convertSpeed: (speed: number, fromUnit: string, toUnit: string) => number;
}

const MeasurementContext = createContext<MeasurementContextType | undefined>(undefined);

// Map country codes to measurement regions
const getRegionFromCountry = (countryCode: string): Region => {
  // UK region
  if (countryCode === 'GB' || countryCode === 'UK') {
    return 'uk';
  }
  
  // USA region (includes US territories)
  if (countryCode === 'US' || countryCode === 'USA') {
    return 'usa';
  }
  
  // European countries (including Spain, France, Germany, etc.)
  const europeanCountries = [
    'ES', 'DE', 'FR', 'IT', 'NL', 'BE', 'AT', 'CH', 'PL', 'CZ', 
    'PT', 'SE', 'NO', 'DK', 'FI', 'IE', 'GR', 'HU', 'RO', 'BG',
    'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY', 'IS',
    'AD', 'MC', 'SM', 'VA', 'LI', 'RS', 'BA', 'ME', 'MK', 'AL', 'XK'
  ];
  
  if (europeanCountries.includes(countryCode)) {
    return 'europe';
  }
  
  // Default to europe for most other countries (metric system is more common)
  return 'europe';
};

// Detect if user is likely in the UK based on browser settings
const detectUKFromBrowser = (): boolean => {
  try {
    // Check browser language
    const lang = navigator.language || (navigator as any).userLanguage || '';
    if (lang.toLowerCase() === 'en-gb') {
      return true;
    }
    
    // Check timezone (Europe/London is UK)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone === 'Europe/London') {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
};

// Synchronous initialization function - runs before first render
const getInitialState = (): { system: MeasurementSystem; region: Region } => {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { system: 'metric', region: 'europe' };
  }
  
  try {
    const savedCountry = localStorage.getItem("trucknav_country");
    const savedSystem = localStorage.getItem("measurement-system");
    const savedRegion = localStorage.getItem("measurement-region");
    
    // Country is the source of truth for region
    if (savedCountry) {
      const derivedRegion = getRegionFromCountry(savedCountry);
      
      // Determine system based on saved value or derive from region
      let system: MeasurementSystem;
      if (savedSystem === "imperial" || savedSystem === "metric") {
        system = savedSystem;
      } else {
        system = (derivedRegion === "uk" || derivedRegion === "usa") ? "imperial" : "metric";
      }
      
      console.log(`[MEASUREMENT] Sync init: country=${savedCountry} → region=${derivedRegion}, system=${system}`);
      return { system, region: derivedRegion };
    }
    
    // No country saved, use saved region if valid
    if (savedRegion === "uk" || savedRegion === "usa" || savedRegion === "europe") {
      let system: MeasurementSystem;
      if (savedSystem === "imperial" || savedSystem === "metric") {
        system = savedSystem;
      } else {
        system = (savedRegion === "uk" || savedRegion === "usa") ? "imperial" : "metric";
      }
      return { system, region: savedRegion };
    }
    
    // Auto-detect UK from browser settings (language/timezone)
    if (detectUKFromBrowser()) {
      console.log('[MEASUREMENT] Auto-detected UK from browser settings, defaulting to imperial/mph');
      // Save the detection so it persists
      localStorage.setItem("trucknav_country", "GB");
      localStorage.setItem("measurement-region", "uk");
      localStorage.setItem("measurement-system", "imperial");
      return { system: 'imperial', region: 'uk' };
    }
    
    // Default to europe/metric (most common internationally)
    return { system: 'metric', region: 'europe' };
  } catch (e) {
    // localStorage might throw in some environments
    return { system: 'metric', region: 'europe' };
  }
};

// Get initial state synchronously
const initialState = getInitialState();

export function MeasurementProvider({ children }: { children: React.ReactNode }) {
  const [system, setSystemState] = useState<MeasurementSystem>(initialState.system);
  const [region, setRegionState] = useState<Region>(initialState.region);

  // Helper to sync region from country
  const syncRegionFromCountry = (countryCode: string, forceUpdate = false) => {
    const derivedRegion = getRegionFromCountry(countryCode);
    const currentRegion = localStorage.getItem("measurement-region");
    
    // Update if forced or if region doesn't match derived value
    if (forceUpdate || currentRegion !== derivedRegion) {
      setRegionState(derivedRegion);
      localStorage.setItem("measurement-region", derivedRegion);
      
      // Auto-set measurement system based on region
      if (derivedRegion === "uk" || derivedRegion === "usa") {
        setSystemState("imperial");
        localStorage.setItem("measurement-system", "imperial");
      } else {
        setSystemState("metric");
        localStorage.setItem("measurement-system", "metric");
      }
      
      console.log(`[MEASUREMENT] Region synced from country ${countryCode} → ${derivedRegion}`);
    }
  };

  // Sync localStorage on mount if needed (initial state was derived from country)
  // and set up event listeners for country changes
  useEffect(() => {
    const savedCountry = localStorage.getItem("trucknav_country");
    const savedRegion = localStorage.getItem("measurement-region");
    
    // Update localStorage if region doesn't match derived region (fix stale data)
    if (savedCountry) {
      const derivedRegion = getRegionFromCountry(savedCountry);
      if (savedRegion !== derivedRegion) {
        console.log(`[MEASUREMENT] Fixing localStorage: ${savedRegion} → ${derivedRegion}`);
        localStorage.setItem("measurement-region", derivedRegion);
      }
    }
    
    // Listen for country changes from other tabs (StorageEvent)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'trucknav_country' && event.newValue) {
        syncRegionFromCountry(event.newValue, true);
      }
    };
    
    // Listen for country changes within the same tab (CustomEvent)
    const handleCountryChange = (event: CustomEvent<{ countryCode: string }>) => {
      if (event.detail?.countryCode) {
        syncRegionFromCountry(event.detail.countryCode, true);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('country-changed', handleCountryChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('country-changed', handleCountryChange as EventListener);
    };
  }, []);

  // Save to localStorage when system changes
  const setSystem = (newSystem: MeasurementSystem) => {
    setSystemState(newSystem);
    localStorage.setItem("measurement-system", newSystem);
  };

  // Save to localStorage when region changes
  const setRegion = (newRegion: Region) => {
    setRegionState(newRegion);
    localStorage.setItem("measurement-region", newRegion);
    
    // Auto-set measurement system based on region
    if (newRegion === "uk" || newRegion === "usa") {
      setSystem("imperial"); // UK and USA use MPH
    } else {
      setSystem("metric"); // Europe uses KPH
    }
  };

  // Conversion functions
  const convertDistance = (distance: number, fromUnit: string, toUnit: string): number => {
    // Convert everything to meters first, then to target unit
    let meters: number;
    
    switch (fromUnit.toLowerCase()) {
      case "miles":
        meters = distance * 1609.34;
        break;
      case "km":
      case "kilometers":
        meters = distance * 1000;
        break;
      case "yards":
        meters = distance * 0.9144;
        break;
      case "feet":
        meters = distance * 0.3048;
        break;
      case "meters":
        meters = distance;
        break;
      default:
        meters = distance;
    }

    switch (toUnit.toLowerCase()) {
      case "miles":
        return meters / 1609.34;
      case "km":
      case "kilometers":
        return meters / 1000;
      case "yards":
        return meters / 0.9144;
      case "feet":
        return meters / 0.3048;
      case "meters":
        return meters;
      default:
        return meters;
    }
  };

  const convertSpeed = (speed: number, fromUnit: string, toUnit: string): number => {
    if (fromUnit === toUnit) return speed;
    
    if (fromUnit === "mph" && toUnit === "kmh") {
      return speed * 1.60934;
    }
    if (fromUnit === "kmh" && toUnit === "mph") {
      return speed / 1.60934;
    }
    
    return speed;
  };

  // Formatting functions that respect the current measurement system
  const formatDistance = (distance: number, unit: "miles" | "km" | "yards" | "meters" | "feet"): string => {
    if (system === "imperial") {
      // Convert to imperial units
      switch (unit) {
        case "km":
          const miles = convertDistance(distance, "km", "miles");
          return miles < 1 ? `${(miles * 5280).toFixed(0)} ft` : `${miles.toFixed(1)} mi`;
        case "meters":
          const feet = convertDistance(distance, "meters", "feet");
          return feet < 5280 ? `${feet.toFixed(0)} ft` : `${(feet / 5280).toFixed(1)} mi`;
        case "miles":
          return distance < 1 ? `${(distance * 5280).toFixed(0)} ft` : `${distance.toFixed(1)} mi`;
        case "yards":
          return distance < 1760 ? `${distance.toFixed(0)} yd` : `${(distance / 1760).toFixed(1)} mi`;
        case "feet":
          return distance < 5280 ? `${distance.toFixed(0)} ft` : `${(distance / 5280).toFixed(1)} mi`;
        default:
          return `${distance.toFixed(1)} ${unit}`;
      }
    } else {
      // Convert to metric units
      switch (unit) {
        case "miles":
          const km = convertDistance(distance, "miles", "km");
          return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
        case "feet":
          const meters = convertDistance(distance, "feet", "meters");
          return meters < 1000 ? `${meters.toFixed(0)} m` : `${(meters / 1000).toFixed(1)} km`;
        case "yards":
          const metersFromYards = convertDistance(distance, "yards", "meters");
          return metersFromYards < 1000 ? `${metersFromYards.toFixed(0)} m` : `${(metersFromYards / 1000).toFixed(1)} km`;
        case "km":
          return distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(1)} km`;
        case "meters":
          return distance < 1000 ? `${distance.toFixed(0)} m` : `${(distance / 1000).toFixed(1)} km`;
        default:
          return `${distance.toFixed(1)} ${unit}`;
      }
    }
  };

  const formatSpeed = (speed: number, unit: "mph" | "kmh"): string => {
    if (system === "imperial") {
      const mph = unit === "kmh" ? convertSpeed(speed, "kmh", "mph") : speed;
      return `${mph.toFixed(0)} mph`;
    } else {
      const kmh = unit === "mph" ? convertSpeed(speed, "mph", "kmh") : speed;
      return `${kmh.toFixed(0)} km/h`;
    }
  };

  const formatHeight = (heightInFeet: number): string => {
    if (system === "imperial") {
      const wholeFeet = Math.floor(heightInFeet);
      const inches = Math.round((heightInFeet % 1) * 12);
      return `${wholeFeet}'${inches}"`;
    } else {
      const meters = convertDistance(heightInFeet, "feet", "meters");
      return `${meters.toFixed(1)}m`;
    }
  };

  const formatWeight = (weightInTonnes: number): string => {
    if (system === "imperial") {
      const pounds = weightInTonnes * 2204.62; // Convert tonnes to pounds
      if (pounds >= 2000) {
        const tons = pounds / 2000; // US tons
        return `${tons.toFixed(1)} tons`;
      } else {
        return `${pounds.toFixed(0)} lbs`;
      }
    } else {
      return `${weightInTonnes.toFixed(1)}t`;
    }
  };

  const value: MeasurementContextType = {
    system,
    setSystem,
    region,
    setRegion,
    formatDistance,
    formatSpeed,
    formatHeight,
    formatWeight,
    convertDistance,
    convertSpeed,
  };

  return (
    <MeasurementContext.Provider value={value}>
      {children}
    </MeasurementContext.Provider>
  );
}

export function useMeasurement() {
  const context = useContext(MeasurementContext);
  if (context === undefined) {
    throw new Error("useMeasurement must be used within a MeasurementProvider");
  }
  return context;
}