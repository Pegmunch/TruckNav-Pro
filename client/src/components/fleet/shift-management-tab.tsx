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
import { NativeSelect, NativeSelectItem } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
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
  Calendar,
  Navigation,
  Shield,
  Wifi
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
  registration?: string;
  registrationNumber?: string;
  make?: string;
  model?: string;
}

interface Operator {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  licenceNumber?: string;
}

interface DriverSession {
  operatorId: string;
  vehicleId: string;
  operatorName: string;
  vehicleRegistration: string;
  sessionStart: string;
  lastUpdate: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  heading?: number;
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
  { id: 'v1', name: 'Volvo FH16 #101', registration: 'AB12 CDE', make: 'Volvo', model: 'FH16' },
  { id: 'v2', name: 'Mercedes Actros #102', registration: 'FG34 HIJ', make: 'Mercedes', model: 'Actros' },
  { id: 'v3', name: 'DAF XF #103', registration: 'KL56 MNO', make: 'DAF', model: 'XF' },
  { id: 'v4', name: 'Scania R500 #104', registration: 'PQ78 RST', make: 'Scania', model: 'R500' },
  { id: 'v5', name: 'MAN TGX #105', registration: 'UV90 WXY', make: 'MAN', model: 'TGX' },
  { id: 'v6', name: 'Volvo FH #106', registration: 'WX11 ABC', make: 'Volvo', model: 'FH' },
  { id: 'v7', name: 'Mercedes Actros MP5 #107', registration: 'DE22 FGH', make: 'Mercedes', model: 'Actros MP5' },
  { id: 'v8', name: 'DAF XG+ #108', registration: 'IJ33 KLM', make: 'DAF', model: 'XG+' },
];

const demoOperators: Operator[] = [
  { id: 'op1', name: 'John Smith', firstName: 'John', lastName: 'Smith', licenceNumber: 'SMITH801156JN9AA' },
  { id: 'op2', name: 'Jane Doe', firstName: 'Jane', lastName: 'Doe', licenceNumber: 'DOE9X780115JA9BC' },
  { id: 'op3', name: 'Bob Wilson', firstName: 'Bob', lastName: 'Wilson', licenceNumber: 'WILSO706206BW3DE' },
  { id: 'op4', name: 'Alice Brown', firstName: 'Alice', lastName: 'Brown', licenceNumber: 'BROWN809155AB7FG' },
  { id: 'op5', name: 'Charlie Davis', firstName: 'Charlie', lastName: 'Davis', licenceNumber: 'DAVIS701127CD1HJ' },
  { id: 'op6', name: 'Emma Thompson', firstName: 'Emma', lastName: 'Thompson', licenceNumber: 'THOMP808225ET5KL' },
  { id: 'op7', name: 'Michael Harris', firstName: 'Michael', lastName: 'Harris', licenceNumber: 'HARRI703189MH2MN' },
  { id: 'op8', name: 'Sarah Jenkins', firstName: 'Sarah', lastName: 'Jenkins', licenceNumber: 'JENKI811045SJ6PQ' },
];

