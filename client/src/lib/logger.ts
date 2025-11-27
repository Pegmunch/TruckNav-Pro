/**
 * Production-safe logger for TruckNav Pro PWA
 * 
 * In production: Only logs errors and warnings (no console calls for debug/log/info)
 * In development: Logs everything
 * 
 * Uses no-op pattern to completely avoid console API calls in production hot paths.
 * This reduces main thread overhead and improves PWA performance.
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

type LogLevel = 'debug' | 'log' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  forceEnabled?: boolean;
}

// No-op function for production - avoids any console API overhead
const noop = (): void => {};

class Logger {
  private prefix: string;
  private forceEnabled: boolean;
  
  // Pre-bound methods for zero overhead in production
  public debug: (...args: unknown[]) => void;
  public log: (...args: unknown[]) => void;
  public info: (...args: unknown[]) => void;
  public warn: (...args: unknown[]) => void;
  public error: (...args: unknown[]) => void;
  public group: (label: string) => void;
  public groupEnd: () => void;
  public time: (label: string) => void;
  public timeEnd: (label: string) => void;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix ? `[${options.prefix}]` : '';
    this.forceEnabled = options.forceEnabled || false;
    
    const shouldEnableDebug = this.forceEnabled || isDev;
    
    // In production, use no-ops for debug/log/info to avoid any overhead
    if (shouldEnableDebug) {
      this.debug = this._debug.bind(this);
      this.log = this._log.bind(this);
      this.info = this._info.bind(this);
      this.group = this._group.bind(this);
      this.groupEnd = console.groupEnd.bind(console);
      this.time = this._time.bind(this);
      this.timeEnd = this._timeEnd.bind(this);
    } else {
      // No-ops in production - zero overhead
      this.debug = noop;
      this.log = noop;
      this.info = noop;
      this.group = noop;
      this.groupEnd = noop;
      this.time = noop;
      this.timeEnd = noop;
    }
    
    // Warnings and errors always enabled
    this.warn = this._warn.bind(this);
    this.error = this._error.bind(this);
  }

  private formatArgs(args: unknown[]): unknown[] {
    if (this.prefix) {
      return [this.prefix, ...args];
    }
    return args;
  }

  private _debug(...args: unknown[]): void {
    console.debug(...this.formatArgs(args));
  }

  private _log(...args: unknown[]): void {
    console.log(...this.formatArgs(args));
  }

  private _info(...args: unknown[]): void {
    console.info(...this.formatArgs(args));
  }

  private _warn(...args: unknown[]): void {
    console.warn(...this.formatArgs(args));
  }

  private _error(...args: unknown[]): void {
    console.error(...this.formatArgs(args));
  }

  private _group(label: string): void {
    console.group(this.prefix ? `${this.prefix} ${label}` : label);
  }

  private _time(label: string): void {
    console.time(this.prefix ? `${this.prefix} ${label}` : label);
  }

  private _timeEnd(label: string): void {
    console.timeEnd(this.prefix ? `${this.prefix} ${label}` : label);
  }
}

export const logger = new Logger();

export function createLogger(prefix: string, forceEnabled = false): Logger {
  return new Logger({ prefix, forceEnabled });
}

// Pre-created loggers for common use cases
export const gpsLogger = createLogger('GPS');
export const navLogger = createLogger('NAV');
export const mapLogger = createLogger('MAP');
export const apiLogger = createLogger('API');

// Helper to check if we're in development mode (for conditional logging blocks)
export const isDevMode = isDev;
