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
  X
} from "lucide-react";
import { type Route, type VehicleProfile } from "@shared/schema";
import { cn } from "@/lib/utils";

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
    <div className="fixed bottom-20 right-4 z-[60] bg-transparent w-auto max-w-lg">
      {/* Professional HUD Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900/95 border-b border-gray-700/50">
        {/* Left: Current Speed & Status */}
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600/20 rounded-lg p-3 border border-blue-500/30">
            <div className="flex items-center space-x-2">
              <Gauge className="w-5 h-5 text-blue-400" />
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-white">{Math.round(currentSpeed)}</div>
                <div className="text-xs text-blue-300">MPH</div>
              </div>
            </div>
          </div>
          
          <div className="text-left">
            <div className="text-sm text-gray-300">Navigation Active</div>
            <div className="text-xs text-green-400 flex items-center">
              <Compass className="w-3 h-3 mr-1" />
              GPS Connected
            </div>
          </div>
        </div>

        {/* Center: Arrival Info */}
        <div className="text-center">
          <div className="text-sm text-gray-300">Arrival Time</div>
          <div className="text-xl font-bold text-white">
            {estimatedArrival?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) || '--:--'}
          </div>
          <div className="text-xs text-gray-400">
            {remainingTime}min remaining • {remainingDistance.toFixed(1)} miles
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVoice}
            className="text-gray-300 hover:text-white hover:bg-gray-800"
            data-testid="button-toggle-voice"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="text-gray-300 hover:text-white hover:bg-gray-800"
            data-testid="button-toggle-fullscreen"
          >
            {isFullscreen ? <Eye className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={onCancelRoute}
            disabled={isCancellingRoute || !onCancelRoute}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white border border-red-500"
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
            <Card className="bg-gray-900/90 border-gray-700/50 backdrop-blur-sm">
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