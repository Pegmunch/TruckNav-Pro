import { memo, useEffect, useState } from 'react';
import { AlertTriangle, X, Navigation, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { INCIDENT_ICON_LIBRARY, type IncidentTypeKey } from '@shared/incident-icons';
import { useMeasurement } from '@/components/measurement/measurement-provider';

export interface IncidentAlertData {
  id: string;
  type: IncidentTypeKey;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  distanceAhead: number;
  roadName?: string;
  delay?: number;
  source: 'tomtom' | 'here' | 'crowdsourced';
}

interface IncidentAlertPopupProps {
  alert: IncidentAlertData | null;
  onDismiss: () => void;
  onReroute?: () => void;
  className?: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string; pulse: string }> = {
  critical: {
    bg: 'bg-red-600 dark:bg-red-700',
    border: 'border-red-400',
    icon: 'text-white',
    pulse: 'animate-pulse',
  },
  high: {
    bg: 'bg-orange-600 dark:bg-orange-700',
    border: 'border-orange-400',
    icon: 'text-white',
    pulse: '',
  },
  medium: {
    bg: 'bg-yellow-500 dark:bg-yellow-600',
    border: 'border-yellow-400',
    icon: 'text-white',
    pulse: '',
  },
  low: {
    bg: 'bg-blue-500 dark:bg-blue-600',
    border: 'border-blue-400',
    icon: 'text-white',
    pulse: '',
  },
};

const INCIDENT_LABELS: Record<string, string> = {
  accident: 'Accident',
  traffic_jam: 'Traffic Jam',
  heavy_traffic: 'Heavy Traffic',
  road_closure: 'Road Closed',
  construction: 'Roadworks',
  obstacle: 'Hazard',
  fog: 'Fog',
  ice: 'Ice on Road',
  flooding: 'Flooding',
  car_breakdown: 'Broken Down Vehicle',
  truck_breakdown: 'Truck Breakdown',
  police: 'Police',
  debris: 'Debris on Road',
  pothole: 'Pothole',
  animal_on_road: 'Animal on Road',
};

const IncidentAlertPopup = memo(function IncidentAlertPopup({
  alert,
  onDismiss,
  onReroute,
  className,
}: IncidentAlertPopupProps) {
  const { system: measurementSystem } = useMeasurement();
  const [visible, setVisible] = useState(false);
  const [autoDismissTimer, setAutoDismissTimer] = useState<number | null>(null);

  useEffect(() => {
    if (alert) {
      setVisible(true);
      if (autoDismissTimer) window.clearTimeout(autoDismissTimer);
      const timer = window.setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, alert.severity === 'critical' || alert.severity === 'high' ? 15000 : 10000);
      setAutoDismissTimer(timer);
      return () => window.clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [alert?.id]);

  if (!alert) return null;

  const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low;
  const label = INCIDENT_LABELS[alert.type] || alert.type.replace(/_/g, ' ');

  const formatDistance = (meters: number): string => {
    if (measurementSystem === 'imperial') {
      const miles = meters / 1609.34;
      if (miles < 0.1) return `${Math.round(miles * 5280)} ft ahead`;
      return `${miles.toFixed(1)} mi ahead`;
    }
    if (meters < 1000) return `${Math.round(meters)} m ahead`;
    return `${(meters / 1000).toFixed(1)} km ahead`;
  };

  const handleDismiss = () => {
    if (autoDismissTimer) window.clearTimeout(autoDismissTimer);
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={cn(
        'fixed top-16 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 w-[92vw] max-w-md',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none',
        className
      )}
    >
      <div className={cn(
        'rounded-2xl border-2 shadow-2xl overflow-hidden',
        styles.bg, styles.border, styles.pulse
      )}>
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold text-base uppercase tracking-wide">
                  {alert.severity === 'critical' ? 'WARNING' : 'INCIDENT AHEAD'}
                </span>
                <button
                  onClick={handleDismiss}
                  className="ml-auto flex-shrink-0 text-white/70 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-white font-semibold text-lg leading-tight">{label}</p>

              {alert.description && (
                <p className="text-white/80 text-sm mt-0.5 line-clamp-2">{alert.description}</p>
              )}

              <div className="flex items-center gap-3 mt-2 text-white/90 text-sm">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {formatDistance(alert.distanceAhead)}
                </span>
                {alert.roadName && (
                  <span className="truncate max-w-[120px]">{alert.roadName}</span>
                )}
                {alert.delay && alert.delay > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    +{Math.round(alert.delay / 60)} min
                  </span>
                )}
              </div>
            </div>
          </div>

          {onReroute && (alert.severity === 'critical' || alert.severity === 'high') && (
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 font-semibold"
                onClick={handleDismiss}
              >
                Continue Route
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 bg-white text-gray-900 hover:bg-white/90 border-0 font-semibold"
                onClick={() => {
                  handleDismiss();
                  onReroute();
                }}
              >
                <Navigation className="w-4 h-4 mr-1.5" />
                Find Alternate
              </Button>
            </div>
          )}
        </div>

        <div className={cn('h-1 bg-white/30')}>
          <div
            className="h-full bg-white/60 transition-all"
            style={{
              animation: `shrink ${alert.severity === 'critical' || alert.severity === 'high' ? 15 : 10}s linear forwards`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
});

export default IncidentAlertPopup;
