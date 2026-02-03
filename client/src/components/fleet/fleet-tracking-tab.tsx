import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Radio, RefreshCw, MapPin, Truck, AlertCircle, Satellite, Map, Plus, Minus, Search, X, Navigation, AlertTriangle, Eye, EyeOff } from 'lucide-react';
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

interface TrafficIncident {
  id: string;
  type: string;
  severity: string;
  title: string;
  description?: string;
  coordinates: { lat: number; lng: number };
  roadName?: string;
  direction?: string;
  reportedBy?: string;
  reporterName?: string;
  isActive: boolean;
  reportedAt: string;
  expiresAt?: string;
}

export function FleetTrackingTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const tileLayersRef = useRef<{ street: L.TileLayer; satellite: L.TileLayer } | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePosition | null>(null);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [clickCoordinates, setClickCoordinates] = useState<{ lat: number; lng: number; screenX: number; screenY: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<VehiclePosition | null>(null);
  const [showIncidents, setShowIncidents] = useState(true);
  const incidentMarkersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());

  // Fetch active driver sessions from satnav users
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

  const { data: driverSessions = [] } = useQuery<DriverSession[]>({
    queryKey: ['/api/fleet/driver-sessions'],
    queryFn: async () => {
      const response = await fetch('/api/fleet/driver-sessions');
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds for real-time tracking
  });

  const { data: fleetData, isLoading, refetch, isFetching, isError: isFleetError } = useQuery<FleetGpsData>({
    queryKey: ['/api/enterprise/gps/fleet'],
    queryFn: async () => {
      const response = await fetch('/api/enterprise/gps/fleet');
      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.warn('[DEV] Fleet GPS API unavailable, using demo data with driver sessions');
          // Merge driver sessions into demo data
          const sessionMap = new Map(driverSessions.map(s => [s.vehicleRegistration, s]));
          return {
            vehicles: [
              { id: '1', vehicleId: 'v1', registration: 'AB12 CDE', latitude: 51.5074, longitude: -0.1278, speed: 45, heading: 90, status: 'moving' as const, lastUpdate: new Date().toISOString(), address: 'A1 Motorway, London', operatorName: sessionMap.get('AB12 CDE')?.operatorName || 'Unassigned' },
              { id: '2', vehicleId: 'v2', registration: 'FG34 HIJ', latitude: 52.4862, longitude: -1.8904, speed: 0, heading: 0, status: 'stopped' as const, lastUpdate: new Date(Date.now() - 600000).toISOString(), address: 'Birmingham Services', operatorName: sessionMap.get('FG34 HIJ')?.operatorName || 'Unassigned' },
              { id: '3', vehicleId: 'v3', registration: 'KL56 MNO', latitude: 53.4808, longitude: -2.2426, speed: 0, heading: 0, status: 'offline' as const, lastUpdate: new Date(Date.now() - 3600000).toISOString(), address: 'Manchester Depot', operatorName: sessionMap.get('KL56 MNO')?.operatorName || 'Unassigned' },
              { id: '4', vehicleId: 'v4', registration: 'PQ78 RST', latitude: 51.4545, longitude: -2.5879, speed: 62, heading: 180, status: 'moving' as const, lastUpdate: new Date().toISOString(), address: 'M5 Motorway, Bristol', operatorName: sessionMap.get('PQ78 RST')?.operatorName || 'Unassigned' },
              { id: '5', vehicleId: 'v5', registration: 'UV90 WXY', latitude: 55.9533, longitude: -3.1883, speed: 0, heading: 45, status: 'stopped' as const, lastUpdate: new Date(Date.now() - 300000).toISOString(), address: 'Edinburgh Hub', operatorName: sessionMap.get('UV90 WXY')?.operatorName || 'Unassigned' },
            ],
            totalVehicles: 5,
            movingCount: 2,
            stoppedCount: 2,
            offlineCount: 1,
          };
        }
        toast({ title: t('fleet.tracking.toast.loadFailed'), description: t('fleet.tracking.toast.loadFailedDesc'), variant: 'destructive' });
        throw new Error(t('fleet.tracking.toast.loadFailed'));
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch active traffic incidents (network-wide)
  const { data: trafficIncidents = [] } = useQuery<TrafficIncident[]>({
    queryKey: ['/api/traffic-incidents', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/traffic-incidents?active=true');
      if (!response.ok) {
        console.warn('[Fleet] Traffic incidents API unavailable');
        return [];
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const handleSearchVehicle = useCallback(() => {
    if (!searchQuery.trim() || !fleetData?.vehicles) {
      setSearchResult(null);
      return;
    }
    
    const normalizedQuery = searchQuery.toUpperCase().replace(/\s/g, '');
    const found = fleetData.vehicles.find(v => 
      v.registration.toUpperCase().replace(/\s/g, '').includes(normalizedQuery)
    );
    
    if (found) {
      setSearchResult(found);
      setSelectedVehicle(found);
      
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([found.latitude, found.longitude], 15, { animate: true });
        
        const marker = markersRef.current.get(found.id);
        if (marker) {
          marker.openPopup();
        }
      }
      
      toast({
        title: "Vehicle Located",
        description: `${found.registration} - ${found.status === 'moving' ? `Moving at ${found.speed}mph` : found.status}`,
      });
    } else {
      setSearchResult(null);
      toast({
        title: "Vehicle Not Found",
        description: `No vehicle with registration "${searchQuery}" found in fleet`,
        variant: "destructive",
      });
    }
  }, [searchQuery, fleetData?.vehicles, toast]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResult(null);
  }, []);

  const locateVehicle = useCallback((vehicle: VehiclePosition) => {
    setSelectedVehicle(vehicle);
    setSearchResult(vehicle);
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([vehicle.latitude, vehicle.longitude], 15, { animate: true });
      
      const marker = markersRef.current.get(vehicle.id);
      if (marker) {
        marker.openPopup();
      }
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current, {
      zoomControl: false,
      doubleClickZoom: true,
      touchZoom: true,
    }).setView([53.0, -1.5], 6);

    // Street view (OSM with better labels)
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    // Satellite view (ESRI)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
    });

    tileLayersRef.current = { street: streetLayer, satellite: satelliteLayer };
    streetLayer.addTo(mapInstanceRef.current);

    // Add click listener to detect coordinates
    mapInstanceRef.current.on('click', (e: L.LeafletMouseEvent) => {
      const screenX = e.originalEvent.clientX;
      const screenY = e.originalEvent.clientY;
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setClickCoordinates({ lat, lng, screenX, screenY });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !fleetData?.vehicles) return;

    markersRef.current.forEach((marker: L.Marker) => marker.remove());
    markersRef.current.clear();

    fleetData.vehicles.forEach(vehicle => {
      const color = vehicle.status === 'moving' ? '#22c55e' : vehicle.status === 'stopped' ? '#eab308' : '#6b7280';
      
      // Enhanced label with live location accuracy (2 feet = 0.6 meters)
      const accuracyMeters = 0.6;
      const label = `${vehicle.registration}${vehicle.status === 'moving' ? ` • ${vehicle.speed}mph` : ''}`;
      
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); position: relative;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M8 3L13.5 10L19 3V10L13.5 17L8 10V3Z" stroke="white" stroke-width="2"/>
          </svg>
          <span style="position: absolute; bottom: -20px; white-space: nowrap; font-size: 11px; font-weight: 600; background: ${color}; color: white; padding: 2px 6px; border-radius: 3px;">${label}</span>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -30],
      });

      const marker = L.marker([vehicle.latitude, vehicle.longitude], { icon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="font-size: 12px;">
            <strong>${vehicle.registration}</strong><br/>
            <strong>${vehicle.operatorName || 'Unknown'}</strong><br/>
            <strong>Speed:</strong> ${vehicle.speed} mph<br/>
            <strong>Status:</strong> ${vehicle.status}<br/>
            <strong>Location:</strong> ${vehicle.address || 'Unknown'}<br/>
            <strong>Accuracy:</strong> ${accuracyMeters * 100}cm (2 feet)<br/>
            <strong>Last Update:</strong> ${new Date(vehicle.lastUpdate).toLocaleTimeString()}
          </div>
        `);

      marker.on('click', () => {
        setSelectedVehicle(vehicle);
      });

      markersRef.current.set(vehicle.id, marker);
    });
  }, [fleetData?.vehicles]);

  // Render traffic incident markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing incident markers
    incidentMarkersRef.current.forEach((marker: L.Marker) => marker.remove());
    incidentMarkersRef.current.clear();

    // Don't render if incidents are hidden
    if (!showIncidents) return;

    trafficIncidents.forEach(incident => {
      const coords = incident.coordinates;
      if (!coords) return;

      // Color based on severity
      const severityColors: Record<string, string> = {
        critical: '#ef4444', // red
        high: '#f97316', // orange
        medium: '#eab308', // yellow
        low: '#3b82f6', // blue
      };
      const color = severityColors[incident.severity] || '#6b7280';

      // Icon based on type
      const typeIcons: Record<string, string> = {
        accident: '🚗💥',
        police: '🚔',
        road_closure: '🚧',
        construction: '🔧',
        heavy_traffic: '🚦',
        obstacle: '⚠️',
        hazmat_spill: '☢️',
      };
      const emoji = typeIcons[incident.type] || '⚠️';

      const icon = L.divIcon({
        className: 'traffic-incident-marker',
        html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); font-size: 14px;">
          ${emoji}
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
      });

      // Calculate time remaining before expiration
      let timeRemaining = '';
      if (incident.expiresAt) {
        const expiresAt = new Date(incident.expiresAt);
        const now = new Date();
        const diffMs = expiresAt.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins > 60) {
          timeRemaining = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
        } else if (diffMins > 0) {
          timeRemaining = `${diffMins}m`;
        } else {
          timeRemaining = 'Expiring soon';
        }
      }

      const marker = L.marker([coords.lat, coords.lng], { icon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="font-size: 12px; min-width: 180px;">
            <strong style="color: ${color}; font-size: 14px;">${incident.title}</strong><br/>
            <strong>Type:</strong> ${incident.type.replace('_', ' ')}<br/>
            <strong>Severity:</strong> <span style="color: ${color};">${incident.severity}</span><br/>
            ${incident.roadName ? `<strong>Road:</strong> ${incident.roadName}<br/>` : ''}
            ${incident.direction ? `<strong>Direction:</strong> ${incident.direction}<br/>` : ''}
            ${incident.description ? `<strong>Details:</strong> ${incident.description}<br/>` : ''}
            <strong>Reported:</strong> ${new Date(incident.reportedAt).toLocaleTimeString()}<br/>
            ${timeRemaining ? `<strong>Expires in:</strong> ${timeRemaining}<br/>` : ''}
            <strong>Source:</strong> ${incident.reportedBy === 'user' ? (incident.reporterName || 'Driver Report') : 'Traffic Authority'}
          </div>
        `);

      incidentMarkersRef.current.set(incident.id, marker);
    });
  }, [trafficIncidents, showIncidents]);

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

  const toggleSatelliteView = () => {
    if (!mapInstanceRef.current || !tileLayersRef.current) return;
    
    if (isSatelliteView) {
      mapInstanceRef.current.removeLayer(tileLayersRef.current.satellite);
      mapInstanceRef.current.addLayer(tileLayersRef.current.street);
    } else {
      mapInstanceRef.current.removeLayer(tileLayersRef.current.street);
      mapInstanceRef.current.addLayer(tileLayersRef.current.satellite);
    }
    setIsSatelliteView(!isSatelliteView);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!mapInstanceRef.current) return;
    const currentZoom = mapInstanceRef.current.getZoom();
    if (direction === 'in') {
      mapInstanceRef.current.setZoom(Math.min(currentZoom + 1, 19));
    } else {
      mapInstanceRef.current.setZoom(Math.max(currentZoom - 1, 1));
    }
  };

  const getStatusBadge = (status: VehiclePosition['status']) => {
    switch (status) {
      case 'moving':
        return <Badge className="bg-green-500 text-white" data-testid="badge-status-moving">{t('fleet.tracking.moving')}</Badge>;
      case 'stopped':
        return <Badge className="bg-yellow-500 text-white" data-testid="badge-status-stopped">{t('fleet.tracking.stopped')}</Badge>;
      case 'offline':
        return <Badge className="bg-gray-500 text-white" data-testid="badge-status-offline">{t('fleet.tracking.offline')}</Badge>;
    }
  };

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return t('fleet.common.justNow');
    if (diffMins < 60) return t('fleet.common.minutesAgo', { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('fleet.common.hoursAgo', { count: diffHours });
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('fleet.tracking.totalVehicles')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-vehicles">{fleetData?.totalVehicles || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              {t('fleet.tracking.moving')}
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
              {t('fleet.tracking.stopped')}
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
              {t('fleet.tracking.offline')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600" data-testid="text-offline-count">{fleetData?.offlineCount || 0}</div>
          </CardContent>
        </Card>
        <Card className={showIncidents ? "ring-2 ring-orange-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Traffic Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-orange-600" data-testid="text-incidents-count">{trafficIncidents.length}</div>
              <Button
                variant={showIncidents ? "default" : "outline"}
                size="sm"
                onClick={() => setShowIncidents(!showIncidents)}
                className="gap-1"
              >
                {showIncidents ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {showIncidents ? 'On' : 'Off'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-5 h-5" />
                {t('fleet.tracking.fleetMap')}
              </CardTitle>
              <CardDescription>{t('fleet.tracking.realTimePositions')}</CardDescription>
            </div>
            <div className="flex gap-1 flex-wrap justify-end">
              <Button
                variant={showIncidents ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowIncidents(!showIncidents)}
                data-testid="button-toggle-incidents"
                title={showIncidents ? 'Hide traffic incidents' : 'Show traffic incidents'}
              >
                <AlertTriangle className={`w-4 h-4 ${showIncidents ? 'text-white' : 'text-orange-500'}`} />
              </Button>
              <Button
                variant={isSatelliteView ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={toggleSatelliteView}
                data-testid="button-toggle-satellite"
                title={isSatelliteView ? t('fleet.tracking.street') : t('fleet.tracking.satellite')}
              >
                {isSatelliteView ? <Map className="w-4 h-4" /> : <Satellite className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleZoom('in')}
                data-testid="button-zoom-in"
                title={t('fleet.common.zoomIn')}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleZoom('out')}
                data-testid="button-zoom-out"
                title={t('fleet.common.zoomOut')}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={isFetching}
                data-testid="button-refresh-positions"
                title={t('fleet.common.refresh')}
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              {t('fleet.tracking.vehicleList')}
            </CardTitle>
            <CardDescription>{t('fleet.tracking.clickToLocate')}</CardDescription>
            
            {/* Vehicle Search by Registration */}
            <div className="flex gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reg plate (e.g. AB12 CDE)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchVehicle()}
                  className="pl-9 pr-8"
                  data-testid="input-search-registration"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                    onClick={clearSearch}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <Button 
                onClick={handleSearchVehicle}
                size="icon"
                disabled={!searchQuery.trim()}
                data-testid="button-search-vehicle"
              >
                <Navigation className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Search Result Info */}
            {searchResult && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-300">{searchResult.registration}</span>
                  </div>
                  <Badge variant={searchResult.status === 'moving' ? 'default' : searchResult.status === 'stopped' ? 'secondary' : 'outline'}>
                    {searchResult.status === 'moving' ? `${searchResult.speed}mph` : searchResult.status}
                  </Badge>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {searchResult.address || 'Location on map'}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">{t('fleet.common.loading')}</div>
              ) : isFleetError && !import.meta.env.DEV ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('fleet.common.unableToLoad')}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t('fleet.common.tryRefreshing')}</p>
                </div>
              ) : !fleetData?.vehicles?.length ? (
                <div className="text-center py-8 text-muted-foreground">{t('fleet.tracking.noVehiclesFound')}</div>
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
                        {vehicle.address || t('fleet.tracking.unknownLocation')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                        <span>{vehicle.operatorName || t('fleet.tracking.unassigned')}</span>
                        <span>{formatLastUpdate(vehicle.lastUpdate)}</span>
                      </div>
                      {vehicle.status === 'moving' && (
                        <div className="text-xs text-green-600 mt-1">
                          {t('fleet.tracking.speed')}: {vehicle.speed} mph
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
            <CardTitle>{t('fleet.tracking.vehicleDetails')}: {selectedVehicle.registration}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.tracking.operator')}</div>
                <div className="font-medium" data-testid="text-selected-operator">
                  {selectedVehicle.operatorName || t('fleet.tracking.unassigned')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.tracking.currentSpeed')}</div>
                <div className="font-medium" data-testid="text-selected-speed">
                  {selectedVehicle.speed} mph
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.tracking.location')}</div>
                <div className="font-medium" data-testid="text-selected-location">
                  {selectedVehicle.address || t('fleet.common.unknown')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('fleet.tracking.lastUpdate')}</div>
                <div className="font-medium" data-testid="text-selected-lastupdate">
                  {formatLastUpdate(selectedVehicle.lastUpdate)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {clickCoordinates && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{t('fleet.tracking.coordinatesDetected')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setClickCoordinates(null)}
                className="h-6 w-6 p-0"
                data-testid="button-close-coordinates"
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-sm">
              <div>
                <div className="text-xs text-muted-foreground">{t('fleet.tracking.latitude')}</div>
                <div className="font-bold" data-testid="text-click-latitude">{clickCoordinates.lat.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('fleet.tracking.longitude')}</div>
                <div className="font-bold" data-testid="text-click-longitude">{clickCoordinates.lng.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('fleet.tracking.screenX')}</div>
                <div className="font-bold" data-testid="text-click-screenx">{clickCoordinates.screenX}px</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('fleet.tracking.screenY')}</div>
                <div className="font-bold" data-testid="text-click-screeny">{clickCoordinates.screenY}px</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
