import { useState, useEffect, useCallback } from 'react';

export interface OriginHistoryItem {
  id: string;
  label: string;
  formattedAddress: string;
  coordinates: { lat: number; lng: number };
  lastUsedAt: number;
  useCount: number;
}

const STORAGE_KEY = 'navigation_recentOrigins';
const SYNC_EVENT = 'origin-history-sync';
const MAX_ORIGINS = 20;

function generateId(coords: { lat: number; lng: number }): string {
  return `${coords.lat.toFixed(5)}_${coords.lng.toFixed(5)}`;
}

function loadFromStorage(): OriginHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[ORIGIN-HISTORY] Failed to load from storage:', e);
  }
  return [];
}

function saveToStorage(origins: OriginHistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(origins));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: origins }));
  } catch (e) {
    console.error('[ORIGIN-HISTORY] Failed to save to storage:', e);
  }
}

export function useOriginHistory() {
  const [origins, setOrigins] = useState<OriginHistoryItem[]>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(origins);
  }, [origins]);

  useEffect(() => {
    const handleSync = (e: CustomEvent<OriginHistoryItem[]>) => {
      setOrigins(e.detail);
    };
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOrigins(parsed);
          }
        } catch (err) {
          console.error('[ORIGIN-HISTORY] Failed to parse storage event:', err);
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

  const addOrigin = useCallback((
    label: string,
    formattedAddress: string,
    coordinates: { lat: number; lng: number }
  ) => {
    if (!coordinates || !formattedAddress) return;
    if (formattedAddress.toLowerCase().includes('current location')) return;

    const id = generateId(coordinates);
    const now = Date.now();

    setOrigins(prev => {
      const existingIndex = prev.findIndex(o => o.id === id);
      
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const updated: OriginHistoryItem = {
          ...existing,
          label: label || existing.label,
          formattedAddress: formattedAddress || existing.formattedAddress,
          lastUsedAt: now,
          useCount: existing.useCount + 1
        };
        const newList = [updated, ...prev.filter((_, i) => i !== existingIndex)];
        console.log('[ORIGIN-HISTORY] Updated existing origin:', updated.formattedAddress);
        return newList.slice(0, MAX_ORIGINS);
      }

      const newItem: OriginHistoryItem = {
        id,
        label: label || formattedAddress.split(',')[0],
        formattedAddress,
        coordinates,
        lastUsedAt: now,
        useCount: 1
      };
      
      console.log('[ORIGIN-HISTORY] Added new origin:', newItem.formattedAddress);
      return [newItem, ...prev].slice(0, MAX_ORIGINS);
    });
  }, []);

  const removeOrigin = useCallback((id: string) => {
    setOrigins(prev => prev.filter(o => o.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setOrigins([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    origins,
    addOrigin,
    removeOrigin,
    clearAll,
    isEmpty: origins.length === 0
  };
}
