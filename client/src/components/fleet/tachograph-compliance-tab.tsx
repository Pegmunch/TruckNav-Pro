import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect, NativeSelectItem } from '@/components/ui/native-select';
import { AlertTriangle, Plus, Edit, Trash2, TrendingUp, TrendingDown, Clock, FileText, Download, Award, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TachographInfringement, Operator } from '@shared/schema';
import { format } from 'date-fns';

const INFRINGEMENT_TYPES = [
  { value: 'driving_daily_exceeded', label: 'Daily Driving Exceeded (9hr/10hr)', category: 'Driving Time', points: 15 },
  { value: 'driving_continuous_exceeded', label: 'Continuous Driving Exceeded (4.5hr)', category: 'Driving Time', points: 10 },
  { value: 'driving_weekly_exceeded', label: 'Weekly Driving Exceeded (56hr)', category: 'Driving Time', points: 20 },
  { value: 'driving_fortnightly_exceeded', label: 'Fortnightly Driving Exceeded (90hr)', category: 'Driving Time', points: 25 },
  { value: 'break_insufficient', label: 'Insufficient Break (<45min)', category: 'Break', points: 8 },
  { value: 'break_timing_wrong', label: 'Break at Wrong Time', category: 'Break', points: 5 },
  { value: 'daily_rest_insufficient', label: 'Insufficient Daily Rest (<11hr)', category: 'Rest', points: 12 },
  { value: 'weekly_rest_insufficient', label: 'Insufficient Weekly Rest (<45hr)', category: 'Rest', points: 18 },
  { value: 'compensation_rest_missed', label: 'Missed Compensation Rest', category: 'Rest', points: 15 },
  { value: 'card_missing_entry', label: 'Missing Card Entries', category: 'Card/Recording', points: 8 },
  { value: 'card_wrong_mode', label: 'Wrong Activity Mode', category: 'Card/Recording', points: 5 },
  { value: 'card_not_inserted', label: 'Driving Without Card', category: 'Card/Recording', points: 20 },
  { value: 'card_used_multiple', label: 'Fraudulent Multiple Cards', category: 'Card/Recording', points: 50 },
  { value: 'record_manipulation', label: 'Record Tampering', category: 'Card/Recording', points: 50 },
  { value: 'vehicle_unit_fault', label: 'Unreported Vehicle Unit Fault', category: 'Other', points: 10 },
  { value: 'printout_missing', label: 'Missing Required Printouts', category: 'Other', points: 5 },
  { value: 'other', label: 'Other Infringement', category: 'Other', points: 5 },
];

const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { value: 'serious', label: 'Serious', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'very_serious', label: 'Very Serious', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
];

