/**
 * Entertainment Panel - Main container for TuneIn and MixCloud functionality
 * 
 * Automotive-optimized entertainment interface for truck navigation
 * Features large touch targets, voice control integration, and dark mode support
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Radio, 
  Music, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  SkipBack,
  SkipForward,
  Heart,
  Clock,
  Search,
  Loader2,
  Truck,
  Settings,
  Headphones,
  Podcast
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type EntertainmentStation, type EntertainmentPlaybackState, type EntertainmentPreset, type EntertainmentSettings } from "@shared/schema";
import { getAudioManager, type PlaybackStatus } from "@/lib/entertainment/audio-manager";
import TuneInBrowser from "./tunein-browser";
import MixCloudBrowser from "./mixcloud-browser";
import PlaybackControls from "./playback-controls";
import EntertainmentPresets from "./entertainment-presets";
import EntertainmentHistory from "./entertainment-history";

interface EntertainmentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const audioManager = getAudioManager({
  defaultVolume: 0.8,
  crossfadeEnabled: true,
  crossfadeDuration: 2,
  emergencyInterruptEnabled: true,
});

export default function EntertainmentPanel({
  isOpen,
  onClose,
  className
}: EntertainmentPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Component state
  const [activeTab, setActiveTab] = useState<'tunein' | 'mixcloud' | 'presets' | 'history'>('tunein');
  const [currentStation, setCurrentStation] = useState<EntertainmentStation | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    buffering: false,
    error: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Entertainment settings query
  const { data: settings } = useQuery({
    queryKey: ['/api/entertainment/settings'],
  });

  // Playback state query
  const { data: playbackState } = useQuery({
    queryKey: ['/api/entertainment/playback-state'],
    refetchInterval: 5000, // Update every 5 seconds
  });

  // Popular trucking stations query
  const { data: truckingStations, isLoading: loadingTruckingStations } = useQuery({
    queryKey: ['/api/entertainment/stations?trucking=true&limit=5'],
  });

  // Play station mutation
  const playStationMutation = useMutation({
    mutationFn: async (station: EntertainmentStation) => {
      await audioManager.loadStation(station);
      await audioManager.play();
      
      // Update playback state on server using proper apiRequest
      const response = await apiRequest('POST', '/api/entertainment/playback-state', {
        currentStationId: station.id,
        isPlaying: true,
        volume: playbackStatus.volume,
        playbackStartedAt: new Date(),
      });
      
      return response.json();
    },
    onSuccess: (_, station) => {
      setCurrentStation(station);
      queryClient.invalidateQueries({ queryKey: ['/api/entertainment/playback-state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/entertainment/history'] });
      
      toast({
        title: "Now Playing",
        description: `${station.name} - ${station.genre}`,
      });
    },
    onError: (error) => {
      console.error('Failed to play station:', error);
      toast({
        title: "Playback Error",
        description: error instanceof Error ? error.message : "Failed to start playback",
        variant: "destructive",
      });
    },
  });

  // Audio manager subscription
  useEffect(() => {
    const unsubscribe = audioManager.subscribe((status) => {
      setPlaybackStatus(status);
    });

    return unsubscribe;
  }, []);

  // Handle tab changes
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as typeof activeTab);
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  // Handle station selection
  const handleStationSelect = useCallback((station: EntertainmentStation) => {
    if (playStationMutation.isPending) return;
    playStationMutation.mutate(station);
  }, [playStationMutation]);

  // Handle playback controls
  const handlePlayPause = useCallback(async () => {
    try {
      if (playbackStatus.isPlaying) {
        audioManager.pause();
      } else if (currentStation) {
        await audioManager.resume();
      }
    } catch (error) {
      console.error('Playback control error:', error);
      toast({
        title: "Playback Error",
        description: "Failed to control playback",
        variant: "destructive",
      });
    }
  }, [playbackStatus.isPlaying, currentStation, toast]);

  const handleVolumeChange = useCallback((volume: number) => {
    audioManager.setVolume(volume);
  }, []);

  const handleEmergencyInterrupt = useCallback(() => {
    audioManager.emergencyInterrupt();
  }, []);

  // Quick access stations
  const quickAccessStations = useMemo(() => {
    if (!truckingStations) return [];
    return truckingStations.slice(0, 3);
  }, [truckingStations]);

  // Panel header with controls
  const renderHeader = () => (
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="automotive-touch-target">
            <Headphones className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="automotive-text-lg">Entertainment</CardTitle>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              TuneIn Radio & MixCloud
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="automotive-touch-target"
            data-testid="toggle-search"
          >
            <Search className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="automotive-touch-target"
            data-testid="close-entertainment"
          >
            ×
          </Button>
        </div>
      </div>

      {/* Quick access for trucking stations */}
      {quickAccessStations.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground dark:text-foreground">Quick Access</span>
          </div>
          <div className="flex gap-2">
            {quickAccessStations.map((station) => (
              <Button
                key={station.id}
                variant="outline"
                size="sm"
                onClick={() => handleStationSelect(station)}
                disabled={playStationMutation.isPending}
                className="automotive-button automotive-text-sm"
                data-testid={`quick-station-${station.id}`}
              >
                <Radio className="h-3 w-3 mr-1" />
                {station.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </CardHeader>
  );

  // Current playback display
  const renderCurrentPlayback = () => {
    if (!currentStation) return null;

    return (
      <div className="px-4 pb-3">
        <Card className="automotive-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {currentStation.artworkUrl ? (
                  <img
                    src={currentStation.artworkUrl}
                    alt={currentStation.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    {currentStation.platform === 'tunein' ? (
                      <SiTunein className="h-6 w-6 text-primary" />
                    ) : (
                      <SiMixcloud className="h-6 w-6 text-primary" />
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="automotive-text-base font-medium truncate text-foreground dark:text-foreground">
                  {currentStation.name}
                </h4>
                <p className="automotive-text-sm text-muted-foreground dark:text-muted-foreground truncate">
                  {currentStation.creator || currentStation.genre}
                </p>
                
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="scalable-badge">
                    {currentStation.platform}
                  </Badge>
                  {currentStation.isTruckingRelated && (
                    <Badge variant="outline" className="scalable-badge">
                      <Truck className="h-2 w-2 mr-1" />
                      Trucking
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {playbackStatus.error && (
              <div className="mt-2 p-2 bg-destructive/10 dark:bg-destructive/20 rounded-md">
                <p className="automotive-text-sm text-destructive dark:text-destructive">
                  {playbackStatus.error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Card className={cn("automotive-card", className)} data-testid="entertainment-panel">
      {renderHeader()}
      {renderCurrentPlayback()}

      <CardContent className="p-0">
        {/* Playback Controls */}
        <div className="px-4 pb-3">
          <PlaybackControls
            playbackStatus={playbackStatus}
            onPlayPause={handlePlayPause}
            onVolumeChange={handleVolumeChange}
            onEmergencyInterrupt={handleEmergencyInterrupt}
            disabled={!currentStation || playStationMutation.isPending}
          />
        </div>

        <Separator />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 automotive-button">
            <TabsTrigger 
              value="tunein" 
              className="automotive-text-sm"
              data-testid="tab-tunein"
            >
              <SiTunein className="h-4 w-4 mr-1" />
              TuneIn
            </TabsTrigger>
            <TabsTrigger 
              value="mixcloud" 
              className="automotive-text-sm"
              data-testid="tab-mixcloud"
            >
              <SiMixcloud className="h-4 w-4 mr-1" />
              MixCloud
            </TabsTrigger>
            <TabsTrigger 
              value="presets" 
              className="automotive-text-sm"
              data-testid="tab-presets"
            >
              <Heart className="h-4 w-4 mr-1" />
              Presets
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="automotive-text-sm"
              data-testid="tab-history"
            >
              <Clock className="h-4 w-4 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="tunein" className="mt-0">
              <TuneInBrowser
                onStationSelect={handleStationSelect}
                searchQuery={showSearch ? searchQuery : ''}
                onSearchChange={setSearchQuery}
                isLoading={playStationMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="mixcloud" className="mt-0">
              <MixCloudBrowser
                onContentSelect={handleStationSelect}
                searchQuery={showSearch ? searchQuery : ''}
                onSearchChange={setSearchQuery}
                isLoading={playStationMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="presets" className="mt-0">
              <EntertainmentPresets
                onStationSelect={handleStationSelect}
                currentStation={currentStation}
                isLoading={playStationMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <EntertainmentHistory
                onStationSelect={handleStationSelect}
                isLoading={playStationMutation.isPending}
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}