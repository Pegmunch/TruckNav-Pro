import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ClipboardCheck, 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  CheckCircle, 
  Truck, 
  User, 
  Clock,
  FileText,
  History,
  ArrowRightLeft,
  Search,
  Calendar
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { ShiftCheckin as BaseShiftCheckin, ShiftHandover as BaseShiftHandover } from '@shared/schema';

interface ShiftCheckinDisplay extends Omit<BaseShiftCheckin, 'checkInTime' | 'checkOutTime' | 'createdAt'> {
  vehicleName?: string;
  operatorName?: string;
  checkInTime: string | Date;
  checkOutTime: string | Date | null;
  createdAt: string | Date;
}

interface ShiftHandoverDisplay extends Omit<BaseShiftHandover, 'handoverTime' | 'acknowledgedAt' | 'createdAt'> {
  vehicleName?: string;
  outgoingOperatorName?: string;
  incomingOperatorName?: string;
  handoverTime: string | Date;
  acknowledgedAt: string | Date | null;
  createdAt: string | Date;
}

interface Vehicle {
  id: string;
  name: string;
  registrationNumber?: string;
}

interface Operator {
  id: string;
  name: string;
}

interface CheckinFormData {
  vehicleId: string;
  operatorId: string;
  odometer: string;
  fuelLevel: string;
  tiresOk: boolean;
  lightsOk: boolean;
  brakesOk: boolean;
  fluidsOk: boolean;
  mirrorsOk: boolean;
  hornOk: boolean;
  wipersOk: boolean;
  safetyEquipmentOk: boolean;
  vehicleClean: boolean;
  defectsNoted: string;
}

interface CheckoutFormData {
  odometer: string;
  fuelLevel: string;
  postTripNotes: string;
  issuesReported: string;
}

interface HandoverFormData {
  vehicleId: string;
  incomingOperatorId: string;
  vehicleCondition: string;
  fuelLevel: string;
  currentOdometer: string;
  handoverNotes: string;
  urgentIssues: string;
  recommendedActions: string;
}

const demoVehicles: Vehicle[] = [
  { id: 'v1', name: 'Volvo FH16 #101', registrationNumber: 'AB12 CDE' },
  { id: 'v2', name: 'Mercedes Actros #102', registrationNumber: 'FG34 HIJ' },
  { id: 'v3', name: 'DAF XF #103', registrationNumber: 'KL56 MNO' },
  { id: 'v4', name: 'Scania R500 #104', registrationNumber: 'PQ78 RST' },
  { id: 'v5', name: 'MAN TGX #105', registrationNumber: 'UV90 WXY' },
];

const demoOperators: Operator[] = [
  { id: 'op1', name: 'John Smith' },
  { id: 'op2', name: 'Jane Doe' },
  { id: 'op3', name: 'Bob Wilson' },
  { id: 'op4', name: 'Alice Brown' },
  { id: 'op5', name: 'Charlie Davis' },
];

