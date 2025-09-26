import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Re-enable security middleware for stable navigation functionality
import { applySecurityMiddleware, authRateLimit, apiRateLimit, sessionBridge } from "./middleware/security";
import { sessionConfig, sessionDebugAndFallback, sessionRecovery } from "./middleware/session-security";

const app = express();

// Trust proxy for deployments behind reverse proxies/CDNs (including Replit)
// Replit runs behind a proxy even in development
app.set('trust proxy', 1);

// Enhanced session security with PostgreSQL store and comprehensive debugging
app.use(session(sessionConfig));

// Add session debugging and fallback mechanisms
app.use(sessionDebugAndFallback);
app.use(sessionRecovery);
app.use(sessionBridge);

// Re-enable security middleware for reliable navigation functionality
applySecurityMiddleware(app);

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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
