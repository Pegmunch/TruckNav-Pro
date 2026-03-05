import { useState } from "react";
export function useSubscription() {
  const [isPremium, setIsPremium] = useState(false);
  return { isPremium, setIsPremium };
}
