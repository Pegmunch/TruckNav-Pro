import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' | 'impact';

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [25, 50, 25],
  error: [50, 100, 50, 100, 50],
  selection: 5,
  impact: 15
};

let hapticEnabled = true;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

function isVibrationSupported(): boolean {
  return isBrowser() && 'vibrate' in navigator && typeof navigator.vibrate === 'function';
}

export function setHapticEnabled(enabled: boolean) {
  hapticEnabled = enabled;
  if (isBrowser()) {
    try {
      localStorage.setItem('trucknav_haptic_enabled', String(enabled));
    } catch (e) {
    }
  }
}

export function getHapticEnabled(): boolean {
  if (isBrowser()) {
    try {
      const stored = localStorage.getItem('trucknav_haptic_enabled');
      if (stored !== null) {
        hapticEnabled = stored === 'true';
      }
    } catch (e) {
    }
  }
  return hapticEnabled;
}

export function triggerHaptic(pattern: HapticPattern = 'light'): boolean {
  if (!hapticEnabled || !isVibrationSupported()) return false;
  
  try {
    const vibrationPattern = HAPTIC_PATTERNS[pattern];
    navigator.vibrate(vibrationPattern);
    return true;
  } catch (e) {
    return false;
  }
}

export function useHapticFeedback() {
  const vibrate = useCallback((pattern: HapticPattern = 'light') => {
    return triggerHaptic(pattern);
  }, []);

  const lightTap = useCallback(() => vibrate('light'), [vibrate]);
  const mediumTap = useCallback(() => vibrate('medium'), [vibrate]);
  const heavyTap = useCallback(() => vibrate('heavy'), [vibrate]);
  const success = useCallback(() => vibrate('success'), [vibrate]);
  const warning = useCallback(() => vibrate('warning'), [vibrate]);
  const error = useCallback(() => vibrate('error'), [vibrate]);
  const selection = useCallback(() => vibrate('selection'), [vibrate]);
  const impact = useCallback(() => vibrate('impact'), [vibrate]);

  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    warning,
    error,
    selection,
    impact,
    isSupported,
    isEnabled: hapticEnabled,
    setEnabled: setHapticEnabled
  };
}

export function hapticButtonPress() {
  triggerHaptic('light');
}

export function hapticNavEvent() {
  triggerHaptic('medium');
}

export function hapticTurnAlert() {
  triggerHaptic('warning');
}

export function hapticArrival() {
  triggerHaptic('success');
}

export function hapticSpeedWarning() {
  triggerHaptic('error');
}
