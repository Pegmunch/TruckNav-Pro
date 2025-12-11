/**
 * Offline Map Downloads Panel
 * Allows users to download specific map regions for offline navigation
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Trash2, 
  Map as MapIcon, 
  HardDrive, 
  Check, 
  Pause, 
  Play, 
  AlertCircle,
  Globe,
  MapPin,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  offlineMapsService, 
  MAP_REGIONS, 
  type MapRegion, 
  type DownloadedRegion,
  type DownloadProgress 
} from '@/lib/offline-maps-service';

interface OfflineDownloadsPanelProps {
  onClose?: () => void;
}

export function OfflineDownloadsPanel({ onClose }: OfflineDownloadsPanelProps) {
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(true);
  const [downloadedRegions, setDownloadedRegions] = useState<DownloadedRegion[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<globalThis.Map<string, DownloadProgress>>(new globalThis.Map());
  const [storageInfo, setStorageInfo] = useState<{ usedMB: number; availableMB: number }>({ usedMB: 0, availableMB: 500 });
  const [activeTab, setActiveTab] = useState('downloaded');

  // Initialize service and load data
  useEffect(() => {
    const init = async () => {
      try {
        await offlineMapsService.initialize();
        await refreshData();
      } catch (error) {
        console.error('[OfflineDownloads] Failed to initialize:', error);
        toast({
          title: 'Offline maps unavailable',
          description: 'Could not initialize offline storage',
          variant: 'destructive',
        });
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const refreshData = async () => {
    const [regions, storage] = await Promise.all([
      offlineMapsService.getDownloadedRegions(),
      offlineMapsService.getStorageUsed(),
    ]);
    setDownloadedRegions(regions);
    setStorageInfo(storage);
  };

  const handleDownload = useCallback(async (region: MapRegion) => {
    if (storageInfo.usedMB + region.estimatedSizeMB > storageInfo.availableMB) {
      toast({
        title: 'Not enough space',
        description: `${region.name} requires ~${region.estimatedSizeMB} MB but only ${storageInfo.availableMB - storageInfo.usedMB} MB available`,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Download started',
      description: `Downloading ${region.name} for offline use...`,
    });

    const progress: DownloadProgress = {
      regionId: region.id,
      regionName: region.name,
      totalTiles: 0,
      downloadedTiles: 0,
      failedTiles: 0,
      percentage: 0,
      status: 'pending',
    };

    setDownloadProgress(prev => new Map(prev).set(region.id, progress));

    const success = await offlineMapsService.downloadRegion(
      region,
      (newProgress) => {
        setDownloadProgress(prev => new Map(prev).set(region.id, newProgress));
      }
    );

    if (success) {
      toast({
        title: 'Download complete',
        description: `${region.name} is now available offline`,
      });
    } else {
      const finalProgress = offlineMapsService.getDownloadProgress(region.id);
      if (finalProgress?.status === 'paused') {
        toast({
          title: 'Download paused',
          description: `${region.name} can be resumed later`,
        });
      } else {
        toast({
          title: 'Download incomplete',
          description: `Some tiles could not be downloaded for ${region.name}`,
          variant: 'destructive',
        });
      }
    }

    await refreshData();
    setDownloadProgress(prev => {
      const newMap = new Map(prev);
      newMap.delete(region.id);
      return newMap;
    });
  }, [toast, storageInfo]);

  const handleResume = useCallback(async (region: DownloadedRegion) => {
    toast({
      title: 'Resuming download',
      description: `Continuing download of ${region.name}...`,
    });

    const progress: DownloadProgress = {
      regionId: region.id,
      regionName: region.name,
      totalTiles: region.totalTiles || 0,
      downloadedTiles: region.tileCount,
      failedTiles: 0,
      percentage: Math.round((region.tileCount / (region.totalTiles || 1)) * 100),
      status: 'downloading',
    };

    setDownloadProgress(prev => new Map(prev).set(region.id, progress));

    const success = await offlineMapsService.resumeDownload(
      region.id,
      (newProgress) => {
        setDownloadProgress(prev => new Map(prev).set(region.id, newProgress));
      }
    );

    if (success) {
      toast({
        title: 'Download complete',
        description: `${region.name} is now fully available offline`,
      });
    }

    await refreshData();
    setDownloadProgress(prev => {
      const newMap = new Map(prev);
      newMap.delete(region.id);
      return newMap;
    });
  }, [toast]);

  const handlePause = useCallback((regionId: string) => {
    offlineMapsService.pauseDownload(regionId);
  }, []);

  const handleDelete = useCallback(async (region: DownloadedRegion) => {
    try {
      await offlineMapsService.deleteRegion(region.id);
      toast({
        title: 'Region deleted',
        description: `${region.name} removed from offline storage`,
      });
      await refreshData();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Could not remove the region',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const isDownloaded = (regionId: string) => downloadedRegions.some(r => r.id === regionId);
  const isDownloading = (regionId: string) => downloadProgress.has(regionId);

  const getCategoryIcon = (category: MapRegion['category']) => {
    switch (category) {
      case 'uk': return <MapPin className="w-4 h-4 text-blue-600" />;
      case 'europe': return <MapIcon className="w-4 h-4 text-green-600" />;
      case 'world': return <Globe className="w-4 h-4 text-purple-600" />;
    }
  };

  const getCategoryLabel = (category: MapRegion['category']) => {
    switch (category) {
      case 'uk': return 'UK';
      case 'europe': return 'Europe';
      case 'world': return 'World';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds}s remaining`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m remaining`;
    return `${Math.round(seconds / 3600)}h remaining`;
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ukRegions = MAP_REGIONS.filter(r => r.category === 'uk');
  const europeRegions = MAP_REGIONS.filter(r => r.category === 'europe');
  const worldRegions = MAP_REGIONS.filter(r => r.category === 'world');

  return (
    <div className="space-y-4">
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Storage Used</div>
                <div className="text-xs text-muted-foreground">
                  {storageInfo.usedMB} MB of {storageInfo.availableMB} MB
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshData}
              data-testid="button-refresh-storage"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <Progress 
            value={(storageInfo.usedMB / storageInfo.availableMB) * 100} 
            className="mt-2 h-2"
          />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="downloaded" className="flex items-center gap-2" data-testid="tab-downloaded">
            <Check className="w-4 h-4" />
            Downloaded ({downloadedRegions.length})
          </TabsTrigger>
          <TabsTrigger value="available" className="flex items-center gap-2" data-testid="tab-available">
            <Download className="w-4 h-4" />
            Available
          </TabsTrigger>
        </TabsList>

        <TabsContent value="downloaded" className="mt-4">
          <ScrollArea className="h-[400px]">
            {downloadedRegions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No offline maps</p>
                <p className="text-sm mt-1">Download regions to use maps offline</p>
              </div>
            ) : (
              <div className="space-y-3">
                {downloadedRegions.map((region) => {
                  const isPartial = region.status === 'partial';
                  const isResuming = isDownloading(region.id);
                  const resumeProgress = downloadProgress.get(region.id);
                  
                  return (
                    <Card 
                      key={region.id} 
                      className={isPartial ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20' : ''}
                      data-testid={`downloaded-region-${region.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {isPartial ? (
                                <AlertCircle className="w-4 h-4 text-yellow-600" />
                              ) : (
                                <Check className="w-4 h-4 text-green-600" />
                              )}
                              <span className="font-medium">{region.name}</span>
                              {isPartial && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                                  Incomplete
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                              <div>
                                {region.sizeMB} MB • {region.tileCount.toLocaleString()} 
                                {region.totalTiles ? ` / ${region.totalTiles.toLocaleString()}` : ''} tiles
                              </div>
                              <div>Downloaded: {formatDate(region.downloadedAt)}</div>
                              <div>Expires: {formatDate(region.expiresAt)}</div>
                            </div>

                            {isResuming && resumeProgress && (
                              <div className="mt-3 space-y-1">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{resumeProgress.downloadedTiles} / {resumeProgress.totalTiles} tiles</span>
                                  <span>{formatTimeRemaining(resumeProgress.estimatedTimeRemaining)}</span>
                                </div>
                                <Progress value={resumeProgress.percentage} className="h-1.5" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isPartial && !isResuming && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResume(region)}
                                className="text-blue-600 hover:text-blue-700"
                                data-testid={`button-resume-${region.id}`}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                            {isResuming && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePause(region.id)}
                                data-testid={`button-pause-resume-${region.id}`}
                              >
                                <Pause className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(region)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-${region.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="available" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium">United Kingdom</h3>
                </div>
                <div className="space-y-2">
                  {ukRegions.map((region) => (
                    <RegionDownloadItem
                      key={region.id}
                      region={region}
                      isDownloaded={isDownloaded(region.id)}
                      isDownloading={isDownloading(region.id)}
                      progress={downloadProgress.get(region.id)}
                      onDownload={() => handleDownload(region)}
                      onPause={() => handlePause(region.id)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapIcon className="w-4 h-4 text-green-600" />
                  <h3 className="font-medium">Europe</h3>
                </div>
                <div className="space-y-2">
                  {europeRegions.map((region) => (
                    <RegionDownloadItem
                      key={region.id}
                      region={region}
                      isDownloaded={isDownloaded(region.id)}
                      isDownloading={isDownloading(region.id)}
                      progress={downloadProgress.get(region.id)}
                      onDownload={() => handleDownload(region)}
                      onPause={() => handlePause(region.id)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <h3 className="font-medium">Worldwide</h3>
                </div>
                <div className="space-y-2">
                  {worldRegions.map((region) => (
                    <RegionDownloadItem
                      key={region.id}
                      region={region}
                      isDownloaded={isDownloaded(region.id)}
                      isDownloading={isDownloading(region.id)}
                      progress={downloadProgress.get(region.id)}
                      onDownload={() => handleDownload(region)}
                      onPause={() => handlePause(region.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface RegionDownloadItemProps {
  region: MapRegion;
  isDownloaded: boolean;
  isDownloading: boolean;
  progress?: DownloadProgress;
  onDownload: () => void;
  onPause: () => void;
}

function RegionDownloadItem({ 
  region, 
  isDownloaded, 
  isDownloading, 
  progress, 
  onDownload, 
  onPause 
}: RegionDownloadItemProps) {
  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  return (
    <Card 
      className={isDownloaded ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20' : ''}
      data-testid={`region-item-${region.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{region.name}</span>
              {isDownloaded && (
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  Saved
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              ~{region.estimatedSizeMB} MB
            </div>
          </div>

          {isDownloading ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onPause}
              data-testid={`button-pause-${region.id}`}
            >
              <Pause className="w-4 h-4" />
            </Button>
          ) : isDownloaded ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              data-testid={`button-download-${region.id}`}
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>

        {isDownloading && progress && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {progress.downloadedTiles} / {progress.totalTiles} tiles
                {progress.currentZoom && ` (zoom ${progress.currentZoom})`}
              </span>
              <span>{formatTimeRemaining(progress.estimatedTimeRemaining)}</span>
            </div>
            <Progress value={progress.percentage} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
