/**
 * TuneIn Browser - Browse and select TuneIn radio stations
 * 
 * Features trucking-specific stations, genre filtering, and search
 * Automotive-optimized interface with large touch targets
 */

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Radio, 
  Search, 
  Truck, 
  Globe, 
  Users, 
  Signal,
  Music,
  Mic,
  Newspaper,
  Trophy,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type EntertainmentStation } from "@shared/schema";

interface TuneInBrowserProps {
  onStationSelect: (station: EntertainmentStation) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
  className?: string;
}

// Mock TuneIn stations data (in real implementation, this would come from TuneIn API)
const mockTuneInStations: EntertainmentStation[] = [
  {
    id: "tunein-trucking-radio",
    platform: "tunein",
    type: "radio",
    externalId: "s100001",
    name: "Trucking Radio Network",
    description: "24/7 trucking news, weather, and traffic",
    genre: "Talk",
    creator: "TRN Broadcasting",
    streamUrl: "https://stream.trucking-radio.com/live",
    artworkUrl: null,
    websiteUrl: "https://trucking-radio.com",
    metadata: {},
    duration: null,
    language: "en",
    country: "US",
    bitrate: 128,
    format: "mp3",
    reliability: 95,
    listeners: 15000,
    playCount: 0,
    tags: ["trucking", "news", "weather", "traffic"],
    isTruckingRelated: true,
    isDrivingFriendly: true,
    isActive: true,
    lastVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "tunein-road-dog-live",
    platform: "tunein",
    type: "radio",
    externalId: "s100002",
    name: "Road Dog Live",
    description: "SiriusXM Road Dog Trucking Radio",
    genre: "Talk",
    creator: "SiriusXM",
    streamUrl: "https://stream.siriusxm.com/roaddog",
    artworkUrl: null,
    websiteUrl: "https://siriusxm.com",
    metadata: {},
    duration: null,
    language: "en",
    country: "US",
    bitrate: 128,
    format: "mp3",
    reliability: 98,
    listeners: 25000,
    playCount: 0,
    tags: ["trucking", "entertainment", "talk"],
    isTruckingRelated: true,
    isDrivingFriendly: true,
    isActive: true,
    lastVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "tunein-cnn-news",
    platform: "tunein",
    type: "radio",
    externalId: "s100003",
    name: "CNN News",
    description: "Breaking news and analysis",
    genre: "News",
    creator: "CNN",
    streamUrl: "https://stream.cnn.com/live",
    artworkUrl: null,
    websiteUrl: "https://cnn.com",
    metadata: {},
    duration: null,
    language: "en",
    country: "US",
    bitrate: 128,
    format: "mp3",
    reliability: 99,
    listeners: 45000,
    playCount: 0,
    tags: ["news", "politics", "breaking"],
    isTruckingRelated: false,
    isDrivingFriendly: true,
    isActive: true,
    lastVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "tunein-classic-rock",
    platform: "tunein",
    type: "radio",
    externalId: "s100004",
    name: "Classic Rock Highway",
    description: "The best classic rock for the road",
    genre: "Classic Rock",
    creator: "Highway Radio",
    streamUrl: "https://stream.highway-radio.com/classic",
    artworkUrl: null,
    websiteUrl: "https://highway-radio.com",
    metadata: {},
    duration: null,
    language: "en",
    country: "US",
    bitrate: 128,
    format: "mp3",
    reliability: 96,
    listeners: 12000,
    playCount: 0,
    tags: ["rock", "classic", "driving", "music"],
    isTruckingRelated: false,
    isDrivingFriendly: true,
    isActive: true,
    lastVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "tunein-weather-channel",
    platform: "tunein",
    type: "radio",
    externalId: "s100005",
    name: "Weather Channel Radio",
    description: "24/7 weather updates and forecasts",
    genre: "Weather",
    creator: "The Weather Channel",
    streamUrl: "https://stream.weather.com/radio",
    artworkUrl: null,
    websiteUrl: "https://weather.com",
    metadata: {},
    duration: null,
    language: "en",
    country: "US",
    bitrate: 128,
    format: "mp3",
    reliability: 97,
    listeners: 8000,
    playCount: 0,
    tags: ["weather", "forecast", "alerts"],
    isTruckingRelated: false,
    isDrivingFriendly: true,
    isActive: true,
    lastVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Genre categories with icons
const genreCategories = [
  { id: 'trucking', name: 'Trucking', icon: Truck, filter: (s: EntertainmentStation) => s.isTruckingRelated },
  { id: 'news', name: 'News', icon: Newspaper, filter: (s: EntertainmentStation) => s.genre.toLowerCase().includes('news') },
  { id: 'talk', name: 'Talk', icon: Mic, filter: (s: EntertainmentStation) => s.genre.toLowerCase().includes('talk') },
  { id: 'music', name: 'Music', icon: Music, filter: (s: EntertainmentStation) => s.genre.toLowerCase().includes('rock') || s.genre.toLowerCase().includes('music') },
  { id: 'sports', name: 'Sports', icon: Trophy, filter: (s: EntertainmentStation) => s.genre.toLowerCase().includes('sport') },
  { id: 'all', name: 'All', icon: Globe, filter: () => true },
];

export default function TuneInBrowser({
  onStationSelect,
  searchQuery = '',
  onSearchChange,
  isLoading = false,
  className
}: TuneInBrowserProps) {
  const [selectedGenre, setSelectedGenre] = useState('trucking');
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // TuneIn stations query (connected to backend API)
  const { data: stations, isLoading: isLoadingStations } = useQuery({
    queryKey: [`/api/entertainment/stations?platform=tunein&genre=${selectedGenre}&search=${localSearchQuery}`],
  });

  // Update local search when prop changes
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Filter stations based on genre and search
  const filteredStations = useMemo(() => {
    if (!stations) return [];

    const genreCategory = genreCategories.find(c => c.id === selectedGenre);
    let filtered = genreCategory ? stations.filter(genreCategory.filter) : stations;

    if (localSearchQuery.trim()) {
      const query = localSearchQuery.toLowerCase();
      filtered = filtered.filter(station => 
        station.name.toLowerCase().includes(query) ||
        station.description?.toLowerCase().includes(query) ||
        station.genre.toLowerCase().includes(query) ||
        station.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort by trucking-related first, then by listeners
    return filtered.sort((a, b) => {
      if (a.isTruckingRelated !== b.isTruckingRelated) {
        return a.isTruckingRelated ? -1 : 1;
      }
      return (b.listeners || 0) - (a.listeners || 0);
    });
  }, [stations, selectedGenre, localSearchQuery]);

  // Handle search input
  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value);
    onSearchChange?.(value);
  };

  // Render station item
  const renderStation = (station: EntertainmentStation) => (
    <Card 
      key={station.id} 
      className="automotive-card cursor-pointer hover:bg-accent/5 transition-colors"
      onClick={() => onStationSelect(station)}
      data-testid={`station-${station.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 automotive-touch-target">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radio className="h-6 w-6 text-primary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="automotive-text-base font-medium truncate">
                {station.name}
              </h4>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Signal className="h-3 w-3 text-muted-foreground" />
                <span className="automotive-text-xs text-muted-foreground">
                  {station.reliability}%
                </span>
              </div>
            </div>

            <p className="automotive-text-sm text-muted-foreground truncate">
              {station.description || station.genre}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="scalable-badge">
                {station.genre}
              </Badge>
              
              {station.isTruckingRelated && (
                <Badge variant="outline" className="scalable-badge">
                  <Truck className="h-2 w-2 mr-1" />
                  Trucking
                </Badge>
              )}

              {station.listeners && station.listeners > 1000 && (
                <Badge variant="outline" className="scalable-badge">
                  <Users className="h-2 w-2 mr-1" />
                  {station.listeners > 1000 ? `${Math.round(station.listeners / 1000)}k` : station.listeners}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-4", className)} data-testid="tunein-browser">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search TuneIn stations..."
          value={localSearchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="automotive-input pl-10"
          data-testid="input-search"
        />
      </div>

      {/* Genre Filter */}
      <div className="space-y-2">
        <h3 className="automotive-text-base font-medium">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {genreCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedGenre === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedGenre(category.id)}
                className="automotive-button automotive-text-sm"
                data-testid={`genre-${category.id}`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {category.name}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Stations List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="automotive-text-base font-medium">
            {genreCategories.find(c => c.id === selectedGenre)?.name} Stations
          </h3>
          <span className="automotive-text-sm text-muted-foreground">
            {filteredStations.length} stations
          </span>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoadingStations || isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStations.length > 0 ? (
            <div className="space-y-3">
              {filteredStations.map(renderStation)}
            </div>
          ) : (
            <div className="text-center py-8">
              <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="automotive-text-base text-muted-foreground">
                No stations found
              </p>
              <p className="automotive-text-sm text-muted-foreground">
                Try adjusting your search or category filter
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}