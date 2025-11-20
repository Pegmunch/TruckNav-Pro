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
import { Truck, Users, Wrench, Fuel, Plus, Edit, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FleetVehicle, Operator, ServiceRecord, FuelLog } from '@shared/schema';
import { format } from 'date-fns';
import { DesktopHeader } from '@/components/navigation/desktop-header';

export default function FleetManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('vehicles');
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddFuelLogOpen, setIsAddFuelLogOpen] = useState(false);

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="vehicles" className="flex items-center gap-2" data-testid="tab-vehicles">
              <Truck className="w-4 h-4" />
              Vehicles
            </TabsTrigger>
            <TabsTrigger value="operators" className="flex items-center gap-2" data-testid="tab-operators">
              <Users className="w-4 h-4" />
              Operators
            </TabsTrigger>
            <TabsTrigger value="service" className="flex items-center gap-2" data-testid="tab-service">
              <Wrench className="w-4 h-4" />
              Service Records
            </TabsTrigger>
            <TabsTrigger value="fuel" className="flex items-center gap-2" data-testid="tab-fuel">
              <Fuel className="w-4 h-4" />
              Fuel Logs
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
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/fleet/vehicles/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete vehicle');
      return response.json();
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
                <TableHead>License Expiry</TableHead>
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

