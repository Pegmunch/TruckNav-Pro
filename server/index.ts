import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Re-enable security middleware for stable navigation functionality
import { applySecurityMiddleware, authRateLimit, apiRateLimit, sessionBridge } from "./middleware/security";
import { getSessionConfig, sessionDebugAndFallback, sessionRecovery } from "./middleware/session-security";

const app = express();

// Trust proxy for deployments behind reverse proxies/CDNs (including Replit)
// Replit runs behind a proxy even in development
app.set('trust proxy', 1);

// Initialize session configuration (async to wait for database schema setup)
const sessionConfig = await getSessionConfig();

// Enhanced session security with PostgreSQL store and comprehensive debugging
app.use(session(sessionConfig));

// Add session debugging and fallback mechanisms
app.use(sessionDebugAndFallback);
app.use(sessionRecovery);
app.use(sessionBridge);

// Re-enable security middleware for reliable navigation functionality
applySecurityMiddleware(app);

// Cache control headers - CRITICAL for PWA updates
// Development mode: aggressive no-cache to see changes immediately
// Production mode: no-cache for HTML/manifest/SW but long cache for assets
app.use((req, res, next) => {
  if (app.get("env") === "development") {
    // Set aggressive no-cache headers on all responses in dev
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  } else {
    // CRITICAL: PWA shell files must NEVER be cached by browser
    // This forces iOS/Android to always check server for updates
    if (
      req.path === '/' || 
      req.path === '/index.html' || 
      req.path === '/manifest.json' ||
      req.path.endsWith('.js') && (req.path.includes('sw') || req.path.includes('main')) ||
      req.path.endsWith('app-version.json')
    ) {
      // No cache for PWA critical files - forces update check on every load
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (req.path.match(/\.(js|css|woff2|png|jpg|jpeg|gif|svg)$/i)) {
      // Versioned assets can be cached forever (hashes change on rebuild)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Default: short cache for other files
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
  next();
});

if (app.get("env") === "development") {
  log('🚫 Development mode: Aggressive cache prevention enabled');
} else {
  log('✅ Production mode: Smart cache headers configured (PWA files: no-cache, Assets: long cache)');
}

// Handle Stripe webhooks with raw body before JSON parsing
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' })); // Reduced payload size to save memory
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Log API requests without sensitive response data
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Handle server startup with proper error handling
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Graceful shutdown handlers to properly free the port
  const gracefulShutdown = () => {
    log('Gracefully shutting down server...');
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
    
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      log('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // Listen for termination signals
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  
  // Handle uncaught errors properly
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown();
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
  });

  // Additional error handling for port conflicts
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. The server will exit and Replit will restart it automatically.`);
      process.exit(1);
    } else {
      console.error('Server error:', error);
    }
  });
})();
