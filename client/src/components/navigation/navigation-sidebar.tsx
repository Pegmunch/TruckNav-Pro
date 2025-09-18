import { useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Settings, 
  Truck, 
  Navigation, 
  MapPin, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight,
  Route as RouteIcon,
  Clock,
  User,
  Car,
  Coffee,
  Home,
  Bookmark,
  History,
  ExternalLink,
  Eye,
  EyeOff,
  Scale,
  Play,
  ArrowRight,
  Zap,
  Shield
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/language/language-selector';
import CountryLanguageSelector from '@/components/country/country-language-selector';
import RoutePlanningPanel from "@/components/route/route-planning-panel";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";
import { MeasurementSelector } from "@/components/measurement/measurement-selector";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { type VehicleProfile, type Route, type Journey } from "@shared/schema";
import { cn } from "@/lib/utils";
import { openMapWindow, closeMapWindow, isMapWindowOpen, TruckNavWindowManager, windowManager } from "@/lib/window-manager";
import { useWindowSync } from "@/hooks/use-window-sync";
import { useToast } from "@/hooks/use-toast";
import { useLegalConsent } from "@/hooks/use-legal-consent";
import { LegalPopupManager } from "@/lib/legal-popup-manager";
import LegalDisclaimerDialog from "@/components/legal/legal-disclaimer-dialog";

interface NavigationSidebarProps {
  // Route planning props
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onPlanRoute: () => void;
  onStartNavigation: () => void;
  onStopNavigation?: () => void;
  onOpenLaneSelection?: () => void;
  currentRoute: Route | null;
  isCalculating: boolean;
  
  // Vehicle profile props
  selectedProfile: VehicleProfile | null;
  onProfileSelect: (profile: VehicleProfile) => void;
  activeJourney?: Journey | null;
  isNavigating?: boolean;
  isStartingJourney?: boolean;
  isCompletingJourney?: boolean;
  
  // Sidebar state
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
}

// Helper functions for formatting
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatDistance = (meters: number): string => {
  const km = meters / 1000;
  if (km >= 1) {
    return `${km.toFixed(1)} km`;
  }
  return `${meters.toFixed(0)} m`;
};

// Memoized sidebar component for automotive performance
const NavigationSidebar = memo(function NavigationSidebar({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onPlanRoute,
  onStartNavigation,
  onStopNavigation,
  onOpenLaneSelection,
  currentRoute,
  isCalculating,
  selectedProfile,
  onProfileSelect,
  activeJourney,
  isNavigating = false,
  isStartingJourney = false,
  isCompletingJourney = false,
  isOpen,
  onToggle,
  isCollapsed,
  onCollapseToggle,
}: NavigationSidebarProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatHeight, formatWeight } = useMeasurement();
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [activeSection, setActiveSection] = useState<'route' | 'vehicle' | 'settings'>('route');
  const [isLegalPopupOpen, setIsLegalPopupOpen] = useState(false);
  const [isDisclaimerDialogOpen, setIsDisclaimerDialogOpen] = useState(false);
  
  // Window sync state
  const windowSync = useWindowSync();
  const [isMapWindowCurrentlyOpen, setIsMapWindowCurrentlyOpen] = useState(false);
  
  // Legal consent state
  const { hasAcceptedTerms } = useLegalConsent();
  
  // Update window sync when props change
  useEffect(() => {
    windowSync.updateRoute(currentRoute);
  }, [currentRoute]);
  
  useEffect(() => {
    windowSync.updateProfile(selectedProfile);
  }, [selectedProfile]);
  
  useEffect(() => {
    windowSync.updateJourney(activeJourney || null, isNavigating || false);
  }, [activeJourney, isNavigating]);
  
  useEffect(() => {
    windowSync.updateLocations(fromLocation, toLocation);
  }, [fromLocation, toLocation]);
  
  // Check map window status periodically
  useEffect(() => {
    const checkInterval = setInterval(() => {
      setIsMapWindowCurrentlyOpen(isMapWindowOpen());
    }, 1000);
    
    return () => clearInterval(checkInterval);
  }, []);

  // Automotive-optimized sidebar sections
  const sidebarSections = [
    {
      id: 'route' as const,
      title: 'Route Planning',
      icon: RouteIcon,
      badge: currentRoute ? 'Planned' : null,
    },
    {
      id: 'vehicle' as const,
      title: 'Vehicle Profile',
      icon: Truck,
      badge: selectedProfile ? 'Set' : 'Required',
    },
    {
      id: 'settings' as const,
      title: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  const handleProfileCreated = (profile: VehicleProfile) => {
    onProfileSelect(profile);
    setShowProfileSetup(false);
  };

  // Window management handlers
  const handleOpenMapWindow = async () => {
    try {
      const mapWindow = await openMapWindow({
        automotive: true, // Optimize for automotive displays
        fallbackToFullscreen: true,
        onPopupBlocked: () => {
          toast({
            title: "Popup Blocked",
            description: TruckNavWindowManager.getPopupBlockedMessage(),
            variant: "destructive",
          });
        },
        onWindowClosed: () => {
          setIsMapWindowCurrentlyOpen(false);
          windowSync.closeMapWindow();
        }
      });

      if (mapWindow) {
        setIsMapWindowCurrentlyOpen(true);
        windowSync.openMapWindow();
        toast({
          title: "Map window opened",
          description: "Your map is now displayed in a separate window.",
        });
      }
    } catch (error) {
      console.error('Failed to open map window:', error);
      toast({
        title: "Failed to open map window",
        description: "There was an error opening the map in a new window.",
        variant: "destructive",
      });
    }
  };

  const handleCloseMapWindow = () => {
    try {
      closeMapWindow();
      setIsMapWindowCurrentlyOpen(false);
      windowSync.closeMapWindow();
      toast({
        title: "Map window closed",
        description: "The map window has been closed.",
      });
    } catch (error) {
      console.error('Failed to close map window:', error);
    }
  };

  const handleFocusMapWindow = () => {
    const focused = windowManager.focusMapWindow();
    if (!focused) {
      toast({
        title: "Map window not available",
        description: "The map window is not currently open.",
        variant: "destructive",
      });
    }
  };

  // Legal popup management handlers
  const handleOpenLegalDisclaimer = () => {
    try {
      if (LegalPopupManager.isLegalDisclaimerOpen()) {
        LegalPopupManager.focusLegalDisclaimer();
      } else {
        const popup = LegalPopupManager.openLegalDisclaimer({
          width: 1200,
          height: 900,
          centered: true,
          resizable: true,
          scrollbars: true,
        });

        if (popup) {
          setIsLegalPopupOpen(true);
          toast({
            title: "Legal disclaimer opened",
            description: "The legal disclaimer has been opened in a separate window.",
          });
        }
      }
    } catch (error) {
      console.error('Failed to open legal disclaimer popup:', error);
      toast({
        title: "Failed to open legal disclaimer",
        description: "There was an error opening the legal disclaimer. Please check popup settings.",
        variant: "destructive",
      });
    }
  };

  // View Disclaimer button handler with access control
  const handleViewDisclaimer = () => {
    if (!hasAcceptedTerms) {
      toast({
        title: "Access restricted",
        description: "Please complete agreement first",
        variant: "destructive",
      });
      return;
    }
    
    setIsDisclaimerDialogOpen(true);
  };

  // Go button functionality
  const isReadyToGo = fromLocation && toLocation && selectedProfile;
  const canStartNavigation = isReadyToGo && currentRoute && !isNavigating;

  const handleGoNavigation = async () => {
    if (!canStartNavigation) {
      if (!selectedProfile) {
        toast({
          title: "Vehicle profile required",
          description: "Please set up your vehicle profile before starting navigation.",
          variant: "destructive",
        });
        setActiveSection('vehicle');
        return;
      }
      
      if (!fromLocation || !toLocation) {
        toast({
          title: "Locations required",
          description: "Please set both starting point and destination.",
          variant: "destructive",
        });
        setActiveSection('route');
        return;
      }
      
      if (!currentRoute) {
        // Try to plan route first
        onPlanRoute();
        return;
      }
    }

    try {
      // Start navigation
      onStartNavigation();
      
      // Open map window automatically
      await handleOpenMapWindow();
      
      toast({
        title: "Navigation started",
        description: "TruckNav Pro is now guiding your journey.",
      });
    } catch (error) {
      console.error('Failed to start navigation:', error);
      toast({
        title: "Failed to start navigation",
        description: "There was an error starting navigation. Please try again.",
        variant: "destructive",
      });
    }
  };


  return (
    <>
      {/* Persistent Hamburger Menu Button - Always Visible */}
      <Button
        onClick={onToggle}
        className={cn(
          "fixed top-4 left-4 z-[60] hamburger-menu-button bg-card border border-border hover:bg-accent hover:border-accent-foreground transition-all duration-200",
          "min-h-[44px] min-w-[44px]", // Automotive-grade touch targets
          isOpen && "lg:left-[calc(24rem+1rem)]" // Move right when sidebar is open on desktop
        )}
        size="icon"
        data-testid="button-hamburger-menu"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        {/* Always show hamburger icon for consistency, or use X when open */}
        {isOpen ? (
          <X className="w-4 h-4" />
        ) : (
          <div className="flex flex-col justify-center items-center space-y-0.5">
            <div className="w-4 h-0.5 bg-current"></div>
            <div className="w-4 h-0.5 bg-current"></div>
            <div className="w-4 h-0.5 bg-current"></div>
            <div className="w-4 h-0.5 bg-current"></div>
          </div>
        )}
      </Button>
      
      {/* Mobile overlay backdrop - only show when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden" 
          onClick={onToggle}
          data-testid="sidebar-backdrop"
        />
      )}
      
      {/* Sidebar Container */}
      <div className={cn(
        "fixed lg:relative left-0 top-0 h-full bg-card border-r border-border z-50 flex flex-col",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-80 lg:w-96",
        "shadow-lg lg:shadow-none"
      )}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Truck className="text-primary-foreground mobile-text-lg" />
              </div>
              <div>
                <h1 className="mobile-text-lg font-bold text-foreground">{t('app.name')}</h1>
                <p className="mobile-text-sm text-muted-foreground">{t('app.tagline')}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            {/* Collapse Toggle - Desktop */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onCollapseToggle}
              className="hidden lg:flex automotive-button"
              data-testid="button-collapse-sidebar"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            
            {/* Close Toggle - Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden automotive-button"
              data-testid="button-close-sidebar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Status Bar */}
        {!isCollapsed && (
          <div className="px-4 py-2 bg-muted/50 border-b border-border">
            <div className="flex items-center justify-between mobile-text-xs">
              <div className="flex items-center space-x-2">
                <LanguageSelector variant="country-first" />
                <MeasurementSelector variant="compact" />
              </div>
              {selectedProfile && (
                <div className="text-muted-foreground">
                  {formatHeight(selectedProfile.height)} H × {formatHeight(selectedProfile.width)} W
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        {isCollapsed ? (
          /* Collapsed Mode - Icon Navigation */
          <div className="flex-1 p-2 space-y-2">
            {sidebarSections.map((section) => (
              <Button
                key={section.id}
                variant={activeSection === section.id ? "default" : "ghost"}
                size="icon"
                onClick={() => setActiveSection(section.id)}
                className="w-full automotive-button relative"
                data-testid={`button-section-${section.id}`}
              >
                <section.icon className="w-5 h-5" />
                {section.badge && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full" />
                )}
              </Button>
            ))}
          </div>
        ) : (
          /* Expanded Mode - Full Navigation */
          <div className="flex-1 overflow-y-auto touch-scroll">
            {/* Section Navigation */}
            <div className="p-4 border-b border-border">
              <div className="grid grid-cols-3 gap-2">
                {sidebarSections.map((section) => (
                  <Button
                    key={section.id}
                    variant={activeSection === section.id ? "default" : "outline"}
                    onClick={() => setActiveSection(section.id)}
                    className="automotive-text-sm relative"
                    data-testid={`button-section-${section.id}`}
                  >
                    <section.icon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{section.title.split(' ')[0]}</span>
                    {section.badge && (
                      <Badge 
                        variant={activeSection === section.id ? "secondary" : "outline"} 
                        className="ml-2 mobile-text-xs"
                      >
                        {section.badge}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Section Content */}
            <div className="flex-1">
              {activeSection === 'route' && (
                <>
                  <RoutePlanningPanel
                    fromLocation={fromLocation}
                    toLocation={toLocation}
                    onFromLocationChange={onFromLocationChange}
                    onToLocationChange={onToLocationChange}
                    onPlanRoute={onPlanRoute}
                    onStartNavigation={onStartNavigation}
                    onStopNavigation={onStopNavigation}
                    onOpenLaneSelection={onOpenLaneSelection}
                    currentRoute={currentRoute}
                    isCalculating={isCalculating}
                    selectedProfile={selectedProfile}
                    activeJourney={activeJourney}
                    isNavigating={isNavigating}
                    isStartingJourney={isStartingJourney}
                    isCompletingJourney={isCompletingJourney}
                  />

                  {/* Map Window Controls - Only show when navigation is active */}
                  {isNavigating && (
                    <div className="p-4 border-t border-border">
                      <Card className="bg-card">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center">
                            <ExternalLink className="w-4 h-4 mr-2 text-primary" />
                            Map Window
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-xs text-muted-foreground">
                            Open the map in a separate window for enhanced viewing and multi-monitor support.
                          </div>
                          
                          {/* Window Status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                isMapWindowCurrentlyOpen ? "bg-green-500" : "bg-muted-foreground"
                              )} />
                              <span className="text-xs text-muted-foreground">
                                {isMapWindowCurrentlyOpen ? "Window Open" : "Window Closed"}
                              </span>
                            </div>
                            {currentRoute && (
                              <Badge variant="secondary" className="text-xs">
                                Route Ready
                              </Badge>
                            )}
                          </div>

                          {/* Window Controls */}
                          <div className="space-y-2">
                            {!isMapWindowCurrentlyOpen ? (
                              <Button
                                onClick={handleOpenMapWindow}
                                className="w-full automotive-button"
                                size="sm"
                                disabled={!TruckNavWindowManager.isPopupSupported()}
                                data-testid="button-open-map-window"
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open Map in New Window
                              </Button>
                            ) : (
                              <div className="space-y-2">
                                <Button
                                  onClick={handleFocusMapWindow}
                                  variant="outline"
                                  className="w-full automotive-button"
                                  size="sm"
                                  data-testid="button-focus-map-window"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Focus Map Window
                                </Button>
                                <Button
                                  onClick={handleCloseMapWindow}
                                  variant="destructive"
                                  className="w-full automotive-button"
                                  size="sm"
                                  data-testid="button-close-map-window"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Close Map Window
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Popup Blocked Warning */}
                          {!TruckNavWindowManager.isPopupSupported() && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 p-2 rounded border border-amber-200 dark:border-amber-800">
                              ⚠️ Popup windows may be blocked by your browser. Check popup settings if the map window doesn't open.
                            </div>
                          )}

                          {/* Auto-Expansion Info */}
                          {currentRoute && (
                            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                              💡 When you plan a new route, the map window will automatically expand and focus for optimal viewing.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}

              {activeSection === 'vehicle' && (
                <div className="p-4 space-y-4">
                  {/* Current Vehicle Profile */}
                  {selectedProfile ? (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center">
                          <Truck className="w-4 h-4 mr-2 text-primary" />
                          Current Vehicle
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="font-medium text-foreground">{selectedProfile.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatHeight(selectedProfile.height)} H × {formatHeight(selectedProfile.width)} W × {formatWeight(selectedProfile.weight || 0)}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => setShowProfileSetup(true)}
                            className="flex-1"
                            data-testid="button-edit-profile"
                          >
                            Edit Profile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed border-2">
                      <CardContent className="p-6 text-center">
                        <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-medium text-foreground mb-2">No Vehicle Profile</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Set up your vehicle profile for accurate routing
                        </p>
                        <Button
                          onClick={() => setShowProfileSetup(true)}
                          className="automotive-button"
                          data-testid="button-create-profile"
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Create Profile
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {activeSection === 'settings' && (
                <div className="p-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center">
                        <Settings className="w-4 h-4 mr-2 text-primary" />
                        App Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">
                            Language & Region
                          </label>
                          <CountryLanguageSelector />
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">
                            Measurement System
                          </label>
                          <MeasurementSelector />
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">
                            Legal Information
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleViewDisclaimer}
                            disabled={!hasAcceptedTerms}
                            className={cn(
                              "w-full justify-start h-auto p-3 automotive-button",
                              !hasAcceptedTerms && "opacity-50 cursor-not-allowed"
                            )}
                            data-testid="button-view-disclaimer"
                            aria-label={hasAcceptedTerms ? "View legal disclaimer and terms" : "Complete agreement first to view disclaimer"}
                          >
                            <Shield className="w-4 h-4 mr-3 text-primary" />
                            <div className="flex-1 text-left">
                              <div className="font-medium text-foreground">View Disclaimer</div>
                              <div className="text-xs text-muted-foreground">
                                {hasAcceptedTerms ? "Access legal terms and disclaimers" : "Complete agreement first"}
                              </div>
                            </div>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vehicle Profile Setup Modal */}
      {showProfileSetup && (
        <VehicleProfileSetup
          onClose={() => setShowProfileSetup(false)}
          onProfileCreated={handleProfileCreated}
          currentProfile={selectedProfile}
        />
      )}
      
      {/* Legal Disclaimer Dialog */}
      <LegalDisclaimerDialog
        open={isDisclaimerDialogOpen}
        onOpenChange={setIsDisclaimerDialogOpen}
      />
    </>
  );
});

export default NavigationSidebar;