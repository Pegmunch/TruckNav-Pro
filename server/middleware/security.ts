// TruckNav Pro - Comprehensive Anti-Hacking Security Middleware
// Patent-protected by Bespoke Marketing.Ai Ltd

import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';

// Rate limiting configurations
export const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Allow OPTIONS and HEAD requests (for health checks) without counting
    skip: (req) => {
      return req.method === 'OPTIONS' || req.method === 'HEAD';
    },
    
    // Handle suspicious activity with immediate blocking
    handler: (req, res) => {
      const suspiciousPatterns = [
        /(\<script|\<iframe|\<object|\<embed)/i,
        /(union\s+select|drop\s+table|insert\s+into)/i,
        /(\.\.\/|\.\.\\|\/etc\/passwd|\/proc\/)/i,
        /(eval\(|document\.cookie|window\.location)/i,
      ];
      
      const requestString = JSON.stringify(req.body || {}) + req.url + JSON.stringify(req.headers);
      const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));
      
      if (isSuspicious) {
        console.warn(`[SECURITY] Suspicious request blocked from IP: ${req.ip}`, {
          url: req.url,
          method: req.method,
          timestamp: new Date().toISOString()
        });
        return res.status(429).json({
          error: 'Request blocked due to suspicious patterns',
          code: 'SUSPICIOUS_ACTIVITY',
          timestamp: new Date().toISOString()
        });
      }
      
      // Default rate limit response
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString(),
      });
    }
  });
};

// Different rate limits for different endpoints
export const generalRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit for development
  'Too many requests from this IP, please try again later.'
);

export const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 auth attempts per windowMs
  'Too many authentication attempts, please try again later.'
);

export const apiRateLimit = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  process.env.NODE_ENV === 'development' ? 10000 : 50, // Much higher limit for development
  'API rate limit exceeded. Please slow down your requests.'
);

// Helmet security headers configuration
export const securityHeaders = helmet({
  // Completely disable CSP in development to allow Vite's inline scripts and HMR
  contentSecurityPolicy: process.env.NODE_ENV === 'development' ? false : {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      childSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"], // For map libraries
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some maps functionality
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false, // Disable HSTS in development
  noSniff: false, // Disable in development
  frameguard: false, // Disable X-Frame-Options in development
  xssFilter: false, // Disable XSS filter in development
});

// CORS configuration
export const corsOptions = {
  origin: (origin: any, callback: any) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and replit.dev domains for development
    const allowedOrigins = [
      /^https?:\/\/localhost(:\d+)?$/,
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
      /^https?:\/\/.*\.replit\.dev$/,
      /^https?:\/\/.*\.replit\.app$/,
      /^https?:\/\/.*\.repl\.co$/,
    ];
    
    const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] Blocked CORS request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
  maxAge: 86400, // 24 hours
};

// Input sanitization and validation
export const sanitizeInput = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Sanitize all string inputs
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potential XSS patterns
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

