import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  uptimeStart: number;
  lastReset: number;
  endpointMetrics: Map<string, EndpointMetric>;
  errorBreakdown: Map<number, number>;
}

interface EndpointMetric {
  path: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  lastAccessed: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private responseTimes: number[] = [];
  private readonly maxStoredTimes = 1000;
  private requestCountWindow: number[] = [];
  private readonly windowSizeMs = 60000;

  constructor() {
    this.metrics = this.initializeMetrics();
    setInterval(() => this.cleanupOldData(), 60000);
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      requestsPerSecond: 0,
      errorRate: 0,
      uptimeStart: Date.now(),
      lastReset: Date.now(),
      endpointMetrics: new Map(),
      errorBreakdown: new Map(),
    };
  }

  private cleanupOldData(): void {
    const now = Date.now();
    this.requestCountWindow = this.requestCountWindow.filter(
      (timestamp) => now - timestamp < this.windowSizeMs
    );
    
    if (this.responseTimes.length > this.maxStoredTimes) {
      this.responseTimes = this.responseTimes.slice(-this.maxStoredTimes);
    }
  }

  recordRequest(
    path: string,
    method: string,
    responseTime: number,
    statusCode: number
  ): void {
    const now = Date.now();
    this.requestCountWindow.push(now);
    
    this.metrics.totalRequests++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      const currentCount = this.metrics.errorBreakdown.get(statusCode) || 0;
      this.metrics.errorBreakdown.set(statusCode, currentCount + 1);
    }
    
    this.responseTimes.push(responseTime);
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    
    this.metrics.errorRate = 
      this.metrics.totalRequests > 0 
        ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100 
        : 0;
    
    this.metrics.requestsPerSecond = 
      this.requestCountWindow.length / (this.windowSizeMs / 1000);

    const endpointKey = `${method}:${this.normalizePath(path)}`;
    let endpointMetric = this.metrics.endpointMetrics.get(endpointKey);
    
    if (!endpointMetric) {
      endpointMetric = {
        path: this.normalizePath(path),
        method,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        lastAccessed: now,
      };
      this.metrics.endpointMetrics.set(endpointKey, endpointMetric);
    }

    endpointMetric.totalRequests++;
    endpointMetric.totalResponseTime += responseTime;
    endpointMetric.averageResponseTime = 
      endpointMetric.totalResponseTime / endpointMetric.totalRequests;
    endpointMetric.maxResponseTime = Math.max(endpointMetric.maxResponseTime, responseTime);
    endpointMetric.minResponseTime = Math.min(endpointMetric.minResponseTime, responseTime);
    endpointMetric.lastAccessed = now;

    if (statusCode >= 200 && statusCode < 400) {
      endpointMetric.successfulRequests++;
    } else {
      endpointMetric.failedRequests++;
    }
  }

  private normalizePath(path: string): string {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
      .split('?')[0];
  }

  getMetrics(): object {
    const uptime = Date.now() - this.metrics.uptimeStart;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);

    const successRate = this.metrics.totalRequests > 0
      ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)
      : '100.00';

    const endpointStats = Array.from(this.metrics.endpointMetrics.values())
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 20)
      .map(e => ({
        endpoint: `${e.method} ${e.path}`,
        requests: e.totalRequests,
        avgResponseTime: Math.round(e.averageResponseTime),
        maxResponseTime: Math.round(e.maxResponseTime),
        successRate: e.totalRequests > 0 
          ? ((e.successfulRequests / e.totalRequests) * 100).toFixed(2) + '%'
          : '100.00%',
      }));

    const errorBreakdown: Record<string, number> = {};
    this.metrics.errorBreakdown.forEach((count, code) => {
      errorBreakdown[`${code}`] = count;
    });

    return {
      summary: {
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        successRate: `${successRate}%`,
        errorRate: `${this.metrics.errorRate.toFixed(2)}%`,
        targetMet: parseFloat(successRate) >= 99,
      },
      performance: {
        averageResponseTime: `${Math.round(this.metrics.averageResponseTime)}ms`,
        maxResponseTime: `${Math.round(this.metrics.maxResponseTime)}ms`,
        minResponseTime: this.metrics.minResponseTime === Infinity 
          ? 'N/A' 
          : `${Math.round(this.metrics.minResponseTime)}ms`,
        requestsPerSecond: this.metrics.requestsPerSecond.toFixed(2),
      },
      uptime: {
        startedAt: new Date(this.metrics.uptimeStart).toISOString(),
        duration: `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
        seconds: uptimeSeconds,
      },
      topEndpoints: endpointStats,
      errorBreakdown,
      timestamp: new Date().toISOString(),
    };
  }

  reset(): void {
    this.metrics = this.initializeMetrics();
    this.responseTimes = [];
    this.requestCountWindow = [];
    console.log('[PERFORMANCE] Metrics reset');
  }
}

export const performanceMonitor = new PerformanceMonitor();

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    performanceMonitor.recordRequest(
      req.path,
      req.method,
      responseTime,
      res.statusCode
    );
  });

  next();
};

export const getPerformanceMetrics = (_req: Request, res: Response): void => {
  res.json(performanceMonitor.getMetrics());
};

export const resetPerformanceMetrics = (_req: Request, res: Response): void => {
  performanceMonitor.reset();
  res.json({ message: 'Performance metrics reset', timestamp: new Date().toISOString() });
};
