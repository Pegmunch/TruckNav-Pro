import { useState, useEffect, useCallback } from "react";
import { useGPS } from "@/contexts/gps-context";

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
  feelsLike?: number;
  pressure?: number;
  cloudCover?: number;
  precipitation?: number;
  uvIndex?: number;
  sunrise?: string;
  sunset?: string;
}

interface UseWeatherDataReturn {
  weatherData: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  refreshWeather: () => Promise<void>;
}

// Weather code to condition mapping for Open-Meteo API
const weatherCodeToCondition = (code: number): { condition: string; icon: string } => {
  if (code === 0) return { condition: "Clear", icon: "clear" };
  if (code === 1) return { condition: "Mainly Clear", icon: "clear" };
  if (code === 2) return { condition: "Partly Cloudy", icon: "partly-cloudy" };
  if (code === 3) return { condition: "Overcast", icon: "cloudy" };
  if (code >= 45 && code <= 48) return { condition: "Foggy", icon: "fog" };
  if (code >= 51 && code <= 55) return { condition: "Drizzle", icon: "drizzle" };
  if (code >= 56 && code <= 57) return { condition: "Freezing Drizzle", icon: "freezing-drizzle" };
  if (code >= 61 && code <= 65) return { condition: "Rain", icon: "rain" };
  if (code >= 66 && code <= 67) return { condition: "Freezing Rain", icon: "freezing-rain" };
  if (code >= 71 && code <= 77) return { condition: "Snow", icon: "snow" };
  if (code >= 80 && code <= 82) return { condition: "Rain Showers", icon: "rain" };
  if (code >= 85 && code <= 86) return { condition: "Snow Showers", icon: "snow" };
  if (code >= 95 && code <= 99) return { condition: "Thunderstorm", icon: "thunderstorm" };
  return { condition: "Unknown", icon: "cloudy" };
};

// Generate driving alerts based on weather conditions
const generateDrivingAlerts = (
  condition: string,
  windSpeed: number,
  visibility: number,
  precipitation: number,
  temperature: number
): string[] => {
  const alerts: string[] = [];
  
  if (windSpeed > 40) {
    alerts.push("High winds - exercise caution on exposed routes");
  } else if (windSpeed > 25) {
    alerts.push("Moderate winds - be aware on bridges and open roads");
  }
  
  if (visibility < 5) {
    alerts.push("Reduced visibility - use headlights and reduce speed");
  }
  
  if (precipitation > 5) {
    alerts.push("Heavy precipitation - increased stopping distances");
  }
  
  if (temperature < 3) {
    alerts.push("Risk of ice - road surfaces may be slippery");
  }
  
  if (condition.toLowerCase().includes("fog")) {
    alerts.push("Foggy conditions - use fog lights and maintain safe distance");
  }
  
  if (condition.toLowerCase().includes("snow")) {
    alerts.push("Snowy conditions - check route is suitable for your vehicle");
  }
  
  if (condition.toLowerCase().includes("thunder")) {
    alerts.push("Thunderstorm activity - consider delaying journey");
  }
  
  return alerts;
};

// Reverse geocode coordinates to location name
const getLocationName = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
      { headers: { 'User-Agent': 'TruckNav-Pro/1.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
      const country = data.address?.country;
      if (city && country) {
        return `${city}, ${country}`;
      }
      return city || country || "Current Location";
    }
  } catch (error) {
    console.warn('[Weather] Failed to reverse geocode:', error);
  }
  return "Current Location";
};

export function useWeatherData(): UseWeatherDataReturn {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gps = useGPS();

  const fetchWeatherData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get coordinates from GPS or use default (London)
      let lat = 51.5074;
      let lng = -0.1278;
      
      if (gps?.position) {
        lat = gps.position.latitude;
        lng = gps.position.longitude;
      }
      
      // Fetch weather from Open-Meteo (free, no API key required)
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=sunrise,sunset,uv_index_max&timezone=auto`
      );
      
      if (!weatherResponse.ok) {
        throw new Error("Failed to fetch weather data from API");
      }
      
      const data = await weatherResponse.json();
      
      // Defensive checks for API response structure
      if (!data || !data.current) {
        throw new Error("Invalid weather API response: missing current data");
      }
      
      const current = data.current;
      const daily = data.daily || {};
      
      // Validate required current weather fields
      if (typeof current.temperature_2m !== 'number' || typeof current.weather_code !== 'number') {
        throw new Error("Invalid weather API response: missing temperature or weather code");
      }
      
      // Get weather condition from code
      const { condition, icon } = weatherCodeToCondition(current.weather_code);
      
      // Get location name
      const locationName = await getLocationName(lat, lng);
      
      // Calculate visibility estimate based on precipitation and cloud cover
      // Open-Meteo doesn't provide visibility directly
      let visibility = 10; // Default good visibility in km
      if (current.precipitation > 0) {
        visibility = Math.max(2, 10 - current.precipitation * 2);
      }
      if (condition.toLowerCase().includes("fog")) {
        visibility = Math.min(visibility, 1);
      }
      
      // Generate driving alerts
      const alerts = generateDrivingAlerts(
        condition,
        current.wind_speed_10m,
        visibility,
        current.precipitation,
        current.temperature_2m
      );
      
      // Safe numeric extraction with fallbacks
      const safeRound = (val: unknown, fallback: number): number => 
        typeof val === 'number' && !isNaN(val) ? Math.round(val) : fallback;
      
      const updatedWeatherData: WeatherData = {
        location: locationName,
        temperature: Math.round(current.temperature_2m),
        condition,
        humidity: safeRound(current.relative_humidity_2m, 50),
        windSpeed: safeRound(current.wind_speed_10m, 0),
        visibility: Math.round(visibility),
        icon,
        alerts: alerts.length > 0 ? alerts : undefined,
        lastUpdated: new Date(),
        feelsLike: safeRound(current.apparent_temperature, current.temperature_2m),
        pressure: safeRound(current.pressure_msl, 1013),
        cloudCover: safeRound(current.cloud_cover, 0),
        precipitation: typeof current.precipitation === 'number' ? current.precipitation : 0,
        uvIndex: daily.uv_index_max?.[0],
        sunrise: daily.sunrise?.[0],
        sunset: daily.sunset?.[0],
      };
      
      setWeatherData(updatedWeatherData);
      console.log('[Weather] Real-time weather updated:', updatedWeatherData.location, updatedWeatherData.condition);
    } catch (err) {
      console.error('[Weather] API error:', err);
      setError(err instanceof Error ? err.message : "Failed to fetch weather data");
      setWeatherData(null);
    } finally {
      setIsLoading(false);
    }
  }, [gps?.position]);

  // Initial data fetch and refresh every 10 minutes
  useEffect(() => {
    fetchWeatherData();
    
    const interval = setInterval(() => {
      fetchWeatherData();
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(interval);
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
