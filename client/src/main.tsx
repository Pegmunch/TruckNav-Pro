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

// Register Service Worker for PWA functionality 
// TruckNav Pro - Patent-protected by Bespoke Marketing.Ai Ltd
// Disabled in development to prevent caching interference with debugging
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

// Note: Service Worker now enabled in development for PWA testing
// To disable SW in dev, change the condition above to import.meta.env.PROD only

// Cache clearing disabled for debugging

// Build ID for verification that new code is running
const BUILD_ID = 'build-20250917-trucknav-enhanced';
console.log('TruckNav Pro BUILD_ID:', BUILD_ID);
if (import.meta.env.DEV && document) {
  const buildMarker = document.createElement('meta');
  buildMarker.name = 'trucknav-build-id';
  buildMarker.content = BUILD_ID;
  document.head.appendChild(buildMarker);
}

// Test: Add visible fallback content first
const rootElement = document.getElementById("root");
if (rootElement) {
  rootElement.innerHTML = '<div style="padding: 20px; background: red; color: white; font-size: 24px;">TESTING: Can you see this red text? If yes, React rendering is the issue.</div>';
}

// Initialize CSRF token in background (don't wait for it)
initializeCSRF();

// Try rendering after a delay to see if it's a timing issue
setTimeout(() => {
  try {
    createRoot(document.getElementById("root")!).render(
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("React render failed:", error);
    if (rootElement) {
      rootElement.innerHTML = `<div style="padding: 20px; background: orange; color: black;">ERROR: React failed to render - ${error.message}</div>`;
    }
  }
}, 1000);
