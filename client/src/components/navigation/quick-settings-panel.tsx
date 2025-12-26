import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Truck, Globe, Palette, Check, Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type VehicleProfile } from "@shared/schema";
import { ThemeSelector } from "@/components/theme/theme-selector";
import LanguageSelector from "@/components/language/language-selector";
import VehicleProfileSetup from "@/components/vehicle/vehicle-profile-setup";

interface QuickSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProfile: VehicleProfile | null;
  onProfileSelect: (profile: VehicleProfile) => void;
}

export function QuickSettingsPanel({
  open,
  onOpenChange,
  selectedProfile,
  onProfileSelect
}: QuickSettingsPanelProps) {
  const [showVehicleSetup, setShowVehicleSetup] = useState(false);

  const { data: vehicleProfiles = [], isLoading: isLoadingProfiles } = useQuery<VehicleProfile[]>({
    queryKey: ["/api/vehicle-profiles"],
    enabled: open,
  });

  const handleProfileSelect = (profile: VehicleProfile) => {
    onProfileSelect(profile);
    localStorage.setItem('activeVehicleProfileId', profile.id.toString());
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className="w-[320px] sm:w-[380px] p-0 bg-white dark:bg-gray-900"
          data-testid="quick-settings-panel"
        >
          <SheetHeader className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-800">
            <SheetTitle className="text-lg font-semibold">Quick Settings</SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-60px)]">
            <div className="p-4 space-y-6">
              
              {/* Vehicle Selection Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span>Vehicle</span>
                </div>
                
                <div className="space-y-2">
                  {isLoadingProfiles ? (
                    <div className="text-sm text-muted-foreground py-2">Loading vehicles...</div>
                  ) : vehicleProfiles.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-2">
                      No vehicles configured
                    </div>
                  ) : (
                    vehicleProfiles.slice(0, 5).map((profile) => (
                      <Card 
                        key={profile.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedProfile?.id === profile.id 
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" 
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => handleProfileSelect(profile)}
                        data-testid={`quick-vehicle-${profile.id}`}
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {profile.name || 'Unnamed Vehicle'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {profile.height}m × {profile.width}m × {profile.length}m · {profile.weight}t
                            </div>
                          </div>
                          {selectedProfile?.id === profile.id && (
                            <Check className="h-5 w-5 text-blue-600 shrink-0 ml-2" />
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => {
                      onOpenChange(false);
                      setShowVehicleSetup(true);
                    }}
                    data-testid="button-add-vehicle-quick"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Language Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Globe className="h-4 w-4 text-green-600" />
                  <span>Language</span>
                </div>
                
                <LanguageSelector 
                  variant="country-first" 
                  showCountryFlags={true}
                />
              </div>

              <Separator />

              {/* Theme Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Palette className="h-4 w-4 text-purple-600" />
                  <span>Theme</span>
                </div>
                
                <ThemeSelector 
                  showLabels={true}
                  size="default"
                  showGrayscale={false}
                  showColorSpectrum={false}
                  showAutoSettings={false}
                  showAutoStatus={true}
                />
              </div>

            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Vehicle Setup Modal */}
      {showVehicleSetup && (
        <VehicleProfileSetup
          onClose={() => setShowVehicleSetup(false)}
          onProfileCreated={(profile) => {
            handleProfileSelect(profile);
            setShowVehicleSetup(false);
          }}
        />
      )}
    </>
  );
}
