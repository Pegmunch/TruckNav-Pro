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
import NotFound from "@/pages/not-found";
import UserAgreement from "@/components/legal/user-agreement";
import LegalDisclaimerModal from "@/components/legal/legal-disclaimer-modal";
import LegalNotices from "@/components/legal/legal-notices";

function Router({ hasAcceptedAllLegal }: { hasAcceptedAllLegal: boolean }) {
  if (!hasAcceptedAllLegal) {
    return null; // Don't render routes until all legal requirements are accepted
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Switch>
          <Route path="/" component={NavigationPage} />
          <Route path="/lane-selection/:id" component={LaneSelectionPage} />
          <Route path="/lane-selection" component={LaneSelectionPage} />
          <Route path="/lanes/:routeId" component={LaneSelectionPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <LegalNotices />
    </div>
  );
}

function App() {
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showUserAgreement, setShowUserAgreement] = useState(false);

  const hasAcceptedAllLegal = hasAcceptedDisclaimer && hasAcceptedTerms;

  useEffect(() => {
    // Check if user has already accepted legal disclaimer
    const disclaimerAccepted = localStorage.getItem('trucknav_disclaimer_accepted');
    let hasDisclaimer = false;
    
    if (disclaimerAccepted) {
      try {
        const disclaimerData = JSON.parse(disclaimerAccepted);
        if (disclaimerData.accepted && disclaimerData.timestamp) {
          setHasAcceptedDisclaimer(true);
          hasDisclaimer = true;
        }
      } catch {
        // Invalid data, show disclaimer
      }
    }
    
    // Check if user has already accepted terms
    const termsAccepted = localStorage.getItem('trucknav_terms_accepted');
    let hasTerms = false;
    
    if (termsAccepted) {
      try {
        const termsData = JSON.parse(termsAccepted);
        if (termsData.accepted && termsData.timestamp) {
          setHasAcceptedTerms(true);
          hasTerms = true;
        }
      } catch {
        // Invalid data, show terms
      }
    }
    
    // Show appropriate modal based on what's missing
    if (!hasDisclaimer) {
      setShowDisclaimerModal(true);
    } else if (!hasTerms) {
      setShowUserAgreement(true);
    }
  }, []);

  const handleAcceptDisclaimer = () => {
    setHasAcceptedDisclaimer(true);
    setShowDisclaimerModal(false);
    
    // Check if terms still need to be accepted
    const termsAccepted = localStorage.getItem('trucknav_terms_accepted');
    if (!termsAccepted) {
      setShowUserAgreement(true);
    }
  };

  const handleDeclineDisclaimer = () => {
    setHasAcceptedDisclaimer(false);
    setShowDisclaimerModal(true);
    // Show a message or redirect as needed
    alert("You must accept the legal disclaimers to use TruckNav Pro truck navigation service.");
  };

  const handleAcceptTerms = () => {
    setHasAcceptedTerms(true);
    setShowUserAgreement(false);
  };

  const handleDeclineTerms = () => {
    setHasAcceptedTerms(false);
    setShowUserAgreement(true);
    // Show a message or redirect as needed
    alert("You must accept the legal terms to use TruckNav Pro. The application contains patented technology owned by Bespoke Marketing.Ai Ltd.");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="auto" storageKey="theme-mode">
        <MeasurementProvider>
          <TooltipProvider>
            <Toaster />
            
            {/* Legal Disclaimer Modal */}
            <LegalDisclaimerModal 
              isOpen={showDisclaimerModal}
              onAccept={handleAcceptDisclaimer}
              onDecline={handleDeclineDisclaimer}
            />
            
            {/* User Agreement Modal */}
            <UserAgreement 
              isOpen={showUserAgreement}
              onAccept={handleAcceptTerms}
              onDecline={handleDeclineTerms}
            />
            
            {/* Main Application */}
            <Router hasAcceptedAllLegal={hasAcceptedAllLegal} />
          </TooltipProvider>
        </MeasurementProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
