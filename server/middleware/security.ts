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
      imgSrc: ["'self'", "data:", "https:", "blob:", 
        "https://*.tile.openstreetmap.org", 
        "https://*.basemaps.cartocdn.com", 
        "https://server.arcgisonline.com",
        "https://*.tile.opentopomap.org"
      ],
      connectSrc: ["'self'", "https://api.stripe.com",
        "https://*.tile.openstreetmap.org", 
        "https://*.basemaps.cartocdn.com", 
        "https://server.arcgisonline.com",
        "https://*.tile.opentopomap.org"
      ],
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
// Session bridge middleware for cookie-resistant environments with CSRF token transfer
export const sessionBridge = (req: express.Request & { session?: any }, res: express.Response, next: express.NextFunction) => {
  const sessionFromHeader = req.headers['x-session-id'] as string;
  const sessionFromStorage = req.headers['x-storage-session'] as string;
  const currentSessionId = req.sessionID;
  
  // If client is sending session via headers/storage, bridge the session
  if ((sessionFromHeader || sessionFromStorage) && currentSessionId) {
    const clientSessionId = sessionFromHeader || sessionFromStorage;
    
    if (clientSessionId !== currentSessionId) {
      console.log(`[SESSION-BRIDGE] Bridging session from ${clientSessionId.substring(0, 8)}... to ${currentSessionId.substring(0, 8)}...`);
      
      // Copy session data to maintain continuity and transfer CSRF tokens
      if (req.session) {
        req.session.bridgedFrom = clientSessionId;
        req.session.bridgeTimestamp = Date.now();
        req.session.bridgeReason = sessionFromHeader ? 'header' : 'storage';
        
        // Get the session store to access source session data for CSRF token transfer
        const sessionStore = req.sessionStore;
        
        if (sessionStore) {
          // Try to get the source session data to transfer CSRF tokens
          sessionStore.get(clientSessionId, (err: any, sourceSessionData: any) => {
            if (!err && sourceSessionData && sourceSessionData.csrfTokens) {
              // Initialize target session CSRF tokens if not exists
              if (!req.session.csrfTokens) {
                req.session.csrfTokens = [];
              }
              
              // Filter valid tokens from source session (not expired)
              const now = Date.now();
              const TOKEN_EXPIRY_MS = 600000; // 10 minutes
              const validSourceTokens = sourceSessionData.csrfTokens.filter((tokenInfo: any) => 
                tokenInfo && tokenInfo.token && (now - tokenInfo.timestamp < TOKEN_EXPIRY_MS)
              );
              
              // Transfer valid tokens from source to target session
              if (validSourceTokens.length > 0) {
                // Merge tokens, keeping unique ones and preventing duplicates
                const existingTokens = new Set(req.session.csrfTokens.map((t: any) => t.token));
                const newTokens = validSourceTokens.filter((t: any) => !existingTokens.has(t.token));
                
                req.session.csrfTokens = [...req.session.csrfTokens, ...newTokens];
                
                // Keep only the last 10 tokens to prevent memory bloat
                if (req.session.csrfTokens.length > 10) {
                  req.session.csrfTokens = req.session.csrfTokens.slice(-10);
                }
                
                console.log(`[SESSION-BRIDGE-CSRF] Transferred ${newTokens.length} valid CSRF tokens from source session (total pool: ${req.session.csrfTokens.length})`);
              }
            }
            
            // Force session save to persist bridge information and transferred tokens
            req.session.save((saveErr: any) => {
              if (saveErr) {
                console.error('[SESSION-BRIDGE] Failed to save bridged session:', saveErr);
              } else {
                console.log(`[SESSION-BRIDGE] Successfully bridged session ${clientSessionId.substring(0, 8)}... to ${currentSessionId.substring(0, 8)}...`);
              }
            });
          });
        } else {
          console.warn('[SESSION-BRIDGE] No session store available for CSRF token transfer');
          // Force session save to persist bridge information even without token transfer
          req.session.save((err: any) => {
            if (err) {
              console.error('[SESSION-BRIDGE] Failed to save bridged session:', err);
            } else {
              console.log(`[SESSION-BRIDGE] Successfully bridged session ${clientSessionId.substring(0, 8)}... to ${currentSessionId.substring(0, 8)}...`);
            }
          });
        }
      }
    }
  }
  
  next();
};

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

