import { useState } from "react";

export function useSpeedCameraAlerts() {
  const [alert, setAlert] = useState<string | null>(null);
  return { alert, setAlert };
}
