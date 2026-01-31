// TruckNav Pro - Enhanced Session Security
// Patent-protected by Bespoke Marketing.Ai Ltd

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import MemoryStore from 'memorystore';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const PostgresStore = connectPgSimple(session);
const MemStore = MemoryStore(session);

// Ensure session schema exists (idempotent - safe to run on every startup)
async function ensureSessionSchema() {
  if (process.env.NODE_ENV !== 'production' || !process.env.DATABASE_URL) {
    return; // Skip in development or if no database
  }
  
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('[SESSION-SCHEMA] Ensuring session table schema is correct...');
    
    // 1. Drop the legacy problematic index if it exists
    await sql`DROP INDEX IF EXISTS "IDX_session_expire"`;
    console.log('[SESSION-SCHEMA] Removed legacy index (if existed)');
    
    // 2. Create the session table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS public.user_sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `;
    console.log('[SESSION-SCHEMA] Session table ready');
    
    // 3. Create a properly named index on the expire column
    await sql`CREATE INDEX IF NOT EXISTS user_sessions_expire_idx ON public.user_sessions(expire)`;
    console.log('[SESSION-SCHEMA] Session table index ready');
    
    console.log('[SESSION-SCHEMA] ✓ Session schema initialization complete');
  } catch (error: any) {
    console.error('[SESSION-SCHEMA] Failed to initialize session schema:', error.message);
    throw error;
  }
}

// Initialize schema before creating store (runs during module import in production)
let schemaReady: Promise<void> | null = null;
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  schemaReady = ensureSessionSchema();
}

// Choose session store based on environment
const getSessionStore = () => {
  if (process.env.NODE_ENV === 'production') {
    // Ensure database connection exists for session store in production
    if (!process.env.DATABASE_URL) {
      throw new Error('[SESSION] DATABASE_URL is required for secure session storage');
    }
    
    // Schema is already initialized by ensureSessionSchema() above
    // Use createTableIfMissing: false to prevent connect-pg-simple from trying to create anything
    const store = new PostgresStore({
      conString: process.env.DATABASE_URL!,
      createTableIfMissing: false, // Schema already created by ensureSessionSchema()
      tableName: 'user_sessions',
      pruneSessionInterval: 60 * 15,
      ttl: 60 * 60 * 24,
      schemaName: 'public',
    });
    
    console.log('[SESSION] Using PostgreSQL session store (production)');
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

// Enhanced session configuration factory (async to wait for schema initialization)
export async function getSessionConfig() {
  // Wait for schema initialization to complete before creating store
  if (schemaReady) {
    await schemaReady;
  }
  
  return {
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
}

// Session fallback middleware (logging disabled for performance)
export const sessionDebugAndFallback = (req: any, res: any, next: any) => {
  const sessionId = req.sessionID;
  const cookies = req.headers.cookie;
  const cookieReceived = cookies && cookies.includes('trucknav_session');
  
  // Add session ID to response headers for client-side persistence
  if (sessionId) {
    res.setHeader('X-Session-ID', sessionId);
    res.setHeader('X-Session-Cookie-Status', cookieReceived ? 'received' : 'missing');
  }
  
  next();
};

// Session recovery middleware for cookie-resistant clients (logging disabled for performance)
export const sessionRecovery = (req: any, res: any, next: any) => {
  const sessionFromHeader = req.headers['x-session-id'];
  const sessionFromStorage = req.headers['x-storage-session'];
  const currentSessionId = req.sessionID;
  
  // If we have a session from header or storage, try to restore it
  if ((sessionFromHeader || sessionFromStorage) && currentSessionId) {
    const preferredSessionId = sessionFromHeader || sessionFromStorage;
    
    // Check if we can restore the session from the store
    if (preferredSessionId !== currentSessionId) {
      // Store recovery info for potential session bridging (silently)
      req.sessionRecovery = {
        requestedSessionId: preferredSessionId,
        currentSessionId: currentSessionId,
        source: sessionFromHeader ? 'header' : 'storage'
      };
    }
  }
  
  next();
};