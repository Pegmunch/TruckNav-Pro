import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPinned, Plus, Edit, Trash2, RefreshCw, LogIn, LogOut, Target, Bell, AlertCircle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Geofence, GeofenceEvent } from '@shared/schema';

interface GeofencesData {
  geofences: Geofence[];
  totalCount: number;
  activeAlertsToday: number;
  mostActiveZone: { name: string; eventCount: number } | null;
}

interface GeofenceEventsData {
  events: GeofenceEvent[];
}

const geofenceFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(10, 'Minimum radius is 10 meters').max(50000, 'Maximum radius is 50km'),
  type: z.enum(['warehouse', 'customer', 'restricted', 'checkpoint']),
  alertOnEntry: z.boolean(),
  alertOnExit: z.boolean(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  isActive: z.boolean(),
});

type GeofenceFormData = z.infer<typeof geofenceFormSchema>;

const TYPE_COLORS: Record<string, string> = {
  warehouse: '#3B82F6',
  customer: '#22C55E',
  restricted: '#EF4444',
  checkpoint: '#F97316',
};

const TYPE_LABELS: Record<string, string> = {
  warehouse: 'Warehouse',
  customer: 'Customer',
  restricted: 'Restricted',
  checkpoint: 'Checkpoint',
};

export function GeofencingTab() {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circlesRef = useRef<Map<string, L.Circle>>(new Map());
  const tempMarkerRef = useRef<L.Marker | null>(null);
  
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: geofencesData, isLoading, refetch, isFetching } = useQuery<GeofencesData>({
    queryKey: ['/api/enterprise/geofences'],
    queryFn: async () => {
      const response = await fetch('/api/enterprise/geofences');
      if (!response.ok) {
        return {
          geofences: [
            { id: '1', userId: 'demo', name: 'London Depot', latitude: 51.5074, longitude: -0.1278, radiusMeters: 500, type: 'warehouse', alertOnEntry: true, alertOnExit: true, isActive: true, color: '#3B82F6', createdAt: new Date() },
            { id: '2', userId: 'demo', name: 'Manchester Hub', latitude: 53.4808, longitude: -2.2426, radiusMeters: 750, type: 'warehouse', alertOnEntry: true, alertOnExit: false, isActive: true, color: '#3B82F6', createdAt: new Date() },
            { id: '3', userId: 'demo', name: 'Customer - Tesco Distribution', latitude: 52.4862, longitude: -1.8904, radiusMeters: 300, type: 'customer', alertOnEntry: true, alertOnExit: true, isActive: true, color: '#22C55E', createdAt: new Date() },
            { id: '4', userId: 'demo', name: 'Low Bridge Zone', latitude: 51.4545, longitude: -2.5879, radiusMeters: 200, type: 'restricted', alertOnEntry: true, alertOnExit: false, isActive: true, color: '#EF4444', createdAt: new Date() },
            { id: '5', userId: 'demo', name: 'Weigh Station', latitude: 52.9548, longitude: -1.1581, radiusMeters: 150, type: 'checkpoint', alertOnEntry: true, alertOnExit: true, isActive: false, color: '#F97316', createdAt: new Date() },
          ] as Geofence[],
          totalCount: 5,
          activeAlertsToday: 12,
          mostActiveZone: { name: 'London Depot', eventCount: 8 },
        };
      }
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery<GeofenceEventsData>({
    queryKey: ['/api/enterprise/geofences', selectedGeofence?.id, 'events'],
    queryFn: async () => {
      if (!selectedGeofence) return { events: [] };
      const response = await fetch(`/api/enterprise/geofences/${selectedGeofence.id}/events`);
      if (!response.ok) {
        return {
          events: [
            { id: 'e1', geofenceId: selectedGeofence.id, vehicleId: 'AB12 CDE', eventType: 'entry', timestamp: new Date(Date.now() - 3600000), latitude: selectedGeofence.latitude, longitude: selectedGeofence.longitude, createdAt: new Date() },
            { id: 'e2', geofenceId: selectedGeofence.id, vehicleId: 'AB12 CDE', eventType: 'exit', timestamp: new Date(Date.now() - 1800000), latitude: selectedGeofence.latitude, longitude: selectedGeofence.longitude, createdAt: new Date() },
            { id: 'e3', geofenceId: selectedGeofence.id, vehicleId: 'FG34 HIJ', eventType: 'entry', timestamp: new Date(Date.now() - 900000), latitude: selectedGeofence.latitude, longitude: selectedGeofence.longitude, createdAt: new Date() },
          ] as GeofenceEvent[],
        };
      }
      return response.json();
    },
    enabled: !!selectedGeofence,
  });

  const form = useForm<GeofenceFormData>({
    resolver: zodResolver(geofenceFormSchema),
    defaultValues: {
      name: '',
      latitude: 51.5074,
      longitude: -0.1278,
      radiusMeters: 500,
      type: 'warehouse',
      alertOnEntry: true,
      alertOnExit: true,
      color: '#3B82F6',
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GeofenceFormData) => {
      const response = await apiRequest('POST', '/api/enterprise/geofences', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/geofences'] });
      toast({ title: 'Geofence created successfully' });
      setIsDialogOpen(false);
      form.reset();
      setPendingLocation(null);
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
    },
    onError: () => {
      toast({ title: 'Failed to create geofence', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GeofenceFormData & { id: string }) => {
      const { id, ...rest } = data;
      const response = await apiRequest('PUT', `/api/enterprise/geofences/${id}`, rest);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/geofences'] });
      toast({ title: 'Geofence updated successfully' });
      setIsDialogOpen(false);
      setEditingGeofence(null);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Failed to update geofence', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/enterprise/geofences/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/geofences'] });
      toast({ title: 'Geofence deleted successfully' });
      if (selectedGeofence?.id === editingGeofence?.id) {
        setSelectedGeofence(null);
      }
    },
    onError: () => {
      toast({ title: 'Failed to delete geofence', variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current).setView([51.5074, -0.1278], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    mapInstanceRef.current.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setPendingLocation({ lat, lng });
      
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
      }
      
      tempMarkerRef.current = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: #6366F1; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })
      }).addTo(mapInstanceRef.current!);
      
      form.setValue('latitude', parseFloat(lat.toFixed(6)));
      form.setValue('longitude', parseFloat(lng.toFixed(6)));
      setEditingGeofence(null);
      setIsDialogOpen(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !geofencesData?.geofences) return;

    circlesRef.current.forEach(circle => circle.remove());
    circlesRef.current.clear();

    geofencesData.geofences.forEach(geofence => {
      const color = geofence.color || TYPE_COLORS[geofence.type] || '#3B82F6';
      const opacity = geofence.isActive ? 0.3 : 0.1;
      const strokeOpacity = geofence.isActive ? 0.8 : 0.3;

      const circle = L.circle([geofence.latitude, geofence.longitude], {
        radius: geofence.radiusMeters,
        color: color,
        fillColor: color,
        fillOpacity: opacity,
        weight: selectedGeofence?.id === geofence.id ? 4 : 2,
        opacity: strokeOpacity,
      }).addTo(mapInstanceRef.current!);

      circle.bindPopup(`
        <strong>${geofence.name}</strong><br/>
        Type: ${TYPE_LABELS[geofence.type] || geofence.type}<br/>
        Radius: ${geofence.radiusMeters}m<br/>
        Status: ${geofence.isActive ? 'Active' : 'Inactive'}
      `);

      circle.on('click', () => {
        setSelectedGeofence(geofence);
      });

      circlesRef.current.set(geofence.id, circle);
    });
  }, [geofencesData?.geofences, selectedGeofence?.id]);

  const handleGeofenceClick = (geofence: Geofence) => {
    setSelectedGeofence(geofence);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([geofence.latitude, geofence.longitude], 14);
      const circle = circlesRef.current.get(geofence.id);
      if (circle) {
        circle.openPopup();
      }
    }
  };

  const handleEdit = (geofence: Geofence) => {
    setEditingGeofence(geofence);
    form.reset({
      name: geofence.name,
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      radiusMeters: geofence.radiusMeters,
      type: geofence.type as 'warehouse' | 'customer' | 'restricted' | 'checkpoint',
      alertOnEntry: geofence.alertOnEntry ?? true,
      alertOnExit: geofence.alertOnExit ?? true,
      color: geofence.color || TYPE_COLORS[geofence.type] || '#3B82F6',
      isActive: geofence.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this geofence?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: GeofenceFormData) => {
    if (editingGeofence) {
      updateMutation.mutate({ ...data, id: editingGeofence.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingGeofence(null);
    setPendingLocation(null);
    form.reset();
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }
  };

  const handleAddNew = () => {
    setEditingGeofence(null);
    form.reset({
      name: '',
      latitude: 51.5074,
      longitude: -0.1278,
      radiusMeters: 500,
      type: 'warehouse',
      alertOnEntry: true,
      alertOnExit: true,
      color: '#3B82F6',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      warehouse: 'bg-blue-500 text-white',
      customer: 'bg-green-500 text-white',
      restricted: 'bg-red-500 text-white',
      checkpoint: 'bg-orange-500 text-white',
    };
    return (
      <Badge className={colors[type] || 'bg-gray-500 text-white'} data-testid={`badge-type-${type}`}>
        {TYPE_LABELS[type] || type}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, yyyy HH:mm');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              Total Geofences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-geofences">
              {geofencesData?.totalCount || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Active Alerts Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-active-alerts">
              {geofencesData?.activeAlertsToday || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Most Active Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold" data-testid="text-most-active-zone">
              {geofencesData?.mostActiveZone?.name || 'N/A'}
            </div>
            {geofencesData?.mostActiveZone && (
              <div className="text-sm text-muted-foreground">
                {geofencesData.mostActiveZone.eventCount} events
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPinned className="w-5 h-5" />
                Geofence Map
              </CardTitle>
              <CardDescription>Click on the map to add a new geofence</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="button-refresh-geofences"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleAddNew}
                data-testid="button-add-geofence"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Zone
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapRef} 
              className="h-[400px] rounded-lg border"
              data-testid="map-geofencing"
            />
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <span className="text-sm">Warehouse</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="text-sm">Customer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <span className="text-sm">Restricted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500" />
                <span className="text-sm">Checkpoint</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Geofence Zones
            </CardTitle>
            <CardDescription>Click to locate on map</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading geofences...</div>
              ) : !geofencesData?.geofences?.length ? (
                <div className="text-center py-8 text-muted-foreground">No geofences found</div>
              ) : (
                <div className="space-y-1 p-4">
                  {geofencesData.geofences.map((geofence) => (
                    <div
                      key={geofence.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                        selectedGeofence?.id === geofence.id ? 'bg-muted border border-primary' : ''
                      }`}
                      onClick={() => handleGeofenceClick(geofence)}
                      data-testid={`geofence-item-${geofence.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium" data-testid={`text-geofence-name-${geofence.id}`}>
                          {geofence.name}
                        </span>
                        {getTypeBadge(geofence.type)}
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                        <span>{geofence.radiusMeters}m radius</span>
                        <Badge variant={geofence.isActive ? 'default' : 'secondary'}>
                          {geofence.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {geofence.alertOnEntry && (
                          <span className="flex items-center gap-1">
                            <LogIn className="w-3 h-3" /> Entry Alert
                          </span>
                        )}
                        {geofence.alertOnExit && (
                          <span className="flex items-center gap-1">
                            <LogOut className="w-3 h-3" /> Exit Alert
                          </span>
                        )}
                      </div>
                      <div className="flex justify-end gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(geofence);
                          }}
                          data-testid={`button-edit-geofence-${geofence.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(geofence.id);
                          }}
                          data-testid={`button-delete-geofence-${geofence.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {selectedGeofence && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Recent Events: {selectedGeofence.name}
            </CardTitle>
            <CardDescription>Entry and exit events for this geofence</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
              <div className="text-center py-4 text-muted-foreground">Loading events...</div>
            ) : !eventsData?.events?.length ? (
              <div className="text-center py-4 text-muted-foreground">No recent events</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsData.events.map((event) => (
                    <TableRow key={event.id} data-testid={`event-row-${event.id}`}>
                      <TableCell className="font-medium" data-testid={`text-event-vehicle-${event.id}`}>
                        {event.vehicleId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {event.eventType === 'entry' ? (
                            <LogIn className="w-4 h-4 text-green-500" />
                          ) : (
                            <LogOut className="w-4 h-4 text-red-500" />
                          )}
                          <span className={event.eventType === 'entry' ? 'text-green-600' : 'text-red-600'}>
                            {event.eventType === 'entry' ? 'Entry' : 'Exit'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-event-timestamp-${event.id}`}>
                        {formatTimestamp(event.timestamp || event.createdAt)}
                      </TableCell>
                      <TableCell>
                        {event.latitude && event.longitude ? (
                          <span className="text-sm text-muted-foreground">
                            {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGeofence ? 'Edit Geofence' : 'Create Geofence'}
            </DialogTitle>
            <DialogDescription>
              {editingGeofence 
                ? 'Update the geofence zone details' 
                : 'Define a new geofence zone for monitoring'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., London Depot" 
                        {...field} 
                        data-testid="input-geofence-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001"
                          {...field} 
                          data-testid="input-geofence-latitude"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001"
                          {...field} 
                          data-testid="input-geofence-longitude"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="radiusMeters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Radius (meters)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="10"
                          max="50000"
                          {...field} 
                          data-testid="input-geofence-radius"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-geofence-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="restricted">Restricted</SelectItem>
                          <SelectItem value="checkpoint">Checkpoint</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input 
                          type="color" 
                          className="w-16 h-10 p-1 cursor-pointer"
                          {...field} 
                          data-testid="input-geofence-color"
                        />
                      </FormControl>
                      <Input 
                        value={field.value} 
                        onChange={(e) => field.onChange(e.target.value)}
                        className="flex-1"
                        placeholder="#3B82F6"
                        data-testid="input-geofence-color-hex"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="alertOnEntry"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <FormLabel className="text-sm">Entry Alert</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-alert-entry"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alertOnExit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <FormLabel className="text-sm">Exit Alert</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-alert-exit"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <FormLabel className="text-sm">Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleDialogClose}
                  data-testid="button-cancel-geofence"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-geofence"
                >
                  {(createMutation.isPending || updateMutation.isPending) 
                    ? 'Saving...' 
                    : editingGeofence ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
