import { useState } from "react";

export function useNavigationSession() {
  const [isActive, setIsActive] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  return { isActive, setIsActive, destination, setDestination };
}
