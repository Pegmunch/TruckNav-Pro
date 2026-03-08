import { useCallback, useRef } from "react";
export function useWakeLock() {
  const wakeLockRef = useRef<any>(null);
  const acquire = useCallback(async () => {
    try { if ("wakeLock" in navigator) { wakeLockRef.current = await (navigator as any).wakeLock.request("screen"); } } catch (e) {}
  }, []);
  const release = useCallback(async () => {
    try { if (wakeLockRef.current) { await wakeLockRef.current.release(); wakeLockRef.current = null; } } catch (e) {}
  }, []);
  return { acquire, release };
}
