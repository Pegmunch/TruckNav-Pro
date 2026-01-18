import { useState, useEffect, useMemo } from 'react';

// Detect iOS/iPadOS Safari (including PWA)
function useIsIOSSafari() {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/i.test(ua);
    const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua) && !/CriOS/i.test(ua);
    return (isIOS || isIPadOS) && isSafari;
  }, []);
}
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { NativeSelect, NativeSelectItem } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Truck, Users, Wrench, Fuel, Plus, Edit, Trash2, AlertTriangle, CheckCircle, FileText, Download, BarChart3, MapPin, Shield, Radio, Activity, Clock, CreditCard, MapPinned, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FleetVehicle, Operator, ServiceRecord, FuelLog, VehicleAttachment } from '@shared/schema';
import { format } from 'date-fns';
import { DesktopHeader } from '@/components/navigation/desktop-header';
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider';
import { NotificationsBanner } from '@/components/fleet/notifications-banner';
import { CostAnalyticsDashboard } from '@/components/fleet-analytics-dashboard';
import { IncidentsTab } from '@/components/fleet-incidents-tab';
import { TripsTab } from '@/components/fleet-trips-tab';
import { ComplianceTab } from '@/components/fleet-compliance-tab';
import { FleetTrackingTab } from '@/components/fleet/fleet-tracking-tab';
import { DriverBehaviorTab } from '@/components/fleet/driver-behavior-tab';
import { HoursOfServiceTab } from '@/components/fleet/hos-tab';
import { CustomerBillingTab } from '@/components/fleet/customer-billing-tab';
import { GeofencingTab } from '@/components/fleet/geofencing-tab';
import { UserGuideTab } from '@/components/fleet/user-guide-tab';
import { Link } from 'wouter';

function MobileRestrictionScreen() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <Monitor className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-xl">Desktop Only</CardTitle>
          <CardDescription className="text-base mt-2">
            Fleet Management is designed for desktop use only. Please access this feature from a computer or tablet with a larger screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Fleet Management System requires a larger display to properly view vehicle data, analytics, and manage your fleet operations.
          </p>
          <Link href="/">
            <Button className="w-full">
              <Truck className="w-4 h-4 mr-2" />
              Return to Navigation
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FleetManagement() {
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('vehicles');
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddFuelLogOpen, setIsAddFuelLogOpen] = useState(false);
  const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return <MobileRestrictionScreen />;
  }

  return (
    <OnboardingProvider isReady={true} isFleetPage={true}>
      {/* Desktop-Only Navigation Header */}
      <DesktopHeader />
      
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6 lg:pt-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Fleet Management System</h1>
            <p className="text-muted-foreground">Manage vehicles, operators, service records, and fuel consumption</p>
          </div>

          {/* Notifications Banner */}
          <NotificationsBanner />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap w-full mb-6 h-auto gap-1 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <TabsTrigger value="vehicles" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-vehicles">
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Vehicles</span>
              <span className="sm:hidden">V</span>
            </TabsTrigger>
            <TabsTrigger value="operators" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-operators">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Operators</span>
              <span className="sm:hidden">O</span>
            </TabsTrigger>
            <TabsTrigger value="service" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-service">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Service</span>
              <span className="sm:hidden">S</span>
            </TabsTrigger>
            <TabsTrigger value="fuel" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-fuel">
              <Fuel className="w-4 h-4" />
              <span className="hidden sm:inline">Fuel</span>
              <span className="sm:hidden">F</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-documents">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Docs</span>
              <span className="sm:hidden">D</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">A</span>
            </TabsTrigger>
            <TabsTrigger value="incidents" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-incidents">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Incidents</span>
              <span className="sm:hidden">I</span>
            </TabsTrigger>
            <TabsTrigger value="trips" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-trips">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Trips</span>
              <span className="sm:hidden">T</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-compliance">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Compliance</span>
              <span className="sm:hidden">C</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-tracking">
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline">Tracking</span>
              <span className="sm:hidden">TR</span>
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-behavior">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Behavior</span>
              <span className="sm:hidden">B</span>
            </TabsTrigger>
            <TabsTrigger value="hos" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-hos">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">HoS</span>
              <span className="sm:hidden">H</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-billing">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Billing</span>
              <span className="sm:hidden">$</span>
            </TabsTrigger>
            <TabsTrigger value="geofencing" className="flex items-center gap-2 text-xs sm:text-sm" data-testid="tab-geofencing">
              <MapPinned className="w-4 h-4" />
              <span className="hidden sm:inline">Geofencing</span>
              <span className="sm:hidden">G</span>
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-2 text-xs sm:text-sm bg-blue-100 dark:bg-blue-900/30" data-testid="tab-guide">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">User Guide</span>
              <span className="sm:hidden">?</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles">
            <VehiclesTab isAddOpen={isAddVehicleOpen} setIsAddOpen={setIsAddVehicleOpen} />
          </TabsContent>

          <TabsContent value="operators">
            <OperatorsTab isAddOpen={isAddOperatorOpen} setIsAddOpen={setIsAddOperatorOpen} />
          </TabsContent>

          <TabsContent value="service">
            <ServiceRecordsTab isAddOpen={isAddServiceOpen} setIsAddOpen={setIsAddServiceOpen} />
          </TabsContent>

          <TabsContent value="fuel">
            <FuelLogsTab isAddOpen={isAddFuelLogOpen} setIsAddOpen={setIsAddFuelLogOpen} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab isAddOpen={isAddDocumentOpen} setIsAddOpen={setIsAddDocumentOpen} />
          </TabsContent>

          <TabsContent value="analytics">
            <CostAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="incidents">
            <IncidentsTab />
          </TabsContent>

          <TabsContent value="trips">
            <TripsTab />
          </TabsContent>

          <TabsContent value="compliance">
            <ComplianceTab />
          </TabsContent>

          <TabsContent value="tracking">
            <FleetTrackingTab />
          </TabsContent>

          <TabsContent value="behavior">
            <DriverBehaviorTab />
          </TabsContent>

          <TabsContent value="hos">
            <HoursOfServiceTab />
          </TabsContent>

          <TabsContent value="billing">
            <CustomerBillingTab />
          </TabsContent>

          <TabsContent value="geofencing">
            <GeofencingTab />
          </TabsContent>

          <TabsContent value="guide">
            <UserGuideTab />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </OnboardingProvider>
  );
}

