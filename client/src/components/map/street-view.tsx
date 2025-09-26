import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  RotateCcw, 
  RotateCw, 
  Plus, 
  Minus, 
  Navigation,
  AlertCircle,
  Eye,
  EyeOff,
  MapPin,
  Loader2,
  X,
  Maximize2,
  Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Route } from "@shared/schema";

// Google Street View API configuration
declare global {
  interface Window {
    google: any;
    initStreetView: () => void;
  }
}

interface StreetViewProps {
  lat: number;
  lng: number;
  heading?: number;
  pitch?: number;
  zoom?: number;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  onHeadingChange?: (heading: number) => void;
  className?: string;
  isVisible?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClick?: () => void;
  // Navigation mode props
  mode?: 'preview' | 'navigation' | 'off';
  isNavigating?: boolean;
  currentRoute?: Route;
  nextManeuver?: {
    direction: 'left' | 'right' | 'straight' | 'uturn';
    distance: number;
    instruction: string;
    targetHeading?: number;
  };
  onModeChange?: (mode: 'preview' | 'navigation' | 'off') => void;
}

interface StreetViewPreferences {
  heading: number;
  pitch: number;
  zoom: number;
  showControls: boolean;
}

const STREET_VIEW_PREFERENCES_KEY = 'trucknav_streetview_preferences';

const defaultPreferences: StreetViewPreferences = {
  heading: 0,
  pitch: 0,
  zoom: 1,
  showControls: true
};

