import { useState, useEffect, useCallback } from 'react';
import { 
  Gauge, Clock, Fuel, Thermometer, Navigation2, 
  MapPin, TrendingUp, AlertTriangle, Settings, X, 
  GripVertical, Plus, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hapticButtonPress } from '@/hooks/use-haptic-feedback';

type WidgetType = 'speed' | 'eta' | 'fuel' | 'weather' | 'compass' | 'altitude' | 'distance' | 'traffic';

interface WidgetConfig {
  id: string;
  type: WidgetType;
  enabled: boolean;
  position: number;
}

interface DashboardWidgetsProps {
  currentSpeed?: number;
  speedLimit?: number;
  eta?: Date;
  distanceRemaining?: number;
  bearing?: number;
  altitude?: number;
  fuelEstimate?: number;
  temperature?: number;
  trafficDelay?: number;
  isNavigating: boolean;
  compact?: boolean;
}

const WIDGET_DEFINITIONS: Record<WidgetType, { icon: any; label: string; unit?: string }> = {
  speed: { icon: Gauge, label: 'Speed', unit: 'mph' },
  eta: { icon: Clock, label: 'ETA' },
  fuel: { icon: Fuel, label: 'Fuel', unit: 'mi' },
  weather: { icon: Thermometer, label: 'Weather', unit: '°C' },
  compass: { icon: Navigation2, label: 'Heading', unit: '°' },
  altitude: { icon: TrendingUp, label: 'Altitude', unit: 'ft' },
  distance: { icon: MapPin, label: 'Distance', unit: 'mi' },
  traffic: { icon: AlertTriangle, label: 'Delay', unit: 'min' }
};

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'w1', type: 'speed', enabled: true, position: 0 },
  { id: 'w2', type: 'eta', enabled: true, position: 1 },
  { id: 'w3', type: 'distance', enabled: true, position: 2 },
  { id: 'w4', type: 'compass', enabled: false, position: 3 },
  { id: 'w5', type: 'traffic', enabled: false, position: 4 },
  { id: 'w6', type: 'fuel', enabled: false, position: 5 }
];

function loadWidgetConfig(): WidgetConfig[] {
  try {
    const stored = localStorage.getItem('trucknav_dashboard_widgets');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
  }
  return DEFAULT_WIDGETS;
}

function saveWidgetConfig(config: WidgetConfig[]) {
  try {
    localStorage.setItem('trucknav_dashboard_widgets', JSON.stringify(config));
  } catch (e) {
  }
}

interface WidgetProps {
  type: WidgetType;
  value: string | number;
  compact?: boolean;
}

function Widget({ type, value, compact }: WidgetProps) {
  const def = WIDGET_DEFINITIONS[type];
  const Icon = def.icon;
  
  return (
    <div className={`
      bg-black/70 backdrop-blur-sm rounded-lg border border-white/20
      flex items-center gap-2 text-white
      ${compact ? 'px-2 py-1' : 'px-3 py-2'}
    `}>
      <Icon className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
      <div className="flex flex-col">
        <span className={`font-bold ${compact ? 'text-sm' : 'text-base'}`}>
          {value}{def.unit ? ` ${def.unit}` : ''}
        </span>
        {!compact && (
          <span className="text-[10px] text-white/60 uppercase tracking-wide">
            {def.label}
          </span>
        )}
      </div>
    </div>
  );
}

export function DashboardWidgets({
  currentSpeed = 0,
  speedLimit,
  eta,
  distanceRemaining = 0,
  bearing = 0,
  altitude = 0,
  fuelEstimate,
  temperature,
  trafficDelay = 0,
  isNavigating,
  compact = false
}: DashboardWidgetsProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(loadWidgetConfig);
  const [isCustomizing, setIsCustomizing] = useState(false);

  useEffect(() => {
    saveWidgetConfig(widgets);
  }, [widgets]);

  const getWidgetValue = useCallback((type: WidgetType): string | number => {
    switch (type) {
      case 'speed':
        return Math.round(currentSpeed);
      case 'eta':
        if (eta) {
          return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return '--:--';
      case 'distance':
        return distanceRemaining.toFixed(1);
      case 'compass':
        return Math.round(bearing);
      case 'altitude':
        return Math.round(altitude * 3.28084);
      case 'fuel':
        return fuelEstimate ? Math.round(fuelEstimate) : '--';
      case 'weather':
        return temperature !== undefined ? Math.round(temperature) : '--';
      case 'traffic':
        return trafficDelay;
      default:
        return '--';
    }
  }, [currentSpeed, eta, distanceRemaining, bearing, altitude, fuelEstimate, temperature, trafficDelay]);

  const toggleWidget = (id: string) => {
    hapticButtonPress();
    setWidgets(prev => prev.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.position - b.position);

  if (!isNavigating && enabledWidgets.length === 0) {
    return null;
  }

  if (isCustomizing) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl max-w-sm w-full max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-lg">Customize Dashboard</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCustomizing(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
            {widgets.map((widget) => {
              const def = WIDGET_DEFINITIONS[widget.type];
              const Icon = def.icon;
              return (
                <div 
                  key={widget.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                    ${widget.enabled 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                    }
                  `}
                  onClick={() => toggleWidget(widget.id)}
                >
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <Icon className="h-5 w-5" />
                  <span className="flex-1 font-medium">{def.label}</span>
                  {widget.enabled ? (
                    <Check className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Plus className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              className="w-full" 
              onClick={() => setIsCustomizing(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto">
      <div className={`
        flex flex-wrap gap-2 items-center
        ${compact ? 'justify-center' : 'justify-start'}
      `}>
        {enabledWidgets.map((widget) => (
          <Widget 
            key={widget.id} 
            type={widget.type} 
            value={getWidgetValue(widget.type)}
            compact={compact}
          />
        ))}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            hapticButtonPress();
            setIsCustomizing(true);
          }}
          className={`
            bg-black/50 hover:bg-black/70 text-white rounded-lg
            ${compact ? 'h-6 w-6' : 'h-8 w-8'}
          `}
        >
          <Settings className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        </Button>
      </div>
    </div>
  );
}
