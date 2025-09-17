import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "day" | "night" | "auto";
export type EffectiveTheme = "day" | "night";

interface ThemeContextType {
  currentTheme: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: ThemeMode) => void;
  isAutoMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "auto",
  storageKey = "theme-mode",
}: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(defaultTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>("day");

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

  // Apply theme to DOM
  const applyTheme = useCallback((theme: EffectiveTheme) => {
    if (typeof document === "undefined") return;
    
    const root = document.documentElement;
    if (theme === "night") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  // Update effective theme and apply to DOM
  const updateEffectiveTheme = useCallback(() => {
    const newEffectiveTheme = calculateEffectiveTheme(currentTheme);
    setEffectiveTheme(newEffectiveTheme);
    applyTheme(newEffectiveTheme);
  }, [currentTheme, calculateEffectiveTheme, applyTheme]);

  // Set theme and persist to localStorage
  const setTheme = useCallback((theme: ThemeMode) => {
    setCurrentTheme(theme);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, theme);
    }
  }, [storageKey]);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(storageKey) as ThemeMode | null;
      if (stored && ["day", "night", "auto"].includes(stored)) {
        setCurrentTheme(stored);
      }
    } catch (error) {
      console.warn("Failed to load theme from localStorage:", error);
    }
  }, [storageKey]);

  // Update effective theme when current theme changes
  useEffect(() => {
    updateEffectiveTheme();
  }, [updateEffectiveTheme]);

  // Set up listeners for auto mode
  useEffect(() => {
    let timeInterval: NodeJS.Timeout | null = null;
    let mediaQueryList: MediaQueryList | null = null;

    if (currentTheme === "auto") {
      // Update every minute to check for time changes (6 PM to 6 AM transitions)
      timeInterval = setInterval(() => {
        updateEffectiveTheme();
      }, 60000); // 60 seconds

      // Listen for system preference changes
      if (typeof window !== "undefined") {
        mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
        const handleSystemChange = () => {
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

    // Cleanup
    return () => {
      if (timeInterval) {
        clearInterval(timeInterval);
      }
      if (mediaQueryList) {
        const handleSystemChange = () => {
          updateEffectiveTheme();
        };
        
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