const demoCheckins: ShiftCheckinDisplay[] = [
  {
    id: 'c1',
    userId: 'u1',
    vehicleId: 'v1',
    vehicleName: 'Volvo FH16 #101',
    operatorId: 'op1',
    operatorName: 'John Smith',
    checkInTime: new Date(Date.now() - 4 * 3600000).toISOString(),
    checkInOdometer: 245678,
    checkInFuelLevel: 85,
    preTripInspection: true,
    tiresOk: true,
    lightsOk: true,
    brakesOk: true,
    fluidsOk: true,
    mirrorsOk: true,
    hornOk: true,
    wipersOk: true,
    safetyEquipmentOk: true,
    vehicleClean: true,
    defectsNoted: null,
    checkOutTime: null,
    checkOutOdometer: null,
    checkOutFuelLevel: null,
    milesDriven: null,
    fuelUsed: null,
    postTripNotes: null,
    issuesReported: null,
    status: 'checked_in',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'c2',
    userId: 'u1',
    vehicleId: 'v2',
    vehicleName: 'Mercedes Actros #102',
    operatorId: 'op2',
    operatorName: 'Jane Doe',
    checkInTime: new Date(Date.now() - 8 * 3600000).toISOString(),
    checkInOdometer: 189456,
    checkInFuelLevel: 92,
    preTripInspection: true,
    tiresOk: true,
    lightsOk: true,
    brakesOk: true,
    fluidsOk: true,
    mirrorsOk: true,
    hornOk: true,
    wipersOk: true,
    safetyEquipmentOk: true,
    vehicleClean: false,
    defectsNoted: 'Minor scratch on rear bumper',
    checkOutTime: new Date(Date.now() - 2 * 3600000).toISOString(),
    checkOutOdometer: 189612,
    checkOutFuelLevel: 45,
    milesDriven: 156,
    fuelUsed: 47,
    postTripNotes: 'Completed delivery to Birmingham depot',
    issuesReported: null,
    status: 'checked_out',
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
];

const demoHandovers: ShiftHandoverDisplay[] = [
  {
    id: 'h1',
    userId: 'u1',
    vehicleId: 'v3',
    vehicleName: 'DAF XF #103',
    outgoingOperatorId: 'op3',
    outgoingOperatorName: 'Bob Wilson',
    outgoingCheckinId: 'c3',
    incomingOperatorId: 'op4',
    incomingOperatorName: 'Alice Brown',
    incomingCheckinId: null,
    handoverTime: new Date(Date.now() - 1 * 3600000).toISOString(),
    vehicleCondition: 'good',
    fuelLevel: 65,
    currentOdometer: 312789,
    handoverNotes: 'Vehicle running well, AC needs checking',
    urgentIssues: null,
    recommendedActions: 'Schedule AC service this week',
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 0.5 * 3600000).toISOString(),
    acknowledgedBy: 'op4',
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 'h2',
    userId: 'u1',
    vehicleId: 'v4',
    vehicleName: 'Scania R500 #104',
    outgoingOperatorId: 'op5',
    outgoingOperatorName: 'Charlie Davis',
    outgoingCheckinId: 'c4',
    incomingOperatorId: null,
    incomingOperatorName: undefined,
    incomingCheckinId: null,
    handoverTime: new Date(Date.now() - 0.25 * 3600000).toISOString(),
    vehicleCondition: 'fair',
    fuelLevel: 35,
    currentOdometer: 278456,
    handoverNotes: 'Low fuel, needs refueling before next trip',
    urgentIssues: 'Brake warning light came on during last mile',
    recommendedActions: 'Urgent brake inspection required before next use',
    acknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null,
    createdAt: new Date(Date.now() - 0.25 * 3600000).toISOString(),
  },
];