const demoCheckins: ShiftCheckinDisplay[] = [
  {
    id: 'c1',
    userId: 'u1',
    vehicleId: 'v1',
    vehicleName: 'Volvo FH16 #101 (AB12 CDE)',
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
    vehicleId: 'v3',
    vehicleName: 'DAF XF #103 (KL56 MNO)',
    operatorId: 'op3',
    operatorName: 'Bob Wilson',
    checkInTime: new Date(Date.now() - 2.5 * 3600000).toISOString(),
    checkInOdometer: 312456,
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
    createdAt: new Date(Date.now() - 2.5 * 3600000).toISOString(),
  },
  {
    id: 'c3',
    userId: 'u1',
    vehicleId: 'v6',
    vehicleName: 'Volvo FH #106 (WX11 ABC)',
    operatorId: 'op6',
    operatorName: 'Emma Thompson',
    checkInTime: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    checkInOdometer: 189234,
    checkInFuelLevel: 78,
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
    defectsNoted: 'Minor scratch on nearside panel - existing damage noted',
    checkOutTime: null,
    checkOutOdometer: null,
    checkOutFuelLevel: null,
    milesDriven: null,
    fuelUsed: null,
    postTripNotes: null,
    issuesReported: null,
    status: 'checked_in',
    createdAt: new Date(Date.now() - 1.5 * 3600000).toISOString(),
  },
  {
    id: 'c4',
    userId: 'u1',
    vehicleId: 'v2',
    vehicleName: 'Mercedes Actros #102 (FG34 HIJ)',
    operatorId: 'op2',
    operatorName: 'Jane Doe',
    checkInTime: new Date(Date.now() - 10 * 3600000).toISOString(),
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
    vehicleClean: true,
    defectsNoted: null,
    checkOutTime: new Date(Date.now() - 2 * 3600000).toISOString(),
    checkOutOdometer: 189612,
    checkOutFuelLevel: 45,
    milesDriven: 156,
    fuelUsed: 47,
    postTripNotes: 'Completed delivery run: Birmingham depot → Manchester distribution centre → Leeds warehouse. All deliveries on time. M6 roadworks caused 20 min delay.',
    issuesReported: null,
    status: 'checked_out',
    createdAt: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    id: 'c5',
    userId: 'u1',
    vehicleId: 'v4',
    vehicleName: 'Scania R500 #104 (PQ78 RST)',
    operatorId: 'op5',
    operatorName: 'Charlie Davis',
    checkInTime: new Date(Date.now() - 14 * 3600000).toISOString(),
    checkInOdometer: 278100,
    checkInFuelLevel: 95,
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
    checkOutTime: new Date(Date.now() - 5 * 3600000).toISOString(),
    checkOutOdometer: 278456,
    checkOutFuelLevel: 35,
    milesDriven: 356,
    fuelUsed: 82,
    postTripNotes: 'Long haul: London depot → Edinburgh distribution. Overnight rest at Scotch Corner services. All tachograph records compliant.',
    issuesReported: 'Brake warning light illuminated briefly on A1(M) - self-cleared. Recommend inspection at next service.',
    status: 'checked_out',
    createdAt: new Date(Date.now() - 14 * 3600000).toISOString(),
  },
  {
    id: 'c6',
    userId: 'u1',
    vehicleId: 'v7',
    vehicleName: 'Mercedes Actros MP5 #107 (DE22 FGH)',
    operatorId: 'op7',
    operatorName: 'Michael Harris',
    checkInTime: new Date(Date.now() - 9 * 3600000).toISOString(),
    checkInOdometer: 156789,
    checkInFuelLevel: 88,
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
    checkOutTime: new Date(Date.now() - 1 * 3600000).toISOString(),
    checkOutOdometer: 156998,
    checkOutFuelLevel: 52,
    milesDriven: 209,
    fuelUsed: 56,
    postTripNotes: 'Multi-drop route: Southampton port → Basingstoke → Reading → Slough. 6 drops completed, all PODs collected.',
    issuesReported: null,
    status: 'checked_out',
    createdAt: new Date(Date.now() - 9 * 3600000).toISOString(),
  },
];

const demoHandovers: ShiftHandoverDisplay[] = [
  {
    id: 'h1',
    userId: 'u1',
    vehicleId: 'v3',
    vehicleName: 'DAF XF #103 (KL56 MNO)',
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
    handoverNotes: 'Vehicle running well. AdBlue level at 60%. Tyre pressures checked at last service stop - all within limits. AC working intermittently - appears to be thermostat related.',
    urgentIssues: null,
    recommendedActions: 'Schedule AC thermostat inspection. AdBlue top-up at next available depot.',
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 0.5 * 3600000).toISOString(),
    acknowledgedBy: 'op4',
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 'h2',
    userId: 'u1',
    vehicleId: 'v4',
    vehicleName: 'Scania R500 #104 (PQ78 RST)',
    outgoingOperatorId: 'op5',
    outgoingOperatorName: 'Charlie Davis',
    outgoingCheckinId: 'c5',
    incomingOperatorId: 'op8',
    incomingOperatorName: 'Sarah Jenkins',
    incomingCheckinId: null,
    handoverTime: new Date(Date.now() - 0.25 * 3600000).toISOString(),
    vehicleCondition: 'fair',
    fuelLevel: 35,
    currentOdometer: 278456,
    handoverNotes: 'Low fuel - needs refuelling before next trip. Vehicle has completed Edinburgh long haul. Recommend minimum 45-minute rest for engine cooling.',
    urgentIssues: 'Brake warning light came on briefly during A1(M) section. Self-cleared but requires urgent inspection before next journey. DO NOT operate until brakes inspected.',
    recommendedActions: 'PRIORITY: Brake system inspection required immediately. Refuel vehicle. Check coolant level after engine cool-down period.',
    acknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null,
    createdAt: new Date(Date.now() - 0.25 * 3600000).toISOString(),
  },
  {
    id: 'h3',
    userId: 'u1',
    vehicleId: 'v7',
    vehicleName: 'Mercedes Actros MP5 #107 (DE22 FGH)',
    outgoingOperatorId: 'op7',
    outgoingOperatorName: 'Michael Harris',
    outgoingCheckinId: 'c6',
    incomingOperatorId: 'op1',
    incomingOperatorName: 'John Smith',
    incomingCheckinId: null,
    handoverTime: new Date(Date.now() - 0.75 * 3600000).toISOString(),
    vehicleCondition: 'excellent',
    fuelLevel: 52,
    currentOdometer: 156998,
    handoverNotes: 'Vehicle in excellent condition after multi-drop route. All PODs collected and scanned. Tail lift operating perfectly. Trailer clean and secure.',
    urgentIssues: null,
    recommendedActions: 'Standard refuel before next run. Next MOT due in 3 weeks - schedule with workshop.',
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 0.5 * 3600000).toISOString(),
    acknowledgedBy: 'op1',
    createdAt: new Date(Date.now() - 0.75 * 3600000).toISOString(),
  },
];

