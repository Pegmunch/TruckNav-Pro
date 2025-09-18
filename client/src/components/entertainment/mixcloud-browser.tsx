/**
 * MixCloud Browser - Browse and select MixCloud music mixes and podcasts
 * 
 * Features driving-friendly content, genre filtering, and search
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
  Music, 
  Search, 
  Clock, 
  PlayCircle, 
  Headphones,
  TrendingUp,
  Car,
  Loader2,
  User,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type EntertainmentStation } from "@shared/schema";

interface MixCloudBrowserProps {
  onContentSelect: (content: EntertainmentStation) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
  className?: string;
}

// Mock MixCloud content data (in real implementation, this would come from MixCloud API)
const mockMixCloudContent: EntertainmentStation[] = [
  {
    id: "mixcloud-highway-mix",
    platform: "mixcloud",
    type: "music",
    externalId: "m100001",
    name: "Highway Classics: 2-Hour Driving Mix",
    description: "Perfect mix for long highway drives - classic rock and upbeat tracks",
    genre: "Classic Rock",
    creator: "DJ RoadRunner",
    streamUrl: "https://stream.mixcloud.com/highway-classics",
    artworkUrl: null,
    websiteUrl: "https://mixcloud.com/highway-classics",
    metadata: {},
    duration: 7200, // 2 hours
    language: "en",
    country: "US",
    bitrate: 320,
    format: "mp3",
    reliability: 98,
    listeners: null,
    playCount: 25000,
    tags: ["driving", "highway", "classic rock", "upbeat"],
    isTruckingRelated: false,
    isDrivingFriendly: true,
    isActive: true,
    lastVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "mixcloud-truck-stop-country",
    platform: "mixcloud",
    type: "music",
    externalId: "m100002",
    name: "Truck Stop Country Favorites",
    description: "The best country music for truckers on the road",
    genre: "Country",
    creator: "Country Road DJ",
    streamUrl: "https://stream.mixcloud.com/truck-stop-country",
    artworkUrl: null,
    websiteUrl: "https://mixcloud.com/truck-stop-country",
    metadata: {},
    duration: 5400, // 1.5 hours
    language: "en",
    country: "US",
    bitrate: 320,
    format: "mp3",
    reliability: 97,
    listeners: null,
    playCount: 18000,
    tags: ["country", "trucking", "american", "road"],
    isTruckingRelated: true,
    isDrivingFriendly: true,
    isActive: true,
    lastVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "mixcloud-chill-drive",
    platform: "mixcloud",
    type: "music",
    externalId: "m100003",
    name: "Chill Drive: Ambient Electronic",
    description: "Relaxing electronic music for peaceful driving",
    genre: "Electronic",
    creator: "Ambient Roads",
    streamUrl: "https://stream.mixcloud.com/chill-drive",
    artworkUrl: null,
    websiteUrl: "https://mixcloud.com/chill-drive",
    metadata: {},
    duration: 4800, // 80 minutes
    language: "en",
    country: "US",
    bitrate: 320,
    format: "mp3",
    reliability: 99,
    listeners: null,
    playCount: 12000,
    tags: ["electronic", "ambient", "chill", "relaxing"],
    isTruckingRelated: false,
    isDrivingFriendly: true,
    isActive: true,
    lastVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "mixcloud-business-podcast",
    platform: "mixcloud",
    type: "podcast",
    externalId: "m100004",
    name: "Business on the Road Podcast",
    description: "Entrepreneurship and business insights for independent truckers",
    genre: "Business",
    creator: "Road Business Network",
    streamUrl: "https://stream.mixcloud.com/business-road",
    artworkUrl: null,
    websiteUrl: "https://mixcloud.com/business-road",
    metadata: {},
    duration: 3600, // 1 hour
    language: "en",
    country: "US",
    bitrate: 128,
    format: "mp3",
    reliability: 96,
    listeners: null,
    playCount: 8500,
    tags: ["business", "entrepreneurship", "trucking", "education"],
    isTruckingRelated: true,
    isDrivingFriendly: true,
    isActive: true,
    lastVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "mixcloud-90s-hits",
    platform: "mixcloud",
    type: "music",
    externalId: "m100005",
    name: "90s Highway Hits",
    description: "The best hits from the 90s for nostalgic road trips",
    genre: "90s Pop",
    creator: "Nostalgia Drive",
    streamUrl: "https://stream.mixcloud.com/90s-highway",
    artworkUrl: null,
    websiteUrl: "https://mixcloud.com/90s-highway",
    metadata: {},
    duration: 6000, // 100 minutes
    language: "en",
    country: "US",
    bitrate: 320,
    format: "mp3",
    reliability: 98,
    listeners: null,
    playCount: 32000,
    tags: ["90s", "pop", "nostalgia", "hits"],
    isTruckingRelated: false,
    isDrivingFriendly: true,
    isActive: true,
    lastVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Content categories with icons
const contentCategories = [
  { id: 'trucking', name: 'Trucking', icon: Car, filter: (c: EntertainmentStation) => c.isTruckingRelated },
  { id: 'music', name: 'Music', icon: Music, filter: (c: EntertainmentStation) => c.type === 'music' },
  { id: 'podcast', name: 'Podcasts', icon: Headphones, filter: (c: EntertainmentStation) => c.type === 'podcast' },
  { id: 'trending', name: 'Trending', icon: TrendingUp, filter: (c: EntertainmentStation) => (c.playCount || 0) > 20000 },
  { id: 'driving', name: 'Driving', icon: Car, filter: (c: EntertainmentStation) => c.isDrivingFriendly },
  { id: 'all', name: 'All', icon: PlayCircle, filter: () => true },
];

export default function MixCloudBrowser({
  onContentSelect,
  searchQuery = '',
  onSearchChange,
  isLoading = false,
  className
}: MixCloudBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState('trucking');
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // MixCloud content query (connected to backend API)
  const { data: content, isLoading: isLoadingContent } = useQuery({
    queryKey: [`/api/entertainment/stations?platform=mixcloud&category=${selectedCategory}&search=${localSearchQuery}`],
  });

  // Update local search when prop changes
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Filter content based on category and search
  const filteredContent = useMemo(() => {
    if (!content) return [];

    const category = contentCategories.find(c => c.id === selectedCategory);
    let filtered = category ? content.filter(category.filter) : content;

    if (localSearchQuery.trim()) {
      const query = localSearchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.genre.toLowerCase().includes(query) ||
        item.creator.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort by trucking-related first, then by play count
    return filtered.sort((a, b) => {
      if (a.isTruckingRelated !== b.isTruckingRelated) {
        return a.isTruckingRelated ? -1 : 1;
      }
      return (b.playCount || 0) - (a.playCount || 0);
    });
  }, [content, selectedCategory, localSearchQuery]);

  // Handle search input
  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value);
    onSearchChange?.(value);
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Render content item
  const renderContent = (item: EntertainmentStation) => (
    <Card 
      key={item.id} 
      className="automotive-card cursor-pointer hover:bg-accent/5 transition-colors"
      onClick={() => onContentSelect(item)}
      data-testid={`content-${item.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 automotive-touch-target">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              {item.type === 'podcast' ? (
                <Headphones className="h-6 w-6 text-primary" />
              ) : (
                <Music className="h-6 w-6 text-primary" />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="automotive-text-base font-medium truncate">
                {item.name}
              </h4>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="automotive-text-xs text-muted-foreground">
                  {item.duration ? formatDuration(item.duration) : 'Live'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="automotive-text-sm text-muted-foreground truncate">
                {item.creator}
              </span>
            </div>

            <p className="automotive-text-sm text-muted-foreground truncate mt-1">
              {item.description}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="scalable-badge">
                {item.genre}
              </Badge>
              
              <Badge 
                variant={item.type === 'podcast' ? 'outline' : 'secondary'} 
                className="scalable-badge"
              >
                {item.type}
              </Badge>

              {item.isTruckingRelated && (
                <Badge variant="outline" className="scalable-badge">
                  <Car className="h-2 w-2 mr-1" />
                  Trucking
                </Badge>
              )}

              {item.isDrivingFriendly && (
                <Badge variant="outline" className="scalable-badge">
                  Driving
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-3 w-3 text-muted-foreground" />
                <span className="automotive-text-xs text-muted-foreground">
                  {item.playCount ? `${item.playCount.toLocaleString()} plays` : 'New'}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="automotive-text-xs text-muted-foreground">
                  {item.bitrate}kbps
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-4", className)} data-testid="mixcloud-browser">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search MixCloud content..."
          value={localSearchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="automotive-input pl-10"
          data-testid="input-search"
        />
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <h3 className="automotive-text-base font-medium">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {contentCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="automotive-button automotive-text-sm"
                data-testid={`category-${category.id}`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {category.name}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Content List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="automotive-text-base font-medium">
            {contentCategories.find(c => c.id === selectedCategory)?.name} Content
          </h3>
          <span className="automotive-text-sm text-muted-foreground">
            {filteredContent.length} items
          </span>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoadingContent || isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContent.length > 0 ? (
            <div className="space-y-3">
              {filteredContent.map(renderContent)}
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="automotive-text-base text-muted-foreground">
                No content found
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