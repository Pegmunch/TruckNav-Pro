/**
 * MapLibre Memory Manager
 * 
 * Handles WebGL context management, memory cleanup, and recovery for MapLibre GL JS
 * Prevents crashes from WebGL context loss and memory issues
 */

import maplibregl from 'maplibre-gl';

export interface MapLibreMemoryConfig {
  maxTileCacheSize?: number;
  maxTexturePoolSize?: number;
  autoCleanupInterval?: number;
  webGLContextAttributes?: WebGLContextAttributes;
  enableMemoryMonitoring?: boolean;
}

export class MapLibreMemoryManager {
  private static instance: MapLibreMemoryManager | null = null;
  private cleanupInterval?: NodeJS.Timeout;
  private contextLossHandlers = new Map<maplibregl.Map, { handleContextLost: (event: Event) => void; handleContextRestored: () => void }>();
  private mapInstances = new Set<maplibregl.Map>();
  private readonly config: Required<MapLibreMemoryConfig>;
  private memoryPressureCallbacks: Array<() => void> = [];
  private isRecovering = false;
  
  constructor(config: MapLibreMemoryConfig = {}) {
    this.config = {
      maxTileCacheSize: config.maxTileCacheSize ?? 100, // MB
      maxTexturePoolSize: config.maxTexturePoolSize ?? 50, // MB
      autoCleanupInterval: config.autoCleanupInterval ?? 30000, // 30 seconds
      webGLContextAttributes: config.webGLContextAttributes ?? {
        alpha: false,
        antialias: false,
        depth: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default',
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        stencil: true
      },
      enableMemoryMonitoring: config.enableMemoryMonitoring ?? true
    };

    if (this.config.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }
  }

  static getInstance(config?: MapLibreMemoryConfig): MapLibreMemoryManager {
    if (!MapLibreMemoryManager.instance) {
      MapLibreMemoryManager.instance = new MapLibreMemoryManager(config);
    }
    return MapLibreMemoryManager.instance;
  }

  /**
   * Register a map instance for memory management
   */
  registerMap(map: maplibregl.Map): void {
    if (this.mapInstances.has(map)) return;
    
    this.mapInstances.add(map);
    this.setupWebGLContextHandlers(map);
    
    console.log(`🗺️ [MapLibre Memory] Registered map instance (total: ${this.mapInstances.size})`);
  }

