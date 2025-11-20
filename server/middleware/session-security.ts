// TruckNav Pro - Enhanced Session Security
// Patent-protected by Bespoke Marketing.Ai Ltd

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import MemoryStore from 'memorystore';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const PostgresStore = connectPgSimple(session);
const MemStore = MemoryStore(session);

// Choose session store based on environment
const getSessionStore = () => {
  if (process.env.NODE_ENV === 'production') {
    // Ensure database connection exists for session store in production
    if (!process.env.DATABASE_URL) {
      throw new Error('[SESSION] DATABASE_URL is required for secure session storage');
    }
    
    const store = new PostgresStore({
      conString: process.env.DATABASE_URL!,
      createTableIfMissing: true,
      tableName: 'user_sessions',
      pruneSessionInterval: 60 * 15,
      ttl: 60 * 60 * 24,
      schemaName: 'public',
      errorLog: (err: Error) => {
        // Suppress "already exists" errors - they're harmless and expected on redeploy
        if (err.message && err.message.includes('already exists')) {
          console.log('[SESSION] Database schema already initialized (expected on redeploy)');
        } else {
          console.error('[SESSION-STORE] Error:', err.message);
        }
      }
    });
    
    return store;
  } else {
    // Use MemoryStore in development for session stability
    console.log('[SESSION] Using MemoryStore for development - sessions will be stable');
    return new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }
};

// Use stable SESSION_SECRET
const getSessionSecret = () => {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }
  // Stable dev secret instead of random on each restart  
  return process.env.NODE_ENV === 'production' 
    ? crypto.randomBytes(64).toString('hex')
    : 'dev-session-secret-stable-for-csrf-tokens-trucknav-pro';
};

// Enhanced session configuration with maximum cookie compatibility and fallbacks
export const sessionConfig = {
  store: getSessionStore(),
  
  secret: getSessionSecret(),
  
  name: 'trucknav_session', // Don't use default session name for security
  
  // Enhanced session persistence settings for robust CSRF support
  resave: false, // Only save when session is modified (prevents unnecessary saves)
  saveUninitialized: true, // Always create sessions to ensure CSRF tokens persist (required for security)
  
  cookie: {
    // Enhanced cookie configuration for maximum browser compatibility
    secure: process.env.NODE_ENV === 'production', // True for production HTTPS, false for dev HTTP
    httpOnly: false, // Allow client-side access for fallback mechanisms
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: false as any, // Disable SameSite for maximum compatibility
    domain: undefined, // Let the browser set the domain automatically
    path: '/', // Available across entire app
  },
  
  // Enhanced security options
  rolling: false, // Don't reset expiry on every request (reduces unnecessary session saves)
  unset: 'destroy' as const, // Destroy session data when unsetting
  
  // Custom session ID generation for enhanced security
  genid: () => {
    return crypto.randomBytes(32).toString('hex');
  },
  
  // Trust proxy settings - always enabled for Replit deployment
  proxy: true,
  
  // Add session debugging and monitoring
  logErrors: (err: Error) => {
    console.error('[SESSION] Error:', err.message);
  },
};

// Session debugging and fallback middleware
export const sessionDebugAndFallback = (req: any, res: any, next: any) => {
  const sessionId = req.sessionID;
  const cookies = req.headers.cookie;
  const sessionHeader = req.headers['x-session-id'];
  const sessionFromStorage = req.headers['x-storage-session'];
  
  // Comprehensive cookie debugging
  const cookieReceived = cookies && cookies.includes('trucknav_session');
  console.log(`[SESSION-DEBUG] ${req.method} ${req.url} - Session: ${sessionId?.substring(0, 8)}... Cookie sent: ${cookieReceived}, Header: ${sessionHeader?.substring(0, 8) || 'none'}, Storage: ${sessionFromStorage?.substring(0, 8) || 'none'}`);
  
  // Add session ID to response headers for client-side persistence
  if (sessionId) {
    res.setHeader('X-Session-ID', sessionId);
    res.setHeader('X-Session-Cookie-Status', cookieReceived ? 'received' : 'missing');
  }
  
  next();
};

// Session recovery middleware for cookie-resistant clients
export const sessionRecovery = (req: any, res: any, next: any) => {
  const sessionFromHeader = req.headers['x-session-id'];
  const sessionFromStorage = req.headers['x-storage-session'];
  const currentSessionId = req.sessionID;
  
  // If we have a session from header or storage, try to restore it
  if ((sessionFromHeader || sessionFromStorage) && currentSessionId) {
    const preferredSessionId = sessionFromHeader || sessionFromStorage;
    
    // Check if we can restore the session from the store
    if (preferredSessionId !== currentSessionId) {
      console.log(`[SESSION-RECOVERY] Attempting to restore session ${preferredSessionId.substring(0, 8)}... (current: ${currentSessionId.substring(0, 8)}...)`);
      
      // Store recovery info for potential session bridging
      req.sessionRecovery = {
        requestedSessionId: preferredSessionId,
        currentSessionId: currentSessionId,
        source: sessionFromHeader ? 'header' : 'storage'
      };
    }
  }
  
  next();
};