export function TachographComplianceTab() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedInfringement, setSelectedInfringement] = useState<TachographInfringement | null>(null);
  const [filterOperator, setFilterOperator] = useState<string>('all');

  const { data: infringements = [], isLoading } = useQuery<TachographInfringement[]>({
    queryKey: ['/api/fleet/tachograph-infringements'],
  });

  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ['/api/fleet/operators'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/fleet/tachograph-infringements', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/tachograph-infringements'] });
      setIsAddOpen(false);
      toast({ title: 'Infringement recorded', description: 'The tachograph infringement has been added.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to record infringement.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest('PUT', `/api/fleet/tachograph-infringements/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/tachograph-infringements'] });
      setIsEditOpen(false);
      setSelectedInfringement(null);
      toast({ title: 'Infringement updated', description: 'The infringement record has been updated.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update infringement.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/fleet/tachograph-infringements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/tachograph-infringements'] });
      toast({ title: 'Infringement deleted', description: 'The infringement record has been removed.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete infringement.', variant: 'destructive' });
    },
  });

  const filteredInfringements = useMemo(() => {
    if (filterOperator === 'all') return infringements;
    return infringements.filter(inf => inf.operatorId === filterOperator);
  }, [infringements, filterOperator]);

  const driverScores = useMemo(() => {
    const scores: Record<string, { score: number; points: number; count: number }> = {};
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    operators.forEach(op => {
      scores[op.id] = { score: 100, points: 0, count: 0 };
    });

    infringements
      .filter(inf => new Date(inf.infringementDate) >= twelveMonthsAgo)
      .forEach(inf => {
        if (!scores[inf.operatorId]) {
          scores[inf.operatorId] = { score: 100, points: 0, count: 0 };
        }
        scores[inf.operatorId].points += inf.pointsDeducted || 0;
        scores[inf.operatorId].count += 1;
      });

    Object.keys(scores).forEach(id => {
      scores[id].score = Math.max(0, 100 - scores[id].points);
    });

    return scores;
  }, [operators, infringements]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    if (score >= 40) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  };

  const getOperatorName = (operatorId: string) => {
    const op = operators.find(o => o.id === operatorId);
    return op ? `${op.firstName} ${op.lastName}` : 'Unknown';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Driver', 'Type', 'Severity', 'Points', 'Fine', 'Description'];
    const rows = filteredInfringements.map(inf => [
      format(new Date(inf.infringementDate), 'yyyy-MM-dd'),
      getOperatorName(inf.operatorId),
      INFRINGEMENT_TYPES.find(t => t.value === inf.infringementType)?.label || inf.infringementType,
      inf.severity,
      inf.pointsDeducted,
      inf.fineAmount || '-',
      inf.description || '-',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tachograph-infringements-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalInfringements = infringements.length;
  const seriousCount = infringements.filter(i => i.severity === 'serious' || i.severity === 'very_serious').length;
  const totalFines = infringements.reduce((sum, i) => sum + (parseFloat(i.fineAmount?.toString() || '0') || 0), 0);
  const averageScore = operators.length > 0
    ? Math.round(Object.values(driverScores).reduce((sum, s) => sum + s.score, 0) / operators.length)
    : 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fleet Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(averageScore)}`}>
              {averageScore}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average driver score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Infringements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalInfringements}</div>
            <p className="text-xs text-muted-foreground mt-1">Rolling 12 months</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Serious/Very Serious</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{seriousCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">£{totalFines.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All recorded fines</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Driver Compliance Scores
            </CardTitle>
            <CardDescription>Rolling 12-month compliance ranking</CardDescription>
          </CardHeader>
          <CardContent>
            {operators.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No operators registered</div>
            ) : (
              <div className="space-y-3">
                {operators
                  .sort((a, b) => (driverScores[b.id]?.score || 100) - (driverScores[a.id]?.score || 100))
                  .map((op, index) => {
                    const score = driverScores[op.id] || { score: 100, points: 0, count: 0 };
                    return (
                      <div key={op.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{op.firstName} {op.lastName}</div>
                            <div className="text-xs text-muted-foreground">
                              {score.count} infringement{score.count !== 1 ? 's' : ''} ({score.points} pts)
                            </div>
                          </div>
                        </div>
                        <Badge className={getScoreBadge(score.score)}>
                          {score.score}%
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recent Infringements
            </CardTitle>
            <CardDescription>Latest recorded violations</CardDescription>
          </CardHeader>
          <CardContent>
            {infringements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>No infringements recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {infringements.slice(0, 5).map(inf => (
                  <div key={inf.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{getOperatorName(inf.operatorId)}</div>
                      <div className="text-sm text-muted-foreground">
                        {INFRINGEMENT_TYPES.find(t => t.value === inf.infringementType)?.label || inf.infringementType}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(inf.infringementDate), 'dd MMM yyyy')}
                      </div>
                    </div>
                    <Badge className={SEVERITY_OPTIONS.find(s => s.value === inf.severity)?.color}>
                      {inf.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Infringement Records
            </CardTitle>
            <CardDescription>Complete tachograph violation history</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <NativeSelect value={filterOperator} onValueChange={setFilterOperator} className="w-48">
              <NativeSelectItem value="all">All Drivers</NativeSelectItem>
              {operators.map(op => (
                <NativeSelectItem key={op.id} value={op.id}>
                  {op.firstName} {op.lastName}
                </NativeSelectItem>
              ))}
            </NativeSelect>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Record Infringement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading infringements...</div>
          ) : filteredInfringements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No infringements recorded</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Infringement Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Fine</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInfringements.map(inf => (
                    <TableRow key={inf.id}>
                      <TableCell className="font-medium">
                        {format(new Date(inf.infringementDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>{getOperatorName(inf.operatorId)}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {INFRINGEMENT_TYPES.find(t => t.value === inf.infringementType)?.label || inf.infringementType}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={SEVERITY_OPTIONS.find(s => s.value === inf.severity)?.color}>
                          {inf.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-red-600">-{inf.pointsDeducted}</span>
                      </TableCell>
                      <TableCell>
                        {inf.fineAmount ? `£${parseFloat(inf.fineAmount.toString()).toFixed(2)}` : '-'}
                        {inf.finePaid && <Badge className="ml-2 bg-green-100 text-green-800">Paid</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{inf.reportedBy || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedInfringement(inf);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this infringement record?')) {
                              deleteMutation.mutate(inf.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InfringementDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        operators={operators}
        isPending={createMutation.isPending}
      />

      {selectedInfringement && (
        <InfringementDialog
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedInfringement(null);
          }}
          onSubmit={(data) => updateMutation.mutate({ id: selectedInfringement.id, data })}
          operators={operators}
          infringement={selectedInfringement}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

interface InfringementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  operators: Operator[];
  infringement?: TachographInfringement;
  isPending: boolean;
}

function InfringementDialog({ isOpen, onClose, onSubmit, operators, infringement, isPending }: InfringementDialogProps) {
  const [operatorId, setOperatorId] = useState(infringement?.operatorId || '');
  const [infringementType, setInfringementType] = useState(infringement?.infringementType || '');
  const [severity, setSeverity] = useState(infringement?.severity || 'minor');
  const [infringementDate, setInfringementDate] = useState(
    infringement ? format(new Date(infringement.infringementDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [description, setDescription] = useState(infringement?.description || '');
  const [location, setLocation] = useState(infringement?.location || '');
  const [fineAmount, setFineAmount] = useState(infringement?.fineAmount?.toString() || '');
  const [finePaid, setFinePaid] = useState(infringement?.finePaid || false);
  const [reportedBy, setReportedBy] = useState(infringement?.reportedBy || '');
  const [enforcementAgency, setEnforcementAgency] = useState(infringement?.enforcementAgency || '');
  const [drivingTimeExceeded, setDrivingTimeExceeded] = useState(infringement?.drivingTimeExceeded?.toString() || '');
  const [restTimeShortfall, setRestTimeShortfall] = useState(infringement?.restTimeShortfall?.toString() || '');

  const selectedType = INFRINGEMENT_TYPES.find(t => t.value === infringementType);
  const basePoints = selectedType?.points || 0;
  const severityMultiplier = severity === 'very_serious' ? 2 : severity === 'serious' ? 1.5 : 1;
  const calculatedPoints = Math.round(basePoints * severityMultiplier);

  const handleSubmit = () => {
    if (!operatorId || !infringementType || !severity) return;

    onSubmit({
      operatorId,
      infringementType,
      severity,
      infringementDate: new Date(infringementDate),
      description: description || undefined,
      location: location || undefined,
      fineAmount: fineAmount ? parseFloat(fineAmount) : undefined,
      finePaid,
      pointsDeducted: calculatedPoints,
      reportedBy: reportedBy || undefined,
      enforcementAgency: enforcementAgency || undefined,
      drivingTimeExceeded: drivingTimeExceeded ? parseInt(drivingTimeExceeded) : undefined,
      restTimeShortfall: restTimeShortfall ? parseInt(restTimeShortfall) : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{infringement ? 'Edit Infringement' : 'Record New Infringement'}</DialogTitle>
          <DialogDescription>
            Enter the details of the tachograph infringement
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Driver *</Label>
              <NativeSelect value={operatorId} onValueChange={setOperatorId}>
                <NativeSelectItem value="">Select driver...</NativeSelectItem>
                {operators.map(op => (
                  <NativeSelectItem key={op.id} value={op.id}>
                    {op.firstName} {op.lastName}
                  </NativeSelectItem>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={infringementDate}
                onChange={(e) => setInfringementDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Infringement Type *</Label>
              <NativeSelect value={infringementType} onValueChange={setInfringementType}>
                <NativeSelectItem value="">Select type...</NativeSelectItem>
                {Object.entries(
                  INFRINGEMENT_TYPES.reduce((acc, t) => {
                    if (!acc[t.category]) acc[t.category] = [];
                    acc[t.category].push(t);
                    return acc;
                  }, {} as Record<string, typeof INFRINGEMENT_TYPES>)
                ).map(([category, types]) => (
                  <optgroup key={category} label={category}>
                    {types.map(t => (
                      <NativeSelectItem key={t.value} value={t.value}>
                        {t.label} ({t.points} pts)
                      </NativeSelectItem>
                    ))}
                  </optgroup>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Severity *</Label>
              <NativeSelect value={severity} onValueChange={setSeverity}>
                {SEVERITY_OPTIONS.map(s => (
                  <NativeSelectItem key={s.value} value={s.value}>
                    {s.label}
                  </NativeSelectItem>
                ))}
              </NativeSelect>
            </div>
          </div>

          {selectedType && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Points to be deducted:</span>
                <span className="font-bold text-red-600">-{calculatedPoints} points</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Base: {basePoints} × Severity multiplier: {severityMultiplier}x
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details of the infringement..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where it occurred"
              />
            </div>
            <div className="space-y-2">
              <Label>Reported By</Label>
              <Input
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                placeholder="Who detected/reported"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Enforcement Agency</Label>
              <NativeSelect value={enforcementAgency} onValueChange={setEnforcementAgency}>
                <NativeSelectItem value="">Select agency...</NativeSelectItem>
                <NativeSelectItem value="DVSA">DVSA</NativeSelectItem>
                <NativeSelectItem value="Police">Police</NativeSelectItem>
                <NativeSelectItem value="Traffic Commissioner">Traffic Commissioner</NativeSelectItem>
                <NativeSelectItem value="Internal Audit">Internal Audit</NativeSelectItem>
                <NativeSelectItem value="Other">Other</NativeSelectItem>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Fine Amount (£)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="0.01"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                  placeholder="0.00"
                />
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={finePaid}
                    onChange={(e) => setFinePaid(e.target.checked)}
                    className="rounded"
                  />
                  Paid
                </label>
              </div>
            </div>
          </div>

          {(infringementType.includes('driving') || infringementType.includes('rest') || infringementType.includes('break')) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Driving Time Exceeded (minutes)</Label>
                <Input
                  type="number"
                  value={drivingTimeExceeded}
                  onChange={(e) => setDrivingTimeExceeded(e.target.value)}
                  placeholder="Minutes over limit"
                />
              </div>
              <div className="space-y-2">
                <Label>Rest Time Shortfall (minutes)</Label>
                <Input
                  type="number"
                  value={restTimeShortfall}
                  onChange={(e) => setRestTimeShortfall(e.target.value)}
                  placeholder="Minutes short"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !operatorId || !infringementType}>
            {isPending ? 'Saving...' : infringement ? 'Update Infringement' : 'Record Infringement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
