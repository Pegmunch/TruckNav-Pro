import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/config";

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

createRoot(document.getElementById("root")!).render(<App />);
