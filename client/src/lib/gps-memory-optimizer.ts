/**
 * GPS Memory Optimizer for TruckNav Pro
 * 
 * Optimizes GPS tracking to prevent memory leaks and improve error recovery
 * Features:
 * - Position data buffering with automatic cleanup
 * - Retry logic with exponential backoff
 * - Memory pressure detection
 * - Timeout handling for stuck requests
 */

export interface GPSMemoryConfig {
  maxPositionHistory?: number;
  positionRetentionTime?: number;
  maxRetryAttempts?: number;
  retryBackoffMs?: number;
  stalePositionThreshold?: number;
  memoryPressureThreshold?: number;
}

export interface PositionBuffer {
  positions: Array<{
    coords: GeolocationCoordinates;
    timestamp: number;
  }>;
  lastCleanup: number;
}

export class GPSMemoryOptimizer {
  private static instance: GPSMemoryOptimizer | null = null;
  private positionBuffer: PositionBuffer;
  private readonly config: Required<GPSMemoryConfig>;
  private retryCount: Map<string, number> = new Map();
  private timeoutHandles: Map<number, NodeJS.Timeout> = new Map();
  private watchPositionTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private lastSuccessfulPosition: GeolocationPosition | null = null;
  private memoryCheckInterval?: NodeJS.Timeout;

  constructor(config: GPSMemoryConfig = {}) {
    this.config = {
      maxPositionHistory: config.maxPositionHistory ?? 50,
      positionRetentionTime: config.positionRetentionTime ?? 60000, // 1 minute
      maxRetryAttempts: config.maxRetryAttempts ?? 5,
      retryBackoffMs: config.retryBackoffMs ?? 1000,
      stalePositionThreshold: config.stalePositionThreshold ?? 30000, // 30 seconds
      memoryPressureThreshold: config.memoryPressureThreshold ?? 0.8
    };

    this.positionBuffer = {
      positions: [],
      lastCleanup: Date.now()
    };

    this.startMemoryMonitoring();
  }

  static getInstance(config?: GPSMemoryConfig): GPSMemoryOptimizer {
    if (!GPSMemoryOptimizer.instance) {
      GPSMemoryOptimizer.instance = new GPSMemoryOptimizer(config);
    }
    return GPSMemoryOptimizer.instance;
  }

