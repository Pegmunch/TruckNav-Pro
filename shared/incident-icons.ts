// Comprehensive incident icon library for traffic and emergency scenarios

export const INCIDENT_TYPES = {
  // Emergency Services
  ACCIDENT: 'accident',
  POLICE: 'police',
  AMBULANCE: 'ambulance',
  FIRE_ENGINE: 'fire_engine',
  
  // Vehicle Incidents
  CAR_ABANDONED: 'car_abandoned',
  CAR_BREAKDOWN: 'car_breakdown',
  MOTORCYCLE_ACCIDENT: 'motorcycle_accident',
  TRUCK_BREAKDOWN: 'truck_breakdown',
  
  // Road Conditions
  ROAD_CLOSURE: 'road_closure',
  CONSTRUCTION: 'construction',
  POTHOLE: 'pothole',
  DEBRIS: 'debris',
  
  // Traffic
  HEAVY_TRAFFIC: 'heavy_traffic',
  TRAFFIC_JAM: 'traffic_jam',
  
  // Hazards
  HAZMAT_SPILL: 'hazmat_spill',
  OBSTACLE: 'obstacle',
  ANIMAL_ON_ROAD: 'animal_on_road',
  
  // Weather Related
  FLOODING: 'flooding',
  ICE: 'ice',
  FOG: 'fog',
} as const;

export type IncidentTypeKey = typeof INCIDENT_TYPES[keyof typeof INCIDENT_TYPES];

export interface IncidentIconConfig {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  description: string;
  category: 'emergency' | 'vehicle' | 'road' | 'traffic' | 'hazard' | 'weather';
}

export const INCIDENT_ICON_LIBRARY: Record<IncidentTypeKey, IncidentIconConfig> = {
  // Emergency Services
  [INCIDENT_TYPES.ACCIDENT]: {
    emoji: '⛑️',
    label: 'Accident',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    description: 'Traffic accident with injuries',
    category: 'emergency',
  },
  [INCIDENT_TYPES.POLICE]: {
    emoji: '🚔',
    label: 'Police',
    color: '#1E40AF',
    bgColor: '#DBEAFE',
    description: 'Police activity or checkpoint',
    category: 'emergency',
  },
  [INCIDENT_TYPES.AMBULANCE]: {
    emoji: '🚑',
    label: 'Ambulance',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    description: 'Medical emergency',
    category: 'emergency',
  },
  [INCIDENT_TYPES.FIRE_ENGINE]: {
    emoji: '🚒',
    label: 'Fire Engine',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    description: 'Fire emergency',
    category: 'emergency',
  },
  
  // Vehicle Incidents
  [INCIDENT_TYPES.CAR_ABANDONED]: {
    emoji: '🚗',
    label: 'Abandoned Vehicle',
    color: '#7C2D12',
    bgColor: '#FED7AA',
    description: 'Vehicle abandoned on road or hard shoulder',
    category: 'vehicle',
  },
  [INCIDENT_TYPES.CAR_BREAKDOWN]: {
    emoji: '🔧',
    label: 'Car Breakdown',
    color: '#EA580C',
    bgColor: '#FFEDD5',
    description: 'Broken down vehicle',
    category: 'vehicle',
  },
  [INCIDENT_TYPES.MOTORCYCLE_ACCIDENT]: {
    emoji: '🏍️',
    label: 'Motorcycle Accident',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    description: 'Motorcycle involved in accident',
    category: 'vehicle',
  },
  [INCIDENT_TYPES.TRUCK_BREAKDOWN]: {
    emoji: '🚛',
    label: 'Truck Breakdown',
    color: '#EA580C',
    bgColor: '#FFEDD5',
    description: 'Heavy vehicle breakdown',
    category: 'vehicle',
  },
  
  // Road Conditions
  [INCIDENT_TYPES.ROAD_CLOSURE]: {
    emoji: '🚧',
    label: 'Road Closure',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    description: 'Road completely closed',
    category: 'road',
  },
  [INCIDENT_TYPES.CONSTRUCTION]: {
    emoji: '🚧',
    label: 'Construction',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'Road construction work',
    category: 'road',
  },
  [INCIDENT_TYPES.POTHOLE]: {
    emoji: '🕳️',
    label: 'Pothole',
    color: '#78716C',
    bgColor: '#E7E5E4',
    description: 'Road surface damage',
    category: 'road',
  },
  [INCIDENT_TYPES.DEBRIS]: {
    emoji: '🪨',
    label: 'Debris',
    color: '#78716C',
    bgColor: '#E7E5E4',
    description: 'Debris on roadway',
    category: 'road',
  },
  
  // Traffic
  [INCIDENT_TYPES.HEAVY_TRAFFIC]: {
    emoji: '🚦',
    label: 'Heavy Traffic',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'Heavy traffic congestion',
    category: 'traffic',
  },
  [INCIDENT_TYPES.TRAFFIC_JAM]: {
    emoji: '🚗',
    label: 'Traffic Jam',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    description: 'Severe traffic jam',
    category: 'traffic',
  },
  
  // Hazards
  [INCIDENT_TYPES.HAZMAT_SPILL]: {
    emoji: '☢️',
    label: 'Hazmat Spill',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    description: 'Hazardous material spill',
    category: 'hazard',
  },
  [INCIDENT_TYPES.OBSTACLE]: {
    emoji: '⚠️',
    label: 'Obstacle',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'Obstacle on road',
    category: 'hazard',
  },
  [INCIDENT_TYPES.ANIMAL_ON_ROAD]: {
    emoji: '🦌',
    label: 'Animal on Road',
    color: '#78716C',
    bgColor: '#E7E5E4',
    description: 'Animal crossing or on roadway',
    category: 'hazard',
  },
  
  // Weather Related
  [INCIDENT_TYPES.FLOODING]: {
    emoji: '🌊',
    label: 'Flooding',
    color: '#0284C7',
    bgColor: '#E0F2FE',
    description: 'Road flooding',
    category: 'weather',
  },
  [INCIDENT_TYPES.ICE]: {
    emoji: '🧊',
    label: 'Ice',
    color: '#0EA5E9',
    bgColor: '#E0F2FE',
    description: 'Icy road conditions',
    category: 'weather',
  },
  [INCIDENT_TYPES.FOG]: {
    emoji: '🌫️',
    label: 'Fog',
    color: '#64748B',
    bgColor: '#F1F5F9',
    description: 'Heavy fog, low visibility',
    category: 'weather',
  },
};

// Helper function to get incident icon config
export function getIncidentIcon(type: string): IncidentIconConfig {
  return INCIDENT_ICON_LIBRARY[type as IncidentTypeKey] || INCIDENT_ICON_LIBRARY[INCIDENT_TYPES.OBSTACLE];
}

// Get all incidents by category
export function getIncidentsByCategory(category: IncidentIconConfig['category']) {
  return Object.entries(INCIDENT_ICON_LIBRARY)
    .filter(([_, config]) => config.category === category)
    .map(([type, config]) => ({ type, ...config }));
}

// Get all categories
export const INCIDENT_CATEGORIES = [
  { id: 'emergency', label: 'Emergency Services', color: 'text-red-600' },
  { id: 'vehicle', label: 'Vehicle Incidents', color: 'text-orange-600' },
  { id: 'road', label: 'Road Conditions', color: 'text-amber-600' },
  { id: 'traffic', label: 'Traffic', color: 'text-yellow-600' },
  { id: 'hazard', label: 'Hazards', color: 'text-rose-600' },
  { id: 'weather', label: 'Weather', color: 'text-blue-600' },
] as const;
