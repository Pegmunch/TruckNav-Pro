import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { insertTrafficIncidentSchema, type InsertTrafficIncident } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  AlertTriangle, 
  Car, 
  Construction, 
  Shield, 
  TrafficCone, 
  Truck, 
  MapPin, 
  Clock,
  X
} from "lucide-react";

const incidentTypes = [
  { value: "accident", label: "Accident", icon: Car, color: "destructive" },
  { value: "police", label: "Police Activity", icon: Shield, color: "secondary" },
  { value: "road_closure", label: "Road Closure", icon: X, color: "destructive" },
  { value: "construction", label: "Construction", icon: Construction, color: "muted" },
  { value: "heavy_traffic", label: "Heavy Traffic", icon: TrafficCone, color: "secondary" },
  { value: "obstacle", label: "Obstacle", icon: AlertTriangle, color: "destructive" },
  { value: "hazmat_spill", label: "Hazmat Spill", icon: AlertTriangle, color: "destructive" },
] as const;

const severityLevels = [
  { value: "low", label: "Low", description: "Minor impact on traffic flow" },
  { value: "medium", label: "Medium", description: "Moderate delays expected" },
  { value: "high", label: "High", description: "Significant delays, seek alternative route" },
  { value: "critical", label: "Critical", description: "Road impassable, major detour required" },
] as const;

const directions = [
  { value: "northbound", label: "Northbound" },
  { value: "southbound", label: "Southbound" },
  { value: "eastbound", label: "Eastbound" },
  { value: "westbound", label: "Westbound" },
  { value: "both_directions", label: "Both Directions" },
] as const;

const formSchema = insertTrafficIncidentSchema.extend({
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  truckWarnings: z.array(z.string()).optional(),
  estimatedDuration: z.number().min(0).optional(),
});

interface IncidentReportingFormProps {
  currentLocation?: { lat: number; lng: number };
  onClose: () => void;
  onIncidentCreated?: (incident: any) => void;
}

export default function IncidentReportingForm({ 
  currentLocation, 
  onClose, 
  onIncidentCreated 
}: IncidentReportingFormProps) {
  const [customWarnings, setCustomWarnings] = useState<string[]>([]);
  const [newWarning, setNewWarning] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "accident",
      severity: "medium",
      title: "",
      description: "",
      coordinates: currentLocation || { lat: 51.5074, lng: -0.1278 },
      roadName: "",
      direction: "both_directions",
      reporterName: "",
      affectedLanes: undefined,
      totalLanes: undefined,
      truckWarnings: [],
      estimatedDuration: undefined,
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: InsertTrafficIncident) => {
      const response = await apiRequest("POST", "/api/traffic-incidents", data);
      return response.json();
    },
    onSuccess: (incident) => {
      toast({
        title: "Incident Reported",
        description: "Thank you for reporting this traffic incident. It will be reviewed and verified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/traffic-incidents"] });
      onIncidentCreated?.(incident);
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to report incident. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const incidentData: InsertTrafficIncident = {
      ...values,
      truckWarnings: customWarnings.length > 0 ? customWarnings : null,
      trafficDelay: values.estimatedDuration || null,
      estimatedClearTime: values.estimatedDuration 
        ? new Date(Date.now() + values.estimatedDuration * 60 * 1000) 
        : null,
      isActive: true,
      isVerified: false,
    };

    createIncidentMutation.mutate(incidentData);
  };

  const addCustomWarning = () => {
    if (newWarning.trim() && !customWarnings.includes(newWarning.trim())) {
      setCustomWarnings([...customWarnings, newWarning.trim()]);
      setNewWarning("");
    }
  };

  const removeWarning = (warning: string) => {
    setCustomWarnings(customWarnings.filter(w => w !== warning));
  };

  const selectedType = incidentTypes.find(type => type.value === form.watch("type"));
  const selectedSeverity = severityLevels.find(severity => severity.value === form.watch("severity"));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto scroll-smooth touch-scroll">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Report Traffic Incident</CardTitle>
                <CardDescription>
                  Help other drivers by reporting traffic incidents in real-time
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-report">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Incident Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-incident-type">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select incident type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {incidentTypes.map((type) => {
                          const IconComponent = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center space-x-2">
                                <IconComponent className="w-4 h-4" />
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Severity */}
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-severity">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {severityLevels.map((severity) => (
                          <SelectItem key={severity.value} value={severity.value}>
                            <div className="space-y-1">
                              <div className="font-medium">{severity.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {severity.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSeverity && (
                      <FormDescription>{selectedSeverity.description}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brief description of the incident" 
                        {...field} 
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide more details about the incident..."
                        className="min-h-[80px]"
                        {...field}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Include any relevant details that would help other drivers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Road Name */}
                <FormField
                  control={form.control}
                  name="roadName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Road Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., M25, A1, B4040" 
                          {...field} 
                          data-testid="input-road-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Direction */}
                <FormField
                  control={form.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direction</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-direction">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {directions.map((direction) => (
                            <SelectItem key={direction.value} value={direction.value}>
                              {direction.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Affected Lanes */}
                <FormField
                  control={form.control}
                  name="affectedLanes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Affected Lanes</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-affected-lanes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Total Lanes */}
                <FormField
                  control={form.control}
                  name="totalLanes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Lanes</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          placeholder="3"
                          {...field}
                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-total-lanes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Estimated Duration */}
                <FormField
                  control={form.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="30"
                          {...field}
                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Truck-Specific Warnings */}
              <div className="space-y-3">
                <FormLabel className="flex items-center space-x-2">
                  <Truck className="w-4 h-4" />
                  <span>Truck-Specific Warnings</span>
                </FormLabel>
                <div className="flex space-x-2">
                  <Input
                    placeholder="e.g., Height restriction, Hazmat route"
                    value={newWarning}
                    onChange={(e) => setNewWarning(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomWarning())}
                    data-testid="input-truck-warning"
                  />
                  <Button type="button" onClick={addCustomWarning} data-testid="button-add-warning">
                    Add
                  </Button>
                </div>
                {customWarnings.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {customWarnings.map((warning, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <span>{warning}</span>
                        <button
                          type="button"
                          onClick={() => removeWarning(warning)}
                          className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                          data-testid={`button-remove-warning-${index}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Reporter Name */}
              <FormField
                control={form.control}
                name="reporterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Optional - for verification purposes"
                        {...field}
                        data-testid="input-reporter-name"
                      />
                    </FormControl>
                    <FormDescription>
                      Providing your name helps authorities verify the incident
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Location */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">Location</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Lat: {form.watch("coordinates.lat").toFixed(6)}, 
                  Lng: {form.watch("coordinates.lng").toFixed(6)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Using current map position
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createIncidentMutation.isPending}
                  data-testid="button-submit-report"
                >
                  {createIncidentMutation.isPending ? "Reporting..." : "Report Incident"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}