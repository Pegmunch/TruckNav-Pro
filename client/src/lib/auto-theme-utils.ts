import { z } from "zod";

// Configuration schema for auto-theme settings
export const autoThemeConfigSchema = z.object({
  // Time-based settings
  dayStartHour: z.number().min(0).max(23).default(6), // 6 AM
  nightStartHour: z.number().min(0).max(23).default(18), // 6 PM
  useGeolocation: z.boolean().default(false),
  
  // Color temperature settings
  enableColorTemperature: z.boolean().default(true),
  warmTemperatureStrength: z.number().min(0).max(100).default(30), // % warmth during night
  
  // Advanced settings
  enableSeasonalAdjustment: z.boolean().default(false),
  transitionDuration: z.number().min(100).max(5000).default(300), // ms
  updateInterval: z.number().min(30).max(300).default(60), // seconds
  
  // Preview settings
  previewMode: z.boolean().default(false),
  previewTime: z.string().optional(), // ISO time string for preview
});

export type AutoThemeConfig = z.infer<typeof autoThemeConfigSchema>;

// Default configuration
export const defaultAutoThemeConfig: AutoThemeConfig = {
  dayStartHour: 6,
  nightStartHour: 18,
  useGeolocation: false,
  enableColorTemperature: true,
  warmTemperatureStrength: 30,
  enableSeasonalAdjustment: false,
  transitionDuration: 300,
  updateInterval: 60,
  previewMode: false,
};

// Time calculation utilities
export interface TimeInfo {
  hour: number;
  minute: number;
  isDaytime: boolean;
  isNighttime: boolean;
  timeUntilNextSwitch: number; // minutes
  nextSwitchTime: Date;
  currentTheme: "day" | "night";
  source: "time" | "geolocation" | "system" | "preview";
}

