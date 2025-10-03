import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export type MapEngine = 'leaflet' | 'maplibre';

const MAP_ENGINE_KEY = 'trucknav_map_engine';
const WEBGL_RETRY_COUNT_KEY = 'trucknav_webgl_retry_count';
const MAX_RETRY_ATTEMPTS = 3;

interface WebGLCapabilities {
  hasWebGL: boolean;
  hasRequiredExtensions: boolean;
  missingExtensions: string[];
  contextAttributes: Record<string, any>;
  renderer?: string;
  vendor?: string;
}

/**
 * Comprehensive WebGL capability detection
 * Checks for WebGL context AND required extensions for MapLibre GL
 */
function detectWebGLCapabilities(): WebGLCapabilities {
  const result: WebGLCapabilities = {
    hasWebGL: false,
    hasRequiredExtensions: false,
    missingExtensions: [],
    contextAttributes: {}
  };

  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl', { 
      antialias: true,
      alpha: true,
      stencil: true,
      depth: true
    }) || canvas.getContext('experimental-webgl', {
      antialias: true,
      alpha: true,
      stencil: true,
      depth: true
    })) as WebGLRenderingContext | null;

    if (!gl) {
      console.log('🗺️ WebGL context creation failed');
      return result;
    }

    result.hasWebGL = true;

    // Get context attributes
    result.contextAttributes = gl.getContextAttributes() || {};

    // Get GPU info (for debugging)
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      result.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      result.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    }

    // Required extensions for MapLibre GL to work properly
    const requiredExtensions = [
      'OES_standard_derivatives',      // Required for antialiasing
      'OES_element_index_uint',        // Required for large geometries
    ];

    // Recommended extensions (improve quality but not strictly required)
    const recommendedExtensions = [
      'OES_vertex_array_object',       // Performance optimization
      'WEBGL_depth_texture',           // Better depth rendering
      'OES_texture_float',             // High precision textures
      'OES_texture_half_float',        // Memory-efficient textures
    ];

    const allExtensions = [...requiredExtensions, ...recommendedExtensions];
    const missing: string[] = [];

    for (const ext of allExtensions) {
      if (!gl.getExtension(ext)) {
        missing.push(ext);
      }
    }

    // Check if REQUIRED extensions are present
    const requiredMissing = missing.filter(ext => requiredExtensions.includes(ext));
    result.hasRequiredExtensions = requiredMissing.length === 0;
    result.missingExtensions = missing;

    // Log detection results
    if (result.hasWebGL && result.hasRequiredExtensions) {
      console.log('🗺️ WebGL fully supported with all required extensions');
    } else if (result.hasWebGL) {
      console.log('🗺️ WebGL available but missing extensions:', result.missingExtensions);
    }

    // Log GPU information
    if (result.renderer) {
      console.log(`🗺️ GPU Renderer: ${result.renderer}`);
    }
    if (result.vendor) {
      console.log(`🗺️ GPU Vendor: ${result.vendor}`);
    }

    return result;
  } catch (error) {
    console.error('🗺️ WebGL detection error:', error);
    return result;
  }
}