export function ShiftManagementTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
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

  const { data: driverSessions = [] } = useQuery<DriverSession[]>({
    queryKey: ['/api/fleet/driver-sessions'],
    queryFn: async () => {
      const response = await fetch('/api/fleet/driver-sessions');
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 15000,
  });

  const checkins: ShiftCheckinDisplay[] = checkinsData || demoCheckins;
  const handovers: ShiftHandoverDisplay[] = handoversData || demoHandovers;
  const vehicles: Vehicle[] = vehiclesData || demoVehicles;
  const operators: Operator[] = operatorsData || demoOperators;

  const activeCheckins = checkins.filter(c => c.status === 'checked_in');
  const completedCheckins = checkins.filter(c => c.status === 'checked_out');
  const pendingHandovers = handovers.filter(h => !h.acknowledged);

  const getVehicleDisplayName = (v: Vehicle) => {
    const reg = v.registration || v.registrationNumber || '';
    if (v.make && v.model) return `${v.make} ${v.model} ${reg ? `(${reg})` : ''}`.trim();
    return v.name || reg;
  };

  const getOperatorDisplayName = (o: Operator) => {
    if (o.firstName && o.lastName) return `${o.firstName} ${o.lastName}`;
    return o.name;
  };

  const checkinMutation = useMutation({
    mutationFn: async (data: CheckinFormData) => {
      const vehicle = vehicles.find(v => v.id === data.vehicleId);
      const operator = operators.find(o => o.id === data.operatorId);
      const response = await fetch('/api/fleet/shift-checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: data.vehicleId,
          operatorId: data.operatorId,
          checkInOdometer: parseInt(data.odometer) || 0,
          checkInFuelLevel: parseInt(data.fuelLevel) || 0,
          tiresOk: data.tiresOk,
          lightsOk: data.lightsOk,
          brakesOk: data.brakesOk,
          fluidsOk: data.fluidsOk,
          mirrorsOk: data.mirrorsOk,
          hornOk: data.hornOk,
          wipersOk: data.wipersOk,
          safetyEquipmentOk: data.safetyEquipmentOk,
          vehicleClean: data.vehicleClean,
          defectsNoted: data.defectsNoted || null,
          vehicleName: vehicle ? getVehicleDisplayName(vehicle) : '',
          operatorName: operator ? getOperatorDisplayName(operator) : '',
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create check-in');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/shift-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/driver-sessions'] });
      toast({ title: 'Shift check-in recorded', description: 'Pre-trip inspection saved to fleet management system' });
      setShowCheckinDialog(false);
      setCheckinForm({
        vehicleId: '', operatorId: '', odometer: '', fuelLevel: '',
        tiresOk: true, lightsOk: true, brakesOk: true, fluidsOk: true,
        mirrorsOk: true, hornOk: true, wipersOk: true, safetyEquipmentOk: true,
        vehicleClean: true, defectsNoted: '',
      });
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV) {
        const vehicle = vehicles.find(v => v.id === checkinForm.vehicleId);
        const operator = operators.find(o => o.id === checkinForm.operatorId);
        const newCheckin: ShiftCheckinDisplay = {
          id: `c${Date.now()}`,
          userId: 'local',
          vehicleId: checkinForm.vehicleId,
          vehicleName: vehicle ? getVehicleDisplayName(vehicle) : 'Unknown Vehicle',
          operatorId: checkinForm.operatorId,
          operatorName: operator ? getOperatorDisplayName(operator) : 'Unknown Operator',
          checkInTime: new Date().toISOString(),
          checkInOdometer: parseInt(checkinForm.odometer) || 0,
          checkInFuelLevel: parseInt(checkinForm.fuelLevel) || 0,
          preTripInspection: true,
          tiresOk: checkinForm.tiresOk,
          lightsOk: checkinForm.lightsOk,
          brakesOk: checkinForm.brakesOk,
          fluidsOk: checkinForm.fluidsOk,
          mirrorsOk: checkinForm.mirrorsOk,
          hornOk: checkinForm.hornOk,
          wipersOk: checkinForm.wipersOk,
          safetyEquipmentOk: checkinForm.safetyEquipmentOk,
          vehicleClean: checkinForm.vehicleClean,
          defectsNoted: checkinForm.defectsNoted || null,
          checkOutTime: null, checkOutOdometer: null, checkOutFuelLevel: null,
          milesDriven: null, fuelUsed: null, postTripNotes: null, issuesReported: null,
          status: 'checked_in',
          createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData(['/api/fleet/shift-checkins'], (old: ShiftCheckinDisplay[] | undefined) => 
          [...(old || demoCheckins), newCheckin]
        );
        toast({ title: 'Shift check-in recorded', description: 'Saved locally (demo mode)' });
        setShowCheckinDialog(false);
        setCheckinForm({
          vehicleId: '', operatorId: '', odometer: '', fuelLevel: '',
          tiresOk: true, lightsOk: true, brakesOk: true, fluidsOk: true,
          mirrorsOk: true, hornOk: true, wipersOk: true, safetyEquipmentOk: true,
          vehicleClean: true, defectsNoted: '',
        });
        return;
      }
      toast({ title: 'Check-in failed', description: error.message, variant: 'destructive' });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ checkinId, data }: { checkinId: string; data: CheckoutFormData }) => {
      const response = await fetch(`/api/fleet/shift-checkins/${checkinId}/checkout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odometer: parseInt(data.odometer) || 0,
          fuelLevel: parseInt(data.fuelLevel) || 0,
          postTripNotes: data.postTripNotes || null,
          issuesReported: data.issuesReported || null,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to process check-out');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/shift-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/driver-sessions'] });
      toast({ title: 'Shift check-out completed', description: 'Post-trip report saved successfully' });
      setShowCheckoutDialog(false);
      setSelectedCheckin(null);
      setCheckoutForm({ odometer: '', fuelLevel: '', postTripNotes: '', issuesReported: '' });
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV && selectedCheckin) {
        queryClient.setQueryData(['/api/fleet/shift-checkins'], (old: ShiftCheckinDisplay[] | undefined) =>
          (old || demoCheckins).map(c => c.id === selectedCheckin.id ? {
            ...c,
            status: 'checked_out',
            checkOutTime: new Date().toISOString(),
            checkOutOdometer: parseInt(checkoutForm.odometer) || 0,
            checkOutFuelLevel: parseInt(checkoutForm.fuelLevel) || 0,
            milesDriven: (parseInt(checkoutForm.odometer) || 0) - (c.checkInOdometer || 0),
            postTripNotes: checkoutForm.postTripNotes || null,
            issuesReported: checkoutForm.issuesReported || null,
          } : c)
        );
        toast({ title: 'Shift check-out completed', description: 'Saved locally (demo mode)' });
        setShowCheckoutDialog(false);
        setSelectedCheckin(null);
        setCheckoutForm({ odometer: '', fuelLevel: '', postTripNotes: '', issuesReported: '' });
        return;
      }
      toast({ title: 'Check-out failed', description: error.message, variant: 'destructive' });
    },
  });

  const handoverMutation = useMutation({
    mutationFn: async (data: HandoverFormData) => {
      const vehicle = vehicles.find(v => v.id === data.vehicleId);
      const currentOperator = activeCheckins.find(c => c.vehicleId === data.vehicleId);
      const incomingOperator = operators.find(o => o.id === data.incomingOperatorId);
      const response = await fetch('/api/fleet/shift-handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: data.vehicleId,
          outgoingOperatorId: currentOperator?.operatorId || '',
          outgoingCheckinId: currentOperator?.id || '',
          incomingOperatorId: data.incomingOperatorId || null,
          vehicleCondition: data.vehicleCondition,
          fuelLevel: parseInt(data.fuelLevel) || 0,
          currentOdometer: parseInt(data.currentOdometer) || 0,
          handoverNotes: data.handoverNotes || null,
          urgentIssues: data.urgentIssues || null,
          recommendedActions: data.recommendedActions || null,
          vehicleName: vehicle ? getVehicleDisplayName(vehicle) : '',
          outgoingOperatorName: currentOperator?.operatorName || 'Unknown',
          incomingOperatorName: incomingOperator ? getOperatorDisplayName(incomingOperator) : undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create handover');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/shift-handovers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/shift-checkins'] });
      toast({ title: 'Handover record created', description: 'Incoming driver will be notified to acknowledge' });
      setShowHandoverDialog(false);
      setHandoverForm({
        vehicleId: '', incomingOperatorId: '', vehicleCondition: 'good',
        fuelLevel: '', currentOdometer: '', handoverNotes: '',
        urgentIssues: '', recommendedActions: '',
      });
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV) {
        const vehicle = vehicles.find(v => v.id === handoverForm.vehicleId);
        const currentOperator = activeCheckins.find(c => c.vehicleId === handoverForm.vehicleId);
        const incomingOp = operators.find(o => o.id === handoverForm.incomingOperatorId);
        const newHandover: ShiftHandoverDisplay = {
          id: `h${Date.now()}`,
          userId: 'local',
          vehicleId: handoverForm.vehicleId,
          vehicleName: vehicle ? getVehicleDisplayName(vehicle) : 'Unknown Vehicle',
          outgoingOperatorId: currentOperator?.operatorId || '',
          outgoingOperatorName: currentOperator?.operatorName || 'Unknown',
          outgoingCheckinId: currentOperator?.id || '',
          incomingOperatorId: handoverForm.incomingOperatorId || null,
          incomingOperatorName: incomingOp ? getOperatorDisplayName(incomingOp) : undefined,
          incomingCheckinId: null,
          handoverTime: new Date().toISOString(),
          vehicleCondition: handoverForm.vehicleCondition,
          fuelLevel: parseInt(handoverForm.fuelLevel) || 0,
          currentOdometer: parseInt(handoverForm.currentOdometer) || 0,
          handoverNotes: handoverForm.handoverNotes || null,
          urgentIssues: handoverForm.urgentIssues || null,
          recommendedActions: handoverForm.recommendedActions || null,
          acknowledged: false,
          acknowledgedAt: null,
          acknowledgedBy: null,
          createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData(['/api/fleet/shift-handovers'], (old: ShiftHandoverDisplay[] | undefined) =>
          [...(old || demoHandovers), newHandover]
        );
        toast({ title: 'Handover record created', description: 'Saved locally (demo mode)' });
        setShowHandoverDialog(false);
        setHandoverForm({
          vehicleId: '', incomingOperatorId: '', vehicleCondition: 'good',
          fuelLevel: '', currentOdometer: '', handoverNotes: '',
          urgentIssues: '', recommendedActions: '',
        });
        return;
      }
      toast({ title: 'Handover failed', description: error.message, variant: 'destructive' });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (handoverId: string) => {
      const response = await fetch(`/api/fleet/shift-handovers/${handoverId}/acknowledge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to acknowledge handover');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/shift-handovers'] });
      toast({ title: 'Handover acknowledged' });
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV) {
        toast({ title: 'Handover acknowledged', description: 'Saved locally (demo mode)' });
        return;
      }
      toast({ title: 'Failed to acknowledge', description: error.message, variant: 'destructive' });
    },
  });

  const getConditionBadge = (condition: string) => {
    const config: Record<string, { label: string; class: string }> = {
      excellent: { label: 'Excellent', class: 'bg-green-100 text-green-800' },
      good: { label: 'Good', class: 'bg-blue-100 text-blue-800' },
      fair: { label: 'Fair', class: 'bg-yellow-100 text-yellow-800' },
      poor: { label: 'Poor', class: 'bg-orange-100 text-orange-800' },
      critical: { label: 'Critical', class: 'bg-red-100 text-red-800' },
    };
    const c = config[condition] || config.good;
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
    if (!checkinForm.vehicleId || !checkinForm.operatorId) {
      toast({ title: 'Please select a vehicle and driver', variant: 'destructive' });
      return;
    }
    if (!checkinForm.odometer || !checkinForm.fuelLevel) {
      toast({ title: 'Please enter odometer reading and fuel level', variant: 'destructive' });
      return;
    }
    checkinMutation.mutate(checkinForm);
  };

  const handleCheckout = () => {
    if (!selectedCheckin) return;
    if (!checkoutForm.odometer || !checkoutForm.fuelLevel) {
      toast({ title: 'Please enter end odometer and fuel level', variant: 'destructive' });
      return;
    }
    checkoutMutation.mutate({ checkinId: selectedCheckin.id, data: checkoutForm });
  };

  const handleHandover = () => {
    if (!handoverForm.vehicleId) {
      toast({ title: 'Please select a vehicle', variant: 'destructive' });
      return;
    }
    if (!handoverForm.fuelLevel || !handoverForm.currentOdometer) {
      toast({ title: 'Please enter fuel level and odometer reading', variant: 'destructive' });
      return;
    }
    handoverMutation.mutate(handoverForm);
  };

  const isDriverOnSatnav = (operatorId: string) => {
    return driverSessions.some(s => s.operatorId === operatorId);
  };

  const getDriverSession = (operatorId: string) => {
    return driverSessions.find(s => s.operatorId === operatorId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('fleet.shiftManagement.title', 'Shift Management')}</h2>
          <p className="text-muted-foreground">
            {t('fleet.shiftManagement.description', 'Daily check-ins, check-outs, and shift handovers linked to satnav driver sessions')}
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  {t('fleet.shiftManagement.newCheckIn', 'New Shift Check-In')}
                </DialogTitle>
                <DialogDescription>
                  {t('fleet.shiftManagement.checkInDesc', 'Complete pre-trip inspection and record vehicle condition. This links to the driver\'s satnav session.')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.vehicle', 'Vehicle')}</Label>
                    <NativeSelect value={checkinForm.vehicleId} onValueChange={(v) => setCheckinForm({...checkinForm, vehicleId: v})} placeholder="Select vehicle">
                      {vehicles.map(v => (
                        <NativeSelectItem key={v.id} value={v.id}>{getVehicleDisplayName(v)}</NativeSelectItem>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.driver', 'Driver')}</Label>
                    <NativeSelect value={checkinForm.operatorId} onValueChange={(v) => setCheckinForm({...checkinForm, operatorId: v})} placeholder="Select driver">
                      {operators.map(o => (
                        <NativeSelectItem key={o.id} value={o.id}>
                          {getOperatorDisplayName(o)}{isDriverOnSatnav(o.id) ? ' (On Satnav)' : ''}
                        </NativeSelectItem>
                      ))}
                    </NativeSelect>
                  </div>
                </div>

                {checkinForm.operatorId && isDriverOnSatnav(checkinForm.operatorId) && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <Navigation className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                      Driver is currently active on TruckNav satnav - session will be linked automatically
                    </span>
                  </div>
                )}

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
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    {t('fleet.shiftManagement.preTripInspection', 'Pre-Trip Inspection Checklist')}
                  </Label>
                  <p className="text-xs text-muted-foreground">All items must pass before vehicle operation. Defects must be reported to fleet manager immediately.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'tiresOk', label: 'Tyres & Wheels - condition, pressure, tread depth' },
                      { key: 'lightsOk', label: 'Lights & Signals - all working, clean lenses' },
                      { key: 'brakesOk', label: 'Brakes - service brake, parking brake, air pressure' },
                      { key: 'fluidsOk', label: 'Fluids - oil, coolant, AdBlue, washer fluid' },
                      { key: 'mirrorsOk', label: 'Mirrors - clean, adjusted, no damage' },
                      { key: 'hornOk', label: 'Horn - operational' },
                      { key: 'wipersOk', label: 'Wipers & Washers - blades, fluid, operation' },
                      { key: 'safetyEquipmentOk', label: 'Safety Equipment - triangle, hi-vis, extinguisher, first aid' },
                    ].map(item => (
                      <div key={item.key} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <Checkbox 
                          id={item.key}
                          checked={checkinForm[item.key as keyof CheckinFormData] as boolean}
                          onCheckedChange={(checked) => setCheckinForm({...checkinForm, [item.key]: checked})}
                        />
                        <Label htmlFor={item.key} className="cursor-pointer text-sm leading-tight">{item.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <Checkbox 
                    id="vehicleClean"
                    checked={checkinForm.vehicleClean}
                    onCheckedChange={(checked) => setCheckinForm({...checkinForm, vehicleClean: checked as boolean})}
                  />
                  <Label htmlFor="vehicleClean" className="cursor-pointer text-sm">
                    {t('fleet.shiftManagement.vehicleClean', 'Vehicle is clean and presentable')}
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    {t('fleet.shiftManagement.defectsNoted', 'Defects or Issues Noted')}
                  </Label>
                  <Textarea 
                    placeholder="Describe any defects or issues found during inspection. Critical defects must be reported before vehicle operation."
                    value={checkinForm.defectsNoted}
                    onChange={(e) => setCheckinForm({...checkinForm, defectsNoted: e.target.value})}
                  />
                </div>

                <Button onClick={handleCheckin} disabled={checkinMutation.isPending} className="w-full gap-2">
                  {checkinMutation.isPending ? (
                    <><Clock className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> {t('fleet.shiftManagement.confirmCheckIn', 'Confirm Check-In')}</>
                  )}
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  {t('fleet.shiftManagement.newHandover', 'Create Shift Handover')}
                </DialogTitle>
                <DialogDescription>
                  {t('fleet.shiftManagement.handoverDesc', 'Document vehicle condition and notes for the next driver. Safety-critical issues must be flagged.')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.vehicle', 'Vehicle')}</Label>
                    <NativeSelect value={handoverForm.vehicleId} onValueChange={(v) => setHandoverForm({...handoverForm, vehicleId: v})} placeholder="Select vehicle">
                      {vehicles.map(v => (
                        <NativeSelectItem key={v.id} value={v.id}>{getVehicleDisplayName(v)}</NativeSelectItem>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.incomingDriver', 'Incoming Driver (Optional)')}</Label>
                    <NativeSelect value={handoverForm.incomingOperatorId} onValueChange={(v) => setHandoverForm({...handoverForm, incomingOperatorId: v})} placeholder="Select driver">
                      {operators.map(o => (
                        <NativeSelectItem key={o.id} value={o.id}>{getOperatorDisplayName(o)}</NativeSelectItem>
                      ))}
                    </NativeSelect>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('fleet.shiftManagement.condition', 'Vehicle Condition')}</Label>
                    <NativeSelect value={handoverForm.vehicleCondition} onValueChange={(v) => setHandoverForm({...handoverForm, vehicleCondition: v})}>
                      <NativeSelectItem value="excellent">Excellent</NativeSelectItem>
                      <NativeSelectItem value="good">Good</NativeSelectItem>
                      <NativeSelectItem value="fair">Fair</NativeSelectItem>
                      <NativeSelectItem value="poor">Poor</NativeSelectItem>
                      <NativeSelectItem value="critical">Critical - Do Not Operate</NativeSelectItem>
                    </NativeSelect>
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
                    placeholder="General notes about the vehicle and shift. Include tyre pressure status, AdBlue level, trailer condition, any route information for next driver."
                    value={handoverForm.handoverNotes}
                    onChange={(e) => setHandoverForm({...handoverForm, handoverNotes: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {t('fleet.shiftManagement.urgentIssues', 'Urgent Safety Issues')}
                  </Label>
                  <Textarea 
                    placeholder="ANY safety or mechanical issues that require immediate attention before next journey. If critical, vehicle must be taken out of service."
                    className="border-red-200 dark:border-red-800"
                    value={handoverForm.urgentIssues}
                    onChange={(e) => setHandoverForm({...handoverForm, urgentIssues: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('fleet.shiftManagement.recommendedActions', 'Recommended Actions')}</Label>
                  <Textarea 
                    placeholder="Suggestions for next driver, fleet manager, or maintenance team. Include service due dates, workshop bookings needed, etc."
                    value={handoverForm.recommendedActions}
                    onChange={(e) => setHandoverForm({...handoverForm, recommendedActions: e.target.value})}
                  />
                </div>

                <Button onClick={handleHandover} disabled={handoverMutation.isPending} className="w-full gap-2">
                  {handoverMutation.isPending ? (
                    <><Clock className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><ArrowRightLeft className="w-4 h-4" /> {t('fleet.shiftManagement.confirmHandover', 'Create Handover Record')}</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {driverSessions.length > 0 && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-600 animate-pulse" />
              Live Satnav Sessions ({driverSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="flex flex-wrap gap-2">
              {driverSessions.map(session => (
                <Badge key={session.operatorId} variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1">
                  <Navigation className="w-3 h-3" />
                  {session.operatorName} - {session.vehicleRegistration}
                  {session.speed !== undefined && session.speed > 0 && (
                    <span className="ml-1 text-xs">({Math.round(session.speed)} mph)</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              <CardDescription>{t('fleet.shiftManagement.currentlyActiveDesc', 'Drivers currently checked in with their assigned vehicles. Green indicator shows live satnav connection.')}</CardDescription>
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
                      const satnavSession = checkin.operatorId ? getDriverSession(checkin.operatorId) : null;
                      return (
                        <Card key={checkin.id} className={`border-l-4 ${satnavSession ? 'border-l-green-500' : 'border-l-blue-500'}`}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <User className="w-5 h-5 text-blue-600" />
                                  <span className="font-semibold">{checkin.operatorName}</span>
                                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">Active</Badge>
                                  {satnavSession && (
                                    <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
                                      <Navigation className="w-3 h-3" />
                                      On Satnav
                                    </Badge>
                                  )}
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
                                  <span>Odometer: {checkin.checkInOdometer?.toLocaleString()} mi</span>
                                  <span>Fuel: {checkin.checkInFuelLevel}%</span>
                                  <span className={inspection.allPassed ? 'text-green-600' : 'text-orange-600'}>
                                    Inspection: {inspection.passed}/{inspection.total} passed
                                  </span>
                                </div>
                                {satnavSession && satnavSession.speed !== undefined && (
                                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                    <Navigation className="w-4 h-4" />
                                    <span>Current speed: {Math.round(satnavSession.speed)} mph</span>
                                    {satnavSession.latitude && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({satnavSession.latitude.toFixed(4)}, {satnavSession.longitude?.toFixed(4)})
                                      </span>
                                    )}
                                  </div>
                                )}
                                {checkin.defectsNoted && (
                                  <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
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
                  <NativeSelect value={dateFilter} onValueChange={setDateFilter} className="w-[140px]">
                    <NativeSelectItem value="today">Today</NativeSelectItem>
                    <NativeSelectItem value="week">This Week</NativeSelectItem>
                    <NativeSelectItem value="month">This Month</NativeSelectItem>
                    <NativeSelectItem value="all">All Time</NativeSelectItem>
                  </NativeSelect>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {completedCheckins.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No completed shifts found</p>
                    </div>
                  ) : completedCheckins.map(checkin => (
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
                                <p className="text-xs">Odometer: {checkin.checkInOdometer?.toLocaleString()} mi</p>
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
                              <div className="flex items-center gap-4 text-sm bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                <span>Miles Driven: {checkin.milesDriven.toLocaleString()}</span>
                                {checkin.fuelUsed && <span>Fuel Used: {checkin.fuelUsed.toFixed(1)} litres</span>}
                              </div>
                            )}
                            {checkin.postTripNotes && (
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{checkin.postTripNotes}</span>
                              </div>
                            )}
                            {checkin.issuesReported && (
                              <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{checkin.issuesReported}</span>
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
              <CardDescription>{t('fleet.shiftManagement.shiftHandoversDesc', 'Vehicle handover records and pending acknowledgments. Unacknowledged handovers require incoming driver confirmation.')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {handovers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No handover records found</p>
                    </div>
                  ) : handovers.map(handover => (
                    <Card key={handover.id} className={`border-l-4 ${handover.acknowledged ? 'border-l-green-500' : 'border-l-orange-500'}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <Truck className="w-5 h-5 text-blue-600" />
                              <span className="font-semibold">{handover.vehicleName}</span>
                              {getConditionBadge(handover.vehicleCondition)}
                              {!handover.acknowledged && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">Pending Acknowledgment</Badge>
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
                              <div className="flex items-start gap-2 text-sm bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{handover.handoverNotes}</span>
                              </div>
                            )}
                            {handover.urgentIssues && (
                              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="font-semibold">URGENT: </span>
                                  <span>{handover.urgentIssues}</span>
                                </div>
                              </div>
                            )}
                            {handover.recommendedActions && (
                              <div className="flex items-start gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{handover.recommendedActions}</span>
                              </div>
                            )}
                          </div>
                          {!handover.acknowledged && (
                            <Button 
                              variant="outline" 
                              className="gap-2"
                              disabled={acknowledgeMutation.isPending}
                              onClick={() => acknowledgeMutation.mutate(handover.id)}
                            >
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
        <DialogContent className="max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              {t('fleet.shiftManagement.shiftCheckOut', 'Shift Check-Out')}
            </DialogTitle>
            <DialogDescription>
              {selectedCheckin && (
                <>Complete post-trip report for {selectedCheckin.vehicleName} - {selectedCheckin.operatorName}</>
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
                placeholder="Summary of your shift: route taken, deliveries completed, PODs collected, tachograph compliance notes..."
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
                placeholder="Any issues encountered during shift: mechanical problems, near misses, damaged goods, road incidents, tachograph warnings..."
                className="border-orange-200 dark:border-orange-800"
                value={checkoutForm.issuesReported}
                onChange={(e) => setCheckoutForm({...checkoutForm, issuesReported: e.target.value})}
              />
            </div>

            <Button onClick={handleCheckout} disabled={checkoutMutation.isPending} className="w-full gap-2">
              {checkoutMutation.isPending ? (
                <><Clock className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> {t('fleet.shiftManagement.confirmCheckOut', 'Confirm Check-Out')}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
