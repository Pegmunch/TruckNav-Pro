import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import type { TripTracking } from '@shared/schema';
import { format } from 'date-fns';
import { AddTripDialog } from './fleet-add-trip-dialog';

export function TripsTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: analytics } = useQuery({
    queryKey: ['/api/fleet/analytics/trips'],
    queryFn: async () => {
      const response = await fetch('/api/fleet/analytics/trips');
      return response.json();
    },
  });

  const { data: trips = [], isLoading } = useQuery<TripTracking[]>({
    queryKey: ['/api/fleet/trips'],
    queryFn: async () => {
      const response = await fetch('/api/fleet/trips');
      return response.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalTrips}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalDistance.toFixed(0)} mi</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Profit Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.avgProfitMargin.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{analytics.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trips Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Trip Records
            </CardTitle>
            <CardDescription>Planned vs actual trip metrics</CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)} size="sm" className="gap-2" data-testid="button-add-trip">
            <Plus className="w-4 h-4" />
            Record Trip
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading trips...</div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No trips recorded</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Profit Margin</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.slice(0, 10).map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="max-w-xs truncate">{trip.startLocation}</TableCell>
                      <TableCell className="max-w-xs truncate">{trip.endLocation}</TableCell>
                      <TableCell>{trip.actualDistance ? trip.actualDistance.toFixed(1) : '-'} mi</TableCell>
                      <TableCell>{trip.actualDuration ? `${trip.actualDuration} min` : '-'}</TableCell>
                      <TableCell>£{trip.revenue ? parseFloat(trip.revenue.toString()).toFixed(2) : '0.00'}</TableCell>
                      <TableCell>{trip.profitMargin ? trip.profitMargin.toFixed(1) : '-'}%</TableCell>
                      <TableCell>
                        <Badge variant={trip.status === 'completed' ? 'default' : 'secondary'}>
                          {trip.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <AddTripDialog isOpen={isAddOpen} onOpenChange={setIsAddOpen} />
    </div>
  );
}
