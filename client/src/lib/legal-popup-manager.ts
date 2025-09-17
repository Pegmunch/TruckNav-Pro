/**
 * Legal Disclaimer Popup Window Manager
 * Handles opening and managing the legal disclaimer in a dedicated popup window
 */

export interface LegalPopupOptions {
  width?: number;
  height?: number;
  centered?: boolean;
  resizable?: boolean;
  scrollbars?: boolean;
}

export class LegalPopupManager {
  private static popupWindow: Window | null = null;
  private static popupCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Opens the legal disclaimer in a popup window
   */
  static openLegalDisclaimer(options: LegalPopupOptions = {}) {
    const defaultOptions: Required<LegalPopupOptions> = {
      width: 1200,
      height: 800,
      centered: true,
      resizable: true,
      scrollbars: true,
    };

    const config = { ...defaultOptions, ...options };

    // Close existing popup if open
    this.closeLegalDisclaimer();

    // Calculate position for centering
    let left = 0;
    let top = 0;
    
    if (config.centered) {
      const screenWidth = window.screen.availWidth;
      const screenHeight = window.screen.availHeight;
      left = Math.round((screenWidth - config.width) / 2);
      top = Math.round((screenHeight - config.height) / 2);
    }

    // Build window features string
    const features = [
      `width=${config.width}`,
      `height=${config.height}`,
      `left=${left}`,
      `top=${top}`,
      config.resizable ? 'resizable=yes' : 'resizable=no',
      config.scrollbars ? 'scrollbars=yes' : 'scrollbars=no',
      'toolbar=no',
      'menubar=no',
      'location=no',
      'status=no',
    ].join(',');

    try {
      // Open popup window
      this.popupWindow = window.open(
        '/legal-popup',
        'trucknav_legal_disclaimer',
        features
      );

      if (!this.popupWindow) {
        throw new Error('Popup blocked or failed to open');
      }

      // Set up popup monitoring
      this.setupPopupMonitoring();

      // Set up message listener for popup events
      this.setupMessageListener();

      // Focus the popup window
      this.popupWindow.focus();

      return this.popupWindow;

    } catch (error) {
      console.error('Failed to open legal disclaimer popup:', error);
      
      // Fallback: show alert with instructions
      alert(
        'TruckNav Pro Legal Disclaimer\n\n' +
        'Please allow popups for this site to view the legal disclaimer in a separate window. ' +
        'Alternatively, you can access the legal terms from the main navigation menu.'
      );
      
      return null;
    }
  }

  /**
   * Closes the legal disclaimer popup window
   */
  static closeLegalDisclaimer() {
    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.close();
    }
    this.popupWindow = null;
    
    if (this.popupCheckInterval) {
      clearInterval(this.popupCheckInterval);
      this.popupCheckInterval = null;
    }
  }

  /**
   * Checks if the legal disclaimer popup is currently open
   */
  static isLegalDisclaimerOpen(): boolean {
    return this.popupWindow !== null && !this.popupWindow.closed;
  }

  /**
   * Focuses the legal disclaimer popup if it's open
   */
  static focusLegalDisclaimer(): boolean {
    if (this.isLegalDisclaimerOpen() && this.popupWindow) {
      this.popupWindow.focus();
      return true;
    }
    return false;
  }

  /**
   * Sets up monitoring for popup window closure
   */
  private static setupPopupMonitoring() {
    if (this.popupCheckInterval) {
      clearInterval(this.popupCheckInterval);
    }

    this.popupCheckInterval = setInterval(() => {
      if (this.popupWindow && this.popupWindow.closed) {
        this.popupWindow = null;
        clearInterval(this.popupCheckInterval!);
        this.popupCheckInterval = null;
        
        // Notify that popup was closed
        window.dispatchEvent(new CustomEvent('legal-popup-closed'));
      }
    }, 1000);
  }

  /**
   * Sets up message listener for communication with popup
   */
  private static setupMessageListener() {
    const messageHandler = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'legal_disclaimer_accepted') {
        // Handle disclaimer acceptance
        this.closeLegalDisclaimer();
        window.dispatchEvent(new CustomEvent('legal-disclaimer-accepted'));
        
        // Reload main window to update state
        window.location.reload();
        
      } else if (event.data?.type === 'legal_disclaimer_declined') {
        // Handle disclaimer decline
        this.closeLegalDisclaimer();
        window.dispatchEvent(new CustomEvent('legal-disclaimer-declined'));
      }
    };

    // Remove existing listener if any
    window.removeEventListener('message', messageHandler);
    
    // Add new listener
    window.addEventListener('message', messageHandler);
  }

  /**
   * Creates a legal access button configuration
   */
  static createLegalAccessButton() {
    return {
      onClick: () => {
        if (this.isLegalDisclaimerOpen()) {
          this.focusLegalDisclaimer();
        } else {
          this.openLegalDisclaimer({
            width: 1200,
            height: 900,
            centered: true,
            resizable: true,
            scrollbars: true,
          });
        }
      },
      isOpen: this.isLegalDisclaimerOpen(),
      title: 'Legal Disclaimer',
      description: 'View safety warnings and terms of service',
    };
  }

  /**
   * Utility to check if user has accepted disclaimer
   */
  static hasAcceptedDisclaimer(): boolean {
    try {
      const disclaimerData = localStorage.getItem('trucknav_disclaimer_accepted');
      if (disclaimerData) {
        const parsed = JSON.parse(disclaimerData);
        return parsed.accepted && parsed.timestamp;
      }
    } catch {
      // Invalid data
    }
    return false;
  }

  /**
   * Get disclaimer acceptance details
   */
  static getDisclaimerAcceptance() {
    try {
      const disclaimerData = localStorage.getItem('trucknav_disclaimer_accepted');
      if (disclaimerData) {
        return JSON.parse(disclaimerData);
      }
    } catch {
      // Invalid data
    }
    return null;
  }
}