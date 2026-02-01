import { useEffect } from "react";
import LegalDisclaimerSimple from "@/components/legal/legal-disclaimer-simple";

/**
 * Legal Popup Page
 * Renders the legal disclaimer in a dedicated popup window
 */
export default function LegalPopupPage() {
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

  return (
    <LegalDisclaimerSimple />
  );
}