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
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Save, X, Globe, Ruler, Car, Building2 } from "lucide-react";
import { insertVehicleProfileSchema, type VehicleProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { remoteTrackingService } from "@/lib/remote-tracking";
import { useMeasurement } from "@/components/measurement/measurement-provider";

const vehicleSetupSchema = insertVehicleProfileSchema.extend({
  name: z.string().min(1, "Vehicle name is required"),
  type: z.enum(['car', 'car_caravan', 'class_1_lorry', 'class_2_lorry', '7_5_tonne'], { required_error: 'Please select vehicle type' }),
  height: z.coerce.number().min(0.5, "Height must be at least 0.5").max(25, "Height must be less than 25"),
  width: z.coerce.number().min(0.5, "Width must be at least 0.5").max(15, "Width must be less than 15"),
  weight: z.coerce.number().min(0.5).max(80, "Weight must be between 0.5-80 tonnes"),
  length: z.coerce.number().min(1).max(100).optional(),
  axles: z.coerce.number().min(2).max(10).optional(),
  isHazmat: z.boolean().default(false),
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
  const [vehicleType, setVehicleType] = useState<'car' | 'car_caravan' | 'class_1_lorry' | 'class_2_lorry' | '7_5_tonne'>(
    (currentProfile as any)?.type || 'class_1_lorry'
  );
  
  // Get defaults based on vehicle type
  const getVehicleDefaults = (type: 'car' | 'car_caravan' | 'class_1_lorry' | 'class_2_lorry' | '7_5_tonne') => {
    switch (type) {
      case 'car':
        return {
          name: "My Car",
          height: heightUnit === 'metric' ? 1.5 : 4.9, // 1.5m (4.9 feet) for cars
          width: widthUnit === 'metric' ? 1.8 : 5.9, // 1.8m (5.9 feet) for cars
          length: units === 'metric' ? 4.5 : 14.8, // 4.5m (14.8 feet) for cars
          weight: 2.0, // 2 tonnes typical for cars
          axles: 2, // 2 axles for cars
          isHazmat: false,
        };
      case 'car_caravan':
        return {
          name: "My Car + Caravan",
          height: heightUnit === 'metric' ? 2.5 : 8.2, // 2.5m (8.2 feet) for car + caravan
          width: widthUnit === 'metric' ? 2.3 : 7.5, // 2.3m (7.5 feet) for car + caravan
          length: units === 'metric' ? 12.0 : 39.4, // 12m (39.4 feet) for car + caravan
          weight: 3.5, // 3.5 tonnes for car + caravan
          axles: 4, // 4 axles for car + caravan
          isHazmat: false,
        };
      case 'class_1_lorry':
        return {
          name: "My Class 1 Lorry",
          height: heightUnit === 'metric' ? 3.2 : 10.5, // 3.2m (10.5 feet) for Class 1 Lorry
          width: widthUnit === 'metric' ? 2.5 : 8.2, // 2.5m (8.2 feet) for Class 1 Lorry
          length: units === 'metric' ? 8.5 : 27.9, // 8.5m (27.9 feet) for Class 1 Lorry
          weight: 7.5, // 7.5 tonnes for Class 1 Lorry (light commercial)
          axles: 2, // 2 axles for Class 1 Lorry
          isHazmat: false,
        };
      case 'class_2_lorry':
        return {
          name: "My Class 2 Lorry",
          height: heightUnit === 'metric' ? 3.5 : 11.5, // 3.5m (11.5 feet) for Class 2 Lorry
          width: widthUnit === 'metric' ? 2.5 : 8.2, // 2.5m (8.2 feet) for Class 2 Lorry
          length: units === 'metric' ? 12.0 : 39.4, // 12m (39.4 feet) for Class 2 Lorry
          weight: 18.0, // 18 tonnes for Class 2 Lorry
          axles: 3, // 3 axles for Class 2 Lorry
          isHazmat: false,
        };
      case '7_5_tonne':
        return {
          name: "My 7.5 Tonne Vehicle",
          height: heightUnit === 'metric' ? 3.3 : 10.8, // 3.3m (10.8 feet) for 7.5 tonne
          width: widthUnit === 'metric' ? 2.55 : 8.37, // 2.55m (8.37 feet) for 7.5 tonne
          length: units === 'metric' ? 10.0 : 32.8, // 10m (32.8 feet) for 7.5 tonne
          weight: 7.5, // 7.5 tonnes for 7.5 tonne vehicle
          axles: 3, // 3 axles for 7.5 tonne vehicle
          isHazmat: false,
        };
      default:
        return getVehicleDefaults('car');
    }
  };

  const form = useForm<VehicleSetupForm>({
    resolver: zodResolver(vehicleSetupSchema),
    defaultValues: {
      type: (currentProfile as any)?.type || vehicleType,
      ...getVehicleDefaults(vehicleType),
      region: (currentProfile as any)?.region || 'EU',
      enableRemoteTracking: (currentProfile as any)?.enableRemoteTracking || false,
      // Override with current profile values if editing - with proper null coalescing
      ...(currentProfile && {
        name: currentProfile.name,
        height: heightUnit === 'metric' ? convertDistance(currentProfile.height, "feet", "meters") : currentProfile.height,
        width: widthUnit === 'metric' ? convertDistance(currentProfile.width, "feet", "meters") : currentProfile.width,
        length: currentProfile.length ? (units === 'metric' ? convertDistance(currentProfile.length, "feet", "meters") : currentProfile.length) : getVehicleDefaults(vehicleType).length,
        weight: currentProfile.weight ?? getVehicleDefaults(vehicleType).weight,
        axles: currentProfile.axles ?? getVehicleDefaults(vehicleType).axles,
        isHazmat: currentProfile.isHazmat ?? false,
      }),
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: VehicleSetupForm) => {
      const response = await apiRequest("POST", "/api/vehicle-profiles", data);
      return response.json();
    },
    onSuccess: (profile) => {
      // toast({
      //   title: "Vehicle Profile Created",
      //   description: "Your vehicle profile has been saved successfully.",
      // });
      onProfileCreated(profile);
    },
    onError: () => {
      // toast({
      //   title: "Error",
      //   description: "Failed to create vehicle profile. Please try again.",
      //   variant: "destructive",
      // });
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

  // Handle vehicle type change and update defaults
  const handleVehicleTypeChange = (newType: 'car' | 'car_caravan' | 'class_1_lorry' | 'class_2_lorry' | '7_5_tonne') => {
    if (newType !== vehicleType) {
      setVehicleType(newType);
      const defaults = getVehicleDefaults(newType);
      
      // Update form with new defaults
      form.setValue('type', newType);
      form.setValue('name', defaults.name);
      form.setValue('height', defaults.height);
      form.setValue('width', defaults.width);
      form.setValue('length', defaults.length);
      form.setValue('weight', defaults.weight);
      form.setValue('axles', defaults.axles);
      form.setValue('isHazmat', defaults.isHazmat);
    }
  };

  // Get icon for vehicle type
  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'car':
        return <Car className="w-4 h-4" />;
      case 'car_caravan':
        return <Truck className="w-4 h-4" />;
      case 'class_1_lorry':
        return <Truck className="w-4 h-4" />;
      case 'class_2_lorry':
        return <Building2 className="w-4 h-4" />;
      case '7_5_tonne':
        return <Truck className="w-4 h-4" />;
      default:
        return <Car className="w-4 h-4" />;
    }
  };

  // Get vehicle type display name
  const getVehicleDisplayName = (type: string) => {
    switch (type) {
      case 'car':
        return 'Car';
      case 'car_caravan':
        return 'Car + Caravan';
      case 'class_1_lorry':
        return 'Class 1 Lorry';
      case 'class_2_lorry':
        return 'Class 2 Lorry';
      case '7_5_tonne':
        return '7.5 Tonne Vehicle';
      default:
        return 'Car';
    }
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
      <DialogContent className="max-w-sm sm:max-w-xs" data-testid="dialog-vehicle-setup">
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
            {/* Vehicle Type Selection */}
            <div className="p-3 bg-muted rounded-lg">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      {getVehicleIcon(vehicleType)}
                      Vehicle Type
                    </FormLabel>
                    <Select 
                      onValueChange={(value: 'car' | 'car_caravan' | 'class_1_lorry' | 'class_2_lorry' | '7_5_tonne') => {
                        field.onChange(value);
                        handleVehicleTypeChange(value);
                      }} 
                      defaultValue={field.value} 
                      data-testid="select-vehicle-type"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="car">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4" />
                            <div className="flex flex-col">
                              <span className="font-medium">Car</span>
                              <span className="text-xs text-muted-foreground">Single passenger vehicle</span>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="car_caravan">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            <div className="flex flex-col">
                              <span className="font-medium">Car + Caravan</span>
                              <span className="text-xs text-muted-foreground">Car towing a caravan/trailer</span>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="class_1_lorry">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            <div className="flex flex-col">
                              <span className="font-medium">Class 1 Lorry</span>
                              <span className="text-xs text-muted-foreground">Light commercial vehicle (up to 7.5t)</span>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="class_2_lorry">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <div className="flex flex-col">
                              <span className="font-medium">Class 2 Lorry</span>
                              <span className="text-xs text-muted-foreground">Medium commercial vehicle</span>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="7_5_tonne">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            <div className="flex flex-col">
                              <span className="font-medium">7.5 Tonne Vehicle</span>
                              <span className="text-xs text-muted-foreground">Large commercial vehicle</span>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    <Input 
                      placeholder={`e.g., ${getVehicleDefaults(vehicleType).name}`} 
                      {...field} 
                      data-testid="input-vehicle-name" 
                    />
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
                        placeholder={getVehicleDefaults(vehicleType).weight.toString()} 
                        {...field} 
                        data-testid="input-vehicle-weight"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {vehicleType === 'car' ? 'Typical car weight: 1.5-2.5 tonnes' : 
                       vehicleType === 'car_caravan' ? 'Car + caravan weight: 2.5-4.5 tonnes' :
                       vehicleType === 'class_1_lorry' ? 'Class 1 lorry weight: up to 7.5 tonnes' :
                       vehicleType === 'class_2_lorry' ? 'Class 2 lorry weight: 18-26 tonnes' :
                       '7.5 tonne vehicle weight: up to 7.5 tonnes'}
                    </FormDescription>
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
                      max={vehicleType === 'car' ? "4" : "8"} 
                      placeholder={getVehicleDefaults(vehicleType).axles.toString()} 
                      {...field} 
                      value={field.value || ''}
                      data-testid="input-vehicle-axles"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {vehicleType === 'car' ? 'Cars typically have 2 axles' : 
                     vehicleType === 'car_caravan' ? 'Car + caravan typically have 4 axles' :
                     vehicleType === 'class_2_lorry' ? 'Class 2 lorries typically have 3 axles' :
                     '7.5 tonne vehicles typically have 3 axles'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Only show hazmat for commercial vehicles */}
            {(vehicleType === 'class_2_lorry' || vehicleType === '7_5_tonne') && (
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
            )}

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
