/**
 * POI (Point of Interest) Icons for TruckNav Pro
 * SVG icons optimized for map markers and navigation
 */

export const POIIcons = {
  // Truck Stop
  truckStop: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#DC2626" stroke="white" strokeWidth="2"/>
      <path d="M7 8h8v5H7z M15 10h2v2h-2z" fill="white"/>
      <circle cx="9" cy="14" r="1" fill="white"/>
      <circle cx="13" cy="14" r="1" fill="white"/>
    </svg>
  ),
  
  // Fuel Station
  fuelStation: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#10B981" stroke="white" strokeWidth="2"/>
      <path d="M8 7h5v8H8z M13 9h2.5v1.5h-1v3h-1.5z" fill="white"/>
      <rect x="9" y="9" width="3" height="2" fill="#10B981"/>
    </svg>
  ),
  
  // Parking Area
  parking: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#3B82F6" stroke="white" strokeWidth="2"/>
      <text x="12" y="17" fontSize="14" fontWeight="bold" fill="white" textAnchor="middle">P</text>
    </svg>
  ),
  
  // Rest Area
  restArea: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#F97316" stroke="white" strokeWidth="2"/>
      <path d="M8 10h8v1H8z M7 11h10v4H7z" fill="white"/>
      <circle cx="10" cy="8.5" r="1.5" fill="white"/>
    </svg>
  ),
  
  // Weigh Station
  weighStation: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#EAB308" stroke="white" strokeWidth="2"/>
      <path d="M7 10l5-3l5 3 M7 10v4h10v-4 M9 14v1 M12 14v1 M15 14v1" stroke="white" strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  
  // Repair Shop
  repairShop: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#6B7280" stroke="white" strokeWidth="2"/>
      <path d="M8 9l2 2-1 1 3 3 1-1 2 2-1 3-3 1-5-5-1-3z" fill="white"/>
    </svg>
  ),
  
  // Restaurant
  restaurant: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#8B5CF6" stroke="white" strokeWidth="2"/>
      <path d="M9 7v4l-1 1v5h2v-5l-1-1V7z M14 7v10h1V7z" stroke="white" strokeWidth="1.5" fill="white"/>
    </svg>
  ),
  
  // Shower Facilities
  shower: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#06B6D4" stroke="white" strokeWidth="2"/>
      <circle cx="12" cy="9" r="2" fill="white"/>
      <path d="M10 12v1 M12 12v1 M14 12v1 M10 14v1 M12 14v1 M14 14v1" stroke="white" strokeWidth="1"/>
    </svg>
  ),
  
  // Loading Dock
  loadingDock: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#7C3AED" stroke="white" strokeWidth="2"/>
      <rect x="7" y="8" width="10" height="8" fill="none" stroke="white" strokeWidth="1.5"/>
      <path d="M9 11h6 M9 13h6" stroke="white" strokeWidth="1"/>
    </svg>
  ),
  
  // ATM
  atm: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#059669" stroke="white" strokeWidth="2"/>
      <rect x="8" y="7" width="8" height="10" fill="white" rx="1"/>
      <rect x="9" y="8" width="6" height="3" fill="#059669"/>
      <text x="12" y="15" fontSize="6" fill="#059669" textAnchor="middle">$</text>
    </svg>
  ),
  
  // WiFi Hotspot
  wifi: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#4F46E5" stroke="white" strokeWidth="2"/>
      <path d="M8 9c2.2-2.2 5.8-2.2 8 0M9.5 10.5c1.4-1.4 3.6-1.4 5 0M11 12c.6-.6 1.4-.6 2 0" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx="12" cy="14" r="1" fill="white"/>
    </svg>
  ),
  
  // Hotel/Motel
  hotel: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#EC4899" stroke="white" strokeWidth="2"/>
      <rect x="7" y="8" width="10" height="8" fill="white"/>
      <rect x="9" y="10" width="2" height="2" fill="#EC4899"/>
      <rect x="13" y="10" width="2" height="2" fill="#EC4899"/>
      <rect x="11" y="13" width="2" height="3" fill="#EC4899"/>
    </svg>
  )
};

