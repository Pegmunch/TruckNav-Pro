import { useState } from "react";

export function useMapEngine() {
  const [engine, setEngine] = useState<"maplibre" | "interactive">("maplibre");
  return { engine, setEngine };
}
