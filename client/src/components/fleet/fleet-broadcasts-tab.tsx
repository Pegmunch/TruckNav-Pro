import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, AlertTriangle, Bell, Info, Megaphone, Send, Trash2, Eye, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface FleetBroadcast {
  id: string;
  senderId: string;
  senderName: string;
  title: string;
  message: string;
  priority: 'critical' | 'important' | 'info';
  category: 'general' | 'safety' | 'traffic' | 'operations' | 'emergency';
  expiresAt: string | null;
  isActive: boolean;
  readCount: number;
  targetAudience: string;
  createdAt: string;
}

interface FleetBroadcastRead {
  id: string;
  broadcastId: string;
  userId: string;
  readAt: string;
}

export function FleetBroadcastsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<FleetBroadcast | null>(null);
  const [showReceipts, setShowReceipts] = useState(false);

  const [newBroadcast, setNewBroadcast] = useState({
    title: '',
    message: '',
    priority: 'info' as 'critical' | 'important' | 'info',
    category: 'general' as 'general' | 'safety' | 'traffic' | 'operations' | 'emergency',
    expiresAt: '',
    targetAudience: 'all',
  });

  const { data: broadcasts = [], isLoading } = useQuery<FleetBroadcast[]>({
    queryKey: ['/api/fleet/broadcasts/my-broadcasts'],
  });

  const { data: activeBroadcasts = [] } = useQuery<FleetBroadcast[]>({
    queryKey: ['/api/fleet/broadcasts'],
  });

  const { data: readReceipts = [] } = useQuery<FleetBroadcastRead[]>({
    queryKey: ['/api/fleet/broadcasts', selectedBroadcast?.id, 'receipts'],
    enabled: !!selectedBroadcast && showReceipts,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newBroadcast) => {
      return await apiRequest('POST', '/api/fleet/broadcasts', {
        ...data,
        expiresAt: data.expiresAt || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/broadcasts'] });
      setIsCreateDialogOpen(false);
      setNewBroadcast({
        title: '',
        message: '',
        priority: 'info',
        category: 'general',
        expiresAt: '',
        targetAudience: 'all',
      });
      toast({ title: 'Broadcast Sent', description: 'Your message has been sent to all fleet drivers.' });
    },
    onError: () => {
      toast({ title: 'Failed to Send', description: 'Could not send the broadcast message.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/fleet/broadcasts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/broadcasts'] });
      toast({ title: 'Broadcast Deleted', description: 'The broadcast has been removed.' });
    },
    onError: () => {
      toast({ title: 'Failed to Delete', description: 'Could not delete the broadcast.', variant: 'destructive' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PATCH', `/api/fleet/broadcasts/${id}`, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/broadcasts'] });
      toast({ title: 'Broadcast Deactivated', description: 'The broadcast is no longer visible to drivers.' });
    },
  });

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'important':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      critical: { label: 'Critical', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      important: { label: 'Important', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
      info: { label: 'Info', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    };
    const cfg = config[priority as keyof typeof config] || config.info;
    return <Badge className={cfg.class}>{cfg.label}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const config = {
      general: { label: 'General', class: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
      safety: { label: 'Safety', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      traffic: { label: 'Traffic', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      operations: { label: 'Operations', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      emergency: { label: 'Emergency', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    };
    const cfg = config[category as keyof typeof config] || config.general;
    return <Badge variant="outline" className={cfg.class}>{cfg.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) {
      toast({ title: 'Missing Information', description: 'Please provide a title and message.', variant: 'destructive' });
      return;
    }
    createMutation.mutate(newBroadcast);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6" />
            Fleet Broadcasts
          </h2>
          <p className="text-muted-foreground">Send messages to all drivers in your fleet</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Send className="w-4 h-4" />
              New Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Create Fleet Broadcast
              </DialogTitle>
              <DialogDescription>
                Send a message to all drivers in your fleet. Critical messages will trigger push notifications.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter broadcast title..."
                  value={newBroadcast.title}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your message to all drivers..."
                  value={newBroadcast.message}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newBroadcast.priority}
                    onValueChange={(value: 'critical' | 'important' | 'info') =>
                      setNewBroadcast({ ...newBroadcast, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">
                        <span className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-500" /> Info
                        </span>
                      </SelectItem>
                      <SelectItem value="important">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-500" /> Important
                        </span>
                      </SelectItem>
                      <SelectItem value="critical">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" /> Critical
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newBroadcast.category}
                    onValueChange={(value: 'general' | 'safety' | 'traffic' | 'operations' | 'emergency') =>
                      setNewBroadcast({ ...newBroadcast, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="traffic">Traffic</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={newBroadcast.expiresAt}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, expiresAt: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Leave empty for no expiration</p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                  {createMutation.isPending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Broadcast
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Broadcasts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBroadcasts.filter(b => b.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{broadcasts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {broadcasts.filter(b => b.priority === 'critical' && b.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {broadcasts.reduce((sum, b) => sum + (b.readCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-broadcasts" className="w-full">
        <TabsList>
          <TabsTrigger value="my-broadcasts" className="gap-2">
            <Send className="w-4 h-4" />
            My Broadcasts
          </TabsTrigger>
          <TabsTrigger value="all-active" className="gap-2">
            <Bell className="w-4 h-4" />
            All Active
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-broadcasts">
          <Card>
            <CardHeader>
              <CardTitle>Your Broadcast History</CardTitle>
              <CardDescription>Messages you've sent to the fleet</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading broadcasts...</div>
              ) : broadcasts.length === 0 ? (
                <div className="text-center py-8">
                  <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No broadcasts sent yet</p>
                  <Button className="mt-4 gap-2" onClick={() => setIsCreateDialogOpen(true)}>
                    <Send className="w-4 h-4" />
                    Send Your First Broadcast
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {broadcasts.map((broadcast) => (
                      <Card key={broadcast.id} className={`border-l-4 ${
                        broadcast.priority === 'critical' ? 'border-l-red-500' :
                        broadcast.priority === 'important' ? 'border-l-orange-500' : 'border-l-blue-500'
                      } ${!broadcast.isActive ? 'opacity-60' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {getPriorityIcon(broadcast.priority)}
                                <h4 className="font-semibold truncate">{broadcast.title}</h4>
                                {getPriorityBadge(broadcast.priority)}
                                {getCategoryBadge(broadcast.category)}
                                {!broadcast.isActive && (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {broadcast.message}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(broadcast.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {broadcast.readCount || 0} reads
                                </span>
                                {broadcast.expiresAt && (
                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Expires: {formatDate(broadcast.expiresAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedBroadcast(broadcast);
                                  setShowReceipts(true);
                                }}
                              >
                                <Users className="w-4 h-4" />
                              </Button>
                              {broadcast.isActive && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deactivateMutation.mutate(broadcast.id)}
                                >
                                  <XCircle className="w-4 h-4 text-orange-500" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(broadcast.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-active">
          <Card>
            <CardHeader>
              <CardTitle>All Active Fleet Broadcasts</CardTitle>
              <CardDescription>Currently visible broadcasts from all managers</CardDescription>
            </CardHeader>
            <CardContent>
              {activeBroadcasts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active broadcasts</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {activeBroadcasts.map((broadcast) => (
                      <Card key={broadcast.id} className={`border-l-4 ${
                        broadcast.priority === 'critical' ? 'border-l-red-500' :
                        broadcast.priority === 'important' ? 'border-l-orange-500' : 'border-l-blue-500'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {getPriorityIcon(broadcast.priority)}
                                <h4 className="font-semibold truncate">{broadcast.title}</h4>
                                {getPriorityBadge(broadcast.priority)}
                                {getCategoryBadge(broadcast.category)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {broadcast.message}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>From: {broadcast.senderName}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(broadcast.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {broadcast.readCount || 0} reads
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showReceipts} onOpenChange={setShowReceipts}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Read Receipts
            </DialogTitle>
            <DialogDescription>
              {selectedBroadcast?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {readReceipts.length === 0 ? (
              <div className="text-center py-8">
                <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No one has read this broadcast yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {readReceipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="font-medium">Driver {receipt.userId.slice(0, 8)}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(receipt.readAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
