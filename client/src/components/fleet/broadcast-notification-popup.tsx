import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, AlertCircle, Info, Megaphone, Bell, ChevronRight, Check, X } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface FleetBroadcast {
  id: string;
  senderId: string;
  senderName: string;
  title: string;
  message: string;
  priority: 'critical' | 'important' | 'info';
  category: string;
  expiresAt: string | null;
  isActive: boolean;
  readCount: number;
  createdAt: string;
}

export function BroadcastNotificationPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const { isAuthenticated } = useAuth();

  const { data: broadcasts = [] } = useQuery<FleetBroadcast[]>({
    queryKey: ['/api/fleet/broadcasts/unread'],
    refetchInterval: isAuthenticated ? 60000 : false,
    retry: false,
    enabled: isAuthenticated,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/fleet/broadcasts/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/broadcasts/unread'] });
    },
  });

  const unreadBroadcasts = broadcasts.filter(b => !dismissedIds.has(b.id));
  const criticalBroadcasts = unreadBroadcasts.filter(b => b.priority === 'critical');
  const importantBroadcasts = unreadBroadcasts.filter(b => b.priority === 'important');
  
  const sortedBroadcasts = [
    ...criticalBroadcasts,
    ...importantBroadcasts,
    ...unreadBroadcasts.filter(b => b.priority === 'info'),
  ].filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);

  useEffect(() => {
    if (criticalBroadcasts.length > 0 && !isOpen) {
      setIsOpen(true);
      setCurrentIndex(0);
    }
  }, [criticalBroadcasts.length]);

  const currentBroadcast = sortedBroadcasts[currentIndex];

  const handleDismiss = () => {
    if (currentBroadcast) {
      markReadMutation.mutate(currentBroadcast.id);
      setDismissedIds(prev => new Set(Array.from(prev).concat(currentBroadcast.id)));
      
      if (currentIndex < sortedBroadcasts.length - 1) {
        setCurrentIndex(prev => prev);
      } else {
        setIsOpen(false);
        setCurrentIndex(0);
      }
    }
  };

  const handleNext = () => {
    if (currentBroadcast) {
      markReadMutation.mutate(currentBroadcast.id);
      setDismissedIds(prev => new Set(Array.from(prev).concat(currentBroadcast.id)));
    }

    if (currentIndex < sortedBroadcasts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsOpen(false);
      setCurrentIndex(0);
    }
  };

  const handleDismissAll = () => {
    const allIds = unreadBroadcasts.map(b => b.id);
    allIds.forEach(id => markReadMutation.mutate(id));
    setDismissedIds(prev => new Set(Array.from(prev).concat(allIds)));
    setIsOpen(false);
    setCurrentIndex(0);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'important':
        return <AlertCircle className="w-6 h-6 text-orange-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      case 'important':
        return 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      critical: { label: 'CRITICAL', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      important: { label: 'IMPORTANT', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
      info: { label: 'INFO', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    };
    const cfg = config[priority as keyof typeof config] || config.info;
    return <Badge className={cfg.class}>{cfg.label}</Badge>;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!currentBroadcast) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={`max-w-md ${getPriorityBg(currentBroadcast.priority)}`}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getPriorityIcon(currentBroadcast.priority)}
            <div>
              <DialogTitle className="text-lg">{currentBroadcast.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                {getPriorityBadge(currentBroadcast.priority)}
                <span className="text-xs">From: {currentBroadcast.senderName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[200px] my-4">
          <p className="text-sm leading-relaxed">{currentBroadcast.message}</p>
        </ScrollArea>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
          <span>{formatTime(currentBroadcast.createdAt)}</span>
          {sortedBroadcasts.length > 1 && (
            <span className="flex items-center gap-1">
              <Bell className="w-3 h-3" />
              {currentIndex + 1} of {sortedBroadcasts.length} messages
            </span>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleDismissAll} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" />
            Dismiss All
          </Button>
          <div className="flex gap-2">
            {sortedBroadcasts.length > 1 ? (
              <Button onClick={handleNext} className="gap-1">
                <Check className="w-4 h-4" />
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleDismiss} className="gap-1">
                <Check className="w-4 h-4" />
                Got it
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BroadcastBadge({ onClick }: { onClick?: () => void }) {
  const { isAuthenticated } = useAuth();
  const { data: broadcasts = [] } = useQuery<FleetBroadcast[]>({
    queryKey: ['/api/fleet/broadcasts/unread'],
    refetchInterval: isAuthenticated ? 60000 : false,
    retry: false,
    enabled: isAuthenticated,
  });

  const criticalCount = broadcasts.filter(b => b.priority === 'critical').length;
  const totalCount = broadcasts.length;

  if (totalCount === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
        criticalCount > 0 
          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 animate-pulse' 
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      }`}
    >
      <Megaphone className="w-3 h-3" />
      <span>{totalCount}</span>
      {criticalCount > 0 && (
        <AlertTriangle className="w-3 h-3" />
      )}
    </button>
  );
}
