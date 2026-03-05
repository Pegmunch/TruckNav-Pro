import { useState, useEffect } from "react";
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setCanInstall(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const install = async () => { if (deferredPrompt) { deferredPrompt.prompt(); setCanInstall(false); } };
  return { canInstall, install };
}