  /**
   * Enhanced watchPosition with memory management and timeout handling
   */
  watchPositionEnhanced(
    successCallback: PositionCallback,
    errorCallback: PositionErrorCallback | null,
    options?: PositionOptions
  ): number {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Clear any timeout for this watch
        const timeout = this.watchPositionTimeouts.get(watchId);
        if (timeout) {
          clearTimeout(timeout);
          this.watchPositionTimeouts.delete(watchId);
        }

        // Store position in buffer
        this.addPositionToBuffer(position);
        
        // Update last successful position
        this.lastSuccessfulPosition = position;
        
        // Reset retry count on success
        this.retryCount.delete(`watch_${watchId}`);
        
        // Call original callback
        successCallback(position);
        
        // Set up timeout for next position
        this.setupPositionTimeout(watchId, errorCallback, options?.timeout);
      },
      (error) => {
        // Handle timeout and retry logic
        this.handlePositionError(watchId, error, errorCallback, options);
      },
      options
    );

    // Set up initial timeout
    this.setupPositionTimeout(watchId, errorCallback, options?.timeout);

    console.log(`[GPS-Optimizer] Enhanced watch started: ${watchId}`);
    return watchId;
  }

  /**
   * Clear watch position with cleanup
   */
  clearWatchEnhanced(watchId: number): void {
    // Clear the actual watch
    navigator.geolocation.clearWatch(watchId);
    
    // Clean up timeouts
    const timeout = this.watchPositionTimeouts.get(watchId);
    if (timeout) {
      clearTimeout(timeout);
      this.watchPositionTimeouts.delete(watchId);
    }
    
    // Clean up retry counts
    this.retryCount.delete(`watch_${watchId}`);
    
    console.log(`[GPS-Optimizer] Enhanced watch cleared: ${watchId}`);
  }

  /**
   * Set up position timeout handler
   */
  private setupPositionTimeout(
    watchId: number,
    errorCallback: PositionErrorCallback | null,
    timeoutMs: number = 10000
  ): void {
    // Clear any existing timeout
    const existingTimeout = this.watchPositionTimeouts.get(watchId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      console.warn(`[GPS-Optimizer] Position timeout for watch ${watchId}`);
      
      // Use last successful position if available and not stale
      if (this.lastSuccessfulPosition && !this.isPositionStale(this.lastSuccessfulPosition)) {
        console.log(`[GPS-Optimizer] Using cached position for watch ${watchId}`);
        // Don't call success callback here as it might cause issues
        // Instead, trigger a manual position update
        this.triggerManualPositionUpdate(watchId);
      } else if (errorCallback) {
        // Create a timeout error
        const timeoutError: GeolocationPositionError = {
          code: GeolocationPositionError.TIMEOUT,
          message: 'GPS position timeout',
          PERMISSION_DENIED: GeolocationPositionError.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: GeolocationPositionError.POSITION_UNAVAILABLE,
          TIMEOUT: GeolocationPositionError.TIMEOUT
        };
        errorCallback(timeoutError);
      }
    }, timeoutMs * 2); // Double the timeout to avoid false positives

    this.watchPositionTimeouts.set(watchId, timeout);
  }

  /**
   * Handle position errors with retry logic
   */
  private handlePositionError(
    watchId: number,
    error: GeolocationPositionError,
    errorCallback: PositionErrorCallback | null,
    options?: PositionOptions
  ): void {
    const retryKey = `watch_${watchId}`;
    const retryCount = this.retryCount.get(retryKey) || 0;

    console.error(`[GPS-Optimizer] Position error for watch ${watchId}:`, error);

    // Check if we should retry
    if (this.shouldRetry(error, retryCount)) {
      this.retryCount.set(retryKey, retryCount + 1);
      const backoffTime = this.calculateBackoff(retryCount);
      
      console.log(`[GPS-Optimizer] Retrying watch ${watchId} in ${backoffTime}ms (attempt ${retryCount + 1})`);
      
      setTimeout(() => {
        // Try to trigger a manual position update
        this.triggerManualPositionUpdate(watchId);
      }, backoffTime);
    } else {
      // Max retries reached or non-retryable error
      if (errorCallback) {
        errorCallback(error);
      }
      
      // Reset retry count after max attempts
      if (retryCount >= this.config.maxRetryAttempts) {
        this.retryCount.delete(retryKey);
      }
    }
  }

  /**
   * Determine if error is retryable
   */
  private shouldRetry(error: GeolocationPositionError, retryCount: number): boolean {
    if (retryCount >= this.config.maxRetryAttempts) {
      return false;
    }

    // Retry for timeout and unavailable errors
    return error.code === GeolocationPositionError.TIMEOUT ||
           error.code === GeolocationPositionError.POSITION_UNAVAILABLE;
  }

  /**
   * Calculate exponential backoff time
   */
  private calculateBackoff(retryCount: number): number {
    return Math.min(
      this.config.retryBackoffMs * Math.pow(2, retryCount),
      30000 // Max 30 seconds
    );
  }

  /**
   * Add position to buffer with cleanup
   */
  private addPositionToBuffer(position: GeolocationPosition): void {
    const now = Date.now();
    
    // Add new position
    this.positionBuffer.positions.push({
      coords: position.coords,
      timestamp: position.timestamp
    });

    // Cleanup old positions periodically
    if (now - this.positionBuffer.lastCleanup > 10000) { // Every 10 seconds
      this.cleanupPositionBuffer();
      this.positionBuffer.lastCleanup = now;
    }
  }

  /**
   * Clean up old positions from buffer
   */
  private cleanupPositionBuffer(): void {
    const now = Date.now();
    const cutoffTime = now - this.config.positionRetentionTime;
    
    // Remove old positions
    const beforeCount = this.positionBuffer.positions.length;
    this.positionBuffer.positions = this.positionBuffer.positions.filter(
      pos => pos.timestamp > cutoffTime
    );
    
    // Also limit by max count
    if (this.positionBuffer.positions.length > this.config.maxPositionHistory) {
      this.positionBuffer.positions = this.positionBuffer.positions.slice(
        -this.config.maxPositionHistory
      );
    }
    
    const removed = beforeCount - this.positionBuffer.positions.length;
    if (removed > 0) {
      console.log(`[GPS-Optimizer] Cleaned up ${removed} old positions`);
    }
  }

  /**
   * Check if position is stale
   */
  private isPositionStale(position: GeolocationPosition): boolean {
    return Date.now() - position.timestamp > this.config.stalePositionThreshold;
  }

  /**
   * Trigger manual position update (fallback mechanism)
   */
  private triggerManualPositionUpdate(watchId: number): void {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log(`[GPS-Optimizer] Manual position update successful for watch ${watchId}`);
        this.addPositionToBuffer(position);
        this.lastSuccessfulPosition = position;
      },
      (error) => {
        console.error(`[GPS-Optimizer] Manual position update failed for watch ${watchId}:`, error);
      },
      {
        enableHighAccuracy: false, // Use lower accuracy for faster response
        timeout: 5000,
        maximumAge: 30000 // Accept slightly older positions
      }
    );
  }

  /**
   * Start monitoring memory pressure
   */
  private startMemoryMonitoring(): void {
    if (!('memory' in performance)) {
      return;
    }

    this.memoryCheckInterval = setInterval(() => {
      const memory = (performance as any).memory;
      const memoryRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      if (memoryRatio > this.config.memoryPressureThreshold) {
        console.warn(`[GPS-Optimizer] High memory pressure detected: ${(memoryRatio * 100).toFixed(1)}%`);
        this.performAggressiveCleanup();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform aggressive cleanup under memory pressure
   */
  private performAggressiveCleanup(): void {
    // Clear most of the position buffer
    const keepCount = Math.min(5, this.positionBuffer.positions.length);
    this.positionBuffer.positions = this.positionBuffer.positions.slice(-keepCount);
    
    // Clear retry counts
    this.retryCount.clear();
    
    console.log('[GPS-Optimizer] Aggressive cleanup performed due to memory pressure');
  }

  /**
   * Get position statistics
   */
  getStats(): {
    bufferSize: number;
    retryCount: number;
    hasLastPosition: boolean;
    lastPositionAge: number | null;
  } {
    return {
      bufferSize: this.positionBuffer.positions.length,
      retryCount: this.retryCount.size,
      hasLastPosition: this.lastSuccessfulPosition !== null,
      lastPositionAge: this.lastSuccessfulPosition 
        ? Date.now() - this.lastSuccessfulPosition.timestamp
        : null
    };
  }

  /**
   * Dispose of the optimizer
   */
  dispose(): void {
    // Clear all timeouts
    this.watchPositionTimeouts.forEach(timeout => clearTimeout(timeout));
    this.watchPositionTimeouts.clear();
    
    // Clear memory monitoring
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
    
    // Clear buffers
    this.positionBuffer.positions = [];
    this.retryCount.clear();
    
    GPSMemoryOptimizer.instance = null;
    console.log('[GPS-Optimizer] Disposed');
  }
}

// Export singleton getter
export function getGPSOptimizer(config?: GPSMemoryConfig): GPSMemoryOptimizer {
  return GPSMemoryOptimizer.getInstance(config);
}