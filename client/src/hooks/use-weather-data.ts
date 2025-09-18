import { useState, useEffect, useCallback } from "react";

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  icon: string;
  alerts?: string[];
  lastUpdated: Date;
}

interface UseWeatherDataReturn {
  weatherData: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  refreshWeather: () => Promise<void>;
}

// Mock weather data - in a real app this would come from a weather API
const mockWeatherData: WeatherData = {
  location: "Manchester, UK",
  temperature: 12,
  condition: "Partly Cloudy",
  humidity: 68,
  windSpeed: 15,
  visibility: 10,
  icon: "partly-cloudy",
  alerts: ["High winds expected on M62 corridor"],
  lastUpdated: new Date(),
};

export function useWeatherData(): UseWeatherDataReturn {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeatherData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulate occasional network errors
      if (Math.random() < 0.05) {
        throw new Error("Unable to fetch weather data");
      }
      
      // Generate slightly varied mock data
      const updatedWeatherData: WeatherData = {
        ...mockWeatherData,
        temperature: Math.round(Math.random() * 20 + 5), // 5-25°C
        windSpeed: Math.round(Math.random() * 25 + 5), // 5-30 mph
        humidity: Math.round(Math.random() * 40 + 40), // 40-80%
        lastUpdated: new Date(),
      };
      
      setWeatherData(updatedWeatherData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weather data");
      setWeatherData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  // Refresh weather data
  const refreshWeather = useCallback(async (): Promise<void> => {
    await fetchWeatherData();
  }, [fetchWeatherData]);

  return {
    weatherData,
    isLoading,
    error,
    refreshWeather,
  };
}