import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Truck, 
  Navigation, 
  Search,
  Route as RouteIcon,
  Menu,
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Loader2
} from "lucide-react";
import ManualSearchPanel from "./manual-search-panel";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import SettingsModal from "@/components/settings/settings-modal";
import { type VehicleProfile, type Route, type Journey } from "@shared/schema";
import { cn } from "@/lib/utils";

interface NavigationSidebarProps {
  // Route planning props
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onPlanRoute: () => void;
  onStartNavigation: () => void;
  onStopNavigation?: () => void;
  currentRoute: Route | null;
  isCalculating: boolean;
  
  // Vehicle profile props
  selectedProfile: VehicleProfile | null;
  onProfileSelect: (profile: VehicleProfile) => void;
  
  // Navigation state
  isNavigating?: boolean;
  isStartingJourney?: boolean;
  isCompletingJourney?: boolean;
  
  // Sidebar state
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
  
  // Search panel controls
  isSearchPanelOpen?: boolean;
  onToggleSearchPanel?: () => void;
}

// Configuration for the 5 core navigation sections
const SECTION_CONFIG = [
  {
    id: 'plan',
    title: 'Plan',
    icon: RouteIcon,
    description: 'Plan your route'
  },
  {
    id: 'go',
    title: 'Go',
    icon: Navigation,
    description: 'Start navigation'
  },
  {
    id: 'search',
    title: 'Search',
    icon: Search,
    description: 'Find locations'
  },
  {
    id: 'vehicle',
    title: 'Vehicle',
    icon: Truck,
    description: 'Vehicle profile'
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    description: 'App settings'
  }
] as const;

type SectionId = typeof SECTION_CONFIG[number]['id'];

