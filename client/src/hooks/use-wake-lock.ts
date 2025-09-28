import { useEffect, useRef, useCallback } from 'react';

interface WakeLockSentinel {
  readonly type: 'screen';
  readonly released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', listener: (event: Event) => void): void;
  removeEventListener(type: 'release', listener: (event: Event) => void): void;
}

interface Navigator {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  };
}

/**
 * Custom hook for managing screen wake lock during navigation
 * Prevents screen from turning off during truck navigation
 * Includes fallbacks for iOS Safari and older browsers
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isActiveRef = useRef(false);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Wake Lock API is supported
  const isSupported = 'wakeLock' in navigator;

  const requestWakeLock = useCallback(async () => {
    if (!isActiveRef.current) return;

    try {
      if (isSupported) {
        // Use native Wake Lock API
        wakeLockRef.current = await (navigator as Navigator).wakeLock!.request('screen');
        
        // Listen for wake lock release
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Screen wake lock released');
          wakeLockRef.current = null;
          
          // Try to re-acquire if still needed
          if (isActiveRef.current) {
            setTimeout(requestWakeLock, 1000);
          }
        });
        
        console.log('Screen wake lock acquired - screen will stay on during navigation');
      } else {
        // Fallback for iOS Safari and older browsers
        startFallbackWakeLock();
      }
    } catch (error) {
      console.warn('Failed to acquire wake lock, using fallback method:', error);
      startFallbackWakeLock();
    }
  }, [isSupported]);

  const startFallbackWakeLock = useCallback(() => {
    // iOS Safari and fallback method: Keep screen active with periodic video element manipulation
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
    }

    // Create invisible video element to prevent screen sleep
    let video: HTMLVideoElement | null = null;
    
    const createWakeLockVideo = () => {
      if (video) return;
      
      video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.style.position = 'fixed';
      video.style.top = '-1px';
      video.style.left = '-1px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.01';
      video.style.pointerEvents = 'none';
      video.style.zIndex = '-1000';
      
      // Create minimal video blob
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const stream = canvas.captureStream(1);
      video.srcObject = stream;
      
      document.body.appendChild(video);
      
      video.play().catch(() => {
        // Silently handle play failures
      });
    };

    const cleanupWakeLockVideo = () => {
      if (video && video.parentNode) {
        video.pause();
        video.srcObject = null;
        video.parentNode.removeChild(video);
        video = null;
      }
    };

    // For iOS Safari, also use periodic screen interaction simulation
    fallbackIntervalRef.current = setInterval(() => {
      if (!isActiveRef.current) {
        cleanupWakeLockVideo();
        return;
      }

      // Ensure video is still playing
      createWakeLockVideo();
      
      // Additional iOS Safari wake technique: dispatch touch events
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        const touchEvent = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: []
        });
        document.body.dispatchEvent(touchEvent);
      }
    }, 15000); // Every 15 seconds

    createWakeLockVideo();
    console.log('Fallback wake lock activated - using video element method');
  }, []);

  const releaseWakeLock = useCallback(async () => {
    isActiveRef.current = false;
    
    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Screen wake lock released');
      }
    } catch (error) {
      console.warn('Error releasing wake lock:', error);
    }

    // Clear fallback interval
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }

    // Clean up any fallback video elements
    const videos = document.querySelectorAll('video[style*="opacity: 0.01"]');
    videos.forEach(video => {
      if (video.parentNode) {
        (video as HTMLVideoElement).pause();
        (video as HTMLVideoElement).srcObject = null;
        video.parentNode.removeChild(video);
      }
    });
  }, []);

  const acquireWakeLock = useCallback(() => {
    isActiveRef.current = true;
    requestWakeLock();
  }, [requestWakeLock]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActiveRef.current) {
        // Re-acquire wake lock when page becomes visible
        setTimeout(requestWakeLock, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    isSupported,
    isActive: isActiveRef.current,
    acquire: acquireWakeLock,
    release: releaseWakeLock
  };
}