// Load street view preferences from localStorage
function loadStreetViewPreferences(): StreetViewPreferences {
  try {
    const stored = localStorage.getItem(STREET_VIEW_PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultPreferences, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load street view preferences:', error);
  }
  return defaultPreferences;
}

// Save street view preferences to localStorage
function saveStreetViewPreferences(preferences: StreetViewPreferences): void {
  try {
    localStorage.setItem(STREET_VIEW_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save street view preferences:', error);
  }
}

const StreetView = memo(function StreetView({
  lat,
  lng,
  heading = 0,
  pitch = 0,
  zoom = 1,
  onLocationChange,
  onHeadingChange,
  className,
  isVisible = true,
  isFullscreen = false,
  onToggleFullscreen,
  onClick,
  mode = 'preview',
  isNavigating = false,
  currentRoute,
  nextManeuver,
  onModeChange
}: StreetViewProps) {
  const streetViewRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<any>(null);
  const streetViewServiceRef = useRef<any>(null);
  
  const [preferences, setPreferences] = useState<StreetViewPreferences>(loadStreetViewPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(preferences.showControls);
  
  // Navigation mode state
  const [autoOrientEnabled, setAutoOrientEnabled] = useState(mode === 'navigation');
  const [navigationOverlayVisible, setNavigationOverlayVisible] = useState(mode === 'navigation');
  
  // Check for Google Street View API key
  const apiKey = import.meta.env.VITE_GOOGLE_STREET_VIEW_API_KEY;
  const [fallbackMode, setFallbackMode] = useState(false);
  
  // Load Google Street View API
  useEffect(() => {
    if (window.google && window.google.maps) {
      setApiLoaded(true);
      return;
    }

    if (!apiKey) {
      setError('Google Street View API key is required. Please set VITE_GOOGLE_STREET_VIEW_API_KEY environment variable.');
      setFallbackMode(true);
      return;
    }

    // Create callback function for API loading
    window.initStreetView = () => {
      setApiLoaded(true);
    };

    // Load Google Maps API with Street View
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=streetview&callback=initStreetView`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setError('Failed to load Google Street View API. Please check your API key and network connection.');
      setFallbackMode(true);
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (window.initStreetView) {
        window.initStreetView = (() => {}) as any;
      }
    };
  }, [apiKey]);

  // Initialize Street View when API is loaded and component is visible
  useEffect(() => {
    if (!apiLoaded || !streetViewRef.current || !isVisible) {
      return;
    }

    initializeStreetView();
  }, [apiLoaded, lat, lng, isVisible]);

  // Update street view position when coordinates change
  useEffect(() => {
    if (panoramaRef.current && isVisible && apiLoaded) {
      updateStreetViewPosition();
    }
  }, [lat, lng, isVisible, apiLoaded]);

  // Auto-orientation for navigation mode
  useEffect(() => {
    if (mode === 'navigation' && autoOrientEnabled && nextManeuver?.targetHeading !== undefined && panoramaRef.current) {
      const pov = panoramaRef.current.getPov();
      panoramaRef.current.setPov({
        ...pov,
        heading: nextManeuver.targetHeading
      });
    }
  }, [mode, autoOrientEnabled, nextManeuver?.targetHeading]);

  // Update navigation overlay visibility when mode changes
  useEffect(() => {
    setNavigationOverlayVisible(mode === 'navigation');
    setAutoOrientEnabled(mode === 'navigation');
  }, [mode]);

  const initializeStreetView = useCallback(() => {
    if (!streetViewRef.current || !window.google) return;

    setIsLoading(true);
    setError(null);

    try {
      // Initialize Street View service for location checking
      streetViewServiceRef.current = new window.google.maps.StreetViewService();
      
      // Check if Street View is available at this location
      checkStreetViewAvailability();
      
    } catch (err) {
      console.error('Error initializing Street View:', err);
      setError('Failed to initialize Street View');
      setIsLoading(false);
    }
  }, [lat, lng]);

  const checkStreetViewAvailability = useCallback(() => {
    if (!streetViewServiceRef.current) return;

    const position = new window.google.maps.LatLng(lat, lng);

    streetViewServiceRef.current.getPanorama({
      location: position,
      radius: 50 // Search within 50 meters
    }, (data: any, status: any) => {
      if (status === 'OK' && data) {
        setIsAvailable(true);
        createPanorama(data.location.latLng);
      } else {
        setIsAvailable(false);
        setError('Street View is not available for this location');
      }
      setIsLoading(false);
    });
  }, [lat, lng]);

  const createPanorama = useCallback((position: any) => {
    if (!streetViewRef.current || !window.google) return;

    try {
      const panoramaOptions = {
        position: position,
        pov: {
          heading: preferences.heading + heading,
          pitch: preferences.pitch + pitch
        },
        zoom: preferences.zoom + zoom,
        // Professional truck navigation styling
        addressControl: false,
        showRoadLabels: true,
        zoomControl: false,
        panControl: false,
        motionTracking: true,
        motionTrackingControl: false,
        fullscreenControl: false,
        imageDateControl: false,
        linksControl: true
      };

      panoramaRef.current = new window.google.maps.StreetViewPanorama(
        streetViewRef.current,
        panoramaOptions
      );

      // Add event listeners for navigation feedback
      panoramaRef.current.addListener('pov_changed', () => {
        const pov = panoramaRef.current.getPov();
        const newPreferences = { ...preferences, heading: pov.heading, pitch: pov.pitch };
        setPreferences(newPreferences);
        saveStreetViewPreferences(newPreferences);
        onHeadingChange?.(pov.heading);
      });

      panoramaRef.current.addListener('position_changed', () => {
        const position = panoramaRef.current.getPosition();
        if (position) {
          onLocationChange?.({
            lat: position.lat(),
            lng: position.lng()
          });
        }
      });

      panoramaRef.current.addListener('zoom_changed', () => {
        const newZoom = panoramaRef.current.getZoom();
        const newPreferences = { ...preferences, zoom: newZoom };
        setPreferences(newPreferences);
        saveStreetViewPreferences(newPreferences);
      });

    } catch (err) {
      console.error('Error creating panorama:', err);
      setError('Failed to create Street View panorama');
    }
  }, [preferences, heading, pitch, zoom, onLocationChange, onHeadingChange]);

  const updateStreetViewPosition = useCallback(() => {
    if (!panoramaRef.current || !window.google) return;

    setIsLoading(true);
    const newPosition = new window.google.maps.LatLng(lat, lng);
    
    // Check if Street View is available at new location
    streetViewServiceRef.current.getPanorama({
      location: newPosition,
      radius: 50
    }, (data: any, status: any) => {
      if (status === 'OK' && data) {
        panoramaRef.current.setPosition(data.location.latLng);
        setIsAvailable(true);
        setError(null);
      } else {
        setIsAvailable(false);
        setError('Street View not available at this location');
      }
      setIsLoading(false);
    });
  }, [lat, lng]);

  // Control handlers
  const handleRotateLeft = () => {
    if (!panoramaRef.current) return;
    const pov = panoramaRef.current.getPov();
    panoramaRef.current.setPov({ ...pov, heading: pov.heading - 90 });
  };

  const handleRotateRight = () => {
    if (!panoramaRef.current) return;
    const pov = panoramaRef.current.getPov();
    panoramaRef.current.setPov({ ...pov, heading: pov.heading + 90 });
  };

  const handleZoomIn = () => {
    if (!panoramaRef.current) return;
    const currentZoom = panoramaRef.current.getZoom();
    panoramaRef.current.setZoom(Math.min(currentZoom + 1, 5));
  };

  const handleZoomOut = () => {
    if (!panoramaRef.current) return;
    const currentZoom = panoramaRef.current.getZoom();
    panoramaRef.current.setZoom(Math.max(currentZoom - 1, 0));
  };

  const handleResetView = () => {
    if (!panoramaRef.current) return;
    panoramaRef.current.setPov({
      heading: 0,
      pitch: 0
    });
    panoramaRef.current.setZoom(1);
  };

  const toggleControls = () => {
    const newShowControls = !controlsVisible;
    setControlsVisible(newShowControls);
    const newPreferences = { ...preferences, showControls: newShowControls };
    setPreferences(newPreferences);
    saveStreetViewPreferences(newPreferences);
  };

  if (!apiKey) {
    return (
      <Card className="h-full flex items-center justify-center bg-muted">
        <CardContent className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500" />
          <div>
            <h3 className="text-lg font-semibold">API Key Required</h3>
            <p className="text-muted-foreground">
              Google Street View API key is needed to display street view imagery.
              Please configure VITE_GOOGLE_STREET_VIEW_API_KEY.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isVisible) {
    return null;
  }

  // Enhanced responsive sizing classes with mobile optimizations
  const getContainerClasses = () => {
    let classes = "relative bg-background transition-all duration-300 ";
    
    if (mode === 'navigation' && isNavigating) {
      // Navigation mode - optimized for mobile and desktop
      classes += "w-full h-full md:w-[40%] md:h-full ";
      classes += "max-h-[50vh] sm:max-h-[60vh] md:max-h-full ";
      // Mobile-specific optimizations  
      classes += "touch-manipulation overflow-hidden ";
      classes += "min-h-[300px] sm:min-h-[400px] "; // Ensure minimum usable size
    } else if (mode === 'preview') {
      // Preview mode - enhanced for cross-platform
      classes += "h-full w-full touch-manipulation overflow-hidden ";
      classes += "min-h-[250px] sm:min-h-[300px] "; // Minimum preview size
    } else {
      // Off mode - hidden
      classes += "hidden ";
    }
    
    // Add mobile browser compatibility classes
    classes += "android-chrome-fix ios-safari-fix ";
    // Additional mobile viewport fixes
    classes += "will-change-transform backface-visibility-hidden ";
    
    return cn(classes, className);
  };

  return (
    <div 
      className={getContainerClasses()}
      onClick={!isFullscreen && onClick ? onClick : undefined}
      style={{ cursor: !isFullscreen && onClick ? 'pointer' : 'default' }}
    >
      {/* Street View Container - Enhanced for mobile browsers */}
      <div 
        ref={streetViewRef}
        className="h-full w-full rounded-lg overflow-hidden android-chrome-fix ios-safari-fix"
        style={{ 
          minHeight: isFullscreen ? '300px' : '150px',
          // Enhanced webkit compatibility
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center space-y-2">
            <Loader2 className="w-6 h-6 mx-auto animate-spin" />
            <p className="text-sm text-muted-foreground">Loading Street View...</p>
          </div>
        </div>
      )}

      {/* Error State with Navigation Fallback */}
      {error && !isLoading && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <Card className="max-w-sm mx-4" data-testid="street-view-navigation-fallback">
            <CardContent className="text-center space-y-4 pt-6">
              {(mode === 'navigation' || isNavigating) ? (
                <>
                  <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full w-fit mx-auto">
                    <Navigation className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Navigation Mode Active</h3>
                    <p className="text-muted-foreground text-sm">
                      Ground view would be available here with Google Street View API key configured.
                    </p>
                    {isNavigating && nextManeuver && (
                      <div className="mt-3 p-3 bg-background/50 rounded border text-left">
                        <p className="text-sm font-medium">Next: {nextManeuver.instruction}</p>
                        <p className="text-xs text-muted-foreground">{nextManeuver.distance}m ahead</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">Street View Unavailable</h3>
                    <p className="text-muted-foreground text-sm">{error}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setError(null);
                      checkStreetViewAvailability();
                    }}
                    data-testid="button-retry-street-view"
                  >
                    Try Again
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Mode Overlay - Show turn-by-turn guidance */}
      {navigationOverlayVisible && nextManeuver && isNavigating && (
        <div className="absolute top-4 left-4 right-4 z-20">
          <Card className="bg-gray-900/90 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                {/* Direction Icon */}
                <div className="flex-shrink-0 bg-blue-600/20 rounded-lg p-3 border border-blue-500/30">
                  <Navigation className="w-6 h-6 text-blue-400" />
                </div>
                
                {/* Navigation Instructions */}
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-bold text-white mb-1">
                    {nextManeuver.instruction}
                  </div>
                  <div className="text-sm text-gray-300">
                    in {nextManeuver.distance}m
                  </div>
                </div>
                
                {/* Auto-Orient Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoOrientEnabled(!autoOrientEnabled)}
                  className={cn(
                    "text-gray-300 hover:text-white hover:bg-gray-800",
                    autoOrientEnabled && "bg-blue-600/20 text-blue-400"
                  )}
                  data-testid="button-auto-orient"
                  title="Auto-orient to next turn"
                >
                  <Navigation className={cn("w-4 h-4", autoOrientEnabled && "animate-pulse")} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mode Switching Controls - Top right */}
      {onModeChange && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 overflow-hidden">
            <Button
              variant={mode === 'off' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('off')}
              className="rounded-none border-r border-border/50 touch-manipulation min-h-[44px] min-w-[44px]"
              data-testid="button-street-view-off"
              title="Turn off Street View"
            >
              <EyeOff className="w-4 h-4" />
            </Button>
            <Button
              variant={mode === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('preview')}
              className="rounded-none border-r border-border/50 touch-manipulation min-h-[44px] min-w-[44px]"
              data-testid="button-street-view-preview"
              title="Preview Mode"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant={mode === 'navigation' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('navigation')}
              className="rounded-none touch-manipulation min-h-[44px] min-w-[44px]"
              data-testid="button-street-view-navigation"
              title="Navigation Mode"
              disabled={!isNavigating}
            >
              <Navigation className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Street View Controls - Show different controls for preview vs fullscreen */}
      {apiLoaded && isAvailable && controlsVisible && isFullscreen && (
        <div className="absolute top-4 right-4 z-20 space-y-2 md:space-y-2 sm:space-y-1">
          {/* Fullscreen Toggle - Mobile responsive */}
          {onToggleFullscreen && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleFullscreen}
              className="bg-background/80 backdrop-blur-sm hover:bg-background/90 touch-manipulation min-h-[44px] min-w-[44px]"
              data-testid="button-street-view-fullscreen"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          )}

          {/* Rotation Controls - Mobile responsive */}
          <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotateLeft}
              className="rounded-none border-b border-border/50 automotive-button scalable-control-button min-h-[44px] min-w-[44px]"
              data-testid="button-rotate-left"
              aria-label="Rotate street view left"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotateRight}
              className="rounded-none automotive-button scalable-control-button min-h-[44px] min-w-[44px]"
              data-testid="button-rotate-right"
              aria-label="Rotate street view right"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom Controls - Mobile responsive */}
          <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="rounded-none border-b border-border/50 automotive-button scalable-control-button min-h-[44px] min-w-[44px]"
              data-testid="button-street-view-zoom-in"
              aria-label="Zoom in street view"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="rounded-none automotive-button scalable-control-button min-h-[44px] min-w-[44px]"
              data-testid="button-street-view-zoom-out"
              aria-label="Zoom out street view"
            >
              <Minus className="w-4 h-4" />
            </Button>
          </div>

          {/* Reset View - Mobile responsive */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetView}
            className="bg-background/80 backdrop-blur-sm hover:bg-background/90 touch-manipulation min-h-[44px] min-w-[44px]"
            data-testid="button-reset-street-view"
            aria-label="Reset street view to default position"
          >
            <Navigation className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Controls Toggle - Only show in fullscreen mode */}
      {isFullscreen && (
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleControls}
          className="absolute top-4 left-4 z-20 bg-background/80 backdrop-blur-sm hover:bg-background/90 touch-manipulation min-h-[44px] min-w-[44px]"
          data-testid="button-toggle-street-view-controls"
          aria-label={controlsVisible ? "Hide street view controls" : "Show street view controls"}
        >
          {controlsVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      )}

      {/* Location Badge */}
      {isAvailable && (
        <Badge 
          variant="secondary" 
          className="absolute bottom-4 left-4 z-20 bg-background/80 backdrop-blur-sm"
        >
          <MapPin className="w-3 h-3 mr-1" />
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </Badge>
      )}

      {/* Street View Attribution (Google requirement) */}
      {apiLoaded && isAvailable && (
        <div className="absolute bottom-4 right-4 z-20">
          <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
            Google Street View
          </Badge>
        </div>
      )}
    </div>
  );
});

export default StreetView;