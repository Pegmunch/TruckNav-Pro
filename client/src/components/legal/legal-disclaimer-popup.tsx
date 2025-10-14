import { useState, useEffect } from "react";
import { useLegalConsent } from "@/hooks/use-legal-consent";
import LegalDisclaimerV1 from "./legal-disclaimer-v1";
import LegalDisclaimerV2 from "./legal-disclaimer-v2";

interface LegalDisclaimerPopupProps {
  // For popup window context
  onClose?: () => void;
}

/**
 * Legal Disclaimer Popup Wrapper Component
 * 
 * This wrapper component handles version selection between v1 and v2 of the legal disclaimer.
 * - v1: Original desktop-oriented two-page version with 6 individual checkboxes, no quick accept
 * - v2: Mobile-optimized version with quick accept button and responsive design
 * 
 * Version selection priority:
 * 1. Query parameter (?legal_version=1 or ?legal_version=2)
 * 2. localStorage setting (legal_disclaimer_version)
 * 3. Default to v2 (mobile-optimized)
 */
export default function LegalDisclaimerPopup({ onClose }: LegalDisclaimerPopupProps) {
  const [version, setVersion] = useState<1 | 2>(2); // Default to v2
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use the centralized legal consent hook to check if already accepted
  const { hasAcceptedTerms, isLoading } = useLegalConsent();
  
  // Initialize version selection on mount
  useEffect(() => {
    // 1. Check query parameter
    const params = new URLSearchParams(window.location.search);
    const queryVersion = params.get('legal_version');
    
    if (queryVersion === '1') {
      setVersion(1);
      // Optionally save preference to localStorage
      localStorage.setItem('legal_disclaimer_version', '1');
      console.log('[LEGAL-DISCLAIMER] Using v1 from query parameter');
      setIsInitialized(true);
      return;
    }
    
    if (queryVersion === '2') {
      setVersion(2);
      // Optionally save preference to localStorage
      localStorage.setItem('legal_disclaimer_version', '2');
      console.log('[LEGAL-DISCLAIMER] Using v2 from query parameter');
      setIsInitialized(true);
      return;
    }
    
    // 2. Check localStorage preference
    const storedVersion = localStorage.getItem('legal_disclaimer_version');
    if (storedVersion === '1') {
      setVersion(1);
      console.log('[LEGAL-DISCLAIMER] Using v1 from localStorage preference');
      setIsInitialized(true);
      return;
    }
    
    if (storedVersion === '2') {
      setVersion(2);
      console.log('[LEGAL-DISCLAIMER] Using v2 from localStorage preference');
      setIsInitialized(true);
      return;
    }
    
    // 3. Default to v2 (mobile-optimized)
    setVersion(2);
    console.log('[LEGAL-DISCLAIMER] Using v2 (default)');
    setIsInitialized(true);
  }, []);
  
  // Handle version switching
  const handleVersionSwitch = () => {
    const newVersion = version === 1 ? 2 : 1;
    setVersion(newVersion as 1 | 2);
    
    // Save preference to localStorage
    localStorage.setItem('legal_disclaimer_version', String(newVersion));
    
    console.log(`[LEGAL-DISCLAIMER] Switched to v${newVersion}`);
    
    // Optionally update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('legal_version', String(newVersion));
    window.history.replaceState({}, '', url.toString());
  };
  
  // If already accepted, don't render the overlay
  if (hasAcceptedTerms && !isLoading) {
    return null;
  }
  
  // Wait for initialization to avoid flashing
  if (!isInitialized) {
    return null;
  }
  
  // Render the appropriate version
  if (version === 1) {
    return (
      <LegalDisclaimerV1
        onClose={onClose}
        onVersionSwitch={handleVersionSwitch}
      />
    );
  }
  
  // Default to v2
  return (
    <LegalDisclaimerV2
      onClose={onClose}
      onVersionSwitch={handleVersionSwitch}
    />
  );
}