// Calculate sunrise and sunset times based on coordinates and date
export function calculateSunriseSunset(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): { sunrise: Date; sunset: Date } {
  // Simplified sunrise/sunset calculation
  // For more accurate results, you might want to use a library like 'suncalc'
  const dayOfYear = getDayOfYear(date);
  const p = Math.asin(0.39795 * Math.cos(0.98563 * (dayOfYear - 173) * Math.PI / 180));
  
  // Calculate solar noon
  const argument = (Math.sin(-0.104719755) - Math.sin(latitude * Math.PI / 180) * Math.sin(p)) /
    (Math.cos(latitude * Math.PI / 180) * Math.cos(p));
  
  // Handle polar day/night cases
  if (argument < -1) {
    // Polar day - sun never sets
    const sunrise = new Date(date);
    sunrise.setHours(0, 0, 0, 0);
    const sunset = new Date(date);
    sunset.setHours(23, 59, 59, 999);
    return { sunrise, sunset };
  } else if (argument > 1) {
    // Polar night - sun never rises
    const sunrise = new Date(date);
    sunrise.setHours(12, 0, 0, 0);
    const sunset = new Date(date);
    sunset.setHours(12, 0, 0, 1);
    return { sunrise, sunset };
  }
  
  const hourAngle = Math.acos(argument);
  const solarNoon = 12 - (longitude / 15);
  
  const sunriseTime = solarNoon - (hourAngle * 12 / Math.PI);
  const sunsetTime = solarNoon + (hourAngle * 12 / Math.PI);
  
  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunriseTime), Math.floor((sunriseTime % 1) * 60), 0, 0);
  
  const sunset = new Date(date);
  sunset.setHours(Math.floor(sunsetTime), Math.floor((sunsetTime % 1) * 60), 0, 0);
  
  return { sunrise, sunset };
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Get current time information based on configuration
export function getCurrentTimeInfo(
  config: AutoThemeConfig,
  coordinates?: { latitude: number; longitude: number }
): TimeInfo {
  const now = config.previewMode && config.previewTime 
    ? new Date(config.previewTime) 
    : new Date();
  
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  let isDaytime: boolean;
  let nextSwitchTime: Date;
  let source: TimeInfo['source'] = "time";
  
  if (config.useGeolocation && coordinates) {
    // Use geolocation-based sunrise/sunset
    const { sunrise, sunset } = calculateSunriseSunset(
      coordinates.latitude,
      coordinates.longitude,
      now
    );
    
    isDaytime = now >= sunrise && now < sunset;
    
    // Calculate next switch time
    if (isDaytime) {
      nextSwitchTime = sunset;
    } else {
      // If it's after sunset, next switch is tomorrow's sunrise
      if (now >= sunset) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const { sunrise: tomorrowSunrise } = calculateSunriseSunset(
          coordinates.latitude,
          coordinates.longitude,
          tomorrow
        );
        nextSwitchTime = tomorrowSunrise;
      } else {
        // Before sunrise today
        nextSwitchTime = sunrise;
      }
    }
    
    source = "geolocation";
  } else {
    // Use time-based detection with configurable thresholds
    const dayStart = config.dayStartHour;
    const nightStart = config.nightStartHour;
    
    // Handle cases where night starts before day (e.g., 18 to 6)
    if (nightStart > dayStart) {
      isDaytime = hour >= dayStart && hour < nightStart;
    } else {
      // Handle overnight periods (e.g., 22 to 6)
      isDaytime = hour >= dayStart || hour < nightStart;
    }
    
    // Calculate next switch time
    nextSwitchTime = new Date(now);
    
    if (isDaytime) {
      // Next switch is to night
      if (hour < nightStart) {
        nextSwitchTime.setHours(nightStart, 0, 0, 0);
      } else {
        // Tomorrow's night start
        nextSwitchTime.setDate(nextSwitchTime.getDate() + 1);
        nextSwitchTime.setHours(nightStart, 0, 0, 0);
      }
    } else {
      // Next switch is to day
      if (hour < dayStart) {
        nextSwitchTime.setHours(dayStart, 0, 0, 0);
      } else {
        // Tomorrow's day start
        nextSwitchTime.setDate(nextSwitchTime.getDate() + 1);
        nextSwitchTime.setHours(dayStart, 0, 0, 0);
      }
    }
    
    source = config.previewMode ? "preview" : "time";
  }
  
  // Apply seasonal adjustments if enabled
  if (config.enableSeasonalAdjustment) {
    isDaytime = applySeasonalAdjustment(isDaytime, now);
  }
  
  const timeUntilNextSwitch = Math.floor((nextSwitchTime.getTime() - now.getTime()) / (1000 * 60));
  
  return {
    hour,
    minute,
    isDaytime,
    isNighttime: !isDaytime,
    timeUntilNextSwitch,
    nextSwitchTime,
    currentTheme: isDaytime ? "day" : "night",
    source,
  };
}

// Apply seasonal adjustments to daylight detection
function applySeasonalAdjustment(isDaytime: boolean, date: Date): boolean {
  // Simplified seasonal adjustment - extends daylight during summer, reduces during winter
  const dayOfYear = getDayOfYear(date);
  const seasonFactor = Math.sin((dayOfYear - 81) * 2 * Math.PI / 365); // 0 at equinoxes, +1 at summer solstice, -1 at winter solstice
  
  // Extend daylight by up to 1 hour during summer, reduce by up to 1 hour during winter
  const hourAdjustment = seasonFactor * 1; // ±1 hour
  
  const now = new Date(date);
  const adjustedTime = new Date(now.getTime() + hourAdjustment * 60 * 60 * 1000);
  
  // Recalculate with adjusted time
  const hour = adjustedTime.getHours();
  return hour >= 6 && hour < 18; // Using default 6-18 for seasonal calculation
}

