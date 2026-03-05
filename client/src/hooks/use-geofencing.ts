import { useState } from "react";
export interface Geofence { id: string; lat: number; lon: number; radius: number; name: string; }
export function useGeofencing() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const addGeofence = (g: Geofence) => setGeofences(prev => [...prev, g]);
  const removeGeofence = (id: string) => setGeofences(prev => prev.filter(g => g.id !== id));
  return { geofences, addGeofence, removeGeofence };
}
