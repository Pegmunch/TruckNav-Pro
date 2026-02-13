/**
 * Navigation Header Component
 * White banner showing TruckNav Pro branding with settings gear button
 * Displays at the very top of the screen during navigation
 * Uses a fixed overlay panel instead of Popover for reliable iOS Safari touch handling
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  X,
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
  const touchHandledRef = useRef(false);
  const itemTouchHandledRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleItemClick = useCallback((callback?: () => void) => {
    if (itemTouchHandledRef.current) {
      itemTouchHandledRef.current = false;
      return;
    }
    setIsOpen(false);
    setTimeout(() => {
      callback?.();
    }, 100);
  }, []);

  const handleItemTouch = useCallback((e: React.TouchEvent, callback?: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    itemTouchHandledRef.current = true;
    setIsOpen(false);
    setTimeout(() => {
      callback?.();
      itemTouchHandledRef.current = false;
    }, 100);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleBackdropTouch = (e: TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('touchstart', handleBackdropTouch, { passive: false });
    return () => document.removeEventListener('touchstart', handleBackdropTouch);
  }, [isOpen]);

  return (
    <>
      <div
        className={cn(
          "fixed left-0 right-0",
          "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700",
          "h-16 px-4",
          "flex items-center justify-between",
          "shadow-sm",
          "pointer-events-auto",
          "lg:hidden",
          className
        )}
        style={{
          top: "max(env(safe-area-inset-top, 0px), 0px)",
          zIndex: 500002,
        }}
        data-testid="navigation-header"
      >
        <div className="flex items-center gap-2">
          <img 
            src="/truck-marker-icon.png" 
            alt="TruckNav Pro" 
            className="w-8 h-8 object-contain rounded border-t-2 border-b-2 border-blue-500"
          />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">TruckNav Pro</h1>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg bg-white hover:bg-green-50 active:bg-green-100 text-green-500 border-2 border-green-500 shadow-md"
          data-testid="button-header-settings"
          data-tour-id="header-settings"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (touchHandledRef.current) {
              touchHandledRef.current = false;
              return;
            }
            handleToggle();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            touchHandledRef.current = true;
            handleToggle();
            setTimeout(() => { touchHandledRef.current = false; }, 300);
          }}
          style={{ touchAction: 'manipulation' }}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30"
            style={{ zIndex: 500003 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={panelRef}
            className="fixed right-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl rounded-l-2xl overflow-hidden"
            style={{
              zIndex: 500004,
              top: "calc(max(env(safe-area-inset-top, 0px), 0px) + 64px)",
              width: "min(320px, 85vw)",
              maxHeight: "calc(100vh - max(env(safe-area-inset-top, 0px), 0px) - 80px)",
            }}
            data-testid="quick-settings-panel"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Quick Settings</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setIsOpen(false)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                style={{ touchAction: 'manipulation' }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="max-h-[60vh] overflow-y-auto" type="always">
              <div className="p-2">
                <Separator className="my-1" />

                <button
                  className="w-full flex items-center h-12 px-3 text-sm font-normal rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
                  onClick={() => handleItemClick(onRegionSettingsClick)}
                  onTouchEnd={(e) => handleItemTouch(e, onRegionSettingsClick)}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="dropdown-region-settings"
                >
                  <MapPinned className="h-4 w-4 mr-3 text-blue-500 flex-shrink-0" />
                  <span className="flex-1 text-left">Region & Speed Limit</span>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>

                <button
                  className="w-full flex items-center h-12 px-3 text-sm font-normal rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
                  onClick={() => handleItemClick(onLanguageClick)}
                  onTouchEnd={(e) => handleItemTouch(e, onLanguageClick)}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="dropdown-language"
                >
                  <Globe className="h-4 w-4 mr-3 text-purple-500 flex-shrink-0" />
                  <span className="flex-1 text-left">Language</span>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>

                <button
                  className="w-full flex items-center h-12 px-3 text-sm font-normal rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
                  onClick={() => handleItemClick(onMapSettingsClick)}
                  onTouchEnd={(e) => handleItemTouch(e, onMapSettingsClick)}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="dropdown-map-settings"
                >
                  <Map className="h-4 w-4 mr-3 text-green-500 flex-shrink-0" />
                  <span className="flex-1 text-left">Map & Traffic</span>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>

                <Separator className="my-1" />

                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Tools & Widgets
                </div>

                <button
                  className="w-full flex items-center h-12 px-3 text-sm font-normal rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
                  onClick={() => handleItemClick(onWeatherClick)}
                  onTouchEnd={(e) => handleItemTouch(e, onWeatherClick)}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="dropdown-weather"
                >
                  <Cloud className="h-4 w-4 mr-3 text-sky-500 flex-shrink-0" />
                  <span className="flex-1 text-left">Weather</span>
                </button>

                <button
                  className="w-full flex items-center h-12 px-3 text-sm font-normal rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
                  onClick={() => handleItemClick(onEntertainmentClick)}
                  onTouchEnd={(e) => handleItemTouch(e, onEntertainmentClick)}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="dropdown-entertainment"
                >
                  <Music className="h-4 w-4 mr-3 text-pink-500 flex-shrink-0" />
                  <span className="flex-1 text-left">Entertainment</span>
                </button>

                <button
                  className="w-full flex items-center h-12 px-3 text-sm font-normal rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
                  onClick={() => handleItemClick(onVoiceNavClick)}
                  onTouchEnd={(e) => handleItemTouch(e, onVoiceNavClick)}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="dropdown-voice-nav"
                >
                  <Mic className="h-4 w-4 mr-3 text-indigo-500 flex-shrink-0" />
                  <span className="flex-1 text-left">Voice Navigation</span>
                </button>

                <button
                  className="w-full flex items-center h-12 px-3 text-sm font-normal rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
                  onClick={() => handleItemClick(onFuelPricesClick)}
                  onTouchEnd={(e) => handleItemTouch(e, onFuelPricesClick)}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="dropdown-fuel-prices"
                >
                  <Fuel className="h-4 w-4 mr-3 text-green-600 flex-shrink-0" />
                  <span className="flex-1 text-left">Fuel Price Comparison</span>
                </button>

                <button
                  className="w-full flex items-center h-12 px-3 text-sm font-normal rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
                  onClick={() => handleItemClick(onFatigueMonitorClick)}
                  onTouchEnd={(e) => handleItemTouch(e, onFatigueMonitorClick)}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="dropdown-fatigue-monitor"
                >
                  <Clock className="h-4 w-4 mr-3 text-amber-500 flex-shrink-0" />
                  <span className="flex-1 text-left">Driver Fatigue Monitor</span>
                </button>

                <button
                  className="w-full flex items-center h-12 px-3 text-sm font-normal rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
                  onClick={() => handleItemClick(onSettingsClick)}
                  onTouchEnd={(e) => handleItemTouch(e, onSettingsClick)}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="dropdown-app-settings"
                >
                  <Settings className="h-4 w-4 mr-3 text-gray-500 flex-shrink-0" />
                  <span className="flex-1 text-left">App Settings</span>
                </button>

                <Separator className="my-1" />

                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Utilities
                </div>

                <button
                  className="w-full flex items-center h-12 px-3 text-sm font-normal rounded-lg text-orange-600 hover:bg-orange-50 active:bg-orange-100 transition-colors"
                  onClick={() => handleItemClick(onClearRouteClick)}
                  onTouchEnd={(e) => handleItemTouch(e, onClearRouteClick)}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="dropdown-clear-route"
                >
                  <Trash2 className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span className="flex-1 text-left">Clear Old Route (Fix Map)</span>
                </button>

                <button
                  className="w-full flex items-center h-12 px-3 text-sm font-normal rounded-lg text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                  onClick={() => handleItemClick(onReplayTourClick)}
                  onTouchEnd={(e) => handleItemTouch(e, onReplayTourClick)}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="dropdown-replay-tour"
                >
                  <HelpCircle className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span className="flex-1 text-left">Replay App Tour</span>
                </button>
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </>
  );
}
