import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Route, Globe, Users, Bookmark, BookmarkCheck, MapPin, MessageCircle, Star, Loader2, Send } from "lucide-react";

interface SharedRoute {
  id: string;
  userId: string;
  routeId: string;
  title: string;
  description?: string;
  isPublic: boolean;
  shareWithConnections: boolean;
  tags?: string[];
  sharedAt: string;
}

interface RouteComment {
  id: string;
  userId: string;
  comment: string;
  rating?: number;
  createdAt: string;
}

export function SharedRoutesBrowser() {
  const { toast } = useToast();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState<number>(0);

  const { data: publicRoutes, isLoading: publicLoading } = useQuery<SharedRoute[]>({
    queryKey: ["/api/social/routes/public"],
  });

  const { data: connectionRoutes, isLoading: connectionLoading } = useQuery<SharedRoute[]>({
    queryKey: ["/api/social/routes/connections"],
  });

  const { data: savedRoutes, isLoading: savedLoading } = useQuery<SharedRoute[]>({
    queryKey: ["/api/social/routes/saved"],
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<RouteComment[]>({
    queryKey: ["/api/social/routes", selectedRoute, "comments"],
    enabled: !!selectedRoute,
  });

  const saveRouteMutation = useMutation({
    mutationFn: async (routeId: string) => {
      return await apiRequest(`/api/social/routes/${routeId}/save`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/routes/saved"] });
      toast({
        title: "Route saved",
        description: "Route added to your saved routes",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save route",
        variant: "destructive",
      });
    },
  });

  const unsaveRouteMutation = useMutation({
    mutationFn: async (routeId: string) => {
      return await apiRequest(`/api/social/routes/${routeId}/unsave`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/routes/saved"] });
      toast({
        title: "Route removed",
        description: "Route removed from saved routes",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove route",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ routeId, comment, rating }: { routeId: string; comment: string; rating?: number }) => {
      return await apiRequest(`/api/social/routes/${routeId}/comment`, {
        method: "POST",
        body: JSON.stringify({ comment, rating }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/routes", selectedRoute, "comments"] });
      setCommentText("");
      setCommentRating(0);
      toast({
        title: "Comment posted",
        description: "Your feedback has been added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  const handlePostComment = () => {
    if (selectedRoute && commentText.trim()) {
      commentMutation.mutate({
        routeId: selectedRoute,
        comment: commentText,
        rating: commentRating > 0 ? commentRating : undefined,
      });
    }
  };

  const RouteCard = ({ route, isSaved = false }: { route: SharedRoute; isSaved?: boolean }) => (
    <Card key={route.id} data-testid={`route-card-${route.id}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-lg" data-testid={`route-title-${route.id}`}>
                {route.title}
              </h3>
              <Badge variant={route.isPublic ? "default" : "secondary"}>
                {route.isPublic ? <Globe className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                {route.isPublic ? "Public" : "Connections"}
              </Badge>
            </div>
            {route.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2" data-testid={`route-description-${route.id}`}>
                {route.description}
              </p>
            )}
          </div>

          {route.tags && route.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {route.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {isSaved ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => unsaveRouteMutation.mutate(route.id)}
                disabled={unsaveRouteMutation.isPending}
                data-testid={`button-unsave-${route.id}`}
              >
                <BookmarkCheck className="w-4 h-4 mr-1" />
                Saved
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveRouteMutation.mutate(route.id)}
                disabled={saveRouteMutation.isPending}
                data-testid={`button-save-${route.id}`}
              >
                <Bookmark className="w-4 h-4 mr-1" />
                Save Route
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRoute(route.id)}
              data-testid={`button-comments-${route.id}`}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              Comments
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Shared {new Date(route.sharedAt).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Card data-testid="shared-routes-browser-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Shared Routes
          </CardTitle>
          <CardDescription>
            Discover and save routes shared by other drivers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="public" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="public" data-testid="tab-public-routes">
                <Globe className="w-4 h-4 mr-2" />
                Public
              </TabsTrigger>
              <TabsTrigger value="connections" data-testid="tab-connection-routes">
                <Users className="w-4 h-4 mr-2" />
                Connections
              </TabsTrigger>
              <TabsTrigger value="saved" data-testid="tab-saved-routes">
                <Bookmark className="w-4 h-4 mr-2" />
                Saved
              </TabsTrigger>
            </TabsList>

            <TabsContent value="public" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {publicLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : publicRoutes && publicRoutes.length > 0 ? (
                  <div className="space-y-4">
                    {publicRoutes.map((route) => (
                      <RouteCard key={route.id} route={route} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Route className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No public routes available</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="connections" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {connectionLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : connectionRoutes && connectionRoutes.length > 0 ? (
                  <div className="space-y-4">
                    {connectionRoutes.map((route) => (
                      <RouteCard key={route.id} route={route} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No routes from connections yet</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="saved" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {savedLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : savedRoutes && savedRoutes.length > 0 ? (
                  <div className="space-y-4">
                    {savedRoutes.map((saved: any) => (
                      <RouteCard key={saved.id} route={saved} isSaved />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No saved routes yet</p>
                    <p className="text-sm mt-2">Save routes from the Public or Connections tabs</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRoute} onOpenChange={() => setSelectedRoute(null)}>
        <DialogContent className="max-w-2xl" data-testid="comments-dialog">
          <DialogHeader>
            <DialogTitle>Route Comments & Ratings</DialogTitle>
            <DialogDescription>
              Share your experience with this route
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Rating (optional):</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setCommentRating(star)}
                      className="focus:outline-none"
                      data-testid={`rating-star-${star}`}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= commentRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Share your thoughts about this route..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-comment"
              />

              <Button
                onClick={handlePostComment}
                disabled={!commentText.trim() || commentMutation.isPending}
                className="w-full"
                data-testid="button-post-comment"
              >
                {commentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post Comment
                  </>
                )}
              </Button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Comments</h4>
              <ScrollArea className="h-[300px] pr-4">
                {commentsLoading ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : comments && comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <Card key={comment.id} data-testid={`comment-${comment.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              {comment.rating && comment.rating > 0 && (
                                <div className="flex gap-1 mb-1">
                                  {[...Array(comment.rating)].map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </div>
                              )}
                              <p className="text-sm" data-testid={`comment-text-${comment.id}`}>
                                {comment.comment}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRoute(null)} data-testid="button-close-comments">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
