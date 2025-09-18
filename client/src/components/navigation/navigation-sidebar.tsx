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
  MessageSquare,
  Music,
  Radio,
  Headphones,
  Loader2,
  Square
} from "lucide-react";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
import { useVoiceCommands, type VoiceTranscript, type VoiceError } from "@/hooks/use-voice-commands";
import { useVoiceIntents, type IntentHandlers, type VoiceProcessingResult } from "@/hooks/use-voice-intents";
import ManualSearchPanel from "./manual-search-panel";
import { openFeatureWindow, getOpenWindowCount, type FeatureWindowType } from "@/lib/multi-window-manager";
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
import EntertainmentPanel from "@/components/entertainment/entertainment-panel";
import { getAudioManager } from "@/lib/entertainment/audio-manager";

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
  const [openWindowCount, setOpenWindowCount] = useState(0);
  const [isHistoryFavoritesOpen, setIsHistoryFavoritesOpen] = useState(false);
  const [isLegalPopupOpen, setIsLegalPopupOpen] = useState(false);
  const [isDisclaimerDialogOpen, setIsDisclaimerDialogOpen] = useState(false);
  const [isLegalNoticesOpen, setIsLegalNoticesOpen] = useState(false);
  const [showNavigationVoiceTranscript, setShowNavigationVoiceTranscript] = useState(false);
  const [lastNavigationVoiceCommand, setLastNavigationVoiceCommand] = useState<string>('');
  const [isEntertainmentPanelOpen, setIsEntertainmentPanelOpen] = useState(false);
  
  
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

  // Core navigation window sections (focused on navigation essentials)
  const windowSections = [
    {
      id: 'route' as const,
      title: 'Route Planning',
      icon: RouteIcon,
      badge: currentRoute ? 'Planned' : null,
      description: 'Plan routes with manual search'
    },
    {
      id: 'vehicle' as const,
      title: 'Vehicle Profile',
      icon: Truck,
      badge: selectedProfile ? 'Set' : 'Required',
      description: 'Manage truck specifications'
    },
  ];

  // Update window count periodically
  useEffect(() => {
    const updateCount = () => {
      setOpenWindowCount(getOpenWindowCount());
    };
    
    updateCount();
    const interval = setInterval(updateCount, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle opening feature windows
  const handleOpenWindow = (featureType: FeatureWindowType) => {
    if (getOpenWindowCount() >= 10) {
      toast({
        title: "Window Limit Reached",
        description: "Maximum of 10 windows can be open at once. Please close some windows first.",
        variant: "destructive",
      });
      return;
    }
    openFeatureWindow(featureType);
  };

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


  // Voice command handlers for navigation sidebar
  const navigationVoiceHandlers: IntentHandlers = {
    navigation: async (intent, entities) => {
      console.log('Navigation sidebar navigation intent:', intent.action, entities);
      
      if (intent.action === 'start_navigation') {
        // Use same validation logic as button version
        const isReadyToGo = fromLocation && toLocation && selectedProfile;
        const canStartNavigation = isReadyToGo && currentRoute && !isNavigating;
        
        if (!canStartNavigation) {
          if (!selectedProfile) {
            setLastNavigationVoiceCommand('Vehicle profile required');
            toast({
              title: "Vehicle profile required",
              description: "Please set up your vehicle profile before starting navigation.",
              variant: "destructive",
            });
            return;
          }
          
          if (!fromLocation || !toLocation) {
            setLastNavigationVoiceCommand('Locations required');
            toast({
              title: "Locations required",
              description: "Please set both starting point and destination.",
              variant: "destructive",
            });
            return;
          }
          
          if (!currentRoute) {
            // Try to plan route first
            setLastNavigationVoiceCommand('Planning route first');
            onPlanRoute();
            toast({
              title: "Planning route",
              description: "Calculating truck-safe route before navigation.",
            });
            return;
          }
          
          if (isNavigating) {
            setLastNavigationVoiceCommand('Navigation already active');
            toast({
              title: "Already navigating",
              description: "Navigation is currently active.",
              variant: "destructive",
            });
            return;
          }
        }

        try {
          // Start navigation
          onStartNavigation();
          
          // Open map window automatically
          await handleOpenMapWindow();
          
          setLastNavigationVoiceCommand('Navigation started - map window opened');
          toast({
            title: "Navigation started",
            description: "TruckNav Pro is now guiding your journey.",
          });
        } catch (error) {
          console.error('Failed to start navigation via voice:', error);
          setLastNavigationVoiceCommand('Failed to start navigation');
          toast({
            title: "Failed to start navigation",
            description: "There was an error starting navigation. Please try again.",
            variant: "destructive",
          });
        }
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
    
    entertainment: async (intent, entities) => {
      console.log('Navigation sidebar entertainment intent:', intent.action, entities);
      
      const audioManager = getAudioManager();
      const playbackStatus = audioManager.getPlaybackStatus();
      
      if (intent.action === 'play_music' || intent.action === 'start_music') {
        handleOpenWindow('entertainment');
        setLastNavigationVoiceCommand('Opening entertainment panel');
        toast({
          title: "Entertainment opened",
          description: "Entertainment panel is now active",
        });
      } else if (intent.action === 'play_radio') {
        handleOpenWindow('entertainment');
        setLastNavigationVoiceCommand('Opening radio stations');
        toast({
          title: "Radio stations",
          description: "Browse available radio stations",
        });
      } else if (intent.action === 'volume_up') {
        const newVolume = Math.min(1.0, playbackStatus.volume + 0.1);
        audioManager.setVolume(newVolume);
        setLastNavigationVoiceCommand(`Volume increased to ${Math.round(newVolume * 100)}%`);
        toast({ 
          title: "Volume up", 
          description: `Entertainment volume: ${Math.round(newVolume * 100)}%` 
        });
      } else if (intent.action === 'volume_down') {
        const newVolume = Math.max(0.0, playbackStatus.volume - 0.1);
        audioManager.setVolume(newVolume);
        setLastNavigationVoiceCommand(`Volume decreased to ${Math.round(newVolume * 100)}%`);
        toast({ 
          title: "Volume down", 
          description: `Entertainment volume: ${Math.round(newVolume * 100)}%` 
        });
      } else if (intent.action === 'pause_music' || intent.action === 'stop_music') {
        try {
          audioManager.pause();
          setLastNavigationVoiceCommand('Music paused');
          toast({ title: "Music paused", description: "Entertainment playback paused" });
        } catch (error) {
          setLastNavigationVoiceCommand('No music playing');
          toast({ 
            title: "No music playing", 
            description: "Start playing a station first",
            variant: "destructive" 
          });
        }
      } else if (intent.action === 'resume_music') {
        try {
          audioManager.resume();
          setLastNavigationVoiceCommand('Music resumed');
          toast({ title: "Music resumed", description: "Entertainment playback resumed" });
        } catch (error) {
          setLastNavigationVoiceCommand('No music to resume');
          toast({ 
            title: "No music to resume", 
            description: "Start playing a station first",
            variant: "destructive" 
          });
        }
      } else if (intent.action === 'next_track') {
        // Emit next track event for station navigation
        window.dispatchEvent(new CustomEvent('audio-next', { detail: { source: 'voice' } }));
        setLastNavigationVoiceCommand('Next track requested');
        toast({ title: "Next track", description: "Switching to next station" });
      } else if (intent.action === 'previous_track') {
        // Emit previous track event for station navigation
        window.dispatchEvent(new CustomEvent('audio-previous', { detail: { source: 'voice' } }));
        setLastNavigationVoiceCommand('Previous track requested');
        toast({ title: "Previous track", description: "Switching to previous station" });
      }
    },

    unknown: async (intent, entities) => {
      setLastNavigationVoiceCommand(`Unrecognized: "${intent.originalText}"`);
      toast({
        title: "Command not recognized",
        description: "Try 'start navigation', 'play music', 'zoom in', or 'find fuel station'",
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
      navigationState: isNavigating ? 'navigating' : 'idle',
      routeActive: !!currentRoute,
      hasVehicleProfile: !!selectedProfile
    });
  }, [isNavigating, currentRoute, selectedProfile, openWindowCount, navigationVoiceIntents]);

  return (
    <>
      {/* Sidebar Toggle Button - Always visible when sidebar is closed */}
      {!isOpen && (
        <div className="fixed top-1/3 left-0 z-40 transform -translate-y-1/2">
          <Button
            onClick={onToggle}
            variant="default"
            className={cn(
              "h-16 w-8 rounded-l-none rounded-r-lg px-0 py-0",
              "bg-primary hover:bg-primary/90 text-primary-foreground",
              "border border-border shadow-lg",
              "scalable-control-button flex flex-col items-center justify-center gap-1",
              "transition-all duration-300 ease-in-out hover:scale-105"
            )}
            data-testid="button-toggle-navigation-sidebar-tab"
          >
            <Menu className="w-4 h-4" />
            <div className="text-xs font-medium leading-none">
              NAV
            </div>
          </Button>
        </div>
      )}

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
        // Hide/show sidebar based on isOpen state - hidden by default on all screen sizes
        isOpen ? "translate-x-0" : "-translate-x-full"
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
            {windowSections.map((section) => (
              <Button
                key={section.id}
                variant="outline"
                size="icon"
                onClick={() => handleOpenWindow(section.id as FeatureWindowType)}
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
              <div className="grid grid-cols-2 gap-2 mb-3">
                {windowSections.map((section) => (
                  <Button
                    key={section.id}
                    variant="outline"
                    onClick={() => handleOpenWindow(section.id as FeatureWindowType)}
                    className="automotive-text-sm relative"
                    data-testid={`button-section-${section.id}`}
                  >
                    <section.icon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{section.title.split(' ')[0]}</span>
                    {section.badge && (
                      <Badge 
                        variant="outline" 
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

              {/* Window Management Dashboard */}
              <div className="p-4 space-y-4">
                {/* Window Status Header */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center">
                        <ExternalLink className="w-4 h-4 mr-2 text-primary" />
                        Feature Windows
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {openWindowCount}/10 open
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mb-4">
                      Open dedicated windows for focused work on each feature.
                    </div>
                    
                    {/* Window Grid */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {windowSections.map((section) => {
                        const Icon = section.icon;
                        return (
                          <div key={section.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                                <div>
                                  <div className="font-medium text-sm">{section.title}</div>
                                  <div className="text-xs text-muted-foreground">{section.description}</div>
                                </div>
                              </div>
                              {section.badge && (
                                <Badge 
                                  variant={section.badge === 'Required' ? 'destructive' : 'secondary'} 
                                  className="text-xs"
                                >
                                  {section.badge}
                                </Badge>
                              )}
                            </div>
                            
                            <Button
                              onClick={() => handleOpenWindow(section.id)}
                              variant="outline"
                              size="sm"
                              className="w-full automotive-button"
                              data-testid={`button-open-${section.id}-window`}
                            >
                              <ExternalLink className="w-3 h-3 mr-2" />
                              Open {section.title}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm font-medium mb-2">Quick Actions</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowProfileSetup(true)}
                            className="text-xs h-8"
                            data-testid="button-edit-profile-quick"
                          >
                            <Truck className="w-3 h-3 mr-1" />
                            Edit Vehicle
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsDisclaimerDialogOpen(true)}
                          className="text-xs h-8"
                          data-testid="button-legal-quick"
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          Legal
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsLegalNoticesOpen(true)}
                          className="text-xs h-8"
                          data-testid="button-notices-quick"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Notices
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Current Status Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Car className="w-4 h-4 mr-2 text-primary" />
                      Navigation Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Vehicle Status */}
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center space-x-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            selectedProfile ? "bg-green-500" : "bg-red-500"
                          )} />
                          <span className="text-sm font-medium">
                            {selectedProfile ? selectedProfile.name : "No Vehicle Profile"}
                          </span>
                        </div>
                        {!selectedProfile && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenWindow('vehicle')}
                            className="text-xs h-6"
                          >
                            Setup
                          </Button>
                        )}
                      </div>
                      
                      {/* Route Status */}
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center space-x-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            currentRoute ? "bg-green-500" : "bg-yellow-500"
                          )} />
                          <span className="text-sm font-medium">
                            {currentRoute ? "Route Planned" : "No Route"}
                          </span>
                        </div>
                        {!currentRoute && fromLocation && toLocation && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenWindow('route')}
                            className="text-xs h-6"
                          >
                            Plan
                          </Button>
                        )}
                      </div>
                      
                      {/* Navigation Status */}
                      {isNavigating && (
                        <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              Navigation Active
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleOpenMapWindow}
                            className="text-xs h-6"
                          >
                            View Map
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
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