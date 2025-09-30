import { useState, useEffect } from 'react';

export type MapEngine = 'leaflet' | 'maplibre';

const MAP_ENGINE_KEY = 'trucknav_map_engine';

export function useMapEngine() {
  const [mapEngine, setMapEngine] = useState<MapEngine>(() => {
    try {
      const stored = localStorage.getItem(MAP_ENGINE_KEY);
      if (stored === 'leaflet' || stored === 'maplibre') {
        return stored;
      }
    } catch (error) {
      console.warn('Failed to load map engine preference:', error);
    }
    // Default to Leaflet (stable, proven implementation)
    return 'leaflet';
  });

  useEffect(() => {
    try {
      localStorage.setItem(MAP_ENGINE_KEY, mapEngine);
    } catch (error) {
      console.warn('Failed to save map engine preference:', error);
    }
  }, [mapEngine]);

  const toggleMapEngine = () => {
    setMapEngine(prev => prev === 'leaflet' ? 'maplibre' : 'leaflet');
  };

  return {
    mapEngine,
    setMapEngine,
    toggleMapEngine,
    isMapLibre: mapEngine === 'maplibre',
    isLeaflet: mapEngine === 'leaflet'
  };
}
