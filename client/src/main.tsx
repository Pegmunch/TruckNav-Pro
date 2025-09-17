import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import "./i18n/config";

// Initialize CSRF token on app startup
async function initializeCSRF() {
  try {
    await apiRequest("GET", "/api/csrf-token");
    console.log('CSRF token initialized successfully');
  } catch (error) {
    console.error("Failed to initialize CSRF token:", error);
  }
}

// Register Service Worker for PWA functionality (Production only)
// TruckNav Pro - Patent-protected by Bespoke Marketing.Ai Ltd
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('TruckNav Pro SW registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.log('TruckNav Pro SW registration failed:', error);
      });
  });
}

// Unregister Service Worker in development to prevent cache issues
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('Unregistered service worker for development');
    });
  });
}

// Force cache-busting in development to ensure fresh builds
if (import.meta.env.DEV && 'caches' in window) {
  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => {
      caches.delete(cacheName);
      console.log('Cleared cache:', cacheName);
    });
  });
}

// Build ID for verification that new code is running
const BUILD_ID = 'build-20250917-trucknav-enhanced';
console.log('TruckNav Pro BUILD_ID:', BUILD_ID);
if (import.meta.env.DEV && document) {
  const buildMarker = document.createElement('meta');
  buildMarker.name = 'trucknav-build-id';
  buildMarker.content = BUILD_ID;
  document.head.appendChild(buildMarker);
}

// Initialize CSRF token before rendering
initializeCSRF().then(() => {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}).catch(error => {
  console.error("Failed to initialize app:", error);
  // Render app anyway in case of CSRF initialization failure
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  );
});
