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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Save, X, Globe, Ruler } from "lucide-react";
import { insertVehicleProfileSchema, type VehicleProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { remoteTrackingService } from "@/lib/remote-tracking";
import { useMeasurement } from "@/components/measurement/measurement-provider";

const vehicleSetupSchema = insertVehicleProfileSchema.extend({
  name: z.string().min(1, "Vehicle name is required"),
  height: z.coerce.number().min(0.5, "Height must be at least 0.5").max(25, "Height must be less than 25"),
  width: z.coerce.number().min(0.5, "Width must be at least 0.5").max(15, "Width must be less than 15"),
  weight: z.coerce.number().min(1).max(80, "Weight must be between 1-80 tonnes"),
  region: z.enum(['UK', 'EU'], { required_error: 'Please select your operating region' }),
  enableRemoteTracking: z.boolean().default(false),
});

type VehicleSetupForm = z.infer<typeof vehicleSetupSchema>;

interface VehicleProfileSetupProps {
  onClose: () => void;
  onProfileCreated: (profile: VehicleProfile) => void;
  currentProfile?: VehicleProfile | null;
}

export default function VehicleProfileSetup({ onClose, onProfileCreated, currentProfile }: VehicleProfileSetupProps) {
  const { toast } = useToast();
  const { system: units, convertDistance } = useMeasurement();
  
  // Individual unit state for height and width
  const [heightUnit, setHeightUnit] = useState<'metric' | 'imperial'>(units);
  const [widthUnit, setWidthUnit] = useState<'metric' | 'imperial'>(units);
  
  const form = useForm<VehicleSetupForm>({
    resolver: zodResolver(vehicleSetupSchema),
    defaultValues: {
      name: currentProfile?.name || "My Lorry",
      height: currentProfile?.height ? (heightUnit === 'metric' ? convertDistance(currentProfile.height, "feet", "meters") : currentProfile.height) : (heightUnit === 'metric' ? 4.0 : 13.1), // 4m default (13.1 feet)
      width: currentProfile?.width ? (widthUnit === 'metric' ? convertDistance(currentProfile.width, "feet", "meters") : currentProfile.width) : (widthUnit === 'metric' ? 2.55 : 8.37), // 2.55m default (8.37 feet)  
      length: currentProfile?.length ? (units === 'metric' ? convertDistance(currentProfile.length, "feet", "meters") : currentProfile.length) : (units === 'metric' ? 16.5 : 54.1), // 16.5m default (54.1 feet)
      weight: currentProfile?.weight || 40, // 40 tonnes default for Europe
      axles: currentProfile?.axles || 5, // 5 axles standard for articulated lorries
      isHazmat: currentProfile?.isHazmat || false,
      region: (currentProfile as any)?.region || 'EU',
      enableRemoteTracking: (currentProfile as any)?.enableRemoteTracking || false,
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

  const onSubmit = async (data: VehicleSetupForm) => {
    // Convert to feet for storage (internal format)
    const convertedData = {
      ...data,
      height: heightUnit === 'metric' ? convertDistance(data.height, "meters", "feet") : data.height,
      width: widthUnit === 'metric' ? convertDistance(data.width, "meters", "feet") : data.width,
      length: data.length ? (units === 'metric' ? convertDistance(data.length, "meters", "feet") : data.length) : undefined,
    };
    
    createProfileMutation.mutate(convertedData);
    
    // Register with remote tracking if enabled
    if ((data as any).enableRemoteTracking) {
      remoteTrackingService.registerVehicle({
        id: `vehicle-${Date.now()}`,
        name: data.name,
        profileId: 'pending' // Will be updated after profile creation
      });
    }
  };

  const formatFeetAndInches = (feet: number) => {
    const wholeFeet = Math.floor(feet);
    const inches = Math.round((feet % 1) * 12);
    return `${wholeFeet}'${inches}"`;
  };

  // Helper functions for unit conversion
  const handleHeightUnitChange = (newUnit: 'metric' | 'imperial') => {
    const currentValue = form.getValues('height');
    if (currentValue && heightUnit !== newUnit) {
      let convertedValue: number;
      if (newUnit === 'metric') {
        // Converting from imperial to metric
        convertedValue = convertDistance(currentValue, "feet", "meters");
      } else {
        // Converting from metric to imperial
        convertedValue = convertDistance(currentValue, "meters", "feet");
      }
      form.setValue('height', Number(convertedValue.toFixed(2)));
    }
    setHeightUnit(newUnit);
  };

  const handleWidthUnitChange = (newUnit: 'metric' | 'imperial') => {
    const currentValue = form.getValues('width');
    if (currentValue && widthUnit !== newUnit) {
      let convertedValue: number;
      if (newUnit === 'metric') {
        // Converting from imperial to metric
        convertedValue = convertDistance(currentValue, "feet", "meters");
      } else {
        // Converting from metric to imperial
        convertedValue = convertDistance(currentValue, "meters", "feet");
      }
      form.setValue('width', Number(convertedValue.toFixed(2)));
    }
    setWidthUnit(newUnit);
  };

  // Get unit display information
  const getHeightUnitInfo = () => {
    return heightUnit === 'metric' 
      ? { label: 'meters', placeholder: '4.0', step: '0.1' }
      : { label: 'feet', placeholder: '13.1', step: '0.25' };
  };

  const getWidthUnitInfo = () => {
    return widthUnit === 'metric' 
      ? { label: 'meters', placeholder: '2.55', step: '0.1' }
      : { label: 'feet', placeholder: '8.37', step: '0.25' };
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
            {/* Region Selection */}
            <div className="p-3 bg-muted rounded-lg">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      Operating Region
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-region">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="EU">European Union</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Name</FormLabel>
                  <FormControl>
                    <Input placeholder={units === 'metric' ? "e.g., My Lorry" : "e.g., My Truck"} {...field} data-testid="input-vehicle-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vehicle Dimensions */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Vehicle Dimensions</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => {
                    const unitInfo = getHeightUnitInfo();
                    return (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Ruler className="w-4 h-4" />
                          Height
                        </FormLabel>
                        <div className="flex gap-2">
                          <FormControl className="flex-1">
                            <Input 
                              type="number" 
                              step={unitInfo.step}
                              placeholder={unitInfo.placeholder} 
                              {...field} 
                              data-testid="input-vehicle-height"
                            />
                          </FormControl>
                          <Select 
                            value={heightUnit} 
                            onValueChange={(value: 'metric' | 'imperial') => handleHeightUnitChange(value)}
                            data-testid="select-height-unit"
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="metric">meters</SelectItem>
                              <SelectItem value="imperial">feet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <FormDescription className="text-xs">
                          {field.value ? (
                            heightUnit === 'metric' ? 
                              `${Number(field.value).toFixed(1)}m (${formatFeetAndInches(convertDistance(Number(field.value), "meters", "feet"))})` : 
                              `${formatFeetAndInches(Number(field.value))} (${convertDistance(Number(field.value), "feet", "meters").toFixed(1)}m)`
                          ) : (heightUnit === 'metric' ? '4.0m (13\'1")' : '13\'1" (4.0m)')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="width"
                  render={({ field }) => {
                    const unitInfo = getWidthUnitInfo();
                    return (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Ruler className="w-4 h-4" />
                          Width
                        </FormLabel>
                        <div className="flex gap-2">
                          <FormControl className="flex-1">
                            <Input 
                              type="number" 
                              step={unitInfo.step}
                              placeholder={unitInfo.placeholder} 
                              {...field} 
                              data-testid="input-vehicle-width"
                            />
                          </FormControl>
                          <Select 
                            value={widthUnit} 
                            onValueChange={(value: 'metric' | 'imperial') => handleWidthUnitChange(value)}
                            data-testid="select-width-unit"
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="metric">meters</SelectItem>
                              <SelectItem value="imperial">feet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <FormDescription className="text-xs">
                          {field.value ? (
                            widthUnit === 'metric' ? 
                              `${Number(field.value).toFixed(1)}m (${formatFeetAndInches(convertDistance(Number(field.value), "meters", "feet"))})` : 
                              `${formatFeetAndInches(Number(field.value))} (${convertDistance(Number(field.value), "feet", "meters").toFixed(1)}m)`
                          ) : (widthUnit === 'metric' ? '2.6m (8\'6")' : '8\'6" (2.6m)')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
