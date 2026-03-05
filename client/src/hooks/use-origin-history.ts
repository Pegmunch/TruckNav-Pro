import { useState } from "react";

export function useOriginHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const addOrigin = (origin: string) => setHistory(prev => [origin, ...prev].slice(0, 10));
  return { history, addOrigin };
}
