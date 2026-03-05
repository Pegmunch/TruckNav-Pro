import { useState } from "react";
export function useDriverFatigue() {
  const [fatigueLevel, setFatigueLevel] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  return { fatigueLevel, setFatigueLevel, showAlert, setShowAlert };
}
