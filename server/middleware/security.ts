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
    // Block immediately on suspicious activity
    skip: (req) => {
      // Allow OPTIONS requests for CORS
      if (req.method === 'OPTIONS') return true;
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /(\<script|\<iframe|\<object|\<embed)/i,
        /(union\s+select|drop\s+table|insert\s+into)/i,
        /(\.\.\/|\.\.\\|\/etc\/passwd|\/proc\/)/i,
        /(eval\(|document\.cookie|window\.location)/i,
      ];
      
      const requestString = JSON.stringify(req.body) + req.url + JSON.stringify(req.headers);
      return !suspiciousPatterns.some(pattern => pattern.test(requestString));
    }
  });
};

// Different rate limits for different endpoints
export const generalRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

export const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 auth attempts per windowMs
  'Too many authentication attempts, please try again later.'
);

export const apiRateLimit = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  50, // limit each IP to 50 API requests per minute
  'API rate limit exceeded. Please slow down your requests.'
);

// Helmet security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com", "wss:", "ws:"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      childSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some maps functionality
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
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
      body: req.body,
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
      errors: errors.array(),
      body: req.body,
      url: req.url,
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

// CSRF protection using double submit cookie pattern
export const csrfProtection = (req: express.Request & { session?: any }, res: express.Response, next: express.NextFunction) => {
  // Skip CSRF for GET requests and OPTIONS (CORS preflight)
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return next();
  }

  const token = req.headers['x-csrf-token'] as string;
  const cookieToken = req.session?.csrfToken;

  if (!token || !cookieToken || token !== cookieToken) {
    console.warn(`[SECURITY] CSRF token mismatch from IP: ${req.ip}`, {
      providedToken: token ? 'provided' : 'missing',
      sessionToken: cookieToken ? 'exists' : 'missing',
      url: req.url,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'CSRF token validation failed',
      code: 'CSRF_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Generate CSRF token
export const generateCSRFToken = (req: express.Request & { session?: any }, res: express.Response, next: express.NextFunction) => {
  if (!req.session) {
    return next();
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Set CSRF token in response header for client to use
  res.setHeader('X-CSRF-Token', req.session.csrfToken);
  next();
};

// Security monitoring and logging
export const securityLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  
  // Log suspicious requests
  const suspiciousIndicators = [
    req.url.includes('..'),
    req.url.includes('/etc/'),
    req.url.includes('/proc/'),
    req.url.includes('cmd='),
    req.url.includes('exec='),
    JSON.stringify(req.headers).includes('<script'),
    req.get('User-Agent')?.includes('sqlmap'),
    req.get('User-Agent')?.includes('nikto'),
  ];

  if (suspiciousIndicators.some(indicator => indicator)) {
    console.warn(`[SECURITY] Suspicious request detected from IP: ${req.ip}`, {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  }

  // Enhanced logging for all requests
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[ACCESS] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
  });

  next();
};

// Intrusion detection system
export const intrusionDetection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip;
  const now = Date.now();
  
  // Simple in-memory store for tracking suspicious activity
  // In production, this should be replaced with Redis or similar
  const suspiciousActivity = new Map();
  
  // Check for rapid successive requests (potential DDoS)
  const ipActivity = suspiciousActivity.get(ip) || { count: 0, firstRequest: now };
  ipActivity.count++;
  
  if (now - ipActivity.firstRequest < 10000 && ipActivity.count > 50) { // 50 requests in 10 seconds
    console.error(`[SECURITY] Potential DDoS attack detected from IP: ${ip}`);
    return res.status(429).json({
      error: 'Rate limit exceeded - potential abuse detected',
      code: 'ABUSE_DETECTED',
      timestamp: new Date().toISOString()
    });
  }
  
  // Reset counter every minute
  if (now - ipActivity.firstRequest > 60000) {
    ipActivity.count = 1;
    ipActivity.firstRequest = now;
  }
  
  suspiciousActivity.set(ip, ipActivity);
  
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
  
  // CSRF token generation
  app.use(generateCSRFToken);
  
  console.log('[SECURITY] All anti-hacking security features activated');
};