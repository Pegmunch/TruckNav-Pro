import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NativeSelect, NativeSelectItem } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Fuel,
  Gauge,
  Settings,
  Calendar,
  Activity,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import type { VehicleHealthScore as BaseVehicleHealthScore } from '@shared/schema';

interface VehicleHealthScoreDisplay extends Omit<BaseVehicleHealthScore, 'periodStart' | 'periodEnd' | 'createdAt'> {
  vehicleName?: string;
  registrationNumber?: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  createdAt: string | Date;
}

const demoVehicleHealthScores: VehicleHealthScoreDisplay[] = [
  {
    id: 'vh1',
    userId: 'u1',
    vehicleId: 'v1',
    vehicleName: 'Volvo FH16 #101',
    registrationNumber: 'AB12 CDE',
    periodStart: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    periodEnd: new Date().toISOString(),
    periodType: 'weekly',
    overallScore: 94,
    mechanicalScore: 96,
    safetySystemsScore: 95,
    tiresScore: 92,
    fluidsScore: 94,
    bodyScore: 93,
    totalMiles: 3200,
    fuelEfficiency: 7.8,
    averageFuelEfficiency: 7.5,
    serviceOverdue: false,
    daysSinceService: 12,
    defectsReported: 1,
    defectsResolved: 1,
    vehicleAgeYears: 2.5,
    totalOdometer: 245890,
    expectedLifespanPercent: 25,
    scoreTrend: 'stable',
    previousScore: 93,
    recommendedActions: 'Schedule tire rotation next week',
    urgentIssues: null,
    notes: 'Well maintained vehicle, no concerns',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vh2',
    userId: 'u1',
    vehicleId: 'v2',
    vehicleName: 'Mercedes Actros #102',
    registrationNumber: 'FG34 HIJ',
    periodStart: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    periodEnd: new Date().toISOString(),
    periodType: 'weekly',
    overallScore: 82,
    mechanicalScore: 85,
    safetySystemsScore: 88,
    tiresScore: 75,
    fluidsScore: 82,
    bodyScore: 80,
    totalMiles: 2890,
    fuelEfficiency: 7.2,
    averageFuelEfficiency: 7.5,
    serviceOverdue: false,
    daysSinceService: 28,
    defectsReported: 3,
    defectsResolved: 2,
    vehicleAgeYears: 4.0,
    totalOdometer: 389456,
    expectedLifespanPercent: 45,
    scoreTrend: 'declining',
    previousScore: 86,
    recommendedActions: 'Replace front tires, schedule brake inspection',
    urgentIssues: 'Front tire tread below minimum threshold',
    notes: 'Needs tire replacement within 2 weeks',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vh3',
    userId: 'u1',
    vehicleId: 'v3',
    vehicleName: 'DAF XF #103',
    registrationNumber: 'KL56 MNO',
    periodStart: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    periodEnd: new Date().toISOString(),
    periodType: 'weekly',
    overallScore: 68,
    mechanicalScore: 65,
    safetySystemsScore: 70,
    tiresScore: 72,
    fluidsScore: 68,
    bodyScore: 65,
    totalMiles: 1800,
    fuelEfficiency: 6.5,
    averageFuelEfficiency: 7.5,
    serviceOverdue: true,
    daysSinceService: 95,
    defectsReported: 5,
    defectsResolved: 2,
    vehicleAgeYears: 6.0,
    totalOdometer: 512789,
    expectedLifespanPercent: 68,
    scoreTrend: 'declining',
    previousScore: 74,
    recommendedActions: 'Urgent service required, engine diagnostics needed',
    urgentIssues: 'Service overdue by 35 days, 3 unresolved defects',
    notes: 'Vehicle requires immediate maintenance attention',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vh4',
    userId: 'u1',
    vehicleId: 'v4',
    vehicleName: 'Scania R500 #104',
    registrationNumber: 'PQ78 RST',
    periodStart: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    periodEnd: new Date().toISOString(),
    periodType: 'weekly',
    overallScore: 88,
    mechanicalScore: 90,
    safetySystemsScore: 92,
    tiresScore: 85,
    fluidsScore: 88,
    bodyScore: 85,
    totalMiles: 2400,
    fuelEfficiency: 7.6,
    averageFuelEfficiency: 7.5,
    serviceOverdue: false,
    daysSinceService: 45,
    defectsReported: 2,
    defectsResolved: 2,
    vehicleAgeYears: 3.0,
    totalOdometer: 298456,
    expectedLifespanPercent: 35,
    scoreTrend: 'improving',
    previousScore: 85,
    recommendedActions: null,
    urgentIssues: null,
    notes: 'Good condition, regular maintenance performed',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vh5',
    userId: 'u1',
    vehicleId: 'v5',
    vehicleName: 'MAN TGX #105',
    registrationNumber: 'UV90 WXY',
    periodStart: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    periodEnd: new Date().toISOString(),
    periodType: 'weekly',
    overallScore: 91,
    mechanicalScore: 92,
    safetySystemsScore: 94,
    tiresScore: 88,
    fluidsScore: 90,
    bodyScore: 91,
    totalMiles: 2100,
    fuelEfficiency: 7.4,
    averageFuelEfficiency: 7.5,
    serviceOverdue: false,
    daysSinceService: 20,
    defectsReported: 0,
    defectsResolved: 0,
    vehicleAgeYears: 1.5,
    totalOdometer: 165000,
    expectedLifespanPercent: 18,
    scoreTrend: 'stable',
    previousScore: 90,
    recommendedActions: null,
    urgentIssues: null,
    notes: 'Newest vehicle in fleet, excellent condition',
    createdAt: new Date().toISOString(),
  },
];

