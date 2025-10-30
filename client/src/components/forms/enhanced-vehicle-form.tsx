import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EnhancedInput } from "@/components/ui/enhanced-input";
import { InputGroup, FieldGroup, ActionGroup, Stepper } from "@/components/ui/input-group";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Truck, 
  Car, 
  Building2, 
  Ruler, 
  Weight, 
  Globe, 
  Shield,
  CheckCircle,
  AlertCircle,
  Navigation
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeasurement } from "@/components/measurement/measurement-provider";
import { useToast } from "@/hooks/use-toast";

const vehicleFormSchema = z.object({
  name: z.string().min(1, "Vehicle name is required"),
  type: z.enum(['car', 'car_caravan', 'class_1_lorry', 'class_2_lorry', '7_5_tonne']),
  height: z.coerce.number().min(0.5, "Height must be at least 0.5").max(25, "Height must be less than 25"),
  width: z.coerce.number().min(0.5, "Width must be at least 0.5").max(15, "Width must be less than 15"),
  weight: z.coerce.number().min(0.5).max(80, "Weight must be between 0.5-80 tonnes"),
  length: z.coerce.number().min(1).max(100).optional(),
  axles: z.coerce.number().min(2).max(10).optional(),
  isHazmat: z.boolean().default(false),
  region: z.enum(['UK', 'EU']),
  enableRemoteTracking: z.boolean().default(false),
});

type VehicleFormData = z.infer<typeof vehicleFormSchema>;

interface EnhancedVehicleFormProps {
  onSave: (data: VehicleFormData) => void;
  onCancel: () => void;
  initialData?: Partial<VehicleFormData>;
  className?: string;
}

/**
 * Enhanced Vehicle Form Component
 * Demonstrates improved input organization with:
 * - Logical grouping of related fields
 * - Multi-step flow with progress indicator
 * - Enhanced mobile touch targets
 * - Clear visual hierarchy
 * - Better error handling and validation feedback
 */
