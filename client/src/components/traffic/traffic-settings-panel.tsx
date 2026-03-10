import { useState, memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Settings, 
  Clock, 
  Bell, 
  Zap, 
  BarChart3, 
  Save,
  X,
  AlertTriangle,
  Route as RouteIcon,
  TrendingUp,
  RefreshCw,
  Shield,
  Navigation
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTrafficSettings, useUpdateTrafficSettings } from "@/hooks/use-traffic";
import { cn } from "@/lib/utils";

interface TrafficSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const settingsSchema = z.object({
  autoApplyEnabled: z.boolean(),
  autoApplyThreshold: z.number().min(1).max(60),
  notificationsEnabled: z.boolean(),
  updateFrequency: z.number(),
  minimumSavings: z.number().min(1).max(30),
  aggressiveReroutingEnabled: z.boolean(),
  avoidHighwayIncidents: z.boolean(),
  considerFuelSavings: z.boolean(),
  voiceAnnouncements: z.boolean(),
  privacyMode: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const TrafficSettingsPanel = memo(function TrafficSettingsPanel({
  isOpen,
  onClose,
}: TrafficSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();
  
  const { data: currentSettings, isLoading } = useTrafficSettings();
  const updateSettingsMutation = useUpdateTrafficSettings();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      autoApplyEnabled: currentSettings?.autoApplyEnabled ?? false,
      autoApplyThreshold: currentSettings?.autoApplyThreshold ?? 10,
      notificationsEnabled: currentSettings?.notificationsEnabled ?? true,
      updateFrequency: currentSettings?.updateFrequency ?? 3,
      minimumSavings: currentSettings?.minimumSavings ?? 5,
      aggressiveReroutingEnabled: currentSettings?.aggressiveReroutingEnabled ?? false,
      avoidHighwayIncidents: currentSettings?.avoidHighwayIncidents ?? true,
      considerFuelSavings: currentSettings?.considerFuelSavings ?? true,
      voiceAnnouncements: currentSettings?.voiceAnnouncements ?? true,
      privacyMode: currentSettings?.privacyMode ?? false,
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    updateSettingsMutation.mutate(values, {
      onSuccess: () => {
        // toast({
        //   title: "Settings Updated",
        //   description: "Your traffic preferences have been saved successfully.",
        // });
        onClose();
      },
      onError: () => {
        // toast({
        //   title: "Update Failed",
        //   description: "Unable to save settings. Please try again.",
        //   variant: "destructive",
        // });
      },
    });
  };

  const resetToDefaults = () => {
    form.reset({
      autoApplyEnabled: false,
      autoApplyThreshold: 10,
      notificationsEnabled: true,
      updateFrequency: 3,
      minimumSavings: 5,
      aggressiveReroutingEnabled: false,
      avoidHighwayIncidents: true,
      considerFuelSavings: true,
      voiceAnnouncements: true,
      privacyMode: false,
    });
  };

  if (!isOpen) return null;

  const autoApplyThreshold = form.watch("autoApplyThreshold");
  const updateFrequency = form.watch("updateFrequency");
  const minimumSavings = form.watch("minimumSavings");
  const autoApplyEnabled = form.watch("autoApplyEnabled");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" data-testid="traffic-settings-panel">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="w-6 h-6" />
              <div>
                <CardTitle className="text-xl">Traffic Settings</CardTitle>
                <CardDescription>
                  Configure how TruckNav Pro handles traffic monitoring and re-routing
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-settings">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="px-6 pb-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general" data-testid="tab-general">
                  General
                </TabsTrigger>
                <TabsTrigger value="automation" data-testid="tab-automation">
                  Automation
                </TabsTrigger>
                <TabsTrigger value="privacy" data-testid="tab-privacy">
                  Privacy & Data
                </TabsTrigger>
              </TabsList>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <ScrollArea className="h-[60vh]">
                  <div className="px-6 space-y-6">
                    {/* General Settings */}
                    <TabsContent value="general" className="mt-0 space-y-6">
                      {/* Traffic Updates */}
                      <Card>
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <RefreshCw className="w-5 h-5" />
                            <span>Traffic Updates</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="notificationsEnabled"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Enable Traffic Notifications</FormLabel>
                                  <FormDescription>
                                    Receive alerts when traffic conditions change on your route
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-notifications-enabled"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="updateFrequency"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel>Update Frequency</FormLabel>
                                <FormControl>
                                  <div className="space-y-2">
                                    <Slider
                                      value={[field.value]}
                                      onValueChange={([value]) => field.onChange(value)}
                                      min={1}
                                      max={10}
                                      step={1}
                                      className="w-full"
                                      data-testid="slider-update-frequency"
                                    />
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                      <span>1 min (High battery usage)</span>
                                      <span>10 min (Low battery usage)</span>
                                    </div>
                                    <div className="text-center">
                                      <Badge variant="outline">
                                        Update every {updateFrequency} minute{updateFrequency !== 1 ? 's' : ''}
                                      </Badge>
                                    </div>
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  More frequent updates provide better accuracy but use more battery
                                </FormDescription>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="minimumSavings"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel>Minimum Time Savings to Show Alerts</FormLabel>
                                <FormControl>
                                  <div className="space-y-2">
                                    <Slider
                                      value={[field.value]}
                                      onValueChange={([value]) => field.onChange(value)}
                                      min={1}
                                      max={30}
                                      step={1}
                                      className="w-full"
                                      data-testid="slider-minimum-savings"
                                    />
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                      <span>1 min (Show all alternatives)</span>
                                      <span>30 min (Major savings only)</span>
                                    </div>
                                    <div className="text-center">
                                      <Badge variant="outline">
                                        Show alerts for {minimumSavings}+ minute savings
                                      </Badge>
                                    </div>
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  Only show alternative routes that save at least this much time
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      {/* Route Preferences */}
                      <Card>
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <RouteIcon className="w-5 h-5" />
                            <span>Route Preferences</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="avoidHighwayIncidents"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Avoid Highway Incidents</FormLabel>
                                  <FormDescription>
                                    Prefer alternative routes when major incidents are detected on highways
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-avoid-highway-incidents"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="considerFuelSavings"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Consider Fuel Efficiency</FormLabel>
                                  <FormDescription>
                                    Factor in fuel savings when suggesting alternative routes
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-consider-fuel-savings"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="voiceAnnouncements"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Voice Announcements</FormLabel>
                                  <FormDescription>
                                    Announce traffic alerts and route changes via voice
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-voice-announcements"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Automation Settings */}
                    <TabsContent value="automation" className="mt-0 space-y-6">
                      <Card>
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <Zap className="w-5 h-5" />
                            <span>Automatic Re-routing</span>
                          </CardTitle>
                          <CardDescription>
                            Configure when the system should automatically apply route changes
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <FormField
                            control={form.control}
                            name="autoApplyEnabled"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Enable Automatic Re-routing</FormLabel>
                                  <FormDescription>
                                    Automatically apply route changes that meet your criteria
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-auto-apply-enabled"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {autoApplyEnabled && (
                            <FormField
                              control={form.control}
                              name="autoApplyThreshold"
                              render={({ field }) => (
                                <FormItem className="space-y-3">
                                  <FormLabel>Auto-Apply Threshold</FormLabel>
                                  <FormControl>
                                    <div className="space-y-2">
                                      <Slider
                                        value={[field.value]}
                                        onValueChange={([value]) => field.onChange(value)}
                                        min={1}
                                        max={60}
                                        step={1}
                                        className="w-full"
                                        data-testid="slider-auto-apply-threshold"
                                      />
                                      <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>1 min (Apply small changes)</span>
                                        <span>60 min (Major savings only)</span>
                                      </div>
                                      <div className="text-center">
                                        <Badge variant="outline">
                                          Auto-apply routes saving {autoApplyThreshold}+ minutes
                                        </Badge>
                                      </div>
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Routes saving less time will still show alerts for manual selection
                                  </FormDescription>
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={form.control}
                            name="aggressiveReroutingEnabled"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base flex items-center space-x-2">
                                    <span>Aggressive Re-routing</span>
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                  </FormLabel>
                                  <FormDescription>
                                    Consider more route alternatives, including those with slight detours
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-aggressive-rerouting"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {form.watch("aggressiveReroutingEnabled") && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                              <div className="flex items-start space-x-2">
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div className="space-y-1">
                                  <div className="font-medium text-amber-900 dark:text-amber-100">
                                    Aggressive Re-routing Enabled
                                  </div>
                                  <div className="text-sm text-amber-800 dark:text-amber-200">
                                    This may suggest routes that are longer in distance but potentially faster due to traffic conditions. 
                                    Use with caution for fuel-sensitive trips.
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Privacy & Data Settings */}
                    <TabsContent value="privacy" className="mt-0 space-y-6">
                      <Card>
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <Shield className="w-5 h-5" />
                            <span>Privacy & Data Usage</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="privacyMode"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Privacy Mode</FormLabel>
                                  <FormDescription>
                                    Limit data sharing and use cached traffic data when possible
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-privacy-mode"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
                            <div className="font-medium flex items-center space-x-2">
                              <BarChart3 className="w-4 h-4" />
                              <span>Data Usage Information</span>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div>• Traffic updates: ~2MB per hour of active navigation</div>
                              <div>• Route calculations: ~500KB per alternative route request</div>
                              <div>• Map data: Cached locally to reduce usage</div>
                              <div>• Analytics: Anonymous usage patterns only</div>
                            </div>
                          </div>

                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="flex items-start space-x-2">
                              <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                              <div className="space-y-1">
                                <div className="font-medium text-green-900 dark:text-green-100">
                                  Your Privacy is Protected
                                </div>
                                <div className="text-sm text-green-800 dark:text-green-200">
                                  Location data is processed locally and encrypted during transmission. 
                                  No personal information is stored on external servers.
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </div>
                </ScrollArea>

                {/* Action Buttons */}
                <div className="px-6 py-4 bg-muted/30 border-t flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetToDefaults}
                    data-testid="button-reset-defaults"
                  >
                    Reset to Defaults
                  </Button>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      data-testid="button-cancel-settings"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateSettingsMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateSettingsMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});

export default TrafficSettingsPanel;