const NavigationSidebar = memo(function NavigationSidebar({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onPlanRoute,
  onStartNavigation,
  onStopNavigation,
  currentRoute,
  isCalculating,
  selectedProfile,
  onProfileSelect,
  isNavigating = false,
  isStartingJourney = false,
  isCompletingJourney = false,
  isOpen,
  onToggle,
  isCollapsed,
  onCollapseToggle,
  isSearchPanelOpen,
  onToggleSearchPanel,
}: NavigationSidebarProps) {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [showVehicleProfileSetup, setShowVehicleProfileSetup] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Handle section button clicks
  const handleSectionClick = (sectionId: SectionId) => {
    switch (sectionId) {
      case 'plan':
        setActiveSection(activeSection === 'plan' ? null : 'plan');
        break;
      case 'go':
        handleNavigationToggle();
        break;
      case 'search':
        onToggleSearchPanel?.();
        break;
      case 'vehicle':
        setShowVehicleProfileSetup(true);
        break;
      case 'settings':
        setShowSettingsModal(true);
        break;
    }
  };

  // Handle navigation start/stop
  const handleNavigationToggle = () => {
    if (isNavigating) {
      onStopNavigation?.();
    } else {
      // Check if route is ready
      if (currentRoute && selectedProfile) {
        onStartNavigation();
      }
    }
  };

  // Handle vehicle profile creation
  const handleProfileCreated = (profile: VehicleProfile) => {
    onProfileSelect(profile);
    setShowVehicleProfileSetup(false);
  };

  // Get section button state
  const getSectionButtonState = (sectionId: SectionId): {
    disabled: boolean;
    variant: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
    loading: boolean;
  } => {
    switch (sectionId) {
      case 'plan':
        return {
          disabled: false,
          variant: activeSection === 'plan' ? 'default' : 'outline',
          loading: isCalculating
        };
      case 'go':
        return {
          disabled: !currentRoute || !selectedProfile,
          variant: isNavigating ? 'destructive' : 'default',
          loading: isStartingJourney || isCompletingJourney
        };
      case 'search':
        return {
          disabled: false,
          variant: isSearchPanelOpen ? 'default' : 'outline',
          loading: false
        };
      case 'vehicle':
        return {
          disabled: false,
          variant: selectedProfile ? 'default' : 'outline',
          loading: false
        };
      case 'settings':
        return {
          disabled: false,
          variant: 'outline',
          loading: false
        };
      default:
        return {
          disabled: false,
          variant: 'outline',
          loading: false
        };
    }
  };

  // Get section button text
  const getSectionButtonText = (sectionId: SectionId) => {
    switch (sectionId) {
      case 'go':
        return isNavigating ? 'Stop Navigation' : 'Start Navigation';
      default:
        return SECTION_CONFIG.find(s => s.id === sectionId)?.title || '';
    }
  };

  return (
    <>
      {/* Sidebar Toggle Button */}
      <div
        className={cn(
          "fixed left-0 top-1/3 -translate-y-1/2 z-40 transition-all duration-300 ease-in-out",
          isOpen 
            ? (isCollapsed ? "left-16" : "left-80") 
            : "left-0"
        )}
      >
        <Button
          onClick={onToggle}
          variant="default"
          className={cn(
            "h-16 w-8 rounded-r-lg rounded-l-lg px-0 py-0",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "border border-border shadow-lg",
            "scalable-control-button flex flex-col items-center justify-center gap-1",
            "transform transition-all duration-300 ease-in-out",
            !isOpen && "hover:scale-105"
          )}
          data-testid="button-toggle-navigation-sidebar-tab"
        >
          <Menu className="w-4 h-4" />
          <div className="text-xs font-medium leading-none">
            NAV
          </div>
        </Button>
      </div>

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 h-screen bg-background border-r border-border z-30 shadow-lg",
          "automotive-layout sidebar-transition",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          isCollapsed ? "w-16" : "w-80",
          "flex flex-col"
        )}
        data-testid="navigation-sidebar-panel"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Navigation className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Navigation</h2>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onCollapseToggle}
              className="scalable-control-button"
              data-testid="button-collapse-navigation-sidebar"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar Content */}
        {!isCollapsed && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Core Navigation Sections */}
            <div className="p-4 space-y-3">
              {SECTION_CONFIG.map((section) => {
                const buttonState = getSectionButtonState(section.id);
                const buttonText = getSectionButtonText(section.id);
                
                return (
                  <Button
                    key={section.id}
                    onClick={() => handleSectionClick(section.id)}
                    disabled={buttonState.disabled}
                    variant={buttonState.variant}
                    className={cn(
                      "w-full justify-start space-x-3 automotive-button h-12",
                      buttonState.disabled && "opacity-50 cursor-not-allowed"
                    )}
                    data-testid={`button-section-${section.id}`}
                  >
                    {buttonState.loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : section.id === 'go' && isNavigating ? (
                      <Square className="w-5 h-5" />
                    ) : section.id === 'go' ? (
                      <Play className="w-5 h-5" />
                    ) : (
                      <section.icon className="w-5 h-5" />
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium">{buttonText}</div>
                      <div className="text-xs text-muted-foreground">
                        {section.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>

            <Separator />

            {/* Embedded ManualSearchPanel for Plan section */}
            {activeSection === 'plan' && (
              <div className="flex-1 overflow-hidden">
                <ManualSearchPanel
                  fromLocation={fromLocation}
                  toLocation={toLocation}
                  onFromLocationChange={onFromLocationChange}
                  onToLocationChange={onToLocationChange}
                  onPlanRoute={onPlanRoute}
                  isCalculating={isCalculating}
                  className="border-0 shadow-none bg-transparent"
                />
              </div>
            )}

            {/* Route Status Display */}
            {currentRoute && activeSection !== 'plan' && (
              <div className="p-4">
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <RouteIcon className="w-4 h-4 mr-2 text-green-600" />
                      Route Ready
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Distance:</span>
                        <span className="font-medium">
                          {currentRoute.distance ? (currentRoute.distance / 1000).toFixed(1) : '0'} km
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">
                          {currentRoute.duration ? Math.round(currentRoute.duration / 60) : '0'} min
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Vehicle Profile Status */}
            {selectedProfile && (
              <div className="p-4">
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Truck className="w-4 h-4 mr-2 text-blue-600" />
                      {selectedProfile.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {selectedProfile.type.replace('_', ' ').toUpperCase()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Collapsed Icon State */}
        {isCollapsed && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            {SECTION_CONFIG.map((section) => {
              const buttonState = getSectionButtonState(section.id);
              
              return (
                <Button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  disabled={buttonState.disabled}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-10 h-10 scalable-control-button",
                    buttonState.variant === 'default' && "bg-primary text-primary-foreground",
                    buttonState.disabled && "opacity-50 cursor-not-allowed"
                  )}
                  data-testid={`button-section-${section.id}-collapsed`}
                >
                  {buttonState.loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : section.id === 'go' && isNavigating ? (
                    <Square className="w-5 h-5" />
                  ) : section.id === 'go' ? (
                    <Play className="w-5 h-5" />
                  ) : (
                    <section.icon className="w-5 h-5" />
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={onToggle}
          data-testid="navigation-sidebar-overlay"
        />
      )}

      {/* Vehicle Profile Setup Modal */}
      {showVehicleProfileSetup && (
        <VehicleProfileSetup
          onClose={() => setShowVehicleProfileSetup(false)}
          onProfileCreated={handleProfileCreated}
          currentProfile={selectedProfile}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
      />
    </>
  );
});

export default NavigationSidebar;