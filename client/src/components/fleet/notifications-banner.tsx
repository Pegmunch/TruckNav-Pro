import { useQuery, useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface FleetNotification {
  id: string;
  message: string;
  expiryDate: string;
  daysUntilExpiry: number;
  severity: string;
  status: string;
}

export function NotificationsBanner() {
  const { data: notifications = [], isLoading } = useQuery<FleetNotification[]>({
    queryKey: ['/api/fleet/notifications'],
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/fleet/notifications/${id}/dismiss`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to dismiss notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/notifications'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/fleet/notifications/${id}/resolve`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to resolve notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/notifications'] });
    },
  });

  if (isLoading || notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-6">
      {notifications.map((notif) => (
        <Alert
          key={notif.id}
          variant={notif.severity === 'high' ? 'destructive' : 'default'}
          className="flex items-start justify-between"
          data-testid={`notification-${notif.id}`}
        >
          <div className="flex items-start gap-3 flex-1">
            {notif.severity === 'high' ? (
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <AlertDescription>{notif.message}</AlertDescription>
              <p className="text-xs text-muted-foreground mt-1">
                Expires: {new Date(notif.expiryDate).toLocaleDateString()} ({notif.daysUntilExpiry} days)
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resolveMutation.mutate(notif.id)}
              data-testid={`button-resolve-${notif.id}`}
            >
              Done
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissMutation.mutate(notif.id)}
              data-testid={`button-dismiss-${notif.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
