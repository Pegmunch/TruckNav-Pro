import { memo, useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Navigation, 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  RotateCcw,
  Clock,
  Gauge,
  MapPin,
  Route as RouteIcon,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Eye,
  Compass,
  X,
  AlertTriangle,
  Shield
} from "lucide-react";
import { type Route, type VehicleProfile } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useSpeedLimit, isSpeeding, getConfidenceColor, getConfidenceLabel } from "@/hooks/use-speed-limit";
import { useGPS } from "@/contexts/gps-context";

interface ProfessionalNavHUDProps {
  currentRoute: Route | null;
  selectedProfile: VehicleProfile | null;
  isNavigating: boolean;
  currentSpeed?: number;
  currentLocation?: { lat: number; lng: number };
  onToggleVoice?: () => void;
  onToggleFullscreen?: () => void;
  onCancelRoute?: () => void;
  isCancellingRoute?: boolean;
  voiceEnabled?: boolean;
  isFullscreen?: boolean;
}

interface NavigationInstruction {
  instruction: string;
  distance: number;
  direction: 'straight' | 'left' | 'right' | 'slight_left' | 'slight_right' | 'sharp_left' | 'sharp_right' | 'uturn';
  roadName?: string;
  estimatedTime: number;
}

// Professional navigation instructions based on route segments
const generateTurnByTurnInstructions = (route: Route): NavigationInstruction[] => {
  if (!route.routePath || route.routePath.length < 2) return [];
  
  // Simulate realistic turn-by-turn instructions for professional display
  const instructions: NavigationInstruction[] = [
    {
      instruction: "Start your journey",
      distance: 0.1,
      direction: 'straight',
      roadName: "Current Location",
      estimatedTime: 1
    },
    {
      instruction: "Continue straight on A505",
      distance: 2.3,
      direction: 'straight',
      roadName: "A505 Dunstable Road",
      estimatedTime: 5
    },
    {
      instruction: "At the roundabout, take the 2nd exit onto M1",
      distance: 0.4,
      direction: 'straight',
      roadName: "M1 Junction 11",
      estimatedTime: 2
    },
    {
      instruction: "Continue on M1 for 15.2 miles",
      distance: 15.2,
      direction: 'straight',
      roadName: "M1 Motorway",
      estimatedTime: 18
    }
  ];
  
  return instructions;
};

const getDirectionIcon = (direction: NavigationInstruction['direction']) => {
  switch (direction) {
    case 'left':
    case 'sharp_left':
      return <CornerUpLeft className="w-8 h-8 text-blue-400" />;
    case 'right':
    case 'sharp_right':
      return <CornerUpRight className="w-8 h-8 text-blue-400" />;
    case 'slight_left':
      return <CornerUpLeft className="w-8 h-8 text-blue-300" />;
    case 'slight_right':
      return <CornerUpRight className="w-8 h-8 text-blue-300" />;
    case 'uturn':
      return <RotateCcw className="w-8 h-8 text-orange-400" />;
    default:
      return <ArrowUp className="w-8 h-8 text-green-400" />;
  }
};

// Helper function to get road type badge color
const getRoadTypeBadgeColor = (roadType?: string): string => {
  if (!roadType) return 'bg-gray-600/30 text-gray-300 border-gray-500/40';
  
  switch (roadType) {
    case 'motorway':
    case 'motorway_link':
      return 'bg-blue-600/30 text-blue-200 border-blue-500/40';
    case 'trunk':
    case 'trunk_link':
      return 'bg-green-600/30 text-green-200 border-green-500/40';
    case 'primary':
    case 'primary_link':
      return 'bg-green-600/25 text-green-300 border-green-500/35';
    case 'secondary':
      return 'bg-yellow-600/25 text-yellow-300 border-yellow-500/35';
    default:
      return 'bg-gray-600/30 text-gray-300 border-gray-500/40';
  }
};

// Helper function to format junction reference
const formatJunctionRef = (ref: string | null): string | null => {
  if (!ref) return null;
  
  // Handle various junction formats: "15", "J15", "Junction 15", "Exit 15", "E3"
  const junctionMatch = ref.match(/^(?:J|Junction|Exit|E)?\s*(\d+[A-Z]?)$/i);
  if (junctionMatch) {
    return `J${junctionMatch[1]}`;
  }
  
  return ref;
};

