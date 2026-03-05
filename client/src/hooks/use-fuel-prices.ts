import { useState } from "react";
export function useFuelPrices() {
  const [prices, setPrices] = useState<{ station: string; price: number }[]>([]);
  return { prices, setPrices };
}
