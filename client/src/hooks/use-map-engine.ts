import { useState, useEffect } from 'react';

export type MapEngine = 'leaflet' | 'maplibre';

const MAP_ENGINE_KEY = 'trucknav_map_engine';

export function useMapEngine() {
  const [mapEngine, setMapEngine] = useState<MapEngine>(() => {
    try {
      const stored = localStorage.getItem(MAP_ENGINE_KEY);
      // Force migration to MapLibre as default (override old 'leaflet' settings)
      if (!stored || stored === 'leaflet') {
        console.log('🗺️ Migrating to MapLibre (new default, GPU-accelerated)');
        localStorage.setItem(MAP_ENGINE_KEY, 'maplibre');
        return 'maplibre';
      }
      if (stored === 'maplibre') {
        console.log('🗺️ Map engine preference loaded: maplibre');
        return 'maplibre';
      }
    } catch (error) {
      console.warn('Failed to load map engine preference:', error);
    }
    // Fallback default
    console.log('🗺️ Using default map engine: maplibre');
    return 'maplibre';
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
