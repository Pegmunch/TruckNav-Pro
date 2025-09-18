import { useState, memo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Truck, 
  MapPin, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Car,
  Coffee,
  Home,
  Bookmark,
  AlertTriangle,
  Fuel,
  Wrench,
  Smartphone,
  Gauge,
  Thermometer,
  Battery,
  Wifi,
  Shield,
  FileText,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  BarChart3,
  Calendar,
  Archive,
  Settings2,
  Users,
  Bell,
  Star,
  Map,
  ExternalLink
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { openFeatureWindow, getOpenWindowCount, type FeatureWindowType } from "@/lib/multi-window-manager";

interface FeaturesSidebarProps {
  // Sidebar state
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
}

// Memoized right sidebar component for automotive performance
const FeaturesSidebar = memo(function FeaturesSidebar({
  isOpen,
  onToggle,
  isCollapsed,
  onCollapseToggle,
}: FeaturesSidebarProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [openWindowCount, setOpenWindowCount] = useState(0);

  // Additional feature window sections (non-navigation features)
  const windowSections = [
    {
      id: 'entertainment' as const,
      title: 'Entertainment',
      icon: Star,
      badge: null,
      description: 'Music and media controls'
    },
    {
      id: 'history' as const,
      title: 'History',
      icon: Clock,
      badge: null,
      description: 'Route history and favorites'
    },
    {
      id: 'settings' as const,
      title: 'Settings',
      icon: Settings,
      badge: null,
      description: 'App preferences, themes, and configuration'
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
    toast({
      title: "Window Opened",
      description: `${featureType.charAt(0).toUpperCase() + featureType.slice(1)} window opened successfully.`,
    });
  };

  return (
    <>
      {/* Sidebar Tab Toggle Button */}
      <div
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ease-in-out",
          isOpen 
            ? (isCollapsed ? "right-16" : "right-80") 
            : "right-0"
        )}
      >
        <Button
          onClick={onToggle}
          variant="default"
          className={cn(
            "h-16 w-8 rounded-l-lg rounded-r-none px-0 py-0",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "border-l border-t border-b border-border shadow-lg",
            "automotive-touch-target flex flex-col items-center justify-center gap-1",
            "transform transition-all duration-300 ease-in-out",
            !isOpen && "hover:translate-x-[-4px]"
          )}
          data-testid="button-toggle-features-sidebar-tab"
        >
          <Star className="w-4 h-4" />
          <div className="text-xs font-medium leading-none">
            F
          </div>
        </Button>
      </div>

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-screen bg-background border-l border-border z-30 shadow-lg",
          "automotive-layout sidebar-transition",
          isOpen ? "translate-x-0" : "translate-x-full",
          isCollapsed ? "w-16" : "w-80",
          "flex flex-col"
        )}
        data-testid="features-sidebar"
      >
      {/* Header */}
      <div className="border-b border-border p-4 automotive-card">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold automotive-text-lg" data-testid="text-features-title">
                  Features
                </h2>
                <p className="text-xs text-muted-foreground">
                  Enhanced Controls
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onCollapseToggle}
              className="automotive-touch-target"
              data-testid="button-collapse-features-sidebar"
            >
              {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="automotive-touch-target"
              data-testid="button-close-features-sidebar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isCollapsed ? (
        /* Collapsed Mode - Icon Navigation */
        <div className="flex-1 p-2 space-y-2">
          {windowSections.map((section) => (
            <Button
              key={section.id}
              variant="ghost"
              size="icon"
              onClick={() => handleOpenWindow(section.id)}
              className="w-full automotive-button relative"
              data-testid={`button-open-${section.id}-window-collapsed`}
            >
              <section.icon className="w-5 h-5" />
              <ExternalLink className="absolute -top-1 -right-1 w-3 h-3 text-primary" />
            </Button>
          ))}
        </div>
      ) : (
        /* Expanded Mode - Window Management Dashboard */
        <div className="flex-1 overflow-y-auto touch-scroll">
          {/* Window Status Header */}
          <div className="p-4 border-b border-border">
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
              </CardContent>
            </Card>
          </div>

          {/* Window Grid */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-1">
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
                            variant="secondary" 
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
              
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
    </>
  );
});

export default FeaturesSidebar;