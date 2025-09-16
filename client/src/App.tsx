import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavigationPage from "@/pages/navigation";
import NotFound from "@/pages/not-found";
import UserAgreement from "@/components/legal/user-agreement";
import LegalNotices from "@/components/legal/legal-notices";

function Router({ hasAcceptedTerms }: { hasAcceptedTerms: boolean }) {
  if (!hasAcceptedTerms) {
    return null; // Don't render routes until terms are accepted
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Switch>
          <Route path="/" component={NavigationPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <LegalNotices />
    </div>
  );
}

function App() {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [showUserAgreement, setShowUserAgreement] = useState(false);

  useEffect(() => {
    // Check if user has already accepted terms
    const accepted = localStorage.getItem('trucknav_terms_accepted');
    if (accepted) {
      try {
        const acceptedData = JSON.parse(accepted);
        if (acceptedData.accepted && acceptedData.timestamp) {
          setHasAcceptedTerms(true);
        } else {
          setShowUserAgreement(true);
        }
      } catch {
        setShowUserAgreement(true);
      }
    } else {
      setShowUserAgreement(true);
    }
  }, []);

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
      <TooltipProvider>
        <Toaster />
        
        {/* User Agreement Modal */}
        <UserAgreement 
          isOpen={showUserAgreement}
          onAccept={handleAcceptTerms}
          onDecline={handleDeclineTerms}
        />
        
        {/* Main Application */}
        <Router hasAcceptedTerms={hasAcceptedTerms} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
