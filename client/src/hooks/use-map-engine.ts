import { useState, useEffect } from 'react';

export type MapEngine = 'leaflet' | 'maplibre';

const MAP_ENGINE_KEY = 'trucknav_map_engine';

export function useMapEngine() {
  const [mapEngine, setMapEngine] = useState<MapEngine>(() => {
    try {
      const stored = localStorage.getItem(MAP_ENGINE_KEY);
      
      // Check WebGL support before defaulting to MapLibre
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const hasWebGL = !!gl;
      
      if (!hasWebGL) {
        console.log('🗺️ WebGL not available - using Leaflet fallback');
        localStorage.setItem(MAP_ENGINE_KEY, 'leaflet');
        return 'leaflet';
      }
      
      // Prefer MapLibre if WebGL is available
      if (!stored) {
        console.log('🗺️ Using default map engine: MapLibre (GPU-accelerated)');
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

  useEffect(() => {
    try {
      localStorage.setItem(MAP_ENGINE_KEY, mapEngine);
      console.log(`🗺️ Map engine saved: ${mapEngine}`);
      console.log(`💡 To toggle between engines, run: localStorage.setItem('trucknav_map_engine', '${mapEngine === 'leaflet' ? 'maplibre' : 'leaflet'}') and reload`);
    } catch (error) {
      console.warn('Failed to save map engine preference:', error);
    }
  }, [mapEngine]);

  const toggleMapEngine = () => {
    const newEngine = mapEngine === 'leaflet' ? 'maplibre' : 'leaflet';
    console.log(`🗺️ Toggling map engine from ${mapEngine} to ${newEngine}`);
    setMapEngine(newEngine);
  };

  return {
    mapEngine,
    setMapEngine,
    toggleMapEngine,
    isMapLibre: mapEngine === 'maplibre',
    isLeaflet: mapEngine === 'leaflet'
  };
}
