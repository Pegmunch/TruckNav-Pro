import { useState, useEffect, useCallback } from "react";
import { type VehicleProfile, type Route, type Journey } from "@shared/schema";

// Message types for cross-window communication
interface WindowSyncMessage {
  type: 'SYNC_STATE' | 'ROUTE_UPDATE' | 'PROFILE_UPDATE' | 'JOURNEY_UPDATE' | 
        'MAP_WINDOW_OPENED' | 'MAP_WINDOW_CLOSED' | 'REQUEST_SYNC' | 
        'MAP_EXPAND_REQUEST' | 'POPUP_BLOCKED';
  payload: any;
  timestamp: number;
  windowId: string;
}

interface WindowSyncState {
  currentRoute: Route | null;
  selectedProfile: VehicleProfile | null;
  activeJourney: Journey | null;
  isNavigating: boolean;
  fromLocation: string;
  toLocation: string;
  isMapWindowOpen: boolean;
  lastUpdated: number;
}

// Generate unique window ID for this instance
const WINDOW_ID = `window_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
const STORAGE_KEY = 'trucknav_window_sync';
const CHANNEL_NAME = 'trucknav_sync';

export function useWindowSync() {
  // Initialize state from localStorage if available
  const [syncState, setSyncState] = useState<WindowSyncState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {
        currentRoute: null,
        selectedProfile: null,
        activeJourney: null,
        isNavigating: false,
        fromLocation: "Manchester M1 Industrial Estate",
        toLocation: "Birmingham B1 Logistics Hub",
        isMapWindowOpen: false,
        lastUpdated: Date.now()
      };
    } catch {
      return {
        currentRoute: null,
        selectedProfile: null,
        activeJourney: null,
        isNavigating: false,
        fromLocation: "Manchester M1 Industrial Estate",
        toLocation: "Birmingham B1 Logistics Hub",
        isMapWindowOpen: false,
        lastUpdated: Date.now()
      };
    }
  });

  // BroadcastChannel for cross-window communication
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      setBroadcastChannel(channel);

      // Listen for messages from other windows
      const handleMessage = (event: MessageEvent<WindowSyncMessage>) => {
        try {
          const { type, payload, windowId, timestamp } = event.data;
          
          // Ignore messages from our own window
          if (windowId === WINDOW_ID) return;

          switch (type) {
            case 'SYNC_STATE':
              setSyncState(prevState => {
                // Only process newer messages
                if (timestamp <= prevState.lastUpdated) return prevState;
                return {
                  ...prevState,
                  ...payload,
                  lastUpdated: timestamp
                };
              });
              break;
              
            case 'ROUTE_UPDATE':
              setSyncState(prevState => {
                if (timestamp <= prevState.lastUpdated) return prevState;
                return {
                  ...prevState,
                  currentRoute: payload,
                  lastUpdated: timestamp
                };
              });
              break;
              
            case 'PROFILE_UPDATE':
              setSyncState(prevState => {
                if (timestamp <= prevState.lastUpdated) return prevState;
                return {
                  ...prevState,
                  selectedProfile: payload,
                  lastUpdated: timestamp
                };
              });
              break;
              
            case 'JOURNEY_UPDATE':
              setSyncState(prevState => {
                if (timestamp <= prevState.lastUpdated) return prevState;
                return {
                  ...prevState,
                  activeJourney: payload.journey,
                  isNavigating: payload.isNavigating,
                  lastUpdated: timestamp
                };
              });
              break;
              
            case 'MAP_WINDOW_OPENED':
              setSyncState(prevState => {
                if (timestamp <= prevState.lastUpdated) return prevState;
                return {
                  ...prevState,
                  isMapWindowOpen: true,
                  lastUpdated: timestamp
                };
              });
              break;
              
            case 'MAP_WINDOW_CLOSED':
              setSyncState(prevState => {
                if (timestamp <= prevState.lastUpdated) return prevState;
                return {
                  ...prevState,
                  isMapWindowOpen: false,
                  lastUpdated: timestamp
                };
              });
              break;
              
            case 'REQUEST_SYNC':
              // Send current state to requesting window
              try {
                const currentState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                const responseMessage: WindowSyncMessage = {
                  type: 'SYNC_STATE',
                  payload: currentState,
                  timestamp: Date.now(),
                  windowId: WINDOW_ID
                };
                channel.postMessage(responseMessage);
              } catch (error) {
                console.error('Failed to broadcast state:', error);
              }
              break;
              
            case 'MAP_EXPAND_REQUEST':
              // Request to expand/focus map window (handled by specific window)
              break;
              
            case 'POPUP_BLOCKED':
              // Handle popup blocked events for fallback behavior
              console.warn('Map window popup was blocked');
              break;
          }
        } catch (error) {
          console.error('Error handling window sync message:', error);
        }
      };

      channel.addEventListener('message', handleMessage);

      // Request sync from other windows on initialization
      try {
        const requestMessage: WindowSyncMessage = {
          type: 'REQUEST_SYNC',
          payload: null,
          timestamp: Date.now(),
          windowId: WINDOW_ID
        };
        channel.postMessage(requestMessage);
      } catch (error) {
        console.error('Failed to request sync on initialization:', error);
      }

      return () => {
        try {
          channel.removeEventListener('message', handleMessage);
          channel.close();
        } catch (error) {
          console.error('Error closing broadcast channel:', error);
        }
      };
    }
  }, []); // Empty dependency array - only run once on mount

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(syncState));
    } catch (error) {
      console.error('Failed to save window sync state:', error);
    }
  }, [syncState]);

  // Helper function to broadcast current state
  const broadcastCurrentState = useCallback((channel: BroadcastChannel) => {
    const message: WindowSyncMessage = {
      type: 'SYNC_STATE',
      payload: syncState,
      timestamp: Date.now(),
      windowId: WINDOW_ID
    };
    channel.postMessage(message);
  }, [syncState]);

  // Action functions to update state and broadcast changes
  const updateRoute = useCallback((route: Route | null) => {
    const timestamp = Date.now();
    setSyncState(prevState => ({
      ...prevState,
      currentRoute: route,
      lastUpdated: timestamp
    }));

    if (broadcastChannel) {
      try {
        const message: WindowSyncMessage = {
          type: 'ROUTE_UPDATE',
          payload: route,
          timestamp,
          windowId: WINDOW_ID
        };
        broadcastChannel.postMessage(message);
      } catch (error) {
        // Silently fail if channel is not ready or closed
        console.debug('BroadcastChannel not ready for route update');
      }
    }
  }, [broadcastChannel]);

  const updateProfile = useCallback((profile: VehicleProfile | null) => {
    const timestamp = Date.now();
    setSyncState(prevState => ({
      ...prevState,
      selectedProfile: profile,
      lastUpdated: timestamp
    }));

    if (broadcastChannel) {
      try {
        const message: WindowSyncMessage = {
          type: 'PROFILE_UPDATE',
          payload: profile,
          timestamp,
          windowId: WINDOW_ID
        };
        broadcastChannel.postMessage(message);
      } catch (error) {
        // Silently fail if channel is not ready or closed
        console.debug('BroadcastChannel not ready for profile update');
      }
    }
  }, [broadcastChannel]);

  const updateJourney = useCallback((journey: Journey | null, isNavigating: boolean) => {
    const timestamp = Date.now();
    setSyncState(prevState => ({
      ...prevState,
      activeJourney: journey,
      isNavigating,
      lastUpdated: timestamp
    }));

    if (broadcastChannel) {
      try {
        const message: WindowSyncMessage = {
          type: 'JOURNEY_UPDATE',
          payload: { journey, isNavigating },
          timestamp,
          windowId: WINDOW_ID
        };
        broadcastChannel.postMessage(message);
      } catch (error) {
        // Silently fail if channel is not ready or closed
        console.debug('BroadcastChannel not ready for journey update');
      }
    }
  }, [broadcastChannel]);

  const updateLocations = useCallback((fromLocation: string, toLocation: string) => {
    const timestamp = Date.now();
    setSyncState(prevState => ({
      ...prevState,
      fromLocation,
      toLocation,
      lastUpdated: timestamp
    }));

    if (broadcastChannel) {
      try {
        const message: WindowSyncMessage = {
          type: 'SYNC_STATE',
          payload: { fromLocation, toLocation },
          timestamp,
          windowId: WINDOW_ID
        };
        broadcastChannel.postMessage(message);
      } catch (error) {
        // Silently fail if channel is not ready or closed
        console.debug('BroadcastChannel not ready for location update');
      }
    }
  }, [broadcastChannel]);

  const openMapWindow = useCallback(() => {
    const timestamp = Date.now();
    setSyncState(prevState => ({
      ...prevState,
      isMapWindowOpen: true,
      lastUpdated: timestamp
    }));

    if (broadcastChannel) {
      try {
        const message: WindowSyncMessage = {
          type: 'MAP_WINDOW_OPENED',
          payload: null,
          timestamp,
          windowId: WINDOW_ID
        };
        broadcastChannel.postMessage(message);
      } catch (error) {
        console.error('Failed to broadcast map window opened:', error);
      }
    }
  }, [broadcastChannel]);

  const closeMapWindow = useCallback(() => {
    const timestamp = Date.now();
    setSyncState(prevState => ({
      ...prevState,
      isMapWindowOpen: false,
      lastUpdated: timestamp
    }));

    if (broadcastChannel) {
      try {
        const message: WindowSyncMessage = {
          type: 'MAP_WINDOW_CLOSED',
          payload: null,
          timestamp,
          windowId: WINDOW_ID
        };
        broadcastChannel.postMessage(message);
      } catch (error) {
        console.error('Failed to broadcast map window closed:', error);
      }
    }
  }, [broadcastChannel]);

  return {
    // Current state
    ...syncState,
    
    // Actions
    updateRoute,
    updateProfile,
    updateJourney,
    updateLocations,
    openMapWindow,
    closeMapWindow,
    
    // Utility
    windowId: WINDOW_ID,
    isConnected: !!broadcastChannel,
  };
}