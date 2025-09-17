import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Volume2, 
  VolumeX, 
  Shield, 
  ShieldCheck, 
  AlertTriangle, 
  Settings,
  Clock,
  Navigation
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { type DoNotDisturbState } from "./mobile-notification-system";

interface DNDControlsProps {
  dndState: DoNotDisturbState;
  onUpdateDndState: (updates: Partial<DoNotDisturbState>) => void;
  voiceEnabled: boolean;
  onVoiceEnabledChange: (enabled: boolean) => void;
  isNavigating: boolean;
  notificationCount: number;
  onTestNotification?: () => void;
}

export function DNDControls({
  dndState,
  onUpdateDndState,
  voiceEnabled,
  onVoiceEnabledChange,
  isNavigating,
  notificationCount,
  onTestNotification,
}: DNDControlsProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleDND = () => {
    onUpdateDndState({ enabled: !dndState.enabled });
  };

  const handleToggleAutoEnable = () => {
    onUpdateDndState({ autoEnableOnNavigation: !dndState.autoEnableOnNavigation });
  };

  const handleToggleAllowCritical = () => {
    onUpdateDndState({ allowCritical: !dndState.allowCritical });
  };

  const handleToggleAllowSafety = () => {
    onUpdateDndState({ allowSafety: !dndState.allowSafety });
  };

  return (
    <Card className={cn(
      "mobile-dnd-controls",
      isMobile ? "mx-2 mb-2" : "mx-0 mb-4"
    )} data-testid="dnd-controls">
      <CardHeader className={cn(
        "pb-2",
        isMobile ? "p-3" : "p-4"
      )}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "flex items-center",
            isMobile ? "text-base" : "text-lg"
          )}>
            {dndState.enabled ? (
              <VolumeX className="w-4 h-4 mr-2 text-orange-600" />
            ) : (
              <Volume2 className="w-4 h-4 mr-2 text-blue-600" />
            )}
            Notifications
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {/* Notification count badge */}
            {notificationCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {notificationCount} queued
              </Badge>
            )}
            
            {/* DND status indicator */}
            {dndState.enabled && (
              <Badge 
                variant="outline" 
                className="text-xs bg-orange-50 dark:bg-orange-900/20 border-orange-200"
              >
                DND
              </Badge>
            )}
            
            {/* Auto DND indicator during navigation */}
            {isNavigating && dndState.autoEnableOnNavigation && (
              <Badge 
                variant="outline" 
                className="text-xs bg-blue-50 dark:bg-blue-900/20 border-blue-200"
              >
                <Navigation className="w-3 h-3 mr-1" />
                AUTO
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(
        "space-y-4",
        isMobile ? "p-3 pt-0" : "p-4 pt-0"
      )}>
        {/* Main DND Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="dnd-toggle" className={cn(
              "font-medium text-foreground",
              isMobile ? "text-sm" : "text-base"
            )}>
              Do Not Disturb
            </Label>
            <p className={cn(
              "text-muted-foreground leading-relaxed",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {dndState.enabled 
                ? "Only critical and safety alerts will be shown"
                : "All notifications will be displayed normally"
              }
            </p>
          </div>
          <Switch
            id="dnd-toggle"
            checked={dndState.enabled}
            onCheckedChange={handleToggleDND}
            data-testid="switch-dnd-enabled"
          />
        </div>

        {/* Voice Controls */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="voice-toggle" className={cn(
              "font-medium text-foreground",
              isMobile ? "text-sm" : "text-base"
            )}>
              Voice Announcements
            </Label>
            <p className={cn(
              "text-muted-foreground leading-relaxed",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {voiceEnabled 
                ? "Critical alerts will be announced audibly"
                : "No voice announcements"
              }
            </p>
          </div>
          <Switch
            id="voice-toggle"
            checked={voiceEnabled}
            onCheckedChange={onVoiceEnabledChange}
            data-testid="switch-voice-enabled"
          />
        </div>

        {/* Advanced Settings - Expandable */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between p-2 h-auto"
            data-testid="button-expand-settings"
          >
            <div className="flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              <span className={cn(isMobile ? "text-sm" : "text-base")}>
                Advanced Settings
              </span>
            </div>
            <div className={cn(
              "transform transition-transform",
              isExpanded ? "rotate-180" : ""
            )}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="m6 9 6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Button>

          {isExpanded && (
            <div className="space-y-4 pt-2">
              <Separator />
              
              {/* Auto-enable during navigation */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className={cn(
                    "font-medium text-foreground",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    Auto-enable during navigation
                  </Label>
                  <p className={cn(
                    "text-muted-foreground leading-relaxed",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    Automatically enable DND when starting navigation
                  </p>
                </div>
                <Switch
                  checked={dndState.autoEnableOnNavigation}
                  onCheckedChange={handleToggleAutoEnable}
                  data-testid="switch-auto-enable-navigation"
                />
              </div>

              {/* Allow critical alerts */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className={cn(
                    "font-medium text-foreground flex items-center",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    <AlertTriangle className="w-4 h-4 mr-1 text-red-600" />
                    Allow critical alerts
                  </Label>
                  <p className={cn(
                    "text-muted-foreground leading-relaxed",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    Road closures, severe incidents, emergency alerts
                  </p>
                </div>
                <Switch
                  checked={dndState.allowCritical}
                  onCheckedChange={handleToggleAllowCritical}
                  data-testid="switch-allow-critical"
                />
              </div>

              {/* Allow safety alerts */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className={cn(
                    "font-medium text-foreground flex items-center",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    <Shield className="w-4 h-4 mr-1 text-orange-600" />
                    Allow safety alerts
                  </Label>
                  <p className={cn(
                    "text-muted-foreground leading-relaxed",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    Vehicle restrictions, weight limits, hazard warnings
                  </p>
                </div>
                <Switch
                  checked={dndState.allowSafety}
                  onCheckedChange={handleToggleAllowSafety}
                  data-testid="switch-allow-safety"
                />
              </div>

              {/* Test notification button */}
              {onTestNotification && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onTestNotification}
                    className="w-full"
                    data-testid="button-test-notification"
                  >
                    Test Notification
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Current Status Summary */}
        {dndState.enabled && (
          <div className={cn(
            "bg-muted/50 rounded-lg p-3 border",
            isMobile ? "text-xs" : "text-sm"
          )}>
            <div className="flex items-center mb-2">
              <ShieldCheck className="w-4 h-4 mr-2 text-green-600" />
              <span className="font-medium">DND Active</span>
            </div>
            <div className="space-y-1 text-muted-foreground">
              {dndState.allowCritical && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2 flex-shrink-0" />
                  Critical alerts allowed
                </div>
              )}
              {dndState.allowSafety && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 flex-shrink-0" />
                  Safety alerts allowed
                </div>
              )}
              {voiceEnabled && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0" />
                  Voice announcements enabled
                </div>
              )}
              {isNavigating && dndState.autoEnableOnNavigation && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0" />
                  Auto-enabled during navigation
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}