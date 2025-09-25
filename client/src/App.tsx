import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { MeasurementProvider } from "@/components/measurement/measurement-provider";
import { OfflineDetector } from "@/components/offline/offline-detector";
import { ServiceWorkerUpdates } from "@/components/offline/service-worker-updates";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";
import NavigationPage from "@/pages/navigation";
import LaneSelectionPage from "@/pages/lane-selection";
import MapWindow from "@/pages/map-window";
import LegalPopupPage from "@/pages/legal-popup";
import NotFound from "@/pages/not-found";
import RouteWindow from "@/pages/window-route";
import VehicleWindow from "@/pages/window-vehicle";
import EntertainmentWindow from "@/pages/window-entertainment";
import ThemesWindow from "@/pages/window-themes";
import HistoryWindow from "@/pages/window-history";
import SettingsWindow from "@/pages/window-settings";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Switch>
          <Route path="/" component={NavigationPage} />
          <Route path="/navigation" component={NavigationPage} />
          <Route path="/lane-selection/:id" component={LaneSelectionPage} />
          <Route path="/lane-selection" component={LaneSelectionPage} />
          <Route path="/lanes/:routeId" component={LaneSelectionPage} />
          <Route path="/map-window" component={MapWindow} />
          <Route path="/legal-popup" component={LegalPopupPage} />
          <Route path="/window/route" component={RouteWindow} />
          <Route path="/window/vehicle" component={VehicleWindow} />
          <Route path="/window/entertainment" component={EntertainmentWindow} />
          <Route path="/window/themes" component={ThemesWindow} />
          <Route path="/window/history" component={HistoryWindow} />
          <Route path="/window/settings" component={SettingsWindow} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="auto" storageKey="theme-mode">
      <MeasurementProvider>
        <TooltipProvider>
          <OfflineDetector showPersistentIndicator={true}>
            <Toaster />
            <ServiceWorkerUpdates />
            <PWAInstallPrompt showBadge={true} />
            {/* Main Application with PWA and Offline Support */}
            <Router />
          </OfflineDetector>
        </TooltipProvider>
      </MeasurementProvider>
    </ThemeProvider>
  );
}

export default App;
