import { useState, useCallback } from 'react';
import { useGPS } from '@/contexts/gps-context';
import { robustGeocode } from '@/lib/robust-geocoding';

export function useManualLocation() {
  const gps = useGPS();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState('');

  const handleSetManualLocation = useCallback(async () => {
    if (!locationInput.trim() || !gps) return;

    setIsGeocoding(true);
    setError('');

    try {
      const result = await robustGeocode(locationInput);
      
      if (result) {
        gps.setManualLocation({
          latitude: result.coordinates.lat,
          longitude: result.coordinates.lng,
          address: result.address,
          timestamp: Date.now()
        });
        
        setIsDialogOpen(false);
        setLocationInput('');
        console.log('[MANUAL-LOCATION] Location set:', result.address);
      } else {
        setError('Location not found. Please try a different address or postcode.');
      }
    } catch (err) {
      console.error('[MANUAL-LOCATION] Error geocoding:', err);
      setError('Failed to find location. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  }, [locationInput, gps]);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
    setError('');
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setLocationInput('');
    setError('');
  }, []);

  return {
    isDialogOpen,
    locationInput,
    setLocationInput,
    isGeocoding,
    error,
    handleSetManualLocation,
    openDialog,
    closeDialog
  };
}