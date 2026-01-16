import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, X, Navigation2, ArrowUp, ArrowLeft, ArrowRight, 
  ArrowUpLeft, ArrowUpRight, MapPin, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hapticNavEvent, hapticTurnAlert } from '@/hooks/use-haptic-feedback';

interface ARNavigationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  nextManeuver?: {
    instruction: string;
    distanceMeters: number;
    type: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'u-turn' | 'destination';
  };
  bearing?: number;
  currentSpeed?: number;
  speedLimit?: number;
  distanceToDestination?: number;
  eta?: Date;
}

const MANEUVER_ICONS: Record<string, any> = {
  'straight': ArrowUp,
  'left': ArrowLeft,
  'right': ArrowRight,
  'slight-left': ArrowUpLeft,
  'slight-right': ArrowUpRight,
  'u-turn': ArrowUp,
  'destination': MapPin
};

export function ARNavigationOverlay({
  isOpen,
  onClose,
  nextManeuver,
  bearing = 0,
  currentSpeed = 0,
  speedLimit,
  distanceToDestination,
  eta
}: ARNavigationOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [deviceOrientation, setDeviceOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });

  const startCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported on this device or browser.');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setCameraStream(stream);
      setCameraError(null);
      hapticNavEvent();
    } catch (error) {
      console.error('[AR] Camera access error:', error);
      setCameraError('Camera access denied. Please enable camera permissions in your device settings.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      
      const handleOrientation = (event: DeviceOrientationEvent) => {
        setDeviceOrientation({
          alpha: event.alpha || 0,
          beta: event.beta || 0,
          gamma: event.gamma || 0
        });
      };
      
      const setupOrientation = async () => {
        if (typeof window === 'undefined') return;
        
        if ('DeviceOrientationEvent' in window) {
          const DOE = DeviceOrientationEvent as any;
          if (typeof DOE.requestPermission === 'function') {
            try {
              const permission = await DOE.requestPermission();
              if (permission === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
              }
            } catch (e) {
              console.warn('[AR] Orientation permission denied');
            }
          } else {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        }
      };
      
      setupOrientation();
      
      return () => {
        stopCamera();
        if (typeof window !== 'undefined') {
          window.removeEventListener('deviceorientation', handleOrientation);
        }
      };
    } else {
      stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  useEffect(() => {
    if (nextManeuver && nextManeuver.distanceMeters < 100) {
      hapticTurnAlert();
    }
  }, [nextManeuver?.distanceMeters]);

  if (!isOpen) return null;

  const ManeuverIcon = nextManeuver ? MANEUVER_ICONS[nextManeuver.type] || ArrowUp : ArrowUp;
  const isOverSpeed = speedLimit && currentSpeed > speedLimit;

  return (
    <div className="fixed inset-0 z-[3000] bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />
      
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            transform: `translate(-50%, -50%) rotate(${-deviceOrientation.gamma}deg)`
          }}
        >
          <div className="relative">
            <Navigation2 
              className="h-16 w-16 text-blue-500 drop-shadow-lg"
              style={{ 
                transform: `rotate(${bearing}deg)`,
                filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))'
              }}
            />
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full" />
          </div>
        </div>
        
        {nextManeuver && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-md rounded-2xl p-4 min-w-[250px]">
            <div className="flex items-center gap-4">
              <div className={`
                p-3 rounded-xl
                ${nextManeuver.distanceMeters < 100 ? 'bg-orange-500 animate-pulse' : 'bg-blue-500'}
              `}>
                <ManeuverIcon className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-white text-2xl font-bold">
                  {nextManeuver.distanceMeters < 1000 
                    ? `${Math.round(nextManeuver.distanceMeters)} m`
                    : `${(nextManeuver.distanceMeters / 1000).toFixed(1)} km`
                  }
                </div>
                <div className="text-white/80 text-sm line-clamp-2">
                  {nextManeuver.instruction}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="absolute bottom-20 left-4 right-4 flex justify-between items-end">
          <div className="bg-black/80 backdrop-blur-md rounded-xl p-3">
            <div className={`
              text-4xl font-bold
              ${isOverSpeed ? 'text-red-500 animate-pulse' : 'text-white'}
            `}>
              {Math.round(currentSpeed)}
              <span className="text-lg ml-1">mph</span>
            </div>
            {speedLimit && (
              <div className="flex items-center gap-1 mt-1">
                <div className="w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{speedLimit}</span>
                </div>
                <span className="text-white/60 text-xs">limit</span>
              </div>
            )}
          </div>
          
          <div className="bg-black/80 backdrop-blur-md rounded-xl p-3 text-right">
            {distanceToDestination !== undefined && (
              <div className="text-white text-lg font-semibold">
                {distanceToDestination.toFixed(1)} mi
              </div>
            )}
            {eta && (
              <div className="text-white/80 text-sm">
                ETA {eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
        
        {isOverSpeed && (
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 bg-red-500/90 backdrop-blur-sm rounded-xl px-6 py-3 animate-bounce">
            <div className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-6 w-6" />
              <span className="font-bold text-lg">SLOW DOWN</span>
            </div>
          </div>
        )}
      </div>
      
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center p-6">
            <Camera className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className="text-white mb-4">{cameraError}</p>
            <Button onClick={startCamera}>
              Try Again
            </Button>
          </div>
        </div>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 h-12 w-12 bg-black/50 hover:bg-black/70 text-white rounded-full z-10 pointer-events-auto"
      >
        <X className="h-6 w-6" />
      </Button>
      
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-auto">
        <Button
          onClick={onClose}
          className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm px-6"
        >
          Back to Map
        </Button>
      </div>
    </div>
  );
}
