import { useState } from "react";

export function useActiveVehicleProfile() {
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  return { activeProfile, setActiveProfile };
}
