import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface AddTripDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTripDialog({ isOpen, onOpenChange }: AddTripDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    vehicleId: '',
    startLocation: '',
    endLocation: '',
    plannedDistance: '',
    plannedDuration: '',
    actualDistance: '',
    actualDuration: '',
    revenue: '',
    cost: '',
    status: 'planned',
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/fleet/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create trip');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/trips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/analytics/trips'] });
      toast({ title: 'Trip recorded successfully' });
      setFormData({
        vehicleId: '',
        startLocation: '',
        endLocation: '',
        plannedDistance: '',
        plannedDuration: '',
        actualDistance: '',
        actualDuration: '',
        revenue: '',
        cost: '',
        status: 'planned',
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Failed to record trip', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.startLocation || !formData.endLocation) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      ...formData,
      plannedDistance: formData.plannedDistance ? parseFloat(formData.plannedDistance) : null,
      plannedDuration: formData.plannedDuration ? parseInt(formData.plannedDuration) : null,
      actualDistance: formData.actualDistance ? parseFloat(formData.actualDistance) : null,
      actualDuration: formData.actualDuration ? parseInt(formData.actualDuration) : null,
      revenue: formData.revenue ? formData.revenue : null,
      cost: formData.cost ? formData.cost : null,
    } as any);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 border-none shadow-2xl pb-6">
      <DialogHeader>
        <DialogTitle>Record Trip</DialogTitle>
        <DialogDescription>Log a new trip with planned and actual metrics</DialogDescription>
      </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle ID *</Label>
            <Input
              id="vehicle"
              placeholder="Vehicle ID"
              value={formData.vehicleId}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
              data-testid="input-trip-vehicle"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from">Start Location *</Label>
            <Input
              id="from"
              placeholder="Starting point"
              value={formData.startLocation}
              onChange={(e) => setFormData({ ...formData, startLocation: e.target.value })}
              data-testid="input-trip-from"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">End Location *</Label>
            <Input
              id="to"
              placeholder="Destination"
              value={formData.endLocation}
              onChange={(e) => setFormData({ ...formData, endLocation: e.target.value })}
              data-testid="input-trip-to"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plannedDist">Planned Distance (mi)</Label>
              <Input
                id="plannedDist"
                type="number"
                placeholder="Miles"
                value={formData.plannedDistance}
                onChange={(e) => setFormData({ ...formData, plannedDistance: e.target.value })}
                data-testid="input-trip-planned-distance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plannedDuration">Planned Duration (min)</Label>
              <Input
                id="plannedDuration"
                type="number"
                placeholder="Minutes"
                value={formData.plannedDuration}
                onChange={(e) => setFormData({ ...formData, plannedDuration: e.target.value })}
                data-testid="input-trip-planned-duration"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actualDist">Actual Distance (mi)</Label>
              <Input
                id="actualDist"
                type="number"
                placeholder="Miles"
                value={formData.actualDistance}
                onChange={(e) => setFormData({ ...formData, actualDistance: e.target.value })}
                data-testid="input-trip-actual-distance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualDuration">Actual Duration (min)</Label>
              <Input
                id="actualDuration"
                type="number"
                placeholder="Minutes"
                value={formData.actualDuration}
                onChange={(e) => setFormData({ ...formData, actualDuration: e.target.value })}
                data-testid="input-trip-actual-duration"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue (£)</Label>
              <Input
                id="revenue"
                type="number"
                placeholder="Amount"
                value={formData.revenue}
                onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                data-testid="input-trip-revenue"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (£)</Label>
              <Input
                id="cost"
                type="number"
                placeholder="Amount"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                data-testid="input-trip-cost"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-trip">
              {createMutation.isPending ? 'Recording...' : 'Record Trip'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
