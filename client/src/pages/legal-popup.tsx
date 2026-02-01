import { useEffect } from "react";
import { useLocation } from "wouter";
import LegalDisclaimerSimple from "@/components/legal/legal-disclaimer-simple";
import { useLegalConsent } from "@/hooks/use-legal-consent";

/**
 * Legal Popup Page
 * First page users see - shows legal disclaimer
 * Redirects to navigation if user has already accepted terms
 */
export default function LegalPopupPage() {
  const [, setLocation] = useLocation();
  const { hasAcceptedTerms, isLoading } = useLegalConsent();

  useEffect(() => {
    // Set document title for popup window
    document.title = "Legal Disclaimer - TruckNav Pro";
    
    // Add popup-specific styles
    document.body.classList.add('popup-window');
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('popup-window');
    };
  }, []);

  // Redirect to navigation if user has already accepted terms
  useEffect(() => {
    if (!isLoading && hasAcceptedTerms) {
      setLocation('/navigation');
    }
  }, [hasAcceptedTerms, isLoading, setLocation]);

  // Show nothing while checking consent status
  if (isLoading) {
    return null;
  }

  // If already accepted, don't render (redirect will happen)
  if (hasAcceptedTerms) {
    return null;
  }

  return (
    <LegalDisclaimerSimple />
  );
}