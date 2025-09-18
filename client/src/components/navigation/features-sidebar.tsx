import { useState, memo } from "react";
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
  Gas,
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
  Map
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [activeSection, setActiveSection] = useState<'monitoring' | 'services' | 'reports' | 'preferences'>('monitoring');

  // Automotive-optimized sidebar sections for the right panel
  const sidebarSections = [
    {
      id: 'monitoring' as const,
      title: 'Vehicle Monitoring',
      icon: Gauge,
      badge: 'Live',
      description: 'Real-time vehicle diagnostics and performance',
    },
    {
      id: 'services' as const,
      title: 'Fleet Services', 
      icon: Wrench,
      badge: '3 Available',
      description: 'Maintenance scheduling and service locations',
    },
    {
      id: 'reports' as const,
      title: 'Analytics & Reports',
      icon: BarChart3,
      badge: null,
      description: 'Performance insights and route analytics',
    },
    {
      id: 'preferences' as const,
      title: 'Driver Preferences',
      icon: Settings2,
      badge: null,
      description: 'Personal settings and customization',
    },
  ];

  // Handle section selection with toast feedback
  const handleSectionChange = (sectionId: typeof activeSection) => {
    setActiveSection(sectionId);
    const section = sidebarSections.find(s => s.id === sectionId);
    if (section) {
      toast({
        title: `${section.title} Selected`,
        description: section.description,
      });
    }
  };

  // Show placeholder interaction toast
  const handlePlaceholderAction = (action: string) => {
    toast({
      title: "Feature Placeholder",
      description: `${action} functionality will be implemented here.`,
    });
  };

  return (
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
          {sidebarSections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? "default" : "ghost"}
              size="icon"
              onClick={() => handleSectionChange(section.id)}
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
        /* Expanded Mode - Full Feature Panel */
        <div className="flex-1 overflow-y-auto touch-scroll">
          {/* Section Navigation */}
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-1 gap-2">
              {sidebarSections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "default" : "outline"}
                  onClick={() => handleSectionChange(section.id)}
                  className="automotive-text-sm relative justify-start"
                  data-testid={`button-section-${section.id}`}
                >
                  <section.icon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{section.title.split(' ')[0]}</span>
                  {section.badge && (
                    <Badge 
                      variant={activeSection === section.id ? "secondary" : "outline"} 
                      className="ml-auto mobile-text-xs"
                    >
                      {section.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Section Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              
              {/* Vehicle Monitoring Section */}
              {activeSection === 'monitoring' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold automotive-text-lg mb-2 text-foreground">
                      Vehicle Health
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Real-time diagnostics and performance monitoring for your vehicle.
                    </p>
                  </div>

                  {/* Engine Status Card */}
                  <Card className="automotive-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center">
                        <Gauge className="w-4 h-4 mr-2 text-green-600" />
                        Engine Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-sm font-medium">RPM</span>
                          </div>
                          <div className="text-lg font-bold text-green-700 dark:text-green-300">1,850</div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center space-x-2">
                            <Thermometer className="w-3 h-3 text-blue-600" />
                            <span className="text-sm font-medium">Temp</span>
                          </div>
                          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">92°C</div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handlePlaceholderAction("View detailed engine diagnostics")}
                        variant="outline"
                        size="sm"
                        className="w-full automotive-button"
                        data-testid="button-engine-details"
                      >
                        View Full Diagnostics
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Fleet Services Section */}
              {activeSection === 'services' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold automotive-text-lg mb-2 text-foreground">
                      Fleet Services
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Maintenance scheduling, service locations, and fleet management tools.
                    </p>
                  </div>

                  {/* Maintenance Schedule Card */}
                  <Card className="automotive-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-primary" />
                        Maintenance Schedule
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-amber-800 dark:text-amber-300">Oil Change Due</div>
                            <div className="text-sm text-amber-600 dark:text-amber-400">In 2,300 km</div>
                          </div>
                          <Badge variant="outline" className="text-amber-700 border-amber-300">
                            Soon
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => handlePlaceholderAction("Schedule maintenance appointment")}
                        className="w-full automotive-button"
                        data-testid="button-schedule-maintenance"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Schedule Service
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Analytics & Reports Section */}
              {activeSection === 'reports' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold automotive-text-lg mb-2 text-foreground">
                      Analytics & Reports
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Performance insights, route efficiency, and driving analytics.
                    </p>
                  </div>

                  {/* Route Statistics Card */}
                  <Card className="automotive-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2 text-primary" />
                        Today's Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="text-lg font-bold text-foreground">247 km</div>
                          <div className="text-xs text-muted-foreground">Distance</div>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="text-lg font-bold text-foreground">4h 23m</div>
                          <div className="text-xs text-muted-foreground">Drive Time</div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handlePlaceholderAction("View detailed performance report")}
                        variant="outline"
                        size="sm"
                        className="w-full automotive-button"
                        data-testid="button-view-report"
                      >
                        View Full Report
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Driver Preferences Section */}
              {activeSection === 'preferences' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold automotive-text-lg mb-2 text-foreground">
                      Driver Preferences
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Personalize your driving experience and interface settings.
                    </p>
                  </div>

                  {/* Quick Settings Card */}
                  <Card className="automotive-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center">
                        <Settings2 className="w-4 h-4 mr-2 text-primary" />
                        Quick Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Button
                          onClick={() => handlePlaceholderAction("Configure voice commands")}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          data-testid="button-voice-settings"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Voice Commands
                        </Button>
                        <Button
                          onClick={() => handlePlaceholderAction("Configure security settings")}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          data-testid="button-security-settings"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Security Settings
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
});

export default FeaturesSidebar;