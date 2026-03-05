import React from "react";

interface NavigationSidebarProps {
  className?: string;
}

export default function NavigationSidebar({ className }: NavigationSidebarProps) {
  return <div className={className} />;
}
