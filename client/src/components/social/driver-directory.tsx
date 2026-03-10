import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Users, Truck, Building2, UserPlus, Loader2, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Driver {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  companyName?: string;
  truckType?: string;
  yearsExperience?: number;
  bio?: string;
  isPublicProfile: boolean;
}

export function DriverDirectory() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["/api/social/drivers/search", debouncedQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ q: debouncedQuery, limit: "20" });
      const response = await fetch(`/api/social/drivers/search?${params}`);
      if (!response.ok) throw new Error("Failed to search drivers");
      return response.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      return await apiRequest("/api/social/connections/request", {
        method: "POST",
        body: JSON.stringify({ receiverId }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Request sent",
        description: "Connection request sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social/connections"] });
    },
    onError: (error: any) => {
      const status = error.status || error.response?.status;
      
      if (status === 403) {
        toast({
          title: "Request not allowed",
          description: "This user has disabled connection requests",
          variant: "destructive",
        });
      } else if (status === 429) {
        toast({
          title: "Too many requests",
          description: "You've reached the limit for connection requests. Please try again later.",
          variant: "destructive",
        });
      } else if (status === 409) {
        toast({
          title: "Request already sent",
          description: "You've already sent a connection request to this user",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to send request",
          variant: "destructive",
        });
      }
    },
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  };

  return (
    <Card data-testid="driver-directory-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Driver Directory
        </CardTitle>
        <CardDescription>
          Search and connect with other professional truck drivers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, or truck type..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              data-testid="input-search-drivers"
            />
          </div>

          <ScrollArea className="h-[500px] pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                ))}
              </div>
            ) : !debouncedQuery ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Start typing to search for drivers</p>
              </div>
            ) : drivers && drivers.length > 0 ? (
              <div className="space-y-4">
                {drivers.map((driver) => (
                  <Card key={driver.id} data-testid={`driver-card-${driver.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div>
                            <h3 className="font-semibold text-lg" data-testid={`driver-name-${driver.id}`}>
                              {driver.firstName && driver.lastName
                                ? `${driver.firstName} ${driver.lastName}`
                                : driver.username || "Driver"}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {driver.companyName && (
                                <Badge variant="secondary" className="gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {driver.companyName}
                                </Badge>
                              )}
                              {driver.truckType && (
                                <Badge variant="outline" className="gap-1">
                                  <Truck className="w-3 h-3" />
                                  {driver.truckType}
                                </Badge>
                              )}
                              {driver.yearsExperience !== undefined && driver.yearsExperience > 0 && (
                                <Badge variant="outline" className="gap-1">
                                  <Award className="w-3 h-3" />
                                  {driver.yearsExperience} years
                                </Badge>
                              )}
                            </div>
                          </div>
                          {driver.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`driver-bio-${driver.id}`}>
                              {driver.bio}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => sendRequestMutation.mutate(driver.id)}
                          disabled={sendRequestMutation.isPending || driver.id === user?.id}
                          className="w-full md:w-auto"
                          size="sm"
                          data-testid={`button-connect-${driver.id}`}
                        >
                          {sendRequestMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : driver.id === user?.id ? (
                            "Your Profile"
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Connect
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No drivers found matching "{debouncedQuery}"</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
