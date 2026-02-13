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

function retryImport(
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  retriesLeft: number
): Promise<{ default: React.ComponentType<any> }> {
  return importFn().catch((error: any) => {
    if (retriesLeft <= 0) {
      window.location.reload();
      throw error;
    }
    return new Promise<void>((resolve) => setTimeout(resolve, 1000)).then(() =>
      retryImport(importFn, retriesLeft - 1)
    );
  });
}

function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType<any> }>): React.LazyExoticComponent<React.ComponentType<any>> {
  return lazy(() => retryImport(importFn, 3));
}

const NavigationPage = lazyWithRetry(() => import("@/pages/navigation"));
const LaneSelectionPage = lazyWithRetry(() => import("@/pages/lane-selection"));
const MapWindow = lazyWithRetry(() => import("@/pages/map-window"));
const LegalPopupPage = lazyWithRetry(() => import("@/pages/legal-popup"));
const NotFound = lazyWithRetry(() => import("@/pages/not-found"));
const RouteWindow = lazyWithRetry(() => import("@/pages/window-route"));
const VehicleWindow = lazyWithRetry(() => import("@/pages/window-vehicle"));
const EntertainmentWindow = lazyWithRetry(() => import("@/pages/window-entertainment"));
const ThemesWindow = lazyWithRetry(() => import("@/pages/window-themes"));
const HistoryWindow = lazyWithRetry(() => import("@/pages/window-history"));
const SettingsWindow = lazyWithRetry(() => import("@/pages/window-settings"));
const PricingPage = lazyWithRetry(() => import("@/pages/pricing"));
const SubscribePage = lazyWithRetry(() => import("@/pages/subscribe"));
const FleetManagement = lazyWithRetry(() => import("@/pages/fleet-management"));
const SocialNetworkPage = lazyWithRetry(() => import("@/pages/social-network").then(m => ({ default: m.SocialNetworkPage })));
const ConnectStore = lazyWithRetry(() => import("@/pages/connect-store"));
const ConnectSuccess = lazyWithRetry(() => import("@/pages/connect-success"));
const ConnectDashboard = lazyWithRetry(() => import("@/pages/connect-dashboard"));
const FeaturesPage = lazyWithRetry(() => import("@/pages/features"));

function LoadingFallback() {
  // Return null to prevent any loading spinners from showing
  return null;
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
            <Route path="/" component={LegalPopupPage} />
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
            <Route path="/features" component={FeaturesPage} />
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
