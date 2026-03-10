/**
 * Window Manager for TruckNav Pro Map Windows
 * Handles popup window creation, management, and automotive compatibility
 */

interface WindowConfig {
  width: number;
  height: number;
  features: string[];
}

interface MapWindowOptions {
  automotive?: boolean;
  fallbackToFullscreen?: boolean;
  onPopupBlocked?: () => void;
  onWindowClosed?: () => void;
}

export class TruckNavWindowManager {
  private static instance: TruckNavWindowManager;
  private mapWindow: Window | null = null;
  private windowCheckInterval: number | null = null;
  private onWindowClosedCallback?: () => void;

  private constructor() {}

  static getInstance(): TruckNavWindowManager {
    if (!TruckNavWindowManager.instance) {
      TruckNavWindowManager.instance = new TruckNavWindowManager();
    }
    return TruckNavWindowManager.instance;
  }

  /**
   * Opens the map window with optimized settings for automotive displays
   */
  openMapWindow(options: MapWindowOptions = {}): Promise<Window | null> {
    return new Promise((resolve) => {
      try {
        // If map window is already open, focus it and return
        if (this.mapWindow && !this.mapWindow.closed) {
          this.mapWindow.focus();
          resolve(this.mapWindow);
          return;
        }

        // Get optimal window configuration
        const config = this.getOptimalWindowConfig(options.automotive);
        
        // Attempt to open popup window
        const url = `${window.location.origin}/map-window`;
        const windowFeatures = config.features.join(',');
        
        this.mapWindow = window.open(url, 'trucknav_map', windowFeatures);

        if (this.mapWindow) {
          // Popup opened successfully
          this.startWindowMonitoring(options.onWindowClosed);
          
          // Wait for window to load before resolving
          this.mapWindow.addEventListener('load', () => {
            resolve(this.mapWindow);
          });

          // Fallback resolve after timeout
          setTimeout(() => resolve(this.mapWindow), 1000);
        } else {
          // Popup was blocked
          console.warn('Map window popup was blocked by browser');
          if (options.onPopupBlocked) {
            options.onPopupBlocked();
          }
          
          if (options.fallbackToFullscreen) {
            this.fallbackToFullscreen();
          }
          resolve(null);
        }
      } catch (error) {
        console.error('Error opening map window:', error);
        if (options.onPopupBlocked) {
          options.onPopupBlocked();
        }
        resolve(null);
      }
    });
  }

  /**
   * Closes the map window if open
   */
  closeMapWindow(): void {
    if (this.mapWindow && !this.mapWindow.closed) {
      this.mapWindow.close();
    }
    this.cleanup();
  }

  /**
   * Checks if map window is currently open
   */
  isMapWindowOpen(): boolean {
    return this.mapWindow !== null && !this.mapWindow.closed;
  }

  /**
   * Gets reference to the map window
   */
  getMapWindow(): Window | null {
    if (this.mapWindow && !this.mapWindow.closed) {
      return this.mapWindow;
    }
    return null;
  }

  /**
   * Focuses the map window if open
   */
  focusMapWindow(): boolean {
    if (this.mapWindow && !this.mapWindow.closed) {
      this.mapWindow.focus();
      return true;
    }
    return false;
  }

  /**
   * Gets optimal window configuration based on display type
   */
  private getOptimalWindowConfig(automotive = false): WindowConfig {
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;

    if (automotive) {
      // Automotive displays are typically landscape and larger
      return {
        width: Math.min(screenWidth * 0.8, 1400),
        height: Math.min(screenHeight * 0.8, 800),
        features: [
          'resizable=yes',
          'scrollbars=no',
          'status=no',
          'menubar=no',
          'toolbar=no',
          'location=no',
          'directories=no',
          `width=${Math.min(screenWidth * 0.8, 1400)}`,
          `height=${Math.min(screenHeight * 0.8, 800)}`,
          `left=${Math.max(0, (screenWidth - Math.min(screenWidth * 0.8, 1400)) / 2)}`,
          `top=${Math.max(0, (screenHeight - Math.min(screenHeight * 0.8, 800)) / 2)}`
        ]
      };
    }

    // Standard desktop configuration
    return {
      width: Math.min(screenWidth * 0.7, 1200),
      height: Math.min(screenHeight * 0.7, 700),
      features: [
        'resizable=yes',
        'scrollbars=no',
        'status=no',
        'menubar=no',
        'toolbar=no',
        'location=no',
        'directories=no',
        `width=${Math.min(screenWidth * 0.7, 1200)}`,
        `height=${Math.min(screenHeight * 0.7, 700)}`,
        `left=${Math.max(0, (screenWidth - Math.min(screenWidth * 0.7, 1200)) / 2)}`,
        `top=${Math.max(0, (screenHeight - Math.min(screenHeight * 0.7, 700)) / 2)}`
      ]
    };
  }

  /**
   * Starts monitoring the window for close events
   */
  private startWindowMonitoring(onClosed?: () => void): void {
    this.onWindowClosedCallback = onClosed;
    
    if (this.windowCheckInterval) {
      clearInterval(this.windowCheckInterval);
    }

    this.windowCheckInterval = window.setInterval(() => {
      if (this.mapWindow && this.mapWindow.closed) {
        this.cleanup();
        if (this.onWindowClosedCallback) {
          this.onWindowClosedCallback();
        }
      }
    }, 1000);
  }

  /**
   * Fallback to fullscreen mode when popup is blocked
   */
  private fallbackToFullscreen(): void {
    // This would trigger the existing fullscreen functionality
    const event = new CustomEvent('trucknav:fallback-fullscreen', {
      detail: { reason: 'popup-blocked' }
    });
    window.dispatchEvent(event);
  }

  /**
   * Cleanup window references and intervals
   */
  private cleanup(): void {
    this.mapWindow = null;
    
    if (this.windowCheckInterval) {
      clearInterval(this.windowCheckInterval);
      this.windowCheckInterval = null;
    }
    
    this.onWindowClosedCallback = undefined;
  }

  /**
   * Handles browser compatibility and feature detection
   */
  static isPopupSupported(): boolean {
    try {
      // Check if window.open is available and not restricted
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
   * Gets user-friendly error message for popup failures
   */
  static getPopupBlockedMessage(): string {
    const browser = this.detectBrowser();
    
    switch (browser) {
      case 'chrome':
        return 'Popup blocked. Click the popup icon in the address bar and allow popups for this site.';
      case 'firefox':
        return 'Popup blocked. Click on the shield icon and allow popups for this site.';
      case 'safari':
        return 'Popup blocked. Go to Safari > Preferences > Websites > Pop-up Windows and allow for this site.';
      case 'edge':
        return 'Popup blocked. Click the popup icon in the address bar and allow popups for this site.';
      default:
        return 'Popup blocked. Please allow popups for this site in your browser settings.';
    }
  }

  /**
   * Simple browser detection for user guidance
   */
  private static detectBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') && !userAgent.includes('edge')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    
    return 'unknown';
  }
}

// Export singleton instance for easy access
export const windowManager = TruckNavWindowManager.getInstance();

// Utility functions for common operations
export const openMapWindow = (options?: MapWindowOptions) => 
  windowManager.openMapWindow(options);

export const closeMapWindow = () => 
  windowManager.closeMapWindow();

export const isMapWindowOpen = () => 
  windowManager.isMapWindowOpen();

export const focusMapWindow = () => 
  windowManager.focusMapWindow();