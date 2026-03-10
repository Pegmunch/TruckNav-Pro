import { useState, useEffect, useCallback } from 'react';

export interface DestinationHistoryItem {
  id: string;
  label: string;
  formattedAddress: string;
  coordinates: { lat: number; lng: number };
  lastVisitedAt: number;
  visitCount: number;
}

const STORAGE_KEY = 'navigation_recentDestinations';
const SYNC_EVENT = 'destination-history-sync';
const MAX_DESTINATIONS = 20;

function generateId(coords: { lat: number; lng: number }): string {
  return `${coords.lat.toFixed(5)}_${coords.lng.toFixed(5)}`;
}

function loadFromStorage(): DestinationHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[DEST-HISTORY] Failed to load from storage:', e);
  }
  return [];
}

function saveToStorage(destinations: DestinationHistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(destinations));
    // Dispatch custom event for same-tab sync (storage event only fires in other tabs)
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: destinations }));
  } catch (e) {
    console.error('[DEST-HISTORY] Failed to save to storage:', e);
  }
}

export function useDestinationHistory() {
  const [destinations, setDestinations] = useState<DestinationHistoryItem[]>(() => loadFromStorage());

  // Save to storage when destinations change
  useEffect(() => {
    saveToStorage(destinations);
  }, [destinations]);

  // Listen for sync events from other hook instances in the same tab
  useEffect(() => {
    const handleSync = (e: CustomEvent<DestinationHistoryItem[]>) => {
      setDestinations(e.detail);
    };
    
    // Listen for storage events from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setDestinations(parsed);
          }
        } catch (err) {
          console.error('[DEST-HISTORY] Failed to parse storage event:', err);
        }
      }
    };
    
    window.addEventListener(SYNC_EVENT, handleSync as EventListener);
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const addDestination = useCallback((
    label: string,
    formattedAddress: string,
    coordinates: { lat: number; lng: number }
  ) => {
    if (!coordinates || !formattedAddress) return;

    const id = generateId(coordinates);
    const now = Date.now();

    setDestinations(prev => {
      const existingIndex = prev.findIndex(d => d.id === id);
      
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const updated: DestinationHistoryItem = {
          ...existing,
          label: label || existing.label,
          formattedAddress: formattedAddress || existing.formattedAddress,
          lastVisitedAt: now,
          visitCount: existing.visitCount + 1
        };
        const newList = [updated, ...prev.filter((_, i) => i !== existingIndex)];
        console.log('[DEST-HISTORY] Updated existing destination:', updated.formattedAddress);
        return newList.slice(0, MAX_DESTINATIONS);
      }

      const newItem: DestinationHistoryItem = {
        id,
        label: label || formattedAddress.split(',')[0],
        formattedAddress,
        coordinates,
        lastVisitedAt: now,
        visitCount: 1
      };
      
      console.log('[DEST-HISTORY] Added new destination:', newItem.formattedAddress);
      return [newItem, ...prev].slice(0, MAX_DESTINATIONS);
    });
  }, []);

  const removeDestination = useCallback((id: string) => {
    setDestinations(prev => prev.filter(d => d.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setDestinations([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    destinations,
    addDestination,
    removeDestination,
    clearAll,
    isEmpty: destinations.length === 0
  };
}
