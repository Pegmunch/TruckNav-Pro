import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "./theme-provider";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeTest() {
  const { currentTheme, effectiveTheme, setTheme, isAutoMode } = useTheme();

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case "day":
        return <Sun className="w-4 h-4" />;
      case "night":
        return <Moon className="w-4 h-4" />;
      case "auto":
        return <Monitor className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString();
  };

  const isNightTime = () => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  };

  return (
    <Card className="w-full max-w-md" data-testid="theme-test-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getThemeIcon(currentTheme)}
          Theme System Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <strong>Current Mode:</strong>
            <Badge variant="outline" className="ml-2" data-testid="current-theme">
              {currentTheme}
            </Badge>
          </div>
          <div>
            <strong>Effective Theme:</strong>
            <Badge variant={effectiveTheme === "night" ? "destructive" : "default"} className="ml-2" data-testid="effective-theme">
              {effectiveTheme}
            </Badge>
          </div>
          <div className="col-span-2">
            <strong>Auto Mode:</strong>
            <Badge variant={isAutoMode ? "secondary" : "outline"} className="ml-2" data-testid="auto-mode-status">
              {isAutoMode ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="col-span-2">
            <strong>Current Time:</strong>
            <span className="ml-2 font-mono" data-testid="current-time">{getCurrentTime()}</span>
          </div>
          <div className="col-span-2">
            <strong>Night Time:</strong>
            <Badge variant={isNightTime() ? "destructive" : "default"} className="ml-2" data-testid="night-time-indicator">
              {isNightTime() ? "Yes (6PM-6AM)" : "No (6AM-6PM)"}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Switch Theme:</p>
          <div className="flex gap-2">
            <Button
              variant={currentTheme === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("day")}
              className="flex items-center gap-1"
              data-testid="button-theme-day"
            >
              <Sun className="w-4 h-4" />
              Day
            </Button>
            <Button
              variant={currentTheme === "night" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("night")}
              className="flex items-center gap-1"
              data-testid="button-theme-night"
            >
              <Moon className="w-4 h-4" />
              Night
            </Button>
            <Button
              variant={currentTheme === "auto" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("auto")}
              className="flex items-center gap-1"
              data-testid="button-theme-auto"
            >
              <Monitor className="w-4 h-4" />
              Auto
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Auto mode switches to night between 6 PM - 6 AM</p>
          <p>• Theme preference is saved to localStorage</p>
          <p>• System theme preference is respected in auto mode</p>
        </div>
      </CardContent>
    </Card>
  );
}