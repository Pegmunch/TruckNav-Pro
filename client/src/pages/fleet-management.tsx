import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Truck, Users, Wrench, Fuel, Plus, Edit, Trash2, AlertTriangle, CheckCircle, FileText, Download, BarChart3, MapPin, Shield, Radio, Activity, Clock, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FleetVehicle, Operator, ServiceRecord, FuelLog, VehicleAttachment } from '@shared/schema';
import { format } from 'date-fns';
import { DesktopHeader } from '@/components/navigation/desktop-header';
import { NotificationsBanner } from '@/components/fleet/notifications-banner';
import { CostAnalyticsDashboard } from '@/components/fleet-analytics-dashboard';
import { IncidentsTab } from '@/components/fleet-incidents-tab';
import { TripsTab } from '@/components/fleet-trips-tab';
import { ComplianceTab } from '@/components/fleet-compliance-tab';
import { FleetTrackingTab } from '@/components/fleet/fleet-tracking-tab';
import { DriverBehaviorTab } from '@/components/fleet/driver-behavior-tab';
import { HoursOfServiceTab } from '@/components/fleet/hos-tab';
import { CustomerBillingTab } from '@/components/fleet/customer-billing-tab';

export default function FleetManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('vehicles');
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddFuelLogOpen, setIsAddFuelLogOpen] = useState(false);
  const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);

  return (
    <>
      {/* Desktop-Only Navigation Header */}
      <DesktopHeader />
      
      <div className="min-h-screen bg-background p-6 lg:pt-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Fleet Management System</h1>
            <p className="text-muted-foreground">Manage vehicles, operators, service records, and fuel consumption</p>
          </div>

          {/* Notifications Banner */}
          <NotificationsBanner />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap w-full mb-6 h-auto gap-1 p-1">
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
        </Tabs>
        </div>
      </div>
    </>
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
      const data = await response.json();
      performance.mark('fleet-vehicles-fetch-end');
      performance.measure('fleet-vehicles-fetch', 'fleet-vehicles-fetch-start', 'fleet-vehicles-fetch-end');
      const measure = performance.getEntriesByName('fleet-vehicles-fetch')[0];
      console.log(`[PERF-FLEET] ✅ Fleet vehicles loaded: ${data.length} vehicles in ${measure.duration.toFixed(0)}ms`);
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      performance.mark('fleet-vehicle-delete-start');
      console.log('[PERF-FLEET] 🗑️ Deleting vehicle:', id);
      const response = await fetch(`/api/fleet/vehicles/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete vehicle');
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
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Fleet Vehicles</CardTitle>
          <CardDescription>Manage all vehicles in your fleet</CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-vehicle">
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <AddVehicleDialog onClose={() => setIsAddOpen(false)} />
        </Dialog>
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

function AddVehicleDialog({ onClose }: { onClose: () => void }) {
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
      if (!response.ok) throw new Error('Failed to create vehicle');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/vehicles'] });
      toast({ title: 'Vehicle added successfully' });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Vehicle</DialogTitle>
        <DialogDescription>Enter the vehicle details below</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="registration">Registration *</Label>
            <Input
              id="registration"
              required
              value={formData.registration}
              onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
              data-testid="input-registration"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trailerNumber">Trailer Number</Label>
            <Input
              id="trailerNumber"
              value={formData.trailerNumber}
              onChange={(e) => setFormData({ ...formData, trailerNumber: e.target.value })}
              data-testid="input-trailer-number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="make">Make *</Label>
            <Input
              id="make"
              required
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              placeholder="e.g., Volvo"
              data-testid="input-make"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              required
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g., FH16"
              data-testid="input-model"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Year *</Label>
            <Input
              id="year"
              type="number"
              required
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              data-testid="input-year"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              data-testid="input-vin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle Type *</Label>
            <Select value={formData.vehicleType} onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}>
              <SelectTrigger data-testid="select-vehicle-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="lorry">Lorry</SelectItem>
                <SelectItem value="trailer">Trailer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuelType">Fuel Type *</Label>
            <Select value={formData.fuelType} onValueChange={(value) => setFormData({ ...formData, fuelType: value })}>
              <SelectTrigger data-testid="select-fuel-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="petrol">Petrol</SelectItem>
                <SelectItem value="electric">Electric</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tankCapacity">Tank Capacity (L)</Label>
            <Input
              id="tankCapacity"
              type="number"
              value={formData.tankCapacity}
              onChange={(e) => setFormData({ ...formData, tankCapacity: parseFloat(e.target.value) })}
              data-testid="input-tank-capacity"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentMileage">Current Mileage</Label>
            <Input
              id="currentMileage"
              type="number"
              value={formData.currentMileage}
              onChange={(e) => setFormData({ ...formData, currentMileage: parseFloat(e.target.value) })}
              data-testid="input-mileage"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="input-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-vehicle">
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
      if (!response.ok) throw new Error('Failed to delete document');
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
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Vehicle Documents</CardTitle>
          <CardDescription>Manage vehicle registration, MOT, insurance, and maintenance documents</CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-document">
              <Plus className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <AddDocumentDialog onClose={() => setIsAddOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="vehicle-select">Select Vehicle</Label>
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger id="vehicle-select" data-testid="select-document-vehicle">
                <SelectValue placeholder="Select a vehicle to view documents" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration} - {vehicle.make} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                        <TableCell>{format(new Date(attachment.uploadedAt), 'dd/MM/yyyy')}</TableCell>
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

function AddDocumentDialog({ onClose }: { onClose: () => void }) {
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Upload Vehicle Document</DialogTitle>
        <DialogDescription>Upload registration, MOT, insurance, or maintenance documents</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle *</Label>
            <Select value={formData.vehicleId} onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}>
              <SelectTrigger data-testid="select-upload-vehicle">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration} - {vehicle.make} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fileType">Document Type *</Label>
            <Select value={formData.fileType} onValueChange={(value: any) => setFormData({ ...formData, fileType: value })}>
              <SelectTrigger data-testid="select-file-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="registration">Registration</SelectItem>
                <SelectItem value="mot">MOT</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="file">File *</Label>
            <Input
              id="file"
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              data-testid="input-document-file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., 2024 MOT Certificate"
              data-testid="input-document-description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending || !file} data-testid="button-submit-document">
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
      if (!response.ok) throw new Error('Failed to delete operator');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/operators'] });
      toast({ title: 'Operator deleted successfully' });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Operators</CardTitle>
          <CardDescription>Manage drivers and operators</CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-operator">
              <Plus className="w-4 h-4 mr-2" />
              Add Operator
            </Button>
          </DialogTrigger>
          <AddOperatorDialog onClose={() => setIsAddOpen(false)} />
        </Dialog>
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

function AddOperatorDialog({ onClose }: { onClose: () => void }) {
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
      if (!response.ok) throw new Error('Failed to create operator');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/operators'] });
      toast({ title: 'Operator added successfully' });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Operator</DialogTitle>
        <DialogDescription>Enter the operator/driver details below</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              data-testid="input-first-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              data-testid="input-last-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              data-testid="input-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              data-testid="input-phone"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License Number *</Label>
            <Input
              id="licenseNumber"
              required
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              data-testid="input-license-number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseType">License Type *</Label>
            <Select value={formData.licenseType} onValueChange={(value) => setFormData({ ...formData, licenseType: value })}>
              <SelectTrigger data-testid="select-license-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C">C (Rigid Vehicle)</SelectItem>
                <SelectItem value="C+E">C+E (Articulated Vehicle)</SelectItem>
                <SelectItem value="C1">C1 (Light Rigid)</SelectItem>
                <SelectItem value="C1+E">C1+E (Light Articulated)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseExpiry">License Expiry *</Label>
            <Input
              id="licenseExpiry"
              type="date"
              required
              value={formData.licenseExpiry}
              onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
              data-testid="input-license-expiry"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverCQCExpiry">Driver CPC Expiry</Label>
            <Input
              id="driverCQCExpiry"
              type="date"
              value={formData.driverCQCExpiry}
              onChange={(e) => setFormData({ ...formData, driverCQCExpiry: e.target.value })}
              data-testid="input-cqc-expiry"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee ID</Label>
            <Input
              id="employeeId"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              data-testid="input-employee-id"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="input-operator-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-operator">
            {createMutation.isPending ? 'Adding...' : 'Add Operator'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

