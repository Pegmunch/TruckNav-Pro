/**
 * Production-safe logger for TruckNav Pro PWA
 * 
 * In production: Only logs errors and warnings
 * In development: Logs everything
 * 
 * This reduces main thread overhead in production builds
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

type LogLevel = 'debug' | 'log' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  forceEnabled?: boolean;
}

class Logger {
  private prefix: string;
  private forceEnabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix ? `[${options.prefix}]` : '';
    this.forceEnabled = options.forceEnabled || false;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.forceEnabled) return true;
    if (isDev) return true;
    return level === 'error' || level === 'warn';
  }

  private formatArgs(args: unknown[]): unknown[] {
    if (this.prefix) {
      return [this.prefix, ...args];
    }
    return args;
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatArgs(args));
    }
  }

  log(...args: unknown[]): void {
    if (this.shouldLog('log')) {
      console.log(...this.formatArgs(args));
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatArgs(args));
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatArgs(args));
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatArgs(args));
    }
  }

  group(label: string): void {
    if (isDev) {
      console.group(this.prefix ? `${this.prefix} ${label}` : label);
    }
  }

  groupEnd(): void {
    if (isDev) {
      console.groupEnd();
    }
  }

  time(label: string): void {
    if (isDev) {
      console.time(this.prefix ? `${this.prefix} ${label}` : label);
    }
  }

  timeEnd(label: string): void {
    if (isDev) {
      console.timeEnd(this.prefix ? `${this.prefix} ${label}` : label);
    }
  }
}

export const logger = new Logger();

export function createLogger(prefix: string, forceEnabled = false): Logger {
  return new Logger({ prefix, forceEnabled });
}

export const gpsLogger = createLogger('GPS');
export const navLogger = createLogger('NAV');
export const mapLogger = createLogger('MAP');
export const apiLogger = createLogger('API');
