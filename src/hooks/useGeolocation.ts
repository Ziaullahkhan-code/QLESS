import { useState, useCallback } from 'react';

export interface GeoCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface PresetLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
}

// User-specified fixed anchor: SMCHS / Bahadurabad, Karachi, Pakistan
export const KARACHI_ANCHOR_COORDS: GeoCoordinates = {
  lat: 24.8716,
  lng: 67.0598,
};

export const PRESET_LOCATIONS: PresetLocation[] = [
  {
    id: 'karachi-smchs',
    name: 'SMCHS / Bahadurabad (Karachi Center)',
    lat: 24.8716,
    lng: 67.0598,
    description: 'Fixed Karachi Anchor · 10 famous spots within 300m',
  },
  {
    id: 'sindhi-muslim-market',
    name: 'SMCHS Commercial Food Street',
    lat: 24.8708,
    lng: 67.0604,
    description: 'Heart of Karachi food street · 5 spots within 100m',
  },
  {
    id: 'bahadurabad-chowrangi',
    name: 'Bahadurabad Roundabout',
    lat: 24.8732,
    lng: 67.0590,
    description: 'North quarter · Near Okra & Tooso',
  },
];

/**
 * Calculates distance between two GPS coordinates using Haversine formula.
 * Returns distance in kilometers.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(distanceKm: number): string {
  const meters = Math.round(distanceKm * 1000);
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function useGeolocation() {
  // Default fixed starting location: SMCHS / Bahadurabad, Karachi, Pakistan (Lat 24.8716, Lng 67.0598)
  const [coords, setCoords] = useState<GeoCoordinates>(KARACHI_ANCHOR_COORDS);
  const [status, setStatus] = useState<'idle' | 'locating' | 'granted' | 'denied' | 'preset'>('preset');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>('karachi-smchs');

  // Option for users to test live browser GPS
  const requestGpsLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('denied');
      setErrorMessage('Geolocation API not supported by browser. Centered at SMCHS Karachi.');
      return;
    }

    setStatus('locating');
    setErrorMessage(null);
    setActivePresetId(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('granted');
      },
      (err) => {
        console.warn('Geolocation permission error or timeout:', err.message);
        setStatus('preset');
        setErrorMessage(
          err.code === 1
            ? 'Browser GPS declined. Kept centered at SMCHS Karachi anchor.'
            : 'GPS signal timed out. Kept centered at SMCHS Karachi anchor.'
        );
        setCoords(KARACHI_ANCHOR_COORDS);
        setActivePresetId('karachi-smchs');
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 10000,
      }
    );
  }, []);

  // Set preset location or reset to Karachi anchor
  const selectPresetLocation = useCallback((presetId: string) => {
    const preset = PRESET_LOCATIONS.find((p) => p.id === presetId);
    if (preset) {
      setCoords({ lat: preset.lat, lng: preset.lng });
      setActivePresetId(preset.id);
      setStatus('preset');
      setErrorMessage(null);
    } else if (presetId === 'karachi-smchs') {
      setCoords(KARACHI_ANCHOR_COORDS);
      setActivePresetId('karachi-smchs');
      setStatus('preset');
      setErrorMessage(null);
    }
  }, []);

  const resetToKarachiAnchor = useCallback(() => {
    setCoords(KARACHI_ANCHOR_COORDS);
    setActivePresetId('karachi-smchs');
    setStatus('preset');
    setErrorMessage(null);
  }, []);

  return {
    coords,
    status,
    errorMessage,
    activePresetId,
    requestGpsLocation,
    selectPresetLocation,
    resetToKarachiAnchor,
  };
}