// Enhanced session initialization middleware with comprehensive cookie debugging and fallback mechanisms
export const ensureSessionExists = (req: express.Request & { session?: any; sessionRecovery?: any }, res: express.Response, next: express.NextFunction) => {
  if (!req.session) {
    console.warn(`[SESSION] No session found for ${req.method} ${req.url} - creating new session`);
    // This should be handled by express-session middleware, but adding as safety net
    return res.status(500).json({
      error: 'Session initialization failed',
      code: 'SESSION_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Comprehensive cookie and session debugging
  const cookies = req.headers.cookie;
  const sessionHeader = Array.isArray(req.headers['x-session-id']) ? req.headers['x-session-id'][0] : req.headers['x-session-id'];
  const sessionFromStorage = Array.isArray(req.headers['x-storage-session']) ? req.headers['x-storage-session'][0] : req.headers['x-storage-session'];
  const userAgent = Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'];
  const cookieReceived = cookies && cookies.includes('trucknav_session');
  
  // Log detailed session information
  console.log(`[SESSION-ANALYSIS] ${req.method} ${req.url} - IP: ${req.ip}`);
  console.log(`[SESSION-ANALYSIS] Session ID: ${req.sessionID?.substring(0, 8)}...`);
  console.log(`[SESSION-ANALYSIS] Cookie sent: ${cookieReceived}`);
  console.log(`[SESSION-ANALYSIS] Raw cookies: ${cookies ? cookies.substring(0, 100) + '...' : 'none'}`);
  console.log(`[SESSION-ANALYSIS] Session header: ${sessionHeader?.substring(0, 8) || 'none'}...`);
  console.log(`[SESSION-ANALYSIS] Storage session: ${sessionFromStorage?.substring(0, 8) || 'none'}...`);
  console.log(`[SESSION-ANALYSIS] User agent: ${userAgent?.substring(0, 50) || 'none'}...`);
  
  // Add session persistence headers for client-side correlation
  if (req.sessionID) {
    res.setHeader('X-Session-ID', req.sessionID);
    res.setHeader('X-Session-Cookie-Status', cookieReceived ? 'received' : 'missing');
    res.setHeader('X-Session-Source', cookieReceived ? 'cookie' : 'new');
  }
  
  // Initialize session data if needed
  if (!req.session.initialized) {
    req.session.initialized = true;
    req.session.created = Date.now();
    req.session.lastAccess = Date.now();
    req.session.accessCount = 1;
    req.session.cookieWorking = cookieReceived;
    req.session.fallbackActive = !cookieReceived && (sessionHeader || sessionFromStorage);
    
    console.log(`[SESSION] Initialized session ${req.sessionID?.substring(0, 8)}... for first time (Cookie working: ${cookieReceived})`);
  } else {
    // Update session tracking for existing sessions
    req.session.lastAccess = Date.now();
    req.session.accessCount = (req.session.accessCount || 0) + 1;
    
    // Check if cookie status changed
    if (req.session.cookieWorking !== cookieReceived) {
      console.log(`[SESSION] Cookie status changed for session ${req.sessionID?.substring(0, 8)}... - was: ${req.session.cookieWorking}, now: ${cookieReceived}`);
      req.session.cookieWorking = cookieReceived;
    }
    
    console.log(`[SESSION] Reusing session ${req.sessionID?.substring(0, 8)}... (Access #${req.session.accessCount}, Cookie: ${cookieReceived})`);
  }
  
  // Handle session recovery if needed
  if (req.sessionRecovery) {
    console.log(`[SESSION-RECOVERY] Recovery requested for session ${req.sessionRecovery.requestedSessionId.substring(0, 8)}... via ${req.sessionRecovery.source}`);
    // Store recovery information for potential session bridging
    req.session.recoveryAttempted = true;
    req.session.originalSessionId = req.sessionRecovery.requestedSessionId;
  }
  
  next();
};

// CSRF protection using double submit cookie pattern - enhanced for concurrent request handling
export const csrfProtection = (req: express.Request & { session?: any }, res: express.Response, next: express.NextFunction) => {
  // Skip CSRF for GET, HEAD, and OPTIONS requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Session should already exist due to ensureSessionExists middleware
  if (!req.session) {
    console.error(`[CSRF] Critical error: No session found after session middleware for ${req.method} ${req.url}`);
    return res.status(500).json({
      error: 'Session system failure',
      code: 'SESSION_FAILURE',
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
  const TOKEN_EXPIRY_MS = 600000; // 10 minutes
  const now = Date.now();
  req.session.csrfTokens = req.session.csrfTokens.filter((tokenInfo: any) => 
    now - tokenInfo.timestamp < TOKEN_EXPIRY_MS
  );

  // If no valid tokens, generate one automatically for robustness
  if (!req.session.csrfTokens.length) {
    console.warn(`[CSRF] No valid CSRF tokens in session - auto-generating token for recovery`, {
      sessionId: req.sessionID ? req.sessionID.substring(0, 8) + '...' : 'missing',
      url: req.url,
      method: req.method,
      sessionAge: req.session.created ? Date.now() - req.session.created : 'unknown',
      timestamp: new Date().toISOString()
    });
    
    // Auto-generate token for seamless recovery
    const newToken = crypto.randomBytes(32).toString('hex');
    req.session.csrfTokens = [{
      token: newToken,
      timestamp: Date.now()
    }];
    
    // Force session save to ensure token persists, then validate
    req.session.save((err: any) => {
      if (err) {
        console.error('[CSRF] Failed to save session during token recovery:', err);
        return res.status(500).json({
          error: 'Failed to save CSRF token',
          code: 'CSRF_SAVE_ERROR',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`[CSRF] Auto-generated recovery token for session ${req.sessionID?.substring(0, 8)}... - saved successfully`);
      
      // Now validate the token AFTER session is saved
      validateTokenAndProceed(req, res, next, token);
    });
    return; // Important: stop execution here, validation happens in callback
  }

  // If we have tokens, validate immediately
  validateTokenAndProceed(req, res, next, token);
}

// Helper function to validate token and proceed
function validateTokenAndProceed(
  req: express.Request & { session?: any },
  res: express.Response,
  next: express.NextFunction,
  token: string
) {
  // Enhanced token validation - check against all valid tokens
  const validToken = req.session.csrfTokens.find((tokenInfo: any) => 
    tokenInfo.token === token
  );

  if (!token || !validToken) {
    // For robust recovery, try auto-generating a fresh token
    if (!token) {
      console.warn(`[CSRF] No token provided for ${req.method} ${req.url} - generating recovery token`);
      const recoveryToken = crypto.randomBytes(32).toString('hex');
      req.session.csrfTokens.push({
        token: recoveryToken,
        timestamp: Date.now()
      });
      
      // Set the recovery token in response headers for client to use
      res.setHeader('X-CSRF-Token-Recovery', recoveryToken);
      
      console.log(`[CSRF] Recovery token generated for session ${req.sessionID?.substring(0, 8)}...`);
      
      // Return recovery response
      return res.status(409).json({
        error: 'CSRF token missing - recovery token provided',
        code: 'CSRF_TOKEN_MISSING',
        recovery_token: recoveryToken,
        hint: 'Use the recovery token in X-CSRF-Token-Recovery header for the next request',
        timestamp: new Date().toISOString()
      });
    }
    
    console.warn(`[CSRF] Token validation failed for ${req.method} ${req.url}`, {
      providedToken: token.substring(0, 8) + '...',
      sessionId: req.sessionID?.substring(0, 8) + '...',
      validTokensCount: req.session.csrfTokens.length,
      timestamp: new Date().toISOString()
    });
    
    // Return standard validation error
    return res.status(403).json({
      error: 'CSRF token validation failed',
      code: 'CSRF_ERROR',
      hint: 'Request a new token from /api/csrf-token',
      timestamp: new Date().toISOString()
    });
  }

  // Update timestamp for this token to keep it fresh
  validToken.timestamp = Date.now();
  
  console.log(`[CSRF] Token validated successfully for ${req.method} ${req.url} (session: ${req.sessionID?.substring(0, 8)}...)`);
  
  // Save session to persist timestamp update before proceeding
  req.session.save((err: any) => {
    if (err) {
      console.error('[CSRF] Failed to save session after token validation:', err);
      // Continue anyway - timestamp update is not critical
    }
    next();
  });
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

  // Force session save to ensure token is persisted before sending response
  req.session.save((err: any) => {
    if (err) {
      console.error('[CSRF] Failed to save session:', err);
    } else {
      console.log(`[CSRF] Session saved successfully - token pool size: ${req.session.csrfTokens.length}`);
    }
    
    // Set CSRF token in response header for client to use
    res.setHeader('X-CSRF-Token', newToken);
    next();
  });
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
  
  // Ensure all requests have valid sessions
  app.use(ensureSessionExists);
  
  // Session bridging for cookie-resistant environments (must come after session creation)
  app.use(sessionBridge);
  
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