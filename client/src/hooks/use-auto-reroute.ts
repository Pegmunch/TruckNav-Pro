import { useState } from "react";

export function useAutoReroute() {
  const [isRerouting, setIsRerouting] = useState(false);
  return { isRerouting, setIsRerouting };
}
