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
    
    return new PostgresStore({
      conString: process.env.DATABASE_URL!,
      createTableIfMissing: true,
      tableName: 'user_sessions',
      pruneSessionInterval: 60 * 15,
      ttl: 60 * 60 * 24,
      schemaName: 'public',
    });
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

// Enhanced session configuration with stability for development
export const sessionConfig = {
  store: getSessionStore(),
  
  secret: getSessionSecret(),
  
  name: 'trucknav_session', // Don't use default session name for security
  
  resave: false,
  saveUninitialized: true, // Changed to true for cross-tab CSRF token sharing
  
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS access to cookies
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'lax' as const, // Always use lax for cross-tab compatibility
    domain: undefined, // Let the browser set the domain
    path: '/', // Available across entire app
  },
  
  // Enhanced security options
  rolling: true, // Reset expiry on each request
  
  
  // Custom session ID generation for enhanced security
  genid: () => {
    return crypto.randomBytes(32).toString('hex');
  },
  
  // Proxy trust settings for production deployment
  proxy: process.env.NODE_ENV === 'production',
};