export function EnhancedVehicleForm({ 
  onSave, 
  onCancel, 
  initialData,
  className 
}: EnhancedVehicleFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const { system: units, formatHeight, formatDistance } = useMeasurement();
  const { toast } = useToast();

  const steps = ['Basic Info', 'Dimensions', 'Configuration'];

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || 'class_1_lorry',
      height: initialData?.height || 3.2,
      width: initialData?.width || 2.5,
      weight: initialData?.weight || 7.5,
      length: initialData?.length || 8.5,
      axles: initialData?.axles || 2,
      isHazmat: initialData?.isHazmat || false,
      region: initialData?.region || 'EU',
      enableRemoteTracking: initialData?.enableRemoteTracking || false,
    },
  });

  const vehicleType = form.watch('type');
  const isHazmat = form.watch('isHazmat');

  // Vehicle type configurations
  const vehicleTypeConfig = {
    car: {
      icon: Car,
      label: "Car",
      description: "Standard passenger vehicle",
      badge: "Personal",
      defaults: { height: 1.5, width: 1.8, weight: 2.0, axles: 2 }
    },
    car_caravan: {
      icon: Car,
      label: "Car + Caravan",
      description: "Car towing a caravan or trailer",
      badge: "Leisure",
      defaults: { height: 2.5, width: 2.3, weight: 3.5, axles: 4 }
    },
    class_1_lorry: {
      icon: Truck,
      label: "Class 1 Lorry",
      description: "Light commercial vehicle up to 7.5 tonnes",
      badge: "Commercial",
      defaults: { height: 3.2, width: 2.5, weight: 7.5, axles: 2 }
    },
    class_2_lorry: {
      icon: Truck,
      label: "Class 2 Lorry",
      description: "Medium commercial vehicle up to 18 tonnes",
      badge: "Commercial",
      defaults: { height: 3.5, width: 2.5, weight: 18.0, axles: 3 }
    },
    '7_5_tonne': {
      icon: Building2,
      label: "7.5 Tonne Vehicle",
      description: "Box truck or delivery vehicle",
      badge: "Delivery",
      defaults: { height: 3.3, width: 2.55, weight: 7.5, axles: 3 }
    }
  };

  const currentConfig = vehicleTypeConfig[vehicleType];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFormSubmit = (data: VehicleFormData) => {
    onSave(data);
    // toast({
    //   title: "Vehicle profile saved",
    //   description: `${data.name} has been configured successfully.`,
    //   duration: 3000,
    // });
  };

  const applyDefaults = () => {
    const defaults = currentConfig.defaults;
    form.setValue('height', defaults.height);
    form.setValue('width', defaults.width);
    form.setValue('weight', defaults.weight);
    form.setValue('axles', defaults.axles);
    // toast({
    //   title: "Defaults applied",
    //   description: `Standard dimensions for ${currentConfig.label} have been set.`,
    // });
  };

  return (
    <div className={cn("space-y-6", className)} data-testid="enhanced-vehicle-form">
      <Stepper steps={steps} currentStep={currentStep} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          
          {/* Step 1: Basic Information */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <InputGroup
                title="Vehicle Information"
                description="Basic details about your vehicle"
                variant="card"
              >
                <FieldGroup
                  label="Vehicle Name"
                  description="A name to identify this vehicle profile"
                  required
                  error={form.formState.errors.name?.message}
                  layout="stacked"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <EnhancedInput
                            placeholder="e.g., My Delivery Truck"
                            variant="default"
                            clearable
                            onClear={() => field.onChange("")}
                            {...field}
                            data-testid="input-vehicle-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldGroup>

                <FieldGroup
                  label="Vehicle Type"
                  description="Select the type that best describes your vehicle"
                  required
                  error={form.formState.errors.type?.message}
                >
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-vehicle-type">
                            <SelectTrigger className="min-h-[48px]">
                              <SelectValue placeholder="Choose vehicle type" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(vehicleTypeConfig).map(([key, config]) => {
                                const IconComponent = config.icon;
                                return (
                                  <SelectItem key={key} value={key} className="min-h-[48px] p-3">
                                    <div className="flex items-center gap-3 w-full">
                                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{config.label}</span>
                                          <Badge variant="secondary" className="text-xs">
                                            {config.badge}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {config.description}
                                        </p>
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldGroup>

                <FieldGroup
                  label="Operating Region"
                  description="Primary region where you'll be driving"
                  required
                  error={form.formState.errors.region?.message}
                >
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-region">
                            <SelectTrigger className="min-h-[48px]">
                              <SelectValue placeholder="Choose region" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UK" className="min-h-[48px] p-3">
                                <div className="flex items-center gap-3">
                                  <Globe className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">United Kingdom</div>
                                    <div className="text-sm text-muted-foreground">UK road regulations</div>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="EU" className="min-h-[48px] p-3">
                                <div className="flex items-center gap-3">
                                  <Globe className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">European Union</div>
                                    <div className="text-sm text-muted-foreground">EU road regulations</div>
                                  </div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldGroup>
              </InputGroup>
            </div>
          )}

          {/* Step 2: Vehicle Dimensions */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <InputGroup
                title="Vehicle Dimensions"
                description={`Accurate dimensions for ${currentConfig.label}`}
                badge={`${units.toUpperCase()}`}
                variant="card"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <currentConfig.icon className="h-5 w-5 text-primary" />
                    <span className="font-medium">{currentConfig.label}</span>
                    <Badge variant="outline">{currentConfig.badge}</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyDefaults}
                    data-testid="button-apply-defaults"
                  >
                    Apply Defaults
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldGroup
                    label="Height"
                    description={`Maximum height including roof equipment (${units === 'metric' ? 'meters' : 'feet'})`}
                    required
                    error={form.formState.errors.height?.message}
                  >
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <EnhancedInput
                              type="number"
                              step="0.1"
                              min="0.5"
                              max="25"
                              leftIcon={<Ruler className="h-4 w-4" />}
                              placeholder={`e.g., ${currentConfig.defaults.height}`}
                              {...field}
                              data-testid="input-height"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGroup>

                  <FieldGroup
                    label="Width"
                    description={`Maximum width including mirrors (${units === 'metric' ? 'meters' : 'feet'})`}
                    required
                    error={form.formState.errors.width?.message}
                  >
                    <FormField
                      control={form.control}
                      name="width"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <EnhancedInput
                              type="number"
                              step="0.1"
                              min="0.5"
                              max="15"
                              leftIcon={<Ruler className="h-4 w-4" />}
                              placeholder={`e.g., ${currentConfig.defaults.width}`}
                              {...field}
                              data-testid="input-width"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGroup>

                  <FieldGroup
                    label="Weight"
                    description="Maximum gross vehicle weight (tonnes)"
                    required
                    error={form.formState.errors.weight?.message}
                  >
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <EnhancedInput
                              type="number"
                              step="0.1"
                              min="0.5"
                              max="80"
                              leftIcon={<Weight className="h-4 w-4" />}
                              placeholder={`e.g., ${currentConfig.defaults.weight}`}
                              {...field}
                              data-testid="input-weight"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGroup>

                  <FieldGroup
                    label="Length"
                    description={`Total vehicle length (${units === 'metric' ? 'meters' : 'feet'})`}
                    showOptional
                    error={form.formState.errors.length?.message}
                  >
                    <FormField
                      control={form.control}
                      name="length"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <EnhancedInput
                              type="number"
                              step="0.1"
                              min="1"
                              max="100"
                              leftIcon={<Ruler className="h-4 w-4" />}
                              placeholder="Optional"
                              {...field}
                              data-testid="input-length"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGroup>
                </div>
              </InputGroup>
            </div>
          )}

          {/* Step 3: Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <InputGroup
                title="Vehicle Configuration"
                description="Additional settings and safety options"
                variant="card"
              >
                <FieldGroup
                  label="Number of Axles"
                  description="Total number of axles on the vehicle"
                  showOptional
                  error={form.formState.errors.axles?.message}
                >
                  <FormField
                    control={form.control}
                    name="axles"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()} data-testid="select-axles">
                            <SelectTrigger className="min-h-[48px]">
                              <SelectValue placeholder="Select number of axles" />
                            </SelectTrigger>
                            <SelectContent>
                              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} axle{num !== 1 ? 's' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldGroup>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Safety & Compliance
                  </h4>

                  <FieldGroup layout="inline">
                    <FormField
                      control={form.control}
                      name="isHazmat"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-hazmat"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Hazardous Materials</span>
                              {field.value && <Badge variant="destructive" className="text-xs">ADR</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Vehicle carries hazardous materials requiring ADR certification
                            </p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGroup>

                  {isHazmat && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Routes will avoid restrictions for hazardous materials and include appropriate stopping areas.
                      </AlertDescription>
                    </Alert>
                  )}

                  <FieldGroup layout="inline">
                    <FormField
                      control={form.control}
                      name="enableRemoteTracking"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-tracking"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Remote Tracking</span>
                              {field.value && <Badge variant="secondary" className="text-xs">GPS</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Enable GPS tracking for fleet management and route optimization
                            </p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGroup>
                </div>
              </InputGroup>
            </div>
          )}

          {/* Navigation Actions */}
          <ActionGroup alignment="between" sticky className="bg-background">
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  data-testid="button-previous"
                >
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                data-testid="button-cancel"
              >
                Cancel
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  data-testid="button-next"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="min-w-[120px]"
                  data-testid="button-save"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Profile
                </Button>
              )}
            </div>
          </ActionGroup>
        </form>
      </Form>
    </div>
  );
}