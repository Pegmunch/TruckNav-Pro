// EARLY ERROR FILTER: Must run before any other code to suppress harmless ResizeObserver warnings
// This prevents Vite's runtime-error-plugin from showing overlay for benign errors
window.addEventListener('error', (event) => {
  if (event.message?.includes('ResizeObserver loop')) {
    event.stopImmediatePropagation();
    event.preventDefault();
    return false;
  }
}, true);

import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { startVersionMonitoring } from "./lib/cache-buster";
import { initializeGlobalErrorHandler } from "./lib/global-error-handler";
import "./index.css";
import "./i18n/config";

// Debug: Log localStorage state immediately on script load (before React mounts)
console.log('[MAIN] Script loaded - checking localStorage immediately:');
console.log('[MAIN] trucknav_legal_consent:', localStorage.getItem('trucknav_legal_consent'));
console.log('[MAIN] trucknav_legal_accepted:', localStorage.getItem('trucknav_legal_accepted'));
console.log('[MAIN] trucknav_app_version:', localStorage.getItem('trucknav_app_version'));
console.log('[MAIN] All localStorage keys:', Object.keys(localStorage));

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
// SIMPLIFIED: Only register/update SW, don't aggressively clear on every load
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Check if we already have a valid SW registered
      const existingRegistration = await navigator.serviceWorker.getRegistration('/');
      
      if (existingRegistration) {
        // Just update the existing SW
        console.log('[PWA] Updating existing Service Worker...');
        await existingRegistration.update();
        
        // If there's a waiting worker, activate it
        if (existingRegistration.waiting) {
          console.log('[PWA] Activating waiting worker');
          existingRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      } else {
        // No SW registered yet, register new one
        console.log('[PWA] Registering new Service Worker...');
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });
        console.log('[PWA] Service Worker registered successfully');
      }
      
      // Listen for controllerchange
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Controller changed - new SW active');
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
