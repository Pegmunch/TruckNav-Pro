import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface AddComplianceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddComplianceDialog({ isOpen, onOpenChange }: AddComplianceDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    vehicleId: '',
    recordType: 'dvla_check',
    status: 'compliant',
    lastCheckedAt: new Date().toISOString().split('T')[0],
    nextCheckDue: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/fleet/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create compliance record');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/compliance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/compliance/non-compliant'] });
      toast({ title: 'Compliance record added successfully' });
      setFormData({
        vehicleId: '',
        recordType: 'dvla_check',
        status: 'compliant',
        lastCheckedAt: new Date().toISOString().split('T')[0],
        nextCheckDue: '',
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Failed to add compliance record', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.recordType) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      ...formData,
      nextCheckDue: formData.nextCheckDue || null,
    } as any);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-none shadow-2xl">
      <DialogHeader>
        <DialogTitle>Add Compliance Record</DialogTitle>
        <DialogDescription>Track regulatory compliance status</DialogDescription>
      </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle ID *</Label>
            <Input
              id="vehicle"
              placeholder="Vehicle ID"
              value={formData.vehicleId}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
              data-testid="input-compliance-vehicle"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Compliance Type *</Label>
            <Select value={formData.recordType} onValueChange={(val) => setFormData({ ...formData, recordType: val })}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dvla_check">DVLA Check</SelectItem>
                <SelectItem value="emission_standards">Emission Standards</SelectItem>
                <SelectItem value="hazmat_certification">HazMat Certification</SelectItem>
                <SelectItem value="tachograph_inspection">Tachograph Inspection</SelectItem>
                <SelectItem value="working_hours">Working Hours Compliance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastChecked">Last Checked *</Label>
            <Input
              id="lastChecked"
              type="date"
              value={formData.lastCheckedAt}
              onChange={(e) => setFormData({ ...formData, lastCheckedAt: e.target.value })}
              data-testid="input-compliance-last-checked"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextDue">Next Check Due</Label>
            <Input
              id="nextDue"
              type="date"
              value={formData.nextCheckDue}
              onChange={(e) => setFormData({ ...formData, nextCheckDue: e.target.value })}
              data-testid="input-compliance-next-due"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-compliance">
              {createMutation.isPending ? 'Adding...' : 'Add Compliance Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
