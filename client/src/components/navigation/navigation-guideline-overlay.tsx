import { useEffect, useRef } from 'react';

interface NavigationGuidelineOverlayProps {
  /**
   * Whether navigation is active
   */
  isNavigating: boolean;
  
  /**
   * Remaining route distance in meters
   */
  routeDistance?: number;
  
  /**
   * Current GPS heading in degrees (0-360)
   */
  heading?: number;
  
  /**
   * Route coordinates (for drawing the guideline path)
   */
  routeCoordinates?: [number, number][];
}

/**
 * NavigationGuidelineOverlay - Fixed vertical blue line navigation guideline
 * 
 * This component renders a visually fixed vertical blue line in the center of the screen
 * that shows the route ahead. Unlike the MapLibre route (which rotates with the map),
 * this guideline stays vertically fixed while the map rotates underneath.
 * 
 * Key behavior:
 * - Always vertical (north-to-south orientation on screen)
 * - Fixed position above the speedometer
 * - Map rotates underneath based on heading
 * - Provides clear visual guidance for navigation
 */
export function NavigationGuidelineOverlay({
  isNavigating,
  routeDistance = 0,
  heading = 0,
  routeCoordinates = []
}: NavigationGuidelineOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!isNavigating || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match container
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Calculate guideline parameters
    const centerX = rect.width / 2;
    const startY = rect.height * 0.2; // Start 20% from top
    const endY = rect.height * 0.75;  // End 75% from top (above speedometer)
    const lineWidth = 24; // Match MapLibre route width
    
    // Draw the vertical guideline
    ctx.beginPath();
    ctx.moveTo(centerX, startY);
    ctx.lineTo(centerX, endY);
    
    // Style: Professional blue, thick line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Add subtle glow effect for visibility
    ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
    ctx.shadowBlur = 8;
    
    ctx.stroke();
    
    // Add distance markers along the guideline (optional enhancement)
    if (routeDistance > 0) {
      const markerY = startY + (endY - startY) * 0.3;
      ctx.beginPath();
      ctx.arc(centerX, markerY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
  }, [isNavigating, routeDistance, heading, routeCoordinates]);
  
  // Note: NavigationLayout already gates rendering on isNavUIActive/shouldShowHUD
  // So we always render when this component is mounted
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1400 }} // Above map, below HUD controls
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
}