  /**
   * Unregister a map instance and clean up resources
   */
  unregisterMap(map: maplibregl.Map): void {
    if (!this.mapInstances.has(map)) return;
    
    this.cleanupMapResources(map);
    this.mapInstances.delete(map);
    
    const handlers = this.contextLossHandlers.get(map);
    if (handlers) {
      const canvas = map.getCanvas();
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handlers.handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handlers.handleContextRestored);
      }
      this.contextLossHandlers.delete(map);
    }
    
    console.log(`🗺️ [MapLibre Memory] Unregistered map instance (remaining: ${this.mapInstances.size})`);
  }

  /**
   * Setup WebGL context loss/restore handlers
   */
  private setupWebGLContextHandlers(map: maplibregl.Map): void {
    const canvas = map.getCanvas();
    if (!canvas) return;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('🚨 [MapLibre Memory] WebGL context lost! Attempting recovery...');
      
      this.isRecovering = true;
      
      // Notify listeners
      this.memoryPressureCallbacks.forEach(callback => callback());
      
      // Attempt to recover after a delay
      setTimeout(() => {
        this.attemptContextRecovery(map);
      }, 1000);
    };

    const handleContextRestored = () => {
      console.log('✅ [MapLibre Memory] WebGL context restored successfully');
      this.isRecovering = false;
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    
    // Store both actual handler functions so they can be properly removed later
    this.contextLossHandlers.set(map, {
      handleContextLost,
      handleContextRestored
    });
  }

  /**
   * Attempt to recover from WebGL context loss
   */
  private attemptContextRecovery(map: maplibregl.Map): void {
    if (!this.isRecovering) return;
    
    try {
      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }
      
      // Clear tile cache
      if ((map as any)._sourceCache) {
        Object.values((map as any)._sourceCache).forEach((cache: any) => {
          if (cache?.clearTiles) {
            cache.clearTiles();
          }
        });
      }
      
      // Trigger resize to reinitialize WebGL
      map.resize();
      
      console.log('🔄 [MapLibre Memory] Context recovery attempt completed');
    } catch (error) {
      console.error('❌ [MapLibre Memory] Context recovery failed:', error);
    }
  }

  /**
   * Clean up map resources to free memory
   */
  private cleanupMapResources(map: maplibregl.Map): void {
    try {
      // Remove all custom layers
      const style = map.getStyle();
      if (style?.layers) {
        style.layers.forEach(layer => {
          if (layer.id && !layer.id.startsWith('maplibre-')) {
            try {
              map.removeLayer(layer.id);
            } catch (e) {
              // Layer might already be removed
            }
          }
        });
      }

      // Remove all custom sources
      if (style?.sources) {
        Object.keys(style.sources).forEach(sourceId => {
          if (!sourceId.startsWith('maplibre-')) {
            try {
              map.removeSource(sourceId);
            } catch (e) {
              // Source might already be removed
            }
          }
        });
      }

      // Clear tile cache
      if ((map as any)._sourceCache) {
        Object.values((map as any)._sourceCache).forEach((cache: any) => {
          if (cache?.clearTiles) {
            cache.clearTiles();
          }
        });
      }

      // Remove all markers
      const markers = (map as any)._markers;
      if (markers && Array.isArray(markers)) {
        markers.forEach((marker: any) => marker.remove());
      }

      // Remove all popups
      const popups = (map as any)._popups;
      if (popups && Array.isArray(popups)) {
        popups.forEach((popup: any) => popup.remove());
      }

      console.log('🧹 [MapLibre Memory] Map resources cleaned up');
    } catch (error) {
      console.error('⚠️ [MapLibre Memory] Error during cleanup:', error);
    }
  }

  /**
   * Start automatic memory monitoring and cleanup
   */
  private startMemoryMonitoring(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, this.config.autoCleanupInterval);

    // Also monitor memory pressure events if available
    if ('memory' in performance && (performance as any).memory) {
      this.monitorMemoryPressure();
    }
  }

  /**
   * Monitor browser memory pressure
   */
  private monitorMemoryPressure(): void {
    const checkMemory = () => {
      if (!('memory' in performance)) return;
      
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize;
      const totalMemory = memory.jsHeapSizeLimit;
      const memoryUsageRatio = usedMemory / totalMemory;
      
      // If memory usage is above 70%, trigger cleanup
      if (memoryUsageRatio > 0.7) {
        console.warn(`⚠️ [MapLibre Memory] High memory usage detected: ${(memoryUsageRatio * 100).toFixed(1)}%`);
        this.performMemoryCleanup();
      }
    };

    // Check every 10 seconds
    setInterval(checkMemory, 10000);
  }

  /**
   * Perform memory cleanup across all map instances
   */
  private performMemoryCleanup(): void {
    console.log('🧹 [MapLibre Memory] Performing scheduled memory cleanup...');
    
    this.mapInstances.forEach(map => {
      try {
        // Clear tile cache for each source
        if ((map as any)._sourceCache) {
          Object.values((map as any)._sourceCache).forEach((cache: any) => {
            if (cache?.clearTiles) {
              // Only clear tiles not currently visible
              const viewport = map.getBounds();
              if (cache.tilesIn && viewport) {
                const visibleTileIds = cache.tilesIn(viewport).map((t: any) => t.tileID.key);
                cache._tiles = Object.fromEntries(
                  Object.entries(cache._tiles || {}).filter(
                    ([key]: [string, any]) => visibleTileIds.includes(key)
                  )
                );
              }
            }
          });
        }

        // Trigger garbage collection for WebGL resources
        const gl = (map as any).painter?.context?.gl;
        if (gl) {
          // Clear unused textures
          if ((map as any).painter?.texturePool) {
            (map as any).painter.texturePool.clear();
          }
        }
      } catch (error) {
        console.error('⚠️ [MapLibre Memory] Error during cleanup:', error);
      }
    });
  }

  /**
   * Register a callback for memory pressure events
   */
  onMemoryPressure(callback: () => void): () => void {
    this.memoryPressureCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.memoryPressureCallbacks.indexOf(callback);
      if (index > -1) {
        this.memoryPressureCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Force immediate memory cleanup
   */
  forceCleanup(): void {
    console.log('🔧 [MapLibre Memory] Forcing immediate cleanup...');
    this.performMemoryCleanup();
  }

  /**
   * Dispose of the memory manager
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Unregister all maps
    this.mapInstances.forEach(map => this.unregisterMap(map));
    this.mapInstances.clear();
    this.contextLossHandlers.clear();
    this.memoryPressureCallbacks = [];
    
    MapLibreMemoryManager.instance = null;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    mapCount: number;
    isRecovering: boolean;
    memoryUsage?: number;
  } {
    const stats: any = {
      mapCount: this.mapInstances.size,
      isRecovering: this.isRecovering
    };

    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      stats.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }

    return stats;
  }
}

// Export singleton getter
export function getMapLibreMemoryManager(config?: MapLibreMemoryConfig): MapLibreMemoryManager {
  return MapLibreMemoryManager.getInstance(config);
}