import { useState } from "react";

export function useDestinationHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const addDestination = (dest: string) => setHistory(prev => [dest, ...prev].slice(0, 10));
  return { history, addDestination };
}
