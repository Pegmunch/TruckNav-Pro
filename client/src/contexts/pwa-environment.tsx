import React, { createContext, useContext, useEffect, useState } from "react";

interface PWAEnvironmentContextType {
  isPWA: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
}

const PWAEnvironmentContext = createContext<PWAEnvironmentContextType>({
  isPWA: false,
  isIOS: false,
  isAndroid: false,
  isStandalone: false,
});

export function PWAEnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<PWAEnvironmentContextType>({
    isPWA: false,
    isIOS: false,
    isAndroid: false,
    isStandalone: false,
  });

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    const isPWA = isStandalone;

    setEnvironment({ isPWA, isIOS, isAndroid, isStandalone });
  }, []);

  return (
    <PWAEnvironmentContext.Provider value={environment}>
      {children}
    </PWAEnvironmentContext.Provider>
  );
}

export function usePWAEnvironment() {
  return useContext(PWAEnvironmentContext);
}
