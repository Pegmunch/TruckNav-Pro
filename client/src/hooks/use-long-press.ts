import { useCallback, useRef } from "react";
export function useLongPress(callback: () => void, delay: number = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useCallback(() => { timer.current = setTimeout(callback, delay); }, [callback, delay]);
  const stop = useCallback(() => { if (timer.current) clearTimeout(timer.current); }, []);
  return { onMouseDown: start, onMouseUp: stop, onMouseLeave: stop, onTouchStart: start, onTouchEnd: stop };
}
