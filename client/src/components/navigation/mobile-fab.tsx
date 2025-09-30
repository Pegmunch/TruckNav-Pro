import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  X, 
  Settings, 
  MapPin, 
  Layers,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileFABProps {
  mode: 'plan' | 'preview' | 'navigate';
  onSettingsClick?: () => void;
  onClearRoute?: () => void;
  onMenuClick?: () => void;
  onLayersClick?: () => void;
  className?: string;
}

export function MobileFAB({
  mode,
  onSettingsClick,
  onClearRoute,
  onMenuClick,
  onLayersClick,
  className
}: MobileFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const speedDialOptions = [
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
      'absolute z-30',
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
              variant="secondary"
              size="icon"
              onClick={() => {
                option.onClick?.();
                setIsExpanded(false);
              }}
              className={cn(
                'h-14 w-14',
                'shadow-xl',
                'bg-background border-2 border-primary/20',
                'hover:bg-primary hover:text-primary-foreground'
              )}
              data-testid={`fab-option-${option.id}`}
            >
              <Icon className="w-6 h-6" />
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
          'bg-primary hover:bg-primary/90',
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
