/**
 * Offline Maps Download Service
 * Handles downloading, storing, and managing map tiles for offline navigation
 */

export interface MapRegion {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  estimatedSizeMB: number;
  category: 'uk' | 'europe' | 'world';
}

export interface DownloadedRegion {
  id: string;
  name: string;
  downloadedAt: Date;
  sizeMB: number;
  tileCount: number;
  zoomLevels: number[];
  expiresAt: Date;
  status: 'complete' | 'partial';
  lastTileIndex?: number;
  totalTiles?: number;
}

export interface DownloadProgress {
  regionId: string;
  regionName: string;
  totalTiles: number;
  downloadedTiles: number;
  failedTiles: number;
  percentage: number;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed';
  estimatedTimeRemaining?: number;
  currentZoom?: number;
  bytesDownloaded?: number;
}

export const MAP_REGIONS: MapRegion[] = [
  { id: 'uk-london', name: 'London & South East', bounds: { north: 51.7, south: 51.2, east: 0.3, west: -0.6 }, estimatedSizeMB: 85, category: 'uk' },
  { id: 'uk-midlands', name: 'Midlands', bounds: { north: 53.2, south: 52.0, east: -0.5, west: -2.5 }, estimatedSizeMB: 120, category: 'uk' },
  { id: 'uk-north', name: 'North England', bounds: { north: 55.8, south: 53.2, east: -0.5, west: -3.5 }, estimatedSizeMB: 150, category: 'uk' },
  { id: 'uk-scotland', name: 'Scotland', bounds: { north: 60.9, south: 54.6, east: -0.7, west: -7.6 }, estimatedSizeMB: 180, category: 'uk' },
  { id: 'uk-wales', name: 'Wales', bounds: { north: 53.5, south: 51.3, east: -2.6, west: -5.5 }, estimatedSizeMB: 95, category: 'uk' },
  { id: 'uk-southwest', name: 'South West England', bounds: { north: 51.7, south: 50.0, east: -1.5, west: -5.7 }, estimatedSizeMB: 110, category: 'uk' },
  { id: 'eu-france-north', name: 'Northern France', bounds: { north: 51.1, south: 48.5, east: 4.5, west: -2.0 }, estimatedSizeMB: 200, category: 'europe' },
  { id: 'eu-benelux', name: 'Belgium & Netherlands', bounds: { north: 53.5, south: 49.5, east: 7.2, west: 2.5 }, estimatedSizeMB: 150, category: 'europe' },
  { id: 'eu-germany-west', name: 'Western Germany', bounds: { north: 54.0, south: 49.0, east: 10.0, west: 5.8 }, estimatedSizeMB: 220, category: 'europe' },
  { id: 'eu-spain-north', name: 'Northern Spain', bounds: { north: 43.8, south: 40.0, east: 3.3, west: -9.3 }, estimatedSizeMB: 180, category: 'europe' },
  { id: 'eu-italy-north', name: 'Northern Italy', bounds: { north: 47.1, south: 43.5, east: 14.0, west: 6.6 }, estimatedSizeMB: 160, category: 'europe' },
  { id: 'eu-poland', name: 'Poland', bounds: { north: 54.9, south: 49.0, east: 24.2, west: 14.1 }, estimatedSizeMB: 200, category: 'europe' },
  { id: 'world-usa-northeast', name: 'USA - Northeast', bounds: { north: 47.5, south: 37.0, east: -66.9, west: -80.5 }, estimatedSizeMB: 350, category: 'world' },
  { id: 'world-canada-ontario', name: 'Canada - Ontario', bounds: { north: 56.9, south: 41.7, east: -74.3, west: -95.2 }, estimatedSizeMB: 280, category: 'world' },
  { id: 'world-australia-east', name: 'Australia - East Coast', bounds: { north: -10.7, south: -39.2, east: 154.0, west: 138.0 }, estimatedSizeMB: 300, category: 'world' },
  { id: 'world-uae', name: 'UAE & Gulf States', bounds: { north: 26.5, south: 22.5, east: 56.5, west: 51.0 }, estimatedSizeMB: 120, category: 'world' },
];

const TILE_PROVIDER = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DB_NAME = 'TruckNavOfflineMaps';
const DB_VERSION = 2;
const TILES_STORE = 'tiles';
const REGIONS_STORE = 'regions';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MAX_STORAGE_MB = 500;
const DEFAULT_ZOOM_LEVELS = [6, 8, 10, 12, 14];

