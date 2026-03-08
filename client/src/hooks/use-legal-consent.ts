import { useState } from "react";
export function useLegalConsent() {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(true);
  return { hasConsented: hasAcceptedTerms, hasAcceptedTerms, setHasConsented: () => setHasAcceptedTerms(true), setConsentAccepted: async () => setHasAcceptedTerms(true), isLoading: false };
}
