import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectItem } from '@/components/ui/native-select';
import { Activity, AlertTriangle, Award, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface DriverBehavior {
  operatorId: string;
  operatorName: string;
  safetyScore: number;
  speedingEvents: number;
  harshBrakingEvents: number;
  harshAccelerationEvents: number;
  sharpCorneringEvents: number;
  totalEvents: number;
  milesDrivern: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface FleetBehaviorData {
  drivers: DriverBehavior[];
  fleetAverageSafetyScore: number;
  highRiskDriverCount: number;
  totalEventsToday: number;
  behaviorBreakdown: {
    speeding: number;
    harshBraking: number;
    harshAcceleration: number;
    sharpCornering: number;
  };
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export function DriverBehaviorTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('7d');
  const [selectedOperator, setSelectedOperator] = useState('all');

  const { data: behaviorData, isLoading, isError: isBehaviorError } = useQuery<FleetBehaviorData>({
    queryKey: ['/api/enterprise/driver-behavior/fleet', dateRange, selectedOperator],
    queryFn: async () => {
      const params = new URLSearchParams({ dateRange, operator: selectedOperator });
      const response = await fetch(`/api/enterprise/driver-behavior/fleet?${params}`);
      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.warn('[DEV] Driver behavior API unavailable, using demo data');
          return {
            drivers: [
              { operatorId: 'op1', operatorName: 'John Smith', safetyScore: 95, speedingEvents: 2, harshBrakingEvents: 1, harshAccelerationEvents: 0, sharpCorneringEvents: 1, totalEvents: 4, milesDrivern: 1250, riskLevel: 'low' as const },
              { operatorId: 'op2', operatorName: 'Jane Doe', safetyScore: 88, speedingEvents: 5, harshBrakingEvents: 3, harshAccelerationEvents: 2, sharpCorneringEvents: 4, totalEvents: 14, milesDrivern: 980, riskLevel: 'medium' as const },
              { operatorId: 'op3', operatorName: 'Bob Wilson', safetyScore: 72, speedingEvents: 12, harshBrakingEvents: 8, harshAccelerationEvents: 5, sharpCorneringEvents: 6, totalEvents: 31, milesDrivern: 1100, riskLevel: 'high' as const },
              { operatorId: 'op4', operatorName: 'Alice Brown', safetyScore: 92, speedingEvents: 3, harshBrakingEvents: 2, harshAccelerationEvents: 1, sharpCorneringEvents: 2, totalEvents: 8, milesDrivern: 890, riskLevel: 'low' as const },
              { operatorId: 'op5', operatorName: 'Charlie Davis', safetyScore: 85, speedingEvents: 6, harshBrakingEvents: 4, harshAccelerationEvents: 3, sharpCorneringEvents: 3, totalEvents: 16, milesDrivern: 1050, riskLevel: 'medium' as const },
            ],
            fleetAverageSafetyScore: 86.4,
            highRiskDriverCount: 1,
            totalEventsToday: 12,
            behaviorBreakdown: {
              speeding: 28,
              harshBraking: 18,
              harshAcceleration: 11,
              sharpCornering: 16,
            },
          };
        }
        toast({ title: t('fleet.behavior.toast.loadFailed'), description: t('fleet.behavior.toast.loadFailedDesc'), variant: 'destructive' });
        throw new Error(t('fleet.behavior.toast.loadFailed'));
      }
      return response.json();
    },
  });

  const pieChartData = behaviorData ? [
    { name: t('fleet.behavior.speeding'), value: behaviorData.behaviorBreakdown.speeding },
    { name: t('fleet.behavior.harshBraking'), value: behaviorData.behaviorBreakdown.harshBraking },
    { name: t('fleet.behavior.harshAcceleration'), value: behaviorData.behaviorBreakdown.harshAcceleration },
    { name: t('fleet.behavior.sharpCornering'), value: behaviorData.behaviorBreakdown.sharpCornering },
  ] : [];

  const getRiskBadge = (riskLevel: DriverBehavior['riskLevel']) => {
    switch (riskLevel) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800" data-testid="badge-risk-low">{t('fleet.behavior.lowRisk')}</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800" data-testid="badge-risk-medium">{t('fleet.behavior.mediumRisk')}</Badge>;
      case 'high':
        return <Badge className="bg-red-100 text-red-800" data-testid="badge-risk-high">{t('fleet.behavior.highRisk')}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const topPerformers = behaviorData?.drivers
    .slice()
    .sort((a, b) => b.safetyScore - a.safetyScore)
    .slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5" />
          {t('fleet.behavior.title')}
        </h2>
        <div className="flex gap-3">
          <NativeSelect value={dateRange} onValueChange={setDateRange} className="w-[140px]" data-testid="select-date-range">
            <NativeSelectItem value="1d">{t('fleet.common.today')}</NativeSelectItem>
            <NativeSelectItem value="7d">{t('fleet.common.last7Days')}</NativeSelectItem>
            <NativeSelectItem value="30d">{t('fleet.common.last30Days')}</NativeSelectItem>
            <NativeSelectItem value="90d">{t('fleet.common.last90Days')}</NativeSelectItem>
          </NativeSelect>
          <NativeSelect value={selectedOperator} onValueChange={setSelectedOperator} className="w-[160px]" placeholder={t('fleet.behavior.allOperators')} data-testid="select-operator-filter">
            <NativeSelectItem value="all">{t('fleet.behavior.allOperators')}</NativeSelectItem>
            {behaviorData?.drivers.map(driver => (
              <NativeSelectItem key={driver.operatorId} value={driver.operatorId}>
                {driver.operatorName}
              </NativeSelectItem>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              {t('fleet.behavior.avgSafetyScore')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(behaviorData?.fleetAverageSafetyScore || 0)}`} data-testid="text-avg-safety-score">
              {behaviorData?.fleetAverageSafetyScore?.toFixed(1) || '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('fleet.behavior.fleetWideAverage')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              {t('fleet.behavior.highRiskDrivers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600" data-testid="text-high-risk-count">
              {behaviorData?.highRiskDriverCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('fleet.behavior.requireAttention')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              {t('fleet.behavior.totalEventsToday')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600" data-testid="text-total-events">
              {behaviorData?.totalEventsToday || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('fleet.behavior.safetyEventsRecorded')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              {t('fleet.behavior.driverLeaderboard')}
            </CardTitle>
            <CardDescription>{t('fleet.behavior.topPerformers')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t('fleet.common.loading')}</div>
            ) : isBehaviorError && !import.meta.env.DEV ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('fleet.common.unableToLoad')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topPerformers.map((driver, index) => (
                  <div 
                    key={driver.operatorId} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`leaderboard-item-${driver.operatorId}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{driver.operatorName}</div>
                        <div className="text-xs text-muted-foreground">{driver.totalEvents} events</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(driver.safetyScore)}`}>
                        {driver.safetyScore}
                      </div>
                      {getRiskBadge(driver.riskLevel)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('fleet.behavior.behaviorBreakdown')}</CardTitle>
            <CardDescription>{t('fleet.behavior.eventTypesDistribution')}</CardDescription>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    data-testid="chart-behavior-breakdown"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                {t('fleet.behavior.noDataAvailable')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('fleet.behavior.allDrivers')}</CardTitle>
          <CardDescription>{t('fleet.behavior.completeOverview')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('fleet.common.loading')}</div>
          ) : isBehaviorError && !import.meta.env.DEV ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('fleet.common.unableToLoad')}</p>
              <p className="text-sm text-muted-foreground mt-2">{t('fleet.common.tryRefreshing')}</p>
            </div>
          ) : !behaviorData?.drivers?.length ? (
            <div className="text-center py-8 text-muted-foreground">{t('fleet.behavior.noDataAvailable')}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fleet.behavior.driver')}</TableHead>
                    <TableHead>{t('fleet.behavior.safetyScore')}</TableHead>
                    <TableHead>{t('fleet.behavior.speeding')}</TableHead>
                    <TableHead>{t('fleet.behavior.harshBraking')}</TableHead>
                    <TableHead>{t('fleet.behavior.harshAccel')}</TableHead>
                    <TableHead>{t('fleet.behavior.sharpCornering')}</TableHead>
                    <TableHead>{t('fleet.behavior.totalEvents')}</TableHead>
                    <TableHead>{t('fleet.behavior.riskLevel')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {behaviorData.drivers.map((driver) => (
                    <TableRow key={driver.operatorId} data-testid={`row-driver-${driver.operatorId}`}>
                      <TableCell className="font-medium">{driver.operatorName}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${getScoreColor(driver.safetyScore)}`}>
                          {driver.safetyScore}
                        </span>
                      </TableCell>
                      <TableCell>{driver.speedingEvents}</TableCell>
                      <TableCell>{driver.harshBrakingEvents}</TableCell>
                      <TableCell>{driver.harshAccelerationEvents}</TableCell>
                      <TableCell>{driver.sharpCorneringEvents}</TableCell>
                      <TableCell>{driver.totalEvents}</TableCell>
                      <TableCell>{getRiskBadge(driver.riskLevel)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
