/**
 * React Optimization Utilities for TruckNav Pro
 * 
 * Provides hooks and utilities to optimize React component performance
 * and prevent memory leaks
 */

import { useEffect, useRef, useCallback, DependencyList, MutableRefObject } from 'react';

/**
 * Enhanced useEffect that automatically cancels async operations on unmount
 */
export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void> | void,
  deps: DependencyList
): void {
  useEffect(() => {
    const abortController = new AbortController();
    
    const executeEffect = async () => {
      try {
        await effect(abortController.signal);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('[useAsyncEffect] Error in async effect:', error);
        }
      }
    };
    
    executeEffect();
    
    return () => {
      abortController.abort();
    };
  }, deps);
}

/**
 * Debounced callback hook with automatic cleanup
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);
  
  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay, ...deps]) as T;
  
  return debouncedCallback;
}

/**
 * Throttled callback hook with automatic cleanup
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList = []
): T {
  const lastRunRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);
  
  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;
    
    if (timeSinceLastRun >= delay) {
      lastRunRef.current = now;
      callbackRef.current(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastRunRef.current = Date.now();
        callbackRef.current(...args);
      }, delay - timeSinceLastRun);
    }
  }, [delay, ...deps]) as T;
  
  return throttledCallback;
}

/**
 * Safe state update hook that prevents updates after unmount
 */
export function useSafeState<T>(
  initialState: T | (() => T)
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialState);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  const setSafeState = useCallback((value: T | ((prev: T) => T)) => {
    if (mountedRef.current) {
      setState(value);
    }
  }, []);
  
  return [state, setSafeState];
}

/**
 * Cleanup manager for handling multiple cleanup functions
 */
export class CleanupManager {
  private cleanupFunctions: Array<() => void> = [];
  private disposed = false;
  
  add(cleanup: () => void): void {
    if (this.disposed) {
      console.warn('[CleanupManager] Cannot add cleanup to disposed manager');
      return;
    }
    
    this.cleanupFunctions.push(cleanup);
  }
  
  addTimeout(timeout: NodeJS.Timeout): void {
    this.add(() => clearTimeout(timeout));
  }
  
  addInterval(interval: NodeJS.Timeout): void {
    this.add(() => clearInterval(interval));
  }
  
  addAbortController(controller: AbortController): void {
    this.add(() => controller.abort());
  }
  
  addEventListener<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    listener: (ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    this.add(() => target.removeEventListener(type, listener, options));
  }
  
  cleanup(): void {
    if (this.disposed) {
      return;
    }
    
    // Execute all cleanup functions in reverse order
    while (this.cleanupFunctions.length > 0) {
      const cleanup = this.cleanupFunctions.pop();
      try {
        cleanup?.();
      } catch (error) {
        console.error('[CleanupManager] Error during cleanup:', error);
      }
    }
    
    this.disposed = true;
  }
  
  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Hook for managing multiple cleanup functions
 */
export function useCleanupManager(): CleanupManager {
  const managerRef = useRef<CleanupManager>();
  
  if (!managerRef.current) {
    managerRef.current = new CleanupManager();
  }
  
  useEffect(() => {
    return () => {
      managerRef.current?.cleanup();
    };
  }, []);
  
  return managerRef.current;
}

/**
 * Memory leak detector for development
 */
export function useMemoryLeakDetector(componentName: string): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  useEffect(() => {
    const startTime = Date.now();
    let intervalCount = 0;
    let timeoutCount = 0;
    let listenerCount = 0;
    
    // Override setTimeout to track timeouts
    const originalSetTimeout = window.setTimeout;
    (window as any).setTimeout = (...args: Parameters<typeof setTimeout>) => {
      timeoutCount++;
      const id = originalSetTimeout(...args);
      return id;
    };
    
    // Override setInterval to track intervals
    const originalSetInterval = window.setInterval;
    (window as any).setInterval = (...args: Parameters<typeof setInterval>) => {
      intervalCount++;
      const id = originalSetInterval(...args);
      return id;
    };
    
    // Override addEventListener to track listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(...args: any[]) {
      listenerCount++;
      return originalAddEventListener.apply(this, args as any);
    };
    
    return () => {
      // Restore original functions
      (window as any).setTimeout = originalSetTimeout;
      (window as any).setInterval = originalSetInterval;
      EventTarget.prototype.addEventListener = originalAddEventListener;
      
      const lifetime = Date.now() - startTime;
      
      if (timeoutCount > 10 || intervalCount > 5 || listenerCount > 20) {
        console.warn(
          `[MemoryLeakDetector] Potential leak in ${componentName}:`,
          {
            lifetime: `${(lifetime / 1000).toFixed(1)}s`,
            timeouts: timeoutCount,
            intervals: intervalCount,
            listeners: listenerCount
          }
        );
      }
    };
  }, [componentName]);
}

/**
 * Render counter for development debugging
 */
export function useRenderCounter(componentName: string, threshold = 10): void {
  const renderCount = useRef(0);
  const lastResetTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current++;
    
    const now = Date.now();
    const timeSinceReset = now - lastResetTime.current;
    
    // Check renders per second
    if (timeSinceReset >= 1000) {
      if (renderCount.current > threshold) {
        console.warn(
          `[RenderCounter] ${componentName} rendered ${renderCount.current} times in ${(timeSinceReset / 1000).toFixed(1)}s`
        );
      }
      
      renderCount.current = 0;
      lastResetTime.current = now;
    }
  });
}

/**
 * Prevent infinite re-renders by tracking dependency changes
 */
export function useDependencyTracker(
  deps: DependencyList,
  componentName: string
): void {
  const previousDeps = useRef<DependencyList>();
  const changeCount = useRef(0);
  const lastChangeTime = useRef(Date.now());
  
  useEffect(() => {
    if (previousDeps.current) {
      const now = Date.now();
      const timeSinceLastChange = now - lastChangeTime.current;
      
      // Check which dependencies changed
      const changedIndices: number[] = [];
      deps.forEach((dep, index) => {
        if (dep !== previousDeps.current![index]) {
          changedIndices.push(index);
        }
      });
      
      if (changedIndices.length > 0) {
        changeCount.current++;
        lastChangeTime.current = now;
        
        // Warn if changing too frequently
        if (timeSinceLastChange < 100 && changeCount.current > 5) {
          console.warn(
            `[DependencyTracker] Rapid dependency changes in ${componentName}:`,
            {
              changedIndices,
              changeCount: changeCount.current,
              timeBetweenChanges: `${timeSinceLastChange}ms`
            }
          );
        }
        
        // Reset counter after 1 second of stability
        if (timeSinceLastChange > 1000) {
          changeCount.current = 0;
        }
      }
    }
    
    previousDeps.current = [...deps];
  });
}

/**
 * Batch state updates to prevent excessive re-renders
 */
export function useBatchedState<T extends Record<string, any>>(
  initialState: T
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = useState(initialState);
  const pendingUpdates = useRef<Partial<T>>({});
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  const batchedSetState = useCallback((updates: Partial<T>) => {
    Object.assign(pendingUpdates.current, updates);
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, ...pendingUpdates.current }));
      pendingUpdates.current = {};
    }, 0); // Batch updates in next tick
  }, []);
  
  return [state, batchedSetState];
}

// Re-export React's useState for consistency
import { useState } from 'react';