import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Radio, RefreshCw, MapPin, Truck, AlertCircle } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface VehiclePosition {
  id: string;
  vehicleId: string;
  registration: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  status: 'moving' | 'stopped' | 'offline';
  lastUpdate: string;
  address?: string;
  operatorName?: string;
}

interface FleetGpsData {
  vehicles: VehiclePosition[];
  totalVehicles: number;
  movingCount: number;
  stoppedCount: number;
  offlineCount: number;
}

export function FleetTrackingTab() {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePosition | null>(null);

  const { data: fleetData, isLoading, refetch, isFetching, isError: isFleetError } = useQuery<FleetGpsData>({
    queryKey: ['/api/enterprise/gps/fleet'],
    queryFn: async () => {
      const response = await fetch('/api/enterprise/gps/fleet');
      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.warn('[DEV] Fleet GPS API unavailable, using demo data');
          return {
            vehicles: [
              { id: '1', vehicleId: 'v1', registration: 'AB12 CDE', latitude: 51.5074, longitude: -0.1278, speed: 45, heading: 90, status: 'moving' as const, lastUpdate: new Date().toISOString(), address: 'A1 Motorway, London', operatorName: 'John Smith' },
              { id: '2', vehicleId: 'v2', registration: 'FG34 HIJ', latitude: 52.4862, longitude: -1.8904, speed: 0, heading: 0, status: 'stopped' as const, lastUpdate: new Date(Date.now() - 600000).toISOString(), address: 'Birmingham Services', operatorName: 'Jane Doe' },
              { id: '3', vehicleId: 'v3', registration: 'KL56 MNO', latitude: 53.4808, longitude: -2.2426, speed: 0, heading: 0, status: 'offline' as const, lastUpdate: new Date(Date.now() - 3600000).toISOString(), address: 'Manchester Depot', operatorName: 'Bob Wilson' },
              { id: '4', vehicleId: 'v4', registration: 'PQ78 RST', latitude: 51.4545, longitude: -2.5879, speed: 62, heading: 180, status: 'moving' as const, lastUpdate: new Date().toISOString(), address: 'M5 Motorway, Bristol', operatorName: 'Alice Brown' },
              { id: '5', vehicleId: 'v5', registration: 'UV90 WXY', latitude: 55.9533, longitude: -3.1883, speed: 0, heading: 45, status: 'stopped' as const, lastUpdate: new Date(Date.now() - 300000).toISOString(), address: 'Edinburgh Hub', operatorName: 'Charlie Davis' },
            ],
            totalVehicles: 5,
            movingCount: 2,
            stoppedCount: 2,
            offlineCount: 1,
          };
        }
        toast({ title: 'Failed to load fleet data', description: 'Unable to fetch GPS tracking data', variant: 'destructive' });
        throw new Error('Failed to load fleet data');
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current).setView([53.0, -1.5], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !fleetData?.vehicles) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    fleetData.vehicles.forEach(vehicle => {
      const color = vehicle.status === 'moving' ? '#22c55e' : vehicle.status === 'stopped' ? '#eab308' : '#6b7280';
      
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M8 3L13.5 10L19 3V10L13.5 17L8 10V3Z" stroke="white" stroke-width="2"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([vehicle.latitude, vehicle.longitude], { icon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <strong>${vehicle.registration}</strong><br/>
          ${vehicle.operatorName || 'Unknown'}<br/>
          Speed: ${vehicle.speed} mph<br/>
          ${vehicle.address || 'Unknown location'}
        `);

      marker.on('click', () => {
        setSelectedVehicle(vehicle);
      });

      markersRef.current.set(vehicle.id, marker);
    });
  }, [fleetData?.vehicles]);

  const handleVehicleClick = (vehicle: VehiclePosition) => {
    setSelectedVehicle(vehicle);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([vehicle.latitude, vehicle.longitude], 12);
      const marker = markersRef.current.get(vehicle.id);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const getStatusBadge = (status: VehiclePosition['status']) => {
    switch (status) {
      case 'moving':
        return <Badge className="bg-green-500 text-white" data-testid="badge-status-moving">Moving</Badge>;
      case 'stopped':
        return <Badge className="bg-yellow-500 text-white" data-testid="badge-status-stopped">Stopped</Badge>;
      case 'offline':
        return <Badge className="bg-gray-500 text-white" data-testid="badge-status-offline">Offline</Badge>;
    }
  };

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-vehicles">{fleetData?.totalVehicles || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Moving
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-moving-count">{fleetData?.movingCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              Stopped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-stopped-count">{fleetData?.stoppedCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              Offline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600" data-testid="text-offline-count">{fleetData?.offlineCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-5 h-5" />
                Fleet Map
              </CardTitle>
              <CardDescription>Real-time vehicle positions</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              data-testid="button-refresh-positions"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapRef} 
              className="h-[400px] rounded-lg border"
              data-testid="map-fleet-tracking"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Vehicle List
            </CardTitle>
            <CardDescription>Click to locate on map</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading vehicles...</div>
              ) : isFleetError && !import.meta.env.DEV ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Unable to load vehicle data</p>
                  <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page</p>
                </div>
              ) : !fleetData?.vehicles?.length ? (
                <div className="text-center py-8 text-muted-foreground">No vehicles found</div>
              ) : (
                <div className="space-y-1 p-4">
                  {fleetData.vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                        selectedVehicle?.id === vehicle.id ? 'bg-muted border border-primary' : ''
                      }`}
                      onClick={() => handleVehicleClick(vehicle)}
                      data-testid={`vehicle-item-${vehicle.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium" data-testid={`text-registration-${vehicle.id}`}>
                          {vehicle.registration}
                        </span>
                        {getStatusBadge(vehicle.status)}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {vehicle.address || 'Unknown location'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                        <span>{vehicle.operatorName || 'Unassigned'}</span>
                        <span>{formatLastUpdate(vehicle.lastUpdate)}</span>
                      </div>
                      {vehicle.status === 'moving' && (
                        <div className="text-xs text-green-600 mt-1">
                          Speed: {vehicle.speed} mph
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {selectedVehicle && (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details: {selectedVehicle.registration}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Operator</div>
                <div className="font-medium" data-testid="text-selected-operator">
                  {selectedVehicle.operatorName || 'Unassigned'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Current Speed</div>
                <div className="font-medium" data-testid="text-selected-speed">
                  {selectedVehicle.speed} mph
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Location</div>
                <div className="font-medium" data-testid="text-selected-location">
                  {selectedVehicle.address || 'Unknown'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Last Update</div>
                <div className="font-medium" data-testid="text-selected-lastupdate">
                  {formatLastUpdate(selectedVehicle.lastUpdate)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
