import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NativeSelect, NativeSelectItem } from '@/components/ui/native-select';
import { 
  User, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Shield,
  Gauge,
  Clock,
  AlertTriangle,
  Award,
  Activity,
  Target,
  Truck
} from 'lucide-react';
import { format } from 'date-fns';
import type { DriverPerformanceScore as BaseDriverPerformanceScore } from '@shared/schema';

interface DriverPerformanceScoreDisplay extends Omit<BaseDriverPerformanceScore, 'periodStart' | 'periodEnd' | 'createdAt'> {
  operatorName?: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  createdAt: string | Date;
}

const demoPerformanceScores: DriverPerformanceScoreDisplay[] = [
  {
    id: 'dp1',
    userId: 'u1',
    operatorId: 'op1',
    operatorName: 'John Smith',
    periodStart: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    periodEnd: new Date().toISOString(),
    periodType: 'weekly',
    overallScore: 92,
    safetyScore: 95,
    efficiencyScore: 88,
    complianceScore: 94,
    punctualityScore: 91,
    vehicleCareScore: 90,
    totalMilesDriven: 2450,
    totalHoursDriven: 42,
    totalTrips: 18,
    incidentCount: 0,
    harshBrakingEvents: 2,
    speedingEvents: 1,
    hosViolations: 0,
    lateDeliveries: 1,
    missedInspections: 0,
    scoreTrend: 'improving',
    previousScore: 88,
    notes: 'Excellent week, only 1 late delivery due to traffic',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dp2',
    userId: 'u1',
    operatorId: 'op2',
    operatorName: 'Jane Doe',
    periodStart: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    periodEnd: new Date().toISOString(),
    periodType: 'weekly',
    overallScore: 85,
    safetyScore: 82,
    efficiencyScore: 90,
    complianceScore: 80,
    punctualityScore: 88,
    vehicleCareScore: 85,
    totalMilesDriven: 2890,
    totalHoursDriven: 48,
    totalTrips: 22,
    incidentCount: 1,
    harshBrakingEvents: 5,
    speedingEvents: 3,
    hosViolations: 1,
    lateDeliveries: 2,
    missedInspections: 0,
    scoreTrend: 'declining',
    previousScore: 89,
    notes: 'HoS violation needs to be addressed, too many speeding events',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dp3',
    userId: 'u1',
    operatorId: 'op3',
    operatorName: 'Bob Wilson',
    periodStart: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    periodEnd: new Date().toISOString(),
    periodType: 'weekly',
    overallScore: 78,
    safetyScore: 75,
    efficiencyScore: 82,
    complianceScore: 70,
    punctualityScore: 85,
    vehicleCareScore: 78,
    totalMilesDriven: 1980,
    totalHoursDriven: 38,
    totalTrips: 15,
    incidentCount: 2,
    harshBrakingEvents: 8,
    speedingEvents: 6,
    hosViolations: 2,
    lateDeliveries: 1,
    missedInspections: 1,
    scoreTrend: 'declining',
    previousScore: 84,
    notes: 'Needs coaching on safety practices and HoS compliance',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dp4',
    userId: 'u1',
    operatorId: 'op4',
    operatorName: 'Alice Brown',
    periodStart: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    periodEnd: new Date().toISOString(),
    periodType: 'weekly',
    overallScore: 96,
    safetyScore: 98,
    efficiencyScore: 94,
    complianceScore: 97,
    punctualityScore: 95,
    vehicleCareScore: 96,
    totalMilesDriven: 2200,
    totalHoursDriven: 40,
    totalTrips: 20,
    incidentCount: 0,
    harshBrakingEvents: 0,
    speedingEvents: 0,
    hosViolations: 0,
    lateDeliveries: 0,
    missedInspections: 0,
    scoreTrend: 'stable',
    previousScore: 95,
    notes: 'Top performer, consistently excellent driving record',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dp5',
    userId: 'u1',
    operatorId: 'op5',
    operatorName: 'Charlie Davis',
    periodStart: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    periodEnd: new Date().toISOString(),
    periodType: 'weekly',
    overallScore: 88,
    safetyScore: 90,
    efficiencyScore: 85,
    complianceScore: 88,
    punctualityScore: 90,
    vehicleCareScore: 87,
    totalMilesDriven: 2100,
    totalHoursDriven: 39,
    totalTrips: 17,
    incidentCount: 0,
    harshBrakingEvents: 3,
    speedingEvents: 2,
    hosViolations: 0,
    lateDeliveries: 1,
    missedInspections: 0,
    scoreTrend: 'improving',
    previousScore: 85,
    notes: 'Good progress this week',
    createdAt: new Date().toISOString(),
  },
];

