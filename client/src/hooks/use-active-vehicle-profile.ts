import { useState } from "react";
export function useActiveVehicleProfile() {
  const [activeProfile, setActiveProfile] = useState<any>(null);
  return { activeProfile, activeProfileId: activeProfile?.id || '', isLoading: false, setActiveProfile };
}
