import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle } from "lucide-react";
import { getIncidentIcon } from "@shared/incident-icons";
import { type TrafficIncident } from "@shared/schema";
import { useMeasurement } from "@/components/measurement/measurement-provider";

interface IncidentFeedProps {
  currentLocation?: { lat: number; lng: number };
  showIncidents?: boolean;
  className?: string;
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  
  return distanceKm;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Format distance based on user's measurement preference
function formatDistanceValue(distanceKm: number, unit: 'imperial' | 'metric'): string {
  if (unit === 'imperial') {
    const miles = distanceKm * 0.621371;
    if (miles < 0.1) {
      const feet = miles * 5280;
      return `${Math.round(feet)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  } else {
    if (distanceKm < 1) {
      const meters = distanceKm * 1000;
      return `${Math.round(meters)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
  }
}

// Format time ago from timestamp
function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "Unknown";
  
  const now = new Date();
  const timestamp = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return timestamp.toLocaleDateString();
}

// Get severity badge variant
function getSeverityVariant(severity: string): "default" | "destructive" | "secondary" {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'high':
      return "destructive";
    case 'medium':
      return "default";
    case 'low':
      return "secondary";
    default:
      return "default";
  }
}

// Get severity color class
function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'high':
      return "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    case 'medium':
      return "bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
    case 'low':
      return "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    default:
      return "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
  }
}

interface IncidentWithDistance extends TrafficIncident {
  distance: number;
}

export function IncidentFeed({ currentLocation, showIncidents = true, className = "" }: IncidentFeedProps) {
  const { system } = useMeasurement();
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);
  
  // Fetch incidents with 2-minute auto-refresh
  const { data: incidents = [], isLoading } = useQuery<TrafficIncident[]>({
    queryKey: ["/api/traffic-incidents"],
    refetchInterval: 120000, // 2 minutes
    enabled: showIncidents,
  });

  // Filter and sort incidents by distance
  const nearbyIncidents: IncidentWithDistance[] = incidents
    .filter((incident) => {
      // Only show active incidents
      if (!incident.isActive) return false;
      
      // If no current location, show all incidents
      if (!currentLocation) return true;
      
      // Calculate distance and filter by radius
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        incident.coordinates.lat,
        incident.coordinates.lng
      );
      
      // Filter within 50km (30mi) radius
      const maxDistanceKm = 50;
      return distance <= maxDistanceKm;
    })
    .map((incident) => ({
      ...incident,
      distance: currentLocation
        ? calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            incident.coordinates.lat,
            incident.coordinates.lng
          )
        : 0,
    }))
    .sort((a, b) => a.distance - b.distance);

  if (!showIncidents) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
              data-testid={`skeleton-incident-${i}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (nearbyIncidents.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold mb-1" data-testid="text-no-incidents-title">
          No incidents nearby
        </h3>
        <p className="text-sm text-muted-foreground" data-testid="text-no-incidents-message">
          All clear on your route!
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={`h-full ${className}`}>
      <div className="space-y-2 p-4" data-testid="container-incidents-list">
        {nearbyIncidents.map((incident) => {
          const incidentConfig = getIncidentIcon(incident.type);
          const isExpanded = expandedIncidentId === incident.id;
          const distanceText = formatDistanceValue(incident.distance, system);
          const timeAgo = formatTimeAgo(incident.reportedAt);

          return (
            <Card
              key={incident.id}
              className={`p-3 cursor-pointer transition-all hover:shadow-md border ${getSeverityColor(
                incident.severity
              )}`}
              onClick={() => setExpandedIncidentId(isExpanded ? null : incident.id)}
              data-testid={`card-incident-${incident.id}`}
            >
              <div className="flex gap-3">
                {/* Emoji Icon */}
                <div
                  className="text-3xl flex-shrink-0"
                  data-testid={`icon-incident-${incident.id}`}
                >
                  {incidentConfig.emoji}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header: Type and Distance */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4
                      className="font-semibold text-sm truncate"
                      data-testid={`text-incident-type-${incident.id}`}
                    >
                      {incidentConfig.label}
                    </h4>
                    <span
                      className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                      data-testid={`text-incident-distance-${incident.id}`}
                    >
                      {distanceText}
                    </span>
                  </div>

                  {/* Severity Badge and Time */}
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={getSeverityVariant(incident.severity)}
                      className="text-xs"
                      data-testid={`badge-incident-severity-${incident.id}`}
                    >
                      {incident.severity}
                    </Badge>
                    <span
                      className="text-xs text-muted-foreground"
                      data-testid={`text-incident-time-${incident.id}`}
                    >
                      {timeAgo}
                    </span>
                  </div>

                  {/* Road Name */}
                  {incident.roadName && (
                    <p
                      className="text-xs text-muted-foreground mb-1"
                      data-testid={`text-incident-road-${incident.id}`}
                    >
                      📍 {incident.roadName}
                      {incident.direction && ` (${incident.direction})`}
                    </p>
                  )}

                  {/* Description - truncated or full */}
                  {incident.description && (
                    <p
                      className={`text-xs text-foreground/80 ${
                        isExpanded ? "" : "line-clamp-2"
                      }`}
                      data-testid={`text-incident-description-${incident.id}`}
                    >
                      {incident.description}
                    </p>
                  )}

                  {/* Truck Warnings */}
                  {isExpanded && incident.truckWarnings && incident.truckWarnings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                        ⚠️ Truck Warnings:
                      </p>
                      {incident.truckWarnings.map((warning, idx) => (
                        <p
                          key={idx}
                          className="text-xs text-orange-600 dark:text-orange-400 pl-4"
                          data-testid={`text-incident-warning-${incident.id}-${idx}`}
                        >
                          • {warning}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Traffic Delay */}
                  {isExpanded && incident.trafficDelay && (
                    <p
                      className="text-xs font-medium text-red-600 dark:text-red-400 mt-2"
                      data-testid={`text-incident-delay-${incident.id}`}
                    >
                      ⏱️ Delay: ~{incident.trafficDelay} minutes
                    </p>
                  )}

                  {/* Reporter Info */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-muted-foreground" data-testid={`text-incident-reporter-${incident.id}`}>
                        Reported by: {incident.reporterName || incident.reportedBy || "Unknown"}
                        {incident.isVerified && (
                          <span className="ml-2 text-green-600 dark:text-green-400">✓ Verified</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Expand hint */}
                  {!isExpanded && incident.description && incident.description.length > 100 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Tap for more details
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
