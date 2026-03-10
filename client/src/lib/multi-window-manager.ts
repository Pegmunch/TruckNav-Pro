/**
 * Multi-Window Manager for TruckNav Pro Feature Windows
 * Handles multiple popup windows for different features (route, vehicle, etc.)
 */

export type FeatureWindowType = 'route' | 'vehicle' | 'entertainment' | 'themes' | 'history' | 'settings' | 'map';

interface FeatureWindowConfig {
  width: number;
  height: number;
  features: string[];
  title: string;
  url: string;
}

interface FeatureWindowOptions {
  automotive?: boolean;
  fallbackToFullscreen?: boolean;
  onPopupBlocked?: () => void;
  onWindowClosed?: () => void;
}

interface OpenWindow {
  window: Window;
  type: FeatureWindowType;
  onClosed?: () => void;
  checkInterval: number;
}

export class TruckNavMultiWindowManager {
  private static instance: TruckNavMultiWindowManager;
  private openWindows = new Map<FeatureWindowType, OpenWindow>();
  private maxWindows = 10;

  private constructor() {}

  static getInstance(): TruckNavMultiWindowManager {
    if (!TruckNavMultiWindowManager.instance) {
      TruckNavMultiWindowManager.instance = new TruckNavMultiWindowManager();
    }
    return TruckNavMultiWindowManager.instance;
  }

  /**
   * Opens a feature window
   */
  openFeatureWindow(type: FeatureWindowType, options: FeatureWindowOptions = {}): Promise<Window | null> {
    return new Promise((resolve) => {
      try {
        // Check if we're at the window limit
        if (this.openWindows.size >= this.maxWindows) {
          console.warn(`Maximum number of windows (${this.maxWindows}) already open`);
          resolve(null);
          return;
        }

        // If window of this type is already open, focus it
        const existingWindow = this.openWindows.get(type);
        if (existingWindow && !existingWindow.window.closed) {
          existingWindow.window.focus();
          resolve(existingWindow.window);
          return;
        }

        // Get configuration for this window type
        const config = this.getFeatureWindowConfig(type, options.automotive);
        
        // Attempt to open popup window
        const windowFeatures = config.features.join(',');
        const newWindow = window.open(config.url, `trucknav_${type}_${Date.now()}`, windowFeatures);

        if (newWindow) {
          // Start monitoring this window
          const checkInterval = window.setInterval(() => {
            if (newWindow.closed) {
              this.closeFeatureWindow(type);
            }
          }, 1000);

          // Store window reference
          this.openWindows.set(type, {
            window: newWindow,
            type,
            onClosed: options.onWindowClosed,
            checkInterval
          });

          // Wait for window to load
          newWindow.addEventListener('load', () => {
            resolve(newWindow);
          });

          // Fallback resolve after timeout
          setTimeout(() => resolve(newWindow), 1000);
        } else {
          // Popup was blocked
          console.warn(`${type} window popup was blocked by browser`);
          if (options.onPopupBlocked) {
            options.onPopupBlocked();
          }
          resolve(null);
        }
      } catch (error) {
        console.error(`Error opening ${type} window:`, error);
        if (options.onPopupBlocked) {
          options.onPopupBlocked();
        }
        resolve(null);
      }
    });
  }

  /**
   * Closes a specific feature window
   */
  closeFeatureWindow(type: FeatureWindowType): void {
    const openWindow = this.openWindows.get(type);
    if (openWindow) {
      if (!openWindow.window.closed) {
        openWindow.window.close();
      }
      
      clearInterval(openWindow.checkInterval);
      
      if (openWindow.onClosed) {
        openWindow.onClosed();
      }
      
      this.openWindows.delete(type);
    }
  }

  /**
   * Closes all open windows
   */
  closeAllWindows(): void {
    Array.from(this.openWindows.keys()).forEach(type => {
      this.closeFeatureWindow(type);
    });
  }

  /**
   * Checks if a specific window type is open
   */
  isWindowOpen(type: FeatureWindowType): boolean {
    const openWindow = this.openWindows.get(type);
    return openWindow !== undefined && !openWindow.window.closed;
  }