// Generate color temperature CSS variables based on time and config
export function generateColorTemperatureCSS(
  timeInfo: TimeInfo,
  config: AutoThemeConfig
): Record<string, string> {
  if (!config.enableColorTemperature) {
    return {};
  }
  
  const isNight = timeInfo.isNighttime;
  const warmth = isNight ? config.warmTemperatureStrength / 100 : 0;
  
  // Calculate red/blue adjustments for warmer colors at night
  const redAdjustment = Math.round(warmth * 20); // Increase red by up to 20 points
  const blueReduction = Math.round(warmth * 30); // Reduce blue by up to 30 points
  
  const cssVars: Record<string, string> = {};
  
  if (isNight && warmth > 0) {
    // Apply warm color temperature for night mode
    // These will override the default theme colors temporarily
    const bgHue = 25; // Warmer hue (orange-ish)
    const fgHue = 35; // Slightly warmer text
    
    cssVars['--theme-bg-temp'] = `hsl(${bgHue}, ${Math.round(warmth * 15)}%, ${isNight ? 8 : 98}%)`;
    cssVars['--theme-fg-temp'] = `hsl(${fgHue}, ${Math.round(warmth * 10)}%, ${isNight ? 85 : 15}%)`;
    cssVars['--theme-temp-filter'] = `sepia(${Math.round(warmth * 25)}%) saturate(${100 + Math.round(warmth * 20)}%)`;
  }
  
  return cssVars;
}

// Format time info for display
export function formatTimeInfo(timeInfo: TimeInfo): string {
  const timeStr = `${timeInfo.hour.toString().padStart(2, '0')}:${timeInfo.minute.toString().padStart(2, '0')}`;
  const themeStr = timeInfo.currentTheme === "day" ? "Light" : "Dark";
  const sourceStr = timeInfo.source === "geolocation" ? "GPS" : 
                   timeInfo.source === "preview" ? "Preview" : "Time";
  
  return `${timeStr} (${themeStr} - ${sourceStr})`;
}

// Generate preview times for testing
export function generatePreviewTimes(): Array<{ label: string; time: string; theme: "day" | "night" }> {
  const today = new Date();
  const times = [
    { hour: 6, minute: 0, label: "Dawn (6:00 AM)" },
    { hour: 8, minute: 30, label: "Morning (8:30 AM)" },
    { hour: 12, minute: 0, label: "Noon (12:00 PM)" },
    { hour: 15, minute: 30, label: "Afternoon (3:30 PM)" },
    { hour: 18, minute: 0, label: "Dusk (6:00 PM)" },
    { hour: 20, minute: 30, label: "Evening (8:30 PM)" },
    { hour: 23, minute: 0, label: "Night (11:00 PM)" },
    { hour: 2, minute: 30, label: "Late Night (2:30 AM)" },
  ];
  
  return times.map(({ hour, minute, label }) => {
    const time = new Date(today);
    time.setHours(hour, minute, 0, 0);
    
    return {
      label,
      time: time.toISOString(),
      theme: (hour >= 6 && hour < 18) ? "day" : "night",
    };
  });
}

// Geolocation utilities
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 1000 * 60 * 60, // 1 hour cache
      }
    );
  });
}

// Storage utilities for auto-theme config
const AUTO_THEME_CONFIG_KEY = "auto-theme-config";

export function saveAutoThemeConfig(config: AutoThemeConfig): void {
  try {
    localStorage.setItem(AUTO_THEME_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn("Failed to save auto-theme config:", error);
  }
}

export function loadAutoThemeConfig(): AutoThemeConfig {
  try {
    const stored = localStorage.getItem(AUTO_THEME_CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return autoThemeConfigSchema.parse(parsed);
    }
  } catch (error) {
    console.warn("Failed to load auto-theme config:", error);
  }
  
  return defaultAutoThemeConfig;
}

// Validation utilities
export function validateAutoThemeConfig(config: Partial<AutoThemeConfig>): AutoThemeConfig {
  try {
    return autoThemeConfigSchema.parse(config);
  } catch (error) {
    console.warn("Invalid auto-theme config, using defaults:", error);
    return defaultAutoThemeConfig;
  }
}

// Time zone utilities
export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function formatTimeZone(timeZone: string = getUserTimeZone()): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    });
    
    const parts = formatter.formatToParts(now);
    const timeZoneName = parts.find(part => part.type === "timeZoneName");
    
    return timeZoneName?.value || timeZone;
  } catch {
    return timeZone;
  }
}