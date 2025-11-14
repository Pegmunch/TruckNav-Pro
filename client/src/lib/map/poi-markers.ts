/**
 * POI Marker Utilities - Shared between MapLibre and Leaflet
 * Provides consistent icon rendering across map engines
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { POIIcons, NavigationMarkers, IncidentIcons } from '@/assets/poi-icons';
import type { Facility } from '@shared/schema';
import L from 'leaflet';

// Map facility types to icon names
const FACILITY_TYPE_TO_ICON: Record<string, keyof typeof POIIcons> = {
  'truck_stop': 'truckStop',
  'fuel_station': 'fuelStation',
  'gas_station': 'fuelStation',
  'diesel': 'fuelStation',
  'parking': 'parking',
  'truck_parking': 'parking',
  'rest_area': 'restArea',
  'rest_stop': 'restArea',
  'weigh_station': 'weighStation',
  'scales': 'weighStation',
  'repair': 'repairShop',
  'repair_shop': 'repairShop',
  'mechanic': 'repairShop',
  'restaurant': 'restaurant',
  'food': 'restaurant',
  'diner': 'restaurant',
  'shower': 'shower',
  'showers': 'shower',
  'loading_dock': 'loadingDock',
  'warehouse': 'loadingDock',
  'distribution': 'loadingDock',
  'atm': 'atm',
  'bank': 'atm',
  'wifi': 'wifi',
  'internet': 'wifi',
  'hotel': 'hotel',
  'motel': 'hotel',
  'lodging': 'hotel'
};

// Map incident types to icons
const INCIDENT_TYPE_TO_ICON: Record<string, keyof typeof IncidentIcons> = {
  'accident': 'accident',
  'crash': 'accident',
  'construction': 'construction',
  'roadwork': 'construction',
  'road_closed': 'roadClosed',
  'closure': 'roadClosed',
  'low_bridge': 'lowBridge',
  'height_restriction': 'lowBridge',
  'weight_limit': 'weightLimit',
  'weight_restriction': 'weightLimit',
  'traffic': 'traffic',
  'congestion': 'traffic',
  'police': 'police',
  'speed_check': 'police',
  'weather': 'weather',
  'storm': 'weather',
  'fog': 'weather',
  'ice': 'weather',
  'snow': 'weather'
};

/**
 * Get the appropriate icon based on facility type
 */
export function getIconForFacilityType(type: string | undefined): keyof typeof POIIcons {
  if (!type) return 'truckStop'; // Default icon
  
  const normalizedType = type.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  // Check direct mapping
  if (FACILITY_TYPE_TO_ICON[normalizedType]) {
    return FACILITY_TYPE_TO_ICON[normalizedType];
  }
  
  // Check partial matches
  for (const [key, iconName] of Object.entries(FACILITY_TYPE_TO_ICON)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return iconName;
    }
  }
  
  // Default to truck stop icon
  return 'truckStop';
}

/**
 * Get icon for incident type
 */
export function getIconForIncidentType(type: string | undefined): keyof typeof IncidentIcons {
  if (!type) return 'accident'; // Default icon
  
  const normalizedType = type.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  // Check direct mapping
  if (INCIDENT_TYPE_TO_ICON[normalizedType]) {
    return INCIDENT_TYPE_TO_ICON[normalizedType];
  }
  
  // Check partial matches
  for (const [key, iconName] of Object.entries(INCIDENT_TYPE_TO_ICON)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return iconName;
    }
  }
  
  return 'accident'; // Default incident icon
}

/**
 * Build a POI marker DOM element for use in both MapLibre and Leaflet
 * @param type - The facility type
 * @param size - Icon size in pixels
 * @returns HTML string for the marker
 */
export function buildPOIMarkerElement(
  type: string | undefined,
  size: number = 32,
  additionalClasses: string = ''
): string {
  const iconType = getIconForFacilityType(type);
  const icon = POIIcons[iconType];
  
  if (!icon) {
    console.warn(`No icon found for type: ${type}, using default`);
    return buildDefaultMarkerElement(size);
  }
  
  // Render SVG to static HTML
  const svgHtml = renderToStaticMarkup(icon);
  
  return `
    <div 
      class="poi-marker ${additionalClasses}" 
      data-testid="poi-marker-${type}"
      role="button"
      tabindex="0"
      style="
        width: ${size}px;
        height: ${size}px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      "
      onmouseover="this.style.transform='scale(1.1)'"
      onmouseout="this.style.transform='scale(1)'"
    >
      ${svgHtml}
    </div>
  `;
}

