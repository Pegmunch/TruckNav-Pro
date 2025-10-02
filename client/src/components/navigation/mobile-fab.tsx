import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  X, 
  Settings, 
  MapPin, 
  Layers,
  Info,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileFABProps {
  mode: 'plan' | 'preview' | 'navigate';
  onSettingsClick?: () => void;
  onClearRoute?: () => void;
  onMenuClick?: () => void;
  onLayersClick?: () => void;
  onReportIncident?: () => void;
  onViewIncidents?: () => void;
  className?: string;
}

export function MobileFAB({
  mode,
  onSettingsClick,
  onClearRoute,
  onMenuClick,
  onLayersClick,
  onReportIncident,
  onViewIncidents,
  className
}: MobileFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const speedDialOptions = [
    {
      id: 'view-incidents',
      icon: AlertCircle,
      label: 'View Incidents',
      onClick: onViewIncidents,
      showInModes: ['plan', 'preview', 'navigate']
    },
    {
      id: 'report',
      icon: AlertTriangle,
      label: 'Report Incident',
      onClick: onReportIncident,
      showInModes: ['plan', 'preview', 'navigate']
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      onClick: onSettingsClick,
      showInModes: ['plan', 'preview', 'navigate']
    },
    {
      id: 'clear',
      icon: X,
      label: 'Clear Route',
      onClick: onClearRoute,
      showInModes: ['preview', 'navigate']
    },
    {
      id: 'menu',
      icon: MapPin,
      label: 'Route Options',
      onClick: onMenuClick,
      showInModes: ['preview', 'navigate']
    },
    {
      id: 'layers',
      icon: Layers,
      label: 'Map Layers',
      onClick: onLayersClick,
      showInModes: ['preview', 'navigate']
    }
  ].filter(option => option.showInModes.includes(mode));

  return (
    <div className={cn(
      'absolute z-30 pointer-events-auto',
      className
    )}>
      {/* Speed Dial Options */}
      <div className={cn(
        'flex flex-col-reverse gap-3 mb-3',
        'transition-all duration-200 ease-out',
        isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      )}>
        {speedDialOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Button
              key={option.id}
              size="icon"
              onClick={() => {
                option.onClick?.();
                setIsExpanded(false);
              }}
              className={cn(
                'h-8 w-8',
                'bg-white text-gray-800 hover:bg-white/90',
                'border border-slate-200',
                'shadow-xl'
              )}
              data-testid={`fab-option-${option.id}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="sr-only">{option.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Main FAB Button */}
      <Button
        variant="default"
        size="icon"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'h-16 w-16',
          'shadow-2xl',
          'bg-blue-600 hover:bg-blue-700',
          'backdrop-blur-sm',
          'transition-transform duration-200',
          isExpanded && 'rotate-45'
        )}
        data-testid="fab-main"
      >
        {isExpanded ? (
          <X className="w-7 h-7" />
        ) : (
          <Menu className="w-7 h-7" />
        )}
      </Button>
    </div>
  );
}
