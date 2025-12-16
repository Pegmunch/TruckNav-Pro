interface CrashReport {
  id: string;
  timestamp: Date;
  type: 'error' | 'unhandledRejection' | 'componentError';
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  componentStack?: string;
}

interface ClientMetrics {
  sessionStart: number;
  pageLoads: number;
  errors: CrashReport[];
  crashFreeRate: number;
  totalInteractions: number;
}

class CrashFreeMonitor {
  private metrics: ClientMetrics;
  private readonly maxStoredErrors = 50;
  private readonly STORAGE_KEY = 'trucknav_crash_metrics';

  constructor() {
    this.metrics = this.loadMetrics();
    this.setupListeners();
  }

  private loadMetrics(): ClientMetrics {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          sessionStart: Date.now(),
          errors: parsed.errors?.slice(-this.maxStoredErrors) || [],
        };
      }
    } catch (e) {
      console.warn('[CRASH-MONITOR] Failed to load metrics:', e);
    }
    
    return {
      sessionStart: Date.now(),
      pageLoads: 0,
      errors: [],
      crashFreeRate: 100,
      totalInteractions: 0,
    };
  }

  private saveMetrics(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        ...this.metrics,
        errors: this.metrics.errors.slice(-this.maxStoredErrors),
      }));
    } catch (e) {
      console.warn('[CRASH-MONITOR] Failed to save metrics:', e);
    }
  }

  private setupListeners(): void {
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'error',
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        url: event.filename || window.location.href,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'unhandledRejection',
        message: event.reason?.message || String(event.reason) || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        url: window.location.href,
      });
    });

    this.metrics.pageLoads++;
    this.saveMetrics();
    
    console.log('[CRASH-MONITOR] Initialized - Page loads:', this.metrics.pageLoads);
  }

  recordError(error: Omit<CrashReport, 'id' | 'timestamp' | 'userAgent'>): void {
    const report: CrashReport = {
      id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      ...error,
    };

    this.metrics.errors.push(report);
    
    if (this.metrics.errors.length > this.maxStoredErrors) {
      this.metrics.errors = this.metrics.errors.slice(-this.maxStoredErrors);
    }

    this.updateCrashFreeRate();
    this.saveMetrics();

    console.error('[CRASH-MONITOR] Error recorded:', report.type, report.message);
  }

  recordComponentError(error: Error, componentStack?: string): void {
    this.recordError({
      type: 'componentError',
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      componentStack,
    });
  }

  recordInteraction(): void {
    this.metrics.totalInteractions++;
    if (this.metrics.totalInteractions % 100 === 0) {
      this.saveMetrics();
    }
  }

  private updateCrashFreeRate(): void {
    const totalSessions = this.metrics.pageLoads;
    const errorSessions = new Set(this.metrics.errors.map(e => 
      new Date(e.timestamp).toDateString()
    )).size;
    
    if (totalSessions > 0) {
      this.metrics.crashFreeRate = Math.max(0, 
        ((totalSessions - errorSessions) / totalSessions) * 100
      );
    }
  }

  getMetrics(): object {
    const now = Date.now();
    const sessionDuration = now - this.metrics.sessionStart;
    
    return {
      summary: {
        crashFreeRate: `${this.metrics.crashFreeRate.toFixed(2)}%`,
        target: '99%',
        targetMet: this.metrics.crashFreeRate >= 99,
        totalPageLoads: this.metrics.pageLoads,
        totalErrors: this.metrics.errors.length,
        totalInteractions: this.metrics.totalInteractions,
      },
      session: {
        started: new Date(this.metrics.sessionStart).toISOString(),
        duration: `${Math.floor(sessionDuration / 60000)}m ${Math.floor((sessionDuration % 60000) / 1000)}s`,
        errorsThisSession: this.metrics.errors.filter(e => 
          new Date(e.timestamp).getTime() > this.metrics.sessionStart
        ).length,
      },
      recentErrors: this.metrics.errors.slice(-10).reverse().map(e => ({
        id: e.id,
        type: e.type,
        message: e.message.substring(0, 100),
        timestamp: new Date(e.timestamp).toISOString(),
      })),
      errorBreakdown: {
        jsErrors: this.metrics.errors.filter(e => e.type === 'error').length,
        promiseRejections: this.metrics.errors.filter(e => e.type === 'unhandledRejection').length,
        componentErrors: this.metrics.errors.filter(e => e.type === 'componentError').length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  reset(): void {
    this.metrics = {
      sessionStart: Date.now(),
      pageLoads: 1,
      errors: [],
      crashFreeRate: 100,
      totalInteractions: 0,
    };
    this.saveMetrics();
    console.log('[CRASH-MONITOR] Metrics reset');
  }
}

export const crashFreeMonitor = new CrashFreeMonitor();

export const initCrashMonitoring = (): void => {
  console.log('[CRASH-MONITOR] Crash-free monitoring active');
};

export const getClientMetrics = (): object => {
  return crashFreeMonitor.getMetrics();
};

export const recordComponentError = (error: Error, componentStack?: string): void => {
  crashFreeMonitor.recordComponentError(error, componentStack);
};

export const recordUserInteraction = (): void => {
  crashFreeMonitor.recordInteraction();
};