export function DriverPerformanceTab() {
  const { t } = useTranslation();
  const [periodFilter, setPeriodFilter] = useState('weekly');
  const [sortBy, setSortBy] = useState('score');

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['/api/fleet/driver-performance', periodFilter],
    queryFn: async () => {
      const response = await fetch(`/api/fleet/driver-performance?period=${periodFilter}`);
      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.warn('[DEV] Driver performance API unavailable, using demo data');
          return demoPerformanceScores;
        }
        throw new Error('Failed to load driver performance data');
      }
      return response.json();
    },
    refetchInterval: 60000,
  });

  const scores: DriverPerformanceScore[] = performanceData || demoPerformanceScores;

  const sortedScores = [...scores].sort((a, b) => {
    if (sortBy === 'score') return b.overallScore - a.overallScore;
    if (sortBy === 'name') return (a.operatorName || '').localeCompare(b.operatorName || '');
    if (sortBy === 'miles') return (b.totalMilesDriven || 0) - (a.totalMilesDriven || 0);
    return 0;
  });

  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length)
    : 0;

  const topPerformers = scores.filter(s => s.overallScore >= 90).length;
  const needsAttention = scores.filter(s => s.overallScore < 80).length;
  const totalIncidents = scores.reduce((sum, s) => sum + (s.incidentCount || 0), 0);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 80) return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>;
  };

  const getTrendIcon = (trend: DriverPerformanceScore['scoreTrend']) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getProgressColor = (score: number | null) => {
    if (!score) return 'bg-gray-200';
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-blue-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('fleet.driverPerformance.title', 'Driver Performance')}</h2>
          <p className="text-muted-foreground">
            {t('fleet.driverPerformance.description', 'Monitor and analyze driver performance metrics and scores')}
          </p>
        </div>
        <div className="flex gap-2">
          <NativeSelect value={periodFilter} onValueChange={setPeriodFilter} className="w-[130px]">
            <NativeSelectItem value="daily">Daily</NativeSelectItem>
            <NativeSelectItem value="weekly">Weekly</NativeSelectItem>
            <NativeSelectItem value="monthly">Monthly</NativeSelectItem>
          </NativeSelect>
          <NativeSelect value={sortBy} onValueChange={setSortBy} className="w-[130px]">
            <NativeSelectItem value="score">Score</NativeSelectItem>
            <NativeSelectItem value="name">Name</NativeSelectItem>
            <NativeSelectItem value="miles">Miles</NativeSelectItem>
          </NativeSelect>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fleet.driverPerformance.avgScore', 'Fleet Avg Score')}</p>
                <p className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>{averageScore}%</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fleet.driverPerformance.topPerformers', 'Top Performers')}</p>
                <p className="text-2xl font-bold text-green-600">{topPerformers}</p>
              </div>
              <Award className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fleet.driverPerformance.needsAttention', 'Needs Attention')}</p>
                <p className="text-2xl font-bold text-red-600">{needsAttention}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fleet.driverPerformance.incidents', 'Total Incidents')}</p>
                <p className="text-2xl font-bold text-orange-600">{totalIncidents}</p>
              </div>
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>{t('fleet.driverPerformance.driverScores', 'Driver Performance Scores')}</CardTitle>
            <CardDescription>{t('fleet.driverPerformance.driverScoresDesc', 'Individual driver scores and metrics for the selected period')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {sortedScores.map((score, index) => (
                  <Card key={score.id} className={`${score.overallScore < 80 ? 'border-l-4 border-l-red-500' : score.overallScore >= 90 ? 'border-l-4 border-l-green-500' : ''}`}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-sm font-bold">
                              #{index + 1}
                            </div>
                            <User className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold">{score.operatorName}</span>
                            {getScoreBadge(score.overallScore)}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-2xl font-bold ${getScoreColor(score.overallScore)}`}>
                              {score.overallScore}%
                            </span>
                            {getTrendIcon(score.scoreTrend)}
                            {score.previousScore && (
                              <span className="text-sm text-muted-foreground">
                                {score.overallScore > score.previousScore ? '+' : ''}{score.overallScore - score.previousScore}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { label: 'Safety', value: score.safetyScore, icon: Shield },
                            { label: 'Efficiency', value: score.efficiencyScore, icon: Gauge },
                            { label: 'Compliance', value: score.complianceScore, icon: Target },
                            { label: 'Punctuality', value: score.punctualityScore, icon: Clock },
                            { label: 'Vehicle Care', value: score.vehicleCareScore, icon: Truck },
                          ].map(metric => (
                            <div key={metric.label} className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <metric.icon className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{metric.label}</span>
                              </div>
                              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`absolute left-0 top-0 h-full rounded-full ${getProgressColor(metric.value)}`}
                                  style={{ width: `${metric.value || 0}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{metric.value || 0}%</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground bg-slate-50 p-2 rounded">
                          <span>Miles: {score.totalMilesDriven?.toLocaleString() || 0}</span>
                          <span>Hours: {score.totalHoursDriven || 0}h</span>
                          <span>Trips: {score.totalTrips || 0}</span>
                          {(score.harshBrakingEvents || 0) > 0 && (
                            <span className="text-orange-600">Harsh Braking: {score.harshBrakingEvents}</span>
                          )}
                          {(score.speedingEvents || 0) > 0 && (
                            <span className="text-red-600">Speeding: {score.speedingEvents}</span>
                          )}
                        </div>

                        {score.notes && (
                          <p className="text-sm text-muted-foreground italic">{score.notes}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('fleet.driverPerformance.scoreBreakdown', 'Score Categories')}</CardTitle>
            <CardDescription>{t('fleet.driverPerformance.scoreBreakdownDesc', 'How scores are calculated')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { label: 'Safety Score', desc: 'Based on incidents, harsh braking, speeding events', icon: Shield, weight: '25%' },
                { label: 'Efficiency Score', desc: 'Fuel economy, route adherence, idle time', icon: Gauge, weight: '20%' },
                { label: 'Compliance Score', desc: 'HoS compliance, inspection completion, documentation', icon: Target, weight: '20%' },
                { label: 'Punctuality Score', desc: 'On-time deliveries, schedule adherence', icon: Clock, weight: '20%' },
                { label: 'Vehicle Care Score', desc: 'Pre-trip inspections, defect reporting, cleanliness', icon: Truck, weight: '15%' },
              ].map(cat => (
                <div key={cat.label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <cat.icon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{cat.label}</span>
                      <Badge variant="outline">{cat.weight}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{cat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Score Ranges</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">90-100: Excellent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">80-89: Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">70-79: Fair</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">Below 70: Needs Improvement</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
