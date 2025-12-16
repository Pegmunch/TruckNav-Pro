import rateLimit from 'express-rate-limit';

export const rateLimitConfigs = {
  general: {
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 1000 : 100,
    message: 'Too many requests from this IP, please try again later.',
  },
  
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later.',
  },
  
  api: {
    windowMs: 1 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 10000 : 60,
    message: 'API rate limit exceeded. Please slow down your requests.',
  },

  strict: {
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: 'Rate limit exceeded for sensitive operation.',
  },

  routePlanning: {
    windowMs: 1 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 100 : 20,
    message: 'Route planning rate limit exceeded. Please wait before planning more routes.',
  },

  fileUpload: {
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: 'File upload rate limit exceeded.',
  },

  externalApi: {
    windowMs: 1 * 60 * 1000,
    max: 30,
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
      return req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    },
  });
};

export const routePlanningRateLimit = createEnhancedRateLimiter('routePlanning');
export const strictRateLimit = createEnhancedRateLimiter('strict');
export const fileUploadRateLimit = createEnhancedRateLimiter('fileUpload');
export const externalApiRateLimit = createEnhancedRateLimiter('externalApi');
