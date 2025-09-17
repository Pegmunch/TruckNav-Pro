import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import App from "./App";
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
if ('serviceWorker' in navigator) {
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

// Initialize CSRF token before rendering
initializeCSRF().then(() => {
  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}).catch(error => {
  console.error("Failed to initialize app:", error);
  // Render app anyway in case of CSRF initialization failure
  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
});