function VehiclesTab({ isAddOpen, setIsAddOpen }: { isAddOpen: boolean; setIsAddOpen: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: vehicles = [], isLoading } = useQuery<FleetVehicle[]>({
    queryKey: ['/api/fleet/vehicles'],
    queryFn: async () => {
      performance.mark('fleet-vehicles-fetch-start');
      console.log('[PERF-FLEET] 🚗 Fetching fleet vehicles...');
      const response = await fetch('/api/fleet/vehicles');
      if (!response.ok) {
        console.log('[PERF-FLEET] ❌ Fleet vehicles fetch failed:', response.status);
        return [];
      }
      const data = await response.json();
      performance.mark('fleet-vehicles-fetch-end');
      performance.measure('fleet-vehicles-fetch', 'fleet-vehicles-fetch-start', 'fleet-vehicles-fetch-end');
      const measure = performance.getEntriesByName('fleet-vehicles-fetch')[0];
      console.log(`[PERF-FLEET] ✅ Fleet vehicles loaded: ${Array.isArray(data) ? data.length : 0} vehicles in ${measure.duration.toFixed(0)}ms`);
      return Array.isArray(data) ? data : [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      performance.mark('fleet-vehicle-delete-start');
      console.log('[PERF-FLEET] 🗑️ Deleting vehicle:', id);
      const response = await fetch(`/api/fleet/vehicles/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete vehicle');
      }
      const result = await response.json();
      performance.mark('fleet-vehicle-delete-end');
      performance.measure('fleet-vehicle-delete', 'fleet-vehicle-delete-start', 'fleet-vehicle-delete-end');
      const measure = performance.getEntriesByName('fleet-vehicle-delete')[0];
      console.log(`[PERF-FLEET] ✅ Vehicle deleted in ${measure.duration.toFixed(0)}ms`);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/vehicles'] });
      toast({ title: 'Vehicle deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete vehicle', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Fleet Vehicles</CardTitle>
          <CardDescription>Manage all vehicles in your fleet</CardDescription>
        </div>
        <Button data-testid="button-add-vehicle" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
        {/* Use Sheet on iOS to avoid Radix Dialog double-render bug */}
        {useIsIOSSafari() ? (
          <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
            <AddVehicleDialog onClose={() => setIsAddOpen(false)} isIOS={true} />
          </Sheet>
        ) : (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <AddVehicleDialog onClose={() => setIsAddOpen(false)} isIOS={false} />
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading vehicles...</div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No vehicles found. Add your first vehicle to get started.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registration</TableHead>
                <TableHead>Trailer Number</TableHead>
                <TableHead>Make & Model</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mileage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id} data-testid={`row-vehicle-${vehicle.id}`}>
                  <TableCell className="font-medium">{vehicle.registration}</TableCell>
                  <TableCell>{vehicle.trailerNumber || '—'}</TableCell>
                  <TableCell>{vehicle.make} {vehicle.model}</TableCell>
                  <TableCell>{vehicle.year}</TableCell>
                  <TableCell className="capitalize">{vehicle.vehicleType}</TableCell>
                  <TableCell>{vehicle.currentMileage?.toLocaleString() || '0'} mi</TableCell>
                  <TableCell>
                    <Badge variant={vehicle.status === 'active' ? 'default' : vehicle.status === 'maintenance' ? 'secondary' : 'destructive'}>
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(vehicle.id)}
                      data-testid={`button-delete-vehicle-${vehicle.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AddVehicleDialog({ onClose, isIOS }: { onClose: () => void; isIOS: boolean }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    registration: '',
    trailerNumber: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    vehicleType: 'truck',
    fuelType: 'diesel',
    tankCapacity: 0,
    status: 'active',
    currentMileage: 0,
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/fleet/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create vehicle');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/vehicles'] });
      toast({ title: 'Vehicle added successfully' });
      onClose();
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to add vehicle', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const formContent = (
    <div className="grid grid-cols-2 gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="registration">Registration *</Label>
        <Input id="registration" required value={formData.registration} onChange={(e) => setFormData({ ...formData, registration: e.target.value })} data-testid="input-registration" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="trailerNumber">Trailer Number</Label>
        <Input id="trailerNumber" value={formData.trailerNumber} onChange={(e) => setFormData({ ...formData, trailerNumber: e.target.value })} data-testid="input-trailer-number" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="make">Make *</Label>
        <Input id="make" required value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} placeholder="e.g., Volvo" data-testid="input-make" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">Model *</Label>
        <Input id="model" required value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="e.g., FH16" data-testid="input-model" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="year">Year *</Label>
        <Input id="year" type="number" required value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} data-testid="input-year" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vin">VIN</Label>
        <Input id="vin" value={formData.vin} onChange={(e) => setFormData({ ...formData, vin: e.target.value })} data-testid="input-vin" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vehicleType">Vehicle Type *</Label>
        <NativeSelect value={formData.vehicleType} onValueChange={(value) => setFormData({ ...formData, vehicleType: value })} data-testid="select-vehicle-type">
          <NativeSelectItem value="truck">Truck</NativeSelectItem>
          <NativeSelectItem value="van">Van</NativeSelectItem>
          <NativeSelectItem value="lorry">Lorry</NativeSelectItem>
          <NativeSelectItem value="trailer">Trailer</NativeSelectItem>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fuelType">Fuel Type *</Label>
        <NativeSelect value={formData.fuelType} onValueChange={(value) => setFormData({ ...formData, fuelType: value })} data-testid="select-fuel-type">
          <NativeSelectItem value="diesel">Diesel</NativeSelectItem>
          <NativeSelectItem value="petrol">Petrol</NativeSelectItem>
          <NativeSelectItem value="electric">Electric</NativeSelectItem>
          <NativeSelectItem value="hybrid">Hybrid</NativeSelectItem>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tankCapacity">Tank Capacity (L)</Label>
        <Input id="tankCapacity" type="number" value={formData.tankCapacity} onChange={(e) => setFormData({ ...formData, tankCapacity: parseFloat(e.target.value) })} data-testid="input-tank-capacity" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currentMileage">Current Mileage</Label>
        <Input id="currentMileage" type="number" value={formData.currentMileage} onChange={(e) => setFormData({ ...formData, currentMileage: parseFloat(e.target.value) })} data-testid="input-mileage" />
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} data-testid="input-notes" />
      </div>
    </div>
  );

  if (isIOS) {
    return (
      <SheetContent side="bottom" className="h-[90vh] rounded-t-xl bg-white dark:bg-gray-900 flex flex-col p-0">
        <SheetHeader className="p-6 pb-0 flex-shrink-0">
          <SheetTitle>Add New Vehicle</SheetTitle>
          <SheetDescription>Enter the vehicle details below</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 touch-pan-y overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {formContent}
          </div>
          <SheetFooter className="p-6 pt-4 flex-shrink-0 border-t">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-vehicle" className="min-h-[44px] w-full">
              {createMutation.isPending ? 'Adding...' : 'Add Vehicle'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    );
  }

  return (
    <DialogContent data-testid="dialog-add-vehicle" className="max-w-2xl max-h-[85vh] bg-white dark:bg-gray-900 border-none shadow-2xl flex flex-col p-0">
      <DialogHeader className="p-6 pb-0 flex-shrink-0">
        <DialogTitle>Add New Vehicle</DialogTitle>
        <DialogDescription>Enter the vehicle details below</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 touch-pan-y overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {formContent}
        </div>
        <DialogFooter className="p-6 pt-4 flex-shrink-0 border-t">
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-vehicle" className="min-h-[44px]">
            {createMutation.isPending ? 'Adding...' : 'Add Vehicle'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function DocumentsTab({ isAddOpen, setIsAddOpen }: { isAddOpen: boolean; setIsAddOpen: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: vehicles = [] } = useQuery<FleetVehicle[]>({
    queryKey: ['/api/fleet/vehicles'],
  });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const { data: attachments = [], isLoading: isLoadingAttachments } = useQuery<VehicleAttachment[]>({
    queryKey: ['/api/fleet/documents', selectedVehicleId],
    enabled: !!selectedVehicleId,
    queryFn: async () => {
      performance.mark('fleet-documents-fetch-start');
      console.log('[PERF-FLEET] 📄 Fetching documents for vehicle:', selectedVehicleId);
      const response = await fetch(`/api/fleet/documents/${selectedVehicleId}`);
      const data = await response.json();
      performance.mark('fleet-documents-fetch-end');
      performance.measure('fleet-documents-fetch', 'fleet-documents-fetch-start', 'fleet-documents-fetch-end');
      const measure = performance.getEntriesByName('fleet-documents-fetch')[0];
      console.log(`[PERF-FLEET] ✅ Documents loaded: ${data.length} files in ${measure.duration.toFixed(0)}ms`);
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      performance.mark('fleet-document-delete-start');
      console.log('[PERF-FLEET] 🗑️ Deleting document:', attachmentId);
      const response = await fetch(`/api/fleet/documents/${attachmentId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete document');
      }
      const result = await response.json();
      performance.mark('fleet-document-delete-end');
      performance.measure('fleet-document-delete', 'fleet-document-delete-start', 'fleet-document-delete-end');
      const measure = performance.getEntriesByName('fleet-document-delete')[0];
      console.log(`[PERF-FLEET] ✅ Document deleted in ${measure.duration.toFixed(0)}ms`);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/documents', selectedVehicleId] });
      toast({ title: 'Document deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete document', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Vehicle Documents</CardTitle>
          <CardDescription>Manage vehicle registration, MOT, insurance, and maintenance documents</CardDescription>
        </div>
        <Button data-testid="button-add-document" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
        {useIsIOSSafari() ? (
          <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
            <AddDocumentDialog onClose={() => setIsAddOpen(false)} isIOS={true} />
          </Sheet>
        ) : (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <AddDocumentDialog onClose={() => setIsAddOpen(false)} isIOS={false} />
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="vehicle-select">Select Vehicle</Label>
            <NativeSelect value={selectedVehicleId} onValueChange={setSelectedVehicleId} placeholder="Select a vehicle to view documents" data-testid="select-document-vehicle">
              {vehicles.map((vehicle) => (
                <NativeSelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration} - {vehicle.make} {vehicle.model}
                </NativeSelectItem>
              ))}
            </NativeSelect>
          </div>

          {selectedVehicleId && (
            <>
              {isLoadingAttachments ? (
                <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
              ) : attachments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No documents uploaded for this vehicle yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attachments.map((attachment) => (
                      <TableRow key={attachment.id} data-testid={`row-document-${attachment.id}`}>
                        <TableCell className="font-medium">{attachment.fileName}</TableCell>
                        <TableCell className="capitalize">{attachment.fileType}</TableCell>
                        <TableCell>{attachment.uploadedAt ? format(new Date(attachment.uploadedAt), 'dd/MM/yyyy') : '—'}</TableCell>
                        <TableCell>{attachment.fileSize ? `${(attachment.fileSize / 1024 / 1024).toFixed(2)} MB` : '—'}</TableCell>
                        <TableCell className="space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/api/fleet/documents/download/${attachment.id}`, '_blank')}
                            data-testid={`button-download-document-${attachment.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(attachment.id)}
                            data-testid={`button-delete-document-${attachment.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AddDocumentDialog({ onClose, isIOS }: { onClose: () => void; isIOS: boolean }) {
  const { toast } = useToast();
  const { data: vehicles = [] } = useQuery<FleetVehicle[]>({
    queryKey: ['/api/fleet/vehicles'],
  });
  const [formData, setFormData] = useState({
    vehicleId: '',
    fileType: 'registration' as const,
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!file || !formData.vehicleId) throw new Error('Missing file or vehicle');
      
      performance.mark('fleet-document-upload-start');
      console.log('[PERF-FLEET] 📤 Uploading document:', file.name);
      
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      formDataObj.append('vehicleId', formData.vehicleId);
      formDataObj.append('fileType', formData.fileType);
      formDataObj.append('description', formData.description);

      const response = await fetch('/api/fleet/documents/upload', {
        method: 'POST',
        body: formDataObj,
      });
      if (!response.ok) throw new Error('Failed to upload document');
      
      performance.mark('fleet-document-upload-end');
      performance.measure('fleet-document-upload', 'fleet-document-upload-start', 'fleet-document-upload-end');
      const measure = performance.getEntriesByName('fleet-document-upload')[0];
      console.log(`[PERF-FLEET] ✅ Document uploaded in ${measure.duration.toFixed(0)}ms`);
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/documents', formData.vehicleId] });
      toast({ title: 'Document uploaded successfully' });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to upload document', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !formData.vehicleId) {
      toast({ title: 'Please select a vehicle and file', variant: 'destructive' });
      return;
    }
    createMutation.mutate();
  };

  const formContent = (
    <>
      <div className="grid grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="vehicleId">Vehicle *</Label>
          <NativeSelect value={formData.vehicleId} onValueChange={(value) => setFormData({ ...formData, vehicleId: value })} placeholder="Select vehicle" data-testid="select-upload-vehicle">
            {vehicles.map((vehicle) => (
              <NativeSelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.registration} - {vehicle.make} {vehicle.model}
              </NativeSelectItem>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fileType">Document Type *</Label>
          <NativeSelect value={formData.fileType} onValueChange={(value: any) => setFormData({ ...formData, fileType: value })} data-testid="select-file-type">
            <NativeSelectItem value="registration">Registration</NativeSelectItem>
            <NativeSelectItem value="mot">MOT</NativeSelectItem>
            <NativeSelectItem value="insurance">Insurance</NativeSelectItem>
            <NativeSelectItem value="maintenance">Maintenance</NativeSelectItem>
            <NativeSelectItem value="other">Other</NativeSelectItem>
          </NativeSelect>
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="file">File *</Label>
          <Input id="file" type="file" required onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="input-document-file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., 2024 MOT Certificate" data-testid="input-document-description" />
        </div>
      </div>
    </>
  );

  if (isIOS) {
    return (
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl bg-white dark:bg-gray-900 flex flex-col p-0">
        <SheetHeader className="p-6 pb-0 flex-shrink-0">
          <SheetTitle>Upload Vehicle Document</SheetTitle>
          <SheetDescription>Upload registration, MOT, insurance, or maintenance documents</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 touch-pan-y overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {formContent}
          </div>
          <SheetFooter className="p-6 pt-4 flex-shrink-0 border-t">
            <Button type="submit" disabled={createMutation.isPending || !file} data-testid="button-submit-document" className="min-h-[44px] w-full">
              {createMutation.isPending ? 'Uploading...' : 'Upload Document'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    );
  }

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] bg-white dark:bg-gray-900 border-none shadow-2xl flex flex-col p-0">
      <DialogHeader className="p-6 pb-0 flex-shrink-0">
        <DialogTitle>Upload Vehicle Document</DialogTitle>
        <DialogDescription>Upload registration, MOT, insurance, or maintenance documents</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 touch-pan-y overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {formContent}
        </div>
        <DialogFooter className="p-6 pt-4 flex-shrink-0 border-t">
          <Button type="submit" disabled={createMutation.isPending || !file} data-testid="button-submit-document" className="min-h-[44px]">
            {createMutation.isPending ? 'Uploading...' : 'Upload Document'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function OperatorsTab({ isAddOpen, setIsAddOpen }: { isAddOpen: boolean; setIsAddOpen: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: operators = [], isLoading } = useQuery<Operator[]>({
    queryKey: ['/api/fleet/operators'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/fleet/operators/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete operator');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/operators'] });
      toast({ title: 'Operator deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete operator', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Operators</CardTitle>
          <CardDescription>Manage drivers and operators</CardDescription>
        </div>
        <Button data-testid="button-add-operator" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Operator
        </Button>
        {useIsIOSSafari() ? (
          <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
            <AddOperatorDialog onClose={() => setIsAddOpen(false)} isIOS={true} />
          </Sheet>
        ) : (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <AddOperatorDialog onClose={() => setIsAddOpen(false)} isIOS={false} />
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading operators...</div>
        ) : operators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No operators found. Add your first operator to get started.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>License Number</TableHead>
                <TableHead>License Type</TableHead>
                <TableHead>Operators License</TableHead>
                <TableHead>Tachograph Calibration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((operator) => (
                <TableRow key={operator.id} data-testid={`row-operator-${operator.id}`}>
                  <TableCell className="font-medium">{operator.firstName} {operator.lastName}</TableCell>
                  <TableCell>{operator.licenseNumber}</TableCell>
                  <TableCell>{operator.licenseType}</TableCell>
                  <TableCell>
                    {operator.licenseExpiry ? format(new Date(operator.licenseExpiry), 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    {operator.tachographCardExpiry ? format(new Date(operator.tachographCardExpiry), 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={operator.status === 'active' ? 'default' : 'secondary'}>
                      {operator.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(operator.id)}
                      data-testid={`button-delete-operator-${operator.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AddOperatorDialog({ onClose, isIOS }: { onClose: () => void; isIOS: boolean }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseType: 'C',
    licenseExpiry: '',
    driverCQCExpiry: '',
    employeeId: '',
    status: 'active',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/fleet/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : undefined,
          driverCQCExpiry: data.driverCQCExpiry ? new Date(data.driverCQCExpiry) : undefined,
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create operator');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/operators'] });
      toast({ title: 'Operator added successfully' });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add operator', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.licenseNumber) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData);
  };

  const formContent = (
    <div className="grid grid-cols-2 gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name *</Label>
        <Input id="firstName" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} data-testid="input-first-name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name *</Label>
        <Input id="lastName" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} data-testid="input-last-name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} data-testid="input-email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} data-testid="input-phone" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="licenseNumber">License Number *</Label>
        <Input id="licenseNumber" required value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} data-testid="input-license-number" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="licenseType">License Type *</Label>
        <NativeSelect value={formData.licenseType} onValueChange={(value) => setFormData({ ...formData, licenseType: value })} data-testid="select-license-type">
          <NativeSelectItem value="C">C (Rigid Vehicle)</NativeSelectItem>
          <NativeSelectItem value="C+E">C+E (Articulated Vehicle)</NativeSelectItem>
          <NativeSelectItem value="C1">C1 (Light Rigid)</NativeSelectItem>
          <NativeSelectItem value="C1+E">C1+E (Light Articulated)</NativeSelectItem>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="licenseExpiry">License Expiry *</Label>
        <Input id="licenseExpiry" type="date" required value={formData.licenseExpiry} onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })} data-testid="input-license-expiry" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="driverCQCExpiry">Driver CPC Expiry</Label>
        <Input id="driverCQCExpiry" type="date" value={formData.driverCQCExpiry} onChange={(e) => setFormData({ ...formData, driverCQCExpiry: e.target.value })} data-testid="input-cqc-expiry" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="employeeId">Employee ID</Label>
        <Input id="employeeId" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} data-testid="input-employee-id" />
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} data-testid="input-operator-notes" />
      </div>
    </div>
  );

  if (isIOS) {
    return (
      <SheetContent side="bottom" className="h-[90vh] rounded-t-xl bg-white dark:bg-gray-900 flex flex-col p-0">
        <SheetHeader className="p-6 pb-0 flex-shrink-0">
          <SheetTitle>Add New Operator</SheetTitle>
          <SheetDescription>Enter the operator/driver details below</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 touch-pan-y overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {formContent}
          </div>
          <SheetFooter className="p-6 pt-4 flex-shrink-0 border-t">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-operator" className="min-h-[44px] w-full">
              {createMutation.isPending ? 'Adding...' : 'Add Operator'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    );
  }

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] bg-white dark:bg-gray-900 border-none shadow-2xl flex flex-col p-0">
      <DialogHeader className="p-6 pb-0 flex-shrink-0">
        <DialogTitle>Add New Operator</DialogTitle>
        <DialogDescription>Enter the operator/driver details below</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 touch-pan-y overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {formContent}
        </div>
        <DialogFooter className="p-6 pt-4 flex-shrink-0 border-t">
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-operator" className="min-h-[44px]">
            {createMutation.isPending ? 'Adding...' : 'Add Operator'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ServiceRecordsTab({ isAddOpen, setIsAddOpen }: { isAddOpen: boolean; setIsAddOpen: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: records = [], isLoading } = useQuery<ServiceRecord[]>({
    queryKey: ['/api/fleet/service-records'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/fleet/service-records/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete service record');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/service-records'] });
      toast({ title: 'Service record deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete service record', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Service Records</CardTitle>
          <CardDescription>Track maintenance and service history</CardDescription>
        </div>
        <Button data-testid="button-add-service" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service Record
        </Button>
        {useIsIOSSafari() ? (
          <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
            <AddServiceDialog onClose={() => setIsAddOpen(false)} isIOS={true} />
          </Sheet>
        ) : (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <AddServiceDialog onClose={() => setIsAddOpen(false)} isIOS={false} />
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading service records...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No service records found.</div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Service records loaded: {records.length}</div>
        )}
      </CardContent>
    </Card>
  );
}

function AddServiceDialog({ onClose, isIOS }: { onClose: () => void; isIOS: boolean }) {
  const { toast } = useToast();
  const { data: vehicles = [] } = useQuery<FleetVehicle[]>({
    queryKey: ['/api/fleet/vehicles'],
  });
  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceType: 'routine' as const,
    description: '',
    cost: '',
    serviceDate: new Date().toISOString().split('T')[0],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/fleet/service-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add service record');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/service-records'] });
      toast({ title: 'Service record added successfully' });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add service record', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId) {
      toast({ title: 'Please select a vehicle', variant: 'destructive' });
      return;
    }
    createMutation.mutate();
  };

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vehicle">Vehicle *</Label>
        <NativeSelect value={formData.vehicleId} onValueChange={(value) => setFormData({ ...formData, vehicleId: value })} placeholder="Select vehicle" data-testid="select-service-vehicle">
          {vehicles.map((vehicle) => (
            <NativeSelectItem key={vehicle.id} value={vehicle.id}>
              {vehicle.registration} - {vehicle.make} {vehicle.model}
            </NativeSelectItem>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="serviceType">Service Type *</Label>
        <NativeSelect value={formData.serviceType} onValueChange={(value: any) => setFormData({ ...formData, serviceType: value })} data-testid="select-service-type">
          <NativeSelectItem value="routine">Routine Maintenance</NativeSelectItem>
          <NativeSelectItem value="mot">MOT</NativeSelectItem>
          <NativeSelectItem value="repair">Repair</NativeSelectItem>
          <NativeSelectItem value="inspection">Inspection</NativeSelectItem>
          <NativeSelectItem value="tyre">Tyre Change</NativeSelectItem>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="serviceDate">Service Date *</Label>
        <Input id="serviceDate" type="date" value={formData.serviceDate} onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })} data-testid="input-service-date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" placeholder="e.g., Oil change, brake pads replaced" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} data-testid="input-service-description" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cost">Cost (£)</Label>
        <Input id="cost" type="number" placeholder="0.00" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} data-testid="input-service-cost" />
      </div>
    </div>
  );

  if (isIOS) {
    return (
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl bg-white dark:bg-gray-900 flex flex-col p-0">
        <SheetHeader className="p-6 pb-0 flex-shrink-0">
          <SheetTitle>Add Service Record</SheetTitle>
          <SheetDescription>Record maintenance and service history</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 touch-pan-y overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {formContent}
          </div>
          <SheetFooter className="p-6 pt-4 flex-shrink-0 border-t">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-service" className="min-h-[44px] w-full">
              {createMutation.isPending ? 'Adding...' : 'Add Record'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    );
  }

  return (
    <DialogContent data-testid="dialog-add-service" className="max-h-[85vh] bg-white dark:bg-gray-900 border-none shadow-2xl flex flex-col p-0">
      <DialogHeader className="p-6 pb-0 flex-shrink-0">
        <DialogTitle>Add Service Record</DialogTitle>
        <DialogDescription>Record maintenance and service history</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4 touch-pan-y overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {formContent}
        </div>
        <DialogFooter className="p-6 pt-4 flex-shrink-0 border-t">
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-service" className="min-h-[44px]">
            {createMutation.isPending ? 'Adding...' : 'Add Record'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function FuelLogsTab({ isAddOpen, setIsAddOpen }: { isAddOpen: boolean; setIsAddOpen: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: logs = [], isLoading } = useQuery<FuelLog[]>({
    queryKey: ['/api/fleet/fuel-logs'],
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Fuel Logs</CardTitle>
          <CardDescription>Track fuel consumption and efficiency</CardDescription>
        </div>
        <Button data-testid="button-add-fuel" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Fuel Log
        </Button>
        {useIsIOSSafari() ? (
          <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
            <AddFuelDialog onClose={() => setIsAddOpen(false)} isIOS={true} />
          </Sheet>
        ) : (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <AddFuelDialog onClose={() => setIsAddOpen(false)} isIOS={false} />
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading fuel logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No fuel logs found.</div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Fuel logs loaded: {logs.length}</div>
        )}
      </CardContent>
    </Card>
  );
}

function AddFuelDialog({ onClose, isIOS }: { onClose: () => void; isIOS: boolean }) {
  const { toast } = useToast();
  const { data: vehicles = [] } = useQuery<FleetVehicle[]>({
    queryKey: ['/api/fleet/vehicles'],
  });
  const [formData, setFormData] = useState({
    vehicleId: '',
    liters: '',
    cost: '',
    odometer: '',
    fuelDate: new Date().toISOString().split('T')[0],
    station: '',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/fleet/fuel-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add fuel log');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/fuel-logs'] });
      toast({ title: 'Fuel log added successfully' });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add fuel log', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.liters) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate();
  };

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vehicle">Vehicle *</Label>
        <NativeSelect value={formData.vehicleId} onValueChange={(value) => setFormData({ ...formData, vehicleId: value })} placeholder="Select vehicle" data-testid="select-fuel-vehicle">
          {vehicles.map((vehicle) => (
            <NativeSelectItem key={vehicle.id} value={vehicle.id}>
              {vehicle.registration} - {vehicle.make} {vehicle.model}
            </NativeSelectItem>
          ))}
        </NativeSelect>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="liters">Litres *</Label>
          <Input id="liters" type="number" placeholder="0.00" value={formData.liters} onChange={(e) => setFormData({ ...formData, liters: e.target.value })} data-testid="input-liters" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Total Cost (£)</Label>
          <Input id="cost" type="number" placeholder="0.00" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} data-testid="input-fuel-cost" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="odometer">Odometer Reading</Label>
          <Input id="odometer" type="number" placeholder="Current mileage" value={formData.odometer} onChange={(e) => setFormData({ ...formData, odometer: e.target.value })} data-testid="input-odometer" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fuelDate">Date *</Label>
          <Input id="fuelDate" type="date" value={formData.fuelDate} onChange={(e) => setFormData({ ...formData, fuelDate: e.target.value })} data-testid="input-fuel-date" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="station">Fuel Station</Label>
        <Input id="station" placeholder="e.g., BP, Shell, Esso" value={formData.station} onChange={(e) => setFormData({ ...formData, station: e.target.value })} data-testid="input-station" />
      </div>
    </div>
  );

  if (isIOS) {
    return (
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl bg-white dark:bg-gray-900 flex flex-col p-0">
        <SheetHeader className="p-6 pb-0 flex-shrink-0">
          <SheetTitle>Add Fuel Log</SheetTitle>
          <SheetDescription>Record fuel purchases for tracking</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 touch-pan-y overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {formContent}
          </div>
          <SheetFooter className="p-6 pt-4 flex-shrink-0 border-t">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-fuel" className="min-h-[44px] w-full">
              {createMutation.isPending ? 'Adding...' : 'Add Fuel Log'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    );
  }

  return (
    <DialogContent data-testid="dialog-add-fuel" className="max-h-[85vh] bg-white dark:bg-gray-900 border-none shadow-2xl flex flex-col p-0">
      <DialogHeader className="p-6 pb-0 flex-shrink-0">
        <DialogTitle>Add Fuel Log</DialogTitle>
        <DialogDescription>Record fuel purchases for tracking</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4 touch-pan-y overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {formContent}
        </div>
        <DialogFooter className="p-6 pt-4 flex-shrink-0 border-t">
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-fuel" className="min-h-[44px]">
            {createMutation.isPending ? 'Adding...' : 'Add Fuel Log'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

