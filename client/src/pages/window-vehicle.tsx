import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, X } from 'lucide-react';
import VehicleProfileSetup from '@/components/vehicle/vehicle-profile-setup';
import { useQuery } from '@tanstack/react-query';
import type { VehicleProfile } from '@shared/schema';

export default function VehicleWindow() {
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const { data: vehicleProfiles = [] } = useQuery<VehicleProfile[]>({ queryKey: ['/api/vehicle-profiles'] });

  useEffect(() => {
    document.title = 'TruckNav Pro - Vehicle Profile';
  }, []);

  const handleCloseWindow = () => {
    window.close();
  };

  const handleProfileCreated = (profile: VehicleProfile) => {
    console.log('Profile created:', profile);
    setShowProfileSetup(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Window Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Truck className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Vehicle Profile</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCloseWindow}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4 max-w-4xl">
        {showProfileSetup ? (
          <VehicleProfileSetup
            onClose={() => setShowProfileSetup(false)}
            onProfileCreated={handleProfileCreated}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {vehicleProfiles.map((profile) => (
                <div key={profile.id} className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold text-lg">{profile.name}</h3>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div>Height: {profile.height}m</div>
                    <div>Width: {profile.width}m</div>
                    <div>Length: {profile.length}m</div>
                    {profile.weight && <div>Weight: {profile.weight}kg</div>}
                    <div>Axles: {profile.axles}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <Button
              onClick={() => setShowProfileSetup(true)}
              className="w-full"
            >
              <Truck className="w-4 h-4 mr-2" />
              Create New Vehicle Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}