/**
 * Entertainment History - Recently played entertainment content
 * 
 * Shows listening history with play counts and completion rates
 * Automotive-optimized interface for easy access to recent content
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Radio,
  Music,
  Play,
  Calendar,
  Truck,
  RotateCcw,
  Trash2,
  Filter,
  Loader2,
  TrendingUp,
  User,
  Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { type EntertainmentStation, type EntertainmentHistory } from "@shared/schema";

interface EntertainmentHistoryProps {
  onStationSelect: (station: EntertainmentStation) => void;
  isLoading?: boolean;
  className?: string;
}

// History filter options
const historyFilters = [
  { id: 'all', name: 'All', icon: Clock },
  { id: 'today', name: 'Today', icon: Calendar },
  { id: 'trucking', name: 'Trucking', icon: Truck },
  { id: 'completed', name: 'Completed', icon: TrendingUp },
];

export default function EntertainmentHistory({
  onStationSelect,
  isLoading = false,
  className
}: EntertainmentHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Component state
  const [selectedFilter, setSelectedFilter] = useState('all');

  // History query
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['/api/entertainment/history'],
    queryFn: async () => {
      const response = await fetch('/api/entertainment/history?limit=50');
      if (!response.ok) throw new Error('Failed to fetch entertainment history');
      return response.json() as (EntertainmentHistory & { station: EntertainmentStation })[];
    },
  });

  // Clear history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/entertainment/history', {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to clear history');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/entertainment/history'] });
      // toast({
      //   title: "History Cleared",
      //   description: "Your entertainment history has been cleared.",
      // });
    },
    onError: (error) => {
      console.error('Failed to clear history:', error);
      // toast({
      //   title: "Error",
      //   description: "Failed to clear history. Please try again.",
      //   variant: "destructive",
      // });
    },
  });

  // Filter history based on selected filter
  const filteredHistory = useMemo(() => {
    if (!history) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (selectedFilter) {
      case 'today':
        return history.filter(item => new Date(item.playedAt) >= today);
      case 'trucking':
        return history.filter(item => item.station.isTruckingRelated);
      case 'completed':
        return history.filter(item => item.wasCompleted);
      default:
        return history;
    }
  }, [history, selectedFilter]);

  // Group history by date
  const groupedHistory = useMemo(() => {
    const groups: { [key: string]: (EntertainmentHistory & { station: EntertainmentStation })[] } = {};
    
    filteredHistory.forEach(item => {
      const date = new Date(item.playedAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  }, [filteredHistory]);

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    if (date >= today) return 'Today';
    if (date >= yesterday) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format duration
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
    
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Handle clear history
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your entertainment history?')) {
      clearHistoryMutation.mutate();
    }
  };

  // Render history item
  const renderHistoryItem = (item: EntertainmentHistory & { station: EntertainmentStation }) => (
    <Card 
      key={`${item.id}-${item.playedAt}`}
      className="automotive-card cursor-pointer hover:bg-accent/5 transition-colors"
      onClick={() => onStationSelect(item.station)}
      data-testid={`history-${item.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 automotive-touch-target">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {item.station.platform === 'tunein' ? (
                <Radio className="h-5 w-5 text-primary" />
              ) : (
                <Music className="h-5 w-5 text-primary" />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="automotive-text-base font-medium truncate">
                {item.station.name}
              </h4>
              
              <span className="automotive-text-xs text-muted-foreground flex-shrink-0">
                {formatTime(item.playedAt)}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="automotive-text-sm text-muted-foreground truncate">
                {item.station.creator || item.station.genre}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="scalable-badge">
                {item.station.platform}
              </Badge>
              
              {item.station.isTruckingRelated && (
                <Badge variant="outline" className="scalable-badge">
                  <Truck className="h-2 w-2 mr-1" />
                  Trucking
                </Badge>
              )}

              {item.wasCompleted && (
                <Badge variant="outline" className="scalable-badge text-green-600">
                  Completed
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3 automotive-text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(item.playDuration)}</span>
                </div>
                
                {item.volume && (
                  <div className="flex items-center gap-1">
                    <Volume2 className="h-3 w-3" />
                    <span>{Math.round(item.volume * 100)}%</span>
                  </div>
                )}
              </div>

              <span className="automotive-text-xs text-muted-foreground">
                {item.source === 'voice' ? 'Voice' : 
                 item.source === 'preset' ? 'Preset' : 'Manual'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-4", className)} data-testid="entertainment-history">
      {/* Header with Clear Button */}
      <div className="flex items-center justify-between">
        <h3 className="automotive-text-lg font-medium">Recently Played</h3>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearHistory}
          disabled={clearHistoryMutation.isPending || !history?.length}
          className="automotive-button automotive-text-sm text-destructive hover:text-destructive"
          data-testid="clear-history"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      {/* Filter Buttons */}
      <div className="space-y-2">
        <h4 className="automotive-text-base font-medium">Filter</h4>
        <div className="flex flex-wrap gap-2">
          {historyFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <Button
                key={filter.id}
                variant={selectedFilter === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(filter.id)}
                className="automotive-button automotive-text-sm"
                data-testid={`filter-${filter.id}`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {filter.name}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* History List */}
      <ScrollArea className="h-[400px]">
        {isLoadingHistory || isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groupedHistory.length > 0 ? (
          <div className="space-y-4">
            {groupedHistory.map(([date, items]) => (
              <div key={date} className="space-y-3">
                <h5 className="automotive-text-sm font-medium text-muted-foreground sticky top-0 bg-background py-1">
                  {formatDate(date)} ({items.length} {items.length === 1 ? 'item' : 'items'})
                </h5>
                
                <div className="space-y-2">
                  {items.map(renderHistoryItem)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="automotive-text-base text-muted-foreground">
              No history found
            </p>
            <p className="automotive-text-sm text-muted-foreground">
              {selectedFilter === 'all' 
                ? 'Start playing some content to build your history'
                : 'Try changing the filter to see more results'
              }
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Stats Summary */}
      {history && history.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 automotive-text-xs text-muted-foreground text-center">
            <div>
              <div className="font-medium">{history.length}</div>
              <div>Total Plays</div>
            </div>
            <div>
              <div className="font-medium">
                {history.filter(h => h.wasCompleted).length}
              </div>
              <div>Completed</div>
            </div>
            <div>
              <div className="font-medium">
                {history.filter(h => h.station.isTruckingRelated).length}
              </div>
              <div>Trucking Content</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}