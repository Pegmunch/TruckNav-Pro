import React, { createContext, useContext, useState } from "react";
const MeasurementContext = createContext({ unit: "metric", setUnit: (_: string) => {} });
export function MeasurementProvider({ children }: { children: React.ReactNode }) {
  const [unit, setUnit] = useState("metric");
  return <MeasurementContext.Provider value={{ unit, setUnit }}>{children}</MeasurementContext.Provider>;
}
export function useMeasurement() { return useContext(MeasurementContext); }
