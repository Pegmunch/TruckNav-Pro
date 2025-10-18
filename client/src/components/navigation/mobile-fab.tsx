import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  X, 
  Settings, 
  MapPin, 
  Layers,
  Info,
  AlertTriangle,
  AlertCircle,
  Navigation
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
  onCompassClick?: () => void;
  bearing?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Custom Compass Icon with red top pointer and blue bottom pointer
function CompassIcon({ bearing = 0, className = "" }: { bearing?: number; className?: string }) {
  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ transform: `rotate(${bearing}deg)` }}
    >
      {/* Compass circle */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      
      {/* Red North pointer (top) */}
      <path 
        d="M 12 2 L 14 12 L 12 10 L 10 12 Z" 
        fill="#EF4444" 
        stroke="#DC2626" 
        strokeWidth="0.5"
      />
      
      {/* Blue South pointer (bottom) */}
      <path 
        d="M 12 22 L 14 12 L 12 14 L 10 12 Z" 
        fill="#3B82F6" 
        stroke="#2563EB" 
        strokeWidth="0.5"
      />
      
      {/* Center dot */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function MobileFAB({
  mode,
  onSettingsClick,
  onClearRoute,
  onMenuClick,
  onLayersClick,
  onReportIncident,
  onViewIncidents,
  onCompassClick,
  bearing = 0,
  className,
  style
}: MobileFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Synchronized icon state to prevent race conditions
  const [currentIcon, setCurrentIcon] = useState<'menu' | 'navigation' | 'x'>('menu');

  useEffect(() => {
    // Synchronize icon with mode
    if (isExpanded) {
      setCurrentIcon('x');
    } else if (mode === 'navigate') {
      setCurrentIcon('navigation');
    } else {
      setCurrentIcon('menu');
    }
  }, [mode, isExpanded]);

  const speedDialOptions = [
    {
      id: 'compass',
      icon: null as any,
      customIcon: <CompassIcon bearing={bearing} className="w-5 h-5" />,
      label: 'Reset Compass',
      onClick: onCompassClick,
      showInModes: ['plan', 'preview', 'navigate']
    },
    {
      id: 'view-incidents',
      icon: AlertCircle,
      customIcon: null,
      label: 'View Incidents',
      onClick: onViewIncidents,
      showInModes: ['plan', 'preview', 'navigate']
    },
    {
      id: 'report',
      icon: AlertTriangle,
      customIcon: null,
      label: 'Report Incident',
      onClick: onReportIncident,
      showInModes: ['plan', 'preview', 'navigate']
    },
    {
      id: 'settings',
      icon: Settings,
      customIcon: null,
      label: 'Settings',
      onClick: onSettingsClick,
      showInModes: ['plan', 'preview', 'navigate']
    },
    {
      id: 'clear',
      icon: X,
      customIcon: null,
      label: 'Clear Route',
      onClick: onClearRoute,
      showInModes: ['preview', 'navigate']
    },
    {
      id: 'menu',
      icon: Menu,
      customIcon: null,
      label: 'Menu',
      onClick: onMenuClick,
      showInModes: ['preview', 'navigate']
    },
    {
      id: 'layers',
      icon: Layers,
      customIcon: null,
      label: 'Map Layers',
      onClick: onLayersClick,
      showInModes: ['preview', 'navigate']
    }
  ].filter(option => option.showInModes.includes(mode));

  return (
    <div 
      className={cn(
        'absolute z-30 pointer-events-auto',
        className
      )}
      style={style}
    >
      {/* Speed Dial Options */}
      <div className={cn(
        'flex flex-col-reverse gap-2.5 mb-3',
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
                'h-11 w-11 rounded-xl',
                'bg-white/95 text-gray-800 hover:bg-white backdrop-blur-md',
                'border border-white/50',
                'shadow-2xl hover:scale-105 active:scale-95',
                'transition-all duration-200'
              )}
              data-testid={`fab-option-${option.id}`}
            >
              {option.customIcon ? option.customIcon : Icon && <Icon className="w-4.5 h-4.5" />}
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
          'h-16 w-16 rounded-2xl',
          'shadow-2xl',
          'backdrop-blur-md',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          mode === 'navigate' 
            ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border border-red-400/50'
            : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border border-blue-400/50',
          isExpanded && 'rotate-45'
        )}
        data-testid="fab-main"
      >
        {currentIcon === 'x' ? (
          <X className="w-7 h-7" />
        ) : currentIcon === 'navigation' ? (
          <Navigation className="w-7 h-7" />
        ) : (
          <Menu className="w-7 h-7" />
        )}
      </Button>
    </div>
  );
}
