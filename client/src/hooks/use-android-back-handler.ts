import { useEffect, useCallback, useRef } from 'react';

interface BackHandlerOptions {
  enabled?: boolean;
  priority?: number; // Higher numbers get handled first
  onBackPress?: () => boolean; // Return true to prevent default behavior
}

/**
 * Custom hook for handling Android hardware back button
 * Provides professional truck navigation with proper back button handling
 */
export function useAndroidBackHandler(options: BackHandlerOptions = {}) {
  const {
    enabled = true,
    priority = 0,
    onBackPress
  } = options;

  const handlerRef = useRef(onBackPress);
  const enabledRef = useRef(enabled);
  const priorityRef = useRef(priority);

  // Update refs when props change
  useEffect(() => {
    handlerRef.current = onBackPress;
    enabledRef.current = enabled;
    priorityRef.current = priority;
  }, [onBackPress, enabled, priority]);

  // Check if we're on Android
  const isAndroid = useCallback(() => {
    return /Android/i.test(navigator.userAgent);
  }, []);

  // Handle back button press
  const handleBackPress = useCallback((event: PopStateEvent) => {
    if (!enabledRef.current || !handlerRef.current) {
      return false;
    }

    console.log('🔙 Android back button pressed - handling navigation');
    
    try {
      const shouldPreventDefault = handlerRef.current();
      
      if (shouldPreventDefault) {
        // Prevent the default browser back behavior
        event.preventDefault();
        // Push a new state to maintain navigation stack
        window.history.pushState(null, '', window.location.href);
        return true;
      }
    } catch (error) {
      console.error('Error handling Android back button:', error);
    }
    
    return false;
  }, []);

  // Register back button handler
  useEffect(() => {
    if (!isAndroid() || !enabled) {
      return;
    }

    // Add initial history state to capture back button
    const currentState = window.history.state;
    if (!currentState || !currentState.androidBackHandler) {
      window.history.pushState(
        { androidBackHandler: true, priority }, 
        '', 
        window.location.href
      );
    }

    // Listen for popstate events (back button)
    window.addEventListener('popstate', handleBackPress);
    
    console.log('🔧 Android back button handler registered with priority:', priority);

    return () => {
      window.removeEventListener('popstate', handleBackPress);
      console.log('🔧 Android back button handler unregistered');
    };
  }, [enabled, priority, handleBackPress, isAndroid]);

  // Utility to manually trigger back action
  const triggerBack = useCallback(() => {
    if (handlerRef.current) {
      return handlerRef.current();
    }
    return false;
  }, []);

  return {
    isAndroid: isAndroid(),
    triggerBack,
    enabled: enabledRef.current
  };
}

/**
 * Manager for multiple back handlers with priority system
 */
class AndroidBackHandlerManager {
  private handlers: Map<symbol, { handler: () => boolean; priority: number }> = new Map();
  private isListening = false;

  register(handler: () => boolean, priority: number = 0): symbol {
    const id = Symbol('back-handler');
    this.handlers.set(id, { handler, priority });
    
    if (!this.isListening) {
      this.startListening();
    }
    
    return id;
  }

  unregister(id: symbol): void {
    this.handlers.delete(id);
    
    if (this.handlers.size === 0 && this.isListening) {
      this.stopListening();
    }
  }

  private startListening(): void {
    if (!/Android/i.test(navigator.userAgent)) {
      return;
    }

    window.addEventListener('popstate', this.handlePopState);
    
    // Ensure we have a history state
    if (!window.history.state?.androidBackManager) {
      window.history.pushState(
        { androidBackManager: true }, 
        '', 
        window.location.href
      );
    }
    
    this.isListening = true;
    console.log('🔧 Android Back Handler Manager started');
  }

  private stopListening(): void {
    window.removeEventListener('popstate', this.handlePopState);
    this.isListening = false;
    console.log('🔧 Android Back Handler Manager stopped');
  }

  private handlePopState = (event: PopStateEvent): void => {
    // Sort handlers by priority (highest first)
    const sortedHandlers = Array.from(this.handlers.values())
      .sort((a, b) => b.priority - a.priority);

    // Execute handlers until one returns true (handles the back press)
    for (const { handler } of sortedHandlers) {
      try {
        if (handler()) {
          event.preventDefault();
          // Maintain history state
          window.history.pushState(
            { androidBackManager: true }, 
            '', 
            window.location.href
          );
          return;
        }
      } catch (error) {
        console.error('Error in Android back handler:', error);
      }
    }
  };
}

// Global manager instance
const backHandlerManager = new AndroidBackHandlerManager();

/**
 * Higher-level hook with automatic priority management
 */
export function useAndroidBackHandlerWithPriority(
  handler: (() => boolean) | undefined,
  priority: number = 0,
  enabled: boolean = true
) {
  const handlerRef = useRef(handler);
  const idRef = useRef<symbol | null>(null);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled || !handlerRef.current) {
      if (idRef.current) {
        backHandlerManager.unregister(idRef.current);
        idRef.current = null;
      }
      return;
    }

    const wrappedHandler = () => {
      return handlerRef.current?.() ?? false;
    };

    idRef.current = backHandlerManager.register(wrappedHandler, priority);

    return () => {
      if (idRef.current) {
        backHandlerManager.unregister(idRef.current);
        idRef.current = null;
      }
    };
  }, [enabled, priority]);

  return {
    isAndroid: /Android/i.test(navigator.userAgent),
    enabled
  };
}