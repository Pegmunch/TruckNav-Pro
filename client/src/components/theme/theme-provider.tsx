import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { 
  AutoThemeConfig, 
  loadAutoThemeConfig, 
  saveAutoThemeConfig,
  getCurrentTimeInfo,
  getCurrentPosition,
  generateColorTemperatureCSS,
  TimeInfo
} from "@/lib/auto-theme-utils";

export type ThemeMode = "day" | "night" | "auto";
export type EffectiveTheme = "day" | "night";

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

interface ThemeContextType {
  currentTheme: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: ThemeMode) => void;
  isAutoMode: boolean;
  grayL: number | null;
  setGrayL: (grayL: number | null) => void;
  // HSL color customization
  customHSLColor: HSLColor | null;
  setCustomHSLColor: (color: HSLColor | null) => void;
  // Enhanced auto-theme properties
  autoThemeConfig: AutoThemeConfig;
  setAutoThemeConfig: (config: AutoThemeConfig) => void;
  timeInfo: TimeInfo | null;
  coordinates: { latitude: number; longitude: number } | null;
  requestLocation: () => Promise<void>;
  isLocationLoading: boolean;
}

// WCAG contrast calculation utilities
const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const getContrastRatio = (l1: number, l2: number): number => {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

// Generate contrast-safe foreground color for given background
const getContrastSafeForeground = (bgL: number, isDark: boolean): string => {
  const bgLuminance = getLuminance(bgL * 2.55, bgL * 2.55, bgL * 2.55);
  const whiteLuminance = getLuminance(255, 255, 255);
  const blackLuminance = getLuminance(0, 0, 0);
  
  const contrastWithWhite = getContrastRatio(bgLuminance, whiteLuminance);
  const contrastWithBlack = getContrastRatio(bgLuminance, blackLuminance);
  
  // For accessibility, require 4.5:1 contrast ratio for normal text
  const requiredContrast = 4.5;
  
  if (contrastWithWhite >= requiredContrast && contrastWithBlack >= requiredContrast) {
    // Both work, choose based on theme preference
    return isDark ? 'hsl(0, 0%, 85%)' : 'hsl(220, 90%, 8%)';
  } else if (contrastWithWhite >= requiredContrast) {
    return 'hsl(0, 0%, 100%)';
  } else if (contrastWithBlack >= requiredContrast) {
    return 'hsl(0, 0%, 0%)';
  } else {
    // Fallback to theme-appropriate color if neither meets contrast
    return isDark ? 'hsl(0, 0%, 85%)' : 'hsl(220, 90%, 8%)';
  }
};

// Generate muted foreground with reduced contrast requirement (3:1)
const getMutedForeground = (bgL: number, isDark: boolean): string => {
  const bgLuminance = getLuminance(bgL * 2.55, bgL * 2.55, bgL * 2.55);
  const requiredContrast = 3.0; // Reduced requirement for muted text
  
  // Try different lightness values to find one that meets contrast requirement
  const testValues = isDark 
    ? [65, 70, 75, 80, 85] // Light grays for dark backgrounds
    : [35, 30, 25, 20, 15]; // Dark grays for light backgrounds
  
  for (const lightness of testValues) {
    const testLuminance = getLuminance(lightness * 2.55, lightness * 2.55, lightness * 2.55);
    const contrast = getContrastRatio(bgLuminance, testLuminance);
    
    if (contrast >= requiredContrast) {
      return `hsl(0, 0%, ${lightness}%)`;
    }
  }
  
  // Fallback to theme-appropriate muted color
  return isDark ? 'hsl(15, 15%, 65%)' : 'hsl(220, 25%, 35%)';
};

// HSL Color conversion utilities
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
};

