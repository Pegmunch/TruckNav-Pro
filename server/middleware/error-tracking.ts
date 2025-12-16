import { Request, Response, NextFunction } from 'express';

interface ErrorEntry {
  id: string;
  timestamp: Date;
  path: string;
  method: string;
  statusCode: number;
  message: string;
  stack?: string;
  userAgent?: string;
  ip?: string;
  requestBody?: any;
  category: ErrorCategory;
}

type ErrorCategory = 
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'rate_limit'
  | 'server_error'
  | 'database'
  | 'external_api'
  | 'timeout'
  | 'unknown';

interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByStatusCode: Record<number, number>;
  errorsByEndpoint: Record<string, number>;
  recentErrors: ErrorEntry[];
  crashFreeRate: number;
  lastErrorAt: Date | null;
}

class ErrorTracker {
  private errors: ErrorEntry[] = [];
  private totalRequests = 0;
  private readonly maxStoredErrors = 500;
  private categoryMap: Record<ErrorCategory, number> = {
    validation: 0,
    authentication: 0,
    authorization: 0,
    not_found: 0,
    rate_limit: 0,
    server_error: 0,
    database: 0,
    external_api: 0,
    timeout: 0,
    unknown: 0,
  };

  incrementTotalRequests(): void {
    this.totalRequests++;
  }

  trackError(error: Omit<ErrorEntry, 'id' | 'timestamp' | 'category'>): void {
    const category = this.categorizeError(error.statusCode, error.message);
    
    const entry: ErrorEntry = {
      ...error,
      id: this.generateErrorId(),
      timestamp: new Date(),
      category,
    };

    this.errors.push(entry);
    this.categoryMap[category]++;

    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(-this.maxStoredErrors);
    }

    console.log(`[ERROR-TRACKER] ${category.toUpperCase()}: ${error.method} ${error.path} - ${error.statusCode} - ${error.message}`);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private categorizeError(statusCode: number, message: string): ErrorCategory {
    const lowerMessage = message.toLowerCase();

    if (statusCode === 400 || lowerMessage.includes('validation')) {
      return 'validation';
    }
    if (statusCode === 401 || lowerMessage.includes('authentication') || lowerMessage.includes('unauthenticated')) {
      return 'authentication';
    }
    if (statusCode === 403 || lowerMessage.includes('forbidden') || lowerMessage.includes('unauthorized')) {
      return 'authorization';
    }
    if (statusCode === 404) {
      return 'not_found';
    }
    if (statusCode === 429 || lowerMessage.includes('rate limit')) {
      return 'rate_limit';
    }
    if (lowerMessage.includes('database') || lowerMessage.includes('sql') || lowerMessage.includes('postgres')) {
      return 'database';
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return 'timeout';
    }
    if (lowerMessage.includes('api') || lowerMessage.includes('external') || lowerMessage.includes('fetch')) {
      return 'external_api';
    }
    if (statusCode >= 500) {
      return 'server_error';
    }
    return 'unknown';
  }

  getStats(): ErrorStats {
    const errorsByStatusCode: Record<number, number> = {};
    const errorsByEndpoint: Record<string, number> = {};

    this.errors.forEach(error => {
      errorsByStatusCode[error.statusCode] = (errorsByStatusCode[error.statusCode] || 0) + 1;
      const endpointKey = `${error.method} ${error.path}`;
      errorsByEndpoint[endpointKey] = (errorsByEndpoint[endpointKey] || 0) + 1;
    });

    const totalErrors = this.errors.length;
    const crashFreeRate = this.totalRequests > 0
      ? ((this.totalRequests - totalErrors) / this.totalRequests) * 100
      : 100;

    return {
      totalErrors,
      errorsByCategory: { ...this.categoryMap },
      errorsByStatusCode,
      errorsByEndpoint,
      recentErrors: this.errors.slice(-20).reverse(),
      crashFreeRate: Math.round(crashFreeRate * 100) / 100,
      lastErrorAt: this.errors.length > 0 ? this.errors[this.errors.length - 1].timestamp : null,
    };
  }

  getHealthReport(): object {
    const stats = this.getStats();
    const targetCrashFreeRate = 99;
    const isHealthy = stats.crashFreeRate >= targetCrashFreeRate;

    const criticalCategories: ErrorCategory[] = ['server_error', 'database', 'timeout'];
    const criticalErrorCount = criticalCategories.reduce(
      (sum, cat) => sum + (this.categoryMap[cat] || 0),
      0
    );

    return {
      status: isHealthy ? 'HEALTHY' : 'DEGRADED',
      crashFreeRate: `${stats.crashFreeRate}%`,
      target: `${targetCrashFreeRate}%`,
      targetMet: isHealthy,
      totalRequests: this.totalRequests,
      totalErrors: stats.totalErrors,
      criticalErrors: criticalErrorCount,
      breakdown: {
        validation: this.categoryMap.validation,
        authentication: this.categoryMap.authentication,
        authorization: this.categoryMap.authorization,
        notFound: this.categoryMap.not_found,
        rateLimit: this.categoryMap.rate_limit,
        serverError: this.categoryMap.server_error,
        database: this.categoryMap.database,
        externalApi: this.categoryMap.external_api,
        timeout: this.categoryMap.timeout,
        unknown: this.categoryMap.unknown,
      },
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString(),
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.categoryMap.validation > 10) {
      recommendations.push('High validation errors - review input validation rules');
    }
    if (this.categoryMap.rate_limit > 5) {
      recommendations.push('Rate limiting triggered - consider adjusting limits or caching');
    }
    if (this.categoryMap.database > 0) {
      recommendations.push('Database errors detected - check connection pool and queries');
    }
    if (this.categoryMap.timeout > 3) {
      recommendations.push('Timeouts occurring - optimize slow endpoints or increase timeouts');
    }
    if (this.categoryMap.server_error > 5) {
      recommendations.push('Server errors high - investigate error logs for root cause');
    }
    if (this.categoryMap.external_api > 5) {
      recommendations.push('External API failures - implement retry logic and fallbacks');
    }

    if (recommendations.length === 0) {
      recommendations.push('System operating within acceptable parameters');
    }

    return recommendations;
  }

  reset(): void {
    this.errors = [];
    this.totalRequests = 0;
    Object.keys(this.categoryMap).forEach(key => {
      this.categoryMap[key as ErrorCategory] = 0;
    });
    console.log('[ERROR-TRACKER] Stats reset');
  }
}

export const errorTracker = new ErrorTracker();

export const errorTrackingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  errorTracker.incrementTotalRequests();

  res.on('finish', () => {
    if (res.statusCode >= 400) {
      errorTracker.trackError({
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        message: res.statusMessage || 'Unknown error',
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    }
  });

  next();
};

export const comprehensiveErrorHandler = (
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  errorTracker.trackError({
    path: req.path,
    method: req.method,
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestBody: req.method !== 'GET' ? req.body : undefined,
  });

  res.status(statusCode).json({
    error: message,
    code: statusCode >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR',
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}`,
  });
};

export const getErrorStats = (_req: Request, res: Response): void => {
  res.json(errorTracker.getStats());
};

export const getHealthReport = (_req: Request, res: Response): void => {
  res.json(errorTracker.getHealthReport());
};

export const resetErrorStats = (_req: Request, res: Response): void => {
  errorTracker.reset();
  res.json({ message: 'Error stats reset', timestamp: new Date().toISOString() });
};
