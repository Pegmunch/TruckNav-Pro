import { useEffect } from "react";
export function useAndroidBackHandlerWithPriority(handler: () => boolean, priority: number = 0) {
  useEffect(() => {
    const handleBack = (e: PopStateEvent) => { if (handler()) { e.preventDefault(); } };
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [handler, priority]);
}
