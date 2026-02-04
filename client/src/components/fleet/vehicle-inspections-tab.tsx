import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  Truck, 
  User, 
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  Search,
  Download
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FleetVehicle, Operator } from '@shared/schema';

interface InspectionRecord {
  id: string;
  vehicleId: string;
  operatorId: string;
  vehicleRegistration: string;
  operatorName: string;
  startTime: string;
  completedAt: string;
  durationSeconds: number;
  checklistItems: Array<{
    id: string;
    label: string;
    category: string;
    checked: boolean;
  }>;
  notes: string;
  allItemsPassed: boolean;
}

export function VehicleInspectionsTab() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: inspections = [], isLoading } = useQuery<InspectionRecord[]>({
    queryKey: ['/api/fleet/vehicle-inspections'],
    refetchInterval: 30000,
  });

  const { data: fleetVehicles = [] } = useQuery<FleetVehicle[]>({
    queryKey: ['/api/fleet/vehicles/active'],
  });

  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ['/api/fleet/operators/active'],
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredInspections = inspections.filter(inspection => {
    if (vehicleFilter !== 'all' && inspection.vehicleId !== vehicleFilter) return false;
    if (operatorFilter !== 'all' && inspection.operatorId !== operatorFilter) return false;
    if (dateFilter) {
      const inspDate = new Date(inspection.completedAt).toISOString().split('T')[0];
      if (inspDate !== dateFilter) return false;
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!inspection.vehicleRegistration.toLowerCase().includes(search) &&
          !inspection.operatorName.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  const getCategoryItems = (items: InspectionRecord['checklistItems'], category: string) => {
    return items.filter(item => item.category === category);
  };

  const categories = [
    { key: 'exterior', label: 'Exterior Checks' },
    { key: 'cab', label: 'Cab & Controls' },
    { key: 'lights', label: 'Lights & Signals' },
    { key: 'tyres', label: 'Tyres & Wheels' },
    { key: 'brakes', label: 'Brakes & Safety' },
    { key: 'trailer', label: 'Trailer Checks' },
    { key: 'tailLift', label: 'Tail Lift' },
    { key: 'documents', label: 'Documents & Equipment' }
  ];

  const todayCount = inspections.filter(i => {
    const today = new Date().toISOString().split('T')[0];
    return new Date(i.completedAt).toISOString().split('T')[0] === today;
  }).length;

  const weekCount = inspections.filter(i => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(i.completedAt) >= weekAgo;
  }).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-blue-500" />
              Total Inspections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inspections.length}</div>
            <p className="text-xs text-muted-foreground">All time records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-500" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayCount}</div>
            <p className="text-xs text-muted-foreground">Inspections today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{weekCount}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {inspections.length > 0 
                ? Math.round((inspections.filter(i => i.allItemsPassed).length / inspections.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">All checks passed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter Inspections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Registration or driver..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Vehicle</Label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {fleetVehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.registration}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Driver</Label>
              <Select value={operatorFilter} onValueChange={setOperatorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {operators.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.firstName} {o.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspections List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Inspection Records
          </CardTitle>
          <CardDescription>
            {filteredInspections.length} inspection{filteredInspections.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading inspection records...
            </div>
          ) : filteredInspections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No inspection records found</p>
              <p className="text-sm">Completed inspections from mobile satnav will appear here</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredInspections.map(inspection => (
                  <Collapsible
                    key={inspection.id}
                    open={expandedId === inspection.id}
                    onOpenChange={(open) => setExpandedId(open ? inspection.id : null)}
                  >
                    <Card className={inspection.allItemsPassed ? "border-green-200" : "border-orange-200"}>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-500" />
                                <span className="font-mono font-bold">{inspection.vehicleRegistration}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="w-4 h-4" />
                                <span className="text-sm">{inspection.operatorName}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={inspection.allItemsPassed ? "default" : "destructive"} 
                                     className={inspection.allItemsPassed ? "bg-green-500" : ""}>
                                {inspection.allItemsPassed ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Passed
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Issues
                                  </>
                                )}
                              </Badge>
                              <div className="text-right text-sm">
                                <div className="font-medium">{formatDate(inspection.completedAt)}</div>
                                <div className="text-muted-foreground text-xs">{formatDuration(inspection.durationSeconds)}</div>
                              </div>
                              {expandedId === inspection.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0 border-t">
                          <div className="py-3 space-y-4">
                            {/* Inspection Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Started:</span>
                                <div className="font-medium">{formatDateTime(inspection.startTime)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Completed:</span>
                                <div className="font-medium">{formatDateTime(inspection.completedAt)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Duration:</span>
                                <div className="font-medium">{formatDuration(inspection.durationSeconds)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Items Checked:</span>
                                <div className="font-medium">{inspection.checklistItems.length}</div>
                              </div>
                            </div>

                            {/* Checklist by Category */}
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm">Checklist Items</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {categories.map(cat => {
                                  const items = getCategoryItems(inspection.checklistItems, cat.key);
                                  if (items.length === 0) return null;
                                  const allPassed = items.every(i => i.checked);
                                  return (
                                    <div key={cat.key} className={`p-2 rounded-lg ${allPassed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                                      <div className="flex items-center gap-2 mb-1">
                                        {allPassed ? (
                                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        ) : (
                                          <AlertTriangle className="w-3 h-3 text-orange-500" />
                                        )}
                                        <span className="text-xs font-medium">{cat.label}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {items.filter(i => i.checked).length}/{items.length} passed
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Notes */}
                            {inspection.notes && (
                              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <h4 className="font-medium text-sm mb-1">Notes</h4>
                                <p className="text-sm text-muted-foreground">{inspection.notes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
