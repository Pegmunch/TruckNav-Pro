import { useEffect, useRef, useCallback } from 'react';
import type { RouteIncident } from './use-route-incidents';
import { navigationVoice } from '@/lib/navigation-voice';
import { getAlertSoundsService } from '@/lib/alert-sounds';

interface GPSPosition {
  latitude: number;
  longitude: number;
  speed?: number | null;
  accuracy?: number | null;
}

const ALERT_THRESHOLDS_M = [500, 300, 100] as const;
type Threshold = typeof ALERT_THRESHOLDS_M[number];

function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useSpeedCameraAlerts(
  incidents: RouteIncident[],
  gpsPosition: GPSPosition | null | undefined,
  isNavigating: boolean,
  isMuted: boolean
) {
  const alertedRef = useRef<Map<string, Set<Threshold>>>(new Map());
  const lastCheckRef = useRef<number>(0);

  const speedCameras = incidents.filter(i => i.type === 'speed_camera');

  const checkProximity = useCallback(() => {
    if (!isNavigating || isMuted || !gpsPosition) return;
    if (!gpsPosition.latitude || !gpsPosition.longitude) return;

    const now = Date.now();
    if (now - lastCheckRef.current < 2000) return;
    lastCheckRef.current = now;

    for (const camera of speedCameras) {
      const distM = haversineMeters(
        gpsPosition.latitude,
        gpsPosition.longitude,
        camera.coordinates.lat,
        camera.coordinates.lng
      );

      if (distM > ALERT_THRESHOLDS_M[0] + 100) {
        alertedRef.current.delete(camera.id);
        continue;
      }

      if (!alertedRef.current.has(camera.id)) {
        alertedRef.current.set(camera.id, new Set());
      }
      const fired = alertedRef.current.get(camera.id)!;

      for (const threshold of ALERT_THRESHOLDS_M) {
        if (distM <= threshold && !fired.has(threshold)) {
          fired.add(threshold);

          navigationVoice.announceSpeedCamera(distM);

          getAlertSoundsService().playAlert('speedLimit', true);

          console.log(`[SPEED-CAMERA] 📷 Alert at ${Math.round(distM)}m for camera ${camera.id} (threshold ${threshold}m)`);
          break;
        }
      }
    }
  }, [isNavigating, isMuted, gpsPosition, speedCameras]);

  useEffect(() => {
    checkProximity();
  }, [checkProximity, gpsPosition?.latitude, gpsPosition?.longitude]);

  useEffect(() => {
    if (!isNavigating) {
      alertedRef.current.clear();
    }
  }, [isNavigating]);

  return { speedCameraCount: speedCameras.length };
}
