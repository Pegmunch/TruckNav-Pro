// TruckNav Pro - Enhanced Session Security
// Patent-protected by Bespoke Marketing.Ai Ltd

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const PostgresStore = connectPgSimple(session);

// Ensure database connection exists for session store
if (!process.env.DATABASE_URL) {
  throw new Error('[SESSION] DATABASE_URL is required for secure session storage');
}

// Create database connection for session store
let sql: any;
try {
  sql = neon(process.env.DATABASE_URL!);
} catch (error) {
  console.error('[SESSION] Database connection failed:', error);
  throw new Error('[SESSION] Failed to connect to database for session storage');
}

// Enhanced session configuration with maximum security
export const sessionConfig = {
  store: new PostgresStore({
    conString: process.env.DATABASE_URL!,
    createTableIfMissing: true,
    tableName: 'user_sessions',
    // Enhanced security settings
    pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
    ttl: 60 * 60 * 24, // Session TTL of 24 hours
    schemaName: 'public',
  }),
  
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  
  name: 'trucknav_session', // Don't use default session name for security
  
  resave: false,
  saveUninitialized: false,
  
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS access to cookies
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'strict' as const, // CSRF protection
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