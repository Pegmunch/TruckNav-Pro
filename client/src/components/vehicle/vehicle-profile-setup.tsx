import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Truck, Save, X } from "lucide-react";
import { insertVehicleProfileSchema, type VehicleProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const vehicleSetupSchema = insertVehicleProfileSchema.extend({
  name: z.string().min(1, "Vehicle name is required"),
  height: z.coerce.number().min(10).max(20, "Height must be between 10-20 feet"),
  width: z.coerce.number().min(6).max(12, "Width must be between 6-12 feet"),
  weight: z.coerce.number().min(1).max(80, "Weight must be between 1-80 tonnes"),
});

type VehicleSetupForm = z.infer<typeof vehicleSetupSchema>;

interface VehicleProfileSetupProps {
  onClose: () => void;
  onProfileCreated: (profile: VehicleProfile) => void;
  currentProfile?: VehicleProfile | null;
}

export default function VehicleProfileSetup({ onClose, onProfileCreated, currentProfile }: VehicleProfileSetupProps) {
  const { toast } = useToast();
  
  const form = useForm<VehicleSetupForm>({
    resolver: zodResolver(vehicleSetupSchema),
    defaultValues: {
      name: currentProfile?.name || "My Truck",
      height: currentProfile?.height || 15.75, // 15'9"
      width: currentProfile?.width || 8.5, // 8'6"
      length: currentProfile?.length || 53,
      weight: currentProfile?.weight || 44,
      axles: currentProfile?.axles || 4,
      isHazmat: currentProfile?.isHazmat || false,
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: VehicleSetupForm) => {
      const response = await apiRequest("POST", "/api/vehicle-profiles", data);
      return response.json();
    },
    onSuccess: (profile) => {
      toast({
        title: "Vehicle Profile Created",
        description: "Your vehicle profile has been saved successfully.",
      });
      onProfileCreated(profile);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create vehicle profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VehicleSetupForm) => {
    createProfileMutation.mutate(data);
  };

  const formatFeetAndInches = (feet: number) => {
    const wholeFeet = Math.floor(feet);
    const inches = Math.round((feet % 1) * 12);
    return `${wholeFeet}'${inches}"`;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-vehicle-setup">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Truck className="w-5 h-5" />
            <span>Vehicle Profile Setup</span>
          </DialogTitle>
          <DialogDescription>
            Configure your vehicle dimensions and specifications for accurate route planning.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., My Truck" {...field} data-testid="input-vehicle-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (feet)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.25"
                        placeholder="15.75" 
                        {...field} 
                        data-testid="input-vehicle-height"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {field.value ? formatFeetAndInches(Number(field.value)) : "15'9\""}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (feet)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.25"
                        placeholder="8.5" 
                        {...field} 
                        data-testid="input-vehicle-width"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {field.value ? formatFeetAndInches(Number(field.value)) : "8'6\""}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Length (feet)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="53" 
                        {...field} 
                        value={field.value || ''}
                        data-testid="input-vehicle-length"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (tonnes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="44" 
                        {...field} 
                        data-testid="input-vehicle-weight"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="axles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Axles</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="2" 
                      max="8" 
                      placeholder="4" 
                      {...field} 
                      value={field.value || ''}
                      data-testid="input-vehicle-axles"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isHazmat"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Hazardous Materials</FormLabel>
                    <FormDescription>
                      Vehicle carries hazardous materials requiring special routing
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                      data-testid="switch-hazmat"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                <Save className="w-4 h-4 mr-2" />
                {createProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
