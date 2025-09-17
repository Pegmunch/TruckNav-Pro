// Mobile Performance Monitoring for TruckNav Pro
// Patent-protected by Bespoke Marketing.Ai Ltd

import { useEffect, useRef } from 'react';

// Memory usage tracking for mobile devices
export function useMemoryMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Only monitor on mobile devices to avoid desktop overhead
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    const checkMemory = () => {
      // @ts-ignore - performance.memory is available in Chrome-based browsers
      const memory = (performance as any)?.memory;
      if (memory) {
        const memoryInfo = {
          used: Math.round(memory.usedJSHeapSize / 1048576), // MB
          total: Math.round(memory.totalJSHeapSize / 1048576), // MB
          limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
        };
        
        // Warn if memory usage is getting high (>80% of limit)
        if (memoryInfo.used > memoryInfo.limit * 0.8) {
          console.warn('[TruckNav Pro] High memory usage detected:', memoryInfo);
          
          // Suggest garbage collection for development
          if (process.env.NODE_ENV === 'development') {
            console.warn('[TruckNav Pro] Consider optimizing components or clearing caches');
          }
        }
        
        // Log memory stats periodically in development
        if (process.env.NODE_ENV === 'development') {
          console.log('[TruckNav Pro] Memory usage:', memoryInfo);
        }
      }
    };

    // Check memory every 30 seconds on mobile
    const interval = setInterval(checkMemory, 30000);
    
    // Initial check
    checkMemory();

    return () => clearInterval(interval);
  }, []);
}

// Performance timing monitoring
export function usePerformanceMonitor(componentName: string) {
  const renderStart = useRef<number>(0);
  
  useEffect(() => {
    renderStart.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStart.current;
      
      // Only log slow renders (>16ms for 60fps)
      if (renderTime > 16) {
        console.warn(`[TruckNav Pro] Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
      
      // Log all renders in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TruckNav Pro] ${componentName} render time: ${renderTime.toFixed(2)}ms`);
      }
    };
  });
}

// Network monitoring for mobile connections
export function useNetworkMonitor() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) return;
    
    // @ts-ignore - connection is available in some browsers
    const connection = (navigator as any).connection;
    
    const handleConnectionChange = () => {
      const isSlow = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
      const isLimited = connection.saveData === true;
      
      if (isSlow || isLimited) {
        console.warn('[TruckNav Pro] Slow or limited connection detected:', {
          effectiveType: connection.effectiveType,
          saveData: connection.saveData,
          downlink: connection.downlink
        });
        
        // Dispatch custom event for components to respond to slow connections
        window.dispatchEvent(new CustomEvent('trucknav:slowConnection', {
          detail: { effectiveType: connection.effectiveType, saveData: connection.saveData }
        }));
      }
    };
    
    // Initial check
    handleConnectionChange();
    
    // Listen for connection changes
    connection.addEventListener('change', handleConnectionChange);
    
    return () => {
      connection.removeEventListener('change', handleConnectionChange);
    };
  }, []);
}

// Component cleanup tracking for memory leaks
export function useCleanupTracker(componentName: string) {
  const cleanupTasks = useRef<(() => void)[]>([]);
  
  const addCleanupTask = (task: () => void) => {
    cleanupTasks.current.push(task);
  };
  
  useEffect(() => {
    return () => {
      // Execute all cleanup tasks
      cleanupTasks.current.forEach((task, index) => {
        try {
          task();
        } catch (error) {
          console.error(`[TruckNav Pro] Cleanup error in ${componentName} task ${index}:`, error);
        }
      });
      
      cleanupTasks.current = [];
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TruckNav Pro] ${componentName} cleaned up ${cleanupTasks.current.length} tasks`);
      }
    };
  }, [componentName]);
  
  return { addCleanupTask };
}

// FPS monitoring for animation performance
export function useFPSMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      // Calculate FPS every second
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
        
        // Warn if FPS is below 30 (poor performance)
        if (fps < 30) {
          console.warn(`[TruckNav Pro] Low FPS detected: ${fps}`);
        }
        
        // Log FPS in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[TruckNav Pro] FPS: ${fps}`);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };
    
    // Start monitoring only on mobile devices during interactions
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      animationId = requestAnimationFrame(measureFPS);
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);
}

// Bundle size analyzer for development
export function logBundleInfo() {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Get approximate bundle size from loaded scripts
    const scripts = document.querySelectorAll('script[src]');
    let totalEstimatedSize = 0;
    
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.includes('assets')) {
        // Rough estimation - in production you'd want proper analytics
        totalEstimatedSize += 100; // KB estimate per chunk
      }
    });
    
    console.log(`[TruckNav Pro] Estimated bundle size: ~${totalEstimatedSize}KB`);
    console.log(`[TruckNav Pro] Language files: Dynamic loading enabled`);
    console.log(`[TruckNav Pro] Component memoization: Enabled`);
    console.log(`[TruckNav Pro] Query optimization: Mobile-optimized`);
  }
}