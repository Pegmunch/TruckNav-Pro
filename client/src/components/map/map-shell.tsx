import React from "react";

interface MapShellProps {
  children?: React.ReactNode;
  className?: string;
}

export function MapShell({ children, className }: MapShellProps) {
  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      {children}
    </div>
  );
}
