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

export function MeasurementProvider({ children }: { children: React.ReactNode }) {
  const [system, setSystemState] = useState<MeasurementSystem>("imperial");
  const [region, setRegionState] = useState<Region>("uk");

  // Load measurement system and region from localStorage on mount
  useEffect(() => {
    const savedSystem = localStorage.getItem("measurement-system");
    const savedRegion = localStorage.getItem("measurement-region");
    
    if (savedRegion === "uk" || savedRegion === "usa" || savedRegion === "europe") {
      setRegionState(savedRegion);
      // Set default measurement system based on region if not already saved
      if (!savedSystem) {
        if (savedRegion === "uk" || savedRegion === "usa") {
          setSystemState("imperial");
        } else {
          setSystemState("metric");
        }
      }
    }
    
    if (savedSystem === "imperial" || savedSystem === "metric") {
      setSystemState(savedSystem);
    }
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