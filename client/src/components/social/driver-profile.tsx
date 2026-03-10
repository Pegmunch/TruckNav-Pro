import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Save, Loader2 } from "lucide-react";

const profileFormSchema = z.object({
  bio: z.string().max(500).optional(),
  companyName: z.string().max(100).optional(),
  truckType: z.string().max(100).optional(),
  yearsExperience: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? undefined : val,
    z.number().int().min(0).max(100)
  ).optional(),
  isPublicProfile: z.boolean(),
  allowConnectionRequests: z.boolean(),
  allowMessages: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface DriverProfileProps {
  userId: string;
}

export function DriverProfile({ userId }: DriverProfileProps) {
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/social/profile", userId],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return await apiRequest(`/api/social/profile/${userId}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/profile", userId] });
      toast({
        title: "Profile updated",
        description: "Your driver profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      bio: profile?.bio || "",
      companyName: profile?.companyName || "",
      truckType: profile?.truckType || "",
      ...(profile?.yearsExperience !== undefined && profile?.yearsExperience !== null ? { yearsExperience: profile.yearsExperience } : {}),
      isPublicProfile: profile?.isPublicProfile ?? true,
      allowConnectionRequests: profile?.allowConnectionRequests ?? true,
      allowMessages: profile?.allowMessages ?? true,
    },
    values: profile ? {
      bio: profile.bio || "",
      companyName: profile.companyName || "",
      truckType: profile.truckType || "",
      ...(profile.yearsExperience !== undefined && profile.yearsExperience !== null ? { yearsExperience: profile.yearsExperience } : {}),
      isPublicProfile: profile.isPublicProfile ?? true,
      allowConnectionRequests: profile.allowConnectionRequests ?? true,
      allowMessages: profile.allowMessages ?? true,
    } : undefined,
  });

  const onSubmit = (data: ProfileFormValues) => {
    const cleanedData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => 
        value !== undefined && !Number.isNaN(value)
      )
    ) as ProfileFormValues;
    updateProfileMutation.mutate(cleanedData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="driver-profile-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Driver Profile
        </CardTitle>
        <CardDescription>
          Manage your professional driver profile and privacy settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell other drivers about yourself..."
                      className="min-h-[100px] resize-none"
                      data-testid="input-bio"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Brief introduction (max 500 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your company"
                        data-testid="input-company-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="truckType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Truck Type</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Class 1 Lorry, 7.5 Tonne"
                        data-testid="input-truck-type"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="yearsExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      data-testid="input-years-experience"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Privacy Settings</h4>

              <FormField
                control={form.control}
                name="isPublicProfile"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Public Profile</FormLabel>
                      <FormDescription>
                        Allow anyone to view your profile
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-public-profile"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowConnectionRequests"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Connection Requests</FormLabel>
                      <FormDescription>
                        Allow other drivers to send you connection requests
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-allow-connections"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowMessages"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Messages (Coming Soon)</FormLabel>
                      <FormDescription>
                        Allow connections to send you messages
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled
                        data-testid="switch-allow-messages"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