/**
 * Build navigation marker element (origin, destination, current location)
 */
export function buildNavigationMarkerElement(
  type: keyof typeof NavigationMarkers,
  size: number = 40,
  additionalClasses: string = ''
): string {
  const icon = NavigationMarkers[type];
  
  if (!icon) {
    console.warn(`No navigation marker found for type: ${type}`);
    return buildDefaultMarkerElement(size);
  }
  
  const svgHtml = renderToStaticMarkup(icon);
  
  return `
    <div 
      class="nav-marker nav-marker-${type} ${additionalClasses}"
      data-testid="nav-marker-${type}"
      style="
        width: ${size}px;
        height: ${size}px;
        cursor: ${type === 'currentLocation' ? 'default' : 'pointer'};
        display: flex;
        align-items: center;
        justify-content: center;
      "
    >
      ${svgHtml}
    </div>
  `;
}

/**
 * Build incident marker element
 */
export function buildIncidentMarkerElement(
  type: string | undefined,
  size: number = 24,
  additionalClasses: string = ''
): string {
  const iconType = getIconForIncidentType(type);
  const icon = IncidentIcons[iconType];
  
  if (!icon) {
    console.warn(`No incident icon found for type: ${type}`);
    return buildDefaultIncidentElement(size);
  }
  
  const svgHtml = renderToStaticMarkup(icon);
  
  return `
    <div 
      class="incident-marker ${additionalClasses}"
      data-testid="incident-marker-${type}"
      role="button"
      tabindex="0"
      style="
        width: ${size}px;
        height: ${size}px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
        z-index: 1000;
      "
      onmouseover="this.style.transform='scale(1.2)'"
      onmouseout="this.style.transform='scale(1)'"
    >
      ${svgHtml}
    </div>
  `;
}

/**
 * Default marker fallback
 */
function buildDefaultMarkerElement(size: number): string {
  return `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: #DC2626;
      border: 2px solid white;
      border-radius: 50%;
      cursor: pointer;
    "></div>
  `;
}

/**
 * Default incident marker fallback
 */
function buildDefaultIncidentElement(size: number): string {
  return `
    <div style="
      width: 0;
      height: 0;
      border-left: ${size/2}px solid transparent;
      border-right: ${size/2}px solid transparent;
      border-bottom: ${size}px solid #EF4444;
      cursor: pointer;
    "></div>
  `;
}

/**
 * Create marker element for MapLibre
 */
export function createMapLibreMarkerElement(
  type: 'poi' | 'navigation' | 'incident',
  subType: string,
  size?: number
): HTMLElement {
  let html = '';
  
  switch (type) {
    case 'poi':
      html = buildPOIMarkerElement(subType, size);
      break;
    case 'navigation':
      html = buildNavigationMarkerElement(subType as keyof typeof NavigationMarkers, size);
      break;
    case 'incident':
      html = buildIncidentMarkerElement(subType, size);
      break;
  }
  
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.firstElementChild as HTMLElement;
}

/**
 * Create Leaflet DivIcon with our custom HTML
 */
export function createLeafletDivIcon(
  type: 'poi' | 'navigation' | 'incident',
  subType: string,
  size: number = 32
): L.DivIcon {
  let html = '';
  
  switch (type) {
    case 'poi':
      html = buildPOIMarkerElement(subType, size);
      break;
    case 'navigation':
      html = buildNavigationMarkerElement(subType as keyof typeof NavigationMarkers, size);
      break;
    case 'incident':
      html = buildIncidentMarkerElement(subType, size);
      break;
  }
  
  return L.divIcon({
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    className: 'custom-div-icon'
  });
}

/**
 * Get facility category from various possible fields
 */
export function getFacilityCategory(facility: Partial<Facility>): string {
  return facility.type || 
         (facility.amenities && facility.amenities[0]) || 
         'truck_stop';
}