export function VehicleHealthTab() {
  const { t } = useTranslation();
  const [periodFilter, setPeriodFilter] = useState('weekly');
  const [sortBy, setSortBy] = useState('score');

  const { data: healthData, isLoading } = useQuery({
    queryKey: ['/api/fleet/vehicle-health', periodFilter],
    queryFn: async () => {
      const response = await fetch(`/api/fleet/vehicle-health?period=${periodFilter}`);
      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.warn('[DEV] Vehicle health API unavailable, using demo data');
          return demoVehicleHealthScores;
        }
        throw new Error('Failed to load vehicle health data');
      }
      return response.json();
    },
    refetchInterval: 60000,
  });

  const scores: VehicleHealthScore[] = healthData || demoVehicleHealthScores;

  const sortedScores = [...scores].sort((a, b) => {
    if (sortBy === 'score') return b.overallScore - a.overallScore;
    if (sortBy === 'name') return (a.vehicleName || '').localeCompare(b.vehicleName || '');
    if (sortBy === 'miles') return (b.totalMiles || 0) - (a.totalMiles || 0);
    if (sortBy === 'age') return (b.vehicleAgeYears || 0) - (a.vehicleAgeYears || 0);
    return 0;
  });

  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length)
    : 0;

  const healthyVehicles = scores.filter(s => s.overallScore >= 85).length;
  const needsAttention = scores.filter(s => s.overallScore < 75).length;
  const serviceOverdue = scores.filter(s => s.serviceOverdue).length;

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
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
  };

  const getTrendIcon = (trend: VehicleHealthScore['scoreTrend']) => {
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
          <h2 className="text-2xl font-bold">{t('fleet.vehicleHealth.title', 'Vehicle Health')}</h2>
          <p className="text-muted-foreground">
            {t('fleet.vehicleHealth.description', 'Monitor vehicle condition, maintenance status, and health metrics')}
          </p>
        </div>
        <div className="flex gap-2">
          <NativeSelect value={periodFilter} onValueChange={setPeriodFilter} className="w-[130px]">
            <NativeSelectItem value="daily">Daily</NativeSelectItem>
            <NativeSelectItem value="weekly">Weekly</NativeSelectItem>
            <NativeSelectItem value="monthly">Monthly</NativeSelectItem>
          </NativeSelect>
          <NativeSelect value={sortBy} onValueChange={setSortBy} className="w-[130px]">
            <NativeSelectItem value="score">Health Score</NativeSelectItem>
            <NativeSelectItem value="name">Vehicle Name</NativeSelectItem>
            <NativeSelectItem value="miles">Miles</NativeSelectItem>
            <NativeSelectItem value="age">Age</NativeSelectItem>
          </NativeSelect>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fleet.vehicleHealth.avgScore', 'Fleet Avg Health')}</p>
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
                <p className="text-sm text-muted-foreground">{t('fleet.vehicleHealth.healthy', 'Healthy Vehicles')}</p>
                <p className="text-2xl font-bold text-green-600">{healthyVehicles}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fleet.vehicleHealth.needsAttention', 'Needs Attention')}</p>
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
                <p className="text-sm text-muted-foreground">{t('fleet.vehicleHealth.serviceOverdue', 'Service Overdue')}</p>
                <p className="text-2xl font-bold text-orange-600">{serviceOverdue}</p>
              </div>
              <Wrench className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>{t('fleet.vehicleHealth.vehicleScores', 'Vehicle Health Scores')}</CardTitle>
            <CardDescription>{t('fleet.vehicleHealth.vehicleScoresDesc', 'Individual vehicle health metrics for the selected period')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {sortedScores.map(score => (
                  <Card key={score.id} className={`${score.overallScore < 75 ? 'border-l-4 border-l-red-500' : score.overallScore >= 90 ? 'border-l-4 border-l-green-500' : ''}`}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Truck className="w-5 h-5 text-blue-600" />
                            <div>
                              <span className="font-semibold">{score.vehicleName}</span>
                              {score.registrationNumber && (
                                <span className="text-sm text-muted-foreground ml-2">({score.registrationNumber})</span>
                              )}
                            </div>
                            {getScoreBadge(score.overallScore)}
                            {score.serviceOverdue && (
                              <Badge className="bg-red-100 text-red-800">Service Overdue</Badge>
                            )}
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
                            { label: 'Mechanical', value: score.mechanicalScore, icon: Settings },
                            { label: 'Safety', value: score.safetySystemsScore, icon: Shield },
                            { label: 'Tires', value: score.tiresScore, icon: Truck },
                            { label: 'Fluids', value: score.fluidsScore, icon: Fuel },
                            { label: 'Body', value: score.bodyScore, icon: Truck },
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
                          <span>Odometer: {score.totalOdometer?.toLocaleString() || 0} mi</span>
                          <span>Age: {score.vehicleAgeYears || 0} yrs</span>
                          <span>Fuel: {score.fuelEfficiency || 0} mpg</span>
                          <span>Days Since Service: {score.daysSinceService || 0}</span>
                          {(score.defectsReported || 0) > 0 && (
                            <span className={score.defectsResolved === score.defectsReported ? 'text-green-600' : 'text-orange-600'}>
                              Defects: {score.defectsResolved}/{score.defectsReported} resolved
                            </span>
                          )}
                        </div>

                        {score.urgentIssues && (
                          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                            <AlertTriangle className="w-4 h-4 mt-0.5" />
                            <span>{score.urgentIssues}</span>
                          </div>
                        )}

                        {score.recommendedActions && (
                          <div className="flex items-start gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            <Wrench className="w-4 h-4 mt-0.5" />
                            <span>{score.recommendedActions}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('fleet.vehicleHealth.scoreCategories', 'Health Categories')}</CardTitle>
              <CardDescription>{t('fleet.vehicleHealth.scoreCategoriesDesc', 'What we monitor')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Mechanical', desc: 'Engine, transmission, suspension', icon: Settings, weight: '25%' },
                { label: 'Safety Systems', desc: 'Brakes, lights, signals, mirrors', icon: Shield, weight: '25%' },
                { label: 'Tires', desc: 'Tread depth, pressure, condition', icon: Truck, weight: '20%' },
                { label: 'Fluids', desc: 'Oil, coolant, brake fluid levels', icon: Fuel, weight: '15%' },
                { label: 'Body', desc: 'Exterior condition, cleanliness', icon: Truck, weight: '15%' },
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('fleet.vehicleHealth.serviceSchedule', 'Upcoming Service')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scores
                  .filter(s => !s.serviceOverdue && s.daysSinceService && s.daysSinceService > 30)
                  .slice(0, 3)
                  .map(vehicle => (
                    <div key={vehicle.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">{vehicle.vehicleName}</span>
                      </div>
                      <Badge variant="outline">
                        {60 - (vehicle.daysSinceService || 0)} days
                      </Badge>
                    </div>
                  ))}
                {scores.filter(s => !s.serviceOverdue).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming services scheduled
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
