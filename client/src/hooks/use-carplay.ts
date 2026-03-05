import { useState } from "react";
export function useCarPlay() {
  const [isConnected, setIsConnected] = useState(false);
  return { isConnected, setIsConnected };
}
