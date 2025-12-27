/**
 * Navigation Header Component
 * White banner showing TruckNav Pro branding with settings gear
 * Displays at the very top of the screen during navigation
 */

import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationHeaderProps {
  onSettingsClick?: () => void;
  className?: string;
}

export function NavigationHeader({ onSettingsClick, className }: NavigationHeaderProps) {
  return (
    <div 
      className={cn(
        "fixed left-0 right-0 z-[5000]",
        "bg-white border-b border-gray-200",
        "h-14 px-4",
        "flex items-center justify-between",
        "shadow-sm",
        "pointer-events-auto",
        className
      )}
      style={{
        top: 'max(env(safe-area-inset-top, 0px), 0px)'
      }}
      data-testid="navigation-header"
    >
      {/* TruckNav Pro Logo/Text */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-gray-900">
          TruckNav Pro
        </h1>
      </div>

      {/* Settings Button - Green Gear */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onSettingsClick}
        className="h-10 w-10 hover:bg-gray-100"
        data-testid="button-header-settings"
        data-tour-id="header-settings"
      >
        <Settings className="h-6 w-6 text-green-600" />
      </Button>
    </div>
  );
}