function ServiceRecordsTab({ isAddOpen, setIsAddOpen }: { isAddOpen: boolean; setIsAddOpen: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: upcomingServices = [], isLoading } = useQuery<ServiceRecord[]>({
    queryKey: ['/api/fleet/service-records/upcoming'],
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Service Records</CardTitle>
          <CardDescription>Track vehicle maintenance and services</CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-service">
              <Plus className="w-4 h-4 mr-2" />
              Add Service Record
            </Button>
          </DialogTrigger>
          <AddServiceDialog onClose={() => setIsAddOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Upcoming Services (Next 30 Days)
          </h3>
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading services...</div>
        ) : upcomingServices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No upcoming services scheduled.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Next Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingServices.map((service) => (
                <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                  <TableCell className="font-medium">{service.vehicleId}</TableCell>
                  <TableCell className="capitalize">{service.serviceType}</TableCell>
                  <TableCell>
                    {service.nextServiceDue ? format(new Date(service.nextServiceDue), 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{service.status || 'scheduled'}</Badge>
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

function AddServiceDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data: vehicles = [] } = useQuery<FleetVehicle[]>({
    queryKey: ['/api/fleet/vehicles/active'],
  });

  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceType: 'routine',
    serviceDate: new Date().toISOString().split('T')[0],
    nextServiceDue: '',
    mileageAtService: 0,
    serviceCost: 0,
    serviceProvider: '',
    description: '',
    status: 'completed',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/fleet/service-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          serviceDate: new Date(data.serviceDate),
          nextServiceDue: data.nextServiceDue ? new Date(data.nextServiceDue) : undefined,
        })
      });
      if (!response.ok) throw new Error('Failed to create service record');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/service-records'] });
      toast({ title: 'Service record added successfully' });
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
        <DialogTitle>Add Service Record</DialogTitle>
        <DialogDescription>Record vehicle maintenance and service details</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle *</Label>
            <Select value={formData.vehicleId} onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}>
              <SelectTrigger data-testid="select-service-vehicle">
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
            <Label htmlFor="serviceType">Service Type *</Label>
            <Select value={formData.serviceType} onValueChange={(value) => setFormData({ ...formData, serviceType: value })}>
              <SelectTrigger data-testid="select-service-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine Service</SelectItem>
                <SelectItem value="mot">MOT Test</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="tachograph_calibration">Tachograph Calibration</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceDate">Service Date *</Label>
            <Input
              id="serviceDate"
              type="date"
              required
              value={formData.serviceDate}
              onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
              data-testid="input-service-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextServiceDue">Next Service Due</Label>
            <Input
              id="nextServiceDue"
              type="date"
              value={formData.nextServiceDue}
              onChange={(e) => setFormData({ ...formData, nextServiceDue: e.target.value })}
              data-testid="input-next-service-due"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mileageAtService">Mileage at Service</Label>
            <Input
              id="mileageAtService"
              type="number"
              value={formData.mileageAtService}
              onChange={(e) => setFormData({ ...formData, mileageAtService: parseFloat(e.target.value) })}
              data-testid="input-service-mileage"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceCost">Service Cost (£)</Label>
            <Input
              id="serviceCost"
              type="number"
              step="0.01"
              value={formData.serviceCost}
              onChange={(e) => setFormData({ ...formData, serviceCost: parseFloat(e.target.value) })}
              data-testid="input-service-cost"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="serviceProvider">Service Provider</Label>
            <Input
              id="serviceProvider"
              value={formData.serviceProvider}
              onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
              placeholder="e.g., ABC Garage Ltd"
              data-testid="input-service-provider"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="input-service-description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-service">
            {createMutation.isPending ? 'Adding...' : 'Add Service Record'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function FuelLogsTab({ isAddOpen, setIsAddOpen }: { isAddOpen: boolean; setIsAddOpen: (open: boolean) => void }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const { data: vehicles = [] } = useQuery<FleetVehicle[]>({
    queryKey: ['/api/fleet/vehicles/active'],
  });

  const { data: fuelLogs = [] } = useQuery<FuelLog[]>({
    queryKey: ['/api/fleet/fuel-logs/vehicle', selectedVehicleId],
    enabled: !!selectedVehicleId,
  });

  const { data: efficiency } = useQuery<{ averageMPG: number; totalFuelCost: number; totalLiters: number }>({
    queryKey: ['/api/fleet/fuel-logs/vehicle', selectedVehicleId, 'efficiency'],
    enabled: !!selectedVehicleId,
  });

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const calculatedStats = selectedVehicleId && fuelLogs.length > 0 ? {
    totalFillUps: fuelLogs.length,
    totalLiters: fuelLogs.reduce((sum, log) => sum + (log.liters || 0), 0),
    totalCost: fuelLogs.reduce((sum, log) => sum + parseFloat(log.totalCost?.toString() || '0'), 0),
    averageCostPerLiter: fuelLogs.length > 0 
      ? fuelLogs.reduce((sum, log) => sum + parseFloat(log.costPerLiter?.toString() || '0'), 0) / fuelLogs.filter(log => log.costPerLiter).length
      : 0,
    distanceTraveled: fuelLogs.length >= 2
      ? Math.max(...fuelLogs.map(log => log.odometer || 0)) - Math.min(...fuelLogs.map(log => log.odometer || 0))
      : 0,
    averageMPG: efficiency?.averageMPG || 0,
    costPerMile: 0,
  } : null;

  if (calculatedStats && calculatedStats.distanceTraveled > 0) {
    calculatedStats.costPerMile = calculatedStats.totalCost / calculatedStats.distanceTraveled;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Fuel Logs</CardTitle>
          <CardDescription>Track fuel consumption and efficiency with automatic calculations</CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-fuel-log">
              <Plus className="w-4 h-4 mr-2" />
              Add Fuel Log
            </Button>
          </DialogTrigger>
          <AddFuelLogDialog onClose={() => setIsAddOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent>
        {vehicles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Add vehicles first to start tracking fuel consumption.</div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="vehicle-select" className="whitespace-nowrap">Select Vehicle:</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger id="vehicle-select" className="max-w-md" data-testid="select-fuel-vehicle-filter">
                  <SelectValue placeholder="Choose a vehicle to view fuel logs" />
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

            {selectedVehicleId && calculatedStats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Fill-Ups</div>
                    <div className="text-2xl font-bold" data-testid="stat-total-fillups">{calculatedStats.totalFillUps}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Fuel (L)</div>
                    <div className="text-2xl font-bold" data-testid="stat-total-liters">{calculatedStats.totalLiters.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
                    <div className="text-2xl font-bold text-red-600" data-testid="stat-total-cost">£{calculatedStats.totalCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Avg MPG</div>
                    <div className="text-2xl font-bold text-green-600" data-testid="stat-avg-mpg">
                      {calculatedStats.averageMPG > 0 ? calculatedStats.averageMPG.toFixed(1) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Distance Traveled</div>
                    <div className="text-2xl font-bold" data-testid="stat-distance">{calculatedStats.distanceTraveled.toLocaleString()} mi</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Avg Cost/Liter</div>
                    <div className="text-2xl font-bold" data-testid="stat-avg-cost-per-liter">
                      £{calculatedStats.averageCostPerLiter > 0 ? calculatedStats.averageCostPerLiter.toFixed(3) : '0.000'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Cost per Mile</div>
                    <div className="text-2xl font-bold" data-testid="stat-cost-per-mile">
                      £{calculatedStats.costPerMile > 0 ? calculatedStats.costPerMile.toFixed(3) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Current Mileage</div>
                    <div className="text-2xl font-bold" data-testid="stat-current-mileage">
                      {selectedVehicle?.currentMileage?.toLocaleString() || '0'} mi
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Fuel Log History</h3>
                  {fuelLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No fuel logs found for this vehicle.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Odometer</TableHead>
                          <TableHead>Liters</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Cost/L</TableHead>
                          <TableHead>MPG</TableHead>
                          <TableHead>Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fuelLogs.map((log) => (
                          <TableRow key={log.id} data-testid={`row-fuel-log-${log.id}`}>
                            <TableCell>{log.fillDate ? format(new Date(log.fillDate), 'dd/MM/yyyy') : '—'}</TableCell>
                            <TableCell>{log.odometer?.toLocaleString() || '—'} mi</TableCell>
                            <TableCell>{log.liters?.toFixed(1) || '—'} L</TableCell>
                            <TableCell>£{log.totalCost ? parseFloat(log.totalCost.toString()).toFixed(2) : '—'}</TableCell>
                            <TableCell>£{log.costPerLiter ? parseFloat(log.costPerLiter.toString()).toFixed(3) : '—'}</TableCell>
                            <TableCell className={log.mpg && log.mpg > 0 ? 'text-green-600 font-medium' : ''}>
                              {log.mpg && log.mpg > 0 ? log.mpg.toFixed(1) : '—'}
                            </TableCell>
                            <TableCell>{log.location || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </>
            )}

            {!selectedVehicleId && (
              <div className="text-center py-8 text-muted-foreground">Select a vehicle above to view fuel logs and consumption statistics.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddFuelLogDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data: vehicles = [] } = useQuery<FleetVehicle[]>({
    queryKey: ['/api/fleet/vehicles/active'],
  });
  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ['/api/fleet/operators/active'],
  });

  const [formData, setFormData] = useState({
    vehicleId: '',
    operatorId: '',
    fillDate: new Date().toISOString().split('T')[0],
    odometer: 0,
    liters: 0,
    costPerLiter: 0,
    totalCost: 0,
    fuelType: 'diesel',
    location: '',
    fullTank: true,
    mpg: 0,
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/fleet/fuel-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          fillDate: new Date(data.fillDate),
          operatorId: data.operatorId || undefined,
        })
      });
      if (!response.ok) throw new Error('Failed to create fuel log');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/fuel-logs'] });
      toast({ title: 'Fuel log added successfully' });
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
        <DialogTitle>Add Fuel Log</DialogTitle>
        <DialogDescription>Record fuel fill-up details</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle *</Label>
            <Select value={formData.vehicleId} onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}>
              <SelectTrigger data-testid="select-fuel-vehicle">
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
            <Label htmlFor="operatorId">Operator</Label>
            <Select value={formData.operatorId} onValueChange={(value) => setFormData({ ...formData, operatorId: value })}>
              <SelectTrigger data-testid="select-fuel-operator">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((operator) => (
                  <SelectItem key={operator.id} value={operator.id}>
                    {operator.firstName} {operator.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fillDate">Fill Date *</Label>
            <Input
              id="fillDate"
              type="date"
              required
              value={formData.fillDate}
              onChange={(e) => setFormData({ ...formData, fillDate: e.target.value })}
              data-testid="input-fill-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="odometer">Odometer Reading *</Label>
            <Input
              id="odometer"
              type="number"
              required
              value={formData.odometer}
              onChange={(e) => setFormData({ ...formData, odometer: parseFloat(e.target.value) })}
              data-testid="input-odometer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="liters">Liters *</Label>
            <Input
              id="liters"
              type="number"
              step="0.01"
              required
              value={formData.liters}
              onChange={(e) => setFormData({ ...formData, liters: parseFloat(e.target.value) })}
              data-testid="input-liters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalCost">Total Cost (£) *</Label>
            <Input
              id="totalCost"
              type="number"
              step="0.01"
              required
              value={formData.totalCost}
              onChange={(e) => setFormData({ ...formData, totalCost: parseFloat(e.target.value) })}
              data-testid="input-total-cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Shell Station, M1 Services"
              data-testid="input-location"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mpg">MPG</Label>
            <Input
              id="mpg"
              type="number"
              step="0.1"
              value={formData.mpg}
              onChange={(e) => setFormData({ ...formData, mpg: parseFloat(e.target.value) })}
              data-testid="input-mpg"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-fuel-log">
            {createMutation.isPending ? 'Adding...' : 'Add Fuel Log'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
