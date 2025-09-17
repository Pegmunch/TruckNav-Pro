import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "day" | "night" | "auto";
export type EffectiveTheme = "day" | "night";

interface ThemeContextType {
  currentTheme: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: ThemeMode) => void;
  isAutoMode: boolean;
  grayL: number | null;
  setGrayL: (grayL: number | null) => void;
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

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
  grayStorageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "auto",
  storageKey = "theme-mode",
  grayStorageKey = "theme-grayL",
}: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    // Prevent initial theme flicker by checking localStorage first
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey) as ThemeMode | null;
        if (stored && ["day", "night", "auto"].includes(stored)) {
          return stored;
        }
      } catch (error) {
        console.warn("Failed to load theme from localStorage:", error);
      }
    }
    return defaultTheme;
  });
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>("day");
  const [grayL, setGrayLState] = useState<number | null>(() => {
    // Load grayscale setting from localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(grayStorageKey);
        if (stored === null || stored === "null") {
          return null;
        }
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          return parsed;
        }
      } catch (error) {
        console.warn("Failed to load grayscale setting from localStorage:", error);
      }
    }
    return null;
  });

  // Check if current time is between 6 PM (18:00) and 6 AM (06:00)
  const isNightTime = useCallback((): boolean => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 18 || hour < 6;
  }, []);

  // Get system preference
  const getSystemPreference = useCallback((): EffectiveTheme => {
    if (typeof window === "undefined") return "day";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
  }, []);

  // Calculate effective theme based on current mode
  const calculateEffectiveTheme = useCallback((mode: ThemeMode): EffectiveTheme => {
    switch (mode) {
      case "day":
        return "day";
      case "night":
        return "night";
      case "auto":
        // For auto mode, check time first, then fall back to system preference
        if (isNightTime()) {
          return "night";
        }
        return getSystemPreference();
      default:
        return "day";
    }
  }, [isNightTime, getSystemPreference]);

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
  
  // Apply theme to DOM
  const applyTheme = useCallback((theme: EffectiveTheme, grayValue?: number | null) => {
    if (typeof document === "undefined") return;
    
    const root = document.documentElement;
    const isDark = theme === "night";
    
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // Apply grayscale overrides if specified
    const currentGrayL = grayValue !== undefined ? grayValue : grayL;
    applyGrayscaleOverrides(currentGrayL, isDark);
  }, [grayL, applyGrayscaleOverrides]);

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

  // Set theme and persist to localStorage
  const setTheme = useCallback((theme: ThemeMode) => {
    setCurrentTheme(theme);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, theme);
    }
  }, [storageKey]);
  
  // Apply grayscale changes when grayL value changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = effectiveTheme === "night";
      applyGrayscaleOverrides(grayL, isDark);
    }
  }, [grayL, effectiveTheme, applyGrayscaleOverrides]);

  // Note: Theme initialization moved to useState initializer to prevent flicker

  // Update effective theme when current theme changes
  useEffect(() => {
    updateEffectiveTheme();
  }, [updateEffectiveTheme]);

  // Set up listeners for auto mode
  useEffect(() => {
    let timeInterval: ReturnType<typeof setInterval> | null = null;
    let mediaQueryList: MediaQueryList | null = null;
    let handleSystemChange: (() => void) | null = null;

    if (currentTheme === "auto") {
      // Update every minute to check for time changes (6 PM to 6 AM transitions)
      timeInterval = setInterval(() => {
        updateEffectiveTheme();
      }, 60000); // 60 seconds

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
  }, [currentTheme, updateEffectiveTheme]);

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