// Navigation Markers
export const NavigationMarkers = {
  // Origin marker
  origin: (
    <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#10B981"/>
      <circle cx="16" cy="16" r="8" fill="white"/>
      <circle cx="16" cy="16" r="4" fill="#10B981"/>
    </svg>
  ),
  
  // Destination marker
  destination: (
    <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#DC2626"/>
      <rect x="10" y="10" width="12" height="12" fill="white" transform="rotate(45 16 16)"/>
    </svg>
  ),
  
  // Current GPS location
  currentLocation: (
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#3B82F6" fillOpacity="0.3"/>
      <circle cx="12" cy="12" r="8" fill="#3B82F6" fillOpacity="0.5"/>
      <circle cx="12" cy="12" r="5" fill="#3B82F6"/>
      <circle cx="12" cy="12" r="2" fill="white"/>
    </svg>
  ),
  
  // Truck marker
  truckMarker: (
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(0 20 20)">
        <rect x="8" y="14" width="18" height="12" fill="#DC2626" rx="2"/>
        <rect x="26" y="16" width="6" height="8" fill="#991B1B" rx="1"/>
        <circle cx="12" cy="28" r="2" fill="#1F2937"/>
        <circle cx="20" cy="28" r="2" fill="#1F2937"/>
        <circle cx="28" cy="28" r="2" fill="#1F2937"/>
        <path d="M20 10L18 14h4z" fill="#F59E0B"/>
      </g>
    </svg>
  ),
  
  // Waypoint marker
  waypoint: (
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#8B5CF6" stroke="white" strokeWidth="2"/>
      <text x="12" y="16" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">W</text>
    </svg>
  )
};

// Incident and Hazard Icons
export const IncidentIcons = {
  // Accident
  accident: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 20h20z" fill="#EF4444" stroke="white" strokeWidth="1"/>
      <text x="12" y="16" fontSize="14" fill="white" textAnchor="middle">!</text>
    </svg>
  ),
  
  // Construction
  construction: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" fill="#F59E0B" stroke="white" strokeWidth="1"/>
      <path d="M7 12h10 M12 7v10" stroke="white" strokeWidth="2"/>
    </svg>
  ),
  
  // Road Closure
  roadClosed: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#DC2626" stroke="white" strokeWidth="1"/>
      <rect x="6" y="11" width="12" height="2" fill="white"/>
    </svg>
  ),
  
  // Low Bridge
  lowBridge: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" fill="#EAB308" stroke="white" strokeWidth="1"/>
      <path d="M6 8h12M6 16h12M6 8v8M18 8v8" stroke="white" strokeWidth="1.5"/>
      <text x="12" y="13" fontSize="8" fill="white" textAnchor="middle">H</text>
    </svg>
  ),
  
  // Weight Restriction
  weightLimit: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#F97316" stroke="white" strokeWidth="1"/>
      <text x="12" y="14" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">WT</text>
      <path d="M7 16h10" stroke="white" strokeWidth="1"/>
    </svg>
  ),
  
  // Traffic Congestion
  traffic: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#FCD34D" stroke="white" strokeWidth="1"/>
      <rect x="10" y="8" width="4" height="4" fill="#DC2626"/>
      <rect x="10" y="12" width="4" height="4" fill="#F59E0B"/>
      <rect x="10" y="16" width="4" height="4" fill="#10B981"/>
    </svg>
  ),
  
  // Police/Speed Check
  police: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="white" strokeWidth="1"/>
      <path d="M8 9h8l-1 2h-6zM9 11h6v4h-6z" fill="white"/>
      <circle cx="10" cy="7" r="1" fill="#EF4444"/>
      <circle cx="14" cy="7" r="1" fill="#3B82F6"/>
    </svg>
  ),
  
  // Weather Hazard
  weather: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#64748B" stroke="white" strokeWidth="1"/>
      <path d="M8 10c0-2 1.5-3 3-3s4 1 4 3c0 1.5-1 2-2 2h-5c-1 0-2 1-2 2s1 2 2.5 2" stroke="white" strokeWidth="1.5" fill="none"/>
      <circle cx="9" cy="16" r="0.5" fill="white"/>
      <circle cx="12" cy="17" r="0.5" fill="white"/>
      <circle cx="15" cy="16" r="0.5" fill="white"/>
    </svg>
  )
};

// Create icon component that renders SVG based on type
interface IconProps {
  type: keyof typeof POIIcons | keyof typeof NavigationMarkers | keyof typeof IncidentIcons;
  size?: number;
  className?: string;
}

export function POIIcon({ type, size = 24, className = "" }: IconProps) {
  const icon = POIIcons[type as keyof typeof POIIcons] || 
                NavigationMarkers[type as keyof typeof NavigationMarkers] || 
                IncidentIcons[type as keyof typeof IncidentIcons];
  
  if (!icon) return null;
  
  return (
    <div 
      className={className}
      style={{ width: size, height: size }}
    >
      {icon}
    </div>
  );
}

// Export all icon types for easy reference
export const IconTypes = {
  poi: Object.keys(POIIcons),
  navigation: Object.keys(NavigationMarkers),
  incidents: Object.keys(IncidentIcons)
};