  /**
   * Focuses a specific window
   */
  focusWindow(type: FeatureWindowType): boolean {
    const openWindow = this.openWindows.get(type);
    if (openWindow && !openWindow.window.closed) {
      openWindow.window.focus();
      return true;
    }
    return false;
  }

  /**
   * Gets list of currently open windows
   */
  getOpenWindows(): FeatureWindowType[] {
    return Array.from(this.openWindows.keys()).filter(type => 
      this.openWindows.get(type)?.window && !this.openWindows.get(type)!.window.closed
    );
  }

  /**
   * Gets the count of open windows
   */
  getOpenWindowCount(): number {
    return this.getOpenWindows().length;
  }

  /**
   * Gets window configuration for different feature types
   */
  private getFeatureWindowConfig(type: FeatureWindowType, automotive = false): FeatureWindowConfig {
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;

    const baseConfig = automotive ? {
      width: Math.min(screenWidth * 0.7, 1200),
      height: Math.min(screenHeight * 0.8, 800),
    } : {
      width: Math.min(screenWidth * 0.6, 1000),
      height: Math.min(screenHeight * 0.7, 700),
    };

    // Calculate position with offset for multiple windows
    const openCount = this.getOpenWindowCount();
    const offset = (openCount * 50) % 200; // Cascade windows

    const features = [
      'resizable=yes',
      'scrollbars=no',
      'status=no',
      'menubar=no',
      'toolbar=no',
      'location=no',
      'directories=no',
      `width=${baseConfig.width}`,
      `height=${baseConfig.height}`,
      `left=${Math.max(0, (screenWidth - baseConfig.width) / 2 + offset)}`,
      `top=${Math.max(0, (screenHeight - baseConfig.height) / 2 + offset)}`
    ];

    const configs: Record<FeatureWindowType, Omit<FeatureWindowConfig, 'width' | 'height' | 'features'>> = {
      route: {
        title: 'TruckNav Pro - Route Planning',
        url: `${window.location.origin}/window/route`
      },
      vehicle: {
        title: 'TruckNav Pro - Vehicle Profile',
        url: `${window.location.origin}/window/vehicle`
      },
      entertainment: {
        title: 'TruckNav Pro - Entertainment',
        url: `${window.location.origin}/window/entertainment`
      },
      themes: {
        title: 'TruckNav Pro - Themes',
        url: `${window.location.origin}/window/themes`
      },
      history: {
        title: 'TruckNav Pro - History & Favorites',
        url: `${window.location.origin}/window/history`
      },
      settings: {
        title: 'TruckNav Pro - Settings',
        url: `${window.location.origin}/window/settings`
      },
      map: {
        title: 'TruckNav Pro - Map',
        url: `${window.location.origin}/map-window`
      }
    };

    return {
      ...baseConfig,
      features,
      ...configs[type]
    };
  }

  /**
   * Check if popups are supported
   */
  static isPopupSupported(): boolean {
    try {
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
   * Get popup blocked message
   */
  static getPopupBlockedMessage(): string {
    return 'Popup blocked. Please allow popups for this site to open feature windows.';
  }
}

// Export singleton instance
export const multiWindowManager = TruckNavMultiWindowManager.getInstance();

// Utility functions
export const openFeatureWindow = (type: FeatureWindowType, options?: FeatureWindowOptions) => 
  multiWindowManager.openFeatureWindow(type, options);

export const closeFeatureWindow = (type: FeatureWindowType) => 
  multiWindowManager.closeFeatureWindow(type);

export const isFeatureWindowOpen = (type: FeatureWindowType) => 
  multiWindowManager.isWindowOpen(type);

export const focusFeatureWindow = (type: FeatureWindowType) => 
  multiWindowManager.focusWindow(type);

export const getOpenFeatureWindows = () => 
  multiWindowManager.getOpenWindows();

export const getOpenWindowCount = () => 
  multiWindowManager.getOpenWindowCount();