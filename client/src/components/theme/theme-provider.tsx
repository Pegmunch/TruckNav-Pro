import React, { createContext, useContext, useState } from "react";
const ThemeContext = createContext({ theme: "dark", setTheme: (_: string) => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("dark");
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
