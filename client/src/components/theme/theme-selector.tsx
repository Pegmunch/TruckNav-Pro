import { useTheme } from "./theme-provider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Clock, Settings, MapPin, Thermometer, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { GrayscaleSelector } from "./grayscale-selector";
import { ColorSpectrumPicker } from "./color-spectrum-picker";
import { AutoThemeSettings } from "./auto-theme-settings";
import { formatTimeInfo } from "@/lib/auto-theme-utils";

interface ThemeOption {
  value: "day" | "night" | "auto";
  label: string;
  icon: React.ComponentType<any>;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: "day",
    label: "Day",
    icon: Sun,
    description: "Always use light theme"
  },
  {
    value: "night", 
    label: "Night",
    icon: Moon,
    description: "Always use dark theme"
  },
  {
    value: "auto",
    label: "Auto",
    icon: Clock,
    description: "Switch based on time and system preference"
  }
];

interface ThemeSelectorProps {
  className?: string;
  showLabels?: boolean;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
  showGrayscale?: boolean;
  showColorSpectrum?: boolean;
  showAutoSettings?: boolean;
  showAutoStatus?: boolean;
}

export function ThemeSelector({ 
  className,
  showLabels = true,
  size = "default",
  variant = "outline",
  showGrayscale = true,
  showColorSpectrum = true,
  showAutoSettings = true,
  showAutoStatus = true
}: ThemeSelectorProps) {
  const { 
    currentTheme, 
    setTheme, 
    effectiveTheme,
    autoThemeConfig,
    timeInfo,
    coordinates,
    isLocationLoading
  } = useTheme();

  const handleThemeChange = (value: string) => {
    if (value && (value === "day" || value === "night" || value === "auto")) {
      setTheme(value);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ToggleGroup
        type="single"
        value={currentTheme}
        onValueChange={handleThemeChange}
        className="grid grid-cols-3 w-full"
        data-testid="theme-selector"
      >
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = currentTheme === option.value;
          const isEffective = (option.value !== "auto" && effectiveTheme === option.value) || 
            (option.value === "auto" && currentTheme === "auto");

          return (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              variant={variant}
              size={size}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 p-3 transition-all duration-200 ease-in-out",
                "hover:scale-105 hover:shadow-sm",
                "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                "data-[state=on]:shadow-md data-[state=on]:scale-105",
                // Add visual indicator for auto mode when it's effectively night
                option.value === "auto" && effectiveTheme === "night" && currentTheme === "auto" && 
                "ring-2 ring-blue-500/50 ring-offset-2 ring-offset-background"
              )}
              aria-label={`Switch to ${option.label} theme - ${option.description}`}
              data-testid={`theme-option-${option.value}`}
            >
              <Icon 
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isSelected && "scale-110"
                )}
              />
              {showLabels && (
                <span className="text-xs font-medium leading-none">
                  {option.label}
                </span>
              )}
              
              {/* Subtle indicator for auto mode effective state */}
              {option.value === "auto" && currentTheme === "auto" && (
                <div className={cn(
                  "absolute -top-1 -right-1 w-2 h-2 rounded-full transition-colors duration-200",
                  effectiveTheme === "night" ? "bg-blue-500" : "bg-amber-500"
                )} />
              )}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      
      {/* Color Customization Controls */}
      {(showGrayscale || showColorSpectrum) && (
        <>
          <Separator className="my-2" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">Color Customization</h4>
            </div>
            
            {/* HSL Color Spectrum Picker */}
            {showColorSpectrum && (
              <div className="space-y-2">
                <ColorSpectrumPicker 
                  size={size === "lg" ? "lg" : size === "sm" ? "sm" : "default"}
                  showPresets={true}
                  className="w-full"
                />
              </div>
            )}
            
            {/* Grayscale Override */}
            {showGrayscale && (
              <>
                {showColorSpectrum && <Separator className="my-2" />}
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground">Grayscale Override</h5>
                  <GrayscaleSelector 
                    size={size === "lg" ? "lg" : size === "sm" ? "sm" : "default"}
                    showLabel={false}
                    showReset={true}
                    className="px-1"
                  />
                </div>
              </>
            )}
          </div>
          <Separator className="my-2" />
        </>
      )}
      
      {/* Enhanced auto-theme status and settings */}
      {currentTheme === "auto" && showAutoStatus && (
        <>
          <Separator className="my-2" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">Auto-Theme Status</h4>
              {showAutoSettings && (
                <AutoThemeSettings
                  showTrigger={true}
                  triggerVariant="ghost"
                  className="h-7 px-2 text-xs"
                />
              )}
            </div>
            
            {/* Current theme status */}
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2">
                {effectiveTheme === "night" ? (
                  <Moon className="w-4 h-4 text-blue-500" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-sm font-medium">
                  {effectiveTheme === "night" ? "Dark" : "Light"} Theme
                </span>
              </div>
              <Badge variant={effectiveTheme === "night" ? "secondary" : "default"}>
                {timeInfo?.source || "Active"}
              </Badge>
            </div>
            
            {/* Enhanced status information */}
            {timeInfo && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Timer className="w-3 h-3" />
                  <span>{formatTimeInfo(timeInfo)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    Next switch in {timeInfo.timeUntilNextSwitch} min
                  </span>
                </div>
                
                {/* Location status */}
                {autoThemeConfig.useGeolocation && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {coordinates ? "GPS enabled" : isLocationLoading ? "Getting location..." : "GPS pending"}
                    </span>
                  </div>
                )}
                
                {/* Color temperature status */}
                {autoThemeConfig.enableColorTemperature && effectiveTheme === "night" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Thermometer className="w-3 h-3" />
                    <span>
                      Warm colors ({autoThemeConfig.warmTemperatureStrength}%)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <Separator className="my-2" />
        </>
      )}
      
      {/* Simplified status for when showAutoStatus is false */}
      {currentTheme === "auto" && !showAutoStatus && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground" data-testid="auto-status">
            Currently using{" "}
            <span className={cn(
              "font-medium",
              effectiveTheme === "night" ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
            )}>
              {effectiveTheme}
            </span>{" "}
            theme
          </p>
        </div>
      )}
    </div>
  );
}

// Compact version without labels for smaller spaces
export function CompactThemeSelector({ className, ...props }: Omit<ThemeSelectorProps, "showLabels">) {
  return (
    <ThemeSelector 
      {...props}
      showLabels={false}
      size="sm"
      className={cn("w-fit", className)}
    />
  );
}

// Simple toggle between day/night with auto as default
export function QuickThemeToggle({ className }: { className?: string }) {
  const { currentTheme, setTheme, effectiveTheme } = useTheme();
  
  const toggleTheme = () => {
    if (currentTheme === "day") {
      setTheme("night");
    } else if (currentTheme === "night") {
      setTheme("auto");
    } else {
      setTheme("day");
    }
  };

  const getIcon = () => {
    if (currentTheme === "auto") {
      return Clock;
    } else if (currentTheme === "night") {
      return Moon;
    } else {
      return Sun;
    }
  };

  const Icon = getIcon();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-md",
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        "transition-all duration-200 ease-in-out hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      aria-label={`Switch theme (current: ${currentTheme})`}
      data-testid="quick-theme-toggle"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}