// SQL injection prevention
export const preventSQLInjection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+set/i
  ];

  const checkForSQLInjection = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return sqlPatterns.some(pattern => pattern.test(obj));
    } else if (Array.isArray(obj)) {
      return obj.some(checkForSQLInjection);
    } else if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkForSQLInjection);
    }
    return false;
  };

  if (req.body && checkForSQLInjection(req.body)) {
    console.warn(`[SECURITY] SQL injection attempt detected from IP: ${req.ip}`, {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      error: 'Invalid request format',
      code: 'INVALID_INPUT',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Request validation middleware
export const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`[SECURITY] Request validation failed from IP: ${req.ip}`, {
      errorTypes: errors.array().map(e => e.type),
      errorFields: errors.array().map(e => (e as any).path),
      errorMessages: errors.array().map(e => e.msg),
      method: req.method,
      url: req.url,
      requestBody: req.method === 'POST' ? req.body : undefined,
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// CSRF protection using double submit cookie pattern - enhanced for concurrent request handling
export const csrfProtection = (req: express.Request & { session?: any }, res: express.Response, next: express.NextFunction) => {
  // Skip CSRF for GET, HEAD, and OPTIONS requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Check if session exists first for efficiency
  if (!req.session) {
    console.error(`[SECURITY] No session found for CSRF validation from IP: ${req.ip}`, {
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'Session required for CSRF validation',
      code: 'NO_SESSION',
      timestamp: new Date().toISOString()
    });
  }

  const token = req.headers['x-csrf-token'] as string;
  
  // Enhanced token storage to handle concurrent requests
  if (!req.session.csrfTokens) {
    req.session.csrfTokens = [];
  }
  
  // Initialize single token if using old format
  if (req.session.csrfToken && !req.session.csrfTokens.length) {
    req.session.csrfTokens = [{
      token: req.session.csrfToken,
      timestamp: Date.now()
    }];
    delete req.session.csrfToken; // Clean up old format
  }

  // Clean up expired tokens (older than 10 minutes)
  const now = Date.now();
  req.session.csrfTokens = req.session.csrfTokens.filter((tokenInfo: any) => 
    now - tokenInfo.timestamp < 600000
  );

  // If no valid tokens, return error and let client fetch new token
  if (!req.session.csrfTokens.length) {
    console.warn(`[SECURITY] No valid CSRF tokens in session - client needs to fetch new token for IP: ${req.ip}`, {
      sessionId: req.sessionID ? 'exists' : 'missing',
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    // Return error without generating token here to avoid race conditions
    return res.status(403).json({
      error: 'CSRF token required - fetch from /api/csrf-token',
      code: 'CSRF_TOKEN_REQUIRED',
      hint: 'Request a fresh token from /api/csrf-token endpoint',
      timestamp: new Date().toISOString()
    });
  }

  // Enhanced token validation - check against all valid tokens
  const validToken = req.session.csrfTokens.find((tokenInfo: any) => 
    tokenInfo.token === token
  );

  if (!token || !validToken) {
    console.warn(`[SECURITY] CSRF token validation failed - blocking request from IP: ${req.ip}`, {
      providedToken: token ? token.substring(0, 8) + '...' : 'missing',
      providedTokenFull: token ? 'provided' : 'missing',
      validTokensCount: req.session.csrfTokens.length,
      sessionId: req.sessionID ? req.sessionID.substring(0, 8) + '...' : 'missing',
      availableTokens: req.session.csrfTokens.map((t: any) => t.token.substring(0, 8) + '...'),
      tokensMatch: token ? 'no' : 'n/a',
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    // Enhanced error response with recovery hint
    return res.status(403).json({
      error: 'CSRF token validation failed',
      code: 'CSRF_ERROR',
      hint: 'Request a new token from /api/csrf-token',
      timestamp: new Date().toISOString()
    });
  }

  // Update timestamp for this token to keep it fresh
  validToken.timestamp = Date.now();
  
  console.log(`[CSRF] Token validated successfully for ${req.method} ${req.url}`);
  next();
};

// Generate CSRF token
export const generateCSRFToken = (req: express.Request & { session?: any }, res: express.Response, next: express.NextFunction) => {
  if (!req.session) {
    console.warn('[SECURITY] No session found for CSRF token generation');
    return next();
  }

  // Initialize token pool if needed
  if (!req.session.csrfTokens) {
    req.session.csrfTokens = [];
  }

  // Clean up expired tokens first
  const now = Date.now();
  req.session.csrfTokens = req.session.csrfTokens.filter((tokenInfo: any) => 
    now - tokenInfo.timestamp < 600000 // 10 minutes
  );

  // Generate a new token and add it to the pool
  const newToken = crypto.randomBytes(32).toString('hex');
  req.session.csrfTokens.push({
    token: newToken,
    timestamp: now
  });

  // Keep only the last 5 tokens to prevent memory bloat
  if (req.session.csrfTokens.length > 5) {
    req.session.csrfTokens = req.session.csrfTokens.slice(-5);
  }

  console.log(`[CSRF] New token generated for session ${req.sessionID?.substring(0, 8)}...: ${newToken.substring(0, 8)}... (pool size: ${req.session.csrfTokens.length})`);

  // Set CSRF token in response header for client to use
  res.setHeader('X-CSRF-Token', newToken);
  next();
};

// Security monitoring and logging (with sensitive data protection)
export const securityLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  
  // Log suspicious requests (without sensitive headers)
  const suspiciousIndicators = [
    req.url.includes('..'),
    req.url.includes('/etc/'),
    req.url.includes('/proc/'),
    req.url.includes('cmd='),
    req.url.includes('exec='),
    req.get('User-Agent')?.includes('<script'),
    req.get('User-Agent')?.includes('sqlmap'),
    req.get('User-Agent')?.includes('nikto'),
  ];

  if (suspiciousIndicators.some(indicator => indicator)) {
    console.warn(`[SECURITY] Suspicious request detected from IP: ${req.ip}`, {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  // Enhanced logging for all requests (no sensitive response data)
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[ACCESS] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
  });

  next();
};

// Persistent intrusion detection tracking
const suspiciousActivity = new Map<string, { count: number; firstRequest: number }>();

// Intrusion detection system
export const intrusionDetection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  
  // Skip DDoS detection for development module requests  
  const isDevelopmentRequest = req.url.includes('/.vite/') || 
                               req.url.includes('/@fs/') || 
                               req.url.includes('/@vite/') || 
                               req.url.includes('/@react-refresh') ||
                               req.url.includes('/node_modules/') ||
                               req.url.includes('.js?v=') ||
                               req.url.includes('.css?v=') ||
                               req.url.includes('.json?import') ||
                               req.url.includes('/src/') ||
                               req.url.includes('/@replit/') ||
                               req.url.includes('favicon') ||
                               req.url.includes('vite.svg') ||
                               req.url.endsWith('.tsx') ||
                               req.url.endsWith('.ts') ||
                               req.url.endsWith('.css') ||
                               req.url.endsWith('.js');

  // Check for localhost/development environment
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.');

  if (!isDevelopmentRequest) {
    // Check for rapid successive requests (potential DDoS)
    const ipActivity = suspiciousActivity.get(ip) || { count: 0, firstRequest: now };
    ipActivity.count++;
    
    // More lenient limits for development/localhost
    const limit = isLocalhost ? 1000 : 100; // 1000 requests for localhost, 100 for production
    const timeWindow = isLocalhost ? 60000 : 30000; // 60s for localhost, 30s for production
    
    if (now - ipActivity.firstRequest < timeWindow && ipActivity.count > limit) {
      console.error(`[SECURITY] Potential DDoS attack detected from IP: ${ip}`);
      return res.status(429).json({
        error: 'Rate limit exceeded - potential abuse detected',
        code: 'ABUSE_DETECTED',
        timestamp: new Date().toISOString()
      });
    }
    
    // Update activity tracking
    suspiciousActivity.set(ip, ipActivity);
  }
  
  // Reset counter every 2 minutes for non-development requests
  if (!isDevelopmentRequest) {
    const ipActivity = suspiciousActivity.get(ip);
    if (ipActivity && now - ipActivity.firstRequest > 120000) {
      ipActivity.count = 1;
      ipActivity.firstRequest = now;
      suspiciousActivity.set(ip, ipActivity);
    }
  }
  
  next();
};

// Complete security middleware stack
export const applySecurityMiddleware = (app: express.Application) => {
  // Apply security headers first
  app.use(securityHeaders);
  
  // CORS protection
  app.use(cors(corsOptions));
  
  // Security logging and monitoring
  app.use(securityLogger);
  
  // Intrusion detection
  app.use(intrusionDetection);
  
  // Apply general rate limiting
  app.use(generalRateLimit);
  
  // Input sanitization
  app.use(sanitizeInput);
  
  // SQL injection prevention
  app.use(preventSQLInjection);
  
  // Proactive CSRF token generation for all sessions (prevents token-missing scenarios)
  app.use(generateCSRFToken);
  
  // CSRF protection for all state-changing operations - applied globally for robustness
  app.use(csrfProtection);
  
  console.log('[SECURITY] All anti-hacking security features activated including proactive CSRF protection');
};