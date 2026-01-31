import { useState, useEffect, Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/theme/theme-provider";
import { MeasurementProvider } from "@/components/measurement/measurement-provider";
import { GPSProvider } from "@/contexts/gps-context";
import { PWAEnvironmentProvider } from "@/contexts/pwa-environment";
import { OfflineDetector } from "@/components/offline/offline-detector";
import { ServiceWorkerUpdates } from "@/components/offline/service-worker-updates";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";
import { initializeAudioOnInteraction } from "@/lib/audio-bluetooth-init";
import { SubscriptionGate } from "@/components/subscription-gate";

const NavigationPage = lazy(() => import("@/pages/navigation"));
const LaneSelectionPage = lazy(() => import("@/pages/lane-selection"));
const MapWindow = lazy(() => import("@/pages/map-window"));
const LegalPopupPage = lazy(() => import("@/pages/legal-popup"));
const NotFound = lazy(() => import("@/pages/not-found"));
const RouteWindow = lazy(() => import("@/pages/window-route"));
const VehicleWindow = lazy(() => import("@/pages/window-vehicle"));
const EntertainmentWindow = lazy(() => import("@/pages/window-entertainment"));
const ThemesWindow = lazy(() => import("@/pages/window-themes"));
const HistoryWindow = lazy(() => import("@/pages/window-history"));
const SettingsWindow = lazy(() => import("@/pages/window-settings"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const SubscribePage = lazy(() => import("@/pages/subscribe"));
const FleetManagement = lazy(() => import("@/pages/fleet-management"));
const SocialNetworkPage = lazy(() => import("@/pages/social-network").then(m => ({ default: m.SocialNetworkPage })));
const ConnectStore = lazy(() => import("@/pages/connect-store"));
const ConnectSuccess = lazy(() => import("@/pages/connect-success"));
const ConnectDashboard = lazy(() => import("@/pages/connect-dashboard"));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}

function MobileThemeEnforcer() {
  const { currentTheme, setTheme } = useTheme();
  
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && (currentTheme === 'auto' || currentTheme === 'night')) {
      localStorage.setItem('theme-mode', 'day');
      setTheme('day');
      console.log('Mobile device detected - forcing day theme for better visibility');
    }
    
    initializeAudioOnInteraction();
  }, []);
  
  return null;
}

function ProtectedNavigationPage() {
  return (
    <SubscriptionGate requiredTier="navigation">
      <NavigationPage />
    </SubscriptionGate>
  );
}

function ProtectedFleetPage() {
  return (
    <SubscriptionGate requiredTier="fleet">
      <FleetManagement />
    </SubscriptionGate>
  );
}

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Suspense fallback={<LoadingFallback />}>
          <Switch>
            <Route path="/" component={ProtectedNavigationPage} />
            <Route path="/navigation" component={ProtectedNavigationPage} />
            <Route path="/pricing" component={PricingPage} />
            <Route path="/subscribe/:planId" component={SubscribePage} />
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
            <Route path="/fleet-management" component={ProtectedFleetPage} />
            <Route path="/social" component={SocialNetworkPage} />
            <Route path="/connect/store/:accountId" component={ConnectStore} />
            <Route path="/connect/success" component={ConnectSuccess} />
            <Route path="/connect/dashboard" component={ConnectDashboard} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </div>
    </div>
  );
}

function App() {
  return (
    <PWAEnvironmentProvider>
      <ThemeProvider defaultTheme="day" storageKey="theme-mode">
        <MobileThemeEnforcer />
        <GPSProvider 
          enableHighAccuracy={true}
          timeout={30000}
          maximumAge={0}
          enableHeadingSmoothing={true}
        >
          <MeasurementProvider>
            <TooltipProvider>
              <OfflineDetector showPersistentIndicator={true}>
                <Toaster />
                <ServiceWorkerUpdates />
                <PWAInstallPrompt showBadge={true} />
                <Router />
              </OfflineDetector>
            </TooltipProvider>
          </MeasurementProvider>
        </GPSProvider>
      </ThemeProvider>
    </PWAEnvironmentProvider>
  );
}

export default App;
