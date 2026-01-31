/**
 * Global Error Handler for TruckNav Pro
 * 
 * Catches and handles unhandled errors to prevent app crashes
 * Features:
 * - window.onerror handler for JavaScript errors
 * - unhandledrejection handler for Promise rejections
 * - Error logging and recovery mechanisms
 * - Prevents app from crashing on recoverable errors
 */

interface ErrorLog {
  timestamp: number;
  message: string;
  stack?: string;
  type: 'error' | 'rejection';
  url?: string;
  userAgent: string;
}

class GlobalErrorHandler {
  private errorLogs: ErrorLog[] = [];
  private readonly MAX_ERROR_LOGS = 20;
  private errorReportingEndpoint?: string;
  private isInitialized = false;
  private errorCount = 0;
  private rejectionCount = 0;
  private readonly ERROR_THRESHOLD = 10;
  private readonly TIME_WINDOW = 60000; // 1 minute
  private errorTimestamps: number[] = [];

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) {
      console.warn('Global error handler already initialized');
      return;
    }

    this.setupErrorHandler();
    this.setupRejectionHandler();
    this.setupBeforeUnload();
    this.isInitialized = true;
    console.log('🛡️ Global error handler initialized');
  }

  private setupErrorHandler() {
    window.onerror = (message, source, lineno, colno, error) => {
      this.errorCount++;
      
      const errorLog: ErrorLog = {
        timestamp: Date.now(),
        message: typeof message === 'string' ? message : 'Unknown error',
        stack: error?.stack,
        type: 'error',
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // Log the error
      console.error('🚨 Global error caught:', {
        message,
        source,
        lineno,
        colno,
        error
      });

      // Store the error
      this.addErrorLog(errorLog);

      // Check for error storm (too many errors in short time)
      if (this.isErrorStorm()) {
        console.error('🌩️ Error storm detected! Initiating emergency recovery...');
        this.handleErrorStorm();
        return true;
      }

      // Handle specific error types
      if (this.isRecoverableError(error)) {
        console.log('🔧 Attempting to recover from error:', message);
        this.attemptRecovery(error);
        return true; // Prevent default error handling
      }

      // Check for critical errors that should not be suppressed
      if (this.isCriticalError(error)) {
        console.error('💀 Critical error detected, allowing default handling');
        return false; // Allow default error handling
      }

      // Suppress non-critical errors to prevent crashes
      return true;
    };
  }

  private setupRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      this.rejectionCount++;
      
      const errorLog: ErrorLog = {
        timestamp: Date.now(),
        message: event.reason?.message || event.reason?.toString() || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        type: 'rejection',
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // Log the rejection
      console.error('🚫 Unhandled promise rejection:', event.reason);

      // Store the error
      this.addErrorLog(errorLog);

      // Check for specific rejection types
      if (this.isNetworkError(event.reason)) {
        console.log('🌐 Network error detected, implementing retry logic');
        this.handleNetworkError(event.reason);
      }

      // NOTE: We no longer call event.preventDefault() here because it can
      // interfere with React Query's error handling and prevent the app from
      // properly handling 401 errors for subscription gates.
    });
  }

  private setupBeforeUnload() {
    // Save error logs before page unload
    window.addEventListener('beforeunload', () => {
      if (this.errorLogs.length > 0) {
        try {
          sessionStorage.setItem('trucknav_error_logs', JSON.stringify(this.errorLogs));
        } catch (e) {
          console.warn('Failed to save error logs:', e);
        }
      }
    });

    // Restore error logs on page load
    try {
      const savedLogs = sessionStorage.getItem('trucknav_error_logs');
      if (savedLogs) {
        this.errorLogs = JSON.parse(savedLogs);
        sessionStorage.removeItem('trucknav_error_logs');
        console.log('📋 Restored', this.errorLogs.length, 'error logs from previous session');
      }
    } catch (e) {
      console.warn('Failed to restore error logs:', e);
    }
  }

  private addErrorLog(log: ErrorLog) {
    this.errorLogs.push(log);
    this.errorTimestamps.push(log.timestamp);

    // Limit log size
    if (this.errorLogs.length > this.MAX_ERROR_LOGS) {
      this.errorLogs.shift();
    }

    // Clean old timestamps
    const cutoffTime = Date.now() - this.TIME_WINDOW;
    this.errorTimestamps = this.errorTimestamps.filter(ts => ts > cutoffTime);

    // Store in localStorage for debugging
    try {
      localStorage.setItem('trucknav_last_error', JSON.stringify(log));
    } catch (e) {
      // Ignore storage errors
    }
  }

  private isErrorStorm(): boolean {
    // Check if too many errors occurred in the time window
    return this.errorTimestamps.length > this.ERROR_THRESHOLD;
  }

  private handleErrorStorm() {
    // Clear some caches to free memory
    if ('caches' in window) {
      caches.keys().then(names => {
        // Clear old cache versions
        names.forEach(name => {
          if (name.includes('trucknav') && !name.includes('v3.')) {
            caches.delete(name);
          }
        });
      });
    }

    // Show user a recovery message (non-intrusive)
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-yellow-600 text-white p-3 rounded shadow-lg z-50';
    toast.textContent = 'App is recovering from errors. Some features may be temporarily unavailable.';
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 5000);

    // Reset error counts after storm handling
    setTimeout(() => {
      this.errorTimestamps = [];
      console.log('🌈 Error storm recovery complete');
    }, this.TIME_WINDOW);
  }

  private isRecoverableError(error: Error | undefined): boolean {
    if (!error) return false;
    
    const recoverablePatterns = [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed',
      'Non-Error promise rejection captured',
      'ChunkLoadError',
      'Loading CSS chunk',
      'Loading chunk'
    ];

    return recoverablePatterns.some(pattern => 
      error.message?.includes(pattern) || error.toString().includes(pattern)
    );
  }

  private isCriticalError(error: Error | undefined): boolean {
    if (!error) return false;
    
    const criticalPatterns = [
      'SecurityError',
      'SyntaxError in critical module',
      'Cannot read property of null',
      'Maximum call stack size exceeded'
    ];

    return criticalPatterns.some(pattern => 
      error.message?.includes(pattern) || error.name === pattern
    );
  }

  private isNetworkError(reason: any): boolean {
    if (!reason) return false;
    
    const networkPatterns = [
      'NetworkError',
      'Failed to fetch',
      'fetch failed',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
      'ERR_NAME_NOT_RESOLVED'
    ];

    const message = reason.message || reason.toString();
    return networkPatterns.some(pattern => message.includes(pattern));
  }

  private attemptRecovery(error: Error | undefined) {
    if (!error) return;

    // Handle chunk loading errors
    if (error.message?.includes('ChunkLoadError') || error.message?.includes('Loading chunk')) {
      console.log('🔄 Attempting to reload failed chunk...');
      
      // Clear module cache
      if ((window as any).__webpack_require__?.cache) {
        delete (window as any).__webpack_require__.cache;
      }

      // Try to reload after a short delay
      setTimeout(() => {
        if (window.location.pathname !== '/') {
          console.log('🏠 Navigating to home page for recovery');
          window.location.href = '/';
        }
      }, 2000);
    }

    // Handle ResizeObserver errors (usually harmless)
    if (error.message?.includes('ResizeObserver')) {
      console.log('📐 ResizeObserver error ignored (non-critical)');
      // These are usually harmless and can be ignored
    }
  }

  private handleNetworkError(reason: any) {
    console.log('🌐 Handling network error:', reason);
    
    // Dispatch event for network error handling
    window.dispatchEvent(new CustomEvent('network-error', {
      detail: { error: reason, timestamp: Date.now() }
    }));

    // Show offline indicator if not already shown
    if (!document.querySelector('.offline-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'offline-indicator fixed top-0 left-0 right-0 bg-yellow-600 text-white text-center p-2 z-50';
      indicator.textContent = 'Network connection issues detected. Some features may be limited.';
      document.body.appendChild(indicator);
      
      // Remove after 5 seconds
      setTimeout(() => {
        indicator.remove();
      }, 5000);
    }
  }

  // Public methods for external use
  public getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  public clearErrorLogs() {
    this.errorLogs = [];
    this.errorTimestamps = [];
    this.errorCount = 0;
    this.rejectionCount = 0;
    console.log('🧹 Error logs cleared');
  }

  public getErrorStats() {
    return {
      totalErrors: this.errorCount,
      totalRejections: this.rejectionCount,
      recentErrors: this.errorTimestamps.length,
      logs: this.errorLogs.length
    };
  }
}

// Create and export singleton instance
const globalErrorHandler = new GlobalErrorHandler();

// Export for use in other modules
export { globalErrorHandler, GlobalErrorHandler };

// Auto-initialize when imported
export function initializeGlobalErrorHandler() {
  return globalErrorHandler;
}