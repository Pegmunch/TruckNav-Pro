/**
 * Fallback Handler for TruckNav Pro Map Windows
 * Provides graceful degradation when popup windows are blocked or unavailable
 */

interface FallbackOptions {
  onPopupBlocked?: () => void;
  onFallbackActivated?: (reason: string) => void;
  preferredFallback?: 'fullscreen' | 'expansion' | 'modal';
}

export class MapWindowFallbackHandler {
  private static instance: MapWindowFallbackHandler;
  private fallbackActive = false;

  private constructor() {}

  static getInstance(): MapWindowFallbackHandler {
    if (!MapWindowFallbackHandler.instance) {
      MapWindowFallbackHandler.instance = new MapWindowFallbackHandler();
    }
    return MapWindowFallbackHandler.instance;
  }

  /**
   * Attempts to open map window with fallback handling
   */
  async handleMapWindowRequest(options: FallbackOptions = {}): Promise<'opened' | 'fallback' | 'failed'> {
    try {
      // First, check if popups are supported
      if (!this.isPopupSupported()) {
        console.warn('Popup windows not supported, using fallback');
        return this.activateFallback('popup_not_supported', options);
      }

      // Attempt to open popup - this will be handled by window manager
      return 'opened'; // Assume success, window manager handles the actual opening
      
    } catch (error) {
      console.error('Failed to handle map window request:', error);
      return this.activateFallback('error', options);
    }
  }

  /**
   * Activates fallback behavior when popup windows fail
   */
  private activateFallback(reason: string, options: FallbackOptions): 'fallback' | 'failed' {
    this.fallbackActive = true;
    
    if (options.onFallbackActivated) {
      options.onFallbackActivated(reason);
    }

    const fallbackType = options.preferredFallback || 'expansion';

    switch (fallbackType) {
      case 'fullscreen':
        return this.activateFullscreenFallback();
      case 'expansion':
        return this.activateExpansionFallback();
      case 'modal':
        return this.activateModalFallback();
      default:
        return this.activateExpansionFallback();
    }
  }

  /**
   * Activates in-page map expansion as fallback
   */
  private activateExpansionFallback(): 'fallback' {
    // Trigger custom event for in-page map expansion
    const event = new CustomEvent('trucknav:fallback-expansion', {
      detail: { reason: 'popup-blocked' }
    });
    window.dispatchEvent(event);
    return 'fallback';
  }

  /**
   * Activates fullscreen mode as fallback
   */
  private activateFullscreenFallback(): 'fallback' {
    // Trigger custom event for fullscreen fallback
    const event = new CustomEvent('trucknav:fallback-fullscreen', {
      detail: { reason: 'popup-blocked' }
    });
    window.dispatchEvent(event);
    return 'fallback';
  }

  /**
   * Activates modal overlay as fallback
   */
  private activateModalFallback(): 'fallback' {
    // Trigger custom event for modal fallback
    const event = new CustomEvent('trucknav:fallback-modal', {
      detail: { reason: 'popup-blocked' }
    });
    window.dispatchEvent(event);
    return 'fallback';
  }

  /**
   * Checks if popup windows are supported by the browser
   */
  isPopupSupported(): boolean {
    try {
      // Check if window.open is available
      if (typeof window.open !== 'function') {
        return false;
      }

      // Try to open a minimal test popup
      const testWindow = window.open('', '_blank', 'width=1,height=1');
      if (testWindow) {
        testWindow.close();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Gets user-friendly fallback message based on browser
   */
  getFallbackMessage(browser?: string): string {
    const detected = browser || this.detectBrowser();
    
    const messages = {
      chrome: 'Map window blocked. Click the popup icon in the address bar or try the expanded in-page view.',
      firefox: 'Map window blocked. Click the shield icon or use the expanded map view below.',
      safari: 'Map window blocked. Allow popups in Safari preferences or use the expanded map.',
      edge: 'Map window blocked. Click the popup icon in the address bar or use the expanded view.',
      default: 'Map window blocked. Please allow popups or use the expanded in-page map view.'
    };

    return messages[detected as keyof typeof messages] || messages.default;
  }

  /**
   * Detects the user's browser for tailored guidance
   */
  private detectBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') && !userAgent.includes('edge')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    
    return 'unknown';
  }

  /**
   * Clears fallback state
   */
  clearFallback(): void {
    this.fallbackActive = false;
  }

  /**
   * Checks if fallback is currently active
   */
  isFallbackActive(): boolean {
    return this.fallbackActive;
  }

  /**
   * Provides automotive-specific fallback recommendations
   */
  getAutomotiveFallbackOptions(): Array<{ id: string; label: string; description: string }> {
    return [
      {
        id: 'expansion',
        label: 'Expand In-Page Map',
        description: 'Expands the current map to full size within this window'
      },
      {
        id: 'fullscreen',
        label: 'Fullscreen Mode',
        description: 'Opens the map in fullscreen mode (press ESC to exit)'
      },
      {
        id: 'settings',
        label: 'Check Browser Settings',
        description: 'Allow popups for this site to enable map windows'
      }
    ];
  }
}

// Export singleton instance for easy access
export const fallbackHandler = MapWindowFallbackHandler.getInstance();

// Utility functions for common operations
export const handleMapWindowFallback = (options?: FallbackOptions) => 
  fallbackHandler.handleMapWindowRequest(options);

export const isPopupSupported = () => 
  fallbackHandler.isPopupSupported();

export const getFallbackMessage = (browser?: string) => 
  fallbackHandler.getFallbackMessage(browser);