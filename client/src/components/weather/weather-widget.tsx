import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  Wind,
  Thermometer,
  Eye,
  Droplets,
  RefreshCw,
  MapPin,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  icon: string;
  alerts?: string[];
}

interface WeatherWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// Mock weather data for trucking-relevant locations
const mockWeatherData: WeatherData = {
  location: "Manchester, UK",
  temperature: 12,
  condition: "Partly Cloudy",
  humidity: 68,
  windSpeed: 15,
  visibility: 10,
  icon: "partly-cloudy",
  alerts: ["High winds expected on M62 corridor"]
};

const getWeatherIcon = (condition: string) => {
  switch (condition.toLowerCase()) {
    case 'sunny':
    case 'clear':
      return Sun;
    case 'cloudy':
    case 'partly cloudy':
      return Cloud;
    case 'rainy':
    case 'rain':
      return CloudRain;
    case 'snowy':
    case 'snow':
      return CloudSnow;
    default:
      return Cloud;
  }
};

export default function WeatherWidget({
  isOpen,
  onClose,
  className
}: WeatherWidgetProps) {
  const { toast } = useToast();
  const [weather, setWeather] = useState<WeatherData>(mockWeatherData);
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setWeather({
        ...mockWeatherData,
        temperature: Math.round(Math.random() * 20 + 5),
        windSpeed: Math.round(Math.random() * 25 + 5),
        humidity: Math.round(Math.random() * 40 + 40),
      });
      setIsLoading(false);
      toast({
        title: "Weather Updated",
        description: "Current conditions refreshed",
      });
    }, 1000);
  };

  const WeatherIcon = getWeatherIcon(weather.condition);

  if (!isOpen) return null;

  return (
    <div className={cn("fixed inset-0 bg-background z-50 flex items-center justify-center p-4", className)}>
      <Card className="w-full max-w-md bg-background shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center">
            <WeatherIcon className="w-5 h-5 mr-2 text-primary" />
            Weather Conditions
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-weather"
          >
            ✕
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location */}
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{weather.location}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="ml-auto"
              data-testid="button-refresh-weather"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          </div>

          {/* Current Conditions */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <WeatherIcon className="w-8 h-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{weather.temperature}°C</div>
                  <div className="text-sm text-muted-foreground">{weather.condition}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Weather Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">{weather.humidity}%</div>
                <div className="text-xs text-muted-foreground">Humidity</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Wind className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">{weather.windSpeed} mph</div>
                <div className="text-xs text-muted-foreground">Wind Speed</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-sm font-medium">{weather.visibility} km</div>
                <div className="text-xs text-muted-foreground">Visibility</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-red-500" />
              <div>
                <div className="text-sm font-medium">Feels like {weather.temperature + 2}°C</div>
                <div className="text-xs text-muted-foreground">Real Feel</div>
              </div>
            </div>
          </div>

          {/* Weather Alerts */}
          {weather.alerts && weather.alerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-600">Driving Alerts</span>
              </div>
              {weather.alerts.map((alert, index) => (
                <Badge key={index} variant="destructive" className="w-full justify-start">
                  {alert}
                </Badge>
              ))}
            </div>
          )}

          {/* Trucking-Specific Info */}
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
              Driving Conditions
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              Good visibility, moderate winds. Safe for HGV operations.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}