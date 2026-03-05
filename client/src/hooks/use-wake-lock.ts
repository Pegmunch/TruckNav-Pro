import { useEffect } from "react";

export function useWakeLock() {
  useEffect(() => {
    let wakeLock: any = null;
    const request = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (e) {}
    };
    request();
    return () => { if (wakeLock) wakeLock.release(); };
  }, []);
}
