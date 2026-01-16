import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface AddIncidentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddIncidentDialog({ isOpen, onOpenChange }: AddIncidentDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    vehicleId: '',
    incidentType: 'accident',
    severity: 'medium',
    description: '',
    location: '',
    reportedAt: new Date().toISOString().split('T')[0],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/fleet/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create incident');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/incidents'] });
      toast({ title: 'Incident logged successfully' });
      setFormData({
        vehicleId: '',
        incidentType: 'accident',
        severity: 'medium',
        description: '',
        location: '',
        reportedAt: new Date().toISOString().split('T')[0],
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Failed to log incident', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.description) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData as any);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md bg-white dark:bg-gray-900 border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle>Log Incident</DialogTitle>
          <DialogDescription>Record a new safety incident or accident</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle ID *</Label>
            <Input
              id="vehicle"
              placeholder="Vehicle ID"
              value={formData.vehicleId}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
              data-testid="input-incident-vehicle"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Incident Type *</Label>
            <Select value={formData.incidentType} onValueChange={(val) => setFormData({ ...formData, incidentType: val })}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accident">Accident</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="violation">Violation</SelectItem>
                <SelectItem value="breakdown">Breakdown</SelectItem>
                <SelectItem value="near_miss">Near Miss</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="severity">Severity *</Label>
            <Select value={formData.severity} onValueChange={(val) => setFormData({ ...formData, severity: val })}>
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="What happened?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="input-incident-description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Where did it happen?"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              data-testid="input-incident-location"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.reportedAt}
              onChange={(e) => setFormData({ ...formData, reportedAt: e.target.value })}
              data-testid="input-incident-date"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-incident">
              {createMutation.isPending ? 'Logging...' : 'Log Incident'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
