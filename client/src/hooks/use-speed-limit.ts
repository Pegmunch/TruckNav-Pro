import { useState } from "react";
export function useSpeedLimit() {
  const [speedLimit, setSpeedLimit] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const isOverLimit = speedLimit !== null && currentSpeed > speedLimit;
  return { speedLimit, setSpeedLimit, currentSpeed, setCurrentSpeed, isOverLimit };
}
