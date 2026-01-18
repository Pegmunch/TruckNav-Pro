import rateLimit from 'express-rate-limit';

export const rateLimitConfigs = {
  general: {
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 10000 : 5000,
    message: 'Too many requests from this IP, please try again later.',
  },
  
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many authentication attempts, please try again later.',
  },
  
  api: {
    windowMs: 1 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 10000 : 2000,
    message: 'API rate limit exceeded. Please slow down your requests.',
  },

  strict: {
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: 'Rate limit exceeded for sensitive operation.',
  },

  routePlanning: {
    windowMs: 1 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 500 : 300,
    message: 'Route planning rate limit exceeded. Please wait before planning more routes.',
  },

  fileUpload: {
    windowMs: 5 * 60 * 1000,
    max: 50,
    message: 'File upload rate limit exceeded.',
  },

  externalApi: {
    windowMs: 1 * 60 * 1000,
    max: 500,
    message: 'External API call rate limit exceeded.',
  },
};

export const createEnhancedRateLimiter = (configKey: keyof typeof rateLimitConfigs) => {
  const config = rateLimitConfigs[configKey];
  
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      error: config.message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(config.windowMs / 1000),
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' || req.method === 'HEAD',
    keyGenerator: (req) => {
      // Use session ID if available (prevents rate limit issues with load balancers)
      // Otherwise fall back to IP for unauthenticated requests
      if (req.session?.id) {
        return `session:${req.session.id}`;
      }
      
      // Use a more stable IP identifier - the first forwarded IP or direct IP
      const forwardedFor = req.headers['x-forwarded-for'];
      if (typeof forwardedFor === 'string') {
        return forwardedFor.split(',')[0].trim();
      }
      
      return req.ip || 'unknown';
    },
  });
};

export const routePlanningRateLimit = createEnhancedRateLimiter('routePlanning');
export const strictRateLimit = createEnhancedRateLimiter('strict');
export const fileUploadRateLimit = createEnhancedRateLimiter('fileUpload');
export const externalApiRateLimit = createEnhancedRateLimiter('externalApi');
