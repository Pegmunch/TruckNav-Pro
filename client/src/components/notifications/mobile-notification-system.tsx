import React, { createContext, useContext, useState, useCallback } from "react";

export interface MobileNotificationData {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success" | "traffic" | "speed" | "incident";
  timestamp: number;
  duration?: number;
  icon?: string;
  action?: { label: string; onClick: () => void };
}

interface NotificationSystemContextType {
  notifications: MobileNotificationData[];
  addNotification: (n: Omit<MobileNotificationData, "id" | "timestamp">) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationSystemContext = createContext<NotificationSystemContextType>({
  notifications: [],
  addNotification: () => {},
  removeNotification: () => {},
  clearAll: () => {},
});

export function MobileNotificationSystemProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<MobileNotificationData[]>([]);
  const addNotification = useCallback((n: Omit<MobileNotificationData, "id" | "timestamp">) => {
    const notification: MobileNotificationData = { ...n, id: Math.random().toString(36).slice(2), timestamp: Date.now() };
    setNotifications(prev => [notification, ...prev].slice(0, 10));
    if (n.duration) { setTimeout(() => removeNotification(notification.id), n.duration); }
  }, []);
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  const clearAll = useCallback(() => setNotifications([]), []);
  return (
    <NotificationSystemContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
    </NotificationSystemContext.Provider>
  );
}

export function useMobileNotificationSystem() {
  return useContext(NotificationSystemContext);
}

export function MobileNotificationSystem() {
  return <div />;
}