export function useMapEngine() {
  const [mapEngine, setMapEngine] = useState<MapEngine>(() => {
    try {
      const stored = localStorage.getItem(MAP_ENGINE_KEY);
      
      // Perform comprehensive WebGL detection
      const capabilities = detectWebGLCapabilities();
      
      // Check if WebGL is available and has required extensions
      if (!capabilities.hasWebGL) {
        console.log('🗺️ WebGL not available - using Leaflet fallback');
        localStorage.setItem(MAP_ENGINE_KEY, 'leaflet');
        
        // Show toast notification (non-blocking, informational)
        setTimeout(() => {
          toast({
            title: "Map Engine: Leaflet (2D)",
            description: "Your device doesn't support WebGL. Using 2D maps.",
            variant: "default",
            duration: 5000,
          });
        }, 1000);
        
        return 'leaflet';
      }

      if (!capabilities.hasRequiredExtensions) {
        console.log('🗺️ WebGL missing required extensions - using Leaflet fallback');
        console.log('🗺️ Missing required extensions:', 
          capabilities.missingExtensions.filter(ext => 
            ['OES_standard_derivatives', 'OES_element_index_uint'].includes(ext)
          )
        );
        localStorage.setItem(MAP_ENGINE_KEY, 'leaflet');
        
        // Show toast notification with details
        setTimeout(() => {
          toast({
            title: "Map Engine: Leaflet (2D)",
            description: `WebGL extensions missing. Using 2D maps for compatibility.`,
            variant: "default",
            duration: 7000,
          });
        }, 1000);
        
        return 'leaflet';
      }
      
      // Prefer MapLibre if WebGL is available with required extensions
      if (!stored) {
        console.log('🗺️ Using default map engine: MapLibre (GPU-accelerated with 3D support)');
        localStorage.setItem(MAP_ENGINE_KEY, 'maplibre');
        return 'maplibre';
      }
      
      if (stored === 'leaflet' || stored === 'maplibre') {
        console.log(`🗺️ Map engine preference loaded: ${stored}`);
        return stored;
      }
    } catch (error) {
      console.warn('Failed to load map engine preference:', error);
    }
    
    // Fallback to Leaflet for safety
    console.log('🗺️ Using fallback map engine: leaflet');
    return 'leaflet';
  });

  const [retryCount, setRetryCount] = useState(() => {
    try {
      const count = localStorage.getItem(WEBGL_RETRY_COUNT_KEY);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [mapLibreInitFailed, setMapLibreInitFailed] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(MAP_ENGINE_KEY, mapEngine);
      console.log(`🗺️ Map engine saved: ${mapEngine}`);
      console.log(`💡 To toggle between engines, run: localStorage.setItem('trucknav_map_engine', '${mapEngine === 'leaflet' ? 'maplibre' : 'leaflet'}') and reload`);
    } catch (error) {
      console.warn('Failed to save map engine preference:', error);
    }
  }, [mapEngine]);

  // Listen for MapLibre initialization failures
  useEffect(() => {
    const handleMapLibreError = (event: CustomEvent) => {
      console.error('🗺️ MapLibre initialization failed:', event.detail);
      setMapLibreInitFailed(true);
      
      // Only auto-fallback if we haven't exceeded retry attempts
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        console.log('🗺️ Max retry attempts reached, forcing Leaflet fallback');
        
        toast({
          title: "Switched to Leaflet (2D)",
          description: "MapLibre failed to initialize after multiple attempts. Using 2D maps.",
          variant: "destructive",
          duration: 8000,
        });
        
        // Force fallback to Leaflet
        setMapEngine('leaflet');
        localStorage.setItem(MAP_ENGINE_KEY, 'leaflet');
        
        // Reset retry count
        setRetryCount(0);
        localStorage.setItem(WEBGL_RETRY_COUNT_KEY, '0');
      } else {
        // Show toast with retry option
        const newRetryCount = retryCount + 1;
        
        toast({
          title: "Map Loading Issue",
          description: `MapLibre failed to load (attempt ${newRetryCount}/${MAX_RETRY_ATTEMPTS}). Tap "Retry" to try again.`,
          variant: "destructive",
          duration: 10000,
          action: {
            altText: "Retry MapLibre",
            onClick: () => {
              console.log('🗺️ User requested MapLibre retry');
              retryMapLibre();
            },
            children: "Retry"
          } as any
        });
        
        // Increment retry count
        setRetryCount(newRetryCount);
        localStorage.setItem(WEBGL_RETRY_COUNT_KEY, newRetryCount.toString());
        
        // Auto-fallback to Leaflet for this session (but keep retry count)
        setMapEngine('leaflet');
      }
    };

    window.addEventListener('maplibre-init-error' as any, handleMapLibreError);
    
    return () => {
      window.removeEventListener('maplibre-init-error' as any, handleMapLibreError);
    };
  }, [retryCount]);

  const retryMapLibre = useCallback(() => {
    console.log('🗺️ Retrying MapLibre initialization');
    
    // Re-check WebGL capabilities
    const capabilities = detectWebGLCapabilities();
    
    if (!capabilities.hasWebGL || !capabilities.hasRequiredExtensions) {
      toast({
        title: "Cannot Retry",
        description: "WebGL is still not available. Please check your device settings or use 2D maps.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    // Reset failure state and force MapLibre
    setMapLibreInitFailed(false);
    localStorage.setItem(MAP_ENGINE_KEY, 'maplibre');
    
    // Show loading toast
    toast({
      title: "Retrying MapLibre",
      description: "Reloading page to retry 3D map engine...",
      duration: 2000,
    });
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }, []);

  const toggleMapEngine = useCallback(() => {
    const newEngine = mapEngine === 'leaflet' ? 'maplibre' : 'leaflet';
    console.log(`🗺️ Toggling map engine from ${mapEngine} to ${newEngine}`);
    
    if (newEngine === 'maplibre') {
      // Check if MapLibre is supported before switching
      const capabilities = detectWebGLCapabilities();
      
      if (!capabilities.hasWebGL || !capabilities.hasRequiredExtensions) {
        toast({
          title: "MapLibre Not Supported",
          description: "Your device doesn't support the required WebGL features for 3D maps.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
      
      // Reset retry count when manually switching
      setRetryCount(0);
      localStorage.setItem(WEBGL_RETRY_COUNT_KEY, '0');
    }
    
    setMapEngine(newEngine);
    
    // Reload to apply changes
    toast({
      title: `Switching to ${newEngine === 'maplibre' ? 'MapLibre (3D)' : 'Leaflet (2D)'}`,
      description: "Reloading page to apply changes...",
      duration: 2000,
    });
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }, [mapEngine]);

  const forceLeafletFallback = useCallback(() => {
    console.log('🗺️ Forcing Leaflet fallback');
    setMapEngine('leaflet');
    localStorage.setItem(MAP_ENGINE_KEY, 'leaflet');
    
    toast({
      title: "Switched to Leaflet (2D)",
      description: "Using 2D maps for better compatibility.",
      duration: 3000,
    });
  }, []);

  return {
    mapEngine,
    setMapEngine,
    toggleMapEngine,
    retryMapLibre,
    forceLeafletFallback,
    mapLibreInitFailed,
    isMapLibre: mapEngine === 'maplibre',
    isLeaflet: mapEngine === 'leaflet',
    retryCount,
    maxRetries: MAX_RETRY_ATTEMPTS
  };
}

/**
 * Hook to emit MapLibre initialization errors
 * Use this in MapLibre component to report failures
 */
export function useMapLibreErrorReporting() {
  const reportError = useCallback((error: Error | string) => {
    const event = new CustomEvent('maplibre-init-error', {
      detail: { error }
    });
    window.dispatchEvent(event);
  }, []);

  return { reportError };
}