export function ShiftManagementTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState('active');
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showHandoverDialog, setShowHandoverDialog] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState<ShiftCheckinDisplay | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  
  const [checkinForm, setCheckinForm] = useState<CheckinFormData>({
    vehicleId: '',
    operatorId: '',
    odometer: '',
    fuelLevel: '',
    tiresOk: true,
    lightsOk: true,
    brakesOk: true,
    fluidsOk: true,
    mirrorsOk: true,
    hornOk: true,
    wipersOk: true,
    safetyEquipmentOk: true,
    vehicleClean: true,
    defectsNoted: '',
  });

  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormData>({
    odometer: '',
    fuelLevel: '',
    postTripNotes: '',
    issuesReported: '',
  });

  const [handoverForm, setHandoverForm] = useState<HandoverFormData>({
    vehicleId: '',
    incomingOperatorId: '',
    vehicleCondition: 'good',
    fuelLevel: '',
    currentOdometer: '',
    handoverNotes: '',
    urgentIssues: '',
    recommendedActions: '',
  });

  const { data: checkinsData, isLoading: checkinsLoading } = useQuery({
    queryKey: ['/api/fleet/shift-checkins'],
    queryFn: async () => {
      const response = await fetch('/api/fleet/shift-checkins');
      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.warn('[DEV] Shift checkins API unavailable, using demo data');
          return demoCheckins;
        }
        throw new Error('Failed to load shift check-ins');
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: handoversData, isLoading: handoversLoading } = useQuery({
    queryKey: ['/api/fleet/shift-handovers'],
    queryFn: async () => {
      const response = await fetch('/api/fleet/shift-handovers');
      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.warn('[DEV] Shift handovers API unavailable, using demo data');
          return demoHandovers;
        }
        throw new Error('Failed to load shift handovers');
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['/api/fleet/vehicles'],
    queryFn: async () => {
      const response = await fetch('/api/fleet/vehicles');
      if (!response.ok) {
        if (import.meta.env.DEV) {
          return demoVehicles;
        }
        throw new Error('Failed to load vehicles');
      }
      return response.json();
    },
  });

  const { data: operatorsData } = useQuery({
    queryKey: ['/api/fleet/operators'],
    queryFn: async () => {
      const response = await fetch('/api/fleet/operators');
      if (!response.ok) {
        if (import.meta.env.DEV) {
          return demoOperators;
        }
        throw new Error('Failed to load operators');
      }
      return response.json();
    },
  });

  const checkins: ShiftCheckinDisplay[] = checkinsData || demoCheckins;
  const handovers: ShiftHandoverDisplay[] = handoversData || demoHandovers;
  const vehicles: Vehicle[] = vehiclesData || demoVehicles;
  const operators: Operator[] = operatorsData || demoOperators;

  const activeCheckins = checkins.filter(c => c.status === 'checked_in');
  const completedCheckins = checkins.filter(c => c.status === 'checked_out');
  const pendingHandovers = handovers.filter(h => !h.acknowledged);

  const getConditionBadge = (condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical') => {
    const config: Record<string, { label: string; class: string }> = {
      excellent: { label: 'Excellent', class: 'bg-green-100 text-green-800' },
      good: { label: 'Good', class: 'bg-blue-100 text-blue-800' },
      fair: { label: 'Fair', class: 'bg-yellow-100 text-yellow-800' },
      poor: { label: 'Poor', class: 'bg-orange-100 text-orange-800' },
      critical: { label: 'Critical', class: 'bg-red-100 text-red-800' },
    };
    const c = config[condition];
    return <Badge className={c.class}>{c.label}</Badge>;
  };

  const getInspectionStatus = (checkin: ShiftCheckinDisplay) => {
    const checks = [
      checkin.tiresOk, checkin.lightsOk, checkin.brakesOk, checkin.fluidsOk,
      checkin.mirrorsOk, checkin.hornOk, checkin.wipersOk, checkin.safetyEquipmentOk
    ];
    const passed = checks.filter(Boolean).length;
    const total = checks.length;
    return { passed, total, allPassed: passed === total };
  };

  const handleCheckin = () => {
    console.log('Check-in form submitted:', checkinForm);
    setShowCheckinDialog(false);
    setCheckinForm({
      vehicleId: '',
      operatorId: '',
      odometer: '',
      fuelLevel: '',
      tiresOk: true,
      lightsOk: true,
      brakesOk: true,
      fluidsOk: true,
      mirrorsOk: true,
      hornOk: true,
      wipersOk: true,
      safetyEquipmentOk: true,
      vehicleClean: true,
      defectsNoted: '',
    });
  };

  const handleCheckout = () => {
    console.log('Check-out form submitted:', checkoutForm, 'for checkin:', selectedCheckin?.id);
    setShowCheckoutDialog(false);
    setSelectedCheckin(null);
    setCheckoutForm({
      odometer: '',
      fuelLevel: '',
      postTripNotes: '',
      issuesReported: '',
    });
  };

  const handleHandover = () => {
    console.log('Handover form submitted:', handoverForm);
    setShowHandoverDialog(false);
    setHandoverForm({
      vehicleId: '',
      incomingOperatorId: '',
      vehicleCondition: 'good',
      fuelLevel: '',
      currentOdometer: '',
      handoverNotes: '',
      urgentIssues: '',
      recommendedActions: '',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('fleet.shiftManagement.title', 'Shift Management')}</h2>
          <p className="text-muted-foreground">
            {t('fleet.shiftManagement.description', 'Daily check-ins, check-outs, and shift handovers for fleet drivers')}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCheckinDialog} onOpenChange={setShowCheckinDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <LogIn className="w-4 h-4" />
                {t('fleet.shiftManagement.checkIn', 'Check In')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  {t('fleet.shiftManagement.newCheckIn', 'New Shift Check-In')}
                </DialogTitle>
                <DialogDescription>
                  {t('fleet.shiftManagement.checkInDesc', 'Complete pre-trip inspection and record vehicle condition')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.vehicle', 'Vehicle')}</Label>
                    <Select value={checkinForm.vehicleId} onValueChange={(v) => setCheckinForm({...checkinForm, vehicleId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.driver', 'Driver')}</Label>
                    <Select value={checkinForm.operatorId} onValueChange={(v) => setCheckinForm({...checkinForm, operatorId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.odometer', 'Odometer Reading')}</Label>
                    <Input 
                      type="number" 
                      placeholder="Enter current odometer"
                      value={checkinForm.odometer}
                      onChange={(e) => setCheckinForm({...checkinForm, odometer: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.fuelLevel', 'Fuel Level (%)')}</Label>
                    <Input 
                      type="number" 
                      placeholder="Enter fuel level"
                      min="0"
                      max="100"
                      value={checkinForm.fuelLevel}
                      onChange={(e) => setCheckinForm({...checkinForm, fuelLevel: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    {t('fleet.shiftManagement.preTripInspection', 'Pre-Trip Inspection Checklist')}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'tiresOk', label: 'Tires & Wheels' },
                      { key: 'lightsOk', label: 'Lights & Signals' },
                      { key: 'brakesOk', label: 'Brakes' },
                      { key: 'fluidsOk', label: 'Fluids (Oil, Coolant)' },
                      { key: 'mirrorsOk', label: 'Mirrors' },
                      { key: 'hornOk', label: 'Horn' },
                      { key: 'wipersOk', label: 'Wipers & Washers' },
                      { key: 'safetyEquipmentOk', label: 'Safety Equipment' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-2">
                        <Checkbox 
                          id={item.key}
                          checked={checkinForm[item.key as keyof CheckinFormData] as boolean}
                          onCheckedChange={(checked) => setCheckinForm({...checkinForm, [item.key]: checked})}
                        />
                        <Label htmlFor={item.key} className="cursor-pointer">{item.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="vehicleClean"
                    checked={checkinForm.vehicleClean}
                    onCheckedChange={(checked) => setCheckinForm({...checkinForm, vehicleClean: checked as boolean})}
                  />
                  <Label htmlFor="vehicleClean" className="cursor-pointer">
                    {t('fleet.shiftManagement.vehicleClean', 'Vehicle is clean and presentable')}
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label>{t('fleet.shiftManagement.defectsNoted', 'Defects or Issues Noted')}</Label>
                  <Textarea 
                    placeholder="Describe any defects or issues found during inspection..."
                    value={checkinForm.defectsNoted}
                    onChange={(e) => setCheckinForm({...checkinForm, defectsNoted: e.target.value})}
                  />
                </div>

                <Button onClick={handleCheckin} className="w-full gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {t('fleet.shiftManagement.confirmCheckIn', 'Confirm Check-In')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showHandoverDialog} onOpenChange={setShowHandoverDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                {t('fleet.shiftManagement.handover', 'Handover')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  {t('fleet.shiftManagement.newHandover', 'Create Shift Handover')}
                </DialogTitle>
                <DialogDescription>
                  {t('fleet.shiftManagement.handoverDesc', 'Document vehicle condition and notes for the next driver')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.vehicle', 'Vehicle')}</Label>
                    <Select value={handoverForm.vehicleId} onValueChange={(v) => setHandoverForm({...handoverForm, vehicleId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.incomingDriver', 'Incoming Driver (Optional)')}</Label>
                    <Select value={handoverForm.incomingOperatorId} onValueChange={(v) => setHandoverForm({...handoverForm, incomingOperatorId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.condition', 'Vehicle Condition')}</Label>
                    <Select value={handoverForm.vehicleCondition} onValueChange={(v) => setHandoverForm({...handoverForm, vehicleCondition: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.fuelLevel', 'Fuel Level (%)')}</Label>
                    <Input 
                      type="number" 
                      placeholder="Fuel %"
                      min="0"
                      max="100"
                      value={handoverForm.fuelLevel}
                      onChange={(e) => setHandoverForm({...handoverForm, fuelLevel: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.odometer', 'Odometer')}</Label>
                    <Input 
                      type="number" 
                      placeholder="Current reading"
                      value={handoverForm.currentOdometer}
                      onChange={(e) => setHandoverForm({...handoverForm, currentOdometer: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('fleet.shiftManagement.handoverNotes', 'Handover Notes')}</Label>
                  <Textarea 
                    placeholder="General notes about the vehicle and shift..."
                    value={handoverForm.handoverNotes}
                    onChange={(e) => setHandoverForm({...handoverForm, handoverNotes: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {t('fleet.shiftManagement.urgentIssues', 'Urgent Issues')}
                  </Label>
                  <Textarea 
                    placeholder="Any urgent safety or mechanical issues..."
                    className="border-red-200"
                    value={handoverForm.urgentIssues}
                    onChange={(e) => setHandoverForm({...handoverForm, urgentIssues: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('fleet.shiftManagement.recommendedActions', 'Recommended Actions')}</Label>
                  <Textarea 
                    placeholder="Suggestions for next driver or maintenance team..."
                    value={handoverForm.recommendedActions}
                    onChange={(e) => setHandoverForm({...handoverForm, recommendedActions: e.target.value})}
                  />
                </div>

                <Button onClick={handleHandover} className="w-full gap-2">
                  <ArrowRightLeft className="w-4 h-4" />
                  {t('fleet.shiftManagement.confirmHandover', 'Create Handover Record')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fleet.shiftManagement.activeShifts', 'Active Shifts')}</p>
                <p className="text-2xl font-bold text-green-600">{activeCheckins.length}</p>
              </div>
              <LogIn className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fleet.shiftManagement.completedToday', 'Completed Today')}</p>
                <p className="text-2xl font-bold text-blue-600">{completedCheckins.length}</p>
              </div>
              <LogOut className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fleet.shiftManagement.pendingHandovers', 'Pending Handovers')}</p>
                <p className="text-2xl font-bold text-orange-600">{pendingHandovers.length}</p>
              </div>
              <ArrowRightLeft className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fleet.shiftManagement.vehiclesInUse', 'Vehicles in Use')}</p>
                <p className="text-2xl font-bold text-purple-600">{activeCheckins.length}</p>
              </div>
              <Truck className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Clock className="w-4 h-4" />
            {t('fleet.shiftManagement.activeShifts', 'Active Shifts')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            {t('fleet.shiftManagement.history', 'History')}
          </TabsTrigger>
          <TabsTrigger value="handovers" className="gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            {t('fleet.shiftManagement.handovers', 'Handovers')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('fleet.shiftManagement.currentlyActive', 'Currently Active Shifts')}</CardTitle>
              <CardDescription>{t('fleet.shiftManagement.currentlyActiveDesc', 'Drivers currently checked in with their assigned vehicles')}</CardDescription>
            </CardHeader>
            <CardContent>
              {activeCheckins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('fleet.shiftManagement.noActiveShifts', 'No active shifts at the moment')}</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {activeCheckins.map(checkin => {
                      const inspection = getInspectionStatus(checkin);
                      return (
                        <Card key={checkin.id} className="border-l-4 border-l-green-500">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <User className="w-5 h-5 text-blue-600" />
                                  <span className="font-semibold">{checkin.operatorName}</span>
                                  <Badge variant="outline" className="bg-green-50">Active</Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <Truck className="w-4 h-4" />
                                  <span>{checkin.vehicleName}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {t('fleet.shiftManagement.checkedInAt', 'Checked in')} {formatDistanceToNow(new Date(checkin.checkInTime), { addSuffix: true })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span>Odometer: {checkin.checkInOdometer.toLocaleString()} mi</span>
                                  <span>Fuel: {checkin.checkInFuelLevel}%</span>
                                  <span className={inspection.allPassed ? 'text-green-600' : 'text-orange-600'}>
                                    Inspection: {inspection.passed}/{inspection.total} passed
                                  </span>
                                </div>
                                {checkin.defectsNoted && (
                                  <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
                                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                                    <span>{checkin.defectsNoted}</span>
                                  </div>
                                )}
                              </div>
                              <Button 
                                variant="outline" 
                                className="gap-2"
                                onClick={() => {
                                  setSelectedCheckin(checkin);
                                  setShowCheckoutDialog(true);
                                }}
                              >
                                <LogOut className="w-4 h-4" />
                                {t('fleet.shiftManagement.checkOut', 'Check Out')}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('fleet.shiftManagement.shiftHistory', 'Shift History')}</CardTitle>
                  <CardDescription>{t('fleet.shiftManagement.shiftHistoryDesc', 'View completed shifts and assignment records')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search..."
                      className="pl-9 w-[200px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[130px]">
                      <Calendar className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {completedCheckins.map(checkin => (
                    <Card key={checkin.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5 text-blue-600" />
                              <span className="font-semibold">{checkin.operatorName}</span>
                              <Badge variant="outline">Completed</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <Truck className="w-4 h-4" />
                              <span>{checkin.vehicleName}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Check-in</p>
                                <p>{format(new Date(checkin.checkInTime), 'MMM d, yyyy h:mm a')}</p>
                                <p className="text-xs">Odometer: {checkin.checkInOdometer.toLocaleString()} mi</p>
                              </div>
                              {checkin.checkOutTime && (
                                <div>
                                  <p className="text-muted-foreground">Check-out</p>
                                  <p>{format(new Date(checkin.checkOutTime), 'MMM d, yyyy h:mm a')}</p>
                                  <p className="text-xs">Odometer: {checkin.checkOutOdometer?.toLocaleString()} mi</p>
                                </div>
                              )}
                            </div>
                            {checkin.milesDriven && (
                              <div className="flex items-center gap-4 text-sm bg-slate-50 p-2 rounded">
                                <span>Miles Driven: {checkin.milesDriven.toLocaleString()}</span>
                                {checkin.fuelUsed && <span>Fuel Used: {checkin.fuelUsed.toFixed(1)} gal</span>}
                              </div>
                            )}
                            {checkin.postTripNotes && (
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <FileText className="w-4 h-4 mt-0.5" />
                                <span>{checkin.postTripNotes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="handovers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('fleet.shiftManagement.shiftHandovers', 'Shift Handovers')}</CardTitle>
              <CardDescription>{t('fleet.shiftManagement.shiftHandoversDesc', 'Vehicle handover records and pending acknowledgments')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {handovers.map(handover => (
                    <Card key={handover.id} className={`border-l-4 ${handover.acknowledged ? 'border-l-green-500' : 'border-l-orange-500'}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <Truck className="w-5 h-5 text-blue-600" />
                              <span className="font-semibold">{handover.vehicleName}</span>
                              {getConditionBadge(handover.vehicleCondition)}
                              {!handover.acknowledged && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700">Pending Acknowledgment</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                <span>From: {handover.outgoingOperatorName}</span>
                              </div>
                              {handover.incomingOperatorName && (
                                <div className="flex items-center gap-1">
                                  <ArrowRightLeft className="w-4 h-4" />
                                  <span>To: {handover.incomingOperatorName}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>{format(new Date(handover.handoverTime), 'MMM d, yyyy h:mm a')}</span>
                              {handover.fuelLevel && <span>Fuel: {handover.fuelLevel}%</span>}
                              {handover.currentOdometer && <span>Odometer: {handover.currentOdometer.toLocaleString()} mi</span>}
                            </div>
                            {handover.handoverNotes && (
                              <div className="flex items-start gap-2 text-sm bg-slate-50 p-2 rounded">
                                <FileText className="w-4 h-4 mt-0.5" />
                                <span>{handover.handoverNotes}</span>
                              </div>
                            )}
                            {handover.urgentIssues && (
                              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                <AlertTriangle className="w-4 h-4 mt-0.5" />
                                <span>{handover.urgentIssues}</span>
                              </div>
                            )}
                            {handover.recommendedActions && (
                              <div className="flex items-start gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                                <CheckCircle className="w-4 h-4 mt-0.5" />
                                <span>{handover.recommendedActions}</span>
                              </div>
                            )}
                          </div>
                          {!handover.acknowledged && (
                            <Button variant="outline" className="gap-2">
                              <CheckCircle className="w-4 h-4" />
                              {t('fleet.shiftManagement.acknowledge', 'Acknowledge')}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              {t('fleet.shiftManagement.shiftCheckOut', 'Shift Check-Out')}
            </DialogTitle>
            <DialogDescription>
              {selectedCheckin && (
                <>Complete post-trip inspection for {selectedCheckin.vehicleName}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('fleet.shiftManagement.endOdometer', 'End Odometer')}</Label>
                <Input 
                  type="number" 
                  placeholder="Current reading"
                  value={checkoutForm.odometer}
                  onChange={(e) => setCheckoutForm({...checkoutForm, odometer: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('fleet.shiftManagement.fuelLevel', 'Fuel Level (%)')}</Label>
                <Input 
                  type="number" 
                  placeholder="Fuel %"
                  min="0"
                  max="100"
                  value={checkoutForm.fuelLevel}
                  onChange={(e) => setCheckoutForm({...checkoutForm, fuelLevel: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('fleet.shiftManagement.tripNotes', 'Trip Notes')}</Label>
              <Textarea 
                placeholder="Summary of your shift..."
                value={checkoutForm.postTripNotes}
                onChange={(e) => setCheckoutForm({...checkoutForm, postTripNotes: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-orange-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {t('fleet.shiftManagement.issuesReported', 'Issues to Report')}
              </Label>
              <Textarea 
                placeholder="Any issues encountered during shift..."
                className="border-orange-200"
                value={checkoutForm.issuesReported}
                onChange={(e) => setCheckoutForm({...checkoutForm, issuesReported: e.target.value})}
              />
            </div>

            <Button onClick={handleCheckout} className="w-full gap-2">
              <CheckCircle className="w-4 h-4" />
              {t('fleet.shiftManagement.confirmCheckOut', 'Confirm Check-Out')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
