import { useEffect, useRef } from 'react';

interface NavigationGuidelineOverlayProps {
  isNavigating: boolean;
  routeDistance?: number;
  heading?: number;
  routeCoordinates?: [number, number][];
  nextTurn?: {
    direction: 'straight' | 'right' | 'left' | 'slight_right' | 'slight_left' | 'sharp_right' | 'sharp_left';
    distance: number;
    roadName?: string;
  } | null;
  laneGuidance?: {
    lanes: string[];
    recommended: number[];
    maneuverType?: string;
  } | null;
}

export function NavigationGuidelineOverlay({
  isNavigating,
  routeDistance = 0,
  heading = 0,
  routeCoordinates = [],
  nextTurn = null,
  laneGuidance = null
}: NavigationGuidelineOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!isNavigating || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Responsive sizing based on screen dimensions
    const isSmallScreen = rect.width < 390;
    const isTinyScreen = rect.width < 360;
    const isLargeScreen = rect.width > 800;
    
    const centerX = rect.width / 2;
    // Lower startY and endY to align with the bottom-centered map perspective
    const startY = rect.height * 0.45;
    const endY = rect.height * 0.85; 
    
    // Scale corridor width based on screen size (max 50% of screen width)
    let corridorWidth = Math.min(48, rect.width * 0.25);
    if (isSmallScreen) corridorWidth = Math.min(40, rect.width * 0.22);
    if (isTinyScreen) corridorWidth = Math.min(36, rect.width * 0.20);
    if (isLargeScreen) corridorWidth = Math.min(56, rect.width * 0.28);
    
    // Outer glow for visibility
    ctx.save();
    ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(centerX, startY);
    ctx.lineTo(centerX, endY);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = corridorWidth + 16;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    
    // Main route corridor with gradient
    const gradient = ctx.createLinearGradient(centerX, startY, centerX, endY);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
    gradient.addColorStop(0.5, 'rgba(37, 99, 235, 1)');
    gradient.addColorStop(1, 'rgba(29, 78, 216, 0.8)');
    
    ctx.beginPath();
    ctx.moveTo(centerX, startY);
    ctx.lineTo(centerX, endY);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = corridorWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Center dashed line (road marking style)
    ctx.beginPath();
    ctx.setLineDash([20, 15]);
    ctx.moveTo(centerX, startY + 30);
    ctx.lineTo(centerX, endY - 30);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw direction arrow at bottom of corridor
    if (nextTurn) {
      drawTruckTurnArrow(ctx, centerX, endY - 60, nextTurn.direction, isSmallScreen);
    } else {
      drawTruckTurnArrow(ctx, centerX, endY - 60, 'straight', isSmallScreen);
    }
    
    // Draw lane guidance at top if available and screen is wide enough
    if (laneGuidance && laneGuidance.lanes.length > 0 && !isTinyScreen) {
      drawTruckLaneGuidance(ctx, centerX, startY + 40, laneGuidance, rect.width, isSmallScreen);
    }
    
    // Draw distance markers for truck drivers (hide on tiny screens)
    if (!isTinyScreen) {
      drawDistanceMarkers(ctx, centerX, startY, endY, corridorWidth, isSmallScreen);
    }
    
  }, [isNavigating, routeDistance, heading, routeCoordinates, nextTurn, laneGuidance]);
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1400 }}
      data-testid="navigation-guideline-overlay"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          touchAction: 'none'
        }}
      />
    </div>
  );
}

function drawTruckTurnArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: string,
  isSmallScreen: boolean
) {
  const arrowSize = isSmallScreen ? 28 : 36;
  
  ctx.save();
  ctx.translate(x, y);
  
  let rotation = 0;
  switch (direction) {
    case 'right':
      rotation = Math.PI / 2;
      break;
    case 'left':
      rotation = -Math.PI / 2;
      break;
    case 'slight_right':
      rotation = Math.PI / 4;
      break;
    case 'slight_left':
      rotation = -Math.PI / 4;
      break;
    case 'sharp_right':
      rotation = (3 * Math.PI) / 4;
      break;
    case 'sharp_left':
      rotation = -(3 * Math.PI) / 4;
      break;
    default:
      rotation = 0;
  }
  
  ctx.rotate(rotation);
  
  // White background circle for visibility
  ctx.beginPath();
  ctx.arc(0, 0, arrowSize + 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Draw arrow pointing up
  ctx.beginPath();
  ctx.moveTo(0, -arrowSize + 8);
  ctx.lineTo(-arrowSize / 2 + 4, arrowSize / 3);
  ctx.lineTo(-arrowSize / 5, arrowSize / 4);
  ctx.lineTo(-arrowSize / 5, arrowSize - 12);
  ctx.lineTo(arrowSize / 5, arrowSize - 12);
  ctx.lineTo(arrowSize / 5, arrowSize / 4);
  ctx.lineTo(arrowSize / 2 - 4, arrowSize / 3);
  ctx.closePath();
  
  ctx.fillStyle = '#2563eb';
  ctx.fill();
  
  ctx.restore();
}

function drawTruckLaneGuidance(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  guidance: { lanes: string[]; recommended: number[]; maneuverType?: string },
  canvasWidth: number,
  isSmallScreen: boolean
) {
  const laneCount = guidance.lanes.length;
  if (laneCount === 0) return;
  
  // Scale lane width based on screen size
  let baseLaneWidth = 50;
  if (isSmallScreen) baseLaneWidth = 40;
  const laneWidth = Math.min(baseLaneWidth, (canvasWidth - 60) / laneCount);
  const totalWidth = laneWidth * laneCount;
  const startX = centerX - totalWidth / 2;
  
  // Background panel
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.beginPath();
  ctx.roundRect(startX - 10, y - 30, totalWidth + 20, 60, 8);
  ctx.fill();
  
  // Draw each lane
  guidance.lanes.forEach((lane, index) => {
    const laneX = startX + index * laneWidth + laneWidth / 2;
    const isRecommended = guidance.recommended.includes(index);
    
    // Lane background
    ctx.fillStyle = isRecommended ? 'rgba(34, 197, 94, 0.9)' : 'rgba(107, 114, 128, 0.7)';
    ctx.beginPath();
    ctx.roundRect(laneX - laneWidth / 2 + 4, y - 22, laneWidth - 8, 44, 4);
    ctx.fill();
    
    // Lane arrow
    ctx.fillStyle = '#ffffff';
    const fontSize = isSmallScreen ? 14 : 18;
    ctx.font = `bold ${fontSize}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let symbol = '↑';
    if (lane.includes('left')) symbol = '←';
    else if (lane.includes('right')) symbol = '→';
    else if (lane.includes('straight')) symbol = '↑';
    else if (lane.includes('uturn')) symbol = '↩';
    
    ctx.fillText(symbol, laneX, y);
    
    // Truck icon for recommended lane
    if (isRecommended) {
      ctx.font = isSmallScreen ? '8px system-ui' : '10px system-ui';
      ctx.fillText('🚛', laneX, y + 14);
    }
  });
  
  // "TRUCK LANE" label
  if (guidance.recommended.length > 0) {
    ctx.fillStyle = '#22c55e';
    ctx.font = isSmallScreen ? '8px system-ui' : 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('TRUCK LANE', centerX, y + 38);
  }
}

function drawDistanceMarkers(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  startY: number,
  endY: number,
  corridorWidth: number,
  isSmallScreen: boolean
) {
  const markers = [
    { position: 0.25, label: '500m' },
    { position: 0.5, label: '250m' },
    { position: 0.75, label: '100m' }
  ];
  
  const fontSize = isSmallScreen ? 9 : 11;
  
  markers.forEach(marker => {
    const markerY = startY + (endY - startY) * marker.position;
    
    // Marker line
    ctx.beginPath();
    ctx.moveTo(centerX - corridorWidth / 2 - 20, markerY);
    ctx.lineTo(centerX - corridorWidth / 2 - 5, markerY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Distance label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `bold ${fontSize}px system-ui`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(marker.label, centerX - corridorWidth / 2 - 24, markerY);
  });
}
