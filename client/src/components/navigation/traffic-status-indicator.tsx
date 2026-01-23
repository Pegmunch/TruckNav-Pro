import { Activity, AlertTriangle, CheckCircle, Loader2, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export type TrafficStatus = 'loading' | 'available' | 'unavailable' | 'error' | 'disabled';

interface TrafficStatusIndicatorProps {
  status: TrafficStatus;
  segmentCount?: number;
  unknownSegmentCount?: number;
  lastUpdated?: Date | null;
  className?: string;
  compact?: boolean;
}

export function TrafficStatusIndicator({
  status,
  segmentCount = 0,
  unknownSegmentCount = 0,
  lastUpdated,
  className,
  compact = false
}: TrafficStatusIndicatorProps) {
  const { t } = useTranslation();
  
  const hasPartialData = segmentCount > 0 && unknownSegmentCount > 0;
  const allUnknown = segmentCount > 0 && unknownSegmentCount === segmentCount;
  
  const getStatusConfig = () => {
    if (status === 'loading') {
      return {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        label: t('traffic.loading', 'Loading traffic...'),
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10'
      };
    }
    
    if (status === 'disabled') {
      return {
        icon: <WifiOff className="w-3.5 h-3.5" />,
        label: t('traffic.disabled', 'Traffic off'),
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10'
      };
    }
    
    if (status === 'error' || allUnknown) {
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        label: t('traffic.unavailable', 'Traffic data unavailable'),
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10'
      };
    }
    
    if (hasPartialData) {
      return {
        icon: <Activity className="w-3.5 h-3.5" />,
        label: t('traffic.partial', 'Partial traffic data'),
        color: 'text-amber-400',
        bgColor: 'bg-amber-400/10'
      };
    }
    
    if (status === 'available' && segmentCount > 0) {
      return {
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        label: t('traffic.live', 'Live traffic'),
        color: 'text-green-500',
        bgColor: 'bg-green-500/10'
      };
    }
    
    return {
      icon: <WifiOff className="w-3.5 h-3.5" />,
      label: t('traffic.noData', 'No traffic data'),
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10'
    };
  };
  
  const config = getStatusConfig();
  
  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          config.bgColor,
          config.color,
          className
        )}
        title={config.label}
      >
        {config.icon}
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium",
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
      {lastUpdated && status === 'available' && (
        <span className="text-[10px] opacity-70">
          {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}

export function TrafficLegend({ className }: { className?: string }) {
  const { t } = useTranslation();
  
  const legendItems = [
    { color: '#22C55E', label: t('traffic.legend.free', 'Free flow') },
    { color: '#84CC16', label: t('traffic.legend.light', 'Light') },
    { color: '#FDE047', label: t('traffic.legend.moderate', 'Moderate') },
    { color: '#F97316', label: t('traffic.legend.heavy', 'Heavy') },
    { color: '#DC2626', label: t('traffic.legend.standstill', 'Standstill') },
    { color: '#94A3B8', label: t('traffic.legend.unknown', 'Unknown') },
  ];
  
  return (
    <div className={cn(
      "flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 bg-white/95 dark:bg-gray-900/95 rounded-lg shadow-md text-xs",
      className
    )}>
      <span className="font-medium text-gray-700 dark:text-gray-300 mr-1">
        {t('traffic.legend.title', 'Traffic:')}
      </span>
      {legendItems.map((item) => (
        <div key={item.color} className="flex items-center gap-1">
          <div 
            className="w-3 h-3 rounded-full border border-black/10"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
