import { useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  ArrowUp, 
  ArrowLeftRight, 
  Scale,
  Ruler,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  ShieldAlert,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeasurement } from "@/components/measurement/measurement-provider";

interface RestrictionsWarningPanelProps {
  violations: Array<{
    restriction: {
      id: string;
      type: string;
      limit: number;
      location: string;
      description?: string;
      roadName?: string;
      severity: string;
    };
    severity: string;
    bypassable: boolean;
  }>;
  vehicleProfile: {
    height: number;
    width: number;
    weight: number;
    length?: number;
    type: string;
  };
  isRouteAllowed: boolean;
  onDismiss?: () => void;
  className?: string;
}

const RestrictionsWarningPanel = memo(function RestrictionsWarningPanel({
  violations,
  vehicleProfile,
  isRouteAllowed,
  onDismiss,
  className
}: RestrictionsWarningPanelProps) {
  // Start collapsed if only low-severity violations
  const hasHighSeverity = violations.some(v => 
    v.severity === 'high' || v.severity === 'absolute' || 
    v.restriction.severity === 'high' || v.restriction.severity === 'absolute'
  );
  
  const [isExpanded, setIsExpanded] = useState(hasHighSeverity);
  const { formatHeight, formatDistance, formatWeight } = useMeasurement();

  // Don't render if no violations
  if (!violations || violations.length === 0) {
    return null;
  }

  // Get icon based on restriction type
  const getRestrictionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'height':
        return <ArrowUp className="w-4 h-4" />;
      case 'width':
        return <ArrowLeftRight className="w-4 h-4" />;
      case 'weight':
        return <Scale className="w-4 h-4" />;
      case 'length':
        return <Ruler className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Get severity configuration
  const getSeverityConfig = (severity: string) => {
    const normalizedSeverity = severity.toLowerCase();
    
    switch (normalizedSeverity) {
      case 'absolute':
      case 'high':
        return {
          variant: 'destructive' as const,
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          borderColor: 'border-red-500 dark:border-red-700',
          textColor: 'text-red-900 dark:text-red-100',
          badgeVariant: 'destructive' as const,
          icon: <ShieldAlert className="w-5 h-5" />,
          label: normalizedSeverity === 'absolute' ? 'CRITICAL' : 'HIGH',
        };
      case 'medium':
        return {
          variant: 'default' as const,
          bgColor: 'bg-orange-50 dark:bg-orange-950/30',
          borderColor: 'border-orange-500 dark:border-orange-700',
          textColor: 'text-orange-900 dark:text-orange-100',
          badgeVariant: 'outline' as const,
          icon: <AlertTriangle className="w-5 h-5" />,
          label: 'WARNING',
        };
      case 'low':
      default:
        return {
          variant: 'default' as const,
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
          borderColor: 'border-yellow-500 dark:border-yellow-700',
          textColor: 'text-yellow-900 dark:text-yellow-100',
          badgeVariant: 'outline' as const,
          icon: <Info className="w-5 h-5" />,
          label: 'ADVISORY',
        };
    }
  };

  // Format vehicle dimension vs. limit comparison
  const formatComparison = (type: string, limit: number) => {
    let vehicleValue: number;
    let formattedVehicle: string;
    let formattedLimit: string;
    
    switch (type.toLowerCase()) {
      case 'height':
        vehicleValue = vehicleProfile?.height ?? 0;
        if (vehicleValue === 0) {
          return null;
        }
        formattedVehicle = formatHeight(vehicleValue);
        formattedLimit = formatHeight(limit);
        break;
      case 'width':
        vehicleValue = vehicleProfile?.width ?? 0;
        if (vehicleValue === 0) {
          return null;
        }
        formattedVehicle = formatDistance(vehicleValue, 'feet');
        formattedLimit = formatDistance(limit, 'feet');
        break;
      case 'weight':
        vehicleValue = vehicleProfile?.weight ?? 0;
        if (vehicleValue === 0) {
          return null;
        }
        formattedVehicle = formatWeight(vehicleValue);
        formattedLimit = formatWeight(limit);
        break;
      case 'length':
        vehicleValue = vehicleProfile?.length ?? 0;
        if (vehicleValue === 0) {
          return null;
        }
        formattedVehicle = formatDistance(vehicleValue, 'feet');
        formattedLimit = formatDistance(limit, 'feet');
        break;
      default:
        return null;
    }

    return {
      vehicleValue: formattedVehicle,
      limitValue: formattedLimit,
      exceeds: vehicleValue > limit,
    };
  };

  // Get the overall panel severity
  const overallSeverity = violations.some(v => 
    v.severity === 'absolute' || v.restriction.severity === 'absolute'
  ) ? 'absolute' : violations.some(v => 
    v.severity === 'high' || v.restriction.severity === 'high'
  ) ? 'high' : violations.some(v => 
    v.severity === 'medium' || v.restriction.severity === 'medium'
  ) ? 'medium' : 'low';

  const panelConfig = getSeverityConfig(overallSeverity);
  
  // Count critical (non-bypassable) violations
  const criticalCount = violations.filter(v => !v.bypassable).length;

  return (
    <div 
      className={cn(
        "fixed z-30 transition-all duration-300 ease-in-out",
        "bottom-4 left-4 right-4 md:bottom-auto md:top-20 md:right-4 md:left-auto md:w-96",
        "max-w-full md:max-w-md",
        className
      )}
      data-testid="restrictions-warning-panel"
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className={cn(
          "shadow-xl border-2 overflow-hidden",
          panelConfig.borderColor
        )}>
          {/* Header */}
          <CollapsibleTrigger asChild>
            <CardHeader 
              className={cn(
                "cursor-pointer transition-colors hover:opacity-90 p-4",
                panelConfig.bgColor,
                panelConfig.textColor
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {panelConfig.icon}
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {violations.length} Route Restriction{violations.length !== 1 ? 's' : ''} Detected
                    </CardTitle>
                    {criticalCount > 0 && (
                      <p className="text-sm opacity-90 mt-0.5">
                        {criticalCount} critical - cannot bypass
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={panelConfig.badgeVariant} className="text-xs">
                    {panelConfig.label}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          {/* Content */}
          <CollapsibleContent>
            <CardContent className="p-0">
              {!isRouteAllowed && (
                <Alert variant="destructive" className="m-4 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This route is not recommended due to critical restrictions that exceed your vehicle's specifications.
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="max-h-[400px] md:max-h-[500px]">
                <div className="p-4 space-y-3">
                  {violations.map((violation, index) => {
                    const { restriction, severity, bypassable } = violation;
                    const severityConfig = getSeverityConfig(
                      restriction.severity || severity
                    );
                    const comparison = formatComparison(
                      restriction.type,
                      restriction.limit
                    );

                    return (
                      <div
                        key={restriction.id}
                        className={cn(
                          "rounded-lg border-2 p-3 space-y-2 transition-colors",
                          severityConfig.bgColor,
                          severityConfig.borderColor
                        )}
                        data-testid={`restriction-item-${restriction.id}`}
                      >
                        {/* Restriction Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2 flex-1">
                            <div className={cn(
                              "p-1.5 rounded-md bg-background/50",
                              severityConfig.textColor
                            )}>
                              {getRestrictionIcon(restriction.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge 
                                  variant={severityConfig.badgeVariant}
                                  className="text-xs"
                                >
                                  {severityConfig.label}
                                </Badge>
                                {!bypassable && (
                                  <Badge 
                                    variant="destructive"
                                    className="text-xs"
                                    data-testid={`badge-cannot-bypass-${restriction.id}`}
                                  >
                                    🚫 Cannot Bypass
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <div className="text-sm">
                            <span className="font-medium">
                              {restriction.roadName || restriction.location}
                            </span>
                            {restriction.roadName && restriction.location && (
                              <span className="text-muted-foreground">
                                {' '}- {restriction.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Comparison */}
                        {comparison && (
                          <div className={cn(
                            "rounded-md p-2 text-sm font-medium",
                            "bg-background/70",
                            comparison.exceeds 
                              ? "text-red-700 dark:text-red-300" 
                              : "text-green-700 dark:text-green-300"
                          )}>
                            <div className="flex items-center justify-between">
                              <span>Your {restriction.type}:</span>
                              <span className="font-bold">{comparison.vehicleValue}</span>
                            </div>
                            <div className="flex items-center justify-center my-1">
                              <ArrowUp className={cn(
                                "w-4 h-4",
                                comparison.exceeds && "text-red-600 dark:text-red-400"
                              )} />
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Limit:</span>
                              <span className="font-bold">{comparison.limitValue}</span>
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {restriction.description && (
                          <p className="text-xs text-muted-foreground pl-6">
                            {restriction.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Dismiss Button */}
              {onDismiss && (
                <div className="p-4 pt-0">
                  <Button
                    onClick={onDismiss}
                    variant="outline"
                    className="w-full"
                    data-testid="button-dismiss-restrictions"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Dismiss
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
});

export default RestrictionsWarningPanel;
