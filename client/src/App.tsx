import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { MeasurementProvider } from "@/components/measurement/measurement-provider";
import NavigationPage from "@/pages/navigation";
import LaneSelectionPage from "@/pages/lane-selection";
import MapWindow from "@/pages/map-window";
import LegalPopupPage from "@/pages/legal-popup";
import NotFound from "@/pages/not-found";
import LegalNotices from "@/components/legal/legal-notices";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Switch>
          <Route path="/" component={NavigationPage} />
          <Route path="/lane-selection/:id" component={LaneSelectionPage} />
          <Route path="/lane-selection" component={LaneSelectionPage} />
          <Route path="/lanes/:routeId" component={LaneSelectionPage} />
          <Route path="/map-window" component={MapWindow} />
          <Route path="/legal-popup" component={LegalPopupPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <LegalNotices />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="auto" storageKey="theme-mode">
        <MeasurementProvider>
          <TooltipProvider>
            <Toaster />
            {/* Main Application - Legal access via button only */}
            <Router />
          </TooltipProvider>
        </MeasurementProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
