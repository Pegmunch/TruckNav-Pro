import { useState } from "react";

export function useTrafficState() {
  const [trafficEnabled, setTrafficEnabled] = useState(false);
  return { trafficEnabled, setTrafficEnabled };
}
