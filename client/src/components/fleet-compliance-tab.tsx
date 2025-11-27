import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useState } from 'react';
import type { ComplianceRecord } from '@shared/schema';
import { format } from 'date-fns';
import { AddComplianceDialog } from './fleet-add-compliance-dialog';

export function ComplianceTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: nonCompliant = [] } = useQuery<ComplianceRecord[]>({
    queryKey: ['/api/fleet/compliance/non-compliant'],
    queryFn: async () => {
      const response = await fetch('/api/fleet/compliance/non-compliant');
      return response.json();
    },
  });

  const { data: allCompliance = [], isLoading } = useQuery<ComplianceRecord[]>({
    queryKey: ['/api/fleet/compliance'],
    queryFn: async () => {
      const response = await fetch('/api/fleet/compliance');
      return response.json();
    },
  });

  const getStatusIcon = (status: string) => {
    return status === 'compliant' ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      compliant: 'bg-green-100 text-green-800',
      'non_compliant': 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Non-Compliant Alert */}
      {nonCompliant.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">⚠️ Non-Compliant Records</CardTitle>
            <CardDescription className="text-red-800">
              {nonCompliant.length} record(s) require immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nonCompliant.slice(0, 5).map((record) => (
                <div key={record.id} className="text-sm text-red-900">
                  • {record.recordType}: {record.vehicleId || record.operatorId}
                  {record.nextCheckDue && ` - Due: ${format(new Date(record.nextCheckDue), 'dd MMM yyyy')}`}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Compliance Records
            </CardTitle>
            <CardDescription>Regulatory compliance tracking</CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)} size="sm" className="gap-2" data-testid="button-add-compliance">
            <Plus className="w-4 h-4" />
            Add Record
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading compliance records...</div>
          ) : allCompliance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No compliance records</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Vehicle/Operator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Next Check Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCompliance.slice(0, 20).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span className="capitalize">{record.recordType.replace(/_/g, ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.vehicleId?.slice(0, 8) || record.operatorId?.slice(0, 8) || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.lastCheckedAt ? format(new Date(record.lastCheckedAt), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {record.nextCheckDue ? format(new Date(record.nextCheckDue), 'dd MMM yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <AddComplianceDialog isOpen={isAddOpen} onOpenChange={setIsAddOpen} />
    </div>
  );
}