// Helper function to format road reference for display
const formatRoadRef = (ref: string | null): string | null => {
  if (!ref) return null;
  
  // Clean up road references: "M25", "A1", "I-95", "E40"
  return ref.toUpperCase().trim();
};

const ProfessionalNavHUD = memo(function ProfessionalNavHUD({
  currentRoute,
  selectedProfile,
  isNavigating,
  currentSpeed = 0,
  currentLocation,
  onToggleVoice,
  onToggleFullscreen,
  onCancelRoute,
  isCancellingRoute = false,
  voiceEnabled = true,
  isFullscreen = false
}: ProfessionalNavHUDProps) {
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [instructions, setInstructions] = useState<NavigationInstruction[]>([]);
  const [estimatedArrival, setEstimatedArrival] = useState<Date | null>(null);

  // Screen wake lock to keep display on during navigation
  const wakeLock = useWakeLock();
  
  // Speed limit data from OpenStreetMap
  const speedLimitData = useSpeedLimit();
  
  // GPS data for speed (in m/s)
  const gps = useGPS();
  
  // Convert GPS speed (m/s) to display unit (mph or km/h)
  const convertSpeed = (speedMs: number | null, unit: 'mph' | 'km/h'): number => {
    if (speedMs === null) return 0;
    if (unit === 'mph') {
      return Math.round(speedMs * 2.23694); // m/s to mph
    } else {
      return Math.round(speedMs * 3.6); // m/s to km/h
    }
  };
  
  const currentSpeedInUnit = gps?.position?.speed 
    ? convertSpeed(gps.position.speed, speedLimitData.unit)
    : currentSpeed; // fallback to prop if GPS speed unavailable
  
  // Determine if speeding
  const isCurrentlySpeeding = isSpeeding(
    currentSpeedInUnit, 
    speedLimitData.speedLimitDisplay,
    2 // 2 unit tolerance
  );

  // Generate turn-by-turn instructions when route changes
  useEffect(() => {
    if (currentRoute && isNavigating) {
      const navInstructions = generateTurnByTurnInstructions(currentRoute);
      setInstructions(navInstructions);
      setCurrentInstructionIndex(0);
      
      // Calculate estimated arrival time
      const now = new Date();
      const arrivalTime = new Date(now.getTime() + (currentRoute.duration || 0) * 60000);
      setEstimatedArrival(arrivalTime);
    }
  }, [currentRoute, isNavigating]);

  // Simulate navigation progress timer
  useEffect(() => {
    if (!isNavigating) return;

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isNavigating]);

  // Manage screen wake lock during navigation
  useEffect(() => {
    if (isNavigating) {
      // Acquire wake lock when navigation starts
      wakeLock.acquire();
      console.log('🔒 Screen wake lock activated for navigation - screen will stay on');
    } else {
      // Release wake lock when navigation stops
      wakeLock.release();
      console.log('🔓 Screen wake lock released - normal power management restored');
    }
  }, [isNavigating, wakeLock]);

  const currentInstruction = instructions[currentInstructionIndex];
  const nextInstruction = instructions[currentInstructionIndex + 1];

  // Always show HUD header when navigating - route may be loading
  if (!isNavigating) {
    return null;
  }

  const progress = currentRoute ? Math.min((timeElapsed * 0.5) / (currentRoute.duration || 1), 1) : 0;
  const remainingDistance = currentRoute ? Math.max((currentRoute.distance || 0) - ((currentRoute.distance || 0) * progress), 0) : 0;
  const remainingTime = currentRoute ? Math.max((currentRoute.duration || 0) - Math.floor(timeElapsed / 60), 0) : 0;

  return (
    <div className="fixed nav-hud-safe-area z-[60] bg-transparent w-auto max-w-lg professional-nav-interface">
      {/* Professional HUD Header */}
      <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-2.5 bg-gray-900/95 border-b border-gray-700/30">
        {/* Left: Enhanced Oval Speedometer with Speed Limit */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Oval Speedometer */}
          <div 
            className={cn(
              "rounded-full px-3 py-1.5 md:px-4 md:py-2 border transition-all duration-300",
              isCurrentlySpeeding 
                ? "bg-red-600/30 border-red-500/50" 
                : "bg-blue-600/20 border-blue-500/30"
            )}
            data-testid="speedometer-oval"
          >
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Left Section: Speed Limit */}
              <div className="flex flex-col items-center min-w-[40px] md:min-w-[50px]">
                {speedLimitData.speedLimitDisplay !== null ? (
                  <>
                    <div className={cn(
                      "text-xs md:text-sm font-bold leading-tight",
                      isCurrentlySpeeding ? "text-red-200" : "text-blue-200"
                    )}>
                      {speedLimitData.speedLimitDisplay}
                    </div>
                    <div className={cn(
                      "text-[9px] md:text-[10px] leading-none uppercase",
                      isCurrentlySpeeding ? "text-red-300" : "text-blue-300"
                    )}>
                      Limit
                    </div>
                    {/* Confidence Badge */}
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "mt-0.5 px-1 py-0 text-[8px] md:text-[9px] h-auto",
                        getConfidenceColor(speedLimitData.confidence)
                      )}
                      data-testid="confidence-badge"
                    >
                      {speedLimitData.confidence === 'high' ? '✓' : 
                       speedLimitData.confidence === 'medium' ? '≈' : 
                       speedLimitData.confidence === 'low' ? '~' : '?'}
                    </Badge>
                  </>
                ) : (
                  <div className="text-[9px] md:text-[10px] text-gray-400 text-center">
                    No limit
                  </div>
                )}
              </div>

              {/* Center Divider */}
              <div className={cn(
                "h-8 md:h-10 w-px",
                isCurrentlySpeeding ? "bg-red-400/30" : "bg-blue-400/30"
              )} />

              {/* Center Section: Current Speed */}
              <div className="flex items-center space-x-1 md:space-x-1.5">
                <Gauge className={cn(
                  "w-4 h-4 md:w-5 md:h-5",
                  isCurrentlySpeeding ? "text-red-300" : "text-blue-400"
                )} />
                <div className="text-center">
                  <div className={cn(
                    "text-2xl md:text-3xl font-mono font-bold leading-tight",
                    isCurrentlySpeeding ? "text-white animate-pulse" : "text-white"
                  )} data-testid="current-speed">
                    {currentSpeedInUnit}
                  </div>
                  <div className={cn(
                    "text-[10px] md:text-xs leading-none uppercase",
                    isCurrentlySpeeding ? "text-red-300" : "text-blue-300"
                  )}>
                    {speedLimitData.unit}
                  </div>
                </div>
              </div>

              {/* Right Section: Dynamic Road Info */}
              {(speedLimitData.roadRef || speedLimitData.junction?.ref || speedLimitData.destination) && (
                <>
                  <div className={cn(
                    "h-8 md:h-10 w-px",
                    isCurrentlySpeeding ? "bg-red-400/30" : "bg-blue-400/30"
                  )} />
                  <div className="flex flex-col items-center justify-center min-w-[45px] md:min-w-[55px]">
                    {/* Road Reference Badge */}
                    {speedLimitData.roadRef && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "px-1.5 py-0.5 text-[9px] md:text-[10px] font-bold h-auto mb-0.5",
                          getRoadTypeBadgeColor(speedLimitData.roadType)
                        )}
                        data-testid="road-ref-badge"
                      >
                        {formatRoadRef(speedLimitData.roadRef)}
                      </Badge>
                    )}
                    
                    {/* Junction Badge (Amber) */}
                    {speedLimitData.junction?.ref && (
                      <Badge 
                        variant="outline" 
                        className="px-1.5 py-0.5 text-[8px] md:text-[9px] font-bold h-auto bg-amber-600/25 text-amber-200 border-amber-500/40 mb-0.5"
                        data-testid="junction-badge"
                      >
                        {formatJunctionRef(speedLimitData.junction.ref)}
                      </Badge>
                    )}
                    
                    {/* Destination Arrow */}
                    {speedLimitData.destination && (
                      <div className="text-[8px] md:text-[9px] text-gray-300 flex items-center truncate max-w-[60px]">
                        <span className="mr-0.5">→</span>
                        <span className="truncate" title={speedLimitData.destination}>
                          {speedLimitData.destination.split(',')[0].trim()}
                        </span>
                      </div>
                    )}
                    
                    {/* Fallback: Speeding indicator if no road data but speeding */}
                    {!speedLimitData.roadRef && !speedLimitData.junction?.ref && !speedLimitData.destination && isCurrentlySpeeding && (
                      <>
                        <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-400 animate-pulse" />
                        <div className="text-[8px] md:text-[9px] text-red-300 font-bold uppercase mt-0.5">
                          Speeding
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Status Info */}
          <div className="text-left hidden sm:block">
            <div className="text-xs md:text-sm text-gray-300 leading-tight">
              {speedLimitData.roadRef || speedLimitData.roadName || 'Navigation Active'}
            </div>
            <div className="text-[10px] md:text-xs text-green-400 flex items-center">
              <Compass className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
              GPS {speedLimitData.isLoading ? 'Updating...' : 'Connected'}
            </div>
          </div>
        </div>

        {/* Center: Arrival Info */}
        <div className="text-center">
          <div className="text-[10px] md:text-xs text-gray-300 leading-tight">Arrival</div>
          <div className="text-base md:text-lg font-bold text-white leading-tight">
            {estimatedArrival?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) || '--:--'}
          </div>
          <div className="text-[9px] md:text-xs text-gray-400 leading-none">
            {remainingTime}min • {remainingDistance.toFixed(1)}mi
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center space-x-1 md:space-x-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVoice}
            className="text-gray-300 hover:text-white hover:bg-gray-800 h-10 w-10 p-0"
            data-testid="button-toggle-voice"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="text-gray-300 hover:text-white hover:bg-gray-800 h-10 w-10 p-0"
            data-testid="button-toggle-fullscreen"
          >
            {isFullscreen ? <Eye className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={onCancelRoute}
            disabled={isCancellingRoute || !onCancelRoute}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white border border-red-500 h-10 w-10 p-0"
            data-testid="button-cancel-route"
            title="Cancel Navigation"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Navigation Instruction Panel - Only show when instructions are available */}
      {currentInstruction && (
        <div className="px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white shadow-lg border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-6">
                  {/* Direction Icon */}
                  <div className="flex-shrink-0 bg-gray-800/50 rounded-xl p-4 border border-gray-600/30">
                    {getDirectionIcon(currentInstruction.direction)}
                  </div>

                  {/* Instruction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline space-x-3 mb-2">
                      <span className="text-3xl font-bold text-white">
                        {currentInstruction.distance < 1 
                          ? `${Math.round(currentInstruction.distance * 1760)} yards`
                          : `${currentInstruction.distance.toFixed(1)} miles`
                        }
                      </span>
                      <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                        {currentInstruction.estimatedTime}min
                      </Badge>
                    </div>
                    
                    <div className="text-xl text-white font-medium mb-1 leading-tight">
                      {currentInstruction.instruction}
                    </div>
                    
                    {currentInstruction.roadName && (
                      <div className="text-lg text-blue-300 font-medium">
                        {currentInstruction.roadName}
                      </div>
                    )}
                  </div>

                  {/* Route Progress */}
                  <div className="flex-shrink-0 text-right">
                    <div className="w-24 h-2 bg-gray-700 rounded-full mb-2">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-400">
                      {Math.round(progress * 100)}% Complete
                    </div>
                  </div>
                </div>

                {/* Next Instruction Preview */}
                {nextInstruction && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="flex items-center space-x-3 opacity-70">
                      <div className="w-6 h-6 flex-shrink-0">
                        {getDirectionIcon(nextInstruction.direction)}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="font-medium">Then in {nextInstruction.distance.toFixed(1)} miles:</span>
                        <span className="ml-2">{nextInstruction.instruction}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
});

export default ProfessionalNavHUD;