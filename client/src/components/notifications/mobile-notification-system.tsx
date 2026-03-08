import React, { createContext, useContext, useState, useCallback } from "react";
export interface MobileNotificationData { id: string; title: string; message: string; type: string; timestamp: number; duration?: number; }
const defaultCtx = {
  notifications: [] as MobileNotificationData[], activeNotifications: [] as MobileNotificationData[],
  addNotification: (_n: any) => {}, removeNotification: (_id: string) => {}, dismissNotification: (_id: string) => {},
  clearAll: () => {}, dndState: { enabled: false, allowCritical: true, allowSafety: true, autoEnableOnNavigation: true },
  updateDndState: (_s: any) => {}, voiceEnabled: false, setVoiceEnabled: (_v: boolean) => {},
  queueLength: 0, getNotificationIcon: (_t: string) => null as string | null,
};
const Ctx = createContext(defaultCtx);
export function MobileNotificationSystemProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<MobileNotificationData[]>([]);
  const [dndState, setDndState] = useState(defaultCtx.dndState);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const addNotification = useCallback((n: any) => { setNotifications(p => [{ ...n, id: Math.random().toString(36).slice(2), timestamp: Date.now() }, ...p].slice(0, 10)); }, []);
  const removeNotification = useCallback((id: string) => { setNotifications(p => p.filter(n => n.id !== id)); }, []);
  return <Ctx.Provider value={{ notifications, activeNotifications: notifications, addNotification, removeNotification, dismissNotification: removeNotification, clearAll: () => setNotifications([]), dndState, updateDndState: setDndState, voiceEnabled, setVoiceEnabled, queueLength: notifications.length, getNotificationIcon: () => null }}>{children}</Ctx.Provider>;
}
export function useMobileNotificationSystem(_opts?: any) { return useContext(Ctx); }
export function MobileNotificationSystem() { return <div />; }
