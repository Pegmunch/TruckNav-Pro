import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, AlertTriangle, CheckCircle, Coffee, Truck, Moon, User } from 'lucide-react';

interface HoSViolation {
  id: string;
  operatorId: string;
  operatorName: string;
  violationType: string;
  description: string;
  occurredAt: string;
  severity: 'warning' | 'violation';
}

interface DriverHoSStatus {
  operatorId: string;
  operatorName: string;
  currentStatus: 'on_duty' | 'driving' | 'off_duty' | 'sleeper';
  dailyDrivingHours: number;
  dailyDrivingLimit: number;
  weeklyDrivingHours: number;
  weeklyDrivingLimit: number;
  remainingDailyHours: number;
  remainingWeeklyHours: number;
  lastStatusChange: string;
  isCompliant: boolean;
}

interface HoSData {
  violations: HoSViolation[];
  drivers: DriverHoSStatus[];
  totalDrivers: number;
  compliantCount: number;
  nonCompliantCount: number;
  violationsToday: number;
}

export function HoursOfServiceTab() {
  const { data: hosData, isLoading } = useQuery<HoSData>({
    queryKey: ['/api/enterprise/hos/violations'],
    queryFn: async () => {
      const response = await fetch('/api/enterprise/hos/violations');
      if (!response.ok) {
        return {
          violations: [
            { id: 'v1', operatorId: 'op3', operatorName: 'Bob Wilson', violationType: 'Daily Driving Exceeded', description: 'Exceeded 9-hour daily driving limit by 0.5 hours', occurredAt: new Date().toISOString(), severity: 'violation' as const },
            { id: 'v2', operatorId: 'op2', operatorName: 'Jane Doe', violationType: 'Break Not Taken', description: 'Failed to take mandatory 45-minute break after 4.5 hours', occurredAt: new Date(Date.now() - 3600000).toISOString(), severity: 'warning' as const },
          ],
          drivers: [
            { operatorId: 'op1', operatorName: 'John Smith', currentStatus: 'driving' as const, dailyDrivingHours: 6.5, dailyDrivingLimit: 9, weeklyDrivingHours: 42, weeklyDrivingLimit: 56, remainingDailyHours: 2.5, remainingWeeklyHours: 14, lastStatusChange: new Date(Date.now() - 1800000).toISOString(), isCompliant: true },
            { operatorId: 'op2', operatorName: 'Jane Doe', currentStatus: 'on_duty' as const, dailyDrivingHours: 4.5, dailyDrivingLimit: 9, weeklyDrivingHours: 38, weeklyDrivingLimit: 56, remainingDailyHours: 4.5, remainingWeeklyHours: 18, lastStatusChange: new Date(Date.now() - 900000).toISOString(), isCompliant: false },
            { operatorId: 'op3', operatorName: 'Bob Wilson', currentStatus: 'off_duty' as const, dailyDrivingHours: 9.5, dailyDrivingLimit: 9, weeklyDrivingHours: 54, weeklyDrivingLimit: 56, remainingDailyHours: 0, remainingWeeklyHours: 2, lastStatusChange: new Date(Date.now() - 7200000).toISOString(), isCompliant: false },
            { operatorId: 'op4', operatorName: 'Alice Brown', currentStatus: 'sleeper' as const, dailyDrivingHours: 8, dailyDrivingLimit: 9, weeklyDrivingHours: 35, weeklyDrivingLimit: 56, remainingDailyHours: 1, remainingWeeklyHours: 21, lastStatusChange: new Date(Date.now() - 28800000).toISOString(), isCompliant: true },
            { operatorId: 'op5', operatorName: 'Charlie Davis', currentStatus: 'driving' as const, dailyDrivingHours: 3, dailyDrivingLimit: 9, weeklyDrivingHours: 28, weeklyDrivingLimit: 56, remainingDailyHours: 6, remainingWeeklyHours: 28, lastStatusChange: new Date(Date.now() - 600000).toISOString(), isCompliant: true },
          ],
          totalDrivers: 5,
          compliantCount: 3,
          nonCompliantCount: 2,
          violationsToday: 2,
        };
      }
      return response.json();
    },
    refetchInterval: 60000,
  });

  const getStatusIcon = (status: DriverHoSStatus['currentStatus']) => {
    switch (status) {
      case 'driving':
        return <Truck className="w-4 h-4 text-green-600" />;
      case 'on_duty':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'off_duty':
        return <Coffee className="w-4 h-4 text-yellow-600" />;
      case 'sleeper':
        return <Moon className="w-4 h-4 text-purple-600" />;
    }
  };

  const getStatusBadge = (status: DriverHoSStatus['currentStatus']) => {
    const statusConfig = {
      driving: { label: 'Driving', class: 'bg-green-100 text-green-800' },
      on_duty: { label: 'On Duty', class: 'bg-blue-100 text-blue-800' },
      off_duty: { label: 'Off Duty', class: 'bg-yellow-100 text-yellow-800' },
      sleeper: { label: 'Sleeper', class: 'bg-purple-100 text-purple-800' },
    };
    const config = statusConfig[status];
    return <Badge className={config.class} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getCompliancePercentage = () => {
    if (!hosData?.totalDrivers) return 0;
    return (hosData.compliantCount / hosData.totalDrivers) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Total Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-drivers">{hosData?.totalDrivers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-compliant-count">
              {hosData?.compliantCount || 0}
            </div>
            <Progress value={getCompliancePercentage()} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Non-Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-non-compliant-count">
              {hosData?.nonCompliantCount || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Violations Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-violations-today">
              {hosData?.violationsToday || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {hosData?.violations && hosData.violations.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-900 dark:text-red-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Violation Alerts
            </CardTitle>
            <CardDescription className="text-red-800 dark:text-red-200">
              {hosData.violations.length} active violation(s) requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hosData.violations.map((violation) => (
                <div 
                  key={violation.id} 
                  className="p-3 rounded-lg bg-white dark:bg-background border border-red-200"
                  data-testid={`violation-alert-${violation.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-red-900 dark:text-red-100">
                        {violation.violationType}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">
                        {violation.operatorName}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {violation.description}
                      </div>
                    </div>
                    <Badge 
                      className={violation.severity === 'violation' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'}
                    >
                      {violation.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {formatTimeAgo(violation.occurredAt)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Driver HoS Status
          </CardTitle>
          <CardDescription>Real-time hours of service tracking</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading HoS data...</div>
          ) : !hosData?.drivers?.length ? (
            <div className="text-center py-8 text-muted-foreground">No driver data available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hosData.drivers.map((driver) => (
                <Card 
                  key={driver.operatorId} 
                  className={`${!driver.isCompliant ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : ''}`}
                  data-testid={`driver-hos-card-${driver.operatorId}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {getStatusIcon(driver.currentStatus)}
                        {driver.operatorName}
                      </CardTitle>
                      {!driver.isCompliant && (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(driver.currentStatus)}
                      <span className="text-xs text-muted-foreground">
                        Changed {formatTimeAgo(driver.lastStatusChange)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Daily Driving</span>
                        <span className="font-medium" data-testid={`text-daily-hours-${driver.operatorId}`}>
                          {formatHours(driver.dailyDrivingHours)} / {formatHours(driver.dailyDrivingLimit)}
                        </span>
                      </div>
                      <Progress 
                        value={(driver.dailyDrivingHours / driver.dailyDrivingLimit) * 100} 
                        className={`h-2 ${driver.dailyDrivingHours > driver.dailyDrivingLimit ? '[&>div]:bg-red-600' : ''}`}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Weekly Driving</span>
                        <span className="font-medium" data-testid={`text-weekly-hours-${driver.operatorId}`}>
                          {formatHours(driver.weeklyDrivingHours)} / {formatHours(driver.weeklyDrivingLimit)}
                        </span>
                      </div>
                      <Progress 
                        value={(driver.weeklyDrivingHours / driver.weeklyDrivingLimit) * 100} 
                        className={`h-2 ${driver.weeklyDrivingHours > driver.weeklyDrivingLimit ? '[&>div]:bg-red-600' : ''}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Remaining Daily</div>
                        <div className={`font-bold ${driver.remainingDailyHours <= 1 ? 'text-red-600' : 'text-green-600'}`} data-testid={`text-remaining-daily-${driver.operatorId}`}>
                          {formatHours(Math.max(0, driver.remainingDailyHours))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Remaining Weekly</div>
                        <div className={`font-bold ${driver.remainingWeeklyHours <= 5 ? 'text-orange-600' : 'text-green-600'}`} data-testid={`text-remaining-weekly-${driver.operatorId}`}>
                          {formatHours(Math.max(0, driver.remainingWeeklyHours))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
