import React, { createContext, useContext } from "react";
const OnboardingContext = createContext({ isReady: true, isFleetPage: false });
export function OnboardingProvider({ children, isReady, isFleetPage }: { children: React.ReactNode; isReady: boolean; isFleetPage: boolean }) {
  return <OnboardingContext.Provider value={{ isReady, isFleetPage }}>{children}</OnboardingContext.Provider>;
}
export function useOnboarding() { return useContext(OnboardingContext); }
