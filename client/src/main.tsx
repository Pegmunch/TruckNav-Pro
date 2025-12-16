import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { startVersionMonitoring } from "./lib/cache-buster";
import { initializeGlobalErrorHandler } from "./lib/global-error-handler";
import "./index.css";
import "./i18n/config";

// Initialize CSRF token on app startup with robust error handling
async function initializeCSRF() {
  try {
    const { initializeCSRFToken } = await import('./lib/queryClient');
    const token = await initializeCSRFToken();
    if (token) {
    } else {
      console.warn('CSRF token initialization completed but no token received');
    }
  } catch (error) {
    console.error("Failed to initialize CSRF token with robust management:", error);
    // No fallback needed - ensureValidToken will handle token fetching when needed
  }
}

// Register Service Worker for PWA functionality 
// TruckNav Pro - Patent-protected by Bespoke Marketing.Ai Ltd
// CRITICAL FIX: First UNREGISTER all old service workers and clear all caches
// Then register fresh SW to ensure users always get latest version
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // STEP 1: Aggressively clear ALL old service workers and caches
      // This fixes iOS PWA showing old cached versions
      console.log('[PWA-CLEANUP] Starting aggressive cache cleanup...');
      
      // Unregister ALL existing service workers (both sw.js and sw-enhanced.js)
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        console.log('[PWA-CLEANUP] Unregistering old SW:', registration.scope);
        await registration.unregister();
      }
      
      // Delete ALL TruckNav-related caches
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        if (cacheName.includes('trucknav') || cacheName.includes('TruckNav')) {
          console.log('[PWA-CLEANUP] Deleting cache:', cacheName);
          await caches.delete(cacheName);
        }
      }
      
      console.log('[PWA-CLEANUP] Cleanup complete, registering fresh SW...');
      
      // STEP 2: Register new service worker with unique version
      const SW_VERSION = `${Date.now()}`; // Always unique to force fresh registration
      const registration = await navigator.serviceWorker.register(`/sw.js?v=${SW_VERSION}`, {
        scope: '/',
        updateViaCache: 'none' // Always check server for updates
      });
      console.log('[PWA] Fresh Service Worker registered:', SW_VERSION);
      
      // Force immediate update check
      await registration.update();
      
      // If there's a waiting worker, activate it immediately
      if (registration.waiting) {
        console.log('[PWA] Activating waiting worker immediately');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Listen for controllerchange to reload page with fresh content
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Controller changed - fresh SW active');
      });
      
    } catch (error) {
      console.error('TruckNav Pro SW registration failed:', error);
    }
  });
}

// Note: Service Worker now enabled in development for PWA testing
// To disable SW in dev, change the condition above to import.meta.env.PROD only

// Cache clearing disabled for debugging

// Build ID for verification that new code is running
const BUILD_ID = 'build-20250917-trucknav-enhanced';
if (import.meta.env.DEV && document) {
  const buildMarker = document.createElement('meta');
  buildMarker.name = 'trucknav-build-id';
  buildMarker.content = BUILD_ID;
  document.head.appendChild(buildMarker);
}

// Initialize global error handler early to catch all errors
initializeGlobalErrorHandler();

// Start cache busting to prevent PWA multi-version issues
startVersionMonitoring();

// Initialize CSRF token in background (don't wait for it)
initializeCSRF();

// Render the actual TruckNav Pro app
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ErrorBoundary>
);
