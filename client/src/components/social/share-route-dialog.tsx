import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Share2, Loader2, X, Globe, Users } from "lucide-react";

const shareRouteSchema = z.object({
  routeId: z.string().min(1, "Route ID is required"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean(),
  shareWithConnections: z.boolean(),
  tags: z.array(z.string()).optional(),
});

type ShareRouteFormValues = z.infer<typeof shareRouteSchema>;

interface ShareRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  defaultTitle?: string;
}

export function ShareRouteDialog({ open, onOpenChange, routeId, defaultTitle }: ShareRouteDialogProps) {
  const { toast } = useToast();
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const shareRouteMutation = useMutation({
    mutationFn: async (data: ShareRouteFormValues) => {
      return await apiRequest("/api/social/routes/share", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate shared routes (user's own shared routes)
      queryClient.invalidateQueries({ queryKey: ["/api/social/routes/shared"] });
      
      // If shared publicly, invalidate public routes tab
      if (variables.isPublic) {
        queryClient.invalidateQueries({ queryKey: ["/api/social/routes/public"] });
      }
      
      // If shared with connections, invalidate connections routes tab
      if (variables.shareWithConnections) {
        queryClient.invalidateQueries({ queryKey: ["/api/social/routes/connections"] });
      }
      
      toast({
        title: "Route shared",
        description: "Your route has been shared successfully",
      });
      onOpenChange(false);
      form.reset();
      setTags([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to share route",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ShareRouteFormValues>({
    resolver: zodResolver(shareRouteSchema),
    defaultValues: {
      routeId,
      title: defaultTitle || "",
      description: "",
      isPublic: false,
      shareWithConnections: true,
      tags: [],
    },
  });

  const onSubmit = (data: ShareRouteFormValues) => {
    shareRouteMutation.mutate({
      ...data,
      tags,
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 5 && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="share-route-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Route
          </DialogTitle>
          <DialogDescription>
            Share this route with other drivers in your network
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Manchester to London via M6"
                      data-testid="input-route-title"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Give your route a descriptive title
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share details about this route: traffic patterns, good rest stops, road conditions..."
                      className="min-h-[100px] resize-none"
                      data-testid="input-route-description"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Help other drivers by sharing useful information (max 500 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Tags (optional)</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tags (e.g., motorway, scenic, fuel-efficient)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={tags.length >= 5}
                  data-testid="input-tag"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= 5}
                  data-testid="button-add-tag"
                >
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="gap-1" data-testid={`tag-${tag}`}>
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-tag-${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {tags.length}/5 tags added
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Sharing Settings</h4>

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <FormLabel className="text-base">Public Route</FormLabel>
                      </div>
                      <FormDescription>
                        Make this route visible to all drivers (not just connections)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-public-route"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shareWithConnections"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <FormLabel className="text-base">Share with Connections</FormLabel>
                      </div>
                      <FormDescription>
                        Make this route visible to your connections
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-share-connections"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-share"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={shareRouteMutation.isPending}
                data-testid="button-confirm-share"
              >
                {shareRouteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Route
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
