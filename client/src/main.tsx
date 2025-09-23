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

// Initialize CSRF token in background (don't wait for it)
initializeCSRF();

// Debug: Check if React can render at all
console.log('main.tsx: Starting React mount process');
console.log('main.tsx: Root element exists:', !!document.getElementById("root"));

try {
  console.log('main.tsx: Creating root');
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  const root = createRoot(rootElement);
  console.log('main.tsx: Root created successfully');
  
  // Test with minimal content first
  root.render(
    <div style={{padding: '20px', backgroundColor: '#f0f0f0'}}>
      <h1>TruckNav Pro - Test Render</h1>
      <p>If you can see this, React is working!</p>
    </div>
  );
  console.log('main.tsx: Test render completed');
  
  // After a delay, render the full app
  setTimeout(() => {
    console.log('main.tsx: Rendering full app');
    root.render(
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }, 1000);
  
} catch (error) {
  console.error('main.tsx: Failed to render React app:', error);
  // Fallback rendering
  const rootEl = document.getElementById("root");
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="padding: 20px; background: #fee; border: 2px solid #f00; margin: 20px;">
        <h1>TruckNav Pro - Error</h1>
        <p>Failed to initialize React app: ${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
}
