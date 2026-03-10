import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Camera, 
  CameraOff, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  RotateCcw,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

interface ARNavigationProps {
  isActive: boolean;
  onToggleAR: () => void;
  currentDirection?: {
    instruction: string;
    distance: string;
    turnDirection: 'left' | 'right' | 'straight' | 'u-turn';
  };
  route?: {
    totalDistance: string;
    estimatedTime: string;
    nextTurn?: string;
  };
}

interface DeviceOrientation {
  alpha: number | null; // Z axis - compass direction
  beta: number | null;  // X axis - front/back tilt
  gamma: number | null; // Y axis - left/right tilt
}

export function ARNavigation({ 
  isActive, 
  onToggleAR, 
  currentDirection,
  route 
}: ARNavigationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRenderingRef = useRef(false);
  
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt' | 'loading'>('prompt');
  const [orientation, setOrientation] = useState<DeviceOrientation>({ alpha: null, beta: null, gamma: null });
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [brightness, setBrightness] = useState(100);
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [compassCalibrated, setCompassCalibrated] = useState(false);
  const [headingOffset, setHeadingOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  // Handle device orientation for compass with iOS Safari support
  const handleOrientationChange = useCallback((event: DeviceOrientationEvent) => {
    let compassHeading = event.alpha;
    
    // Prefer webkitCompassHeading on iOS Safari for better accuracy
    if ((event as any).webkitCompassHeading !== undefined) {
      compassHeading = (event as any).webkitCompassHeading;
    }
    
    setOrientation({
      alpha: compassHeading ? compassHeading - headingOffset : null,
      beta: event.beta,
      gamma: event.gamma
    });
  }, [headingOffset]);

  // Request device orientation permission for iOS devices
  const requestOrientationPermission = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientationChange);
        }
      } catch (error) {
        console.warn('Device orientation permission request failed:', error);
      }
    } else {
      // For non-iOS devices
      window.addEventListener('deviceorientation', handleOrientationChange);
    }
  }, [handleOrientationChange]);

  // Initialize camera stream with robust mobile support
  const initializeCamera = useCallback(async () => {
    if (!isActive || !videoRef.current) return;

    try {
      setCameraPermission('loading');
      setNeedsUserGesture(false);
      
      // Try multiple resolutions for compatibility
      const constraintOptions = [
        { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }
      ];
      
      let stream: MediaStream | null = null;
      
      for (const videoConstraints of constraintOptions) {
        try {
          const constraints: MediaStreamConstraints = {
            video: {
              facingMode: 'environment',
              ...videoConstraints
            },
            audio: false
          };
          
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          console.warn('Failed resolution, trying next:', videoConstraints);
        }
      }
      
      if (!stream) {
        throw new Error('No compatible camera resolution found');
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      // Wait for video metadata and attempt play
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current!;
        
        const onLoadedMetadata = async () => {
          try {
            await video.play();
            resolve();
          } catch (playError) {
            console.warn('Video play failed, may need user gesture:', playError);
            setNeedsUserGesture(true);
            resolve(); // Still resolve to continue setup
          }
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
        
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        
        // Timeout fallback
        setTimeout(() => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          resolve();
        }, 5000);
      });
      
      setCameraPermission('granted');
      setIsInitialized(true);
      
      // Request orientation permissions
      await requestOrientationPermission();
      
    } catch (error) {
      console.error('Camera access failed:', error);
      setCameraPermission('denied');
      setIsInitialized(false);
    }
  }, [isActive, requestOrientationPermission]);

  // Stop camera stream and cleanup
  const stopCamera = useCallback(() => {
    // Stop animation loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isRenderingRef.current = false;
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    window.removeEventListener('deviceorientation', handleOrientationChange);
    setIsInitialized(false);
  }, [handleOrientationChange]);

  // Draw AR overlays on canvas with devicePixelRatio support
  const drawAROverlays = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || !overlayVisible || !video.videoWidth || !video.videoHeight) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = video.videoWidth;
    const displayHeight = video.videoHeight;
    
    // Set actual canvas size
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // Scale CSS size
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    // Scale context for crisp rendering
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw direction arrow and instructions
    if (currentDirection) {
      drawDirectionOverlay(ctx, displayWidth, displayHeight, currentDirection);
    }

    // Draw compass if orientation available
    if (orientation.alpha !== null) {
      drawCompass(ctx, displayWidth, displayHeight, orientation.alpha);
    }

    // Draw route information
    if (route) {
      drawRouteInfo(ctx, displayWidth, displayHeight, route);
    }
  }, [currentDirection, route, orientation, overlayVisible]);

  // Draw direction overlay with arrow and instruction
  const drawDirectionOverlay = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    direction: NonNullable<ARNavigationProps['currentDirection']>
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const arrowSize = Math.min(width, height) * 0.15;

    // Set up drawing styles
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = '#3b82f6';
    ctx.lineWidth = 8;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;

    // Draw directional arrow
    ctx.save();
    ctx.translate(centerX, centerY - arrowSize);
    
    switch (direction.turnDirection) {
      case 'left':
        ctx.rotate(-Math.PI / 2);
        break;
      case 'right':
        ctx.rotate(Math.PI / 2);
        break;
      case 'u-turn':
        ctx.rotate(Math.PI);
        break;
      case 'straight':
      default:
        // No rotation for straight
        break;
    }

    // Draw arrow shape
    ctx.beginPath();
    ctx.moveTo(0, -arrowSize / 2);
    ctx.lineTo(-arrowSize / 3, arrowSize / 6);
    ctx.lineTo(-arrowSize / 6, arrowSize / 6);
    ctx.lineTo(-arrowSize / 6, arrowSize / 2);
    ctx.lineTo(arrowSize / 6, arrowSize / 2);
    ctx.lineTo(arrowSize / 6, arrowSize / 6);
    ctx.lineTo(arrowSize / 3, arrowSize / 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();

    // Draw instruction text
    ctx.font = 'bold 32px system-ui';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';

    const instructionY = centerY + arrowSize + 60;
    ctx.strokeText(direction.instruction, centerX, instructionY);
    ctx.fillText(direction.instruction, centerX, instructionY);

    // Draw distance
    ctx.font = 'bold 24px system-ui';
    ctx.fillStyle = '#fbbf24';
    const distanceY = instructionY + 40;
    ctx.strokeText(direction.distance, centerX, distanceY);
    ctx.fillText(direction.distance, centerX, distanceY);
  };

  // Draw compass overlay
  const drawCompass = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    heading: number
  ) => {
    const compassX = width - 100;
    const compassY = 100;
    const radius = 40;

    // Draw compass background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(compassX, compassY, radius + 10, 0, 2 * Math.PI);
    ctx.fill();

    // Draw compass circle
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(compassX, compassY, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw north indicator
    ctx.save();
    ctx.translate(compassX, compassY);
    ctx.rotate((heading * Math.PI) / 180);
    
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -radius + 10);
    ctx.lineTo(-8, -radius + 25);
    ctx.lineTo(8, -radius + 25);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();

    // Draw 'N' label
    ctx.font = 'bold 16px system-ui';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('N', compassX, compassY - radius - 20);
  };

  // Draw route information overlay
  const drawRouteInfo = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    routeInfo: NonNullable<ARNavigationProps['route']>
  ) => {
    const boxX = 20;
    const boxY = 20;
    const boxWidth = 300;
    const boxHeight = 100;

    // Draw semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Draw route information text
    ctx.font = 'bold 20px system-ui';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';

    ctx.fillText('Total Distance:', boxX + 15, boxY + 25);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText(routeInfo.totalDistance, boxX + 160, boxY + 25);

    ctx.fillStyle = 'white';
    ctx.fillText('Estimated Time:', boxX + 15, boxY + 50);
    ctx.fillStyle = '#22c55e';
    ctx.fillText(routeInfo.estimatedTime, boxX + 160, boxY + 50);

    if (routeInfo.nextTurn) {
      ctx.fillStyle = 'white';
      ctx.fillText('Next Turn:', boxX + 15, boxY + 75);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(routeInfo.nextTurn, boxX + 110, boxY + 75);
    }
  };

  // Animation loop for drawing overlays with proper lifecycle management
  useEffect(() => {
    if (!isActive || !isInitialized || !overlayVisible || isPaused) {
      isRenderingRef.current = false;
      return;
    }

    isRenderingRef.current = true;
    
    const animationFrame = () => {
      if (!isRenderingRef.current || isPaused) return;
      
      drawAROverlays();
      animationFrameRef.current = requestAnimationFrame(animationFrame);
    };

    animationFrameRef.current = requestAnimationFrame(animationFrame);
    
    return () => {
      isRenderingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isActive, isInitialized, overlayVisible, isPaused, drawAROverlays]);

  // Handle document visibility for power management
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsPaused(true);
        isRenderingRef.current = false;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        // Release wake lock when hidden
        if (wakeLock) {
          wakeLock.release();
          setWakeLock(null);
        }
      } else if (document.visibilityState === 'visible' && isActive) {
        setIsPaused(false);
        // Request wake lock when visible and active
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, wakeLock]);
  
  // Wake lock for drivers - prevent screen from turning off
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !wakeLock) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        
        lock.addEventListener('release', () => {
          console.log('Wake lock released');
          setWakeLock(null);
        });
      } catch (error) {
        console.warn('Wake lock request failed:', error);
      }
    }
  }, [wakeLock]);

  // Initialize camera when AR is activated
  useEffect(() => {
    if (isActive && !isPaused) {
      initializeCamera();
      requestWakeLock();
    } else {
      stopCamera();
      if (wakeLock) {
        wakeLock.release();
        setWakeLock(null);
      }
    }

    return () => {
      stopCamera();
      if (wakeLock) {
        wakeLock.release();
        setWakeLock(null);
      }
    };
  }, [isActive, isPaused, initializeCamera, stopCamera, requestWakeLock, wakeLock]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Accessibility - Live region for screen readers */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {currentDirection && (
          `Next: ${currentDirection.instruction} in ${currentDirection.distance}`
        )}
        {route && (
          ` Total distance: ${route.totalDistance}, estimated time: ${route.estimatedTime}`
        )}
      </div>
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{
          filter: `brightness(${brightness}%)`,
          transform: 'scaleX(-1)' // Mirror for natural selfie-like experience
        }}
        data-testid="ar-camera-feed"
      />

      {/* AR Overlay Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ display: overlayVisible ? 'block' : 'none' }}
        data-testid="ar-overlay-canvas"
      />

      {/* AR Controls - Top Bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <Card className="bg-black/80 border-white/20 p-3">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-white" />
            <span className="text-white font-medium">AR Navigation</span>
            {cameraPermission === 'granted' && (
              <Badge variant="secondary" className="bg-green-600 text-white">
                Live
              </Badge>
            )}
          </div>
        </Card>

        <div className="flex space-x-2">
          <Button
            size="lg"
            variant="outline"
            className="bg-black/80 border-white/20 text-white hover:bg-white/20 min-h-[48px] min-w-[48px]"
            onClick={() => setOverlayVisible(!overlayVisible)}
            aria-label={overlayVisible ? 'Hide overlays' : 'Show overlays'}
            data-testid="button-toggle-overlay"
          >
            {overlayVisible ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="bg-black/80 border-white/20 text-white hover:bg-white/20 min-h-[48px] min-w-[48px]"
            onClick={onToggleAR}
            aria-label="Exit AR mode"
            data-testid="button-exit-ar"
          >
            <CameraOff className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* AR Controls - Bottom Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <Card className="bg-black/80 border-white/20 p-4">
          <div className="flex justify-between items-center">
            {/* Brightness Control */}
            <div className="flex items-center space-x-3">
              <span className="text-white text-sm">Brightness:</span>
              <input
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-32 h-6"
                style={{ minHeight: '24px' }}
                aria-label={`Brightness ${brightness} percent`}
                data-testid="brightness-slider"
              />
              <span className="text-white text-sm min-w-[45px]">{brightness}%</span>
            </div>

            {/* Status Information */}
            <div className="text-center">
              {cameraPermission === 'loading' && (
                <span className="text-yellow-400">Initializing camera...</span>
              )}
              {cameraPermission === 'denied' && (
                <span className="text-red-400">Camera access denied</span>
              )}
              {orientation.alpha !== null && (
                <span className="text-green-400">
                  Compass: {Math.round(orientation.alpha)}°
                </span>
              )}
            </div>

            {/* Recenter Button */}
            <Button
              size="sm"
              variant="outline"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30 px-4 py-2 min-h-[44px]"
              onClick={() => {
                if (orientation.alpha !== null) {
                  setHeadingOffset(orientation.alpha);
                  setCompassCalibrated(true);
                }
              }}
              aria-label="Calibrate compass"
              data-testid="button-recenter-ar"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Calibrate
            </Button>
          </div>
        </Card>
      </div>

      {/* User Gesture Required State */}
      {needsUserGesture && cameraPermission === 'granted' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
          <Card className="max-w-md p-6 text-center">
            <Camera className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Tap to Start AR</h3>
            <p className="text-muted-foreground mb-4">
              Tap the button below to start the AR camera feed.
            </p>
            <Button 
              onClick={async (e) => {
                console.log('AR_BUTTON_CLICKED');
                const rect = e.currentTarget.getBoundingClientRect();
                console.log(`Click: ${e.clientX},${e.clientY} Button: ${rect.left},${rect.top},${rect.right},${rect.bottom}`);
                if (videoRef.current) {
                  try {
                    await videoRef.current.play();
                    setNeedsUserGesture(false);
                  } catch (err) {
                    console.error('Failed to start video:', err);
                  }
                }
              }} 
              onMouseEnter={(e) => {
                console.log('AR_BUTTON_HOVER');
                const rect = e.currentTarget.getBoundingClientRect();
                console.log(`Mouse: ${e.clientX},${e.clientY} Button: ${rect.left},${rect.top},${rect.right},${rect.bottom}`);
              }}
              className="w-full min-h-[48px] border-2 border-yellow-400"
              data-testid="button-start-ar"
            >
              <Camera className="w-5 h-5 mr-2" />
              Start AR Camera
            </Button>
          </Card>
        </div>
      )}

      {/* Error State */}
      {cameraPermission === 'denied' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
          <Card className="max-w-md p-6 text-center">
            <CameraOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Camera Access Required</h3>
            <p className="text-muted-foreground mb-4">
              AR Navigation needs camera access to overlay directions on the live feed.
            </p>
            <div className="space-y-2">
              <Button onClick={initializeCamera} className="w-full" data-testid="button-retry-camera">
                Try Again
              </Button>
              <Button variant="outline" onClick={onToggleAR} className="w-full" data-testid="button-exit-ar-error">
                Exit AR Mode
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}