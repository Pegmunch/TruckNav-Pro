import { useState, memo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  History,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Play,
  ChevronDown,
  ChevronRight,
  Clock,
  ArrowLeft,
  Route as RouteIcon,
  X
} from "lucide-react";
import { type Route as RouteType, type Journey } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HistoryFavoritesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onStartNavigation: () => void;
  currentRoute: RouteType | null;
  className?: string;
}

const HistoryFavoritesPanel = memo(function HistoryFavoritesPanel({
  isOpen,
  onClose,
  onFromLocationChange,
  onToLocationChange,
  onStartNavigation,
  currentRoute,
  className
}: HistoryFavoritesPanelProps) {
  const [favoritesExpanded, setFavoritesExpanded] = useState(false);
  const [saveRouteDialogOpen, setSaveRouteDialogOpen] = useState(false);
  const [routeName, setRouteName] = useState("");
  const { formatDistance } = useMeasurement();
  const { toast } = useToast();

  // Memoized duration formatting to prevent recalculation
  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, []);

  // Journey History
  const { data: lastJourney, isLoading: isLoadingLastJourney } = useQuery<Journey | null>({
    queryKey: ["/api/journeys", "last"],
    queryFn: () => fetch("/api/journeys/last", { credentials: "include" }).then(res => {
      if (res.status === 404) return null;
      return res.json();
    }),
    retry: false,
  });

  // Get last journey route details
  const { data: lastJourneyRoute } = useQuery<RouteType>({
    queryKey: ["/api/routes", lastJourney?.routeId],
    queryFn: () => fetch(`/api/routes/${lastJourney?.routeId}`, { credentials: "include" }).then(res => res.json()),
    enabled: !!lastJourney?.routeId,
  });

  // Route Favorites
  const { data: favoriteRoutes = [], isLoading: isLoadingFavorites } = useQuery<RouteType[]>({
    queryKey: ["/api/routes", "favorites"],
    queryFn: () => fetch("/api/routes/favorites", { credentials: "include" }).then(res => res.json()),
  });

  // Save current route as favorite mutation
  const saveRouteMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!currentRoute) throw new Error("No route to save");
      const routeData = { ...currentRoute, name, isFavorite: true };
      const response = await apiRequest("POST", "/api/routes", routeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes", "favorites"] });
      toast({
        title: "Route saved",
        description: "Route has been added to your favorites",
      });
      setSaveRouteDialogOpen(false);
      setRouteName("");
    },
    onError: (error) => {
      toast({
        title: "Error saving route",
        description: error instanceof Error ? error.message : "Failed to save route",
        variant: "destructive",
      });
    },
  });

  // Toggle route favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ routeId, isFavorite }: { routeId: string; isFavorite: boolean }) => {
      const response = await apiRequest("PATCH", `/api/routes/${routeId}/favorite`, { isFavorite });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes", "favorites"] });
    },
  });

  // Resume journey mutation
  const resumeJourneyMutation = useMutation({
    mutationFn: async (routeId: string) => {
      const response = await apiRequest("POST", "/api/journeys/start", { routeId });
      return response.json();
    },
    onSuccess: (journey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      toast({
        title: "Journey resumed",
        description: "Navigation has been restarted",
      });
      // Call the navigation start handler if available
      if (lastJourneyRoute) {
        onStartNavigation();
      }
    },
    onError: (error) => {
      toast({
        title: "Error resuming journey",
        description: error instanceof Error ? error.message : "Failed to resume journey",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const handleLoadFavoriteRoute = useCallback((route: RouteType) => {
    onFromLocationChange(route.startLocation);
    onToLocationChange(route.endLocation);
    toast({
      title: "Route loaded",
      description: `Loaded ${route.name || 'favorite route'}`,
    });
  }, [onFromLocationChange, onToLocationChange, toast]);

  const handleSaveCurrentRoute = useCallback(() => {
    if (!currentRoute) {
      toast({
        title: "No route to save",
        description: "Please plan a route first",
        variant: "destructive",
      });
      return;
    }
    setSaveRouteDialogOpen(true);
  }, [currentRoute, toast]);

  // Helper functions
  const formatTimeAgo = useCallback((date: Date | string) => {
    const now = new Date();
    const journeyDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - journeyDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just started";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 1) return "Less than an hour ago";
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  }, []);

  const getJourneyStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'planned': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }, []);

  return (
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden overlay-safe-mode:bg-transparent overlay-safe-mode:pointer-events-none" 
          onClick={onClose}
          data-testid="history-favorites-backdrop"
        />
      )}
      
      {/* Secondary Panel */}
      <div className={cn(
        "fixed lg:absolute top-0 right-0 h-full w-80 lg:w-96 bg-card border-l border-border z-50 flex flex-col",
        "transform transition-transform duration-300 ease-in-out",
        "shadow-2xl lg:shadow-lg",
        isOpen ? "translate-x-0" : "translate-x-full",
        className
      )}>
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="automotive-button"
              data-testid="button-close-history-favorites"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="mobile-text-lg font-bold text-foreground">History & Favorites</h2>
              <p className="mobile-text-sm text-muted-foreground">Your journeys and saved routes</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden automotive-button"
            data-testid="button-close-history-favorites-mobile"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto touch-scroll">
          {/* Journey History Section */}
          {(lastJourney || isLoadingLastJourney) && (
            <div className="p-4 border-b border-border">
              <h4 className="font-medium text-foreground mb-3 flex items-center">
                <History className="w-4 h-4 text-primary mr-2" />
                Last Journey
              </h4>
              {isLoadingLastJourney ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ) : lastJourney && lastJourneyRoute ? (
                <Card className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-foreground text-sm">
                        {lastJourneyRoute.startLocation} → {lastJourneyRoute.endLocation}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistance(lastJourneyRoute.distance || 0, "miles")} • {formatDuration(lastJourneyRoute.duration || 0)} • {formatTimeAgo(lastJourney.startedAt)}
                      </div>
                    </div>
                    <Badge 
                      className={`text-xs ${getJourneyStatusColor(lastJourney.status)}`}
                      data-testid="badge-journey-status"
                    >
                      {lastJourney.status}
                    </Badge>
                  </div>
                  {lastJourney.status === 'planned' || lastJourney.status === 'active' ? (
                    <Button
                      size="sm"
                      onClick={() => resumeJourneyMutation.mutate(lastJourney.routeId)}
                      disabled={resumeJourneyMutation.isPending}
                      className="w-full mt-2"
                      data-testid="button-resume-journey"
                    >
                      <Play className="w-3 h-3 mr-2" />
                      {resumeJourneyMutation.isPending ? "Resuming..." : "Resume Journey"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadFavoriteRoute(lastJourneyRoute)}
                      className="w-full mt-2"
                      data-testid="button-repeat-journey"
                    >
                      <RouteIcon className="w-3 h-3 mr-2" />
                      Repeat Journey
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent journeys</p>
                </div>
              )}
            </div>
          )}

          {/* Route Favorites Section */}
          <div className="border-b border-border">
            <div className="p-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-foreground flex items-center">
                  <Bookmark className="w-4 h-4 text-primary mr-2" />
                  Route Favorites
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveCurrentRoute}
                  disabled={!currentRoute || saveRouteMutation.isPending}
                  data-testid="button-save-route"
                >
                  <BookmarkPlus className="w-3 h-3 mr-1" />
                  Save Route
                </Button>
              </div>

              {/* Save Route Dialog */}
              {saveRouteDialogOpen && (
                <Card className="p-3 mb-3 bg-accent/5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Route Name</label>
                    <input
                      type="text"
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      placeholder="Enter route name..."
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                      data-testid="input-route-name"
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => saveRouteMutation.mutate(routeName)}
                        disabled={!routeName.trim() || saveRouteMutation.isPending}
                        data-testid="button-confirm-save"
                      >
                        {saveRouteMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSaveRouteDialogOpen(false);
                          setRouteName("");
                        }}
                        data-testid="button-cancel-save"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Favorites List */}
              {isLoadingFavorites ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : favoriteRoutes.length > 0 ? (
                <div className="space-y-2">
                  {favoriteRoutes.slice(0, favoritesExpanded ? favoriteRoutes.length : 3).map((route: RouteType) => (
                    <Card 
                      key={route.id} 
                      className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleLoadFavoriteRoute(route)}
                      data-testid={`favorite-route-${route.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-foreground text-sm">
                            {route.name || `${route.startLocation} → ${route.endLocation}`}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {route.startLocation} → {route.endLocation}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistance(route.distance || 0, "miles")} • {formatDuration(route.duration || 0)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteMutation.mutate({
                              routeId: route.id,
                              isFavorite: false
                            });
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          data-testid={`button-remove-favorite-${route.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  
                  {favoriteRoutes.length > 3 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                      className="w-full justify-center"
                      data-testid="button-toggle-favorites"
                    >
                      {favoritesExpanded ? (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-3 h-3 mr-1" />
                          Show All ({favoriteRoutes.length})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No saved routes</p>
                  <p className="text-xs">Save your planned routes for quick access</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default HistoryFavoritesPanel;