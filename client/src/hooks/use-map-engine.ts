import { useState, useEffect } from 'react';

export type MapEngine = 'leaflet' | 'maplibre';

const MAP_ENGINE_KEY = 'trucknav_map_engine';

export function useMapEngine() {
  const [mapEngine, setMapEngine] = useState<MapEngine>(() => {
    try {
      const stored = localStorage.getItem(MAP_ENGINE_KEY);
      if (stored === 'leaflet' || stored === 'maplibre') {
        console.log(`🗺️ Map engine preference loaded: ${stored}`);
        return stored;
      }
    } catch (error) {
      console.warn('Failed to load map engine preference:', error);
    }
    // Default to Leaflet (stable, proven implementation)
    console.log('🗺️ Using default map engine: leaflet');
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
