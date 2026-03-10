import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus } from 'lucide-react';
import { useState } from 'react';
import type { IncidentLog } from '@shared/schema';
import { format } from 'date-fns';
import { AddIncidentDialog } from './fleet-add-incident-dialog';

export function IncidentsTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: incidents = [], isLoading } = useQuery<IncidentLog[]>({
    queryKey: ['/api/fleet/incidents'],
    queryFn: async () => {
      const response = await fetch('/api/fleet/incidents');
      return response.json();
    },
  });

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Incident Logs
            </CardTitle>
            <CardDescription>Track accidents, damage, and safety incidents</CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)} size="sm" className="gap-2" data-testid="button-add-incident">
            <Plus className="w-4 h-4" />
            Log Incident
          </Button>
        </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading incidents...</div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No incidents recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell>{incident.incidentType}</TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(incident.severity)}>
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(incident.reportedAt), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-mono text-sm">{incident.vehicleId.slice(0, 8)}</TableCell>
                    <TableCell className="max-w-xs truncate">{incident.description}</TableCell>
                    <TableCell>
                      <Badge variant={incident.status === 'open' ? 'default' : 'secondary'}>
                        {incident.status}
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
      <AddIncidentDialog isOpen={isAddOpen} onOpenChange={setIsAddOpen} />
    </>
  );
}
