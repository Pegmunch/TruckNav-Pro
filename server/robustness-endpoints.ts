import { Router, Request, Response } from 'express';
import { performanceMiddleware, getPerformanceMetrics, resetPerformanceMetrics } from './middleware/performance-monitor';
import { errorTrackingMiddleware, getErrorStats, getHealthReport, resetErrorStats } from './middleware/error-tracking';

const router = Router();

router.get('/api/metrics/performance', getPerformanceMetrics);

router.get('/api/metrics/errors', getErrorStats);

router.get('/api/metrics/health', getHealthReport);

router.post('/api/metrics/reset', (_req: Request, res: Response) => {
  resetPerformanceMetrics(_req, res);
});

router.get('/api/health', (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({
    status: 'healthy',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    },
    timestamp: new Date().toISOString(),
    version: '3.4.9',
  });
});

router.get('/api/metrics/reliability', (_req: Request, res: Response) => {
  res.json({
    targets: {
      uptime: '99%',
      dataAccuracy: '99%',
      crashFreeOperation: '99%',
    },
    currentStatus: 'monitoring',
    monitoringEndpoints: {
      performance: '/api/metrics/performance',
      errors: '/api/metrics/errors',
      health: '/api/metrics/health',
    },
    timestamp: new Date().toISOString(),
  });
});

export const robustnessMiddleware = [performanceMiddleware, errorTrackingMiddleware];

export default router;
