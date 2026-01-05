import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { VehicleProfile } from '@shared/schema';

interface UseActiveVehicleProfileResult {
  activeProfile: VehicleProfile | null;
  activeProfileId: string | null;
  isLoading: boolean;
  error: Error | null;
  setActiveProfile: (profile: VehicleProfile) => void;
}

/**
 * Hook that provides a single source of truth for the active vehicle profile
 * Manages profile selection, localStorage persistence, and fallback loading
 */
export function useActiveVehicleProfile(): UseActiveVehicleProfileResult {
  const [activeProfile, setActiveProfileState] = useState<VehicleProfile | null>(null);
  
  // Fetch all vehicle profiles
  const { data: profiles, isLoading, error } = useQuery<VehicleProfile[]>({
    queryKey: ['/api/vehicle-profiles']
  });

  // Initialize active profile on mount and when profiles change
  useEffect(() => {
    if (!profiles || profiles.length === 0) return;

    // Try to get stored active profile ID from localStorage
    const storedActiveId = localStorage.getItem('activeVehicleProfileId');
    
    // Validate stored ID exists and is not the old 'default-profile' placeholder
    const isValidProfileId = (id: string): boolean => {
      return id.length > 0 && id !== 'default-profile';
    };

    let profileToUse: VehicleProfile | null = null;

    // If we have a valid stored ID, try to find that profile
    if (storedActiveId && isValidProfileId(storedActiveId)) {
      profileToUse = profiles.find(p => p.id === storedActiveId) || null;
    }

    // If no valid stored profile, always prefer the Class 1 Truck (the first one)
    if (!profileToUse && profiles.length > 0) {
      profileToUse = profiles[0];
    }

    // Set the active profile
    if (profileToUse) {
      setActiveProfileState(profileToUse);
      localStorage.setItem('activeVehicleProfileId', profileToUse.id);
    }
  }, [profiles]);

  const setActiveProfile = (profile: VehicleProfile) => {
    setActiveProfileState(profile);
    localStorage.setItem('activeVehicleProfileId', profile.id);
  };

  return {
    activeProfile,
    activeProfileId: activeProfile?.id || null,
    isLoading,
    error,
    setActiveProfile
  };
}