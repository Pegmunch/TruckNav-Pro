import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, UserCheck, UserPlus, Check, X, Loader2, Building2, Truck } from "lucide-react";

interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: string;
  requestedAt: string;
}

export function ConnectionsList() {
  const { toast } = useToast();

  const { data: connections, isLoading: connectionsLoading } = useQuery<Connection[]>({
    queryKey: ["/api/social/connections"],
  });

  const { data: pendingRequests, isLoading: requestsLoading } = useQuery<Connection[]>({
    queryKey: ["/api/social/connections/pending"],
  });

  const acceptMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return await apiRequest(`/api/social/connections/${connectionId}/accept`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/connections/pending"] });
      toast({
        title: "Request accepted",
        description: "You are now connected",
      });
    },
    onError: (error: any) => {
      const status = error.status || error.response?.status;
      
      if (status === 429) {
        toast({
          title: "Too many requests",
          description: "Please slow down and try again in a moment",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to accept request",
          variant: "destructive",
        });
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return await apiRequest(`/api/social/connections/${connectionId}/reject`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/connections/pending"] });
      toast({
        title: "Request rejected",
        description: "Connection request has been declined",
      });
    },
    onError: (error: any) => {
      const status = error.status || error.response?.status;
      
      if (status === 429) {
        toast({
          title: "Too many requests",
          description: "Please slow down and try again in a moment",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to reject request",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <Card data-testid="connections-list-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          My Connections
        </CardTitle>
        <CardDescription>
          Manage your driver network and connection requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connections" data-testid="tab-connections">
              <UserCheck className="w-4 h-4 mr-2" />
              Connections ({connections?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">
              <UserPlus className="w-4 h-4 mr-2" />
              Requests ({pendingRequests?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {connectionsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : connections && connections.length > 0 ? (
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <Card key={connection.id} data-testid={`connection-${connection.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium" data-testid={`connection-status-${connection.id}`}>
                              Connection ID: {connection.id}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Connected on {new Date(connection.requestedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No connections yet</p>
                  <p className="text-sm mt-2">Search for drivers to start connecting</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {requestsLoading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : pendingRequests && pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} data-testid={`request-${request.id}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium" data-testid={`request-from-${request.id}`}>
                              Connection Request
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Received {new Date(request.requestedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => acceptMutation.mutate(request.id)}
                              disabled={acceptMutation.isPending || rejectMutation.isPending}
                              data-testid={`button-accept-${request.id}`}
                            >
                              {acceptMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rejectMutation.mutate(request.id)}
                              disabled={acceptMutation.isPending || rejectMutation.isPending}
                              data-testid={`button-reject-${request.id}`}
                            >
                              {rejectMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="w-4 h-4 mr-1" />
                                  Decline
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pending requests</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