// Helper function to calculate contrast ratio between two HSL colors
const getHSLContrastRatio = (hsl1: HSLColor, hsl2: HSLColor): number => {
  const [r1, g1, b1] = hslToRgb(hsl1.h, hsl1.s, hsl1.l);
  const [r2, g2, b2] = hslToRgb(hsl2.h, hsl2.s, hsl2.l);
  
  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// Helper function to adjust HSL color until it meets contrast requirements
const adjustHSLForContrast = (
  colorHSL: HSLColor, 
  backgroundHSL: HSLColor, 
  minContrastRatio: number,
  isDark: boolean
): HSLColor => {
  let { h, s, l } = colorHSL;
  let iterations = 0;
  const maxIterations = 50; // Prevent infinite loops
  
  while (iterations < maxIterations) {
    const currentHSL = { h, s, l };
    const currentContrast = getHSLContrastRatio(currentHSL, backgroundHSL);
    
    if (currentContrast >= minContrastRatio) {
      return currentHSL;
    }
    
    // Adjust lightness to improve contrast
    if (isDark) {
      // For dark themes, make text lighter
      l = Math.min(100, l + 2);
      // If we've maxed out lightness, reduce saturation slightly
      if (l >= 98) {
        s = Math.max(0, s - 3);
      }
    } else {
      // For light themes, make text darker
      l = Math.max(0, l - 2);
      // If we've minimized lightness, reduce saturation slightly
      if (l <= 2) {
        s = Math.max(0, s - 3);
      }
    }
    
    iterations++;
  }
  
  // If we couldn't achieve the target contrast, return high-contrast fallback
  return isDark 
    ? { h, s: Math.max(s, 50), l: 90 } // Light text for dark backgrounds
    : { h, s: Math.max(s, 50), l: 10 }; // Dark text for light backgrounds
};

// Generate HSL-based color variations with WCAG contrast enforcement
const generateHSLColorVariations = (baseColor: HSLColor, isDark: boolean) => {
  const { h, s, l } = baseColor;
  
  // Define background colors for contrast calculations
  const backgroundHSL: HSLColor = isDark 
    ? { h: 220, s: 25, l: 10 }  // Dark background
    : { h: 220, s: 10, l: 98 }; // Light background
  
  // Calculate initial variations based on base color and theme mode
  const variations: Record<string, string> = {};
  
  if (isDark) {
    // Dark theme variations - ensure sufficient contrast
    const primaryHSL = { h, s: Math.max(s - 10, 30), l: Math.max(l - 5, 55) };
    const primaryForegroundHSL = adjustHSLForContrast(
      { h, s: Math.min(s + 15, 100), l: Math.max(l - 45, 8) },
      primaryHSL,
      4.5, // WCAG AA normal text requirement
      !isDark // Invert for foreground
    );
    
    const secondaryHSL = { h: (h + 30) % 360, s: Math.max(s - 20, 50), l: Math.max(l - 10, 45) };
    const secondaryForegroundHSL = adjustHSLForContrast(
      { h, s: Math.min(s + 10, 100), l: Math.max(l - 50, 5) },
      secondaryHSL,
      4.5,
      !isDark
    );
    
    const accentHSL = { h: (h + 60) % 360, s: Math.max(s - 15, 40), l: Math.max(l - 5, 50) };
    const accentForegroundHSL = adjustHSLForContrast(
      { h, s: Math.min(s + 5, 100), l: Math.max(l - 45, 8) },
      accentHSL,
      4.5,
      !isDark
    );
    
    variations['--primary'] = `hsl(${primaryHSL.h}, ${primaryHSL.s}%, ${primaryHSL.l}%)`;
    variations['--primary-foreground'] = `hsl(${primaryForegroundHSL.h}, ${primaryForegroundHSL.s}%, ${primaryForegroundHSL.l}%)`;
    variations['--secondary'] = `hsl(${secondaryHSL.h}, ${secondaryHSL.s}%, ${secondaryHSL.l}%)`;
    variations['--secondary-foreground'] = `hsl(${secondaryForegroundHSL.h}, ${secondaryForegroundHSL.s}%, ${secondaryForegroundHSL.l}%)`;
    variations['--accent'] = `hsl(${accentHSL.h}, ${accentHSL.s}%, ${accentHSL.l}%)`;
    variations['--accent-foreground'] = `hsl(${accentForegroundHSL.h}, ${accentForegroundHSL.s}%, ${accentForegroundHSL.l}%)`;
  } else {
    // Light theme variations - ensure sufficient contrast
    const primaryHSL = { h, s: Math.min(s + 10, 100), l: Math.max(l - 10, 35) };
    const primaryForegroundHSL = adjustHSLForContrast(
      { h, s: Math.max(s - 5, 0), l: Math.min(l + 40, 100) },
      primaryHSL,
      4.5,
      isDark
    );
    
    const secondaryHSL = { h: (h + 30) % 360, s: Math.min(s + 20, 100), l: Math.min(l + 15, 85) };
    const secondaryForegroundHSL = adjustHSLForContrast(
      { h, s: Math.min(s + 15, 100), l: Math.max(l - 25, 10) },
      secondaryHSL,
      4.5,
      isDark
    );
    
    const accentHSL = { h: (h + 60) % 360, s: Math.min(s + 5, 100), l: Math.max(l - 5, 30) };
    const accentForegroundHSL = adjustHSLForContrast(
      { h, s: Math.max(s - 10, 0), l: Math.min(l + 50, 100) },
      accentHSL,
      4.5,
      isDark
    );
    
    variations['--primary'] = `hsl(${primaryHSL.h}, ${primaryHSL.s}%, ${primaryHSL.l}%)`;
    variations['--primary-foreground'] = `hsl(${primaryForegroundHSL.h}, ${primaryForegroundHSL.s}%, ${primaryForegroundHSL.l}%)`;
    variations['--secondary'] = `hsl(${secondaryHSL.h}, ${secondaryHSL.s}%, ${secondaryHSL.l}%)`;
    variations['--secondary-foreground'] = `hsl(${secondaryForegroundHSL.h}, ${secondaryForegroundHSL.s}%, ${secondaryForegroundHSL.l}%)`;
    variations['--accent'] = `hsl(${accentHSL.h}, ${accentHSL.s}%, ${accentHSL.l}%)`;
    variations['--accent-foreground'] = `hsl(${accentForegroundHSL.h}, ${accentForegroundHSL.s}%, ${accentForegroundHSL.l}%)`;
  }
  
  return variations;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
  grayStorageKey?: string;
  hslColorStorageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "day",
  storageKey = "theme-mode",
  grayStorageKey = "theme-grayL",
  hslColorStorageKey = "theme-hslColor",
}: ThemeProviderProps) {
  // Initialize theme from localStorage or use default
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return defaultTheme;
    try {
      const stored = localStorage.getItem(storageKey);
      return (stored && ["day", "night", "auto"].includes(stored)) ? stored as ThemeMode : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });
  
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>("day");
  
  // Initialize grayscale from localStorage
  const [grayL, setGrayLState] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(grayStorageKey);
      if (stored === null || stored === "null") return null;
      const parsed = parseFloat(stored);
      return isNaN(parsed) ? null : parsed;
    } catch {
      return null;
    }
  });
  // HSL color customization state
  const [customHSLColor, setCustomHSLColorState] = useState<HSLColor | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(hslColorStorageKey);
      return stored && stored !== "null" ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [autoThemeConfig, setAutoThemeConfigState] = useState<AutoThemeConfig>(() => loadAutoThemeConfig());
  const [timeInfo, setTimeInfo] = useState<TimeInfo | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  // Request location for geolocation-based themes
  const requestLocation = useCallback(async () => {
    setIsLocationLoading(true);
    try {
      const position = await getCurrentPosition();
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCoordinates(coords);
    } catch (error) {
      console.warn("Failed to get location:", error);
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  // Set auto-theme config and save to storage
  const setAutoThemeConfig = useCallback((config: AutoThemeConfig) => {
    setAutoThemeConfigState(config);
    saveAutoThemeConfig(config);
  }, []);

  // Calculate effective theme based on mode and conditions
  const calculateEffectiveTheme = useCallback((mode: ThemeMode): EffectiveTheme => {
    if (mode === "day") {
      return "day";
    } else if (mode === "night") {
      return "night";
    } else {
      // Auto mode - determine based on time and system preference
      let result: EffectiveTheme = "day";
      
      // Use time-based logic with geolocation if enabled
      const timeInfo = getCurrentTimeInfo(autoThemeConfig, coordinates || undefined);
      setTimeInfo(timeInfo);
      
      // Use the time info to determine theme
      result = timeInfo.currentTheme as EffectiveTheme;
      
      // If geolocation is not available, fall back to system preference
      if (!autoThemeConfig.useGeolocation && !coordinates) {
        const systemPreference = getSystemPreference();
        
        // Combine time-based and system preference
        // If it's daytime but user prefers dark mode, respect system preference
        if (timeInfo.isDaytime && systemPreference === "night") {
          result = "night";
        } else if (timeInfo.isNighttime && systemPreference === "day") {
          result = "day";  
        }
      }
      
      return result;
    }
  }, [autoThemeConfig, coordinates]);

  // Legacy compatibility methods (for existing components)
  const isNightTime = useCallback((): boolean => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= autoThemeConfig.nightStartHour || hour < autoThemeConfig.dayStartHour;
  }, [autoThemeConfig]);

  const getSystemPreference = useCallback((): EffectiveTheme => {
    if (typeof window === "undefined") return "day";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
  }, []);

  // Apply grayscale CSS overrides to document root
  const applyGrayscaleOverrides = useCallback((grayValue: number | null, isDark: boolean) => {
    if (typeof document === "undefined") return;
    
    const root = document.documentElement;
    const style = root.style;
    
    if (grayValue === null) {
      // Remove all grayscale overrides, fall back to default theme
      const overrideProps = [
        '--background', '--foreground', '--card', '--card-foreground',
        '--popover', '--popover-foreground', '--muted', '--muted-foreground',
        '--border', '--input', '--sidebar', '--sidebar-foreground',
        '--sidebar-accent', '--sidebar-accent-foreground', '--sidebar-border'
      ];
      
      overrideProps.forEach(prop => {
        style.removeProperty(prop);
      });
    } else {
      // Apply grayscale overrides based on grayValue
      const backgroundL = grayValue;
      const foreground = getContrastSafeForeground(backgroundL, isDark);
      const mutedForeground = getMutedForeground(backgroundL, isDark);
      
      // Calculate complementary values for different surfaces
      const cardL = isDark 
        ? Math.min(100, backgroundL + 4) 
        : Math.max(0, backgroundL - 4);
      const mutedL = isDark 
        ? Math.min(100, backgroundL + 8) 
        : Math.max(0, backgroundL - 10);
      const borderL = isDark 
        ? Math.min(100, backgroundL + 12) 
        : Math.max(0, backgroundL - 15);
      const inputL = isDark 
        ? Math.min(100, backgroundL + 6) 
        : Math.max(0, backgroundL - 6);
      
      // Apply neutral color overrides only
      style.setProperty('--background', `hsl(0, 0%, ${backgroundL}%)`);
      style.setProperty('--foreground', foreground);
      style.setProperty('--card', `hsl(0, 0%, ${cardL}%)`);
      style.setProperty('--card-foreground', foreground);
      style.setProperty('--popover', `hsl(0, 0%, ${cardL}%)`);
      style.setProperty('--popover-foreground', foreground);
      style.setProperty('--muted', `hsl(0, 0%, ${mutedL}%)`);
      style.setProperty('--muted-foreground', mutedForeground);
      style.setProperty('--border', `hsl(0, 0%, ${borderL}%)`);
      style.setProperty('--input', `hsl(0, 0%, ${inputL}%)`);
      
      // Sidebar overrides
      style.setProperty('--sidebar', `hsl(0, 0%, ${backgroundL}%)`);
      style.setProperty('--sidebar-foreground', foreground);
      style.setProperty('--sidebar-accent', `hsl(0, 0%, ${mutedL}%)`);
      style.setProperty('--sidebar-accent-foreground', foreground);
      style.setProperty('--sidebar-border', `hsl(0, 0%, ${borderL}%)`);
    }
  }, []);
  
  // Apply theme to DOM with enhanced color temperature support
  const applyTheme = useCallback((theme: EffectiveTheme, grayValue?: number | null) => {
    if (typeof document === "undefined") return;
    
    const root = document.documentElement;
    const style = root.style;
    const isDark = theme === "night";
    
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // Apply grayscale overrides if specified
    const currentGrayL = grayValue !== undefined ? grayValue : grayL;
    applyGrayscaleOverrides(currentGrayL, isDark);
    
    // Apply HSL color overrides if specified
    applyHSLColorOverrides(customHSLColor, isDark);
    
    // Apply color temperature adjustments if enabled and timeInfo is available
    if (autoThemeConfig.enableColorTemperature && timeInfo) {
      const colorTempCSS = generateColorTemperatureCSS(timeInfo, autoThemeConfig);
      
      // Apply color temperature CSS variables
      Object.entries(colorTempCSS).forEach(([property, value]) => {
        style.setProperty(property, value);
      });
    } else {
      // Remove color temperature overrides
      const tempProps = ['--theme-bg-temp', '--theme-fg-temp', '--theme-temp-filter'];
      tempProps.forEach(prop => {
        style.removeProperty(prop);
      });
    }
  }, [grayL, applyGrayscaleOverrides, autoThemeConfig, timeInfo, customHSLColor]);

  // Apply HSL color overrides to document root with proper scoping
  const applyHSLColorOverrides = useCallback((hslColor: HSLColor | null, isDark: boolean) => {
    if (typeof document === "undefined") return;
    
    const root = document.documentElement;
    
    // Find or create style element for custom color variables
    let colorStyleElement = document.getElementById('custom-color-variables') as HTMLStyleElement;
    if (!colorStyleElement) {
      colorStyleElement = document.createElement('style');
      colorStyleElement.id = 'custom-color-variables';
      document.head.appendChild(colorStyleElement);
    }
    
    if (hslColor === null) {
      // Remove HSL color overrides by clearing the style element
      colorStyleElement.textContent = '';
    } else {
      // Generate color variations for both light and dark themes
      const lightVariations = generateHSLColorVariations(hslColor, false);
      const darkVariations = generateHSLColorVariations(hslColor, true);
      
      // Create CSS rules for both :root and .dark scopes
      const lightCSS = Object.entries(lightVariations)
        .map(([property, value]) => `  ${property}: ${value};`)
        .join('\n');
      
      const darkCSS = Object.entries(darkVariations)
        .map(([property, value]) => `  ${property}: ${value};`)
        .join('\n');
      
      // Apply styles with proper scoping
      colorStyleElement.textContent = `
:root {
${lightCSS}
}

.dark {
${darkCSS}
}`;
    }
  }, []);

  // Update effective theme and apply to DOM
  const updateEffectiveTheme = useCallback(() => {
    const newEffectiveTheme = calculateEffectiveTheme(currentTheme);
    setEffectiveTheme(newEffectiveTheme);
    applyTheme(newEffectiveTheme);
  }, [currentTheme, calculateEffectiveTheme, applyTheme]);
  
  // Set grayscale value and persist to localStorage
  const setGrayL = useCallback((grayValue: number | null) => {
    setGrayLState(grayValue);
    
    if (typeof window !== "undefined") {
      try {
        if (grayValue === null) {
          localStorage.setItem(grayStorageKey, "null");
        } else {
          localStorage.setItem(grayStorageKey, grayValue.toString());
        }
      } catch (error) {
        console.warn("Failed to save grayscale setting to localStorage:", error);
      }
    }
  }, [grayStorageKey]);

  // Set HSL color and persist to localStorage
  const setCustomHSLColor = useCallback((hslColor: HSLColor | null) => {
    setCustomHSLColorState(hslColor);
    
    if (typeof window !== "undefined") {
      try {
        if (hslColor === null) {
          localStorage.setItem(hslColorStorageKey, "null");
        } else {
          localStorage.setItem(hslColorStorageKey, JSON.stringify(hslColor));
        }
      } catch (error) {
        console.warn("Failed to save HSL color setting to localStorage:", error);
      }
    }
  }, [hslColorStorageKey]);

  // Set theme and persist to localStorage
  const setTheme = useCallback((theme: ThemeMode) => {
    setCurrentTheme(theme);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, theme);
      } catch (error) {
        console.warn("Failed to save theme to localStorage:", error);
      }
    }
  }, [storageKey]);
  
  // Apply grayscale changes when grayL value changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = effectiveTheme === "night";
      applyGrayscaleOverrides(grayL, isDark);
    }
  }, [grayL, effectiveTheme, applyGrayscaleOverrides]);

  // Apply HSL color changes when customHSLColor value changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = effectiveTheme === "night";
      applyHSLColorOverrides(customHSLColor, isDark);
    }
  }, [customHSLColor, effectiveTheme, applyHSLColorOverrides]);

  // Note: Theme initialization moved to useState initializer to prevent flicker

  // Update effective theme when current theme changes
  useEffect(() => {
    updateEffectiveTheme();
  }, [updateEffectiveTheme]);

  // Set up enhanced listeners for auto mode with configurable intervals
  useEffect(() => {
    let timeInterval: ReturnType<typeof setInterval> | null = null;
    let mediaQueryList: MediaQueryList | null = null;
    let handleSystemChange: (() => void) | null = null;

    if (currentTheme === "auto") {
      // Use configurable update interval from auto-theme config
      const intervalMs = autoThemeConfig.updateInterval * 1000; // Convert seconds to milliseconds
      
      timeInterval = setInterval(() => {
        updateEffectiveTheme();
      }, intervalMs);

      // Listen for system preference changes
      if (typeof window !== "undefined") {
        mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
        handleSystemChange = () => {
          updateEffectiveTheme();
        };
        
        // Use the modern addEventListener if available, fallback to deprecated addListener
        if (mediaQueryList.addEventListener) {
          mediaQueryList.addEventListener("change", handleSystemChange);
        } else {
          // @ts-ignore - fallback for older browsers
          mediaQueryList.addListener(handleSystemChange);
        }
      }
    }

    // Cleanup - use the same handleSystemChange reference
    return () => {
      if (timeInterval) {
        clearInterval(timeInterval);
      }
      if (mediaQueryList && handleSystemChange) {
        if (mediaQueryList.removeEventListener) {
          mediaQueryList.removeEventListener("change", handleSystemChange);
        } else {
          // @ts-ignore - fallback for older browsers
          mediaQueryList.removeListener(handleSystemChange);
        }
      }
    };
  }, [currentTheme, updateEffectiveTheme, autoThemeConfig.updateInterval]);

  // Listen for visibility changes to update theme when tab becomes active
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (!document.hidden && currentTheme === "auto") {
        updateEffectiveTheme();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentTheme, updateEffectiveTheme]);

  const value: ThemeContextType = {
    currentTheme,
    effectiveTheme,
    setTheme,
    isAutoMode: currentTheme === "auto",
    grayL,
    setGrayL,
    // HSL color customization
    customHSLColor,
    setCustomHSLColor,
    // Enhanced auto-theme values
    autoThemeConfig,
    setAutoThemeConfig,
    timeInfo,
    coordinates,
    requestLocation,
    isLocationLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme context
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
}