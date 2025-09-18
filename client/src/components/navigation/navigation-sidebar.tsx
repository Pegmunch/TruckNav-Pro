import { useState, useEffect, memo, useMemo } from "react";
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
  Shield,
  FileText,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MessageSquare
} from "lucide-react";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
import { useVoiceCommands, type VoiceTranscript, type VoiceError } from "@/hooks/use-voice-commands";
import { useVoiceIntents, type IntentHandlers, type VoiceProcessingResult } from "@/hooks/use-voice-intents";
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
import HistoryFavoritesPanel from "@/components/navigation/history-favorites-panel";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import LegalNotices from "@/components/legal/legal-notices";

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
  const [isHistoryFavoritesOpen, setIsHistoryFavoritesOpen] = useState(false);
  const [isLegalPopupOpen, setIsLegalPopupOpen] = useState(false);
  const [isDisclaimerDialogOpen, setIsDisclaimerDialogOpen] = useState(false);
  const [isLegalNoticesOpen, setIsLegalNoticesOpen] = useState(false);
  const [showNavigationVoiceTranscript, setShowNavigationVoiceTranscript] = useState(false);
  const [lastNavigationVoiceCommand, setLastNavigationVoiceCommand] = useState<string>('');
  
  
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

  // Handle History & Favorites panel
  const handleToggleHistoryFavorites = () => {
    setIsHistoryFavoritesOpen(!isHistoryFavoritesOpen);
  };

  const handleCloseHistoryFavorites = () => {
    setIsHistoryFavoritesOpen(false);
  };

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

  // Legal Notices button handler with access control
  const handleViewLegalNotices = () => {
    if (!hasAcceptedTerms) {
      toast({
        title: "Access restricted",
        description: "Please complete agreement first",
        variant: "destructive",
      });
      return;
    }
    
    setIsLegalNoticesOpen(true);
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

  // Voice command handlers for navigation sidebar
  const navigationVoiceHandlers: IntentHandlers = {
    navigation: async (intent, entities) => {
      console.log('Navigation sidebar navigation intent:', intent.action, entities);
      
      if (intent.action === 'start_navigation') {
        await handleGoNavigation();
        setLastNavigationVoiceCommand('Started navigation');
      } else if (intent.action === 'stop_navigation') {
        if (isNavigating && onStopNavigation) {
          onStopNavigation();
          setLastNavigationVoiceCommand('Stopped navigation');
          toast({
            title: "Navigation stopped",
            description: "Navigation has been ended",
          });
        } else {
          toast({
            title: "Not navigating",
            description: "Navigation is not currently active",
            variant: "destructive"
          });
        }
      }
    },
    
    routing: async (intent, entities) => {
      console.log('Navigation sidebar routing intent:', intent.action, entities);
      
      if (intent.action === 'avoid_tolls') {
        setLastNavigationVoiceCommand('Avoiding tolls in route planning');
        toast({
          title: "Toll avoidance enabled",
          description: "Future routes will avoid toll roads",
        });
      } else if (intent.action === 'reroute') {
        setLastNavigationVoiceCommand('Recalculating route');
        if (currentRoute) {
          onPlanRoute();
          toast({
            title: "Recalculating route",
            description: "Finding new truck-safe route",
          });
        }
      }
    },
    
    search: async (intent, entities) => {
      console.log('Navigation sidebar search intent:', intent.action, entities);
      
      if (intent.action === 'find_nearest') {
        const poiEntity = entities.find(e => e.type === 'poi');
        if (poiEntity) {
          const facilityType = poiEntity.value;
          setLastNavigationVoiceCommand(`Finding nearest ${facilityType}`);
          toast({
            title: "Searching facilities",
            description: `Finding nearest ${facilityType}`,
          });
        }
      }
    },
    
    controls: async (intent, entities) => {
      console.log('Navigation sidebar controls intent:', intent.action, entities);
      
      if (intent.action === 'zoom_in') {
        setLastNavigationVoiceCommand('Zoomed in');
        toast({ title: "Zoomed in", description: "Map zoom increased" });
      } else if (intent.action === 'zoom_out') {
        setLastNavigationVoiceCommand('Zoomed out');
        toast({ title: "Zoomed out", description: "Map zoom decreased" });
      } else if (intent.action === 'mute') {
        setLastNavigationVoiceCommand('Audio muted');
        toast({ title: "Audio muted", description: "Navigation audio turned off" });
      } else if (intent.action === 'unmute') {
        setLastNavigationVoiceCommand('Audio unmuted');
        toast({ title: "Audio unmuted", description: "Navigation audio turned on" });
      }
    },
    
    settings: async (intent, entities) => {
      console.log('Navigation sidebar settings intent:', intent.action, entities);
      
      if (intent.action === 'change_theme') {
        const themeEntity = entities.find(e => e.type === 'theme');
        if (themeEntity) {
          const theme = themeEntity.value;
          setLastNavigationVoiceCommand(`Changed theme to ${theme}`);
          toast({
            title: "Theme changed",
            description: `Theme set to ${theme} mode`,
          });
        }
      }
    },
    
    traffic: async (intent, entities) => {
      console.log('Navigation sidebar traffic intent:', intent.action, entities);
      
      if (intent.action === 'show_traffic') {
        setLastNavigationVoiceCommand('Traffic display enabled');
        toast({ title: "Traffic shown", description: "Traffic conditions now displayed" });
      } else if (intent.action === 'hide_traffic') {
        setLastNavigationVoiceCommand('Traffic display disabled');
        toast({ title: "Traffic hidden", description: "Traffic conditions hidden" });
      }
    },
    
    unknown: async (intent, entities) => {
      setLastNavigationVoiceCommand(`Unrecognized: "${intent.originalText}"`);
      toast({
        title: "Command not recognized",
        description: "Try 'start navigation', 'zoom in', or 'find fuel station'",
        variant: "destructive"
      });
    }
  };
  
  // Memoize voice configuration to prevent hook order changes
  const voiceConfig = useMemo(() => ({
    interactionMode: 'toggle' as const,
    continuous: true,
    interimResults: true,
    enableDebugLogging: true
  }), []);
  
  const voiceIntentConfig = useMemo(() => ({
    minConfidence: 0.6,
    contextAware: true
  }), []);
  
  const voiceCallbacks = useMemo(() => ({
    onTranscriptUpdate: (transcript: VoiceTranscript) => {
      setShowNavigationVoiceTranscript(true);
      
      if (transcript.isFinal) {
        setTimeout(() => setShowNavigationVoiceTranscript(false), 3000);
      }
    },
    onIntentProcessed: (result: VoiceProcessingResult) => {
      console.log('Navigation intent processed:', result);
    },
    onError: (error: VoiceError) => {
      console.error('Navigation voice error:', error);
      toast({
        title: "Voice error",
        description: error.message,
        variant: "destructive"
      });
    }
  }), [toast]);

  // Initialize voice commands for navigation sidebar
  const navigationVoiceIntents = useVoiceIntents(navigationVoiceHandlers, voiceIntentConfig);
  
  const navigationVoiceCommands = useVoiceCommands(
    voiceConfig,
    voiceCallbacks,
    navigationVoiceHandlers
  );
  
  // Update voice context for navigation
  useEffect(() => {
    navigationVoiceIntents.updateContext({
      navigationState: isNavigating ? 'active' : 'idle',
      routeActive: !!currentRoute,
      hasVehicleProfile: !!selectedProfile,
      sidebarSection: activeSection
    });
  }, [isNavigating, currentRoute, selectedProfile, activeSection, navigationVoiceIntents]);

  return (
    <>
      {/* Persistent Hamburger Menu Button - Always Visible */}
      <Button
        onClick={onToggle}
        className={cn(
          "fixed top-4 left-4 z-[60] hamburger-menu-button bg-card border border-border hover:bg-accent hover:border-accent-foreground transition-all duration-300 ease-out",
          "min-h-[44px] min-w-[44px]", // Automotive-grade touch targets
          // Dynamic positioning based on sidebar state and screen size
          isOpen && !isCollapsed && "left-[calc(20rem+1rem)] lg:left-[calc(24rem+1rem)]", // Mobile: 320px + 16px, Desktop: 384px + 16px
          isOpen && isCollapsed && "left-[calc(4rem+1rem)]" // Collapsed: 64px + 16px
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
        "transition-all duration-300 ease-out", // Improved easing for smoother feel
        isCollapsed ? "w-16" : "w-80 lg:w-96",
        "shadow-lg lg:shadow-none",
        // Hide/show sidebar based on isOpen state
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0" // Always visible on desktop, slides in/out on mobile
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
            {/* Voice Control Button */}
            {!isCollapsed && (
              <VoiceMicButton
                state={navigationVoiceCommands.state}
                size="sm"
                onToggle={() => {
                  if (navigationVoiceCommands.state === 'idle') {
                    navigationVoiceCommands.startListening?.();
                  } else {
                    navigationVoiceCommands.stopListening?.();
                  }
                }}
                disabled={navigationVoiceCommands.isProcessing}
                className="shrink-0"
                data-testid="button-voice-navigation"
                aria-label="Voice commands for navigation"
              />
            )}
            
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
            
            {/* Voice Transcript Display */}
            {showNavigationVoiceTranscript && navigationVoiceCommands.currentTranscript && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Voice Command...</span>
                </div>
                <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  {navigationVoiceCommands.currentTranscript.interim || navigationVoiceCommands.currentTranscript.final}
                </div>
              </div>
            )}
            
            {/* Last Voice Command Feedback */}
            {lastNavigationVoiceCommand && !showNavigationVoiceTranscript && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                  <MessageSquare className="w-3 h-3" />
                  <span className="text-sm">{lastNavigationVoiceCommand}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLastNavigationVoiceCommand('')}
                    className="ml-auto h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
            
            {/* Voice Command Suggestions */}
            {navigationVoiceCommands.state === 'idle' && !navigationVoiceCommands.currentTranscript && !lastNavigationVoiceCommand && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Voice commands:</div>
                <div className="flex flex-wrap gap-1">
                  {['Start navigation', 'Zoom in', 'Find fuel station'].map((suggestion, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      "{suggestion}"
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Click mic or press spacebar to speak
                </div>
              </div>
            )}
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
            
            {/* History & Favorites Button - Collapsed Mode */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleHistoryFavorites}
              className="w-full automotive-button"
              data-testid="button-history-favorites-collapsed"
            >
              <History className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          /* Expanded Mode - Full Navigation */
          <div className="flex-1 overflow-y-auto touch-scroll">
            {/* Section Navigation */}
            <div className="p-4 border-b border-border">
              <div className="grid grid-cols-3 gap-2 mb-3">
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
              
              {/* History & Favorites Access Button */}
              <Button
                variant="outline"
                onClick={handleToggleHistoryFavorites}
                className="w-full automotive-text-sm justify-start"
                data-testid="button-history-favorites"
              >
                <History className="w-4 h-4 mr-2" />
                History & Favorites
                <ArrowRight className="w-3 h-3 ml-auto" />
              </Button>
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

              {/* Navigation Controls Section - Show when route is ready */}
              {currentRoute && !isNavigating && (
                <div className="p-4 border-t border-border bg-gradient-to-r from-primary/5 to-accent/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground flex items-center">
                      <Navigation className="w-4 h-4 text-primary mr-2" />
                      Navigation Controls
                    </h3>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      Ready
                    </Badge>
                  </div>
                  
                  {/* Start Navigation Button */}
                  <Button 
                    onClick={handleGoNavigation}
                    disabled={(!fromLocation || !toLocation) || !selectedProfile || isStartingJourney}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-lg font-semibold automotive-button shadow-lg"
                    data-testid="button-start-navigation"
                  >
                    {isStartingJourney ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                        Starting Navigation...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-5 h-5 mr-3" />
                        Start Navigation
                      </>
                    )}
                  </Button>
                  
                  {/* Prerequisites Check */}
                  {(!selectedProfile || !fromLocation || !toLocation) && (
                    <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="text-amber-800 dark:text-amber-200 text-sm">
                        {!selectedProfile && '• Vehicle profile required'}
                        {!fromLocation && '• Starting location required'}
                        {!toLocation && '• Destination required'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Active Navigation Controls - Show during navigation */}
              {isNavigating && (
                <div className="p-4 border-t border-border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground flex items-center">
                      <Navigation className="w-4 h-4 text-green-600 mr-2" />
                      Active Navigation
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        Navigating
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Stop Navigation Button */}
                  <Button 
                    onClick={onStopNavigation}
                    disabled={isCompletingJourney}
                    variant="destructive"
                    className="w-full h-12 text-base font-semibold automotive-button shadow-lg"
                    data-testid="button-stop-navigation"
                  >
                    {isCompletingJourney ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Ending Navigation...
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        End Navigation
                      </>
                    )}
                  </Button>
                  
                  {/* Navigation Status */}
                  <div className="mt-3 text-center text-sm text-green-700 dark:text-green-300">
                    TruckNav Pro is guiding your journey
                  </div>
                </div>
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
                            Theme & Appearance
                          </label>
                          <ThemeSelector 
                            size="default"
                            showLabels={true}
                            showGrayscale={true}
                            showColorSpectrum={true}
                            showAutoSettings={true}
                            showAutoStatus={true}
                            className="w-full"
                          />
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">
                            Legal Information
                          </label>
                          <div className="space-y-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsDisclaimerDialogOpen(true)}
                              disabled={!hasAcceptedTerms}
                              className={cn(
                                "w-full justify-start h-auto p-3 automotive-button",
                                !hasAcceptedTerms && "opacity-50 cursor-not-allowed"
                              )}
                              data-testid="button-legal-disclaimer"
                              aria-label={hasAcceptedTerms ? "View legal disclaimer and terms of service" : "Complete agreement first to view legal disclaimer"}
                            >
                              <Shield className="w-4 h-4 mr-3 text-primary" />
                              <div className="flex-1 text-left">
                                <div className="font-medium text-foreground">Legal Disclaimer</div>
                                <div className="text-xs text-muted-foreground">
                                  {hasAcceptedTerms ? "Terms of service and disclaimers" : "Complete agreement first"}
                                </div>
                              </div>
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleViewLegalNotices}
                              disabled={!hasAcceptedTerms}
                              className={cn(
                                "w-full justify-start h-auto p-3 automotive-button",
                                !hasAcceptedTerms && "opacity-50 cursor-not-allowed"
                              )}
                              data-testid="button-legal-notices"
                              aria-label={hasAcceptedTerms ? "View legal notices and copyright information" : "Complete agreement first to view legal notices"}
                            >
                              <FileText className="w-4 h-4 mr-3 text-blue-600" />
                              <div className="flex-1 text-left">
                                <div className="font-medium text-foreground">Legal Notices</div>
                                <div className="text-xs text-muted-foreground">
                                  {hasAcceptedTerms ? "Copyright, patents, and ownership" : "Complete agreement first"}
                                </div>
                              </div>
                            </Button>
                          </div>
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
      
      {/* Legal Notices Dialog */}
      <Dialog open={isLegalNoticesOpen} onOpenChange={setIsLegalNoticesOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] automotive-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Legal Notices & Copyright Information
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[80vh]">
            <div className="pr-4">
              <LegalNotices />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* History & Favorites Secondary Panel */}
      <HistoryFavoritesPanel
        isOpen={isHistoryFavoritesOpen}
        onClose={handleCloseHistoryFavorites}
        onFromLocationChange={onFromLocationChange}
        onToLocationChange={onToLocationChange}
        onStartNavigation={onStartNavigation}
        currentRoute={currentRoute}
      />
    </>
  );
});

export default NavigationSidebar;