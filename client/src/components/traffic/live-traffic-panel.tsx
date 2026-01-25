import { memo, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, 
  AlertCircle, 
  Plus,
  Eye,
  Radio,
  MapPin,
  Clock,
  CheckCircle2,
  Loader2,
  Car,
  Construction,
  AlertTriangle,
  TrafficCone,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type TrafficIncident } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { INCIDENT_ICON_LIBRARY, type IncidentTypeKey } from "@shared/incident-icons";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { hapticButtonPress } from "@/hooks/use-haptic-feedback";

interface LiveTrafficPanelProps {
  open: boolean;
  onClose: () => void;
  currentLocation?: { lat: number; lng: number };
  defaultTab?: 'view' | 'report';
  className?: string;
}

// Quick report incident types for one-tap reporting
const QUICK_REPORT_TYPES: Array<{
  key: IncidentTypeKey;
  label: string;
  icon: typeof Car;
  color: string;
}> = [
  { key: 'traffic_jam', label: 'Traffic Jam', icon: TrafficCone, color: 'bg-orange-500' },
  { key: 'heavy_traffic', label: 'Heavy Traffic', icon: Car, color: 'bg-yellow-500' },
  { key: 'accident', label: 'Accident', icon: AlertCircle, color: 'bg-red-500' },
  { key: 'construction', label: 'Roadwork', icon: Construction, color: 'bg-amber-500' },
  { key: 'police', label: 'Police', icon: Shield, color: 'bg-blue-500' },
  { key: 'obstacle', label: 'Hazard', icon: AlertTriangle, color: 'bg-red-600' },
];

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distanceKm: number, unit: 'imperial' | 'metric'): string {
  if (unit === 'imperial') {
    const miles = distanceKm * 0.621371;
    return miles < 0.1 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`;
  }
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
}

function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "Unknown";
  const now = new Date();
  const timestamp = typeof date === 'string' ? new Date(date) : date;
  const diffMins = Math.floor((now.getTime() - timestamp.getTime()) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'bg-red-600 text-white';
    case 'high': return 'bg-red-500 text-white';
    case 'medium': return 'bg-orange-500 text-white';
    case 'low': return 'bg-yellow-500 text-black';
    default: return 'bg-gray-500 text-white';
  }
}

const LiveTrafficPanel = memo(function LiveTrafficPanel({
  open,
  onClose,
  currentLocation,
  defaultTab = 'view',
  className
}: LiveTrafficPanelProps) {
  const [activeTab, setActiveTab] = useState<'view' | 'report'>(defaultTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastReportedType, setLastReportedType] = useState<string | null>(null);
  const { system } = useMeasurement();
  const { toast } = useToast();

  // Update tab when defaultTab changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Fetch nearby incidents
  const { data: incidents = [], isLoading, refetch } = useQuery<TrafficIncident[]>({
    queryKey: ["/api/traffic-incidents"],
    refetchInterval: 60000,
    enabled: open,
  });

  // Quick report mutation
  const reportMutation = useMutation({
    mutationFn: async (incidentType: IncidentTypeKey) => {
      if (!currentLocation) {
        throw new Error("GPS location required");
      }
      
      const incidentData = {
        type: incidentType,
        severity: 'medium',
        title: `${INCIDENT_ICON_LIBRARY[incidentType]?.label || incidentType} reported`,
        description: 'Crowdsourced report from driver',
        coordinates: currentLocation,
        direction: 'both_directions',
        reportedBy: 'user',
      };

      const response = await apiRequest("POST", "/api/traffic-incidents", incidentData);
      return response.json();
    },
    onSuccess: (data, incidentType) => {
      queryClient.invalidateQueries({ queryKey: ["/api/traffic-incidents"] });
      setLastReportedType(incidentType);
      toast({
        title: "Report Submitted",
        description: "Thank you for helping other drivers!",
      });
      // Clear the last reported indicator after 3 seconds
      setTimeout(() => setLastReportedType(null), 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Report Failed",
        description: error.message || "Could not submit report",
        variant: "destructive",
      });
    },
  });

  const handleQuickReport = useCallback((incidentType: IncidentTypeKey) => {
    hapticButtonPress();
    if (!currentLocation) {
      toast({
        title: "Location Required",
        description: "Enable GPS to report incidents",
        variant: "destructive",
      });
      return;
    }
    reportMutation.mutate(incidentType);
  }, [currentLocation, reportMutation, toast]);

  // Filter and sort incidents by distance
  const sortedIncidents = incidents
    .filter(incident => incident.isActive)
    .map(incident => ({
      ...incident,
      distance: currentLocation
        ? calculateDistance(currentLocation.lat, currentLocation.lng, incident.coordinates.lat, incident.coordinates.lng)
        : 999
    }))
    .filter(incident => incident.distance <= 50) // Within 50km
    .sort((a, b) => a.distance - b.distance);

  if (!open) return null;

  return (
    <div className={cn(
      "fixed inset-x-4 bottom-24 z-[10000] max-w-md mx-auto",
      "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm",
      "rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700",
      "transform transition-all duration-300",
      open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-500 animate-pulse" />
          <h2 className="font-semibold text-lg">Live Traffic</h2>
          {sortedIncidents.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {sortedIncidents.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'view' | 'report')} className="w-full">
        <TabsList className="w-full grid grid-cols-2 m-2 mr-4">
          <TabsTrigger value="view" className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            View
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Report
          </TabsTrigger>
        </TabsList>

        {/* View Tab - Incident Feed */}
        <TabsContent value="view" className="mt-0 p-0">
          <ScrollArea className="h-[280px] px-4 pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : sortedIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <CheckCircle2 className="w-10 h-10 mb-2 text-green-500" />
                <p className="text-sm font-medium">No incidents nearby</p>
                <p className="text-xs">Roads are clear within 50km</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedIncidents.slice(0, 10).map((incident) => {
                  const iconConfig = INCIDENT_ICON_LIBRARY[incident.type as IncidentTypeKey];
                  return (
                    <Card key={incident.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg text-lg",
                            getSeverityColor(incident.severity)
                          )}>
                            {iconConfig?.emoji || '⚠️'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-medium text-sm truncate">
                                {incident.title || iconConfig?.label || incident.type}
                              </h4>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {formatDistance(incident.distance, system)}
                              </Badge>
                            </div>
                            {incident.roadName && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {incident.roadName}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(incident.reportedAt)}
                              {incident.isVerified && (
                                <span className="flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                  Verified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Report Tab - Quick Report */}
        <TabsContent value="report" className="mt-0 p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
              <MapPin className="w-4 h-4" />
              {currentLocation 
                ? `Reporting at ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
                : "Enable GPS to report incidents"
              }
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {QUICK_REPORT_TYPES.map(({ key, label, icon: Icon, color }) => (
                <Button
                  key={key}
                  variant="outline"
                  className={cn(
                    "h-16 flex flex-col items-center justify-center gap-1 relative transition-all",
                    lastReportedType === key && "ring-2 ring-green-500 bg-green-50",
                    !currentLocation && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => handleQuickReport(key)}
                  disabled={!currentLocation || reportMutation.isPending}
                >
                  {reportMutation.isPending && lastReportedType === key ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : lastReportedType === key ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <div className={cn("p-1.5 rounded-lg", color)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <span className="text-xs font-medium">{label}</span>
                </Button>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center mt-3">
              One-tap to report. Your report helps other drivers stay safe.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});

export default LiveTrafficPanel;
