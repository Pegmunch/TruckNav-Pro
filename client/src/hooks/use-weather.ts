import { useState } from "react";
export function useWeather() {
  const [weather, setWeather] = useState<{ temp: number; description: string } | null>(null);
  return { weather, setWeather };
}
