/**
 * Navigation Header Component
 * White banner showing TruckNav Pro branding with settings gear dropdown
 * Displays at the very top of the screen during navigation
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Settings,
  Cloud,
  Music,
  Mic,
  Fuel,
  Clock,
  MapPinned,
  Globe,
  Map,
  Trash2,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationHeaderProps {
  onSettingsClick?: () => void;
  onWeatherClick?: () => void;
  onEntertainmentClick?: () => void;
  onVoiceNavClick?: () => void;
  onFuelPricesClick?: () => void;
  onFatigueMonitorClick?: () => void;
  onRegionSettingsClick?: () => void;
  onLanguageClick?: () => void;
  onMapSettingsClick?: () => void;
  onClearRouteClick?: () => void;
  onReplayTourClick?: () => void;
  className?: string;
}

export function NavigationHeader({
  onSettingsClick,
  onWeatherClick,
  onEntertainmentClick,
  onVoiceNavClick,
  onFuelPricesClick,
  onFatigueMonitorClick,
  onRegionSettingsClick,
  onLanguageClick,
  onMapSettingsClick,
  onClearRouteClick,
  onReplayTourClick,
  className,
}: NavigationHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (callback?: () => void) => {
    setIsOpen(false);
    callback?.();
  };

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-[5000]",
        "bg-white border-b border-gray-200",
        "h-16 px-4",
        "flex items-center justify-between",
        "shadow-sm",
        "pointer-events-auto",
        "lg:hidden",
        className
      )}
      style={{
        top: "max(env(safe-area-inset-top, 0px), 0px)",
      }}
      data-testid="navigation-header"
    >
      {/* TruckNav Pro Logo/Text */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-gray-900">TruckNav Pro</h1>
      </div>

      {/* Settings Dropdown */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 hover:bg-gray-100"
            data-testid="button-header-settings"
            data-tour-id="header-settings"
          >
            <Settings className="h-6 w-6 text-green-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-0"
          align="end"
          sideOffset={8}
        >
          <ScrollArea className="max-h-[50vh] overflow-y-auto" type="always">
            <div className="p-2">
              {/* Header */}
              <div className="px-2 py-1.5 text-sm font-semibold text-gray-900">
                Quick Settings
              </div>
              <Separator className="my-1" />

              {/* Region & Speed Limit */}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 text-sm font-normal"
                onClick={() => handleItemClick(onRegionSettingsClick)}
                data-testid="dropdown-region-settings"
              >
                <MapPinned className="h-4 w-4 mr-3 text-blue-500" />
                Region & Speed Limit
                <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
              </Button>

              {/* Language */}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 text-sm font-normal"
                onClick={() => handleItemClick(onLanguageClick)}
                data-testid="dropdown-language"
              >
                <Globe className="h-4 w-4 mr-3 text-purple-500" />
                Language
                <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
              </Button>

              {/* Map Settings */}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 text-sm font-normal"
                onClick={() => handleItemClick(onMapSettingsClick)}
                data-testid="dropdown-map-settings"
              >
                <Map className="h-4 w-4 mr-3 text-green-500" />
                Map & Traffic
                <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
              </Button>

              <Separator className="my-1" />

              {/* Tools Section Header */}
              <div className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Tools & Widgets
              </div>

              {/* Weather */}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 text-sm font-normal"
                onClick={() => handleItemClick(onWeatherClick)}
                data-testid="dropdown-weather"
              >
                <Cloud className="h-4 w-4 mr-3 text-sky-500" />
                Weather
              </Button>

              {/* Entertainment */}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 text-sm font-normal"
                onClick={() => handleItemClick(onEntertainmentClick)}
                data-testid="dropdown-entertainment"
              >
                <Music className="h-4 w-4 mr-3 text-pink-500" />
                Entertainment
              </Button>

              {/* Voice Navigation */}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 text-sm font-normal"
                onClick={() => handleItemClick(onVoiceNavClick)}
                data-testid="dropdown-voice-nav"
              >
                <Mic className="h-4 w-4 mr-3 text-indigo-500" />
                Voice Navigation
              </Button>

              {/* Fuel Price Comparison */}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 text-sm font-normal"
                onClick={() => handleItemClick(onFuelPricesClick)}
                data-testid="dropdown-fuel-prices"
              >
                <Fuel className="h-4 w-4 mr-3 text-green-600" />
                Fuel Price Comparison
              </Button>

              {/* Driver Fatigue Monitor */}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 text-sm font-normal"
                onClick={() => handleItemClick(onFatigueMonitorClick)}
                data-testid="dropdown-fatigue-monitor"
              >
                <Clock className="h-4 w-4 mr-3 text-amber-500" />
                Driver Fatigue Monitor
              </Button>

              {/* App Settings */}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 text-sm font-normal"
                onClick={() => handleItemClick(onSettingsClick)}
                data-testid="dropdown-app-settings"
              >
                <Settings className="h-4 w-4 mr-3 text-gray-500" />
                App Settings
              </Button>

              <Separator className="my-1" />

              {/* Utilities Section */}
              <div className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Utilities
              </div>

              {/* Clear Old Route */}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 text-sm font-normal text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                onClick={() => handleItemClick(onClearRouteClick)}
                data-testid="dropdown-clear-route"
              >
                <Trash2 className="h-4 w-4 mr-3" />
                Clear Old Route (Fix Map)
              </Button>

              {/* Replay App Tour */}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-2 text-sm font-normal text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => handleItemClick(onReplayTourClick)}
                data-testid="dropdown-replay-tour"
              >
                <HelpCircle className="h-4 w-4 mr-3" />
                Replay App Tour
              </Button>
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
