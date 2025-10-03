import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useLegalConsent } from "./use-legal-consent";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { hasAcceptedTerms, syncConsentToServer } = useLegalConsent();
  const previousAuthState = useRef<boolean>(false);
  const hasSyncedConsent = useRef<boolean>(false);

  const isAuthenticated = !!user;

  // Sync consent to server when user becomes authenticated
  useEffect(() => {
    const wasUnauthenticated = !previousAuthState.current;
    const isNowAuthenticated = isAuthenticated;
    const hasConsentInLocalStorage = hasAcceptedTerms;

    // Only sync once when transitioning from unauthenticated to authenticated
    if (
      wasUnauthenticated &&
      isNowAuthenticated &&
      hasConsentInLocalStorage &&
      !hasSyncedConsent.current &&
      !isLoading
    ) {
      console.log('User authenticated - syncing consent to server...');
      syncConsentToServer()
        .then(() => {
          console.log('Consent successfully synced to server');
          hasSyncedConsent.current = true;
        })
        .catch((error) => {
          console.error('Failed to sync consent to server:', error);
        });
    }

    // Update previous auth state
    previousAuthState.current = isAuthenticated;
  }, [isAuthenticated, hasAcceptedTerms, syncConsentToServer, isLoading]);

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}
