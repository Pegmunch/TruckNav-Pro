import { useState } from "react";

export function useLegalConsent() {
  const [hasConsented, setHasConsented] = useState(true);
  return { hasConsented, setHasConsented };
}