class OfflineMapsService {
  private static instance: OfflineMapsService;
  private db: IDBDatabase | null = null;
  private downloadQueue: globalThis.Map<string, DownloadProgress> = new globalThis.Map();
  private abortControllers: globalThis.Map<string, AbortController> = new globalThis.Map();
  private progressCallbacks: globalThis.Map<string, (progress: DownloadProgress) => void> = new globalThis.Map();

  static getInstance(): OfflineMapsService {
    if (!OfflineMapsService.instance) {
      OfflineMapsService.instance = new OfflineMapsService();
    }
    return OfflineMapsService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.db) return true;
    
    console.log('[OfflineMaps] 🔄 Initializing database...');
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        console.error('[OfflineMaps] ❌ Failed to open database:', error);
        console.error('[OfflineMaps] ❌ Full error object:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineMaps] ✅ Database initialized successfully');
        console.log('[OfflineMaps] 📊 Available object stores:', Array.from(this.db!.objectStoreNames));
        resolve(true);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('[OfflineMaps] 🔄 Upgrading database schema...');
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(TILES_STORE)) {
          console.log('[OfflineMaps] 📦 Creating tiles store...');
          const tilesStore = db.createObjectStore(TILES_STORE, { keyPath: 'key' });
          tilesStore.createIndex('regionId', 'regionId');
          tilesStore.createIndex('timestamp', 'timestamp');
        }
        
        if (!db.objectStoreNames.contains(REGIONS_STORE)) {
          console.log('[OfflineMaps] 📦 Creating regions store...');
          db.createObjectStore(REGIONS_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  private getTileCoordinates(bounds: MapRegion['bounds'], zoom: number): { x: number; y: number }[] {
    const tiles: { x: number; y: number }[] = [];
    
    const lat2tile = (lat: number, z: number) => 
      Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    
    const lon2tile = (lon: number, z: number) => 
      Math.floor((lon + 180) / 360 * Math.pow(2, z));

    const minX = lon2tile(bounds.west, zoom);
    const maxX = lon2tile(bounds.east, zoom);
    const minY = lat2tile(bounds.north, zoom);
    const maxY = lat2tile(bounds.south, zoom);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ x, y });
      }
    }

    return tiles;
  }

  private getAllTilesForRegion(region: MapRegion, zoomLevels: number[] = DEFAULT_ZOOM_LEVELS): { z: number; x: number; y: number }[] {
    let allTiles: { z: number; x: number; y: number }[] = [];
    for (const zoom of zoomLevels) {
      const tiles = this.getTileCoordinates(region.bounds, zoom);
      allTiles = allTiles.concat(tiles.map(t => ({ ...t, z: zoom })));
    }
    return allTiles;
  }

  private getTileKey(regionId: string, z: number, x: number, y: number): string {
    return `${regionId}:${z}/${x}/${y}`;
  }

  private async downloadTileWithRetry(
    z: number, 
    x: number, 
    y: number, 
    regionId: string,
    abortSignal?: AbortSignal,
    retries: number = MAX_RETRIES
  ): Promise<{ success: boolean; bytes: number }> {
    const key = this.getTileKey(regionId, z, x, y);
    const url = TILE_PROVIDER.replace('{z}', z.toString()).replace('{x}', x.toString()).replace('{y}', y.toString());

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (abortSignal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        const response = await fetch(url, { 
          signal: abortSignal,
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = arrayBuffer.byteLength;
        
        await this.storeTile(key, arrayBuffer, regionId);
        return { success: true, bytes };
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          throw error;
        }
        
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        
        return { success: false, bytes: 0 };
      }
    }
    
    return { success: false, bytes: 0 };
  }

  private async storeTile(key: string, data: ArrayBuffer, regionId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(TILES_STORE, 'readwrite');
      const store = transaction.objectStore(TILES_STORE);
      
      const request = store.put({
        key,
        data,
        regionId,
        timestamp: Date.now(),
        size: data.byteLength,
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTile(z: number, x: number, y: number, regionId?: string): Promise<ArrayBuffer | null> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(TILES_STORE, 'readonly');
      const store = transaction.objectStore(TILES_STORE);
      
      if (regionId) {
        const key = this.getTileKey(regionId, z, x, y);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.data || null);
        request.onerror = () => resolve(null);
      } else {
        const index = store.index('regionId');
        const request = index.openCursor();
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const tileKey = cursor.value.key as string;
            if (tileKey.endsWith(`:${z}/${x}/${y}`)) {
              resolve(cursor.value.data);
              return;
            }
            cursor.continue();
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      }
    });
  }

  async getActualStorageUsed(): Promise<number> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(TILES_STORE, 'readonly');
      const store = transaction.objectStore(TILES_STORE);
      const request = store.openCursor();
      let totalBytes = 0;
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          totalBytes += cursor.value.size || 0;
          cursor.continue();
        } else {
          resolve(Math.round(totalBytes / (1024 * 1024)));
        }
      };
      request.onerror = () => resolve(0);
    });
  }

  async downloadRegion(
    region: MapRegion,
    onProgress?: (progress: DownloadProgress) => void,
    zoomLevels: number[] = DEFAULT_ZOOM_LEVELS,
    startIndex: number = 0
  ): Promise<boolean> {
    if (!this.db) await this.initialize();
    
    const actualUsed = await this.getActualStorageUsed();
    if (startIndex === 0 && actualUsed + region.estimatedSizeMB > MAX_STORAGE_MB) {
      console.warn('[OfflineMaps] Not enough storage space');
      return false;
    }
    
    const abortController = new AbortController();
    this.abortControllers.set(region.id, abortController);

    const allTiles = this.getAllTilesForRegion(region, zoomLevels);
    const existingRegion = await this.getRegionMetadata(region.id);
    const resumeIndex = startIndex > 0 ? startIndex : (existingRegion?.lastTileIndex || 0);

    const progress: DownloadProgress = {
      regionId: region.id,
      regionName: region.name,
      totalTiles: allTiles.length,
      downloadedTiles: resumeIndex,
      failedTiles: 0,
      percentage: Math.round((resumeIndex / allTiles.length) * 100),
      status: 'downloading',
      bytesDownloaded: 0,
    };

    this.downloadQueue.set(region.id, progress);
    if (onProgress) this.progressCallbacks.set(region.id, onProgress);

    const startTime = Date.now();
    const concurrency = 4;
    let totalBytes = existingRegion ? existingRegion.sizeMB * 1024 * 1024 : 0;
    let lastSaveIndex = resumeIndex;

    try {
      for (let i = resumeIndex; i < allTiles.length; i += concurrency) {
        if (abortController.signal.aborted) {
          progress.status = 'paused';
          await this.saveRegionMetadata({
            id: region.id,
            name: region.name,
            downloadedAt: new Date(),
            sizeMB: Math.round(totalBytes / (1024 * 1024)) || 1,
            tileCount: progress.downloadedTiles,
            zoomLevels,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'partial',
            lastTileIndex: i,
            totalTiles: allTiles.length,
          });
          break;
        }

        const currentUsed = await this.getActualStorageUsed();
        const estimatedBatchMB = (concurrency * 20) / 1024;
        if (currentUsed + estimatedBatchMB >= MAX_STORAGE_MB) {
          console.warn('[OfflineMaps] Storage limit would be exceeded, stopping download gracefully');
          progress.status = 'failed';
          await this.saveRegionMetadata({
            id: region.id,
            name: region.name,
            downloadedAt: new Date(),
            sizeMB: Math.round(totalBytes / (1024 * 1024)) || 1,
            tileCount: progress.downloadedTiles,
            zoomLevels,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'partial',
            lastTileIndex: i,
            totalTiles: allTiles.length,
          });
          break;
        }

        const batch = allTiles.slice(i, i + concurrency);
        const results = await Promise.all(
          batch.map(tile => 
            this.downloadTileWithRetry(tile.z, tile.x, tile.y, region.id, abortController.signal)
              .catch(() => ({ success: false, bytes: 0 }))
          )
        );

        results.forEach(result => {
          if (result.success) {
            progress.downloadedTiles++;
            totalBytes += result.bytes;
          } else {
            progress.failedTiles++;
          }
        });

        progress.percentage = Math.round((progress.downloadedTiles / progress.totalTiles) * 100);
        progress.currentZoom = batch[0]?.z;
        progress.bytesDownloaded = totalBytes;

        const elapsed = Date.now() - startTime;
        if (elapsed > 0 && progress.downloadedTiles > resumeIndex) {
          const tilesDownloadedThisSession = progress.downloadedTiles - resumeIndex;
          const tilesPerMs = tilesDownloadedThisSession / elapsed;
          const remainingTiles = progress.totalTiles - progress.downloadedTiles - progress.failedTiles;
          progress.estimatedTimeRemaining = tilesPerMs > 0 ? Math.round(remainingTiles / tilesPerMs / 1000) : undefined;
        }

        this.downloadQueue.set(region.id, progress);
        const callback = this.progressCallbacks.get(region.id);
        if (callback) callback({ ...progress });

        if (i - lastSaveIndex >= 100) {
          await this.saveRegionMetadata({
            id: region.id,
            name: region.name,
            downloadedAt: new Date(),
            sizeMB: Math.round(totalBytes / (1024 * 1024)) || 1,
            tileCount: progress.downloadedTiles,
            zoomLevels,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'partial',
            lastTileIndex: i,
            totalTiles: allTiles.length,
          });
          lastSaveIndex = i;
        }
      }

      if (progress.status !== 'paused' && progress.status !== 'failed') {
        const failureRate = progress.failedTiles / progress.totalTiles;
        progress.status = failureRate > 0.05 ? 'failed' : 'completed';
      }

      const sizeMB = Math.round(totalBytes / (1024 * 1024)) || Math.round((progress.downloadedTiles * 15) / 1024);
      
      await this.saveRegionMetadata({
        id: region.id,
        name: region.name,
        downloadedAt: new Date(),
        sizeMB,
        tileCount: progress.downloadedTiles,
        zoomLevels,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: progress.status === 'completed' ? 'complete' : 'partial',
        lastTileIndex: progress.status === 'completed' ? undefined : progress.downloadedTiles,
        totalTiles: allTiles.length,
      });

      this.downloadQueue.delete(region.id);
      this.abortControllers.delete(region.id);
      this.progressCallbacks.delete(region.id);

      return progress.status === 'completed';
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        progress.status = 'paused';
        return false;
      }
      console.error('[OfflineMaps] Download failed:', error);
      progress.status = 'failed';
      return false;
    }
  }

  async resumeDownload(
    regionId: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<boolean> {
    const region = MAP_REGIONS.find(r => r.id === regionId);
    if (!region) {
      console.error('[OfflineMaps] Region not found:', regionId);
      return false;
    }

    const metadata = await this.getRegionMetadata(regionId);
    if (!metadata || metadata.status !== 'partial') {
      console.error('[OfflineMaps] No partial download to resume for:', regionId);
      return false;
    }

    const startIndex = metadata.lastTileIndex || 0;
    return this.downloadRegion(region, onProgress, metadata.zoomLevels, startIndex);
  }

  pauseDownload(regionId: string): void {
    const controller = this.abortControllers.get(regionId);
    if (controller) {
      controller.abort();
    }
  }

  private async getRegionMetadata(regionId: string): Promise<DownloadedRegion | null> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(REGIONS_STORE, 'readonly');
      const store = transaction.objectStore(REGIONS_STORE);
      
      const request = store.get(regionId);
      request.onsuccess = () => {
        if (request.result) {
          resolve({
            ...request.result,
            downloadedAt: new Date(request.result.downloadedAt),
            expiresAt: new Date(request.result.expiresAt),
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }

  private async saveRegionMetadata(region: DownloadedRegion): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(REGIONS_STORE, 'readwrite');
      const store = transaction.objectStore(REGIONS_STORE);
      
      const request = store.put({
        ...region,
        downloadedAt: region.downloadedAt.toISOString(),
        expiresAt: region.expiresAt.toISOString(),
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDownloadedRegions(): Promise<DownloadedRegion[]> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(REGIONS_STORE, 'readonly');
      const store = transaction.objectStore(REGIONS_STORE);
      
      const request = store.getAll();
      request.onsuccess = () => {
        const regions = (request.result || []).map((r: any) => ({
          ...r,
          downloadedAt: new Date(r.downloadedAt),
          expiresAt: new Date(r.expiresAt),
        }));
        resolve(regions);
      };
      request.onerror = () => resolve([]);
    });
  }

  async deleteRegion(regionId: string): Promise<void> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TILES_STORE, REGIONS_STORE], 'readwrite');
      const tilesStore = transaction.objectStore(TILES_STORE);
      const regionsStore = transaction.objectStore(REGIONS_STORE);
      const index = tilesStore.index('regionId');
      
      const cursorRequest = index.openCursor(IDBKeyRange.only(regionId));
      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      regionsStore.delete(regionId);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getStorageUsed(): Promise<{ usedMB: number; availableMB: number }> {
    const actualUsed = await this.getActualStorageUsed();
    return {
      usedMB: actualUsed,
      availableMB: MAX_STORAGE_MB,
    };
  }

  getDownloadProgress(regionId: string): DownloadProgress | null {
    return this.downloadQueue.get(regionId) || null;
  }

  async isRegionDownloaded(regionId: string): Promise<boolean> {
    const regions = await this.getDownloadedRegions();
    return regions.some(r => r.id === regionId && r.status === 'complete');
  }

  async cleanupExpiredRegions(): Promise<number> {
    const regions = await this.getDownloadedRegions();
    const now = new Date();
    let deletedCount = 0;
    
    for (const region of regions) {
      if (region.expiresAt < now) {
        await this.deleteRegion(region.id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
}

export const offlineMapsService = OfflineMapsService.getInstance();
